import '@/styles/globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setBackendReady } from '@/shared/api/backend-ready'

async function bootstrap() {
  // The simulated backend starts in parallel with the first render: requests and the
  // socket wait for it (backendReady), so static content paints without waiting for MSW.
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { takeMockBootParams } = await import('@/mocks/boot-params')
    const params = takeMockBootParams()
    setBackendReady(import('@/mocks/browser').then(({ startMocks }) => startMocks(params)))
  }

  const [{ App }, { installAuthBridge }] = await Promise.all([import('@/app/app'), import('@/app/auth-bridge')])

  // Before the first render: route loaders may request private data immediately.
  installAuthBridge()

  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Root element #root not found')

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
