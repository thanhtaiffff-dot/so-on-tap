import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBackup, useStore } from '../data/store.jsx'
import Icon, { initial } from './Icon.jsx'
import { buildItems } from './palette.js'
import { setTheme, useTheme } from './theme.js'

// Bảng "Tìm nhanh" kiểu Raycast: Ctrl/⌘ + K ở bất cứ đâu, gõ để tìm, ↑ ↓ để chọn, Enter để mở.
const OPEN_EVENT = 'so-on-tap:tim-nhanh'
export const openPalette = () => window.dispatchEvent(new Event(OPEN_EVENT))
const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgentData?.platform ?? navigator.platform ?? '')
export const MOD_KEY = isMac ? '⌘' : 'Ctrl'

const COMMANDS = [
  { id: 'home', title: 'Về trang chủ', icon: 'home', words: 'trang chu danh sach mon hoc' },
  { id: 'new-subject', title: 'Thêm môn mới', icon: 'plus', words: 'tao mon' },
  { id: 'settings', title: 'Mở Cài đặt', icon: 'settings', words: 'cai dat sao luu khoi phuc cai ung dung' },
  { id: 'backup', title: 'Tải file sao lưu', icon: 'download', words: 'backup xuat du lieu' },
  { id: 'theme-dark', title: 'Giao diện tối', icon: 'moon', words: 'dark mode nen den' },
  { id: 'theme-light', title: 'Giao diện sáng', icon: 'sun', words: 'light mode nen trang' },
  { id: 'theme-system', title: 'Giao diện theo máy', icon: 'system', words: 'system tu dong' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const show = () => setOpen(true)
    const onKey = (e) => {
      if (e.key?.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return
      e.preventDefault()
      setOpen((o) => !o)
    }
    window.addEventListener(OPEN_EVENT, show)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(OPEN_EVENT, show)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    const d = ref.current
    if (open && !d.open) {
      d.showModal()
      d.querySelector('input')?.focus()
    } else if (!open && d.open) d.close()
  }, [open])

  // Đóng ngay (không đợi vẽ lại), để trình duyệt trả con trỏ về chỗ cũ trước khi chạy lệnh.
  const close = () => ref.current?.close()

  return (
    <dialog ref={ref} className="palette" aria-label="Tìm nhanh" onClose={() => setOpen(false)}
      onMouseDown={(e) => e.target === e.currentTarget && close()}>
      {open && <PaletteBody close={close} />}
    </dialog>
  )
}

// Nút mở bảng tìm nhanh (trên thanh trên cùng và ở trang chủ).
export function PaletteButton({ className = '', label = 'Tìm nhanh' }) {
  return (
    <button type="button" className={className} onClick={openPalette} aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K">
      <Icon name="search" />
      <span className="pt-label">{label}</span>
      <span className="pt-keys" aria-hidden="true"><kbd>{MOD_KEY}</kbd><kbd>K</kbd></span>
    </button>
  )
}

function PaletteBody({ close }) {
  const store = useStore()
  return store ? <PaletteList state={store.state} close={close} /> : <p className="pal-empty" role="status">Đang mở sổ…</p>
}

function PaletteList({ state, close }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const backup = useBackup()
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const items = useMemo(() => buildItems(state, query, COMMANDS), [state, query])
  const active = Math.min(sel, items.length - 1)
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, items])

  function run(item) {
    close()
    if (item.to) return navigate(item.to)
    if (item.cmd === 'home') navigate('/')
    else if (item.cmd === 'settings') navigate('/cai-dat')
    else if (item.cmd === 'backup') backup()
    else if (item.cmd.startsWith('theme-')) setTheme(item.cmd.slice(6))
    else if (item.cmd === 'new-subject') {
      if (pathname === '/') document.getElementById('new-subject')?.focus()
      else navigate('/', { state: { focusNew: true } })
    }
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (items.length) setSel((active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length)
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (items[active]) run(items[active])
    }
  }

  const groups = []
  items.forEach((item, index) => {
    if (groups.at(-1)?.name !== item.group) groups.push({ name: item.group, rows: [] })
    groups.at(-1).rows.push({ item, index })
  })

  return (
    <div className="pal">
      <div className="pal-search">
        <Icon name="search" size={20} />
        <input type="text" value={query} placeholder="Tìm môn, ghi chú hoặc lệnh…" aria-label="Tìm môn, ghi chú hoặc lệnh"
          role="combobox" aria-autocomplete="list" aria-expanded={items.length > 0}
          aria-controls={items.length ? 'pal-list' : undefined} aria-activedescendant={items.length ? `pal-${active}` : undefined}
          autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go"
          onChange={(e) => { setQuery(e.target.value); setSel(0) }} onKeyDown={onKeyDown} />
        <button type="button" className="pal-close" onClick={close} aria-label="Đóng tìm nhanh, phím Esc">
          <span className="on-keyboard">Esc</span><span className="on-touch">Đóng</span>
        </button>
      </div>
      {items.length ? (
        <div className="pal-list" id="pal-list" role="listbox" aria-label="Kết quả" ref={listRef}>
          {groups.map((g) => (
            <div key={g.name} role="group" aria-label={g.name}>
              <div className="pal-group" aria-hidden="true">{g.name}</div>
              {g.rows.map(({ item, index }) => (
                <div key={item.id} id={`pal-${index}`} role="option" aria-selected={index === active} className="pal-item"
                  style={item.hue == null ? undefined : { '--hue': item.hue }}
                  onMouseMove={() => index !== active && setSel(index)} onClick={() => run(item)}>
                  {item.letter ? (
                    <span className="subject-icon sm" aria-hidden="true">{initial(item.title)}</span>
                  ) : (
                    <span className={`pal-icon ${item.hue == null ? '' : 'tinted'}`}><Icon name={item.icon} /></span>
                  )}
                  <span className="pal-title">{item.title}</span>
                  {item.subtitle && <span className="pal-sub">{item.subtitle}</span>}
                  {item.cmd === `theme-${theme}` && <span className="pal-tag">Đang dùng</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="pal-empty" role="status">Không tìm thấy gì cho “{query}”.</p>
      )}
      <div className="pal-foot" aria-hidden="true">
        <span className="pal-brand"><span className="brand-mark" />Sổ Ôn Tập</span>
        <span className="pal-keys">
          <span>Chọn <kbd>↑</kbd><kbd>↓</kbd></span>
          <span>Mở <kbd>↵</kbd></span>
        </span>
      </div>
    </div>
  )
}
