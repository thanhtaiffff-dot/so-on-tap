// Giao diện sáng/tối: mặc định là tối (kiểu Raycast). Lựa chọn của người dùng được nhớ trong máy.
import { useSyncExternalStore } from 'react'

export const THEMES = ['dark', 'light', 'system']
export const THEME_LABEL = { dark: 'Tối', light: 'Sáng', system: 'Theo máy' }
// Khoá mới: bản cũ luôn tự lưu "system" khi mở trang, nên giá trị đó không phải do người dùng chọn.
const KEY = 'so-on-tap:giao-dien'
const OLD_KEY = 'so-on-tap:theme'
const BAR = { dark: '#08080a', light: '#f2f2f5' }

function read() {
  try {
    const t = localStorage.getItem(KEY)
    if (THEMES.includes(t)) return t
    const old = localStorage.getItem(OLD_KEY)
    return old === 'light' || old === 'dark' ? old : 'dark'
  } catch {
    return 'dark'
  }
}

let current = read()
const subs = new Set()

// Màu thanh trạng thái (điện thoại, ứng dụng đã cài) theo giao diện đang chọn.
function syncThemeColor(mode) {
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    m.dataset.media ??= m.media
    m.dataset.color ??= m.content
    m.media = mode === 'system' ? m.dataset.media : ''
    m.content = mode === 'system' ? m.dataset.color : BAR[mode]
  }
}

export function setTheme(mode) {
  if (!THEMES.includes(mode)) return
  current = mode
  const apply = () => {
    document.documentElement.setAttribute('data-theme', mode)
    syncThemeColor(mode)
  }
  // Đổi màu bằng hiệu ứng mờ dần (nếu trình duyệt hỗ trợ và người dùng không chọn giảm chuyển động).
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches)
    document.startViewTransition(apply).ready.catch(() => {})
  else apply()
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* trình duyệt chặn localStorage: chỉ đổi cho lần mở này */
  }
  subs.forEach((f) => f())
}

const subscribe = (f) => {
  subs.add(f)
  return () => subs.delete(f)
}

export const useTheme = () => useSyncExternalStore(subscribe, () => current)
