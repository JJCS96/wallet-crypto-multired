// Link permite navegar entre rutas sin recargar toda la página.
import { Link } from "react-router-dom";

// Reutilizamos la marca visual para mantener consistencia entre pantallas.
import BrandMark from "../components/BrandMark";

/*
  Pantalla inicial de la wallet.
  Sirve como presentación antes de ir a Login o Registro.
  Cuando Firebase todavía está revisando la sesión, mostramos un loader.
*/
function Splash({ isCheckingSession = false }) {
  return (
    <main className="auth-page">
      <section className="auth-card splash-card">
        {/* Elementos decorativos para acercarnos a la referencia visual. */}
        <div className="splash-glow splash-glow--top" aria-hidden="true" />
        <div className="splash-glow splash-glow--bottom" aria-hidden="true" />

        <BrandMark centered />

        <h1 className="auth-title">Tu wallet, tu control</h1>

        <p className="auth-subtitle">
          Guarda, envía y recibe cripto de forma segura.
        </p>

        {isCheckingSession ? (
          <div className="splash-status">
            <p className="auth-status-copy">Validando tu sesión...</p>
            <div className="loader" aria-hidden="true" />
          </div>
        ) : (
          <div className="auth-actions">
            {/* Usamos Link estilizado como botón para no mezclar button dentro de link. */}
            <Link className="auth-button auth-button-link" to="/login">
              Iniciar sesión
            </Link>

            <Link className="auth-button-secondary auth-button-link" to="/register">
              Crear cuenta
            </Link>
          </div>
        )}

        <div className="splash-landscape" aria-hidden="true">
          <span className="splash-orb" />
          <span className="splash-cloud splash-cloud--left" />
          <span className="splash-cloud splash-cloud--right" />
          <span className="splash-mountain splash-mountain--back" />
          <span className="splash-mountain splash-mountain--front" />
        </div>
      </section>
    </main>
  );
}

export default Splash;
