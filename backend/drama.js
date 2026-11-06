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

/**
 * Tự động tìm chính xác thư mục bộ phim đã có trên máy để lưu tiếp,
 * tuyệt đối không tự ý tạo ra bộ phim mới trùng lặp khi tên chỉ khác dấu câu (ví dụ ':' vs '-').
 */
function resolveExistingDramaFolder(rawName) {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    return sanitizeFolderName(rawName || 'Phim_Drama');
  }

  const existingFolders = fs.readdirSync(TARGET_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'hinh_anh')
    .map(e => e.name);

  if (existingFolders.length === 0) {
    return sanitizeFolderName(rawName || 'Phim_Drama');
  }

  const clean = (s) => (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const targetClean = clean(rawName);

  // 1. Khớp chính xác 100% với tên thư mục đã có trên đĩa
  for (const f of existingFolders) {
    if (f === rawName) return f;
  }

  // 2. Khớp sau khi chuẩn hóa (bỏ dấu tiếng Việt, bỏ ký tự đặc biệt như ':' và '-', chữ hoa thường)
  if (targetClean) {
    for (const f of existingFolders) {
      if (clean(f) === targetClean) return f;
    }

    // 3. Khớp chuỗi tương đương (ví dụ "tiem tap hoa am duong: am anh" vs "tiem tap hoa am duong - am anh")
    for (const f of existingFolders) {
      const fClean = clean(f);
      if (fClean && (fClean.includes(targetClean) || targetClean.includes(fClean))) {
        return f;
      }
    }
  }

  // 4. Nếu tên truyền vào rỗng hoặc chung chung mà máy đã có bộ phim, giữ nguyên bộ phim đó
  if (!targetClean || targetClean === 'phim drama' || targetClean === 'bo phim moi') {
    return existingFolders[0];
  }

  return sanitizeFolderName(rawName);
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
      const rawRows = adbQuerySqlite(
        device,
        '/data/data/com.minute.minishort.drama/databases/file_manager.db',
        'SELECT title, episode_num, total_episode, cover_url FROM playEpisodeHistory ORDER BY id DESC LIMIT 1;'
      );
      if (rawRows) {
        const parts = rawRows.trim().split('|');
        const title = (parts[0] || '').trim();
        const ep = parseInt(parts[1], 10) || 1;
        const total = parseInt(parts[2], 10) || 0;
        const cover = (parts[3] || '').trim();
        if (title) {
          currentDrama = {
            id: `minute_${title}`,
            title,
            image: cover,
            cover: cover,
            coverUrl: cover,
            desc: `Phim MinuteDrama • Đang xem tập ${ep}/${total}`,
            currentEpisode: ep,
            totalEpisodes: total
          };
        }
      }

      return {
        currentDrama,
        allDramas: currentDrama ? [currentDrama] : [],
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
            allDramas = parsed.list.map(d => {
              const img = d.image || d.coverUrl || '';
              return {
                id: d.dramaId,
                title: d.title,
                image: img,
                cover: img,
                coverUrl: img,
                desc: d.desc
              };
            });
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
                const img = item.coverUrl || item.image || '';
                allDramas.push({
                  id: item.dramaId,
                  title: item.name || item.title || `Drama_${item.dramaId}`,
                  image: img,
                  cover: img,
                  coverUrl: img,
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

    // Chỉ trả về duy nhất bộ phim đang mở trên thiết bị
    const singleDramaList = currentDrama ? [currentDrama] : [];
    return { currentDrama, allDramas: singleDramaList, lastDramaId, currentEpisode, totalEpisodes };
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
  const rawDramaName = payload.dramaTitle || payload.dramaName || payload.folder || 'Bo_Phim_Moi';
  const folderName = resolveExistingDramaFolder(rawDramaName);
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
    const remotePath = typeof item === 'string' ? item : item?.path;
    if (!remotePath) return;
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
    const remotePath = typeof item === 'string' ? item : item?.path;
    if (!remotePath) return;
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

  // Tự động tải và đồng bộ ảnh poster phim
  (async () => {
    try {
      await downloadDramaPoster(device, folderName, payload.posterUrl || payload.coverUrl || payload.image);
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
  const folderName = resolveExistingDramaFolder(rawDramaName);
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
  const folderName = resolveExistingDramaFolder(rawDramaName);
  const dramaDir = path.join(TARGET_DIR, folderName);
  if (!fs.existsSync(dramaDir)) fs.mkdirSync(dramaDir, { recursive: true });

  const fileName = `Tap_${String(epNum).padStart(2, '0')}.mp4`;
  const destPath = path.join(dramaDir, fileName);

  // Nếu file tập này đã tải rồi và dung lượng > 500KB thì bỏ qua không tải lại để tiết kiệm thời gian
  if (fs.existsSync(destPath)) {
    const currentSize = fs.statSync(destPath).size;
    if (currentSize > 500 * 1024) {
      return { success: true, filename: fileName, folder: folderName, path: destPath, sizeBytes: currentSize, alreadyExists: true };
    }
  }

  const ok = await downloadFile(url, destPath);
  let sizeBytes = 0;
  if (ok && fs.existsSync(destPath)) {
    sizeBytes = fs.statSync(destPath).size;
  }
  return { success: ok, filename: fileName, folder: folderName, path: destPath, sizeBytes };
}

function getDirectDramaEpisodes(device, appKey = 'sodareels', requestedTitle = '') {
  if (!device) return { app: appKey, title: '', totalEpisodes: 0, episodes: [], availableDramas: [] };

  const effectiveApp = (appKey === 'auto') ? detectActiveApp(device) : appKey;

  // 1. NẾU ĐANG CHỌN SODA REELS -> CHỈ LẤY ĐÚNG BỘ PHIM ĐANG MỞ TRÊN SODA REELS
  if (effectiveApp === 'sodareels') {
    try {
      const sodaInfo = getDramaInfoFromDevice(device, 'sodareels');
      const currentDrama = sodaInfo.currentDrama;

      const dramaTitle = currentDrama ? currentDrama.title : (requestedTitle || 'Dám rút kiếm đối đầu với thần linh');
      const coverUrl = currentDrama ? (currentDrama.image || currentDrama.cover || currentDrama.coverUrl || '') : '';
      const totalEpisodes = currentDrama ? (currentDrama.totalEpisodes || 60) : 60;

      // Lấy danh sách các tập video đã được cache trong bộ nhớ PSSDK của Soda Reels
      const { getRemoteCacheList } = require('./cache');
      const cacheList = getRemoteCacheList(device, 'sodareels', currentDrama ? (currentDrama.currentEpisode || 1) : 1);
      const cacheMap = new Map();
      cacheList.forEach(c => {
        if (c.epNumber) cacheMap.set(c.epNumber, c);
      });

      // Tạo đầy đủ toàn bộ các tập từ 1 đến totalEpisodes của cả bộ phim
      const totalCount = Math.max(totalEpisodes || 60, cacheList.length > 0 ? Math.max(...cacheList.map(c => c.epNumber)) : 60);
      const episodes = [];
      for (let i = 1; i <= totalCount; i++) {
        const c = cacheMap.get(i);
        if (c) {
          const streamUrl = `http://localhost:3000/api/stream-cache?drama=${encodeURIComponent(dramaTitle)}&ep=${i}`;
          episodes.push({
            epNumber: i,
            directUrl: streamUrl,
            directUrlH264: streamUrl,
            directUrlH265: streamUrl,
            path: c.path,
            filename: c.filename,
            duration: 0,
            sizeFormatted: c.sizeMb ? `${c.sizeMb} MB` : '',
            sizeBytes: c.sizeBytes || 0,
            isCached: true,
            isComplete: c.isComplete,
            pct: c.pct || 100,
            isVip: false
          });
        } else {
          episodes.push({
            epNumber: i,
            directUrl: '',
            directUrlH264: '',
            directUrlH265: '',
            path: '',
            filename: '',
            duration: 0,
            sizeFormatted: '',
            sizeBytes: 0,
            isCached: false,
            isComplete: false,
            pct: 0,
            isVip: false
          });
        }
      }

      return {
        app: 'sodareels',
        title: dramaTitle,
        coverUrl,
        totalEpisodes: totalCount,
        cachedCount: cacheList.length,
        episodes,
        availableDramas: []
      };
    } catch (e) {
      return { app: 'sodareels', title: '', totalEpisodes: 0, episodes: [], availableDramas: [] };
    }
  }

  // 2. NẾU ĐANG CHỌN MINUTEDRAMA -> CHỈ LẤY ĐÚNG BỘ PHIM ĐANG MỞ TRÊN MINUTEDRAMA
  try {
    const dbPath = '/data/data/com.minute.minishort.drama/databases/file_manager.db';
    
    // Tìm bộ phim đang mở gần nhất từ lịch sử phát
    let activeTitle = (requestedTitle || '').trim();
    if (!activeTitle) {
      const lastPlay = adbQuerySqlite(device, dbPath, 'SELECT title FROM playEpisodeHistory ORDER BY id DESC LIMIT 1;');
      if (lastPlay) activeTitle = lastPlay.trim();
    }

    let rawJson = '';
    if (activeTitle) {
      const cleanT = activeTitle.replace(/['"\\]/g, '');
      rawJson = adbQuerySqlite(device, dbPath, `SELECT json FROM videoDetail WHERE json LIKE '%${cleanT}%' ORDER BY id DESC LIMIT 1;`);
    }
    if (!rawJson) {
      rawJson = adbQuerySqlite(device, dbPath, 'SELECT json FROM videoDetail ORDER BY id DESC LIMIT 1;');
    }

    if (!rawJson) return { app: 'minutedrama', title: activeTitle, totalEpisodes: 0, episodes: [], availableDramas: [] };
    const bestDrama = JSON.parse(rawJson.trim());
    if (!bestDrama) return { app: 'minutedrama', title: activeTitle, totalEpisodes: 0, episodes: [], availableDramas: [] };

    const episodes = (bestDrama.episodesInfos || []).map(ep => {
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
      app: 'minutedrama',
      title: bestDrama.title || activeTitle,
      coverUrl: bestDrama.coverUrl || '',
      totalEpisodes: bestDrama.episodesCount || episodes.length,
      episodes,
      availableDramas: []
    };
  } catch (e) {
    return { app: 'minutedrama', title: '', totalEpisodes: 0, episodes: [], availableDramas: [] };
  }
}

async function downloadDramaPoster(device, rawDramaName, customUrl = '') {
  const folderName = resolveExistingDramaFolder(rawDramaName);
  const dramaDir = path.join(TARGET_DIR, folderName);
  if (!fs.existsSync(dramaDir)) fs.mkdirSync(dramaDir, { recursive: true });
  const posterPath = path.join(dramaDir, 'poster.png');

  // 1. Nếu có URL truyền trực tiếp
  let url = (customUrl || '').trim();

  // 2. Nếu chưa có URL, tự truy xuất từ thiết bị
  if (!url && device) {
    try {
      // Thử MinuteDrama trước
      const minInfo = getDramaInfoFromDevice(device, 'minutedrama');
      const minMatch = (minInfo.allDramas || []).concat(minInfo.currentDrama ? [minInfo.currentDrama] : [])
        .find(d => d && (d.title === rawDramaName || d.title === folderName || (d.title && folderName.includes(d.title)) || (d.title && rawDramaName.includes(d.title))));
      if (minMatch && (minMatch.image || minMatch.cover)) {
        url = minMatch.image || minMatch.cover;
      }

      // Nếu chưa có, thử Soda Reels
      if (!url) {
        const sodaInfo = getDramaInfoFromDevice(device, 'sodareels');
        const sodaMatch = (sodaInfo.allDramas || []).concat(sodaInfo.currentDrama ? [sodaInfo.currentDrama] : [])
          .find(d => d && (d.title === rawDramaName || d.title === folderName || (d.title && folderName.includes(d.title)) || (d.title && rawDramaName.includes(d.title))));
        if (sodaMatch && (sodaMatch.image || sodaMatch.cover)) {
          url = sodaMatch.image || sodaMatch.cover;
        }
      }
    } catch (e) {}
  }

  // 3. Nếu tìm thấy URL ảnh mạng -> Tải về lưu thành poster.png
  if (url && url.startsWith('http')) {
    const ok = await downloadFile(url, posterPath);
    if (ok && fs.existsSync(posterPath)) {
      return { success: true, folder: folderName, path: posterPath, sizeBytes: fs.statSync(posterPath).size, url };
    }
  }

  // 4. Nếu là Soda Reels và có ảnh trên SDCard
  if (device) {
    try {
      const out = execSync(
        `"${ADB_PATH}" -s ${device} shell "ls -1t /sdcard/Android/data/com.sodareels.drama.short/files/test_*drama_tv_image.png 2>/dev/null | head -n 1"`,
        { encoding: 'utf8' }
      ).trim();
      if (out && out.includes('.png')) {
        pullRemoteFile(device, out, posterPath);
        if (fs.existsSync(posterPath)) {
          return { success: true, folder: folderName, path: posterPath, sizeBytes: fs.statSync(posterPath).size, source: 'sdcard' };
        }
      }
    } catch (e) {}
  }

  return { success: false, message: 'Không tìm thấy poster phù hợp trên thiết bị hoặc CDN' };
}

module.exports = {
  sanitizeFolderName,
  resolveExistingDramaFolder,
  downloadFile,
  downloadDramaPoster,
  getDramaInfoFromDevice,
  getLocalDramas,
  exportVideos,
  exportSingleCacheItem,
  deleteRemoteCache,
  downloadDirectVideo,
  getDirectDramaEpisodes
};
