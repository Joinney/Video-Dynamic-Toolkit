@echo off
chcp 65001 >nul
title Soda Reels Video Downloader & AI Dubber Studio (Docker)
echo ========================================================
echo   SODA REELS & DUBBING STUDIO (DOCKER EDITION)
echo ========================================================
echo.
echo Dang khoi chay he thong bang Docker Compose...
docker compose up -d --build
echo.
echo He thong da khoi chay tai: http://localhost:3000
echo Mo trinh duyet...
start http://localhost:3000
echo.
echo ========================================================
echo Nhan phim bat ky de xem logs cua container (Ctrl + C de thoat logs)
pause >nul
docker compose logs -f
