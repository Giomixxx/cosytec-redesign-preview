/* ===========================================================
   Configurazione Firebase — Cosytec
   Sostituisci i valori sotto con quelli del tuo progetto Firebase:
   Console Firebase > Impostazioni progetto > Le tue app > (icona Web)
   =========================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyCNfG6BllhNRVPBLOY-WUJVQw6JC5iwDPY",
  authDomain: "cosytec.firebaseapp.com",
  projectId: "cosytec",
  storageBucket: "cosytec.firebasestorage.app",
  messagingSenderId: "120235154511",
  appId: "1:120235154511:web:5bdbdbce4a054e77bc1e3a"
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
