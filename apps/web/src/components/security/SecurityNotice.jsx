const SECURITY_NOTICE_CONTENT = {
  "account-recovery": {
    className: "auth-success",
    message:
      "Este proceso solo recupera el acceso a tu cuenta. Para restaurar tu Wallet necesitarás tu frase semilla.",
  },
  "wallet-restore": {
    className: "auth-error",
    message:
      "La Wallet solo puede restaurarse con la frase semilla. Esta frase no se guarda, no se envía por correo y no puede ser recuperada por la plataforma.",
  },
  "seed-backup": {
    className: "auth-error",
    message:
      "Guarda tu frase semilla en un lugar seguro. Si la pierdes, no podremos ayudarte a recuperar tu Wallet.",
  },
  "sensitive-data": {
    className: "auth-error",
    message:
      "Nunca compartas tu frase semilla, clave privada o datos sensibles. NovaWallet solo guarda direcciones publicas en Firestore y el vault local permanece cifrado.",
  },
};

function SecurityNotice({ type, style }) {
  const notice = SECURITY_NOTICE_CONTENT[type];

  if (!notice) {
    return null;
  }

  return <div className={notice.className} style={style}>{notice.message}</div>;
}

export default SecurityNotice;
