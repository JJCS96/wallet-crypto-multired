import { useState } from "react";
import { Link } from "react-router-dom";

// Importamos la función que envía el correo de recuperación.
import { sendPasswordReset } from "../services/auth.service";
import BrandMark from "../components/BrandMark";

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
    <main className="auth-page">
      <section className="auth-card auth-card--form auth-card--forgot">
        <BrandMark centered compact />

        <h1 className="auth-title">Recuperar contraseña</h1>
        <p className="auth-subtitle">
          Te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reset-email">Email</label>

            <div className="input-shell">
              <span className="input-icon" aria-hidden="true">
                @
              </span>

              <input
                id="reset-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>

        <div className="forgot-illustration" aria-hidden="true">
          <div className="forgot-envelope">
            <span className="forgot-envelope__flap" />
            <span className="forgot-envelope__shield">*</span>
          </div>
        </div>

        <p className="auth-link-text">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </section>
    </main>
  );
}

export default ForgotPassword;
