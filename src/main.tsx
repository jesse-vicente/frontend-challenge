import '@/styles/globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
import { installAuthBridge } from '@/app/auth-bridge'

async function bootstrap() {
  // The simulated backend must be ready before the first request or socket.
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { startMocks } = await import('@/mocks/browser')
    await startMocks()
  }

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
