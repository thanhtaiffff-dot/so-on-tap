// Màu của lớp nền phía sau kính (khối .ambient trong App), đổi theo môn đang mở.
export const DEFAULT_HUE = 22 // đỏ cam kiểu Raycast, giống trong styles.css

let current = DEFAULT_HUE

// Chuyển sang màu mới theo đường ngắn nhất trên vòng màu (đỏ → tím → xanh, không đi vòng qua vàng, lục).
export function setAmbientHue(hue) {
  const el = document.querySelector('.ambient')
  if (!el) return
  current = hue + 360 * Math.round((current - hue) / 360)
  el.style.setProperty('--ambient-hue', current)
}
