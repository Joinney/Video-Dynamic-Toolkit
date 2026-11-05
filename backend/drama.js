const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ADB_PATH, TARGET_DIR } = require('./config');
const { adbQuerySqlite, resolveActiveApp, pullRemoteFile } = require('./adb');
const { getRemoteCacheCompletenessMap } = require('./cache');

function sanitizeFolderName(name) {
  if (!name) return 'Bo_Phim_Moi';
  return name.replace(/[<>:"/\\|?*]/g, ' - ').replace(/\s+/g, ' ').trim();
}

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    if (url.startsWith('/api/proxy-img?url=')) {
      url = decodeURIComponent(url.replace('/api/proxy-img?url=', ''));
    }
    if (!url.startsWith('http')) return resolve(false);
    const getClient = (u) => u.startsWith('https') ? require('https') : require('http');
    const doReq = (u, redirects = 0) => {
      if (redirects > 5) return resolve(false);
      try {
        getClient(u).get(u, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let nextUrl = res.headers.location;
            if (!nextUrl.startsWith('http')) {
              const parsed = new URL(u);
              nextUrl = parsed.origin + nextUrl;
            }
            return doReq(nextUrl, redirects + 1);
          }
          if (res.statusCode === 200) {
            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(true); });
          } else {
            resolve(false);
          }
        }).on('error', () => resolve(false));
      } catch (e) { resolve(false); }
    };
    doReq(url);
  });
}

function getDramaInfoFromDevice(device, appKey = 'sodareels') {
  if (!device) return { currentDrama: null, allDramas: [], currentEpisode: 1, totalEpisodes: 0 };

  // 1. MINUTEDRAMA
  if (appKey === 'minutedrama') {
    try {
      let currentDrama = null;
      let allDramas = [];
      const rawRows = adbQuerySqlite(
        device,
        '/data/data/com.minute.minishort.drama/databases/file_manager.db',
        'SELECT title, episode_num, total_episode, cover_url FROM playEpisodeHistory ORDER BY id DESC LIMIT 10;'
      );
      const dbRows = rawRows.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

      const seen = new Set();
      dbRows.forEach(row => {
        const parts = row.split('|');
        const title = (parts[0] || '').trim();
        const ep = parseInt(parts[1], 10) || 1;
        const total = parseInt(parts[2], 10) || 0;
        const cover = (parts[3] || '').trim();

        if (title && !seen.has(title)) {
          seen.add(title);
          const dramaObj = {
            id: `minute_${title}`,
            title,
            image: cover,
            desc: `Phim MinuteDrama • Đang xem tập ${ep}/${total}`,
            currentEpisode: ep,
            totalEpisodes: total
          };
          if (!currentDrama) currentDrama = dramaObj;
          allDramas.push(dramaObj);
        }
      });

      if (!currentDrama && allDramas.length > 0) currentDrama = allDramas[0];

      return {
        currentDrama,
        allDramas,
        currentEpisode: currentDrama ? currentDrama.currentEpisode : 1,
        totalEpisodes: currentDrama ? currentDrama.totalEpisodes : 0
      };
    } catch (e) {
      return { currentDrama: null, allDramas: [], currentEpisode: 1, totalEpisodes: 0 };
    }
  }

  // 2. SODA REELS (Mặc định)
  try {
    let lastDramaId = '';
    let currentEpisode = 1;
    let totalEpisodes = 0;
    try {
      const dbRow = adbQuerySqlite(
        device,
        '/data/data/com.sodareels.drama.short/databases/PLAY_LET_BD_NAME_DRAMA',
        'SELECT dramaId, [index], total FROM database_table_play_history ORDER BY time DESC LIMIT 1;'
      );
      if (dbRow) {
        const parts = dbRow.split('|');
        lastDramaId = parts[0] || '';
        currentEpisode = parseInt(parts[1], 10) || 1;
        totalEpisodes = parseInt(parts[2], 10) || 0;
      }
    } catch (e) {}

    let allDramas = [];
    let currentDrama = null;

    try {
      const xmlOut = execSync(
        `"${ADB_PATH}" -s ${device} shell "cat /data/data/com.sodareels.drama.short/shared_prefs/com.sodareels.drama.short.xml 2>/dev/null"`,
        { encoding: 'utf8' }
      );

      const match = xmlOut.match(/name="TAG_SP_FCM_NOTIFY2">([^<]+)<\/string>/);
      if (match) {
        try {
          const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          const parsed = JSON.parse(decoded);
          if (parsed && parsed.list) {
            allDramas = parsed.list.map(d => ({
              id: d.dramaId,
              title: d.title,
              image: d.image,
              desc: d.desc
            }));
          }
        } catch (e) {}
      }

      const feedMatch = xmlOut.match(/name="TAG_FEED_NOTICE_LIST">([^<]+)<\/string>/);
      if (feedMatch) {
        try {
          const decodedFeed = feedMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          const parsedFeed = JSON.parse(decodedFeed);
          if (Array.isArray(parsedFeed)) {
            parsedFeed.forEach(item => {
              if (item && item.dramaId && !allDramas.some(d => String(d.id) === String(item.dramaId))) {
                allDramas.push({
                  id: item.dramaId,
                  title: item.name || item.title || `Drama_${item.dramaId}`,
                  image: item.coverUrl || item.image || '',
                  desc: item.des || item.desc || ''
                });
              }
            });
          }
        } catch (e) {}
      }
    } catch (e) {}

    if (lastDramaId && allDramas.length > 0) {
      currentDrama = allDramas.find(d => String(d.id) === String(lastDramaId));
    }
    if (!currentDrama && allDramas.length > 0) {
      currentDrama = allDramas[0];
    }

    if (currentDrama) {
      currentDrama.currentEpisode = currentEpisode;
      currentDrama.totalEpisodes = totalEpisodes;
    }

    return { currentDrama, allDramas, lastDramaId, currentEpisode, totalEpisodes };
  } catch (e) {
    return { currentDrama: null, allDramas: [], currentEpisode: 1, totalEpisodes: 0 };
  }
}

function getLocalDramas() {
  if (!fs.existsSync(TARGET_DIR)) return [];
  const entries = fs.readdirSync(TARGET_DIR, { withFileTypes: true });
  const dramas = [];

  entries.filter(e => e.isDirectory() && e.name !== 'hinh_anh').forEach(dir => {
    const dirPath = path.join(TARGET_DIR, dir.name);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.mp4'));
    files.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    let maxEpisode = 0;
    const videos = files.map(f => {
      const stat = fs.statSync(path.join(dirPath, f));
      const m = f.match(/Tap_(\d+)/i) || f.match(/(\d+)/);
      let epNum = 0;
      if (m) {
        epNum = parseInt(m[1], 10);
        if (epNum > maxEpisode) maxEpisode = epNum;
      }
      return {
        name: f,
        epNumber: epNum,
        drama: dir.name,
        relPath: `${dir.name}/${f}`,
        sizeBytes: stat.size,
        sizeMb: (stat.size / (1024 * 1024)).toFixed(2)
      };
    });

    const totalBytes = videos.reduce((acc, v) => acc + v.sizeBytes, 0);
    const hasPoster = fs.existsSync(path.join(dirPath, 'poster.png'));

    dramas.push({
      name: dir.name,
      count: videos.length,
      maxEpisode,
      nextEpisode: maxEpisode + 1,
      totalSizeMb: (totalBytes / (1024 * 1024)).toFixed(2),
      hasPoster,
      videos
    });
  });

  // Kiểm tra root videos nếu có
  const rootFiles = fs.readdirSync(TARGET_DIR).filter(f => f.endsWith('.mp4'));
  if (rootFiles.length > 0) {
    const rootVideos = rootFiles.map(f => {
      const stat = fs.statSync(path.join(TARGET_DIR, f));
      return {
        name: f,
        drama: 'Khác',
        relPath: f,
        sizeBytes: stat.size,
        sizeMb: (stat.size / (1024 * 1024)).toFixed(2)
      };
    });
    dramas.push({
      name: 'Chưa phân loại',
      count: rootVideos.length,
      maxEpisode: rootVideos.length,
      nextEpisode: rootVideos.length + 1,
      totalSizeMb: (rootVideos.reduce((a, b) => a + b.sizeBytes, 0) / (1024 * 1024)).toFixed(2),
      hasPoster: false,
      videos: rootVideos
    });
  }

  return dramas;
}

function exportVideos(device, payload) {
  const rawDramaName = payload.dramaTitle || 'Bo_Phim_Moi';
  const folderName = sanitizeFolderName(rawDramaName);
  const dramaDir = path.join(TARGET_DIR, folderName);
  if (!fs.existsSync(dramaDir)) fs.mkdirSync(dramaDir, { recursive: true });

  const selectedPaths = payload.selectedPaths || [];
  if (selectedPaths.length === 0) {
    throw new Error('Bạn chưa chọn tập nào để xuất!');
  }

  let startEp = parseInt(payload.startEpisode, 10) || 1;

  // Kiểm tra tập đã có để tự tăng số tập
  const existingFiles = fs.readdirSync(dramaDir).filter(f => f.endsWith('.mp4'));
  let currentMaxEp = 0;
  existingFiles.forEach(f => {
    const m = f.match(/Tap_(\d+)/i) || f.match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > currentMaxEp) currentMaxEp = n;
    }
  });

  const checkTarget = path.join(dramaDir, `Tap_${String(startEp).padStart(2, '0')}.mp4`);
  if (fs.existsSync(checkTarget)) {
    startEp = currentMaxEp + 1;
  }

  const activeApp = resolveActiveApp(device);
  const compInfo = getRemoteCacheCompletenessMap(device, activeApp);
  const incompleteList = [];

  selectedPaths.forEach(item => {
    const remotePath = typeof item === 'string' ? item : item.path;
    const info = compInfo.map[remotePath];
    if (info && !info.isComplete) {
      incompleteList.push({
        path: remotePath,
        pct: info.pct,
        sizeMb: info.sizeMb,
        expectedMb: info.expectedMb
      });
    }
  });

  if (incompleteList.length > 0 && !payload.force) {
    const err = new Error(`Có ${incompleteList.length} tập video chưa tải xong 100% (ví dụ mới được ${incompleteList[0].pct}%). Nếu xuất sẽ bị dừng giữa chừng khi xem! Vui lòng mở lại tập đó trên app để tải đủ 100% rồi hẵng xuất.`);
    err.hasIncomplete = true;
    err.incomplete = incompleteList;
    throw err;
  }

  const pulled = [];
  const skipped = [];

  // Quét danh sách các tập video đã có sẵn trong thư mục
  const existingSizeMap = new Map();
  existingFiles.forEach(f => {
    try {
      const sz = fs.statSync(path.join(dramaDir, f)).size;
      existingSizeMap.set(sz, f);
    } catch (e) {}
  });

  selectedPaths.forEach((item, idx) => {
    const remotePath = typeof item === 'string' ? item : item.path;
    let epNum = (typeof item === 'object' && item.epNumber) ? item.epNumber : (startEp + idx);
    let remoteSize = (typeof item === 'object' && item.sizeBytes) ? item.sizeBytes : 0;

    // 1. Kiểm tra: nếu file video này đã có trong thư mục tải về (khớp dung lượng) -> BỎ QUA KHÔNG TẢI LẠI
    if (remoteSize > 0) {
      for (const [sz, fName] of existingSizeMap.entries()) {
        if (Math.abs(sz - remoteSize) <= 64) {
          skipped.push(fName);
          return;
        }
      }
    }

    let localName = `Tap_${String(epNum).padStart(2, '0')}.mp4`;
    let localPath = path.join(dramaDir, localName);

    // Nếu tên file đã tồn tại nhưng khác nội dung, tự tăng sang tập kế tiếp
    while (fs.existsSync(localPath)) {
      epNum++;
      localName = `Tap_${String(epNum).padStart(2, '0')}.mp4`;
      localPath = path.join(dramaDir, localName);
    }

    pullRemoteFile(device, remotePath, localPath);
    pulled.push(localName);
    // Cập nhật lại map để tránh trùng lặp
    try {
      const pulledSz = fs.statSync(localPath).size;
      existingSizeMap.set(pulledSz, localName);
    } catch (e) {}
  });

  // Tải ảnh poster
  (async () => {
    if (payload.posterUrl) {
      try { await downloadFile(payload.posterUrl, path.join(dramaDir, 'poster.png')); } catch (e) {}
    }
    try {
      execSync(`"${ADB_PATH}" -s ${device} pull "/sdcard/Android/data/com.sodareels.drama.short/files/test_990811793717840482drama_tv_image.png" "${path.join(dramaDir, 'poster.png')}"`);
    } catch (e) {}
  })();

  return {
    count: pulled.length,
    skippedCount: skipped.length,
    skipped,
    folder: folderName,
    pulled
  };
}

function exportSingleCacheItem(device, remoteItem, rawDramaName, preferredEp) {
  const folderName = sanitizeFolderName(rawDramaName || 'Bo_Phim_Moi');
  const dramaDir = path.join(TARGET_DIR, folderName);
  if (!fs.existsSync(dramaDir)) fs.mkdirSync(dramaDir, { recursive: true });

  const remotePath = typeof remoteItem === 'string' ? remoteItem : remoteItem.path;
  const remoteSize = (typeof remoteItem === 'object' && remoteItem.sizeBytes) ? remoteItem.sizeBytes : 0;

  const existingFiles = fs.readdirSync(dramaDir).filter(f => f.endsWith('.mp4'));
  let currentMaxEp = 0;
  for (const f of existingFiles) {
    const m = f.match(/Tap_(\d+)/i) || f.match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > currentMaxEp) currentMaxEp = n;
    }
    if (remoteSize > 0) {
      try {
        const sz = fs.statSync(path.join(dramaDir, f)).size;
        if (Math.abs(sz - remoteSize) <= 64) {
          return { skipped: true, filename: f, folder: folderName, epNum: currentMaxEp };
        }
      } catch (e) {}
    }
  }

  let epNum = preferredEp || (currentMaxEp + 1);
  let localName = `Tap_${String(epNum).padStart(2, '0')}.mp4`;
  let localPath = path.join(dramaDir, localName);
  while (fs.existsSync(localPath)) {
    epNum++;
    localName = `Tap_${String(epNum).padStart(2, '0')}.mp4`;
    localPath = path.join(dramaDir, localName);
  }

  pullRemoteFile(device, remotePath, localPath);
  return { skipped: false, filename: localName, folder: folderName, epNum };
}

function deleteRemoteCache(device, paths) {
  if (!device || !paths || paths.length === 0) return;
  paths.forEach(p => {
    try {
      execSync(`"${ADB_PATH}" -s ${device} shell "rm -f '${p}' '${p}nodeconf'"`);
      if (p.includes('dm_video_cache')) {
        const parentDir = path.posix.dirname(p);
        execSync(`"${ADB_PATH}" -s ${device} shell "rm -rf '${parentDir}'"`);
      }
    } catch (e) {}
  });
}

async function downloadDirectVideo(url, rawDramaName, epNum) {
  const folderName = sanitizeFolderName(rawDramaName || 'Bo_Phim_Moi');
  const dramaDir = path.join(TARGET_DIR, folderName);
  if (!fs.existsSync(dramaDir)) fs.mkdirSync(dramaDir, { recursive: true });

  const fileName = `Tap_${String(epNum).padStart(2, '0')}.mp4`;
  const destPath = path.join(dramaDir, fileName);

  const ok = await downloadFile(url, destPath);
  let sizeBytes = 0;
  if (ok && fs.existsSync(destPath)) {
    sizeBytes = fs.statSync(destPath).size;
  }
  return { success: ok, filename: fileName, folder: folderName, path: destPath, sizeBytes };
}

function getDirectDramaEpisodes(device, appKey = 'minutedrama', requestedTitle = '') {
  if (!device || appKey !== 'minutedrama') return { title: '', totalEpisodes: 0, episodes: [] };
  try {
    const rawDetail = adbQuerySqlite(
      device,
      '/data/data/com.minute.minishort.drama/databases/file_manager.db',
      'SELECT json FROM videoDetail;'
    );
    if (!rawDetail) return { title: '', totalEpisodes: 0, episodes: [] };
    const jsonLines = rawDetail.split(/\r?\n/).filter(Boolean);

    let activeTitle = (requestedTitle || '').trim().toLowerCase();
    if (!activeTitle) {
      try {
        const lastPlay = adbQuerySqlite(
          device,
          '/data/data/com.minute.minishort.drama/databases/file_manager.db',
          'SELECT title FROM playEpisodeHistory ORDER BY id DESC LIMIT 1;'
        );
        if (lastPlay) activeTitle = lastPlay.trim().toLowerCase();
      } catch (e) {}
    }

    let bestDrama = null;
    jsonLines.forEach(jl => {
      try {
        const d = JSON.parse(jl.trim());
        if (d && d.episodesInfos && d.episodesInfos.length > 0) {
          const dTitle = (d.title || '').toLowerCase();
          if (activeTitle && (dTitle.includes(activeTitle) || activeTitle.includes(dTitle))) {
            bestDrama = d;
          } else if (!bestDrama) {
            bestDrama = d;
          }
        }
      } catch (e) {}
    });

    if (!bestDrama) return { title: '', totalEpisodes: 0, episodes: [] };

    const episodes = (bestDrama.episodesInfos || []).map(ep => {
      // Ưu tiên signPlayUrlH264 (H.264) để xem mượt mà trên mọi thiết bị và Windows Media Player mà không bị lỗi 0xC00D36C4 (thiếu HEVC)
      const directUrl = ep.signPlayUrlH264 || ep.signPlayUrl || ep.bkSignPlayUrl || '';
      return {
        epNumber: ep.episodeNum,
        directUrl,
        directUrlH264: ep.signPlayUrlH264 || '',
        directUrlH265: ep.signPlayUrl || '',
        duration: ep.episodeDuration || 0,
        isVip: (ep.vipFlag === 1)
      };
    });

    return {
      title: bestDrama.title || '',
      coverUrl: bestDrama.coverUrl || '',
      totalEpisodes: bestDrama.episodesCount || episodes.length,
      episodes
    };
  } catch (e) {
    return { title: '', totalEpisodes: 0, episodes: [] };
  }
}

module.exports = {
  sanitizeFolderName,
  downloadFile,
  getDramaInfoFromDevice,
  getLocalDramas,
  exportVideos,
  exportSingleCacheItem,
  deleteRemoteCache,
  downloadDirectVideo,
  getDirectDramaEpisodes
};
