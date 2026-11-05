@echo off
title Soda Reels Downloader Tool
cd /d "%~dp0"

echo ========================================================
echo       SODA REELS VIDEO DOWNLOADER TOOL v2.0
echo ========================================================
echo.

rem Giai phong port 3000 neu bi ket
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo Dang mo giao dien web tai: http://localhost:3000 ...
timeout /t 1 /nobreak >nul
start http://localhost:3000

echo Server dang hoat dong... (Vui long khong dong cua so nay khi dung)
echo.
node server.js
pause
