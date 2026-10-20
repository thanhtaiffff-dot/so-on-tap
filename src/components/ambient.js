// Màu của lớp nền phía sau kính (khối .ambient trong App). Mặc định theo màu nhấn; khi mở một môn thì đổi sang
// màu của môn, trừ khi người dùng chọn "Theo màu nhấn" hoặc tắt hẳn vệt màu (Cài đặt → Giao diện).
let subject = null // màu của môn đang mở
let current = null // sắc độ đang hiện, có thể nhỏ hơn 0 hay lớn hơn 360 để chuyển màu theo đường ngắn nhất

const num = (v, fallback) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

export function refreshAmbient() {
  const el = document.querySelector('.ambient')
  if (!el) return
  const root = document.documentElement
  const css = getComputedStyle(root)
  const bySubject = subject != null && (root.dataset.ambient ?? 'subject') === 'subject'
  const hue = bySubject ? subject : num(css.getPropertyValue('--accent-h'), 22)
  const chroma = bySubject ? 1 : num(css.getPropertyValue('--accent-c'), 1)
  current ??= num(getComputedStyle(el).getPropertyValue('--ambient-hue'), hue)
  // Chuyển sang màu mới theo đường ngắn nhất trên vòng màu (đỏ → tím → xanh, không đi vòng qua vàng, lục).
  current = hue + 360 * Math.round((current - hue) / 360)
  el.style.setProperty('--ambient-hue', current)
  el.style.setProperty('--ambient-chroma', chroma)
}

// Mở một môn (hue) hoặc rời môn (null).
export function setSubjectHue(hue) {
  subject = hue
  refreshAmbient()
}
