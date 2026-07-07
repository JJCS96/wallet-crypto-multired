import { WALLET_ADDRESS_FIELDS } from "../../constants/wallet";
import { isBitcoinMainnetAddress, isValidBitcoinTestnetAddress } from "../../utils/address-validation";

const ADDRESS_FIELD_META = {
  solanaAddress: "Solana Devnet real",
  bitcoinAddress: "Bitcoin Testnet parcial",
  bnbAddress: "BNB Smart Chain Testnet",
};

function AddressListCard({ wallet, title = "Direcciones públicas" }) {
  function getDisplayValue(fieldName) {
    const value = wallet?.[fieldName] || "";

    if (!value) {
      return "Pendiente";
    }

    if (fieldName === "bitcoinAddress" && !isValidBitcoinTestnetAddress(value)) {
      return "Dirección incompatible con Bitcoin Testnet";
    }

    return value;
  }

  function getMeta(fieldName) {
    const value = wallet?.[fieldName] || "";

    if (fieldName === "bitcoinAddress" && isBitcoinMainnetAddress(value)) {
      return "Bitcoin mainnet detectado; restaura la wallet para obtener tb1 testnet";
    }

    return ADDRESS_FIELD_META[fieldName];
  }

  return (
    <article className="placeholder-card address-list-card nova-card--interactive">
      <p className="placeholder-kicker">Wallet pública</p>
      <h2 className="placeholder-title">{title}</h2>
      <p className="placeholder-copy">
        Estas direcciones son públicas y pueden guardarse en Firestore. Ninguna frase semilla ni
        clave privada se almacena aquí.
      </p>

      <div className="wallet-address-list">
        {Object.entries(WALLET_ADDRESS_FIELDS).map(([fieldName, label]) => (
          <div className="wallet-address-item" key={fieldName}>
            <strong>{label}</strong>
            <small>{getMeta(fieldName)}</small>
            <span>
              {getDisplayValue(fieldName)}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default AddressListCard;
