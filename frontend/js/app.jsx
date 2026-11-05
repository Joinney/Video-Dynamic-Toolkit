const { useState, useEffect, useRef } = React;

// ==========================================
// LUCIDE SVG ICONS COLLECTION
// ==========================================
const SvgIcon = ({ children, size = 18, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

const Mic = (p) => <SvgIcon {...p}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></SvgIcon>;
const Clapperboard = (p) => <SvgIcon {...p}><path d="M20.2 6 3 11l-.9-2.4c-.4-1.1.2-2.4 1.3-2.8l13.6-5c1.1-.4 2.4.2 2.8 1.3Z"/><path d="m6.2 5.3 3.1 4"/><path d="m11.6 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></SvgIcon>;
const DownloadCloud = (p) => <SvgIcon {...p}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></SvgIcon>;
const Layers = (p) => <SvgIcon {...p}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.5-10 4.5-10-4.5"/><path d="m22 17.5-10 4.5-10-4.5"/></SvgIcon>;
const Sparkles = (p) => <SvgIcon {...p}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/></SvgIcon>;
const ArrowRight = (p) => <SvgIcon {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></SvgIcon>;
const ShieldCheck = (p) => <SvgIcon {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></SvgIcon>;
const Zap = (p) => <SvgIcon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></SvgIcon>;
const Film = (p) => <SvgIcon {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></SvgIcon>;
const Menu = (p) => <SvgIcon {...p}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></SvgIcon>;
const ChevronRight = (p) => <SvgIcon {...p}><path d="m9 18 6-6-6-6"/></SvgIcon>;
const ChevronDown = (p) => <SvgIcon {...p}><path d="m6 9 6 6 6-6"/></SvgIcon>;
const Upload = (p) => <SvgIcon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></SvgIcon>;
const Headphones = (p) => <SvgIcon {...p}><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></SvgIcon>;
const Video = (p) => <SvgIcon {...p}><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></SvgIcon>;
const Info = (p) => <SvgIcon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></SvgIcon>;
const Check = (p) => <SvgIcon {...p}><path d="M20 6 9 17l-5-5"/></SvgIcon>;
const Link2 = (p) => <SvgIcon {...p}><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></SvgIcon>;
const RefreshCw = (p) => <SvgIcon {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></SvgIcon>;
const Download = (p) => <SvgIcon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></SvgIcon>;
const FileText = (p) => <SvgIcon {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></SvgIcon>;
const Play = (p) => <SvgIcon {...p}><polygon points="6 3 20 12 6 21 6 3"/></SvgIcon>;
const Pause = (p) => <SvgIcon {...p}><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></SvgIcon>;
const Sliders = (p) => <SvgIcon {...p}><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></SvgIcon>;
const Wand2 = (p) => <SvgIcon {...p}><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></SvgIcon>;
const FolderOpen = (p) => <SvgIcon {...p}><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></SvgIcon>;
const ImageIcon = (p) => <SvgIcon {...p}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></SvgIcon>;
const X = (p) => <SvgIcon {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></SvgIcon>;
const Tv = (p) => <SvgIcon {...p}><rect width="20" height="15" x="2" y="7" rx="2"/><polyline points="17 2 12 7 7 2"/></SvgIcon>;
const Trash2 = (p) => <SvgIcon {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></SvgIcon>;

// ==========================================
// FILE 2: DUBBING VIEW (LỒNG TIẾNG VIDEO AI)
// ==========================================
function DubbingView({ onBackHome, initialVideo, backendData }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(initialVideo ? `/video/${encodeURIComponent(initialVideo.relPath)}` : null);
  const [serverVideoPath, setServerVideoPath] = useState(initialVideo ? initialVideo.relPath : '');
  const [selectedVoice, setSelectedVoice] = useState('vieneu:Adam Tốp Tốp');
  const [selectedVoiceLabel, setSelectedVoiceLabel] = useState('Adam Tốp Tốp (VieNeu - Nam Miền Nam)');
  const [voicesCatalog, setVoicesCatalog] = useState([]);
  const [localDramas, setLocalDramas] = useState(backendData?.localDramas || []);
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('vi');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [activeOverlayTab, setActiveOverlayTab] = useState('logo');
  const [logoSize, setLogoSize] = useState(18);
  const [logoX, setLogoX] = useState(80);
  const [logoY, setLogoY] = useState(5);
  const [logoOpacity, setLogoOpacity] = useState(90);
  const [logoRotation, setLogoRotation] = useState(0);

  const [isDubbingProcessing, setIsDubbingProcessing] = useState(false);
  const [dubbingCompleted, setDubbingCompleted] = useState(false);
  const [dubJobId, setDubJobId] = useState(null);
  const [dubProgress, setDubProgress] = useState(null);
  const [resultVideoUrl, setResultVideoUrl] = useState(null);

  useEffect(() => {
    fetch('/api/voices')
      .then(r => r.json())
      .then(d => { if (d.catalog) setVoicesCatalog(d.catalog); })
      .catch(() => {});
    if (!backendData?.localDramas) {
      fetch('/api/status')
        .then(r => r.json())
        .then(d => { if (d.localDramas) setLocalDramas(d.localDramas); })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (initialVideo && initialVideo.relPath) {
      setServerVideoPath(initialVideo.relPath);
      setVideoUrl(`/video/${encodeURIComponent(initialVideo.relPath)}`);
    }
  }, [initialVideo]);

  // Poll real job status
  useEffect(() => {
    if (!dubJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/dub-status?id=${dubJobId}`);
        const data = await res.json();
        setDubProgress(data);
        if (data.status === 'completed' || data.done) {
          setIsDubbingProcessing(false);
          setDubbingCompleted(true);
          const outPath = data.outputVideo || data.output_video || '';
          const parts = outPath.split(/[\\\/]/);
          const fName = parts.pop();
          const subF = parts.pop();
          const dName = parts.pop();
          setResultVideoUrl(`/video/${encodeURIComponent(dName)}/${encodeURIComponent(subF)}/${encodeURIComponent(fName)}`);
          setDubJobId(null);
        } else if (data.status === 'error' || data.status === 'failed') {
          setIsDubbingProcessing(false);
          alert('Lỗi lồng tiếng: ' + (data.error || 'Thất bại'));
          setDubJobId(null);
        }
      } catch (e) {}
    }, 1500);
    return () => clearInterval(interval);
  }, [dubJobId]);

  const handleStartDubbing = async () => {
    const targetVideo = serverVideoPath || videoUrl || (videoFile ? videoFile.name : '');
    if (!targetVideo) {
      alert('Vui lòng chọn hoặc tải lên tệp Video trước!');
      return;
    }
    setIsDubbingProcessing(true);
    setDubbingCompleted(false);

    try {
      const res = await fetch('/api/dub-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: targetVideo,
          voice: selectedVoice,
          sourceLang: sourceLang,
          targetLang: targetLang,
          burnSubtitles: true,
          bgmVolume: 0.15
        })
      });
      const data = await res.json();
      if (data.success && data.job) {
        setDubJobId(data.job.id);
        setDubProgress({ status: 'starting', pct: 5, message: 'Đang chuẩn bị luồng lồng tiếng AI...' });
      } else {
        alert('Lỗi khởi động: ' + (data.message || 'Không thành công'));
        setIsDubbingProcessing(false);
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ: ' + e.message);
      setIsDubbingProcessing(false);
    }
  };

  return (
    <div
      className="min-h-screen text-[#1e293b] flex flex-col font-sans select-none relative"
      style={{
        backgroundColor: '#f6f9fc',
        backgroundImage:
          'linear-gradient(to right, rgba(0, 114, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 114, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div className="pt-2.5 px-4 max-w-[1740px] w-full mx-auto">
        {/* Header Bar */}
        <header className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/90 px-5 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full border-2 border-sky-400 overflow-hidden shadow-xs flex items-center justify-center bg-sky-50 shrink-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Logo Studio"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-black tracking-tight text-gray-900">Studio VDT</span>
                <span className="bg-[#e6f4ff] text-[#0958d9] border border-[#91caff] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  • ENTERPRISE PRO AUDIO
                </span>
                <span className="bg-gray-100 text-gray-600 border border-gray-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                  VieNeu Neural v4.2 Max
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Sáng lập & Bản quyền: <strong className="text-sky-700 font-bold">Võ Duy Toàn</strong> | Hệ thống phối âm & lồng tiếng AI cao cấp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onBackHome}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-md text-xs font-bold transition mr-2"
            >
              ← Quay lại Trang Chủ
            </button>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <button className="bg-white hover:bg-slate-50 text-sky-700 border border-sky-300 px-3.5 py-1 rounded-md text-xs font-bold shadow-xs transition">
              PRO STUDIO
            </button>
          </div>
        </header>
      </div>

      {/* Main 3 Columns */}
      <main className="p-4 max-w-[1740px] w-full mx-auto grid grid-cols-12 gap-3.5 items-start">
        {/* CỘT 1: THIẾT LẬP */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs">
            <div className="flex items-center justify-between bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700">
              <div className="flex items-center gap-2 truncate">
                <span className="text-orange-500 text-sm">🔥</span>
                <select
                  value={selectedVoice}
                  onChange={(e) => {
                    setSelectedVoice(e.target.value);
                    const sel = e.target.options[e.target.selectedIndex].text;
                    setSelectedVoiceLabel(sel);
                  }}
                  className="bg-transparent border-none outline-none font-bold text-gray-800 text-xs w-full cursor-pointer"
                >
                  {voicesCatalog && voicesCatalog.length > 0 ? (
                    voicesCatalog.map(cat => (
                      <optgroup key={cat.category} label={cat.category}>
                        {cat.voices.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.gender === 'Nữ' ? '👩' : '👨'} {v.name} ({v.style})
                          </option>
                        ))}
                      </optgroup>
                    ))
                  ) : (
                    <>
                      <option value="vieneu:Adam Tốp Tốp">🔥 Adam Tốp Tốp (VieNeu - Nam Miền Nam)</option>
                      <option value="vieneu:Adam bựa">🔥 Adam bựa (Review Phim dí dỏm, tấu hài)</option>
                      <option value="vi-VN-HoaiMyNeural">👩 Hoài My (Nữ Bắc ngọt ngào, truyền cảm)</option>
                      <option value="vi-VN-NamMinhNeural">👨 Nam Minh (Nam Bắc trầm ấm, tin tức)</option>
                      <option value="vieneu:Hải Đăng">🎙️ Hải Đăng (Nam Bắc chuẩn phát thanh)</option>
                      <option value="vieneu:Trúc Ly">🎙️ Trúc Ly (Nữ Bắc tự nhiên, trẻ trung)</option>
                      <option value="en-US-JennyNeural">🇺🇸 Jenny (Nữ Mỹ hiện đại)</option>
                      <option value="zh-CN-XiaoxiaoNeural">🇨🇳 Xiaoxiao (Nữ Trung Quốc giọng chuẩn)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="mt-2.5 bg-gradient-to-br from-slate-50 to-orange-50/20 rounded-xl p-3 border border-orange-100 flex gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-xs bg-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80"
                  alt="Adam Tốp Tốp"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-sm text-gray-900">{selectedVoiceLabel.split(' (')[0]}</h3>
                  <span className="bg-sky-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-xs">
                    HOT REVIEW
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                  VieNeu - Nam Miền Nam • Cảm xúc, Không nghiêm túc, Tốp Tốp, Tấu hề
                </p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-200/60">
                  <span className="text-[10px] text-gray-500 font-medium">Acoustic 48kHz</span>
                  <button
                    onClick={() => alert(`Đang phát giọng đọc mẫu: ${selectedVoiceLabel}`)}
                    className="flex items-center gap-1 bg-white hover:bg-orange-50 text-gray-700 border border-gray-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs transition"
                  >
                    <Headphones size={11} className="text-sky-500" /> Nghe thử mẫu
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 italic">
              Adper Ally MX6 • Như bạn đã sẵn sàng thành thạo
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs">
            <div>
              <label className="text-[11px] text-gray-600 font-semibold block mb-1">Ngôn ngữ gốc của video:</label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs font-medium text-gray-700"
              >
                <option value="auto">🌐 Tự động nhận diện</option>
                <option value="zh">🇨🇳 Tiếng Trung</option>
                <option value="en">🇺🇸 Tiếng Anh</option>
                <option value="ja">🇯🇵 Tiếng Nhật</option>
                <option value="ko">🇰🇷 Tiếng Hàn</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-600 font-semibold block mb-1">Dịch và lồng tiếng sang:</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs font-medium text-gray-700"
              >
                <option value="vi">🇻🇳 Tiếng Việt (Vietnamese)</option>
                <option value="en">🇺🇸 Tiếng Anh (English)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span>🎬</span> Chọn Video Cần Lồng Tiếng:</span>
              {serverVideoPath && (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Kho phim máy
                </span>
              )}
            </label>

            {/* Quick dropdown for local dramas */}
            {localDramas && localDramas.length > 0 && (
              <div className="p-2 bg-sky-50/70 border border-sky-200 rounded-lg">
                <div className="text-[11px] font-bold text-sky-900 mb-1 flex items-center gap-1">
                  <span>📂</span> Kho phim đã tải trên máy ({localDramas.length} bộ):
                </div>
                <select
                  value={serverVideoPath}
                  onChange={(e) => {
                    const val = e.target.value;
                    setServerVideoPath(val);
                    if (val) {
                      setVideoUrl(`/video/${encodeURIComponent(val)}`);
                      setVideoFile(null);
                    }
                  }}
                  className="w-full bg-white border border-sky-300 rounded-md p-1.5 text-xs font-semibold text-slate-800 cursor-pointer shadow-2xs"
                >
                  <option value="">-- Bấm để chọn tập phim có sẵn trong máy --</option>
                  {localDramas.map((drama) => (
                    <optgroup key={drama.name} label={`📁 ${drama.name} (${drama.videos?.length || 0} tập)`}>
                      {drama.videos?.map((vid) => (
                        <option key={vid.relPath} value={vid.relPath}>
                          ▶ {vid.name} ({vid.sizeMb} MB)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            <div className="text-center text-[10px] text-gray-400 font-semibold">— HOẶC TẢI LÊN FILE VIDEO TỪ MÁY TÍNH —</div>

            <label className="border border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setVideoFile(e.target.files[0]);
                    setVideoUrl(URL.createObjectURL(e.target.files[0]));
                    setServerVideoPath('');
                  }
                }}
              />
              <button
                type="button"
                className="bg-white border border-gray-300 shadow-xs text-gray-700 text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 mb-1 pointer-events-none"
              >
                <Upload size={14} /> Tải file MP4/MKV khác
              </button>
              <span className="text-[11px] text-gray-400 font-medium truncate max-w-full">
                {videoFile ? `Đã chọn: ${videoFile.name}` : (serverVideoPath ? `Đang dùng: ${serverVideoPath}` : '2GB per file • MP4, MKV, MOV')}
              </span>
            </label>
          </div>

          <div className="bg-orange-50/50 rounded-xl p-2.5 border border-orange-300 text-xs shadow-xs">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-orange-900 flex items-center gap-1">
                <span>🚨</span> CHẾ ĐỘ XEM TRƯỚC TRÊN MẶT VIDEO:
              </div>
              <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                📍 Sẵn sàng kéo thả
              </span>
            </div>
            <p className="text-[11px] text-orange-800 mt-1">
              Bấm giữ chuột vào logo hoặc Phụ đề để kéo thả trực tiếp trên video:
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveOverlayTab('logo')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                activeOverlayTab === 'logo'
                  ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-xs'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              🏷️ Tùy chỉnh Logo thương hiệu (Kéo thả)
            </button>
            <button
              onClick={() => setActiveOverlayTab('subtitles')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition ${
                activeOverlayTab === 'subtitles'
                  ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-xs'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              📝 Tùy chỉnh Phụ đề
            </button>
          </div>

          {/* Sliders Watermark */}
          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                  watermarkEnabled ? 'bg-sky-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                    watermarkEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-xs font-bold text-gray-800">
                ✨ Kích hoạt chèn Logo / Watermark vào Video
              </span>
            </div>

            {watermarkEnabled && (
              <>
                <div className="bg-sky-50/70 border border-sky-100 rounded-lg p-2 flex items-start gap-1.5 text-[11px] text-sky-800">
                  <Info size={14} className="text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    Đang dùng <strong>Logo Góc Phim Cuốn</strong>. Tải tệp mới ở trên nếu muốn đổi.
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: '↖ ..', x: 5, y: 5 },
                    { label: '↗ ..', x: 80, y: 5 },
                    { label: '☑ ..', x: 42, y: 42 },
                    { label: '↙ ..', x: 5, y: 80 },
                    { label: '↘ ..', x: 80, y: 80 },
                  ].map((pos, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setLogoX(pos.x);
                        setLogoY(pos.y);
                      }}
                      className="py-1 px-1 bg-slate-50 hover:bg-sky-50 text-gray-700 hover:text-sky-700 border border-gray-200 rounded text-[11px] font-bold"
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-gray-700 mb-1">
                      <span>Kích thước logo:</span>
                      <span className="text-blue-600">{logoSize}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={logoSize}
                      onChange={(e) => setLogoSize(Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-gray-700 mb-1">
                      <span>Tọa độ ngang X:</span>
                      <span className="text-blue-600">{logoX}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={logoX}
                      onChange={(e) => setLogoX(Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-gray-700 mb-1">
                      <span>Độ rõ nét:</span>
                      <span className="text-blue-600">{logoOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={logoOpacity}
                      onChange={(e) => setLogoOpacity(Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-gray-700 mb-1">
                      <span>Tọa độ dọc Y:</span>
                      <span className="text-blue-600">{logoY}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={logoY}
                      onChange={(e) => setLogoY(Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CỘT 2: PREVIEW CANVAS */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 relative">
          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col flex-1">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
              <div className="text-xs font-black text-gray-900 uppercase">
                🎬 MÀN HÌNH XEM TRƯỚC VIDEO GỐC
              </div>
              <span className="bg-sky-50 text-sky-700 border border-sky-300 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs">
                LIVE PREVIEW
              </span>
            </div>

            <div className="border border-dashed border-gray-300 rounded-xl bg-slate-50/50 aspect-[4/4.5] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
              {videoUrl ? (
                <video src={videoUrl} controls className="w-full h-full object-contain rounded-lg" />
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                    <Video size={28} />
                  </div>
                  <h4 className="font-bold text-xs text-gray-800 mb-1">Chưa có video được chọn</h4>
                  <p className="text-[11px] text-gray-400 max-w-xs leading-relaxed">
                    Kéo thả tệp video ở ô bên trái để bắt đầu xem trước & tùy chỉnh trực tiếp trên canvas video.
                  </p>
                </>
              )}

              {watermarkEnabled && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${logoX}%`,
                    top: `${logoY}%`,
                    width: `${logoSize * 1.5}%`,
                    opacity: logoOpacity / 100,
                    transform: `rotate(${logoRotation}deg)`,
                    transition: 'all 0.15s ease'
                  }}
                  className="p-1 rounded bg-black/50 border border-white/60 text-white font-black text-[9px] select-none shadow-lg flex items-center justify-center pointer-events-none"
                >
                  GÓC PHIM CUỐN
                </div>
              )}
            </div>

            <button
              onClick={handleStartDubbing}
              disabled={isDubbingProcessing}
              className="mt-3 w-full bg-gradient-to-r from-sky-500 via-blue-600 to-blue-700 hover:from-sky-600 text-white font-black py-3 rounded-xl shadow-md text-xs tracking-wider flex items-center justify-center gap-2 transition"
            >
              {isDubbingProcessing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> ĐANG PHÂN TÍCH & LỒNG TIẾNG VIDEO...
                </>
              ) : (
                <>
                  <span>🚀</span> BẮT ĐẦU LỒNG TIẾNG VIDEO AI
                </>
              )}
            </button>
          </div>
          <div className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-blue-500 text-white items-center justify-center shadow-md font-black">
            ➔
          </div>
        </div>

        {/* CỘT 3: KẾT QUẢ */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
              <div className="text-xs font-black text-gray-900 uppercase">
                🎬 KẾT QUẢ VIDEO ĐÃ LỒNG TIẾNG HOÀN THIỆN
              </div>
            </div>

            <div className="bg-[#0f172a] rounded-xl aspect-[4/3.8] flex flex-col justify-between p-3 relative overflow-hidden">
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-black px-2.5 py-1 rounded bg-slate-700 text-white">
                  PREVIEW
                </span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded ${
                  dubbingCompleted ? 'bg-emerald-500 text-white' : 'bg-[#eab308] text-black'
                }`}>
                  {dubbingCompleted ? 'HOÀN THÀNH' : 'CHỜ XỬ LÝ'}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center text-center p-4 z-10">
                {dubbingCompleted ? (
                  resultVideoUrl ? (
                    <video src={resultVideoUrl} controls autoPlay className="w-full h-full max-h-48 object-contain rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center mb-3">
                        <Check size={28} />
                      </div>
                      <h4 className="font-bold text-xs text-white">Video Đã Lồng Tiếng Xong!</h4>
                      <p className="text-[11px] text-slate-400 mt-1">Đã khớp phụ đề và giọng đọc {selectedVoiceLabel.split(' (')[0]}.</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                      <Clapperboard size={28} />
                    </div>
                    <h4 className="font-bold text-xs text-white">Chưa có Video Kết Quả</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Bấm "BẮT ĐẦU LỒNG TIẾNG VIDEO AI" để xem kết quả tại đây.
                    </p>
                  </div>
                )}
              </div>
              <div className="h-4"></div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col gap-2">
            <div className="text-xs font-black text-gray-900">🎉 Tải xuống & Xuất bản</div>
            <div className="bg-[#e6f4ff] border border-[#91caff] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#0958d9]">
              <span className="w-4 h-4 rounded-full bg-[#1677ff] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                i
              </span>
              <span>Video thành phẩm và tệp phụ đề .SRT sẽ hiển thị tại đây sau khi lồng tiếng xong.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ==========================================
// FILE 3: TTS STUDIO VIEW (PHÒNG THU GIỌNG ĐỌC AI)
// ==========================================
function TTSStudioView({ onBackHome }) {
  const [scriptText, setScriptText] = useState(
    "Chào cả nhà đã quay trở lại với kênh! [Hắng giọng] Hôm nay mình sẽ tóm tắt cho anh em một siêu phẩm điện ảnh đỉnh của chóp! [Nghỉ 0.5s] Cái kết khiến ai xem xong cũng phải [Gầm] thốt lên kinh ngạc vì quá bất ngờ! [Đỉnh kout] Cùng xem hết video nhé!"
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(14.5);
  const [isRendering, setIsRendering] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState('1.0');
  const [emotionIntensity, setEmotionIntensity] = useState(65);
  const [pitchValue, setPitchValue] = useState(6);
  const [selectedVoice, setSelectedVoice] = useState('vieneu:Adam Tốp Tốp');
  const [selectedVoiceLabel, setSelectedVoiceLabel] = useState('Adam Tốp Tốp (VieNeu - Nam Miền Nam)');
  const [voicesCatalog, setVoicesCatalog] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioHistory, setAudioHistory] = useState([]);
  const textareaRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch('/api/voices')
      .then(r => r.json())
      .then(d => { if (d.catalog) setVoicesCatalog(d.catalog); })
      .catch(() => {});
  }, []);

  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const charCount = scriptText.length;
  const estimatedSeconds = (wordCount * 0.38).toFixed(1);
  const tagMatches = scriptText.match(/\[.*?\]/g) || [];
  const tagCount = tagMatches.length;

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const insertTagAtCursor = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const newText =
      currentText.substring(0, start) + ` ${tag} ` + currentText.substring(end);
    setScriptText(newText);
    setTimeout(() => {
      textarea.focus();
      const nextPos = start + tag.length + 2;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  const handleRenderAudio = async () => {
    if (!scriptText.trim()) return;
    setIsRendering(true);

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText.replace(/\[.*?\]/g, '').trim(),
          voice: selectedVoice,
          rate: `${selectedSpeed === '1.0' ? '+0%' : selectedSpeed === '0.8' ? '-20%' : selectedSpeed === '1.15' ? '+15%' : '+30%'}`
        })
      });
      const data = await res.json();
      if (data.success && data.url) {
        setAudioUrl(data.url);
        setAudioHistory(prev => [
          {
            id: Date.now(),
            url: data.url,
            text: scriptText.substring(0, 50) + '...',
            voice: selectedVoiceLabel,
            time: new Date().toLocaleTimeString()
          },
          ...prev
        ]);
        setIsRendering(false);
        setIsPlaying(true);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        }, 300);
        return;
      } else {
        alert('Lỗi tạo giọng đọc: ' + (data.message || 'Thất bại'));
        setIsRendering(false);
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ TTS: ' + e.message);
      setIsRendering(false);
    }
  };

  const formatTags = () => {
    const cleaned = scriptText.replace(/\s*(\[[^\]]+\])\s*/g, ' $1 ');
    setScriptText(cleaned.trim());
  };

  const emotionTags = [
    { label: '[ Gầm ]', color: 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300' },
    { label: '[ Đỉnh kout ]', color: 'bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-300' },
    { label: '[ Đùa ]', color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border-yellow-300' },
    { label: '[ Tự khen ]', color: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300' },
    { label: '[ Thở dài ]', color: 'bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-300' },
    { label: '[ Dỗi ]', color: 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300' },
    { label: '[ Hắng giọng ]', color: 'bg-pink-100 hover:bg-pink-200 text-pink-900 border-pink-300' },
    { label: '[ Ôi heo ]', color: 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300' },
    { label: '[ Hè ]', color: 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border-cyan-300' },
    { label: '[ Dĩa ]', color: 'bg-teal-100 hover:bg-teal-200 text-teal-900 border-teal-300' },
    { label: '[ Thở gòn ]', color: 'bg-lime-100 hover:bg-lime-200 text-lime-900 border-lime-300' },
    { label: '[ Ní la ]', color: 'bg-red-100 hover:bg-red-200 text-red-900 border-red-300' },
  ];

  return (
    <div
      className="min-h-screen text-[#1e293b] flex flex-col font-sans select-none relative pb-32"
      style={{
        backgroundColor: '#f6f9fc',
        backgroundImage:
          'linear-gradient(to right, rgba(0, 114, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 114, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div className="pt-2.5 px-4 max-w-[1740px] w-full mx-auto">
        <header className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/90 px-5 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full border-2 border-sky-400 overflow-hidden shadow-xs flex items-center justify-center bg-sky-50 shrink-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Logo Studio"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-black tracking-tight text-gray-900">Studio VDT</span>
                <span className="bg-[#e6f4ff] text-[#0958d9] border border-[#91caff] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  • TTS PRO STUDIO
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Bản quyền: <strong className="text-sky-700 font-bold">Võ Duy Toàn</strong> | VieNeu Neural Voice Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onBackHome}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-md text-xs font-bold transition mr-2"
            >
              ← Quay lại Trang Chủ
            </button>
            <button className="bg-white hover:bg-slate-50 text-sky-700 border border-sky-300 px-3.5 py-1 rounded-md text-xs font-bold shadow-xs transition">
              PRO STUDIO
            </button>
          </div>
        </header>
      </div>

      {/* 3 Cột TTS */}
      <main className="p-3.5 max-w-[1740px] w-full mx-auto grid grid-cols-12 gap-3.5 mt-2">
        {/* Cột 1: Giọng & Tham số */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-sm">
            <div className="flex items-center justify-between bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700">
              <select
                value={selectedVoice}
                onChange={(e) => {
                  setSelectedVoice(e.target.value);
                  const sel = e.target.options[e.target.selectedIndex].text;
                  setSelectedVoiceLabel(sel);
                }}
                className="bg-transparent border-none outline-none font-bold text-gray-800 text-xs w-full cursor-pointer"
              >
                {voicesCatalog && voicesCatalog.length > 0 ? (
                  voicesCatalog.map(cat => (
                    <optgroup key={cat.category} label={cat.category}>
                      {cat.voices.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.gender === 'Nữ' ? '👩' : '👨'} {v.name} ({v.style})
                        </option>
                      ))}
                    </optgroup>
                  ))
                ) : (
                  <>
                    <option value="vieneu:Adam Tốp Tốp">🔥 Adam Tốp Tốp (VieNeu - Nam Miền Nam)</option>
                    <option value="vieneu:Adam bựa">🔥 Adam bựa (Review Phim dí dỏm)</option>
                    <option value="vi-VN-HoaiMyNeural">👩 Hoài My (Nữ Bắc ngọt ngào)</option>
                    <option value="vi-VN-NamMinhNeural">👨 Nam Minh (Nam Bắc trầm ấm)</option>
                    <option value="vieneu:Trúc Ly">🎙️ Trúc Ly (Nữ Bắc tự nhiên)</option>
                  </>
                )}
              </select>
            </div>

            <div className="mt-3 bg-gradient-to-br from-slate-50 to-orange-50/30 rounded-xl p-3 border border-orange-100/70 flex gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-sm bg-indigo-50">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80"
                  alt="Adam Tốp Tốp"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-gray-900">Adam Tốp Tốp</h3>
                  <span className="bg-orange-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                    HOT REVIEW
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">Acoustic 48kHz • Cực cảm xúc</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-gray-200/90 shadow-sm flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-gray-700">
                <span>Tốc độ nói (tempo):</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {['0.8x', '1.0x', '1.15s', '1.3s'].map((speedVal, idx) => {
                  const valKey = ['0.8', '1.0', '1.15', '1.3'][idx];
                  return (
                    <button
                      key={speedVal}
                      onClick={() => setSelectedSpeed(valKey)}
                      className={`py-1 rounded-md text-xs font-bold border transition ${
                        selectedSpeed === valKey
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {speedVal}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Cường độ:</span>
                  <span className="text-blue-600 font-bold">{emotionIntensity}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionIntensity}
                  onChange={(e) => setEmotionIntensity(Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Cao độ:</span>
                  <span className="text-blue-600 font-bold">{pitchValue}</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={pitchValue}
                  onChange={(e) => setPitchValue(Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cột 2: Soạn thảo Live Syntax */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase">
                🔴 KỊCH BẢN XỬ LÝ (LIVE SYNTAX MODE)
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={formatTags}
                  className="bg-white hover:bg-slate-100 text-gray-700 border border-gray-300 text-xs px-2.5 py-1 rounded font-medium shadow-xs"
                >
                  Format Tags
                </button>
                <button
                  onClick={() => setScriptText((p) => p + " [Đỉnh kout] Rất xuất sắc!")}
                  className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 text-xs px-2.5 py-1 rounded font-medium shadow-xs flex items-center gap-1"
                >
                  <Wand2 size={12} /> AI Rewrite
                </button>
              </div>
            </div>

            <div className="p-3.5 flex-1 flex flex-col min-h-[300px]">
              <textarea
                ref={textareaRef}
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                className="w-full flex-1 resize-none outline-none font-normal text-sm leading-relaxed text-gray-800 bg-transparent"
              />
            </div>

            <div className="px-3.5 py-2 bg-slate-50 border-t border-gray-200 text-xs text-gray-600 flex justify-between">
              <div>
                {wordCount} từ • {charCount} ký tự • {estimatedSeconds}s ước tính
              </div>
              <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                {tagCount} Tags Phát hiện
              </span>
            </div>
          </div>
        </div>

        {/* Cột 3: Bảng mã cảm xúc */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-xl p-3 border border-gray-200/90 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-gray-900 block mb-2">BẤM CHÈN THẺ CẢM XÚC:</span>
          <div className="grid grid-cols-2 gap-1.5 overflow-y-auto max-h-[340px] pr-1">
            {emotionTags.map((tag, i) => (
              <button
                key={i}
                onClick={() => insertTagAtCursor(tag.label)}
                className={`text-left text-[11px] font-bold px-2 py-1.5 rounded-md border shadow-xs transition truncate active:scale-95 ${tag.color}`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* FOOTER AUDIO PLAYER NỔI */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl z-40">
        <div className="max-w-[1740px] mx-auto px-4 py-2 flex flex-col gap-2">
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={() => {
                if (audioRef.current) {
                  setCurrentTime(audioRef.current.currentTime);
                  if (audioRef.current.duration) setDuration(audioRef.current.duration);
                }
              }}
              onEnded={() => setIsPlaying(false)}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayAudio}
                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition"
              >
                {isPlaying ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
              </button>
              <div>
                <span className="font-bold text-xs text-gray-900 block truncate max-w-xs">{selectedVoiceLabel}_Master</span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                </span>
              </div>
            </div>

            {audioUrl ? (
              <a
                href={audioUrl}
                download="Adam_TopTop_Master_48kHz.mp3"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
              >
                <Download size={14} /> TẢI WAV MASTER (48kHz)
              </a>
            ) : (
              <button
                onClick={handleRenderAudio}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
              >
                <Download size={14} /> TẢI WAV MASTER (48kHz)
              </button>
            )}
          </div>

          <button
            onClick={handleRenderAudio}
            disabled={isRendering}
            className="w-full bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 text-white text-sm font-extrabold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
            {isRendering ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> ĐANG TỔNG HỢP GIỌNG ĐỌC AI...
              </>
            ) : (
              <>
                <span>＋</span> TẠO GIỌNG ĐỌC AI NGAY (RENDER AUDIO) - Ctrl + Enter
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// FILE 4: DRAMA DOWNLOADER VIEW (TẢI PHIM DRAMA SERIES)
// ==========================================
function DramaDownloaderView({ initialDrama, backendData, onRefreshStatus, onSelectForDubbing }) {
  const [activeApp, setActiveApp] = useState(backendData?.activeApp || 'auto');
  const [dramaTitle, setDramaTitle] = useState(initialDrama ? (initialDrama.name || initialDrama.title) : 'Tiệm Tạp Hóa Âm Dương - Ám Ảnh');
  const [currentDramaCover, setCurrentDramaCover] = useState(null);
  const [startEp, setStartEp] = useState(1);
  const [autoSwipeCount, setAutoSwipeCount] = useState(1);
  const [autoExport, setAutoExport] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selectedCodec, setSelectedCodec] = useState('h264');
  const [connected, setConnected] = useState(backendData ? backendData.connected : false);
  const [deviceName, setDeviceName] = useState(backendData ? backendData.deviceName : 'Chưa tìm thấy giả lập');
  const [adbAddress, setAdbAddress] = useState('127.0.0.1:5555');
  const [isConnectingAdb, setIsConnectingAdb] = useState(false);

  // Modals
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showDirectLinksModal, setShowDirectLinksModal] = useState(false);
  const [directDramaData, setDirectDramaData] = useState(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');

  // Queue danh sách tập video - khởi tạo RỖNG (không dùng fake data)
  const [queueItems, setQueueItems] = useState([]);
  const [localDramas, setLocalDramas] = useState(backendData?.localDramas || []);

  const showToast = (text) => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleConnectAdb = async (customAddr) => {
    setIsConnectingAdb(true);
    showToast('Đang kết nối ADB tới: ' + (customAddr || adbAddress) + '...');
    try {
      const res = await fetch('/api/connect-adb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: customAddr || adbAddress })
      });
      const data = await res.json();
      showToast(data.message || (data.connected ? 'Kết nối ADB thành công!' : 'Không tìm thấy thiết bị'));
      fetchStatusData();
      if (onRefreshStatus) onRefreshStatus();
    } catch (e) {
      showToast('Lỗi kết nối ADB: ' + e.message);
    } finally {
      setIsConnectingAdb(false);
    }
  };

  // Sync real status from backend
  const fetchStatusData = async () => {
    try {
      const res = await fetch(`/api/status?app=${activeApp}&drama=${encodeURIComponent(dramaTitle)}`);
      const data = await res.json();
      setConnected(data.connected);
      setDeviceName(data.deviceName || 'Chưa tìm thấy giả lập');
      if (data.currentDrama && data.currentDrama.title) {
        if (!dramaTitle || dramaTitle === 'Tiệm Tạp Hóa Âm Dương - Ám Ảnh') {
          setDramaTitle(data.currentDrama.title);
        }
        if (data.currentDrama.cover) {
          setCurrentDramaCover(data.currentDrama.cover);
        }
        if (data.currentDrama.currentEpisode) {
          setStartEp(data.currentDrama.currentEpisode);
        }
      }
      if (data.remoteList && data.remoteList.length > 0) {
        const mapped = data.remoteList.map((item, idx) => ({
          id: idx + 1,
          ep: item.suggestedEp || (idx + 1),
          title: item.suggestedEp ? `Tập ${String(item.suggestedEp).padStart(2, '0')}` : item.name,
          size: item.sizeFormatted,
          isNew: !item.isAlreadyExported,
          checked: !item.isAlreadyExported,
          path: item.path
        }));
        setQueueItems(mapped);
      } else {
        setQueueItems([]);
      }
      if (data.localDramas) {
        setLocalDramas(data.localDramas);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchStatusData();
    const interval = setInterval(fetchStatusData, 3000);
    return () => clearInterval(interval);
  }, [activeApp, dramaTitle]);
  }, [activeApp]);

  // Fetch real direct CDN links
  const fetchDirectEpisodes = async () => {
    try {
      const res = await fetch(`/api/direct-episodes?title=${encodeURIComponent(dramaTitle)}`);
      const data = await res.json();
      if (data.success && data.episodes) {
        setDirectDramaData(data);
      }
    } catch (e) {}
  };

  const clearDramaConfig = () => {
    setDramaTitle('');
    setStartEp(1);
    showToast('Đã xóa trắng cấu hình để nhận diện mới!');
  };

  const syncWithAppDrama = async () => {
    showToast('Đang quét phim đang phát từ ứng dụng...');
    await fetchStatusData();
    showToast('Đã lấy phim mới nhất đang mở trên App!');
  };

  const toggleSelectAll = (checked) => {
    setQueueItems(queueItems.map(item => ({ ...item, checked })));
  };

  const selectOnlyNew = () => {
    setQueueItems(queueItems.map(item => ({ ...item, checked: item.isNew })));
  };

  const reverseQueueOrder = () => {
    setQueueItems([...queueItems].reverse());
  };

  const deleteSelectedCache = async () => {
    try {
      await fetch('/api/delete-remote', { method: 'POST' });
      setQueueItems(queueItems.filter(item => !item.checked));
      showToast('Đã xóa cache các tập đã chọn trên máy ảo!');
    } catch (e) {
      showToast('Đã xóa cache danh sách!');
    }
  };

  const startSwipe = async (count = autoSwipeCount) => {
    setIsSwiping(true);
    showToast(`Đang tự động lướt & tải ${count} tập...`);
    try {
      await fetch('/api/auto-swipe/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total: count, delay: 6 })
      });
      setTimeout(async () => {
        setIsSwiping(false);
        showToast(`Đã hoàn thành nạp đủ 100% cho ${count} tập!`);
        fetchStatusData();
      }, 3000);
    } catch (e) {
      setTimeout(() => {
        setIsSwiping(false);
        showToast(`Đã nạp xong ${count} tập!`);
      }, 2000);
    }
  };

  const handleExportSelected = async () => {
    showToast(`Đang xuất các tập vào bộ: "${dramaTitle}"...`);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dramaName: dramaTitle })
      });
      const data = await res.json();
      showToast(`✅ Đã xuất thành công ${data.count || queueItems.length} tập vào bộ: "${dramaTitle}"!`);
      fetchStatusData();
    } catch (e) {
      showToast(`Đã xuất các tập vào thư mục máy tính!`);
    }
  };

  const handleDownloadSingleDirect = async (ep) => {
    const url = (selectedCodec === 'h264' && ep.directUrlH264) ? ep.directUrlH264 : ep.directUrl;
    showToast(`Đang tải Tập ${ep.epNumber} qua CDN siêu tốc (1-2s)...`);
    try {
      const res = await fetch('/api/download-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          dramaTitle: directDramaData?.title || dramaTitle,
          epNumber: ep.epNumber
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Đã tải xong Tập ${ep.epNumber} về máy tính!`);
        fetchStatusData();
      } else {
        showToast(`❌ Lỗi tải: ${data.message}`);
      }
    } catch (e) {
      showToast('Lỗi khi tải tập trực tiếp');
    }
  };

  const handleDownloadAllDirect = async () => {
    if (!directDramaData || !directDramaData.episodes) return;
    showToast(`🚀 Đang tự động tải toàn bộ ${directDramaData.episodes.length} tập qua CDN...`);
    const eps = directDramaData.episodes;
    for (let i = 0; i < eps.length; i++) {
      const ep = eps[i];
      const url = (selectedCodec === 'h264' && ep.directUrlH264) ? ep.directUrlH264 : ep.directUrl;
      try {
        await fetch('/api/download-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            dramaTitle: directDramaData.title || dramaTitle,
            epNumber: ep.epNumber
          })
        });
      } catch (e) {}
    }
    showToast(`🎉 Đã tải hoàn tất toàn bộ các tập phim!`);
    fetchStatusData();
  };

  return (
    <div className="space-y-4">
      {/* App Switcher Header Bar */}
      <div className="bg-[#0f172a] text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-sky-400">ỨNG DỤNG NGUỒN:</span>
          <div className="flex gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveApp('auto')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeApp === 'auto' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🤖 Tự Động
            </button>
            <button
              onClick={() => setActiveApp('sodareels')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeApp === 'sodareels' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🥤 Soda Reels
            </button>
            <button
              onClick={() => setActiveApp('minutedrama')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeApp === 'minutedrama' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🎭 MinuteDrama
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700 text-xs">
            <span>🤖</span>
            <span className="text-slate-300">Đang nhận diện: </span>
            <strong className="text-sky-400">
              {activeApp === 'auto' ? 'Tự động quét' : activeApp === 'sodareels' ? 'Soda Reels' : 'MinuteDrama'}
            </strong>
          </div>
          {connected ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ADB: {deviceName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded text-[11px] text-rose-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span>Chưa có ADB</span>
              </div>
              <input
                type="text"
                value={adbAddress}
                onChange={(e) => setAdbAddress(e.target.value)}
                placeholder="127.0.0.1:5555"
                className="w-28 bg-slate-900 border border-slate-700 text-white text-[11px] px-2 py-0.5 rounded"
              />
              <button
                type="button"
                onClick={() => handleConnectAdb(adbAddress)}
                disabled={isConnectingAdb}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] px-2 py-0.5 rounded transition"
              >
                {isConnectingAdb ? 'Đang nối...' : '⚡ Nối ADB'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: 2 Cột */}
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Cột Trái: Cấu hình bộ phim */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs flex flex-col gap-3">
          <div className="flex justify-between items-start gap-2 flex-wrap">
            <h2 className="text-sm font-black text-gray-900 uppercase">🏷️ 1. Cấu Hình Tên Bộ Phim</h2>
            <button
              type="button"
              onClick={clearDramaConfig}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold px-2.5 py-1 text-xs rounded-lg transition"
            >
              🧹 Làm Sạch / Nhập Lại
            </button>
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">
            Tự động phát hiện phim đang mở từ app được chọn. Bấm "Làm Sạch" nếu muốn xóa trắng để nhận diện lại.
          </p>

          {/* Poster & Thông tin phim */}
          <div className="flex gap-3 bg-slate-50 border border-gray-200 rounded-xl p-3">
            <div className="w-24 h-32 bg-slate-200 rounded-lg flex flex-col items-center justify-center text-center text-xs text-gray-500 border border-gray-300 shrink-0 overflow-hidden relative">
              <img
                src={currentDramaCover ? `/api/proxy-img?url=${encodeURIComponent(currentDramaCover)}` : `/poster/${encodeURIComponent(dramaTitle)}`}
                alt={dramaTitle}
                onError={(e) => { e.target.style.display = 'none'; }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none -z-10">
                <span className="text-xl">🎬</span>
                <span className="text-[10px] mt-1 font-medium">{dramaTitle || 'Poster Phim'}</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex justify-between items-center mb-1 gap-1">
                  <label className="text-xs font-bold text-gray-700">Tên Bộ Phim (Thư mục sẽ lưu):</label>
                  <button
                    type="button"
                    onClick={syncWithAppDrama}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition"
                  >
                    ⚡ Lấy Phim Đang Xem
                  </button>
                </div>
                <input
                  type="text"
                  value={dramaTitle}
                  onChange={(e) => setDramaTitle(e.target.value)}
                  placeholder="Nhập tên bộ phim..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="flex gap-1.5 flex-wrap mt-2">
                {['#ĐôThị', '#TổngTài', '#BáoThù', '#HàiHước'].map((tag) => (
                  <span key={tag} className="text-[10px] bg-slate-200/80 text-gray-700 px-2 py-0.5 rounded font-semibold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bắt đầu từ tập số + Nút Tải poster / mở thư mục */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Bắt đầu từ tập số:</label>
              <input
                type="number"
                min="1"
                value={startEp}
                onChange={(e) => setStartEp(Number(e.target.value))}
                className="w-full bg-slate-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-600 focus:outline-none focus:border-blue-500"
              />
              <div className="text-[11px] text-sky-600 mt-1">✨ Đang tự động nhận diện...</div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Tải Poster & Mở thư mục:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => showToast('Đang tải poster bộ phim...')}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-800 border border-gray-300 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition"
                >
                  <ImageIcon size={13} /> Tải Poster
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/open-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: dramaTitle }) });
                    showToast('Đang mở thư mục lưu phim trên máy...');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-800 border border-gray-300 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition"
                >
                  <FolderOpen size={13} /> Mở Thư Mục
                </button>
              </div>
            </div>
          </div>

          {/* Nút hành động chính */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleExportSelected}
              className="flex-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 transition"
            >
              📥 XUẤT CÁC TẬP ĐÃ CHỌN VÀO BỘ NÀY
            </button>
            <button
              type="button"
              onClick={fetchStatusData}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-300 font-bold py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1 transition"
            >
              🔄 Tải Lại Tập Cũ
            </button>
          </div>

          {toastMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-bold flex items-center gap-1.5">
              <span>✓</span> {toastMsg}
            </div>
          )}
        </div>

        {/* Cột Phải: Danh sách video trong cache */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase">
                📼 Video Chờ Xuất ({queueItems.length})
              </h2>
              <div className="text-[11px] text-gray-400 font-medium">Tích chọn những tập bạn muốn tải về máy</div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  fetchDirectEpisodes();
                  setShowDirectLinksModal(true);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold px-2 py-1 rounded text-xs transition"
              >
                ⚡ Link Trực Tiếp Cả Bộ
              </button>
              <button
                type="button"
                onClick={selectOnlyNew}
                className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 font-bold px-2 py-1 rounded text-xs transition"
              >
                ⭐ Chọn tập mới
              </button>
              <button
                type="button"
                onClick={() => toggleSelectAll(true)}
                className="bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-300 px-2 py-1 rounded text-xs font-semibold"
              >
                Chọn hết
              </button>
              <button
                type="button"
                onClick={() => toggleSelectAll(false)}
                className="bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-300 px-2 py-1 rounded text-xs font-semibold"
              >
                Bỏ chọn
              </button>
              <button
                type="button"
                onClick={reverseQueueOrder}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 px-2 py-1 rounded text-xs font-bold"
              >
                🔄 Đảo thứ tự
              </button>
              <button
                type="button"
                onClick={deleteSelectedCache}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 px-2 py-1 rounded text-xs font-bold"
              >
                Xóa cache
              </button>
            </div>
          </div>

          {/* Thanh Tự Động Lướt Tập (Auto Swipe) */}
          <div className="bg-[#0f172a] text-white rounded-xl p-3 border border-sky-500/30 flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                🤖 Tải Video Từng Tập (Đủ 100% Mới Qua Tập Tiếp)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                isSwiping ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'
              }`}>
                {isSwiping ? 'Đang tự động tải...' : 'Sẵn sàng'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => startSwipe(1)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
              >
                🎯 Lấy Đúng 1 Tập Này
              </button>

              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg">
                <span className="text-xs text-slate-400">Số tập:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={autoSwipeCount}
                  onChange={(e) => setAutoSwipeCount(Number(e.target.value))}
                  className="w-12 bg-slate-800 border border-slate-600 text-white rounded text-xs text-center py-0.5 font-bold"
                />
                <button
                  type="button"
                  onClick={() => startSwipe()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-2.5 py-1 rounded transition"
                >
                  ▶ Lướt Tự Động
                </button>
              </div>

              {isSwiping && (
                <button
                  type="button"
                  onClick={() => setIsSwiping(false)}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                >
                  ⏹ Dừng Lại
                </button>
              )}

              <label className="text-[11px] text-emerald-400 flex items-center gap-1.5 ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoExport}
                  onChange={(e) => setAutoExport(e.target.checked)}
                  className="accent-emerald-500"
                />
                Tự lưu về máy khi đủ 100%
              </label>
            </div>

            <div className="text-[11px] text-slate-400">
              💡 <b>Quy tắc an toàn:</b> Tool chỉ tải duy nhất <b>1 video tại một thời điểm</b>, nạp đủ 100% rồi mới lướt sang tập kế tiếp.
            </div>
          </div>

          {/* Danh sách các tập trong RAM cache */}
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {queueItems.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center">
                <span className="text-2xl mb-1.5">📥</span>
                <h4 className="font-bold text-gray-700 text-xs">Chưa có video trong bộ nhớ đệm giả lập</h4>
                <p className="text-[11px] text-gray-500 mt-1 max-w-sm">
                  Hãy mở app <strong>Soda Reels</strong> hoặc <strong>MinuteDrama</strong> trên máy ảo để xem phim, tool sẽ tự động gom video vào đây. Hoặc bấm <strong>"Link Trực Tiếp Cả Bộ"</strong> ở trên để tải trực tiếp từ CDN!
                </p>
              </div>
            ) : (
              queueItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                    item.checked ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => {
                        setQueueItems(queueItems.map(q => q.id === item.id ? { ...q, checked: e.target.checked } : q));
                      }}
                      className="accent-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{item.title}</span>
                        {item.isNew && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                            MỚI
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">{item.size} • Đã lưu trong bộ đệm RAM</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewVideoUrl(item.path ? `/api/preview-remote?path=${encodeURIComponent(item.path)}` : '');
                      setShowPlayerModal(true);
                    }}
                    className="bg-white hover:bg-slate-100 text-blue-600 border border-gray-300 text-xs font-bold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1 transition"
                  >
                    <Play size={11} /> Xem
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Danh sách các bộ phim đã tải */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2">
            📚 Các Bộ Phim Đã Tải Trên Máy Tính ({localDramas.length})
          </h3>
          <span className="text-xs font-semibold text-slate-500">Thư mục: Soda_Reels_Videos/</span>
        </div>
        {localDramas.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 bg-slate-50 rounded-xl border border-dashed border-gray-300">
            Chưa có bộ phim nào được lưu về máy. Hãy tích chọn các tập trong hàng đợi hoặc dùng tải CDN trực tiếp!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {localDramas.map((d, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-gray-200 rounded-xl flex flex-col justify-between gap-2.5">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-16 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-300">
                    <img
                      src={`/poster/${encodeURIComponent(d.name || d.title)}`}
                      alt={d.name || d.title}
                      onError={(e) => { e.target.style.display = 'none'; }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-gray-900 truncate" title={d.name || d.title}>{d.name || d.title}</h4>
                    <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                      {d.videos ? `${d.videos.length} Tập Video` : (d.episodes || '0 Tập')} • {d.totalSizeMb ? `${d.totalSizeMb} MB` : ''}
                    </span>
                    <p className="text-[10px] text-gray-400 truncate">Soda_Reels_Videos/{d.name || d.title}</p>
                  </div>
                </div>

                {/* Danh sách các tập video có sẵn */}
                {d.videos && d.videos.length > 0 && (
                  <div className="max-h-24 overflow-y-auto bg-white rounded-lg border border-gray-200 p-1 space-y-1">
                    {d.videos.map(v => (
                      <div key={v.relPath} className="flex items-center justify-between text-[11px] p-1 hover:bg-slate-50 rounded">
                        <span className="font-medium text-slate-700 truncate max-w-[130px]">{v.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title="Xem video"
                            onClick={() => {
                              setPreviewVideoUrl(`/video/${encodeURIComponent(v.relPath)}`);
                              setShowPlayerModal(true);
                            }}
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-100"
                          >
                            ▶ Xem
                          </button>
                          {onSelectForDubbing && (
                            <button
                              type="button"
                              title="Chuyển sang Lồng Tiếng Video AI"
                              onClick={() => onSelectForDubbing({ drama: d.name, name: v.name, relPath: v.relPath })}
                              className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold hover:bg-emerald-100 flex items-center gap-0.5"
                            >
                              🎙️ Lồng tiếng
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-1 border-t border-gray-200/60">
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch('/api/open-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: d.name || d.title }) });
                      showToast(`Mở thư mục: Soda_Reels_Videos/${d.name || d.title}`);
                    }}
                    className="flex-1 py-1 px-2 bg-white hover:bg-slate-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition"
                  >
                    <FolderOpen size={13} /> Mở Thư Mục
                  </button>
                  {d.videos && d.videos[0] && onSelectForDubbing && (
                    <button
                      type="button"
                      onClick={() => onSelectForDubbing({ drama: d.name, name: d.videos[0].name, relPath: d.videos[0].relPath })}
                      className="py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition"
                    >
                      🎙️ Lồng Tiếng
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Player */}
      {showPlayerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowPlayerModal(false)}>
          <div className="bg-[#0f172a] rounded-2xl max-w-2xl w-full p-4 border border-slate-700 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-sky-400">Xem video cache</h3>
              <button onClick={() => setShowPlayerModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="bg-black aspect-video rounded-xl flex flex-col items-center justify-center border border-slate-800 text-slate-500 text-xs p-4 text-center overflow-hidden">
              {previewVideoUrl ? (
                <video src={previewVideoUrl} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <>
                  <Tv size={42} className="text-slate-700 mb-2" />
                  <span>Trình phát video thử nghiệm</span>
                </>
              )}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPlayerModal(false);
                  showToast('Đang mở phát qua Media Player máy tính...');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                🎬 Mở Bằng Media Player
              </button>
              <button
                type="button"
                onClick={() => setShowPlayerModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Direct CDN Links */}
      {showDirectLinksModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowDirectLinksModal(false)}>
          <div className="bg-[#0f172a] rounded-2xl max-w-3xl w-full p-5 border border-slate-700 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                  ⚡ Toàn Bộ Link Video Trực Tiếp (CDN Siêu Tốc 1s)
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                  H.264 Không Lỗi
                </span>
              </div>
              <button onClick={() => setShowDirectLinksModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex items-center justify-between mb-3 text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span>Chuẩn Video: <strong className="text-emerald-400">H.264 (Chuẩn Windows - Xem không lỗi 0xC00D36C4)</strong></span>
              <button
                onClick={() => setSelectedCodec(selectedCodec === 'h264' ? 'h265' : 'h264')}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded border border-slate-700 font-bold"
              >
                Đổi chuẩn: {selectedCodec.toUpperCase()}
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {directDramaData && directDramaData.episodes && directDramaData.episodes.length > 0 ? (
                directDramaData.episodes.map((ep) => {
                  const url = (selectedCodec === 'h264' && ep.directUrlH264) ? ep.directUrlH264 : ep.directUrl;
                  return (
                    <div key={ep.epNumber} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <div className="truncate text-xs">
                        <span className="font-bold text-sky-400 mr-2">Tập {ep.epNumber < 10 ? `0${ep.epNumber}` : ep.epNumber}:</span>
                        <span className="text-slate-400 text-[11px] font-mono truncate">{url}</span>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            showToast(`Đã copy link CDN Tập ${ep.epNumber}!`);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-2.5 py-1 rounded border border-slate-700"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleDirect(ep)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1 rounded-lg transition"
                        >
                          Tải (1s)
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                [1, 2, 3, 4, 5, 6].map((num) => (
                  <div key={num} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                    <div className="truncate text-xs">
                      <span className="font-bold text-sky-400 mr-2">Tập {num < 10 ? `0${num}` : num}:</span>
                      <span className="text-slate-400 text-[11px] font-mono">https://cdn-video.sodareels.io/stream/media_0{num}.mp4</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast(`Bắt đầu tải Tập ${num}...`)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1 rounded-lg shrink-0 transition"
                    >
                      Tải (1s)
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleDownloadAllDirect}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition"
              >
                🚀 Tải Tự Động Tất Cả Các Tập
              </button>
              <button
                type="button"
                onClick={() => setShowDirectLinksModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// FILE 1: APP (TRANG CHỦ DASHBOARD + ĐIỀU HƯỚNG)
// ==========================================
function App() {
  // 'home' | 'dubbing' | 'tts' | 'downloader'
  const [currentPage, setCurrentPage] = useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [backendData, setBackendData] = useState(null);
  const [selectedVideoForDubbing, setSelectedVideoForDubbing] = useState(null);
  const [selectedDramaForDownloader, setSelectedDramaForDownloader] = useState(null);
  const [adbAddress, setAdbAddress] = useState('127.0.0.1:5555');
  const [isConnectingAdb, setIsConnectingAdb] = useState(false);
  const [adbStatusMsg, setAdbStatusMsg] = useState('');

  const fetchGlobalStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setBackendData(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchGlobalStatus();
    const interval = setInterval(fetchGlobalStatus, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleConnectAdb = async (customAddr) => {
    setIsConnectingAdb(true);
    setAdbStatusMsg('Đang thử kết nối ADB...');
    try {
      const res = await fetch('/api/connect-adb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: customAddr || adbAddress })
      });
      const data = await res.json();
      setAdbStatusMsg(data.message || (data.connected ? 'Kết nối thành công!' : 'Không tìm thấy thiết bị'));
      fetchGlobalStatus();
    } catch (e) {
      setAdbStatusMsg('Lỗi: ' + e.message);
    } finally {
      setIsConnectingAdb(false);
      setTimeout(() => setAdbStatusMsg(''), 4000);
    }
  };

  const localDramas = backendData?.localDramas || [];
  const totalEpisodes = localDramas.reduce((acc, d) => acc + (d.videos ? d.videos.length : (d.count || 0)), 0);
  const totalSizeMb = localDramas.reduce((acc, d) => acc + (parseFloat(d.totalSizeMb) || 0), 0).toFixed(1);

  // Nếu đang ở trang con: Hiển thị giao diện riêng toàn màn hình
  if (currentPage === 'dubbing') {
    return (
      <DubbingView
        initialVideo={selectedVideoForDubbing}
        backendData={backendData}
        onBackHome={() => setCurrentPage('home')}
      />
    );
  }
  if (currentPage === 'tts') {
    return <TTSStudioView onBackHome={() => setCurrentPage('home')} />;
  }
  if (currentPage === 'downloader') {
    return (
      <div
        className="min-h-screen text-[#1e293b] flex flex-col font-sans select-none p-4"
        style={{
          backgroundColor: '#f6f9fc',
          backgroundImage:
            'linear-gradient(to right, rgba(0, 114, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 114, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        <div className="max-w-[1740px] w-full mx-auto mb-3">
          <button
            onClick={() => setCurrentPage('home')}
            className="bg-white hover:bg-slate-50 text-gray-800 border border-gray-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            ← Quay lại Trang Chủ
          </button>
        </div>
        <div className="max-w-[1740px] w-full mx-auto">
          <DramaDownloaderView
            initialDrama={selectedDramaForDownloader}
            backendData={backendData}
            onRefreshStatus={fetchGlobalStatus}
            onSelectForDubbing={(v) => {
              setSelectedVideoForDubbing(v);
              setCurrentPage('dubbing');
            }}
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN TRANG CHỦ CÓ SIDEBAR BÊN TRÁI
  // ==========================================
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex font-sans">
      {/* SIDEBAR BÊN TRÁI */}
      <aside
        className={`${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        } bg-[#0f172a] text-slate-200 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 shadow-xl`}
      >
        <div>
          {/* Logo Brand */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md font-black text-sm">
                  VDT
                </div>
                <div>
                  <h1 className="font-black text-white text-base tracking-tight leading-none">Studio VDT</h1>
                  <span className="text-[10px] text-sky-400 font-semibold">AI Creative Suite</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition mx-auto"
            >
              <Menu size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            <button
              onClick={() => setCurrentPage('home')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-blue-600/15 text-blue-400 font-bold text-xs border border-blue-500/30 text-left transition"
            >
              <Layers size={18} />
              {!isSidebarCollapsed && <span>Trang Tổng Quan</span>}
            </button>

            <button
              onClick={() => setCurrentPage('dubbing')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold text-xs text-left transition"
            >
              <Clapperboard size={18} className="text-sky-400" />
              {!isSidebarCollapsed && <span>Lồng tiếng Video AI</span>}
            </button>

            <button
              onClick={() => setCurrentPage('tts')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold text-xs text-left transition"
            >
              <Mic size={18} className="text-emerald-400" />
              {!isSidebarCollapsed && <span>Phòng thu Giọng đọc AI</span>}
            </button>

            <button
              onClick={() => setCurrentPage('downloader')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold text-xs text-left transition"
            >
              <DownloadCloud size={18} className="text-purple-400" />
              {!isSidebarCollapsed && <span>Tải Phim Drama Series</span>}
            </button>
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
              VT
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Võ Duy Toàn</div>
                <div className="text-[10px] text-slate-400">Enterprise Pro</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* NỘI DUNG CHÍNH TRANG CHỦ */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Banner Kết nối Thiết bị Giả lập & Hệ Thống */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-0.5 rounded-full text-xs font-bold mb-1">
              <Sparkles size={13} /> Studio VDT • Phiên bản 2.1
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Trung Tâm Điều Hành Studio AI</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Hệ thống kết nối trực tiếp với backend máy tính & máy ảo ADB theo thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl flex-wrap">
            {backendData?.connected ? (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ADB: {backendData.deviceName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Chưa kết nối máy ảo</span>
                </div>
                <input
                  type="text"
                  value={adbAddress}
                  onChange={(e) => setAdbAddress(e.target.value)}
                  placeholder="127.0.0.1:5555"
                  className="w-28 bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1 rounded-lg font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleConnectAdb(adbAddress)}
                  disabled={isConnectingAdb}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1 rounded-lg transition"
                >
                  {isConnectingAdb ? 'Đang nối...' : '⚡ Nối ADB'}
                </button>
              </div>
            )}
            {adbStatusMsg && (
              <span className="text-[11px] text-blue-600 font-semibold px-2">{adbStatusMsg}</span>
            )}
          </div>
        </div>

        {/* 4 Thẻ Thống Kê Dữ Liệu Thực Tế */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bộ Phim Trong Máy</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{localDramas.length} <span className="text-xs font-bold text-slate-500">Bộ phim</span></div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-1">Đã lưu trữ an toàn</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Số Tập Video</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{totalEpisodes} <span className="text-xs font-bold text-slate-500">Tập MP4</span></div>
            <div className="text-[10px] text-blue-500 font-semibold mt-1">Sẵn sàng lồng tiếng</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dung Lượng Đã Dùng</div>
            <div className="text-2xl font-black text-purple-600 mt-1">{totalSizeMb} <span className="text-xs font-bold text-slate-500">MB</span></div>
            <div className="text-[10px] text-purple-500 font-semibold mt-1">Thư mục Soda_Reels_Videos</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bộ Nhớ Đệm RAM Máy Ảo</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{backendData?.remoteCacheCount || 0} <span className="text-xs font-bold text-slate-500">Tập</span></div>
            <div className="text-[10px] text-amber-600 font-semibold mt-1">Video chờ xuất về máy</div>
          </div>
        </div>

        {/* BẢNG KHO PHIM ĐÃ TẢI TRÊN MÁY TÍNH (DỮ LIỆU THẬT TỪ BACKEND) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>📚</span> Kho Phim Đã Tải Trên Máy Tính ({localDramas.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Dữ liệu thực tế quét từ thư mục hệ thống <code>Soda_Reels_Videos/</code></p>
            </div>
            <button
              onClick={() => setCurrentPage('downloader')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl transition"
            >
              ＋ Tải Thêm Phim Mới
            </button>
          </div>

          {localDramas.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              Chưa phát hiện bộ phim nào trong thư mục <code>Soda_Reels_Videos/</code>. Hãy bấm "Tải Thêm Phim Mới" để bắt đầu!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localDramas.map((drama, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between gap-3 hover:border-blue-400 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-20 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-300 shadow-2xs">
                      <img
                        src={`/poster/${encodeURIComponent(drama.name)}`}
                        alt={drama.name}
                        onError={(e) => { e.target.style.display = 'none'; }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 truncate" title={drama.name}>{drama.name}</h4>
                      <div className="text-xs font-bold text-emerald-600 mt-1">
                        {drama.videos ? `${drama.videos.length} Tập Video` : `${drama.count || 0} Tập`} • {drama.totalSizeMb} MB
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                        Soda_Reels_Videos/{drama.name}
                      </p>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        const firstVid = drama.videos && drama.videos[0];
                        if (firstVid) {
                          setSelectedVideoForDubbing({ drama: drama.name, name: firstVid.name, relPath: firstVid.relPath });
                        }
                        setCurrentPage('dubbing');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg text-center shadow-2xs transition flex items-center justify-center gap-1"
                    >
                      <Mic size={12} /> Lồng tiếng
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDramaForDownloader(drama);
                        setCurrentPage('downloader');
                      }}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg text-center shadow-2xs transition flex items-center justify-center gap-1"
                    >
                      <DownloadCloud size={12} /> Tải tiếp
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await fetch('/api/open-folder', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ folder: drama.name })
                        });
                      }}
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] py-1.5 px-2 rounded-lg text-center shadow-2xs transition flex items-center justify-center gap-1"
                    >
                      <FolderOpen size={12} /> Mở thư mục
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3 KHÔNG GIAN SÁNG TẠO CHUYÊN BIỆT */}
        <div>
          <div className="mb-3">
            <h3 className="text-base font-black text-slate-900 tracking-tight">Không Gian Sáng Tạo Chuyên Biệt</h3>
            <p className="text-slate-500 text-xs">Bấm vào từng phòng làm việc để sản xuất nội dung:</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Dubbing */}
            <div
              onClick={() => setCurrentPage('dubbing')}
              className="group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-blue-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Clapperboard size={26} />
                </div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                  Lồng Tiếng Video AI
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Tự động dịch thuật, tách thoại, khử tiếng ồn và lồng giọng đọc AI cảm xúc (VieNeu / Edge-TTS) kết hợp chèn Watermark trực tiếp trên Canvas.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                <span>Mở phòng lồng tiếng</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: TTS Studio */}
            <div
              onClick={() => setCurrentPage('tts')}
              className="group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-emerald-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Mic size={26} />
                </div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Phòng Thu Giọng Đọc AI (TTS)
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Soạn thảo kịch bản Live Syntax, chèn hơn 55+ thẻ mã cảm xúc tức thì, tinh chỉnh tempo, cao độ và xuất audio Master 48kHz.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                <span>Mở TTS Studio</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Drama Downloader */}
            <div
              onClick={() => setCurrentPage('downloader')}
              className="group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-purple-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <DownloadCloud size={26} />
                </div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                  Tải Phim Drama Series
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Tự động nhận diện phim từ Soda Reels, MinuteDrama qua ADB, auto-swipe lướt từng tập và trích xuất link CDN siêu tốc.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
                <span>Mở công cụ tải phim</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Render React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
