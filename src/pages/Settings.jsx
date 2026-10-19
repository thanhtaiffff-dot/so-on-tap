import { useState } from 'react'
import { useStore } from '../data/store.jsx'
import ConfirmButton from '../components/ConfirmButton.jsx'

export default function Settings() {
  const { state, importJson, resetAll } = useStore()
  const [msg, setMsg] = useState(null)

  function exportFile() {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `so-on-tap-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMsg({ ok: true, text: 'Đã tạo file sao lưu. Nếu không thấy file tải về, trình duyệt đang chặn tải xuống ở trang này.' })
    } catch {
      setMsg({ ok: false, text: 'Không tạo được file sao lưu.' })
    }
  }

  async function importFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return setMsg({ ok: false, text: 'File quá lớn (tối đa 5 MB).' })
    try {
      importJson(await file.text())
      setMsg({ ok: true, text: `Đã khôi phục dữ liệu từ ${file.name}.` })
    } catch {
      setMsg({ ok: false, text: 'File này không phải file sao lưu của Sổ Ôn Tập, hoặc đã bị hỏng.' })
    }
  }

  return (
    <section className="settings narrow">
      <h1>Cài đặt</h1>

      <div className="panel">
        <h2>Dữ liệu của bạn nằm ở đâu?</h2>
        <p className="muted">
          Mọi thẻ, ghi chú và điểm số chỉ lưu trong trình duyệt trên máy này. Trang không gửi dữ liệu đi đâu và không cần tài khoản.
          Nếu xoá dữ liệu trình duyệt hoặc đổi máy thì dữ liệu sẽ mất, nên thỉnh thoảng hãy tải file sao lưu.
        </p>
      </div>

      <div className="panel">
        <h2>Sao lưu và khôi phục</h2>
        <div className="row wrap">
          <button type="button" className="btn" onClick={exportFile}>Tải file sao lưu</button>
          <label className="btn ghost file-btn" htmlFor="import-file">Khôi phục từ file</label>
          <input id="import-file" type="file" accept="application/json,.json" onChange={importFile} className="visually-hidden" />
        </div>
        <p className="small faint">Khôi phục sẽ thay toàn bộ dữ liệu hiện tại bằng dữ liệu trong file.</p>
        {msg && <p role="status" className={msg.ok ? 'good-text' : 'bad-text'}>{msg.text}</p>}
      </div>

      <div className="panel">
        <h2>Làm lại từ đầu</h2>
        <div className="row wrap">
          <ConfirmButton label="Xoá hết dữ liệu" confirmLabel="Xoá hết" onConfirm={() => { resetAll(false); setMsg({ ok: true, text: 'Đã xoá hết dữ liệu.' }) }} />
          <ConfirmButton label="Nạp lại dữ liệu mẫu" confirmLabel="Thay bằng dữ liệu mẫu" onConfirm={() => { resetAll(true); setMsg({ ok: true, text: 'Đã nạp dữ liệu mẫu.' }) }} />
        </div>
      </div>
    </section>
  )
}
