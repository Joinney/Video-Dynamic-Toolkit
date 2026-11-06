import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Play,
  FolderOpen,
  ImageIcon,
  X,
  Edit3,
  Trash2,
  RefreshCw,
  Upload
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
    initialDrama ? (initialDrama.name || initialDrama.title) : ''
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
  const [isDownloadingDirectAll, setIsDownloadingDirectAll] = useState(false);
  const [downloadProgressDirect, setDownloadProgressDirect] = useState({ current: 0, total: 0 });

  // Queue danh sách tập video trong RAM cache
  const [queueItems, setQueueItems] = useState([]);
  const [localDramas, setLocalDramas] = useState(backendData?.localDramas || []);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);

  // Quản lý Chỉnh sửa & Cập nhật Thông tin Phim
  const [editingDrama, setEditingDrama] = useState(null);
  const [showEditDramaModal, setShowEditDramaModal] = useState(false);
  const [editDramaName, setEditDramaName] = useState('');
  const [editPosterUrl, setEditPosterUrl] = useState('');
  const [editPosterBase64, setEditPosterBase64] = useState('');
  const [editPosterPreview, setEditPosterPreview] = useState('');
  const [isUpdatingDrama, setIsUpdatingDrama] = useState(false);
  const [isDeletingDrama, setIsDeletingDrama] = useState(false);
  const [isAutoFetchingPoster, setIsAutoFetchingPoster] = useState(false);

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
      fetchStatusData(true);
      if (onRefreshStatus) onRefreshStatus();
    } catch (e) {
      showToast('Lỗi kết nối ADB: ' + e.message);
    } finally {
      setIsConnectingAdb(false);
    }
  };

  const fetchStatusData = async (force = false) => {
    try {
      const refreshParam = force ? '&refresh=1' : '';
      const res = await fetch(`/api/status?app=${activeApp}&drama=${encodeURIComponent(dramaTitle)}${refreshParam}`);
      const data = await res.json();
      setConnected(data.connected);
      setDeviceName(data.deviceName || 'Chưa tìm thấy giả lập');
      if (data.currentDrama && data.currentDrama.title) {
        setDramaTitle(data.currentDrama.title);
        const cover = data.currentDrama.image || data.currentDrama.cover || data.currentDrama.coverUrl;
        if (cover) {
          setCurrentDramaCover(cover);
        }
        if (data.currentDrama.currentEpisode) {
          setStartEp(data.currentDrama.currentEpisode);
        }
      }
      if (data.remoteList && data.remoteList.length > 0) {
        const mapped = data.remoteList.map((item, idx) => {
          const epNum = item.epNumber || item.suggestedEp || (idx + 1);
          const epTitle = item.epLabel || `Tập ${String(epNum).padStart(2, '0')}`;
          const sz = item.sizeMb ? `${item.sizeMb} MB` : (item.sizeFormatted || '');
          const isNew = !item.isDownloaded && !item.isAlreadyExported;
          return {
            id: idx + 1,
            ep: epNum,
            title: epTitle,
            size: sz,
            sizeBytes: item.sizeBytes || 0,
            directUrl: item.directUrl || '',
            isNew: isNew,
            checked: isNew,
            path: item.path,
            pct: item.pct || 100,
            isComplete: item.isComplete !== false
          };
        });
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
    const interval = setInterval(fetchStatusData, 5000);
    return () => clearInterval(interval);
  }, [activeApp, dramaTitle]);

  const fetchDirectEpisodes = async (overrideTitle) => {
    try {
      const qTitle = (overrideTitle !== undefined ? overrideTitle : dramaTitle) || '';
      const res = await fetch(`/api/direct-episodes?title=${encodeURIComponent(qTitle)}&app=${activeApp}`);
      const data = await res.json();
      if (data.success && data.episodes) {
        setDirectDramaData(data);
        if (data.title && !dramaTitle) {
          setDramaTitle(data.title);
        }
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
      showToast('Đang nhận diện phim đang xem từ máy ảo...');
      const res = await fetch(`/api/status?app=${activeApp}&refresh=1`);
      const data = await res.json();
      if (data.currentDrama && data.currentDrama.title) {
        setDramaTitle(data.currentDrama.title);
        const cover = data.currentDrama.image || data.currentDrama.cover || data.currentDrama.coverUrl;
        if (cover) setCurrentDramaCover(cover);
        if (data.currentDrama.currentEpisode) setStartEp(data.currentDrama.currentEpisode);
        showToast(`Đã nhận diện: ${data.currentDrama.title} (Tập ${data.currentDrama.currentEpisode || 1})`);
        fetchStatusData(true);
      } else {
        showToast('Chưa phát hiện phim đang phát trên máy ảo.');
      }
    } catch (e) {
      showToast('Lỗi khi lấy thông tin phim');
    }
  };

  const handleDownloadPoster = async () => {
    showToast('Đang tải và đồng bộ ảnh poster phim...');
    try {
      const res = await fetch('/api/download-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dramaName: dramaTitle,
          url: currentDramaCover
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Đã tải và lưu poster vào bộ phim thành công!');
        fetchStatusData();
      } else {
        showToast(`⚠️ Không tìm thấy poster: ${data.message || ''}`);
      }
    } catch (e) {
      showToast('Lỗi kết nối khi tải poster');
    }
  };

  const handleOpenEditDrama = (d) => {
    const dramaName = d.name || d.title || '';
    setEditingDrama(d);
    setEditDramaName(dramaName);
    setEditPosterUrl('');
    setEditPosterBase64('');
    setEditPosterPreview(`/poster/${encodeURIComponent(dramaName)}?t=${Date.now()}`);
    setShowEditDramaModal(true);
  };

  const handleAutoFetchPoster = async () => {
    setIsAutoFetchingPoster(true);
    showToast('Đang quét và lấy poster từ ứng dụng giả lập...');
    try {
      const res = await fetch('/api/download-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dramaName: editDramaName || editingDrama?.name || dramaTitle
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Đã lấy poster từ ứng dụng thành công!');
        setEditPosterBase64('');
        setEditPosterUrl('');
        setEditPosterPreview(`/poster/${encodeURIComponent(editDramaName || editingDrama?.name)}?t=${Date.now()}`);
        fetchStatusData(true);
      } else {
        showToast(`⚠️ ${data.message || 'Không tìm thấy poster trên ứng dụng'}`);
      }
    } catch (e) {
      showToast('Lỗi khi lấy poster từ app: ' + e.message);
    } finally {
      setIsAutoFetchingPoster(false);
    }
  };

  const handleFileChangePoster = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditPosterBase64(reader.result);
      setEditPosterPreview(reader.result);
      showToast('Đã chọn ảnh poster từ máy!');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPosterUrl = () => {
    if (!editPosterUrl.trim()) return;
    setEditPosterPreview(editPosterUrl.trim());
    setEditPosterBase64('');
    showToast('Đã xem thử link ảnh poster mới!');
  };

  const handleSaveDramaEdit = async () => {
    if (!editingDrama) return;
    if (!editDramaName.trim()) {
      showToast('Tên bộ phim không được để trống!');
      return;
    }
    setIsUpdatingDrama(true);
    showToast('Đang lưu thông tin bộ phim...');
    try {
      const res = await fetch('/api/update-drama-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldDramaName: editingDrama.name || editingDrama.title,
          newDramaName: editDramaName.trim(),
          posterUrl: editPosterUrl.trim(),
          posterBase64: editPosterBase64
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ ' + (data.message || 'Cập nhật thành công!'));
        if (dramaTitle === (editingDrama.name || editingDrama.title)) {
          setDramaTitle(data.folderName || editDramaName.trim());
        }
        setShowEditDramaModal(false);
        await fetchStatusData(true);
      } else {
        showToast(`❌ Lỗi: ${data.message || 'Không thể cập nhật'}`);
      }
    } catch (e) {
      showToast('Lỗi cập nhật phim: ' + e.message);
    } finally {
      setIsUpdatingDrama(false);
    }
  };

  const handleDeleteDrama = async () => {
    if (!editingDrama) return;
    const name = editingDrama.name || editingDrama.title;
    const epCount = editingDrama.videos ? editingDrama.videos.length : (editingDrama.count || 0);
    const confirmed = window.confirm(
      `⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn bộ phim "${name}" cùng toàn bộ ${epCount} tập video trên máy tính không?\n\nHành động này sẽ xóa thư mục "Soda_Reels_Videos/${name}" và không thể khôi phục!`
    );
    if (!confirmed) return;

    setIsDeletingDrama(true);
    showToast(`Đang xóa bộ phim "${name}"...`);
    try {
      const res = await fetch('/api/delete-drama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dramaName: name })
      });
      const data = await res.json();
      if (data.success) {
        showToast('🗑️ ' + (data.message || 'Đã xóa bộ phim!'));
        if (dramaTitle === name) {
          clearDramaConfig();
        }
        setShowEditDramaModal(false);
        await fetchStatusData(true);
      } else {
        showToast(`❌ Lỗi xóa phim: ${data.message}`);
      }
    } catch (e) {
      showToast('Lỗi khi xóa phim: ' + e.message);
    } finally {
      setIsDeletingDrama(false);
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
    const selected = queueItems.filter((item) => item.checked && item.path);
    if (selected.length === 0) {
      if (!window.confirm('Bạn chưa tích chọn tập nào. Bạn có muốn XÓA SẠCH toàn bộ video trong bộ nhớ đệm máy ảo để xem lại từ đầu không?')) {
        return;
      }
      try {
        await fetch('/api/delete-remote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ all: true })
        });
        setQueueItems([]);
        showToast('Đã xóa sạch toàn bộ video trong bộ đệm máy ảo!');
        setTimeout(fetchStatusData, 500);
      } catch (e) {
        showToast('Lỗi xóa cache: ' + e.message);
      }
      return;
    }

    try {
      const paths = selected.map(i => i.path);
      await fetch('/api/delete-remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths })
      });
      setQueueItems(queueItems.filter((item) => !item.checked));
      showToast(`Đã xóa ${paths.length} tập đã chọn khỏi máy ảo!`);
      setTimeout(fetchStatusData, 500);
    } catch (e) {
      showToast('Lỗi xóa cache: ' + e.message);
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
      const selectedPaths = selected.map(i => ({
        path: i.path,
        epNumber: i.ep,
        sizeBytes: i.sizeBytes,
        directUrl: i.directUrl
      }));
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dramaName: dramaTitle,
          dramaTitle: dramaTitle,
          selectedPaths,
          force: true
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Đã xuất ${selected.length} tập thành công!`);
        fetchStatusData(true);
      } else {
        showToast(`Lỗi: ${data.message || 'Không thể xuất video'}`);
      }
    } catch (e) {
      showToast('Lỗi xuất video: ' + e.message);
    }
  };

  const handleDownloadSingleDirect = async (ep) => {
    const targetFolder = dramaTitle || (directDramaData?.title) || (localDramas.length > 0 ? (localDramas[0].name || localDramas[0].title) : 'Phim_Drama');
    showToast(`Đang tải/xuất Tập ${ep.epNumber} vào: ${targetFolder}...`);
    try {
      if (directDramaData?.app === 'sodareels') {
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dramaTitle: targetFolder,
            selectedPaths: [ep.path],
            startEpisode: ep.epNumber,
            force: true
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Tập ${ep.epNumber} đã được xuất thành công vào: ${targetFolder}!`);
          fetchStatusData();
        } else {
          showToast(`Lỗi xuất tập: ${data.message}`);
        }
      } else {
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
      }
    } catch (e) {
      showToast('Lỗi kết nối tải/xuất file');
    }
  };

  const handleDownloadAllDirect = async () => {
    if (!directDramaData?.episodes || directDramaData.episodes.length === 0) return;
    const eps = directDramaData.episodes;
    const targetFolder = dramaTitle || (directDramaData?.title) || (localDramas.length > 0 ? (localDramas[0].name || localDramas[0].title) : 'Phim_Drama');
    setIsDownloadingDirectAll(true);

    if (directDramaData?.app === 'sodareels') {
      showToast(`Đang xuất toàn bộ ${eps.length} tập vào bộ phim: ${targetFolder}...`);
      try {
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dramaTitle: targetFolder,
            selectedPaths: eps.map(e => ({ path: e.path, suggestedEp: e.epNumber })),
            force: true
          })
        });
        const resJson = await res.json();
        if (resJson.success) {
          showToast(`Đã xuất hoàn tất ${eps.length} tập vào: ${targetFolder}!`);
          fetchStatusData();
        } else {
          showToast(`Lỗi xuất: ${resJson.message}`);
        }
      } catch (e) {
        showToast('Lỗi kết nối xuất toàn bộ tập');
      } finally {
        setIsDownloadingDirectAll(false);
      }
      return;
    }

    setDownloadProgressDirect({ current: 0, total: eps.length });
    showToast(`Bắt đầu tải toàn bộ ${eps.length} tập vào bộ phim: ${targetFolder}...`);
    let countSuccess = 0;
    for (let i = 0; i < eps.length; i++) {
      const ep = eps[i];
      setDownloadProgressDirect({ current: i + 1, total: eps.length });
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
        const resJson = await res.json();
        if (resJson.success) countSuccess++;
      } catch (e) {}
    }
    setIsDownloadingDirectAll(false);
    showToast(`Đã tải hoàn tất ${countSuccess}/${eps.length} tập vào: ${targetFolder}!`);
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
              <div className="w-24 h-32 bg-slate-200 rounded-lg flex flex-col items-center justify-center text-center text-xs text-gray-500 border border-gray-300 shrink-0 overflow-hidden relative shadow-xs">
                <img
                  key={currentDramaCover || dramaTitle}
                  src={currentDramaCover ? `/api/proxy-img?url=${encodeURIComponent(currentDramaCover)}` : `/poster/${encodeURIComponent(dramaTitle)}`}
                  alt={dramaTitle}
                  className="w-full h-full object-cover block"
                  onLoad={(e) => { e.target.style.display = 'block'; }}
                  onError={(e) => {
                    if (dramaTitle && !e.target.dataset.tried) {
                      e.target.dataset.tried = 'true';
                      e.target.src = `/poster/${encodeURIComponent(dramaTitle)}?t=${Date.now()}`;
                    } else {
                      e.target.style.display = 'none';
                    }
                  }}
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
                    onClick={handleDownloadPoster}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
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
                          {item.directUrl ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                              CDN 100%
                            </span>
                          ) : (item.pct !== undefined && item.pct < 100 && (
                            <span className="bg-sky-100 text-sky-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                              {item.pct}%
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {item.size ? `${item.size} • ` : ''}
                          {item.directUrl ? '⚡ Sẵn sàng xuất Full 100% từ CDN' : (item.pct !== undefined && item.pct < 100 ? `Đã đệm ${item.pct}% (Đã có thể xuất)` : 'Đã lưu trong bộ đệm RAM')}
                        </span>
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
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2">
                📚 Các Bộ Phim Đã Tải Trên Máy Tính ({localDramas.length})
              </h3>
              <span className="text-xs font-semibold text-slate-500">Thư mục lưu trữ: Soda_Reels_Videos/</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await fetch('/api/open-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: '' }) });
                  showToast('Đang mở thư mục gốc Soda_Reels_Videos/');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-300 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <FolderOpen size={13} /> Thư Mục Phim
              </button>
              <button
                type="button"
                disabled={isRefreshingLocal}
                onClick={async () => {
                  setIsRefreshingLocal(true);
                  showToast('Đang quét và cập nhật lại danh sách phim...');
                  await fetchStatusData(true);
                  setTimeout(() => {
                    setIsRefreshingLocal(false);
                    showToast('Đã cập nhật danh sách phim mới nhất!');
                  }, 400);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <span className={isRefreshingLocal ? 'animate-spin inline-block' : ''}>🔄</span> Cập Nhật Phim
              </button>
            </div>
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
                    <div
                      onClick={() => handleOpenEditDrama(d)}
                      title="Bấm để chỉnh sửa thông tin hoặc đổi poster"
                      className="w-12 h-16 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-300 cursor-pointer relative group hover:border-blue-400 transition shadow-2xs"
                    >
                      <img
                        src={`/poster/${encodeURIComponent(d.name || d.title)}`}
                        alt={d.name || d.title}
                        onError={(e) => { e.target.style.display = 'none'; }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Edit3 size={14} className="text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-gray-900 truncate" title={d.name || d.title}>{d.name || d.title}</h4>
                        <button
                          type="button"
                          onClick={() => handleOpenEditDrama(d)}
                          title="Chỉnh sửa tên hoặc poster"
                          className="text-slate-400 hover:text-amber-600 cursor-pointer p-0.5"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
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

                  <div className="flex items-center gap-1.5 pt-1 border-t border-gray-200/60 flex-wrap">
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch('/api/open-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: d.name || d.title }) });
                        showToast(`Mở thư mục: Soda_Reels_Videos/${d.name || d.title}`);
                      }}
                      className="flex-1 py-1 px-2 bg-white hover:bg-slate-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer min-w-[85px]"
                    >
                      <FolderOpen size={13} /> Mở Thư Mục
                    </button>
                    <button
                      type="button"
                      title="Chọn bộ phim này để tiếp tục tải các tập tiếp theo"
                      onClick={() => {
                        setDramaTitle(d.name || d.title);
                        showToast(`Đã chọn bộ phim: ${d.name || d.title}`);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="py-1 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      ⚡ Tải Tiếp
                    </button>
                    <button
                      type="button"
                      title="Chỉnh sửa thông tin phim, đổi tên, cập nhật poster hoặc xóa phim"
                      onClick={() => handleOpenEditDrama(d)}
                      className="py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <Edit3 size={13} /> Sửa Phim
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

        {/* Modal 2: Direct CDN Links & Batch Export */}
        {showDirectLinksModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowDirectLinksModal(false)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full p-5 border border-blue-100 text-slate-800 shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-blue-700">⚡ Danh Sách Cả Bộ Phim & Xuất Video</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                    directDramaData?.app === 'sodareels'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {directDramaData?.app === 'sodareels' ? '🥤 Soda Reels (Bộ nhớ đệm PSSDK)' : '🎬 MinuteDrama CDN'}
                  </span>
                  {directDramaData && directDramaData.episodes && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                      {directDramaData.app === 'sodareels' ? `Đã có ${directDramaData.episodes.length}/${directDramaData.totalEpisodes || 60} tập trong máy` : `Đã tìm thấy ${directDramaData.episodes.length} tập`}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowDirectLinksModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Chỉ hiển thị duy nhất bộ phim đang mở trên thiết bị */}
              <div className="mb-2.5 bg-blue-50/70 p-3 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-blue-900">🎬 Bộ phim đang mở:</span>
                  <span className="font-black text-blue-800 text-sm">{directDramaData?.title || dramaTitle}</span>
                </div>
                <span className="text-[11px] bg-white text-blue-700 px-2.5 py-1 rounded-lg font-bold border border-blue-200">
                  Tổng {directDramaData?.totalEpisodes || 0} tập gốc
                </span>
              </div>

              {/* Thư mục lưu đúng bộ phim */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800">📁 Thư mục lưu trên máy:</span>
                  <code className="bg-white border border-slate-300 text-blue-700 font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                    Soda_Reels_Videos/{directDramaData?.title || dramaTitle}
                  </code>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  ✅ Khớp chuẩn bộ phim đang mở (Không lưu ra bộ khác)
                </span>
              </div>

              {/* Codec Switcher for MinuteDrama */}
              {directDramaData?.app === 'minutedrama' && (
                <div className="flex items-center justify-between mb-3 text-xs text-slate-700 bg-blue-50/70 p-2 rounded-xl border border-blue-100">
                  <span>
                    Chuẩn Video: <strong className="text-blue-800 font-bold">{selectedCodec === 'h264' ? 'H.264 (Chuẩn Windows - Xem ngay không lỗi)' : 'H.265 (HEVC - Dung lượng nhẹ)'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCodec(selectedCodec === 'h264' ? 'h265' : 'h264')}
                    className="text-[11px] bg-white hover:bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200 font-bold cursor-pointer shadow-2xs"
                  >
                    Đổi chuẩn: {selectedCodec === 'h264' ? 'Sang H.265 (Gốc)' : 'Sang H.264 (Windows)'}
                  </button>
                </div>
              )}

              {/* Episode list */}
              <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                {directDramaData && directDramaData.episodes && directDramaData.episodes.length > 0 ? (
                  directDramaData.episodes.map((ep) => {
                    const url = ep.directUrl || ((selectedCodec === 'h264' && ep.directUrlH264) ? ep.directUrlH264 : ep.directUrl);
                    const durationMins = ep.duration ? `${Math.floor(ep.duration / 60)}:${String(ep.duration % 60).padStart(2, '0')}` : '';

                    return (
                      <div key={ep.epNumber} className="bg-slate-50 hover:bg-blue-50/40 p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2 transition">
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="font-bold text-blue-700 text-xs shrink-0 w-14">
                            Tập {ep.epNumber < 10 ? `0${ep.epNumber}` : ep.epNumber}:
                          </span>
                          {ep.isVip && (
                            <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-300 shrink-0">
                              VIP
                            </span>
                          )}
                          {ep.sizeFormatted && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono shrink-0">
                              {ep.sizeFormatted}
                            </span>
                          )}
                          {durationMins && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              ({durationMins})
                            </span>
                          )}
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:text-blue-600 text-[11px] font-mono truncate hover:underline"
                              title={url}
                            >
                              {url}
                            </a>
                          ) : (
                            <span className="text-amber-600 text-[11px] font-medium truncate">
                              ⏳ Chưa tải vào máy (Bấm &apos;Lướt Tập Này&apos; trên giả lập để bắt link)
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {url ? (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(url);
                                showToast(`Đã copy link CDN Tập ${ep.epNumber}!`);
                              }}
                              className="bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded border border-blue-200 cursor-pointer shadow-2xs"
                            >
                              Copy Link
                            </button>
                          ) : null}
                          {ep.isCached || url ? (
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleDirect(ep)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1 rounded-lg transition cursor-pointer shadow-xs"
                            >
                              Tải (1s)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                showToast(`Đang lướt giả lập để tải Tập ${ep.epNumber}...`);
                                await fetch('/api/auto-swipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count: 1 }) });
                                setTimeout(fetchDirectEpisodes, 2000);
                              }}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs px-2 py-1 rounded border border-amber-300 cursor-pointer shadow-2xs"
                            >
                              ⚡ Lướt Tập Này
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Đang quét danh sách link tập trực tiếp từ máy chủ CDN...
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-between items-center pt-3 border-t border-blue-100">
                <button
                  type="button"
                  disabled={isDownloadingDirectAll || !directDramaData?.episodes?.length}
                  onClick={handleDownloadAllDirect}
                  className={`font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2 ${
                    isDownloadingDirectAll
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white shadow-md'
                  }`}
                >
                  {isDownloadingDirectAll
                    ? `⏳ Đang Xử Lý Tập ${downloadProgressDirect.current}/${downloadProgressDirect.total}...`
                    : (directDramaData?.app === 'sodareels'
                        ? `🚀 Xuất Ngay Toàn Bộ ${directDramaData?.episodes?.length || 0} Tập Sang MP4`
                        : `🚀 Tải Tự Động Tất Cả Các Tập (${directDramaData?.episodes?.length || 0} Tập)`)
                  }
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

        {/* Modal 3: Chỉnh sửa / Cập nhật Thông tin Phim & Đổi Poster */}
        {showEditDramaModal && editingDrama && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => !isUpdatingDrama && !isDeletingDrama && setShowEditDramaModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full p-5 border border-slate-200 text-slate-800 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              {/* Header modal */}
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <Edit3 size={18} />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Cập Nhật Thông Tin Bộ Phim</h3>
                    <p className="text-[11px] text-slate-500">Đổi tên thư mục, cập nhật/khôi phục ảnh poster hoặc xóa bộ phim</p>
                  </div>
                </div>
                <button
                  disabled={isUpdatingDrama || isDeletingDrama}
                  onClick={() => setShowEditDramaModal(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body: Poster preview + Form */}
              <div className="flex gap-4">
                {/* Cột hiển thị ảnh poster */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="w-28 h-36 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative shadow-xs flex items-center justify-center">
                    {editPosterPreview ? (
                      <img
                        key={editPosterPreview}
                        src={editPosterPreview}
                        alt="Poster"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                        onLoad={(e) => {
                          e.target.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <ImageIcon size={26} className="opacity-40" />
                      <span className="text-[10px] mt-1 font-semibold">Chưa có poster</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">poster.png</span>
                </div>

                {/* Cột nhập thông tin & đổi poster */}
                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Tên Bộ Phim (Thư mục lưu trữ):
                    </label>
                    <input
                      type="text"
                      value={editDramaName}
                      onChange={(e) => setEditDramaName(e.target.value)}
                      placeholder="Nhập tên bộ phim..."
                      className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 transition"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      Thư mục: Soda_Reels_Videos/{editDramaName || '...'}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Khôi Phục / Đổi Ảnh Poster:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={isAutoFetchingPoster || isUpdatingDrama}
                        onClick={handleAutoFetchPoster}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      >
                        <RefreshCw size={12} className={isAutoFetchingPoster ? 'animate-spin' : ''} />
                        {isAutoFetchingPoster ? 'Đang tìm...' : '⚡ Lấy từ App'}
                      </button>

                      <label className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs">
                        <Upload size={12} />
                        Tải ảnh từ máy
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChangePoster}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Hoặc dán Link URL ảnh poster mới:
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={editPosterUrl}
                        onChange={(e) => setEditPosterUrl(e.target.value)}
                        placeholder="https://... URL ảnh"
                        className="flex-1 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-normal"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPosterUrl}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Xem thử
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin số tập hiện tại */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-slate-600">Số tập đã lưu:</span>
                <span className="font-bold text-emerald-600">
                  {editingDrama.videos ? `${editingDrama.videos.length} tập video MP4` : (editingDrama.count ? `${editingDrama.count} tập` : '0 tập')}
                </span>
              </div>

              {/* Footer modal: Xóa + Lưu */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeletingDrama || isUpdatingDrama}
                  onClick={handleDeleteDrama}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
                >
                  <Trash2 size={13} />
                  {isDeletingDrama ? 'Đang xóa...' : 'Xóa Bộ Phim'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUpdatingDrama || isDeletingDrama}
                    onClick={() => setShowEditDramaModal(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingDrama || isDeletingDrama}
                    onClick={handleSaveDramaEdit}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95"
                  >
                    {isUpdatingDrama ? 'Đang lưu...' : '💾 Lưu Thay Đổi'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
