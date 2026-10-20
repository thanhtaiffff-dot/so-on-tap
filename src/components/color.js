// Tính màu cho phần tự chỉnh giao diện: đổi qua lại giữa mã màu (#rrggbb) và không gian màu OKLCH
// (độ sáng, độ đậm, sắc độ giống cách mắt người cảm nhận), rồi đo độ tương phản chữ theo chuẩn WCAG.
// Công thức OKLab theo https://bottosson.github.io/posts/oklab/

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

export function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
}

export const toHex = (rgb) => `#${rgb.map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('')}`

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

export function rgbToOklch(rgb) {
  const [r, g, b] = rgb.map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const h = (Math.atan2(B, A) * 180) / Math.PI
  return [L, Math.hypot(A, B), h < 0 ? h + 360 : h]
}

// Màu sRGB tuyến tính (chưa giới hạn trong 0..1, để biết màu có nằm ngoài dải màn hình hiển thị được không).
function oklchToLinear([L, C, h]) {
  const A = C * Math.cos((h * Math.PI) / 180)
  const B = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (lin) => lin.every((c) => c >= -1e-4 && c <= 1 + 1e-4)

// Màu hiển thị được gần nhất: giữ độ sáng và sắc độ, giảm độ đậm đến khi màn hình thường hiện được.
export function oklchToRgb([L, C, h]) {
  L = clamp(L, 0, 1)
  let lin = oklchToLinear([L, C, h])
  if (!inGamut(lin)) {
    let lo = 0
    let hi = C
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(oklchToLinear([L, mid, h]))) lo = mid
      else hi = mid
    }
    lin = oklchToLinear([L, lo, h])
  }
  return lin.map((c) => toGamma(clamp(c, 0, 1)))
}

// Độ sáng tương đối và độ tương phản theo WCAG 2 (chữ thường cần ít nhất 4,5:1, tương phản cao 7:1).
export function luminance(rgb) {
  const [r, g, b] = rgb.map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// Đặt màu nửa trong suốt lên trên một màu nền (trộn như trình duyệt vẽ).
export const over = (top, alpha, base) => top.map((c, i) => c * alpha + base[i] * (1 - alpha))

// Giữ sắc độ của màu đã chọn, chỉ đổi độ sáng ít nhất có thể để chữ màu này đọc rõ (độ tương phản ≥ min)
// trên mọi nền trong `bgs`, và trên các nền `tinted` khi được phủ thêm một lớp chính màu đó (như nhãn "Đến hạn").
// Nền tối thì làm sáng màu lên, nền sáng thì làm tối đi.
export function fitContrast(rgb, { bgs, tinted = [], min, tint = 0.12 }) {
  const ok = (c) => bgs.every((bg) => contrast(c, bg) >= min) && tinted.every((bg) => contrast(c, over(c, tint, bg)) >= min)
  if (ok(rgb)) return rgb
  const [L, C, h] = rgbToOklch(rgb)
  const darkBg = bgs.every((bg) => luminance(bg) < 0.18)
  let lo = L
  let hi = darkBg ? 1 : 0
  if (!ok(oklchToRgb([hi, C, h]))) return darkBg ? [1, 1, 1] : [0, 0, 0]
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (ok(oklchToRgb([mid, C, h]))) hi = mid
    else lo = mid
  }
  return oklchToRgb([hi, C, h])
}

// Chữ trên nền màu: đen hoặc trắng, chọn bên nào rõ hơn (luôn đạt ít nhất 4,5:1).
export const inkOn = (rgb) => (contrast(rgb, [0, 0, 0]) >= contrast(rgb, [1, 1, 1]) ? [0, 0, 0] : [1, 1, 1])
