import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../data/store.jsx'
import { HUES, formatDays } from '../components/util.js'
import { useNow } from '../components/useNow.js'
import { isMastered, today, upcoming } from '../data/srs.js'
import { SafariTip } from '../components/Banners.jsx'
import { PaletteButton } from '../components/CommandPalette.jsx'
import Icon, { initial } from '../components/Icon.jsx'

// Vệt sáng đi theo con trỏ chuột trên thẻ môn học.
function spotlight(e) {
  const card = e.target.closest?.('.subject-card')
  if (!card) return
  const r = card.getBoundingClientRect()
  card.style.setProperty('--mx', `${e.clientX - r.left}px`)
  card.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export default function Home() {
  const { state, dispatch, newId } = useStore()
  const location = useLocation()
  const [name, setName] = useState('')
  const totalCards = state.cards.length
  const mastered = state.cards.filter(isMastered).length

  // Mở từ lệnh "Thêm môn mới" của bảng tìm nhanh: đưa con trỏ vào ô nhập tên môn.
  useEffect(() => {
    if (location.state?.focusNew) document.getElementById('new-subject')?.focus()
  }, [location.state])

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
        <p className="badge"><span className="badge-dot" aria-hidden="true" />Hôm nay ôn gì?</p>
        <h1>Chọn một môn để bắt đầu</h1>
        <p className="muted hero-sub">Mỗi môn có thẻ lật, trắc nghiệm chấm điểm và sổ ghi chú riêng.</p>
        <PaletteButton className="hero-search" label="Tìm môn, ghi chú hoặc lệnh…" />
      </section>

      {totalCards > 0 && <TodayPanel subjects={state.subjects} cards={state.cards} />}

      <dl className="stats">
        <div className="stat"><dt>Môn học</dt><dd>{state.subjects.length}</dd></div>
        <div className="stat"><dt>Thẻ đã thuộc</dt><dd>{mastered}<small>/{totalCards}</small></dd></div>
        <div className="stat"><dt>Ghi chú</dt><dd>{state.notes.length}</dd></div>
      </dl>

      <section className="subject-grid" aria-label="Danh sách môn học" onPointerMove={spotlight}>
        {state.subjects.map((s, i) => {
          const cards = state.cards.filter((c) => c.subjectId === s.id)
          const done = cards.filter(isMastered).length
          const notes = state.notes.filter((n) => n.subjectId === s.id).length
          const pct = cards.length ? Math.round((done / cards.length) * 100) : 0
          return (
            <Link key={s.id} to={`/mon/${s.id}`} className="subject-card" style={{ '--hue': s.hue, '--i': i }}>
              <span className="card-top" aria-hidden="true">
                <span className="subject-icon">{initial(s.name)}</span>
                <span className="go">↗</span>
              </span>
              <h2>{s.name}</h2>
              <p className="muted small">{cards.length} thẻ · {notes} ghi chú</p>
              <div className="meter" role="img" aria-label={`Đã thuộc ${pct}%`}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <p className="small num">Đã thuộc {pct}%</p>
            </Link>
          )
        })}
        <form className="subject-card add-card" onSubmit={add} style={{ '--i': state.subjects.length }}>
          <span className="add-icon" aria-hidden="true"><Icon name="plus" size={20} /></span>
          <label htmlFor="new-subject">Thêm môn mới</label>
          <input id="new-subject" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Toán cao cấp" />
          <button className="btn" disabled={!name.trim()}>Thêm môn</button>
        </form>
      </section>
    </>
  )
}

// Ô "Hôm nay": mỗi môn còn bao nhiêu thẻ đến hạn và thẻ mới cần học, bấm vào là ôn luôn.
function TodayPanel({ subjects, cards }) {
  const now = useNow()
  const { rows, due, fresh, next } = useMemo(() => {
    const bySubject = new Map(subjects.map((s) => [s.id, []]))
    for (const c of cards) bySubject.get(c.subjectId)?.push(c)
    const rows = []
    let due = 0
    let fresh = 0
    for (const s of subjects) {
      const t = today(bySubject.get(s.id), now)
      if (!t.due.length && !t.fresh.length) continue
      rows.push({ subject: s, due: t.due.length, fresh: t.fresh.length })
      due += t.due.length
      fresh += t.fresh.length
    }
    return { rows, due, fresh, next: rows.length ? null : upcoming(cards, now) }
  }, [subjects, cards, now])

  return (
    <section className="today" aria-labelledby="today-title">
      <div className="today-head">
        <div>
          <p className="eyebrow">Hôm nay</p>
          <h2 id="today-title">{rows.length ? `Cần ôn ${due + fresh} thẻ` : 'Hôm nay ôn xong rồi'}</h2>
        </div>
        <p className="muted small num">
          {rows.length
            ? [due && `${due} thẻ đến hạn`, fresh && `${fresh} thẻ mới`].filter(Boolean).join(' · ')
            : next
              ? `Lần ôn tới: ${formatDays(next.days)}, ${next.count} thẻ.`
              : 'Không còn thẻ nào chờ ôn.'}
        </p>
      </div>
      {rows.length > 0 && (
        <ul className="today-list">
          {rows.map(({ subject: s, due, fresh }) => (
            <li key={s.id}>
              <Link className="today-row" to={`/mon/${s.id}/the-lat`} style={{ '--hue': s.hue }}>
                <span className="subject-icon sm" aria-hidden="true">{initial(s.name)}</span>
                <span className="today-name">{s.name}</span>
                <span className="today-meta small num">{[due && `${due} đến hạn`, fresh && `${fresh} mới`].filter(Boolean).join(' · ')}</span>
                <span className="today-go" aria-hidden="true">Ôn ngay<Icon name="arrow" size={14} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
