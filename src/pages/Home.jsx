import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store.jsx'
import { HUES, MASTERED_BOX } from '../components/util.js'
import { SafariTip } from '../components/Banners.jsx'

export default function Home() {
  const { state, dispatch, newId } = useStore()
  const [name, setName] = useState('')
  const totalCards = state.cards.length
  const mastered = state.cards.filter((c) => c.box >= MASTERED_BOX).length

  function add(e) {
    e.preventDefault()
    const n = name.trim().slice(0, 60)
    if (!n) return
    dispatch({ type: 'subject/add', id: newId(), name: n, hue: HUES[state.subjects.length % HUES.length] })
    setName('')
  }

  return (
    <>
      <SafariTip />
      <section className="hero">
        <div>
          <p className="eyebrow">Hôm nay ôn gì?</p>
          <h1>Chọn một môn để bắt đầu</h1>
          <p className="muted">Mỗi môn có thẻ lật, trắc nghiệm chấm điểm và sổ ghi chú riêng.</p>
        </div>
        <dl className="stats">
          <div><dt>Môn học</dt><dd>{state.subjects.length}</dd></div>
          <div><dt>Thẻ đã thuộc</dt><dd>{mastered}<small>/{totalCards}</small></dd></div>
          <div><dt>Ghi chú</dt><dd>{state.notes.length}</dd></div>
        </dl>
      </section>

      <section className="subject-grid" aria-label="Danh sách môn học">
        {state.subjects.map((s) => {
          const cards = state.cards.filter((c) => c.subjectId === s.id)
          const done = cards.filter((c) => c.box >= MASTERED_BOX).length
          const notes = state.notes.filter((n) => n.subjectId === s.id).length
          const pct = cards.length ? Math.round((done / cards.length) * 100) : 0
          return (
            <Link key={s.id} to={`/mon/${s.id}`} className="subject-card" style={{ '--hue': s.hue }}>
              <span className="tab" aria-hidden="true" />
              <h2>{s.name}</h2>
              <p className="muted small">{cards.length} thẻ · {notes} ghi chú</p>
              <div className="meter" role="img" aria-label={`Đã thuộc ${pct}%`}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <p className="small num">Đã thuộc {pct}%</p>
            </Link>
          )
        })}
        <form className="subject-card add-card" onSubmit={add}>
          <label htmlFor="new-subject">Thêm môn mới</label>
          <input id="new-subject" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Toán cao cấp" />
          <button className="btn" disabled={!name.trim()}>Thêm môn</button>
        </form>
      </section>
    </>
  )
}
