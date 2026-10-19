// Tự động lưu vào máy.
// - Gom các thay đổi trong 0,4 giây rồi ghi một lần, và chỉ ghi những bản ghi đã đổi.
// - Báo cho các tab khác đang mở trang để chúng cập nhật theo, thay vì ghi đè lên nhau.
// - Ghi lỗi (ví dụ bộ nhớ đầy) thì báo trạng thái 'error' để trang hiện cảnh báo, không im lặng.
import { commit, initialize, openDB, readAll, readLegacy } from './db.js'
import { applyChanges, diffState, isEmpty, shallowEqual } from './diff.js'
import { sanitize } from './schema.js'
import { uid } from './uuid.js'

const CHANNEL = 'so-on-tap'
const PING_KEY = 'so-on-tap:ping'

const win = globalThis
const listen = (type, fn) => win.addEventListener?.(type, fn)
const unlisten = (type, fn) => win.removeEventListener?.(type, fn)
const hidden = () => win.document?.visibilityState === 'hidden'

// Trạng thái: loading → saved / saving / error; 'memory' khi trình duyệt không cho lưu,
// 'reload' khi tab khác đã nâng cấp kho dữ liệu lên phiên bản mới hơn.
export function createPersistence({ makeSample, onRemote, onStatus, onMeta, delay = 400, idb = win.indexedDB }) {
  const tabId = uid()
  let db = null
  let saved = null // dữ liệu chắc chắn đã nằm trong máy
  let latest = null // dữ liệu mới nhất đang hiện trên trang
  let seq = 0 // số thứ tự của bản `latest`, để lần ghi xong muộn không lùi `saved` về bản cũ
  let savedSeq = 0
  let meta = {}
  let status = 'loading'
  let error = null
  let timer = null
  let queue = Promise.resolve()
  let pullQueued = false
  let stale = false
  let channel = null
  let disposed = false

  function setStatus(next, err = null) {
    if (next === status && err === error) return
    status = next
    error = err
    onStatus?.(status, error)
  }

  function setMeta(patch) {
    const m = { ...meta }
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) delete m[k]
      else m[k] = v
    }
    meta = m
    onMeta?.(meta)
  }

  async function init() {
    try {
      db = await openDB(idb)
      if (disposed) return close()
      db.onversionchange = () => {
        close()
        setStatus('reload')
      }
      // Từ lần mở thứ hai: chỉ một lần đọc. Lần đầu: nạp dữ liệu ban đầu rồi đọc lại.
      let r = await readAll(db)
      if (r.meta.initializedAt == null) {
        await initialize(db, () => {
          const legacy = readLegacy()
          const now = Date.now()
          return { data: legacy ?? makeSample(), meta: legacy ? { initializedAt: now, pendingSince: now } : { initializedAt: now } }
        })
        r = await readAll(db)
      }
      if (disposed) return close()
      saved = latest = sanitize(r.data, { ordered: false })
      meta = r.meta
      start()
      setStatus('saved')
      return { data: saved, meta, mode: 'db' }
    } catch (e) {
      if (disposed) return close()
      // Không mở được kho (trình duyệt chặn, chế độ ẩn danh cũ…): chỉ giữ dữ liệu trong bộ nhớ.
      close()
      saved = latest = readLegacy() ?? makeSample()
      setStatus('memory', e?.name ?? 'Error')
      return { data: saved, meta, mode: 'memory' }
    }
  }

  function close() {
    db?.close()
    db = null
    return null
  }

  function start() {
    if (typeof BroadcastChannel === 'function') {
      channel = new BroadcastChannel(CHANNEL)
      channel.onmessage = (e) => e.data?.tab !== tabId && onRemoteSignal()
    } else listen('storage', onStorage)
    listen('visibilitychange', onVisibility)
    listen('pagehide', flushNow)
    listen('beforeunload', onBeforeUnload)
  }

  function announce() {
    if (channel) channel.postMessage({ tab: tabId })
    else
      try {
        localStorage.setItem(PING_KEY, `${tabId}:${Date.now()}`)
      } catch {
        /* bỏ qua */
      }
  }

  function onStorage(e) {
    if (e.key === PING_KEY && !String(e.newValue).startsWith(tabId)) onRemoteSignal()
  }

  // Tab ẩn thì chưa cần đọc lại; đợi đến khi người dùng quay lại tab.
  function onRemoteSignal() {
    if (hidden()) stale = true
    else pull()
  }

  function onVisibility() {
    if (hidden()) flushNow()
    else if (stale) {
      stale = false
      pull()
    }
  }

  function onBeforeUnload(e) {
    flushNow()
    if (status === 'error') {
      e.preventDefault()
      e.returnValue = ''
    }
  }

  // Gọi mỗi khi dữ liệu trên trang đổi.
  function schedule(state) {
    latest = state
    seq++
    if (!db || state === saved) return
    if (status !== 'error') setStatus('saving')
    clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  function enqueue(job) {
    queue = queue.then(job, job)
    return queue
  }

  function flush() {
    clearTimeout(timer)
    timer = null
    return enqueue(write)
  }

  // Lúc đóng tab không kịp xếp hàng: ghi ngay. Ghi trùng một bản ghi hai lần cũng vô hại.
  function flushNow() {
    clearTimeout(timer)
    timer = null
    if (db && latest !== saved) write()
  }

  async function write() {
    if (!db) return
    const target = latest
    const mine = seq
    const changes = diffState(saved, target)
    if (!isEmpty(changes)) {
      setStatus('saving')
      // Mốc "có thay đổi chưa sao lưu" để nhắc tải file sao lưu.
      const patch = meta.pendingSince ? {} : { pendingSince: Date.now() }
      try {
        await commit(db, changes, patch)
      } catch (e) {
        setStatus('error', e?.name ?? 'Error')
        return
      }
      if (patch.pendingSince) setMeta(patch)
      announce()
    }
    if (mine >= savedSeq) {
      saved = target
      savedSeq = mine
    }
    if (latest === saved) setStatus('saved')
    else if (!timer && db) timer = setTimeout(flush, delay)
  }

  // Tab khác vừa ghi: ghi nốt phần của tab này, đọc lại kho rồi đưa phần đã đổi lên trang.
  function pull() {
    if (pullQueued) return queue
    pullQueued = true
    return enqueue(async () => {
      pullQueued = false
      if (!db) return
      clearTimeout(timer)
      timer = null
      await write()
      let r
      try {
        r = await readAll(db)
      } catch {
        return
      }
      if (!db) return
      const before = saved
      const remote = diffState(before, sanitize(r.data, { ordered: false }), shallowEqual)
      if (!shallowEqual(meta, r.meta)) {
        meta = r.meta
        onMeta?.(meta)
      }
      if (isEmpty(remote)) return
      saved = applyChanges(before, remote)
      // Bản ghi tab này đang sửa dở (chưa kịp ghi) thì giữ bản của tab này; nó sẽ được ghi đè lên sau.
      const keep = {}
      for (const s of Object.keys(remote)) {
        const was = new Map(before[s].map((x) => [x.id, x]))
        const now = latest[s] === before[s] ? was : new Map(latest[s].map((x) => [x.id, x]))
        const put = remote[s].put.filter((x) => now.get(x.id) === was.get(x.id))
        if (put.length || remote[s].del.length) keep[s] = { put, del: remote[s].del }
      }
      if (!isEmpty(keep)) onRemote?.(keep)
    })
  }

  // Ghi các mục phụ (mốc sao lưu, hẹn nhắc…). Giá trị null là xoá mục đó.
  function updateMeta(patch) {
    setMeta(patch)
    if (db) enqueue(() => commit(db, {}, patch).catch(() => {}))
  }

  function retry() {
    return flush()
  }

  function dispose() {
    disposed = true
    flushNow()
    channel?.close()
    channel = null
    unlisten('storage', onStorage)
    unlisten('visibilitychange', onVisibility)
    unlisten('pagehide', flushNow)
    unlisten('beforeunload', onBeforeUnload)
    queue.then(close)
  }

  return { init, schedule, flush, retry, pull, updateMeta, dispose, get status() { return status } }
}
