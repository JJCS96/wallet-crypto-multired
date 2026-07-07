import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Importamos la función que envía el correo de recuperación.
import { sendPasswordReset } from "../services/auth.service";
import BrandMark from "../components/BrandMark";
import SecurityNotice from "../components/security/SecurityNotice";

// Unificamos mensajes para que la experiencia sea consistente.
function getResetErrorMessage(error) {
  if (error?.code === "auth/user-not-found") {
    return "No existe una cuenta con ese correo.";
  }

  if (error?.code === "auth/invalid-email") {
    return "Escribe un correo válido.";
  }

  return "No se pudo enviar el correo de recuperación.";
}

function ForgotPassword() {
  const navigate = useNavigate();

  // Estado para capturar el correo.
  const [email, setEmail] = useState("");

  // Estados para mostrar mensajes en pantalla.
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      // Firebase enviará el correo de recuperación al email ingresado.
      await sendPasswordReset(email);

      setMessage("Se envió un enlace de recuperación a tu correo.");
    } catch (error) {
      console.error("Error al recuperar contraseña:", error);
      setError(getResetErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-page--access wallet-auth-page">
      <section className="auth-card auth-card--form auth-card--forgot auth-card--recover wallet-auth-card">
        <div className="wallet-auth-topbar">
          <button className="wallet-back-button" type="button" onClick={() => navigate("/login")} aria-label="Volver al login">
            ←
          </button>
        </div>

        <div className="wallet-auth-logo wallet-auth-logo--compact">
          <BrandMark centered dark />
        </div>

        <h1 className="auth-title wallet-auth-title">Recuperar acceso</h1>
        <p className="auth-subtitle wallet-auth-subtitle">
          Esto solo recupera tu cuenta. Para restaurar tu wallet necesitas tu frase semilla.
        </p>

        <div className="recover-mail-art" aria-hidden="true">
          <span className="recover-envelope" />
          <span className="recover-letter" />
          <span className="recover-lock" />
          <span className="recover-plane" />
        </div>

        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reset-email">Correo electrónico</label>

            <div className="input-shell">
              <span className="input-icon" aria-hidden="true">
                @
              </span>

              <input
                id="reset-email"
                type="email"
                placeholder="Ingresa tu correo electrónico"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <button className="auth-button wallet-primary-btn" type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>
        </form>

        <SecurityNotice type="account-recovery" style={{ marginTop: "22px", marginBottom: 0 }} />

        <p className="auth-link-text">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>

        <div className="auth-bottom-note">
          <span aria-hidden="true">SR</span>
          <div>
            <strong>Recuperación segura</strong>
            <p>Solo tú puedes recuperar tu wallet con tu frase semilla.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
