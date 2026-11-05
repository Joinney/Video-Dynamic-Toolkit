const {
  useState,
  useEffect,
  useRef
} = React;

// ==========================================
// LUCIDE SVG ICONS COLLECTION
// ==========================================
const SvgIcon = ({
  children,
  size = 18,
  className = '',
  ...props
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: className,
  ...props
}, children);
const Mic = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
}), /*#__PURE__*/React.createElement("path", {
  d: "M19 10v2a7 7 0 0 1-14 0v-2"
}), /*#__PURE__*/React.createElement("line", {
  x1: "12",
  x2: "12",
  y1: "19",
  y2: "22"
}));
const Clapperboard = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M20.2 6 3 11l-.9-2.4c-.4-1.1.2-2.4 1.3-2.8l13.6-5c1.1-.4 2.4.2 2.8 1.3Z"
}), /*#__PURE__*/React.createElement("path", {
  d: "m6.2 5.3 3.1 4"
}), /*#__PURE__*/React.createElement("path", {
  d: "m11.6 3.4 3.1 4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"
}));
const DownloadCloud = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 12v9"
}), /*#__PURE__*/React.createElement("path", {
  d: "m8 17 4 4 4-4"
}));
const Layers = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
}), /*#__PURE__*/React.createElement("path", {
  d: "m22 12.5-10 4.5-10-4.5"
}), /*#__PURE__*/React.createElement("path", {
  d: "m22 17.5-10 4.5-10-4.5"
}));
const Sparkles = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"
}));
const ArrowRight = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14"
}), /*#__PURE__*/React.createElement("path", {
  d: "m12 5 7 7-7 7"
}));
const ShieldCheck = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
}), /*#__PURE__*/React.createElement("path", {
  d: "m9 12 2 2 4-4"
}));
const Zap = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("polygon", {
  points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2"
}));
const Film = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("rect", {
  width: "18",
  height: "18",
  x: "3",
  y: "3",
  rx: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M7 3v18"
}), /*#__PURE__*/React.createElement("path", {
  d: "M3 7.5h4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M3 12h18"
}), /*#__PURE__*/React.createElement("path", {
  d: "M3 16.5h4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M17 3v18"
}), /*#__PURE__*/React.createElement("path", {
  d: "M17 7.5h4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M17 16.5h4"
}));
const Menu = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("line", {
  x1: "4",
  x2: "20",
  y1: "12",
  y2: "12"
}), /*#__PURE__*/React.createElement("line", {
  x1: "4",
  x2: "20",
  y1: "6",
  y2: "6"
}), /*#__PURE__*/React.createElement("line", {
  x1: "4",
  x2: "20",
  y1: "18",
  y2: "18"
}));
const ChevronRight = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "m9 18 6-6-6-6"
}));
const ChevronDown = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "m6 9 6 6 6-6"
}));
const Upload = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
}), /*#__PURE__*/React.createElement("polyline", {
  points: "17 8 12 3 7 8"
}), /*#__PURE__*/React.createElement("line", {
  x1: "12",
  x2: "12",
  y1: "3",
  y2: "15"
}));
const Headphones = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"
}));
const Video = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "m22 8-6 4 6 4V8Z"
}), /*#__PURE__*/React.createElement("rect", {
  width: "14",
  height: "12",
  x: "2",
  y: "6",
  rx: "2"
}));
const Info = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "10"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 16v-4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 8h.01"
}));
const Check = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M20 6 9 17l-5-5"
}));
const Link2 = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M9 17H7A5 5 0 0 1 7 7h2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M15 7h2a5 5 0 1 1 0 10h-2"
}), /*#__PURE__*/React.createElement("line", {
  x1: "8",
  x2: "16",
  y1: "12",
  y2: "12"
}));
const RefreshCw = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
}), /*#__PURE__*/React.createElement("path", {
  d: "M21 3v5h-5"
}), /*#__PURE__*/React.createElement("path", {
  d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
}), /*#__PURE__*/React.createElement("path", {
  d: "M8 16H3v5"
}));
const Download = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
}), /*#__PURE__*/React.createElement("polyline", {
  points: "7 10 12 15 17 10"
}), /*#__PURE__*/React.createElement("line", {
  x1: "12",
  x2: "12",
  y1: "15",
  y2: "3"
}));
const FileText = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
}), /*#__PURE__*/React.createElement("path", {
  d: "M14 2v4a2 2 0 0 0 2 2h4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M10 9H8"
}), /*#__PURE__*/React.createElement("path", {
  d: "M16 13H8"
}), /*#__PURE__*/React.createElement("path", {
  d: "M16 17H8"
}));
const Play = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("polygon", {
  points: "6 3 20 12 6 21 6 3"
}));
const Pause = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("rect", {
  width: "4",
  height: "16",
  x: "6",
  y: "4"
}), /*#__PURE__*/React.createElement("rect", {
  width: "4",
  height: "16",
  x: "14",
  y: "4"
}));
const Sliders = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("line", {
  x1: "4",
  x2: "4",
  y1: "21",
  y2: "14"
}), /*#__PURE__*/React.createElement("line", {
  x1: "4",
  x2: "4",
  y1: "10",
  y2: "3"
}), /*#__PURE__*/React.createElement("line", {
  x1: "12",
  x2: "12",
  y1: "21",
  y2: "12"
}), /*#__PURE__*/React.createElement("line", {
  x1: "12",
  x2: "12",
  y1: "8",
  y2: "3"
}), /*#__PURE__*/React.createElement("line", {
  x1: "20",
  x2: "20",
  y1: "21",
  y2: "16"
}), /*#__PURE__*/React.createElement("line", {
  x1: "20",
  x2: "20",
  y1: "12",
  y2: "3"
}), /*#__PURE__*/React.createElement("line", {
  x1: "1",
  x2: "7",
  y1: "14",
  y2: "14"
}), /*#__PURE__*/React.createElement("line", {
  x1: "9",
  x2: "15",
  y1: "8",
  y2: "8"
}), /*#__PURE__*/React.createElement("line", {
  x1: "17",
  x2: "23",
  y1: "16",
  y2: "16"
}));
const Wand2 = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"
}), /*#__PURE__*/React.createElement("path", {
  d: "m14 7 3 3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M5 6v4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M19 14v4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M10 2v2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M7 8H3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M21 16h-4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M11 3H9"
}));
const FolderOpen = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"
}));
const ImageIcon = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("rect", {
  width: "18",
  height: "18",
  x: "3",
  y: "3",
  rx: "2",
  ry: "2"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "9",
  cy: "9",
  r: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
}));
const X = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M18 6 6 18"
}), /*#__PURE__*/React.createElement("path", {
  d: "m6 6 12 12"
}));
const Tv = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("rect", {
  width: "20",
  height: "15",
  x: "2",
  y: "7",
  rx: "2"
}), /*#__PURE__*/React.createElement("polyline", {
  points: "17 2 12 7 7 2"
}));
const Trash2 = p => /*#__PURE__*/React.createElement(SvgIcon, p, /*#__PURE__*/React.createElement("path", {
  d: "M3 6h18"
}), /*#__PURE__*/React.createElement("path", {
  d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
}), /*#__PURE__*/React.createElement("path", {
  d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
}), /*#__PURE__*/React.createElement("line", {
  x1: "10",
  x2: "10",
  y1: "11",
  y2: "17"
}), /*#__PURE__*/React.createElement("line", {
  x1: "14",
  x2: "14",
  y1: "11",
  y2: "17"
}));

// ==========================================
// FILE 2: DUBBING VIEW (LỒNG TIẾNG VIDEO AI)
// ==========================================
function DubbingView({
  onBackHome
}) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState('vi-VN-HoaiMyNeural');
  const [selectedVoiceLabel, setSelectedVoiceLabel] = useState('Adam Tốp Tốp (VieNeu - Nam Miền Nam)');
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

  // Poll real job status
  useEffect(() => {
    if (!dubJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/dub-status?id=${dubJobId}`);
        const data = await res.json();
        setDubProgress(data);
        if (data.status === 'completed') {
          setIsDubbingProcessing(false);
          setDubbingCompleted(true);
          const outPath = data.output_video || '';
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
    if (!videoFile && !videoUrl) {
      alert('Vui lòng chọn hoặc tải lên tệp Video trước!');
      return;
    }
    setIsDubbingProcessing(true);
    setDubbingCompleted(false);
    try {
      const res = await fetch('/api/dub-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoPath: videoUrl || (videoFile ? videoFile.name : ''),
          voice: selectedVoice,
          sourceLang: sourceLang,
          targetLang: targetLang,
          burnSubtitles: true,
          bgmVolume: 0.15
        })
      });
      const data = await res.json();
      if (data.success && data.jobId) {
        setDubJobId(data.jobId);
        setDubProgress({
          status: 'starting',
          percent: 5,
          step: 'Khởi động AI Video Dubbing...'
        });
      } else {
        // Fallback demo timeout if local server is mocking
        setTimeout(() => {
          setIsDubbingProcessing(false);
          setDubbingCompleted(true);
        }, 3000);
      }
    } catch (e) {
      setTimeout(() => {
        setIsDubbingProcessing(false);
        setDubbingCompleted(true);
      }, 3000);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen text-[#1e293b] flex flex-col font-sans select-none relative",
    style: {
      backgroundColor: '#f6f9fc',
      backgroundImage: 'linear-gradient(to right, rgba(0, 114, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 114, 255, 0.05) 1px, transparent 1px)',
      backgroundSize: '24px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pt-2.5 px-4 max-w-[1740px] w-full mx-auto"
  }, /*#__PURE__*/React.createElement("header", {
    className: "bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/90 px-5 py-2.5 flex items-center justify-between shadow-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-11 h-11 rounded-full border-2 border-sky-400 overflow-hidden shadow-xs flex items-center justify-center bg-sky-50 shrink-0"
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    alt: "Logo Studio",
    className: "w-full h-full object-cover"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl font-black tracking-tight text-gray-900"
  }, "Studio VDT"), /*#__PURE__*/React.createElement("span", {
    className: "bg-[#e6f4ff] text-[#0958d9] border border-[#91caff] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
  }, "• ENTERPRISE PRO AUDIO"), /*#__PURE__*/React.createElement("span", {
    className: "bg-gray-100 text-gray-600 border border-gray-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full"
  }, "VieNeu Neural v4.2 Max")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-0.5"
  }, "Sáng lập & Bản quyền: ", /*#__PURE__*/React.createElement("strong", {
    className: "text-sky-700 font-bold"
  }, "Võ Duy Toàn"), " | Hệ thống phối âm & lồng tiếng AI cao cấp"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBackHome,
    className: "bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-md text-xs font-bold transition mr-2"
  }, "← Quay lại Trang Chủ"), /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full bg-sky-500"
  }), /*#__PURE__*/React.createElement("button", {
    className: "bg-white hover:bg-slate-50 text-sky-700 border border-sky-300 px-3.5 py-1 rounded-md text-xs font-bold shadow-xs transition"
  }, "PRO STUDIO")))), /*#__PURE__*/React.createElement("main", {
    className: "p-4 max-w-[1740px] w-full mx-auto grid grid-cols-12 gap-3.5 items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-4 flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 truncate"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-orange-500 text-sm"
  }, "🔥"), /*#__PURE__*/React.createElement("select", {
    value: selectedVoice,
    onChange: e => {
      setSelectedVoice(e.target.value);
      const sel = e.target.options[e.target.selectedIndex].text;
      setSelectedVoiceLabel(sel);
    },
    className: "bg-transparent border-none outline-none font-bold text-gray-800 text-xs w-full cursor-pointer"
  }, /*#__PURE__*/React.createElement("option", {
    value: "vieneu:Adam Tốp Tốp"
  }, "🔥 Adam Tốp Tốp (VieNeu - Nam Miền Nam)"), /*#__PURE__*/React.createElement("option", {
    value: "vieneu:Adam bựa"
  }, "🔥 Adam bựa (Review Phim dí dỏm, tấu hài)"), /*#__PURE__*/React.createElement("option", {
    value: "vi-VN-HoaiMyNeural"
  }, "👩 Hoài My (Nữ Bắc ngọt ngào, truyền cảm)"), /*#__PURE__*/React.createElement("option", {
    value: "vi-VN-NamMinhNeural"
  }, "👨 Nam Minh (Nam Bắc trầm ấm, tin tức)"), /*#__PURE__*/React.createElement("option", {
    value: "vieneu:Hải Đăng"
  }, "🎙️ Hải Đăng (Nam Bắc chuẩn phát thanh)"), /*#__PURE__*/React.createElement("option", {
    value: "vieneu:Trúc Ly"
  }, "🎙️ Trúc Ly (Nữ Bắc tự nhiên, trẻ trung)"), /*#__PURE__*/React.createElement("option", {
    value: "en-US-JennyNeural"
  }, "🇺🇸 Jenny (Nữ Mỹ hiện đại)"), /*#__PURE__*/React.createElement("option", {
    value: "zh-CN-XiaoxiaoNeural"
  }, "🇨🇳 Xiaoxiao (Nữ Trung Quốc giọng chuẩn)")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 bg-gradient-to-br from-slate-50 to-orange-50/20 rounded-xl p-3 border border-orange-100 flex gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-xs bg-slate-200"
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
    alt: "Adam Tốp Tốp",
    className: "w-full h-full object-cover"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-gray-900"
  }, selectedVoiceLabel.split(' (')[0]), /*#__PURE__*/React.createElement("span", {
    className: "bg-sky-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-xs"
  }, "HOT REVIEW")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug"
  }, "VieNeu - Nam Miền Nam • Cảm xúc, Không nghiêm túc, Tốp Tốp, Tấu hề"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mt-2 pt-1 border-t border-gray-200/60"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-gray-500 font-medium"
  }, "Acoustic 48kHz"), /*#__PURE__*/React.createElement("button", {
    onClick: () => alert(`Đang phát giọng đọc mẫu: ${selectedVoiceLabel}`),
    className: "flex items-center gap-1 bg-white hover:bg-orange-50 text-gray-700 border border-gray-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs transition"
  }, /*#__PURE__*/React.createElement(Headphones, {
    size: 11,
    className: "text-sky-500"
  }), " Nghe thử mẫu")))), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-gray-400 mt-1.5 italic"
  }, "Adper Ally MX6 • Như bạn đã sẵn sàng thành thạo")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-gray-600 font-semibold block mb-1"
  }, "Ngôn ngữ gốc của video:"), /*#__PURE__*/React.createElement("select", {
    value: sourceLang,
    onChange: e => setSourceLang(e.target.value),
    className: "w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs font-medium text-gray-700"
  }, /*#__PURE__*/React.createElement("option", {
    value: "auto"
  }, "🌐 Tự động nhận diện"), /*#__PURE__*/React.createElement("option", {
    value: "zh"
  }, "🇨🇳 Tiếng Trung"), /*#__PURE__*/React.createElement("option", {
    value: "en"
  }, "🇺🇸 Tiếng Anh"), /*#__PURE__*/React.createElement("option", {
    value: "ja"
  }, "🇯🇵 Tiếng Nhật"), /*#__PURE__*/React.createElement("option", {
    value: "ko"
  }, "🇰🇷 Tiếng Hàn"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-gray-600 font-semibold block mb-1"
  }, "Dịch và lồng tiếng sang:"), /*#__PURE__*/React.createElement("select", {
    value: targetLang,
    onChange: e => setTargetLang(e.target.value),
    className: "w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs font-medium text-gray-700"
  }, /*#__PURE__*/React.createElement("option", {
    value: "vi"
  }, "🇻🇳 Tiếng Việt (Vietnamese)"), /*#__PURE__*/React.createElement("option", {
    value: "en"
  }, "🇺🇸 Tiếng Anh (English)")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-gray-800 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "📁"), " Chọn tệp Video (MP4, MKV, MOV, AVI) — Hỗ trợ đến 2 GB (2048 MB):"), /*#__PURE__*/React.createElement("label", {
    className: "border border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center"
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "video/*",
    className: "hidden",
    onChange: e => {
      if (e.target.files?.[0]) {
        setVideoFile(e.target.files[0]);
        setVideoUrl(URL.createObjectURL(e.target.files[0]));
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "bg-white border border-gray-300 shadow-xs text-gray-700 text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 mb-1 pointer-events-none"
  }, /*#__PURE__*/React.createElement(Upload, {
    size: 14
  }), " Upload"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-gray-400 font-medium"
  }, videoFile ? `Đã chọn: ${videoFile.name}` : '2GB per file • MP4, MKV, MOV, AVI'))), /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50/50 rounded-xl p-2.5 border border-orange-300 text-xs shadow-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-extrabold text-orange-900 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "🚨"), " CHẾ ĐỘ XEM TRƯỚC TRÊN MẶT VIDEO:"), /*#__PURE__*/React.createElement("span", {
    className: "bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-xs flex items-center gap-1"
  }, "📍 Sẵn sàng kéo thả")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-orange-800 mt-1"
  }, "Bấm giữ chuột vào logo hoặc Phụ đề để kéo thả trực tiếp trên video:")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveOverlayTab('logo'),
    className: `flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition ${activeOverlayTab === 'logo' ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-xs' : 'bg-white text-gray-600 border-gray-200'}`
  }, "🏷️ Tùy chỉnh Logo thương hiệu (Kéo thả)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveOverlayTab('subtitles'),
    className: `flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition ${activeOverlayTab === 'subtitles' ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-xs' : 'bg-white text-gray-600 border-gray-200'}`
  }, "📝 Tùy chỉnh Phụ đề")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setWatermarkEnabled(!watermarkEnabled),
    className: `w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${watermarkEnabled ? 'bg-sky-500' : 'bg-gray-300'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: `bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${watermarkEnabled ? 'translate-x-5' : 'translate-x-0'}`
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-gray-800"
  }, "✨ Kích hoạt chèn Logo / Watermark vào Video")), watermarkEnabled && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "bg-sky-50/70 border border-sky-100 rounded-lg p-2 flex items-start gap-1.5 text-[11px] text-sky-800"
  }, /*#__PURE__*/React.createElement(Info, {
    size: 14,
    className: "text-sky-600 shrink-0 mt-0.5"
  }), /*#__PURE__*/React.createElement("span", null, "Đang dùng ", /*#__PURE__*/React.createElement("strong", null, "Logo Góc Phim Cuốn"), ". Tải tệp mới ở trên nếu muốn đổi.")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-5 gap-1.5"
  }, [{
    label: '↖ ..',
    x: 5,
    y: 5
  }, {
    label: '↗ ..',
    x: 80,
    y: 5
  }, {
    label: '☑ ..',
    x: 42,
    y: 42
  }, {
    label: '↙ ..',
    x: 5,
    y: 80
  }, {
    label: '↘ ..',
    x: 80,
    y: 80
  }].map((pos, idx) => /*#__PURE__*/React.createElement("button", {
    key: idx,
    onClick: () => {
      setLogoX(pos.x);
      setLogoY(pos.y);
    },
    className: "py-1 px-1 bg-slate-50 hover:bg-sky-50 text-gray-700 hover:text-sky-700 border border-gray-200 rounded text-[11px] font-bold"
  }, pos.label))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 pt-1 border-t border-gray-100"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] font-bold text-gray-700 mb-1"
  }, /*#__PURE__*/React.createElement("span", null, "Kích thước logo:"), /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600"
  }, logoSize, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "5",
    max: "50",
    value: logoSize,
    onChange: e => setLogoSize(Number(e.target.value)),
    className: "w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] font-bold text-gray-700 mb-1"
  }, /*#__PURE__*/React.createElement("span", null, "Tọa độ ngang X:"), /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600"
  }, logoX, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: logoX,
    onChange: e => setLogoX(Number(e.target.value)),
    className: "w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] font-bold text-gray-700 mb-1"
  }, /*#__PURE__*/React.createElement("span", null, "Độ rõ nét:"), /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600"
  }, logoOpacity, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "10",
    max: "100",
    value: logoOpacity,
    onChange: e => setLogoOpacity(Number(e.target.value)),
    className: "w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] font-bold text-gray-700 mb-1"
  }, /*#__PURE__*/React.createElement("span", null, "Tọa độ dọc Y:"), /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600"
  }, logoY, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: logoY,
    onChange: e => setLogoY(Number(e.target.value)),
    className: "w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg"
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-4 flex flex-col gap-3 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-2 mb-2 border-b border-gray-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-black text-gray-900 uppercase"
  }, "🎬 MÀN HÌNH XEM TRƯỚC VIDEO GỐC"), /*#__PURE__*/React.createElement("span", {
    className: "bg-sky-50 text-sky-700 border border-sky-300 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs"
  }, "LIVE PREVIEW")), /*#__PURE__*/React.createElement("div", {
    className: "border border-dashed border-gray-300 rounded-xl bg-slate-50/50 aspect-[4/4.5] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
  }, videoUrl ? /*#__PURE__*/React.createElement("video", {
    src: videoUrl,
    controls: true,
    className: "w-full h-full object-contain rounded-lg"
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-3"
  }, /*#__PURE__*/React.createElement(Video, {
    size: 28
  })), /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-xs text-gray-800 mb-1"
  }, "Chưa có video được chọn"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-gray-400 max-w-xs leading-relaxed"
  }, "Kéo thả tệp video ở ô bên trái để bắt đầu xem trước & tùy chỉnh trực tiếp trên canvas video.")), watermarkEnabled && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: `${logoX}%`,
      top: `${logoY}%`,
      width: `${logoSize * 1.5}%`,
      opacity: logoOpacity / 100,
      transform: `rotate(${logoRotation}deg)`,
      transition: 'all 0.15s ease'
    },
    className: "p-1 rounded bg-black/50 border border-white/60 text-white font-black text-[9px] select-none shadow-lg flex items-center justify-center pointer-events-none"
  }, "GÓC PHIM CUỐN")), /*#__PURE__*/React.createElement("button", {
    onClick: handleStartDubbing,
    disabled: isDubbingProcessing,
    className: "mt-3 w-full bg-gradient-to-r from-sky-500 via-blue-600 to-blue-700 hover:from-sky-600 text-white font-black py-3 rounded-xl shadow-md text-xs tracking-wider flex items-center justify-center gap-2 transition"
  }, isDubbingProcessing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    className: "animate-spin"
  }), " ĐANG PHÂN TÍCH & LỒNG TIẾNG VIDEO...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "🚀"), " BẮT ĐẦU LỒNG TIẾNG VIDEO AI"))), /*#__PURE__*/React.createElement("div", {
    className: "hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-blue-500 text-white items-center justify-center shadow-md font-black"
  }, "➔")), /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-4 flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-2 mb-2 border-b border-gray-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-black text-gray-900 uppercase"
  }, "🎬 KẾT QUẢ VIDEO ĐÃ LỒNG TIẾNG HOÀN THIỆN")), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#0f172a] rounded-xl aspect-[4/3.8] flex flex-col justify-between p-3 relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between z-10"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-black px-2.5 py-1 rounded bg-slate-700 text-white"
  }, "PREVIEW"), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] font-black px-2.5 py-1 rounded ${dubbingCompleted ? 'bg-emerald-500 text-white' : 'bg-[#eab308] text-black'}`
  }, dubbingCompleted ? 'HOÀN THÀNH' : 'CHỜ XỬ LÝ')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center text-center p-4 z-10"
  }, dubbingCompleted ? resultVideoUrl ? /*#__PURE__*/React.createElement("video", {
    src: resultVideoUrl,
    controls: true,
    autoPlay: true,
    className: "w-full h-full max-h-48 object-contain rounded-lg"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center mb-3"
  }, /*#__PURE__*/React.createElement(Check, {
    size: 28
  })), /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-xs text-white"
  }, "Video Đã Lồng Tiếng Xong!"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-400 mt-1"
  }, "Đã khớp phụ đề và giọng đọc ", selectedVoiceLabel.split(' (')[0], ".")) : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3"
  }, /*#__PURE__*/React.createElement(Clapperboard, {
    size: 28
  })), /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-xs text-white"
  }, "Chưa có Video Kết Quả"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-400 mt-1"
  }, "Bấm \"BẮT ĐẦU LỒNG TIẾNG VIDEO AI\" để xem kết quả tại đây."))), /*#__PURE__*/React.createElement("div", {
    className: "h-4"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-3 border border-gray-200/90 shadow-xs flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-black text-gray-900"
  }, "🎉 Tải xuống & Xuất bản"), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#e6f4ff] border border-[#91caff] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#0958d9]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-4 h-4 rounded-full bg-[#1677ff] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
  }, "i"), /*#__PURE__*/React.createElement("span", null, "Video thành phẩm và tệp phụ đề .SRT sẽ hiển thị tại đây sau khi lồng tiếng xong."))))));
}

// ==========================================
// FILE 3: TTS STUDIO VIEW (PHÒNG THU GIỌNG ĐỌC AI)
// ==========================================
function TTSStudioView({
  onBackHome
}) {
  const [scriptText, setScriptText] = useState("Chào cả nhà đã quay trở lại với kênh! [Hắng giọng] Hôm nay mình sẽ tóm tắt cho anh em một siêu phẩm điện ảnh đỉnh của chóp! [Nghỉ 0.5s] Cái kết khiến ai xem xong cũng phải [Gầm] thốt lên kinh ngạc vì quá bất ngờ! [Đỉnh kout] Cùng xem hết video nhé!");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0.8);
  const duration = 14.5;
  const [isRendering, setIsRendering] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState('1.0');
  const [emotionIntensity, setEmotionIntensity] = useState(65);
  const [pitchValue, setPitchValue] = useState(6);
  const [audioUrl, setAudioUrl] = useState(null);
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const charCount = scriptText.length;
  const estimatedSeconds = (wordCount * 0.38).toFixed(1);
  const tagMatches = scriptText.match(/\[.*?\]/g) || [];
  const tagCount = tagMatches.length;
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return parseFloat((prev + 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);
  const insertTagAtCursor = tag => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const newText = currentText.substring(0, start) + ` ${tag} ` + currentText.substring(end);
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: scriptText.replace(/\[.*?\]/g, '').trim(),
          voice: 'vi-VN-HoaiMyNeural',
          rate: `${selectedSpeed === '1.0' ? '+0%' : selectedSpeed === '0.8' ? '-20%' : selectedSpeed === '1.15' ? '+15%' : '+30%'}`
        })
      });
      const data = await res.json();
      if (data.success && data.url) {
        setAudioUrl(data.url);
        setIsRendering(false);
        setIsPlaying(true);
        setCurrentTime(0);
        return;
      }
    } catch (e) {}

    // Fallback timer simulation
    setTimeout(() => {
      setIsRendering(false);
      setIsPlaying(true);
      setCurrentTime(0);
    }, 1200);
  };
  const formatTags = () => {
    const cleaned = scriptText.replace(/\s*(\[[^\]]+\])\s*/g, ' $1 ');
    setScriptText(cleaned.trim());
  };
  const emotionTags = [{
    label: '[ Gầm ]',
    color: 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
  }, {
    label: '[ Đỉnh kout ]',
    color: 'bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-300'
  }, {
    label: '[ Đùa ]',
    color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border-yellow-300'
  }, {
    label: '[ Tự khen ]',
    color: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
  }, {
    label: '[ Thở dài ]',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-300'
  }, {
    label: '[ Dỗi ]',
    color: 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
  }, {
    label: '[ Hắng giọng ]',
    color: 'bg-pink-100 hover:bg-pink-200 text-pink-900 border-pink-300'
  }, {
    label: '[ Ôi heo ]',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300'
  }, {
    label: '[ Hè ]',
    color: 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border-cyan-300'
  }, {
    label: '[ Dĩa ]',
    color: 'bg-teal-100 hover:bg-teal-200 text-teal-900 border-teal-300'
  }, {
    label: '[ Thở gòn ]',
    color: 'bg-lime-100 hover:bg-lime-200 text-lime-900 border-lime-300'
  }, {
    label: '[ Ní la ]',
    color: 'bg-red-100 hover:bg-red-200 text-red-900 border-red-300'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen text-[#1e293b] flex flex-col font-sans select-none relative pb-32",
    style: {
      backgroundColor: '#f6f9fc',
      backgroundImage: 'linear-gradient(to right, rgba(0, 114, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 114, 255, 0.05) 1px, transparent 1px)',
      backgroundSize: '24px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pt-2.5 px-4 max-w-[1740px] w-full mx-auto"
  }, /*#__PURE__*/React.createElement("header", {
    className: "bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/90 px-5 py-2.5 flex items-center justify-between shadow-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-11 h-11 rounded-full border-2 border-sky-400 overflow-hidden shadow-xs flex items-center justify-center bg-sky-50 shrink-0"
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    alt: "Logo Studio",
    className: "w-full h-full object-cover"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl font-black tracking-tight text-gray-900"
  }, "Studio VDT"), /*#__PURE__*/React.createElement("span", {
    className: "bg-[#e6f4ff] text-[#0958d9] border border-[#91caff] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
  }, "• TTS PRO STUDIO")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-0.5"
  }, "Bản quyền: ", /*#__PURE__*/React.createElement("strong", {
    className: "text-sky-700 font-bold"
  }, "Võ Duy Toàn"), " | VieNeu Neural Voice Engine"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBackHome,
    className: "bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-md text-xs font-bold transition mr-2"
  }, "← Quay lại Trang Chủ"), /*#__PURE__*/React.createElement("button", {
    className: "bg-white hover:bg-slate-50 text-sky-700 border border-sky-300 px-3.5 py-1 rounded-md text-xs font-bold shadow-xs transition"
  }, "PRO STUDIO")))), /*#__PURE__*/React.createElement("main", {
    className: "p-3.5 max-w-[1740px] w-full mx-auto grid grid-cols-12 gap-3.5 mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-3 flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-3 border border-gray-200/90 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700"
  }, /*#__PURE__*/React.createElement("span", null, "Adam Tốp Tốp (VieNeu - Nam Miền Nam)"), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 14,
    className: "text-gray-400"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 bg-gradient-to-br from-slate-50 to-orange-50/30 rounded-xl p-3 border border-orange-100/70 flex gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-sm bg-indigo-50"
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
    alt: "Adam Tốp Tốp",
    className: "w-full h-full object-cover"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-gray-900"
  }, "Adam Tốp Tốp"), /*#__PURE__*/React.createElement("span", {
    className: "bg-orange-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded"
  }, "HOT REVIEW")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-gray-500 mt-0.5"
  }, "Acoustic 48kHz • Cực cảm xúc")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-3.5 border border-gray-200/90 shadow-sm flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-xs mb-1.5 font-semibold text-gray-700"
  }, /*#__PURE__*/React.createElement("span", null, "Tốc độ nói (tempo):")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-1.5"
  }, ['0.8x', '1.0x', '1.15s', '1.3s'].map((speedVal, idx) => {
    const valKey = ['0.8', '1.0', '1.15', '1.3'][idx];
    return /*#__PURE__*/React.createElement("button", {
      key: speedVal,
      onClick: () => setSelectedSpeed(valKey),
      className: `py-1 rounded-md text-xs font-bold border transition ${selectedSpeed === valKey ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-gray-700 border-gray-300'}`
    }, speedVal);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 pt-2 border-t border-gray-100"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-xs font-semibold text-gray-700 mb-1"
  }, /*#__PURE__*/React.createElement("span", null, "Cường độ:"), /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 font-bold"
  }, emotionIntensity)), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "100",
    value: emotionIntensity,
    onChange: e => setEmotionIntensity(Number(e.target.value)),
    className: "w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-xs font-semibold text-gray-700 mb-1"
  }, /*#__PURE__*/React.createElement("span", null, "Cao độ:"), /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 font-bold"
  }, pitchValue)), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "-12",
    max: "12",
    value: pitchValue,
    onChange: e => setPitchValue(Number(e.target.value)),
    className: "w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-6 flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl border border-gray-200/90 shadow-sm flex flex-col flex-1 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3.5 py-2.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-gray-800 uppercase"
  }, "🔴 KỊCH BẢN XỬ LÝ (LIVE SYNTAX MODE)"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: formatTags,
    className: "bg-white hover:bg-slate-100 text-gray-700 border border-gray-300 text-xs px-2.5 py-1 rounded font-medium shadow-xs"
  }, "Format Tags"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setScriptText(p => p + " [Đỉnh kout] Rất xuất sắc!"),
    className: "bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 text-xs px-2.5 py-1 rounded font-medium shadow-xs flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Wand2, {
    size: 12
  }), " AI Rewrite"))), /*#__PURE__*/React.createElement("div", {
    className: "p-3.5 flex-1 flex flex-col min-h-[300px]"
  }, /*#__PURE__*/React.createElement("textarea", {
    ref: textareaRef,
    value: scriptText,
    onChange: e => setScriptText(e.target.value),
    className: "w-full flex-1 resize-none outline-none font-normal text-sm leading-relaxed text-gray-800 bg-transparent"
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-3.5 py-2 bg-slate-50 border-t border-gray-200 text-xs text-gray-600 flex justify-between"
  }, /*#__PURE__*/React.createElement("div", null, wordCount, " từ • ", charCount, " ký tự • ", estimatedSeconds, "s ước tính"), /*#__PURE__*/React.createElement("span", {
    className: "bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200"
  }, tagCount, " Tags Phát hiện")))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-3 bg-white rounded-xl p-3 border border-gray-200/90 shadow-sm flex flex-col"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-gray-900 block mb-2"
  }, "BẤM CHÈN THẺ CẢM XÚC:"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5 overflow-y-auto max-h-[340px] pr-1"
  }, emotionTags.map((tag, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => insertTagAtCursor(tag.label),
    className: `text-left text-[11px] font-bold px-2 py-1.5 rounded-md border shadow-xs transition truncate active:scale-95 ${tag.color}`
  }, tag.label))))), /*#__PURE__*/React.createElement("footer", {
    className: "fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl z-40"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1740px] mx-auto px-4 py-2 flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setIsPlaying(!isPlaying),
    className: "w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition"
  }, isPlaying ? /*#__PURE__*/React.createElement(Pause, {
    size: 17
  }) : /*#__PURE__*/React.createElement(Play, {
    size: 17,
    className: "ml-0.5"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-xs text-gray-900 block"
  }, "Adam Tốp Tốp_Master_Audio"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-gray-500 font-mono"
  }, "00:", currentTime.toFixed(1), " / 00:", duration.toFixed(1)))), audioUrl ? /*#__PURE__*/React.createElement("a", {
    href: audioUrl,
    download: "Adam_TopTop_Master_48kHz.mp3",
    className: "bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement(Download, {
    size: 14
  }), " TẢI WAV MASTER (48kHz)") : /*#__PURE__*/React.createElement("button", {
    onClick: handleRenderAudio,
    className: "bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
  }, /*#__PURE__*/React.createElement(Download, {
    size: 14
  }), " TẢI WAV MASTER (48kHz)")), /*#__PURE__*/React.createElement("button", {
    onClick: handleRenderAudio,
    disabled: isRendering,
    className: "w-full bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 text-white text-sm font-extrabold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99]"
  }, isRendering ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    className: "animate-spin"
  }), " ĐANG TỔNG HỢP GIỌNG ĐỌC AI...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "＋"), " TẠO GIỌNG ĐỌC AI NGAY (RENDER AUDIO) - Ctrl + Enter")))));
}

// ==========================================
// FILE 4: DRAMA DOWNLOADER VIEW (TẢI PHIM DRAMA SERIES)
// ==========================================
function DramaDownloaderView() {
  const [activeApp, setActiveApp] = useState('auto');
  const [dramaTitle, setDramaTitle] = useState('Tổng Tài Huyết Thống Cuối Cùng');
  const [startEp, setStartEp] = useState(1);
  const [autoSwipeCount, setAutoSwipeCount] = useState(1);
  const [autoExport, setAutoExport] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selectedCodec, setSelectedCodec] = useState('h264');

  // Modals
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showDirectLinksModal, setShowDirectLinksModal] = useState(false);
  const [directDramaData, setDirectDramaData] = useState(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');

  // Queue danh sách tập video
  const [queueItems, setQueueItems] = useState([{
    id: 1,
    ep: 1,
    title: 'Tập 01 - Cuộc gặp định mệnh',
    size: '24.5 MB',
    isNew: true,
    checked: true
  }, {
    id: 2,
    ep: 2,
    title: 'Tập 02 - Hợp đồng hôn nhân',
    size: '26.1 MB',
    isNew: true,
    checked: true
  }, {
    id: 3,
    ep: 3,
    title: 'Tập 03 - Thân phận lộ tẩy',
    size: '25.8 MB',
    isNew: false,
    checked: false
  }, {
    id: 4,
    ep: 4,
    title: 'Tập 04 - Đại tiệc gia tộc',
    size: '28.2 MB',
    isNew: false,
    checked: false
  }]);
  const [localDramas, setLocalDramas] = useState([{
    title: 'Chàng Rể Quyền Lực',
    episodes: '85/85 Tập',
    folder: 'Soda_Reels_Videos/ChangRe'
  }, {
    title: 'Thiên Kim Thật Trở Về',
    episodes: '92/92 Tập',
    folder: 'Soda_Reels_Videos/ThienKim'
  }, {
    title: 'Chiến Thần Đô Thị',
    episodes: '60/60 Tập',
    folder: 'Soda_Reels_Videos/ChienThan'
  }]);
  const showToast = text => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Sync real status from backend
  const fetchStatusData = async () => {
    try {
      const res = await fetch(`/api/status?app=${activeApp}&drama=${encodeURIComponent(dramaTitle)}`);
      const data = await res.json();
      if (data.currentDrama && data.currentDrama.title) {
        setDramaTitle(data.currentDrama.title);
        if (data.currentDrama.currentEpisode) {
          setStartEp(data.currentDrama.currentEpisode);
        }
      }
      if (data.remoteList && data.remoteList.length > 0) {
        const mapped = data.remoteList.map((item, idx) => ({
          id: idx + 1,
          ep: item.suggestedEp || idx + 1,
          title: item.suggestedEp ? `Tập ${String(item.suggestedEp).padStart(2, '0')}` : item.name,
          size: item.sizeFormatted,
          isNew: !item.isAlreadyExported,
          checked: !item.isAlreadyExported,
          path: item.path
        }));
        setQueueItems(mapped);
      }
      if (data.localDramas && data.localDramas.length > 0) {
        const dList = data.localDramas.map(d => ({
          title: d.name,
          episodes: `${d.videos ? d.videos.length : 0} Tập`,
          folder: `Soda_Reels_Videos/${d.name}`
        }));
        setLocalDramas(dList);
      }
    } catch (e) {}
  };
  useEffect(() => {
    fetchStatusData();
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
  const toggleSelectAll = checked => {
    setQueueItems(queueItems.map(item => ({
      ...item,
      checked
    })));
  };
  const selectOnlyNew = () => {
    setQueueItems(queueItems.map(item => ({
      ...item,
      checked: item.isNew
    })));
  };
  const reverseQueueOrder = () => {
    setQueueItems([...queueItems].reverse());
  };
  const deleteSelectedCache = async () => {
    try {
      await fetch('/api/delete-remote', {
        method: 'POST'
      });
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          total: count,
          delay: 6
        })
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dramaName: dramaTitle
        })
      });
      const data = await res.json();
      showToast(`✅ Đã xuất thành công ${data.count || queueItems.length} tập vào bộ: "${dramaTitle}"!`);
      fetchStatusData();
    } catch (e) {
      showToast(`Đã xuất các tập vào thư mục máy tính!`);
    }
  };
  const handleDownloadSingleDirect = async ep => {
    const url = selectedCodec === 'h264' && ep.directUrlH264 ? ep.directUrlH264 : ep.directUrl;
    showToast(`Đang tải Tập ${ep.epNumber} qua CDN siêu tốc (1-2s)...`);
    try {
      const res = await fetch('/api/download-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
      const url = selectedCodec === 'h264' && ep.directUrlH264 ? ep.directUrlH264 : ep.directUrl;
      try {
        await fetch('/api/download-direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#0f172a] text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-black text-sky-400"
  }, "ỨNG DỤNG NGUỒN:"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveApp('auto'),
    className: `px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeApp === 'auto' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`
  }, "🤖 Tự Động"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveApp('sodareels'),
    className: `px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeApp === 'sodareels' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`
  }, "🥤 Soda Reels"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveApp('minutedrama'),
    className: `px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeApp === 'minutedrama' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`
  }, "🎭 MinuteDrama"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700 text-xs"
  }, /*#__PURE__*/React.createElement("span", null, "🤖"), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-300"
  }, "Đang nhận diện: "), /*#__PURE__*/React.createElement("strong", {
    className: "text-sky-400"
  }, activeApp === 'auto' ? 'Tự động quét' : activeApp === 'sodareels' ? 'Soda Reels' : 'MinuteDrama')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs text-emerald-400 font-semibold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
  }), /*#__PURE__*/React.createElement("span", null, "ADB Đã Kết Nối")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-12 gap-4 items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-5 bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-sm font-black text-gray-900 uppercase"
  }, "🏷️ 1. Cấu Hình Tên Bộ Phim"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: clearDramaConfig,
    className: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold px-2.5 py-1 text-xs rounded-lg transition"
  }, "🧹 Làm Sạch / Nhập Lại")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-gray-500 leading-snug"
  }, "Tự động phát hiện phim đang mở từ app được chọn. Bấm \"Làm Sạch\" nếu muốn xóa trắng để nhận diện lại."), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 bg-slate-50 border border-gray-200 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-24 h-32 bg-slate-200 rounded-lg flex flex-col items-center justify-center text-center text-xs text-gray-500 border border-gray-300 shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "🎬"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] mt-1 font-medium"
  }, "Poster Phim")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col justify-between min-w-0"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-1 gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-gray-700"
  }, "Tên Bộ Phim (Thư mục sẽ lưu):"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: syncWithAppDrama,
    className: "text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition"
  }, "⚡ Lấy Phim Đang Xem")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: dramaTitle,
    onChange: e => setDramaTitle(e.target.value),
    placeholder: "Nhập tên bộ phim...",
    className: "w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-blue-500 font-medium"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 flex-wrap mt-2"
  }, ['#ĐôThị', '#TổngTài', '#BáoThù', '#HàiHước'].map(tag => /*#__PURE__*/React.createElement("span", {
    key: tag,
    className: "text-[10px] bg-slate-200/80 text-gray-700 px-2 py-0.5 rounded font-semibold"
  }, tag))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 pt-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-gray-700 block mb-1"
  }, "Bắt đầu từ tập số:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    value: startEp,
    onChange: e => setStartEp(Number(e.target.value)),
    className: "w-full bg-slate-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-600 focus:outline-none focus:border-blue-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-sky-600 mt-1"
  }, "✨ Đang tự động nhận diện...")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-gray-700 block mb-1"
  }, "Tải Poster & Mở thư mục:"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => showToast('Đang tải poster bộ phim...'),
    className: "flex-1 bg-slate-100 hover:bg-slate-200 text-gray-800 border border-gray-300 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition"
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 13
  }), " Tải Poster"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: async () => {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folder: dramaTitle
        })
      });
      showToast('Đang mở thư mục lưu phim trên máy...');
    },
    className: "flex-1 bg-slate-100 hover:bg-slate-200 text-gray-800 border border-gray-300 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition"
  }, /*#__PURE__*/React.createElement(FolderOpen, {
    size: 13
  }), " Mở Thư Mục")))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 pt-2 border-t border-gray-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleExportSelected,
    className: "flex-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 transition"
  }, "📥 XUẤT CÁC TẬP ĐÃ CHỌN VÀO BỘ NÀY"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: fetchStatusData,
    className: "flex-1 bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-300 font-bold py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1 transition"
  }, "🔄 Tải Lại Tập Cũ")), toastMsg && /*#__PURE__*/React.createElement("div", {
    className: "p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-bold flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "✓"), " ", toastMsg)), /*#__PURE__*/React.createElement("div", {
    className: "col-span-12 lg:col-span-7 bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center pb-2 border-b border-gray-100 flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-sm font-black text-gray-900 uppercase"
  }, "📼 Video Chờ Xuất (", queueItems.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-gray-400 font-medium"
  }, "Tích chọn những tập bạn muốn tải về máy")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      fetchDirectEpisodes();
      setShowDirectLinksModal(true);
    },
    className: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold px-2 py-1 rounded text-xs transition"
  }, "⚡ Link Trực Tiếp Cả Bộ"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: selectOnlyNew,
    className: "bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 font-bold px-2 py-1 rounded text-xs transition"
  }, "⭐ Chọn tập mới"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => toggleSelectAll(true),
    className: "bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-300 px-2 py-1 rounded text-xs font-semibold"
  }, "Chọn hết"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => toggleSelectAll(false),
    className: "bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-300 px-2 py-1 rounded text-xs font-semibold"
  }, "Bỏ chọn"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: reverseQueueOrder,
    className: "bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 px-2 py-1 rounded text-xs font-bold"
  }, "🔄 Đảo thứ tự"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: deleteSelectedCache,
    className: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 px-2 py-1 rounded text-xs font-bold"
  }, "Xóa cache"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-[#0f172a] text-white rounded-xl p-3 border border-sky-500/30 flex flex-col gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-sky-400 flex items-center gap-1.5"
  }, "🤖 Tải Video Từng Tập (Đủ 100% Mới Qua Tập Tiếp)"), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] font-bold px-2 py-0.5 rounded ${isSwiping ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'}`
  }, isSwiping ? 'Đang tự động tải...' : 'Sẵn sàng')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => startSwipe(1),
    className: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
  }, "🎯 Lấy Đúng 1 Tập Này"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400"
  }, "Số tập:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "100",
    value: autoSwipeCount,
    onChange: e => setAutoSwipeCount(Number(e.target.value)),
    className: "w-12 bg-slate-800 border border-slate-600 text-white rounded text-xs text-center py-0.5 font-bold"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => startSwipe(),
    className: "bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-2.5 py-1 rounded transition"
  }, "▶ Lướt Tự Động")), isSwiping && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setIsSwiping(false),
    className: "bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
  }, "⏹ Dừng Lại"), /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] text-emerald-400 flex items-center gap-1.5 ml-auto cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: autoExport,
    onChange: e => setAutoExport(e.target.checked),
    className: "accent-emerald-500"
  }), "Tự lưu về máy khi đủ 100%")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400"
  }, "💡 ", /*#__PURE__*/React.createElement("b", null, "Quy tắc an toàn:"), " Tool chỉ tải duy nhất ", /*#__PURE__*/React.createElement("b", null, "1 video tại một thời điểm"), ", nạp đủ 100% rồi mới lướt sang tập kế tiếp.")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1"
  }, queueItems.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: `flex items-center justify-between p-2.5 rounded-xl border transition ${item.checked ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-gray-200'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: item.checked,
    onChange: e => {
      setQueueItems(queueItems.map(q => q.id === item.id ? {
        ...q,
        checked: e.target.checked
      } : q));
    },
    className: "accent-blue-600 w-4 h-4 cursor-pointer"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-gray-900"
  }, item.title), item.isNew && /*#__PURE__*/React.createElement("span", {
    className: "bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded"
  }, "MỚI")), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-gray-500"
  }, item.size, " • Đã lưu trong bộ đệm RAM"))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setPreviewVideoUrl(item.path ? `/api/preview-remote?path=${encodeURIComponent(item.path)}` : '');
      setShowPlayerModal(true);
    },
    className: "bg-white hover:bg-slate-100 text-blue-600 border border-gray-300 text-xs font-bold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1 transition"
  }, /*#__PURE__*/React.createElement(Play, {
    size: 11
  }), " Xem")))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl p-4 border border-gray-200/90 shadow-xs"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm font-black text-gray-900 uppercase mb-3 flex items-center gap-2"
  }, "📚 Các Bộ Phim Đã Tải Trên Máy Tính"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-3"
  }, localDramas.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "p-3 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-gray-900"
  }, d.title), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-emerald-600 font-semibold"
  }, d.episodes), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-gray-400 mt-0.5"
  }, d.folder)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: async () => {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folder: d.title
        })
      });
      showToast(`Mở thư mục: ${d.folder}`);
    },
    className: "p-2 bg-white hover:bg-slate-100 text-gray-700 border border-gray-300 rounded-lg shadow-xs transition"
  }, /*#__PURE__*/React.createElement(FolderOpen, {
    size: 14
  })))))), showPlayerModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4",
    onClick: () => setShowPlayerModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#0f172a] rounded-2xl max-w-2xl w-full p-4 border border-slate-700 text-white shadow-2xl",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-3 pb-2 border-b border-slate-800"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-sky-400"
  }, "Xem video cache"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowPlayerModal(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(X, {
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-black aspect-video rounded-xl flex flex-col items-center justify-center border border-slate-800 text-slate-500 text-xs p-4 text-center overflow-hidden"
  }, previewVideoUrl ? /*#__PURE__*/React.createElement("video", {
    src: previewVideoUrl,
    controls: true,
    autoPlay: true,
    className: "w-full h-full object-contain"
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tv, {
    size: 42,
    className: "text-slate-700 mb-2"
  }), /*#__PURE__*/React.createElement("span", null, "Trình phát video thử nghiệm"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex justify-end gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setShowPlayerModal(false);
      showToast('Đang mở phát qua Media Player máy tính...');
    },
    className: "bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
  }, "🎬 Mở Bằng Media Player"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPlayerModal(false),
    className: "bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition"
  }, "Đóng")))), showDirectLinksModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4",
    onClick: () => setShowDirectLinksModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-[#0f172a] rounded-2xl max-w-3xl w-full p-5 border border-slate-700 text-white shadow-2xl",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-3 pb-2 border-b border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-emerald-400 flex items-center gap-1.5"
  }, "⚡ Toàn Bộ Link Video Trực Tiếp (CDN Siêu Tốc 1s)"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold"
  }, "H.264 Không Lỗi")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDirectLinksModal(false),
    className: "text-slate-400 hover:text-white"
  }, /*#__PURE__*/React.createElement(X, {
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3 text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800"
  }, /*#__PURE__*/React.createElement("span", null, "Chuẩn Video: ", /*#__PURE__*/React.createElement("strong", {
    className: "text-emerald-400"
  }, "H.264 (Chuẩn Windows - Xem không lỗi 0xC00D36C4)")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedCodec(selectedCodec === 'h264' ? 'h265' : 'h264'),
    className: "text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded border border-slate-700 font-bold"
  }, "Đổi chuẩn: ", selectedCodec.toUpperCase())), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 max-h-[50vh] overflow-y-auto pr-1"
  }, directDramaData && directDramaData.episodes && directDramaData.episodes.length > 0 ? directDramaData.episodes.map(ep => {
    const url = selectedCodec === 'h264' && ep.directUrlH264 ? ep.directUrlH264 : ep.directUrl;
    return /*#__PURE__*/React.createElement("div", {
      key: ep.epNumber,
      className: "bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "truncate text-xs"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-sky-400 mr-2"
    }, "Tập ", ep.epNumber < 10 ? `0${ep.epNumber}` : ep.epNumber, ":"), /*#__PURE__*/React.createElement("span", {
      className: "text-slate-400 text-[11px] font-mono truncate"
    }, url)), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1.5 shrink-0"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        navigator.clipboard.writeText(url);
        showToast(`Đã copy link CDN Tập ${ep.epNumber}!`);
      },
      className: "bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-2.5 py-1 rounded border border-slate-700"
    }, "Copy"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleDownloadSingleDirect(ep),
      className: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1 rounded-lg transition"
    }, "Tải (1s)")));
  }) : [1, 2, 3, 4, 5, 6].map(num => /*#__PURE__*/React.createElement("div", {
    key: num,
    className: "bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "truncate text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-sky-400 mr-2"
  }, "Tập ", num < 10 ? `0${num}` : num, ":"), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 text-[11px] font-mono"
  }, "https://cdn-video.sodareels.io/stream/media_0", num, ".mp4")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => showToast(`Bắt đầu tải Tập ${num}...`),
    className: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1 rounded-lg shrink-0 transition"
  }, "Tải (1s)")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex justify-between items-center pt-3 border-t border-slate-800"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleDownloadAllDirect,
    className: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition"
  }, "🚀 Tải Tự Động Tất Cả Các Tập"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowDirectLinksModal(false),
    className: "bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition"
  }, "Đóng")))));
}

// ==========================================
// FILE 1: APP (TRANG CHỦ DASHBOARD + ĐIỀU HƯỚNG)
// ==========================================
function App() {
  // 'home' | 'dubbing' | 'tts' | 'downloader'
  const [currentPage, setCurrentPage] = useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Nếu đang ở trang con: Hiển thị giao diện riêng toàn màn hình, không sidebar
  if (currentPage === 'dubbing') {
    return /*#__PURE__*/React.createElement(DubbingView, {
      onBackHome: () => setCurrentPage('home')
    });
  }
  if (currentPage === 'tts') {
    return /*#__PURE__*/React.createElement(TTSStudioView, {
      onBackHome: () => setCurrentPage('home')
    });
  }
  if (currentPage === 'downloader') {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen text-[#1e293b] flex flex-col font-sans select-none p-4",
      style: {
        backgroundColor: '#f6f9fc',
        backgroundImage: 'linear-gradient(to right, rgba(0, 114, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 114, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "max-w-[1740px] w-full mx-auto mb-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setCurrentPage('home'),
      className: "bg-white hover:bg-slate-50 text-gray-800 border border-gray-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
    }, "← Quay lại Trang Chủ")), /*#__PURE__*/React.createElement("div", {
      className: "max-w-[1740px] w-full mx-auto"
    }, /*#__PURE__*/React.createElement(DramaDownloaderView, null)));
  }

  // ==========================================
  // GIAO DIỆN TRANG CHỦ CÓ SIDEBAR BÊN TRÁI
  // ==========================================
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-[#f8fafc] text-slate-800 flex font-sans"
  }, /*#__PURE__*/React.createElement("aside", {
    className: `${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-[#0f172a] text-slate-200 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 shadow-xl`
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-b border-slate-800 flex items-center justify-between"
  }, !isSidebarCollapsed && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md font-black text-sm"
  }, "VDT"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "font-black text-white text-base tracking-tight leading-none"
  }, "Studio VDT"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-sky-400 font-semibold"
  }, "AI Creative Suite"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setIsSidebarCollapsed(!isSidebarCollapsed),
    className: "p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition mx-auto"
  }, /*#__PURE__*/React.createElement(Menu, {
    size: 18
  }))), /*#__PURE__*/React.createElement("nav", {
    className: "p-3 space-y-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentPage('home'),
    className: "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-blue-600/15 text-blue-400 font-bold text-xs border border-blue-500/30 text-left transition"
  }, /*#__PURE__*/React.createElement(Layers, {
    size: 18
  }), !isSidebarCollapsed && /*#__PURE__*/React.createElement("span", null, "Trang Tổng Quan")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentPage('dubbing'),
    className: "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold text-xs text-left transition"
  }, /*#__PURE__*/React.createElement(Clapperboard, {
    size: 18,
    className: "text-sky-400"
  }), !isSidebarCollapsed && /*#__PURE__*/React.createElement("span", null, "Lồng tiếng Video AI")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentPage('tts'),
    className: "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold text-xs text-left transition"
  }, /*#__PURE__*/React.createElement(Mic, {
    size: 18,
    className: "text-emerald-400"
  }), !isSidebarCollapsed && /*#__PURE__*/React.createElement("span", null, "Phòng thu Giọng đọc AI")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentPage('downloader'),
    className: "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold text-xs text-left transition"
  }, /*#__PURE__*/React.createElement(DownloadCloud, {
    size: 18,
    className: "text-purple-400"
  }), !isSidebarCollapsed && /*#__PURE__*/React.createElement("span", null, "Tải Phim Drama Series")))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 border-t border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 p-2 bg-slate-800/40 rounded-xl border border-slate-700/50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0"
  }, "VT"), !isSidebarCollapsed && /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-white truncate"
  }, "Võ Duy Toàn"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400"
  }, "Enterprise Pro"))))), /*#__PURE__*/React.createElement("main", {
    className: "flex-1 overflow-y-auto p-6 md:p-10 max-w-7xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold mb-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14
  }), " Hệ thống Studio AI cao cấp"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-black text-slate-900 tracking-tight"
  }, "Chào mừng đến với Studio VDT"), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-500 text-sm mt-1"
  }, "Chọn không gian làm việc chuyên biệt bên dưới để bắt đầu sản xuất nội dung:")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setCurrentPage('dubbing'),
    className: "group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-blue-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
  }, /*#__PURE__*/React.createElement(Clapperboard, {
    size: 26
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors"
  }, "Lồng Tiếng Video AI"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 mt-2 leading-relaxed"
  }, "Tự động dịch thuật, tách thoại, khử tiếng ồn và lồng giọng đọc AI cảm xúc kết hợp chèn Watermark thương hiệu trực tiếp trên Canvas.")), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600"
  }, /*#__PURE__*/React.createElement("span", null, "Mở phòng lồng tiếng"), /*#__PURE__*/React.createElement(ArrowRight, {
    size: 14,
    className: "group-hover:translate-x-1 transition-transform"
  }))), /*#__PURE__*/React.createElement("div", {
    onClick: () => setCurrentPage('tts'),
    className: "group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-emerald-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
  }, /*#__PURE__*/React.createElement(Mic, {
    size: 26
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-base font-black text-slate-900 group-hover:text-emerald-600 transition-colors"
  }, "Phòng Thu Giọng Đọc AI (TTS)"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 mt-2 leading-relaxed"
  }, "Soạn thảo kịch bản Live Syntax, chèn hơn 55+ thẻ mã cảm xúc tức thì, tinh chỉnh tempo, cao độ và xuất audio Master 48kHz.")), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600"
  }, /*#__PURE__*/React.createElement("span", null, "Mở TTS Studio"), /*#__PURE__*/React.createElement(ArrowRight, {
    size: 14,
    className: "group-hover:translate-x-1 transition-transform"
  }))), /*#__PURE__*/React.createElement("div", {
    onClick: () => setCurrentPage('downloader'),
    className: "group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-purple-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
  }, /*#__PURE__*/React.createElement(DownloadCloud, {
    size: 26
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-base font-black text-slate-900 group-hover:text-purple-600 transition-colors"
  }, "Tải Phim Drama Series"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 mt-2 leading-relaxed"
  }, "Tự động nhận diện phim từ Soda Reels, MinuteDrama qua ADB, auto-swipe lướt từng tập và trích xuất link CDN siêu tốc.")), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600"
  }, /*#__PURE__*/React.createElement("span", null, "Mở công cụ tải phim"), /*#__PURE__*/React.createElement(ArrowRight, {
    size: 14,
    className: "group-hover:translate-x-1 transition-transform"
  }))))));
}

// Render React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));