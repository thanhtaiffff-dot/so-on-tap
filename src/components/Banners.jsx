import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBackup, useSave } from '../data/store.jsx'
import { applyUpdate, isIOS, isMacSafari, isStandalone, useUpdateReady } from '../pwa.js'

const DAY = 864e5

// Các thông báo chung ở đầu trang.
export default function Banners() {
  return (
    <>
      <SaveBanner />
      <UpdateBanner />
      <BackupReminder />
    </>
  )
}

// Lưu không được thì phải nói ngay, để người dùng kịp tải file sao lưu.
function SaveBanner() {
  const { status, error, retry } = useSave()
  const backup = useBackup()
  if (status === 'error')
    return (
      <div className="banner bad" role="alert">
        <p>
          <b>Chưa lưu được thay đổi vào máy.</b>{' '}
          {error === 'QuotaExceededError' ? 'Bộ nhớ dành cho trang này đã đầy.' : 'Trình duyệt đang chặn việc lưu.'} Đừng đóng trang khi chưa tải file sao lưu.
        </p>
        <div className="row wrap">
          <button type="button" className="btn" onClick={retry}>Thử lại</button>
          <button type="button" className="btn ghost" onClick={backup}>Tải file sao lưu</button>
        </div>
      </div>
    )
  if (status === 'memory')
    return (
      <div className="banner bad" role="alert">
        <p>
          <b>Trình duyệt này không cho trang lưu dữ liệu</b> (có thể do đang ở chế độ ẩn danh), nên mọi thứ sẽ mất khi đóng trang. Hãy tải file sao lưu trước khi đóng.
        </p>
        <div className="row wrap">
          <button type="button" className="btn" onClick={backup}>Tải file sao lưu</button>
        </div>
      </div>
    )
  if (status === 'reload')
    return (
      <div className="banner bad" role="alert">
        <p><b>Sổ Ôn Tập vừa được cập nhật ở một tab khác.</b> Tải lại trang để tiếp tục lưu.</p>
        <div className="row wrap">
          <button type="button" className="btn" onClick={() => location.reload()}>Tải lại</button>
        </div>
      </div>
    )
  return null
}

function UpdateBanner() {
  const ready = useUpdateReady()
  const { flush } = useSave()
  if (!ready) return null
  return (
    <div className="banner info" role="status">
      <p><b>Có bản mới của Sổ Ôn Tập.</b> Tải lại để dùng bản mới, dữ liệu của bạn vẫn giữ nguyên.</p>
      <div className="row wrap">
        <button type="button" className="btn" onClick={async () => { await flush(); applyUpdate() }}>Tải lại</button>
      </div>
    </div>
  )
}

// Nhắc tải file sao lưu khi có thay đổi chưa sao lưu quá 7 ngày.
function BackupReminder() {
  const { meta, status, updateMeta } = useSave()
  const backup = useBackup()
  const [now] = useState(Date.now)
  const due = meta.pendingSince && now - meta.pendingSince > 7 * DAY && now > (meta.backupSnoozeUntil ?? 0)
  if (!due || status === 'error' || status === 'memory') return null
  return (
    <div className="banner info" role="status">
      <p><b>Đã hơn 7 ngày bạn chưa tải file sao lưu.</b> File này giúp lấy lại bài khi trình duyệt bị xoá dữ liệu hoặc khi đổi máy.</p>
      <div className="row wrap">
        <button type="button" className="btn" onClick={backup}>Tải file sao lưu</button>
        <button type="button" className="btn ghost" onClick={() => updateMeta({ backupSnoozeUntil: Date.now() + 3 * DAY })}>Để sau</button>
      </div>
    </div>
  )
}

const TIP_KEY = 'so-on-tap:tip-safari'
const readTip = () => {
  try {
    return localStorage.getItem(TIP_KEY) === '1'
  } catch {
    return false
  }
}

// Safari tự xoá dữ liệu của trang nếu 7 ngày dùng Safari mà không mở trang (trừ khi đã cài ra màn hình chính).
export function SafariTip() {
  const [dismissed, setDismissed] = useState(readTip)
  if (dismissed || isStandalone() || !(isIOS() || isMacSafari())) return null
  return (
    <div className="banner info" role="note">
      <p>
        <b>Mẹo cho Safari:</b> nếu suốt 7 ngày dùng Safari mà bạn không mở trang này, Safari có thể tự xoá dữ liệu của trang.
        Hãy thêm trang ra {isIOS() ? 'Màn hình chính' : 'Dock'} để dùng như ứng dụng, và thỉnh thoảng tải file sao lưu.
      </p>
      <div className="row wrap">
        <Link className="btn" to="/cai-dat">Xem cách cài</Link>
        <button type="button" className="btn ghost" onClick={() => {
          try {
            localStorage.setItem(TIP_KEY, '1')
          } catch {
            /* bỏ qua */
          }
          setDismissed(true)
        }}>Đã hiểu</button>
      </div>
    </div>
  )
}
