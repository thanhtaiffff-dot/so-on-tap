import Icon from './Icon.jsx'
import { THEMES, THEME_LABEL, setTheme, useTheme } from './theme.js'

const ICON = { dark: 'moon', light: 'sun', system: 'system' }

export default function ThemeToggle() {
  const mode = useTheme()
  const next = THEMES[(THEMES.indexOf(mode) + 1) % THEMES.length]
  const label = `Giao diện: ${THEME_LABEL[mode]}. Bấm để đổi sang ${THEME_LABEL[next]}`
  return (
    <button type="button" className="chip" onClick={() => setTheme(next)} title={label} aria-label={label}>
      <Icon name={ICON[mode]} size={16} />
      <span className="chip-label">{THEME_LABEL[mode]}</span>
    </button>
  )
}
