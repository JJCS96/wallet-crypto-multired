// Este componente centraliza la marca visual de la wallet.
// Se reutiliza en Splash, formularios y Dashboard para mantener consistencia.
function BrandMark({ centered = false, dark = false, compact = false }) {
  const brandClassName = [
    "brand-mark",
    centered ? "brand-mark--centered" : "",
    dark ? "brand-mark--dark" : "",
    compact ? "brand-mark--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={brandClassName}>
      <span className="brand-mark__icon" aria-hidden="true">
        <svg viewBox="0 0 56 56" className="brand-mark__svg" role="presentation">
          <defs>
            <linearGradient id="walletBrandGradient" x1="6" x2="50" y1="8" y2="48">
              <stop offset="0%" stopColor="#7b46ff" />
              <stop offset="100%" stopColor="#5b22e8" />
            </linearGradient>
          </defs>

          <rect x="6" y="10" width="44" height="36" rx="12" fill="url(#walletBrandGradient)" />
          <path
            d="M18 18h15.5a3.5 3.5 0 0 1 0 7H20.5A2.5 2.5 0 0 0 18 27.5v.5"
            fill="none"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <path
            d="M17.5 28h18a4.5 4.5 0 0 1 0 9h-18A2.5 2.5 0 0 1 15 34.5v-4A2.5 2.5 0 0 1 17.5 28Z"
            fill="#ffffff"
            opacity="0.16"
          />
          <circle cx="35.5" cy="32.5" r="2.5" fill="#ffffff" />
        </svg>
      </span>

      <div className="brand-mark__text">
        <span>Nova</span>
        <span className="brand-mark__text-accent">Wallet</span>
      </div>
    </div>
  );
}

export default BrandMark;
