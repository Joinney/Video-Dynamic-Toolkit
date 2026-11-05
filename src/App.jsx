import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import LongTiengVideo from './pages/LongTiengVideo';
import TextLongTieng from './pages/TextLongTieng';
import TaiPhimDramaSeries from './pages/TaiPhimDramaSeries';

export default function App() {
  // Lấy hash từ URL (ví dụ: #home, #dubbing, #tts, #downloader), F5 vẫn giữ nguyên trang!
  const getInitialRoute = () => {
    const hash = window.location.hash || '#home';
    if (['#home', '#dubbing', '#tts', '#downloader'].includes(hash)) {
      return hash;
    }
    return '#home';
  };

  const [currentRoute, setCurrentRoute] = useState(getInitialRoute);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [backendData, setBackendData] = useState(null);
  const [selectedVideoForDubbing, setSelectedVideoForDubbing] = useState(null);
  const [selectedDramaForDownloader, setSelectedDramaForDownloader] = useState(null);

  // Lắng nghe sự kiện đổi URL hash (Hỗ trợ nút Back/Forward trình duyệt & F5 reload)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#home';
      if (['#home', '#dubbing', '#tts', '#downloader'].includes(hash)) {
        setCurrentRoute(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newHash) => {
    window.location.hash = newHash;
    setCurrentRoute(newHash);
  };

  // Đồng bộ trạng thái backend thời gian thực
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

  // Điều hướng Router theo URL Hash
  if (currentRoute === '#dubbing') {
    return (
      <LongTiengVideo
        onBackHome={() => navigate('#home')}
        initialVideo={selectedVideoForDubbing}
        backendData={backendData}
      />
    );
  }

  if (currentRoute === '#tts') {
    return (
      <TextLongTieng
        onBackHome={() => navigate('#home')}
        backendData={backendData}
      />
    );
  }

  if (currentRoute === '#downloader') {
    return (
      <TaiPhimDramaSeries
        onBackHome={() => navigate('#home')}
        initialDrama={selectedDramaForDownloader}
        backendData={backendData}
        onRefreshStatus={fetchGlobalStatus}
        onSelectForDubbing={(v) => {
          setSelectedVideoForDubbing(v);
          navigate('#dubbing');
        }}
      />
    );
  }

  // Mặc định: Trang Chủ
  return (
    <Home
      onNavigate={navigate}
      backendData={backendData}
      onSelectVideoForDubbing={setSelectedVideoForDubbing}
      onSelectDramaForDownloader={setSelectedDramaForDownloader}
      isSidebarCollapsed={isSidebarCollapsed}
      onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
    />
  );
}
