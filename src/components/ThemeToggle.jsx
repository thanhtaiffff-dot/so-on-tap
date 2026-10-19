import { useEffect, useState } from 'react'

const KEY = 'so-on-tap:theme'
const ORDER = ['system', 'light', 'dark']
const LABEL = { system: 'Theo máy', light: 'Sáng', dark: 'Tối' }

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
