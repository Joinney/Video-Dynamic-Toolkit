const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { ADB_PATH } = require('./config');

const pushedDevices = new Set();
let cachedCompleteness = {
  key: '',
  time: 0,
  data: { map: {}, newest: null, list: [] }
};

function ensureDeviceCheckerScript(device) {
  const localScript = path.join(__dirname, 'cache_checker.sh');
  const content = `#!/system/bin/sh
APP="$1"
FILTER="$2"

if [ "$APP" = "minutedrama" ]; then
  if [ -n "$FILTER" ]; then
    FILES=$(ls -1tr /data/data/com.minute.minishort.drama/cache/dm_video_cache/tp_dp_file/*/\${FILTER}*.mp4 2>/dev/null)
  else
    FILES=$(ls -1tr /data/data/com.minute.minishort.drama/cache/dm_video_cache/tp_dp_file/*/*.mp4 2>/dev/null)
  fi
  for f in $FILES; do
    if [ -f "$f" ]; then
      SZ=$(stat -c %s "$f" 2>/dev/null || echo 0)
      if [ -f "$f.cfg" ]; then
        B64=$(base64 "$f.cfg" 2>/dev/null | tr -d '\\r\\n')
        echo "$f|$SZ|$B64"
      else
        echo "$f|$SZ|COMPLETE"
      fi
    fi
  done
elif [ "$APP" = "dramabox" ]; then
  if [ -n "$FILTER" ]; then
    FILES=$(ls -1tr /sdcard/Android/data/com.storymatrix.drama/files/download/*/\${FILTER}*.mp4 \
                    /sdcard/Android/data/com.storymatrix.drama/files/\${FILTER}*.mp4 \
                    /sdcard/Movies/\${FILTER}*.mp4 \
                    /sdcard/Download/\${FILTER}*.mp4 2>/dev/null)
  else
    FILES=$(ls -1tr /sdcard/Android/data/com.storymatrix.drama/files/download/*/*.mp4 \
                    /sdcard/Android/data/com.storymatrix.drama/files/*.mp4 \
                    /data/data/com.storymatrix.drama/files/*.mp4 \
                    /sdcard/Movies/*.mp4 \
                    /sdcard/Download/*.mp4 2>/dev/null)
  fi
  for f in $FILES; do
    if [ -f "$f" ]; then
      SZ=$(stat -c %s "$f" 2>/dev/null || echo 0)
      echo "$f|$SZ|COMPLETE"
    fi
  done
elif [ "$APP" = "loveshots" ]; then
  if [ -n "$FILTER" ]; then
    FILES=$(ls -1tr /data/data/com.short.movie.app/cache/bytedance/playerkit/volcplayer/video_cache/\${FILTER}*.mdl 2>/dev/null)
  else
    FILES=$(ls -1tr /data/data/com.short.movie.app/cache/bytedance/playerkit/volcplayer/video_cache/*.mdl 2>/dev/null)
  fi
  for f in $FILES; do
    if [ -f "$f" ]; then
      SZ=$(stat -c %s "$f" 2>/dev/null || echo 0)
      CONF="\${f%.mdl}.mdlnodeconf"
      if [ -f "$CONF" ]; then
        B64=$(base64 "$CONF" 2>/dev/null | tr -d '\\r\\n')
        echo "$f|$SZ|$B64"
      else
        echo "$f|$SZ|NOCONF"
      fi
    fi
  done
elif [ "$APP" = "popdrama" ]; then
  if [ -n "$FILTER" ]; then
    FILES=$(ls -1tr /data/data/com.popdramas.top/cache/pssdk/pssdk_video_cache/\${FILTER}*.mdl 2>/dev/null)
  else
    FILES=$(ls -1tr /data/data/com.popdramas.top/cache/pssdk/pssdk_video_cache/*.mdl 2>/dev/null)
  fi
  for f in $FILES; do
    if [ -f "$f" ]; then
      SZ=$(stat -c %s "$f" 2>/dev/null || echo 0)
      CONF="\${f%.mdl}.mdlnodeconf"
      if [ -f "$CONF" ]; then
        B64=$(base64 "$CONF" 2>/dev/null | tr -d '\\r\\n')
        echo "$f|$SZ|$B64"
      else
        echo "$f|$SZ|NOCONF"
      fi
    fi
  done
else
  if [ -n "$FILTER" ]; then
    FILES=$(ls -1tr /data/data/com.sodareels.drama.short/cache/pssdk/pssdk_video_cache/\${FILTER}*.mdl 2>/dev/null)
  else
    FILES=$(ls -1tr /data/data/com.sodareels.drama.short/cache/pssdk/pssdk_video_cache/*.mdl 2>/dev/null)
  fi
  for f in $FILES; do
    if [ -f "$f" ]; then
      SZ=$(stat -c %s "$f" 2>/dev/null || echo 0)
      CONF="\${f%.mdl}.mdlnodeconf"
      if [ -f "$CONF" ]; then
        B64=$(base64 "$CONF" 2>/dev/null | tr -d '\\r\\n')
        echo "$f|$SZ|$B64"
      else
        echo "$f|$SZ|NOCONF"
      fi
    fi
  done
fi
`;
  if (!fs.existsSync(localScript) || fs.readFileSync(localScript, 'utf8').replace(/\r\n/g, '\n') !== content.replace(/\r\n/g, '\n')) {
    fs.writeFileSync(localScript, content, 'utf8');
    pushedDevices.delete(device);
  }

  if (pushedDevices.has(device)) return;

  try {
    execSync(`"${ADB_PATH}" -s ${device} push "${localScript}" /data/local/tmp/cache_checker.sh`, { stdio: 'ignore', timeout: 3000 });
    execSync(`"${ADB_PATH}" -s ${device} shell "chmod 755 /data/local/tmp/cache_checker.sh"`, { stdio: 'ignore', timeout: 2000 });
    pushedDevices.add(device);
  } catch (e) {}
}

function getRemoteCacheCompletenessMap(device, appKey = 'sodareels', filterPrefix = '') {
  if (!device) return { map: {}, newest: null, list: [] };
  const cacheKey = `${device}_${appKey}_${filterPrefix}`;
  const now = Date.now();
  if (cachedCompleteness.key === cacheKey && (now - cachedCompleteness.time < 3500)) {
    return cachedCompleteness.data;
  }

  ensureDeviceCheckerScript(device);
  try {
    const raw = execSync(`"${ADB_PATH}" -s ${device} shell "su 0 /data/local/tmp/cache_checker.sh ${appKey} ${filterPrefix || ''}"`, { encoding: 'utf8', timeout: 3500 });
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    const map = {};
    const list = [];
    lines.forEach(l => {
      const parts = l.split('|');
      if (parts.length < 3) return;
      const remotePath = parts[0].trim();
      const sizeBytes = parseInt(parts[1], 10) || 0;
      const b64OrStatus = parts[2].trim();

      let isComplete = false;
      let expectedBytes = sizeBytes;
      let pct = 100;

      if (appKey === 'minutedrama' || appKey === 'dramabox') {
        if (b64OrStatus === 'COMPLETE') {
          isComplete = true;
          pct = 100;
        } else if (b64OrStatus) {
          try {
            const buf = Buffer.from(b64OrStatus, 'base64');
            if (buf.length >= 0x20) {
              expectedBytes = Number(buf.readBigInt64BE(0x18));
            }
          } catch (e) {}
          pct = expectedBytes > 0 ? Math.min(100, Math.round((sizeBytes / expectedBytes) * 100)) : 100;
          isComplete = (sizeBytes >= expectedBytes || pct >= 97);
          if (isComplete) pct = 100;
        }
      } else {
        // LoveShots & Soda Reels
        if (b64OrStatus && b64OrStatus !== 'NOCONF') {
          try {
            const buf = Buffer.from(b64OrStatus, 'base64');
            if (buf.length >= 0x48) {
              expectedBytes = Number(buf.readBigInt64LE(0x10));
              const cached = Number(buf.readBigInt64LE(0x38));
              pct = expectedBytes > 0 ? Math.min(100, Math.round((Math.max(cached, sizeBytes) / expectedBytes) * 100)) : 100;
              isComplete = (sizeBytes >= 2000000 || cached >= expectedBytes || sizeBytes >= expectedBytes || pct >= 97);
              if (isComplete) pct = 100;
            }
          } catch (e) {}
        } else {
          isComplete = (sizeBytes > 2000000);
          pct = 100;
        }
      }

      const item = {
        path: remotePath,
        filename: path.basename(remotePath),
        sizeBytes,
        sizeMb: (sizeBytes / (1024 * 1024)).toFixed(2),
        expectedBytes,
        expectedMb: (expectedBytes / (1024 * 1024)).toFixed(2),
        pct,
        isComplete
      };
      map[remotePath] = item;
      list.push(item);
    });

    const newest = list.length > 0 ? list[list.length - 1] : null;
    const result = { map, newest, list };
    cachedCompleteness = {
      key: cacheKey,
      time: now,
      data: result
    };
    return result;
  } catch (e) {
    return cachedCompleteness.data || { map: {}, newest: null, list: [] };
  }
}

const remoteListCache = new Map();

function getRemoteCacheList(device, appKey = 'loveshots', currentEpisode = 1, localVideos = []) {
  if (!device || appKey === 'gallery') return [];
  const cacheKey = `${device}_${appKey}_${currentEpisode}`;
  const now = Date.now();
  const cached = remoteListCache.get(cacheKey);
  if (cached && (now - cached.time < 3000)) {
    return cached.data;
  }
  try {
    let raw = '';
    const isMinute = (appKey === 'minutedrama');
    const isDramaBox = (appKey === 'dramabox');
    const isLoveShots = (appKey === 'loveshots');

    // Dùng ls -lt để lấy file mới nhất trước, hoặc đảo chiều để đúng trình tự Tập 1 -> Tập N
    if (appKey === 'minutedrama') {
      raw = execSync(`"${ADB_PATH}" -s ${device} shell "ls -lt /data/data/com.minute.minishort.drama/cache/dm_video_cache/tp_dp_file/*/*.mp4 2>/dev/null || true"`, { encoding: 'utf8' });
    } else if (appKey === 'dramabox') {
      raw = execSync(`"${ADB_PATH}" -s ${device} shell "ls -lt /sdcard/Android/data/com.storymatrix.drama/files/download/*/*.mp4 /sdcard/Android/data/com.storymatrix.drama/files/*.mp4 /data/data/com.storymatrix.drama/files/*.mp4 /sdcard/Movies/*.mp4 /sdcard/Download/*.mp4 2>/dev/null || true"`, { encoding: 'utf8' });
    } else if (appKey === 'loveshots') {
      raw = execSync(`"${ADB_PATH}" -s ${device} shell "su 0 sh -c 'ls -lt /data/data/com.short.movie.app/cache/bytedance/playerkit/volcplayer/video_cache/*.mdl 2>/dev/null'"`, { encoding: 'utf8' });
      // Bổ sung các file cache đang mở trong /proc/<pid>/fd/ nếu bị VolcPlayer unlink (deleted) khi đầy bộ đệm
      try {
        const lsPid = execSync(`"${ADB_PATH}" -s ${device} shell "pidof com.short.movie.app 2>/dev/null"`, { encoding: 'utf8', timeout: 2000 }).trim();
        if (lsPid) {
          const fdOut = execSync(`"${ADB_PATH}" -s ${device} shell "su 0 ls -l /proc/${lsPid}/fd 2>/dev/null"`, { encoding: 'utf8', timeout: 3000 });
          const fdLines = fdOut.split(/\r?\n/);
          const existingVids = new Set(raw.trim().split(/\r?\n/).map(l => {
            const p = l.trim().split(/\s+/);
            return path.basename(p[p.length - 1], '.mdl');
          }));

          fdLines.forEach(fl => {
            const m = fl.match(/(\d+)\s+->\s+(\S+\.mdl)/);
            if (m) {
              const fd = m[1];
              const origPath = m[2];
              const vid = path.basename(origPath, '.mdl');
              if (!existingVids.has(vid)) {
                try {
                  const sz = parseInt(execSync(`"${ADB_PATH}" -s ${device} shell "su 0 stat -L -c %s /proc/${lsPid}/fd/${fd} 2>/dev/null"`, { encoding: 'utf8', timeout: 1500 }).trim(), 10) || 0;
                  if (sz > 50000) {
                    existingVids.add(vid);
                    raw += `\n-rwx------ 1 u0_a88 u0_a88_cache ${sz} 2026-11-08 04:00 /proc/${lsPid}/fd/${fd}|${origPath}`;
                  }
                } catch (e) {}
              }
            }
          });
        }
      } catch (e) {}} else {
      raw = execSync(`"${ADB_PATH}" -s ${device} shell "ls -lt /data/data/com.sodareels.drama.short/cache/pssdk/pssdk_video_cache/*.mdl 2>/dev/null || true"`, { encoding: 'utf8' });
    }

    let lines = raw.trim().split(/\r?\n/).filter(l => {
      const trimmed = l.trim();
      return (isMinute || isDramaBox) ? trimmed.endsWith('.mp4') : trimmed.endsWith('.mdl');
    });

    // Đọc lịch sử xem và ánh xạ URL -> số tập từ SQLite của app
    let dbEpisodes = [];
    const minutedramaHashMap = new Map();
    const dramaboxDownloadMap = new Map();
    const loveshotsVidMap = new Map();

    try {
      const { adbQuerySqlite } = require('./adb');
      if (appKey === 'loveshots') {
        try {
          const curDramaId = adbQuerySqlite(
            device,
            '/data/data/com.short.movie.app/databases/mini_drama.db',
            'SELECT id FROM drama_record ORDER BY play_ts DESC LIMIT 1;'
          );
          if (curDramaId && curDramaId.trim()) {
            const epRows = adbQuerySqlite(
              device,
              '/data/data/com.short.movie.app/databases/mini_drama.db',
              `SELECT serial_no, vid FROM episode_record WHERE drama_id = '${curDramaId.trim()}';`
            );
            if (epRows) {
              epRows.split(/\r?\n/).forEach(r => {
                const parts = r.split('|');
                if (parts[0] && parts[1]) {
                  loveshotsVidMap.set(parts[1].trim(), parseInt(parts[0].trim(), 10));
                }
              });
            }
          }
        } catch (e) {}
      } else if (appKey === 'dramabox') {
        try {
          const dlRows = adbQuerySqlite(
            device,
            '/data/data/com.storymatrix.drama/databases/drama.db',
            'SELECT fileName, path, chapterIndex, url FROM downloads ORDER BY chapterIndex ASC;'
          );
          if (dlRows) {
            dlRows.split(/\r?\n/).forEach(r => {
              const p = r.split('|');
              const fName = (p[0] || '').trim();
              const fullPath = (p[1] || '').trim();
              const chIdx = parseInt(p[2], 10) || 0;
              const dlUrl = (p[3] || '').trim();
              if (fName) dramaboxDownloadMap.set(fName.toLowerCase(), { epNumber: chIdx, path: fullPath, directUrl: dlUrl });
            });
          }
        } catch (e) {}
      } else if (appKey === 'minutedrama') {
        // 1. Ánh xạ chính xác mã hash của video sang số tập thực tế từ videoDetail
        try {
          const rawDetail = adbQuerySqlite(
            device,
            '/data/data/com.minute.minishort.drama/databases/file_manager.db',
            'SELECT json FROM videoDetail;'
          );
          if (rawDetail) {
            const jsonLines = rawDetail.split(/\r?\n/).filter(Boolean);
            jsonLines.forEach(jl => {
              try {
                const detail = JSON.parse(jl.trim());
                (detail.episodesInfos || []).forEach(ep => {
                  const directUrl = ep.signPlayUrl || ep.signPlayUrlH264 || ep.bkSignPlayUrl || '';
                  const urls = [ep.signPlayUrl, ep.signPlayUrlH264, ep.bkSignPlayUrl];
                  urls.forEach(u => {
                    if (!u) return;
                    const clean = u.split('?')[0];
                    const hash = crypto.createHash('md5').update(clean).digest('hex').toLowerCase();
                    minutedramaHashMap.set(hash, { epNumber: ep.episodeNum, directUrl });
                  });
                });
              } catch (e) {}
            });
          }
        } catch (e) {}

        const rows = adbQuerySqlite(
          device,
          '/data/data/com.minute.minishort.drama/databases/file_manager.db',
          'SELECT episode_num FROM playEpisodeHistory ORDER BY id ASC LIMIT 50;'
        );
        dbEpisodes = rows.split(/\r?\n/).map(r => parseInt(r.trim(), 10)).filter(Boolean);
      } else {
        const row = adbQuerySqlite(
          device,
          '/data/data/com.sodareels.drama.short/databases/PLAY_LET_BD_NAME_DRAMA',
          'SELECT watched_episodes FROM database_table_play_history ORDER BY time DESC LIMIT 1;'
        );
        if (row) {
          dbEpisodes = row.split(',').map(r => parseInt(r.trim(), 10)).filter(Boolean);
        }
      }
    } catch (e) {}

    // LỌC CHUẨN: Chỉ giữ lại các tập thuộc ĐÚNG bộ phim đang xem/lướt hiện tại, loại bỏ các file cũ của phim khác
    let activePrefix = '';
    if (appKey === 'loveshots' && loveshotsVidMap.size > 0) {
      lines = lines.filter(l => {
        const parts = l.trim().split(/\s+/);
        const pLast = parts[parts.length - 1];
        const origName = pLast.includes('|') ? pLast.split('|')[1] : pLast;
        const fName = path.basename(origName, '.mdl');
        return loveshotsVidMap.has(fName);
      });
    } else if (appKey === 'sodareels') {
      for (const l of lines) {
        const parts = l.trim().split(/\s+/);
        const pLast = parts[parts.length - 1];
        const origName = pLast.includes('|') ? pLast.split('|')[1] : pLast;
        const fName = path.basename(origName, '.mdl');
        if (fName.includes('_')) {
          activePrefix = fName.split('_')[0];
          break;
        }
      }
      if (activePrefix) {
        lines = lines.filter(l => {
          const parts = l.trim().split(/\s+/);
          const pLast = parts[parts.length - 1];
          const origName = pLast.includes('|') ? pLast.split('|')[1] : pLast;
          const fName = path.basename(origName, '.mdl');
          return fName.startsWith(activePrefix);
        });
      }
    } else if (appKey === 'minutedrama' && minutedramaHashMap.size > 0) {
      lines = lines.filter(l => {
        const parts = l.trim().split(/\s+/);
        const fName = path.basename(parts[parts.length - 1], '.mp4').toLowerCase();
        return minutedramaHashMap.has(fName);
      });
    }

    // Đảo ngược danh sách để file tạo đầu tiên (Tập 1) luôn nằm ở vị trí đầu danh sách
    lines.reverse();

    const completenessInfo = getRemoteCacheCompletenessMap(device, appKey, activePrefix);

    // Thu thập danh sách các tập video đã tải về máy tính
    let maxDownloadedEp = 0;
    const downloadedMap = new Map();
    (localVideos || []).forEach(v => {
      const ep = v.epNumber || parseInt(v.name.replace(/\D/g, ''), 10) || 0;
      if (ep > maxDownloadedEp) maxDownloadedEp = ep;
      downloadedMap.set(v.sizeBytes, { epNumber: ep, name: v.name });
    });

    let nextNewEp = maxDownloadedEp + 1;

    const list = lines.map((line, idx) => {
      const parts = line.trim().split(/\s+/);
      let rawRemotePath = parts[parts.length - 1];
      let remotePath = rawRemotePath;
      let origMdlPath = rawRemotePath;
      if (rawRemotePath.includes('|')) {
        const pSplit = rawRemotePath.split('|');
        remotePath = pSplit[0];
        origMdlPath = pSplit[1];
      }
      const sizeBytes = parseInt(parts[parts.length - 4], 10) || 0;
      const timeStr = `${parts[parts.length - 2]}`;

      const comp = completenessInfo.map[origMdlPath] || completenessInfo.map[remotePath] || {
        isComplete: (sizeBytes >= 2000000),
        pct: (sizeBytes >= 2000000) ? 100 : Math.min(100, Math.round((sizeBytes / 2000000) * 100)),
        expectedMb: (sizeBytes / (1024 * 1024)).toFixed(2)
      };

      // Đối chiếu xem file cache này có khớp dung lượng với tập nào trong thư mục tải về không
      let matchedLocal = null;
      if (sizeBytes > 0) {
        for (const [sz, item] of downloadedMap.entries()) {
          if (Math.abs(sz - sizeBytes) <= 64) {
            matchedLocal = item;
            break;
          }
        }
      }

      let epNumber;
      let isDownloaded = false;
      let downloadedName = '';
      let directUrl = '';

      // 1. ƯU TIÊN SỐ 1: Nhận diện chính xác tuyệt đối qua Hash URL trong MinuteDrama DB hoặc DramaBox Downloads hoặc LoveShots VID
      const fileHash = path.basename(origMdlPath, '.mp4').toLowerCase();
      const baseName = path.basename(origMdlPath).toLowerCase();
      const vidName = path.basename(origMdlPath, '.mdl');

      if (loveshotsVidMap.has(vidName)) {
        epNumber = loveshotsVidMap.get(vidName);
        if (matchedLocal) {
          isDownloaded = true;
          downloadedName = matchedLocal.name;
        }
      } else if (minutedramaHashMap.has(fileHash)) {
        const hit = minutedramaHashMap.get(fileHash);
        epNumber = hit.epNumber;
        directUrl = hit.directUrl || '';
        if (matchedLocal) {
          isDownloaded = true;
          downloadedName = matchedLocal.name;
        }
      } else if (dramaboxDownloadMap.has(baseName)) {
        const hit = dramaboxDownloadMap.get(baseName);
        epNumber = hit.epNumber;
        directUrl = hit.directUrl || '';
        if (matchedLocal) {
          isDownloaded = true;
          downloadedName = matchedLocal.name;
        }
      } else if (matchedLocal) {
        epNumber = matchedLocal.epNumber;
        isDownloaded = true;
        downloadedName = matchedLocal.name;
      } else {
        // Ưu tiên lấy số tập từ SQLite nếu có
        if (dbEpisodes.length > idx && dbEpisodes[idx] > 0) {
          epNumber = dbEpisodes[idx];
          if (epNumber >= nextNewEp) nextNewEp = epNumber + 1;
        } else {
          epNumber = nextNewEp++;
        }
      }

      const isCompl = (sizeBytes >= 2000000 || (comp.isComplete !== undefined ? comp.isComplete : false));
      const calcPct = isCompl ? 100 : (comp.pct !== undefined ? comp.pct : Math.min(99, Math.round((sizeBytes / 2000000) * 100)));

      return {
        index: idx + 1,
        epNumber,
        epLabel: `EP. ${epNumber}`,
        path: remotePath,
        filename: path.basename(origMdlPath),
        sizeBytes,
        sizeMb: (sizeBytes / (1024 * 1024)).toFixed(2),
        expectedMb: comp.expectedMb || (sizeBytes / (1024 * 1024)).toFixed(2),
        pct: calcPct,
        isComplete: isCompl,
        time: timeStr,
        isDownloaded,
        downloadedName,
        directUrl
      };
    });

    // Luôn sắp xếp danh sách theo thứ tự số tập tăng dần: Tập 1 -> Tập 2 -> Tập 3...
    list.sort((a, b) => a.epNumber - b.epNumber);
    list.forEach((item, idx) => {
      item.index = idx + 1;
    });

    remoteListCache.set(cacheKey, { time: now, data: list });
    return list;
  } catch (e) {
    console.error('getRemoteCacheList ERROR:', e);
    return [];
  }
}

module.exports = {
  ensureDeviceCheckerScript,
  getRemoteCacheCompletenessMap,
  getRemoteCacheList
};
