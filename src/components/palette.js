// Dữ liệu cho bảng "Tìm nhanh" (Ctrl/⌘ + K): tìm môn, chế độ ôn, ghi chú và lệnh.

// Tìm không cần gõ dấu: "vat ly" vẫn khớp "Vật lý".
export function fold(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase()
}

export const MODES = [
  { path: 'the-lat', label: 'Thẻ lật', icon: 'cards', words: 'flashcard on the' },
  { path: 'trac-nghiem', label: 'Trắc nghiệm', icon: 'quiz', words: 'quiz kiem tra lam bai thi' },
  { path: 'ghi-chu', label: 'Ghi chú', icon: 'note', words: 'note so tay' },
  { path: 'the', label: 'Bộ thẻ', icon: 'list', words: 'them sua xoa the danh sach' },
]

const LIMIT = { 'Môn học': 50, 'Ôn tập': 12, 'Ghi chú': 8, 'Lệnh': 20 }

// Khớp khi mọi chữ gõ vào đều có mặt; tên bắt đầu bằng chữ gõ vào thì xếp lên trước.
function rank(title, hay, terms) {
  if (!terms.length) return 1
  if (!terms.every((t) => hay.includes(t))) return 0
  const t = fold(title)
  if (t.startsWith(terms[0])) return 3
  return t.split(/\s+/).some((w) => w.startsWith(terms[0])) ? 2 : 1
}

// Chưa gõ gì: hiện các môn và các lệnh. Gõ rồi: tìm thêm từng chế độ ôn của mỗi môn và ghi chú.
export function buildItems(state, query, commands) {
  const terms = fold(query.trim()).split(/\s+/).filter(Boolean)
  const searching = terms.length > 0
  const groups = { 'Môn học': [], 'Ôn tập': [], 'Ghi chú': [], 'Lệnh': [] }
  const add = (group, item, words) => {
    const score = rank(item.title, fold(`${item.title} ${words}`), terms)
    if (score) groups[group].push({ ...item, group, score })
  }

  const names = new Map(state.subjects.map((s) => [s.id, s.name]))
  for (const s of state.subjects) {
    const cards = state.cards.filter((c) => c.subjectId === s.id).length
    const notes = state.notes.filter((n) => n.subjectId === s.id).length
    add('Môn học', { id: `s-${s.id}`, title: s.name, subtitle: `${cards} thẻ · ${notes} ghi chú`, letter: true, hue: s.hue, to: `/mon/${s.id}` }, '')
    if (searching)
      for (const m of MODES)
        add('Ôn tập', { id: `m-${s.id}-${m.path}`, title: `${m.label} · ${s.name}`, icon: m.icon, hue: s.hue, to: `/mon/${s.id}/${m.path}` }, m.words)
  }
  if (searching)
    for (const n of state.notes) {
      if (!n.title.trim() && !n.body.trim()) continue
      const subject = names.get(n.subjectId) ?? ''
      add('Ghi chú', { id: `n-${n.id}`, title: n.title.trim() || 'Chưa đặt tiêu đề', subtitle: subject, icon: 'note', to: `/mon/${n.subjectId}/ghi-chu/${n.id}` },
        `${subject} ${n.body.slice(0, 300)}`)
    }
  for (const c of commands) add('Lệnh', { id: `c-${c.id}`, title: c.title, icon: c.icon, cmd: c.id }, c.words)

  return Object.entries(groups).flatMap(([name, list]) =>
    list
      .map((item, i) => [item, i])
      .sort((a, b) => b[0].score - a[0].score || a[1] - b[1])
      .slice(0, LIMIT[name])
      .map(([item]) => item),
  )
}
