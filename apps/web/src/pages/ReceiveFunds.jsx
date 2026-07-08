import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { APP_ROUTES } from "../constants/routes";
import { NETWORKS, SUPPORTED_NETWORK_IDS } from "../constants/networks";
import { ASSETS, ASSET_IDS } from "../config/assets";
import { getUserWallet } from "../services/user-wallets.service";
import { isBitcoinMainnetAddress, isValidBitcoinTestnetAddress } from "../utils/address-validation";

function getWalletAddress(wallet, networkId) {
  if (networkId === "solana") {
    return wallet?.solanaAddress || "";
  }

  if (networkId === "bitcoin") {
    return wallet?.bitcoinAddress || "";
  }

  if (networkId === "bnb") {
    return wallet?.bnbAddress || "";
  }

  return "";
}

function getAddressExplorerUrl(networkId, address) {
  if (networkId === "bitcoin" && isValidBitcoinTestnetAddress(address)) {
    return `${NETWORKS.bitcoin.explorerAddressBaseUrl}${address}`;
  }

  if (networkId === "bnb" && address) {
    return `${NETWORKS.bnb.explorerAddressBaseUrl}${address}`;
  }

  return "";
}

function ReceiveFunds({ user }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [networkId, setNetworkId] = useState("solana");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadWallet() {
      setLoading(true);

      try {
        const currentWallet = await getUserWallet(user.uid);

        if (isMounted) {
          setWallet(currentWallet);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadWallet();

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  const currentNetwork = NETWORKS[networkId];
  const currentAddress = useMemo(() => getWalletAddress(wallet, networkId), [wallet, networkId]);
  const isBitcoinTestnetAddress = networkId !== "bitcoin" || isValidBitcoinTestnetAddress(currentAddress);
  const hasBitcoinMainnetAddress = networkId === "bitcoin" && isBitcoinMainnetAddress(currentAddress);
  const canUseCurrentAddress = Boolean(currentAddress) && isBitcoinTestnetAddress;
  const displayedAddress = canUseCurrentAddress
    ? currentAddress
    : networkId === "bitcoin"
      ? "Dirección incompatible con Bitcoin Testnet"
      : currentAddress;
  const addressExplorerUrl = getAddressExplorerUrl(networkId, currentAddress);
  const receivableAssets = networkId === "solana"
    ? [ASSETS[ASSET_IDS.solanaNative], ASSETS[ASSET_IDS.solanaSplDemo]]
    : networkId === "bnb"
      ? [ASSETS[ASSET_IDS.bnbNative], ASSETS[ASSET_IDS.bnbBep20Demo]]
      : [ASSETS[ASSET_IDS.bitcoinNative]];
  const qrUrl = canUseCurrentAddress
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentAddress)}`
    : "";

  async function handleCopyAddress() {
    if (!canUseCurrentAddress) {
      setCopyMessage("");
      return;
    }

    await navigator.clipboard.writeText(currentAddress);
    setCopyMessage("Dirección copiada correctamente.");
  }

  return (
    <AppShell
      user={user}
      title="Recibir fondos"
      kicker="Recibir"
      description="Selecciona una red y comparte tu dirección pública." 
    >
      {loading ? (
        <section className="placeholder-page">
          <article className="placeholder-card placeholder-card--loading">
            <p className="placeholder-copy">Cargando direcciones para recibir fondos...</p>
          </article>
        </section>
      ) : !wallet ? (
        <section className="placeholder-page">
          <article className="placeholder-card">
            <WalletEmptyState
              title="Necesitas una Wallet antes de recibir"
              description="Primero crea o restaura tu Wallet para disponer de direcciones públicas por red."
              badge="Sin Wallet"
              steps={[
                "Crear Wallet nueva.",
                "O restaurar una existente con frase semilla.",
                "Después podrás compartir direcciones y QR.",
              ]}
              primaryAction={{ to: APP_ROUTES.createWallet, label: "Crear Wallet" }}
              secondaryAction={{ to: APP_ROUTES.restoreWallet, label: "Restaurar Wallet" }}
            />
          </article>
        </section>
      ) : (
        <section className="placeholder-page">
          <div className="placeholder-grid wallet-summary-grid">
            <article className="placeholder-card placeholder-card--accent">
              <p className="placeholder-kicker">Selecciona red</p>
              <h2 className="placeholder-title">Recibir en tu Wallet</h2>
              <div className="wallet-network-switcher">
                {SUPPORTED_NETWORK_IDS.map((id) => (
                  <button
                    key={id}
                    className={`chart-range-button ${networkId === id ? "active" : ""}`}
                    type="button"
                    onClick={() => setNetworkId(id)}
                  >
                    {NETWORKS[id].shortLabel}
                  </button>
                ))}
              </div>

              <p className="placeholder-copy">
                Red: <strong>{currentNetwork.label}</strong>
              </p>
              <p className="placeholder-copy">
                Usa esta dirección solo para {currentNetwork.shortLabel}.
              </p>
              <div className="asset-status-row" style={{ marginTop: "14px" }}>
                {receivableAssets.map((asset) => (
                  <span className="card-pill" key={asset.id}>
                    {asset.symbol}{asset.assetType === "token" && !asset.configured ? " no configurado" : ""}
                  </span>
                ))}
              </div>

              {hasBitcoinMainnetAddress ? (
                <div className="auth-error" style={{ marginTop: "18px", marginBottom: 0 }}>
                  La dirección Bitcoin guardada pertenece a mainnet. Para usar Bitcoin Testnet, restaura tu wallet con la frase de recuperación y se actualizará la dirección pública testnet.
                </div>
              ) : null}
              {copyMessage ? <div className="auth-success" style={{ marginTop: "18px" }}>{copyMessage}</div> : null}
            </article>

            <article className="placeholder-card receive-qr-card">
              <p className="placeholder-kicker">Código QR</p>
              <h2 className="placeholder-title">Escanea o copia</h2>
              {canUseCurrentAddress ? (
                <img className="receive-qr-image" src={qrUrl} alt={`Código QR para ${currentNetwork.label}`} />
              ) : (
                <div className="receive-qr-image receive-qr-image--empty">
                  {networkId === "bitcoin" ? "Dirección incompatible" : "Sin dirección"}
                </div>
              )}
            </article>
          </div>

          <article className="placeholder-card">
            <p className="placeholder-kicker">Dirección pública</p>
            <h2 className="placeholder-title">{currentNetwork.label}</h2>
            <p className="placeholder-copy" style={{ wordBreak: "break-all" }}>{displayedAddress}</p>
            <div className="placeholder-actions" style={{ marginTop: "18px" }}>
              <button className="auth-button" type="button" onClick={handleCopyAddress} disabled={!canUseCurrentAddress}>
                Copiar dirección
              </button>
              {addressExplorerUrl ? (
                <a className="auth-button-secondary auth-button-link" href={addressExplorerUrl} target="_blank" rel="noreferrer">
                  Ver dirección en explorer
                </a>
              ) : null}
            </div>
            <div className="auth-error" style={{ marginTop: "18px", marginBottom: 0 }}>
              Envía únicamente {currentNetwork.shortLabel} a esta dirección. Usar una red incorrecta
              puede provocar pérdida de fondos.
            </div>
          </article>
        </section>
      )}
    </AppShell>
  );
}

export default ReceiveFunds;
