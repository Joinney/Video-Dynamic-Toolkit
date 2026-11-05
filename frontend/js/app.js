const {
  useState,
  useEffect,
  useRef
} = React;

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

// --- Main App Component ---
function App() {
  const [activeTab, setActiveTab] = useState('home');
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
  const [autoSwipeStatus, setAutoSwipeStatus] = useState({
    isRunning: false
  });

  // Direct batch download state
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    activeEp: 0,
    percent: 0
  });

  // Dubbing studio state
  const [dubbingTarget, setDubbingTarget] = useState(null);
  const [dubVoice, setDubVoice] = useState('vi-VN-HoaiMyNeural');
  const [dubSpeed, setDubSpeed] = useState('+0%');
  const [dubModel, setDubModel] = useState('base');
  const [dubBgmVol, setDubBgmVol] = useState(0.15);
  const [dubJobId, setDubJobId] = useState(null);
  const [dubProgress, setDubProgress] = useState(null);
  const [dubResultVideo, setDubResultVideo] = useState(null);

  // Library state
  const [selectedDramaName, setSelectedDramaName] = useState(null);

  // ADB Connect input
  const [adbHostInput, setAdbHostInput] = useState('127.0.0.1:5555');
  const [adbConnecting, setAdbConnecting] = useState(false);
  const showToast = (message, type = 'info') => {
    setToast({
      message,
      type
    });
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

  // Fetch direct episodes from MinuteDrama
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          host: adbHostInput
        })
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
  const handleSwitchApp = async app => {
    try {
      const res = await fetch('/api/set-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app
        })
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
  const handleDownloadDirectSingle = async ep => {
    const url = selectedCodec === 'h264' && ep.directUrlH264 ? ep.directUrlH264 : ep.directUrl;
    if (!url) {
      showToast('Không tìm thấy link cho tập này!', 'error');
      return;
    }
    showToast(`⚡ Đang tải Tập ${ep.epNumber} từ CDN... (chỉ 1-2s)`, 'info');
    try {
      const res = await fetch('/api/download-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
    setBatchProgress({
      current: 0,
      total: episodes.length,
      activeEp: 0,
      percent: 0
    });
    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      const url = selectedCodec === 'h264' && ep.directUrlH264 ? ep.directUrlH264 : ep.directUrl;
      setBatchProgress({
        current: i + 1,
        total: episodes.length,
        activeEp: ep.epNumber,
        percent: Math.round((i + 1) / episodes.length * 100)
      });
      try {
        await fetch('/api/download-direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dramaName
        })
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

  // Auto Swipe Start / Stop
  const handleToggleAutoSwipe = async () => {
    if (autoSwipeStatus && autoSwipeStatus.isRunning) {
      await fetch('/api/auto-swipe/stop', {
        method: 'POST'
      });
      showToast('Đã dừng tự động lướt tập', 'info');
      fetchAutoSwipeStatus();
    } else {
      const res = await fetch('/api/auto-swipe/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          total: parseInt(autoSwipeTotal, 10),
          delay: parseInt(autoSwipeDelay, 10)
        })
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
      await fetch('/api/delete-remote', {
        method: 'POST'
      });
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folder: folderName
        })
      });
      showToast('Đã mở thư mục trên máy tính', 'info');
    } catch (e) {}
  };

  // Start dubbing
  const handleStartDubbing = async () => {
    if (!dubbingTarget) {
      showToast('Vui lòng chọn video cần lồng tiếng!', 'error');
      return;
    }
    showToast('🚀 Bắt đầu tiến trình lồng tiếng AI...', 'info');
    try {
      const res = await fetch('/api/dub-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoPath: dubbingTarget.path,
          voice: dubVoice,
          rate: dubSpeed,
          whisperModel: dubModel,
          bgmVolume: parseFloat(dubBgmVol)
        })
      });
      const data = await res.json();
      if (data.success && data.jobId) {
        setDubJobId(data.jobId);
        setDubProgress({
          status: 'running',
          percent: 5,
          step: 'Khởi động pipeline lồng tiếng...'
        });
      } else {
        showToast(`Lỗi: ${data.message}`, 'error');
      }
    } catch (e) {
      showToast('Lỗi gửi yêu cầu lồng tiếng', 'error');
    }
  };

  // Total stats calculations
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
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col min-h-screen"
  }, toast && /*#__PURE__*/React.createElement("div", {
    className: `fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold transition-all transform animate-bounce ${toast.type === 'success' ? 'bg-emerald-600/95 text-white border border-emerald-400/40' : toast.type === 'error' ? 'bg-rose-600/95 text-white border border-rose-400/40' : 'bg-slate-800/95 text-brand-300 border border-brand-500/30'}`
  }, /*#__PURE__*/React.createElement("span", null, toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'), /*#__PURE__*/React.createElement("span", null, toast.message)), /*#__PURE__*/React.createElement("header", {
    className: "sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 cursor-pointer",
    onClick: () => setActiveTab('home')
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-brand-500/25"
  }, "⚡"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-300 bg-clip-text text-transparent"
  }, "Video Dynamic Toolkit"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "Soda Reels & MinuteDrama"), /*#__PURE__*/React.createElement("span", {
    className: "w-1 h-1 rounded-full bg-slate-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-brand-400 font-medium"
  }, "StudioVDT AI")))), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSwitchApp('auto'),
    className: `px-3 py-1 rounded-lg text-xs font-semibold transition-all ${status?.currentAppMode === 'auto' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`
  }, "🤖 Tự Động"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSwitchApp('minutedrama'),
    className: `px-3 py-1 rounded-lg text-xs font-semibold transition-all ${status?.currentAppMode === 'minutedrama' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`
  }, "🎭 MinuteDrama"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSwitchApp('sodareels'),
    className: `px-3 py-1 rounded-lg text-xs font-semibold transition-all ${status?.currentAppMode === 'sodareels' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`
  }, "🥤 Soda Reels")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isConnected ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' : 'bg-rose-950/40 text-rose-400 border-rose-500/30'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-rose-500'}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, isConnected ? status.deviceName : 'Chưa có ADB')), !isConnected && /*#__PURE__*/React.createElement("button", {
    onClick: handleConnectAdb,
    disabled: adbConnecting,
    className: "px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-all"
  }, adbConnecting ? '...' : 'Kết nối'))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 overflow-x-auto"
  }, /*#__PURE__*/React.createElement("nav", {
    className: "flex space-x-1 py-2"
  }, [{
    id: 'home',
    label: 'Trang Chủ',
    icon: '🏠',
    badge: null
  }, {
    id: 'direct',
    label: 'Tải Trực Tiếp CDN',
    icon: '⚡',
    badge: directEpisodes ? `${directEpisodes.totalEpisodes || directEpisodes.episodes.length} tập` : null
  }, {
    id: 'cache',
    label: 'Giả Lập & Quét Cache',
    icon: '🔄',
    badge: status?.remoteCacheCount ? `${status.remoteCacheCount}` : null
  }, {
    id: 'library',
    label: 'Kho Phim & Video',
    icon: '🎬',
    badge: totalLocalVideos ? `${totalLocalVideos}` : null
  }, {
    id: 'dubbing',
    label: 'Studio Lồng Tiếng AI',
    icon: '🎙️',
    badge: dubJobId ? 'Đang chạy' : null
  }, {
    id: 'settings',
    label: 'Cài Đặt & Hướng Dẫn',
    icon: '⚙️',
    badge: null
  }].map(tab => {
    const isActive = activeTab === tab.id;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      onClick: () => setActiveTab(tab.id),
      className: `flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${isActive ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, tab.icon), /*#__PURE__*/React.createElement("span", null, tab.label), tab.badge && /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-brand-500/20 text-brand-300'}`
    }, tab.badge));
  })))), /*#__PURE__*/React.createElement("main", {
    className: "flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6"
  }, activeTab === 'home' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-brand-950 p-6 md:p-8 border border-slate-800 shadow-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-600/10 to-transparent pointer-events-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10 max-w-2xl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block px-3 py-1 rounded-full text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30 mb-3"
  }, "🚀 Video Dynamic Toolkit v2.0"), /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl md:text-3xl font-extrabold text-white tracking-tight"
  }, "Trung Tâm Tải Phim Ngắn & Phòng Lồng Tiếng AI"), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-sm text-slate-300 leading-relaxed"
  }, "Tải cả bộ phim siêu tốc 1-2s/tập từ link CDN trực tiếp, quét bộ nhớ đệm giả lập Android, phát mượt mà chuẩn H.264 và tự động lồng tiếng tiếng Việt bằng công nghệ AI từ StudioVDT."), /*#__PURE__*/React.createElement("div", {
    className: "mt-5 flex flex-wrap items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveTab('direct'),
    className: "px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all"
  }, /*#__PURE__*/React.createElement("span", null, "⚡ Tải Trực Tiếp Cả Bộ (1s/tập)")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveTab('dubbing'),
    className: "px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-all"
  }, /*#__PURE__*/React.createElement("span", null, "🎙️ Studio Lồng Tiếng AI")), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleOpenFolder(),
    className: "px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-800 transition-all"
  }, "📂 Mở Thư Mục Video")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "glass-card p-4 rounded-2xl flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-slate-400"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold uppercase tracking-wider"
  }, "Giả Lập Android"), /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "📱")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `text-xl font-bold ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`
  }, isConnected ? 'Đã Kết Nối' : 'Chưa Kết Nối'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5 truncate"
  }, isConnected ? status.deviceName : 'Cổng 127.0.0.1:5555'))), /*#__PURE__*/React.createElement("div", {
    className: "glass-card p-4 rounded-2xl flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-slate-400"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold uppercase tracking-wider"
  }, "Phim Đang Xem"), /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "🎭")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold text-white truncate"
  }, currentDrama ? currentDrama.title : 'Chưa có phim'), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5"
  }, currentDrama ? `Tập ${currentDrama.currentEpisode || 1} / ${currentDrama.totalEpisodes || '?'}` : 'Mở app trên máy ảo'))), /*#__PURE__*/React.createElement("div", {
    className: "glass-card p-4 rounded-2xl flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-slate-400"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold uppercase tracking-wider"
  }, "Kho Video Đã Tải"), /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "💾")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold text-brand-400"
  }, totalLocalVideos, " Tập Phim"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5"
  }, totalLocalDramas, " Bộ phim đã lưu trữ"))), /*#__PURE__*/React.createElement("div", {
    className: "glass-card p-4 rounded-2xl flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-slate-400"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold uppercase tracking-wider"
  }, "Đã Lồng Tiếng AI"), /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "🎙️")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-bold text-purple-400"
  }, totalDubbedVideos, " Tập Lồng Tiếng"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Giọng đọc tiếng Việt StudioVDT")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-base font-bold text-slate-300 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🛠️ Các Công Cụ Chính"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-normal text-slate-500"
  }, "(Bấm vào từng thẻ để mở trang công cụ riêng)")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setActiveTab('direct'),
    className: "glass-card p-5 rounded-2xl cursor-pointer group hover:border-brand-500/50 transition-all flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
  }, "⚡"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-base text-white mt-4 group-hover:text-amber-400 transition-colors"
  }, "Tải Trực Tiếp CDN (1s/tập)"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-2 leading-relaxed"
  }, "Lấy toàn bộ danh sách tập từ database. Tải trực tiếp siêu tốc qua CDN không cần chờ máy ảo tua. Chuẩn H.264 xem ngay không lỗi.")), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-3 border-t border-slate-800 text-xs font-semibold text-amber-400 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "Mở công cụ tải"), /*#__PURE__*/React.createElement("span", {
    className: "group-hover:translate-x-1 transition-transform"
  }, "→"))), /*#__PURE__*/React.createElement("div", {
    onClick: () => setActiveTab('cache'),
    className: "glass-card p-5 rounded-2xl cursor-pointer group hover:border-blue-500/50 transition-all flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
  }, "🔄"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-base text-white mt-4 group-hover:text-blue-400 transition-colors"
  }, "Giả Lập & Quét Cache"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-2 leading-relaxed"
  }, "Tự động lướt tập trên Android emulator, nhận diện tập thông minh tránh bị ngược tập 1 và 3, xuất video an toàn khi đã cache 100%.")), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-3 border-t border-slate-800 text-xs font-semibold text-blue-400 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "Mở quét cache"), /*#__PURE__*/React.createElement("span", {
    className: "group-hover:translate-x-1 transition-transform"
  }, "→"))), /*#__PURE__*/React.createElement("div", {
    onClick: () => setActiveTab('dubbing'),
    className: "glass-card p-5 rounded-2xl cursor-pointer group hover:border-purple-500/50 transition-all flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
  }, "🎙️"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-base text-white mt-4 group-hover:text-purple-400 transition-colors"
  }, "Studio Lồng Tiếng AI"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-2 leading-relaxed"
  }, "Tích hợp từ dự án StudioVDT: Whisper nhận diện lời thoại, tự dịch sang tiếng Việt, lồng tiếng cảm xúc bằng Edge-TTS và trộn âm thanh.")), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-3 border-t border-slate-800 text-xs font-semibold text-purple-400 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "Mở phòng lồng tiếng"), /*#__PURE__*/React.createElement("span", {
    className: "group-hover:translate-x-1 transition-transform"
  }, "→"))))), directEpisodes && /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, directEpisodes.coverUrl ? /*#__PURE__*/React.createElement("img", {
    src: directEpisodes.coverUrl,
    alt: "Cover",
    className: "w-16 h-22 object-cover rounded-xl shadow-md border border-slate-700"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-22 rounded-xl bg-slate-800 flex items-center justify-center text-2xl border border-slate-700"
  }, "🎬"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-amber-400 uppercase tracking-wider"
  }, "Phim Sẵn Sàng Tải Trực Tiếp"), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-white mt-0.5"
  }, directEpisodes.title), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, "Tổng số: ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-white"
  }, directEpisodes.totalEpisodes || directEpisodes.episodes.length), " tập phim có link CDN"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 w-full md:w-auto"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveTab('direct'),
    className: "flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md"
  }, "⚡ Xem Danh Sách & Tải Ngay")))), activeTab === 'direct' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "⚡ Tải Phim Siêu Tốc Từ Link Trực Tiếp CDN")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, "Bắt link trực tiếp từ database MinuteDrama. Tải toàn bộ tập phim chỉ mất 1-2 giây / tập (tốc độ ~35-50 Mbps).")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => fetchDirectEpisodes(),
    disabled: directLoading,
    className: "px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
  }, /*#__PURE__*/React.createElement("span", null, "🔄"), /*#__PURE__*/React.createElement("span", null, directLoading ? 'Đang đọc...' : 'Quét Lại Database')), directEpisodes && directEpisodes.episodes && directEpisodes.episodes.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: handleDownloadAllDirect,
    disabled: batchDownloading,
    className: "px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
  }, /*#__PURE__*/React.createElement("span", null, batchDownloading ? '⏳' : '🚀'), /*#__PURE__*/React.createElement("span", null, batchDownloading ? `Đang Tải (Tập ${batchProgress.activeEp}/${batchProgress.total})...` : 'Tải Toàn Bộ Các Tập (1-2s / tập)')))), batchDownloading && /*#__PURE__*/React.createElement("div", {
    className: "glass-card p-4 rounded-2xl border border-amber-500/30"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-xs font-bold text-amber-400 mb-2"
  }, /*#__PURE__*/React.createElement("span", null, "Đang tải hàng loạt: Tập ", batchProgress.activeEp, " / ", batchProgress.total), /*#__PURE__*/React.createElement("span", null, batchProgress.percent, "%")), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-slate-800 rounded-full h-3 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300 rounded-full",
    style: {
      width: `${batchProgress.percent}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "glass-card p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-l-4 border-l-emerald-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-emerald-400 text-sm block"
  }, "💡 Chọn Chuẩn Video Khi Tải:"), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-300"
  }, "Chuẩn ", /*#__PURE__*/React.createElement("strong", null, "H.264 (AVC)"), " mở được ngay trên mọi máy tính Windows Media Player mà không bao giờ bị lỗi ", /*#__PURE__*/React.createElement("code", null, "0xC00D36C4"), ".")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedCodec('h264'),
    className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCodec === 'h264' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`
  }, "🟢 H.264 (Chuẩn Windows)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedCodec('h265'),
    className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCodec === 'h265' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`
  }, "🔵 H.265 (HEVC Gốc)"))), directEpisodes ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-4 rounded-2xl flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "🎬"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-base text-white"
  }, directEpisodes.title), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Tổng cộng: ", /*#__PURE__*/React.createElement("strong", {
    className: "text-white"
  }, directEpisodes.totalEpisodes || directEpisodes.episodes.length), " tập có sẵn link trực tiếp"))), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400"
  }, "Thư mục lưu: ", /*#__PURE__*/React.createElement("code", {
    className: "text-brand-300"
  }, "Soda_Reels_Videos/", directEpisodes.title, "/"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
  }, directEpisodes.episodes.map(ep => {
    const activeUrl = selectedCodec === 'h264' && ep.directUrlH264 ? ep.directUrlH264 : ep.directUrl;

    // Check if this episode is already downloaded in local library
    let isDownloaded = false;
    if (status?.localDramas) {
      const matched = status.localDramas.find(d => d.name.toLowerCase().includes(directEpisodes.title.toLowerCase()) || directEpisodes.title.toLowerCase().includes(d.name.toLowerCase()));
      if (matched && matched.videos) {
        const epPadded = `Tap_${String(ep.epNumber).padStart(2, '0')}.mp4`;
        isDownloaded = matched.videos.some(v => v.filename === epPadded);
      }
    }
    return /*#__PURE__*/React.createElement("div", {
      key: ep.epNumber,
      className: `glass-card p-3 rounded-xl border flex flex-col justify-between transition-all ${isDownloaded ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800'}`
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-extrabold text-sm text-white"
    }, "Tập ", ep.epNumber), isDownloaded ? /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
    }, "Đã tải") : ep.isVip ? /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400"
    }, "VIP") : /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
    }, "Free")), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-400 mt-1"
    }, "⏱️ ", formatDuration(ep.duration))), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => handleDownloadDirectSingle(ep),
      title: "Tải nhanh 1-2s về máy tính",
      className: "flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-1"
    }, /*#__PURE__*/React.createElement("span", null, "⚡"), /*#__PURE__*/React.createElement("span", null, isDownloaded ? 'Tải Lại' : 'Tải 1s')), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        navigator.clipboard.writeText(activeUrl);
        showToast(`Đã copy link CDN Tập ${ep.epNumber}!`, 'success');
      },
      title: "Copy link CDN",
      className: "p-1 px-2 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
    }, "📋"), /*#__PURE__*/React.createElement("a", {
      href: activeUrl,
      target: "_blank",
      rel: "noopener noreferrer",
      title: "Mở xem trực tiếp link CDN",
      className: "p-1 px-2 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
    }, "🌐")));
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-12 text-center rounded-2xl border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl"
  }, "🎭"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-lg text-white mt-3"
  }, "Chưa Tìm Thấy Dữ Liệu Link Trực Tiếp"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 max-w-md mx-auto mt-1"
  }, "Hãy mở một bộ phim bất kỳ trên ứng dụng ", /*#__PURE__*/React.createElement("strong", null, "MinuteDrama"), " trong máy ảo LDPlayer/Nox, sau đó nhấn nút ", /*#__PURE__*/React.createElement("strong", null, "Quét Lại Database"), " ở góc phải."), /*#__PURE__*/React.createElement("button", {
    onClick: () => fetchDirectEpisodes(),
    className: "mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all"
  }, "🔄 Quét Lại Ngay"))), activeTab === 'cache' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-5 rounded-2xl space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row md:items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🔄 Quét Cache Giả Lập & Tự Động Lướt Tập")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, "Bắt các file video được ứng dụng lưu tạm trên máy ảo Android. Tự động lướt tập thông minh.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleExportCache,
    disabled: loading || !status?.remoteCacheCount,
    className: "px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
  }, /*#__PURE__*/React.createElement("span", null, "📥"), /*#__PURE__*/React.createElement("span", null, loading ? 'Đang xuất video...' : `Xuất Tất Cả (${status?.remoteCacheCount || 0} tập) Về Máy`)), /*#__PURE__*/React.createElement("button", {
    onClick: handleDeleteRemoteCache,
    className: "px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-all"
  }, /*#__PURE__*/React.createElement("span", null, "🗑️"), /*#__PURE__*/React.createElement("span", null, "Dọn Sạch Cache Máy Ảo")))), /*#__PURE__*/React.createElement("div", {
    className: "pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-slate-300 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "📱 Tự Động Lướt Tập:"), autoSwipeStatus?.isRunning && /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
  }, "Đang chạy (", autoSwipeStatus.currentCount, "/", autoSwipeStatus.totalCount, ")")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400"
  }, "Số tập:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "100",
    value: autoSwipeTotal,
    onChange: e => setAutoSwipeTotal(e.target.value),
    className: "w-20 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400"
  }, "Giây/tập:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "3",
    max: "120",
    value: autoSwipeDelay,
    onChange: e => setAutoSwipeDelay(e.target.value),
    className: "w-20 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: handleToggleAutoSwipe,
    className: `w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${autoSwipeStatus?.isRunning ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`
  }, /*#__PURE__*/React.createElement("span", null, autoSwipeStatus?.isRunning ? '⏹️ Dừng Lướt Tập' : '▶️ Bắt Đầu Tự Động Lướt'))))), status?.remoteList && status.remoteList.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "glass-panel rounded-2xl overflow-hidden border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 py-3 border-b border-slate-800 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-white"
  }, "Danh Sách Video Trong Cache Máy Ảo"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 font-semibold"
  }, status.remoteList.length, " video tìm thấy")), /*#__PURE__*/React.createElement("div", {
    className: "divide-y divide-slate-800/80"
  }, status.remoteList.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "px-5 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-brand-400"
  }, item.suggestedEp ? `T${item.suggestedEp}` : `#${idx + 1}`), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-semibold text-sm text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, item.suggestedEp ? `Tập ${item.suggestedEp}` : item.name), item.isAlreadyExported && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400"
  }, "Đã tải vào máy")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "Dung lượng: ", /*#__PURE__*/React.createElement("strong", {
    className: "text-slate-300"
  }, item.sizeFormatted), item.percentComplete < 100 && /*#__PURE__*/React.createElement("span", {
    className: "text-amber-400 ml-2 font-medium"
  }, "(Đang cache: ", item.percentComplete, "%)")))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      showToast(`Đang xuất Tập ${item.suggestedEp}...`, 'info');
      try {
        const res = await fetch('/api/export-single', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
    },
    className: "px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all"
  }, "Tải Về Máy")))))) : /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-12 text-center rounded-2xl border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl"
  }, "💤"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-lg text-white mt-3"
  }, "Chưa Có Video Nào Trong Cache Máy Ảo"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 max-w-md mx-auto mt-1"
  }, "Hãy bấm vào video trên ứng dụng trong máy ảo để video tải vào bộ nhớ đệm, hoặc sử dụng công cụ ", /*#__PURE__*/React.createElement("strong", null, "Tự Động Lướt Tập"), " phía trên."))), activeTab === 'library' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🎬 Kho Phim Đã Lưu Trên Máy Tính")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, "Thư mục lưu trữ: ", /*#__PURE__*/React.createElement("code", {
    className: "text-brand-300"
  }, "Soda_Reels_Videos/"), ". Xem video trực tiếp trên web không lo lỗi thiếu codec.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleOpenFolder(selectedDramaName || ''),
    className: "px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
  }, /*#__PURE__*/React.createElement("span", null, "📂"), /*#__PURE__*/React.createElement("span", null, "Mở Trong Windows Explorer")), /*#__PURE__*/React.createElement("button", {
    onClick: fetchStatus,
    className: "px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
  }, "🔄 Làm Mới"))), status?.localDramas && status.localDramas.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-4 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1"
  }, "Danh Sách Bộ Phim (", status.localDramas.length, ")"), status.localDramas.map(drama => {
    const isSelected = selectedDramaName === drama.name;
    return /*#__PURE__*/React.createElement("div", {
      key: drama.name,
      onClick: () => setSelectedDramaName(drama.name),
      className: `p-3 rounded-xl cursor-pointer border transition-all ${isSelected ? 'bg-brand-600/20 border-brand-500/50 text-white shadow-md' : 'glass-card border-slate-800 text-slate-300 hover:text-white'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-bold text-sm truncate"
    }, drama.name), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-400 mt-1 flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("span", null, drama.videos ? drama.videos.length : 0, " tập phim"), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-brand-300 font-semibold"
    }, "Xem chi tiết →")));
  })), /*#__PURE__*/React.createElement("div", {
    className: "md:col-span-3 space-y-4"
  }, (() => {
    const activeDrama = status.localDramas.find(d => d.name === selectedDramaName) || status.localDramas[0];
    if (!activeDrama) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "glass-panel p-5 rounded-2xl border border-slate-800"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between pb-4 border-b border-slate-800 mb-4"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
      className: "text-lg font-bold text-white"
    }, activeDrama.name), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-400"
    }, "Đã tải: ", /*#__PURE__*/React.createElement("strong", null, activeDrama.videos ? activeDrama.videos.length : 0), " tập phim")), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleOpenFolder(activeDrama.name),
      className: "px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
    }, "📂 Mở Thư Mục Phim")), activeDrama.videos && activeDrama.videos.length > 0 ? /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    }, activeDrama.videos.map((vid, idx) => /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "glass-card p-3 rounded-xl border border-slate-800 flex flex-col justify-between"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-sm text-white"
    }, vid.filename), vid.isDubbed && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30"
    }, "🎙️ Đã lồng tiếng")), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-400 mt-1"
    }, "Dung lượng: ", /*#__PURE__*/React.createElement("span", {
      className: "text-slate-300"
    }, vid.sizeFormatted))), /*#__PURE__*/React.createElement("div", {
      className: "mt-4 pt-2 border-t border-slate-800/80 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setVideoModal({
        title: `${activeDrama.name} - ${vid.filename}`,
        url: `/video/${encodeURIComponent(activeDrama.name)}/${encodeURIComponent(vid.filename)}`
      }),
      className: "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all flex items-center justify-center gap-1"
    }, /*#__PURE__*/React.createElement("span", null, "▶️"), /*#__PURE__*/React.createElement("span", null, "Phát Video")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setDubbingTarget({
          name: `${activeDrama.name} - ${vid.filename}`,
          path: vid.path
        });
        setActiveTab('dubbing');
      },
      title: "Chuyển video này sang Studio Lồng Tiếng AI",
      className: "py-1.5 px-3 rounded-lg text-xs font-bold bg-purple-600/30 hover:bg-purple-600 text-purple-200 border border-purple-500/40 transition-all flex items-center gap-1"
    }, /*#__PURE__*/React.createElement("span", null, "🎙️"), /*#__PURE__*/React.createElement("span", null, "Lồng Tiếng")))))) : /*#__PURE__*/React.createElement("div", {
      className: "p-8 text-center text-slate-400 text-xs"
    }, "Chưa có tập phim nào trong bộ phim này."));
  })())) : /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-12 text-center rounded-2xl border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl"
  }, "📁"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-lg text-white mt-3"
  }, "Kho Video Trống"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 max-w-md mx-auto mt-1"
  }, "Bạn chưa tải tập phim nào về máy tính. Hãy chuyển sang tab ", /*#__PURE__*/React.createElement("strong", null, "Tải Trực Tiếp CDN"), " hoặc ", /*#__PURE__*/React.createElement("strong", null, "Giả Lập & Quét Cache"), " để bắt đầu tải!"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveTab('direct'),
    className: "mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all"
  }, "⚡ Chuyển Sang Tải Trực Tiếp CDN"))), activeTab === 'dubbing' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-5 rounded-2xl"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🎙️ Phòng Lồng Tiếng Phim AI (StudioVDT Engine)")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, "Tự động nhận diện giọng nói gốc bằng Faster-Whisper, dịch kịch bản sang tiếng Việt và tạo giọng đọc truyền cảm xúc bằng Edge-TTS.")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "md:col-span-2 glass-panel p-6 rounded-2xl space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold uppercase text-slate-400 mb-2"
  }, "1. Video Đầu Vào Cần Lồng Tiếng:"), dubbingTarget ? /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "🎬"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-sm text-white"
  }, dubbingTarget.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-400 truncate max-w-xs"
  }, dubbingTarget.path))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDubbingTarget(null),
    className: "text-xs text-rose-400 hover:text-rose-300 font-semibold"
  }, "Đổi video")) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("select", {
    onChange: e => {
      const val = e.target.value;
      if (!val) return;
      const parts = val.split('||');
      setDubbingTarget({
        name: parts[0],
        path: parts[1]
      });
    },
    className: "w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white",
    defaultValue: ""
  }, /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, "-- Chọn video từ Kho Phim đã tải --"), status?.localDramas?.map(d => /*#__PURE__*/React.createElement("optgroup", {
    key: d.name,
    label: d.name
  }, d.videos?.map(v => /*#__PURE__*/React.createElement("option", {
    key: v.path,
    value: `${d.name} - ${v.filename}||${v.path}`
  }, v.filename, " (", v.sizeFormatted, ")"))))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500"
  }, "Hoặc chuyển sang tab ", /*#__PURE__*/React.createElement("strong", null, "Kho Phim & Video"), " rồi bấm nút \"🎙️ Lồng Tiếng\" trên tập phim mong muốn."))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold uppercase text-slate-400 mb-2"
  }, "2. Giọng Đọc Lồng Tiếng:"), /*#__PURE__*/React.createElement("select", {
    value: dubVoice,
    onChange: e => setDubVoice(e.target.value),
    className: "w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: "vi-VN-HoaiMyNeural"
  }, "👩 Hoài My (Nữ nhẹ nhàng, truyền cảm)"), /*#__PURE__*/React.createElement("option", {
    value: "vi-VN-NamMinhNeural"
  }, "👨 Nam Minh (Nam trầm ấm, chuẩn phát thanh)"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold uppercase text-slate-400 mb-2"
  }, "3. Tốc Độ Nói (Rate):"), /*#__PURE__*/React.createElement("select", {
    value: dubSpeed,
    onChange: e => setDubSpeed(e.target.value),
    className: "w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: "-10%"
  }, "0.9x (Hơi chậm)"), /*#__PURE__*/React.createElement("option", {
    value: "+0%"
  }, "1.0x (Tốc độ chuẩn)"), /*#__PURE__*/React.createElement("option", {
    value: "+10%"
  }, "1.1x (Nhanh nhẹn)"), /*#__PURE__*/React.createElement("option", {
    value: "+20%"
  }, "1.2x (Kịch tính)")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold uppercase text-slate-400 mb-2"
  }, "4. Model Whisper Nhận Dạng:"), /*#__PURE__*/React.createElement("select", {
    value: dubModel,
    onChange: e => setDubModel(e.target.value),
    className: "w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: "tiny"
  }, "tiny (Siêu nhanh, ít RAM)"), /*#__PURE__*/React.createElement("option", {
    value: "base"
  }, "base (Khuyên dùng - Cân bằng tốt)"), /*#__PURE__*/React.createElement("option", {
    value: "small"
  }, "small (Chính xác cao hơn)"), /*#__PURE__*/React.createElement("option", {
    value: "medium"
  }, "medium (Rất chính xác)"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold uppercase text-slate-400 mb-2"
  }, "5. Âm Lượng Nhạc Nền Gốc (Ducking):"), /*#__PURE__*/React.createElement("select", {
    value: dubBgmVol,
    onChange: e => setDubBgmVol(parseFloat(e.target.value)),
    className: "w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: "0.10"
  }, "10% (Nhạc nền rất nhỏ)"), /*#__PURE__*/React.createElement("option", {
    value: "0.15"
  }, "15% (Chuẩn phim truyền hình)"), /*#__PURE__*/React.createElement("option", {
    value: "0.25"
  }, "25% (Nhạc nền vừa phải)"), /*#__PURE__*/React.createElement("option", {
    value: "0.35"
  }, "35% (Nhạc nền lớn)")))), /*#__PURE__*/React.createElement("button", {
    onClick: handleStartDubbing,
    disabled: !!dubJobId || !dubbingTarget,
    className: "w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, dubJobId ? '⏳' : '🚀'), /*#__PURE__*/React.createElement("span", null, dubJobId ? 'Đang Xử Lý Lồng Tiếng AI...' : 'Bắt Đầu Lồng Tiếng Video'))), /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-white mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "⚙️ Tiến Trình Xử Lý AI")), dubProgress ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-xs font-bold text-purple-400"
  }, /*#__PURE__*/React.createElement("span", null, dubProgress.step || 'Đang tiến hành...'), /*#__PURE__*/React.createElement("span", null, dubProgress.percent || 0, "%")), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-slate-800 rounded-full h-2.5 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-300",
    style: {
      width: `${dubProgress.percent || 0}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1"
  }, /*#__PURE__*/React.createElement("div", null, "Trạng thái: ", /*#__PURE__*/React.createElement("strong", {
    className: "text-white"
  }, dubProgress.status)), dubProgress.message && /*#__PURE__*/React.createElement("div", {
    className: "text-slate-400"
  }, dubProgress.message))) : /*#__PURE__*/React.createElement("div", {
    className: "p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl"
  }, "Chưa có tiến trình lồng tiếng nào đang chạy.")), dubResultVideo && /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-xs text-emerald-400 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "🎉"), /*#__PURE__*/React.createElement("span", null, "Video Đã Lồng Tiếng Sẵn Sàng!")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-300 truncate"
  }, "File: ", dubResultVideo.replace(/^.*[\\\/]/, '')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const parts = dubResultVideo.split(/[\\\/]/);
      const fileName = parts.pop();
      const subFolder = parts.pop();
      const dramaFolder = parts.pop();
      setVideoModal({
        title: `Video Lồng Tiếng - ${fileName}`,
        url: `/video/${encodeURIComponent(dramaFolder)}/${encodeURIComponent(subFolder)}/${encodeURIComponent(fileName)}`
      });
    },
    className: "w-full py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "▶️ Phát Video Lồng Tiếng")))))), activeTab === 'settings' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-6 rounded-2xl border border-slate-800 space-y-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "📱 Kết Nối Thiết Bị Giả Lập Android (ADB)")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "Nhập địa chỉ IP và cổng của giả lập LDPlayer, NoxPlayer, hoặc BlueStacks để kết nối."), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row items-center gap-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: adbHostInput,
    onChange: e => setAdbHostInput(e.target.value),
    placeholder: "127.0.0.1:5555",
    className: "w-full sm:w-80 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleConnectAdb,
    disabled: adbConnecting,
    className: "w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md"
  }, adbConnecting ? 'Đang kết nối...' : '⚡ Kết Nối ADB Ngay')), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 space-y-1"
  }, /*#__PURE__*/React.createElement("div", null, "• Cổng mặc định LDPlayer 9: ", /*#__PURE__*/React.createElement("code", null, "127.0.0.1:5555")), /*#__PURE__*/React.createElement("div", null, "• Cổng mặc định NoxPlayer: ", /*#__PURE__*/React.createElement("code", null, "127.0.0.1:62001")), /*#__PURE__*/React.createElement("div", null, "• Cổng mặc định BlueStacks: ", /*#__PURE__*/React.createElement("code", null, "127.0.0.1:5554")))), /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-6 rounded-2xl border border-slate-800 space-y-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-bold text-amber-400 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "💡 Hướng Dẫn Khắc Phục Lỗi 0xC00D36C4 Trên Windows Media Player")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-300 space-y-2 leading-relaxed"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Nguyên nhân:"), " Khi bạn mở file video MP4 trên máy tính bằng Windows Media Player và gặp lỗi", /*#__PURE__*/React.createElement("code", {
    className: "text-rose-400 mx-1"
  }, "0xC00D36C4 (file type unsupported or corrupt)"), ", nguyên nhân là do video đó được encode bằng chuẩn nén ", /*#__PURE__*/React.createElement("strong", null, "HEVC (H.265)"), " mà Windows 10/11 mặc định không cài sẵn codec HEVC."), /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-white text-sm"
  }, "3 Cách Khắc Phục Đơn Giản Nhất:"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 text-slate-300"
  }, /*#__PURE__*/React.createElement("div", null, "✅ ", /*#__PURE__*/React.createElement("strong", null, "Cách 1 (Khuyên dùng):"), " Trong tab ", /*#__PURE__*/React.createElement("strong", null, "Tải Trực Tiếp CDN"), " của tool, luôn chọn nút ", /*#__PURE__*/React.createElement("strong", {
    className: "text-emerald-400"
  }, "🟢 H.264 (Chuẩn Windows)"), ". Tool sẽ tự động lấy link H.264 bản chuẩn để mở ngay trên Windows Media Player mà không bao giờ bị lỗi!"), /*#__PURE__*/React.createElement("div", null, "✅ ", /*#__PURE__*/React.createElement("strong", null, "Cách 2:"), " Xem video trực tiếp trong tab ", /*#__PURE__*/React.createElement("strong", null, "Kho Phim & Video"), " trên giao diện web của tool. Trình phát web đã tích hợp bộ giải mã tương thích."), /*#__PURE__*/React.createElement("div", null, "✅ ", /*#__PURE__*/React.createElement("strong", null, "Cách 3:"), " Khi bạn đưa video vào ", /*#__PURE__*/React.createElement("strong", null, "Studio Lồng Tiếng AI"), ", hệ thống sẽ tự động re-encode xuất ra file chuẩn H.264 hoàn hảo."))))), /*#__PURE__*/React.createElement("div", {
    className: "glass-panel p-6 rounded-2xl border border-slate-800 space-y-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "🐳 Chạy Ứng Dụng Bằng Docker")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-300 leading-relaxed"
  }, "Để chạy toàn bộ hệ thống (bao gồm Node.js, Python Faster-Whisper, FFmpeg, Edge-TTS) trong một môi trường cô lập không cần cài đặt phần mềm phụ trợ, bạn chỉ cần chạy:"), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-xl bg-slate-900 text-xs font-mono text-brand-300 border border-slate-800"
  }, "Double click vào file ", /*#__PURE__*/React.createElement("strong", null, "CHAY_DOCKER.bat"), " hoặc chạy lệnh ", /*#__PURE__*/React.createElement("code", null, "docker compose up -d"))))), videoModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-b border-slate-800 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm text-white truncate max-w-lg"
  }, videoModal.title), /*#__PURE__*/React.createElement("button", {
    onClick: () => setVideoModal(null),
    className: "w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-black flex justify-center"
  }, /*#__PURE__*/React.createElement("video", {
    src: videoModal.url,
    controls: true,
    autoPlay: true,
    className: "max-h-[70vh] w-auto rounded-lg"
  }, "Trình duyệt không hỗ trợ phát video này.")))), /*#__PURE__*/React.createElement("footer", {
    className: "mt-auto border-t border-slate-800 py-4 text-center text-xs text-slate-500"
  }, "Video Dynamic Toolkit • Soda Reels & MinuteDrama Downloader & AI Dubbing Studio • 2026"));
}

// Render React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));