import { useState } from 'react'
import { useStore } from '../data/store.jsx'
import ConfirmButton from '../components/ConfirmButton.jsx'
import { MASTERED_BOX, parseBulk } from '../components/util.js'

export default function Cards({ subject, cards }) {
  const { dispatch } = useStore()
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [bulk, setBulk] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [editId, setEditId] = useState(null)
  const [edit, setEdit] = useState({ front: '', back: '' })
  const parsed = parseBulk(bulk)

  function addOne(e) {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    dispatch({ type: 'card/addMany', subjectId: subject.id, items: [{ front: front.trim(), back: back.trim() }] })
    setFront('')
    setBack('')
    document.getElementById('card-front')?.focus()
  }

  function addBulk() {
    if (!parsed.length) return
    dispatch({ type: 'card/addMany', subjectId: subject.id, items: parsed })
    setBulk('')
    setShowBulk(false)
  }

  return (
    <section className="cards-page">
      <form className="card-form" onSubmit={addOne}>
        <div className="field">
          <label htmlFor="card-front" className="label">Mặt trước (câu hỏi)</label>
          <input id="card-front" value={front} maxLength={500} onChange={(e) => setFront(e.target.value)} placeholder="ambitious" />
        </div>
        <div className="field">
          <label htmlFor="card-back" className="label">Mặt sau (đáp án)</label>
          <input id="card-back" value={back} maxLength={500} onChange={(e) => setBack(e.target.value)} placeholder="tham vọng" />
        </div>
        <button className="btn" disabled={!front.trim() || !back.trim()}>Thêm thẻ</button>
      </form>

      <button type="button" className="link-btn" onClick={() => setShowBulk((v) => !v)} aria-expanded={showBulk}>
        {showBulk ? 'Ẩn ô thêm nhiều thẻ' : 'Thêm nhiều thẻ cùng lúc'}
      </button>
      {showBulk && (
        <div className="bulk">
          <label htmlFor="card-bulk" className="label">Mỗi dòng một thẻ, ngăn cách mặt trước và mặt sau bằng dấu " - ", dấu ; hoặc Tab (dán thẳng từ Excel được)</label>
          <textarea id="card-bulk" rows={6} value={bulk} onChange={(e) => setBulk(e.target.value)}
            placeholder={'photosynthesis - quang hợp\nhypothesis - giả thuyết'} />
          <div className="row between">
            <span className="small muted num">Đọc được {parsed.length} thẻ</span>
            <button type="button" className="btn" disabled={!parsed.length} onClick={addBulk}>Thêm {parsed.length} thẻ</button>
          </div>
        </div>
      )}

      <h2 className="section-title">Bộ thẻ của {subject.name} <span className="faint num">({cards.length})</span></h2>
      {cards.length === 0 ? (
        <p className="muted">Chưa có thẻ nào. Thêm thẻ đầu tiên ở trên nhé.</p>
      ) : (
        <ul className="card-list">
          {cards.map((c) => (
            <li key={c.id}>
              {editId === c.id ? (
                <form className="card-edit" onSubmit={(e) => {
                  e.preventDefault()
                  if (!edit.front.trim() || !edit.back.trim()) return
                  dispatch({ type: 'card/update', id: c.id, front: edit.front.trim(), back: edit.back.trim() })
                  setEditId(null)
                }}>
                  <input id={`edit-front-${c.id}`} aria-label="Mặt trước" value={edit.front} maxLength={500} onChange={(e) => setEdit({ ...edit, front: e.target.value })} />
                  <input id={`edit-back-${c.id}`} aria-label="Mặt sau" value={edit.back} maxLength={500} onChange={(e) => setEdit({ ...edit, back: e.target.value })} />
                  <div className="row">
                    <button className="btn">Lưu</button>
                    <button type="button" className="btn ghost" onClick={() => setEditId(null)}>Huỷ</button>
                  </div>
                </form>
              ) : (
                <div className="card-row">
                  <div className="card-text">
                    <b>{c.front}</b>
                    <span className="muted">{c.back}</span>
                  </div>
                  <span className={`box-pill ${c.box >= MASTERED_BOX ? 'mastered' : ''}`} title="Càng cao càng thuộc (0 đến 5)">
                    {c.box >= MASTERED_BOX ? 'Đã thuộc' : `Mức ${c.box}`}
                  </span>
                  <div className="row">
                    <button type="button" className="btn ghost" onClick={() => { setEditId(c.id); setEdit({ front: c.front, back: c.back }) }}>Sửa</button>
                    <ConfirmButton onConfirm={() => dispatch({ type: 'card/delete', id: c.id })} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
