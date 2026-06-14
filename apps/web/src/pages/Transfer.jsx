import { useState } from "react";

import { formatCurrencyFromUsd, networkOptions } from "../data/dashboard.mock";

function Transfer({ user, userSettings }) {
  const selectedCurrency = userSettings?.currency || "USD";
  // Agrupamos el formulario en un solo estado para que la UI sea facil de seguir.
  const [form, setForm] = useState({
    network: "solana",
    address: "",
    amount: "",
    note: "",
    priority: "normal",
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedNetwork =
    networkOptions.find((network) => network.value === form.network) || networkOptions[0];
  const numericAmount = Number(form.amount || 0);
  const isValidAmount = Number.isFinite(numericAmount) && numericAmount > 0;
  const totalDebit = isValidAmount ? numericAmount + selectedNetwork.fee : selectedNetwork.fee;
  const isSubmitDisabled = !form.address.trim() || !form.amount;
  const estimatedFiat = formatCurrencyFromUsd(
    numericAmount * selectedNetwork.usdPrice,
    selectedCurrency
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setError("");
    setSuccessMessage("");
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    // Hacemos validaciones simples de interfaz mientras no existe blockchain real.
    if (form.address.trim().length < 12) {
      setError("Escribe una direccion valida para continuar.");
      return;
    }

    if (!isValidAmount) {
      setError("Ingresa un monto mayor que cero.");
      return;
    }

    if (numericAmount > selectedNetwork.balance) {
      setError("El monto supera el balance disponible en esta simulacion.");
      return;
    }

    setSuccessMessage(
      `Transferencia simulada lista: ${numericAmount} ${selectedNetwork.symbol} desde ${selectedNetwork.label} para ${user?.email}.`
    );
  }

  return (
    <section className="protected-screen">
      <section className="transfer-layout">
        <article className="dashboard-card feature-panel transfer-form-card">
          <div className="transfer-card-header">
            <div>
              <h3>Enviar activos</h3>
              <p className="dashboard-note">
                Paso a paso: eliges red, escribes la direccion, defines el monto y revisas el
                resumen antes de confirmar.
              </p>
            </div>

            <span className="card-pill">Simulacion</span>
          </div>

          {error ? <div className="auth-error settings-feedback">{error}</div> : null}
          {successMessage ? (
            <div className="auth-success settings-feedback">{successMessage}</div>
          ) : null}

          <div className="context-hint-box">
            <strong>Importante</strong>
            <p>
              Este formulario es de practica. Sirve para validar el flujo visual antes de firmar y
              enviar transacciones reales en blockchain.
            </p>
          </div>

          <form className="transfer-form" onSubmit={handleSubmit}>
            <label className="settings-field" htmlFor="transfer-network">
              <span>Red</span>

              <select
                id="transfer-network"
                name="network"
                value={form.network}
                onChange={handleChange}
              >
                {networkOptions.map((network) => (
                  <option key={network.value} value={network.value}>
                    {network.label}
                  </option>
                ))}
              </select>

              <small className="field-help-text">
                Balance demo disponible: {selectedNetwork.balance} {selectedNetwork.symbol}
              </small>
            </label>

            <label className="settings-field" htmlFor="transfer-address">
              <span>Direccion destino</span>

              <input
                id="transfer-address"
                className="transfer-input"
                name="address"
                type="text"
                placeholder={selectedNetwork.addressHint}
                value={form.address}
                onChange={handleChange}
              />

              <small className="field-help-text">
                Usa una direccion larga para simular una validacion minima del destino.
              </small>
            </label>

            <div className="transfer-form-row">
              <label className="settings-field" htmlFor="transfer-amount">
                <span>Monto</span>

                <input
                  id="transfer-amount"
                  className="transfer-input"
                  name="amount"
                  min="0"
                  step="0.0001"
                  type="number"
                  placeholder={`0.00 ${selectedNetwork.symbol}`}
                  value={form.amount}
                  onChange={handleChange}
                />

                <small className="field-help-text">
                  El monto se compara contra el balance demo de la red elegida. Equivalente estimado: {estimatedFiat}.
                </small>
              </label>

              <label className="settings-field" htmlFor="transfer-priority">
                <span>Prioridad</span>

                <select
                  id="transfer-priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                >
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </label>
            </div>

            <label className="settings-field" htmlFor="transfer-note">
              <span>Nota opcional</span>

              <textarea
                id="transfer-note"
                className="transfer-textarea"
                name="note"
                placeholder="Ej: pago de prueba al equipo"
                rows="4"
                value={form.note}
                onChange={handleChange}
              />
            </label>

            <button className="auth-button settings-submit" type="submit" disabled={isSubmitDisabled}>
              Revisar transferencia
            </button>
          </form>
        </article>

        <article className="dashboard-card feature-panel transfer-summary-card">
          <h3>Resumen previo</h3>

          <div className="summary-list">
            <div className="summary-item">
              <span>Red seleccionada</span>
              <strong>{selectedNetwork.label}</strong>
            </div>

            <div className="summary-item">
              <span>Activo</span>
              <strong>{selectedNetwork.symbol}</strong>
            </div>

            <div className="summary-item">
              <span>Balance disponible</span>
              <strong>
                {selectedNetwork.balance} {selectedNetwork.symbol}
              </strong>
            </div>

            <div className="summary-item">
              <span>Fee estimado</span>
              <strong>
                {selectedNetwork.fee} {selectedNetwork.symbol}
              </strong>
            </div>

            <div className="summary-item summary-item--accent">
              <span>Total estimado</span>
              <strong>
                {totalDebit.toFixed(4)} {selectedNetwork.symbol}
              </strong>
            </div>
          </div>

          <div className="transfer-preview-box">
            <p className="dashboard-note">
              Destino: {form.address.trim() || "Aun no se ha escrito una direccion."}
            </p>
            <p className="dashboard-note">
              Nota: {form.note.trim() || "Sin nota adicional para esta simulacion."}
            </p>
          </div>
        </article>

        <div className="feature-grid feature-grid--three transfer-secondary-grid">
          <article className="dashboard-card feature-panel">
            <h3>Recibir</h3>
            <p>
              Espacio reservado para direccion wallet, QR y copiado rapido segun la red elegida.
            </p>
            <div className="receive-box">
              <strong>{selectedNetwork.label}</strong>
              <span>{selectedNetwork.addressHint}</span>
            </div>
          </article>

          <article className="dashboard-card feature-panel">
            <h3>Confirmacion previa</h3>
            <p>
              Antes de enviar en una fase real, aqui deberian mostrarse direccion resumida, monto,
              fee, red y reautenticacion si aplica.
            </p>
          </article>

          <article className="dashboard-card feature-panel">
            <h3>Seguridad</h3>
            <p>
              Mas adelante esta accion debera incluir validaciones, reautenticacion y confirmaciones
              sensibles.
            </p>

            <ul className="feature-list compact-list">
              <li>Confirmacion visual previa.</li>
              <li>Revision de fee estimado.</li>
              <li>Reautenticacion para acciones sensibles.</li>
            </ul>
          </article>
        </div>
      </section>
    </section>
  );
}

export default Transfer;
