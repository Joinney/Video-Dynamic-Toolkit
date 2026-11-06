const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ADB_PATH = process.env.ADB_PATH || (fs.existsSync('C:\\src\\platform-tools\\adb.exe') ? 'C:\\src\\platform-tools\\adb.exe' : 'adb');
const ROOT_DIR = path.join(__dirname, '..');
const TARGET_DIR = path.join(ROOT_DIR, 'Soda_Reels_Videos');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const TEMP_DIR = path.join(ROOT_DIR, '.temp_preview');

const SUPPORTED_APPS = {
  sodareels: {
    id: 'sodareels',
    name: 'Soda Reels',
    icon: '🥤',
    pkg: 'com.sodareels.drama.short',
    cacheGlob: '/data/data/com.sodareels.drama.short/cache/pssdk/pssdk_video_cache/*.mdl',
    isMdl: true
  },
  minutedrama: {
    id: 'minutedrama',
    name: 'MinuteDrama',
    icon: '🎭',
    pkg: 'com.minute.minishort.drama',
    cacheGlob: '/data/data/com.minute.minishort.drama/cache/dm_video_cache/tp_dp_file/*/*.mp4',
    isMdl: false
  }
};

let currentAppMode = 'auto'; // 'auto' | 'sodareels' | 'minutedrama'

function getAppMode() {
  return currentAppMode;
}

function setAppMode(mode) {
  if (mode === 'auto' || SUPPORTED_APPS[mode]) {
    currentAppMode = mode;
    return true;
  }
  return false;
}

module.exports = {
  PORT,
  ADB_PATH,
  ROOT_DIR,
  TARGET_DIR,
  FRONTEND_DIR,
  TEMP_DIR,
  SUPPORTED_APPS,
  getAppMode,
  setAppMode
};
