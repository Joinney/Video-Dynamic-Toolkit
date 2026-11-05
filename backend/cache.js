const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { ADB_PATH } = require('./config');

const pushedDevices = new Set();

function ensureDeviceCheckerScript(device) {
  if (pushedDevices.has(device)) return;
  const localScript = path.join(__dirname, 'cache_checker.sh');
  if (!fs.existsSync(localScript)) {
    const content = `#!/system/bin/sh
APP="$1"

if [ "$APP" = "minutedrama" ]; then
  FILES=$(ls -1tr /data/data/com.minute.minishort.drama/cache/dm_video_cache/tp_dp_file/*/*.mp4 2>/dev/null)
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
else
  FILES=$(ls -1tr /data/data/com.sodareels.drama.short/cache/pssdk/pssdk_video_cache/*.mdl 2>/dev/null)
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
    fs.writeFileSync(localScript, content, 'utf8');
  }

  try {
    execSync(`"${ADB_PATH}" -s ${device} push "${localScript}" /data/local/tmp/cache_checker.sh`, { stdio: 'ignore' });
    execSync(`"${ADB_PATH}" -s ${device} shell "chmod 755 /data/local/tmp/cache_checker.sh"`, { stdio: 'ignore' });
    pushedDevices.add(device);
  } catch (e) {}
}

function getRemoteCacheCompletenessMap(device, appKey = 'sodareels') {
  if (!device) return { map: {}, newest: null, list: [] };
  ensureDeviceCheckerScript(device);
  try {
    const raw = execSync(`"${ADB_PATH}" -s ${device} shell "su 0 /data/local/tmp/cache_checker.sh ${appKey}"`, { encoding: 'utf8' });
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

      if (appKey === 'minutedrama') {
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
        // Soda Reels
        if (b64OrStatus && b64OrStatus !== 'NOCONF') {
          try {
            const buf = Buffer.from(b64OrStatus, 'base64');
            if (buf.length >= 0x48) {
              expectedBytes = Number(buf.readBigInt64LE(0x10));
              const cached = Number(buf.readBigInt64LE(0x38));
              pct = expectedBytes > 0 ? Math.min(100, Math.round((cached / expectedBytes) * 100)) : 100;
              isComplete = (cached >= expectedBytes || sizeBytes >= expectedBytes || pct >= 97);
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
    return { map, newest, list };
  } catch (e) {
    return { map: {}, newest: null, list: [] };
  }
}

function getRemoteCacheList(device, appKey = 'sodareels', currentEpisode = 1, localVideos = []) {
  if (!device) return [];
  try {
    let raw = '';
    const isMinute = (appKey === 'minutedrama');

    // Dùng ls -lt để lấy file mới nhất trước, hoặc đảo chiều để đúng trình tự Tập 1 -> Tập N
    if (appKey === 'minutedrama') {
      raw = execSync(`"${ADB_PATH}" -s ${device} shell "ls -lt /data/data/com.minute.minishort.drama/cache/dm_video_cache/tp_dp_file/*/*.mp4 2>/dev/null"`, { encoding: 'utf8' });
    } else {
      raw = execSync(`"${ADB_PATH}" -s ${device} shell "ls -lt /data/data/com.sodareels.drama.short/cache/pssdk/pssdk_video_cache/*.mdl 2>/dev/null"`, { encoding: 'utf8' });
    }

    let lines = raw.trim().split(/\r?\n/).filter(l => {
      const trimmed = l.trim();
      return isMinute ? trimmed.endsWith('.mp4') : trimmed.endsWith('.mdl');
    });

    // Đảo ngược danh sách để file tạo đầu tiên (Tập 1) luôn nằm ở vị trí đầu danh sách
    lines.reverse();

    // Đọc lịch sử xem và ánh xạ URL -> số tập từ SQLite của app
    let dbEpisodes = [];
    const minutedramaHashMap = new Map();

    try {
      const { adbQuerySqlite } = require('./adb');
      if (appKey === 'minutedrama') {
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

    const completenessInfo = getRemoteCacheCompletenessMap(device, appKey);

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
      const remotePath = parts[parts.length - 1];
      const sizeBytes = parseInt(parts[parts.length - 4], 10) || 0;
      const timeStr = `${parts[parts.length - 2]}`;

      const comp = completenessInfo.map[remotePath] || {
        isComplete: (sizeBytes > 3000000),
        pct: 100,
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

      // 1. ƯU TIÊN SỐ 1: Nhận diện chính xác tuyệt đối qua Hash URL trong MinuteDrama DB
      const fileHash = path.basename(remotePath, '.mp4').toLowerCase();
      if (minutedramaHashMap.has(fileHash)) {
        const hit = minutedramaHashMap.get(fileHash);
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

      return {
        index: idx + 1,
        epNumber,
        epLabel: `EP. ${epNumber}`,
        path: remotePath,
        filename: path.basename(remotePath),
        sizeBytes,
        sizeMb: (sizeBytes / (1024 * 1024)).toFixed(2),
        expectedMb: comp.expectedMb || (sizeBytes / (1024 * 1024)).toFixed(2),
        pct: comp.pct !== undefined ? comp.pct : 100,
        isComplete: comp.isComplete !== undefined ? comp.isComplete : true,
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

    return list;
  } catch (e) {
    return [];
  }
}

module.exports = {
  ensureDeviceCheckerScript,
  getRemoteCacheCompletenessMap,
  getRemoteCacheList
};
