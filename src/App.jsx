import { NavLink, Route, Routes, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Subject from './pages/Subject.jsx'
import Settings from './pages/Settings.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Banners from './components/Banners.jsx'
import { StoreGate } from './data/store.jsx'

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Sổ Ôn Tập, về trang chủ">
          <span className="brand-mark" aria-hidden="true" />
          Sổ Ôn Tập
        </Link>
        <nav className="topnav">
          <NavLink to="/" end>Môn học</NavLink>
          <NavLink to="/cai-dat">Cài đặt</NavLink>
          <ThemeToggle />
        </nav>
      </header>
      <main className="page">
        <StoreGate>
          <Banners />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mon/:subjectId/*" element={<Subject />} />
            <Route path="/cai-dat" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </StoreGate>
      </main>
    </div>
  )
}

function NotFound() {
  return (
    <div className="empty">
      <h1>Không tìm thấy trang này</h1>
      <Link className="btn" to="/">Về trang chủ</Link>
    </div>
  )
}
