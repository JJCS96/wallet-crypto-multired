import { Link } from "react-router-dom";

function WalletEmptyState({
  title,
  description,
  steps,
  primaryAction,
  secondaryAction,
  badge,
  children,
}) {
  return (
    <section className="wallet-empty-state">
      <span className="wallet-empty-state__icon" aria-hidden="true">
        <span className="wallet-empty-state__icon-glow" />
        <span>NW</span>
      </span>

      <div>
        <h2 className="wallet-empty-state__title">{title}</h2>
        <p className="wallet-empty-state__copy">{description}</p>
      </div>

      {badge ? <span className="placeholder-badge">{badge}</span> : null}

      <ol className="wallet-empty-state__steps">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="placeholder-actions">
        {primaryAction ? (
          <Link className="auth-button auth-button-link" to={primaryAction.to}>
            {primaryAction.label}
          </Link>
        ) : null}

        {secondaryAction ? (
          <Link className="auth-button-secondary auth-button-link" to={secondaryAction.to}>
            {secondaryAction.label}
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}

export default WalletEmptyState;
