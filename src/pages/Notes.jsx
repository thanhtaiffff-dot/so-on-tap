import { useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../data/store.jsx'
import ConfirmButton from '../components/ConfirmButton.jsx'
import { formatDate } from '../components/util.js'
import { LIMITS } from '../data/storage.js'

export default function Notes({ subject, notes }) {
  return (
    <Routes>
      <Route index element={<NoteList subject={subject} notes={notes} />} />
      <Route path=":noteId" element={<NoteEditor subject={subject} notes={notes} />} />
    </Routes>
  )
}

function NoteList({ subject, notes }) {
  const { dispatch, newId } = useStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const shown = [...notes]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((n) => !term || n.title.toLowerCase().includes(term) || n.body.toLowerCase().includes(term))

  function create() {
    const id = newId()
    dispatch({ type: 'note/add', id, subjectId: subject.id })
    navigate(`/mon/${subject.id}/ghi-chu/${id}`)
  }

  return (
    <section>
      <div className="row wrap between">
        <input id="note-search" className="search" type="search" placeholder="Tìm trong ghi chú…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm ghi chú" />
        <button type="button" className="btn" onClick={create}>Ghi chú mới</button>
      </div>
      {notes.length === 0 ? (
        <div className="empty">
          <h2>Chưa có ghi chú nào</h2>
          <p className="muted">Ghi lại công thức, dàn ý, mẹo nhớ của môn {subject.name}.</p>
        </div>
      ) : shown.length === 0 ? (
        <p className="muted">Không có ghi chú nào chứa "{q}".</p>
      ) : (
        <ul className="note-list">
          {shown.map((n) => (
            <li key={n.id}>
              <Link to={`/mon/${subject.id}/ghi-chu/${n.id}`} className="note-item">
                <h3>{n.title || 'Chưa đặt tiêu đề'}</h3>
                <p className="muted small clamp">{n.body || 'Trống'}</p>
                <p className="small faint num">Sửa lần cuối {formatDate(n.updatedAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function NoteEditor({ subject, notes }) {
  const { noteId } = useParams()
  const { dispatch } = useStore()
  const navigate = useNavigate()
  const note = notes.find((n) => n.id === noteId)
  if (!note) return <p className="muted">Ghi chú này không còn. <Link to={`/mon/${subject.id}/ghi-chu`}>Quay lại danh sách</Link></p>
  const list = `/mon/${subject.id}/ghi-chu`
  const update = (patch) => dispatch({ type: 'note/update', id: note.id, patch })

  return (
    <section className="editor">
      <div className="row between">
        <Link to={list} className="btn ghost">← Danh sách</Link>
        <div className="row">
          <span className="small faint">Tự động lưu</span>
          <ConfirmButton label="Xoá" onConfirm={() => { dispatch({ type: 'note/delete', id: note.id }); navigate(list) }} />
        </div>
      </div>
      <input id="note-title" className="note-title" placeholder="Tiêu đề" value={note.title} maxLength={LIMITS.title}
        onChange={(e) => update({ title: e.target.value })} aria-label="Tiêu đề ghi chú" />
      <textarea id="note-body" className="note-body" placeholder="Viết ghi chú ở đây…" value={note.body} maxLength={LIMITS.body}
        onChange={(e) => update({ body: e.target.value })} aria-label="Nội dung ghi chú" />
      <p className="small faint num">{note.body.length.toLocaleString('vi-VN')} / {LIMITS.body.toLocaleString('vi-VN')} ký tự</p>
    </section>
  )
}
