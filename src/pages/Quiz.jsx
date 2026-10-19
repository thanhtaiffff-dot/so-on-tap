import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store.jsx'
import { formatDate, quizCounts, shuffle } from '../components/util.js'

function makeQuestions(cards, count, reverse) {
  const ask = (c) => (reverse ? c.back : c.front)
  const ans = (c) => (reverse ? c.front : c.back)
  return shuffle(cards).slice(0, count).map((card) => {
    const wrong = shuffle([...new Set(cards.filter((c) => c.id !== card.id).map(ans))].filter((t) => t !== ans(card))).slice(0, 3)
    return { prompt: ask(card), correct: ans(card), options: shuffle([ans(card), ...wrong]) }
  })
}

export default function Quiz({ subject, cards }) {
  const { state, dispatch, newId } = useStore()
  const [count, setCount] = useState(10)
  const [reverse, setReverse] = useState(false)
  const [questions, setQuestions] = useState(null)
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

  function start() {
    setQuestions(makeQuestions(cards, chosen, reverse))
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
        <button type="button" className="btn big-btn" onClick={start}>Bắt đầu</button>
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
          <p className="eyebrow">Kết quả</p>
          <p className="big num">{score}/{questions.length}</p>
          <p className="muted num">Quy ra thang 10: <b>{grade.toLocaleString('vi-VN')}</b> điểm</p>
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
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="row">
          <button type="button" className="btn" onClick={start}>Làm bài mới</button>
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
    if (next.length === questions.length) {
      dispatch({ type: 'quiz/record', id: newId(), subjectId: subject.id, score: next.filter((a) => a.ok).length, total: questions.length })
    }
  }

  return (
    <section className="study narrow">
      <div className="row between">
        <p className="eyebrow">Câu {pos + 1} / {questions.length}</p>
        <p className="muted small num">Đúng {answers.filter((a) => a.ok).length}</p>
      </div>
      <div className="progress"><span style={{ width: `${(pos / questions.length) * 100}%` }} /></div>
      <h2 className="question">{q.prompt}</h2>
      <div className="options">
        {q.options.map((opt, i) => {
          let cls = 'option'
          if (picked !== null && opt === q.correct) cls += ' is-correct'
          else if (picked === opt) cls += ' is-wrong'
          return (
            <button key={opt} type="button" className={cls} onClick={() => pick(opt)} disabled={picked !== null && picked !== opt && opt !== q.correct}>
              <span className="opt-key">{'ABCD'[i]}</span>
              <span>{opt}</span>
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <div className="row between feedback" role="status">
          <b className={picked === q.correct ? 'good-text' : 'bad-text'}>{picked === q.correct ? 'Chính xác!' : 'Chưa đúng'}</b>
          <button type="button" className="btn" autoFocus onClick={() => { setPos(pos + 1); setPicked(null) }}>
            {pos + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp'}
          </button>
        </div>
      )}
    </section>
  )
}
