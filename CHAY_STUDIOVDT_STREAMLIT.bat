@echo off
chcp 65001 >nul
echo ========================================================
echo   KHỞI CHẠY GIAO DIỆN STREAMLIT STUDIOVDT
echo ========================================================
echo.
echo Đang mở giao diện Streamlit tại http://localhost:8501...
echo.
streamlit run studiovdt_app.py --server.port 8501
pause
