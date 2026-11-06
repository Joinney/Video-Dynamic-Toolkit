const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const adb = 'C:\\src\\platform-tools\\adb.exe';
const targetDir = 'd:\\Nodejs\\project\\reelssoda\\Soda_Reels_Videos';
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

// Get list sorted by time (oldest first: -ltr)
const raw = execSync(`"${adb}" -s emulator-5554 shell "ls -ltr /data/data/com.sodareels.drama.short/cache/pssdk/pssdk_video_cache/*.mdl"`, { encoding: 'utf8' });
const lines = raw.trim().split(/\r?\n/).filter(l => l.trim().endsWith('.mdl'));

console.log(`Tim thay ${lines.length} tap video trong cache.`);

lines.forEach((line, idx) => {
  const parts = line.trim().split(/\s+/);
  const remotePath = parts[parts.length - 1];
  const epNum = String(idx + 1).padStart(2, '0');
  const localFile = path.join(targetDir, `Tap_${epNum}.mp4`);
  
  process.stdout.write(`Dang trich xuat Tap ${epNum}... `);
  execSync(`"${adb}" -s emulator-5554 pull "${remotePath}" "${localFile}"`);
  const sizeMb = (fs.statSync(localFile).size / (1024 * 1024)).toFixed(2);
  console.log(`Xong! (${sizeMb} MB)`);
});

// Also pull cached images
const imageDir = path.join(targetDir, 'hinh_anh');
if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
try {
  execSync(`"${adb}" -s emulator-5554 pull "/sdcard/Android/data/com.sodareels.drama.short/files/test_990811793717840482drama_tv_image.png" "${path.join(imageDir, 'poster_phim.png')}"`);
  console.log('Da tai poster phim!');
} catch (e) {}

console.log(`\nHoan tat! Toan bo video da duoc luu tai: ${targetDir}`);
