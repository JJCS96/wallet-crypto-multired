import { Link } from "react-router-dom";
import AddressListCard from "./AddressListCard";
import { APP_ROUTES } from "../../constants/routes";

function WalletCreationSummary({ wallet, title = "Wallet lista", copy, primaryLabel = "Ir al dashboard" }) {
  return (
    <section className="placeholder-page">
      <article className="placeholder-card placeholder-card--accent">
        <p className="placeholder-kicker">Estado wallet</p>
        <h2 className="placeholder-title">{title}</h2>
        <p className="placeholder-copy">
          {copy ||
            "La wallet ya tiene direcciones publicas listas para Solana, Bitcoin y BNB Smart Chain."}
        </p>

        <div className="placeholder-actions" style={{ marginTop: "18px" }}>
          <Link className="auth-button auth-button-link" to={APP_ROUTES.walletHome}>
            {primaryLabel}
          </Link>

          <Link className="auth-button-secondary auth-button-link" to={APP_ROUTES.sendTransaction}>
            Ver modulo de envio
          </Link>
        </div>
      </article>

      <AddressListCard wallet={wallet} />
    </section>
  );
}

export default WalletCreationSummary;
