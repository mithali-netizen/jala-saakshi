import { StrictMode, Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DataProvider } from './context/DataContext.tsx'
import { storyRouteFromHash } from './story/StoryApp.tsx'

// Loaded lazily so the Figma mock-up CSS only applies on #/app and #/authority routes.
const FigmaApp = lazy(() => import('./figma/FigmaApp.tsx'))
const StoryApp = lazy(() => import('./story/StoryApp.tsx'))
const NearMeStory = lazy(() => import('./nearme/NearMeStory.tsx'))
const Landing = lazy(() => import('./landing/Landing.tsx'))

type Surface = 'landing' | 'dashboard' | 'story' | 'mockup' | 'nearme'

/** The mock-up ships a global stylesheet, so it stays quarantined on its own routes. */
const isMockupRoute = (hash: string) => hash.startsWith('#/app') || hash.startsWith('#/authority')

function surfaceFromHash(hash: string): Surface {
  if (isMockupRoute(hash)) return 'mockup'
  if (hash.startsWith('#/dashboard')) return 'dashboard'
  // The guided tour of the lakes near you. `#/story` is the landing page and
  // `#/story/*` the long-form pages, so this gets a route of its own.
  if (hash.startsWith('#/near-me')) return 'nearme'
  // The gap page was promoted to the landing page: `#/story` alone is the landing too.
  if (hash.startsWith('#/story/')) return 'story'
  return 'landing'
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
        {surface === 'landing' && <Landing />}
        {surface === 'nearme' && <NearMeStory />}
      </Suspense>
    </DataProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
