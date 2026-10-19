import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store.jsx'
import { MASTERED_BOX, shuffle } from '../components/util.js'

// Thẻ ở hộp thấp (chưa thuộc) được ưu tiên hiện trước.
function buildQueue(cards, onlyNew) {
  const pool = onlyNew ? cards.filter((c) => c.box < MASTERED_BOX) : cards
  return shuffle(pool).sort((a, b) => a.box - b.box).map((c) => c.id)
}

export default function Flashcards({ subject, cards }) {
  const { dispatch } = useStore()
  const [onlyNew, setOnlyNew] = useState(false)
  const [reverse, setReverse] = useState(false)
  const [queue, setQueue] = useState(() => buildQueue(cards, false))
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [tally, setTally] = useState({ yes: 0, no: 0 })

  const restart = useCallback((only = onlyNew) => {
    setQueue(buildQueue(cards, only))
    setPos(0)
    setFlipped(false)
    setTally({ yes: 0, no: 0 })
  }, [cards, onlyNew])

  const current = cards.find((c) => c.id === queue[pos])
  const done = pos >= queue.length

  const answer = useCallback((remembered) => {
    if (!current) return
    dispatch({ type: 'card/review', id: current.id, remembered })
    setTally((t) => (remembered ? { ...t, yes: t.yes + 1 } : { ...t, no: t.no + 1 }))
    setFlipped(false)
    setPos((p) => p + 1)
  }, [current, dispatch])

  useEffect(() => {
    function onKey(e) {
      if (e.target.closest('input, textarea, select, button')) return
      if (e.code === 'Space') { e.preventDefault(); setFlipped((f) => !f) }
      if (flipped && e.key === 'ArrowLeft') answer(false)
      if (flipped && e.key === 'ArrowRight') answer(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, answer])

  if (cards.length === 0)
    return (
      <div className="empty">
        <h2>Môn này chưa có thẻ nào</h2>
        <p className="muted">Thêm vài thẻ (mặt trước là câu hỏi, mặt sau là đáp án) rồi quay lại ôn nhé.</p>
        <Link className="btn" to={`/mon/${subject.id}/the`}>Thêm thẻ</Link>
      </div>
    )

  const front = current ? (reverse ? current.back : current.front) : ''
  const back = current ? (reverse ? current.front : current.back) : ''

  return (
    <section className="study">
      <div className="row wrap between">
        <div className="row wrap">
          <label className="toggle">
            <input id="fc-only-new" type="checkbox" checked={onlyNew} onChange={(e) => { setOnlyNew(e.target.checked); restart(e.target.checked) }} />
            Chỉ thẻ chưa thuộc
          </label>
          <label className="toggle">
            <input id="fc-reverse" type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} />
            Đảo mặt thẻ
          </label>
        </div>
        <p className="muted small num">{Math.min(pos + 1, queue.length)} / {queue.length}</p>
      </div>
      <div className="progress"><span style={{ width: `${queue.length ? (pos / queue.length) * 100 : 0}%` }} /></div>

      {done ? (
        <div className="result">
          <p className="eyebrow">Xong lượt này</p>
          <p className="big num">{tally.yes}<small> nhớ</small> · {tally.no}<small> chưa nhớ</small></p>
          {queue.length === 0 && <p className="muted">Bạn đã thuộc hết thẻ. Bỏ chọn "Chỉ thẻ chưa thuộc" để ôn lại tất cả.</p>}
          <button type="button" className="btn" onClick={() => restart()}>Ôn lượt mới</button>
        </div>
      ) : (
        <>
          <button type="button" className={`flashcard ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped((f) => !f)}
            aria-label={flipped ? `Mặt sau: ${back}. Bấm để lật lại` : `Mặt trước: ${front}. Bấm để lật`}>
            <span className="face front">
              <span className="face-label">Câu hỏi</span>
              <span className="face-text">{front}</span>
              <span className="hint">Bấm vào thẻ hoặc phím cách để lật</span>
            </span>
            <span className="face back">
              <span className="face-label">Đáp án</span>
              <span className="face-text">{back}</span>
            </span>
          </button>
          <div className="answer-row">
            <button type="button" className="btn bad" disabled={!flipped} onClick={() => answer(false)}>Chưa nhớ <kbd>←</kbd></button>
            <button type="button" className="btn good" disabled={!flipped} onClick={() => answer(true)}>Nhớ rồi <kbd>→</kbd></button>
          </div>
        </>
      )}
    </section>
  )
}
