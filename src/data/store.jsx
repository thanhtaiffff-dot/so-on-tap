import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { loadData, saveData, sanitize } from './storage.js'
import { makeSample } from './sample.js'

const StoreContext = createContext(null)
const uid = () => crypto.randomUUID()

function reducer(state, a) {
  switch (a.type) {
    case 'subject/add':
      return { ...state, subjects: [...state.subjects, { id: uid(), name: a.name, hue: a.hue, createdAt: Date.now() }] }
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
    case 'card/addMany':
      return {
        ...state,
        cards: [
          ...state.cards,
          ...a.items.map((it) => ({ id: uid(), subjectId: a.subjectId, front: it.front, back: it.back, box: 0, reviewedAt: 0 })),
        ],
      }
    case 'card/update':
      return { ...state, cards: state.cards.map((c) => (c.id === a.id ? { ...c, front: a.front, back: a.back } : c)) }
    case 'card/delete':
      return { ...state, cards: state.cards.filter((c) => c.id !== a.id) }
    case 'card/review':
      // Hộp Leitner: nhớ thì lên hộp cao hơn (ít hiện lại), quên thì về hộp 0.
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === a.id ? { ...c, box: a.remembered ? Math.min(5, c.box + 1) : 0, reviewedAt: Date.now() } : c,
        ),
      }
    case 'note/add':
      return { ...state, notes: [{ id: a.id, subjectId: a.subjectId, title: '', body: '', updatedAt: Date.now() }, ...state.notes] }
    case 'note/update':
      return { ...state, notes: state.notes.map((n) => (n.id === a.id ? { ...n, ...a.patch, updatedAt: Date.now() } : n)) }
    case 'note/delete':
      return { ...state, notes: state.notes.filter((n) => n.id !== a.id) }
    case 'quiz/record':
      return { ...state, quizHistory: [...state.quizHistory, { subjectId: a.subjectId, score: a.score, total: a.total, at: Date.now() }].slice(-200) }
    case 'all/replace':
      return a.data
    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => loadData() ?? makeSample())
  useEffect(() => {
    saveData(state)
  }, [state])

  const api = useMemo(
    () => ({
      state,
      dispatch,
      newId: uid,
      importJson: (text) => dispatch({ type: 'all/replace', data: sanitize(JSON.parse(text)) }),
      resetAll: (withSample) => dispatch({ type: 'all/replace', data: withSample ? makeSample() : { version: 1, subjects: [], cards: [], notes: [], quizHistory: [] } }),
    }),
    [state],
  )
  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
