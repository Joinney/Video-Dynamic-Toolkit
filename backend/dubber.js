const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const dubJobs = new Map();

function startDubbingJob(inputVideoPath, options = {}) {
  const jobId = 'dub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const voice = options.voice || 'vi-VN-HoaiMyNeural';
  const speed = options.speed || '+0%';
  const origVol = options.origVol !== undefined ? options.origVol : 0.15;
  const whisperModel = options.whisperModel || 'base';

  const dir = path.dirname(inputVideoPath);
  const ext = path.extname(inputVideoPath);
  const base = path.basename(inputVideoPath, ext);
  const outputFileName = `${base}_LongTieng_Viet${ext}`;
  const outputPath = path.join(dir, outputFileName);

  const jobState = {
    id: jobId,
    inputVideo: inputVideoPath,
    outputVideo: outputPath,
    outputFileName,
    status: 'starting',
    pct: 0,
    message: 'Đang khởi chạy luồng lồng tiếng AI...',
    startTime: Date.now(),
    done: false,
    error: null
  };
  dubJobs.set(jobId, jobState);

  const scriptPath = path.join(__dirname, 'dubber', 'dubber.py');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  const args = [
    scriptPath,
    '--input', inputVideoPath,
    '--output', outputPath,
    '--voice', voice,
    '--speed', speed,
    '--orig-vol', String(origVol),
    '--whisper-model', whisperModel
  ];

  try {
    const proc = spawn(pythonCmd, args);

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      const matches = text.match(/__PROGRESS__(\{.*?\})__PROGRESS__/g);
      if (matches) {
        matches.forEach(m => {
          try {
            const jsonStr = m.replace(/__PROGRESS__/g, '');
            const parsed = JSON.parse(jsonStr);
            jobState.status = parsed.status;
            jobState.pct = parsed.pct;
            jobState.message = parsed.message;
            if (parsed.status === 'completed') {
              jobState.done = true;
            } else if (parsed.status === 'error') {
              jobState.done = true;
              jobState.error = parsed.message;
            }
          } catch (e) {}
        });
      }
    });

    proc.stderr.on('data', (data) => {
      const errText = data.toString();
      if (errText.includes('Error') || errText.includes('Traceback')) {
        console.error('[DUBBER ERROR]', errText);
      }
    });

    proc.on('close', (code) => {
      if (code !== 0 && !jobState.done) {
        jobState.status = 'error';
        jobState.done = true;
        jobState.error = jobState.error || 'Tiến trình lồng tiếng bị gián đoạn (Exit code ' + code + ')';
      } else if (code === 0 && !jobState.done) {
        jobState.status = 'completed';
        jobState.pct = 100;
        jobState.done = true;
        jobState.message = 'Lồng tiếng hoàn tất!';
      }
    });

    proc.on('error', (err) => {
      jobState.status = 'error';
      jobState.done = true;
      jobState.error = 'Không thể gọi Python: ' + err.message + '. Vui lòng chạy bằng Docker hoặc cài Python 3.';
    });
  } catch (err) {
    jobState.status = 'error';
    jobState.done = true;
    jobState.error = 'Lỗi khởi chạy Python: ' + err.message;
  }

  return jobState;
}

function getDubbingJob(jobId) {
  return dubJobs.get(jobId) || null;
}

function generateTTSAudio(text, options = {}) {
  const { TEMP_DIR } = require('./config');
  return new Promise((resolve, reject) => {
    const voice = options.voice || 'vi-VN-HoaiMyNeural';
    const rate = options.rate || '+0%';
    const volume = options.volume || '+0%';
    const filename = `tts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.mp3`;
    const outputPath = path.join(TEMP_DIR, filename);

    const scriptPath = path.join(__dirname, 'dubber', 'tts.py');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const args = [
      scriptPath,
      '--text', text,
      '--voice', voice,
      '--rate', rate,
      '--volume', volume,
      '--output', outputPath
    ];

    try {
      const proc = spawn(pythonCmd, args);
      let stderr = '';
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', code => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve({
            success: true,
            outputPath,
            filename,
            url: `/audio/temp/${filename}`,
            sizeBytes: fs.statSync(outputPath).size
          });
        } else {
          reject(new Error(stderr || 'Lỗi khi tạo audio TTS (Exit code ' + code + ')'));
        }
      });
      proc.on('error', err => {
        reject(new Error('Không thể chạy lệnh Python: ' + err.message));
      });
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  startDubbingJob,
  getDubbingJob,
  generateTTSAudio
};
