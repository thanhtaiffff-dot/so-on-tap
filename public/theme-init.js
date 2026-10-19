// Đặt giao diện sáng/tối đã chọn trước khi trang hiện ra, để không bị nháy màu khi mở trang.
try {
  var t = localStorage.getItem('so-on-tap:theme')
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t)
} catch (e) {
  /* trình duyệt chặn localStorage: dùng giao diện theo máy */
}
