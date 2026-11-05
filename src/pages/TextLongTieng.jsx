import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2,
  FileText,
  Play,
  Pause,
  Download,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import Header from '../components/Header';

export default function TextLongTieng({ onBackHome, backendData }) {
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
        <Header
          title="Studio VDT"
          badge="TTS PRO STUDIO"
          showBackButton={true}
          onBackHome={onBackHome}
          backendData={backendData}
        />
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
                  <h3 className="font-bold text-sm text-gray-900">{selectedVoiceLabel.split(' (')[0]}</h3>
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
                      type="button"
                      onClick={() => setSelectedSpeed(valKey)}
                      className={`py-1 rounded-md text-xs font-bold border transition cursor-pointer ${
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
          </div>
        </div>

        {/* Cột 2: Soạn thảo Live Syntax */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <FileText size={15} className="text-blue-600" /> Soạn Thảo Kịch Bản (Live Syntax)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={formatTags}
                  className="bg-white hover:bg-slate-100 text-gray-700 border border-gray-300 text-xs font-semibold px-2 py-1 rounded shadow-xs transition cursor-pointer"
                >
                  Format Thẻ
                </button>
                <button
                  type="button"
                  onClick={() => alert('Đang kích hoạt AI viết lại đoạn văn cảm xúc...')}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-bold px-2.5 py-1 rounded shadow-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <Wand2 size={13} /> AI Rewrite
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
                type="button"
                onClick={() => insertTagAtCursor(tag.label)}
                className={`text-left text-[11px] font-bold px-2 py-1.5 rounded-md border shadow-xs transition truncate active:scale-95 cursor-pointer ${tag.color}`}
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
                type="button"
                onClick={togglePlayAudio}
                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition cursor-pointer"
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
                download="TTS_Master_48kHz.mp3"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
              >
                <Download size={14} /> TẢI WAV/MP3 MASTER (48kHz)
              </a>
            ) : (
              <button
                type="button"
                onClick={handleRenderAudio}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download size={14} /> TẢI WAV/MP3 MASTER (48kHz)
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleRenderAudio}
            disabled={isRendering}
            className="w-full bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 hover:from-sky-500 hover:to-blue-700 text-white text-sm font-extrabold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
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
