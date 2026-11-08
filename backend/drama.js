const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ADB_PATH, TARGET_DIR, TEMP_DIR, FFMPEG_PATH } = require('./config');
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

function downloadFile(url, destPath, onProgress) {
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
            const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
            let currentBytes = 0;
            let lastUpdate = 0;
            const file = fs.createWriteStream(destPath);
            res.on('data', (chunk) => {
              currentBytes += chunk.length;
              const now = Date.now();
              if (onProgress && totalBytes > 0 && (now - lastUpdate > 120 || currentBytes === totalBytes)) {
                lastUpdate = now;
                const pct = Math.min(99, Math.round((currentBytes / totalBytes) * 100));
                onProgress({ currentBytes, totalBytes, pct, status: 'downloading' });
              }
            });
            res.pipe(file);
            file.on('finish', () => {
              file.close();
              if (onProgress) {
                const finalBytes = totalBytes || currentBytes;
                onProgress({ currentBytes: finalBytes, totalBytes: finalBytes, pct: 100, status: 'done' });
              }
              resolve(true);
            });
          } else {
            resolve(false);
          }
        }).on('error', () => resolve(false));
      } catch (e) { resolve(false); }
    };
    doReq(url);
  });
}

// Trích xuất kích thước và định dạng ảnh từ Buffer nhị phân (hỗ trợ PNG, JPEG, WebP)
function getImageDimensions(buffer) {
  if (!buffer || buffer.length < 24) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { type: 'png', width, height };
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xFF) { offset++; continue; }
      const marker = buffer[offset + 1];
      if (marker >= 0xC0 && marker <= 0xC3 && marker !== 0xC4) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { type: 'jpg', width, height };
      }
      const len = buffer.readUInt16BE(offset + 2);
      offset += 2 + len;
    }
  }
  // WebP: RIFF ... WEBP
  if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const format = buffer.toString('ascii', 12, 16);
    if (format === 'VP8 ') {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { type: 'webp', width, height };
    } else if (format === 'VP8L') {
      const b0 = buffer[21], b1 = buffer[22], b2 = buffer[23], b3 = buffer[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + ((((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)));
      return { type: 'webp', width, height };
    }
  }
  return null;
}

// Tìm đúng file ảnh poster của DramaBox trong glide_cache
// Đặc điểm poster phim DramaBox: tỷ lệ chân dung chuẩn ~3:4 (ratio chiều cao / chiều rộng từ 1.20 đến 1.55), chiều rộng >= 150px
// Không lấy nhầm avatar/icon vuông (1:1) hay ảnh video dọc 9:16 (ratio > 1.65)
function findDramaBoxPosterFromGlide(device) {
  if (!device) return null;
  try {
    const raw = execSync(
      `"${ADB_PATH}" -s ${device} shell "su root ls -1t /sdcard/Android/data/com.storymatrix.drama/cache/glide_cache/*.0 2>/dev/null | head -n 35"`,
      { encoding: 'utf8', timeout: 3500 }
    );
    const files = raw.trim().split('\n').map(s => s.trim()).filter(Boolean);
    for (const f of files) {
      try {
        const b64 = execSync(`"${ADB_PATH}" -s ${device} shell "su root head -c 2048 '${f}' | base64"`, { encoding: 'utf8', timeout: 1500 }).trim();
        if (!b64) continue;
        const buf = Buffer.from(b64, 'base64');
        const dim = getImageDimensions(buf);
        if (dim && dim.width >= 150 && dim.height >= 200) {
          const ratio = dim.height / dim.width;
          if (ratio >= 1.20 && ratio <= 1.55) {
            return f;
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

let cachedGalleryDramas = null;
let lastGalleryScan = 0;

function scanDeviceGalleryDramas(device, requestedDrama = '') {
  if (!device) return { currentDrama: null, allDramas: [] };
  const now = Date.now();
  if (cachedGalleryDramas && (now - lastGalleryScan < 4000)) {
    let currentDrama = null;
    if (requestedDrama) {
      currentDrama = cachedGalleryDramas.allDramas.find(d => d.title.toLowerCase().includes(requestedDrama.toLowerCase())) || null;
    }
    if (!currentDrama && cachedGalleryDramas.allDramas.length > 0) {
      currentDrama = cachedGalleryDramas.allDramas[0];
    }
    return { currentDrama, allDramas: cachedGalleryDramas.allDramas };
  }
  const dramasMap = new Map();
  try {
    const rawFiles = [];
    // 1. Thử lấy danh sách video từ MediaStore (đúng những gì app Thư viện Android hiển thị)
    try {
      const mediaOut = execSync(`"${ADB_PATH}" -s ${device} shell "content query --uri content://media/external/video/media"`, { encoding: 'utf8', timeout: 4000 });
      const mediaLines = mediaOut.split('\n');
      mediaLines.forEach(l => {
        const m = l.match(/_data=([^,\r\n]+)/);
        if (m && m[1] && m[1].toLowerCase().endsWith('.mp4')) {
          rawFiles.push(m[1].trim());
        }
      });
    } catch (me) {}

    // 2. Quét thêm các thư mục video phổ biến trên điện thoại / giả lập
    try {
      const cmd = `"${ADB_PATH}" -s ${device} shell "su 0 sh -c 'ls -1 /sdcard/Android/data/*/files/Download/*/*.mp4 /sdcard/Android/data/*/files/Download/*/*/*.mp4 /sdcard/Download/*/*.mp4 /sdcard/Download/*.mp4 /sdcard/DCIM/*/*.mp4 /sdcard/DCIM/Camera/*.mp4 /sdcard/Movies/*/*.mp4 /sdcard/Movies/*.mp4 2>/dev/null || true'"`;
      const out = execSync(cmd, { encoding: 'utf8', timeout: 5000 });
      const lines = out.split(/\r?\n/).map(l => l.trim()).filter(l => l.endsWith('.mp4'));
      lines.forEach(f => {
        if (!rawFiles.includes(f)) rawFiles.push(f);
      });
    } catch (le) {}

    rawFiles.forEach(filePath => {
      const fileName = path.basename(filePath);
      let cleanTitle = 'Video_Thu_Vien';
      let epNumber = 1;
      const mEp = fileName.match(/_S\d+_E(\d+)/i) || fileName.match(/_E(\d+)/i) || fileName.match(/_(\d+)\.mp4$/i) || fileName.match(/Tap_(\d+)/i) || fileName.match(/(\d+)/);
      if (mEp) epNumber = parseInt(mEp[1], 10) || 1;
      const mTitle = fileName.match(/^\[?(?:Dubbed)?\]?_?([^_]+(?:_[^_]+)*?)_S\d+_E\d+/i) || fileName.match(/^([^_]+(?:_[^_]+)*?)_E\d+/i);
      if (mTitle) {
        cleanTitle = mTitle[1].replace(/_/g, ' ').trim();
      } else {
        const parentDir = path.basename(path.dirname(filePath));
        if (parentDir && parentDir !== 'd' && parentDir !== 'Download' && parentDir !== 'DCIM' && parentDir !== 'Movies') {
          cleanTitle = parentDir.replace(/\[Dubbed\]_?/g, '').replace(/_/g, ' ').trim();
        } else {
          cleanTitle = fileName.replace(/\.mp4$/i, '').replace(/_S\d+_E\d+/i, '').replace(/_/g, ' ').trim();
        }
      }

      if (!dramasMap.has(cleanTitle)) dramasMap.set(cleanTitle, []);
      dramasMap.get(cleanTitle).push({ epNumber, fileName, filePath });
    });
  } catch (e) {}

  const allDramas = [];
  for (const [title, eps] of dramasMap.entries()) {
    eps.sort((a, b) => a.epNumber - b.epNumber);
    const folderName = resolveExistingDramaFolder(title);
    const localDir = path.join(TARGET_DIR, folderName);
    const localPoster = path.join(localDir, 'poster.png');
    let cover = `/poster/${encodeURIComponent(title)}`;

    if (fs.existsSync(localPoster) && fs.statSync(localPoster).size > 0) {
      cover = `/poster/${encodeURIComponent(title)}`;
    } else {
      // 1. Thử lấy poster từ OneRoom DB
      try {
        const cleanT = title.replace(/['"\\]/g, '');
        const orCover = adbQuerySqlite(device, '/data/data/com.community.oneroom/databases/oneroom-db', `SELECT cover FROM download_table WHERE subjectName LIKE '%${cleanT}%' OR name LIKE '%${cleanT}%' LIMIT 1;`);
        if (orCover && orCover.trim().startsWith('http')) {
          cover = orCover.trim();
          if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
          downloadFile(cover, localPoster).catch(() => {});
        }
      } catch (e) {}

      // 2. Thử lấy từ các app database khác nếu có
      if (cover.startsWith('/poster/')) {
        try {
          const cleanT = title.replace(/['"\\]/g, '');
          const lsCover = adbQuerySqlite(device, '/data/data/com.short.movie.app/databases/mini_drama.db', `SELECT cover_url FROM drama_record WHERE name LIKE '%${cleanT}%' ORDER BY play_ts DESC LIMIT 1;`);
          if (lsCover && lsCover.trim().startsWith('http')) {
            cover = lsCover.trim();
            if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
            downloadFile(cover, localPoster).catch(() => {});
          }
        } catch (e) {}
      }

      // 3. Nếu chưa có poster nhưng đã có tập MP4 trên PC -> Trích xuất khung hình bằng ffmpeg
      if (cover.startsWith('/poster/') && FFMPEG_PATH && fs.existsSync(localDir)) {
        try {
          const localVideos = fs.readdirSync(localDir).filter(f => f.endsWith('.mp4')).sort();
          if (localVideos.length > 0 && !fs.existsSync(localPoster)) {
            const sampleVid = path.join(localDir, localVideos[0]);
            execSync(`"${FFMPEG_PATH}" -y -ss 00:00:02 -i "${sampleVid}" -vframes 1 -q:v 2 "${localPoster}"`, { stdio: 'ignore' });
            if (fs.existsSync(localPoster) && fs.statSync(localPoster).size > 0) {
              cover = `/poster/${encodeURIComponent(title)}`;
            }
          }
        } catch (e) {}
      }
    }

    allDramas.push({
      id: `gallery_${title.replace(/\s+/g, '_')}`,
      title,
      totalEpisodes: eps.length,
      currentEpisode: 1,
      cover,
      desc: `Phim trong Thư Viện / Bộ nhớ máy (${eps.length} tập MP4 có sẵn)`,
      episodes: eps
    });
  }

  let currentDrama = null;
  if (requestedDrama) {
    currentDrama = allDramas.find(d => d.title.toLowerCase().includes(requestedDrama.toLowerCase())) || null;
  }
  if (!currentDrama && allDramas.length > 0) {
    currentDrama = allDramas[0];
  }

  cachedGalleryDramas = { allDramas };
  lastGalleryScan = Date.now();

  return { currentDrama, allDramas };
}

function getDramaInfoFromDevice(device, appKey = 'loveshots', requestedDrama = '') {
  if (!device) return { currentDrama: null, allDramas: [], currentEpisode: 1, totalEpisodes: 0 };

  // -1. GALLERY (Thư viện / Bộ nhớ máy)
  if (appKey === 'gallery') {
    const { currentDrama, allDramas } = scanDeviceGalleryDramas(device, requestedDrama);
    return {
      currentDrama,
      allDramas,
      currentEpisode: currentDrama ? currentDrama.currentEpisode : 1,
      totalEpisodes: currentDrama ? currentDrama.totalEpisodes : 0
    };
  }

  // 0. LOVESHOTS
  if (appKey === 'loveshots') {
    try {
      let currentDrama = null;
      let title = '';
      let totalEpisodes = 0;
      let coverUrl = '';
      let desc = '';
      let dramaId = '';
      let currentEpisode = 1;

      const row = adbQuerySqlite(
        device,
        '/data/data/com.short.movie.app/databases/mini_drama.db',
        'SELECT id, name, total_episodes, cover_url, description FROM drama_record ORDER BY play_ts DESC LIMIT 1;'
      );
      if (row) {
        const parts = row.split('|');
        dramaId = (parts[0] || '').trim();
        title = (parts[1] || '').trim();
        totalEpisodes = parseInt(parts[2], 10) || 0;
        coverUrl = (parts[3] || '').trim();
        desc = (parts[4] || '').trim();
      }

      if (dramaId) {
        const epRow = adbQuerySqlite(
          device,
          '/data/data/com.short.movie.app/databases/mini_drama.db',
          `SELECT serial_no FROM episode_record WHERE drama_id = '${dramaId}' AND play_ts > 0 ORDER BY play_ts DESC LIMIT 1;`
        );
        if (epRow) {
          currentEpisode = parseInt(epRow.trim(), 10) || 1;
        }
      }

      let allDramas = [];
      try {
        const allRows = adbQuerySqlite(
          device,
          '/data/data/com.short.movie.app/databases/mini_drama.db',
          'SELECT id, name, total_episodes, cover_url, description FROM drama_record ORDER BY play_ts DESC LIMIT 20;'
        );
        if (allRows) {
          allRows.split(/\r?\n/).forEach(r => {
            const p = r.split('|');
            if (p[0] && p[1]) {
              allDramas.push({
                id: p[0].trim(),
                title: p[1].trim(),
                image: (p[3] || '').trim(),
                cover: (p[3] || '').trim(),
                coverUrl: (p[3] || '').trim(),
                desc: (p[4] || '').trim(),
                totalEpisodes: parseInt(p[2], 10) || 0
              });
            }
          });
        }
      } catch (e) {}

      if (title || dramaId) {
        currentDrama = {
          id: dramaId || `loveshots_${title}`,
          title: title || 'LoveShots Drama',
          image: coverUrl,
          cover: coverUrl,
          coverUrl: coverUrl,
          desc: desc || `Phim LoveShots • Đang xem tập ${currentEpisode}/${totalEpisodes}`,
          currentEpisode,
          totalEpisodes
        };
      }

      return {
        currentDrama,
        allDramas: allDramas.length > 0 ? allDramas : (currentDrama ? [currentDrama] : []),
        currentEpisode: currentDrama ? currentDrama.currentEpisode : 1,
        totalEpisodes: currentDrama ? currentDrama.totalEpisodes : 0
      };
    } catch (e) {
      return { currentDrama: null, allDramas: [], currentEpisode: 1, totalEpisodes: 0 };
    }
  }

  // 1. DRAMABOX
  if (appKey === 'dramabox') {
    try {
      let currentDrama = null;
      let title = '';
      let currentEpisode = 1;
      let totalEpisodes = 0;
      let desc = '';
      let coverUrl = '';

      // 1.0 Lấy bookId từ Activity Top (dumpsys activity top rất nhanh và ổn định)
      let bookId = '';
      try {
        const topOut = execSync(`"${ADB_PATH}" -s ${device} shell "dumpsys activity top 2>/dev/null | grep -o 'bookId=[0-9]*' | head -n 1"`, { encoding: 'utf8', timeout: 1500 }).trim();
        const m = topOut.match(/bookId=(\d+)/);
        if (m) bookId = m[1];
      } catch (e) {}

      // Đọc mapping bookId -> title từ file lưu trữ nếu có
      let titleMap = {};
      const mapPath = path.join(__dirname, 'dramabox_titles.json');
      try {
        if (fs.existsSync(mapPath)) titleMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      } catch (e) {}

      if (bookId && titleMap[bookId]) {
        title = titleMap[bookId];
      }

      // 1.1 Đọc từ SQLite drama.db trước
      try {
        const dbRow = adbQuerySqlite(
          device,
          '/data/data/com.storymatrix.drama/databases/drama.db',
          'SELECT bookId, bookName, cover, chapterCount, chapterIndex FROM book WHERE bookName IS NOT NULL AND bookName != "" ORDER BY utime DESC LIMIT 1;'
        );
        if (dbRow) {
          const parts = dbRow.split('|');
          if (parts[1]) {
            title = parts[1].trim();
            coverUrl = (parts[2] || '').trim();
            totalEpisodes = parseInt(parts[3], 10) || 0;
            currentEpisode = parseInt(parts[4], 10) || 1;
          }
        }
      } catch (e) {}

      // 1.2 Đọc từ UI dump nếu cần cập nhật tập đang xem hoặc tên phim
      try {
        const tmpLocal = path.join(TEMP_DIR || path.join(__dirname, '..', '.temp_preview'), 'dramabox_cur.xml');
        if (!fs.existsSync(path.dirname(tmpLocal))) fs.mkdirSync(path.dirname(tmpLocal), { recursive: true });

        // Tắt uiautomator cũ nếu có để tránh lỗi "already registered"
        try { execSync(`"${ADB_PATH}" -s ${device} shell "su root pkill -9 uiautomator 2>/dev/null || true"`, { timeout: 1500 }); } catch (e) {}

        execSync(`"${ADB_PATH}" -s ${device} shell "uiautomator dump /sdcard/dramabox_cur.xml 2>/dev/null"`, { timeout: 3500 });
        pullRemoteFile(device, '/sdcard/dramabox_cur.xml', tmpLocal);
        if (fs.existsSync(tmpLocal)) {
          let xml = fs.readFileSync(tmpLocal, 'utf8');

          const parseAttr = (id) => {
            const m = xml.match(new RegExp(`<node[^>]*resource-id="${id}"[^>]*>`));
            if (!m) return '';
            const tm = m[0].match(/text="([^"]*)"/);
            return tm ? tm[1] : '';
          };

          let uiTitle = parseAttr('com.storymatrix.drama:id/tv_name') || parseAttr('com.storymatrix.drama:id/tv_book_name');
          if (!uiTitle) {
            try {
              execSync(`"${ADB_PATH}" -s ${device} shell "input tap 450 800"`, { timeout: 2000 });
              execSync('powershell Start-Sleep -Milliseconds 400');
              execSync(`"${ADB_PATH}" -s ${device} shell "uiautomator dump /sdcard/dramabox_cur.xml 2>/dev/null"`, { timeout: 3500 });
              pullRemoteFile(device, '/sdcard/dramabox_cur.xml', tmpLocal);
              if (fs.existsSync(tmpLocal)) {
                xml = fs.readFileSync(tmpLocal, 'utf8');
                uiTitle = parseAttr('com.storymatrix.drama:id/tv_name') || parseAttr('com.storymatrix.drama:id/tv_book_name');
              }
            } catch (e) {}
          }

          if (uiTitle) {
            title = uiTitle;
            if (bookId && titleMap[bookId] !== uiTitle) {
              titleMap[bookId] = uiTitle;
              try { fs.writeFileSync(mapPath, JSON.stringify(titleMap, null, 2), 'utf8'); } catch (e) {}
            }
          }

          const epText = parseAttr('com.storymatrix.drama:id/tv_play_progress') || parseAttr('com.storymatrix.drama:id/tv_chapter_index');
          if (epText) {
            const n = parseInt(epText.replace(/\D/g, ''), 10);
            if (n) currentEpisode = n;
          }

          const uiDesc = parseAttr('com.storymatrix.drama:id/tv_introduction');
          if (uiDesc) desc = uiDesc;
        }
      } catch (e) {}

      // 1.3 Lấy poster chuẩn xác nhất cho bộ phim này:
      // A. Nếu trên máy đã có poster.png trong thư mục phim -> Sử dụng ngay 100%
      if (title) {
        const localFolder = resolveExistingDramaFolder(title);
        const localPoster = path.join(TARGET_DIR, localFolder, 'poster.png');
        if (fs.existsSync(localPoster) && fs.statSync(localPoster).size > 0) {
          coverUrl = `/poster/${encodeURIComponent(localFolder)}`;
        }
      }

      // B. Nếu chưa có trên máy và chưa có trong SQLite -> tìm từ glide_cache và tải về lưu cho phim
      if (!coverUrl) {
        try {
          const posterGlide = findDramaBoxPosterFromGlide(device);
          if (posterGlide) {
            if (title) {
              const localFolder = resolveExistingDramaFolder(title);
              const dramaDir = path.join(TARGET_DIR, localFolder);
              if (!fs.existsSync(dramaDir)) fs.mkdirSync(dramaDir, { recursive: true });
              const localPoster = path.join(dramaDir, 'poster.png');
              pullRemoteFile(device, posterGlide, localPoster);
              if (fs.existsSync(localPoster) && fs.statSync(localPoster).size > 0) {
                coverUrl = `/poster/${encodeURIComponent(localFolder)}`;
              } else {
                coverUrl = `/api/dramabox-cover?path=${encodeURIComponent(posterGlide)}`;
              }
            } else {
              coverUrl = `/api/dramabox-cover?path=${encodeURIComponent(posterGlide)}`;
            }
          }
        } catch (e) {}
      }

      if (title) {
        currentDrama = {
          id: `dramabox_${title}`,
          title,
          image: coverUrl,
          cover: coverUrl,
          coverUrl: coverUrl,
          desc: desc || `Phim DramaBox • Đang xem tập ${currentEpisode}`,
          currentEpisode,
          totalEpisodes: totalEpisodes || 50
        };
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

  // 1.5 YOUDRAMA
  if (appKey === 'youdrama') {
    try {
      let currentDrama = null;
      let dramaId = '';
      let currentEpisode = 1;

      // Lấy drama_id đang xem từ drama_history
      const histRow = adbQuerySqlite(
        device,
        '/data/data/you.drama.shorts/databases/drama.db',
        'SELECT drama_id FROM drama_history ORDER BY add_time DESC LIMIT 1;'
      );
      if (histRow) {
        dramaId = histRow.trim();
      }

      // Lấy số tập đang xem từ play_progress
      if (dramaId) {
        const epRow = adbQuerySqlite(
          device,
          '/data/data/you.drama.shorts/databases/drama.db',
          `SELECT ep_number FROM play_progress WHERE drama_id = '${dramaId}' LIMIT 1;`
        );
        if (epRow) {
          currentEpisode = parseInt(epRow.trim(), 10) || 1;
        }
      }

      const vidMatch = dramaId.match(/\d+/);
      const vid = vidMatch ? vidMatch[0] : dramaId;

      let title = '';
      let totalEpisodes = 0;
      let cover = '';
      let desc = '';

      // Tra cứu chi tiết từ videoinfo trong shortvideo.db
      if (vid) {
        const infoRow = adbQuerySqlite(
          device,
          '/data/data/you.drama.shorts/databases/shortvideo.db',
          `SELECT name, dramaCount, cover, description FROM videoinfo WHERE vid = ${vid} LIMIT 1;`
        );
        if (infoRow) {
          const parts = infoRow.split('|');
          title = (parts[0] || '').trim();
          totalEpisodes = parseInt(parts[1], 10) || 0;
          cover = (parts[2] || '').trim();
          desc = (parts[3] || '').trim();
        }
      }

      // Fallback tra cứu từ drama_cache trong drama.db
      if (!title && dramaId) {
        const cacheRow = adbQuerySqlite(
          device,
          '/data/data/you.drama.shorts/databases/drama.db',
          `SELECT name, ep_count, json FROM drama_cache WHERE drama_id = '${dramaId}' LIMIT 1;`
        );
        if (cacheRow) {
          const parts = cacheRow.split('|');
          title = (parts[0] || '').trim();
          totalEpisodes = parseInt(parts[1], 10) || 0;
          try {
            const j = JSON.parse(parts.slice(2).join('|'));
            if (j.cover_v) cover = j.cover_v;
            if (j.desc) desc = j.desc;
          } catch (e) {}
        }
      }

      if (title || dramaId) {
        currentDrama = {
          id: `youdrama_${vid || dramaId}`,
          title: title || `YouDrama_${dramaId}`,
          image: cover,
          cover: cover,
          coverUrl: cover,
          desc: desc || `Phim YouDrama • Đang xem tập ${currentEpisode}/${totalEpisodes}`,
          currentEpisode,
          totalEpisodes
        };
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

  // 2. MINUTEDRAMA
  if (appKey === 'minutedrama') {
    try {
      let currentDrama = null;
      const rawRows = adbQuerySqlite(
        device,
        '/data/data/com.minute.minishort.drama/databases/file_manager.db',
        'SELECT title, episode_num, total_episode, cover_url FROM playEpisodeHistory ORDER BY update_time DESC, id DESC LIMIT 1;'
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

async function exportVideos(device, payload, onProgress) {
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
    const directUrl = typeof item === 'object' ? item.directUrl : '';
    if (!remotePath || directUrl) return; // Nếu có directUrl CDN thì không bị giới hạn bộ đệm
    const info = compInfo.map[remotePath];
    if (info && !info.isComplete && info.sizeBytes < 2000000) {
      incompleteList.push({
        path: remotePath,
        pct: info.pct,
        sizeMb: info.sizeMb,
        expectedMb: info.expectedMb
      });
    }
  });

  if (incompleteList.length > 0 && !payload.force) {
    const err = new Error(`Có ${incompleteList.length} tập video dung lượng quá nhỏ (< 2MB). Vui lòng phát tiếp trên app hoặc bấm xuất ép buộc.`);
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

  for (let idx = 0; idx < selectedPaths.length; idx++) {
    const item = selectedPaths[idx];
    const remotePath = typeof item === 'string' ? item : item?.path;
    if (!remotePath) continue;
    let epNum = (typeof item === 'object' && item.epNumber) ? item.epNumber : (startEp + idx);
    let remoteSize = (typeof item === 'object' && item.sizeBytes) ? item.sizeBytes : 0;
    const directUrl = (typeof item === 'object') ? item.directUrl : '';

    let localName = `Tap_${String(epNum).padStart(2, '0')}.mp4`;
    let localPath = path.join(dramaDir, localName);

    // 1. Kiểm tra: nếu file video này đã có trong thư mục tải về (khớp dung lượng) -> BỎ QUA KHÔNG TẢI LẠI (trừ khi xuất đơn lẻ ép buộc)
    if (remoteSize > 0 && !payload.forceSingle) {
      let isAlreadyThere = false;
      for (const [sz, fName] of existingSizeMap.entries()) {
        if (Math.abs(sz - remoteSize) <= 64) {
          skipped.push(fName);
          isAlreadyThere = true;
          break;
        }
      }
      if (isAlreadyThere) continue;
    }

    // Nếu tên file đã tồn tại nhưng khác nội dung và không chỉ định rõ epNumber, tự tăng sang tập kế tiếp
    if (!item?.epNumber) {
      while (fs.existsSync(localPath)) {
        epNum++;
        localName = `Tap_${String(epNum).padStart(2, '0')}.mp4`;
        localPath = path.join(dramaDir, localName);
      }
    }

    // 2. Ưu tiên cao nhất: Tải trực tiếp từ CDN nếu có directUrl (nhanh gấp 10 lần, 100% full file)
    if (directUrl) {
      try {
        await downloadDirectVideo(directUrl, rawDramaName, epNum, onProgress);
        pulled.push(localName);
        continue;
      } catch (e) {}
    }

    // 3. Fallback: Kéo từ bộ nhớ đệm máy ảo
    pullRemoteFile(device, remotePath, localPath, (prog) => {
      if (onProgress) onProgress(rawDramaName, epNum, prog);
    }, remoteSize);
    pulled.push(localName);
    try {
      const pulledSz = fs.statSync(localPath).size;
      existingSizeMap.set(pulledSz, localName);
    } catch (e) {}
  }

  // Tự động tải và đồng bộ ảnh poster phim
  (async () => {
    try {
      await downloadDramaPoster(device, folderName, payload.posterUrl || payload.coverUrl || payload.image);
    } catch (e) {}
  })();

  const savedFiles = pulled.map(f => ({
    name: f,
    path: path.join(dramaDir, f),
    sizeBytes: fs.existsSync(path.join(dramaDir, f)) ? fs.statSync(path.join(dramaDir, f)).size : 0
  }));

  return {
    success: true,
    count: pulled.length,
    skippedCount: skipped.length,
    skipped,
    folder: folderName,
    folderPath: dramaDir,
    pulled,
    savedFiles,
    message: pulled.length > 0
      ? `Đã lưu ${pulled.join(', ')} vào: Soda_Reels_Videos/${folderName}`
      : `Tập đã có sẵn trong thư mục: Soda_Reels_Videos/${folderName}`
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
  try {
    const filesToDelete = paths.map(p => `"${p}" "${p}nodeconf" "${p}.cfg"`).join(' ');
    execSync(`"${ADB_PATH}" -s ${device} shell "rm -f ${filesToDelete}"`, { stdio: 'ignore' });
    paths.forEach(p => {
      if (p.includes('dm_video_cache')) {
        const parentDir = path.posix.dirname(p);
        try { execSync(`"${ADB_PATH}" -s ${device} shell "rm -rf '${parentDir}'"`, { stdio: 'ignore' }); } catch (e) {}
      }
    });
  } catch (e) {}
}

async function downloadDirectVideo(url, rawDramaName, epNum, onProgress) {
  const folderName = resolveExistingDramaFolder(rawDramaName);
  const dramaDir = path.join(TARGET_DIR, folderName);
  if (!fs.existsSync(dramaDir)) fs.mkdirSync(dramaDir, { recursive: true });

  const fileName = `Tap_${String(epNum).padStart(2, '0')}.mp4`;
  const destPath = path.join(dramaDir, fileName);

  // Nếu file tập này đã tải rồi và dung lượng > 500KB thì báo đã có sẵn
  if (fs.existsSync(destPath)) {
    const currentSize = fs.statSync(destPath).size;
    if (currentSize > 500 * 1024) {
      const szMb = (currentSize / (1024 * 1024)).toFixed(2);
      if (onProgress) onProgress(rawDramaName, epNum, { currentBytes: currentSize, totalBytes: currentSize, pct: 100, status: 'done' });
      return {
        success: true,
        filename: fileName,
        folder: folderName,
        folderPath: dramaDir,
        path: destPath,
        sizeBytes: currentSize,
        sizeFormatted: `${szMb} MB`,
        alreadyExists: true,
        message: `Tập ${epNum} (${szMb} MB) đã có sẵn tại: Soda_Reels_Videos/${folderName}/${fileName}`
      };
    }
  }

  // Nếu là m3u8 stream (YouDrama HLS AES-128 DRM stream)
  if (url.includes('.m3u8') || url.includes('voddrm.token')) {
    const ffmpegBin = FFMPEG_PATH || 'ffmpeg';
    try {
      if (onProgress) onProgress(rawDramaName, epNum, { currentBytes: 0, totalBytes: 0, pct: 20, status: 'downloading' });
      execSync(`"${ffmpegBin}" -y -i "${url}" -c copy "${destPath}"`, { stdio: 'ignore', timeout: 120000 });
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 10000) {
        const sz = fs.statSync(destPath).size;
        const szMb = (sz / (1024 * 1024)).toFixed(2);
        if (onProgress) onProgress(rawDramaName, epNum, { currentBytes: sz, totalBytes: sz, pct: 100, status: 'done' });
        return {
          success: true,
          filename: fileName,
          folder: folderName,
          folderPath: dramaDir,
          path: destPath,
          sizeBytes: sz,
          sizeFormatted: `${szMb} MB`,
          message: `Đã tải xong Tập ${epNum} (${szMb} MB) vào: Soda_Reels_Videos/${folderName}/${fileName}`
        };
      }
    } catch (e) {
      console.error('Error downloading HLS with ffmpeg:', e.message);
    }
  }

  const ok = await downloadFile(url, destPath, (prog) => {
    if (onProgress) onProgress(rawDramaName, epNum, prog);
  });
  let sizeBytes = 0;
  if (ok && fs.existsSync(destPath)) {
    sizeBytes = fs.statSync(destPath).size;
  }
  const szMb = (sizeBytes / (1024 * 1024)).toFixed(2);
  if (onProgress) onProgress(rawDramaName, epNum, { currentBytes: sizeBytes, totalBytes: sizeBytes, pct: ok ? 100 : 0, status: ok ? 'done' : 'error' });
  return {
    success: ok,
    filename: fileName,
    folder: folderName,
    folderPath: dramaDir,
    path: destPath,
    sizeBytes,
    sizeFormatted: `${szMb} MB`,
    message: ok
      ? `Đã tải xong Tập ${epNum} (${szMb} MB) vào: Soda_Reels_Videos/${folderName}/${fileName}`
      : `Lỗi tải Tập ${epNum}`
  };
}

const youdramaUrlCache = new Map();

function resolveYouDramaEpisodeUrl(fileId, psign) {
  if (!fileId || !psign) return Promise.resolve({ masterUrl: '', duration: 0 });
  if (youdramaUrlCache.has(fileId)) {
    return Promise.resolve(youdramaUrlCache.get(fileId));
  }

  return new Promise((resolve) => {
    const https = require('https');
    const url = `https://playvideo.qcloud.com/getplayinfo/v4/1500039468/${fileId}?psign=${psign}`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const streamingInfo = (json.media && json.media.streamingInfo) || {};
          const out = (streamingInfo.drmOutput && streamingInfo.drmOutput[0]) || {};
          const token = streamingInfo.drmToken || '';
          if (out.url && token) {
            const masterUrl = out.url.replace('/adp.112.m3u8', `/voddrm.token.${token}.adp.112.m3u8`);
            const duration = (json.media && json.media.basicInfo && json.media.basicInfo.duration) || 0;
            const resObj = { masterUrl, duration };
            youdramaUrlCache.set(fileId, resObj);
            return resolve(resObj);
          }
          resolve({ masterUrl: '', duration: 0 });
        } catch (e) {
          resolve({ masterUrl: '', duration: 0 });
        }
      });
    });
    req.on('error', () => resolve({ masterUrl: '', duration: 0 }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ masterUrl: '', duration: 0 }); });
  });
}

function scanLocalDownloadedEpisodes(dramaTitle) {
  const folderName = resolveExistingDramaFolder(dramaTitle);
  const localDir = path.join(TARGET_DIR, folderName);
  const localMap = new Map();
  if (fs.existsSync(localDir)) {
    try {
      const files = fs.readdirSync(localDir).filter(f => f.toLowerCase().endsWith('.mp4'));
      files.forEach(f => {
        const m = f.match(/Tap_(\d+)/i) || f.match(/(\d+)/);
        if (m) {
          const epNum = parseInt(m[1], 10);
          const fullP = path.join(localDir, f);
          const sz = fs.statSync(fullP).size;
          localMap.set(epNum, {
            path: fullP,
            filename: f,
            folder: folderName,
            folderPath: localDir,
            sizeBytes: sz,
            sizeFormatted: (sz / (1024 * 1024)).toFixed(2) + ' MB'
          });
        }
      });
    } catch (e) {}
  }
  return { folderName, localDir, localMap };
}

async function getDirectDramaEpisodes(device, appKey = 'loveshots', requestedTitle = '') {
  if (!device) return { app: appKey, title: '', totalEpisodes: 0, episodes: [], availableDramas: [] };

  const effectiveApp = (appKey === 'auto') ? detectActiveApp(device) : appKey;

  // -1. NẾU ĐANG CHỌN GALLERY -> LẤY TOÀN BỘ CÁC TẬP TỪ THƯ VIỆN BỘ NHỚ MÁY
  if (effectiveApp === 'gallery') {
    try {
      const { currentDrama, allDramas } = scanDeviceGalleryDramas(device, requestedTitle);
      const dramaTitle = currentDrama ? currentDrama.title : (requestedTitle || 'Video Thư Viện');
      const dramaCover = currentDrama ? currentDrama.cover : '';
      const totalEpisodes = currentDrama ? currentDrama.totalEpisodes : 0;
      const rawEps = (currentDrama && currentDrama.episodes) ? currentDrama.episodes : [];

      const { folderName, localDir, localMap } = scanLocalDownloadedEpisodes(dramaTitle);
      const episodes = [];

      rawEps.forEach((epItem, idx) => {
        const epNum = epItem.epNumber || (idx + 1);
        const loc = localMap.get(epNum);
        const isLoc = !!loc;
        const filePath = isLoc ? loc.path : epItem.filePath;
        const fileName = isLoc ? loc.filename : epItem.fileName;
        const streamUrl = `http://localhost:3000/api/stream-cache?drama=${encodeURIComponent(dramaTitle)}&ep=${epNum}&app=gallery`;

        episodes.push({
          epNumber: epNum,
          directUrl: streamUrl,
          directUrlH264: streamUrl,
          directUrlH265: streamUrl,
          path: filePath,
          filename: fileName,
          duration: 0,
          sizeFormatted: loc ? loc.sizeFormatted : '15 MB',
          sizeBytes: loc ? loc.sizeBytes : 15000000,
          isCached: true,
          isDownloaded: isLoc,
          localPath: loc ? loc.path : '',
          localFilename: loc ? loc.filename : '',
          localFolder: folderName,
          localSizeFormatted: loc ? loc.sizeFormatted : '',
          isComplete: true,
          pct: 100,
          isVip: false
        });
      });

      return {
        app: 'gallery',
        title: dramaTitle,
        coverUrl: dramaCover,
        totalEpisodes: episodes.length,
        currentEpisode: 1,
        folderName,
        downloadedCount: episodes.filter(e => e.isDownloaded).length,
        episodes,
        availableDramas: allDramas
      };
    } catch (e) {
      return { app: 'gallery', title: '', totalEpisodes: 0, episodes: [], availableDramas: [] };
    }
  }

  // 0. NẾU ĐANG CHỌN LOVESHOTS -> LẤY ĐÚNG BỘ PHIM ĐANG MỞ TRÊN LOVESHOTS
  if (effectiveApp === 'loveshots') {
    try {
      const lsInfo = getDramaInfoFromDevice(device, 'loveshots');
      const currentDrama = lsInfo.currentDrama;
      let dramaTitle = currentDrama ? currentDrama.title : (requestedTitle || 'LoveShots Series');
      let dramaCover = currentDrama ? (currentDrama.image || currentDrama.cover || currentDrama.coverUrl || '') : '';
      let totalEpisodes = currentDrama ? (currentDrama.totalEpisodes || 0) : 0;
      let dramaId = currentDrama ? currentDrama.id : '';

      if (!dramaId) {
        const dRow = adbQuerySqlite(device, '/data/data/com.short.movie.app/databases/mini_drama.db', 'SELECT id, name, total_episodes, cover_url FROM drama_record ORDER BY play_ts DESC LIMIT 1;');
        if (dRow) {
          const p = dRow.split('|');
          dramaId = p[0].trim();
          if (!dramaTitle || dramaTitle === 'LoveShots Series') dramaTitle = p[1].trim();
          if (!totalEpisodes) totalEpisodes = parseInt(p[2], 10) || 0;
          if (!dramaCover) dramaCover = (p[3] || '').trim();
        }
      }

      // Query all episodes from episode_record for this dramaId
      let epRecords = [];
      if (dramaId) {
        const rows = adbQuerySqlite(
          device,
          '/data/data/com.short.movie.app/databases/mini_drama.db',
          `SELECT serial_no, vid, duration, cover_url FROM episode_record WHERE drama_id = '${dramaId}' ORDER BY serial_no ASC;`
        );
        if (rows) {
          rows.split(/\r?\n/).forEach(r => {
            const [sNo, vid, dur, cUrl] = r.split('|');
            if (sNo && vid) {
              epRecords.push({
                epNumber: parseInt(sNo.trim(), 10),
                vid: vid.trim(),
                duration: Math.round((parseInt(dur, 10) || 0) / 1000),
                coverUrl: (cUrl || '').trim()
              });
            }
          });
        }
      }

      // Lấy danh sách các tập video đã được cache trong bộ nhớ volcplayer của LoveShots
      const { getRemoteCacheList } = require('./cache');
      const cacheList = getRemoteCacheList(device, 'loveshots', currentDrama ? (currentDrama.currentEpisode || 1) : 1);
      const cacheMap = new Map();
      cacheList.forEach(c => {
        if (c.epNumber) cacheMap.set(c.epNumber, c);
      });

      // Kiểm tra các tập đã có sẵn trên máy tính trong thư mục của bộ phim
      const { folderName, localDir, localMap } = scanLocalDownloadedEpisodes(dramaTitle);

      const totalCount = Math.max(totalEpisodes || 0, epRecords.length, cacheList.length > 0 ? Math.max(...cacheList.map(c => c.epNumber)) : 0);
      const episodes = [];

      for (let i = 1; i <= (totalCount || 30); i++) {
        const rec = epRecords.find(e => e.epNumber === i);
        const c = cacheMap.get(i);
        const loc = localMap.get(i);
        const vid = rec ? rec.vid : '';

        const isLoc = !!loc;
        const isC = isLoc || !!c;
        const filePath = (loc && loc.path) || (c && c.path) || (vid ? `/data/data/com.short.movie.app/cache/bytedance/playerkit/volcplayer/video_cache/${vid}.mdl` : '');
        const fileName = (loc && loc.filename) || (c && c.filename) || (vid ? `${vid}.mdl` : `Tap_${String(i).padStart(2, '0')}.mp4`);
        const sizeBytes = (loc && loc.sizeBytes) || (c && c.sizeBytes) || 0;
        const sizeFormatted = (loc && loc.sizeFormatted) || (c && c.sizeMb ? `${c.sizeMb} MB` : '') || (sizeBytes ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB` : '');
        const streamUrl = isC ? `http://localhost:3000/api/stream-cache?drama=${encodeURIComponent(dramaTitle)}&ep=${i}` : '';

        episodes.push({
          epNumber: i,
          directUrl: streamUrl,
          directUrlH264: streamUrl,
          directUrlH265: streamUrl,
          path: filePath,
          filename: fileName,
          duration: rec ? rec.duration : 0,
          sizeFormatted: sizeFormatted,
          sizeBytes: sizeBytes,
          isCached: isC,
          isDownloaded: isLoc,
          localPath: loc ? loc.path : '',
          localFilename: loc ? loc.filename : '',
          localFolder: folderName,
          localSizeFormatted: loc ? loc.sizeFormatted : '',
          isComplete: isLoc || (c ? c.isComplete : false),
          pct: isLoc ? 100 : (c ? c.pct : 0),
          isVip: false
        });
      }

      return {
        app: 'loveshots',
        title: dramaTitle,
        coverUrl: dramaCover,
        totalEpisodes: totalCount,
        cachedCount: cacheList.length,
        downloadedCount: localMap.size,
        folderName,
        folderPath: localDir,
        episodes,
        availableDramas: lsInfo.allDramas || []
      };
    } catch (e) {
      return { app: 'loveshots', title: '', totalEpisodes: 0, episodes: [], availableDramas: [] };
    }
  }

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

      // Kiểm tra các tập đã có sẵn trên máy tính trong thư mục của bộ phim
      const { folderName, localDir, localMap } = scanLocalDownloadedEpisodes(dramaTitle);

      // Tạo đầy đủ toàn bộ các tập từ 1 đến totalEpisodes của cả bộ phim
      const totalCount = Math.max(totalEpisodes || 60, cacheList.length > 0 ? Math.max(...cacheList.map(c => c.epNumber)) : 60);
      const episodes = [];
      for (let i = 1; i <= totalCount; i++) {
        const c = cacheMap.get(i);
        const loc = localMap.get(i);
        const isLoc = !!loc;
        const isC = isLoc || !!c;
        const streamUrl = isC ? `http://localhost:3000/api/stream-cache?drama=${encodeURIComponent(dramaTitle)}&ep=${i}` : '';

        episodes.push({
          epNumber: i,
          directUrl: streamUrl,
          directUrlH264: streamUrl,
          directUrlH265: streamUrl,
          path: (loc && loc.path) || (c && c.path) || '',
          filename: (loc && loc.filename) || (c && c.filename) || `Tap_${String(i).padStart(2, '0')}.mp4`,
          duration: 0,
          sizeFormatted: (loc && loc.sizeFormatted) || (c && c.sizeMb ? `${c.sizeMb} MB` : '') || '',
          sizeBytes: (loc && loc.sizeBytes) || (c && c.sizeBytes) || 0,
          isCached: isC,
          isDownloaded: isLoc,
          localPath: loc ? loc.path : '',
          localFilename: loc ? loc.filename : '',
          localFolder: folderName,
          localSizeFormatted: loc ? loc.sizeFormatted : '',
          isComplete: isLoc || (c ? c.isComplete : false),
          pct: isLoc ? 100 : (c ? c.pct : 0),
          isVip: false
        });
      }

      return {
        app: 'sodareels',
        title: dramaTitle,
        coverUrl,
        totalEpisodes: totalCount,
        cachedCount: cacheList.length,
        downloadedCount: localMap.size,
        folderName,
        folderPath: localDir,
        episodes,
        availableDramas: []
      };
    } catch (e) {
      return { app: 'sodareels', title: '', totalEpisodes: 0, episodes: [], availableDramas: [] };
    }
  }

  // 2. NẾU ĐANG CHỌN DRAMABOX -> LẤY ĐÚNG BỘ PHIM ĐANG MỞ TRÊN DRAMABOX
  if (effectiveApp === 'dramabox') {
    try {
      const dbInfo = getDramaInfoFromDevice(device, 'dramabox');
      const currentDrama = dbInfo.currentDrama;
      const dramaTitle = currentDrama ? currentDrama.title : (requestedTitle || 'DramaBox Series');
      const coverUrl = currentDrama ? (currentDrama.image || currentDrama.cover || currentDrama.coverUrl || '') : '';
      const totalEpisodes = currentDrama ? (currentDrama.totalEpisodes || 50) : 50;

      const { getRemoteCacheList } = require('./cache');
      const cacheList = getRemoteCacheList(device, 'dramabox', currentDrama ? (currentDrama.currentEpisode || 1) : 1);
      const cacheMap = new Map();
      cacheList.forEach(c => {
        if (c.epNumber) cacheMap.set(c.epNumber, c);
      });

      // Kiểm tra các tập đã có sẵn trên máy tính trong thư mục của bộ phim
      const localFolder = resolveExistingDramaFolder(dramaTitle);
      const localDir = path.join(TARGET_DIR, localFolder);
      const localMap = new Map();
      if (fs.existsSync(localDir)) {
        try {
          const files = fs.readdirSync(localDir).filter(f => f.toLowerCase().endsWith('.mp4'));
          files.forEach(f => {
            const m = f.match(/Tap_(\d+)/i) || f.match(/(\d+)/);
            if (m) {
              const epNum = parseInt(m[1], 10);
              const fullP = path.join(localDir, f);
              const sz = fs.statSync(fullP).size;
              localMap.set(epNum, {
                path: fullP,
                filename: f,
                sizeBytes: sz,
                sizeFormatted: (sz / (1024 * 1024)).toFixed(2) + ' MB'
              });
            }
          });
        } catch (e) {}
      }

      // Đọc các tập đã tải từ SQLite drama.db (bảng downloads)
      const dbDownloadUrls = new Map();
      try {
        const dlRows = adbQuerySqlite(
          device,
          '/data/data/com.storymatrix.drama/databases/drama.db',
          'SELECT chapterIndex, url, fileName, path, totalBytes FROM downloads;'
        );
        if (dlRows) {
          dlRows.split(/\r?\n/).forEach(r => {
            const p = r.split('|');
            const chIdx = parseInt(p[0], 10);
            const u = (p[1] || '').trim();
            const fn = (p[2] || '').trim();
            const pt = (p[3] || '').trim();
            const tb = parseInt(p[4], 10) || 0;
            if (chIdx) dbDownloadUrls.set(chIdx, { url: u, fileName: fn, path: pt, totalBytes: tb });
          });
        }
      } catch (e) {}

      const maxLocalEp = localMap.size > 0 ? Math.max(...localMap.keys()) : 0;
      const maxCacheEp = cacheList.length > 0 ? Math.max(...cacheList.map(c => c.epNumber)) : 0;
      const totalCount = Math.max(totalEpisodes || 50, maxLocalEp, maxCacheEp);
      const episodes = [];
      for (let i = 1; i <= totalCount; i++) {
        const c = cacheMap.get(i);
        const loc = localMap.get(i);
        const dbDl = dbDownloadUrls.get(i);

        const directUrl = (dbDl && dbDl.url) || (c && c.directUrl) || '';
        const isLoc = !!loc;
        const isC = isLoc || !!c || (dbDl && dbDl.path && fs.existsSync(dbDl.path));
        const filePath = (loc && loc.path) || (c && c.path) || (dbDl && dbDl.path) || '';
        const fileName = (loc && loc.filename) || (c && c.filename) || (dbDl && dbDl.fileName) || '';
        const sizeBytes = (loc && loc.sizeBytes) || (c && c.sizeBytes) || (dbDl && dbDl.totalBytes) || 0;
        const sizeFormatted = (loc && loc.sizeFormatted) || (c && c.sizeMb ? `${c.sizeMb} MB` : '') || (sizeBytes ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB` : '');

        episodes.push({
          epNumber: i,
          directUrl: directUrl,
          directUrlH264: directUrl,
          directUrlH265: directUrl,
          path: filePath,
          filename: fileName,
          duration: 0,
          sizeFormatted: sizeFormatted,
          sizeBytes: sizeBytes,
          isCached: isC,
          isDownloaded: isLoc,
          localPath: loc ? loc.path : '',
          localFilename: loc ? loc.filename : '',
          localFolder: folderName,
          localSizeFormatted: loc ? loc.sizeFormatted : '',
          isComplete: isLoc || (c ? c.isComplete : false),
          pct: isLoc ? 100 : (c ? c.pct : 0),
          isVip: false
        });
      }

      return {
        app: 'dramabox',
        title: dramaTitle,
        coverUrl,
        totalEpisodes: totalCount,
        cachedCount: cacheList.length,
        downloadedCount: localMap.size,
        folderName,
        folderPath: localDir,
        episodes,
        availableDramas: []
      };
    } catch (e) {
      return { app: 'dramabox', title: '', totalEpisodes: 0, episodes: [], availableDramas: [] };
    }
  }

  // 2.5 NẾU ĐANG CHỌN YOUDRAMA -> LẤY ĐÚNG BỘ PHIM VÀ TOÀN BỘ CÁC TẬP TỪ SHORTVIDEO.DB
  if (effectiveApp === 'youdrama') {
    try {
      const ydInfo = getDramaInfoFromDevice(device, 'youdrama');
      const currentDrama = ydInfo.currentDrama;
      let dramaTitle = currentDrama ? currentDrama.title : (requestedTitle || 'YouDrama Series');
      let dramaCover = currentDrama ? (currentDrama.image || currentDrama.cover || '') : '';
      let vid = '';
      if (currentDrama && currentDrama.id) {
        const m = currentDrama.id.match(/\d+/);
        if (m) vid = m[0];
      }
      if (!vid) {
        const histRow = adbQuerySqlite(device, '/data/data/you.drama.shorts/databases/drama.db', 'SELECT drama_id FROM drama_history ORDER BY add_time DESC LIMIT 1;');
        if (histRow) {
          const m = histRow.match(/\d+/);
          if (m) vid = m[0];
        }
      }

      if (!vid) {
        return { app: 'youdrama', title: dramaTitle, totalEpisodes: 0, episodes: [], availableDramas: [] };
      }

      // Query all episodes for this vid
      const rows = adbQuerySqlite(
        device,
        '/data/data/you.drama.shorts/databases/shortvideo.db',
        `SELECT dramanum, fileid, playersign FROM videoplay WHERE vid = ${vid} ORDER BY dramanum ASC;`
      );

      if (!rows) {
        return { app: 'youdrama', title: dramaTitle, totalEpisodes: 0, episodes: [], availableDramas: [] };
      }

      const { folderName, localDir, localMap } = scanLocalDownloadedEpisodes(dramaTitle);
      const lines = rows.trim().split('\n').filter(Boolean);
      const episodes = [];

      // Resolve in batches of 15 concurrently
      const BATCH_SIZE = 15;
      for (let i = 0; i < lines.length; i += BATCH_SIZE) {
        const batch = lines.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async line => {
          const [numStr, fId, sign] = line.split('|');
          const epNum = parseInt(numStr, 10);
          const resolved = await resolveYouDramaEpisodeUrl(fId, sign);
          const loc = localMap.get(epNum);
          const isLoc = !!loc;
          return {
            epNumber: epNum,
            directUrl: resolved.masterUrl,
            directUrlH264: resolved.masterUrl,
            directUrlH265: resolved.masterUrl,
            duration: resolved.duration || 0,
            isVip: false,
            isDownloaded: isLoc,
            localPath: loc ? loc.path : '',
            localFilename: loc ? loc.filename : '',
            localFolder: folderName,
            localSizeFormatted: loc ? loc.sizeFormatted : '',
            isCached: isLoc
          };
        });
        const batchResults = await Promise.all(batchPromises);
        episodes.push(...batchResults);
      }

      return {
        app: 'youdrama',
        title: dramaTitle,
        coverUrl: dramaCover,
        totalEpisodes: episodes.length,
        downloadedCount: localMap.size,
        folderName,
        folderPath: localDir,
        episodes,
        availableDramas: []
      };
    } catch (e) {
      return { app: 'youdrama', title: '', totalEpisodes: 0, episodes: [], availableDramas: [] };
    }
  }

  // 3. NẾU ĐANG CHỌN MINUTEDRAMA -> CHỈ LẤY ĐÚNG BỘ PHIM ĐANG MỞ TRÊN MINUTEDRAMA
  try {
    const dbPath = '/data/data/com.minute.minishort.drama/databases/file_manager.db';
    
    // Tìm bộ phim đang mở gần nhất từ lịch sử phát
    let activeTitle = (requestedTitle || '').trim();
    if (!activeTitle) {
      const lastPlay = adbQuerySqlite(device, dbPath, 'SELECT title FROM playEpisodeHistory ORDER BY update_time DESC, id DESC LIMIT 1;');
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

    const { folderName, localDir, localMap } = scanLocalDownloadedEpisodes(bestDrama.title || activeTitle);

    const episodes = (bestDrama.episodesInfos || []).map(ep => {
      const directUrl = ep.signPlayUrlH264 || ep.signPlayUrl || ep.bkSignPlayUrl || '';
      const loc = localMap.get(ep.episodeNum);
      const isLoc = !!loc;
      return {
        epNumber: ep.episodeNum,
        directUrl,
        directUrlH264: ep.signPlayUrlH264 || '',
        directUrlH265: ep.signPlayUrl || '',
        duration: ep.episodeDuration || 0,
        isVip: (ep.vipFlag === 1),
        isDownloaded: isLoc,
        localPath: loc ? loc.path : '',
        localFilename: loc ? loc.filename : '',
        localFolder: folderName,
        localSizeFormatted: loc ? loc.sizeFormatted : '',
        isCached: isLoc
      };
    });

    return {
      app: 'minutedrama',
      title: bestDrama.title || activeTitle,
      coverUrl: bestDrama.coverUrl || '',
      totalEpisodes: bestDrama.episodesCount || episodes.length,
      downloadedCount: localMap.size,
      folderName,
      folderPath: localDir,
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
  if (url === '/poster/default_poster.png' || url.startsWith('/poster/default') || url.startsWith('/poster/')) {
    url = '';
  }

  // Nếu không truyền URL mới và đã có file poster hợp lệ tại thư mục phim
  if (!url && fs.existsSync(posterPath) && fs.statSync(posterPath).size > 0) {
    return {
      success: true,
      folder: folderName,
      path: posterPath,
      sizeBytes: fs.statSync(posterPath).size,
      source: 'local_existing'
    };
  }

  if (url.startsWith('/api/dramabox-cover?path=')) {
    const remotePath = decodeURIComponent(url.replace('/api/dramabox-cover?path=', ''));
    if (remotePath && device) {
      try {
        const ok = pullRemoteFile(device, remotePath, posterPath);
        if (ok && fs.existsSync(posterPath) && fs.statSync(posterPath).size > 0) {
          return {
            success: true,
            folder: folderName,
            path: posterPath,
            sizeBytes: fs.statSync(posterPath).size,
            source: 'dramabox_direct'
          };
        }
      } catch (e) {}
    }
  }

  // 2. Nếu chưa có URL, tự truy xuất từ thiết bị
  if (!url && device) {
    try {
      const cleanT = (rawDramaName || folderName).replace(/['"\\]/g, '');
      const activeApp = resolveActiveApp(device);

      // Ưu tiên số 1: Lấy từ ứng dụng đang chạy nếu tên khớp hoặc đang mở bộ phim này
      if (activeApp === 'gallery') {
        const galInfo = getDramaInfoFromDevice(device, 'gallery', rawDramaName);
        if (galInfo && galInfo.currentDrama && galInfo.currentDrama.cover && galInfo.currentDrama.cover.startsWith('http')) {
          url = galInfo.currentDrama.cover;
        }
      } else if (activeApp === 'loveshots') {
        const lsInfo = getDramaInfoFromDevice(device, 'loveshots', rawDramaName);
        if (lsInfo && lsInfo.currentDrama && lsInfo.currentDrama.cover) {
          url = lsInfo.currentDrama.cover;
        }
      } else if (activeApp === 'youdrama') {
        const ydInfo = getDramaInfoFromDevice(device, 'youdrama', rawDramaName);
        if (ydInfo && ydInfo.currentDrama && ydInfo.currentDrama.cover) {
          url = ydInfo.currentDrama.cover;
        }
      } else if (activeApp === 'minutedrama') {
        const minInfo = getDramaInfoFromDevice(device, 'minutedrama', rawDramaName);
        if (minInfo && minInfo.currentDrama && minInfo.currentDrama.cover) {
          url = minInfo.currentDrama.cover;
        }
      } else if (activeApp === 'sodareels') {
        const sodaInfo = getDramaInfoFromDevice(device, 'sodareels', rawDramaName);
        if (sodaInfo && sodaInfo.currentDrama && sodaInfo.currentDrama.cover) {
          url = sodaInfo.currentDrama.cover;
        }
      }

      // Ưu tiên: Tìm trong OneRoom / Gallery database theo đúng tên phim
      if (!url && cleanT) {
        try {
          const orCover = adbQuerySqlite(device, '/data/data/com.community.oneroom/databases/oneroom-db', `SELECT cover FROM download_table WHERE subjectName LIKE '%${cleanT}%' OR name LIKE '%${cleanT}%' LIMIT 1;`);
          if (orCover && orCover.trim().startsWith('http')) url = orCover.trim();
        } catch (e) {}
      }

      // Ưu tiên số 2: Tìm trong LoveShots database theo đúng tên phim
      if (!url && cleanT) {
        try {
          const lsCover = adbQuerySqlite(device, '/data/data/com.short.movie.app/databases/mini_drama.db', `SELECT cover_url FROM drama_record WHERE name LIKE '%${cleanT}%' ORDER BY play_ts DESC LIMIT 1;`);
          if (lsCover && lsCover.trim()) url = lsCover.trim();
        } catch (e) {}
      }

      // Ưu tiên số 2: Tìm trong YouDrama database theo đúng tên phim
      if (!url && cleanT) {
        try {
          const ydCover = adbQuerySqlite(device, '/data/data/you.drama.shorts/databases/shortvideo.db', `SELECT cover FROM videoinfo WHERE name LIKE '%${cleanT}%' LIMIT 1;`);
          if (ydCover && ydCover.trim()) url = ydCover.trim();
        } catch (e) {}

        if (!url) {
          try {
            const cacheRow = adbQuerySqlite(device, '/data/data/you.drama.shorts/databases/drama.db', `SELECT json FROM drama_cache WHERE name LIKE '%${cleanT}%' LIMIT 1;`);
            if (cacheRow) {
              const j = JSON.parse(cacheRow.trim());
              if (j.cover_v) url = j.cover_v;
            }
          } catch (e) {}
        }
      }

      // Ưu tiên số 3: Tìm trong MinuteDrama database theo đúng tên phim
      if (!url && cleanT) {
        const minDbPath = '/data/data/com.minute.minishort.drama/databases/file_manager.db';
        try {
          const dbCover = adbQuerySqlite(device, minDbPath, `SELECT cover_url FROM playEpisodeHistory WHERE title LIKE '%${cleanT}%' ORDER BY update_time DESC LIMIT 1;`);
          if (dbCover && dbCover.trim()) url = dbCover.trim();
        } catch (e) {}

        if (!url) {
          try {
            const rawJson = adbQuerySqlite(device, minDbPath, `SELECT json FROM videoDetail WHERE json LIKE '%${cleanT}%' ORDER BY id DESC LIMIT 1;`);
            if (rawJson) {
              const parsed = JSON.parse(rawJson.trim());
              const minC = parsed.coverUrl || parsed.shareCoverUrl || '';
              if (minC) url = minC;
            }
          } catch (e) {}
        }
      }

      // Ưu tiên số 4: Tìm trong Soda Reels database theo đúng tên phim
      if (!url && cleanT) {
        const sodaDbPath = '/data/data/com.sodareels.drama.short/databases/PLAY_LET_BD_NAME_DRAMA';
        try {
          const sodaCover = adbQuerySqlite(device, sodaDbPath, `SELECT cover FROM database_table_play_history WHERE title LIKE '%${cleanT}%' ORDER BY time DESC LIMIT 1;`);
          if (sodaCover && sodaCover.trim()) url = sodaCover.trim();
        } catch (e) {}
      }
    } catch (e) {}
  }

  // 3. Nếu tìm thấy URL ảnh mạng -> Tải về lưu thành poster.png
  if (url && url.startsWith('http')) {
    const ok = await downloadFile(url, posterPath);
    if (ok && fs.existsSync(posterPath)) {
      if (FFMPEG_PATH) {
        try {
          const buf = fs.readFileSync(posterPath, { length: 12 });
          if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') {
            const tmpWebp = posterPath + '.tmp.webp';
            fs.copyFileSync(posterPath, tmpWebp);
            execSync(`"${FFMPEG_PATH}" -y -i "${tmpWebp}" "${posterPath}"`, { stdio: 'ignore' });
            if (fs.existsSync(tmpWebp)) fs.unlinkSync(tmpWebp);
          }
        } catch (e) {}
      }
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

  // 5. Nếu chưa có poster nhưng đã có file video trong thư mục phim, trích xuất khung hình bằng ffmpeg
  if (!fs.existsSync(posterPath) || fs.statSync(posterPath).size === 0) {
    if (FFMPEG_PATH && fs.existsSync(dramaDir)) {
      try {
        const mp4Files = fs.readdirSync(dramaDir).filter(f => f.endsWith('.mp4')).sort();
        if (mp4Files.length > 0) {
          const sampleVideo = path.join(dramaDir, mp4Files[0]);
          execSync(`"${FFMPEG_PATH}" -y -ss 00:00:02 -i "${sampleVideo}" -vframes 1 -q:v 2 "${posterPath}"`, { stdio: 'ignore' });
          if (fs.existsSync(posterPath) && fs.statSync(posterPath).size > 0) {
            return {
              success: true,
              folder: folderName,
              path: posterPath,
              sizeBytes: fs.statSync(posterPath).size,
              source: 'ffmpeg_extracted'
            };
          }
        }
      } catch (e) {}
    }
  }

  // 6. Nếu trên PC chưa có video, nhưng thiết bị có file video trong Thư viện
  if ((!fs.existsSync(posterPath) || fs.statSync(posterPath).size === 0) && device) {
    try {
      const { allDramas } = scanDeviceGalleryDramas(device, rawDramaName);
      const match = allDramas.find(d => d.title.toLowerCase().includes(rawDramaName.toLowerCase()) || rawDramaName.toLowerCase().includes(d.title.toLowerCase()));
      if (match && match.episodes && match.episodes.length > 0) {
        try {
          const thumbCheck = execSync(`"${ADB_PATH}" -s ${device} shell "ls -1t /sdcard/Movies/.thumbnails/*.jpg /sdcard/DCIM/.thumbnails/*.jpg 2>/dev/null | head -n 1"`, { encoding: 'utf8', timeout: 3000 }).trim();
          if (thumbCheck && thumbCheck.endsWith('.jpg')) {
            pullRemoteFile(device, thumbCheck, posterPath);
            if (fs.existsSync(posterPath) && fs.statSync(posterPath).size > 0) {
              return { success: true, folder: folderName, path: posterPath, sizeBytes: fs.statSync(posterPath).size, source: 'device_thumbnail' };
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  return { success: false, message: 'Không tìm thấy poster phù hợp trên thiết bị hoặc CDN' };
}

module.exports = {
  scanDeviceGalleryDramas,
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
