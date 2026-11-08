const fs = require('fs');
const { execSync } = require('child_process');
const { ADB_PATH, SUPPORTED_APPS, getAppMode } = require('./config');

let adbRootChecked = false;
let cachedDevice = null;
let lastDeviceCheck = 0;

function checkAdbDevice() {
  const now = Date.now();
  if (cachedDevice !== null && (now - lastDeviceCheck < 3500)) {
    return cachedDevice;
  }

  if (!fs.existsSync(ADB_PATH)) {
    cachedDevice = null;
    lastDeviceCheck = now;
    return null;
  }
  try {
    let out = execSync(`"${ADB_PATH}" devices`, { encoding: 'utf8', timeout: 3000 });
    let lines = out.trim().split('\n').slice(1)
      .map(l => l.trim())
      .filter(l => l.includes('device') && !l.includes('offline'));

    if (lines.length === 0) {
      try {
        execSync(`"${ADB_PATH}" connect 127.0.0.1:5555`, { stdio: 'ignore', timeout: 3000 });
        out = execSync(`"${ADB_PATH}" devices`, { encoding: 'utf8', timeout: 3000 });
        lines = out.trim().split('\n').slice(1)
          .map(l => l.trim())
          .filter(l => l.includes('device') && !l.includes('offline'));
      } catch (e) {}
    }

    if (lines.length > 0) {
      const dev = lines[0].split(/\s+/)[0];
      if (!adbRootChecked) {
        adbRootChecked = true;
        try { execSync(`"${ADB_PATH}" -s ${dev} root`, { stdio: 'ignore', timeout: 3000 }); } catch (e) {}
      }
      cachedDevice = dev;
      lastDeviceCheck = now;
      return dev;
    }
    adbRootChecked = false;
    cachedDevice = null;
    lastDeviceCheck = now;
    return null;
  } catch (e) {
    adbRootChecked = false;
    cachedDevice = null;
    lastDeviceCheck = now;
    return null;
  }
}

function adbQuerySqlite(device, dbPath, sql) {
  if (!device) return '';
  const options = { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 3500, stdio: ['ignore', 'pipe', 'ignore'] };
  try {
    const raw = execSync(
      `"${ADB_PATH}" -s ${device} shell "sqlite3 ${dbPath} \\"${sql}\\" < /dev/null 2>/dev/null"`,
      options
    ).trim();
    if (raw && !raw.includes('Error: unable to open database')) return raw;
  } catch (e) {}
  try {
    const rawSu = execSync(
      `"${ADB_PATH}" -s ${device} shell "su 0 sqlite3 ${dbPath} \\"${sql}\\" < /dev/null 2>/dev/null"`,
      options
    ).trim();
    return rawSu;
  } catch (e) {
    return '';
  }
}

let cachedActiveApp = null;
let lastActiveAppCheck = 0;

function detectActiveApp(device) {
  if (!device) return 'loveshots';
  const now = Date.now();
  if (cachedActiveApp && (now - lastActiveAppCheck < 3500)) {
    return cachedActiveApp;
  }
  let result = 'loveshots';
  try {
    const out = execSync(`"${ADB_PATH}" -s ${device} shell "dumpsys window | grep -E 'mCurrentFocus'"`, { encoding: 'utf8', timeout: 2000 });
    if (out.includes('gallery') || out.includes('gallery3d') || out.includes('photos')) result = 'gallery';
    else if (out.includes('com.short.movie.app')) result = 'loveshots';
    else if (out.includes('you.drama.shorts')) result = 'youdrama';
    else if (out.includes('com.minute.minishort.drama')) result = 'minutedrama';
    else if (out.includes('com.sodareels.drama.short')) result = 'sodareels';
    else if (out.includes('com.storymatrix.drama')) result = 'dramabox';
    else {
      // Fallback: Kiểm tra tiến trình
      try {
        const pids = execSync(`"${ADB_PATH}" -s ${device} shell "pidof com.minute.minishort.drama you.drama.shorts com.short.movie.app com.sodareels.drama.short 2>/dev/null"`, { encoding: 'utf8', timeout: 1500 }).trim();
        if (pids) {
          result = cachedActiveApp || 'minutedrama';
        }
      } catch (e) {}
    }
  } catch (e) {
    if (cachedActiveApp) return cachedActiveApp;
  }

  cachedActiveApp = result;
  lastActiveAppCheck = now;
  return result;
}

function resolveActiveApp(device, requestedApp) {
  if (requestedApp && SUPPORTED_APPS[requestedApp]) return requestedApp;
  const currentMode = getAppMode();
  if (currentMode !== 'auto' && SUPPORTED_APPS[currentMode]) return currentMode;
  return detectActiveApp(device);
}

function pullRemoteFile(device, remotePath, localPath, onProgress, expectedTotalBytes = 0) {
  let progressTimer = null;
  let simulatedPct = 10;
  if (onProgress) {
    onProgress({ currentBytes: Math.round(expectedTotalBytes * 0.1), totalBytes: expectedTotalBytes, pct: 10, status: 'starting' });
    progressTimer = setInterval(() => {
      let cur = 0;
      if (fs.existsSync(localPath)) {
        try { cur = fs.statSync(localPath).size; } catch (e) {}
      }
      if (cur > 0 && expectedTotalBytes > 0) {
        simulatedPct = Math.min(95, Math.round((cur / expectedTotalBytes) * 100));
      } else {
        simulatedPct = Math.min(90, simulatedPct + 15);
        cur = Math.round((simulatedPct / 100) * expectedTotalBytes);
      }
      onProgress({ currentBytes: cur, totalBytes: expectedTotalBytes, pct: simulatedPct, status: 'copying' });
    }, 200);
  }

  try {
    if (!remotePath.startsWith('/proc/')) {
      try {
        execSync(`"${ADB_PATH}" -s ${device} pull "${remotePath}" "${localPath}"`, { stdio: 'pipe', timeout: 8000 });
        if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
          if (progressTimer) clearInterval(progressTimer);
          const finalSz = fs.statSync(localPath).size;
          if (onProgress) onProgress({ currentBytes: finalSz, totalBytes: finalSz, pct: 100, status: 'done' });
          return true;
        }
      } catch (e) {}
    }

    // Fallback nếu Permission denied trên /data/data/ hoặc file trong /proc/: Dùng su 0 copy sang /sdcard/ rồi pull
    const tmpSdcard = `/sdcard/_temp_pull_${Date.now()}.mp4`;
    execSync(`"${ADB_PATH}" -s ${device} shell "su 0 cp '${remotePath}' '${tmpSdcard}' && su 0 chmod 666 '${tmpSdcard}'"`, { stdio: 'pipe', timeout: 10000 });
    execSync(`"${ADB_PATH}" -s ${device} pull "${tmpSdcard}" "${localPath}"`, { stdio: 'pipe', timeout: 10000 });
    execSync(`"${ADB_PATH}" -s ${device} shell "rm -f '${tmpSdcard}'"`, { stdio: 'ignore', timeout: 3000 });

    if (progressTimer) clearInterval(progressTimer);
    const finalSz = (fs.existsSync(localPath) && fs.statSync(localPath).size) || expectedTotalBytes;
    if (onProgress) onProgress({ currentBytes: finalSz, totalBytes: finalSz, pct: 100, status: 'done' });
    return fs.existsSync(localPath) && fs.statSync(localPath).size > 0;
  } catch (err) {
    if (progressTimer) clearInterval(progressTimer);
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
