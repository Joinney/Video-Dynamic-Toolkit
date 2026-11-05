const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const {
  PORT,
  ADB_PATH,
  TARGET_DIR,
  FRONTEND_DIR,
  TEMP_DIR,
  SUPPORTED_APPS,
  getAppMode,
  setAppMode
} = require('./config');

const { checkAdbDevice, resolveActiveApp, pullRemoteFile } = require('./adb');
const { getRemoteCacheList } = require('./cache');
const { startAutoSwipe, stopAutoSwipe, getAutoSwipeStatus } = require('./auto_swipe');
const { startDubbingJob, getDubbingJob } = require('./dubber');
const {
  sanitizeFolderName,
  getDramaInfoFromDevice,
  getLocalDramas,
  exportVideos,
  deleteRemoteCache,
  downloadDirectVideo,
  getDirectDramaEpisodes
} = require('./drama');

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.jsx': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2'
};

function serveStaticFile(res, filePath, contentType) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const type = contentType || MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

function streamVideoFile(req, res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('File not found');
    return;
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4'
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Static Frontend Files
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return serveStaticFile(res, path.join(FRONTEND_DIR, 'index.html'));
  }

  // Serve static files from FRONTEND_DIR if file exists
  const safePath = path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, '');
  const candidatePath = path.join(FRONTEND_DIR, safePath);
  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    return serveStaticFile(res, candidatePath);
  }

  // 2. API Status & Information
  if (url.pathname === '/api/status') {
    const device = checkAdbDevice();
    const reqApp = url.searchParams.get('app');
    const dramaQuery = url.searchParams.get('drama') || '';
    const activeApp = resolveActiveApp(device, reqApp);
    const dramaInfo = getDramaInfoFromDevice(device, activeApp);
    const localDramas = getLocalDramas();

    // Đối chiếu với các bộ phim đã tải trong thư mục máy tính
    let matchedLocal = null;
    const targetTitle = dramaQuery || (dramaInfo.currentDrama ? dramaInfo.currentDrama.title : '');
    if (targetTitle) {
      const safe = sanitizeFolderName(targetTitle).toLowerCase();
      matchedLocal = localDramas.find(d => 
        d.name.toLowerCase() === safe || 
        d.name.toLowerCase().includes(safe) || 
        safe.includes(d.name.toLowerCase())
      );
    }
    const localVideos = matchedLocal ? matchedLocal.videos : [];
    const remoteList = getRemoteCacheList(device, activeApp, dramaInfo.currentEpisode || 1, localVideos);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      connected: !!device,
      deviceName: device || 'Chưa tìm thấy giả lập',
      activeApp,
      supportedApps: SUPPORTED_APPS,
      currentAppMode: getAppMode(),
      currentDrama: dramaInfo.currentDrama,
      allDramas: dramaInfo.allDramas,
      remoteCacheCount: remoteList.length,
      remoteList,
      localDramas
    }));
    return;
  }

  // 3. API Set App Mode
  if (url.pathname === '/api/set-app' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const app = payload.app || 'auto';
      if (setAppMode(app)) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, currentAppMode: getAppMode() }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'App không hỗ trợ' }));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  // 4. API Export Videos
  if (url.pathname === '/api/export' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const device = checkAdbDevice();
      if (!device) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Giả lập chưa kết nối ADB!' }));
        return;
      }
      const result = exportVideos(device, payload);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (err) {
      res.writeHead(err.hasIncomplete ? 400 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        hasIncomplete: !!err.hasIncomplete,
        incomplete: err.incomplete || [],
        message: err.message
      }));
    }
    return;
  }

  // 5. API Delete Remote Cache Files
  if (url.pathname === '/api/delete-remote' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const device = checkAdbDevice();
      if (device && payload.paths) {
        deleteRemoteCache(device, payload.paths);
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  // 6. API Open Folder
  if (url.pathname === '/api/open-folder' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const targetFolder = payload.folder ? path.join(TARGET_DIR, sanitizeFolderName(payload.folder)) : TARGET_DIR;
      if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });
      spawn('explorer.exe', [targetFolder], { detached: true });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  // 6.2 Connect ADB Device API
  if (url.pathname === '/api/connect-adb' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const host = (payload.host || '127.0.0.1:5555').trim();
      const output = execSync(`"${ADB_PATH}" connect ${host}`, { encoding: 'utf8' });
      const device = checkAdbDevice();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, message: output.trim(), connected: !!device, deviceName: device }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  // 7. Auto-Swipe API
  if (url.pathname === '/api/auto-swipe/start' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const device = checkAdbDevice();
      if (!device) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Chưa kết nối giả lập LDPlayer!' }));
        return;
      }
      startAutoSwipe(device, payload.total || 1, payload.delay || 6, payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  if (url.pathname === '/api/auto-swipe/stop' && req.method === 'POST') {
    stopAutoSwipe();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 8. API Direct Episodes & CDN Download
  if (url.pathname === '/api/direct-episodes' && req.method === 'GET') {
    try {
      const device = checkAdbDevice();
      const appKey = resolveActiveApp(device);
      const data = getDirectDramaEpisodes(device, appKey, url.searchParams.get('title') || '');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, ...data }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  if (url.pathname === '/api/download-direct' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      if (!payload.url) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Thiếu đường dẫn URL video!' }));
        return;
      }
      const result = await downloadDirectVideo(payload.url, payload.dramaTitle, payload.epNumber || 1);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: result.success, ...result }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  if (url.pathname === '/api/auto-swipe/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getAutoSwipeStatus()));
    return;
  }

  // 9. API AI Video Dubbing
  if (url.pathname === '/api/dub-video' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      if (!payload.videoPath) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Thiếu đường dẫn video cần lồng tiếng!' }));
        return;
      }
      let fullPath = payload.videoPath;
      if (!path.isAbsolute(fullPath)) {
        fullPath = path.join(TARGET_DIR, fullPath);
      }
      if (!fs.existsSync(fullPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Không tìm thấy file video trên hệ thống: ' + fullPath }));
        return;
      }

      const job = startDubbingJob(fullPath, payload);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, job }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  if (url.pathname === '/api/dub-status' && req.method === 'GET') {
    const jobId = url.searchParams.get('id');
    const job = getDubbingJob(jobId);
    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: 'Không tìm thấy tiến trình lồng tiếng!' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, job }));
    return;
  }

  // 8. API Restart App
  if (url.pathname === '/api/restart-app' && req.method === 'POST') {
    const device = checkAdbDevice();
    if (!device) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Chưa kết nối giả lập LDPlayer!' }));
      return;
    }
    const activeApp = resolveActiveApp(device);
    const appInfo = SUPPORTED_APPS[activeApp] || SUPPORTED_APPS.sodareels;
    try {
      execSync(`"${ADB_PATH}" -s ${device} shell "am force-stop ${appInfo.pkg}; sleep 1; monkey -p ${appInfo.pkg} -c android.intent.category.LAUNCHER 1"`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, app: appInfo.name }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  // 9. API Preview Remote Video
  if (url.pathname === '/api/preview-remote') {
    const remotePath = url.searchParams.get('path');
    if (!remotePath) {
      res.writeHead(400); res.end('Missing path'); return;
    }
    const safeName = path.basename(remotePath).replace(/\.(mdl|mp4)$/, '') + '.mp4';
    const localTemp = path.join(TEMP_DIR, safeName);
    const device = checkAdbDevice();

    if (device) {
      try {
        let needPull = !fs.existsSync(localTemp) || fs.statSync(localTemp).size === 0;
        if (!needPull) {
          const remoteSz = parseInt(execSync(`"${ADB_PATH}" -s ${device} shell "stat -c %s '${remotePath}' 2>/dev/null"`, { encoding: 'utf8' }).trim(), 10) || 0;
          if (remoteSz > fs.statSync(localTemp).size) {
            needPull = true;
          }
        }
        if (needPull) {
          pullRemoteFile(device, remotePath, localTemp);
        }
      } catch (e) {
        if (!fs.existsSync(localTemp)) {
          res.writeHead(500); res.end('Failed to pull: ' + e.message); return;
        }
      }
    } else if (!fs.existsSync(localTemp)) {
      res.writeHead(400); res.end('No device'); return;
    }

    return streamVideoFile(req, res, localTemp);
  }

  // 10. API Open Video in Desktop Player
  if (url.pathname === '/api/open-video' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      let targetPath = '';
      if (payload.remotePath) {
        const safeName = path.basename(payload.remotePath).replace(/\.(mdl|mp4)$/, '') + '.mp4';
        targetPath = path.join(TEMP_DIR, safeName);
        const device = checkAdbDevice();
        if (device && (!fs.existsSync(targetPath) || fs.statSync(targetPath).size === 0)) {
          pullRemoteFile(device, payload.remotePath, targetPath);
        }
      } else if (payload.localPath) {
        targetPath = path.join(TARGET_DIR, payload.localPath);
      }

      if (fs.existsSync(targetPath)) {
        spawn('cmd.exe', ['/c', 'start', '', targetPath], { detached: true });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'File không tồn tại trên máy' }));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  // 11. API Proxy Image
  if (url.pathname === '/api/proxy-img') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl || !targetUrl.startsWith('http')) {
      res.writeHead(400); res.end('Invalid url'); return;
    }
    const client = targetUrl.startsWith('https') ? require('https') : require('http');
    client.get(targetUrl, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      });
      proxyRes.pipe(res);
    }).on('error', (e) => {
      res.writeHead(500); res.end('Proxy error: ' + e.message);
    });
    return;
  }

  // 11. Serve Poster Image
  if (url.pathname.startsWith('/poster/')) {
    const dramaName = decodeURIComponent(url.pathname.replace('/poster/', ''));
    const dirPath = path.join(TARGET_DIR, sanitizeFolderName(dramaName));
    let posterPath = path.join(dirPath, 'poster.png');

    if (!fs.existsSync(posterPath)) {
      posterPath = path.join(__dirname, '..', 'poster.png');
    }

    if (fs.existsSync(posterPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      fs.createReadStream(posterPath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Poster not found');
    }
    return;
  }

  // 12. Serve Local Video File
  if (url.pathname.startsWith('/video/')) {
    const decodedPath = decodeURIComponent(url.pathname.replace('/video/', ''));
    const filePath = path.join(TARGET_DIR, decodedPath);
    return streamVideoFile(req, res, filePath);
  }

  res.writeHead(404);
  res.end('Not Found');
});

function startServer() {
  server.listen(PORT, () => {
    console.log(`Tool Drama Series Server v3.0 đang chạy tại: http://localhost:${PORT}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { server, startServer };
