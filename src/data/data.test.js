import { afterEach, describe, expect, it, vi } from 'vitest'
import { sanitize, toBackup, DataError, LIMITS } from './schema.js'
import { applyChanges, diffState, shallowEqual } from './diff.js'
import { uid } from './uuid.js'
import { makeSample } from './sample.js'
import { reducer } from './store.jsx'
import { formatDays, formatSpan, parseBulk, quizCounts } from '../components/util.js'
import { NEW, REVIEW } from './srs.js'

const DAY = 864e5
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => vi.unstubAllGlobals())

describe('uid', () => {
  it('tạo UUID v4 khi có randomUUID', () => expect(uid()).toMatch(UUID))

  it('vẫn tạo được khi trang mở qua http (không có randomUUID)', () => {
    const real = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: (b) => real.getRandomValues(b) })
    const ids = new Set(Array.from({ length: 200 }, uid))
    expect(ids.size).toBe(200)
    for (const id of ids) expect(id).toMatch(UUID)
  })

  it('vẫn tạo được khi không có crypto', () => {
    vi.stubGlobal('crypto', undefined)
    expect(uid()).toMatch(UUID)
  })
})

describe('sanitize', () => {
  const v1 = {
    version: 1,
    subjects: [
      { id: 'en', name: ' Tiếng Anh ', hue: 222, createdAt: 200 },
      { id: 'ly', name: 'Vật lý', hue: 999, createdAt: 100 },
    ],
    cards: [
      { id: 'c1', subjectId: 'en', front: 'a', back: 'b', box: 4, reviewedAt: 5 },
      { id: 'c2', subjectId: 'en', front: 'c', back: 'd', box: 9 },
      { id: 'c3', subjectId: 'nope', front: 'x', back: 'y' },
      { id: 'bad id!', subjectId: 'en', front: 'x', back: 'y' },
      { id: 'c4', subjectId: 'en', front: '   ', back: 'y' },
    ],
    notes: [{ id: 'n1', subjectId: 'ly', title: 'T', body: 'x'.repeat(LIMITS.body + 50), updatedAt: 1 }],
    quizHistory: [{ subjectId: 'en', score: 12, total: 10, at: 3 }],
  }

  it('đọc được file bản cũ và giữ đúng thứ tự trong file', () => {
    const d = sanitize(v1, { now: 1000 })
    expect(d.version).toBe(3)
    expect(d.subjects.map((s) => s.id)).toEqual(['en', 'ly'])
    expect(d.subjects[0].name).toBe('Tiếng Anh')
    expect(d.subjects[1].hue).toBe(360)
    expect(d.cards.map((c) => c.id)).toEqual(['c1', 'c2'])
    // Hộp của bản cũ được chuyển sang lịch ôn mới: hộp 4 là nhớ được khoảng 2 tuần.
    expect(d.cards[0]).toMatchObject({ state: REVIEW, stability: 14, due: 5 + 14 * DAY, reviewedAt: 5, note: '', createdAt: 0 })
    expect(d.cards[1]).toMatchObject({ state: REVIEW, stability: 30 })
    expect(d.cards[0]).not.toHaveProperty('box')
    expect(d.notes[0].body).toHaveLength(LIMITS.body)
    expect(d.quizHistory[0].score).toBe(10)
    expect(d.quizHistory[0].id).toMatch(UUID)
  })

  it('bỏ bản ghi trùng mã', () => {
    const d = sanitize({ subjects: [{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }] })
    expect(d.subjects).toHaveLength(1)
    expect(d.subjects[0].name).toBe('A')
  })

  it('từ chối file lạ thay vì xoá sạch dữ liệu', () => {
    expect(() => sanitize({})).toThrow(DataError)
    expect(() => sanitize([])).toThrow(DataError)
    expect(() => sanitize({ app: 'khac', subjects: [] })).toThrow(DataError)
    expect(() => sanitize({ subjects: [], version: 99 })).toThrow(/mới hơn/)
  })

  it('file sao lưu đọc lại ra đúng dữ liệu cũ', () => {
    const data = sanitize(makeSample(5000))
    expect(sanitize(JSON.parse(JSON.stringify(toBackup(data, 1))))).toEqual(data)
  })

  it('dữ liệu mẫu giữ thứ tự Tiếng Anh trước Vật lý', () => {
    expect(sanitize(makeSample()).subjects.map((s) => s.name)).toEqual(['Tiếng Anh', 'Vật lý'])
  })

  it('dữ liệu đọc từ kho được sắp theo thời điểm tạo, không theo thứ tự mã', () => {
    const d = sanitize({ subjects: [{ id: 'b', name: 'Sau', createdAt: 2 }, { id: 'a', name: 'Trước', createdAt: 1 }] }, { ordered: false })
    expect(d.subjects.map((s) => s.name)).toEqual(['Trước', 'Sau'])
    expect(d.subjects[1].createdAt).toBe(2)
  })
})

describe('diffState / applyChanges', () => {
  const base = sanitize(makeSample(1000))

  it('chỉ ghi bản ghi đã đổi', () => {
    const card = base.cards[2]
    const next = { ...base, cards: base.cards.map((c) => (c === card ? { ...c, front: 'đã sửa' } : c)) }
    const d = diffState(base, next)
    expect(Object.keys(d)).toEqual(['cards'])
    expect(d.cards.put.map((c) => c.id)).toEqual([card.id])
    expect(d.cards.del).toEqual([])
  })

  it('nhận ra bản ghi bị xoá và bản ghi mới', () => {
    const next = { ...base, notes: [{ id: 'new', subjectId: base.subjects[0].id, title: '', body: '', updatedAt: 1 }] }
    const d = diffState(base, next)
    expect(d.notes.put.map((n) => n.id)).toEqual(['new'])
    expect(d.notes.del).toHaveLength(2)
  })

  it('so theo nội dung khi đọc lại từ kho', () => {
    const copy = JSON.parse(JSON.stringify(base))
    expect(diffState(base, copy)).not.toEqual({})
    expect(diffState(base, copy, shallowEqual)).toEqual({})
  })

  it('applyChanges cho ra đúng dữ liệu đích, đúng thứ tự', () => {
    const next = reducer(base, { type: 'card/delete', id: base.cards[0].id, now: 1 })
    const added = reducer(next, { type: 'card/addMany', subjectId: base.subjects[1].id, items: [{ id: 'z', front: 'q', back: 'a' }], now: 2 })
    expect(applyChanges(base, diffState(base, added))).toEqual(added)
  })
})

describe('reducer', () => {
  const s = sanitize(makeSample(1000))

  it('chấm thẻ thì hẹn lần ôn tới, thẻ khác giữ nguyên', () => {
    const id = s.cards[0].id
    const next = reducer(s, { type: 'card/grade', id, rating: 4, now: 5 * DAY })
    expect(next.cards[0]).toMatchObject({ state: REVIEW, reviewedAt: 5 * DAY, learnedAt: 5 * DAY, reps: 1 })
    expect(next.cards[0].due).toBeGreaterThan(5 * DAY + 2 * DAY)
    expect(next.cards.slice(1)).toEqual(s.cards.slice(1))
  })

  it('thêm và sửa thẻ có phần giải thích', () => {
    let next = reducer(s, { type: 'card/addMany', subjectId: s.subjects[0].id, items: [{ id: 'n', front: 'f', back: 'b', note: 'g' }], now: 1 })
    expect(next.cards.at(-1)).toMatchObject({ note: 'g', state: NEW })
    next = reducer(next, { type: 'card/update', id: 'n', front: 'f2', back: 'b2', note: '' })
    expect(next.cards.at(-1)).toMatchObject({ front: 'f2', back: 'b2', note: '' })
  })

  it('thẻ mới luôn nằm cuối dù đồng hồ máy chạy lùi', () => {
    const next = reducer(s, { type: 'card/addMany', subjectId: s.subjects[0].id, items: [{ id: 'x', front: 'f', back: 'b' }], now: 1 })
    expect(next.cards.at(-1).id).toBe('x')
    expect(next.cards.at(-1).createdAt).toBeGreaterThan(next.cards.at(-2).createdAt)
  })

  it('xoá ghi chú rỗng của đúng môn', () => {
    let next = reducer(s, { type: 'note/add', id: 'e1', subjectId: s.subjects[0].id, now: 1 })
    next = reducer(next, { type: 'note/add', id: 'e2', subjectId: s.subjects[1].id, now: 1 })
    next = reducer(next, { type: 'note/dropEmpty', subjectId: s.subjects[0].id })
    expect(next.notes.map((n) => n.id)).not.toContain('e1')
    expect(next.notes.map((n) => n.id)).toContain('e2')
    expect(reducer(next, { type: 'note/dropEmpty', subjectId: s.subjects[0].id })).toBe(next)
  })

  it('giữ tối đa 200 lần làm bài', () => {
    let next = s
    for (let i = 0; i < 205; i++) next = reducer(next, { type: 'quiz/record', id: `q${i}`, subjectId: s.subjects[0].id, score: 1, total: 2, now: i })
    expect(next.quizHistory).toHaveLength(200)
    expect(next.quizHistory[0].id).toBe('q5')
  })
})

describe('quizCounts (lỗi L8: nút ghi 5 / 6 / 6)', () => {
  it('không có nút trùng số', () => {
    expect(quizCounts(6)).toEqual([5, 6])
    expect(quizCounts(4)).toEqual([4])
    expect(quizCounts(10)).toEqual([5, 10])
    expect(quizCounts(50)).toEqual([5, 10, 20, 50])
  })
})

describe('parseBulk', () => {
  it('đọc các kiểu ngăn cách', () => {
    expect(parseBulk('a - b\nc\td\ne;f\ng | h\n\nkhông có dấu')).toEqual([
      { front: 'a', back: 'b', note: '' },
      { front: 'c', back: 'd', note: '' },
      { front: 'e', back: 'f', note: '' },
      { front: 'g', back: 'h', note: '' },
    ])
  })

  it('dán từ Excel 3 cột thì cột thứ ba là phần giải thích', () => {
    expect(parseBulk('ambitious\ttham vọng; hoài bão\tShe is ambitious.\nx\ty\t')).toEqual([
      { front: 'ambitious', back: 'tham vọng; hoài bão', note: 'She is ambitious.' },
      { front: 'x', back: 'y', note: '' },
    ])
  })
})

describe('sanitize: lịch ôn và phần giải thích', () => {
  const base = { subjects: [{ id: 's', name: 'Môn' }] }

  it('giữ nguyên lịch ôn hợp lệ, sửa số lạ thay vì làm hỏng thuật toán', () => {
    const card = { id: 'c', subjectId: 's', front: 'f', back: 'b', note: ' ví dụ ', state: REVIEW, due: 5000, stability: 12.5, difficulty: 4.2, step: 0, reps: 3, lapses: 1, reviewedAt: 4000, learnedAt: 1000 }
    const d = sanitize({ ...base, version: 3, cards: [card] })
    expect(d.cards[0]).toEqual({ ...card, note: 'ví dụ', createdAt: 0 })
    const bad = sanitize({ ...base, cards: [{ ...card, stability: 0, difficulty: 99, reps: -4, step: 2.6 }] }).cards[0]
    expect(bad.stability).toBeGreaterThan(0)
    expect(bad).toMatchObject({ difficulty: 10, reps: 1, step: 3 })
  })

  it('thẻ mới thì không giữ lịch ôn rác; trạng thái lạ thì đọc theo kiểu cũ', () => {
    const d = sanitize({ ...base, cards: [
      { id: 'a', subjectId: 's', front: 'f', back: 'b', state: NEW, reps: 7, stability: 3 },
      { id: 'b', subjectId: 's', front: 'f', back: 'b', state: 9, box: 0, reviewedAt: 0 },
    ] })
    expect(d.cards[0]).toMatchObject({ state: NEW, reps: 0, stability: 0, learnedAt: 0 })
    expect(d.cards[1]).toMatchObject({ state: NEW })
  })

  it('cắt phần giải thích quá dài', () => {
    const d = sanitize({ ...base, cards: [{ id: 'a', subjectId: 's', front: 'f', back: 'b', note: 'x'.repeat(LIMITS.note + 9) }] })
    expect(d.cards[0].note).toHaveLength(LIMITS.note)
  })
})

describe('formatSpan / formatDays', () => {
  it('ghi thời gian dễ đọc', () => {
    expect(formatSpan(30e3)).toBe('1 phút')
    expect(formatSpan(10 * 60e3)).toBe('10 phút')
    expect(formatSpan(5 * 3600e3)).toBe('5 giờ')
    expect(formatSpan(3 * DAY)).toBe('3 ngày')
    expect(formatSpan(45 * DAY)).toBe('1,5 tháng')
    expect(formatSpan(800 * DAY)).toBe('2,2 năm')
    expect([0, 1, 4].map(formatDays)).toEqual(['hôm nay', 'ngày mai', '4 ngày nữa'])
  })
})
