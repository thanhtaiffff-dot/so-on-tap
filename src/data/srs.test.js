import { describe, expect, it } from 'vitest'
import {
  AGAIN, EASY, GOOD, GRADES, HARD, LEARNING, NEW_PER_DAY, RELEARNING, REVIEW,
  answerSession, blank, fromBox, grade, isDue, isMastered, isNew, newLeft, preview, remaining, retrievability, skipSession,
  startSession, studyDay, today, upcoming,
} from './srs.js'

const MIN = 60e3
const DAY = 864e5
// Giờ trên máy (không phải giờ UTC), để test đúng ở mọi múi giờ.
const at = (d, h = 9, m = 0) => new Date(2026, 9, d, h, m).getTime()
const card = (id, extra = {}) => ({ id, subjectId: 's', front: id, back: id, note: '', createdAt: 0, ...blank(), ...extra })

// Học một thẻ mới đến khi vào lịch ôn: Nhớ ở bước đầu, 10 phút sau Nhớ lần nữa.
function learn(c, t) {
  c = grade(c, GOOD, t)
  return grade(c, GOOD, t + 10 * MIN)
}

describe('ngày ôn', () => {
  it('bắt đầu lúc 4 giờ sáng: thức khuya ôn bài vẫn tính là hôm trước', () => {
    expect(studyDay(at(20, 3, 59))).toBe(studyDay(at(19, 10)))
    expect(studyDay(at(20, 4))).toBe(studyDay(at(19, 10)) + 1)
    expect(studyDay(at(20, 23, 59))).toBe(studyDay(at(20, 4)))
  })
})

describe('chấm thẻ mới', () => {
  const t = at(20)

  it('Quên, Khó, Nhớ hỏi lại sau vài phút; Dễ vào lịch ôn luôn', () => {
    expect(grade(card('a'), AGAIN, t)).toMatchObject({ state: LEARNING, due: t + MIN, reps: 1, learnedAt: t, reviewedAt: t })
    expect(grade(card('a'), HARD, t)).toMatchObject({ state: LEARNING, due: t + 6 * MIN })
    expect(grade(card('a'), GOOD, t)).toMatchObject({ state: LEARNING, due: t + 10 * MIN, step: 1 })
    const easy = grade(card('a'), EASY, t)
    expect(easy.state).toBe(REVIEW)
    expect(easy.due - t).toBeGreaterThanOrEqual(3 * DAY)
  })

  it('học xong thì hẹn ngày khác, đến đúng ngày hẹn mới cần ôn', () => {
    const c = learn(card('a'), t)
    expect(c.state).toBe(REVIEW)
    expect(isDue(c, t + 20 * MIN)).toBe(false)
    const day = studyDay(c.due)
    expect(day).toBeGreaterThan(studyDay(t))
    expect(isDue(c, at(20 + day - studyDay(t), 5))).toBe(true)
    expect(isDue(c, at(20 + day - studyDay(t) - 1, 22))).toBe(false)
  })

  it('ngày hẹn ghi trên nút đúng bằng ngày hẹn thật', () => {
    const cards = [card('a'), learn(card('b'), t), grade(learn(card('c'), t), AGAIN, t + DAY)]
    for (const c of cards) {
      const now = t + 3 * DAY
      const shown = preview(c, now)
      GRADES.forEach((g, i) => expect(grade(c, g, now).due).toBe(shown[i]))
    }
  })

  it('thẻ học cùng lúc không đến hạn dồn vào một ngày', () => {
    const days = new Set(Array.from({ length: 40 }, (_, i) => studyDay(grade(card(`c${i}`), EASY, t).due)))
    expect(days.size).toBeGreaterThan(1)
  })
})

describe('đã thuộc (lỗi L4: ôn nhiều lượt trong một ngày thành "đã thuộc")', () => {
  const t = at(1)

  it('bấm Nhớ bao nhiêu lần trong cùng một ngày cũng chưa thành đã thuộc', () => {
    let c = learn(card('a'), t)
    for (let i = 1; i <= 20; i++) c = grade(c, GOOD, t + i * 30 * MIN)
    expect(isMastered(c)).toBe(false)
  })

  it('nhớ được ở các lần ôn cách nhau nhiều ngày thì thành đã thuộc', () => {
    let c = learn(card('a'), t)
    let reviews = 0
    while (!isMastered(c) && reviews < 10) {
      c = grade(c, GOOD, c.due + 3600e3)
      reviews++
    }
    expect(isMastered(c)).toBe(true)
    expect(reviews).toBeLessThanOrEqual(4)
    expect(c.reviewedAt - t).toBeGreaterThan(7 * DAY)
  })
})

describe('quên thẻ đã thuộc', () => {
  it('học lại sau 10 phút rồi quay về lịch ôn, khoảng cách ngắn lại', () => {
    let c = learn(card('a'), at(1))
    c = grade(c, GOOD, c.due)
    const before = c.stability
    const now = c.due
    c = grade(c, AGAIN, now)
    expect(c).toMatchObject({ state: RELEARNING, lapses: 1, due: now + 10 * MIN })
    expect(isDue(c, now)).toBe(true)
    c = grade(c, GOOD, now + 10 * MIN)
    expect(c.state).toBe(REVIEW)
    expect(c.stability).toBeLessThan(before)
  })

  it('khả năng còn nhớ giảm dần theo thời gian', () => {
    const c = learn(card('a'), at(1))
    expect(retrievability(card('x'), at(1))).toBe(0)
    expect(retrievability(c, at(2))).toBeGreaterThan(retrievability(c, at(9)))
  })

  it('thẻ trong file sao lưu thiếu ngày ôn trước vẫn ôn được, không làm hỏng trang', () => {
    const c = card('a', { state: REVIEW, stability: 5, difficulty: 5, reps: 3, due: at(1), reviewedAt: 0 })
    expect(retrievability(c, at(2))).toBe(0)
    expect(grade(c, GOOD, at(2))).toMatchObject({ state: REVIEW, reviewedAt: at(2) })
    expect(preview(c, at(2))).toHaveLength(4)
  })

  it('đồng hồ máy từng chạy nhanh (lần ôn trước nằm ở tương lai) vẫn ôn được, không làm hỏng trang', () => {
    const c = learn(card('a'), at(25))
    expect(preview(c, at(20))).toHaveLength(4)
    expect(grade(c, GOOD, at(20))).toMatchObject({ state: REVIEW, reviewedAt: at(20) })
    expect(retrievability(c, at(20))).toBe(1)
  })
})

describe('việc hôm nay', () => {
  const t = at(20)

  it(`mỗi ngày tối đa ${NEW_PER_DAY} thẻ mới, học thêm được khi muốn`, () => {
    let cards = Array.from({ length: 25 }, (_, i) => card(`c${i}`, { createdAt: i }))
    expect(today(cards, t)).toMatchObject({ waiting: 5 })
    expect(today(cards, t).fresh.map((c) => c.id)).toEqual(cards.slice(0, 20).map((c) => c.id))
    cards = cards.map((c, i) => (i < 20 ? grade(c, EASY, t) : c))
    expect(newLeft(cards, t + 5 * MIN)).toBe(0)
    expect(today(cards, t + 5 * MIN)).toMatchObject({ fresh: [], waiting: 5 })
    expect(today(cards, t + 5 * MIN, 10).fresh).toHaveLength(5)
    expect(today(cards, at(21)).fresh).toHaveLength(5)
  })

  it('thẻ quá hạn lâu nhất đứng trước; thẻ mới không tính là đến hạn', () => {
    const cards = [card('n'), card('b', { state: REVIEW, stability: 3, difficulty: 5, reps: 2, due: t - DAY }), card('a', { state: REVIEW, stability: 3, difficulty: 5, reps: 2, due: t - 3 * DAY })]
    expect(today(cards, t).due.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('lần ôn tới: sau mấy ngày và bao nhiêu thẻ', () => {
    const due = (id, d) => card(id, { state: REVIEW, stability: 3, difficulty: 5, reps: 2, due: at(d) })
    expect(upcoming([card('n'), due('a', 23), due('b', 22), due('c', 22)], t)).toEqual({ days: 2, count: 2 })
    expect(upcoming([card('n')], t)).toBe(null)
  })
})

describe('lượt ôn', () => {
  const t = at(20)

  it('thẻ đang học quay lại sau thẻ chính, xong hết thì kết thúc', () => {
    const a = card('a')
    const b = card('b')
    let s = startSession(['a', 'b'], t)
    expect(s.current).toBe('a')
    const a1 = grade(a, GOOD, t)
    s = answerSession(s, a1, GOOD, t)
    expect(s.current).toBe('b')
    expect(remaining(s)).toBe(2)
    s = answerSession(s, grade(b, EASY, t + MIN), EASY, t + MIN)
    // Hết thẻ chính: thẻ đang học hiện luôn, khỏi chờ đủ 10 phút.
    expect(s.current).toBe('a')
    s = answerSession(s, grade(a1, GOOD, t + 2 * MIN), GOOD, t + 2 * MIN)
    expect(s).toMatchObject({ current: null, reviewed: 3, forgot: 0 })
    expect(remaining(s)).toBe(0)
  })

  it('thẻ vừa quên đến giờ thì được hỏi lại trước thẻ chính', () => {
    let s = startSession(['a', 'b', 'c'], t)
    s = answerSession(s, grade(card('a'), AGAIN, t), AGAIN, t)
    expect(s.current).toBe('b')
    s = answerSession(s, grade(card('b'), EASY, t + 2 * MIN), EASY, t + 2 * MIN)
    expect(s).toMatchObject({ current: 'a', forgot: 1 })
    expect(skipSession(s, t + 3 * MIN).current).toBe('c')
  })

  it('lượt không có thẻ nào thì xong ngay', () => {
    expect(startSession([], t).current).toBe(null)
  })
})

describe('chuyển từ hộp của bản cũ', () => {
  const t = at(10)

  it('thẻ chưa ôn là thẻ mới; hộp càng cao thì càng lâu mới phải ôn', () => {
    expect(fromBox(0, 0)).toEqual(blank())
    expect(fromBox(3, t)).toMatchObject({ state: REVIEW, stability: 7, due: t + 7 * DAY, reviewedAt: t, learnedAt: t })
    expect(fromBox(5, t).due).toBeGreaterThan(fromBox(3, t).due)
  })

  it('thẻ hộp 0 đã từng ôn là thẻ vừa quên: cần ôn ngay, chấm tiếp được', () => {
    const c = card('a', fromBox(0, t))
    expect(isDue(c, t + 1000)).toBe(true)
    expect(c.state).toBe(REVIEW)
    expect(grade(c, GOOD, t + DAY).state).toBe(REVIEW)
    expect(isNew(c)).toBe(false)
  })
})
