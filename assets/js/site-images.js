/* ===========================================================
   COSYTEC — Immagini gestibili da pannello admin
   Ogni <img data-slot="pagina-NN"> viene sostituita con l'immagine
   caricata dall'operatore (se presente); altrimenti resta quella
   di default già nel codice, quindi il sito non si rompe mai.

   Per non mostrare per un attimo l'immagine di default prima di
   quella personalizzata, le immagini che potrebbero essere state
   sostituite restano nascoste finché Firebase non ha risposto
   (al massimo 3 secondi). Il browser ricorda quali spazi non hanno
   mai avuto una sostituzione, e quelli si vedono subito.
   =========================================================== */

function slotFlag(key){
  try { return localStorage.getItem('cosytec_slot_' + key); } catch (e) { return null; }
}

function setSlotFlag(key, value){
  try { localStorage.setItem('cosytec_slot_' + key, value); } catch (e) { /* storage non disponibile */ }
}

async function applySiteImages(){
  const imgs = Array.from(document.querySelectorAll('img[data-slot]'));
  if (!imgs.length) return;

  const reveal = el => el.classList.remove('slot-pending');
  const pending = imgs.filter(el => slotFlag(el.dataset.slot) !== '0');
  pending.forEach(el => el.classList.add('slot-pending'));
  setTimeout(() => pending.forEach(reveal), 3000);

  const page = document.body.dataset.page;
  if (!db || !page) { imgs.forEach(reveal); return; }

  let overrides = {};
  try {
    const snap = await db.collection('site_images').where('page', '==', page).get();
    snap.forEach(doc => { overrides[doc.id] = doc.data(); });
  } catch (err) {
    console.warn('Immagini personalizzate non disponibili, uso quelle di default.', err);
    imgs.forEach(reveal);
    return;
  }

  imgs.forEach(el => {
    const data = overrides[el.dataset.slot];
    setSlotFlag(el.dataset.slot, data && data.url ? '1' : '0');
    if (data && data.url && el.getAttribute('src') !== data.url) {
      el.addEventListener('load', () => reveal(el), { once: true });
      el.addEventListener('error', () => reveal(el), { once: true });
      el.src = data.url;
    } else {
      reveal(el);
    }
  });
}

applySiteImages();
