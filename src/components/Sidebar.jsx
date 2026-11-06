import React from 'react';
import {
  Layers,
  Clapperboard,
  Mic,
  DownloadCloud,
  Menu
} from 'lucide-react';

export default function Sidebar({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse
}) {
  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72'
      } bg-white text-slate-700 border-r border-blue-100 transition-all duration-300 flex flex-col justify-between shrink-0 shadow-xs`}
    >
      <div>
        {/* Logo Brand */}
        <div className="p-4 border-b border-blue-100 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-sm">
                VDT
              </div>
              <div>
                <h1 className="font-black text-slate-900 text-base tracking-tight leading-none">Studio VDT</h1>
                <span className="text-[10px] text-blue-600 font-bold">AI Creative Suite</span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition mx-auto cursor-pointer"
            title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5">
          <button
            type="button"
            onClick={() => onNavigate('#home')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-left transition cursor-pointer ${
              currentPage === 'home'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/70 font-semibold'
            }`}
          >
            <Layers size={18} className={currentPage === 'home' ? 'text-white' : 'text-blue-500'} />
            {!isCollapsed && <span>Trang Tổng Quan</span>}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('#dubbing')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-left transition cursor-pointer ${
              currentPage === 'dubbing'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/70 font-semibold'
            }`}
          >
            <Clapperboard size={18} className={currentPage === 'dubbing' ? 'text-white' : 'text-blue-500'} />
            {!isCollapsed && <span>Lồng tiếng Video AI</span>}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('#tts')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-left transition cursor-pointer ${
              currentPage === 'tts'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/70 font-semibold'
            }`}
          >
            <Mic size={18} className={currentPage === 'tts' ? 'text-white' : 'text-blue-500'} />
            {!isCollapsed && <span>Phòng thu Giọng đọc AI</span>}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('#downloader')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-left transition cursor-pointer ${
              currentPage === 'downloader'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/70 font-semibold'
            }`}
          >
            <DownloadCloud size={18} className={currentPage === 'downloader' ? 'text-white' : 'text-blue-500'} />
            {!isCollapsed && <span>Tải Phim Drama Series</span>}
          </button>
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-blue-100">
        <div className="flex items-center gap-3 p-2.5 bg-blue-50/60 rounded-xl border border-blue-100">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-400 shrink-0 bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-600">
            <img
              src="/assets/author.png"
              alt="Võ Duy Toàn"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span>VT</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">Võ Duy Toàn</div>
              <div className="text-[10px] text-blue-600 font-semibold">Enterprise Pro</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
