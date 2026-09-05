// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'  // ← IMPORTAR
import './styles/main.css';
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>  {/* ← BrowserRouter AQUÍ */}
      <App />
    </BrowserRouter>
  </StrictMode>,
)