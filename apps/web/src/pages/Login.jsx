import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Importamos la función que permite iniciar sesión con Firebase.
import { loginWithEmail } from "../services/auth.service";
import BrandMark from "../components/BrandMark";

// Traducimos errores comunes de Firebase a mensajes más claros para el equipo y el usuario.
function getLoginErrorMessage(error) {
  if (error?.code === "auth/invalid-credential") {
    return "Correo o contraseña incorrectos.";
  }

  if (error?.code === "auth/too-many-requests") {
    return "Demasiados intentos. Espera un momento e intenta otra vez.";
  }

  return "No se pudo iniciar sesión. Intenta nuevamente.";
}

function Login() {
  // Estados para capturar lo que escribe el usuario.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Estados para controlar errores y carga.
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Permite redirigir al usuario a otra ruta.
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Validamos el correo y contraseña usando Firebase Authentication.
      await loginWithEmail(email, password);

      // Si el login funciona, enviamos al dashboard protegido.
      navigate("/dashboard");
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setError(getLoginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card--form">
        <BrandMark centered compact />

        <h1 className="auth-title">Bienvenido de nuevo</h1>
        <p className="auth-subtitle">Inicia sesión para continuar</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>

            <div className="input-shell">
              <span className="input-icon" aria-hidden="true">
                @
              </span>

              <input
                id="login-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="login-password">Contraseña</label>
              <Link className="inline-link" to="/forgot-password">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="input-shell">
              <span className="input-icon" aria-hidden="true">
                *
              </span>

              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                className="input-toggle"
                type="button"
                onClick={() => setShowPassword((currentValue) => !currentValue)}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="auth-divider">o continuar con</div>

        {/* El botón de Google queda como maqueta visual para una fase futura. */}
        <button className="google-button" type="button" disabled>
          Continuar con Google
        </button>

        <p className="auth-link-text">
          ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
