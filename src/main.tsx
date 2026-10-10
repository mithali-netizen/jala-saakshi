import { StrictMode, Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DataProvider } from './context/DataContext.tsx'
import { storyRouteFromHash } from './story/StoryApp.tsx'

// Loaded lazily so the Figma mock-up CSS only applies on #/app and #/authority routes.
const FigmaApp = lazy(() => import('./figma/FigmaApp.tsx'))
const StoryApp = lazy(() => import('./story/StoryApp.tsx'))

type Surface = 'dashboard' | 'story' | 'mockup'

/** The mock-up ships a global stylesheet, so it stays quarantined on its own routes. */
const isMockupRoute = (hash: string) => hash.startsWith('#/app') || hash.startsWith('#/authority')

function surfaceFromHash(hash: string): Surface {
  if (isMockupRoute(hash)) return 'mockup'
  if (hash.startsWith('#/story')) return 'story'
  return 'dashboard'
}

function Root() {
  const [hash, setHash] = useState(() => window.location.hash)
  const surface = surfaceFromHash(hash)

  useEffect(() => {
    const onHash = () => {
      const next = window.location.hash
      // Leaving the mock-up: reload so its global stylesheet is not applied to the rest.
      if (isMockupRoute(hash) && !isMockupRoute(next)) window.location.reload()
      else {
        setHash(next)
        window.scrollTo({ top: 0 })
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [hash])

  return (
    <DataProvider>
      <Suspense fallback={null}>
        {surface === 'mockup' && <FigmaApp />}
        {surface === 'story' && <StoryApp route={storyRouteFromHash(hash)} />}
        {surface === 'dashboard' && <App />}
      </Suspense>
    </DataProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
