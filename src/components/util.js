export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const MASTERED_BOX = 3
export const HUES = [222, 152, 12, 280, 38, 190, 330, 95]

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Đọc danh sách thẻ dán vào, mỗi dòng một thẻ: "mặt trước - mặt sau" (hoặc dùng Tab, dấu ; hay |).
export function parseBulk(text) {
  const items = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    const m = t.match(/^(.+?)\s*(?:\t|\s-\s|\s–\s|;|\|)\s*(.+)$/)
    if (m) items.push({ front: m[1].trim().slice(0, 500), back: m[2].trim().slice(0, 500) })
  }
  return items
}
