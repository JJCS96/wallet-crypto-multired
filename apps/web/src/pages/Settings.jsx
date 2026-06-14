import { useEffect, useState } from "react";

import {
  defaultSettings,
  getUserSettings,
  saveUserSettings,
} from "../services/settings.service";

// Opciones simples para poblar selects y mantener el JSX mas legible.
const themeOptions = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

const languageOptions = [
  { value: "es", label: "Espanol" },
  { value: "en", label: "English" },
];

const currencyOptions = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "COP", label: "COP" },
];

function Settings({ user, userSettings, onSettingsSaved }) {
  // Estados del formulario y mensajes de feedback para la pantalla.
  const [settings, setSettings] = useState(userSettings || defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const currentSettings = await getUserSettings(user.uid);

        if (!ignore) {
          setSettings({
            theme: currentSettings.theme,
            language: currentSettings.language,
            currency: currentSettings.currency,
          });
        }
      } catch (loadError) {
        console.error("Error al cargar configuracion:", loadError);

        if (!ignore) {
          setError("No se pudo cargar la configuracion del usuario.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      ignore = true;
    };
  }, [user?.uid]);

  function handleChange(event) {
    const { name, value } = event.target;

    setSuccessMessage("");
    setError("");
    setSettings((currentSettings) => ({
      ...currentSettings,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user?.uid) {
      setError("No se encontro una sesion valida para guardar la configuracion.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const savedSettings = await saveUserSettings(user.uid, settings);

      setSettings({
        theme: savedSettings.theme,
        language: savedSettings.language,
        currency: savedSettings.currency,
      });

      // Notificamos al componente padre para que el resto de pantallas refleje los cambios.
      onSettingsSaved?.({
        theme: savedSettings.theme,
        language: savedSettings.language,
        currency: savedSettings.currency,
      });
      setSuccessMessage("Configuracion guardada correctamente.");
    } catch (saveError) {
      console.error("Error al guardar configuracion:", saveError);
      setError("No se pudo guardar la configuracion. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="protected-screen">
      <section className="feature-grid">
        <article className="dashboard-card feature-panel">
          <h3>Preferencias guardadas en Firestore</h3>

          <div className="context-hint-box">
            <strong>Solo datos no sensibles</strong>
            <p>
              Aqui se guardan preferencias del usuario. No se almacenan seed phrase, private keys ni
              informacion critica de blockchain.
            </p>
          </div>

          {loading ? <p className="dashboard-note">Cargando configuracion...</p> : null}
          {error ? <div className="auth-error settings-feedback">{error}</div> : null}
          {successMessage ? (
            <div className="auth-success settings-feedback">{successMessage}</div>
          ) : null}

          <form className="settings-form" onSubmit={handleSubmit}>
            <label className="settings-field" htmlFor="settings-theme">
              <span>Tema</span>

              <select
                id="settings-theme"
                name="theme"
                value={settings.theme}
                onChange={handleChange}
                disabled={loading || saving}
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field" htmlFor="settings-language">
              <span>Idioma</span>

              <select
                id="settings-language"
                name="language"
                value={settings.language}
                onChange={handleChange}
                disabled={loading || saving}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field" htmlFor="settings-currency">
              <span>Moneda preferida</span>

              <select
                id="settings-currency"
                name="currency"
                value={settings.currency}
                onChange={handleChange}
                disabled={loading || saving}
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button className="auth-button settings-submit" type="submit" disabled={loading || saving}>
              {saving ? "Guardando configuracion..." : "Guardar configuracion"}
            </button>
          </form>

          <p className="field-help-text">
            Los cambios se guardan en `settings/{'{uid}'}` dentro de Firestore.
          </p>
        </article>

        <article className="dashboard-card feature-panel">
          <h3>Datos base disponibles</h3>
          <ul className="feature-list">
            <li>Correo autenticado: {user?.email}</li>
            <li>Nombre visible: {user?.displayName || "Sin nombre configurado"}</li>
            <li>Tema actual: {settings.theme}</li>
            <li>Idioma actual: {settings.language}</li>
            <li>Moneda actual: {settings.currency}</li>
          </ul>
        </article>
      </section>

      <article className="dashboard-card feature-panel">
        <h3>Pendiente para hardening</h3>
        <ul className="feature-list">
          <li>Session metadata por dispositivo.</li>
          <li>Reautenticacion para acciones sensibles.</li>
          <li>App Check o reCAPTCHA.</li>
          <li>Opcional: doble factor.</li>
        </ul>
      </article>
    </section>
  );
}

export default Settings;
