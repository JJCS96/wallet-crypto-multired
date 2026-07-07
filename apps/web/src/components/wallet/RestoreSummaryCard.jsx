import AddressListCard from "./AddressListCard";

function RestoreSummaryCard({ wallet, loading, onConfirm, onReset }) {
  return (
    <section className="placeholder-page">
      <article className="placeholder-card placeholder-card--accent">
        <p className="placeholder-kicker">Resumen de restauración</p>
        <h2 className="placeholder-title">Direcciones derivadas correctamente</h2>
        <p className="placeholder-copy">
          Revisa estas direcciones públicas antes de confirmar. Al continuar, solo esta metadata se
          guardará o actualizará en Firestore.
        </p>

        <div className="placeholder-actions" style={{ marginTop: "18px" }}>
          <button className="auth-button" type="button" disabled={loading} onClick={onConfirm}>
            {loading ? "Guardando Wallet..." : "Confirmar restauración"}
          </button>
          <button className="auth-button-secondary" type="button" disabled={loading} onClick={onReset}>
            Ingresar otra frase semilla
          </button>
        </div>
      </article>

      <AddressListCard wallet={wallet} title="Direcciones públicas restauradas" />
    </section>
  );
}

export default RestoreSummaryCard;
