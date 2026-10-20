# Sổ Ôn Tập

Trang web ôn tập: thẻ lật có lịch ôn thông minh, trắc nghiệm chấm điểm có lời giải, ghi chú theo môn. Viết bằng React + Vite.
Không cần tài khoản: dữ liệu nằm ngay trong trình duyệt của từng máy. Cài được như app và dùng được khi mất mạng.

## Lịch ôn thông minh
- Thẻ lật dùng thuật toán FSRS (thư viện [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs), cùng thuật toán Anki đang dùng). Lật thẻ xong thì tự chấm: **Quên**, **Khó**, **Nhớ** hoặc **Dễ**. Dưới mỗi nút ghi lúc thẻ sẽ được hỏi lại.
- Thẻ hay quên được hỏi lại sau vài phút, thẻ nhớ chắc thì vài ngày, vài tuần, rồi vài tháng mới hỏi lại: hỏi đúng lúc sắp quên là cách nhớ lâu nhất.
- Trang chủ có ô **Hôm nay**: mỗi môn còn bao nhiêu thẻ đến hạn và thẻ mới. Mỗi môn học tối đa 20 thẻ mới mỗi ngày (bấm "Học thêm thẻ mới" nếu muốn học thêm), để bài ôn của những ngày sau không bị dồn.
- "Ôn tự do" để ôn mọi thẻ bất cứ lúc nào; kết quả vẫn được tính vào lịch ôn.
- Thẻ **đã thuộc** là thẻ nhớ được ít nhất 3 tuần. Một ngày ôn tính từ 4 giờ sáng, nên thức khuya ôn bài vẫn tính là hôm trước.
- Trắc nghiệm chọn sai thì có lời giải: đáp án đúng, đáp án vừa chọn là của câu nào, và phần giải thích của thẻ (nếu có). Làm xong có nút làm lại các câu sai (lượt làm lại chỉ để luyện, không tính vào lịch sử điểm).

## Chạy thử trên máy
1. Cài Node.js bản LTS từ https://nodejs.org (bản 22 trở lên)
2. Mở cửa sổ lệnh trong thư mục này, gõ `npm install` rồi `npm run dev`
3. Mở địa chỉ hiện ra (thường là http://localhost:5173)

| Lệnh | Làm gì |
|---|---|
| `npm run dev` | Chạy bản đang sửa, sửa code là trang tự cập nhật |
| `npm run build` | Đóng gói ra thư mục `dist` để đưa lên mạng |
| `npm run lint` | Soát lỗi cách viết code |
| `npm test` | Test phần dữ liệu (chạy trong vài giây) |
| `npm run test:e2e` | Test trên trình duyệt thật, máy tính + điện thoại (chạy `npm run build` trước) |
| `npm run build:preview` | Gói cả trang vào một file HTML để xem thử |

## Các thư mục chính
- `src/pages/`: từng trang (Trang chủ, Thẻ lật, Trắc nghiệm, Ghi chú, Bộ thẻ, Cài đặt)
- `src/data/`: dữ liệu và cách lưu
  - `schema.js`: dữ liệu gồm những gì, kiểm tra và làm sạch file sao lưu
  - `srs.js`: lịch ôn (chấm thẻ, thẻ nào đến hạn, thẻ mới mỗi ngày, thứ tự thẻ trong một lượt ôn)
  - `db.js`, `persist.js`: lưu vào máy bằng IndexedDB
  - `store.jsx`: mọi thay đổi dữ liệu đi qua đây; sau này thêm đăng nhập Google cũng sửa ở đây
- `src/pwa.js`, `vite.config.js`: cài như app, dùng khi mất mạng (service worker tự tạo lúc build)
- `public/_headers`: header bảo mật khi lên Cloudflare
- `e2e/`: test trên trình duyệt; `src/data/*.test.js`: test phần dữ liệu
- `src/styles.css`: toàn bộ màu sắc, hiệu ứng kính mờ, chuyển động, giao diện tối/sáng; `src/fonts.css`: font Inter (chỉ nạp bộ chữ Latin và tiếng Việt)
- `src/components/CommandPalette.jsx`, `palette.js`: bảng Tìm nhanh (Ctrl/⌘ + K)
- `scripts/make-icons.mjs`: vẽ biểu tượng app và ảnh xem trước khi chia sẻ link (chạy lại khi đổi thiết kế)

## Giao diện và phím tắt
Giao diện tối kiểu Raycast là mặc định, có hiệu ứng kính mờ như iOS. Nút trên thanh trên cùng đổi qua Tối, Sáng, Theo máy; trang nhớ lựa chọn trên từng máy. Máy bật "Giảm chuyển động" hoặc "Giảm độ trong suốt" thì hiệu ứng tự giảm theo.

| Ở đâu | Phím | Làm gì |
|---|---|---|
| Mọi trang | Ctrl + K (Mac: ⌘ + K) | Mở Tìm nhanh: tìm môn, ghi chú, lệnh; gõ không dấu vẫn ra |
| Tìm nhanh | ↑ ↓, Enter, Esc | Chọn, mở, đóng |
| Thẻ lật | Space | Lật thẻ |
| Thẻ lật (đã lật) | 1, 2, 3, 4 (hoặc ←, →) | Chấm Quên, Khó, Nhớ, Dễ; ← là Quên, → là Nhớ |
| Trắc nghiệm | A đến D (hoặc 1 đến 4), Enter | Chọn đáp án, sang câu tiếp |

## Dữ liệu được lưu thế nào
- Lưu bằng IndexedDB của trình duyệt: chứa được nhiều hơn localStorage rất nhiều. Gõ xong 0,4 giây thì tự lưu, và chỉ ghi phần vừa đổi nên dữ liệu lớn vẫn mượt.
- Mở nhiều tab cùng lúc: tab nào sửa thì các tab khác tự cập nhật theo, không ghi đè lên nhau.
- Ghi không được (ví dụ bộ nhớ máy đầy) thì trang báo ngay và có nút thử lại, không im lặng làm mất dữ liệu.
- Dữ liệu của bản cũ (localStorage) được tự chuyển sang khi mở bản mới, bản cũ vẫn giữ nguyên phòng khi cần.
- Có thay đổi chưa sao lưu quá 7 ngày thì trang nhắc tải file sao lưu. Safari có thể xoá dữ liệu trang web sau 7 ngày không mở, nên trên iPhone/iPad nên thêm trang vào Màn hình chính.

## Kiểm tra tự động
- Mỗi lần đẩy code lên GitHub hoặc mở đề xuất thay đổi (pull request), GitHub tự chạy: soát code, test dữ liệu, build, test trên trình duyệt (`.github/workflows/ci.yml`).
- Dependabot mỗi tuần tự đề xuất cập nhật thư viện (`.github/dependabot.yml`); bản mới phải ra được 7 ngày mới được đề xuất.

## Bảo mật
- Không có tài khoản, không gửi dữ liệu đi đâu.
- Content-Security-Policy chặn chạy mã lạ; nội dung người dùng nhập luôn hiển thị dạng chữ thường.
- Khi lên Cloudflare, file `public/_headers` gửi kèm các header: cấm nhúng trang vào web khác, chỉ dùng HTTPS, không gửi địa chỉ trang cho web khác, tắt camera/micro/vị trí.
- File sao lưu được kiểm tra và làm sạch trước khi nạp.

## Đưa lên mạng
Lệnh build: `npm run build`, thư mục kết quả: `dist`. Nếu đặt biến môi trường `SITE_URL` (ví dụ `https://so-on-tap.pages.dev`), lúc chia sẻ link trang sẽ hiện ảnh xem trước.
