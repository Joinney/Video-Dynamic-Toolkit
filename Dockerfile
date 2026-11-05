# Multi-runtime Dockerfile: Python 3.11 (AI Dubbing) + Node.js 20 (Web Server) + FFmpeg
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=3000

# Cài đặt FFmpeg, thư viện âm thanh, curl, git và Node.js v20
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài đặt các thư viện AI Python cho bộ lồng tiếng
COPY backend/dubber/requirements.txt /app/backend/dubber/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/dubber/requirements.txt

# Sao chép toàn bộ mã nguồn
COPY . /app

# Tạo sẵn thư mục lưu video và thư mục tạm
RUN mkdir -p /app/Soda_Reels_Videos /app/.temp_preview

EXPOSE 3000

HEALTHCHECK CMD curl --fail http://localhost:3000/api/status || exit 1

CMD ["node", "server.js"]
