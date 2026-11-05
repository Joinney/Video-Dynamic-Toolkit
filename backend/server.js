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
const { startDubbingJob, getDubbingJob, generateTTSAudio, transcribeAndTranslateVideo } = require('./dubber');
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
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
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

  // 2.2. API Voices Catalog
  if (url.pathname === '/api/voices') {
    const catalog = [
      {
        category: 'VieNeu-TTS (Top Phim & TikTok)',
        voices: [
          { id: 'vieneu:Adam Tốp Tốp', name: 'Adam Tốp Tốp', lang: 'vi-VN', gender: 'Nam', style: 'Nam Miền Nam • Cảm xúc, Hài hước, Tốp Tốp' },
          { id: 'vieneu:Adam bựa', name: 'Adam bựa', lang: 'vi-VN', gender: 'Nam', style: 'Review Phim Tốp Tốp dí dỏm, hài hước' },
          { id: 'vieneu:Adam', name: 'Adam', lang: 'vi-VN', gender: 'Nam', style: 'Giọng Tốp Tốp Tự Nhiên & Đa Cảm Xúc' },
          { id: 'vieneu:Hải Đăng', name: 'Hải Đăng', lang: 'vi-VN', gender: 'Nam', style: 'Nam Bắc chuẩn phát thanh, tin tức' },
          { id: 'vieneu:Trúc Ly', name: 'Trúc Ly', lang: 'vi-VN', gender: 'Nữ', style: 'Nữ Bắc tự nhiên, trẻ trung, dễ thương' },
          { id: 'vieneu:Thiện Minh', name: 'Thiện Minh', lang: 'vi-VN', gender: 'Nam', style: 'Nam Bắc kể chuyện, sâu lắng, truyền cảm' },
          { id: 'vieneu:Mai Anh', name: 'Mai Anh', lang: 'vi-VN', gender: 'Nữ', style: 'Nữ Bắc tin tức, thời sự chuyên nghiệp' },
          { id: 'vieneu:Thùy Dung', name: 'Thùy Dung', lang: 'vi-VN', gender: 'Nữ', style: 'Nữ Nam ngọt ngào, nhẹ nhàng' },
          { id: 'vieneu:Thiền Tâm Đức', name: 'Thiền Tâm Đức', lang: 'vi-VN', gender: 'Nam', style: 'Nam Bắc trầm tĩnh, triết lý, thiền định' },
          { id: 'vieneu:Ngọc Huyền', name: 'Ngọc Huyền', lang: 'vi-VN', gender: 'Nữ', style: 'Nữ Bắc kể chuyện, diễn cảm' },
          { id: 'vieneu:Quang Sơn', name: 'Quang Sơn', lang: 'vi-VN', gender: 'Nam', style: 'Nam Trung trầm ấm, chân chất' },
          { id: 'vieneu:Ngọc Trân', name: 'Ngọc Trân', lang: 'vi-VN', gender: 'Nữ', style: 'Nữ Trung đằm thắm, dịu dàng' }
        ]
      },
      {
        category: 'Edge-TTS (Chuẩn Phim Drama & Thuyết Minh)',
        voices: [
          { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My', lang: 'vi-VN', gender: 'Nữ', style: 'Nữ Bắc - Trầm ấm, truyền cảm (Chuẩn phim drama)' },
          { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh', lang: 'vi-VN', gender: 'Nam', style: 'Nam Bắc - Mạnh mẽ, dứt khoát, hào sảng' }
        ]
      },
      {
        category: 'VieNeu-TTS (Miền Bắc & Miền Nam)',
        voices: [
          { id: 'vieneu:Minh Đức', name: 'Minh Đức', lang: 'vi-VN', gender: 'Nam', style: 'Nam Bắc chững chạc, tin tức' },
          { id: 'vieneu:Thanh Bình', name: 'Thanh Bình', lang: 'vi-VN', gender: 'Nam', style: 'Nam Bắc điềm đạm, ấm áp' },
          { id: 'vieneu:Đoan Trang', name: 'Đoan Trang', lang: 'vi-VN', gender: 'Nữ', style: 'Nữ Bắc trang nhã, thanh lịch' },
          { id: 'vieneu:Quỳnh Anh', name: 'Quỳnh Anh', lang: 'vi-VN', gender: 'Nữ', style: 'Nữ Bắc nhẹ nhàng, tự nhiên' },
          { id: 'vieneu:Thái Sơn', name: 'Thái Sơn', lang: 'vi-VN', gender: 'Nam', style: 'Nam Nam hào sảng, hiện đại' },
          { id: 'vieneu:Thục Đoan', name: 'Thục Đoan', lang: 'vi-VN', gender: 'Nữ', style: 'Nữ Nam duyên dáng, truyền cảm' },
          { id: 'vieneu:Mỹ Duyên', name: 'Mỹ Duyên', lang: 'vi-VN', gender: 'Nữ', style: 'Nữ Nam đọc truyện tình cảm, ngọt ngào' }
        ]
      },
      {
        category: 'Quốc Tế (English / Chinese / Japanese)',
        voices: [
          { id: 'en-US-JennyNeural', name: 'Jenny (EN)', lang: 'en-US', gender: 'Nữ', style: 'English US - Natural & Expressive' },
          { id: 'en-US-GuyNeural', name: 'Guy (EN)', lang: 'en-US', gender: 'Nam', style: 'English US - Confident & Warm' },
          { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (ZH)', lang: 'zh-CN', gender: 'Nữ', style: 'Chinese Mandarin - Natural Drama' },
          { id: 'zh-CN-YunxiNeural', name: 'Yunxi (ZH)', lang: 'zh-CN', gender: 'Nam', style: 'Chinese Mandarin - Lively & Narrative' },
          { id: 'ja-JP-NanamiNeural', name: 'Nanami (JA)', lang: 'ja-JP', gender: 'Nữ', style: 'Japanese - Soft & Anime tone' }
        ]
      }
    ];
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, catalog }));
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

  // 9.0 API Upload Asset (Logo, Outro video, Custom Media)
  if (url.pathname === '/api/upload-asset' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      if (!payload.fileData || !payload.fileName) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Thiếu fileData hoặc fileName' }));
        return;
      }
      const uploadDir = path.join(TEMP_DIR, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const cleanFileName = Date.now() + '_' + path.basename(payload.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const targetPath = path.join(uploadDir, cleanFileName);
      
      const base64Data = payload.fileData.replace(/^data:[^;]+;base64,/, '');
      fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        filePath: targetPath,
        url: `/audio/temp/uploads/${cleanFileName}`,
        fileName: cleanFileName
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  // 9.1 API TTS Audio Generation (StudioVDT Engine)
  if (url.pathname === '/api/tts/generate' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      if (!payload.text || !payload.text.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Vui lòng nhập văn bản kịch bản cần đọc!' }));
        return;
      }
      const result = await generateTTSAudio(payload.text.trim(), payload);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
    return;
  }

  // 9.2 Serve Temp Audio and Uploads
  if (url.pathname.startsWith('/audio/temp/')) {
    const relPath = url.pathname.replace('/audio/temp/', '');
    const audioPath = path.join(TEMP_DIR, relPath);
    if (fs.existsSync(audioPath) && fs.statSync(audioPath).isFile()) {
      const ext = path.extname(audioPath).toLowerCase();
      const mimeMap = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp'
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': fs.statSync(audioPath).size,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(audioPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
    }
    return;
  }

  // 9.3 API Voice Sample Preview (Real Studio VDT 48kHz Voice Preview)
  if (url.pathname === '/api/voice-preview') {
    const voiceParam = (url.searchParams.get('voice') || '').trim();
    const previewDir = path.join(__dirname, '..', 'output', 'preview_samples');
    
    const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normVoice = normalize(voiceParam);
    let targetFile = null;

    if (normVoice.includes('adam')) {
      targetFile = path.join(previewDir, 'preview_Adam_Top_Top.wav');
      if (!fs.existsSync(targetFile)) {
        targetFile = path.join(__dirname, 'dubber', 'assets', 'adam_toptop_ref.wav');
      }
    } else if (fs.existsSync(previewDir)) {
      const files = fs.readdirSync(previewDir);
      for (const file of files) {
        const normFile = normalize(file.replace('preview_', '').replace(/\.(mp3|wav)$/, ''));
        if (normFile && (normVoice.includes(normFile) || normFile.includes(normVoice))) {
          targetFile = path.join(previewDir, file);
          break;
        }
      }
    }

    if (!targetFile || !fs.existsSync(targetFile)) {
      targetFile = path.join(__dirname, 'dubber', 'assets', 'adam_toptop_ref.wav');
    }

    if (fs.existsSync(targetFile)) {
      const ext = path.extname(targetFile).toLowerCase();
      const mime = ext === '.wav' ? 'audio/wav' : 'audio/mpeg';
      const stat = fs.statSync(targetFile);
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400'
      });
      fs.createReadStream(targetFile).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Sample preview not found' }));
    }
    return;
  }

  // 9.4 API Quick Transcribe & Translate Subtitles (Dịch phụ đề trước từ Video)
  if (url.pathname === '/api/quick-transcribe' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      let videoPath = payload.videoPath;
      if (!videoPath) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Vui lòng chọn hoặc tải video trước!' }));
        return;
      }

      let resolvedVideoPath = videoPath;
      if (videoPath.startsWith('/video/')) {
        const decoded = decodeURIComponent(videoPath.replace('/video/', ''));
        resolvedVideoPath = path.join(DOWNLOAD_DIR, decoded);
      } else if (!path.isAbsolute(videoPath)) {
        resolvedVideoPath = path.join(DOWNLOAD_DIR, videoPath);
      }

      if (!fs.existsSync(resolvedVideoPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Không tìm thấy file video: ' + path.basename(resolvedVideoPath) }));
        return;
      }

      const result = await transcribeAndTranslateVideo(resolvedVideoPath, payload);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, message: e.message }));
    }
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
