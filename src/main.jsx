import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, RouterContextProvider } from 'react-router-dom'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router basename="/ultimate-tic-tac-toe">
      <App />
    </Router>
  </StrictMode>,
)
