const { useState, useEffect, useRef } = React;

// --- Helper Functions ---
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Voices Catalog from StudioVDT
const TTS_VOICES = [
  { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My', lang: 'vi', desc: 'Nữ Bắc ngọt ngào, truyền cảm (Thuyết minh phim)', flag: '🇻🇳' },
  { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh', lang: 'vi', desc: 'Nam Bắc trầm ấm, chững chạc (Review phim, tin tức)', flag: '🇻🇳' },
  { id: 'en-US-JennyNeural', name: 'Jenny', lang: 'en', desc: 'Nữ Mỹ tự nhiên, hiện đại', flag: '🇺🇸' },
  { id: 'en-US-GuyNeural', name: 'Guy', lang: 'en', desc: 'Nam Mỹ điềm đạm, rõ ràng', flag: '🇺🇸' },
  { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao', lang: 'zh', desc: 'Nữ Trung Quốc giọng chuẩn Bắc Kinh', flag: '🇨🇳' },
  { id: 'zh-CN-YunxiNeural', name: 'Yunxi', lang: 'zh', desc: 'Nam Trung Quốc hoạt bát, lôi cuốn', flag: '🇨🇳' },
  { id: 'ja-JP-NanamiNeural', name: 'Nanami', lang: 'ja', desc: 'Nữ Nhật Bản nhẹ nhàng, anime', flag: '🇯🇵' },
  { id: 'ko-KR-SunHiNeural', name: 'SunHi', lang: 'ko', desc: 'Nữ Hàn Quốc tự nhiên, phim truyền hình', flag: '🇰🇷' },
];

// Sample Scripts from StudioVDT
const SAMPLE_SCRIPTS = [
  { label: 'Review Phim Ngắn', text: 'Chào mừng các bạn đã quay trở lại với góc review phim ngắn. Hôm nay chúng ta sẽ cùng theo dõi một câu chuyện vô cùng kịch tính và bất ngờ!' },
  { label: 'Thuyết Minh Kịch Tính', text: 'Người đàn ông bí ẩn bước vào căn phòng tối. Hắn không hề biết rằng, mọi hành động của mình đều đã nằm trong kế hoạch của đối phương từ trước.' },
  { label: 'Giới Thiệu Tập Mới', text: 'Mời quý vị và các bạn tiếp tục theo dõi diễn biến gay cấn của tập tiếp theo. Liệu sự thật có được phơi bày ra ánh sáng hay không?' }
];

// --- Main App Component ---
function App() {
  // Main Tabs: 'home', 'tts', 'dubbing', 'downloader', 'library', 'settings'
  const [activeTab, setActiveTab] = useState('home');
  
  // Downloader Sub-tab: 'direct' or 'cache'
  const [downloaderSubTab, setDownloaderSubTab] = useState('direct');

  // Backend Status State
  const [status, setStatus] = useState(null);
  const [directEpisodes, setDirectEpisodes] = useState(null);
  const [selectedCodec, setSelectedCodec] = useState('h264'); // 'h264' (safe) or 'h265'
  const [loading, setLoading] = useState(false);
  const [directLoading, setDirectLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [videoModal, setVideoModal] = useState(null);

  // Auto-swipe state
  const [autoSwipeTotal, setAutoSwipeTotal] = useState(10);
  const [autoSwipeDelay, setAutoSwipeDelay] = useState(6);
  const [autoSwipeStatus, setAutoSwipeStatus] = useState({ isRunning: false });

  // Direct batch download state
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, activeEp: 0, percent: 0 });

  // StudioVDT Dubbing state
  const [dubbingTarget, setDubbingTarget] = useState(null);
  const [dubVoice, setDubVoice] = useState('vi-VN-HoaiMyNeural');
  const [dubSpeed, setDubSpeed] = useState('+0%');
  const [dubModel, setDubModel] = useState('base');
  const [dubBgmVol, setDubBgmVol] = useState(0.15);
  const [dubBurnSub, setDubBurnSub] = useState(true);
  const [dubJobId, setDubJobId] = useState(null);
  const [dubProgress, setDubProgress] = useState(null);
  const [dubResultVideo, setDubResultVideo] = useState(null);

  // StudioVDT TTS Studio state
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('vi-VN-HoaiMyNeural');
  const [ttsRate, setTtsRate] = useState('+0%');
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsAudioResult, setTtsAudioResult] = useState(null);

  // Library state
  const [selectedDramaName, setSelectedDramaName] = useState(null);

  // ADB Connect state
  const [adbHostInput, setAdbHostInput] = useState('127.0.0.1:5555');
  const [adbConnecting, setAdbConnecting] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);

      if (data.localDramas && data.localDramas.length > 0 && !selectedDramaName) {
        setSelectedDramaName(data.localDramas[0].name);
      }
    } catch (e) {
      console.error('Lỗi lấy status:', e);
    }
  };

  // Fetch direct episodes
  const fetchDirectEpisodes = async (dramaTitle = '') => {
    setDirectLoading(true);
    try {
      const query = dramaTitle ? `?title=${encodeURIComponent(dramaTitle)}` : '';
      const res = await fetch(`/api/direct-episodes${query}`);
      const data = await res.json();
      if (data.success && data.episodes && data.episodes.length > 0) {
        setDirectEpisodes(data);
      } else {
        setDirectEpisodes(null);
      }
    } catch (e) {
      console.error('Lỗi lấy link trực tiếp:', e);
    } finally {
      setDirectLoading(false);
    }
  };

  // Fetch auto-swipe status
  const fetchAutoSwipeStatus = async () => {
    try {
      const res = await fetch('/api/auto-swipe/status');
      const data = await res.json();
      setAutoSwipeStatus(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchStatus();
    fetchDirectEpisodes();
    const interval = setInterval(() => {
      fetchStatus();
      fetchAutoSwipeStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Poll dubbing job
  useEffect(() => {
    if (!dubJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/dub-status?id=${dubJobId}`);
        const data = await res.json();
        setDubProgress(data);
        if (data.status === 'completed') {
          showToast('🎉 Lồng tiếng video hoàn tất thành công!', 'success');
          setDubResultVideo(data.output_video);
          setDubJobId(null);
          fetchStatus();
        } else if (data.status === 'failed') {
          showToast(`❌ Lồng tiếng thất bại: ${data.error || 'Lỗi không xác định'}`, 'error');
          setDubJobId(null);
        }
      } catch (e) {}
    }, 1500);
    return () => clearInterval(interval);
  }, [dubJobId]);

  // Connect ADB
  const handleConnectAdb = async () => {
    setAdbConnecting(true);
    try {
      const res = await fetch('/api/connect-adb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: adbHostInput })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Kết nối ADB: ${data.message}`, 'success');
        fetchStatus();
      } else {
        showToast(`Lỗi kết nối ADB: ${data.message || data.error}`, 'error');
      }
    } catch (e) {
      showToast('Lỗi gửi lệnh kết nối ADB', 'error');
    } finally {
      setAdbConnecting(false);
    }
  };

  // Switch App Mode
  const handleSwitchApp = async (app) => {
    try {
      const res = await fetch('/api/set-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã chuyển ứng dụng: ${app.toUpperCase()}`, 'success');
        fetchStatus();
        fetchDirectEpisodes();
      }
    } catch (e) {}
  };

  // Direct single download
  const handleDownloadDirectSingle = async (ep) => {
    const url = (selectedCodec === 'h264' && ep.directUrlH264) ? ep.directUrlH264 : ep.directUrl;
    if (!url) {
      showToast('Không tìm thấy link cho tập này!', 'error');
      return;
    }
    showToast(`⚡ Đang tải Tập ${ep.epNumber} từ CDN... (chỉ 1-2s)`, 'info');
    try {
      const res = await fetch('/api/download-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          dramaTitle: directEpisodes ? directEpisodes.title : 'Bo_Phim_Moi',
          epNumber: ep.epNumber
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Đã tải xong Tập ${ep.epNumber} (${formatBytes(data.sizeBytes)})!`, 'success');
        fetchStatus();
      } else {
        showToast(`❌ Tải thất bại: ${data.message}`, 'error');
      }
    } catch (e) {
      showToast('Lỗi tải video trực tiếp', 'error');
    }
  };

  // Direct batch download all
  const handleDownloadAllDirect = async () => {
    if (!directEpisodes || !directEpisodes.episodes || directEpisodes.episodes.length === 0) return;
    const episodes = directEpisodes.episodes;
    setBatchDownloading(true);
    setBatchProgress({ current: 0, total: episodes.length, activeEp: 0, percent: 0 });

    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      const url = (selectedCodec === 'h264' && ep.directUrlH264) ? ep.directUrlH264 : ep.directUrl;
      setBatchProgress({
        current: i + 1,
        total: episodes.length,
        activeEp: ep.epNumber,
        percent: Math.round(((i + 1) / episodes.length) * 100)
      });

      try {
        await fetch('/api/download-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            dramaTitle: directEpisodes.title,
            epNumber: ep.epNumber
          })
        });
      } catch (e) {
        console.error('Lỗi tải tập', ep.epNumber, e);
      }
    }

    setBatchDownloading(false);
    showToast(`🎉 Đã tải hoàn tất toàn bộ ${episodes.length} tập phim!`, 'success');
    fetchStatus();
  };

  // Export from ADB Cache
  const handleExportCache = async () => {
    setLoading(true);
    try {
      const dramaName = status && status.currentDrama ? status.currentDrama.title : 'Bo_Phim_Moi';
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dramaName })
      });
      const data = await res.json();
      if (data.count > 0) {
        showToast(`✅ Đã xuất thành công ${data.count} tập về máy tính!`, 'success');
      } else if (data.skippedCount > 0) {
        showToast(`ℹ️ ${data.skippedCount} tập đã có sẵn trong máy tính.`, 'info');
      } else {
        showToast('Không có tập nào mới cần xuất.', 'info');
      }
      fetchStatus();
    } catch (e) {
      showToast('Lỗi khi xuất video từ cache', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto Swipe Toggle
  const handleToggleAutoSwipe = async () => {
    if (autoSwipeStatus && autoSwipeStatus.isRunning) {
      await fetch('/api/auto-swipe/stop', { method: 'POST' });
      showToast('Đã dừng tự động lướt tập', 'info');
      fetchAutoSwipeStatus();
    } else {
      const res = await fetch('/api/auto-swipe/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total: parseInt(autoSwipeTotal, 10), delay: parseInt(autoSwipeDelay, 10) })
      });
      const data = await res.json();
      if (data.success) {
        showToast('🚀 Đang bắt đầu tự động lướt tập trên giả lập...', 'success');
        fetchAutoSwipeStatus();
      } else {
        showToast(data.message || 'Lỗi khởi động tự động lướt', 'error');
      }
    }
  };

  // Delete remote cache
  const handleDeleteRemoteCache = async () => {
    if (!confirm('Bạn có chắc chắn muốn xoá toàn bộ video cache trên máy ảo không?')) return;
    try {
      await fetch('/api/delete-remote', { method: 'POST' });
      showToast('Đã xoá sạch bộ nhớ đệm trên giả lập!', 'success');
      fetchStatus();
    } catch (e) {
      showToast('Lỗi xoá cache', 'error');
    }
  };

  // Open folder
  const handleOpenFolder = async (folderName = '') => {
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: folderName })
      });
      showToast('Đã mở thư mục trên máy tính', 'info');
    } catch (e) {}
  };

  // Start Video Dubbing (StudioVDT Engine)
  const handleStartDubbing = async () => {
    if (!dubbingTarget) {
      showToast('Vui lòng chọn video cần lồng tiếng!', 'error');
      return;
    }
    showToast('🚀 Bắt đầu tiến trình lồng tiếng AI...', 'info');
    try {
      const res = await fetch('/api/dub-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: dubbingTarget.path,
          voice: dubVoice,
          rate: dubSpeed,
          whisperModel: dubModel,
          bgmVolume: parseFloat(dubBgmVol),
          burnSubtitles: dubBurnSub
        })
      });
      const data = await res.json();
      if (data.success && data.jobId) {
        setDubJobId(data.jobId);
        setDubProgress({ status: 'running', percent: 5, step: 'Khởi động pipeline lồng tiếng...' });
      } else {
        showToast(`Lỗi: ${data.message}`, 'error');
      }
    } catch (e) {
      showToast('Lỗi gửi yêu cầu lồng tiếng', 'error');
    }
  };

  // Generate TTS Audio (StudioVDT TTS Studio)
  const handleGenerateTTS = async () => {
    if (!ttsText || !ttsText.trim()) {
      showToast('Vui lòng nhập văn bản kịch bản cần đọc!', 'error');
      return;
    }
    setTtsGenerating(true);
    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText.trim(),
          voice: ttsVoice,
          rate: ttsRate
        })
      });
      const data = await res.json();
      if (data.success) {
        setTtsAudioResult(data);
        showToast('🎉 Đã tạo giọng đọc AI thành công!', 'success');
      } else {
        showToast(`Lỗi tạo TTS: ${data.message}`, 'error');
      }
    } catch (e) {
      showToast('Lỗi gửi yêu cầu tạo giọng đọc', 'error');
    } finally {
      setTtsGenerating(false);
    }
  };

  // Stats calculations
  const totalLocalDramas = status?.localDramas?.length || 0;
  let totalLocalVideos = 0;
  let totalDubbedVideos = 0;
  if (status?.localDramas) {
    status.localDramas.forEach(d => {
      totalLocalVideos += d.videos ? d.videos.length : 0;
      if (d.videos) {
        totalDubbedVideos += d.videos.filter(v => v.isDubbed).length;
      }
    });
  }

  const currentDrama = status?.currentDrama;
  const isConnected = !!status?.connected;

  // The Exact 6 Primary Dedicated Tools Requested by User
  const MAIN_TOOLS_NAV = [
    { id: 'home', label: 'TRANG CHỦ', icon: '🏠', badge: null },
    { id: 'tts', label: 'PHÒNG THU GIỌNG ĐỌC AI (TTS STUDIO)', icon: '🎙️', badge: 'StudioVDT' },
    { id: 'dubbing', label: 'LỒNG TIẾNG VIDEO AI TỰ ĐỘNG (AI VIDEO DUBBING)', icon: '🎬', badge: dubJobId ? 'Đang chạy' : null },
    { id: 'downloader', label: 'TRÌNH TẢI VIDEO SODA REELS & MINUTEDRAMA', icon: '📥', badge: directEpisodes ? `${directEpisodes.totalEpisodes || directEpisodes.episodes.length} tập` : null },
    { id: 'library', label: 'KHO VIDEO & TRÌNH CHIẾU', icon: '📁', badge: totalLocalVideos ? `${totalLocalVideos}` : null },
    { id: 'settings', label: 'CÀI ĐẶT HỆ THỐNG', icon: '⚙️', badge: null }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold transition-all transform animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600/95 text-white border border-emerald-400/40' :
          toast.type === 'error' ? 'bg-rose-600/95 text-white border border-rose-400/40' :
          'bg-slate-800/95 text-brand-300 border border-brand-500/30'
        }`}>
          <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* --- TOP NAVBAR --- */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          
          {/* Logo & App Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-brand-500/25">
              ⚡
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-300 bg-clip-text text-transparent">
                Video Dynamic Toolkit
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>Soda Reels & MinuteDrama</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <span className="text-brand-400 font-bold">StudioVDT Suite</span>
              </div>
            </div>
          </div>

          {/* Quick App Switcher */}
          <div className="hidden md:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => handleSwitchApp('auto')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                status?.currentAppMode === 'auto'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🤖 Tự Động
            </button>
            <button
              onClick={() => handleSwitchApp('minutedrama')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                status?.currentAppMode === 'minutedrama'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎭 MinuteDrama
            </button>
            <button
              onClick={() => handleSwitchApp('sodareels')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                status?.currentAppMode === 'sodareels'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🥤 Soda Reels
            </button>
          </div>

          {/* Device Status Badge */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
              isConnected
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-rose-500'}`}></span>
              <span className="font-semibold">{isConnected ? status.deviceName : 'Chưa có ADB'}</span>
            </div>
            {!isConnected && (
              <button
                onClick={handleConnectAdb}
                disabled={adbConnecting}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-all"
              >
                {adbConnecting ? '...' : 'Kết nối'}
              </button>
            )}
          </div>
        </div>

        {/* --- MAIN TABS NAVIGATION (User's Exact Requested Tabs) --- */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 overflow-x-auto">
          <nav className="flex space-x-1.5 py-2">
            {MAIN_TOOLS_NAV.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold tracking-wide uppercase rounded-xl whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-1 ring-brand-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-brand-500/20 text-brand-300'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* --- BODY CONTENT AREA --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ======================================================== */}
        {/* TAB 1: 🏠 TRANG CHỦ */}
        {/* ======================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            
            {/* Hero Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-brand-950 p-6 md:p-8 border border-slate-800 shadow-xl">
              <div className="relative z-10 max-w-3xl">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30 mb-3">
                  🔥 Tích Hợp Đầy Đủ StudioVDT & Trình Tải Phim Soda Reels
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Bộ Công Cụ Tải Phim Ngắn & Studio Lồng Tiếng AI Toàn Diện
                </h1>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Tải cả bộ phim siêu tốc từ CDN chuẩn H.264, quét cache giả lập LDPlayer, thu âm kịch bản kịch tính tại Phòng Thu TTS và lồng tiếng phim tự động bằng công nghệ AI StudioVDT.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('tts')}
                    className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all"
                  >
                    <span>🎙️ Mở Phòng Thu Giọng Đọc (TTS)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('dubbing')}
                    className="px-4 py-2.5 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 flex items-center gap-2 transition-all"
                  >
                    <span>🎬 Mở Lồng Tiếng Video AI</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('downloader')}
                    className="px-4 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
                  >
                    <span>📥 Mở Trình Tải Video (1s/tập)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Giả Lập Android</span>
                  <span className="text-lg">📱</span>
                </div>
                <div className="mt-2">
                  <div className={`text-xl font-bold ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isConnected ? 'Đã Kết Nối' : 'Chưa Kết Nối'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                    {isConnected ? status.deviceName : 'Cổng 127.0.0.1:5555'}
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Phim Trên Máy Ảo</span>
                  <span className="text-lg">🎭</span>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-bold text-white truncate">
                    {currentDrama ? currentDrama.title : 'Chưa có phim'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {currentDrama ? `Tập ${currentDrama.currentEpisode || 1} / ${currentDrama.totalEpisodes || '?'}` : 'Mở app trên máy ảo'}
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Kho Video Đã Lưu</span>
                  <span className="text-lg">💾</span>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-bold text-amber-400">
                    {totalLocalVideos} Tập Phim
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {totalLocalDramas} Bộ phim trong máy
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Video Đã Lồng Tiếng</span>
                  <span className="text-lg">🎙️</span>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-bold text-purple-400">
                    {totalDubbedVideos} Tập Lồng Tiếng
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    StudioVDT AI Voice
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Feature Launchers */}
            <div>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <span>🛠️ Các Công Cụ Chính (Bấm Để Chuyển Trang)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Tool: TTS */}
                <div
                  onClick={() => setActiveTab('tts')}
                  className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-indigo-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🎙️
                    </div>
                    <h3 className="font-bold text-sm text-white mt-4 group-hover:text-indigo-400 transition-colors uppercase">
                      Phòng Thu Giọng Đọc AI (TTS Studio)
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Nhập kịch bản, chuyển thành giọng nói MP3 chuyên nghiệp (Hoài My, Nam Minh). Tùy chỉnh tốc độ và tải file tức thì.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-semibold text-indigo-400 flex items-center justify-between">
                    <span>Mở phòng thu</span>
                    <span>→</span>
                  </div>
                </div>

                {/* Tool: Video Dubbing */}
                <div
                  onClick={() => setActiveTab('dubbing')}
                  className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-purple-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🎬
                    </div>
                    <h3 className="font-bold text-sm text-white mt-4 group-hover:text-purple-400 transition-colors uppercase">
                      Lồng Tiếng Video AI Tự Động
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Whisper nhận diện lời thoại, tự động dịch tiếng Việt, ghép giọng đọc AI khớp mốc thời gian và hòa âm nhạc nền gốc.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-semibold text-purple-400 flex items-center justify-between">
                    <span>Mở lồng tiếng</span>
                    <span>→</span>
                  </div>
                </div>

                {/* Tool: Downloader */}
                <div
                  onClick={() => setActiveTab('downloader')}
                  className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-amber-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      📥
                    </div>
                    <h3 className="font-bold text-sm text-white mt-4 group-hover:text-amber-400 transition-colors uppercase">
                      Trình Tải Video Soda Reels & MinuteDrama
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Tải 1s/tập từ link trực tiếp CDN chuẩn H.264 xem ngay không lỗi, kèm chức năng tự động lướt tập & bóc tách cache máy ảo.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-semibold text-amber-400 flex items-center justify-between">
                    <span>Mở trình tải</span>
                    <span>→</span>
                  </div>
                </div>

                {/* Tool: Library */}
                <div
                  onClick={() => setActiveTab('library')}
                  className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-emerald-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      📁
                    </div>
                    <h3 className="font-bold text-sm text-white mt-4 group-hover:text-emerald-400 transition-colors uppercase">
                      Kho Video & Trình Chiếu
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Quản lý tất cả tập phim đã lưu trong máy, phát video trực tiếp trên trình phát web tích hợp, mở nhanh thư mục máy tính.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-semibold text-emerald-400 flex items-center justify-between">
                    <span>Mở kho video</span>
                    <span>→</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: 🎙️ PHÒNG THU GIỌNG ĐỌC AI (TTS STUDIO) */}
        {/* ======================================================== */}
        {activeTab === 'tts' && (
          <div className="space-y-6">
            
            <div className="glass-panel p-5 rounded-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🎙️ PHÒNG THU GIỌNG ĐỌC AI (TTS STUDIO) - StudioVDT</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Công cụ chuyển đổi kịch bản văn bản thành giọng đọc truyền cảm xúc bằng Edge-TTS. Hỗ trợ tạo file âm thanh MP3 review phim, video ngắn TikTok, Reels.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Script Input & Controls */}
              <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-5">
                
                {/* Script Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase text-slate-400">
                      1. Nhập Kịch Bản Cần Thu Âm:
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {ttsText.length} ký tự
                    </span>
                  </div>

                  {/* Sample Scripts Toolbar */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[11px] text-slate-400">Mẫu kịch bản:</span>
                    {SAMPLE_SCRIPTS.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setTtsText(s.text)}
                        className="px-2 py-0.5 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-brand-300 border border-slate-700 transition-all"
                      >
                        + {s.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows="7"
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Nhập hoặc dán văn bản kịch bản tại đây... Ví dụ: Chào mừng các bạn đã quay trở lại với bộ phim hôm nay..."
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors leading-relaxed"
                  ></textarea>
                </div>

                {/* Voice Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                      2. Giọng Đọc Tuyển Chọn:
                    </label>
                    <select
                      value={ttsVoice}
                      onChange={(e) => setTtsVoice(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                    >
                      {TTS_VOICES.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.flag} {v.name} ({v.desc})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                      3. Tốc Độ Nói (Rate):
                    </label>
                    <select
                      value={ttsRate}
                      onChange={(e) => setTtsRate(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                    >
                      <option value="-20%">0.8x (Chậm rãi, tâm trạng)</option>
                      <option value="-10%">0.9x (Hơi chậm)</option>
                      <option value="+0%">1.0x (Tốc độ chuẩn)</option>
                      <option value="+10%">1.1x (Nhanh nhẹn - Review)</option>
                      <option value="+20%">1.2x (Kịch tính, nhanh)</option>
                      <option value="+30%">1.3x (Rất nhanh)</option>
                    </select>
                  </div>
                </div>

                {/* Render Button */}
                <button
                  onClick={handleGenerateTTS}
                  disabled={ttsGenerating || !ttsText.trim()}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <span>{ttsGenerating ? '⏳' : '🎙️'}</span>
                  <span>{ttsGenerating ? 'Đang Thu Âm Giọng Đọc AI...' : 'Tạo Giọng Đọc AI Ngay (Render Audio)'}</span>
                </button>

              </div>

              {/* Right Column: Audio Output & Player */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                    <span>🎧 Nghe Thử & Tải File Âm Thanh</span>
                  </h3>

                  {ttsAudioResult ? (
                    <div className="space-y-4 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40">
                      <div className="text-xs text-indigo-300 font-semibold flex items-center gap-2">
                        <span>✅ Đã tạo file thành công:</span>
                        <span className="font-mono text-white text-[11px] truncate max-w-xs">{ttsAudioResult.filename}</span>
                      </div>

                      {/* HTML5 Audio Player */}
                      <audio
                        controls
                        src={ttsAudioResult.url}
                        className="w-full rounded-lg"
                      ></audio>

                      <div className="text-[11px] text-slate-400">
                        Dung lượng: <strong className="text-white">{formatBytes(ttsAudioResult.sizeBytes)}</strong>
                      </div>

                      <a
                        href={ttsAudioResult.url}
                        download={ttsAudioResult.filename}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <span>📥 Tải File MP3 Về Máy</span>
                      </a>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl space-y-2">
                      <div className="text-3xl">🎙️</div>
                      <div>Nhập kịch bản và nhấn <strong>Tạo Giọng Đọc AI Ngay</strong> để nghe thử file âm thanh tại đây.</div>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                  💡 <strong>Gợi ý:</strong> File MP3 tạo ra có thể dùng làm voiceover cho các video phim ngắn, review TikTok, Reels hoặc YouTube Shorts.
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: 🎬 LỒNG TIẾNG VIDEO AI TỰ ĐỘNG */}
        {/* ======================================================== */}
        {activeTab === 'dubbing' && (
          <div className="space-y-6">
            
            <div className="glass-panel p-5 rounded-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🎬 LỒNG TIẾNG VIDEO AI TỰ ĐỘNG (AI VIDEO DUBBING) - StudioVDT</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Quy trình tự động hóa: Bóc tách âm thanh video ➜ Faster-Whisper nhận diện lời thoại ➜ Dịch thuật sang tiếng Việt ➜ Edge-TTS tạo giọng đọc cảm xúc ➜ Khớp timeline ➜ Hòa âm Audio Ducking.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Form */}
              <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-5">
                
                {/* 1. Video Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                    1. Video Đầu Vào Cần Lồng Tiếng:
                  </label>
                  {dubbingTarget ? (
                    <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎬</span>
                        <div>
                          <div className="font-bold text-sm text-white">{dubbingTarget.name}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{dubbingTarget.path}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setDubbingTarget(null)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        Đổi video
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const parts = val.split('||');
                          setDubbingTarget({ name: parts[0], path: parts[1] });
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                        defaultValue=""
                      >
                        <option value="" disabled>-- Chọn video từ Kho Phim đã tải --</option>
                        {status?.localDramas?.map(d => (
                          <optgroup key={d.name} label={d.name}>
                            {d.videos?.map(v => (
                              <option key={v.path} value={`${d.name} - ${v.filename}||${v.path}`}>
                                {v.filename} ({v.sizeFormatted})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500">
                        Hoặc chuyển sang tab <strong>KHO VIDEO</strong> rồi bấm nút "🎙️ Lồng Tiếng" trên tập phim mong muốn.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Voice & Tone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                      2. Giọng Đọc Lồng Tiếng:
                    </label>
                    <select
                      value={dubVoice}
                      onChange={(e) => setDubVoice(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                    >
                      <option value="vi-VN-HoaiMyNeural">👩 Hoài My (Nữ nhẹ nhàng, truyền cảm - Phim tâm lý)</option>
                      <option value="vi-VN-NamMinhNeural">👨 Nam Minh (Nam trầm ấm, chuẩn phát thanh - Phim hành động)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                      3. Tốc Độ Nói (Rate):
                    </label>
                    <select
                      value={dubSpeed}
                      onChange={(e) => setDubSpeed(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                    >
                      <option value="-10%">0.9x (Hơi chậm)</option>
                      <option value="+0%">1.0x (Tốc độ chuẩn)</option>
                      <option value="+10%">1.1x (Nhanh nhẹn)</option>
                      <option value="+20%">1.2x (Kịch tính)</option>
                    </select>
                  </div>
                </div>

                {/* 3. AI Whisper Model & BGM Volume */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                      4. Model Whisper Nhận Dạng:
                    </label>
                    <select
                      value={dubModel}
                      onChange={(e) => setDubModel(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                    >
                      <option value="tiny">tiny (Siêu nhanh, ít RAM)</option>
                      <option value="base">base (Khuyên dùng - Cân bằng tốt)</option>
                      <option value="small">small (Chính xác cao hơn)</option>
                      <option value="medium">medium (Rất chính xác)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                      5. Âm Lượng Nhạc Nền Gốc (Ducking):
                    </label>
                    <select
                      value={dubBgmVol}
                      onChange={(e) => setDubBgmVol(parseFloat(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                    >
                      <option value="0.10">10% (Nhạc nền rất nhỏ)</option>
                      <option value="0.15">15% (Chuẩn phim truyền hình)</option>
                      <option value="0.25">25% (Nhạc nền vừa phải)</option>
                      <option value="0.35">35% (Nhạc nền lớn)</option>
                    </select>
                  </div>
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStartDubbing}
                  disabled={!!dubJobId || !dubbingTarget}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <span>{dubJobId ? '⏳' : '🚀'}</span>
                  <span>{dubJobId ? 'Đang Xử Lý Lồng Tiếng AI...' : 'Bắt Đầu Lồng Tiếng Video Tự Động'}</span>
                </button>

              </div>

              {/* Right Column: Status & Realtime Progress */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                    <span>⚙️ Tiến Trình Xử Lý AI</span>
                  </h3>

                  {dubProgress ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                        <span>{dubProgress.step || 'Đang tiến hành...'}</span>
                        <span>{dubProgress.percent || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${dubProgress.percent || 0}%` }}
                        ></div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                        <div>Trạng thái: <strong className="text-white">{dubProgress.status}</strong></div>
                        {dubProgress.message && <div className="text-slate-400">{dubProgress.message}</div>}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                      Chưa có tiến trình lồng tiếng nào đang chạy.
                    </div>
                  )}
                </div>

                {dubResultVideo && (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                    <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                      <span>🎉</span>
                      <span>Video Đã Lồng Tiếng Sẵn Sàng!</span>
                    </div>
                    <div className="text-xs text-slate-300 truncate">
                      File: {dubResultVideo.replace(/^.*[\\\/]/, '')}
                    </div>
                    <button
                      onClick={() => {
                        const parts = dubResultVideo.split(/[\\\/]/);
                        const fileName = parts.pop();
                        const subFolder = parts.pop();
                        const dramaFolder = parts.pop();
                        setVideoModal({
                          title: `Video Lồng Tiếng - ${fileName}`,
                          url: `/video/${encodeURIComponent(dramaFolder)}/${encodeURIComponent(subFolder)}/${encodeURIComponent(fileName)}`
                        });
                      }}
                      className="w-full py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>▶️ Phát Video Lồng Tiếng</span>
                    </button>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: 📥 TRÌNH TẢI VIDEO SODA REELS & MINUTEDRAMA */}
        {/* ======================================================== */}
        {activeTab === 'downloader' && (
          <div className="space-y-6">
            
            {/* Header & Sub-tab Switcher */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📥 TRÌNH TẢI VIDEO SODA REELS & MINUTEDRAMA</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Hai chế độ tải mạnh mẽ: Tải trực tiếp siêu tốc 1s/tập từ link CDN hoặc Tự động lướt & bóc tách cache từ giả lập Android.
                </p>
              </div>

              {/* Sub-tab Switcher Buttons */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setDownloaderSubTab('direct')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    downloaderSubTab === 'direct'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>⚡ Tải Trực Tiếp CDN (1s/tập)</span>
                </button>
                <button
                  onClick={() => setDownloaderSubTab('cache')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    downloaderSubTab === 'cache'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🔄 Quét Cache Giả Lập & Lướt Tập</span>
                </button>
              </div>
            </div>

            {/* --- SUB-TAB A: DIRECT CDN DOWNLOADER --- */}
            {downloaderSubTab === 'direct' && (
              <div className="space-y-5">
                
                {/* Actions Toolbar */}
                <div className="glass-panel p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchDirectEpisodes()}
                      disabled={directLoading}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      <span>🔄</span>
                      <span>{directLoading ? 'Đang đọc...' : 'Quét Lại Database Phim'}</span>
                    </button>
                  </div>

                  {directEpisodes && directEpisodes.episodes && directEpisodes.episodes.length > 0 && (
                    <button
                      onClick={handleDownloadAllDirect}
                      disabled={batchDownloading}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
                    >
                      <span>{batchDownloading ? '⏳' : '🚀'}</span>
                      <span>{batchDownloading ? `Đang Tải (Tập ${batchProgress.activeEp}/${batchProgress.total})...` : 'Tải Tự Động Toàn Bộ Các Tập (1-2s / tập)'}</span>
                    </button>
                  )}
                </div>

                {/* Batch Download Progress Bar */}
                {batchDownloading && (
                  <div className="glass-card p-4 rounded-2xl border border-amber-500/30">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-2">
                      <span>Đang tải hàng loạt: Tập {batchProgress.activeEp} / {batchProgress.total}</span>
                      <span>{batchProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${batchProgress.percent}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Codec Selection Notice */}
                <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-l-4 border-l-emerald-500">
                  <div className="text-xs">
                    <span className="font-bold text-emerald-400 text-sm block">💡 Chọn Chuẩn Video Khi Tải:</span>
                    <span className="text-slate-300">
                      Chuẩn <strong>H.264 (AVC)</strong> mở được ngay trên mọi máy tính Windows Media Player mà không bao giờ bị lỗi <code>0xC00D36C4</code>.
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700">
                    <button
                      onClick={() => setSelectedCodec('h264')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedCodec === 'h264'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🟢 H.264 (Chuẩn Windows)
                    </button>
                    <button
                      onClick={() => setSelectedCodec('h265')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedCodec === 'h265'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔵 H.265 (HEVC Gốc)
                    </button>
                  </div>
                </div>

                {/* Episodes Grid */}
                {directEpisodes ? (
                  <div className="space-y-4">
                    <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎬</span>
                        <div>
                          <h3 className="font-bold text-base text-white">{directEpisodes.title}</h3>
                          <p className="text-xs text-slate-400">
                            Tổng cộng: <strong className="text-white">{directEpisodes.totalEpisodes || directEpisodes.episodes.length}</strong> tập có sẵn link trực tiếp
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        Lưu tại: <code className="text-brand-300">Soda_Reels_Videos/{directEpisodes.title}/</code>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {directEpisodes.episodes.map((ep) => {
                        const activeUrl = (selectedCodec === 'h264' && ep.directUrlH264) ? ep.directUrlH264 : ep.directUrl;
                        let isDownloaded = false;
                        if (status?.localDramas) {
                          const matched = status.localDramas.find(d => 
                            d.name.toLowerCase().includes(directEpisodes.title.toLowerCase()) || 
                            directEpisodes.title.toLowerCase().includes(d.name.toLowerCase())
                          );
                          if (matched && matched.videos) {
                            const epPadded = `Tap_${String(ep.epNumber).padStart(2, '0')}.mp4`;
                            isDownloaded = matched.videos.some(v => v.filename === epPadded);
                          }
                        }

                        return (
                          <div
                            key={ep.epNumber}
                            className={`glass-card p-3 rounded-xl border flex flex-col justify-between transition-all ${
                              isDownloaded ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-sm text-white">Tập {ep.epNumber}</span>
                                {isDownloaded ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Đã tải
                                  </span>
                                ) : ep.isVip ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">VIP</span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Free</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                ⏱️ {formatDuration(ep.duration)}
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
                              <button
                                onClick={() => handleDownloadDirectSingle(ep)}
                                title="Tải nhanh 1-2s về máy tính"
                                className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-1"
                              >
                                <span>⚡</span>
                                <span>{isDownloaded ? 'Tải Lại' : 'Tải 1s'}</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(activeUrl);
                                  showToast(`Đã copy link CDN Tập ${ep.epNumber}!`, 'success');
                                }}
                                title="Copy link CDN"
                                className="p-1 px-2 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                              >
                                📋
                              </button>

                              <a
                                href={activeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Mở xem trực tiếp link CDN"
                                className="p-1 px-2 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                              >
                                🌐
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                    <div className="text-4xl">🎭</div>
                    <h3 className="font-bold text-lg text-white mt-3">Chưa Tìm Thấy Dữ Liệu Link Trực Tiếp</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Hãy mở một bộ phim bất kỳ trên ứng dụng <strong>MinuteDrama</strong> trong máy ảo LDPlayer/Nox, sau đó nhấn nút <strong>Quét Lại Database Phim</strong> phía trên.
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* --- SUB-TAB B: EMULATOR CACHE & AUTO-SWIPE --- */}
            {downloaderSubTab === 'cache' && (
              <div className="space-y-5">
                
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-base text-white">Quét Cache Giả Lập & Tự Động Lướt Tập</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Bắt video tạm từ máy ảo Android LDPlayer/Nox. Xuất file an toàn khi đã cache 100%.</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleExportCache}
                        disabled={loading || !status?.remoteCacheCount}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <span>📥</span>
                        <span>{loading ? 'Đang xuất video...' : `Xuất Tất Cả (${status?.remoteCacheCount || 0} tập) Về Máy`}</span>
                      </button>

                      <button
                        onClick={handleDeleteRemoteCache}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-all"
                      >
                        <span>🗑️</span>
                        <span>Dọn Sạch Cache Máy Ảo</span>
                      </button>
                    </div>
                  </div>

                  {/* Auto Swipe Controls */}
                  <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                    <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <span>📱 Tự Động Lướt Tập:</span>
                      {autoSwipeStatus?.isRunning && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                          Đang chạy ({autoSwipeStatus.currentCount}/{autoSwipeStatus.totalCount})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Số tập:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={autoSwipeTotal}
                        onChange={(e) => setAutoSwipeTotal(e.target.value)}
                        className="w-20 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Giây/tập:</span>
                      <input
                        type="number"
                        min="3"
                        max="120"
                        value={autoSwipeDelay}
                        onChange={(e) => setAutoSwipeDelay(e.target.value)}
                        className="w-20 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <button
                        onClick={handleToggleAutoSwipe}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          autoSwipeStatus?.isRunning
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        <span>{autoSwipeStatus?.isRunning ? '⏹️ Dừng Lướt Tập' : '▶️ Bắt Đầu Tự Động Lướt'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remote Cache Table */}
                {status?.remoteList && status.remoteList.length > 0 ? (
                  <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
                    <div className="divide-y divide-slate-800/80">
                      {status.remoteList.map((item, idx) => (
                        <div key={idx} className="px-5 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-brand-400">
                              {item.suggestedEp ? `T${item.suggestedEp}` : `#${idx+1}`}
                            </span>
                            <div>
                              <div className="font-semibold text-sm text-white flex items-center gap-2">
                                <span>{item.suggestedEp ? `Tập ${item.suggestedEp}` : item.name}</span>
                                {item.isAlreadyExported && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                                    Đã tải vào máy
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                Dung lượng: <strong className="text-slate-300">{item.sizeFormatted}</strong>
                                {item.percentComplete < 100 && (
                                  <span className="text-amber-400 ml-2 font-medium">
                                    (Đang cache: {item.percentComplete}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              showToast(`Đang xuất Tập ${item.suggestedEp}...`, 'info');
                              try {
                                const res = await fetch('/api/export-single', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    remotePath: item.path,
                                    dramaName: status?.currentDrama?.title || 'Bo_Phim_Moi',
                                    epNum: item.suggestedEp
                                  })
                                });
                                const data = await res.json();
                                showToast(`✅ Đã xuất Tập ${item.suggestedEp} về máy!`, 'success');
                                fetchStatus();
                              } catch (e) {
                                showToast('Lỗi xuất tập đơn', 'error');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all"
                          >
                            Tải Về Máy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel p-10 text-center rounded-2xl border border-slate-800">
                    <div className="text-3xl">💤</div>
                    <div className="text-sm font-bold text-white mt-2">Chưa Có Video Trong Cache Giả Lập</div>
                    <p className="text-xs text-slate-400 mt-1">Mở video trên app giả lập hoặc bật Tự Động Lướt Tập để video tải vào cache.</p>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: 📁 KHO VIDEO & TRÌNH CHIẾU */}
        {/* ======================================================== */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📁 KHO VIDEO & TRÌNH CHIẾU</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Thư mục lưu trữ: <code className="text-brand-300">Soda_Reels_Videos/</code>. Xem video trực tiếp trên web không lo lỗi thiếu codec.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenFolder(selectedDramaName || '')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                >
                  <span>📂</span>
                  <span>Mở Trong Windows Explorer</span>
                </button>
                <button
                  onClick={fetchStatus}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  🔄 Làm Mới
                </button>
              </div>
            </div>

            {status?.localDramas && status.localDramas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Left: Drama Series Selector */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Danh Sách Bộ Phim ({status.localDramas.length})
                  </span>
                  {status.localDramas.map((drama) => {
                    const isSelected = selectedDramaName === drama.name;
                    return (
                      <div
                        key={drama.name}
                        onClick={() => setSelectedDramaName(drama.name)}
                        className={`p-3 rounded-xl cursor-pointer border transition-all ${
                          isSelected
                            ? 'bg-brand-600/20 border-brand-500/50 text-white shadow-md'
                            : 'glass-card border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-sm truncate">{drama.name}</div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                          <span>{drama.videos ? drama.videos.length : 0} tập phim</span>
                          <span className="text-[10px] text-brand-300 font-semibold">Xem chi tiết →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Videos inside selected drama */}
                <div className="md:col-span-3 space-y-4">
                  {(() => {
                    const activeDrama = status.localDramas.find(d => d.name === selectedDramaName) || status.localDramas[0];
                    if (!activeDrama) return null;

                    return (
                      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-white">{activeDrama.name}</h3>
                            <p className="text-xs text-slate-400">
                              Đã tải: <strong>{activeDrama.videos ? activeDrama.videos.length : 0}</strong> tập phim
                            </p>
                          </div>
                          <button
                            onClick={() => handleOpenFolder(activeDrama.name)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            📂 Mở Thư Mục Phim
                          </button>
                        </div>

                        {activeDrama.videos && activeDrama.videos.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {activeDrama.videos.map((vid, idx) => (
                              <div
                                key={idx}
                                className="glass-card p-3 rounded-xl border border-slate-800 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-white">{vid.filename}</span>
                                    {vid.isDubbed && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        🎙️ Đã lồng tiếng
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400 mt-1">
                                    Dung lượng: <span className="text-slate-300">{vid.sizeFormatted}</span>
                                  </div>
                                </div>

                                <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center gap-2">
                                  <button
                                    onClick={() => setVideoModal({
                                      title: `${activeDrama.name} - ${vid.filename}`,
                                      url: `/video/${encodeURIComponent(activeDrama.name)}/${encodeURIComponent(vid.filename)}`
                                    })}
                                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all flex items-center justify-center gap-1"
                                  >
                                    <span>▶️</span>
                                    <span>Phát Video</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setDubbingTarget({
                                        name: `${activeDrama.name} - ${vid.filename}`,
                                        path: vid.path
                                      });
                                      setActiveTab('dubbing');
                                    }}
                                    title="Chuyển video này sang Lồng Tiếng AI"
                                    className="py-1.5 px-3 rounded-lg text-xs font-bold bg-purple-600/30 hover:bg-purple-600 text-purple-200 border border-purple-500/40 transition-all flex items-center gap-1"
                                  >
                                    <span>🎙️</span>
                                    <span>Lồng Tiếng</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            Chưa có tập phim nào trong bộ phim này.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

              </div>
            ) : (
              <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                <div className="text-4xl">📁</div>
                <h3 className="font-bold text-lg text-white mt-3">Kho Video Trống</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Bạn chưa tải tập phim nào về máy tính. Hãy chuyển sang tab <strong>TRÌNH TẢI VIDEO</strong> để bắt đầu tải!
                </p>
                <button
                  onClick={() => setActiveTab('downloader')}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all"
                >
                  📥 Chuyển Sang Trình Tải Video
                </button>
              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: ⚙️ CÀI ĐẶT HỆ THỐNG */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            
            {/* ADB Setup */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📱 Kết Nối Thiết Bị Giả Lập Android (ADB)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Nhập địa chỉ IP và cổng của giả lập LDPlayer, NoxPlayer, hoặc BlueStacks để kết nối.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={adbHostInput}
                  onChange={(e) => setAdbHostInput(e.target.value)}
                  placeholder="127.0.0.1:5555"
                  className="w-full sm:w-80 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                />
                <button
                  onClick={handleConnectAdb}
                  disabled={adbConnecting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md"
                >
                  {adbConnecting ? 'Đang kết nối...' : '⚡ Kết Nối ADB Ngay'}
                </button>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <div>• Cổng mặc định LDPlayer 9: <code>127.0.0.1:5555</code></div>
                <div>• Cổng mặc định NoxPlayer: <code>127.0.0.1:62001</code></div>
                <div>• Cổng mặc định BlueStacks: <code>127.0.0.1:5554</code></div>
              </div>
            </div>

            {/* Error 0xC00D36C4 Guide */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>💡 Hướng Dẫn Khắc Phục Lỗi 0xC00D36C4 Trên Windows Media Player</span>
              </h2>
              
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  <strong>Nguyên nhân:</strong> Khi bạn mở file video MP4 trên máy tính bằng Windows Media Player và gặp lỗi 
                  <code className="text-rose-400 mx-1">0xC00D36C4 (file type unsupported or corrupt)</code>, 
                  nguyên nhân là do video đó được encode bằng chuẩn nén <strong>HEVC (H.265)</strong> mà Windows 10/11 mặc định không cài sẵn codec HEVC.
                </p>
                
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm">3 Cách Khắc Phục Đơn Giản Nhất:</div>
                  <div className="space-y-1.5 text-slate-300">
                    <div>
                      ✅ <strong>Cách 1 (Khuyên dùng):</strong> Trong tab <strong>TRÌNH TẢI VIDEO</strong> của tool, luôn chọn nút <strong className="text-emerald-400">🟢 H.264 (Chuẩn Windows)</strong>. Tool sẽ tự động lấy link H.264 bản chuẩn để mở ngay trên Windows Media Player mà không bao giờ bị lỗi!
                    </div>
                    <div>
                      ✅ <strong>Cách 2:</strong> Xem video trực tiếp trong tab <strong>KHO VIDEO</strong> trên giao diện web của tool. Trình phát web đã tích hợp bộ giải mã tương thích.
                    </div>
                    <div>
                      ✅ <strong>Cách 3:</strong> Khi bạn đưa video vào <strong>LỒNG TIẾNG VIDEO AI</strong>, hệ thống sẽ tự động re-encode xuất ra file chuẩn H.264 hoàn hảo.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Docker Guide */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🐳 Chạy Ứng Dụng Bằng Docker</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Để chạy toàn bộ hệ thống (bao gồm Node.js, Python Faster-Whisper, FFmpeg, Edge-TTS) trong một môi trường cô lập không cần cài đặt phần mềm phụ trợ, bạn chỉ cần chạy:
              </p>
              <div className="p-3 rounded-xl bg-slate-900 text-xs font-mono text-brand-300 border border-slate-800">
                Double click vào file <strong>CHAY_DOCKER.bat</strong> hoặc chạy lệnh <code>docker compose up -d</code>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* --- VIDEO PLAYER MODAL --- */}
      {videoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white truncate max-w-lg">{videoModal.title}</h3>
              <button
                onClick={() => setVideoModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-black flex justify-center">
              <video
                src={videoModal.url}
                controls
                autoPlay
                className="max-h-[70vh] w-auto rounded-lg"
              >
                Trình duyệt không hỗ trợ phát video này.
              </video>
            </div>
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="mt-auto border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Video Dynamic Toolkit • Tích Hợp Soda Reels, MinuteDrama & StudioVDT AI Suite • 2026
      </footer>

    </div>
  );
}

// Render React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
