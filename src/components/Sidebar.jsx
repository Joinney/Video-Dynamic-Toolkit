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
      } bg-[#0f172a] text-slate-200 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 shadow-xl`}
    >
      <div>
        {/* Logo Brand */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md font-black text-sm">
                VDT
              </div>
              <div>
                <h1 className="font-black text-white text-base tracking-tight leading-none">Studio VDT</h1>
                <span className="text-[10px] text-sky-400 font-semibold">AI Creative Suite</span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition mx-auto cursor-pointer"
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
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-left transition cursor-pointer ${
              currentPage === 'home'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers size={18} className={currentPage === 'home' ? 'text-blue-400' : 'text-slate-400'} />
            {!isCollapsed && <span>Trang Tổng Quan</span>}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('#dubbing')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-left transition cursor-pointer ${
              currentPage === 'dubbing'
                ? 'bg-sky-600/15 text-sky-400 border border-sky-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clapperboard size={18} className="text-sky-400" />
            {!isCollapsed && <span>Lồng tiếng Video AI</span>}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('#tts')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-left transition cursor-pointer ${
              currentPage === 'tts'
                ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Mic size={18} className="text-emerald-400" />
            {!isCollapsed && <span>Phòng thu Giọng đọc AI</span>}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('#downloader')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-left transition cursor-pointer ${
              currentPage === 'downloader'
                ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <DownloadCloud size={18} className="text-purple-400" />
            {!isCollapsed && <span>Tải Phim Drama Series</span>}
          </button>
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-xl border border-slate-700/50">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-sky-400/40 shrink-0 bg-sky-500/20 flex items-center justify-center font-bold text-xs text-sky-400">
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
              <div className="text-xs font-bold text-white truncate">Võ Duy Toàn</div>
              <div className="text-[10px] text-slate-400">Enterprise Pro</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
