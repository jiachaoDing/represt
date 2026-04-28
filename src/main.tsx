import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import './app/pwa.ts'
import './i18n'
import './styles/global.css'
import { applyStoredThemePreference } from './lib/theme.ts'

applyStoredThemePreference()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
