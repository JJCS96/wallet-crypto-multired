function formatValue(value) {
  return Number(value).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function getAppFeeModeLabel(mode) {
  if (mode === "documented") {
    return "Documental, no cobrada on-chain";
  }

  if (mode === "pending") {
    return "Pendiente, no cobrada on-chain";
  }

  return "On-chain";
}

function TransactionSummaryCard({
  summary,
  loading,
  onConfirm,
  onReset,
  confirmLabel = "Confirmar transacción simulada",
  showConfirmButton = true,
  children,
}) {
  const rows = [
    ["Red", summary.networkLabel],
    ...(summary.assetType === "token" ? [["Activo", `${summary.tokenSymbol} (${summary.tokenStandard})`]] : []),
    ["Dirección origen", summary.fromAddress],
    ["Dirección destino", summary.toAddress],
    ["Monto", `${formatValue(summary.amount)} ${summary.symbol}`],
    ["Comisión de red", `${formatValue(summary.networkFee)} ${summary.networkFeeSymbol || summary.symbol}`],
    ["Comisión NovaWallet", `${formatValue(summary.appFee)} ${summary.symbol} (${summary.appFeeRate * 100}%)`],
    ...(summary.appFeeMode ? [["Modo comisión NovaWallet", getAppFeeModeLabel(summary.appFeeMode)]] : []),
    ...(summary.gasLimit ? [["Gas estimado", summary.gasLimit]] : []),
    ...(summary.gasPrice ? [["Gas price", summary.gasPrice]] : []),
    ...(summary.feeRate ? [["Fee rate Bitcoin", `${summary.feeRate} sat/vB`]] : []),
    ...(summary.selectedInputCount ? [["UTXOs seleccionados", summary.selectedInputCount]] : []),
    ["Total a debitar", `${formatValue(summary.totalDebit)} ${summary.symbol}`],
    ["Wallet administrativa", summary.adminWallet],
  ];
  const isRealSolanaFlow = summary.network === "solana";
  const isRealBnbFlow = summary.network === "bnb";
  const isRealBitcoinFlow = summary.network === "bitcoin";

  return (
    <section className="placeholder-page">
      <article className="placeholder-card placeholder-card--accent transaction-summary-hero">
        <p className="placeholder-kicker">Resumen previo</p>
        <h2 className="placeholder-title">Confirma antes de registrar la transacción</h2>
        <p className="placeholder-copy">
          {isRealSolanaFlow
            ? summary.assetType === "token"
              ? "Esta operación enviará un token SPL demo en Solana Devnet. La Comisión NovaWallet queda documentada y no se cobra on-chain para tokens. La frase semilla y las claves privadas no se guardan ni se muestran durante el proceso."
              : "Esta operación enviará SOL real en Solana Devnet. La Comisión NovaWallet también se enviará on-chain a la wallet administrativa. La frase semilla y las claves privadas no se guardan ni se muestran durante el proceso."
            : isRealBnbFlow
              ? summary.assetType === "token"
                ? "Esta operación enviará un token BEP20 demo en BNB Smart Chain Testnet. La Comisión NovaWallet queda documentada y no se cobra on-chain para tokens. La frase semilla y las claves privadas no se guardan ni se muestran durante el proceso."
                : "Esta operación enviará tBNB real en BNB Smart Chain Testnet. La Comisión NovaWallet queda documentada y no se cobra on-chain en este sprint. La frase semilla y las claves privadas no se guardan ni se muestran durante el proceso."
              : isRealBitcoinFlow
                ? "Esta operación enviará BTC real en Bitcoin Testnet usando UTXOs y firma local P2WPKH. La Comisión NovaWallet queda pendiente y no se cobra on-chain en Bitcoin. La frase semilla y las claves privadas no se guardan ni se muestran durante el proceso."
            : "Esta operación se registrará como transacción simulada para fines académicos. La frase semilla y las claves privadas no se guardan ni se muestran durante el proceso. La Comisión NovaWallet ya queda preparada como parte del modelo económico."}
        </p>
      </article>

      <article className="placeholder-card transaction-summary-card nova-card--interactive">
        <div className="transaction-summary-list">
          {rows.map(([label, value]) => (
            <div className="transaction-summary-row" key={label}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
        </div>

        <div className="placeholder-actions" style={{ marginTop: "22px" }}>
          {showConfirmButton ? (
            <button className="auth-button" type="button" disabled={loading} onClick={onConfirm}>
              {loading ? "Procesando..." : confirmLabel}
            </button>
          ) : null}
          <button className="auth-button-secondary" type="button" disabled={loading} onClick={onReset}>
            Editar datos
          </button>
        </div>

        {children}
      </article>
    </section>
  );
}

export default TransactionSummaryCard;
