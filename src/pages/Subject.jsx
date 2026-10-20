import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../data/store.jsx'
import ConfirmButton from '../components/ConfirmButton.jsx'
import { HUES } from '../components/util.js'
import Icon, { initial } from '../components/Icon.jsx'
import { setSubjectHue } from '../components/ambient.js'
import { useNow } from '../components/useNow.js'
import { today } from '../data/srs.js'
import Flashcards from './Flashcards.jsx'
import Quiz from './Quiz.jsx'
import Notes from './Notes.jsx'
import Cards from './Cards.jsx'

export default function Subject() {
  const { subjectId } = useParams()
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const subject = state.subjects.find((s) => s.id === subjectId)
  const [name, setName] = useState(subject?.name ?? '')
  const [hue, setHue] = useState(subject?.hue ?? 222)
  const cards = useMemo(() => state.cards.filter((c) => c.subjectId === subjectId), [state.cards, subjectId])
  const notes = useMemo(() => state.notes.filter((n) => n.subjectId === subjectId), [state.notes, subjectId])
  const subjectHue = subject?.hue
  const now = useNow()
  const todo = useMemo(() => {
    const t = today(cards, now)
    return t.due.length + t.fresh.length
  }, [cards, now])

  // Nền phía sau lớp kính chuyển dần sang màu của môn đang mở, rời môn thì về màu nhấn.
  useEffect(() => {
    if (subjectHue == null) return
    setSubjectHue(subjectHue)
    return () => setSubjectHue(null)
  }, [subjectHue])

  if (!subject) return <Navigate to="/" replace />

  const base = `/mon/${subject.id}`

  function save(e) {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'subject/rename', id: subject.id, name: name.trim().slice(0, 60), hue })
    setEditing(false)
  }

  return (
    <div className="subject-page" style={{ '--hue': subject.hue }}>
      <div className="subject-head">
        {editing ? (
          <form className="row wrap" onSubmit={save}>
            <h1 className="visually-hidden">{subject.name}</h1>
            <input id="subject-name" aria-label="Tên môn" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            <div className="swatches" role="radiogroup" aria-label="Màu của môn">
              {HUES.map((h) => (
                <button key={h} type="button" role="radio" aria-checked={h === hue} aria-label={`Màu ${h}`}
                  className="swatch" style={{ '--hue': h }} onClick={() => setHue(h)} />
              ))}
            </div>
            <button className="btn">Lưu</button>
            <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Huỷ</button>
          </form>
        ) : (
          <>
            <div className="subject-title">
              <span className="subject-icon lg" aria-hidden="true">{initial(subject.name)}</span>
              <div>
                <p className="eyebrow">Môn học</p>
                <h1>{subject.name}</h1>
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => { setName(subject.name); setHue(subject.hue); setEditing(true) }}>Đổi tên</button>
              <ConfirmButton label="Xoá môn" confirmLabel="Xoá môn và mọi thẻ, ghi chú"
                onConfirm={() => { dispatch({ type: 'subject/delete', id: subject.id }); navigate('/') }} />
            </div>
          </>
        )}
      </div>

      {/* replace: chuyển qua lại giữa các mục không tạo thêm bước "Quay lại" */}
      <nav className="tabs" aria-label="Chế độ ôn">
        <NavLink replace to={`${base}/the-lat`}>
          <Icon name="cards" size={16} />Thẻ lật {todo > 0 && <span className="count" title="Số thẻ cần ôn hôm nay">{todo}</span>}
        </NavLink>
        <NavLink replace to={`${base}/trac-nghiem`}><Icon name="quiz" size={16} />Trắc nghiệm</NavLink>
        <NavLink replace to={`${base}/ghi-chu`}><Icon name="note" size={16} />Ghi chú <span className="count">{notes.length}</span></NavLink>
        <NavLink replace to={`${base}/the`}><Icon name="list" size={16} />Bộ thẻ <span className="count">{cards.length}</span></NavLink>
      </nav>

      <Routes>
        <Route index element={<Navigate to="the-lat" replace />} />
        <Route path="the-lat" element={<Flashcards subject={subject} cards={cards} />} />
        <Route path="trac-nghiem" element={<Quiz subject={subject} cards={cards} />} />
        <Route path="ghi-chu/*" element={<Notes subject={subject} notes={notes} />} />
        <Route path="the" element={<Cards subject={subject} cards={cards} />} />
      </Routes>
    </div>
  )
}
