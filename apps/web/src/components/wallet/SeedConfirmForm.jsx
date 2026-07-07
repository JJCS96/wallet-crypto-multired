import { useState } from "react";

function SeedConfirmForm({ positions, loading, errorMessage, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await onSubmit(answers);

    if (!result.ok) {
      setFieldErrors(result.formErrors || {});
      return;
    }

    setFieldErrors({});
  }

  return (
    <article className="placeholder-card wallet-auth-card wallet-onboarding-card confirm-seed-card">
      <p className="placeholder-kicker">Confirmación</p>
      <h2 className="placeholder-title">Confirmar frase de recuperación</h2>
      <p className="placeholder-copy">
        Selecciona las palabras solicitadas para confirmar que guardaste tu frase.
      </p>

      {errorMessage ? (
        <div className="auth-error" style={{ marginTop: "18px" }}>
          {errorMessage}
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit} style={{ marginTop: "22px" }}>
        {positions.map((position) => (
          <div className="form-group" key={position}>
            <label htmlFor={`seed-word-${position}`}>Palabra #{position + 1}</label>

            <div className="input-shell">
              <span className="input-icon" aria-hidden="true">
                {position + 1}
              </span>

              <input
                id={`seed-word-${position}`}
                type="text"
                placeholder={`Escribe la palabra #${position + 1}`}
                value={answers[position] || ""}
                onChange={(event) =>
                  setAnswers((currentValue) => ({
                    ...currentValue,
                    [position]: event.target.value,
                  }))
                }
                autoComplete="off"
              />
            </div>

            {fieldErrors[position] ? (
              <span style={{ color: "#b3263a", fontSize: "0.85rem", fontWeight: 700 }}>
                {fieldErrors[position]}
              </span>
            ) : null}
          </div>
        ))}

        <button className="auth-button wallet-primary-btn" type="submit" disabled={loading}>
          {loading ? "Validando respaldo..." : "Confirmar y crear billetera"}
        </button>
      </form>
    </article>
  );
}

export default SeedConfirmForm;
