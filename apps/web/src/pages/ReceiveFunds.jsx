import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { APP_ROUTES } from "../constants/routes";
import { NETWORKS, SUPPORTED_NETWORK_IDS } from "../constants/networks";
import { getAssetDisplayName, getAssetsForNetwork } from "../config/assets";
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

function getReceiveAddressNote(networkId, receivableAssets) {
  const hasToken = receivableAssets.some((asset) => asset.assetType === "token");

  if (networkId === "solana") {
    return hasToken
      ? "SOL y USDT-DEMO SPL se reciben en esta misma direccion Solana."
      : "SOL se recibe en esta direccion Solana.";
  }

  if (networkId === "bnb") {
    return hasToken
      ? "tBNB y USDT-DEMO BEP20 se reciben en esta misma direccion BNB 0x."
      : "tBNB se recibe en esta direccion BNB 0x.";
  }

  return "Bitcoin Testnet recibe solo BTC nativo.";
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
      ? "Direccion incompatible con Bitcoin Testnet"
      : currentAddress || "Direccion no disponible";
  const addressExplorerUrl = getAddressExplorerUrl(networkId, currentAddress);
  const receivableAssets = getAssetsForNetwork(networkId);
  const receiveAddressNote = getReceiveAddressNote(networkId, receivableAssets);
  const qrUrl = canUseCurrentAddress
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentAddress)}`
    : "";

  async function handleCopyAddress() {
    if (!canUseCurrentAddress) {
      setCopyMessage("");
      return;
    }

    await navigator.clipboard.writeText(currentAddress);
    setCopyMessage("Direccion copiada correctamente.");
  }

  function handleNetworkChange(nextNetworkId) {
    setNetworkId(nextNetworkId);
    setCopyMessage("");
  }

  return (
    <AppShell
      user={user}
      title="Recibir fondos"
      kicker="Recibir"
      description="Selecciona una red y comparte tu direccion publica."
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
              description="Primero crea o restaura tu Wallet para disponer de direcciones publicas por red."
              badge="Sin Wallet"
              steps={[
                "Crear Wallet nueva.",
                "O restaurar una existente con frase semilla.",
                "Despues podras compartir direcciones y QR.",
              ]}
              primaryAction={{ to: APP_ROUTES.createWallet, label: "Crear Wallet" }}
              secondaryAction={{ to: APP_ROUTES.restoreWallet, label: "Restaurar Wallet" }}
            />
          </article>
        </section>
      ) : (
        <section className="placeholder-page receive-page">
          <article className="dashboard-card receive-main-card">
            <div className="receive-card-header">
              <div>
                <p className="placeholder-kicker">Direccion publica</p>
                <h2 className="placeholder-title">Recibir en NovaWallet</h2>
                <p className="dashboard-note">Selecciona una red y comparte tu direccion publica.</p>
              </div>
              <span className="card-pill card-pill--live">{currentNetwork.label}</span>
            </div>

            <div className="receive-content-grid">
              <div className="receive-details-panel">
                <div className="receive-network-panel">
                  <span className="receive-section-label">Red seleccionada</span>
                  <div className="wallet-network-switcher receive-network-switcher">
                    {SUPPORTED_NETWORK_IDS.map((id) => (
                      <button
                        key={id}
                        className={`chart-range-button ${networkId === id ? "active" : ""}`}
                        type="button"
                        onClick={() => handleNetworkChange(id)}
                      >
                        {NETWORKS[id].shortLabel}
                      </button>
                    ))}
                  </div>
                  <p className="dashboard-note">{receiveAddressNote}</p>
                  <div className="asset-status-row receive-assets-row">
                    {receivableAssets.map((asset) => (
                      <span className="card-pill" key={asset.id}>
                        {asset.assetType === "token" ? getAssetDisplayName(asset) : asset.symbol}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="receive-address-panel">
                  <span className="receive-section-label">Direccion publica</span>
                  <code className="receive-address-code">{displayedAddress}</code>
                  <div className="receive-actions">
                    <button className="auth-button" type="button" onClick={handleCopyAddress} disabled={!canUseCurrentAddress}>
                      Copiar direccion
                    </button>
                    {addressExplorerUrl ? (
                      <a className="auth-button-secondary auth-button-link" href={addressExplorerUrl} target="_blank" rel="noreferrer">
                        Ver en explorer
                      </a>
                    ) : null}
                  </div>
                  {copyMessage ? <div className="auth-success receive-copy-message">{copyMessage}</div> : null}
                </div>
              </div>

              <aside className="receive-qr-panel" aria-label="Codigo QR de direccion">
                <p className="placeholder-kicker">Codigo QR</p>
                <h3>Escanea o copia</h3>
                {canUseCurrentAddress ? (
                  <img className="receive-qr-image" src={qrUrl} alt={`Codigo QR para ${currentNetwork.label}`} />
                ) : (
                  <div className="receive-qr-image receive-qr-image--empty">
                    QR de direccion
                  </div>
                )}
              </aside>
            </div>

            {hasBitcoinMainnetAddress ? (
              <div className="auth-error receive-warning">
                La direccion Bitcoin guardada pertenece a mainnet. Para usar Bitcoin Testnet, restaura tu wallet con la frase de recuperacion.
              </div>
            ) : null}

            <div className="receive-warning" role="alert">
              Envia unicamente {currentNetwork.shortLabel} a esta direccion. Usar una red incorrecta puede provocar perdida de fondos.
            </div>
          </article>
        </section>
      )}
    </AppShell>
  );
}

export default ReceiveFunds;
