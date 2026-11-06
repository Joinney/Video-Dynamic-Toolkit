import React from 'react';
import {
  Clapperboard,
  Mic,
  DownloadCloud,
  Sparkles,
  ArrowRight,
  FolderOpen
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Home({
  onNavigate,
  backendData,
  onSelectVideoForDubbing,
  onSelectDramaForDownloader,
  isSidebarCollapsed,
  onToggleSidebarCollapse
}) {
  const localDramas = backendData?.localDramas || [];
  const totalEpisodes = localDramas.reduce((acc, d) => acc + (d.videos ? d.videos.length : (d.count || 0)), 0);
  const totalSizeMb = localDramas.reduce((acc, d) => acc + (parseFloat(d.totalSizeMb) || 0), 0).toFixed(1);

  return (
    <div className="min-h-screen bg-[#f0f7ff] text-slate-800 flex font-sans">
      {/* SIDEBAR BÊN TRÁI */}
      <Sidebar
        currentPage="home"
        onNavigate={onNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={onToggleSidebarCollapse}
      />

      {/* NỘI DUNG CHÍNH TRANG CHỦ */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Banner Chào Mừng & Trạng Thái Hệ Thống */}
        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-0.5 rounded-full text-xs font-bold mb-1.5">
              <Sparkles size={13} /> Studio VDT • Phiên bản 2.1
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Trung Tâm Điều Hành Studio AI</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Hệ thống kết nối trực tiếp với backend máy tính & máy ảo ADB theo thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 p-2 rounded-xl flex-wrap">
            {backendData?.connected ? (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ADB: {backendData.deviceName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Chưa kết nối máy ảo (Vào mục Tải Phim để kết nối)</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Thẻ Thống Kê Dữ Liệu Thực Tế */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs hover:border-blue-300 transition">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bộ Phim Trong Máy</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{localDramas.length} <span className="text-xs font-bold text-slate-500">Bộ phim</span></div>
            <div className="text-[10px] text-blue-600 font-semibold mt-1">Đã lưu trữ an toàn</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs hover:border-blue-300 transition">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Số Tập Video</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{totalEpisodes} <span className="text-xs font-bold text-slate-500">Tập MP4</span></div>
            <div className="text-[10px] text-blue-500 font-semibold mt-1">Sẵn sàng lồng tiếng</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs hover:border-blue-300 transition">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dung Lượng Đã Dùng</div>
            <div className="text-2xl font-black text-blue-700 mt-1">{totalSizeMb} <span className="text-xs font-bold text-slate-500">MB</span></div>
            <div className="text-[10px] text-blue-500 font-semibold mt-1">Thư mục Soda_Reels_Videos</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs hover:border-blue-300 transition">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bộ Nhớ Đệm RAM Máy Ảo</div>
            <div className="text-2xl font-black text-sky-600 mt-1">{backendData?.remoteCacheCount || 0} <span className="text-xs font-bold text-slate-500">Tập</span></div>
            <div className="text-[10px] text-sky-600 font-semibold mt-1">Video chờ xuất về máy</div>
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
              type="button"
              onClick={() => onNavigate('#downloader')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
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
                    <div className="w-14 h-20 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-300 shadow-2xs relative flex items-center justify-center text-center">
                      <span className="text-xl absolute pointer-events-none">🎬</span>
                      <img
                        src={`/poster/${encodeURIComponent(drama.name)}`}
                        alt={drama.name}
                        onLoad={(e) => { e.target.style.display = 'block'; }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                        className="w-full h-full object-cover relative z-10"
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
                        if (firstVid && onSelectVideoForDubbing) {
                          onSelectVideoForDubbing({ drama: drama.name, name: firstVid.name, relPath: firstVid.relPath });
                        }
                        onNavigate('#dubbing');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg text-center shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Mic size={12} /> Lồng tiếng
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectDramaForDownloader) {
                          onSelectDramaForDownloader(drama);
                        }
                        onNavigate('#downloader');
                      }}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg text-center shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
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
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] py-1.5 px-2 rounded-lg text-center shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
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
              onClick={() => onNavigate('#dubbing')}
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
              onClick={() => onNavigate('#tts')}
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
              onClick={() => onNavigate('#downloader')}
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
