// Vẽ đúng giao diện đã chọn (mặc định: tối) trước khi trang hiện ra, để không bị nháy màu khi mở trang.
// Chỉ chép lại cách vẽ mà src/components/theme.js đã tính sẵn và lưu trong máy; giữ đúng tên khoá như ở đó.
;(function () {
  var root = document.documentElement
  var mode = 'dark'
  var look = null
  try {
    var t = localStorage.getItem('so-on-tap:giao-dien') || localStorage.getItem('so-on-tap:theme')
    if (t === 'light' || (t === 'system' && localStorage.getItem('so-on-tap:giao-dien'))) mode = t
    look = JSON.parse(localStorage.getItem('so-on-tap:tuy-chinh') || 'null')
  } catch (e) {
    /* trình duyệt chặn localStorage hoặc dữ liệu hỏng: dùng giao diện mặc định */
  }
  var dark = mode === 'dark' || (mode === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)
  var paint = look && typeof look.paint === 'object' ? look.paint : null
  var scheme = paint && paint[dark ? 'dark' : 'light']
  // Chỉ nhận chữ thường, số và mã màu: dữ liệu trong máy bị sửa bậy cũng không chèn được gì vào trang.
  var WORD = /^[a-z0-9]{1,12}$/
  var VALUE = /^(#[0-9a-f]{6}|-?\d{1,3}(\.\d{1,4})?)$/
  var palette = scheme && WORD.test(scheme.palette) ? scheme.palette : dark ? 'dark' : 'light'
  root.setAttribute('data-theme', mode)
  root.setAttribute('data-palette', palette)
  var attrs = (paint && paint.attrs) || {}
  for (var k in attrs) if (WORD.test(k) && WORD.test(String(attrs[k]))) root.setAttribute('data-' + k, attrs[k])
  var vars = (scheme && scheme.vars) || {}
  for (var v in vars) if (/^--accent(-[a-z]+){0,2}$/.test(v) && VALUE.test(String(vars[v]))) root.style.setProperty(v, vars[v])

  // Màu thanh trạng thái theo bộ nền. "Theo máy" thì mỗi thẻ meta giữ điều kiện sáng/tối của nó.
  var BAR = { dark: '#08080a', light: '#f2f2f5' }
  var bar = function (s) {
    var b = paint && paint[s] && paint[s].bar
    return VALUE.test(String(b)) ? b : BAR[s]
  }
  var metas = document.querySelectorAll('meta[name="theme-color"]')
  for (var i = 0; i < metas.length; i++) {
    var m = metas[i]
    m.dataset.media = m.media
    if (mode === 'system') m.content = bar(m.media.indexOf('dark') >= 0 ? 'dark' : 'light')
    else {
      m.media = ''
      m.content = bar(dark ? 'dark' : 'light')
    }
  }
})()
