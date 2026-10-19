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

export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()

// Hộp Leitner: nhớ thì lên một hộp (thẻ ít hiện lại hơn), quên thì về hộp 0.
// Mỗi thẻ chỉ lên được một hộp mỗi ngày, nên phải nhớ ở 3 ngày khác nhau mới tính là đã thuộc.
export function review(card, remembered, now) {
  if (!remembered) return { ...card, box: 0, reviewedAt: now, leveledAt: 0 }
  if (card.leveledAt && sameDay(card.leveledAt, now)) return { ...card, reviewedAt: now }
  return { ...card, box: Math.min(5, card.box + 1), reviewedAt: now, leveledAt: now }
}

// Các lựa chọn số câu trắc nghiệm: chỉ những mức nhỏ hơn số thẻ, rồi thêm "Tất cả".
export function quizCounts(total) {
  return [...[5, 10, 20].filter((n) => n < total), total]
}
