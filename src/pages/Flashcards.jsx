import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store.jsx'
import { formatDays, formatSpan, shuffle } from '../components/util.js'
import { useNow } from '../components/useNow.js'
import {
  AGAIN, EASY, GOOD, HARD, NEW_PER_DAY,
  answerSession, grade, isMastered, preview, remaining, retrievability, skipSession, startSession, today, upcoming,
} from '../data/srs.js'

// Các mức chấm sau khi lật thẻ, giống Anki: Quên thì vài phút sau hỏi lại, Dễ thì lâu mới hỏi lại.
const GRADE_BUTTONS = [
  { rating: AGAIN, label: 'Quên', cls: 'bad' },
  { rating: HARD, label: 'Khó', cls: 'hard' },
  { rating: GOOD, label: 'Nhớ', cls: 'good' },
  { rating: EASY, label: 'Dễ', cls: 'easy' },
]
const KEYS = { 1: AGAIN, 2: HARD, 3: GOOD, 4: EASY, ArrowLeft: AGAIN, ArrowRight: GOOD }
// Bấm "Học thêm thẻ mới" thì lấy thêm chừng này thẻ ngoài mức mỗi ngày.
const EXTRA_NEW = 10

// Lượt "Hôm nay": thẻ đến hạn rồi đến thẻ mới. Lượt "Ôn tự do": mọi thẻ (hoặc chỉ thẻ chưa thuộc),
// thẻ dễ quên nhất đứng trước, cùng mức thì xáo ngẫu nhiên.
function begin(cards, mode, onlyWeak, extra = 0) {
  const now = Date.now()
  if (mode === 'free') {
    const pool = onlyWeak ? cards.filter((c) => !isMastered(c)) : cards
    const level = new Map(pool.map((c) => [c.id, Math.round(retrievability(c, now) * 10)]))
    return startSession(shuffle(pool).sort((a, b) => level.get(a.id) - level.get(b.id)).map((c) => c.id), now)
  }
  const t = today(cards, now, extra)
  return startSession([...t.due, ...t.fresh].map((c) => c.id), now)
}

export default function Flashcards({ subject, cards }) {
  const { dispatch } = useStore()
  const now = useNow()
  const [mode, setMode] = useState('today')
  const [onlyWeak, setOnlyWeak] = useState(false)
  const [reverse, setReverse] = useState(false)
  const [run, setRun] = useState(() => begin(cards, 'today', false))
  const [flipped, setFlipped] = useState(false)
  // Lúc lật thẻ: số ngày hẹn ghi trên các nút chấm tính từ lúc này.
  const [shownAt, setShownAt] = useState(0)
  const cardRef = useRef(null)
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const card = run.current ? byId.get(run.current) : null
  const times = useMemo(() => (card && shownAt ? preview(card, shownAt) : null), [card, shownAt])
  const plan = useMemo(() => today(cards, now), [cards, now])

  const restart = useCallback((nextMode, weak, extra = 0) => {
    setMode(nextMode)
    setRun(begin(cards, nextMode, weak, extra))
    setFlipped(false)
    setShownAt(0)
  }, [cards])

  const flip = useCallback(() => {
    const t = Date.now()
    setFlipped((f) => !f)
    setShownAt((s) => s || t)
  }, [])

  const answer = useCallback((rating) => {
    if (!card || !flipped) return
    const t = Date.now()
    const next = grade(card, rating, t)
    dispatch({ type: 'card/grade', id: card.id, rating, now: t })
    setRun((r) => answerSession(r, next, rating, t))
    setFlipped(false)
    setShownAt(0)
    // Nút vừa bấm biến mất: đưa con trỏ bàn phím về thẻ, để phím tắt và trình đọc màn hình vẫn theo kịp.
    if (document.activeElement?.closest?.('.answer-row')) cardRef.current?.focus({ preventScroll: true })
  }, [card, flipped, dispatch])

  // Phím tắt: phím cách để lật; lật rồi thì 1 Quên, 2 Khó, 3 Nhớ, 4 Dễ (← là Quên, → là Nhớ).
  // Vẫn dùng được sau khi bấm chuột vào thẻ.
  useEffect(() => {
    function onKey(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target
      if (t.closest?.('input, textarea, select, [contenteditable="true"], dialog')) return
      const onCard = Boolean(t.closest?.('.flashcard'))
      if (!onCard && t.closest?.('button, a, summary, [role="radio"]')) return
      if (e.key === ' ') {
        if (onCard) return // nút thẻ tự lật khi bấm phím cách
        e.preventDefault()
        flip()
      } else if (flipped && !e.repeat && Object.hasOwn(KEYS, e.key)) {
        e.preventDefault()
        answer(KEYS[e.key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, flip, answer])

  if (cards.length === 0)
    return (
      <div className="empty">
        <h2>Môn này chưa có thẻ nào</h2>
        <p className="muted">Thêm vài thẻ (mặt trước là câu hỏi, mặt sau là đáp án) rồi quay lại ôn nhé.</p>
        <Link className="btn" to={`/mon/${subject.id}/the`}>Thêm thẻ</Link>
      </div>
    )

  const left = remaining(run)
  const total = run.reviewed + left
  const front = card ? (reverse ? card.back : card.front) : ''
  const back = card ? (reverse ? card.front : card.back) : ''

  return (
    <section className="study">
      <div className="row wrap between">
        <div className="seg" role="radiogroup" aria-label="Cách ôn">
          <button type="button" role="radio" aria-checked={mode === 'today'} onClick={() => restart('today', onlyWeak)}>
            Hôm nay <span className="count">{plan.due.length + plan.fresh.length}</span>
          </button>
          <button type="button" role="radio" aria-checked={mode === 'free'} onClick={() => restart('free', onlyWeak)}>Ôn tự do</button>
        </div>
        <p className="muted small num">Còn {left} thẻ</p>
      </div>
      <div className="row wrap">
        {mode === 'free' && (
          <label className="toggle">
            <input id="fc-only-weak" type="checkbox" checked={onlyWeak} onChange={(e) => { setOnlyWeak(e.target.checked); restart('free', e.target.checked) }} />
            Chỉ thẻ chưa thuộc
          </label>
        )}
        <label className="toggle">
          <input id="fc-reverse" type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} />
          Đảo mặt thẻ
        </label>
      </div>
      <div className="progress"><span style={{ width: `${total ? (run.reviewed / total) * 100 : 0}%` }} /></div>

      {run.current === null ? (
        <Done mode={mode} run={run} plan={plan} next={upcoming(cards, now)}
          onToday={() => restart('today', onlyWeak)} onMore={() => restart('today', onlyWeak, EXTRA_NEW)} onFree={() => restart('free', onlyWeak)} />
      ) : !card ? (
        <div className="result">
          <p>Thẻ này vừa bị xoá ở một tab khác.</p>
          <button type="button" className="btn" onClick={() => setRun((r) => skipSession(r, Date.now()))}>Sang thẻ tiếp</button>
        </div>
      ) : (
        <>
          <button type="button" ref={cardRef} className={`flashcard ${flipped ? 'is-flipped' : ''}`} onClick={flip}>
            {/* key theo thẻ: mỗi thẻ mới trượt nhẹ vào, còn nút (và chỗ con trỏ bàn phím đang đứng) vẫn giữ nguyên. */}
            <span className="card-inner" key={card.id}>
              <span className="face front" aria-hidden={flipped}>
                <span className="face-label">Câu hỏi</span>
                <span className="face-text">{front}</span>
                <span className="hint">Bấm vào thẻ<span className="on-keyboard"> hoặc phím <kbd>Space</kbd></span> để lật</span>
              </span>
              <span className="face back" aria-hidden={!flipped}>
                <span className="face-label">Đáp án</span>
                <span className="face-text">{back}</span>
                {card.note && <span className="face-note">{card.note}</span>}
              </span>
            </span>
          </button>
          <p className="visually-hidden" aria-live="polite">{flipped ? `Đáp án: ${back}. ${card.note}` : ''}</p>
          <div className="answer-row">
            {flipped ? (
              GRADE_BUTTONS.map((b, i) => (
                <button key={b.rating} type="button" className={`btn grade ${b.cls}`} onClick={() => answer(b.rating)} aria-keyshortcuts={String(i + 1)}>
                  <span className="grade-label">{b.label} <kbd aria-hidden="true">{i + 1}</kbd></span>
                  {times && <span className="grade-time num">{formatSpan(times[i] - shownAt)}</span>}
                </button>
              ))
            ) : (
              <button type="button" className="btn ghost reveal" onClick={flip}>
                Xem đáp án <kbd aria-hidden="true">Space</kbd>
              </button>
            )}
          </div>
          {flipped && run.reviewed < 3 && <p className="muted small grade-help">Chấm xem bạn nhớ thẻ này đến đâu. Thời gian dưới mỗi nút là lúc thẻ sẽ được hỏi lại.</p>}
        </>
      )}
    </section>
  )
}

function Done({ mode, run, plan, next, onToday, onMore, onFree }) {
  const pending = plan.due.length + plan.fresh.length
  return (
    <div className="result">
      <p className="eyebrow">{run.reviewed ? 'Xong lượt này' : mode === 'today' ? 'Hôm nay' : 'Ôn tự do'}</p>
      {run.reviewed > 0 && (
        <p className="big num">{run.reviewed}<small> lượt ôn</small> · {run.forgot}<small> lần quên</small></p>
      )}
      {mode === 'free' ? (
        <>
          <p className="muted small">Ôn tự do vẫn được tính vào lịch ôn: thẻ bạn chấm Quên sẽ được hỏi lại sớm hơn.</p>
          <button type="button" className="btn" onClick={onFree}>Ôn lượt mới</button>
        </>
      ) : pending > 0 ? (
        <>
          <p>Lại có {pending} thẻ cần ôn.</p>
          <button type="button" className="btn" onClick={onToday}>Ôn tiếp</button>
        </>
      ) : (
        <>
          <p>{run.reviewed ? 'Đã ôn xong mọi thẻ cần ôn hôm nay của môn này.' : 'Hôm nay môn này không còn thẻ nào cần ôn.'}</p>
          {next && <p className="muted">Lần ôn tới: <b>{formatDays(next.days)}</b>, {next.count} thẻ.</p>}
          {plan.waiting > 0 && (
            <p className="muted small">Còn {plan.waiting} thẻ mới chưa học. Mỗi ngày chỉ học tối đa {NEW_PER_DAY} thẻ mới, để bài ôn những ngày sau không bị dồn.</p>
          )}
          <div className="row wrap center">
            {plan.waiting > 0 && (
              <button type="button" className="btn" onClick={onMore}>Học thêm {Math.min(EXTRA_NEW, plan.waiting)} thẻ mới</button>
            )}
            <button type="button" className="btn ghost" onClick={onFree}>Ôn tự do</button>
          </div>
        </>
      )}
    </div>
  )
}
