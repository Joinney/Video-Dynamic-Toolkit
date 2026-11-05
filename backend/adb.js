const fs = require('fs');
const { execSync } = require('child_process');
const { ADB_PATH, SUPPORTED_APPS, getAppMode } = require('./config');

let adbRootChecked = false;

function checkAdbDevice() {
  try {
    let out = execSync(`"${ADB_PATH}" devices`, { encoding: 'utf8' });
    let lines = out.trim().split('\n').slice(1)
      .map(l => l.trim())
      .filter(l => l.includes('device') && !l.includes('offline'));

    if (lines.length === 0) {
      try {
        execSync(`"${ADB_PATH}" connect 127.0.0.1:5555`, { stdio: 'ignore' });
        out = execSync(`"${ADB_PATH}" devices`, { encoding: 'utf8' });
        lines = out.trim().split('\n').slice(1)
          .map(l => l.trim())
          .filter(l => l.includes('device') && !l.includes('offline'));
      } catch (e) {}
    }

    if (lines.length > 0) {
      const dev = lines[0].split(/\s+/)[0];
      if (!adbRootChecked) {
        adbRootChecked = true;
        try { execSync(`"${ADB_PATH}" -s ${dev} root`, { stdio: 'ignore' }); } catch (e) {}
      }
      return dev;
    }
    adbRootChecked = false;
    return null;
  } catch (e) {
    adbRootChecked = false;
    return null;
  }
}

function adbQuerySqlite(device, dbPath, sql) {
  if (!device) return '';
  try {
    const raw = execSync(
      `"${ADB_PATH}" -s ${device} shell "sqlite3 ${dbPath} \\"${sql}\\" 2>/dev/null"`,
      { encoding: 'utf8' }
    ).trim();
    if (raw && !raw.includes('Error: unable to open database')) return raw;
  } catch (e) {}
  try {
    const rawSu = execSync(
      `"${ADB_PATH}" -s ${device} shell "su 0 sqlite3 ${dbPath} \\"${sql}\\" 2>/dev/null"`,
      { encoding: 'utf8' }
    ).trim();
    return rawSu;
  } catch (e) {
    return '';
  }
}

function detectActiveApp(device) {
  if (!device) return 'sodareels';
  try {
    const out = execSync(`"${ADB_PATH}" -s ${device} shell "dumpsys window | grep -E 'mCurrentFocus'"`, { encoding: 'utf8' });
    if (out.includes('com.minute.minishort.drama')) return 'minutedrama';
    if (out.includes('com.sodareels.drama.short')) return 'sodareels';
  } catch (e) {}

  // Fallback: Kiểm tra database cập nhật mới nhất
  try {
    let best = 'sodareels';
    let maxT = 0;
    try {
      const minT = parseInt(adbQuerySqlite(device, '/data/data/com.minute.minishort.drama/databases/file_manager.db', 'SELECT update_time FROM playEpisodeHistory ORDER BY id DESC LIMIT 1;'), 10) || 0;
      if (minT > maxT) { maxT = minT; best = 'minutedrama'; }
    } catch (e) {}
    try {
      const sodaT = parseInt(adbQuerySqlite(device, '/data/data/com.sodareels.drama.short/databases/PLAY_LET_BD_NAME_DRAMA', 'SELECT time FROM database_table_play_history ORDER BY time DESC LIMIT 1;'), 10) || 0;
      if (sodaT > maxT) { maxT = sodaT; best = 'sodareels'; }
    } catch (e) {}
    return best;
  } catch (e) {
    return 'sodareels';
  }
}

function resolveActiveApp(device, requestedApp) {
  if (requestedApp && SUPPORTED_APPS[requestedApp]) return requestedApp;
  const currentMode = getAppMode();
  if (currentMode !== 'auto' && SUPPORTED_APPS[currentMode]) return currentMode;
  return detectActiveApp(device);
}

function pullRemoteFile(device, remotePath, localPath) {
  try {
    execSync(`"${ADB_PATH}" -s ${device} pull "${remotePath}" "${localPath}"`, { stdio: 'pipe' });
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
      return true;
    }
  } catch (e) {}

  // Fallback nếu Permission denied trên /data/data/: Dùng su 0 copy sang /sdcard/ rồi pull
  try {
    const tmpSdcard = `/sdcard/_temp_pull_${Date.now()}.mp4`;
    execSync(`"${ADB_PATH}" -s ${device} shell "su 0 cp '${remotePath}' '${tmpSdcard}' && su 0 chmod 666 '${tmpSdcard}'"`, { stdio: 'pipe' });
    execSync(`"${ADB_PATH}" -s ${device} pull "${tmpSdcard}" "${localPath}"`, { stdio: 'pipe' });
    execSync(`"${ADB_PATH}" -s ${device} shell "rm -f '${tmpSdcard}'"`, { stdio: 'ignore' });
    return fs.existsSync(localPath) && fs.statSync(localPath).size > 0;
  } catch (err) {
    throw new Error(`Không thể kéo file từ thiết bị: ${err.message}`);
  }
}

module.exports = {
  checkAdbDevice,
  adbQuerySqlite,
  detectActiveApp,
  resolveActiveApp,
  pullRemoteFile
};
