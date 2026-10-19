// Kho dữ liệu trong trình duyệt (IndexedDB): mỗi môn, thẻ, ghi chú là một bản ghi riêng.
// Muốn thêm đăng nhập Google và đồng bộ sau này thì thay lớp này (cùng persist.js) là đủ.
import { STORES, sanitize } from './schema.js'

export const DB_NAME = 'so-on-tap'
const DB_VERSION = 1
// Bản đầu tiên lưu cả cuốn sổ thành một chuỗi JSON trong localStorage dưới khoá này.
export const LEGACY_KEY = 'so-on-tap:v1'
const ALL = [...STORES, 'meta']

export function openDB(idb = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    if (!idb) return reject(new Error('Trình duyệt không có IndexedDB'))
    let r
    try {
      r = idb.open(DB_NAME, DB_VERSION)
    } catch (e) {
      return reject(e)
    }
    r.onupgradeneeded = () => {
      const db = r.result
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

const done = (tx, resolve, reject) => {
  tx.oncomplete = () => resolve()
  tx.onabort = () => reject(tx.error ?? new Error('Ghi dữ liệu bị huỷ'))
}

// Đọc toàn bộ trong một lần (một transaction), nên luôn thấy dữ liệu nhất quán.
export function readAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALL, 'readonly')
    const data = {}
    const meta = {}
    for (const s of STORES) {
      const r = tx.objectStore(s).getAll()
      r.onsuccess = () => (data[s] = r.result)
    }
    const c = tx.objectStore('meta').openCursor()
    c.onsuccess = () => {
      const cur = c.result
      if (!cur) return
      meta[cur.key] = cur.value
      cur.continue()
    }
    done(tx, () => resolve({ data, meta }), reject)
  })
}

// Lần đầu mở: ghi dữ liệu ban đầu. Kiểm tra và ghi nằm chung một transaction,
// nên hai tab mở cùng lúc cũng không nạp hai lần. seed() phải chạy đồng bộ.
export function initialize(db, seed) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALL, 'readwrite')
    const meta = tx.objectStore('meta')
    let seeded = false
    const r = meta.get('initializedAt')
    r.onsuccess = () => {
      if (r.result != null) return
      try {
        const first = seed()
        for (const s of STORES) for (const rec of first.data[s]) tx.objectStore(s).put(rec)
        for (const [k, v] of Object.entries(first.meta)) meta.put(v, k)
        seeded = true
      } catch (e) {
        tx.abort()
        reject(e)
      }
    }
    done(tx, () => resolve(seeded), reject)
  })
}

// Ghi các thay đổi (và chỉnh mục trong meta; giá trị null là xoá mục đó) trong một transaction:
// hoặc ghi được hết, hoặc không ghi gì.
export function commit(db, changes, metaPatch = {}) {
  return new Promise((resolve, reject) => {
    let tx
    try {
      tx = db.transaction(ALL, 'readwrite')
      for (const s of Object.keys(changes)) {
        const os = tx.objectStore(s)
        for (const rec of changes[s].put) os.put(rec)
        for (const key of changes[s].del) os.delete(key)
      }
      const meta = tx.objectStore('meta')
      for (const [k, v] of Object.entries(metaPatch)) {
        if (v == null) meta.delete(k)
        else meta.put(v, k)
      }
    } catch (e) {
      try {
        tx?.abort()
      } catch {
        /* transaction đã kết thúc */
      }
      return reject(e)
    }
    done(tx, resolve, reject)
    // Báo trình duyệt ghi luôn, không đợi trang xử lý xong từng yêu cầu: lúc đóng hay tải lại tab,
    // trang có thể bị huỷ trước khi kịp làm việc đó và lần ghi cuối bị bỏ dở.
    tx.commit?.()
  })
}

export function readLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    return raw ? sanitize(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function clearLegacy() {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* bỏ qua */
  }
}
