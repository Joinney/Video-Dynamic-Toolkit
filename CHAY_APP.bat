@echo off
chcp 65001 >nul
title Soda Reels ^& MinuteDrama Studio
cls

echo ======================================================================
echo    SODA REELS ^& MINUTEDRAMA DOWNLOADER + AI DUBBING STUDIO
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Kiem tra va giai phong cong mang 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    tasklist /fi "PID eq %%a" 2>nul | findstr /i "node.exe" >nul 2>&1
    if not errorlevel 1 (
        echo   - Dang giai phong tien trinh Node xung dot PID %%a ...
        taskkill /f /pid %%a >nul 2>&1
    )
)

echo [2/3] Kiem tra Docker AI Engine...
docker info >nul 2>&1
if errorlevel 1 (
    echo   - Docker Desktop chua bat. Dang bat Docker o che do ngam...
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    )
    echo   - Tinh nang TAI PHIM, BAT LINK va XUAT VIDEO van hoat dong 100%% binh thuong!
) else (
    echo   - Docker engine dang hoat dong.
    echo   - Dang khoi dong Container AI Dubbing reelssoda_studio ...
    docker compose up -d >nul 2>&1
)

echo.
echo [3/3] Khoi dong Server Studio...
echo ======================================================================
echo   HE THONG DA KHOI CHAY THANH CONG!
echo   Dia chi Studio Web: http://localhost:3000
echo   ADB Engine: San sang ket noi voi gia lap Android
echo ======================================================================
echo.
echo Dang mo trinh duyet...
start http://localhost:3000
echo.
echo Server dang hoat dong... (Vui long khong dong cua so nay khi su dung)
echo.

node server.js
pause
