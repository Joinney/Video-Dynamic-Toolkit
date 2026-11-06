@echo off
chcp 65001 >nul
title Soda Reels ^& MinuteDrama Downloader Tool
cls

echo ======================================================================
echo    SODA REELS ^& MINUTEDRAMA DOWNLOADER TOOL v2.0
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/2] Giai phong cong mang 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    tasklist /fi "PID eq %%a" 2>nul | findstr /i "node.exe" >nul 2>&1
    if not errorlevel 1 (
        taskkill /f /pid %%a >nul 2>&1
    )
)

echo [2/2] Mo giao dien Web tai http://localhost:3000 ...
start http://localhost:3000

echo.
echo Server dang hoat dong... (Vui long khong dong cua so nay khi su dung)
echo.

node server.js
pause
