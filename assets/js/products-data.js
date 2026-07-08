/* ===========================================================
   COSYTEC — Gestione prodotti (Firestore)
   Collezione: "products"
   Campo            Tipo      Note
   ---------------  --------  --------------------------------
   name             string    Nome prodotto
   tag              string    Etichetta card (es. "Daikin", "Promo")
   category         string    daikin | caldaie | stufe | foto
   price            number    Prezzo in euro
   priceNote        string    es. "installazione esclusa"
   description      string    Breve descrizione
   imageUrl         string    URL diretto immagine
   imageStyle       string    photo | white | cover
   accent           string    warm | cool | duo | navy (solo per imageStyle=photo)
   active           boolean   Se false non viene mostrato
   createdAt        timestamp
   =========================================================== */

const CATEGORY_LABELS = {
  daikin: "Climatizzatori",
  caldaie: "Caldaie",
  stufe: "Stufe & Camini",
  foto: "Fotovoltaico & Solare"
};

// Prodotti attuali del sito, usati per il primo popolamento del database (pulsante "Importa prodotti attuali" nel pannello admin).
const SEED_PRODUCTS = [
  { id: "dk-9000", name: "Daikin Sensira 9000 BTU", tag: "Daikin", category: "daikin", price: 549, priceNote: "installazione esclusa", description: "Compatto e silenzioso, perfetto per camere e piccoli ambienti.", imageUrl: "assets/img/daikin-sensira.png", imageStyle: "photo", accent: "cool" },
  { id: "dk-12000", name: "Daikin Perfera 12000 BTU", tag: "Daikin", category: "daikin", price: 899, priceNote: "installazione esclusa", description: "Massima efficienza classe A+++ con filtro purificatore integrato.", imageUrl: "assets/img/daikin-perfera.png", imageStyle: "photo", accent: "cool" },
  { id: "dk-emura", name: "Daikin Multi+ 3 Zone", tag: "Daikin", category: "daikin", price: 2190, priceNote: "installazione esclusa", description: "Un'unica unità esterna per climatizzare fino a 3 ambienti diversi.", imageUrl: "assets/img/daikin-emura.png", imageStyle: "photo", accent: "navy" },
  { id: "gree-clivia", name: "Gree Clivia 9000 BTU", tag: "Gree", category: "daikin", price: 479, priceNote: "installazione esclusa", description: "Ottimo rapporto qualità-prezzo, wifi integrato e gas ecologico R32.", imageUrl: "assets/img/clima-gree-clivia.jpg", imageStyle: "white", accent: "" },

  { id: "cald-ischia", name: "Fondital Ischia 24kW", tag: "Fondital", category: "caldaie", price: 1290, priceNote: "installazione esclusa", description: "Caldaia murale a condensazione, ideale per appartamenti fino a 120mq.", imageUrl: "assets/img/caldaia-fondital.jpg", imageStyle: "white", accent: "" },
  { id: "cald-primus", name: "Stelbi Primus 24kW", tag: "Stelbi", category: "caldaie", price: 1190, priceNote: "installazione esclusa", description: "Affidabilità e prestazioni costanti, garanzia estesa a 5 anni.", imageUrl: "assets/img/caldaia-stelbi-primus.png", imageStyle: "white", accent: "" },
  { id: "cald-ariston", name: "Ariston Genus One 28kW", tag: "Ariston", category: "caldaie", price: 1790, priceNote: "installazione esclusa", description: "Per abitazioni più ampie, con controllo smart da app incluso.", imageUrl: "assets/img/caldaia-ariston-genusone.png", imageStyle: "white", accent: "" },
  { id: "cald-immergas", name: "Immergas Victrix Tera 28kW", tag: "Immergas", category: "caldaie", price: 1990, priceNote: "installazione esclusa", description: "Predisposta idrogeno, con filtro ciclonico di serie.", imageUrl: "assets/img/caldaia-immergas-victrix.png", imageStyle: "white", accent: "" },
  { id: "rinnai-sensei", name: "Rinnai Infinity Sensei", tag: "Rinnai", category: "caldaie", price: 1090, priceNote: "installazione esclusa", description: "Scaldabagno istantaneo a condensazione, fino a 32 litri/minuto.", imageUrl: "assets/img/scaldabagno-rinnai.png", imageStyle: "white", accent: "" },

  { id: "stufa-biancalux", name: "Palazzetti Ecofire Bianca Lux 12kW", tag: "Palazzetti", category: "stufe", price: 2090, priceNote: "installazione esclusa", description: "Design elegante e ventilazione regolabile, per ambienti medio-grandi.", imageUrl: "assets/img/stufa-palazzetti-biancalux.jpeg", imageStyle: "white", accent: "" },
  { id: "camino-ecopalex", name: "Palazzetti Ecopalex GTM a Legna", tag: "Palazzetti", category: "stufe", price: 1650, priceNote: "installazione esclusa", description: "Design moderno con vetro ceramico panoramico ad alta resa termica.", imageUrl: "assets/img/camino-termo.png", imageStyle: "white", accent: "" },
  { id: "stufa-tft-diana", name: "TFT Diana", tag: "TFT", category: "stufe", price: 1190, priceNote: "installazione esclusa", description: "Termostufa a pellet Made in Italy, ingombro ridotto.", imageUrl: "assets/img/stufa-tft-diana.jpg", imageStyle: "cover", accent: "" },

  { id: "foto-3kw", name: "Kit Solare 3kW residenziale", tag: "Fotovoltaico", category: "foto", price: 3490, priceNote: "chiavi in mano", description: "Pannelli monocristallini e inverter, per iniziare a risparmiare da subito.", imageUrl: "assets/img/fotovoltaico-1.jpg", imageStyle: "cover", accent: "navy" },
  { id: "foto-6kw", name: "Kit Solare 6kW con batteria", tag: "Fotovoltaico + Accumulo", category: "foto", price: 7290, priceNote: "chiavi in mano", description: "Massima autonomia energetica con sistema di accumulo integrato.", imageUrl: "assets/img/fotovoltaico-2.jpg", imageStyle: "cover", accent: "cool" },
  { id: "solare-unical", name: "Unical L Sun 300", tag: "Unical", category: "foto", price: 1590, priceNote: "chiavi in mano", description: "Acqua calda sanitaria gratuita sfruttando l'energia del sole.", imageUrl: "assets/img/solare-unical.jpg", imageStyle: "white", accent: "" }
];

async function importSeedProducts(){
  const batch = db.batch();
  SEED_PRODUCTS.forEach(p => {
    const ref = db.collection('products').doc(p.id);
    batch.set(ref, {
      name: p.name, tag: p.tag, category: p.category, price: p.price,
      priceNote: p.priceNote, description: p.description, imageUrl: p.imageUrl,
      imageStyle: p.imageStyle, accent: p.accent || '', active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
  await batch.commit();
}

async function fetchActiveProducts(){
  if (!db) return SEED_PRODUCTS;
  try {
    const snap = await db.collection('products').where('active', '==', true).get();
    if (snap.empty) return SEED_PRODUCTS; // database non ancora popolato: mostra i prodotti di base
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    return list;
  } catch (err) {
    // Firebase non configurato o non raggiungibile: il sito pubblico resta comunque funzionante.
    console.warn('Prodotti da Firestore non disponibili, uso i prodotti di base.', err);
    return SEED_PRODUCTS;
  }
}

function phClassFor(p){
  if (p.imageStyle === 'white') return 'ph-white';
  if (p.imageStyle === 'cover') return 'ph-cover';
  // "photo": gradient background + contained cutout image
  const accent = p.accent || 'cool';
  return `ph-${accent} ph-photo`;
}

function productCardHTML(p, { withCart = false } = {}){
  const priceNote = p.priceNote ? `<small>${p.priceNote}</small>` : '';
  const phClass = phClassFor(p);
  const imgTag = `<img src="${p.imageUrl}" alt="${p.name}">`;

  if (withCart) {
    return `
      <div class="product-card" data-product data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-img="${p.imageUrl}" data-ph="${phClass.split(' ')[0]}" data-cat="${p.category}">
        <div class="ph ${phClass}">${imgTag}</div>
        <div class="body">
          <span class="tag">${p.tag}</span>
          <h3>${p.name}</h3>
          <p>${p.description}</p>
          <div class="price-row"><span class="price">€${p.price.toLocaleString('it-IT')}</span></div>
          <button class="add-cart-btn"><i class="fa-solid fa-cart-plus"></i> Aggiungi al carrello</button>
        </div>
      </div>`;
  }

  return `
    <div class="product-card">
      <div class="ph ${phClass}">${imgTag}</div>
      <div class="body">
        <span class="tag">${p.tag}</span>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="price-row"><span class="price">€${p.price.toLocaleString('it-IT')} ${priceNote}</span><a href="preventivo.html" class="btn btn-outline btn-sm">Richiedi</a></div>
      </div>
    </div>`;
}

async function renderProdottiPage(){
  const products = await fetchActiveProducts();
  ['daikin', 'caldaie', 'stufe', 'foto'].forEach(cat => {
    const container = document.getElementById('grid-' + cat);
    if (!container) return;
    const items = products.filter(p => p.category === cat);
    container.innerHTML = items.map(p => productCardHTML(p, { withCart: false })).join('') ||
      '<p style="color:var(--ink-300);">Nessun prodotto disponibile al momento in questa categoria.</p>';
  });
}

async function renderShopPage(){
  const products = await fetchActiveProducts();
  const container = document.getElementById('shop-grid');
  if (!container) return;
  container.innerHTML = products.map(p => productCardHTML(p, { withCart: true })).join('');
  document.querySelector('.shop-toolbar span').textContent = products.length + ' prodotti disponibili';
  if (typeof initShopButtons === 'function') initShopButtons();
  if (typeof initShopFilters === 'function') initShopFilters();
  if (typeof initReveal === 'function') initReveal();
}
