import { NavLink, Route, Routes, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Subject from './pages/Subject.jsx'
import Settings from './pages/Settings.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Banners from './components/Banners.jsx'
import CommandPalette, { PaletteButton } from './components/CommandPalette.jsx'
import { StoreGate } from './data/store.jsx'

export default function App() {
  return (
    <div className="app">
      {/* Nền có vệt màu mờ phía sau, để các khối kính mờ phía trước có màu để "nhìn xuyên" qua. */}
      <div className="ambient" aria-hidden="true" />
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Sổ Ôn Tập, về trang chủ">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Sổ Ôn Tập</span>
        </Link>
        <nav className="topnav">
          <NavLink to="/" end>Môn học</NavLink>
          <NavLink to="/cai-dat">Cài đặt</NavLink>
        </nav>
        <div className="top-actions">
          <PaletteButton className="palette-trigger" />
          <ThemeToggle />
        </div>
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
      <CommandPalette />
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
