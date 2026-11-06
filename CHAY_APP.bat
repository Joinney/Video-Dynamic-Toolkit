@echo off
chcp 65001 >nul
title SODA REELS & MINUTEDRAMA - AI DUBBING STUDIO
cls

echo ======================================================================
echo    🎬 SODA REELS & MINUTEDRAMA DOWNLOADER + AI DUBBING STUDIO 🎬
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Kiem tra va giai phong cong mang 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    tasklist /fi "PID eq %%a" 2>nul | findstr /i "node.exe" >nul 2>&1
    if not errorlevel 1 (
        echo   - Dang giai phong tien trinh Node xung dot (PID: %%a)...
        taskkill /f /pid %%a >nul 2>&1
    )
)

echo [2/3] Kiem tra moi truong Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo   - Docker Desktop chua hoat dong! Dang bat Docker Desktop...
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    )
    echo   - Dang cho Docker san sang (vui long doi vai giay)...
    :WAIT_DOCKER
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if errorlevel 1 goto WAIT_DOCKER
    echo   - Docker da san sang!
) else (
    echo   - Docker engine dang hoat dong binh thuong.
)

echo [3/3] Khoi dong he thong Studio qua Docker Compose...
docker compose up -d

echo.
echo ======================================================================
echo   ✅ HE THONG DA KHOI CHAY THANH CONG!
echo   🌐 Dia chi Studio Web: http://localhost:3000
echo ======================================================================
echo.
echo Dang mo trinh duyet...
timeout /t 2 /nobreak >nul
start http://localhost:3000
echo.
echo ======================================================================
echo   Nhat ky hoat dong (Logs) truc tiep cua he thong:
echo   (Nhan Ctrl + C de thoat man hinh logs, dong cua so de ket thuc)
echo ======================================================================
echo.
docker compose logs -f --tail=20
pause
