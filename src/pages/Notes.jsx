import { useEffect, useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useSave, useStore } from '../data/store.jsx'
import ConfirmButton from '../components/ConfirmButton.jsx'
import { formatDate } from '../components/util.js'
import { LIMITS } from '../data/schema.js'

// Địa chỉ của ghi chú chưa có chữ nào: ghi chú chỉ thật sự được tạo khi gõ chữ đầu tiên.
const NEW = 'moi'
const SAVE_TEXT = {
  saving: 'Đang lưu…',
  saved: 'Đã lưu',
  error: 'Chưa lưu được',
  memory: 'Không lưu được trên máy này',
  reload: 'Cần tải lại trang',
}

export default function Notes({ subject, notes }) {
  return (
    <Routes>
      <Route index element={<NoteList subject={subject} notes={notes} />} />
      <Route path=":noteId" element={<NoteEditor subject={subject} notes={notes} />} />
    </Routes>
  )
}

function NoteList({ subject, notes }) {
  const { dispatch } = useStore()
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const shown = [...notes]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((n) => !term || n.title.toLowerCase().includes(term) || n.body.toLowerCase().includes(term))

  // Ghi chú đã xoá hết chữ thì dọn đi khi quay về danh sách.
  useEffect(() => {
    dispatch({ type: 'note/dropEmpty', subjectId: subject.id })
  }, [dispatch, subject.id])

  return (
    <section>
      <div className="row wrap between">
        <input id="note-search" className="search" type="search" placeholder="Tìm trong ghi chú…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm ghi chú" />
        <Link className="btn" to={`/mon/${subject.id}/ghi-chu/${NEW}`}>Ghi chú mới</Link>
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
                <h2>{n.title || 'Chưa đặt tiêu đề'}</h2>
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
  const { dispatch, newId } = useStore()
  const { status } = useSave()
  const navigate = useNavigate()
  // Router đổi địa chỉ ở mức ưu tiên thấp (startTransition), nên sau chữ đầu tiên địa chỉ vẫn là "moi" thêm một nhịp.
  // Khung soạn thảo tự nhớ id ghi chú vừa tạo để các chữ gõ tiếp vào đúng ghi chú đó: không mất chữ, không tạo thừa ghi chú.
  const [createdId, setCreatedId] = useState(null)
  const list = `/mon/${subject.id}/ghi-chu`
  const isNew = noteId === NEW
  if (!isNew && createdId) setCreatedId(null)
  const id = isNew ? createdId : noteId
  const note = id ? notes.find((n) => n.id === id) : null
  if (!isNew && !note) return <p className="muted">Ghi chú này không còn. <Link to={list}>Quay lại danh sách</Link></p>
  const value = note ?? { title: '', body: '' }

  function update(patch) {
    if (note) return dispatch({ type: 'note/update', id: note.id, patch })
    const id = newId()
    dispatch({ type: 'note/add', id, subjectId: subject.id, ...value, ...patch })
    setCreatedId(id)
    // Cùng một khung soạn thảo, chỉ đổi địa chỉ, nên chỗ đang gõ không bị mất.
    navigate(`${list}/${id}`, { replace: true })
  }

  return (
    <section className="editor">
      <div className="row between">
        <Link to={list} className="btn ghost">← Danh sách</Link>
        {note && (
          <div className="row">
            <span className={`small save-state ${status}`}>{SAVE_TEXT[status] ?? ''}</span>
            <ConfirmButton label="Xoá" onConfirm={() => { dispatch({ type: 'note/delete', id: note.id }); navigate(list, { replace: true }) }} />
          </div>
        )}
      </div>
      <input id="note-title" className="note-title" placeholder="Tiêu đề" value={value.title} maxLength={LIMITS.title} autoFocus={isNew}
        onChange={(e) => update({ title: e.target.value })} aria-label="Tiêu đề ghi chú" />
      <textarea id="note-body" className="note-body" placeholder="Viết ghi chú ở đây…" value={value.body} maxLength={LIMITS.body}
        onChange={(e) => update({ body: e.target.value })} aria-label="Nội dung ghi chú" />
      <p className="small faint num">{value.body.length.toLocaleString('vi-VN')} / {LIMITS.body.toLocaleString('vi-VN')} ký tự</p>
    </section>
  )
}
