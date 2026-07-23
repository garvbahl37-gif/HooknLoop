import React from 'react'
import { createRoot } from 'react-dom/client'
/*  Tokens + base MUST load before App (App pulls in per-area stylesheets, and
    imports evaluate in source order — keep the cascade predictable).           */
import './styles/tokens.css'
import './styles/base.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
