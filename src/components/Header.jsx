import React, { useState } from 'react';

export default function Header({
  title = 'Studio VDT',
  badge = 'PRO STUDIO',
  showBackButton = false,
  onBackHome,
  backendData,
  onConnectAdb
}) {
  const [adbAddress, setAdbAddress] = useState('127.0.0.1:5555');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState('');

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectMsg('Đang nối ADB...');
    try {
      const res = await fetch('/api/connect-adb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: adbAddress })
      });
      const data = await res.json();
      setConnectMsg(data.message || (data.connected ? 'Thành công!' : 'Thất bại'));
      if (onConnectAdb) onConnectAdb();
    } catch (e) {
      setConnectMsg('Lỗi: ' + e.message);
    } finally {
      setIsConnecting(false);
      setTimeout(() => setConnectMsg(''), 4000);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md rounded-2xl border border-blue-100 px-5 py-2.5 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full border-2 border-blue-400 overflow-hidden shadow-xs flex items-center justify-center bg-gradient-to-tr from-blue-600 to-sky-500 text-white font-black text-sm shrink-0">
          VDT
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-black tracking-tight text-slate-900">{title}</span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              • {badge}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Bản quyền: <strong className="text-blue-600 font-bold">Võ Duy Toàn</strong> | VieNeu Neural Voice & AI Dubbing Engine
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Trạng thái kết nối ADB */}
        {backendData?.connected ? (
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ADB: {backendData.deviceName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Chưa có ADB</span>
            </div>
            <input
              type="text"
              value={adbAddress}
              onChange={(e) => setAdbAddress(e.target.value)}
              placeholder="127.0.0.1:5555"
              className="w-28 bg-blue-50/40 border border-blue-200 text-slate-800 text-xs px-2 py-1 rounded-lg font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg shadow-xs transition cursor-pointer"
            >
              {isConnecting ? 'Đang nối...' : '⚡ Nối ADB'}
            </button>
            {connectMsg && <span className="text-[10px] text-blue-600 font-bold">{connectMsg}</span>}
          </div>
        )}

        {showBackButton && (
          <button
            type="button"
            onClick={onBackHome}
            className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            ← Quay lại Trang Chủ
          </button>
        )}
      </div>
    </header>
  );
}
