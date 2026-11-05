# Soda Reels & MinuteDrama Downloader Tool

Tool tự động nhận diện, trích xuất và tải trọn bộ phim ngắn từ ứng dụng **Soda Reels** và **MinuteDrama** thông qua ADB và Link CDN trực tiếp.

## ✨ Tính năng nổi bật

- 🤖 **Tự động nhận diện phim & tập đang xem:** Đọc trực tiếp từ cơ sở dữ liệu SQLite của ứng dụng trên giả lập Android.
- ⚡ **Tải siêu tốc qua Link CDN gốc (1-2s / tập):** Trích xuất token và link CDN video gốc trực tiếp từ CSDL của app, cho phép tải trọn bộ tốc độ cao mà không cần chờ app đệm video.
- 🎯 **Cơ chế tải từng tập an toàn 100%:** Kiểm tra toàn vẹn cấu trúc file MP4 (`ftyp/moov`), khóa không cho vuốt bỏ dở nếu video chưa đủ 100%.
- 📺 **Giao diện Web thân thiện:** Tích hợp xem trước video, chọn từng tập, sửa tên phim, tự động đánh số thứ tự chuẩn và tải poster phim.
- 🚀 **Zero Dependencies:** Toàn bộ backend sử dụng thuần các module có sẵn của Node.js, không cần cài thêm thư viện npm nặng nề.

## 🛠️ Yêu cầu hệ thống

- **Node.js** (v16 trở lên)
- **Giả lập Android** (LDPlayer, Nox, MuMu...) đã bật chế độ Root và kết nối ADB (`127.0.0.1:5555`)
- Hệ điều hành: Windows 10 / 11

## 🚀 Hướng dẫn sử dụng

1. Mở giả lập Android, vào app **Soda Reels** hoặc **MinuteDrama** và mở tập phim bạn muốn tải.
2. Chạy file `CHAY_TOOL.bat` (hoặc mở terminal gõ `npm start` / `node server.js`).
3. Giao diện quản lý sẽ tự động mở tại: `http://localhost:3000`.
4. Bấm **`⚡ Link Trực Tiếp Cả Bộ`** để tải siêu tốc hoặc bấm **`🎯 Lấy Đúng 1 Tập Này`** / **`▶ Lướt Tự Động`** để tải.
