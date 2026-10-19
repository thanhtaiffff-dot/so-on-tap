# Sổ Ôn Tập

Trang web ôn tập: thẻ lật, trắc nghiệm chấm điểm, ghi chú theo môn. Viết bằng React + Vite.

## Chạy thử trên máy
1. Cài Node.js (bản LTS) từ https://nodejs.org
2. Mở cửa sổ lệnh trong thư mục này, gõ `npm install` rồi `npm run dev`
3. Mở địa chỉ hiện ra (thường là http://localhost:5173)

## Các thư mục chính
- `src/pages/`: từng trang (Trang chủ, Thẻ lật, Trắc nghiệm, Ghi chú, Bộ thẻ, Cài đặt)
- `src/data/storage.js`: nơi lưu dữ liệu (hiện là trình duyệt; sau này đổi sang đăng nhập Google ở đây)
- `src/styles.css`: toàn bộ màu sắc, giao diện sáng/tối

## Bảo mật
- Không có tài khoản, không gửi dữ liệu đi đâu.
- Có Content-Security-Policy chặn chạy mã lạ; nội dung người dùng nhập luôn hiển thị dạng chữ thường.
- File sao lưu được kiểm tra và làm sạch trước khi nạp.
