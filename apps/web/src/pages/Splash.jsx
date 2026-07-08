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
    <main className="auth-page wallet-auth-page">
      <section className="auth-card splash-card wallet-auth-card wallet-auth-card--splash">
        <div className="wallet-auth-orb wallet-auth-orb--top" aria-hidden="true" />

        <div className="wallet-auth-logo">
          <BrandMark centered dark />
        </div>

        <h1 className="auth-title wallet-auth-title">NovaWallet</h1>

        <p className="auth-subtitle wallet-auth-subtitle">
          Gestiona tus activos digitales en redes de prueba de forma segura.
        </p>

        {isCheckingSession ? (
          <div className="splash-status">
            <p className="auth-status-copy">Validando tu sesión...</p>
            <div className="loader" aria-hidden="true" />
          </div>
        ) : (
          <div className="auth-actions wallet-auth-actions">
            {/* Usamos Link estilizado como botón para no mezclar button dentro de link. */}
            <Link className="auth-button auth-button-link wallet-primary-btn" to="/register">
              Crear una nueva billetera
            </Link>

            <Link className="auth-button-secondary auth-button-link wallet-secondary-btn" to="/login">
              Ya tengo una billetera
            </Link>
            <p className="wallet-auth-note">Tu frase de recuperación nunca se guarda en Firebase.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default Splash;
