import { memo, useState } from 'react'
import { useStore } from '../data/store.jsx'
import ConfirmButton from '../components/ConfirmButton.jsx'
import { MASTERED_BOX, parseBulk } from '../components/util.js'
import { LIMITS } from '../data/schema.js'

// Mỗi lần chỉ hiện một phần danh sách, để môn có hàng nghìn thẻ vẫn mở nhanh.
const PAGE = 100

export default function Cards({ subject, cards }) {
  const { dispatch, newId } = useStore()
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [bulk, setBulk] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const parsed = parseBulk(bulk)
  // Thẻ mới thêm hiện lên đầu, ngay dưới ô nhập.
  const shown = cards.slice(-limit).reverse()

  function addOne(e) {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    dispatch({ type: 'card/addMany', subjectId: subject.id, items: [{ id: newId(), front: front.trim(), back: back.trim() }] })
    setFront('')
    setBack('')
    document.getElementById('card-front')?.focus()
  }

  function addBulk() {
    if (!parsed.length) return
    dispatch({ type: 'card/addMany', subjectId: subject.id, items: parsed.map((it) => ({ ...it, id: newId() })) })
    setBulk('')
    setShowBulk(false)
  }

  return (
    <section className="cards-page">
      <form className="card-form" onSubmit={addOne}>
        <div className="field">
          <label htmlFor="card-front" className="label">Mặt trước (câu hỏi)</label>
          <input id="card-front" value={front} maxLength={LIMITS.front} onChange={(e) => setFront(e.target.value)} placeholder="ambitious" />
        </div>
        <div className="field">
          <label htmlFor="card-back" className="label">Mặt sau (đáp án)</label>
          <input id="card-back" value={back} maxLength={LIMITS.back} onChange={(e) => setBack(e.target.value)} placeholder="tham vọng" />
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
        <>
          <ul className="card-list">
            {shown.map((c) => <CardRow key={c.id} card={c} dispatch={dispatch} />)}
          </ul>
          {cards.length > limit && (
            <button type="button" className="btn ghost more-btn" onClick={() => setLimit((n) => n + PAGE)}>
              Hiện thêm {Math.min(PAGE, cards.length - limit)} thẻ (còn {cards.length - limit})
            </button>
          )}
        </>
      )}
    </section>
  )
}

// Mỗi dòng tự giữ trạng thái sửa của mình, nên sửa một thẻ không làm vẽ lại cả danh sách.
const CardRow = memo(function CardRow({ card, dispatch }) {
  const [edit, setEdit] = useState(null)

  if (edit)
    return (
      <li>
        <form className="card-edit" onSubmit={(e) => {
          e.preventDefault()
          if (!edit.front.trim() || !edit.back.trim()) return
          dispatch({ type: 'card/update', id: card.id, front: edit.front.trim(), back: edit.back.trim() })
          setEdit(null)
        }}>
          <input id={`edit-front-${card.id}`} aria-label="Mặt trước" value={edit.front} maxLength={LIMITS.front} autoFocus onChange={(e) => setEdit({ ...edit, front: e.target.value })} />
          <input id={`edit-back-${card.id}`} aria-label="Mặt sau" value={edit.back} maxLength={LIMITS.back} onChange={(e) => setEdit({ ...edit, back: e.target.value })} />
          <div className="row">
            <button className="btn">Lưu</button>
            <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Huỷ</button>
          </div>
        </form>
      </li>
    )

  const mastered = card.box >= MASTERED_BOX
  return (
    <li>
      <div className="card-row">
        <div className="card-text">
          <b>{card.front}</b>
          <span className="muted">{card.back}</span>
        </div>
        <span className={`box-pill ${mastered ? 'mastered' : ''}`} title="Càng cao càng thuộc (0 đến 5). Mỗi ngày thẻ lên tối đa 1 mức.">
          {mastered ? 'Đã thuộc' : `Mức ${card.box}`}
        </span>
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => setEdit({ front: card.front, back: card.back })}>Sửa</button>
          <ConfirmButton onConfirm={() => dispatch({ type: 'card/delete', id: card.id })} />
        </div>
      </div>
    </li>
  )
})
