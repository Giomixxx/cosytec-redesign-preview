/* ===========================================================
   COSYTEC — Immagini gestibili da pannello admin
   Ogni <img data-slot="pagina-NN"> viene sostituita con l'immagine
   caricata dall'operatore (se presente); altrimenti resta quella
   di default già nel codice, quindi il sito non si rompe mai.
   =========================================================== */

async function applySiteImages(){
  if (!db) return;
  const page = document.body.dataset.page;
  if (!page) return;
  try {
    const snap = await db.collection('site_images').where('page', '==', page).get();
    snap.forEach(doc => {
      const data = doc.data();
      if (!data.url) return;
      const el = document.querySelector(`img[data-slot="${data.slotKey}"]`);
      if (el) el.src = data.url;
    });
  } catch (err) {
    console.warn('Immagini personalizzate non disponibili, uso quelle di default.', err);
  }
}

document.addEventListener('DOMContentLoaded', applySiteImages);
