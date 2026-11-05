@echo off
chcp 65001 >nul
title StudioVDT Streamlit UI
echo ====================================================
echo   KHỞI ĐỘNG STUDIOVDT STREAMLIT WEB UI
echo   (Nhánh feature/video-dubbing)
echo ====================================================
streamlit run studiovdt_app.py --server.port 8501
pause
