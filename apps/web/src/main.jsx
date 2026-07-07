import { Buffer } from 'buffer'
import './index.css'

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer
}

async function bootstrap() {
  const [{ StrictMode }, { createRoot }, { default: App }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./App.jsx'),
  ])

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
