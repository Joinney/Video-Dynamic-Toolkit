const { execSync } = require('child_process');
const { ADB_PATH } = require('./config');
const { resolveActiveApp } = require('./adb');
const { ensureDeviceCheckerScript, getRemoteCacheCompletenessMap } = require('./cache');

let autoSwipeState = {
  running: false,
  total: 0,
  current: 0,
  status: '',
  timer: null
};

function getAutoSwipeStatus() {
  return {
    running: autoSwipeState.running,
    current: autoSwipeState.current,
    total: autoSwipeState.total,
    status: autoSwipeState.status || ''
  };
}

function getScreenDimensions(device) {
  try {
    const out = execSync(`"${ADB_PATH}" -s ${device} shell wm size`, { encoding: 'utf8' });
    const m = out.match(/Physical size:\s*(\d+)x(\d+)/i);
    if (m) {
      return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
    }
  } catch (e) {}
  return { width: 720, height: 1280 };
}

function startAutoSwipe(device, total, delay, options = {}) {
  if (autoSwipeState.running) return;
  autoSwipeState.running = true;
  autoSwipeState.total = parseInt(total, 10) || 1;
  autoSwipeState.current = 0;
  autoSwipeState.status = 'Đang bắt đầu...';

  const appKey = resolveActiveApp(device);
  ensureDeviceCheckerScript(device);
  const dims = getScreenDimensions(device);
  const centerX = Math.floor(dims.width / 2);
  const centerY = Math.floor(dims.height / 2);
  const swipeStartY = Math.floor(dims.height * 0.78);
  const swipeEndY = Math.floor(dims.height * 0.22);

  const dramaTitle = options.dramaTitle || '';
  const startEp = parseInt(options.startEpisode, 10) || 1;
  const autoExport = (options.autoExport === true); // Chỉ lưu khi người dùng chủ động chọn lưu, không tự ý lưu

  (async () => {
    let lastCompletedPath = null;

    for (let i = 0; i < autoSwipeState.total; i++) {
      if (!autoSwipeState.running) break;

      autoSwipeState.status = `Tập ${i + 1}/${autoSwipeState.total}: Đang mở và kiểm tra...`;

      // Chạm nhẹ giữa màn hình để đảm bảo player đang phát
      try {
        execSync(`"${ADB_PATH}" -s ${device} shell input tap ${centerX} ${centerY}`, { stdio: 'ignore' });
      } catch (e) {}

      // Nếu không phải tập đầu, chờ file cache mới xuất hiện sau khi vuốt
      let activePath = null;
      const detectStart = Date.now();
      while (autoSwipeState.running && Date.now() - detectStart < 8000) {
        const cacheInfo = getRemoteCacheCompletenessMap(device, appKey);
        const newest = cacheInfo.newest;
        if (newest && newest.path !== lastCompletedPath) {
          activePath = newest.path;
          break;
        }
        if (i === 0 && newest) {
          activePath = newest.path;
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!activePath) {
        const cacheInfo = getRemoteCacheCompletenessMap(device, appKey);
        if (cacheInfo.newest) activePath = cacheInfo.newest.path;
      }

      // Theo dõi tập hiện tại cho đến khi ĐỦ 100%
      const maxWaitMs = 120000; // Chờ tối đa 2 phút
      const startTime = Date.now();
      let lastSize = 0;
      let unchangedCount = 0;
      let isDone = false;
      let finalItem = null;

      while (autoSwipeState.running && Date.now() - startTime < maxWaitMs) {
        await new Promise(r => setTimeout(r, 1200));
        if (!autoSwipeState.running) break;

        const cacheInfo = getRemoteCacheCompletenessMap(device, appKey);
        const activeItem = (activePath && cacheInfo.map[activePath]) ? cacheInfo.map[activePath] : cacheInfo.newest;

        if (activeItem) {
          activePath = activeItem.path;
          finalItem = activeItem;

          // Nếu app đã tải đủ 100% HOẶC đã nạp đủ buffer phát (>2.5MB và ổn định)
          if (activeItem.isComplete || (activeItem.sizeBytes >= 2500000 && unchangedCount >= 2)) {
            isDone = true;
            lastCompletedPath = activeItem.path;
            break;
          }

          autoSwipeState.status = `Tập ${i + 1}/${autoSwipeState.total}: Đang nạp ${activeItem.pct}% (${activeItem.sizeMb} / ${activeItem.expectedMb} MB)...`;

          if (activeItem.sizeBytes === lastSize) {
            unchangedCount++;
            // Nếu bị chững dung lượng (app dừng chờ phát), chạm nhẹ để giữ phát
            if (unchangedCount % 2 === 0) {
              try {
                execSync(`"${ADB_PATH}" -s ${device} shell input tap ${centerX} ${centerY}`, { stdio: 'ignore' });
              } catch (e) {}
            }
          } else {
            unchangedCount = 0;
            lastSize = activeItem.sizeBytes;
          }
        }
      }

      // Kiểm tra: nếu video quá nhỏ (< 2MB) mới cần dừng
      if (!isDone || !finalItem || (!finalItem.isComplete && finalItem.sizeBytes < 2000000)) {
        autoSwipeState.status = `⚠️ Tập ${i + 1} chưa nạp đủ video (mới được ${finalItem ? finalItem.pct : 0}%). Đã tạm dừng.`;
        autoSwipeState.running = false;
        break;
      }

      // Tự động lưu video về máy tính ngay khi đủ 100%
      if (autoExport && finalItem) {
        try {
          autoSwipeState.status = `💾 Tập ${i + 1}/${autoSwipeState.total}: Đã đủ 100%, đang lưu vào máy...`;
          const { exportSingleCacheItem } = require('./drama');
          const currentEp = startEp + i;
          const expRes = exportSingleCacheItem(device, finalItem, dramaTitle, currentEp);
          autoSwipeState.status = `✅ Tập ${i + 1}/${autoSwipeState.total}: Đã lưu "${expRes.filename}" thành công!`;
          await new Promise(r => setTimeout(r, 800));
        } catch (expErr) {
          console.error('Lỗi khi tự động lưu tập:', expErr.message);
        }
      }

      autoSwipeState.current = i + 1;

      // Vuốt sang tập kế tiếp NẾU VÀ CHỈ NẾU tập hiện tại đã tải xong 100%
      if (i < autoSwipeState.total - 1 && autoSwipeState.running) {
        autoSwipeState.status = `Tập ${i + 1} đã xong. Đang vuốt sang tập ${i + 2}...`;
        await new Promise(r => setTimeout(r, 1000));
        try {
          execSync(`"${ADB_PATH}" -s ${device} shell input swipe ${centerX} ${swipeStartY} ${centerX} ${swipeEndY} 250`, { stdio: 'ignore' });
        } catch (e) {}
        await new Promise(r => setTimeout(r, 2200));
      }
    }

    autoSwipeState.running = false;
    if (autoSwipeState.status && !autoSwipeState.status.startsWith('⚠️')) {
      autoSwipeState.status = `Đã hoàn thành ${autoSwipeState.current}/${autoSwipeState.total} tập!`;
    }
  })();
}

function stopAutoSwipe() {
  autoSwipeState.running = false;
  autoSwipeState.status = 'Đã dừng';
}

module.exports = {
  getAutoSwipeStatus,
  startAutoSwipe,
  stopAutoSwipe
};
