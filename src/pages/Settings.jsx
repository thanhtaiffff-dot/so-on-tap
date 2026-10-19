import { useEffect, useState } from 'react'
import { useBackup, useSave, useStore } from '../data/store.jsx'
import { DataError } from '../data/schema.js'
import ConfirmButton from '../components/ConfirmButton.jsx'
import { SafariTip } from '../components/Banners.jsx'
import { formatDate } from '../components/util.js'
import { promptInstall, useInstallHow } from '../pwa.js'

export default function Settings() {
  const { importJson, resetAll } = useStore()
  const { meta } = useSave()
  const backup = useBackup()
  const [msg, setMsg] = useState(null)

  function exportFile() {
    try {
      backup()
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
    } catch (err) {
      setMsg({ ok: false, text: err instanceof DataError ? err.message : 'File này không phải file sao lưu của Sổ Ôn Tập, hoặc đã bị hỏng.' })
    }
  }

  return (
    <section className="settings narrow">
      <h1>Cài đặt</h1>
      <SafariTip />

      <div className="panel">
        <h2>Dữ liệu của bạn nằm ở đâu?</h2>
        <p className="muted">
          Mọi thẻ, ghi chú và điểm số chỉ lưu trong trình duyệt trên máy này. Trang không gửi dữ liệu đi đâu và không cần tài khoản.
          Nếu xoá dữ liệu trình duyệt hoặc đổi máy thì dữ liệu sẽ mất, nên thỉnh thoảng hãy tải file sao lưu.
        </p>
      </div>

      <InstallPanel />
      <StoragePanel />

      <div className="panel">
        <h2>Sao lưu và khôi phục</h2>
        <div className="row wrap">
          <button type="button" className="btn" onClick={exportFile}>Tải file sao lưu</button>
          <label className="btn ghost file-btn" htmlFor="import-file">Khôi phục từ file</label>
          <input id="import-file" type="file" accept="application/json,.json" onChange={importFile} className="visually-hidden" />
        </div>
        <p className="small faint">
          {meta.lastBackupAt ? `Lần sao lưu gần nhất: ${formatDate(meta.lastBackupAt)}. ` : 'Bạn chưa tải file sao lưu lần nào. '}
          Khôi phục sẽ thay toàn bộ dữ liệu hiện tại bằng dữ liệu trong file.
        </p>
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

function InstallPanel() {
  const how = useInstallHow()
  const [msg, setMsg] = useState(null)
  return (
    <div className="panel" id="cai-ung-dung">
      <h2>Cài như ứng dụng</h2>
      <p className="muted">Cài xong, Sổ Ôn Tập có biểu tượng riêng, mở nhanh như ứng dụng và vẫn dùng được khi mất mạng.</p>
      {how === 'installed' && <p className="good-text">Bạn đang dùng bản đã cài.</p>}
      {how === 'prompt' && (
        <div className="row wrap">
          <button type="button" className="btn" onClick={async () => setMsg((await promptInstall()) ? 'Đã cài xong.' : 'Bạn chưa cài. Lúc nào cần thì bấm lại nút này.')}>
            Cài Sổ Ôn Tập
          </button>
        </div>
      )}
      {how === 'ios' && (
        <ol className="steps">
          <li>Mở trang này bằng Safari.</li>
          <li>Bấm nút <b>Chia sẻ</b> (hình vuông có mũi tên đi lên).</li>
          <li>Chọn <b>Thêm vào MH chính</b>, rồi bấm <b>Thêm</b>.</li>
        </ol>
      )}
      {how === 'mac' && (
        <ol className="steps">
          <li>Trên thanh menu của Safari, chọn <b>Tệp</b>.</li>
          <li>Chọn <b>Thêm vào Dock</b>, rồi bấm <b>Thêm</b>.</li>
        </ol>
      )}
      {how === 'none' && (
        <p className="small faint">
          Trình duyệt này chưa cho cài trang như ứng dụng. Hãy mở trang bằng Chrome hoặc Edge (máy tính, Android), hoặc Safari (iPhone, iPad, Mac).
          Nếu đã cài rồi thì mở Sổ Ôn Tập từ biểu tượng của ứng dụng.
        </p>
      )}
      {msg && <p role="status" className="small">{msg}</p>}
    </div>
  )
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`

async function readStorage() {
  const s = navigator.storage
  if (!s?.persisted) return { supported: false }
  const [persisted, est] = await Promise.all([s.persisted(), s.estimate ? s.estimate() : {}])
  return { supported: true, persisted, usage: est.usage, quota: est.quota }
}

function StoragePanel() {
  const [info, setInfo] = useState(null)
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    let alive = true
    readStorage().then((r) => alive && setInfo(r)).catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  if (!info?.supported) return null

  async function ask() {
    const ok = await navigator.storage.persist().catch(() => false)
    setInfo(await readStorage())
    setMsg(ok ? null : 'Trình duyệt chưa đồng ý. Cài trang như ứng dụng (ở trên) thường sẽ giúp trình duyệt đồng ý.')
  }

  return (
    <div className="panel">
      <h2>Giữ dữ liệu an toàn</h2>
      <p className="muted">
        Khi máy gần hết dung lượng, trình duyệt có thể tự dọn dữ liệu của các trang web. Bật giữ lâu dài để trình duyệt không tự xoá dữ liệu của Sổ Ôn Tập.
      </p>
      {info.persisted ? (
        <p className="good-text">Đã bật giữ dữ liệu lâu dài trên máy này.</p>
      ) : (
        <div className="row wrap">
          <button type="button" className="btn" onClick={ask}>Giữ dữ liệu lâu dài</button>
        </div>
      )}
      {msg && <p role="status" className="small bad-text">{msg}</p>}
      {info.usage != null && info.quota ? (
        <p className="small faint num">Đang dùng {mb(info.usage)} trên khoảng {mb(info.quota)} trình duyệt cho phép.</p>
      ) : null}
    </div>
  )
}
