// Giao diện: chế độ sáng/tối (nút trên thanh trên cùng, mặc định là tối kiểu Raycast) và phần tự chỉnh
// (Cài đặt → Giao diện). Lựa chọn được nhớ trong máy; public/theme-init.js đọc lại để vẽ đúng ngay khi mở trang.
import { useSyncExternalStore } from 'react'
import { ATTRS, DEFAULTS, PALETTES, VARS, isDefault, paint, parse, schemeOf } from './appearance.js'
import { refreshAmbient } from './ambient.js'

export const THEMES = ['dark', 'light', 'system']
export const THEME_LABEL = { dark: 'Tối', light: 'Sáng', system: 'Theo máy' }
// Khoá mới: bản cũ luôn tự lưu "system" khi mở trang, nên giá trị đó không phải do người dùng chọn.
const KEY = 'so-on-tap:giao-dien'
const OLD_KEY = 'so-on-tap:theme'
// Phần tự chỉnh, cùng cách vẽ đã tính sẵn (xem paint trong appearance.js). Giữ đúng tên khoá như public/theme-init.js.
const LOOK_KEY = 'so-on-tap:tuy-chinh'

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // trình duyệt chặn localStorage
  }
}

function readMode() {
  const t = read(KEY)
  if (THEMES.includes(t)) return t
  const old = read(OLD_KEY)
  return old === 'light' || old === 'dark' ? old : 'dark'
}

function readLook() {
  try {
    return parse(JSON.parse(read(LOOK_KEY)))
  } catch {
    return { ...DEFAULTS } // dữ liệu hỏng
  }
}

function save(key, value) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* trình duyệt chặn localStorage: chỉ đổi cho lần mở này */
  }
}

const darkQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
let mode = readMode()
let look = readLook()
let painted
store() // bản cập nhật có thể đổi cách tính màu: lưu lại ngay để lần mở sau theme-init.js vẽ đúng từ đầu
let state = snapshot()
const subs = new Set()

function snapshot() {
  const scheme = schemeOf(mode, darkQuery?.matches ?? true)
  return { mode, look, scheme, palette: painted[scheme].palette }
}

// Màu thanh trạng thái (điện thoại, ứng dụng đã cài) theo bộ nền đang dùng. "Theo máy" thì mỗi thẻ meta giữ
// điều kiện sáng/tối của nó và lấy màu của bộ nền tương ứng.
function syncThemeColor(scheme) {
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    m.dataset.media ??= m.media
    const own = m.dataset.media.includes('dark') ? 'dark' : 'light'
    m.media = mode === 'system' ? m.dataset.media : ''
    m.content = PALETTES[painted[mode === 'system' ? own : scheme].palette].bg
  }
}

function apply() {
  state = snapshot()
  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  root.setAttribute('data-palette', state.palette)
  for (const k of ATTRS) {
    const v = painted.attrs[k]
    if (v) root.setAttribute(`data-${k}`, v)
    else root.removeAttribute(`data-${k}`)
  }
  const vars = painted[state.scheme].vars
  for (const v of VARS) {
    if (vars[v] != null) root.style.setProperty(v, vars[v])
    else root.style.removeProperty(v)
  }
  syncThemeColor(state.scheme)
  refreshAmbient()
  subs.forEach((f) => f())
}

const reduceMotion = () =>
  document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches

// Đổi màu bằng hiệu ứng mờ dần (nếu trình duyệt hỗ trợ và người dùng không chọn giảm chuyển động).
function fade(change) {
  if (document.startViewTransition && !reduceMotion()) document.startViewTransition(change).ready.catch(() => {})
  else change()
}

export function setTheme(next) {
  if (!THEMES.includes(next)) return
  mode = next
  save(KEY, next)
  fade(apply)
}

// Lưu lựa chọn cùng cách vẽ đã tính sẵn (chỉ ghi khi khác bản đang lưu).
function store() {
  painted = paint(look)
  const value = isDefault(look) ? null : JSON.stringify({ ...look, paint: painted })
  if (read(LOOK_KEY) !== value) save(LOOK_KEY, value)
}

// Đổi một hay nhiều lựa chọn tự chỉnh. withFade: đổi cả bộ màu (đổi bộ nền, chủ đề nhanh) thì cho mờ dần.
export function setLook(patch, { withFade = false } = {}) {
  look = parse({ ...look, ...patch })
  store()
  if (withFade) fade(apply)
  else apply()
}

// Chọn một bộ nền. Nếu đang để luôn sáng mà chọn bộ nền tối (hay ngược lại) thì chuyển chế độ luôn để thấy ngay.
export function pickPalette(id) {
  const scheme = PALETTES[id]?.scheme
  if (!scheme) return
  look = parse({ ...look, [scheme]: id })
  store()
  if (mode !== 'system' && mode !== scheme) {
    mode = scheme
    save(KEY, mode)
  }
  fade(apply)
}

export function applyPreset(p) {
  look = parse({ ...look, ...p.set })
  store()
  if (p.mode) {
    mode = p.mode
    save(KEY, mode)
  }
  fade(apply)
}

export function resetLook() {
  look = { ...DEFAULTS }
  store()
  fade(apply)
}

const subscribe = (f) => {
  subs.add(f)
  return () => subs.delete(f)
}

export const useTheme = () => useSyncExternalStore(subscribe, () => mode)
export const useAppearance = () => useSyncExternalStore(subscribe, () => state)

// "Theo máy": máy đổi sáng/tối (ví dụ tự đổi lúc tối trời) thì trang đổi theo ngay.
darkQuery?.addEventListener?.('change', apply)

// Đổi giao diện ở tab khác thì tab này đổi theo.
window.addEventListener('storage', (e) => {
  if (e.key !== null && e.key !== KEY && e.key !== LOOK_KEY) return
  mode = readMode()
  look = readLook()
  painted = paint(look)
  apply()
})

// Áp ngay khi nạp trang: theme-init.js đã vẽ gần đúng, ở đây vẽ lại theo cách tính mới nhất.
apply()
