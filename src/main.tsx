import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { hydrate } from '@tanstack/react-query'
import superjson from 'superjson'
import { TRPCProvider, getBrowserQueryClient } from '@/providers/trpc'
import './index.css'
import App from './App.tsx'
import { captureInstallPrompt, registerServiceWorker } from '@/lib/nativeApp'

const rootEl = document.getElementById('root')!

// Phone-app behaviour: hold the browser's install offer until the dashboard
// shows it, and register the offline/fast-open worker (production site only).
captureInstallPrompt()
if (import.meta.env.PROD) registerServiceWorker()
const queryClient = getBrowserQueryClient()

// Public marketing pages arrive already rendered by the server (api/lib/vite.ts),
// with the API data they were rendered from alongside. Load that data into the
// cache BEFORE the first render, so the browser's first pass produces the same
// markup the server sent — which is what lets React attach to it.
const ssrState = document.getElementById('__dc_rq')?.textContent
if (ssrState) {
  try { hydrate(queryClient, superjson.parse(ssrState)) } catch { /* the page will fetch it instead */ }
}

const app = (
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider queryClient={queryClient}>
        <App />
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>
)

if (rootEl.dataset.ssr === '1') {
  hydrateRoot(rootEl, app, {
    // A mismatch is survivable: React re-renders that part in the browser, which
    // is what every page did before server rendering existed. It's logged so it
    // gets fixed rather than quietly costing the speed gain.
    onRecoverableError(error) {
      console.warn('[ssr] hydration mismatch — re-rendered in the browser:', error)
    },
  })
} else {
  createRoot(rootEl).render(app)
}
