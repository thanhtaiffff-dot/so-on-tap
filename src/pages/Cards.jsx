import { memo, useState } from 'react'
import { useStore } from '../data/store.jsx'
import ConfirmButton from '../components/ConfirmButton.jsx'
import { formatDays, parseBulk } from '../components/util.js'
import { useNow } from '../components/useNow.js'
import { LIMITS } from '../data/schema.js'
import { isDue, isMastered, isNew, studyDay } from '../data/srs.js'

// Mỗi lần chỉ hiện một phần danh sách, để môn có hàng nghìn thẻ vẫn mở nhanh.
const PAGE = 100

export default function Cards({ subject, cards }) {
  const { dispatch, newId } = useStore()
  const now = useNow()
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [note, setNote] = useState('')
  const [bulk, setBulk] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const parsed = parseBulk(bulk)
  // Thẻ mới thêm hiện lên đầu, ngay dưới ô nhập.
  const shown = cards.slice(-limit).reverse()

  function addOne(e) {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    dispatch({ type: 'card/addMany', subjectId: subject.id, items: [{ id: newId(), front: front.trim(), back: back.trim(), note: note.trim() }] })
    setFront('')
    setBack('')
    setNote('')
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
        <div className="field">
          <label htmlFor="card-note" className="label">Giải thích <span className="faint">(không bắt buộc)</span></label>
          <input id="card-note" value={note} maxLength={LIMITS.note} onChange={(e) => setNote(e.target.value)} placeholder="She is ambitious." />
        </div>
        <button className="btn" disabled={!front.trim() || !back.trim()}>Thêm thẻ</button>
      </form>

      <button type="button" className="link-btn" onClick={() => setShowBulk((v) => !v)} aria-expanded={showBulk}>
        {showBulk ? 'Ẩn ô thêm nhiều thẻ' : 'Thêm nhiều thẻ cùng lúc'}
      </button>
      {showBulk && (
        <div className="bulk">
          <label htmlFor="card-bulk" className="label">
            Mỗi dòng một thẻ, ngăn cách mặt trước và mặt sau bằng dấu " - ", dấu ; hoặc Tab. Dán thẳng từ Excel được: cột thứ ba (nếu có) là phần giải thích.
          </label>
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
            {shown.map((c) => <CardRow key={c.id} card={c} now={now} dispatch={dispatch} />)}
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

// Thẻ đang ở đâu trong lịch ôn.
function status(card, now) {
  if (isNew(card)) return { text: 'Mới', cls: '', title: 'Chưa học lần nào' }
  if (isDue(card, now)) return { text: 'Cần ôn', cls: 'due', title: 'Đến lượt ôn hôm nay' }
  const when = formatDays(studyDay(card.due) - studyDay(now))
  if (isMastered(card)) return { text: 'Đã thuộc', cls: 'mastered', title: `Đã nhớ được ít nhất 3 tuần. Ôn lại ${when}.` }
  return { text: `Ôn ${when}`, cls: '', title: `Lịch ôn hẹn hỏi lại thẻ này ${when}` }
}

// Mỗi dòng tự giữ trạng thái sửa của mình, nên sửa một thẻ không làm vẽ lại cả danh sách.
const CardRow = memo(function CardRow({ card, now, dispatch }) {
  const [edit, setEdit] = useState(null)

  if (edit)
    return (
      <li>
        <form className="card-edit" onSubmit={(e) => {
          e.preventDefault()
          if (!edit.front.trim() || !edit.back.trim()) return
          dispatch({ type: 'card/update', id: card.id, front: edit.front.trim(), back: edit.back.trim(), note: edit.note.trim() })
          setEdit(null)
        }}>
          <input id={`edit-front-${card.id}`} aria-label="Mặt trước" value={edit.front} maxLength={LIMITS.front} autoFocus onChange={(e) => setEdit({ ...edit, front: e.target.value })} />
          <input id={`edit-back-${card.id}`} aria-label="Mặt sau" value={edit.back} maxLength={LIMITS.back} onChange={(e) => setEdit({ ...edit, back: e.target.value })} />
          <input id={`edit-note-${card.id}`} aria-label="Giải thích" placeholder="Giải thích (không bắt buộc)" value={edit.note} maxLength={LIMITS.note}
            onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
          <div className="row">
            <button className="btn">Lưu</button>
            <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Huỷ</button>
          </div>
        </form>
      </li>
    )

  const st = status(card, now)
  return (
    <li>
      <div className="card-row">
        <div className="card-text">
          <b>{card.front}</b>
          <span className="muted">{card.back}</span>
          {card.note && <span className="faint small">{card.note}</span>}
        </div>
        <span className={`box-pill ${st.cls}`} title={st.title}>{st.text}</span>
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => setEdit({ front: card.front, back: card.back, note: card.note })}>Sửa</button>
          <ConfirmButton onConfirm={() => dispatch({ type: 'card/delete', id: card.id })} />
        </div>
      </div>
    </li>
  )
})
