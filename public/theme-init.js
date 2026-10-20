// Đặt giao diện đã chọn (mặc định: tối) trước khi trang hiện ra, để không bị nháy màu khi mở trang.
// Giữ đúng như src/components/theme.js.
;(function () {
  var mode = 'dark'
  try {
    var t = localStorage.getItem('so-on-tap:giao-dien') || localStorage.getItem('so-on-tap:theme')
    if (t === 'light' || (t === 'system' && localStorage.getItem('so-on-tap:giao-dien'))) mode = t
  } catch (e) {
    /* trình duyệt chặn localStorage: dùng giao diện mặc định */
  }
  document.documentElement.setAttribute('data-theme', mode)
  if (mode === 'system') return
  var metas = document.querySelectorAll('meta[name="theme-color"]')
  for (var i = 0; i < metas.length; i++) {
    metas[i].dataset.media = metas[i].media
    metas[i].dataset.color = metas[i].content
    metas[i].media = ''
    metas[i].content = mode === 'light' ? '#f2f2f5' : '#08080a'
  }
})()
