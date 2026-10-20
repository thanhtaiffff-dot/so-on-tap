// Lịch ôn ngắt quãng bằng thuật toán FSRS (thư viện ts-fsrs, cùng thuật toán Anki đang dùng).
// Mỗi lần ôn, người học tự chấm thẻ: Quên, Khó, Nhớ hoặc Dễ. Thuật toán ước lượng thẻ còn nhớ được
// bao lâu rồi hẹn hỏi lại đúng lúc sắp quên: thẻ nhớ chắc thì lâu mới hỏi lại, thẻ hay quên thì hỏi sớm.
import { GenSeedStrategyWithCardId, S_MIN, StrategyMode, fsrs, generatorParameters } from 'ts-fsrs'

// Trạng thái thẻ (giống Anki): mới, đang học (các bước vài phút), đã vào lịch ôn, học lại sau khi quên.
export const NEW = 0
export const LEARNING = 1
export const REVIEW = 2
export const RELEARNING = 3

export const AGAIN = 1
export const HARD = 2
export const GOOD = 3
export const EASY = 4
export const GRADES = [AGAIN, HARD, GOOD, EASY]

// Mỗi môn học tối đa 20 thẻ mới mỗi ngày, để bài ôn của những ngày sau không bị dồn.
export const NEW_PER_DAY = 20
// Nhớ được ít nhất 3 tuần (như thẻ "trưởng thành" của Anki) thì tính là đã thuộc.
export const MASTERED_DAYS = 21
// Thẻ đang học hẹn lại trong vòng 20 phút tới thì vẫn hiện trong lượt đang ôn, khỏi phải chờ.
export const LEARN_AHEAD = 20 * 60e3
export { S_MIN }

const DAY = 864e5
const ROLLOVER = 4 * 3600e3

// Một "ngày ôn" tính từ 4 giờ sáng đến 4 giờ sáng hôm sau theo giờ trên máy, nên thức khuya ôn bài
// vẫn tính là hôm trước. ts-fsrs đếm ngày theo giờ UTC, nên thời gian được dịch đi trước khi đưa vào thư viện.
const offset = (t) => new Date(t).getTimezoneOffset() * 60e3
const toLib = (t) => t - offset(t) - ROLLOVER
const fromLib = (t) => t + ROLLOVER + offset(t)
export const studyDay = (t) => Math.floor(toLib(t) / DAY)

// Độ lệch ngẫu nhiên nhỏ của ngày hẹn (để thẻ học cùng ngày không đến hạn dồn một ngày) tính từ mã thẻ,
// nên số ngày ghi trên nút chấm luôn khớp với ngày hẹn thật.
const scheduler = fsrs(generatorParameters({ enable_fuzz: true })).useStrategy(StrategyMode.SEED, GenSeedStrategyWithCardId('id'))

// Phần lịch ôn của một thẻ chưa học lần nào.
export const blank = () => ({ state: NEW, due: 0, stability: 0, difficulty: 0, step: 0, reps: 0, lapses: 0, reviewedAt: 0, learnedAt: 0 })

// Bản trước chỉ xếp thẻ vào "hộp" 0 đến 5 (hộp càng cao càng thuộc): chuyển sang lịch ôn mới
// với số ngày nhớ ước lượng theo hộp. Thẻ hộp 0 đã từng ôn là thẻ vừa quên, nên cần ôn ngay.
const BOX_DAYS = [1, 1, 3, 7, 14, 30]
export function fromBox(box, reviewedAt) {
  if (!box && !reviewedAt) return blank()
  const stability = BOX_DAYS[box]
  return {
    state: REVIEW,
    due: box ? reviewedAt + stability * DAY : reviewedAt,
    stability,
    difficulty: box ? 5 : 7,
    step: 0,
    reps: Math.max(1, box),
    lapses: box ? 0 : 1,
    reviewedAt,
    learnedAt: reviewedAt,
  }
}

// Lần ôn trước nằm ở tương lai (đồng hồ máy từng bị chỉnh sai) thì coi như vừa ôn lúc `now`,
// vì ts-fsrs báo lỗi khi thời gian chạy ngược.
function toLibCard(c, now) {
  return {
    id: c.id,
    due: new Date(toLib(c.due)),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: c.step,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.reviewedAt ? new Date(toLib(Math.min(c.reviewedAt, now))) : undefined,
  }
}

// Thẻ sau khi được chấm `rating` (AGAIN đến EASY) lúc `now`.
export function grade(card, rating, now) {
  const r = scheduler.next(toLibCard(card, now), new Date(toLib(now)), rating).card
  return {
    ...card,
    state: r.state,
    due: fromLib(r.due.getTime()),
    stability: r.stability,
    difficulty: r.difficulty,
    step: r.learning_steps,
    reps: r.reps,
    lapses: r.lapses,
    reviewedAt: now,
    learnedAt: card.learnedAt || now,
  }
}

// Thời điểm hẹn ôn lại ứng với từng mức chấm (theo thứ tự GRADES), để ghi lên nút.
export function preview(card, now) {
  const p = scheduler.repeat(toLibCard(card, now), new Date(toLib(now)))
  return GRADES.map((g) => fromLib(p[g].card.due.getTime()))
}

// Khả năng còn nhớ thẻ lúc `now`, từ 0 đến 1 (thẻ mới, hoặc thẻ không rõ lần ôn trước, là 0).
export function retrievability(card, now) {
  if (card.state === NEW || !card.reviewedAt) return 0
  return scheduler.get_retrievability(toLibCard(card, now), new Date(toLib(now)), false)
}

export const isNew = (c) => c.state === NEW
export const isMastered = (c) => c.state === REVIEW && c.stability >= MASTERED_DAYS

// Thẻ trong lịch ôn đến hạn trong ngày ôn hôm nay; thẻ đang học (các bước vài phút) đã hoặc sắp đến giờ.
export function isDue(c, now) {
  if (c.state === NEW) return false
  if (c.state === REVIEW) return studyDay(c.due) <= studyDay(now)
  return c.due <= now + LEARN_AHEAD
}

// Số thẻ mới còn được học hôm nay trong một môn.
export function newLeft(cards, now) {
  const today = studyDay(now)
  let started = 0
  for (const c of cards) if (c.learnedAt && studyDay(c.learnedAt) === today) started++
  return Math.max(0, NEW_PER_DAY - started)
}

// Việc hôm nay của một môn: thẻ đến hạn (quá hạn lâu nhất đứng trước), thẻ mới trong mức của ngày
// (thẻ thêm trước học trước, `extra` là số thẻ mới học thêm ngoài mức), và số thẻ mới còn để dành.
export function today(cards, now, extra = 0) {
  const due = cards.filter((c) => isDue(c, now)).sort((a, b) => a.due - b.due)
  const all = cards.filter(isNew)
  const fresh = all.slice(0, newLeft(cards, now) + extra)
  return { due, fresh, waiting: all.length - fresh.length }
}

// Lần ôn tới khi hôm nay đã ôn xong: sau mấy ngày (0 là lát nữa trong hôm nay) và bao nhiêu thẻ.
export function upcoming(cards, now) {
  const today = studyDay(now)
  let day = Infinity
  let count = 0
  for (const c of cards) {
    if (c.state === NEW || isDue(c, now)) continue
    const d = studyDay(c.due)
    if (d < day) {
      day = d
      count = 0
    }
    if (d === day) count++
  }
  return count ? { days: Math.max(0, day - today), count } : null
}

// Một lượt ôn. Thẻ chính (đến hạn, thẻ mới) đi lần lượt; thẻ vừa quên hoặc còn đang học thì quay lại
// sau vài phút theo các bước học của FSRS, hết thẻ chính thì hiện luôn thẻ đang học, khỏi phải chờ.
// `current` là thẻ đang hiện, `null` là đã xong lượt.
export function startSession(ids, now) {
  return pick({ main: ids, learning: [], current: null, reviewed: 0, forgot: 0 }, now)
}

function pick(s, now) {
  const soonest = s.learning[0]
  const current = soonest && soonest.due <= now ? soonest.id : (s.main[0] ?? soonest?.id ?? null)
  return { ...s, current }
}

const without = (s, id) => ({ ...s, main: s.main.filter((x) => x !== id), learning: s.learning.filter((x) => x.id !== id) })

// Chấm xong thẻ đang hiện: `next` là thẻ sau khi chấm (kết quả của grade).
export function answerSession(s, next, rating, now) {
  const rest = without(s, next.id)
  const learning =
    next.state === REVIEW ? rest.learning : [...rest.learning, { id: next.id, due: next.due }].sort((a, b) => a.due - b.due)
  return pick({ ...rest, learning, reviewed: s.reviewed + 1, forgot: s.forgot + (rating === AGAIN ? 1 : 0) }, now)
}

// Bỏ qua thẻ đang hiện (ví dụ thẻ vừa bị xoá ở tab khác).
export const skipSession = (s, now) => pick(without(s, s.current), now)

export const remaining = (s) => s.main.length + s.learning.length
