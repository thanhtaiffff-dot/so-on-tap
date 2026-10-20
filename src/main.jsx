import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './fonts.css'
import './styles.css'
import { StoreProvider } from './data/store.jsx'
import App from './App.jsx'
import { setupPwa } from './pwa.js'

setupPwa()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
)
