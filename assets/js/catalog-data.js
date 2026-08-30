/* ===========================================================
   COSYTEC — Catalogo prodotti (Firestore)

   Collezione "categories"            (macrocategoria, es. Climatizzatori)
     name        string
     order       number

   Collezione "brands"                (marchio, es. "Daikin", associato a una categoria)
     name          string
     categoryId    string   id della categoria a cui appartiene questo marchio

   Collezione "series"                (modello/serie, es. "Daikin Sensira")
     categoryId    string   id della categoria
     tag           string   marchio/etichetta card (es. "Daikin")
     name          string   nome del modello
     description   string   descrizione breve
     features      array<string>   caratteristiche principali
     images        array<string>   URL immagini (la prima è quella di copertina)
     imageStyle    string   photo | white | cover
     accent        string   warm | cool | duo | navy (solo per imageStyle=photo)
     datasheetUrl  string   URL scheda tecnica PDF ufficiale (facoltativo)
     documents     array<{label,url}>   documentazione e certificazioni
     minPrice      number   calcolato: prezzo più basso tra le varianti
     variantCount  number   calcolato: numero varianti
     order         number
     active        boolean

   Sottocollezione "series/{id}/variants"   (es. "9.000 BTU")
     label       string   es. "9.000 BTU"
     model       string   codice modello esatto
     price       number
     priceNote   string   es. "installazione esclusa"
     order       number
     active      boolean
   =========================================================== */

const SEED_CATEGORIES = [
  { id: 'daikin', name: 'Climatizzatori', order: 1 },
  { id: 'caldaie', name: 'Caldaie', order: 2 },
  { id: 'termoidraulica', name: 'Termoidraulica', order: 3 },
  { id: 'stufe', name: 'Stufe & Camini', order: 4 },
  { id: 'foto', name: 'Fotovoltaico & Solare', order: 5 }
];

const SEED_BRANDS = [
  { id: 'daikin', name: 'Daikin', categoryId: 'daikin' },
  { id: 'gree', name: 'Gree', categoryId: 'daikin' },
  { id: 'fondital', name: 'Fondital', categoryId: 'caldaie' },
  { id: 'stelbi', name: 'Stelbi', categoryId: 'caldaie' },
  { id: 'ariston', name: 'Ariston', categoryId: 'caldaie' },
  { id: 'immergas', name: 'Immergas', categoryId: 'caldaie' },
  { id: 'rinnai', name: 'Rinnai', categoryId: 'caldaie' },
  { id: 'palazzetti', name: 'Palazzetti', categoryId: 'stufe' },
  { id: 'tft', name: 'TFT', categoryId: 'stufe' },
  { id: 'unical', name: 'Unical', categoryId: 'foto' }
];

const SEED_SERIES = [
  {
    id: 'daikin-sensira', categoryId: 'daikin', tag: 'Daikin', name: 'Daikin Sensira', order: 1,
    description: "Il climatizzatore entry-level Daikin: compatto, silenzioso ed efficiente per ogni ambiente domestico.",
    features: ['Classe energetica A++', 'Gas refrigerante ecologico R32', 'Livello sonoro molto basso', 'Filtro purificatore integrato'],
    images: ['assets/img/daikin-sensira.png'], imageStyle: 'photo', accent: 'cool',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '9.000 BTU', model: 'FTXF25F / RXF25F', price: 549, priceNote: 'installazione esclusa' },
      { label: '12.000 BTU', model: 'FTXF35F / RXF35F', price: 649, priceNote: 'installazione esclusa' },
      { label: '18.000 BTU', model: 'FTXF50F / RXF50F', price: 899, priceNote: 'installazione esclusa' }
    ]
  },
  {
    id: 'daikin-perfera', categoryId: 'daikin', tag: 'Daikin', name: 'Daikin Perfera', order: 2,
    description: "Massima efficienza classe A+++ con filtro purificatore avanzato, per chi cerca il massimo comfort.",
    features: ['Classe energetica A+++', 'Modalità comfort e purificazione avanzata', 'Wi-Fi integrato', 'Design compatto'],
    images: ['assets/img/daikin-perfera.png'], imageStyle: 'photo', accent: 'cool',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '9.000 BTU', model: 'FTXM25N / RXM25N', price: 799, priceNote: 'installazione esclusa' },
      { label: '12.000 BTU', model: 'FTXM35N / RXM35N', price: 899, priceNote: 'installazione esclusa' }
    ]
  },
  {
    id: 'daikin-stylish', categoryId: 'daikin', tag: 'Daikin', name: 'Daikin Stylish', order: 3,
    description: "Design curato disponibile in tre colori, per un climatizzatore che si integra nell'arredo.",
    features: ['Disponibile in bianco, nero e argento', 'Classe energetica A+++', 'Wi-Fi integrato di serie', 'Flusso d\'aria a 3D'],
    images: ['assets/img/daikin-stylish.png'], imageStyle: 'photo', accent: 'duo',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '9.000 BTU', model: 'FTXA25AW / RXA25A', price: 999, priceNote: 'installazione esclusa' },
      { label: '12.000 BTU', model: 'FTXA35AW / RXA35A', price: 1199, priceNote: 'installazione esclusa' }
    ]
  },
  {
    id: 'daikin-emura', categoryId: 'daikin', tag: 'Daikin', name: 'Daikin Emura', order: 4,
    description: "Il top di gamma Daikin: design pluripremiato e prestazioni al vertice della categoria.",
    features: ['Design pluripremiato (Red Dot Design Award)', 'Classe energetica A+++', 'Wi-Fi integrato', 'Funzione silenziosità notturna'],
    images: ['assets/img/daikin-emura.png'], imageStyle: 'photo', accent: 'navy',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '9.000 BTU', model: 'FTXJ25AW / RXJ25A', price: 1090, priceNote: 'installazione esclusa' },
      { label: '12.000 BTU', model: 'FTXJ35AW / RXJ35A', price: 1290, priceNote: 'installazione esclusa' }
    ]
  },
  {
    id: 'gree-clivia', categoryId: 'daikin', tag: 'Gree', name: 'Gree Clivia', order: 5,
    description: "Ottimo rapporto qualità-prezzo, wifi integrato e gas ecologico R32.",
    features: ['Classe energetica A++', 'Gas refrigerante ecologico R32', 'Wi-Fi integrato', 'Ottimo rapporto qualità-prezzo'],
    images: ['assets/img/clima-gree-clivia.jpg'], imageStyle: 'white', accent: '',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '9.000 BTU', model: 'GWH09YE-K6DNA1A', price: 479, priceNote: 'installazione esclusa' },
      { label: '12.000 BTU', model: 'GWH12YE-K6DNA1A', price: 579, priceNote: 'installazione esclusa' }
    ]
  },

  {
    id: 'fondital-ischia', categoryId: 'caldaie', tag: 'Fondital', name: 'Fondital Ischia', order: 1,
    description: "Caldaia murale a condensazione, ideale per appartamenti fino a 120mq.",
    features: ['Alta efficienza a condensazione', 'Predisposta per app di controllo remoto', 'Classe energetica A', 'Ingombro ridotto'],
    images: ['assets/img/caldaia-fondital.jpg'], imageStyle: 'white', accent: '',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '24 kW', model: 'Ischia 24 Kc', price: 1290, priceNote: 'installazione esclusa' }
    ]
  },
  {
    id: 'stelbi-primus', categoryId: 'caldaie', tag: 'Stelbi', name: 'Stelbi Primus', order: 2,
    description: "Affidabilità e prestazioni costanti nel tempo, garanzia estesa a 5 anni.",
    features: ['Garanzia estesa a 5 anni', 'Metano/GPL', 'Fino a 200 mq riscaldabili', 'Classe energetica A'],
    images: ['assets/img/caldaia-stelbi-primus.png'], imageStyle: 'white', accent: '',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '24 kW', model: 'Primus 24', price: 1190, priceNote: 'installazione esclusa' },
      { label: '28 kW', model: 'Primus 28', price: 1350, priceNote: 'installazione esclusa' }
    ]
  },
  {
    id: 'ariston-genusone', categoryId: 'caldaie', tag: 'Ariston', name: 'Ariston Genus One', order: 3,
    description: "Per abitazioni più ampie, con controllo smart da app incluso.",
    features: ['Controllo da app smartphone', 'Alta efficienza a condensazione', 'Display touch integrato', 'Design compatto'],
    images: ['assets/img/caldaia-ariston-genusone.png'], imageStyle: 'white', accent: '',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '28 kW', model: 'Genus One 28', price: 1790, priceNote: 'installazione esclusa' },
      { label: '35 kW', model: 'Genus One 35', price: 1990, priceNote: 'installazione esclusa' }
    ]
  },
  {
    id: 'immergas-victrix', categoryId: 'caldaie', tag: 'Immergas', name: 'Immergas Victrix Tera', order: 4,
    description: "Predisposta idrogeno, con filtro ciclonico di serie.",
    features: ['Predisposta hydrogen ready', 'Filtro ciclonico anticalcare di serie', 'Sistema Aqua Celeris', 'Alta efficienza'],
    images: ['assets/img/caldaia-immergas-victrix.png'], imageStyle: 'white', accent: '',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '28 kW', model: 'Victrix Tera 28 V2', price: 1990, priceNote: 'installazione esclusa' }
    ]
  },
  {
    id: 'rinnai-sensei', categoryId: 'caldaie', tag: 'Rinnai', name: 'Rinnai Infinity Sensei', order: 5,
    description: "Scaldabagno istantaneo a condensazione, acqua calda illimitata.",
    features: ['Acqua calda istantanea illimitata', 'Alta efficienza a condensazione', 'Installazione da esterno', 'Garanzia estesa disponibile'],
    images: ['assets/img/scaldabagno-rinnai.png'], imageStyle: 'white', accent: '',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '26 litri/min', model: 'Infinity Sensei 26e', price: 1090, priceNote: 'installazione esclusa' },
      { label: '32 litri/min', model: 'Infinity Sensei 32e', price: 1290, priceNote: 'installazione esclusa' }
    ]
  },

  {
    id: 'palazzetti-biancalux', categoryId: 'stufe', tag: 'Palazzetti', name: 'Palazzetti Ecofire Bianca Lux', order: 1,
    description: "Design elegante e ventilazione regolabile, per ambienti medio-grandi.",
    features: ['Ventilazione regolabile', 'Telecomando incluso', 'Serbatoio pellet capiente', 'Design elegante'],
    images: ['assets/img/stufa-palazzetti-biancalux.jpeg'], imageStyle: 'white', accent: '',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '8 kW', model: 'Bianca Lux 8', price: 1890, priceNote: 'installazione esclusa' },
      { label: '12 kW', model: 'Bianca Lux 12', price: 2090, priceNote: 'installazione esclusa' }
    ]
  },
  {
    id: 'palazzetti-ecopalex', categoryId: 'stufe', tag: 'Palazzetti', name: 'Palazzetti Ecopalex GTM', order: 2,
    description: "Design moderno con vetro ceramico panoramico ad alta resa termica.",
    features: ['Vetro ceramico panoramico', 'Alta resa termica', 'Kit ventilazione incluso', 'A legna'],
    images: ['assets/img/camino-termo.png'], imageStyle: 'white', accent: '',
    datasheetUrl: '', documents: [],
    variants: [
      { label: 'Taglia unica', model: 'Ecopalex GTM', price: 1650, priceNote: 'installazione esclusa' }
    ]
  },
  {
    id: 'tft-diana', categoryId: 'stufe', tag: 'TFT', name: 'TFT Diana', order: 3,
    description: "Termostufa a pellet Made in Italy, ingombro ridotto.",
    features: ['Made in Italy', 'Ingombro ridotto', 'Canalizzabile', 'Garanzia 5 anni sul corpo caldaia'],
    images: ['assets/img/stufa-tft-diana.jpg'], imageStyle: 'cover', accent: '',
    datasheetUrl: '', documents: [],
    variants: [
      { label: 'Taglia unica', model: 'Diana Idro', price: 1190, priceNote: 'installazione esclusa' }
    ]
  },

  {
    id: 'kit-solare-residenziale', categoryId: 'foto', tag: 'Fotovoltaico', name: 'Kit Solare Residenziale', order: 1,
    description: "Pannelli monocristallini e inverter, per iniziare a risparmiare in bolletta da subito.",
    features: ['Pannelli monocristallini ad alta efficienza', 'Inverter incluso', 'Possibilità di accumulo con batteria', 'Chiavi in mano'],
    images: ['assets/img/fotovoltaico-1.jpg', 'assets/img/fotovoltaico-2.jpg'], imageStyle: 'cover', accent: 'navy',
    datasheetUrl: '', documents: [],
    variants: [
      { label: '3 kW', model: 'Kit Residenziale 3kW', price: 3490, priceNote: 'chiavi in mano' },
      { label: '6 kW + batteria', model: 'Kit Residenziale 6kW + Accumulo', price: 7290, priceNote: 'chiavi in mano' }
    ]
  },
  {
    id: 'unical-lsun300', categoryId: 'foto', tag: 'Unical', name: 'Unical L Sun 300', order: 2,
    description: "Acqua calda sanitaria gratuita sfruttando l'energia del sole.",
    features: ['Circolazione naturale', 'Bollitore da 300 litri', 'Nessun consumo elettrico per il riscaldamento acqua', 'Garanzia 5 anni'],
    images: ['assets/img/solare-unical.jpg'], imageStyle: 'white', accent: '',
    datasheetUrl: '', documents: [],
    variants: [
      { label: 'Taglia unica', model: 'L Sun 300', price: 1590, priceNote: 'chiavi in mano' }
    ]
  }
];

async function importSeedCatalog(){
  const catBatch = db.batch();
  SEED_CATEGORIES.forEach(c => {
    catBatch.set(db.collection('categories').doc(c.id), { name: c.name, order: c.order });
  });
  SEED_BRANDS.forEach(b => {
    catBatch.set(db.collection('brands').doc(b.id), { name: b.name, categoryId: b.categoryId });
  });
  await catBatch.commit();

  for (const s of SEED_SERIES) {
    const prices = s.variants.map(v => v.price);
    const seriesRef = db.collection('series').doc(s.id);
    await seriesRef.set({
      categoryId: s.categoryId, tag: s.tag, name: s.name, description: s.description,
      features: s.features || [], images: s.images || [], imageStyle: s.imageStyle, accent: s.accent || '',
      datasheetUrl: s.datasheetUrl || '', documents: s.documents || [],
      minPrice: Math.min(...prices), variantCount: s.variants.length,
      order: s.order, active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const varBatch = db.batch();
    s.variants.forEach((v, i) => {
      const vRef = seriesRef.collection('variants').doc();
      varBatch.set(vRef, { label: v.label, model: v.model, price: v.price, priceNote: v.priceNote || '', order: i, active: true });
    });
    await varBatch.commit();
  }
}

async function fetchCategories(){
  if (!db) return SEED_CATEGORIES;
  try {
    const snap = await db.collection('categories').get();
    if (snap.empty) return SEED_CATEGORIES;
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    list.sort((a, b) => (a.order || 0) - (b.order || 0));
    return list;
  } catch (err) {
    console.warn('Categorie da Firestore non disponibili, uso quelle di base.', err);
    return SEED_CATEGORIES;
  }
}

async function fetchAllSeries(){
  if (!db) return flattenSeedSeries();
  try {
    const snap = await db.collection('series').where('active', '==', true).get();
    if (snap.empty) return flattenSeedSeries();
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    list.sort((a, b) => (a.order || 0) - (b.order || 0));
    return list;
  } catch (err) {
    console.warn('Modelli da Firestore non disponibili, uso quelli di base.', err);
    return flattenSeedSeries();
  }
}

function flattenSeedSeries(){
  return SEED_SERIES.map(s => {
    const prices = s.variants.map(v => v.price);
    return { ...s, minPrice: Math.min(...prices), variantCount: s.variants.length };
  });
}

async function fetchSeriesWithVariants(seriesId){
  if (!db) return seedSeriesById(seriesId);
  try {
    const doc = await db.collection('series').doc(seriesId).get();
    if (!doc.exists) return seedSeriesById(seriesId);
    const series = { id: doc.id, ...doc.data() };
    const varSnap = await db.collection('series').doc(seriesId).collection('variants').get();
    let variants = [];
    varSnap.forEach(v => variants.push({ id: v.id, ...v.data() }));
    variants = variants.filter(v => v.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (variants.length === 0) return seedSeriesById(seriesId);
    return { series, variants };
  } catch (err) {
    console.warn('Modello da Firestore non disponibile, provo con i dati di base.', err);
    return seedSeriesById(seriesId);
  }
}

function seedSeriesById(seriesId){
  const s = SEED_SERIES.find(x => x.id === seriesId);
  if (!s) return null;
  const variants = s.variants.map((v, i) => ({ id: 'seed-' + i, ...v }));
  return { series: s, variants };
}

function phClassFor(s){
  if (s.imageStyle === 'white') return 'ph-white';
  if (s.imageStyle === 'cover') return 'ph-cover';
  const accent = s.accent || 'cool';
  return `ph-${accent} ph-photo`;
}

function euro(n){
  return Number(n).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function seriesCardHTML(s){
  const phClass = phClassFor(s);
  const img = (s.images && s.images[0]) ? s.images[0] : '';
  const imgTag = img ? `<img src="${img}" alt="${s.name}">` : '';
  const priceLabel = (s.minPrice != null) ? `da ${euro(s.minPrice)}` : 'Prezzo su richiesta';
  return `
    <a class="product-card series-card" data-cat="${s.categoryId}" href="prodotto.html?id=${s.id}">
      <div class="ph ${phClass}">${imgTag}</div>
      <div class="body">
        <span class="tag">${s.tag || ''}</span>
        <h3>${s.name}</h3>
        <p>${s.description || ''}</p>
        <div class="price-row"><span class="price">${priceLabel}</span><span class="btn btn-outline btn-sm">Scopri</span></div>
      </div>
    </a>`;
}

async function renderProdottiPage(){
  const [categories, seriesAll] = await Promise.all([fetchCategories(), fetchAllSeries()]);
  const tabbar = document.getElementById('category-tabbar');
  const panelsWrap = document.getElementById('category-panels');
  if (!tabbar || !panelsWrap) return;

  tabbar.innerHTML = categories.map((c, i) =>
    `<button class="${i === 0 ? 'active' : ''}" data-tab="cat-${c.id}">${c.name}</button>`
  ).join('');

  panelsWrap.innerHTML = categories.map((c, i) => {
    const items = seriesAll.filter(s => s.categoryId === c.id);
    return `
      <div class="tab-panel ${i === 0 ? 'active' : ''}" id="cat-${c.id}">
        <div class="grid grid-3">
          ${items.map(seriesCardHTML).join('') || '<p style="color:var(--ink-300);">Nessun modello disponibile al momento in questa categoria.</p>'}
        </div>
      </div>`;
  }).join('');

  if (typeof initTabs === 'function') initTabs();
  if (typeof initReveal === 'function') initReveal();
}

async function renderShopPage(){
  const [categories, seriesAll] = await Promise.all([fetchCategories(), fetchAllSeries()]);
  const filterGroup = document.getElementById('shop-filter-categories');
  if (filterGroup) {
    filterGroup.innerHTML = categories.map(c => `<label><input type="checkbox" data-cat="${c.id}"> ${c.name}</label>`).join('');
  }
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  grid.innerHTML = seriesAll.map(s => seriesCardHTML(s)).join('');
  const countEl = document.querySelector('.shop-toolbar span');
  if (countEl) countEl.textContent = seriesAll.length + ' modelli disponibili';
  if (typeof initShopFilters === 'function') initShopFilters();
  if (typeof initReveal === 'function') initReveal();
}
