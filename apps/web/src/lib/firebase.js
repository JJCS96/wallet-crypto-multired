// Importamos las funciones necesarias para inicializar Firebase.
// initializeApp sirve para conectar nuestra app React con el proyecto Firebase.
import { initializeApp, getApps, getApp } from "firebase/app";

// getAuth permite usar Firebase Authentication.
// Lo usaremos para login, registro, recuperación de contraseña y logout.
import { getAuth } from "firebase/auth";

// getFirestore permite conectarnos a la base de datos Firestore.
// Lo usaremos para guardar datos no críticos del usuario.
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase.
// Estos valores vienen del archivo .env.local.
// En Vite, las variables de entorno deben empezar con VITE_.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Esta línea evita inicializar Firebase más de una vez.
// Es útil porque React puede recargar componentes en desarrollo.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Exportamos auth para usar Firebase Authentication en otros archivos.
export const auth = getAuth(app);

// Exportamos db para usar Firestore en otros archivos.
export const db = getFirestore(app);

// Exportamos la app por defecto por si otro archivo necesita usar la instancia completa.
export default app;