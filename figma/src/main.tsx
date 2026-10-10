import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import JalaApp from './jala/JalaApp'
import './index.css'

// Jala Saakshi is the shipping UI. The original Figma prototype stays reachable at #/prototype.
const Root = window.location.hash.startsWith('#/prototype') ? App : JalaApp

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
