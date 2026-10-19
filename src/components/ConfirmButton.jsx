import { useState } from 'react'

// Nút xoá 2 bước: bấm lần 1 hiện "Chắc chưa?", bấm lần 2 mới xoá thật.
export default function ConfirmButton({ label = 'Xoá', confirmLabel = 'Xoá luôn', onConfirm, className = '' }) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button type="button" className={`btn ghost danger-text ${className}`} onClick={() => setAsking(true)}>
        {label}
      </button>
    )
  return (
    <span className="confirm">
      <span className="confirm-q">Chắc chưa?</span>
      <button type="button" className="btn danger" onClick={() => { setAsking(false); onConfirm() }}>
        {confirmLabel}
      </button>
      <button type="button" className="btn ghost" onClick={() => setAsking(false)}>
        Huỷ
      </button>
    </span>
  )
}
