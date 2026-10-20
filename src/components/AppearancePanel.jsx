import { useId, useMemo, useRef } from 'react'
import {
  ACCENTS, DARK_PALETTES, DEFAULTS, LIGHT_PALETTES, PALETTES, PRESETS, isDefault, paint, presetActive,
} from './appearance.js'
import { THEMES, THEME_LABEL, applyPreset, pickPalette, resetLook, setLook, setTheme, useAppearance } from './theme.js'

// Cài đặt → Giao diện: chủ đề nhanh, bộ nền, màu nhấn, phông, cỡ chữ… Bấm là cả trang đổi theo ngay.

const opts = (pairs) => pairs.map(([id, label]) => ({ id, label }))
const MODES = THEMES.map((id) => ({ id, label: THEME_LABEL[id] }))
const AMBIENT = opts([['subject', 'Theo môn'], ['accent', 'Màu nhấn'], ['off', 'Tắt']])
const FONTS = opts([['inter', 'Inter'], ['system', 'Chữ của máy'], ['serif', 'Có chân']])
const SIZES = opts([['90', 'Nhỏ'], ['100', 'Vừa'], ['112', 'Lớn'], ['125', 'Rất lớn']])
const ROUNDS = opts([['sharp', 'Vuông'], ['medium', 'Vừa'], ['round', 'Tròn']])

// Biến CSS để ô xem thử vẽ đúng màu nhấn trên bộ nền của ô đó (ô có bộ nền riêng, khác cả trang).
function artVars(look, scheme) {
  const vars = paint(look)[scheme].vars
  return look.accent === 'default' ? { '--accent-h': 22, '--accent-c': 1, ...vars } : vars
}

export default function AppearancePanel() {
  const { mode, look, palette } = useAppearance()
  const ids = { mode: useId(), dark: useId(), light: useId(), accent: useId(), ambient: useId(), font: useId(), size: useId(), round: useId() }
  const custom = look.accent !== 'default' && !ACCENTS.some((a) => a.id === look.accent)
  const osReduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  const tiles = useMemo(
    () => ({
      presets: PRESETS.map((p) => {
        const s = { ...look, ...p.set }
        const scheme = p.mode
        return { ...p, palette: s[scheme], font: s.font, round: s.round, primary: s.primary, vars: artVars(s, scheme) }
      }),
      palettes: Object.fromEntries(
        Object.entries(PALETTES).map(([id, p]) => [id, artVars({ ...look, [p.scheme]: id }, p.scheme)]),
      ),
    }),
    [look],
  )

  return (
    <section className="panel appearance" aria-labelledby="giao-dien">
      <div className="row between wrap">
        <h2 id="giao-dien" tabIndex={-1}>Giao diện</h2>
        <button type="button" className="btn ghost" onClick={resetLook} disabled={isDefault(look)}>Về mặc định</button>
      </div>
      <p className="muted">Bấm là thấy ngay. Lựa chọn chỉ lưu trên máy này.</p>

      <div className="ap-preview" aria-hidden="true">
        <p className="eyebrow">Xem trước</p>
        <p className="ap-q">Mitochondria</p>
        <p className="muted">Ti thể, “nhà máy năng lượng” của tế bào.</p>
        <div className="row wrap">
          <span className="btn">Ôn ngay</span>
          <span className="btn ghost">Để sau</span>
          <span className="box-pill due">Đến hạn</span>
          <span className="link-btn">Xem giải thích</span>
        </div>
      </div>

      <h3 className="eyebrow ap-title">Chủ đề nhanh</h3>
      <Choice label="Chủ đề nhanh" className="tiles" options={tiles.presets}
        value={PRESETS.find((p) => presetActive(p, look, mode))?.id} onChange={(id) => applyPreset(PRESETS.find((p) => p.id === id))}
        render={(p) => (
          <>
            <span className="tile-art" data-palette={p.palette} data-font={p.font} data-round={p.round} data-primary={p.primary} style={p.vars} aria-hidden="true">
              <span className="art-card">
                <span className="art-aa">Aa</span>
                <span className="art-foot"><span className="art-line" /><span className="art-btn" /></span>
              </span>
            </span>
            <span className="tile-name">{p.label}</span>
          </>
        )} />

      <h3 className="eyebrow ap-title">Màu sắc</h3>
      <Row id={ids.mode} label="Chế độ">
        <Choice labelledBy={ids.mode} options={MODES} value={mode} onChange={setTheme} />
      </Row>
      <Row id={ids.dark} label="Nền khi tối">
        <PaletteTiles labelledBy={ids.dark} list={DARK_PALETTES} value={look.dark} vars={tiles.palettes} />
      </Row>
      <Row id={ids.light} label="Nền khi sáng">
        <PaletteTiles labelledBy={ids.light} list={LIGHT_PALETTES} value={look.light} vars={tiles.palettes} />
      </Row>
      {mode === 'system' && (
        <p className="small faint">
          Đang theo máy: máy để {palette && PALETTES[palette].scheme === 'dark' ? 'tối' : 'sáng'} nên trang dùng nền {PALETTES[palette]?.label}.
        </p>
      )}
      <Row id={ids.accent} label="Màu nhấn">
        <div className="accents">
          <Choice labelledBy={ids.accent} className="accent-list" options={ACCENTS} value={look.accent}
            onChange={(accent) => setLook({ accent })}
            render={(a) => <span className="accent-dot" style={{ '--sw': a.hex }} title={a.label} />} labelOf={(a) => a.label} />
          <label className={`accent-custom${custom ? ' on' : ''}`} title="Màu khác">
            <input type="color" aria-label="Chọn màu khác" value={custom ? look.accent : '#7c5cff'}
              onChange={(e) => setLook({ accent: e.target.value })} />
          </label>
        </div>
      </Row>
      <p className="small faint">Màu nào cũng được trang tự chỉnh đậm nhạt cho chữ dễ đọc trên nền đang dùng.</p>
      <Row id={ids.ambient} label="Vệt màu phía sau">
        <Choice labelledBy={ids.ambient} options={AMBIENT} value={look.ambient} onChange={(ambient) => setLook({ ambient })} />
      </Row>
      <Switch checked={look.primary === 'accent'} onChange={(on) => setLook({ primary: on ? 'accent' : 'neutral' })}>
        Tô màu nhấn cho nút chính
      </Switch>

      <h3 className="eyebrow ap-title">Chữ</h3>
      <Row id={ids.font} label="Phông chữ">
        <Choice labelledBy={ids.font} options={FONTS} value={look.font} onChange={(font) => setLook({ font })} />
      </Row>
      <Row id={ids.size} label="Cỡ chữ">
        <Choice labelledBy={ids.size} options={SIZES} value={look.size} onChange={(size) => setLook({ size })} />
      </Row>
      <Switch checked={look.contrast === 'high'} onChange={(on) => setLook({ contrast: on ? 'high' : 'normal' })}>
        Tương phản cao (chữ đậm rõ, nền đặc)
      </Switch>

      <h3 className="eyebrow ap-title">Hình khối và hiệu ứng</h3>
      <Row id={ids.round} label="Bo góc">
        <Choice labelledBy={ids.round} options={ROUNDS} value={look.round} onChange={(round) => setLook({ round })} />
      </Row>
      <Switch checked={look.glass === 'blur'} onChange={(on) => setLook({ glass: on ? 'blur' : 'solid' })}>
        Kính mờ (tắt để nền đặc, nhẹ máy hơn)
      </Switch>
      <Switch checked={look.motion === 'reduce'} onChange={(on) => setLook({ motion: on ? 'reduce' : DEFAULTS.motion })}>
        Giảm chuyển động
      </Switch>
      {osReduce && <p className="small faint">Máy của bạn đang bật giảm chuyển động, nên trang đã tự giảm sẵn.</p>}
    </section>
  )
}

function Row({ id, label, children }) {
  return (
    <div className="ap-row">
      <span className="ap-label" id={id}>{label}</span>
      {children}
    </div>
  )
}

function Switch({ checked, onChange, children }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  )
}

function PaletteTiles({ labelledBy, list, value, vars }) {
  return (
    <Choice labelledBy={labelledBy} className="tiles" options={list.map((id) => ({ id, label: PALETTES[id].label }))}
      value={value} onChange={pickPalette}
      render={(p) => (
        <>
          <span className="tile-art" data-palette={p.id} style={vars[p.id]} aria-hidden="true">
            <span className="art-card"><span className="art-line" /><span className="art-line short" /><span className="art-pill" /></span>
          </span>
          <span className="tile-name">{p.label}</span>
        </>
      )} />
  )
}

// Nhóm lựa chọn một trong nhiều (radio). Phím mũi tên chuyển lựa chọn, Tab chỉ dừng ở lựa chọn đang chọn.
function Choice({ label, labelledBy, options, value, onChange, className = 'seg', render, labelOf }) {
  const refs = useRef([])
  const at = options.findIndex((o) => o.id === value)
  function onKeyDown(e) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const i = (Math.max(at, 0) + step + options.length) % options.length
    onChange(options[i].id)
    refs.current[i]?.focus()
  }
  return (
    <div className={className} role="radiogroup" aria-label={label} aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <button key={o.id} ref={(el) => (refs.current[i] = el)} type="button" role="radio" aria-checked={o.id === value}
          aria-label={labelOf?.(o)} tabIndex={o.id === value || (at < 0 && i === 0) ? 0 : -1} onClick={() => onChange(o.id)}>
          {render ? render(o) : o.label}
        </button>
      ))}
    </div>
  )
}
