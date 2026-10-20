import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ACCENTS, CHOICES, DEFAULTS, PALETTES, PRESETS, accentOn, inkFor, isDefault, minContrast, paint, parse, presetActive,
  schemeOf, surfaces,
} from './appearance.js'
import { contrast, oklchToRgb, over, parseHex, rgbToOklch, toHex } from './color.js'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

// Lấy giá trị một biến CSS trong khối của bộ nền (khối bắt đầu bằng [data-palette='id']).
function token(id, name) {
  const start = css.indexOf(`[data-palette='${id}'] {`)
  const block = css.slice(start, css.indexOf('}', start))
  return block.match(new RegExp(`${name}: ([^;]+);`))?.[1]
}

// Màu thử: đủ các sắc độ, độ đậm và độ sáng (kể cả màu rất nhạt, rất tối, gần xám), cộng các màu nhấn có sẵn.
const SAMPLES = [
  ...ACCENTS.map((a) => a.hex),
  '#000000', '#ffffff', '#ffff00', '#00ffff', '#0000ff', '#7f7f7f',
  ...[0.25, 0.5, 0.7, 0.9].flatMap((L) => [0.03, 0.12, 0.25].flatMap((C) => Array.from({ length: 24 }, (_, i) => toHex(oklchToRgb([L, C, i * 15]))))),
]

describe('đổi màu', () => {
  it('đổi qua lại mã màu và OKLCH không lệch màu', () => {
    for (const hex of ['#ff6363', '#3ecf6e', '#4f7cff', '#a1a1aa', '#08080a']) expect(toHex(oklchToRgb(rgbToOklch(parseHex(hex))))).toBe(hex)
  })
  it('đo độ tương phản đúng chuẩn WCAG', () => {
    expect(contrast([0, 0, 0], [1, 1, 1])).toBeCloseTo(21, 5)
    expect(contrast(parseHex('#767676'), [1, 1, 1])).toBeCloseTo(4.54, 2)
  })
})

describe('bộ nền', () => {
  it('khớp với bảng màu trong styles.css', () => {
    for (const [id, p] of Object.entries(PALETTES)) {
      const t = (n) => token(id, n) ?? (id === 'dark' ? css.match(new RegExp(`:root,\\n\\[data-palette='dark'\\] \\{[^}]*?${n}: ([^;]+);`))?.[1] : undefined)
      expect(t('--bg'), id).toBe(p.bg)
      expect(t('--glass'), id).toBe(`rgb(${p.glass.slice(0, 3).join(' ')} / ${p.glass[3]})`)
      expect(t('--amb-l'), id).toBe(`${Math.round(p.glow[0] * 100)}%`)
      expect(t('--amb-a'), id).toBe(String(p.glow[1]))
      expect(t('--accent'), id).toBe(p.accent)
      expect(t('color-scheme'), id).toBe(p.scheme)
    }
  })

  it('nút tô màu nhấn mặc định của từng bộ nền có chữ đủ rõ', () => {
    const hex6 = (h) => (h.length === 4 ? `#${[...h.slice(1)].map((c) => c + c).join('')}` : h)
    for (const id of Object.keys(PALETTES)) {
      const fill = token(id, '--accent-fill')
      const ink = token(id, '--accent-fill-ink')
      expect(fill, id).toBe(PALETTES[id].accent)
      expect(contrast(parseHex(fill), parseHex(hex6(ink))), id).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('màu nhấn mặc định của từng bộ nền đủ đọc trên mọi nền chữ có thể nằm lên', () => {
    for (const [id, p] of Object.entries(PALETTES)) {
      expect(minContrast(id, p.accent), id).toBeGreaterThanOrEqual(4.5)
      const { bg, panel } = surfaces(id)
      for (const s of [bg, panel]) expect(contrast(parseHex(p.accent), over(parseHex(p.accent), 0.12, s)), id).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('màu nhấn tự chỉnh', () => {
  it('màu nào cũng thành chữ đọc rõ (4,5:1) trên mọi bộ nền, kể cả trên nhãn tô chính màu đó', () => {
    for (const id of Object.keys(PALETTES)) {
      const { bg, panel } = surfaces(id)
      for (const hex of SAMPLES) {
        const a = accentOn(id, hex)
        expect(minContrast(id, a), `${id} ${hex} → ${a}`).toBeGreaterThanOrEqual(4.5)
        for (const s of [bg, panel]) expect(contrast(parseHex(a), over(parseHex(a), 0.12, s))).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('bật tương phản cao thì đạt 7:1', () => {
    for (const id of Object.keys(PALETTES))
      for (const hex of SAMPLES) expect(minContrast(id, accentOn(id, hex, true)), `${id} ${hex}`).toBeGreaterThanOrEqual(7)
  })

  it('màu đã đủ rõ thì giữ nguyên, đúng màu người dùng chọn', () => {
    expect(accentOn('dark', '#3ecf6e')).toBe('#3ecf6e')
    expect(accentOn('light', '#1a5bbf')).toBe('#1a5bbf')
  })

  it('giữ sắc độ khi chỉnh: xanh vẫn là xanh, chỉ đậm hay nhạt đi', () => {
    for (const hex of ['#3ecf6e', '#4f7cff', '#f472b6']) {
      const [, , h0] = rgbToOklch(parseHex(hex))
      const [, , h1] = rgbToOklch(parseHex(accentOn('light', hex)))
      expect(Math.abs(((h1 - h0 + 540) % 360) - 180)).toBeLessThan(6)
    }
  })

  it('chữ trên nút tô màu nhấn luôn rõ (đen hoặc trắng)', () => {
    for (const hex of SAMPLES) expect(contrast(parseHex(hex), parseHex(inkFor(hex))), hex).toBeGreaterThanOrEqual(4.5)
  })
})

describe('lưu và đọc lựa chọn', () => {
  it('dữ liệu hỏng hay lạ thì dùng mặc định', () => {
    for (const raw of [null, 'abc', 42, [], { dark: 'neon', size: 300, accent: 'red' }]) expect(parse(raw)).toEqual(DEFAULTS)
  })
  it('chỉ nhận mã màu đúng dạng, không nhận chuỗi lạ', () => {
    expect(parse({ accent: '#3ECF6E' }).accent).toBe('#3ecf6e')
    for (const accent of ['#fff', 'url(x)', '#12345g', '#1234567', 'expression(1)']) expect(parse({ accent }).accent).toBe('default')
  })
  it('giữ đủ mọi lựa chọn hợp lệ', () => {
    const all = Object.fromEntries(Object.entries(CHOICES).map(([k, list]) => [k, list.at(-1)]))
    expect(parse({ ...all, accent: '#123456' })).toEqual({ ...all, accent: '#123456' })
  })
  it('sáng hay tối theo chế độ và theo máy', () => {
    expect(schemeOf('dark', false)).toBe('dark')
    expect(schemeOf('light', true)).toBe('light')
    expect(schemeOf('system', true)).toBe('dark')
    expect(schemeOf('system', false)).toBe('light')
  })
})

describe('cách vẽ', () => {
  it('mặc định thì không đặt thêm gì: giao diện y như trước', () => {
    const p = paint(DEFAULTS)
    expect(isDefault(DEFAULTS)).toBe(true)
    expect(p.attrs).toEqual({})
    expect(p.dark).toEqual({ palette: 'dark', bar: '#08080a', vars: {} })
    expect(p.light).toEqual({ palette: 'light', bar: '#f2f2f5', vars: {} })
  })
  it('đổi lựa chọn thì có thuộc tính và biến CSS tương ứng', () => {
    const p = paint({ ...DEFAULTS, dark: 'oled', light: 'paper', accent: '#4f7cff', font: 'serif', size: '125', primary: 'accent' })
    expect(p.attrs).toEqual({ accent: 'custom', font: 'serif', size: '125', primary: 'accent' })
    expect(p.dark.palette).toBe('oled')
    expect(p.dark.bar).toBe('#000000')
    expect(p.light.palette).toBe('paper')
    expect(p.dark.vars['--accent-fill']).toBe('#4f7cff')
    expect(p.light.vars['--accent']).not.toBe('#4f7cff') // nền sáng: xanh được làm đậm hơn cho chữ dễ đọc
    expect(Number(p.dark.vars['--accent-h'])).toBeGreaterThan(250)
    for (const v of Object.values(p.light.vars)) expect(v).toMatch(/^(#[0-9a-f]{6}|-?\d{1,3}(\.\d{1,4})?)$/)
  })
  it('tương phản cao thì chỉnh cả màu nhấn mặc định', () => {
    const p = paint({ ...DEFAULTS, contrast: 'high' })
    expect(minContrast('dark', p.dark.vars['--accent'])).toBeGreaterThanOrEqual(7)
    expect(p.attrs).toEqual({ contrast: 'high' })
  })
})

describe('chủ đề nhanh', () => {
  it('mỗi chủ đề là một bộ lựa chọn hợp lệ, áp xong thì được nhận ra là đang dùng', () => {
    for (const p of PRESETS) {
      const s = parse({ ...DEFAULTS, size: '125', ...p.set })
      expect(s, p.id).toMatchObject(p.set)
      expect(presetActive(p, s, p.mode), p.id).toBe(true)
      expect(s.size).toBe('125') // chủ đề không đụng tới cỡ chữ
    }
    expect(presetActive(PRESETS[0], DEFAULTS, 'dark')).toBe(true)
    expect(presetActive(PRESETS[0], DEFAULTS, 'light')).toBe(false)
  })
})

describe('vẽ trước khi trang tải xong (public/theme-init.js)', () => {
  it('đọc đúng khoá mà theme.js lưu', () => {
    const init = readFileSync(new URL('../../public/theme-init.js', import.meta.url), 'utf8')
    const theme = readFileSync(new URL('./theme.js', import.meta.url), 'utf8')
    for (const key of ['so-on-tap:giao-dien', 'so-on-tap:tuy-chinh']) {
      expect(init).toContain(`'${key}'`)
      expect(theme).toContain(`'${key}'`)
    }
  })
})
