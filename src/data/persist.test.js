import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPersistence } from './persist.js'
import { openDB, readAll, LEGACY_KEY } from './db.js'
import { makeSample } from './sample.js'
import { reducer } from './store.jsx'
import { applyChanges } from './diff.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const until = async (fn, ms = 2000) => {
  const end = Date.now() + ms
  while (!fn()) {
    if (Date.now() > end) throw new Error('Hết thời gian chờ')
    await sleep(5)
  }
}

// Một "tab": bộ lưu + dữ liệu đang hiện, giống StoreProvider nhưng không cần React.
function tab(idb) {
  const t = { state: null, status: null, meta: null }
  t.p = createPersistence({
    idb,
    delay: 20,
    makeSample: () => makeSample(1000),
    onRemote: (changes) => {
      t.state = applyChanges(t.state, changes)
      t.p.schedule(t.state)
    },
    onStatus: (s) => (t.status = s),
    onMeta: (m) => (t.meta = m),
  })
  t.open = async () => {
    const r = await t.p.init()
    t.state = r.data
    t.meta = r.meta
    return r
  }
  t.do = (action) => {
    t.state = reducer(t.state, { now: Date.now(), ...action })
    t.p.schedule(t.state)
  }
  return t
}

const memoryStorage = () => {
  const m = new Map()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

let idb
let tabs = []
const newTab = () => {
  const t = tab(idb)
  tabs.push(t)
  return t
}
const stored = async () => {
  const db = await openDB(idb)
  const r = await readAll(db)
  db.close()
  return r
}

beforeEach(() => {
  idb = new IDBFactory()
  tabs = []
})
afterEach(() => {
  for (const t of tabs) t.p.dispose()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('lưu dữ liệu', () => {
  it('lần đầu nạp dữ liệu mẫu, lần sau không nạp lại', async () => {
    const a = newTab()
    const r = await a.open()
    expect(r.mode).toBe('db')
    expect(a.status).toBe('saved')
    expect(r.data.cards).toHaveLength(11)
    a.do({ type: 'card/delete', id: r.data.cards[0].id })
    await a.p.flush()
    const b = newTab()
    expect((await b.open()).data.cards).toHaveLength(10)
  })

  it('chuyển dữ liệu cũ từ localStorage sang và giữ khoá cũ để phòng hờ', async () => {
    const ls = memoryStorage()
    const old = makeSample(1)
    old.version = 1
    old.subjects[0].name = 'Môn cũ'
    ls.setItem(LEGACY_KEY, JSON.stringify(old))
    vi.stubGlobal('localStorage', ls)
    const r = await newTab().open()
    expect(r.data.subjects[0].name).toBe('Môn cũ')
    expect(r.meta.pendingSince).toBeGreaterThan(0)
    expect(ls.getItem(LEGACY_KEY)).not.toBeNull()
  })

  it('gom thay đổi rồi chỉ ghi phần đã đổi', async () => {
    const a = newTab()
    const { data } = await a.open()
    const note = data.notes[0]
    for (const ch of 'xin chào') a.do({ type: 'note/update', id: note.id, patch: { body: note.body + ch } })
    expect(a.status).toBe('saving')
    await until(() => a.status === 'saved')
    const { data: db, meta } = await stored()
    expect(db.notes.find((n) => n.id === note.id).body).toBe(note.body + 'o')
    expect(meta.pendingSince).toBeGreaterThan(0)
  })

  it('báo lỗi khi ghi thất bại (ví dụ bộ nhớ đầy) và thử lại được', async () => {
    const a = newTab()
    const { data } = await a.open()
    const put = IDBObjectStore.prototype.put
    const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Hết chỗ', 'QuotaExceededError')
    })
    a.do({ type: 'card/update', id: data.cards[0].id, front: 'mới', back: 'mới' })
    await a.p.flush()
    expect(a.status).toBe('error')
    spy.mockImplementation(put)
    await a.p.retry()
    expect(a.status).toBe('saved')
    expect((await stored()).data.cards.find((c) => c.id === data.cards[0].id).front).toBe('mới')
  })

  it('chỉ giữ trong bộ nhớ khi trình duyệt không cho dùng IndexedDB', async () => {
    const t = tab(undefined)
    tabs.push(t)
    const r = await t.open()
    expect(r.mode).toBe('memory')
    expect(t.status).toBe('memory')
    expect(r.data.subjects).toHaveLength(2)
  })
})

describe('nhiều tab (lỗi L1: tab sau ghi đè mất dữ liệu tab trước)', () => {
  it('thẻ thêm ở tab A không mất khi tab B lưu', async () => {
    const a = newTab()
    const b = newTab()
    const { data } = await a.open()
    await b.open()
    a.do({ type: 'card/addMany', subjectId: data.subjects[0].id, items: [{ id: 'from-a', front: 'A', back: 'a' }] })
    await a.p.flush()
    await until(() => b.state.cards.some((c) => c.id === 'from-a'))
    b.do({ type: 'subject/rename', id: data.subjects[1].id, name: 'Lý' })
    await b.p.flush()
    await until(() => a.state.subjects[1].name === 'Lý')
    const db = (await stored()).data
    expect(db.cards.some((c) => c.id === 'from-a')).toBe(true)
    expect(db.subjects.find((s) => s.id === data.subjects[1].id).name).toBe('Lý')
  })

  it('xoá ở một tab thì tab kia cũng mất bản ghi đó', async () => {
    const a = newTab()
    const b = newTab()
    const { data } = await a.open()
    await b.open()
    a.do({ type: 'subject/delete', id: data.subjects[0].id })
    await a.p.flush()
    await until(() => b.state.subjects.length === 1)
    expect(b.state.cards.every((c) => c.subjectId !== data.subjects[0].id)).toBe(true)
  })

  it('ghi chú đang gõ dở ở tab B không bị bản của tab A đè mất', async () => {
    const a = newTab()
    const b = newTab()
    const { data } = await a.open()
    await b.open()
    const id = data.notes[0].id
    b.do({ type: 'note/update', id, patch: { body: 'B đang gõ' } })
    a.do({ type: 'note/update', id, patch: { body: 'A' } })
    await a.p.flush()
    await sleep(50)
    expect(b.state.notes.find((n) => n.id === id).body).toBe('B đang gõ')
    await until(() => a.state.notes.find((n) => n.id === id).body === 'B đang gõ')
    expect((await stored()).data.notes.find((n) => n.id === id).body).toBe('B đang gõ')
  })
})
