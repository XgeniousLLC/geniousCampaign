import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { reportError } from './lib/debugLogApi'

// Catches errors React's own ErrorBoundary can't (outside render — plain
// runtime errors and unhandled promise rejections anywhere in the app).
window.addEventListener('error', (event) => {
  reportError({ message: event.message, stack: event.error?.stack, path: window.location.pathname })
})
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  reportError({
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    path: window.location.pathname,
  })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
