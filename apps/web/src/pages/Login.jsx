import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Importamos la función que permite iniciar sesión con Firebase.
import { signInWithGoogle } from "../services/auth.service";
import BrandMark from "../components/BrandMark";

// Traducimos errores comunes de Firebase a mensajes más claros para el equipo y el usuario.
function getGoogleAuthErrorMessage(error) {
  if (error?.code === "auth/popup-closed-by-user") {
    return "Cerraste la ventana de Google antes de completar el acceso.";
  }

  if (error?.code === "auth/popup-blocked") {
    return "El navegador bloqueó la ventana de Google. Permite popups para NovaWallet e intenta nuevamente.";
  }

  if (error?.code === "auth/account-exists-with-different-credential") {
    return "Ya existe una cuenta con ese correo usando otro método de acceso.";
  }

  if (error?.code === "auth/network-request-failed") {
    return "No se pudo conectar con Firebase. Revisa tu conexión e intenta nuevamente.";
  }

  return "No se pudo continuar con Google. Intenta nuevamente.";
}

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);

    try {
      await signInWithGoogle();
      navigate("/dashboard");
    } catch (error) {
      setError(getGoogleAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-page--access wallet-auth-page">
      <section className="auth-card auth-card--form auth-card--login wallet-auth-card">
        <div className="wallet-auth-topbar">
          <button className="wallet-back-button" type="button" onClick={() => navigate("/")} aria-label="Volver al inicio">
            ←
          </button>
        </div>

        <div className="wallet-auth-logo wallet-auth-logo--compact">
          <BrandMark centered dark />
        </div>

        <h1 className="auth-title wallet-auth-title">Desbloquear NovaWallet</h1>
        <p className="auth-subtitle wallet-auth-subtitle">
          Google protege el acceso a tu cuenta. Tu frase de recuperación protege tu wallet.
        </p>

        <div className="login-hero-art" aria-hidden="true">
          <span className="login-orbit" />
          <span className="login-wallet-stack login-wallet-stack--back" />
          <span className="login-wallet-stack login-wallet-stack--middle" />
          <span className="login-wallet-stack login-wallet-stack--front">
            <span className="login-fingerprint" />
          </span>
          <span className="login-token login-token--sol">S</span>
          <span className="login-token login-token--btc">B</span>
          <span className="login-token login-token--bnb">N</span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="wallet-google-panel">
          <button className="auth-button wallet-primary-btn wallet-google-btn" type="button" disabled={loading} onClick={handleGoogleSignIn}>
            <span aria-hidden="true">G</span>
            {loading ? "Conectando con Google..." : "Continuar con Google"}
          </button>
          <p className="wallet-auth-note">NovaWallet no guarda tu frase semilla. Para recuperar tu wallet necesitas tus 12 palabras.</p>
        </div>

        <p className="auth-link-text">
          <Link to="/register">Crear una nueva billetera</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
