// So sánh hai lần chụp dữ liệu để biết bản ghi nào cần ghi lại hoặc xoá,
// nhờ vậy sửa một thẻ chỉ phải ghi đúng thẻ đó.
import { ORDER, STORES } from './schema.js'

const same = (a, b) => a === b

export function shallowEqual(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((k) => a[k] === b[k])
}

// Kết quả có dạng { cards: { put: [bản ghi…], del: [mã…] }, … }, chỉ gồm các danh sách có thay đổi.
export function diffState(prev, next, eq = same) {
  const out = {}
  for (const s of STORES) {
    const a = prev[s] ?? []
    const b = next[s] ?? []
    if (a === b) continue
    const old = new Map(a.map((r) => [r.id, r]))
    const put = []
    for (const r of b) {
      const o = old.get(r.id)
      if (!o || !eq(o, r)) put.push(r)
      old.delete(r.id)
    }
    const del = [...old.keys()]
    if (put.length || del.length) out[s] = { put, del }
  }
  return out
}

export const isEmpty = (changes) => Object.keys(changes).length === 0

export function applyChanges(base, changes) {
  const out = { ...base }
  for (const s of Object.keys(changes)) {
    const m = new Map(base[s].map((r) => [r.id, r]))
    for (const key of changes[s].del) m.delete(key)
    for (const r of changes[s].put) m.set(r.id, r)
    out[s] = [...m.values()].sort(ORDER[s])
  }
  return out
}
