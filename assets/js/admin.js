/* ===========================================================
   COSYTEC — Pannello admin prodotti
   =========================================================== */

function euroFmt(n){
  return Number(n).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function showLogin(){
  document.getElementById('login-view').style.display = '';
  document.getElementById('dashboard-view').style.display = 'none';
}

const SUPER_ADMIN_EMAIL = 'giorgio.ge@hotmail.it';

function showDashboard(user){
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = '';
  document.getElementById('admin-email').textContent = user.email;
  loadCategoriesAdmin().then(loadBrandsAdmin).then(() => {
    resetSeriesForm();
    loadSeriesListAdmin();
  });

  const isSuperAdmin = (user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL;
  document.getElementById('tab-users-btn').style.display = isSuperAdmin ? '' : 'none';
}

function initAuth(){
  if (!auth) {
    const errorBox = document.getElementById('login-error');
    errorBox.textContent = 'Firebase non è ancora configurato: inserisci le credenziali in assets/js/firebase-config.js.';
    errorBox.style.display = 'block';
    document.getElementById('login-form').querySelector('button').disabled = true;
    return;
  }
  auth.onAuthStateChanged(user => {
    if (user) showDashboard(user);
    else showLogin();
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorBox = document.getElementById('login-error');
    errorBox.style.display = 'none';
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      errorBox.textContent = 'Accesso non riuscito: controlla email e password.';
      errorBox.style.display = 'block';
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

  document.getElementById('forgot-password-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const msgBox = document.getElementById('reset-message');
    const errorBox = document.getElementById('login-error');
    errorBox.style.display = 'none';

    if (!email) {
      msgBox.style.background = 'rgba(224,65,60,.1)';
      msgBox.style.color = '#e0413c';
      msgBox.textContent = 'Inserisci prima la tua email nel campo qui sopra, poi clicca di nuovo su "Password dimenticata?".';
      msgBox.style.display = '';
      return;
    }

    try {
      await auth.sendPasswordResetEmail(email);
      msgBox.style.background = 'rgba(31,157,99,.1)';
      msgBox.style.color = 'var(--success)';
      msgBox.textContent = `Ti abbiamo inviato un'email a ${email} con il link per reimpostare la password. Controlla anche nello spam.`;
      msgBox.style.display = '';
    } catch (err) {
      msgBox.style.background = 'rgba(224,65,60,.1)';
      msgBox.style.color = '#e0413c';
      msgBox.textContent = 'Invio non riuscito: verifica che l\'email sia corretta e registrata.';
      msgBox.style.display = '';
    }
  });
}

/* ===========================================================
   Gestione catalogo: Categorie
   =========================================================== */

let cachedCategories = [];
let editingCategoryId = null;

async function loadCategoriesAdmin(){
  const listEl = document.getElementById('categories-list');
  const catSelect = document.getElementById('s-category');
  const brandCatSelect = document.getElementById('brand-category');
  const snap = await db.collection('categories').get();
  let cats = [];
  snap.forEach(doc => cats.push({ id: doc.id, ...doc.data() }));
  cats.sort((a, b) => (a.order || 0) - (b.order || 0));
  cachedCategories = cats;

  listEl.innerHTML = cats.length ? cats.map(c => `
    <div class="admin-row" data-cat-id="${c.id}">
      <div class="admin-row-info">
        <b>${c.name}</b>
        <span>Ordine: ${c.order != null ? c.order : '-'}</span>
      </div>
      <div class="admin-row-actions">
        <button type="button" class="btn btn-outline btn-sm" onclick="editCategory('${c.id}')">Modifica</button>
        <button type="button" class="btn btn-sm" style="background:#e0413c;color:#fff;" onclick="deleteCategory('${c.id}')">Elimina</button>
      </div>
    </div>`).join('') : '<p style="color:var(--ink-300);">Nessuna categoria ancora. Aggiungine una dal form qui sotto.</p>';

  const optionsHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  catSelect.innerHTML = optionsHTML;
  brandCatSelect.innerHTML = optionsHTML;
}

function editCategory(id){
  const c = cachedCategories.find(x => x.id === id);
  if (!c) return;
  editingCategoryId = id;
  document.getElementById('cat-name').value = c.name || '';
  document.getElementById('cat-order').value = c.order != null ? c.order : '';
  document.getElementById('category-form-submit-btn').textContent = 'Salva modifiche';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteCategory(id){
  const [seriesInUse, brandsInUse] = await Promise.all([
    db.collection('series').where('categoryId', '==', id).limit(1).get(),
    db.collection('brands').where('categoryId', '==', id).limit(1).get()
  ]);
  if (!seriesInUse.empty || !brandsInUse.empty) {
    alert('Impossibile eliminare: ci sono ancora modelli o marchi in questa categoria. Sposta o elimina prima quegli elementi.');
    return;
  }
  if (!confirm('Eliminare definitivamente questa categoria?')) return;
  await db.collection('categories').doc(id).delete();
  editingCategoryId = null;
  loadCategoriesAdmin();
}

function initCategoryForm(){
  document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('cat-name').value.trim(),
      order: parseInt(document.getElementById('cat-order').value) || 0
    };
    if (editingCategoryId) {
      await db.collection('categories').doc(editingCategoryId).update(data);
      editingCategoryId = null;
    } else {
      await db.collection('categories').add(data);
    }
    document.getElementById('category-form').reset();
    document.getElementById('category-form-submit-btn').textContent = 'Aggiungi categoria';
    loadCategoriesAdmin();
  });
}

/* ===========================================================
   Gestione catalogo: Marchi
   =========================================================== */

let cachedBrands = [];
let editingBrandId = null;

async function loadBrandsAdmin(){
  const listEl = document.getElementById('brands-list');
  const snap = await db.collection('brands').get();
  let brands = [];
  snap.forEach(doc => brands.push({ id: doc.id, ...doc.data() }));
  brands.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  cachedBrands = brands;

  listEl.innerHTML = brands.length ? brands.map(b => {
    const catName = (cachedCategories.find(c => c.id === b.categoryId) || {}).name || '—';
    return `
    <div class="admin-row" data-brand-id="${b.id}">
      <div class="admin-row-info">
        <b>${b.name}</b>
        <span>${catName}</span>
      </div>
      <div class="admin-row-actions">
        <button type="button" class="btn btn-outline btn-sm" onclick="editBrand('${b.id}')">Modifica</button>
        <button type="button" class="btn btn-sm" style="background:#e0413c;color:#fff;" onclick="deleteBrand('${b.id}')">Elimina</button>
      </div>
    </div>`;
  }).join('') : '<p style="color:var(--ink-300);">Nessun marchio ancora. Aggiungine uno dal form qui sotto.</p>';
}

function editBrand(id){
  const b = cachedBrands.find(x => x.id === id);
  if (!b) return;
  editingBrandId = id;
  document.getElementById('brand-name').value = b.name || '';
  document.getElementById('brand-category').value = b.categoryId || '';
  document.getElementById('brand-form-submit-btn').textContent = 'Salva modifiche';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteBrand(id){
  if (!confirm('Eliminare definitivamente questo marchio?')) return;
  await db.collection('brands').doc(id).delete();
  if (editingBrandId === id) editingBrandId = null;
  await loadBrandsAdmin();
  populateTagSelect(document.getElementById('s-category').value, document.getElementById('s-tag').value);
}

function initBrandForm(){
  document.getElementById('brand-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('brand-name').value.trim(),
      categoryId: document.getElementById('brand-category').value
    };
    if (editingBrandId) {
      await db.collection('brands').doc(editingBrandId).update(data);
      editingBrandId = null;
    } else {
      await db.collection('brands').add(data);
    }
    document.getElementById('brand-form').reset();
    document.getElementById('brand-form-submit-btn').textContent = 'Aggiungi marchio';
    await loadBrandsAdmin();
    populateTagSelect(document.getElementById('s-category').value, document.getElementById('s-tag').value);
  });
}

function populateTagSelect(categoryId, selectedValue){
  const tagSelect = document.getElementById('s-tag');
  const brands = cachedBrands.filter(b => b.categoryId === categoryId).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  let options = brands.map(b => `<option value="${b.name}">${b.name}</option>`);
  if (selectedValue && !brands.some(b => b.name === selectedValue)) {
    options.push(`<option value="${selectedValue}">${selectedValue} (non in elenco marchi)</option>`);
  }
  tagSelect.innerHTML = options.length ? options.join('') : '<option value="">Nessun marchio per questa categoria</option>';
  if (selectedValue) tagSelect.value = selectedValue;
}

/* ===========================================================
   Gestione catalogo: Modelli / Serie
   =========================================================== */

let editingSeriesId = null;

function rowInputStyle(){
  return 'padding:10px 14px; border-radius:var(--radius-sm); border:1.5px solid var(--ink-100); font-size:13.5px; font-family:inherit; background:var(--paper-50); color:var(--ink-800);';
}

function addImageRow(url){
  const wrap = document.getElementById('s-images-rows');
  const row = document.createElement('div');
  row.className = 'img-row';
  row.style.cssText = 'display:flex; gap:8px; margin-bottom:8px;';
  row.innerHTML = `
    <input type="url" class="s-image-url" placeholder="https://..." value="${url || ''}" style="flex:1; ${rowInputStyle()}">
    <button type="button" class="btn btn-sm remove-row-btn" style="background:#e0413c;color:#fff;">✕</button>`;
  row.querySelector('.remove-row-btn').addEventListener('click', () => row.remove());
  wrap.appendChild(row);
}

function addDocRow(label, url){
  const wrap = document.getElementById('s-docs-rows');
  const row = document.createElement('div');
  row.className = 'doc-row';
  row.style.cssText = 'display:flex; gap:8px; margin-bottom:8px;';
  row.innerHTML = `
    <input type="text" class="s-doc-label" placeholder="Es. Dichiarazione conformità" value="${label || ''}" style="flex:1; ${rowInputStyle()}">
    <input type="url" class="s-doc-url" placeholder="https://..." value="${url || ''}" style="flex:1.4; ${rowInputStyle()}">
    <button type="button" class="btn btn-sm remove-row-btn" style="background:#e0413c;color:#fff;">✕</button>`;
  row.querySelector('.remove-row-btn').addEventListener('click', () => row.remove());
  wrap.appendChild(row);
}

function resetSeriesForm(){
  editingSeriesId = null;
  document.getElementById('series-form').reset();
  document.getElementById('s-images-rows').innerHTML = '';
  document.getElementById('s-docs-rows').innerHTML = '';
  addImageRow();
  populateTagSelect(document.getElementById('s-category').value, '');
  document.getElementById('series-form-title').textContent = 'Aggiungi nuovo modello';
  document.getElementById('series-submit-btn').textContent = 'Aggiungi modello';
  document.getElementById('series-cancel-btn').style.display = 'none';
}

async function loadSeriesListAdmin(){
  const listEl = document.getElementById('series-list');
  listEl.innerHTML = '<p style="color:var(--ink-300);">Caricamento...</p>';
  const snap = await db.collection('series').get();
  let list = [];
  snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
  if (list.length === 0) {
    listEl.innerHTML = '<p style="color:var(--ink-300);">Nessun modello ancora. Aggiungine uno dal form, oppure importa il catalogo di esempio.</p>';
    return;
  }
  list.sort((a, b) => {
    const catA = cachedCategories.findIndex(c => c.id === a.categoryId);
    const catB = cachedCategories.findIndex(c => c.id === b.categoryId);
    if (catA !== catB) return catA - catB;
    return (a.order || 0) - (b.order || 0);
  });

  listEl.innerHTML = list.map(s => seriesRowHTML(s)).join('');
}

function seriesRowHTML(s){
  const catName = (cachedCategories.find(c => c.id === s.categoryId) || {}).name || s.categoryId || '—';
  const img = (s.images && s.images[0]) ? s.images[0] : '';
  const thumb = img ? `<img src="${img}" alt="" onerror="this.style.opacity=0.2">` : `<div class="slot-placeholder"><i class="fa-solid fa-image"></i></div>`;
  return `
    <div class="admin-row" data-series-id="${s.id}" style="flex-wrap:wrap;">
      ${thumb}
      <div class="admin-row-info">
        <b>${s.name}</b>
        <span>${seriesRowSummary(s, catName)}</span>
      </div>
      <div class="admin-row-actions">
        <button type="button" class="btn btn-outline btn-sm" onclick="toggleVariantsPanel('${s.id}')">Varianti</button>
        <button type="button" class="btn btn-outline btn-sm" onclick="editSeries('${s.id}')">Modifica</button>
        <button type="button" class="btn btn-outline btn-sm" onclick="toggleSeriesActive('${s.id}', ${s.active === false})">${s.active === false ? 'Mostra' : 'Nascondi'}</button>
        <button type="button" class="btn btn-sm" style="background:#e0413c;color:#fff;" onclick="deleteSeries('${s.id}')">Elimina</button>
      </div>
      <div class="variants-panel" id="variants-panel-${s.id}" style="display:none; width:100%; margin-top:14px; padding:16px; background:var(--paper-50); border-radius:var(--radius-sm);"></div>
    </div>`;
}

function seriesRowSummary(s, catName){
  const priceLabel = s.minPrice != null ? `da ${euroFmt(s.minPrice)}` : 'Nessuna variante';
  const count = s.variantCount || 0;
  return `${catName} · ${s.tag || ''} · ${priceLabel} · ${count} variant${count === 1 ? 'e' : 'i'} ${s.active === false ? '· <em>Nascosto</em>' : ''}`;
}

async function refreshSeriesRowSummary(seriesId){
  const doc = await db.collection('series').doc(seriesId).get();
  if (!doc.exists) return;
  const s = { id: doc.id, ...doc.data() };
  const row = document.querySelector(`.admin-row[data-series-id="${seriesId}"]`);
  if (!row) return;
  const catName = (cachedCategories.find(c => c.id === s.categoryId) || {}).name || s.categoryId || '—';
  const infoSpan = row.querySelector('.admin-row-info span');
  if (infoSpan) infoSpan.innerHTML = seriesRowSummary(s, catName);
}

async function editSeries(id){
  const doc = await db.collection('series').doc(id).get();
  if (!doc.exists) return;
  const s = doc.data();
  editingSeriesId = id;
  document.getElementById('s-name').value = s.name || '';
  document.getElementById('s-category').value = s.categoryId || '';
  populateTagSelect(s.categoryId || document.getElementById('s-category').value, s.tag || '');
  document.getElementById('s-order').value = s.order != null ? s.order : '';
  document.getElementById('s-description').value = s.description || '';
  document.getElementById('s-features').value = (s.features || []).join('\n');
  document.getElementById('s-imageStyle').value = s.imageStyle || 'white';
  document.getElementById('s-accent').value = s.accent || 'cool';
  document.getElementById('s-datasheetUrl').value = s.datasheetUrl || '';

  document.getElementById('s-images-rows').innerHTML = '';
  const images = (s.images && s.images.length) ? s.images : [''];
  images.forEach(img => addImageRow(img));

  document.getElementById('s-docs-rows').innerHTML = '';
  (s.documents || []).forEach(d => addDocRow(d.label, d.url));

  document.getElementById('series-form-title').textContent = 'Modifica modello';
  document.getElementById('series-submit-btn').textContent = 'Salva modifiche';
  document.getElementById('series-cancel-btn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function toggleSeriesActive(id, newState){
  await db.collection('series').doc(id).update({ active: newState });
  loadSeriesListAdmin();
}

async function deleteSeries(id){
  if (!confirm('Eliminare definitivamente questo modello e tutte le sue varianti?')) return;
  const varSnap = await db.collection('series').doc(id).collection('variants').get();
  const batch = db.batch();
  varSnap.forEach(v => batch.delete(v.ref));
  batch.delete(db.collection('series').doc(id));
  await batch.commit();
  loadSeriesListAdmin();
}

function initSeriesForm(){
  document.getElementById('s-category').addEventListener('change', () => {
    populateTagSelect(document.getElementById('s-category').value, '');
  });
  document.getElementById('add-image-row-btn').addEventListener('click', () => addImageRow());
  document.getElementById('add-doc-row-btn').addEventListener('click', () => addDocRow());

  document.getElementById('series-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const images = Array.from(document.querySelectorAll('#s-images-rows .s-image-url'))
      .map(i => i.value.trim()).filter(Boolean);
    const documents = Array.from(document.querySelectorAll('#s-docs-rows .doc-row')).map(row => ({
      label: row.querySelector('.s-doc-label').value.trim(),
      url: row.querySelector('.s-doc-url').value.trim()
    })).filter(d => d.label && d.url);
    const features = document.getElementById('s-features').value.split('\n').map(f => f.trim()).filter(Boolean);

    const data = {
      name: document.getElementById('s-name').value.trim(),
      tag: document.getElementById('s-tag').value.trim(),
      categoryId: document.getElementById('s-category').value,
      order: parseInt(document.getElementById('s-order').value) || 0,
      description: document.getElementById('s-description').value.trim(),
      features,
      images,
      imageStyle: document.getElementById('s-imageStyle').value,
      accent: document.getElementById('s-accent').value,
      datasheetUrl: document.getElementById('s-datasheetUrl').value.trim(),
      documents,
      active: true
    };

    if (editingSeriesId) {
      await db.collection('series').doc(editingSeriesId).update(data);
    } else {
      data.minPrice = null;
      data.variantCount = 0;
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('series').add(data);
    }
    resetSeriesForm();
    loadSeriesListAdmin();
  });

  document.getElementById('series-cancel-btn').addEventListener('click', resetSeriesForm);

  document.getElementById('seed-btn').addEventListener('click', async () => {
    if (!confirm('Importare il catalogo di esempio? Questa operazione può creare doppioni se lo hai già importato in precedenza.')) return;
    await importSeedCatalog();
    await loadCategoriesAdmin();
    loadSeriesListAdmin();
  });
}

/* ===========================================================
   Anteprima pagina prodotto (dati non ancora salvati)
   =========================================================== */

function buildPreviewSeriesFromForm(){
  const images = Array.from(document.querySelectorAll('#s-images-rows .s-image-url'))
    .map(i => i.value.trim()).filter(Boolean);
  const documents = Array.from(document.querySelectorAll('#s-docs-rows .doc-row')).map(row => ({
    label: row.querySelector('.s-doc-label').value.trim(),
    url: row.querySelector('.s-doc-url').value.trim()
  })).filter(d => d.label && d.url);
  const features = document.getElementById('s-features').value.split('\n').map(f => f.trim()).filter(Boolean);

  return {
    id: editingSeriesId || 'preview',
    name: document.getElementById('s-name').value.trim() || 'Nome modello',
    tag: document.getElementById('s-tag').value.trim(),
    categoryId: document.getElementById('s-category').value,
    description: document.getElementById('s-description').value.trim(),
    features,
    images,
    imageStyle: document.getElementById('s-imageStyle').value,
    accent: document.getElementById('s-accent').value,
    datasheetUrl: document.getElementById('s-datasheetUrl').value.trim(),
    documents
  };
}

async function openSeriesPreview(){
  const series = buildPreviewSeriesFromForm();

  let variants = [];
  if (editingSeriesId) {
    const snap = await db.collection('series').doc(editingSeriesId).collection('variants').get();
    snap.forEach(v => variants.push({ id: v.id, ...v.data() }));
    variants = variants.filter(v => v.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  if (variants.length === 0) {
    variants = [{ id: 'preview', label: 'Es. 9.000 BTU', model: 'Aggiungi almeno una variante per vederla qui', price: null, priceNote: '' }];
  }

  const phClass = phClassFor(series);
  const wrap = document.getElementById('preview-detail-wrap');
  wrap.innerHTML = detailGalleryHTML(series, phClass) + detailInfoHTML(series, variants);
  wireVariantSelector(series, variants);
  wireGalleryThumbs();

  document.getElementById('preview-modal').classList.add('open');
}

function initPreviewModal(){
  document.getElementById('preview-btn').addEventListener('click', openSeriesPreview);
  const close = () => document.getElementById('preview-modal').classList.remove('open');
  document.getElementById('preview-close-btn').addEventListener('click', close);
  document.querySelector('.preview-modal-backdrop').addEventListener('click', close);
}

/* ===========================================================
   Gestione catalogo: Varianti (per ogni modello)
   =========================================================== */

async function toggleVariantsPanel(seriesId){
  const panel = document.getElementById(`variants-panel-${seriesId}`);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  document.querySelectorAll('.variants-panel').forEach(p => { if (p !== panel) p.style.display = 'none'; });
  if (isOpen) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';
  renderVariantForm(seriesId, panel);
  loadVariantsAdmin(seriesId);
}

function renderVariantForm(seriesId, panel){
  panel.innerHTML = `
    <div id="variants-list-${seriesId}"><p style="color:var(--ink-300); font-size:13px;">Caricamento varianti...</p></div>
    <form class="variant-form" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; align-items:end;">
      <input type="hidden" class="v-editing-id" value="">
      <div class="field" style="margin:0; flex:1; min-width:120px;">
        <label style="font-size:12px;">Etichetta (es. 9.000 BTU)</label>
        <input type="text" class="v-label" required>
      </div>
      <div class="field" style="margin:0; flex:1.4; min-width:160px;">
        <label style="font-size:12px;">Modello esatto</label>
        <input type="text" class="v-model" required>
      </div>
      <div class="field" style="margin:0; width:110px;">
        <label style="font-size:12px;">Prezzo €</label>
        <input type="number" class="v-price" required>
      </div>
      <div class="field" style="margin:0; flex:1; min-width:140px;">
        <label style="font-size:12px;">Nota prezzo</label>
        <input type="text" class="v-priceNote" placeholder="Es. installazione esclusa">
      </div>
      <button type="submit" class="btn btn-primary btn-sm v-submit-btn">Aggiungi variante</button>
      <button type="button" class="btn btn-outline btn-sm v-cancel-btn" style="display:none;">Annulla</button>
    </form>`;

  const form = panel.querySelector('.variant-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editingVId = form.querySelector('.v-editing-id').value;
    const data = {
      label: form.querySelector('.v-label').value.trim(),
      model: form.querySelector('.v-model').value.trim(),
      price: parseFloat(form.querySelector('.v-price').value) || 0,
      priceNote: form.querySelector('.v-priceNote').value.trim(),
      active: true
    };
    const seriesRef = db.collection('series').doc(seriesId);
    if (editingVId) {
      await seriesRef.collection('variants').doc(editingVId).update(data);
    } else {
      const countSnap = await seriesRef.collection('variants').get();
      data.order = countSnap.size;
      await seriesRef.collection('variants').add(data);
    }
    await recomputeSeriesAggregates(seriesId);
    form.reset();
    form.querySelector('.v-editing-id').value = '';
    form.querySelector('.v-submit-btn').textContent = 'Aggiungi variante';
    panel.querySelector('.v-cancel-btn').style.display = 'none';
    loadVariantsAdmin(seriesId);
  });

  panel.querySelector('.v-cancel-btn').addEventListener('click', () => {
    form.reset();
    form.querySelector('.v-editing-id').value = '';
    form.querySelector('.v-submit-btn').textContent = 'Aggiungi variante';
    panel.querySelector('.v-cancel-btn').style.display = 'none';
  });
}

async function loadVariantsAdmin(seriesId){
  const listEl = document.getElementById(`variants-list-${seriesId}`);
  if (!listEl) return;
  const snap = await db.collection('series').doc(seriesId).collection('variants').get();
  let variants = [];
  snap.forEach(v => variants.push({ id: v.id, ...v.data() }));
  variants.sort((a, b) => (a.order || 0) - (b.order || 0));
  if (variants.length === 0) {
    listEl.innerHTML = '<p style="color:var(--ink-300); font-size:13px;">Nessuna variante ancora. Aggiungine una dal form qui sotto.</p>';
    return;
  }
  listEl.innerHTML = variants.map(v => `
    <div class="admin-row" data-vid="${v.id}" style="padding:10px 14px;">
      <div class="admin-row-info">
        <b>${v.label} — ${v.model}</b>
        <span>${euroFmt(v.price)} ${v.priceNote ? '· ' + v.priceNote : ''} ${v.active === false ? '· <em>Nascosta</em>' : ''}</span>
      </div>
      <div class="admin-row-actions">
        <button type="button" class="btn btn-outline btn-sm" onclick="editVariant('${seriesId}','${v.id}')">Modifica</button>
        <button type="button" class="btn btn-outline btn-sm" onclick="toggleVariantActive('${seriesId}','${v.id}', ${v.active === false})">${v.active === false ? 'Mostra' : 'Nascondi'}</button>
        <button type="button" class="btn btn-sm" style="background:#e0413c;color:#fff;" onclick="deleteVariant('${seriesId}','${v.id}')">Elimina</button>
      </div>
    </div>`).join('');
}

async function editVariant(seriesId, variantId){
  const doc = await db.collection('series').doc(seriesId).collection('variants').doc(variantId).get();
  if (!doc.exists) return;
  const v = doc.data();
  const panel = document.getElementById(`variants-panel-${seriesId}`);
  const form = panel.querySelector('.variant-form');
  form.querySelector('.v-editing-id').value = variantId;
  form.querySelector('.v-label').value = v.label || '';
  form.querySelector('.v-model').value = v.model || '';
  form.querySelector('.v-price').value = v.price != null ? v.price : '';
  form.querySelector('.v-priceNote').value = v.priceNote || '';
  form.querySelector('.v-submit-btn').textContent = 'Salva modifiche';
  panel.querySelector('.v-cancel-btn').style.display = '';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function toggleVariantActive(seriesId, variantId, newState){
  await db.collection('series').doc(seriesId).collection('variants').doc(variantId).update({ active: newState });
  await recomputeSeriesAggregates(seriesId);
  loadVariantsAdmin(seriesId);
}

async function deleteVariant(seriesId, variantId){
  if (!confirm('Eliminare definitivamente questa variante?')) return;
  await db.collection('series').doc(seriesId).collection('variants').doc(variantId).delete();
  await recomputeSeriesAggregates(seriesId);
  loadVariantsAdmin(seriesId);
}

async function recomputeSeriesAggregates(seriesId){
  const seriesRef = db.collection('series').doc(seriesId);
  const snap = await seriesRef.collection('variants').get();
  let variants = [];
  snap.forEach(v => variants.push({ id: v.id, ...v.data() }));
  const activeVariants = variants.filter(v => v.active !== false);
  const prices = activeVariants.map(v => v.price).filter(p => p != null);
  await seriesRef.update({
    minPrice: prices.length ? Math.min(...prices) : null,
    variantCount: activeVariants.length
  });
  await refreshSeriesRowSummary(seriesId);
}

/* ===========================================================
   Gestione immagini del sito
   =========================================================== */

const IMAGE_SLOTS = {
  'home': [
    { key: 'home-01', label: 'Foto copertina (hero)' },
    { key: 'home-02', label: 'Galleria anteprima 1' },
    { key: 'home-03', label: 'Galleria anteprima 2' },
    { key: 'home-04', label: 'Galleria anteprima 3' },
    { key: 'home-05', label: 'Galleria anteprima 4' }
  ],
  'chi-siamo': [
    { key: 'chi-siamo-01', label: 'Foto vetrina negozio' }
  ],
  'galleria': Array.from({ length: 15 }, (_, i) => ({
    key: `galleria-${String(i + 1).padStart(2, '0')}`,
    label: `Foto lavoro ${i + 1}`
  }))
};

function initAdminTabs(){
  const buttons = document.querySelectorAll('.tabbar button');
  const panels = document.querySelectorAll('.admin-panel');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel).style.display = 'block';
      if (btn.dataset.panel === 'panel-images') loadImageSlots();
    });
  });
}

async function loadImageSlots(){
  const page = document.getElementById('image-page-select').value;
  const slots = IMAGE_SLOTS[page] || [];
  const listEl = document.getElementById('image-slots-list');
  listEl.innerHTML = '<p style="color:var(--ink-300);">Caricamento...</p>';

  let overrides = {};
  try {
    const snap = await db.collection('site_images').where('page', '==', page).get();
    snap.forEach(doc => { overrides[doc.id] = doc.data(); });
  } catch (err) {
    listEl.innerHTML = '<p style="color:#e0413c;">Impossibile leggere le immagini personalizzate: verifica di aver aggiornato le regole di sicurezza Firestore per la collezione "site_images" (vedi istruzioni ricevute).</p>';
    return;
  }

  listEl.innerHTML = slots.map(slot => {
    const ov = overrides[slot.key];
    const thumb = (ov && ov.url)
      ? `<img src="${ov.url}" alt="">`
      : `<div class="slot-placeholder"><i class="fa-solid fa-image"></i></div>`;
    const badge = (ov && ov.url)
      ? `<small class="badge-custom">Personalizzata</small>`
      : `<small class="badge-default">Immagine di default</small>`;
    return `
      <div class="admin-row" data-slot="${slot.key}" style="align-items:flex-start; flex-wrap:wrap;">
        ${thumb}
        <div class="admin-row-info" style="flex-basis:200px;">
          <b>${slot.label}</b>
          <span>${slot.key}</span><br>
          ${badge}
        </div>
        <div class="admin-row-actions" style="flex:1; min-width:260px; align-items:center;">
          <input type="url" placeholder="https://..." value="${(ov && ov.url) ? ov.url : ''}" style="flex:1; min-width:180px; padding:10px 14px; border-radius:var(--radius-sm); border:1.5px solid var(--ink-100); font-size:13.5px;">
          <button class="btn btn-primary btn-sm" onclick="saveSlotImageUrl('${page}','${slot.key}', this)">Salva</button>
          ${(ov && ov.url) ? `<button class="btn btn-sm" style="background:#e0413c;color:#fff;" onclick="resetSlotImage('${slot.key}')">Ripristina originale</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

async function saveSlotImageUrl(page, slotKey, btn){
  const row = document.querySelector(`.admin-row[data-slot="${slotKey}"]`);
  const input = row.querySelector('input[type=url]');
  const url = input.value.trim();
  if (!url) { alert('Incolla prima un link a un\'immagine.'); return; }

  btn.disabled = true;
  btn.textContent = 'Salvo...';
  try {
    await db.collection('site_images').doc(slotKey).set({
      page, slotKey, url,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    loadImageSlots();
  } catch (err) {
    alert('Salvataggio non riuscito: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Salva';
  }
}

async function resetSlotImage(slotKey){
  if (!confirm('Ripristinare l\'immagine originale per questo spazio?')) return;
  await db.collection('site_images').doc(slotKey).delete();
  loadImageSlots();
}

function initImagesPanel(){
  document.getElementById('image-page-select').addEventListener('change', loadImageSlots);
}

/* ===========================================================
   Gestione utenti (solo super-admin)
   =========================================================== */

function generateTempPassword(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

function initUserManagement(){
  document.getElementById('gen-password-btn').addEventListener('click', () => {
    document.getElementById('new-user-password').value = generateTempPassword();
  });

  document.getElementById('create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('new-user-email').value.trim();
    const password = document.getElementById('new-user-password').value;
    const msgBox = document.getElementById('user-create-message');
    const submitBtn = e.target.querySelector('button[type=submit]');

    msgBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creazione in corso...';

    // Si usa un'app Firebase secondaria temporanea per non sostituire
    // la sessione dell'amministratore con quella del nuovo utente.
    const secondaryApp = firebase.initializeApp(firebaseConfig, 'Secondary-' + Date.now());
    try {
      await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
      await secondaryApp.auth().signOut();

      msgBox.style.background = 'rgba(31,157,99,.1)';
      msgBox.style.color = 'var(--success)';
      msgBox.textContent = `Utente creato: ${email}. Comunicagli email e password per il primo accesso.`;
      msgBox.style.display = '';
      document.getElementById('create-user-form').reset();
    } catch (err) {
      let text = 'Creazione non riuscita.';
      if (err.code === 'auth/email-already-in-use') text = 'Esiste già un utente con questa email.';
      if (err.code === 'auth/weak-password') text = 'Password troppo debole: usa almeno 6 caratteri.';
      if (err.code === 'auth/invalid-email') text = 'Email non valida.';
      msgBox.style.background = 'rgba(224,65,60,.1)';
      msgBox.style.color = '#e0413c';
      msgBox.textContent = text;
      msgBox.style.display = '';
    } finally {
      await secondaryApp.delete();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crea utente';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initCategoryForm();
  initBrandForm();
  initSeriesForm();
  initPreviewModal();
  initAdminTabs();
  initImagesPanel();
  initUserManagement();
});
