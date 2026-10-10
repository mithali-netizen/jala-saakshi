import { StrictMode, Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Loaded lazily so the Figma mock-up CSS only applies on #/app and #/authority routes.
const FigmaApp = lazy(() => import('./figma/FigmaApp.tsx'))

const isMockupRoute = (hash: string) => hash.startsWith('#/app') || hash.startsWith('#/authority')

function Root() {
  const [mockup, setMockup] = useState(() => isMockupRoute(window.location.hash))

  useEffect(() => {
    const onHash = () => {
      const next = isMockupRoute(window.location.hash)
      // Leaving the mock-up: reload so its global stylesheet is not applied to the map site.
      if (mockup && !next) window.location.reload()
      else setMockup(next)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [mockup])

  if (!mockup) return <App />
  return (
    <Suspense fallback={null}>
      <FigmaApp />
    </Suspense>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
