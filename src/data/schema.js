// Hình dạng dữ liệu của Sổ Ôn Tập, và bước kiểm tra, làm sạch dữ liệu.
// Dùng khi đọc từ máy, khi chuyển dữ liệu cũ sang cách lưu mới và khi nhập file sao lưu,
// để file lạ hoặc bị sửa bậy không làm hỏng trang.
import { uid } from './uuid.js'
import { NEW, RELEARNING, S_MIN, blank, fromBox } from './srs.js'

// Phiên bản 3: thẻ có lịch ôn FSRS và phần giải thích.
export const VERSION = 3
export const LIMITS = { name: 60, front: 500, back: 500, note: 1000, title: 120, body: 20000 }
export const QUIZ_KEEP = 200
export const STORES = ['subjects', 'cards', 'notes', 'quizHistory']

// Lỗi có câu giải thích dành cho người dùng.
export class DataError extends Error {}

const cmpId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
const byCreated = (a, b) => a.createdAt - b.createdAt || cmpId(a, b)
export const ORDER = {
  subjects: byCreated,
  cards: byCreated,
  notes: (a, b) => b.updatedAt - a.updatedAt || cmpId(a, b),
  quizHistory: (a, b) => a.at - b.at || cmpId(a, b),
}

export const emptyData = () => ({ version: VERSION, subjects: [], cards: [], notes: [], quizHistory: [] })

// Sắp xếp lại các danh sách (IndexedDB trả bản ghi theo thứ tự mã, không theo thứ tự tạo).
export function normalize(data) {
  const out = { version: VERSION }
  for (const s of STORES) out[s] = [...(data[s] ?? [])].sort(ORDER[s])
  out.quizHistory = out.quizHistory.slice(-QUIZ_KEEP)
  return out
}

// Thời gian trong dữ liệu không quá năm 9999, để các phép tính ngày ôn luôn ra một ngày hợp lệ.
const MAX_TIME = Date.UTC(9999, 11, 31)
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')
const id = (v) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : null)
const num = (v, min, max, d) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d)
const int = (v, min, max, d) => Math.round(num(v, min, max, d))
const list = (v) => (Array.isArray(v) ? v : [])

// Phần lịch ôn của thẻ. Thẻ của bản trước (chỉ có "hộp" 0 đến 5) được chuyển sang lịch ôn mới.
function schedule(c) {
  if (!Number.isInteger(c?.state) || c.state < NEW || c.state > RELEARNING) return fromBox(int(c?.box, 0, 5, 0), num(c?.reviewedAt, 0, MAX_TIME, 0))
  if (c.state === NEW) return blank()
  return {
    state: c.state,
    due: num(c.due, 0, MAX_TIME, 0),
    stability: num(c.stability, S_MIN, 1e5, 1),
    difficulty: num(c.difficulty, 1, 10, 5),
    step: int(c.step, 0, 9, 0),
    reps: int(c.reps, 1, 1e6, 1),
    lapses: int(c.lapses, 0, 1e6, 0),
    reviewedAt: num(c.reviewedAt, 0, MAX_TIME, 0),
    learnedAt: num(c.learnedAt, 0, MAX_TIME, 0),
  }
}

function unique(items) {
  const seen = new Set()
  return items.filter((x) => x.id && !seen.has(x.id) && seen.add(x.id))
}

// Giữ đúng thứ tự trong file: thời điểm tạo nào không tăng dần thì nhích lên cho tăng dần.
// Chỉ dùng khi thứ tự trong mảng có ý nghĩa (file sao lưu, dữ liệu cũ), không dùng cho dữ liệu đọc từ kho.
function inOrder(items, ordered) {
  if (!ordered) return items
  let prev = -Infinity
  for (const x of items) {
    if (x.createdAt <= prev) x.createdAt = prev + 1
    prev = x.createdAt
  }
  return items
}

export function sanitize(input, { now = Date.now(), ordered = true } = {}) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.subjects))
    throw new DataError('File này không phải file sao lưu của Sổ Ôn Tập.')
  if (input.app !== undefined && input.app !== 'so-on-tap') throw new DataError('File này không phải file sao lưu của Sổ Ôn Tập.')
  if (Number.isFinite(input.version) && input.version > VERSION)
    throw new DataError('File này được tạo từ phiên bản Sổ Ôn Tập mới hơn. Hãy tải lại trang rồi thử lại.')

  const subjects = inOrder(
    unique(
      input.subjects.map((s) => ({
        id: id(s?.id),
        name: str(s?.name, LIMITS.name).trim(),
        hue: num(s?.hue, 0, 360, 220),
        createdAt: num(s?.createdAt, 0, MAX_TIME, now),
      })),
    ).filter((s) => s.name),
    ordered,
  )
  const ok = new Set(subjects.map((s) => s.id))
  const cards = inOrder(
    unique(
      list(input.cards).map((c, i) => ({
        id: id(c?.id),
        subjectId: id(c?.subjectId),
        front: str(c?.front, LIMITS.front).trim(),
        back: str(c?.back, LIMITS.back).trim(),
        note: str(c?.note, LIMITS.note).trim(),
        // Bản cũ (v1) chưa có thời điểm tạo: lấy theo vị trí trong danh sách.
        createdAt: num(c?.createdAt, 0, MAX_TIME, i),
        ...schedule(c),
      })),
    ).filter((c) => ok.has(c.subjectId) && c.front && c.back),
    ordered,
  )
  const notes = unique(
    list(input.notes).map((n) => ({
      id: id(n?.id),
      subjectId: id(n?.subjectId),
      title: str(n?.title, LIMITS.title),
      body: str(n?.body, LIMITS.body),
      updatedAt: num(n?.updatedAt, 0, MAX_TIME, now),
    })),
  ).filter((n) => ok.has(n.subjectId))
  const quizHistory = unique(
    list(input.quizHistory).map((q) => {
      const total = Math.round(num(q?.total, 1, 1000, 1))
      return {
        id: id(q?.id) ?? uid(),
        subjectId: id(q?.subjectId),
        score: Math.min(total, Math.round(num(q?.score, 0, 1000, 0))),
        total,
        at: num(q?.at, 0, MAX_TIME, 0),
      }
    }),
  ).filter((q) => ok.has(q.subjectId))
  return normalize({ subjects, cards, notes, quizHistory })
}

// Nội dung file sao lưu.
export function toBackup(state, now = Date.now()) {
  const out = { app: 'so-on-tap', version: VERSION, exportedAt: now }
  for (const s of STORES) out[s] = state[s]
  return out
}
