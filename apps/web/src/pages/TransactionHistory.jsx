import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { APP_ROUTES } from "../constants/routes";
import { getUserWallet } from "../services/user-wallets.service";
import { getTransactions } from "../services/transactions/transactions.service";
import { syncWalletActivity } from "../services/transactions/activity-sync.service";

function formatDate(value) {
  if (!value) {
    return "Pendiente";
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  return new Date(value).toLocaleString();
}

function formatNumber(value) {
  return Number(value).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function getTransactionType(transaction) {
  if (transaction.mode === "real-testnet") {
    return "Real Testnet";
  }

  if (transaction.mode === "real-devnet" || transaction.mode === "blockchain-real" || transaction.txHash) {
    return "Real Devnet";
  }

  return "Demo / Simulado";
}

function getTransactionSymbol(transaction) {
  if (transaction.assetType === "token" && transaction.tokenSymbol) {
    return transaction.tokenSymbol;
  }

  if (transaction.network === "solana") {
    return "SOL";
  }

  if (transaction.network === "bitcoin") {
    return "BTC";
  }

  return "tBNB";
}

function getDirectionLabel(direction) {
  if (direction === "incoming") {
    return "Recibido";
  }

  if (direction === "outgoing") {
    return "Enviado";
  }

  return "Movimiento";
}

function formatShortHash(value) {
  if (!value) {
    return "No disponible";
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function getAppFeeModeLabel(mode) {
  if (mode === "on-chain") {
    return "On-chain";
  }

  if (mode === "documented") {
    return "Documental, no cobrada on-chain";
  }

  if (mode === "pending") {
    return "Pendiente, no cobrada on-chain";
  }

  return "Documental";
}

function TransactionHistory({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncNotice, setSyncNotice] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      setLoading(true);
      setSyncError("");
      setSyncNotice("");

      try {
        const [wallet, result] = await Promise.all([
          getUserWallet(user.uid),
          getTransactions(user.uid),
        ]);

        if (isMounted) {
          setTransactions(result);
        }

        if (wallet) {
          setSyncing(true);
          const syncResult = await syncWalletActivity(user.uid, wallet);
          const updatedTransactions = await getTransactions(user.uid);

          if (isMounted) {
            setTransactions(updatedTransactions);
            setSyncError(syncResult.hasOnlyFailures ? syncResult.message : "");
            setSyncNotice(syncResult.hasOnlyFailures ? "" : syncResult.message);
          }
        }
      } catch {
        if (isMounted) {
          setSyncError("No se pudo actualizar actividad en este momento.");
          setSyncNotice("");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setSyncing(false);
        }
      }
    }

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [refreshTick, user.uid]);

  function handleRefreshActivity() {
    setRefreshTick((currentTick) => currentTick + 1);
  }

  return (
    <AppShell
      user={user}
      title="Historial"
      kicker="Actividad"
      description="Actividad reciente de tu Wallet con transacciones reales en redes testnet y transacciones simuladas."
    >
      <section className="placeholder-page">
        <article className="placeholder-card placeholder-card--accent">
          <p className="placeholder-kicker">Seguimiento</p>
          <h2 className="placeholder-title">Actividad registrada</h2>
             <p className="placeholder-copy">
               Aquí se listan transacciones reales en Solana Devnet, BNB Smart Chain Testnet y Bitcoin Testnet,
                además de transacciones simuladas donde aplique. Nunca se muestran frases semilla
               ni claves privadas.
            </p>
            <span className="placeholder-badge" style={{ marginTop: "18px" }}>
              Rentabilidad preparada con comisión NovaWallet del 1%
            </span>
            <div className="placeholder-actions" style={{ marginTop: "18px" }}>
              <button className="auth-button-secondary" type="button" onClick={handleRefreshActivity} disabled={loading || syncing}>
                {syncing ? "Actualizando actividad..." : "Actualizar actividad"}
              </button>
            </div>
            {syncNotice && !syncing ? <p className="dashboard-note" style={{ marginTop: "12px" }}>{syncNotice}</p> : null}
            {syncError ? <p className="negative" style={{ marginTop: "12px" }}>{syncError}</p> : null}
          </article>

        {loading ? (
          <article className="placeholder-card placeholder-card--loading">
            <p className="placeholder-copy">Cargando tu historial...</p>
          </article>
        ) : transactions.length === 0 ? (
          <article className="placeholder-card">
            <WalletEmptyState
              title="Aún no tienes movimientos registrados"
              description="Cuando envíes fondos o sincronices actividad recibida desde blockchain, tus movimientos aparecerán aquí."
              badge="Historial vacío"
              steps={[
                "Usa Enviar para registrar operaciones salientes.",
                "Usa Actualizar actividad para consultar movimientos recibidos.",
                "La actividad sincronizada se guarda como datos públicos en Firestore.",
              ]}
              primaryAction={{ to: APP_ROUTES.sendTransaction, label: "Ir a enviar" }}
              secondaryAction={{ to: APP_ROUTES.dashboard, label: "Volver al dashboard" }}
            />
          </article>
        ) : (
          <div className="history-list">
            {transactions.map((transaction) => (
              <article className="placeholder-card history-card" key={transaction.id}>
                <div className="history-card__header">
                  <div>
                    <p className="placeholder-kicker">{transaction.network}</p>
                    <h2 className="history-card__title">{getDirectionLabel(transaction.direction)} {formatNumber(transaction.amount)} {getTransactionSymbol(transaction)}</h2>
                    {transaction.assetType === "token" ? (
                      <p className="dashboard-note">{transaction.tokenStandard} demo</p>
                    ) : null}
                  </div>
                  <span className="placeholder-badge">{getTransactionType(transaction)}</span>
                </div>

                <div className="history-card__grid">
                  <div>
                    <strong>Dirección</strong>
                    <span>{getDirectionLabel(transaction.direction)}</span>
                  </div>
                  <div>
                    <strong>Fuente</strong>
                    <span>{transaction.source === "blockchain-sync" ? "Blockchain sync" : "NovaWallet"}</span>
                  </div>
                  <div>
                    <strong>Origen</strong>
                    <span>{transaction.fromAddress}</span>
                  </div>
                  <div>
                    <strong>Destino</strong>
                    <span>{transaction.toAddress}</span>
                  </div>
                  <div>
                    <strong>Estado</strong>
                    <span>{transaction.status}</span>
                  </div>
                  <div>
                    <strong>Fecha</strong>
                    <span>{formatDate(transaction.createdAt)}</span>
                  </div>
                  <div>
                    <strong>Comisión red</strong>
                    <span>{formatNumber(transaction.networkFee)}</span>
                  </div>
                  {transaction.tokenMint ? (
                    <div>
                      <strong>Mint token</strong>
                      <span>{transaction.tokenMint}</span>
                    </div>
                  ) : null}
                  {transaction.tokenAddress ? (
                    <div>
                      <strong>Contrato/Cuenta token</strong>
                      <span>{transaction.tokenAddress}</span>
                    </div>
                  ) : null}
                  <div>
                    <strong>Comisión app</strong>
                    <span>{formatNumber(transaction.appFee)} ({transaction.appFeeRate ? `${transaction.appFeeRate * 100}%` : "1%"})</span>
                  </div>
                  <div>
                    <strong>Modo comisión app</strong>
                    <span>{getAppFeeModeLabel(transaction.appFeeMode)}</span>
                  </div>
                  <div>
                    <strong>Total debitado</strong>
                    <span>{formatNumber(transaction.totalDebit)}</span>
                  </div>
                  <div>
                    <strong>Confirmación</strong>
                    <span>{transaction.confirmationStatus || "No disponible"}</span>
                  </div>
                  {transaction.chainId ? (
                    <div>
                      <strong>Chain ID</strong>
                      <span>{transaction.chainId}</span>
                    </div>
                  ) : null}
                  {transaction.gasUsed ? (
                    <div>
                      <strong>Gas usado</strong>
                      <span>{transaction.gasUsed}</span>
                    </div>
                  ) : null}
                  {transaction.gasPrice ? (
                    <div>
                      <strong>Gas price</strong>
                      <span>{transaction.gasPrice}</span>
                    </div>
                  ) : null}
                  {transaction.feeRate ? (
                    <div>
                      <strong>Fee rate</strong>
                      <span>{transaction.feeRate} sat/vB</span>
                    </div>
                  ) : null}
                  <div>
                    <strong>Wallet administrativa</strong>
                    <span>{transaction.adminWallet}</span>
                  </div>
                  <div>
                    <strong>Hash</strong>
                    <span>{formatShortHash(transaction.txHash)}</span>
                  </div>
                  {transaction.explorerUrl ? (
                    <div>
                      <strong>Explorer</strong>
                      <a href={transaction.explorerUrl} target="_blank" rel="noreferrer">
                        Ver transacción
                      </a>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}

            <p className="dashboard-note">
              Las transacciones reales muestran hash, confirmación y enlace al explorer cuando la red
              lo entrega. Las operaciones simuladas se mantienen sin hash on-chain.
            </p>
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default TransactionHistory;
