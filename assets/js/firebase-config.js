/* ===========================================================
   Configurazione Firebase — Cosytec
   Sostituisci i valori sotto con quelli del tuo progetto Firebase:
   Console Firebase > Impostazioni progetto > Le tue app > (icona Web)
   =========================================================== */

const firebaseConfig = {
  apiKey: "INSERISCI_API_KEY",
  authDomain: "INSERISCI_PROGETTO.firebaseapp.com",
  projectId: "INSERISCI_PROGETTO_ID",
  storageBucket: "INSERISCI_PROGETTO.appspot.com",
  messagingSenderId: "INSERISCI_SENDER_ID",
  appId: "INSERISCI_APP_ID"
};

let db = null;
let auth = null;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
} catch (err) {
  console.warn('Firebase non configurato correttamente:', err);
}
