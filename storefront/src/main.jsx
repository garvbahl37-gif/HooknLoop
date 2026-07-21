import React from 'react'
import { createRoot } from 'react-dom/client'
/*  Tokens and base MUST be imported before App: App pulls in the per-area
    stylesheets, and imports evaluate in source order. With App first, base.css
    landed last and its `.wrap { padding: 0 24px }` beat every `.wrap x` rule of
    equal specificity — silently zeroing the vertical padding on .ft__main,
    .pdp__grid, .ft__news-inner and friends.                                    */
import './styles/tokens.css'
import './styles/base.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
