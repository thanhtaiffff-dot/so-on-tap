import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createPersistence } from './persist.js'
import { applyChanges } from './diff.js'
import { clearLegacy } from './db.js'
import { QUIZ_KEEP, emptyData, sanitize } from './schema.js'
import { makeSample } from './sample.js'
import { downloadBackup } from './backup.js'
import { uid } from './uuid.js'
import { blank, grade } from './srs.js'

const StoreContext = createContext(null)
const SaveContext = createContext(null)

// Thời điểm tạo của bản ghi mới không nhỏ hơn bản ghi cuối, để thứ tự luôn đúng.
const nextTime = (list, now) => Math.max(now, (list.at(-1)?.createdAt ?? 0) + 1)

// Mọi thay đổi dữ liệu đi qua đây. Thời điểm (a.now) và mã mới (a.id) được truyền vào sẵn,
// nên hàm này chỉ tính toán, không tự lấy giờ hay tạo mã.
export function reducer(state, a) {
  switch (a.type) {
    case 'all/load':
    case 'all/replace':
      return a.data
    case 'sync/remote':
      return applyChanges(state, a.changes)
    case 'subject/add':
      return {
        ...state,
        subjects: [...state.subjects, { id: a.id, name: a.name, hue: a.hue, createdAt: nextTime(state.subjects, a.now) }],
      }
    case 'subject/rename':
      return { ...state, subjects: state.subjects.map((s) => (s.id === a.id ? { ...s, name: a.name, hue: a.hue ?? s.hue } : s)) }
    case 'subject/delete':
      return {
        ...state,
        subjects: state.subjects.filter((s) => s.id !== a.id),
        cards: state.cards.filter((c) => c.subjectId !== a.id),
        notes: state.notes.filter((n) => n.subjectId !== a.id),
        quizHistory: state.quizHistory.filter((q) => q.subjectId !== a.id),
      }
    case 'card/addMany': {
      const t = nextTime(state.cards, a.now)
      const added = a.items.map((it, i) => ({
        id: it.id,
        subjectId: a.subjectId,
        front: it.front,
        back: it.back,
        note: it.note ?? '',
        createdAt: t + i,
        ...blank(),
      }))
      return { ...state, cards: [...state.cards, ...added] }
    }
    case 'card/update':
      return {
        ...state,
        cards: state.cards.map((c) => (c.id === a.id ? { ...c, front: a.front, back: a.back, note: a.note ?? c.note } : c)),
      }
    case 'card/delete':
      return { ...state, cards: state.cards.filter((c) => c.id !== a.id) }
    // Chấm một thẻ khi ôn (a.rating: 1 Quên, 2 Khó, 3 Nhớ, 4 Dễ) và hẹn lần ôn tới theo FSRS.
    case 'card/grade':
      return { ...state, cards: state.cards.map((c) => (c.id === a.id ? grade(c, a.rating, a.now) : c)) }
    case 'note/add':
      return {
        ...state,
        notes: [{ id: a.id, subjectId: a.subjectId, title: a.title ?? '', body: a.body ?? '', updatedAt: a.now }, ...state.notes],
      }
    case 'note/update':
      return { ...state, notes: state.notes.map((n) => (n.id === a.id ? { ...n, ...a.patch, updatedAt: a.now } : n)) }
    case 'note/delete':
      return { ...state, notes: state.notes.filter((n) => n.id !== a.id) }
    case 'note/dropEmpty': {
      const notes = state.notes.filter((n) => n.subjectId !== a.subjectId || n.title.trim() || n.body.trim())
      return notes.length === state.notes.length ? state : { ...state, notes }
    }
    case 'quiz/record': {
      const entry = { id: a.id, subjectId: a.subjectId, score: a.score, total: a.total, at: a.now }
      return { ...state, quizHistory: [...state.quizHistory, entry].slice(-QUIZ_KEEP) }
    }
    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, rawDispatch] = useReducer(reducer, null)
  const [save, setSave] = useState({ status: 'loading', error: null })
  const [meta, setMeta] = useState({})
  const persist = useRef(null)

  useEffect(() => {
    const p = createPersistence({
      makeSample,
      onRemote: (changes) => rawDispatch({ type: 'sync/remote', changes }),
      onStatus: (status, error) => setSave({ status, error }),
      onMeta: setMeta,
    })
    persist.current = p
    let alive = true
    p.init().then((r) => {
      if (!alive || !r) return
      setMeta(r.meta)
      rawDispatch({ type: 'all/load', data: r.data })
    })
    return () => {
      alive = false
      p.dispose()
    }
  }, [])

  useEffect(() => {
    if (state) persist.current?.schedule(state)
  }, [state])

  const dispatch = useCallback((a) => rawDispatch({ now: Date.now(), ...a }), [])

  const api = useMemo(
    () =>
      state && {
        state,
        dispatch,
        newId: uid,
        importJson: (text) => dispatch({ type: 'all/replace', data: sanitize(JSON.parse(text)) }),
        resetAll: (withSample) => {
          clearLegacy()
          dispatch({ type: 'all/replace', data: withSample ? makeSample() : emptyData() })
        },
      },
    [state, dispatch],
  )

  const saveApi = useMemo(
    () => ({
      ...save,
      meta,
      retry: () => persist.current?.retry(),
      flush: () => persist.current?.flush(),
      updateMeta: (patch) => persist.current?.updateMeta(patch),
    }),
    [save, meta],
  )

  return (
    <SaveContext.Provider value={saveApi}>
      <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
    </SaveContext.Provider>
  )
}

// Phần cần dữ liệu chỉ hiện khi đã đọc xong kho; khung trang (thanh trên cùng) hiện ngay từ đầu.
export function StoreGate({ children }) {
  return useStore() ? children : <Boot />
}

function Boot() {
  return (
    <div className="boot" role="status">
      <span className="brand-mark" aria-hidden="true" />
      Đang mở sổ…
    </div>
  )
}

export const useStore = () => useContext(StoreContext)
export const useSave = () => useContext(SaveContext)

// Tải file sao lưu (gồm cả thay đổi chưa kịp lưu) và ghi nhận mốc sao lưu.
export function useBackup() {
  const { state } = useStore()
  const { updateMeta } = useSave()
  return useCallback(() => {
    const now = Date.now()
    downloadBackup(state, now)
    updateMeta({ lastBackupAt: now, pendingSince: null, backupSnoozeUntil: null })
  }, [state, updateMeta])
}
