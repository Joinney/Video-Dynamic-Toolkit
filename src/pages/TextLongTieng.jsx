import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2,
  FileText,
  Play,
  Pause,
  Download,
  RefreshCw,
  Copy,
  Check,
  Headphones,
  Sliders,
  Volume2,
  Sparkles,
  Info,
  X
} from 'lucide-react';
import Header from '../components/Header';
import { getVoiceAvatarUrl } from '../utils/voiceAvatar';

// Bảng 55+ Mã Lệnh Cảm Xúc Chuẩn từ Studio VDT
const EMOTION_TABLE_DATA = [
  ['[crying]', 'hu hu', '[sneezes]', 'ách xì'],
  ['[coughs]', 'khụ khụ', '[hesitant]', 'ừm...'],
  ['[lip smacks]', 'chẹp chẹp', '[chuckles]', 'he he he'],
  ['[annoyed]', 'chậc', '[shouting]', 'gôôôôô'],
  ['[screaming]', 'áaaaa', '[sighs]', 'haizzz'],
  ['[yelling]', 'Êeeee', '[surprised]', 'á há'],
  ['[affirmative]', 'ừ hứ', '[awkward laugh]', 'hơ hơ hơ'],
  ['[realization]', 'ôooo', '[laughing]', 'hahaha'],
  ['[giggles]', 'hí hí hí', '[yawns]', 'ngáppp'],
  ['[thinking]', 'hmmm', '[whispering]', 'psst...'],
  ['[gasps]', 'hự', '[shocked]', 'trời ơi!'],
  ['[excited]', 'wowww', '[amazed]', 'ôi wow'],
  ['[relieved]', 'phùuu', '[frustrated]', 'trời đất ơi'],
  ['[confused]', 'hả?', '[doubtful]', 'thật không vậy?'],
  ['[agreeing]', 'đúng rồi', '[disagreeing]', 'không đâu'],
  ['[cheering]', 'yeahhhh', '[applause]', 'bốp bốp bốp'],
  ['[groans]', 'ôi trời ơi...', '[nervous laugh]', 'hơ hơ...'],
  ['[embarrassed]', 'ôi ngại quá', '[disappointed]', 'ôi thôi rồi'],
  ['[angry]', 'tức quá!', '[worried]', 'chết rồi'],
  ['[curious]', 'ủa?', '[teasing]', 'ê nhaaa'],
  ['[sarcastic]', 'ghê chưa', '[proud]', 'tuyệt vời'],
  ['[happy]', 'vui quá', '[sad]', 'buồn ghê'],
  ['[celebrating]', 'yooooo', '[apologetic]', 'anh xin lỗi nhé'],
  ['[pleading]', 'làm ơn đi', '[determined]', 'nhất định rồi'],
  ['[confident]', 'chắc chắn luôn', '[excited gasp]', 'ôiiii không'],
  ['[grunts]', 'hự! Cố lên', '[clears throat]', 'hèm hèm'],
  ['[snickers]', 'khì khì', '[smug]', 'biết ngay mà'],
  ['[panicked]', 'chết chết chết!', '', '']
];

// Danh sách thẻ gợi ý theo nhóm
const EMOTION_CATEGORIES = [
  {
    name: 'Kịch bản cảm xúc',
    tags: ['[cười]', '[gào]', '[đỉnh kout]', '[hét lớn]', '[đau đớn]', '[excited]', '[laughing]']
  },
  {
    name: 'Tổn thương & xúc động',
    tags: ['[khóc]', '[uất ức]', '[hối hận]', '[nghẹn ngào]', '[thì thầm]', '[crying]', '[sighs]']
  },
  {
    name: 'Xem trực diện (nghe sướng)',
    tags: ['[hả?]', '[thở dốc]', '[thở dài]', '[tặc lưỡi]', '[nấc]', '[shocked]', '[lip smacks]']
  },
  {
    name: 'Tăng nhịp ngắt nhanh',
    tags: ['[nghỉ 0.3s]', '[nghỉ 0.5s]', '[nghỉ 1s]', '[nghỉ 2s]', '[clears throat]']
  }
];

// Kịch bản mẫu
const SAMPLE_SCRIPTS = {
  review: `Chào cả nhà đã quay trở lại với kênh Góc Phim Cuốn! [lip smacks] Hôm nay mình sẽ tóm tắt cho anh em một siêu phẩm điện ảnh đỉnh của chóp! [nghỉ 0.5s] Cái kết khiến ai xem xong cũng phải [screaming] thốt lên kinh ngạc vì quá bất ngờ! [đỉnh kout] Cùng xem hết video nhé! [chuckles]`,
  story: `Đêm hôm đó trời mưa tầm tã. [thì thầm] Tiếng bước chân ngoài hành lang mỗi lúc một gần hơn... [nghỉ 1s] Hắn mở hé cửa và bàng hoàng phát hiện: [shocked] Không có một bóng người nào cả! [sighs]`,
  podcast: `Cuộc sống này đôi khi không diễn ra như những gì chúng ta mong đợi. [sighs] Nhưng có một điều chắc chắn rằng, mỗi vấp ngã đều là một bài học đắt giá. [nghỉ 0.5s] Hãy mỉm cười và bước tiếp! [happy]`,
  news: `Bản tin công nghệ hôm nay: Trí tuệ nhân tạo thế hệ mới vừa được ra mắt với khả năng lồng tiếng chân thực đến kinh ngạc! [excited] Tốc độ xử lý nhanh hơn 300% và biểu cảm vô cùng sống động.`
};

const EMOTION_PROMPT_TEMPLATE = `Dưới đây là Bảng mã lệnh cảm xúc (sound FX / acoustic tags) hỗ trợ bởi giọng đọc AI VieNeu-TTS (Studio VDT):

| Mã lệnh (Tiếng Anh) | Âm thanh phát ra | Mã lệnh (Tiếng Anh) | Âm thanh phát ra |
| :--- | :--- | :--- | :--- |
| [crying] | hu hu | [sneezes] | ách xì |
| [coughs] | khụ khụ | [hesitant] | ừm... |
| [lip smacks] | chẹp chẹp | [chuckles] | he he he |
| [annoyed] | chậc | [shouting] | gôôôôô |
| [screaming] | áaaaa | [sighs] | haizzz |
| [yelling] | Êeeee | [surprised] | á há |
| [affirmative] | ừ hứ | [awkward laugh] | hơ hơ hơ |
| [realization] | ôooo | [laughing] | hahaha |
| [giggles] | hí hí hí | [yawns] | ngáppp |
| [thinking] | hmmm | [whispering] | psst... |
| [gasps] | hự | [shocked] | trời ơi! |
| [excited] | wowww | [amazed] | ôi wow |
| [relieved] | phùuu | [frustrated] | trời đất ơi |
| [confused] | hả? | [doubtful] | thật không vậy? |
| [agreeing] | đúng rồi | [disagreeing] | không đâu |
| [cheering] | yeahhhh | [applause] | bốp bốp bốp |
| [groans] | ôi trời ơi... | [nervous laugh] | hơ hơ... |
| [embarrassed] | ôi ngại quá | [disappointed] | ôi thôi rồi |
| [angry] | tức quá! | [worried] | chết rồi |
| [curious] | ủa? | [teasing] | ê nhaaa |
| [sarcastic] | ghê chưa | [proud] | tuyệt vời |
| [happy] | vui quá | [sad] | buồn ghê |
| [celebrating] | yooooo | [apologetic] | anh xin lỗi nhé |
| [pleading] | làm ơn đi | [determined] | nhất định rồi |
| [confident] | chắc chắn luôn | [excited gasp] | ôiiii không |
| [grunts] | hự! Cố lên | [clears throat] | hèm hèm |
| [snickers] | khì khì | [smug] | biết ngay mà |
| [panicked] | chết chết chết! | | |

📌 HƯỚNG DẪN DÀNH CHO BẠN (AI):
Hãy viết kịch bản (review phim / kể chuyện / đời sống / quảng cáo...) thật tự nhiên, lôi cuốn và khéo léo lồng ghép các mã lệnh cảm xúc ở bảng trên (đặt trong dấu ngoặc vuông []) vào các câu thoại thích hợp để khi đưa vào phần mềm Studio VDT, giọng đọc AI sẽ tự động phát ra cảm xúc, tiếng cười, tiếng thở dài, ho, thán phục... chân thực và sống động nhất!`;

export default function TextLongTieng({ onBackHome, backendData }) {
  const [scriptText, setScriptText] = useState(SAMPLE_SCRIPTS.review);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(14.5);
  const [isRendering, setIsRendering] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState('1.0');
  const [speedSlider, setSpeedSlider] = useState(0);
  const [emotionIntensity, setEmotionIntensity] = useState(65);
  const [pitchValue, setPitchValue] = useState(0);
  const [selectedAcousticFx, setSelectedAcousticFx] = useState('Studio Dry');
  const [selectedVoice, setSelectedVoice] = useState('vieneu:Adam Tốp Tốp');
  const [selectedVoiceLabel, setSelectedVoiceLabel] = useState('Adam Tốp Tốp (VieNeu - Nam Miền Nam)');
  const [voicesCatalog, setVoicesCatalog] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showEmotionTableModal, setShowEmotionTableModal] = useState(false);
  const [selectedCaretTag, setSelectedCaretTag] = useState('[lip smacks]');
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState(false);

  const textareaRef = useRef(null);
  const audioRef = useRef(null);
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
  }, []);

  useEffect(() => {
    if (isPlayingVoicePreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingVoicePreview(false);
    }
  }, [selectedVoice]);

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
    const currentVal = textarea.value;
    const newVal = currentVal.substring(0, start) + ` ${tag} ` + currentVal.substring(end);
    setScriptText(newVal);
    setTimeout(() => {
      textarea.focus();
      const nextPos = start + tag.length + 2;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(EMOTION_PROMPT_TEMPLATE);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
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
          rate: `${speedSlider >= 0 ? '+' : ''}${speedSlider}%`
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

  const setQuickVoice = (keyword) => {
    if (!voicesCatalog || voicesCatalog.length === 0) return;
    for (const group of voicesCatalog) {
      for (const item of group.voices) {
        if (item.name.toLowerCase().includes(keyword.toLowerCase())) {
          setSelectedVoice(item.id);
          setSelectedVoiceLabel(item.name);
          return;
        }
      }
    }
  };

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

      {/* 3 Cột TTS Pro (Khớp thiết kế Studio VDT) */}
      <main className="p-3.5 max-w-[1740px] w-full mx-auto grid grid-cols-12 gap-3.5 mt-2">
        {/* =========================================================================
            CỘT 1: CHỌN GIỌNG, SHOWCASE CARD, TEMPO & ACOUSTIC BOOTH FX
            ========================================================================= */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
          {/* Card Giọng Đọc */}
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
                  voicesCatalog.map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.voices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </optgroup>
                  ))
                ) : (
                  <>
                    <option value="vieneu:Adam Tốp Tốp">🔥 Adam Tốp Tốp (VieNeu - Nam Miền Nam)</option>
                    <option value="vieneu:Hải Đăng">🎙️ Hải Đăng (VieNeu - Nam Bắc Thời Sự VTV)</option>
                    <option value="vieneu:Thiện Minh">👻 Thầy Bảy (VieNeu - Chuyện Ma Rùng Rợn)</option>
                    <option value="vieneu:Thùy Dung">✨ Mỹ Linh (VieNeu - Nữ Sài Gòn Podcast)</option>
                  </>
                )}
              </select>
            </div>

            {/* Showcase Card Nhân Vật */}
            <div className="mt-2.5 p-2.5 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-xl border border-blue-100 flex items-center gap-3">
              <div className="w-14 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs shrink-0">
                <img
                  src={getVoiceAvatarUrl(selectedVoiceLabel, selectedVoice)}
                  alt={selectedVoiceLabel}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-sm text-slate-900 truncate">
                    {selectedVoiceLabel.split('(')[0].replace('🔥', '').trim()}
                  </span>
                  <span className="bg-sky-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                    HOT REVIEW
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  VieNeu High-Fidelity 48kHz Acoustic Vocal
                </p>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-blue-100">
                  <span className="text-[10px] text-slate-500 font-semibold">Acoustic 48kHz</span>
                  <audio
                    ref={previewAudioRef}
                    onEnded={() => setIsPlayingVoicePreview(false)}
                    onError={() => setIsPlayingVoicePreview(false)}
                  />
                  <button
                    type="button"
                    onClick={toggleVoicePreview}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition shadow-xs cursor-pointer ${
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

            {/* Hiển thị danh tính nhanh 2x2 */}
            <div className="mt-3">
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                Hiển thị danh tính nhanh:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickVoice('Adam')}
                  className="p-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800">🎙️ Adam Review</div>
                  <div className="text-[10px] text-slate-500">Kịch tính, hề hước</div>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickVoice('Thầy Bảy')}
                  className="p-1.5 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-lg text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800">👻 Thầy Bảy</div>
                  <div className="text-[10px] text-slate-500">Chuyện ma rùng rợn</div>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickVoice('Hải Đăng')}
                  className="p-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800">👤 Tuấn Rần VTV</div>
                  <div className="text-[10px] text-slate-500">Thời sự chuẩn mực</div>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickVoice('Thùy Dung')}
                  className="p-1.5 bg-slate-50 hover:bg-pink-50 border border-slate-200 hover:border-pink-300 rounded-lg text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800">✨ Mỹ Linh</div>
                  <div className="text-[10px] text-slate-500">Podcast Sài Gòn</div>
                </button>
              </div>
            </div>
          </div>

          {/* Tốc độ nói & Sliders Cảm xúc */}
          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-sm flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-bold text-slate-800">
                <span>⚡ Tốc độ nói (Tempo):</span>
                <span className="bg-sky-50 text-sky-600 border border-sky-200 px-2 py-0.5 rounded text-[11px] font-extrabold">
                  {speedSlider === 0 ? '1.00x (Gốc)' : `${(1.0 + speedSlider / 100).toFixed(2)}x (${speedSlider >= 0 ? '+' : ''}${speedSlider}%)`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 mb-2">
                {[
                  { label: '0.8x', val: -20 },
                  { label: '1.0x', val: 0 },
                  { label: '1.15x', val: 15 },
                  { label: '1.3x', val: 30 }
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setSpeedSlider(s.val)}
                    className={`py-1 text-xs font-bold rounded border transition cursor-pointer ${
                      speedSlider === s.val
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={speedSlider}
                onChange={(e) => setSpeedSlider(parseInt(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0.5x Chậm</span>
                <span className="text-sky-600 font-semibold">Chuẩn làm phim (0.95 - 1.15)</span>
                <span>1.5x Nhanh</span>
              </div>
            </div>

            {/* Sliders Cường độ cảm xúc & Cao độ */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>Cảm xúc:</span>
                  <span className="text-sky-600">{emotionIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={emotionIntensity}
                  onChange={(e) => setEmotionIntensity(parseInt(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>Cao độ:</span>
                  <span className="text-sky-600">{pitchValue > 0 ? `+${pitchValue}` : pitchValue}</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={pitchValue}
                  onChange={(e) => setPitchValue(parseInt(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Hiệu ứng buồng thu âm (Acoustic Booth FX) */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Hiệu ứng buồng thu âm (Acoustic Booth):
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {['Studio Dry', 'Room Reverb', 'AI Denoise'].map((fx) => (
                  <button
                    key={fx}
                    type="button"
                    onClick={() => setSelectedAcousticFx(fx)}
                    className={`py-1 text-xs font-bold rounded-lg border transition cursor-pointer text-center ${
                      selectedAcousticFx === fx
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {fx === 'Studio Dry' ? '🎙️ Dry' : fx === 'Room Reverb' ? '🏛️ Reverb' : '🎧 Denoise'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CỘT 2: TRÌNH SOẠN THẢO KỊCH BẢN (LIVE SYNTAX) & PRESETS
            ========================================================================= */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <FileText size={15} className="text-blue-600" /> Kịch Bản Đang Xử Lý (Live Syntax Mode)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={formatTags}
                  className="bg-white hover:bg-slate-100 text-gray-700 border border-gray-300 text-xs font-semibold px-2 py-1 rounded shadow-xs transition cursor-pointer"
                >
                  Format Thẻ
                </button>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 text-xs font-bold px-2.5 py-1 rounded shadow-xs flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedPrompt ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedPrompt ? 'Đã Copy Prompt!' : 'Copy Prompt AI'}</span>
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="p-3.5 flex-1 flex flex-col min-h-[320px]">
              <textarea
                ref={textareaRef}
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Nhập hoặc dán kịch bản lồng tiếng tại đây..."
                className="w-full flex-1 resize-none outline-none font-normal text-sm leading-relaxed text-gray-800 bg-transparent placeholder-slate-400"
              />
            </div>

            {/* Stats Bar */}
            <div className="px-3.5 py-2 bg-slate-50 border-t border-gray-200 text-xs text-gray-600 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span><strong>{wordCount}</strong> từ</span>
                <span>•</span>
                <span><strong>{charCount}</strong> ký tự</span>
                <span>•</span>
                <span>⏱️ Dự kiến: <strong>{estimatedSeconds}s</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  {tagCount} Tags Phát Hiện
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmotionTableModal(true)}
                  className="text-sky-600 hover:text-sky-700 font-bold text-xs underline cursor-pointer"
                >
                  📖 Xem Bảng 55+ Mã
                </button>
              </div>
            </div>
          </div>

          {/* Presets Kịch Bản */}
          <div className="bg-white rounded-xl p-3 border border-gray-200/90 shadow-sm flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 shrink-0">
              💧 Preset Kịch Bản Triệu View:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setScriptText(SAMPLE_SCRIPTS.review)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer"
              >
                🎬 Review Phim
              </button>
              <button
                type="button"
                onClick={() => setScriptText(SAMPLE_SCRIPTS.story)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer"
              >
                👻 Chuyện Ma
              </button>
              <button
                type="button"
                onClick={() => setScriptText(SAMPLE_SCRIPTS.podcast)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer"
              >
                🎙️ Podcast Triết Lý
              </button>
              <button
                type="button"
                onClick={() => setScriptText(SAMPLE_SCRIPTS.news)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer"
              >
                📰 Tin Tức Nhanh
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CỘT 3: BẤM CHÈN THẺ CẢM XÚC TẠI CON TRỎ (55+ ACOUSTIC TAGS)
            ========================================================================= */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-xl p-3.5 border border-gray-200/90 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span> BẤM CHÈN THẺ CẢM XÚC:
            </span>
            <span className="text-[10px] text-slate-400">Chèn tại con trỏ</span>
          </div>

          {/* Quick Category Chips */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[290px] pr-1">
            {EMOTION_CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <div className="text-[10px] font-bold text-slate-500 mb-1">{cat.name}:</div>
                <div className="flex flex-wrap gap-1">
                  {cat.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertTagAtCursor(tag)}
                      className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-700 border border-sky-200 rounded text-[11px] font-bold transition cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Dropdown 55+ Thẻ & Nút Solid Blue Chèn Tại Con Trỏ */}
          <div className="pt-2.5 border-t border-slate-200 flex flex-col gap-2">
            <select
              value={selectedCaretTag}
              onChange={(e) => setSelectedCaretTag(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-lg p-2 text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="[lip smacks]">😋 [lip smacks] - chẹp chẹp (thèm thuồng)</option>
              <option value="[crying]">😭 [crying] - hu hu (xúc động/khóc lóc)</option>
              <option value="[screaming]">😱 [screaming] - áaaaa (thét lớn)</option>
              <option value="[chuckles]">😆 [chuckles] - he he he (cười khúc khích)</option>
              <option value="[laughing]">🤣 [laughing] - hahaha (cười sảng khoái)</option>
              <option value="[sighs]">😮‍💨 [sighs] - haizzz... (thở dài)</option>
              <option value="[shocked]">⚡ [shocked] - trời ơi! (bàng hoàng)</option>
              <option value="[excited]">🤩 [excited] - wowww (phấn khích)</option>
              <option value="[panicked]">🏃 [panicked] - chết chết chết!</option>
              <option value="[whispering]">🤫 [whispering] - psst... (thì thầm)</option>
              <option value="[yawns]">🥱 [yawns] - ngáppp</option>
              <option value="[thinking]">🤔 [thinking] - hmmm... (đăm chiêu)</option>
              <option value="[confused]">🤨 [confused] - hả? (bối rối)</option>
              <option value="[angry]">😡 [angry] - tức quá! (giận dữ)</option>
              <option value="[coughs]">😷 [coughs] - khụ khụ (ho)</option>
              <option value="[sneezes]">🤧 [sneezes] - ách xì! (hắt xì)</option>
              <option value="[clears throat]">🗣️ [clears throat] - hèm hèm (hắng giọng)</option>
              <option value="[applause]">👏 [applause] - bốp bốp bốp (vỗ tay)</option>
              <option value="[cheering]">🎉 [cheering] - yeahhhh (reo hò)</option>
              <option value="[nghỉ 0.3s]">⏱️ [nghỉ 0.3s] - Ngắt 0.3s</option>
              <option value="[nghỉ 0.5s]">⏸️ [nghỉ 0.5s] - Ngắt 0.5s</option>
              <option value="[nghỉ 1s]">⏳ [nghỉ 1s] - Ngắt 1.0s</option>
              <option value="[nghỉ 2s]">🛑 [nghỉ 2s] - Ngắt 2.0s</option>
            </select>

            <button
              type="button"
              onClick={() => insertTagAtCursor(selectedCaretTag)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <span>➕</span> Chèn tại vị trí con trỏ chuột
            </button>
          </div>
        </div>
      </main>

      {/* =========================================================================
          MODAL: BẢNG 55+ MÃ LỆNH CẢM XÚC HOÀN CHỈNH
          ========================================================================= */}
      {showEmotionTableModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-200">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-sky-500" /> Bảng 55+ Mã Lệnh Cảm Xúc VieNeu-TTS
                </h3>
                <p className="text-xs text-slate-500">
                  Bấm vào mã lệnh bất kỳ để chèn trực tiếp vào kịch bản đang soạn thảo.
                </p>
              </div>
              <button
                onClick={() => setShowEmotionTableModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2 border border-slate-200">Mã lệnh</th>
                    <th className="p-2 border border-slate-200">Âm thanh phát ra</th>
                    <th className="p-2 border border-slate-200">Mã lệnh</th>
                    <th className="p-2 border border-slate-200">Âm thanh phát ra</th>
                  </tr>
                </thead>
                <tbody>
                  {EMOTION_TABLE_DATA.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="p-1.5 border border-slate-200">
                        {row[0] && (
                          <button
                            onClick={() => {
                              insertTagAtCursor(row[0]);
                              setShowEmotionTableModal(false);
                            }}
                            className="text-sky-600 hover:text-sky-800 font-bold hover:underline"
                          >
                            {row[0]}
                          </button>
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-slate-600">{row[1]}</td>
                      <td className="p-1.5 border border-slate-200">
                        {row[2] && (
                          <button
                            onClick={() => {
                              insertTagAtCursor(row[2]);
                              setShowEmotionTableModal(false);
                            }}
                            className="text-sky-600 hover:text-sky-800 font-bold hover:underline"
                          >
                            {row[2]}
                          </button>
                        )}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-slate-600">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={handleCopyPrompt}
                className="px-4 py-2 bg-sky-50 text-sky-700 border border-sky-300 font-bold text-xs rounded-xl hover:bg-sky-100 transition flex items-center gap-1.5"
              >
                {copiedPrompt ? <Check size={14} /> : <Copy size={14} />} Copy Prompt AI Kèm Bảng Này
              </button>
              <button
                onClick={() => setShowEmotionTableModal(false)}
                className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-700 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FOOTER AUDIO PLAYER NỔI CHUẨN STUDIO DAW
          ========================================================================= */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl z-40">
        <div className="max-w-[1740px] mx-auto px-4 py-2.5 flex flex-col gap-2">
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
                className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition cursor-pointer"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <div>
                <span className="font-bold text-xs text-gray-900 block truncate max-w-xs">
                  {selectedVoiceLabel.split('(')[0]}_Master_48kHz
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} /{' '}
                  {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
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
                className="bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download size={14} /> TẢI WAV/MP3 MASTER (48kHz)
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleRenderAudio}
            disabled={isRendering}
            className="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-sm font-black py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
          >
            {isRendering ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> ĐANG TỔNG HỢP GIỌNG ĐỌC AI (VIENEU ACOUSTIC)...
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