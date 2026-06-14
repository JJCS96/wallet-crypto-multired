import { useState } from "react";

import {
  getFormattedHistory,
  getHistoryStatusSummary,
  historyFilters,
} from "../data/dashboard.mock";

function History({ userSettings }) {
  const selectedCurrency = userSettings?.currency || "USD";
  // Solo guardamos el filtro activo; la lista visible se deriva de ahi.
  const [activeFilter, setActiveFilter] = useState("Todos");

  const formattedHistory = getFormattedHistory(selectedCurrency);

  const filteredHistory = formattedHistory.filter((item) => {
    if (activeFilter === "Todos") {
      return true;
    }

    return item.type === activeFilter;
  });

  const historyStatusSummary = getHistoryStatusSummary();
  const hasVisibleHistory = filteredHistory.length > 0;

  return (
    <section className="protected-screen">
      <section className="history-summary-grid">
        <article className="dashboard-card feature-panel history-summary-card">
          <span className="history-summary-label">Confirmadas</span>
          <strong className="history-summary-value">{historyStatusSummary.confirmed}</strong>
          <p className="dashboard-note">Movimientos ya procesados correctamente.</p>
        </article>

        <article className="dashboard-card feature-panel history-summary-card">
          <span className="history-summary-label">Pendientes</span>
          <strong className="history-summary-value">{historyStatusSummary.pending}</strong>
          <p className="dashboard-note">Operaciones que siguen esperando confirmacion.</p>
        </article>

        <article className="dashboard-card feature-panel history-summary-card">
          <span className="history-summary-label">Fallidas</span>
          <strong className="history-summary-value">{historyStatusSummary.failed}</strong>
          <p className="dashboard-note">Ejemplos utiles para mostrar estados negativos.</p>
        </article>
      </section>

      <article className="dashboard-card feature-panel">
        <div className="history-toolbar">
          <div>
            <h3>Vista previa del modulo</h3>
            <p className="dashboard-note">
              Aqui puedes aprender como la lista visible cambia usando solo un filtro activo.
            </p>
            <p className="field-help-text">Mostrando {filteredHistory.length} movimiento(s) para el filtro actual.</p>
          </div>

          <div className="history-filter-group" role="tablist" aria-label="Filtros del historial">
            {historyFilters.map((filter) => (
              <button
                key={filter}
                className={`history-filter-button ${activeFilter === filter ? "active" : ""}`}
                type="button"
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {hasVisibleHistory ? (
          <div className="history-preview history-preview--rich">
            {filteredHistory.map((item) => (
              <div key={item.id} className="history-item history-item--rich">
                <div className="history-main-copy">
                  <div className="history-item-title-row">
                    <strong>
                      {item.type} {item.asset}
                    </strong>
                    <span className="history-network-chip">{item.network}</span>
                  </div>

                  <p>{item.detail}</p>

                  <div className="history-meta-row">
                    <span>{item.date}</span>
                    <span>Hash: {item.hash}</span>
                  </div>
                </div>

                <div className="history-side-copy">
                <strong>
                  {item.amount} {item.asset}
                </strong>
                <span>{item.formattedAmountUsd}</span>
                <span
                    className={`history-status ${
                      item.status === "Pendiente"
                        ? "history-status--pending"
                        : item.status === "Fallida"
                          ? "history-status--failed"
                          : ""
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <strong>Sin movimientos para este filtro</strong>
            <p>Cambia el filtro o vuelve a "Todos" para revisar el resto de ejemplos.</p>
          </div>
        )}
      </article>
    </section>
  );
}

export default History;
