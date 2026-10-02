/**
 * Archivo: main.jsx
 * Propósito: Punto de entrada de React/Vite para montar NovaWallet en el DOM.
 * Funcionalidades:
 * - Habilita Buffer para librerías Web3 que lo requieren en navegador.
 * - Carga React, ReactDOM y App de forma diferida antes de renderizar.
 */
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
