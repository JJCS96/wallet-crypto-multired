// Este componente concentra iconos simples en SVG para reutilizarlos en toda la app.
// Asi evitamos abreviaturas visuales como DB, WA, TR o HI.
function UiIcon({ name, className = "" }) {
  const iconClassName = `ui-icon ${className}`.trim();

  switch (name) {
    case "dashboard":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="5" rx="2" />
          <rect x="13" y="10" width="8" height="11" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
        </svg>
      );

    case "wallet":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 0 4H7.5A1.5 1.5 0 0 0 6 10.5V17a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5A2.5 2.5 0 0 0 17.5 9H6.5A2.5 2.5 0 0 1 4 6.5v1Z" />
          <circle cx="16.5" cy="14" r="1.4" />
        </svg>
      );

    case "transfer":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 7h11.5l-2.6-2.6L15.3 3 21 8.7l-5.7 5.7-1.4-1.4L16.5 10H5V7Z" />
          <path d="M19 17H7.5l2.6 2.6L8.7 21 3 15.3l5.7-5.7 1.4 1.4L7.5 14H19v3Z" />
        </svg>
      );

    case "history":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5a7 7 0 1 1-6.3 3.9H3V6h2.9A9 9 0 1 0 12 3v2Z" />
          <path d="M11 7h2v5.2l3 1.8-1 1.7-4-2.4V7Z" />
        </svg>
      );

    case "settings":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.7 2h2.6l.6 2.3a7.8 7.8 0 0 1 1.7.7l2.1-1.1 1.8 1.8-1.1 2.1c.3.5.5 1.1.7 1.7l2.3.6v2.6l-2.3.6a7.8 7.8 0 0 1-.7 1.7l1.1 2.1-1.8 1.8-2.1-1.1a7.8 7.8 0 0 1-1.7.7l-.6 2.3h-2.6l-.6-2.3a7.8 7.8 0 0 1-1.7-.7l-2.1 1.1-1.8-1.8 1.1-2.1a7.8 7.8 0 0 1-.7-1.7L2 13.3v-2.6l2.3-.6c.1-.6.4-1.2.7-1.7L3.9 6.3l1.8-1.8 2.1 1.1c.5-.3 1.1-.5 1.7-.7L10.7 2Zm1.3 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        </svg>
      );

    case "create":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z" />
        </svg>
      );

    case "import":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 4h2v8.2l2.8-2.8 1.4 1.4-5.2 5.2-5.2-5.2 1.4-1.4 2.8 2.8V4Z" />
          <path d="M5 18h14v2H5z" />
        </svg>
      );

    default:
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

export default UiIcon;
