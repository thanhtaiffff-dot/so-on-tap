export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const HUES = [222, 152, 12, 280, 38, 190, 330, 95]

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Đọc danh sách thẻ dán vào, mỗi dòng một thẻ: "mặt trước - mặt sau" (hoặc dùng Tab, dấu ; hay |).
// Dán từ Excel (các cột cách nhau bằng Tab) thì cột thứ ba, nếu có, là phần giải thích.
export function parseBulk(text) {
  const items = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    const cols = t.split('\t').map((x) => x.trim())
    if (cols.length >= 3 && cols[0] && cols[1]) {
      items.push({ front: cols[0].slice(0, 500), back: cols[1].slice(0, 500), note: cols.slice(2).filter(Boolean).join(' ').slice(0, 1000) })
      continue
    }
    const m = t.match(/^(.+?)\s*(?:\t|\s-\s|\s–\s|;|\|)\s*(.+)$/)
    if (m) items.push({ front: m[1].trim().slice(0, 500), back: m[2].trim().slice(0, 500), note: '' })
  }
  return items
}

const vi = (n) => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 })

// Khoảng thời gian dễ đọc: "1 phút", "10 phút", "3 ngày", "1,5 tháng", "2 năm".
export function formatSpan(ms) {
  const min = ms / 60e3
  if (min < 59.5) return `${Math.max(1, Math.round(min))} phút`
  const h = min / 60
  if (h < 23.5) return `${Math.round(h)} giờ`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} ngày`
  if (d < 365) return `${vi(d / 30)} tháng`
  return `${vi(d / 365)} năm`
}

// Sau bao nhiêu ngày ôn: "hôm nay", "ngày mai", "3 ngày nữa", "1,5 tháng nữa".
export function formatDays(n) {
  if (n <= 0) return 'hôm nay'
  if (n === 1) return 'ngày mai'
  return `${formatSpan(n * 864e5)} nữa`
}

// Các lựa chọn số câu trắc nghiệm: chỉ những mức nhỏ hơn số thẻ, rồi thêm "Tất cả".
export function quizCounts(total) {
  return [...[5, 10, 20].filter((n) => n < total), total]
}
