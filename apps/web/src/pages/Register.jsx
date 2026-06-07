import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Importamos la función que registra usuarios en Firebase.
import { registerWithEmail } from "../services/auth.service";
import BrandMark from "../components/BrandMark";

// Centralizamos los mensajes de error para que el flujo sea más fácil de mantener.
function getRegisterErrorMessage(error) {
  if (error?.code === "auth/email-already-in-use") {
    return "Ese correo ya está registrado.";
  }

  if (error?.code === "auth/invalid-email") {
    return "Escribe un correo válido.";
  }

  if (error?.code === "auth/weak-password") {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  return "No se pudo crear la cuenta. Revisa los datos e intenta otra vez.";
}

function Register() {
  // Estados para capturar datos del formulario.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Confirmación para validar que el usuario escribió bien su contraseña.
  const [confirmPassword, setConfirmPassword] = useState("");

  // Estados para mostrar errores y carga.
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!fullName.trim()) {
      setError("Escribe tu nombre para continuar.");
      return;
    }

    // Validación simple para evitar contraseñas diferentes.
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    // Firebase pide mínimo 6 caracteres en la contraseña.
    if (password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    // Dejamos el check obligatorio porque en la maqueta representa el consentimiento base.
    if (!acceptTerms) {
      setError("Debes aceptar los términos para crear la cuenta.");
      return;
    }

    setLoading(true);

    try {
      // Crea usuario en Firebase Authentication y guarda datos básicos en Firestore.
      await registerWithEmail(email, password, fullName);

      // Si el registro funciona, enviamos al dashboard.
      navigate("/dashboard");
    } catch (error) {
      console.error("Error al registrar:", error);
      setError(getRegisterErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card--form">
        <BrandMark compact />

        <div className="auth-headline auth-headline--left">
          <h1 className="auth-title auth-title--left">Crear cuenta</h1>
          <p className="auth-subtitle auth-subtitle--left">
            Completa tus datos para comenzar
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="register-name">Nombre</label>

            <div className="input-shell">
              <span className="input-icon" aria-hidden="true">
                U
              </span>

              <input
                id="register-name"
                type="text"
                placeholder="Tu nombre"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Email</label>

            <div className="input-shell">
              <span className="input-icon" aria-hidden="true">
                @
              </span>

              <input
                id="register-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="register-password">Contraseña</label>

            <div className="input-shell">
              <span className="input-icon" aria-hidden="true">
                *
              </span>

              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimo 6 caracteres"
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

          <div className="form-group">
            <label htmlFor="register-confirm-password">Confirmar contraseña</label>

            <div className="input-shell">
              <span className="input-icon" aria-hidden="true">
                *
              </span>

              <input
                id="register-confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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

          <label className="checkbox-row" htmlFor="register-terms">
            <input
              id="register-terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
            />

            <span>
              Acepto los <span className="inline-link-text">Términos y Condiciones</span> y la{" "}
              <span className="inline-link-text">Política de Privacidad</span>
            </span>
          </label>

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="auth-link-text">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
