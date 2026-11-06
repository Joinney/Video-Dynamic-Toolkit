import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Play,
  FolderOpen,
  ImageIcon,
  X
} from 'lucide-react';
import Header from '../components/Header';

export default function TaiPhimDramaSeries({
  initialDrama,
  backendData,
  onRefreshStatus,
  onSelectForDubbing,
  onBackHome
}) {
  const [activeApp, setActiveApp] = useState(backendData?.activeApp || 'auto');
  const [dramaTitle, setDramaTitle] = useState(
    initialDrama ? (initialDrama.name || initialDrama.title) : 'Tiệm Tạp Hóa Âm Dương - Ám Ảnh'
  );
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

  // Queue danh sách tập video trong RAM cache
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
    try {
      const res = await fetch(`/api/status?app=${activeApp}`);
      const data = await res.json();
      if (data.currentDrama && data.currentDrama.title) {
        setDramaTitle(data.currentDrama.title);
        if (data.currentDrama.cover) setCurrentDramaCover(data.currentDrama.cover);
        if (data.currentDrama.currentEpisode) setStartEp(data.currentDrama.currentEpisode);
        showToast(`Đã nhận diện: ${data.currentDrama.title} (Tập ${data.currentDrama.currentEpisode || 1})`);
      } else {
        showToast('Chưa phát hiện phim đang phát trên máy ảo.');
      }
    } catch (e) {
      showToast('Lỗi khi lấy thông tin phim');
    }
  };

  const toggleSelectAll = (selectState) => {
    setQueueItems(queueItems.map((item) => ({ ...item, checked: selectState })));
  };

  const selectOnlyNew = () => {
    setQueueItems(queueItems.map((item) => ({ ...item, checked: item.isNew })));
  };

  const reverseQueueOrder = () => {
    setQueueItems([...queueItems].reverse());
  };

  const deleteSelectedCache = async () => {
    try {
      await fetch('/api/delete-remote', { method: 'POST' });
      setQueueItems(queueItems.filter((item) => !item.checked));
      showToast('Đã xóa cache các tập đã chọn trên máy ảo!');
    } catch (e) {
      showToast('Lỗi xóa cache');
    }
  };

  const startSwipe = async (count) => {
    setIsSwiping(true);
    showToast(`Đang tự động nạp & lướt ${count} tập...`);
    try {
      await fetch('/api/auto-swipe/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total: count, delay: 6 })
      });
      setTimeout(() => {
        setIsSwiping(false);
        showToast('Hoàn thành tải các tập!');
        fetchStatusData();
      }, count * 7000);
    } catch (e) {
      setIsSwiping(false);
      showToast('Lỗi tự động lướt');
    }
  };

  const exportSelectedVideos = async () => {
    const selected = queueItems.filter((i) => i.checked);
    if (selected.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 tập để lưu về máy tính!');
      return;
    }
    showToast(`Đang sao lưu ${selected.length} video về máy tính...`);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dramaName: dramaTitle })
      });
      const data = await res.json();
      showToast(data.message || `Đã xuất ${selected.length} tập thành công!`);
      fetchStatusData();
    } catch (e) {
      showToast('Lỗi xuất video: ' + e.message);
    }
  };

  const handleDownloadSingleDirect = async (ep) => {
    const targetFolder = dramaTitle || (localDramas.length > 0 ? (localDramas[0].name || localDramas[0].title) : 'Phim_Drama');
    showToast(`Đang tải trực tiếp Tập ${ep.epNumber} vào: ${targetFolder}...`);
    try {
      const res = await fetch('/api/download-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: (selectedCodec === 'h264' && ep.directUrlH264) ? ep.directUrlH264 : ep.directUrl,
          dramaName: targetFolder,
          dramaTitle: targetFolder,
          epNumber: ep.epNumber
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.alreadyExists ? `Tập ${ep.epNumber} đã có sẵn trong bộ: ${targetFolder}` : `Tập ${ep.epNumber} tải xong vào: ${targetFolder}!`);
        fetchStatusData();
      } else {
        showToast(`Lỗi tải tập: ${data.message}`);
      }
    } catch (e) {
      showToast('Lỗi kết nối tải file');
    }
  };

  const handleDownloadAllDirect = async () => {
    if (!directDramaData?.episodes) return;
    const eps = directDramaData.episodes;
    const targetFolder = dramaTitle || (localDramas.length > 0 ? (localDramas[0].name || localDramas[0].title) : 'Phim_Drama');
    showToast(`Bắt đầu tải toàn bộ ${eps.length} tập vào bộ phim: ${targetFolder}...`);
    for (const ep of eps) {
      try {
        await fetch('/api/download-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: (selectedCodec === 'h264' && ep.directUrlH264) ? ep.directUrlH264 : ep.directUrl,
            dramaName: targetFolder,
            dramaTitle: targetFolder,
            epNumber: ep.epNumber
          })
        });
      } catch (e) {}
    }
    showToast(`Đã tải hoàn tất toàn bộ các tập vào: ${targetFolder}!`);
    fetchStatusData();
  };

  return (
    <div
      className="min-h-screen text-[#1e293b] flex flex-col font-sans select-none p-4 space-y-4"
      style={{
        backgroundColor: '#f6f9fc',
        backgroundImage:
          'linear-gradient(to right, rgba(0, 114, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 114, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div className="max-w-[1740px] w-full mx-auto">
        <Header
          title="Tải Phim Drama Series"
          badge="SODA REELS & MINUTEDRAMA"
          showBackButton={true}
          onBackHome={onBackHome}
          backendData={backendData}
        />
      </div>

      <div className="max-w-[1740px] w-full mx-auto space-y-4">
        {/* Switcher App & ADB Status */}
        <div className="bg-white text-slate-800 rounded-2xl p-3 px-5 flex flex-wrap items-center justify-between gap-3 border border-blue-100 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-blue-800">📱 ỨNG DỤNG ĐANG QUÉT:</span>
            <div className="flex bg-blue-50/70 p-1 rounded-xl border border-blue-100">
              {[
                { id: 'auto', label: 'Tự động quét' },
                { id: 'sodareels', label: '🥤 Soda Reels' },
                { id: 'minutedrama', label: '🎭 MinuteDrama' }
              ].map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={async () => {
                    setActiveApp(app.id);
                    await fetch('/api/set-app', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ app: app.id })
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeApp === app.id ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-600'
                  }`}
                >
                  {app.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {connected ? (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg text-xs text-blue-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ADB: {deviceName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] text-rose-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Chưa có ADB</span>
                </div>
                <input
                  type="text"
                  value={adbAddress}
                  onChange={(e) => setAdbAddress(e.target.value)}
                  placeholder="127.0.0.1:5555"
                  className="w-28 bg-blue-50/40 border border-blue-200 text-slate-800 text-[11px] px-2 py-0.5 rounded focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleConnectAdb(adbAddress)}
                  disabled={isConnectingAdb}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-2.5 py-0.5 rounded transition cursor-pointer shadow-xs"
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
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold px-2.5 py-1 text-xs rounded-lg transition cursor-pointer"
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
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition cursor-pointer"
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
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-800 border border-gray-300 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <ImageIcon size={13} /> Tải Poster
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch('/api/open-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: dramaTitle }) });
                      showToast('Đang mở thư mục lưu phim trên máy...');
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-800 border border-gray-300 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <FolderOpen size={13} /> Mở Thư Mục
                  </button>
                </div>
              </div>
            </div>

            {/* Nút hành động chính */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={exportSelectedVideos}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
              >
                <span>🚀</span> XUẤT TẤT CẢ TẬP ĐÃ CHỌN VÀO MÁY TÍNH
              </button>

              <button
                type="button"
                onClick={fetchStatusData}
                className="w-full bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-300 font-bold py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                🔄 Tải Lại Danh Sách Tập Trong Cache
              </button>
            </div>

            {toastMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-bold flex items-center gap-1.5">
                <span>✓</span> {toastMsg}
              </div>
            )}
          </div>

          {/* Cột Phải: Danh sách video trong RAM cache */}
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
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold px-2 py-1 rounded text-xs transition cursor-pointer"
                >
                  ⚡ Link Trực Tiếp Cả Bộ
                </button>
                <button
                  type="button"
                  onClick={selectOnlyNew}
                  className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 font-bold px-2 py-1 rounded text-xs transition cursor-pointer"
                >
                  ⭐ Chọn tập mới
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-300 px-2 py-1 rounded text-xs font-semibold cursor-pointer"
                >
                  Chọn hết
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-300 px-2 py-1 rounded text-xs font-semibold cursor-pointer"
                >
                  Bỏ chọn
                </button>
                <button
                  type="button"
                  onClick={reverseQueueOrder}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 px-2 py-1 rounded text-xs font-bold cursor-pointer"
                >
                  🔄 Đảo thứ tự
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedCache}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 px-2 py-1 rounded text-xs font-bold cursor-pointer"
                >
                  Xóa cache
                </button>
              </div>
            </div>

            {/* Thanh Tự Động Lướt Tập (Auto Swipe) */}
            <div className="bg-blue-50/60 text-slate-800 rounded-xl p-3 border border-blue-200 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                  🤖 Tải Video Từng Tập (Đủ 100% Mới Qua Tập Tiếp)
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isSwiping ? 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse' : 'bg-white text-slate-600 border border-blue-200'
                }`}>
                  {isSwiping ? 'Đang tự động tải...' : 'Sẵn sàng'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => startSwipe(1)}
                  disabled={isSwiping}
                  className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  ⚡ Lướt 1 Tập
                </button>
                <button
                  type="button"
                  onClick={() => startSwipe(5)}
                  disabled={isSwiping}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  ⚡ Lướt 5 Tập
                </button>
                <button
                  type="button"
                  onClick={() => startSwipe(10)}
                  disabled={isSwiping}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  ⚡ Lướt 10 Tập
                </button>
                <button
                  type="button"
                  onClick={() => startSwipe(20)}
                  disabled={isSwiping}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  ⚡ Lướt 20 Tập
                </button>
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
                      className="bg-white hover:bg-slate-100 text-blue-600 border border-gray-300 text-xs font-bold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
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
                              className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-100 cursor-pointer"
                            >
                              ▶ Xem
                            </button>
                            {onSelectForDubbing && (
                              <button
                                type="button"
                                title="Chuyển sang Lồng Tiếng Video AI"
                                onClick={() => onSelectForDubbing({ drama: d.name, name: v.name, relPath: v.relPath })}
                                className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold hover:bg-emerald-100 flex items-center gap-0.5 cursor-pointer"
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
                      className="flex-1 py-1 px-2 bg-white hover:bg-slate-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <FolderOpen size={13} /> Mở Thư Mục
                    </button>
                    {d.videos && d.videos[0] && onSelectForDubbing && (
                      <button
                        type="button"
                        onClick={() => onSelectForDubbing({ drama: d.name, name: d.videos[0].name, relPath: d.videos[0].relPath })}
                        className="py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowPlayerModal(false)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full p-4 border border-blue-100 text-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-blue-100">
                <h3 className="font-bold text-sm text-blue-700">Xem video</h3>
                <button onClick={() => setShowPlayerModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <div className="bg-black aspect-video rounded-xl flex flex-col items-center justify-center border border-slate-200 text-slate-500 text-xs p-4 text-center overflow-hidden">
                {previewVideoUrl ? (
                  <video src={previewVideoUrl} controls autoPlay className="w-full h-full object-contain" />
                ) : (
                  <div>Không tìm thấy video</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Direct CDN Links */}
        {showDirectLinksModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowDirectLinksModal(false)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full p-5 border border-blue-100 text-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-blue-700">⚡ Danh Sách Link Trực Tiếp (CDN)</h3>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold">
                    MinuteDrama
                  </span>
                </div>
                <button onClick={() => setShowDirectLinksModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Folder Selector / Confirmation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 text-xs bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-blue-900">📁 Lưu vào bộ phim:</span>
                  <select
                    value={dramaTitle}
                    onChange={(e) => setDramaTitle(e.target.value)}
                    className="bg-white border border-blue-300 text-blue-900 text-xs px-2.5 py-1 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    {localDramas.map((d, idx) => (
                      <option key={idx} value={d.name || d.title}>
                        {d.name || d.title} ({d.count || 0} tập đã có)
                      </option>
                    ))}
                    {!localDramas.some(d => (d.name || d.title) === dramaTitle) && dramaTitle && (
                      <option value={dramaTitle}>{dramaTitle}</option>
                    )}
                  </select>
                </div>
                <span className="text-[11px] text-blue-700 font-semibold">
                  {localDramas.some(d => (d.name || d.title) === dramaTitle) ? '✅ Đúng bộ phim đã có trên máy' : '📁 Tự động khớp vào thư mục phim tương ứng'}
                </span>
              </div>

              {/* Codec Switcher */}
              <div className="flex items-center justify-between mb-3 text-xs text-slate-700 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
                <span>Chuẩn Video: <strong className="text-blue-800 font-bold">H.264 (Chuẩn Windows - Xem không lỗi 0xC00D36C4)</strong></span>
                <button
                  type="button"
                  onClick={() => setSelectedCodec(selectedCodec === 'h264' ? 'h265' : 'h264')}
                  className="text-[11px] bg-white hover:bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200 font-bold cursor-pointer shadow-2xs"
                >
                  Đổi chuẩn: {selectedCodec.toUpperCase()}
                </button>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {directDramaData && directDramaData.episodes && directDramaData.episodes.length > 0 ? (
                  directDramaData.episodes.map((ep) => {
                    const url = (selectedCodec === 'h264' && ep.directUrlH264) ? ep.directUrlH264 : ep.directUrl;
                    return (
                      <div key={ep.epNumber} className="bg-slate-50 hover:bg-blue-50/40 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 transition">
                        <div className="truncate text-xs">
                          <span className="font-bold text-blue-700 mr-2">Tập {ep.epNumber < 10 ? `0${ep.epNumber}` : ep.epNumber}:</span>
                          <span className="text-slate-500 text-[11px] font-mono truncate">{url}</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(url);
                              showToast(`Đã copy link CDN Tập ${ep.epNumber}!`);
                            }}
                            className="bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded border border-blue-200 cursor-pointer shadow-2xs"
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleDirect(ep)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1 rounded-lg transition cursor-pointer shadow-xs"
                          >
                            Tải (1s)
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Đang quét danh sách link tập trực tiếp từ máy chủ CDN...
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-between items-center pt-3 border-t border-blue-100">
                <button
                  type="button"
                  onClick={handleDownloadAllDirect}
                  className="bg-gradient-to-r from-blue-600 to-sky-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs hover:shadow-md transition cursor-pointer"
                >
                  🚀 Tải Tự Động Tất Cả Các Tập
                </button>
                <button
                  type="button"
                  onClick={() => setShowDirectLinksModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
