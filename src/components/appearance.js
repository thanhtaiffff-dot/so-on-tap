// Phần tự chỉnh giao diện (Cài đặt → Giao diện): các lựa chọn, bộ nền, màu nhấn, chủ đề nhanh,
// và cách tính ra thuộc tính data-* cùng biến CSS để vẽ trang. Chỉ tính toán, không đụng tới trang, nên test được.
import { contrast, fitContrast, inkOn, luminance, oklchToRgb, over, parseHex, rgbToOklch, toHex } from './color.js'

// Bộ nền: mỗi bộ là một bảng màu đầy đủ trong styles.css (khối [data-palette='…']).
// bg, glass (màu + độ trong của tấm kính) và glow (độ sáng, độ đậm của vệt màu phía sau) phải giống trong styles.css:
// dùng để tính màu nhấn đủ tương phản trên nền thật (test so khớp hai nơi này).
export const PALETTES = {
  dark: { label: 'Tối', scheme: 'dark', bg: '#08080a', glass: [24, 24, 30, 0.55], glow: [0.62, 0.42], accent: '#ff6363' },
  oled: { label: 'Đen OLED', scheme: 'dark', bg: '#000000', glass: [18, 18, 22, 0.5], glow: [0.62, 0.3], accent: '#ff6363' },
  dim: { label: 'Xám dịu', scheme: 'dark', bg: '#1d2027', glass: [42, 46, 56, 0.55], glow: [0.62, 0.32], accent: '#ff7d7d' },
  light: { label: 'Sáng', scheme: 'light', bg: '#f2f2f5', glass: [255, 255, 255, 0.58], glow: [0.8, 0.6], accent: '#be1b32' },
  paper: { label: 'Giấy kem', scheme: 'light', bg: '#f3ecdf', glass: [255, 252, 244, 0.6], glow: [0.82, 0.35], accent: '#b02e26' },
}
export const DARK_PALETTES = ['dark', 'oled', 'dim']
export const LIGHT_PALETTES = ['light', 'paper']

// Màu nhấn có sẵn. Màu nào cũng được tự chỉnh độ sáng theo bộ nền cho chữ dễ đọc.
export const ACCENTS = [
  { id: 'default', label: 'Đỏ cam (mặc định)', hex: '#ff6363' },
  { id: '#ff8a3d', label: 'Cam' },
  { id: '#f5c518', label: 'Vàng' },
  { id: '#3ecf6e', label: 'Xanh lá' },
  { id: '#2dd4bf', label: 'Xanh ngọc' },
  { id: '#38bdf8', label: 'Xanh trời' },
  { id: '#4f7cff', label: 'Xanh dương' },
  { id: '#a78bfa', label: 'Tím' },
  { id: '#f472b6', label: 'Hồng' },
  { id: '#a1a1aa', label: 'Xám' },
].map((a) => ({ hex: a.id, ...a }))

export const DEFAULTS = {
  dark: 'dark',
  light: 'light',
  accent: 'default',
  ambient: 'subject',
  glass: 'blur',
  font: 'inter',
  size: '100',
  round: 'medium',
  contrast: 'normal',
  motion: 'full',
  primary: 'neutral',
}

export const CHOICES = {
  dark: DARK_PALETTES,
  light: LIGHT_PALETTES,
  ambient: ['subject', 'accent', 'off'],
  glass: ['blur', 'solid'],
  font: ['inter', 'system', 'serif'],
  size: ['90', '100', '112', '125'],
  round: ['sharp', 'medium', 'round'],
  contrast: ['normal', 'high'],
  motion: ['full', 'reduce'],
  primary: ['neutral', 'accent'],
}

// Các lựa chọn đặt thành thuộc tính data-* trên thẻ <html> (khác mặc định mới đặt). styles.css đổi giao diện theo đó.
export const ATTRS = ['ambient', 'glass', 'font', 'size', 'round', 'contrast', 'motion', 'primary', 'accent']
// Biến CSS được tính bằng JavaScript, đặt thẳng lên thẻ <html>: màu nhấn cho chữ (đã chỉnh cho đủ tương phản),
// màu nhấn để tô nền nút cùng màu chữ trên nút, sắc độ và độ đậm của màu (cho logo và vệt màu phía sau).
export const VARS = ['--accent', '--accent-fill', '--accent-fill-ink', '--accent-h', '--accent-c']

const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/.test(v)

// Đọc lựa chọn đã lưu: chỉ nhận giá trị nằm trong danh sách cho phép, còn lại dùng mặc định.
export function parse(raw) {
  const out = { ...DEFAULTS }
  if (!raw || typeof raw !== 'object') return out
  for (const [key, list] of Object.entries(CHOICES)) if (list.includes(raw[key])) out[key] = raw[key]
  const accent = typeof raw.accent === 'string' ? raw.accent.toLowerCase() : ''
  if (isHex(accent)) out.accent = accent
  return out
}

export const isDefault = (s) => Object.keys(DEFAULTS).every((k) => s[k] === DEFAULTS[k])

// Chế độ đang dùng ra sáng hay tối: "Theo máy" thì theo cài đặt của máy.
export const schemeOf = (mode, prefersDark) => (mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode)

const rgb = ([r, g, b]) => [r / 255, g / 255, b / 255]

// Những nền mà chữ màu nhấn có thể nằm trên: nền trang, tấm kính, và tấm kính đặt trên chỗ vệt màu phía sau
// sáng nhất (bộ nền tối) hoặc tối nhất (bộ nền sáng), thử đủ mọi màu của vệt.
const surfaceCache = new Map()
export function surfaces(id) {
  if (surfaceCache.has(id)) return surfaceCache.get(id)
  const p = PALETTES[id]
  const bg = parseHex(p.bg)
  const glass = rgb(p.glass)
  const panel = over(glass, p.glass[3], bg)
  const dark = p.scheme === 'dark'
  let worst = panel
  for (let h = 0; h < 360; h += 2) {
    const glow = over(oklchToRgb([p.glow[0], 0.2, h]), p.glow[1], bg)
    const c = over(glass, p.glass[3], glow)
    if (dark ? luminance(c) > luminance(worst) : luminance(c) < luminance(worst)) worst = c
  }
  const s = { bg, panel, worst }
  surfaceCache.set(id, s)
  return s
}

const round = (x, d = 0) => Number(x.toFixed(d))

// Màu chữ nhấn trên một bộ nền: đạt 4,5:1 (tương phản cao: 7:1) trên mọi nền chữ có thể nằm lên.
export function accentOn(id, hex, high = false) {
  const s = surfaces(id)
  const min = (high ? 7 : 4.5) + 0.05 // dư một chút vì mã màu làm tròn
  return toHex(fitContrast(parseHex(hex), { bgs: [s.bg, s.panel, s.worst], tinted: [s.bg, s.panel], min }))
}

// Chữ trên nền màu: đen hoặc trắng, bên nào rõ hơn.
export const inkFor = (hex) => toHex(inkOn(parseHex(hex)))

export const minContrast = (id, hex) => {
  const s = surfaces(id)
  const c = parseHex(hex)
  return Math.min(contrast(c, s.bg), contrast(c, s.panel), contrast(c, s.worst))
}

// Tính cách vẽ trang cho một bộ lựa chọn: thuộc tính data-* (chung) và biến CSS cho từng chế độ sáng/tối.
// Lưu cùng lựa chọn để public/theme-init.js vẽ đúng ngay khi mở trang, trước khi phần còn lại của trang tải xong.
export function paint(s) {
  const attrs = {}
  for (const k of ATTRS) if (k !== 'accent' && s[k] !== DEFAULTS[k]) attrs[k] = s[k]
  const custom = s.accent !== 'default'
  if (custom) attrs.accent = 'custom'
  const hue = {}
  if (custom) {
    const [, C, h] = rgbToOklch(parseHex(s.accent))
    hue['--accent-h'] = String(round(h))
    hue['--accent-c'] = String(round(Math.min(1, C / 0.13), 2))
  }
  const high = s.contrast === 'high'
  const scheme = (id) => {
    const vars = { ...hue }
    // Màu mặc định của từng bộ nền đã chỉnh sẵn trong styles.css; chỉ tính khi đổi màu hoặc bật tương phản cao.
    // Nút tô màu nhấn giữ đúng màu đã chọn (chữ trên nút là đen hoặc trắng nên luôn đọc rõ),
    // trừ khi bật tương phản cao: khi đó nút dùng màu đã chỉnh cho chữ trên nút càng rõ hơn.
    if (custom || high) {
      const base = custom ? s.accent : PALETTES[id].accent
      const text = accentOn(id, base, high)
      const fill = high ? text : base
      vars['--accent'] = text
      vars['--accent-fill'] = fill
      vars['--accent-fill-ink'] = inkFor(fill)
    }
    return { palette: id, bar: PALETTES[id].bg, vars }
  }
  return { attrs, dark: scheme(s.dark), light: scheme(s.light) }
}

// Chủ đề nhanh: bấm một lần đổi cả bộ màu, phông và hình khối. Cỡ chữ, tương phản, chuyển động giữ nguyên
// (đó là lựa chọn cho mắt và cho máy của từng người, không thuộc về "kiểu dáng").
export const LOOK = ['dark', 'light', 'accent', 'ambient', 'glass', 'font', 'round', 'primary']
const look = (set) => Object.fromEntries(LOOK.filter((k) => k !== 'dark' && k !== 'light').map((k) => [k, set[k] ?? DEFAULTS[k]]))
export const PRESETS = [
  { id: 'mac-dinh', label: 'Mặc định', mode: 'dark', set: { dark: 'dark', light: 'light', ...look({}) } },
  { id: 'dem-oled', label: 'Đêm OLED', mode: 'dark', set: { dark: 'oled', ...look({ accent: '#4f7cff', ambient: 'off', font: 'system', primary: 'accent' }) } },
  { id: 'diu-mat', label: 'Dịu mắt', mode: 'dark', set: { dark: 'dim', ...look({ accent: '#2dd4bf', ambient: 'accent', round: 'round' }) } },
  { id: 'giay-muc', label: 'Giấy và mực', mode: 'light', set: { light: 'paper', ...look({ ambient: 'off', glass: 'solid', font: 'serif', round: 'sharp' }) } },
  { id: 'anh-dao', label: 'Anh đào', mode: 'light', set: { light: 'light', ...look({ accent: '#f472b6', ambient: 'accent', round: 'round', primary: 'accent' }) } },
]

export const presetActive = (p, s, mode) => p.mode === mode && Object.entries(p.set).every(([k, v]) => s[k] === v)
