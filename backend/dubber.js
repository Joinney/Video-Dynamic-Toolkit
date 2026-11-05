const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const dubJobs = new Map();

function startDubbingJob(inputVideoPath, options = {}) {
  const jobId = 'dub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const voice = options.voice || 'vi-VN-HoaiMyNeural';
  const speed = options.speed || '+0%';
  const origVol = options.origVol !== undefined ? options.origVol : 0.15;
  const whisperModel = options.whisperModel || 'small';

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
    logs: [
      { time: new Date().toLocaleTimeString('vi-VN', { hour12: false }), text: `🚀 Khởi tạo phiên lồng tiếng: ${outputFileName}` }
    ],
    startTime: Date.now(),
    done: false,
    error: null
  };
  dubJobs.set(jobId, jobState);

  const addLog = (text) => {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    if (clean.includes('unauthenticated requests') || clean.includes('CACHEDIR.TAG')) return;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    jobState.logs.push({ time: timeStr, text: clean });
    if (jobState.logs.length > 500) {
      jobState.logs.shift();
    }
  };

  const scriptPath = path.join(__dirname, 'dubber', 'dubber.py');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  const burnSub = options.burnSubtitles !== undefined ? options.burnSubtitles : true;
  const sourceLang = options.sourceLang || 'auto';
  const targetLang = options.targetLang || 'vi';

  const args = [
    scriptPath,
    '--input', inputVideoPath,
    '--output', outputPath,
    '--voice', voice,
    '--speed', speed,
    '--orig-vol', String(origVol),
    '--whisper-model', whisperModel,
    '--source-lang', sourceLang,
    '--target-lang', targetLang
  ];
  if (burnSub) {
    args.push('--burn-subtitles');
  }
  if (options.enableLogo) {
    args.push('--enable-logo');
    if (options.logoPath) args.push('--logo-path', options.logoPath);
    if (options.logoXPct !== undefined) args.push('--logo-x', String(options.logoXPct / 100));
    if (options.logoYPct !== undefined) args.push('--logo-y', String(options.logoYPct / 100));
    if (options.logoScale !== undefined) args.push('--logo-scale', String(options.logoScale / 100));
    if (options.logoOpacity !== undefined) args.push('--logo-opacity', String(options.logoOpacity / 100));
    if (options.logoRotation !== undefined) args.push('--logo-rotation', String(options.logoRotation));
  }
  if (options.subStyle) {
    args.push('--sub-style', options.subStyle);
  }
  if (options.subFontSize) {
    args.push('--sub-font-size', String(options.subFontSize));
  }
  if (options.enableFloatingWatermark) {
    args.push('--enable-float-wm');
    if (options.floatingWatermarkText) args.push('--float-wm-text', options.floatingWatermarkText);
    if (options.floatingWatermarkOpacity) args.push('--float-wm-opacity', String(options.floatingWatermarkOpacity / 100));
  }
  if (options.enableOutro !== false) {
    args.push('--enable-outro');
    if (options.outroPath) args.push('--outro-path', options.outroPath);
  }
  if (options.subtitles && Array.isArray(options.subtitles) && options.subtitles.length > 0) {
    const subJsonFile = path.join(dir, `.temp_sub_${jobId}.json`);
    try {
      fs.writeFileSync(subJsonFile, JSON.stringify(options.subtitles, null, 2), 'utf-8');
      args.push('--subtitles-json', subJsonFile);
    } catch (e) {
      console.warn('Failed to write temp subJsonFile:', e);
    }
  }

  try {
    const proc = spawn(pythonCmd, args);

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      const lines = text.split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.includes('__PROGRESS__')) {
          const matches = trimmed.match(/__PROGRESS__(\{.*?\})__PROGRESS__/g);
          if (matches) {
            matches.forEach(m => {
              try {
                const jsonStr = m.replace(/__PROGRESS__/g, '');
                const parsed = JSON.parse(jsonStr);
                jobState.status = parsed.status;
                jobState.pct = parsed.pct;
                jobState.message = parsed.message;
                addLog(`[${parsed.pct}%] ${parsed.message}`);
                if (parsed.status === 'completed') {
                  jobState.done = true;
                } else if (parsed.status === 'error') {
                  jobState.done = true;
                  jobState.error = parsed.message;
                }
              } catch (e) {}
            });
          }
        } else {
          addLog(trimmed);
        }
      });
    });

    proc.stderr.on('data', (data) => {
      const errText = data.toString().trim();
      if (!errText) return;
      if (!errText.includes('unauthenticated requests') && !errText.includes('HF_TOKEN')) {
        addLog(errText);
      }
      if (errText.includes('Error') || errText.includes('Traceback')) {
        console.error('[DUBBER ERROR]', errText);
      }
    });

    proc.on('close', (code) => {
      if (code !== 0 && !jobState.done) {
        jobState.status = 'error';
        jobState.done = true;
        jobState.error = jobState.error || 'Tiến trình lồng tiếng bị gián đoạn (Exit code ' + code + ')';
        addLog(`❌ Tiến trình kết thúc với mã lỗi (Exit code ${code})`);
      } else if (code === 0 && !jobState.done) {
        jobState.status = 'completed';
        jobState.pct = 100;
        jobState.done = true;
        jobState.message = 'Lồng tiếng hoàn tất!';
        addLog('🎉 Lồng tiếng video hoàn tất 100%! Tệp thành phẩm đã sẵn sàng.');
      }
    });

    proc.on('error', (err) => {
      jobState.status = 'error';
      jobState.done = true;
      jobState.error = 'Không thể gọi Python: ' + err.message + '. Vui lòng chạy bằng Docker hoặc cài Python 3.';
      addLog(`❌ Lỗi khởi chạy Python: ${err.message}`);
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

function transcribeAndTranslateVideo(inputVideoPath, options = {}) {
  const sourceLang = options.sourceLang || 'auto';
  const targetLang = options.targetLang || 'vi';
  const whisperModel = options.whisperModel || 'small';

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'dubber', 'quick_transcribe.py');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const args = [
      scriptPath,
      '--input', inputVideoPath,
      '--source-lang', sourceLang,
      '--target-lang', targetLang,
      '--whisper-model', whisperModel
    ];

    try {
      const proc = spawn(pythonCmd, args);
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });

      proc.on('close', code => {
        const match = stdout.match(/__TRANSCRIBE_RESULT__(.*?)__TRANSCRIBE_RESULT__/s);
        if (match) {
          try {
            const data = JSON.parse(match[1]);
            resolve(data);
            return;
          } catch (e) {}
        }
        if (code === 0) {
          resolve({ success: true, segments: [] });
        } else {
          reject(new Error(stderr || 'Lỗi nhận diện giọng nói (Exit code ' + code + ')'));
        }
      });

      proc.on('error', err => {
        reject(new Error('Không thể chạy tiến trình Python: ' + err.message));
      });
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  startDubbingJob,
  getDubbingJob,
  generateTTSAudio,
  transcribeAndTranslateVideo
};
