import { useEffect, useState } from 'react'

const KEY = 'so-on-tap:theme'
const ORDER = ['system', 'light', 'dark']
const LABEL = { system: 'Theo máy', light: 'Sáng', dark: 'Tối' }
const BAR = { light: '#f5f6fa', dark: '#11142a' }

// Màu thanh trạng thái (điện thoại, ứng dụng đã cài) theo giao diện đang chọn.
function syncThemeColor(mode) {
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    m.dataset.media ??= m.media
    m.dataset.color ??= m.content
    m.media = mode === 'system' ? m.dataset.media : ''
    m.content = mode === 'system' ? m.dataset.color : BAR[mode]
  }
}

function read() {
  try {
    return ORDER.includes(localStorage.getItem(KEY)) ? localStorage.getItem(KEY) : 'system'
  } catch {
    return 'system'
  }
}

export default function ThemeToggle() {
  const [mode, setMode] = useState(read)
  useEffect(() => {
    const root = document.documentElement
    if (mode === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', mode)
    syncThemeColor(mode)
    try {
      localStorage.setItem(KEY, mode)
    } catch {
      /* bỏ qua */
    }
  }, [mode])
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
  return (
    <button type="button" className="chip" onClick={() => setMode(next)} title={`Giao diện: ${LABEL[mode]}. Bấm để đổi sang ${LABEL[next]}`} aria-label={`Giao diện: ${LABEL[mode]}. Bấm để đổi sang ${LABEL[next]}`}>
      <span className={`theme-dot theme-${mode}`} aria-hidden="true" />
      <span className="chip-label">{LABEL[mode]}</span>
    </button>
  )
}
