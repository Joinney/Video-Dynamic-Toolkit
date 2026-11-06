const { execSync } = require('child_process');
const ADB_PATH = 'C:\\src\\platform-tools\\adb.exe';
const device = '127.0.0.1:5555';

try {
  const ids = execSync(`"${ADB_PATH}" -s ${device} shell "su 0 sqlite3 /data/data/com.minute.minishort.drama/databases/file_manager.db \\"SELECT id FROM videoDetail;\\" 2>/dev/null"`, { encoding: 'utf8' }).trim().split(/\s+/);
  console.log('Row IDs in videoDetail:', ids);
  for (const id of ids) {
    const raw = execSync(`"${ADB_PATH}" -s ${device} shell "su 0 sqlite3 /data/data/com.minute.minishort.drama/databases/file_manager.db \\"SELECT json FROM videoDetail WHERE id = ${id};\\" 2>/dev/null"`, { encoding: 'utf8', maxBuffer: 15 * 1024 * 1024 });
    const d = JSON.parse(raw.trim());
    console.log(`- ID: ${id} | Title: "${d.title}" | Eps: ${d.episodesInfos?.length}`);
  }
} catch (e) {
  console.error('ERROR:', e.message);
}
