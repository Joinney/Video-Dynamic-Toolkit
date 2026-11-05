import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Headphones,
  Sliders,
  Play,
  Pause,
  Download,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  ShieldCheck,
  Film,
  FileText
} from 'lucide-react';
import Header from '../components/Header';
import { getVoiceAvatarUrl } from '../utils/voiceAvatar';

export default function LongTiengVideo({ onBackHome, initialVideo, backendData }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(initialVideo ? `/video/${encodeURIComponent(initialVideo.relPath)}` : null);
  const [serverVideoPath, setServerVideoPath] = useState(initialVideo ? initialVideo.relPath : '');
  const [selectedVoice, setSelectedVoice] = useState('vieneu:Adam Tốp Tốp');
  const [selectedVoiceLabel, setSelectedVoiceLabel] = useState('Adam Tốp Tốp (VieNeu - Nam Miền Nam)');
  const [voicesCatalog, setVoicesCatalog] = useState([]);
  const [localDramas, setLocalDramas] = useState(backendData?.localDramas || []);
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('vi');
  const [videoAspect, setVideoAspect] = useState('9 / 16');

  // 4 Tabs Tùy Chỉnh Overlay từ StudioVDT
  const [activeOverlayTab, setActiveOverlayTab] = useState('logo'); // 'logo' | 'sub' | 'wm' | 'outro'

  // Tab 1: Logo
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [logoSize, setLogoSize] = useState(18);
  const [logoX, setLogoX] = useState(80);
  const [logoY, setLogoY] = useState(5);
  const [logoOpacity, setLogoOpacity] = useState(90);
  const [logoRotation, setLogoRotation] = useState(0);
  const [customLogoPreviewUrl, setCustomLogoPreviewUrl] = useState('/assets/gocphimcuon1.png');
  const [serverLogoPath, setServerLogoPath] = useState('assets/gocphimcuon1.png');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Tab 2: Phụ đề
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [subStyle, setSubStyle] = useState('white_outline'); // 'white_outline' | 'glassmorphism' | 'yellow_outline' | 'black_box'
  const [subFontSize, setSubFontSize] = useState(28);
  const [subBottomPct, setSubBottomPct] = useState(7);
  const [previewSubText, setPreviewSubText] = useState('Studio VDT — Lồng tiếng phim AI đỉnh cao');
  const [previewSegments, setPreviewSegments] = useState([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [isTranscribingSubtitles, setIsTranscribingSubtitles] = useState(false);

  // Dịch trước từ Video bằng Whisper AI
  const handleQuickTranscribe = async () => {
    const targetVideo = serverVideoPath || videoUrl || (videoFile ? videoFile.name : '');
    if (!targetVideo) {
      alert('Vui lòng chọn hoặc tải lên tệp Video trước khi dịch phụ đề!');
      return;
    }
    setIsTranscribingSubtitles(true);

    try {
      const res = await fetch('/api/quick-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: targetVideo,
          sourceLang: sourceLang,
          targetLang: targetLang,
          whisperModel: 'base'
        })
      });
      const data = await res.json();
      if (data.success && data.segments && data.segments.length > 0) {
        setPreviewSegments(data.segments);
        setActiveSegmentIndex(0);
        if (data.segments[0].text) {
          setPreviewSubText(data.segments[0].text);
        }
      } else {
        alert(data.message || 'Không tìm thấy câu thoại nào trong video!');
      }
    } catch (err) {
      alert('Lỗi nhận diện và dịch phụ đề: ' + err.message);
    } finally {
      setIsTranscribingSubtitles(false);
    }
  };

  // Tab 3: Chữ mờ bảo vệ bản quyền (Floating Watermark)
  const [enableFloatWm, setEnableFloatWm] = useState(true);
  const [floatWmText, setFloatWmText] = useState('@gocphimcuon');
  const [floatWmSize, setFloatWmSize] = useState(18);
  const [floatWmOpacity, setFloatWmOpacity] = useState(30);

  // Tab 4: Outro kết thúc
  const [enableOutro, setEnableOutro] = useState(true);
  const [customOutroPreviewUrl, setCustomOutroPreviewUrl] = useState('/assets/endgpc.mp4');
  const [serverOutroPath, setServerOutroPath] = useState('assets/endgpc.mp4');
  const [isUploadingOutro, setIsUploadingOutro] = useState(false);

  // Tải tệp Logo từ máy tính lên Server
  const handleLogoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Xem trước nhanh client-side
    const localUrl = URL.createObjectURL(file);
    setCustomLogoPreviewUrl(localUrl);

    // Upload lên Server backend
    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData: reader.result
          })
        });
        const data = await res.json();
        if (data.success && data.filePath) {
          setServerLogoPath(data.filePath);
        }
      } catch (err) {
        console.warn('Lỗi upload logo:', err);
      } finally {
        setIsUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Tải tệp Outro từ máy tính lên Server
  const handleOutroFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setCustomOutroPreviewUrl(localUrl);

    setIsUploadingOutro(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData: reader.result
          })
        });
        const data = await res.json();
        if (data.success && data.filePath) {
          setServerOutroPath(data.filePath);
        }
      } catch (err) {
        console.warn('Lỗi upload outro:', err);
      } finally {
        setIsUploadingOutro(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Trạng thái xử lý
  const [isDubbingProcessing, setIsDubbingProcessing] = useState(false);
  const [dubbingCompleted, setDubbingCompleted] = useState(false);
  const [dubJobId, setDubJobId] = useState(null);
  const [dubProgress, setDubProgress] = useState(null);
  const [resultVideoUrl, setResultVideoUrl] = useState(null);
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState(false);
  const previewAudioRef = useRef(null);

  const toggleVoicePreview = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingVoicePreview) {
      previewAudioRef.current.pause();
      setIsPlayingVoicePreview(false);
    } else {
      previewAudioRef.current.src = `/api/voice-preview?voice=${encodeURIComponent(selectedVoice)}&t=${Date.now()}`;
      previewAudioRef.current.play()
        .then(() => setIsPlayingVoicePreview(true))
        .catch((e) => {
          console.warn('Audio preview play error:', e);
          setIsPlayingVoicePreview(false);
        });
    }
  };

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
    if (isPlayingVoicePreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingVoicePreview(false);
    }
  }, [selectedVoice]);

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
          burnSubtitles: burnSubtitles,
          subStyle: subStyle,
          subFontSize: subFontSize,
          enableLogo: watermarkEnabled,
          logoPath: serverLogoPath,
          logoXPct: logoX,
          logoYPct: logoY,
          logoScale: logoSize,
          logoOpacity: logoOpacity,
          logoRotation: logoRotation,
          enableFloatingWatermark: enableFloatWm,
          floatingWatermarkText: floatWmText,
          floatingWatermarkOpacity: floatWmOpacity,
          enableOutro: enableOutro,
          outroPath: serverOutroPath,
          bgmVolume: 0.15
        })
      });
      const data = await res.json();
      if (data.success && data.job) {
        setDubJobId(data.job.id);
        setDubProgress({ status: 'starting', pct: 5, message: 'Đang chuẩn bị luồng StudioVDT Pipeline...' });
      } else {
        alert('Lỗi khởi động: ' + (data.message || 'Không thành công'));
        setIsDubbingProcessing(false);
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ: ' + e.message);
      setIsDubbingProcessing(false);
    }
  };

  // Nút định vị nhanh logo 4 góc
  const setLogoCorner = (x, y) => {
    setLogoX(x);
    setLogoY(y);
  };

  return (
    <div
      className="min-h-screen text-[#1e293b] flex flex-col font-sans select-none relative pb-10"
      style={{
        backgroundColor: '#f6f9fc',
        backgroundImage:
          'linear-gradient(to right, rgba(0, 114, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 114, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div className="pt-2.5 px-4 max-w-[1740px] w-full mx-auto">
        <Header
          title="Studio VDT"
          badge="AI VIDEO DUBBING PRO"
          showBackButton={true}
          onBackHome={onBackHome}
          backendData={backendData}
        />
      </div>

      {/* Main Grid: 3 Cột Studio Chuẩn */}
      <main className="p-3.5 max-w-[1740px] w-full mx-auto grid grid-cols-12 gap-3.5 items-start mt-1">
        {/* CỘT 1: THIẾT LẬP GIỌNG ĐỌC, KHO PHIM & 4 TABS OVERLAY */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          {/* Card Giọng Đọc AI */}
          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs">
            <div className="flex items-center justify-between bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700">
              <div className="flex items-center gap-2 truncate w-full">
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
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="mt-2.5 bg-gradient-to-br from-slate-50 to-orange-50/20 rounded-xl p-3 border border-orange-100 flex gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-xs bg-slate-200">
                <img
                  src={getVoiceAvatarUrl(selectedVoiceLabel, selectedVoice)}
                  alt={selectedVoiceLabel}
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
                  <audio
                    ref={previewAudioRef}
                    onEnded={() => setIsPlayingVoicePreview(false)}
                    onError={() => setIsPlayingVoicePreview(false)}
                  />
                  <button
                    type="button"
                    onClick={toggleVoicePreview}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition shadow-xs cursor-pointer ${
                      isPlayingVoicePreview
                        ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                        : 'bg-white hover:bg-sky-50 text-sky-700 border-sky-300'
                    }`}
                  >
                    <Headphones size={12} className={isPlayingVoicePreview ? 'text-white' : 'text-sky-600'} />
                    <span>{isPlayingVoicePreview ? 'Đang phát...' : 'Nghe thử mẫu'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Ngôn ngữ gốc & đích */}
          <div className="grid grid-cols-2 gap-2 bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs">
            <div>
              <label className="text-[11px] text-gray-600 font-semibold block mb-1">Ngôn ngữ gốc của video:</label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs font-medium text-gray-700 cursor-pointer"
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
                className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs font-medium text-gray-700 cursor-pointer"
              >
                <option value="vi">🇻🇳 Tiếng Việt (Vietnamese)</option>
                <option value="en">🇺🇸 Tiếng Anh (English)</option>
              </select>
            </div>
          </div>

          {/* Chọn Video từ kho phim máy tính hoặc upload */}
          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span>🎬</span> Chọn Video Cần Lồng Tiếng:</span>
              {serverVideoPath && (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Kho phim máy
                </span>
              )}
            </label>

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

            <div className="text-center text-[10px] text-gray-400 font-semibold">— HOẶC TẢI LÊN FILE TỪ MÁY TÍNH —</div>

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
                {videoFile ? `Đã chọn: ${videoFile.name}` : (serverVideoPath ? `Đang dùng: ${serverVideoPath}` : 'Hỗ trợ MP4, MKV, MOV')}
              </span>
            </label>
          </div>

          {/* 4 TABS ĐIỀU KHIỂN CHUẨN TỪ STUDIOVDT: LOGO, PHỤ ĐỀ, CHỮ MỜ, OUTRO */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden">
            <div className="flex border-b border-gray-200 bg-slate-50 text-[11px] font-bold">
              {[
                { id: 'logo', label: '🏷️ Logo' },
                { id: 'sub', label: '📝 Phụ đề' },
                { id: 'wm', label: '🛡️ Chữ mờ' },
                { id: 'outro', label: '🎬 Outro' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveOverlayTab(tab.id)}
                  className={`flex-1 py-2 text-center transition cursor-pointer ${
                    activeOverlayTab === tab.id
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600 font-extrabold shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-3 space-y-2.5">
              {/* TAB 1: LOGO */}
              {activeOverlayTab === 'logo' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span>Kích hoạt chèn Logo vào video:</span>
                    <input
                      type="checkbox"
                      checked={watermarkEnabled}
                      onChange={(e) => setWatermarkEnabled(e.target.checked)}
                      className="accent-blue-600 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {watermarkEnabled && (
                    <>
                      {/* KHỐI TẢI LOGO TỪ MÁY TÍNH */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700">Tệp Logo thương hiệu:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomLogoPreviewUrl('/assets/gocphimcuon1.png');
                              setServerLogoPath('assets/gocphimcuon1.png');
                            }}
                            className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                          >
                            Dùng mặc định Góc Phim Cuốn
                          </button>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-14 h-14 rounded-lg border border-slate-300 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                            <img
                              src={customLogoPreviewUrl}
                              alt="Logo Preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-lg p-2 bg-sky-50/50 hover:bg-sky-50 cursor-pointer transition">
                            <Upload size={15} className="text-sky-600 mb-0.5" />
                            <span className="text-[11px] font-bold text-sky-700">
                              {isUploadingLogo ? 'Đang tải lên...' : 'Chọn tệp Logo từ máy tính'}
                            </span>
                            <span className="text-[9px] text-slate-500">Hỗ trợ PNG trong suốt, JPG, WebP</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleLogoFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="text-[11px] font-bold text-orange-600">Định vị nhanh 4 góc Logo:</div>
                      <div className="grid grid-cols-5 gap-1">
                        <button type="button" onClick={() => setLogoCorner(4, 4)} className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded border border-slate-300">↖ Trên Trái</button>
                        <button type="button" onClick={() => setLogoCorner(78, 4)} className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded border border-slate-300">↗ Trên Phải</button>
                        <button type="button" onClick={() => setLogoCorner(4, 78)} className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded border border-slate-300">↙ Dưới Trái</button>
                        <button type="button" onClick={() => setLogoCorner(78, 78)} className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded border border-slate-300">↘ Dưới Phải</button>
                        <button type="button" onClick={() => setLogoCorner(41, 41)} className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded border border-slate-300">⏺ Giữa</button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-gray-600 font-semibold">Kích thước logo: {logoSize}%</label>
                          <input type="range" min="6" max="45" value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                        <div>
                          <label className="text-gray-600 font-semibold">Độ rõ nét: {logoOpacity}%</label>
                          <input type="range" min="20" max="100" value={logoOpacity} onChange={(e) => setLogoOpacity(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                        <div>
                          <label className="text-gray-600 font-semibold">Tọa độ ngang X: {logoX}%</label>
                          <input type="range" min="0" max="95" value={logoX} onChange={(e) => setLogoX(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                        <div>
                          <label className="text-gray-600 font-semibold">Tọa độ dọc Y: {logoY}%</label>
                          <input type="range" min="0" max="95" value={logoY} onChange={(e) => setLogoY(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[11px] text-gray-600 font-semibold">
                          <span>Góc xoay: {logoRotation}°</span>
                          <div className="flex gap-1">
                            {[0, 90, 180, 270].map(deg => (
                              <button key={deg} type="button" onClick={() => setLogoRotation(deg)} className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-[9px] font-bold rounded border border-slate-300">{deg}°</button>
                            ))}
                          </div>
                        </div>
                        <input type="range" min="0" max="360" value={logoRotation} onChange={(e) => setLogoRotation(Number(e.target.value))} className="w-full accent-blue-600 mt-1" />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: PHỤ ĐỀ */}
              {activeOverlayTab === 'sub' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span>Khắc cứng phụ đề tiếng Việt (Hardsub):</span>
                    <input
                      type="checkbox"
                      checked={burnSubtitles}
                      onChange={(e) => setBurnSubtitles(e.target.checked)}
                      className="accent-blue-600 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {burnSubtitles && (
                    <>
                      {/* KHỐI DỊCH TRƯỚC TỪ VIDEO (WHISPER AI) */}
                      {previewSegments && previewSegments.length > 0 ? (
                        <div className="p-2.5 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-sky-900">
                              📝 Danh sách phụ đề đã dịch ({previewSegments.length} câu):
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewSegments([]);
                                setPreviewSubText('Studio VDT — Lồng tiếng phim AI đỉnh cao');
                              }}
                              className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                            >
                              🔄 Nhận diện lại
                            </button>
                          </div>

                          {/* Chọn câu thoại để sửa */}
                          <select
                            value={activeSegmentIndex}
                            onChange={(e) => {
                              const idx = Number(e.target.value);
                              setActiveSegmentIndex(idx);
                              if (previewSegments[idx]?.text) {
                                setPreviewSubText(previewSegments[idx].text);
                              }
                            }}
                            className="w-full bg-white border border-sky-300 rounded-lg p-1.5 text-xs font-semibold text-slate-800 cursor-pointer"
                          >
                            {previewSegments.map((s, idx) => (
                              <option key={s.id || idx} value={idx}>
                                Câu {idx + 1}: [{s.start}s - {s.end}s] {s.text.substring(0, 35)}...
                              </option>
                            ))}
                          </select>

                          {/* Nội dung câu phụ đề được chọn */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                              <span className="font-bold text-slate-700">Chỉnh sửa phụ đề câu {activeSegmentIndex + 1}:</span>
                              <span>
                                ⏱️ {previewSegments[activeSegmentIndex]?.start}s → {previewSegments[activeSegmentIndex]?.end}s
                              </span>
                            </div>
                            <input
                              type="text"
                              value={previewSegments[activeSegmentIndex]?.text || ''}
                              onChange={(e) => {
                                const newText = e.target.value;
                                const updated = [...previewSegments];
                                updated[activeSegmentIndex] = {
                                  ...updated[activeSegmentIndex],
                                  text: newText
                                };
                                setPreviewSegments(updated);
                                setPreviewSubText(newText);
                              }}
                              className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 shadow-2xs"
                            />
                            {previewSegments[activeSegmentIndex]?.original_text && (
                              <div className="text-[10px] text-slate-500 italic mt-0.5 truncate">
                                Gốc: {previewSegments[activeSegmentIndex].original_text}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <p className="text-[11px] text-slate-600">
                            ℹ️ Chưa có phụ đề được nhận diện. Bấm nút dưới để Whisper AI trích xuất và dịch trước phụ đề:
                          </p>
                          <button
                            type="button"
                            onClick={handleQuickTranscribe}
                            disabled={isTranscribingSubtitles || (!videoUrl && !serverVideoPath)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer ${
                              isTranscribingSubtitles
                                ? 'bg-sky-100 text-sky-700 border border-sky-300 cursor-wait'
                                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white'
                            }`}
                          >
                            {isTranscribingSubtitles ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Đang nhận diện giọng nói & dịch phụ đề tự động...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={13} />
                                <span>⚡ Dịch trước từ Video (Whisper AI)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">Kiểu dáng phụ đề:</label>
                        <select
                          value={subStyle}
                          onChange={(e) => setSubStyle(e.target.value)}
                          className="w-full bg-slate-50 border border-gray-200 rounded-lg p-1.5 text-xs font-semibold text-gray-800 cursor-pointer"
                        >
                          <option value="white_outline">Viền trắng điện ảnh (Cinema White Outline)</option>
                          <option value="glassmorphism">Nền kính mờ trong suốt (Glassmorphism)</option>
                          <option value="yellow_outline">Nổi bật (Yellow Text Outline)</option>
                          <option value="black_box">Nền hộp đen (Cinema Black Box)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-gray-600 font-semibold">Cỡ chữ: {subFontSize}px</label>
                          <input type="range" min="14" max="90" step="2" value={subFontSize} onChange={(e) => setSubFontSize(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                        <div>
                          <label className="text-gray-600 font-semibold">Khoảng cách đáy Y: {subBottomPct}%</label>
                          <input type="range" min="1" max="85" value={subBottomPct} onChange={(e) => setSubBottomPct(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">Câu mẫu hiển thị trên video:</label>
                        <input
                          type="text"
                          value={previewSubText}
                          onChange={(e) => setPreviewSubText(e.target.value)}
                          className="w-full bg-slate-50 border border-gray-200 rounded-lg px-2 py-1 text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: CHỮ MỜ BẢO VỆ BẢN QUYỀN */}
              {activeOverlayTab === 'wm' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span>Kích hoạt Chữ mờ chạy bảo vệ bản quyền:</span>
                    <input
                      type="checkbox"
                      checked={enableFloatWm}
                      onChange={(e) => setEnableFloatWm(e.target.checked)}
                      className="accent-blue-600 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {enableFloatWm && (
                    <>
                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">Nội dung chữ mờ (Kênh/Hotline):</label>
                        <input
                          type="text"
                          value={floatWmText}
                          onChange={(e) => setFloatWmText(e.target.value)}
                          placeholder="@gocphimcuon"
                          className="w-full bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-sky-700"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-gray-600 font-semibold">Kích cỡ chữ: {floatWmSize}px</label>
                          <input type="range" min="10" max="45" value={floatWmSize} onChange={(e) => setFloatWmSize(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                        <div>
                          <label className="text-gray-600 font-semibold">Độ mờ tàng hình: {floatWmOpacity}%</label>
                          <input type="range" min="10" max="80" step="5" value={floatWmOpacity} onChange={(e) => setFloatWmOpacity(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-400 italic">
                        Chữ mờ sẽ lướt ngẫu nhiên toàn màn hình video một cách êm ái, chống cắt ghép lại video 100%.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* TAB 4: OUTRO KẾT THÚC */}
              {activeOverlayTab === 'outro' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span>Kích hoạt Video Outro kết thúc:</span>
                    <input
                      type="checkbox"
                      checked={enableOutro}
                      onChange={(e) => setEnableOutro(e.target.checked)}
                      className="accent-blue-600 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {enableOutro && (
                    <div className="space-y-2.5">
                      {/* KHỐI TẢI OUTRO TÙY CHỌN */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700">Tệp Video Outro kết thúc:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomOutroPreviewUrl('/assets/endgpc.mp4');
                              setServerOutroPath('assets/endgpc.mp4');
                            }}
                            className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                          >
                            Dùng mặc định Góc Phim Cuốn
                          </button>
                        </div>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-lg p-2.5 bg-sky-50/50 hover:bg-sky-50 cursor-pointer transition">
                          <Upload size={16} className="text-sky-600 mb-0.5" />
                          <span className="text-[11px] font-bold text-sky-700">
                            {isUploadingOutro ? 'Đang tải lên...' : 'Chọn video Outro từ máy tính (.mp4, .mov)'}
                          </span>
                          <span className="text-[9px] text-slate-500">Tự động nối vào cuối phim sau khi kết thúc thoại</span>
                          <input
                            type="file"
                            accept="video/mp4,video/quicktime,video/webm"
                            onChange={handleOutroFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Trình xem trước Video Outro */}
                      {customOutroPreviewUrl && (
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold">
                            <span>🎬 Xem trước Video Outro:</span>
                            <span className="text-[9px] text-sky-400 font-mono truncate max-w-[150px]">
                              {serverOutroPath}
                            </span>
                          </div>
                          <div className="max-w-[240px] aspect-[9/16] max-h-[170px] rounded-lg overflow-hidden border border-slate-700 bg-black mx-auto">
                            <video
                              src={customOutroPreviewUrl}
                              controls
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CỘT 2: CANVAS STUDIO & VIDEO PREVIEW */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-gray-200/90 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <span>📺</span> Canvas Xem Trước & Kéo Thả Trực Tiếp
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                1080x1920 (9:16)
              </span>
            </div>

            {/* Video Canvas Container (Ôm khít 100% video không bị thừa 2 bên) */}
            <div className="w-full bg-slate-950/70 rounded-2xl p-2 flex items-center justify-center border border-slate-800 shadow-inner overflow-hidden">
              <div
                className="relative rounded-xl overflow-hidden shadow-2xl bg-black border border-slate-700/80 group flex items-center justify-center select-none"
                style={{
                  aspectRatio: videoAspect,
                  maxHeight: '580px',
                  height: '580px',
                  maxWidth: '100%'
                }}
              >
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    onLoadedMetadata={(e) => {
                      const v = e.target;
                      if (v.videoWidth && v.videoHeight) {
                        setVideoAspect(`${v.videoWidth} / ${v.videoHeight}`);
                      }
                    }}
                    className="w-full h-full object-cover block"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center w-full h-full">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <Play size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-400">Chưa chọn video</span>
                    <p className="text-[11px] text-slate-600 max-w-xs">
                      Vui lòng chọn video từ danh sách kho phim bên trái hoặc tải file lên để xem trước trên Canvas.
                    </p>
                  </div>
                )}

                {/* Logo Overlay trên mặt video */}
                {watermarkEnabled && videoUrl && (
                  <div
                    style={{
                      position: 'absolute',
                      top: `${logoY}%`,
                      left: `${logoX}%`,
                      width: `${logoSize}%`,
                      opacity: logoOpacity / 100,
                      transform: `rotate(${logoRotation}deg)`
                    }}
                    className="cursor-move select-none p-0.5 border border-dashed border-sky-400 rounded group-hover:border-white transition-opacity"
                    title="Kéo thả hoặc dùng thanh trượt để chỉnh vị trí logo"
                  >
                    <img
                      src={customLogoPreviewUrl}
                      alt="Logo"
                      className="w-full h-auto object-contain pointer-events-none drop-shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Phụ đề mẫu trên mặt video theo Style được chọn */}
                {burnSubtitles && videoUrl && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: `${subBottomPct}%`,
                      left: '5%',
                      right: '5%',
                      fontSize: `${subFontSize * 0.55}px`
                    }}
                    className="text-center font-bold pointer-events-none select-none transition-all"
                  >
                    {subStyle === 'glassmorphism' && (
                      <span className="bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-lg border border-white/20 shadow-md">
                        {previewSubText}
                      </span>
                    )}
                    {subStyle === 'yellow_outline' && (
                      <span className="text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] stroke-black" style={{ WebkitTextStroke: '1px black' }}>
                        {previewSubText}
                      </span>
                    )}
                    {subStyle === 'black_box' && (
                      <span className="bg-black text-white px-3 py-1 rounded">
                        {previewSubText}
                      </span>
                    )}
                    {subStyle === 'white_outline' && (
                      <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" style={{ WebkitTextStroke: '1px black' }}>
                        {previewSubText}
                      </span>
                    )}
                  </div>
                )}

                {/* Chữ mờ bảo vệ bản quyền trên mặt video */}
                {enableFloatWm && videoUrl && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '45%',
                      left: '30%',
                      fontSize: `${floatWmSize}px`,
                      opacity: floatWmOpacity / 100,
                      transform: 'rotate(-20deg)'
                    }}
                    className="text-white font-black pointer-events-none select-none drop-shadow"
                  >
                    {floatWmText}
                  </div>
                )}
              </div>
            </div>

            {/* Nút Khởi Chạy Lồng Tiếng AI */}
            <button
              type="button"
              onClick={handleStartDubbing}
              disabled={isDubbingProcessing || (!videoUrl && !serverVideoPath)}
              className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${
                isDubbingProcessing
                  ? 'bg-slate-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white active:scale-[0.99]'
              }`}
            >
              {isDubbingProcessing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" /> ĐANG XỬ LÝ LỒNG TIẾNG AI...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> BẮT ĐẦU LỒNG TIẾNG VIDEO AI TỰ ĐỘNG
                </>
              )}
            </button>
          </div>
        </div>

        {/* CỘT 3: TIẾN TRÌNH REALTIME & THÀNH PHẨM */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-gray-200/90 shadow-xs flex flex-col gap-3">
            <h3 className="text-xs font-black text-gray-900 uppercase">
              📊 Trạng Thái Luồng Lồng Tiếng
            </h3>

            {isDubbingProcessing && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                  <span className="truncate pr-2">{dubProgress?.step || dubProgress?.message || 'Đang lồng tiếng...'}</span>
                  <span>{dubProgress?.percent || dubProgress?.pct || 15}%</span>
                </div>
                <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${dubProgress?.percent || dubProgress?.pct || 15}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Video thành phẩm sau khi hoàn tất */}
            {dubbingCompleted && resultVideoUrl ? (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <span>✓</span> Lồng tiếng hoàn tất 100%!
                </div>
                <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden border border-emerald-200">
                  <video src={resultVideoUrl} controls autoPlay className="w-full h-full object-contain" />
                </div>
                <a
                  href={resultVideoUrl}
                  download
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Download size={14} /> TẢI VIDEO THÀNH PHẨM (.MP4)
                </a>
              </div>
            ) : (
              !isDubbingProcessing && (
                <div className="p-6 text-center text-xs text-gray-400 bg-slate-50 border border-dashed border-gray-200 rounded-xl">
                  Video thành phẩm sau khi hoàn tất sẽ hiển thị tại đây để bạn xem lại và tải về máy.
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
