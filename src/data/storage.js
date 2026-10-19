// Lớp lưu trữ dữ liệu.
// Hiện tại lưu ngay trong trình duyệt (localStorage).
// Sau này muốn đăng nhập Google + đồng bộ, chỉ cần viết lại 2 hàm loadData / saveData ở file này.

const KEY = 'so-on-tap:v1'
const LIMITS = { name: 60, front: 500, back: 500, title: 120, body: 20000 }

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? sanitize(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearData() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* bỏ qua */
  }
}

// Kiểm tra và làm sạch dữ liệu (dùng khi đọc từ máy hoặc khi nhập file sao lưu),
// để file lạ hoặc bị sửa bậy không làm hỏng trang.
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')
const id = (v) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : null)
const num = (v, min, max, d) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d)

export function sanitize(input) {
  if (!input || typeof input !== 'object') throw new Error('File không đúng định dạng')
  const subjects = (Array.isArray(input.subjects) ? input.subjects : [])
    .map((s) => ({
      id: id(s?.id),
      name: str(s?.name, LIMITS.name).trim(),
      hue: num(s?.hue, 0, 360, 220),
      createdAt: num(s?.createdAt, 0, 9e15, Date.now()),
    }))
    .filter((s) => s.id && s.name)
  const ok = new Set(subjects.map((s) => s.id))
  const cards = (Array.isArray(input.cards) ? input.cards : [])
    .map((c) => ({
      id: id(c?.id),
      subjectId: id(c?.subjectId),
      front: str(c?.front, LIMITS.front).trim(),
      back: str(c?.back, LIMITS.back).trim(),
      box: num(c?.box, 0, 5, 0),
      reviewedAt: num(c?.reviewedAt, 0, 9e15, 0),
    }))
    .filter((c) => c.id && ok.has(c.subjectId) && c.front && c.back)
  const notes = (Array.isArray(input.notes) ? input.notes : [])
    .map((n) => ({
      id: id(n?.id),
      subjectId: id(n?.subjectId),
      title: str(n?.title, LIMITS.title),
      body: str(n?.body, LIMITS.body),
      updatedAt: num(n?.updatedAt, 0, 9e15, Date.now()),
    }))
    .filter((n) => n.id && ok.has(n.subjectId))
  const quizHistory = (Array.isArray(input.quizHistory) ? input.quizHistory : [])
    .map((q) => ({
      subjectId: id(q?.subjectId),
      score: num(q?.score, 0, 1000, 0),
      total: num(q?.total, 1, 1000, 1),
      at: num(q?.at, 0, 9e15, 0),
    }))
    .filter((q) => ok.has(q.subjectId))
    .slice(-200)
  return { version: 1, subjects, cards, notes, quizHistory }
}

export { LIMITS }
