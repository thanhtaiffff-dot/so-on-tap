import { toBackup } from './schema.js'

const pad = (n) => String(n).padStart(2, '0')

// Tên file theo ngày giờ máy, ví dụ so-on-tap-2026-10-19.json
export function backupName(now) {
  const d = new Date(now)
  return `so-on-tap-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

export function downloadBackup(state, now = Date.now()) {
  const blob = new Blob([JSON.stringify(toBackup(state, now), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupName(now)
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
