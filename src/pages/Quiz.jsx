import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store.jsx'
import { formatDate, quizCounts, shuffle } from '../components/util.js'

function makeQuestions(cards, count, reverse) {
  const ask = (c) => (reverse ? c.back : c.front)
  const ans = (c) => (reverse ? c.front : c.back)
  // Mỗi đáp án là của câu nào, để khi chọn sai thì giải thích được "đáp án bạn chọn là của câu khác".
  const owner = new Map()
  for (const c of cards) if (!owner.has(ans(c))) owner.set(ans(c), ask(c))
  return shuffle(cards).slice(0, count).map((card) => {
    const wrong = shuffle([...owner.keys()].filter((t) => t !== ans(card))).slice(0, 3)
    return {
      prompt: ask(card),
      correct: ans(card),
      note: card.note,
      options: shuffle([ans(card), ...wrong]),
      owners: Object.fromEntries(wrong.map((t) => [t, owner.get(t)])),
    }
  })
}

export default function Quiz({ subject, cards }) {
  const { state, dispatch, newId } = useStore()
  const [count, setCount] = useState(10)
  const [reverse, setReverse] = useState(false)
  const [questions, setQuestions] = useState(null)
  // Lượt làm lại các câu sai: chỉ để luyện, không ghi vào lịch sử điểm.
  const [redo, setRedo] = useState(false)
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState(null)
  const [answers, setAnswers] = useState([])
  const history = state.quizHistory.filter((q) => q.subjectId === subject.id).slice(-5).reverse()

  if (cards.length < 4)
    return (
      <div className="empty">
        <h2>Cần ít nhất 4 thẻ để làm trắc nghiệm</h2>
        <p className="muted">Mỗi câu có 4 đáp án, lấy từ các thẻ trong môn. Môn này đang có {cards.length} thẻ.</p>
        <Link className="btn" to={`/mon/${subject.id}/the`}>Thêm thẻ</Link>
      </div>
    )

  const chosen = Math.min(count, cards.length)

  function start(list = makeQuestions(cards, chosen, reverse), again = false) {
    setQuestions(list)
    setRedo(again)
    setPos(0)
    setPicked(null)
    setAnswers([])
  }

  if (!questions)
    return (
      <section className="study narrow">
        <h2>Làm bài trắc nghiệm</h2>
        <div className="field">
          <span className="label">Số câu</span>
          <div className="seg" role="radiogroup" aria-label="Số câu">
            {quizCounts(cards.length).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={chosen === n} onClick={() => setCount(n)}>
                {n === cards.length ? `Tất cả (${n})` : n}
              </button>
            ))}
          </div>
        </div>
        <label className="toggle">
          <input id="quiz-reverse" type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} />
          Hỏi ngược (cho đáp án, chọn câu hỏi)
        </label>
        <button type="button" className="btn big-btn" onClick={() => start()}>Bắt đầu</button>
        {history.length > 0 && (
          <div className="history">
            <h3 className="eyebrow">Các lần gần đây</h3>
            <ul>
              {history.map((h, i) => (
                <li key={i} className="num"><span>{formatDate(h.at)}</span><b>{h.score}/{h.total}</b></li>
              ))}
            </ul>
          </div>
        )}
      </section>
    )

  if (pos >= questions.length) {
    const score = answers.filter((a) => a.ok).length
    const wrong = answers.filter((a) => !a.ok)
    const grade = Math.round((score / questions.length) * 100) / 10
    return (
      <section className="study narrow">
        <div className="result">
          <p className="eyebrow">{redo ? 'Kết quả làm lại câu sai' : 'Kết quả'}</p>
          <p className="big num">{score}/{questions.length}</p>
          {redo ? (
            <p className="muted">Lượt làm lại chỉ để luyện, không tính vào lịch sử điểm.</p>
          ) : (
            <p className="muted num">Quy ra thang 10: <b>{grade.toLocaleString('vi-VN')}</b> điểm</p>
          )}
        </div>
        {wrong.length > 0 && (
          <div className="review">
            <h2>Câu làm sai</h2>
            <ul>
              {wrong.map((w, i) => (
                <li key={i}>
                  <b>{w.q.prompt}</b>
                  <span className="bad-text">Bạn chọn: {w.pick}</span>
                  <span className="good-text">Đáp án: {w.q.correct}</span>
                  <Explain q={w.q} pick={w.pick} short />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="row wrap">
          {wrong.length > 0 && (
            <button type="button" className="btn" onClick={() => start(shuffle(wrong.map((w) => ({ ...w.q, options: shuffle(w.q.options) }))), true)}>
              Làm lại {wrong.length} câu sai
            </button>
          )}
          <button type="button" className={wrong.length ? 'btn ghost' : 'btn'} onClick={() => start()}>Làm bài mới</button>
          <button type="button" className="btn ghost" onClick={() => setQuestions(null)}>Đổi cài đặt</button>
        </div>
      </section>
    )
  }

  const q = questions[pos]
  function pick(opt) {
    if (picked !== null) return
    setPicked(opt)
    const next = [...answers, { q, pick: opt, ok: opt === q.correct }]
    setAnswers(next)
    if (next.length === questions.length && !redo) {
      dispatch({ type: 'quiz/record', id: newId(), subjectId: subject.id, score: next.filter((a) => a.ok).length, total: questions.length })
    }
  }

  return (
    <Question key={pos} q={q} pos={pos} total={questions.length} right={answers.filter((a) => a.ok).length}
      picked={picked} onPick={pick} onNext={() => { setPos(pos + 1); setPicked(null) }} />
  )
}

// Lời giải sau mỗi câu: đáp án đúng, đáp án vừa chọn là của câu nào, và phần giải thích của thẻ (nếu có).
// `short`: trong danh sách câu sai (đã ghi sẵn "Bạn chọn" và "Đáp án") thì chỉ thêm phần còn lại.
function Explain({ q, pick, short = false }) {
  const wrong = pick !== q.correct
  const other = wrong ? q.owners?.[pick] : null
  if (!(wrong && !short) && !other && !q.note) return null
  return (
    <div className="explain">
      {wrong && !short && <p>Đáp án đúng: <b>{q.correct}</b></p>}
      {other && <p className="muted">“{pick}” là đáp án của câu “{other}”.</p>}
      {q.note && <p><span className="explain-label">Giải thích</span>{q.note}</p>}
    </div>
  )
}

const KEYS = 'abcd'

function Question({ q, pos, total, right, picked, onPick, onNext }) {
  // Phím tắt: A, B, C, D (hoặc 1 đến 4) để chọn đáp án; Enter để sang câu tiếp.
  useEffect(() => {
    if (picked !== null) return
    function onKey(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"], dialog')) return
      const k = e.key.toLowerCase()
      const i = KEYS.includes(k) ? KEYS.indexOf(k) : '1234'.indexOf(k)
      if (i < 0 || i >= q.options.length) return
      e.preventDefault()
      onPick(q.options[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picked, q, onPick])

  return (
    <section className="study narrow">
      <div className="row between">
        <p className="eyebrow">Câu {pos + 1} / {total}</p>
        <p className="muted small num">Đúng {right}</p>
      </div>
      <div className="progress"><span style={{ width: `${(pos / total) * 100}%` }} /></div>
      <h2 className="question">{q.prompt}</h2>
      <div className="options">
        {q.options.map((opt, i) => {
          let cls = 'option'
          if (picked !== null && opt === q.correct) cls += ' is-correct'
          else if (picked === opt) cls += ' is-wrong'
          return (
            <button key={opt} type="button" className={cls} style={{ '--i': i }} onClick={() => onPick(opt)}
              disabled={picked !== null && picked !== opt && opt !== q.correct} aria-keyshortcuts={KEYS[i].toUpperCase()}>
              <kbd className="opt-key">{KEYS[i].toUpperCase()}</kbd>
              <span>{opt}</span>
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <div className="feedback" role="status">
          <div className="row between">
            <b className={picked === q.correct ? 'good-text' : 'bad-text'}>{picked === q.correct ? 'Chính xác!' : 'Chưa đúng'}</b>
            <button type="button" className="btn" autoFocus onClick={onNext}>
              {pos + 1 === total ? 'Xem kết quả' : 'Câu tiếp'} <kbd aria-hidden="true">↵</kbd>
            </button>
          </div>
          <Explain q={q} pick={picked} />
        </div>
      )}
    </section>
  )
}
