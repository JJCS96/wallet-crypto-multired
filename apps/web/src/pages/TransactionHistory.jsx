/**
 * Archivo: TransactionHistory.jsx
 * Propósito: Pantalla de historial con movimientos guardados y actividad on-chain multired.
 * Funcionalidades:
 * - Combina transacciones registradas en Firestore con actividad pública de exploradores/RPC.
 * - Mantiene estados de carga, actualización y sincronización parcial.
 * - Filtra movimientos sin mostrar errores técnicos crudos al usuario.
 */
import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import { getUserWallet } from "../services/user-wallets.service";
import { getTransactions, mergeTransactions } from "../services/transactions/transactions.service";
import {
  getBitcoinTestnetOnChainActivity,
  getBnbNativeOnChainActivity,
  getSolanaNativeOnChainActivity,
  syncWalletActivity,
} from "../services/transactions/activity-sync.service";

function formatDate(value) {
  if (!value) {
    return "Pendiente";
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  return new Date(value).toLocaleString();
}

function getTransactionDate(transaction) {
  if (transaction.createdAt) {
    return transaction.createdAt;
  }

  if (typeof transaction.blockTime === "number") {
    return new Date(transaction.blockTime * 1000);
  }

  return null;
}

function formatNumber(value) {
  return Number(value || 0).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
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

function getNetworkLabel(network) {
  if (network === "bitcoin") {
    return "Bitcoin Testnet";
  }

  if (network === "bnb") {
    return "BNB Smart Chain Testnet";
  }

  return "Solana Devnet";
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

function getStatusLabel(status) {
  if (status === "confirmed" || status === "success") {
    return "Confirmada";
  }

  if (status === "pending") {
    return "Pendiente";
  }

  if (status === "failed") {
    return "Fallida";
  }

  return status || "Registrada";
}

function formatShortHash(value) {
  if (!value) {
    return "Sin hash";
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function buildSearchText(transaction) {
  return [
    getDirectionLabel(transaction.direction),
    getNetworkLabel(transaction.network),
    getTransactionSymbol(transaction),
    transaction.status,
    transaction.txHash,
    transaction.signature,
    transaction.fromAddress,
    transaction.toAddress,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeSyncError(message) {
  if (!message) {
    return "";
  }

  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("permission")
    || lowerMessage.includes("api")
    || lowerMessage.includes("rpc")
    || lowerMessage.includes("unavailable")
    || lowerMessage.includes("configur")
  ) {
    return "Actividad on-chain cargada parcialmente. No se pudo consultar una de las redes.";
  }

  return message;
}

function normalizeSyncNotice(message) {
  if (!message) {
    return "";
  }

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("parcial")) {
    return "Historial cargado parcialmente.";
  }

  if (
    lowerMessage.includes("permission")
    || lowerMessage.includes("api")
    || lowerMessage.includes("rpc")
    || lowerMessage.includes("unavailable")
    || lowerMessage.includes("configur")
  ) {
    return "Actividad on-chain cargada parcialmente.";
  }

  return message;
}

async function getStoredTransactions(uid) {
  try {
    return await getTransactions(uid);
  } catch {
    return [];
  }
}

async function getOnChainTransactions(wallet) {
  const jobs = [];

  if (wallet?.solanaAddress) {
    jobs.push(getSolanaNativeOnChainActivity(wallet.solanaAddress, 20));
  }

  if (wallet?.bnbAddress) {
    jobs.push(getBnbNativeOnChainActivity(wallet.bnbAddress, 20));
  }

  if (wallet?.bitcoinAddress) {
    jobs.push(getBitcoinTestnetOnChainActivity(wallet.bitcoinAddress, 20));
  }

  const results = await Promise.allSettled(jobs);

  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

function HistorySkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3].map((item) => (
        <article className="history-table__row history-table__row--skeleton" role="row" key={item}>
          <div className="history-movement-cell">
            <span className="dashboard-skeleton dashboard-skeleton--icon" aria-hidden="true" />
            <div>
              <span className="dashboard-skeleton dashboard-skeleton--text dashboard-skeleton--wide" />
              <span className="dashboard-skeleton dashboard-skeleton--text" />
            </div>
          </div>

          <div>
            <span className="dashboard-skeleton dashboard-skeleton--text dashboard-skeleton--wide" />
            <span className="dashboard-skeleton dashboard-skeleton--text dashboard-skeleton--short" />
          </div>

          <div>
            <span className="dashboard-skeleton dashboard-skeleton--text" />
          </div>

          <div>
            <span className="dashboard-skeleton dashboard-skeleton--pill" />
          </div>

          <div>
            <span className="dashboard-skeleton dashboard-skeleton--text" />
            <span className="dashboard-skeleton dashboard-skeleton--text dashboard-skeleton--short" />
          </div>

          <div>
            <span className="dashboard-skeleton dashboard-skeleton--text" />
          </div>
        </article>
      ))}
    </>
  );
}

function TransactionHistory({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncNotice, setSyncNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      // Carga historial guardado y actividad on-chain; si una red falla, conserva lo disponible.
      const isManualRefresh = refreshTick > 0;

      if (isManualRefresh) {
        setSyncing(true);
      } else {
        setLoading(true);
        setLoaded(false);
        setSyncing(true);
      }

      setSyncError("");
      setSyncNotice("");

      try {
        const wallet = await getUserWallet(user.uid);
        const storedTransactions = await getStoredTransactions(user.uid);

        if (isMounted && storedTransactions.length > 0) {
          setTransactions(storedTransactions);
          setLoaded(true);
          setLoading(false);
        }

        if (wallet) {
          const onChainTransactions = await getOnChainTransactions(wallet);

          if (isMounted && (storedTransactions.length > 0 || onChainTransactions.length > 0)) {
            setTransactions(mergeTransactions(storedTransactions, onChainTransactions));
            setLoaded(true);
            setLoading(false);
          }

          const syncResult = await syncWalletActivity(user.uid, wallet);
          const [updatedStoredTransactions, updatedOnChainTransactions] = await Promise.all([
            getStoredTransactions(user.uid),
            getOnChainTransactions(wallet),
          ]);

          if (isMounted) {
            setTransactions(mergeTransactions(updatedStoredTransactions, updatedOnChainTransactions));
            setSyncError(syncResult.hasOnlyFailures ? normalizeSyncError(syncResult.message) : "");
            setSyncNotice(syncResult.hasOnlyFailures ? "" : normalizeSyncNotice(syncResult.message));
            setLoaded(true);
          }
        } else if (isMounted) {
          setLoaded(true);
        }
      } catch {
        if (isMounted) {
          setSyncError("No se pudo actualizar actividad en este momento.");
          setSyncNotice("");
          setLoaded(true);
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

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return transactions;
    }

    return transactions.filter((transaction) => buildSearchText(transaction).includes(normalizedSearch));
  }, [searchTerm, transactions]);

  function handleRefreshActivity() {
    // La actualización manual mantiene datos existentes visibles mientras sincroniza nuevas fuentes.
    if (loading || syncing) {
      return;
    }

    setRefreshTick((currentTick) => currentTick + 1);
  }

  const hasSearch = searchTerm.trim().length > 0;
  const hasTransactions = transactions.length > 0;
  const hasFilteredTransactions = filteredTransactions.length > 0;
  const showSkeleton = (loading || syncing) && !hasTransactions;
  const showSearchEmpty = loaded && hasSearch && !hasFilteredTransactions && !showSkeleton;
  const showEmptyState = !loading && !syncing && loaded && !hasSearch && !hasTransactions;
  const historyStatusLabel = loading && !loaded
    ? "Sincronizando historial multired..."
    : syncing
      ? "Actualizando historial..."
      : syncError
        ? "No se pudo actualizar toda la actividad"
        : syncNotice.toLowerCase().includes("parcial")
          ? "Historial cargado parcialmente"
          : loaded
            ? "Historial actualizado"
            : "Sincronizando historial multired...";

  return (
    <AppShell
      user={user}
      title="Historial"
      kicker="Actividad"
      description="Transacciones reales en testnet y movimientos registrados."
    >
      <section className="placeholder-page history-page">
        <article className="dashboard-card history-toolbar">
          <label className="history-search-field" htmlFor="history-search">
            <span aria-hidden="true">Buscar</span>
            <input
              id="history-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tx hash, activo o red"
            />
          </label>

          <button className="auth-button-secondary history-refresh-button" type="button" onClick={handleRefreshActivity} disabled={loading || syncing}>
            {loading || syncing ? "Actualizando..." : "Actualizar actividad"}
          </button>
        </article>

        {syncNotice && !syncing ? <p className="dashboard-note">{syncNotice}</p> : null}
        {syncError ? <p className="negative">{syncError}</p> : null}

        <article className="dashboard-card history-table-card">
          <div className="card-header-row">
            <div>
              <h2>Actividad registrada</h2>
              <p className="dashboard-note">Movimientos enviados, recibidos y sincronizados.</p>
              <p className={`history-sync-status ${loading || syncing ? "history-sync-status--loading" : ""}`}>
                {historyStatusLabel}
              </p>
              {loading || syncing ? (
                <p className="dashboard-note history-sync-copy">
                  {hasTransactions
                    ? "Actualizando historial sin ocultar los movimientos actuales."
                    : "Consultando movimientos en Solana, BNB y Bitcoin Testnet."}
                </p>
              ) : null}
            </div>
            <span className="card-pill card-pill--muted">
              {filteredTransactions.length} movimientos
            </span>
          </div>

          {hasFilteredTransactions ? (
            <div className="history-table" role="table" aria-label="Actividad registrada">
              <div className="history-table__head" role="row">
                <span>Movimiento</span>
                <span>Red / Activo</span>
                <span>Monto</span>
                <span>Estado</span>
                <span>Tx Hash</span>
                <span>Fecha</span>
              </div>

              {filteredTransactions.map((transaction) => {
                const symbol = getTransactionSymbol(transaction);
                const isIncoming = transaction.direction === "incoming";

                return (
                  <article className="history-table__row" role="row" key={transaction.id}>
                    <div className="history-movement-cell">
                      <span className={`history-direction-dot ${isIncoming ? "incoming" : "outgoing"}`} aria-hidden="true">
                        {isIncoming ? "IN" : "OUT"}
                      </span>
                      <div>
                        <strong>{getDirectionLabel(transaction.direction)}</strong>
                        <small>{transaction.fromAddress ? `Desde ${formatShortHash(transaction.fromAddress)}` : transaction.toAddress ? `A ${formatShortHash(transaction.toAddress)}` : "Movimiento registrado"}</small>
                      </div>
                    </div>

                    <div>
                      <strong>{getNetworkLabel(transaction.network)}</strong>
                      <small>{symbol}</small>
                    </div>

                    <div className={isIncoming ? "history-amount-positive" : "history-amount-negative"}>
                      <strong>{isIncoming ? "+" : "-"}{formatNumber(transaction.amount)} {symbol}</strong>
                    </div>

                    <div>
                      <span className={`history-status-pill history-status-pill--${transaction.status || "registered"}`}>
                        {getStatusLabel(transaction.status)}
                      </span>
                      {transaction.confirmationStatus ? <small>{transaction.confirmationStatus}</small> : null}
                    </div>

                    <div>
                      <strong>{formatShortHash(transaction.txHash || transaction.signature)}</strong>
                      {transaction.explorerUrl ? (
                        <a className="inline-link-text" href={transaction.explorerUrl} target="_blank" rel="noreferrer">
                          Ver en Explorer
                        </a>
                      ) : null}
                    </div>

                    <div>
                      <span>{formatDate(getTransactionDate(transaction))}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : showSkeleton ? (
            <div className="history-table" role="table" aria-label="Sincronizando historial multired">
              <div className="history-table__head" role="row">
                <span>Movimiento</span>
                <span>Red / Activo</span>
                <span>Monto</span>
                <span>Estado</span>
                <span>Tx Hash</span>
                <span>Fecha</span>
              </div>
              <HistorySkeletonRows />
            </div>
          ) : showSearchEmpty ? (
            <div className="empty-activity-state">
              <span aria-hidden="true">TX</span>
              <strong>No se encontraron movimientos con ese criterio.</strong>
              <p>Ajusta la busqueda por red, activo o hash de transaccion.</p>
            </div>
          ) : showEmptyState ? (
            <div className="empty-activity-state">
              <span aria-hidden="true">TX</span>
              <strong>No hay movimientos registrados</strong>
              <p>Envia, recibe o actualiza actividad para ver tus transacciones.</p>
            </div>
          ) : null}
        </article>
      </section>
    </AppShell>
  );
}

export default TransactionHistory;
