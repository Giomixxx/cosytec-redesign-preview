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

/* ===========================================================
   Upload file (immagini/PDF) tramite l'endpoint PHP su Aruba
   =========================================================== */

const UPLOAD_ENDPOINT = 'https://upload.cosytec.it/upload.php';

async function uploadFileToServer(file){
  const token = await auth.currentUser.getIdToken();
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Caricamento non riuscito.');
  return data.url;
}

function wireFileUpload(fileInput, label, urlInput){
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const originalHTML = label.innerHTML;
    label.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try {
      urlInput.value = await uploadFileToServer(file);
    } catch (err) {
      alert('Caricamento non riuscito: ' + err.message);
    } finally {
      label.innerHTML = originalHTML;
      fileInput.value = '';
    }
  });
}

function addImageRow(url){
  const wrap = document.getElementById('s-images-rows');
  const row = document.createElement('div');
  row.className = 'img-row';
  row.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
  row.innerHTML = `
    <input type="url" class="s-image-url" placeholder="https://... oppure carica un file" value="${url || ''}" style="flex:1; ${rowInputStyle()}">
    <label class="upload-label" style="margin:0;">
      <i class="fa-solid fa-upload"></i>
      <input type="file" class="s-image-file" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;">
    </label>
    <button type="button" class="btn btn-sm remove-row-btn" style="background:#e0413c;color:#fff;">✕</button>`;
  row.querySelector('.remove-row-btn').addEventListener('click', () => row.remove());
  wireFileUpload(row.querySelector('.s-image-file'), row.querySelector('.upload-label'), row.querySelector('.s-image-url'));
  wrap.appendChild(row);
}

function addDocRow(label, url){
  const wrap = document.getElementById('s-docs-rows');
  const row = document.createElement('div');
  row.className = 'doc-row';
  row.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
  row.innerHTML = `
    <input type="text" class="s-doc-label" placeholder="Es. Dichiarazione conformità" value="${label || ''}" style="flex:1; ${rowInputStyle()}">
    <input type="url" class="s-doc-url" placeholder="https://... oppure carica un file" value="${url || ''}" style="flex:1.4; ${rowInputStyle()}">
    <label class="upload-label" style="margin:0;">
      <i class="fa-solid fa-upload"></i>
      <input type="file" class="s-doc-file" accept="application/pdf,image/jpeg,image/png,image/webp" style="display:none;">
    </label>
    <button type="button" class="btn btn-sm remove-row-btn" style="background:#e0413c;color:#fff;">✕</button>`;
  row.querySelector('.remove-row-btn').addEventListener('click', () => row.remove());
  wireFileUpload(row.querySelector('.s-doc-file'), row.querySelector('.upload-label'), row.querySelector('.s-doc-url'));
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
  const featuredBadge = s.featured === true ? ' · <b style="color:var(--flame-600);">★ In evidenza</b>' : '';
  return `${catName} · ${s.tag || ''} · ${priceLabel} · ${count} variant${count === 1 ? 'e' : 'i'} ${s.active === false ? '· <em>Nascosto</em>' : ''}${featuredBadge}`;
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
  document.getElementById('s-longDescription').value = s.longDescription || '';
  document.getElementById('s-featured').checked = s.featured === true;
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
  const datasheetFileInput = document.getElementById('s-datasheet-file');
  wireFileUpload(datasheetFileInput, datasheetFileInput.closest('label.upload-label'), document.getElementById('s-datasheetUrl'));

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
      longDescription: document.getElementById('s-longDescription').value.trim(),
      featured: document.getElementById('s-featured').checked,
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
    longDescription: document.getElementById('s-longDescription').value.trim(),
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
  document.getElementById('preview-long-description').innerHTML = longDescriptionHTML(series);
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
      <div class="field" style="margin:0; width:150px;">
        <label style="font-size:12px;">Prezzo con Conto Termico 3.0 € (facoltativo)</label>
        <input type="number" class="v-ctPrice" placeholder="Es. 700">
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
    const ctPriceRaw = form.querySelector('.v-ctPrice').value.trim();
    const data = {
      label: form.querySelector('.v-label').value.trim(),
      model: form.querySelector('.v-model').value.trim(),
      price: parseFloat(form.querySelector('.v-price').value) || 0,
      ctPrice: ctPriceRaw ? parseFloat(ctPriceRaw) : null,
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
        <span>${euroFmt(v.price)} ${v.ctPrice != null ? `· <b style="color:var(--success);">${euroFmt(v.ctPrice)} con CT 3.0</b>` : ''} ${v.priceNote ? '· ' + v.priceNote : ''} ${v.active === false ? '· <em>Nascosta</em>' : ''}</span>
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
  form.querySelector('.v-ctPrice').value = v.ctPrice != null ? v.ctPrice : '';
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
  const ctPrices = activeVariants.map(v => v.ctPrice).filter(p => p != null);
  await seriesRef.update({
    minPrice: prices.length ? Math.min(...prices) : null,
    minCtPrice: ctPrices.length ? Math.min(...ctPrices) : null,
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

/* ===========================================================
   Offerte del momento
   =========================================================== */

let cachedOffers = [];
let editingOfferId = null;
let offerImageData = '';

function setOfferImage(url){
  offerImageData = url || '';
  const prev = document.getElementById('o-image-preview');
  prev.src = offerImageData;
  prev.style.display = offerImageData ? '' : 'none';
  document.getElementById('o-image-remove').style.display = offerImageData ? '' : 'none';
}

function resetOfferForm(){
  editingOfferId = null;
  document.getElementById('offer-form').reset();
  document.getElementById('o-active').checked = true;
  setOfferImage('');
  document.getElementById('offer-form-title').textContent = 'Nuova offerta';
  document.getElementById('offer-submit-btn').textContent = 'Aggiungi offerta';
  document.getElementById('offer-cancel-btn').style.display = 'none';
}

function offerRulesError(err){
  return err && err.code === 'permission-denied'
    ? 'Permesso negato da Firebase: per usare le Offerte vanno aggiornate le regole di sicurezza Firestore (collezione "offers").'
    : (err && err.message) || 'Errore sconosciuto.';
}

async function loadOffersAdmin(){
  const listEl = document.getElementById('offers-list');
  listEl.innerHTML = '<p style="color:var(--ink-300);">Caricamento...</p>';
  try {
    const snap = await db.collection('offers').get();
    cachedOffers = [];
    snap.forEach(d => cachedOffers.push({ id: d.id, ...d.data() }));
  } catch (err) {
    listEl.innerHTML = `<p style="color:#e0413c;">${escapeHTML(offerRulesError(err))}</p>`;
    return;
  }
  cachedOffers.sort((a, b) => (a.order || 0) - (b.order || 0));
  listEl.innerHTML = cachedOffers.length ? cachedOffers.map(o => {
    const expired = o.expiresAt && new Date(o.expiresAt + 'T23:59:59') < new Date();
    const status = o.active === false
      ? '<small class="badge-default">Disattivata</small>'
      : expired ? '<small class="badge-default">Scaduta</small>' : '<small class="badge-custom">Visibile in Home</small>';
    const thumb = o.imageUrl ? `<img src="${escapeHTML(o.imageUrl)}" alt="">` : '<div class="slot-placeholder"><i class="fa-solid fa-fire"></i></div>';
    const meta = [
      o.price != null ? euroFmt(o.price) : '',
      o.expiresAt ? 'fino al ' + o.expiresAt.split('-').reverse().join('/') : 'senza scadenza'
    ].filter(Boolean).join(' · ');
    return `
      <div class="admin-row">
        ${thumb}
        <div class="admin-row-info">
          <b>${escapeHTML(o.title)}</b>
          <span>${meta}</span><br>${status}
        </div>
        <div class="admin-row-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="editOffer('${o.id}')">Modifica</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="toggleOfferActive('${o.id}', ${o.active === false})">${o.active === false ? 'Attiva' : 'Disattiva'}</button>
          <button type="button" class="btn btn-sm" style="background:#e0413c;color:#fff;" onclick="deleteOffer('${o.id}')">Elimina</button>
        </div>
      </div>`;
  }).join('') : '<p style="color:var(--ink-300);">Nessuna offerta ancora. Creane una dal form qui sopra.</p>';
}

function editOffer(id){
  const o = cachedOffers.find(x => x.id === id);
  if (!o) return;
  editingOfferId = id;
  document.getElementById('o-title').value = o.title || '';
  document.getElementById('o-description').value = o.description || '';
  document.getElementById('o-badge').value = o.badge || '';
  document.getElementById('o-expiresAt').value = o.expiresAt || '';
  document.getElementById('o-price').value = o.price != null ? o.price : '';
  document.getElementById('o-oldPrice').value = o.oldPrice != null ? o.oldPrice : '';
  document.getElementById('o-priceNote').value = o.priceNote || '';
  document.getElementById('o-linkUrl').value = o.linkUrl || '';
  document.getElementById('o-order').value = o.order != null ? o.order : '';
  document.getElementById('o-active').checked = o.active !== false;
  setOfferImage(o.imageUrl || '');
  document.getElementById('offer-form-title').textContent = 'Modifica offerta';
  document.getElementById('offer-submit-btn').textContent = 'Salva modifiche';
  document.getElementById('offer-cancel-btn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function toggleOfferActive(id, newState){
  try {
    await db.collection('offers').doc(id).update({ active: newState });
    loadOffersAdmin();
  } catch (err) {
    alert('Operazione non riuscita: ' + offerRulesError(err));
  }
}

async function deleteOffer(id){
  if (!confirm('Eliminare definitivamente questa offerta?')) return;
  try {
    await db.collection('offers').doc(id).delete();
    if (editingOfferId === id) resetOfferForm();
    loadOffersAdmin();
  } catch (err) {
    alert('Eliminazione non riuscita: ' + offerRulesError(err));
  }
}

/* ===========================================================
   Importazione modelli dai cataloghi PDF (Stelbi, UcanPower)
   I prezzi sono volutamente assenti ("Su richiesta"): i listini
   dei produttori sono riservati ai rivenditori.
   =========================================================== */

const PDF_PRODUCTS = [
  {
    id: 'stelbi-worm-hp290', categoryName: 'Pompe di calore', brandName: 'Stelbi', order: 1,
    name: 'Stelbi WØRM HP290',
    description: 'Pompa di calore aria/acqua monoblocco con refrigerante naturale R290, prodotta in Italia: riscalda, raffresca e produce acqua calda sanitaria.',
    longDescription: 'La pompa di calore monoblocco aria/acqua WØRM è progettata, prodotta e testata nello stabilimento Stelbi di Cuneo. Compatta, si installa facilmente anche in spazi ridotti e nelle sostituzioni di impianti esistenti, e si integra con le caldaie Stelbi Prime e Primus per realizzare sistemi ibridi.\n\nLa gamma è divisa in tre taglie: Small da 5 e 7 kW monofase, Medium da 9 kW monofase, Large da 12 e 15 kW monofase e trifase. Di serie ha l\'interfaccia touch-screen, con temperature di mandata che superano i 70 °C, la gestione delle valvole deviatrici e dei circolatori lato secondario e la funzione anti-legionella sul sanitario.\n\nPuò essere collegata in cascata con un kit dedicato e controllata da App via Wi-Fi (gateway dedicato), insieme a un massimo di 15 fancoil della serie LINEAR SLIM. Compressore, motore ventola e circolatore sono Panasonic.',
    features: [
      'Refrigerante naturale R290, classe energetica fino ad A+++',
      'Acqua calda fino a 75 °C, funzionamento in riscaldamento da -25 a +47 °C esterni',
      'Compressore Panasonic DC inverter twin-rotary',
      'Touch-screen di serie, predisposizione Wi-Fi e protocollo Modbus',
      'Collegabile in cascata e integrabile con caldaie Stelbi (sistema ibrido)',
      'Gestione anti-legionella sull\'acqua calda sanitaria',
      'Pensata per il Conto Termico 3.0: verifica i requisiti con noi',
      'Prodotta in Italia, nello stabilimento Stelbi di Cuneo'
    ],
    images: ['https://cosytec.it/assets/img/prodotti/stelbi-worm-hp290.png', 'https://cosytec.it/assets/img/prodotti/stelbi-worm-hp290-ambiente.jpg', 'https://cosytec.it/assets/img/prodotti/stelbi-worm-hp290-display.png'],
    datasheetUrl: 'https://cosytec.it/assets/docs/stelbi-worm-hp290-scheda-tecnica.pdf',
    variants: [
      { label: '5 kW monofase', model: 'WØRM HP290/5M', priceNote: 'Resa 5,11 kW, COP 5,23 (A7/W35)' },
      { label: '7 kW monofase', model: 'WØRM HP290/7M', priceNote: 'Resa 6,68 kW, COP 4,55 (A7/W35)' },
      { label: '9 kW monofase', model: 'WØRM HP290/9M', priceNote: 'Resa 8,71 kW, COP 5,09 (A7/W35)' },
      { label: '12 kW monofase', model: 'WØRM HP290/12M', priceNote: 'Resa 11,83 kW, COP 5,03 (A7/W35)' },
      { label: '12 kW trifase', model: 'WØRM HP290/12T', priceNote: 'Resa 11,83 kW, COP 5,03 (A7/W35)' },
      { label: '15 kW monofase', model: 'WØRM HP290/15M', priceNote: 'Resa 14,45 kW, COP 4,61 (A7/W35)' },
      { label: '15 kW trifase', model: 'WØRM HP290/15T', priceNote: 'Resa 14,45 kW, COP 4,61 (A7/W35)' }
    ]
  },
  {
    id: 'ucanpower-uhome', categoryName: 'Fotovoltaico', brandName: 'UcanPower', order: 1,
    name: 'UcanPower UHome',
    description: 'Sistema fotovoltaico con accumulo all-in-one: inverter monofase da 3 a 8 kW e batterie modulari da 5 a 40 kWh.',
    longDescription: 'UHome è un sistema fotovoltaico domestico con accumulo di energia che integra inverter, caricabatterie e batterie in un unico sistema modulare precablato. L\'installazione è più semplice e veloce: i tempi si riducono fino al 50%.\n\nElegante e compatto, ha grado di protezione IP65 e può essere montato all\'interno o all\'esterno dell\'abitazione. La capacità si espande da 5 a 40 kWh aggiungendo moduli batteria LiFePO4 da 5,12 kWh, ed è prevista la funzione di backup in caso di blackout.\n\nIl monitoraggio dei parametri avviene in tempo reale tramite app, e la bassa rumorosità lo rende ideale per gli ambienti residenziali.',
    features: [
      'Inverter monofase da 3 a 8 kW integrato con le batterie',
      'Batterie LiFePO4 modulari da 5,12 kWh, capacità da 5 a 40 kWh',
      'Protezione IP65: installazione interna o esterna',
      'Efficienza massima 97,6%',
      'Funzione backup per le emergenze',
      'Monitoraggio in tempo reale tramite app',
      'Installazione plug&play, tempi ridotti fino al 50%'
    ],
    images: ['https://cosytec.it/assets/img/prodotti/ucanpower-uhome-3-moduli.png', 'https://cosytec.it/assets/img/prodotti/ucanpower-uhome-2-moduli.png'],
    datasheetUrl: 'https://cosytec.it/assets/docs/ucanpower-uhome-scheda-tecnica.pdf',
    variants: [
      { label: '3 kW', model: 'UHome-3K0L', priceNote: 'Ingresso FV max 4.500 W' },
      { label: '3,6 kW', model: 'UHome-3K6L', priceNote: 'Ingresso FV max 5.400 W' },
      { label: '4 kW', model: 'UHome-4K0L', priceNote: 'Ingresso FV max 6.000 W' },
      { label: '4,6 kW', model: 'UHome-4K6L', priceNote: 'Ingresso FV max 6.900 W' },
      { label: '5 kW', model: 'UHome-5K0L', priceNote: 'Ingresso FV max 7.500 W' },
      { label: '6 kW', model: 'UHome-6K0L', priceNote: 'Ingresso FV max 9.000 W' },
      { label: '8 kW', model: 'UHome-8K0L', priceNote: 'Ingresso FV max 12.000 W' }
    ]
  },
  {
    id: 'stelbi-fotovoltaico-accumulo', categoryName: 'Fotovoltaico', brandName: 'Stelbi', order: 2,
    name: 'Impianto fotovoltaico Stelbi con accumulo',
    description: 'Impianto fotovoltaico chiavi in mano con moduli full black, inverter ibrido Stelbi e batteria di accumulo al litio.',
    longDescription: 'Impianto fotovoltaico residenziale completo: moduli full black, inverter ibrido Stelbi, batteria di accumulo al litio LiFePO4 e quadri di protezione, con installazione e gestione delle pratiche a cura di Cosytec.\n\nGli inverter ibridi sono già programmati per le batterie, con zero immissione e lingua italiana, display touch-screen e antenna Wi-Fi di serie. Si può installare più potenza di moduli rispetto a quella dell\'inverter, per produrre più energia anche al mattino, alla sera e nelle giornate nuvolose.\n\nStelbi offre gratuitamente il monitoraggio e la diagnosi da remoto per 5/10 anni, con aggiornamenti firmware di inverter e batterie. Inverter e batterie hanno 10 anni di garanzia. Le configurazioni qui sotto sono quelle di riferimento: scrivici per dimensionare l\'impianto sui tuoi consumi.',
    features: [
      'Moduli fotovoltaici full black Topcon da 455 W',
      'Inverter ibrido Stelbi con display touch-screen e Wi-Fi',
      'Batteria al litio LiFePO4 serie Compact, IP65',
      '10 anni di garanzia su inverter e batterie',
      'Monitoraggio e diagnosi da remoto inclusi',
      'Gestione delle pratiche e installazione a cura di Cosytec'
    ],
    images: ['https://cosytec.it/assets/img/prodotti/stelbi-fv-inverter-batteria.jpg', 'https://cosytec.it/assets/img/prodotti/stelbi-fv-casa.jpg'],
    datasheetUrl: 'https://cosytec.it/assets/docs/stelbi-fotovoltaico-catalogo.pdf',
    variants: [
      { label: '3 kW monofase + accumulo 5 kWh', model: '8 moduli 455 W + inverter NEVOX 3,6 kW + batteria 5,12 kWh' },
      { label: '6 kW monofase + accumulo 10 kWh', model: '14 moduli 455 W + inverter NEVOX 6 kW + batteria 10,24 kWh', price: 8499, priceNote: 'Chiavi in mano, IVA inclusa, con pratiche e allaccio Enel' },
      { label: '10 kW trifase + accumulo 15 kWh', model: '22 moduli 455 W + inverter ZOOM 10 kW + batteria 14,3 kWh' },
      { label: '20 kW trifase + accumulo 20 kWh', model: '44 moduli 455 W + inverter ZOOM 20 kW + 2 batterie 10,24 kWh' }
    ]
  }
];

async function importPdfProducts(){
  if (!confirm('Importare i modelli dai cataloghi PDF?\n\n• Pompe di calore Stelbi WØRM (nuova categoria "Pompe di calore")\n• UcanPower UHome\n• Impianto fotovoltaico Stelbi con accumulo\n\nSenza prezzi (Su richiesta), con le schede tecniche PDF collegate. I modelli già presenti non vengono toccati.')) return;
  const btn = document.getElementById('import-pdf-products-btn');
  btn.disabled = true;
  const created = [], skipped = [];
  try {
    const catSnap = await db.collection('categories').get();
    const cats = [];
    catSnap.forEach(d => cats.push({ id: d.id, ...d.data() }));
    const brandSnap = await db.collection('brands').get();
    const brands = [];
    brandSnap.forEach(d => brands.push({ id: d.id, ...d.data() }));

    for (const p of PDF_PRODUCTS) {
      let cat = cats.find(c => c.name === p.categoryName);
      if (!cat) {
        const order = cats.reduce((m, c) => Math.max(m, c.order || 0), 0) + 1;
        const ref = await db.collection('categories').add({ name: p.categoryName, order });
        cat = { id: ref.id, name: p.categoryName, order };
        cats.push(cat);
      }
      if (!brands.find(b => b.name === p.brandName && b.categoryId === cat.id)) {
        const ref = await db.collection('brands').add({ name: p.brandName, categoryId: cat.id });
        brands.push({ id: ref.id, name: p.brandName, categoryId: cat.id });
      }

      const seriesRef = db.collection('series').doc(p.id);
      if ((await seriesRef.get()).exists) { skipped.push(p.name); continue; }
      const prices = p.variants.map(v => v.price).filter(x => x != null);
      await seriesRef.set({
        categoryId: cat.id, tag: p.brandName, name: p.name, description: p.description,
        longDescription: p.longDescription, features: p.features, images: p.images,
        imageStyle: 'white', accent: '', datasheetUrl: p.datasheetUrl, documents: [],
        minPrice: prices.length ? Math.min(...prices) : null, minCtPrice: null,
        variantCount: p.variants.length, featured: false, order: p.order, active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      const batch = db.batch();
      p.variants.forEach((v, i) => {
        batch.set(seriesRef.collection('variants').doc('v' + (i + 1)), {
          label: v.label, model: v.model, price: v.price != null ? v.price : null,
          priceNote: v.priceNote || '', order: i, active: true
        });
      });
      await batch.commit();
      created.push(p.name);
    }
    alert((created.length ? 'Importati:\n• ' + created.join('\n• ') : 'Nessun nuovo modello importato.') +
      (skipped.length ? '\n\nGià presenti (non toccati):\n• ' + skipped.join('\n• ') : ''));
    await loadCategoriesAdmin();
    await loadBrandsAdmin();
    loadSeriesListAdmin();
  } catch (err) {
    alert('Importazione non riuscita: ' + (err && err.message ? err.message : err));
  } finally {
    btn.disabled = false;
  }
}

const SEED_OFFERS = [
  {
    id: 'daikin-sensira-9000',
    title: 'Daikin Sensira 9000 BTU',
    description: 'Climatizzatore Daikin in classe A++, installazione compresa.',
    badge: 'Bonus climatizzazione', price: 649, oldPrice: null, priceNote: 'installazione compresa',
    imageUrl: 'assets/img/daikin-sensira.png', order: 1
  },
  {
    id: 'daikin-sensira-12000',
    title: 'Daikin Sensira 12000 BTU',
    description: 'Climatizzatore Daikin in classe A++, installazione compresa.',
    badge: 'Bonus climatizzazione', price: 699, oldPrice: null, priceNote: 'installazione compresa',
    imageUrl: 'assets/img/daikin-sensira.png', order: 2
  },
  {
    id: 'solare-termico-300',
    title: 'Solare termico a circolazione naturale 300 litri',
    description: 'Boiler da 300 litri con 2 collettori solari, fornitura e installazione incluse.',
    badge: 'Con Conto Termico', price: 600, oldPrice: null, priceNote: 'installazione inclusa',
    imageUrl: 'assets/img/offerte/solare-termico-300.png', order: 3
  },
  {
    id: 'fotovoltaico-stelbi-6kw',
    title: 'Impianto fotovoltaico Stelbi 6 kW con accumulo 10 kW',
    description: 'Fornitura e installazione chiavi in mano, con gestione di tutte le pratiche e allaccio Enel.',
    badge: 'Pratiche incluse', price: 8499, oldPrice: null, priceNote: 'IVA inclusa',
    imageUrl: 'assets/img/offerte/fotovoltaico-stelbi.jpg', imageStyle: 'white', order: 4
  },
  {
    id: 'caldaia-fondital-tenerife-24kw',
    title: 'Caldaia Fondital Tenerife 24 kW',
    description: 'Fornitura e installazione, registrazione al Catasto Termico e rilascio del libretto d\'impianto.',
    badge: 'Anche a rate', price: 1199, oldPrice: null, priceNote: 'IVA inclusa',
    imageUrl: 'assets/img/offerte/caldaia-fondital-tenerife.png', order: 5
  }
];

async function importSeedOffers(){
  if (!confirm('Importare le 5 offerte delle locandine (2 climatizzatori Daikin, solare termico, fotovoltaico, caldaia)? Se le hai già importate verranno solo riscritte, non duplicate.')) return;
  try {
    for (const { id, ...o } of SEED_OFFERS) {
      await db.collection('offers').doc(id).set({
        ...o, linkUrl: '', expiresAt: null, active: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    loadOffersAdmin();
  } catch (err) {
    alert('Importazione non riuscita: ' + offerRulesError(err));
  }
}

function initOffersForm(){
  document.getElementById('import-offers-btn').addEventListener('click', importSeedOffers);
  document.getElementById('import-pdf-products-btn').addEventListener('click', importPdfProducts);
  const form = document.getElementById('offer-form');
  const fileInput = document.getElementById('o-image-file');

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const text = fileInput.closest('label').querySelector('span');
    text.textContent = 'Caricamento...';
    try {
      setOfferImage(await compressImageToDataURL(file, 900, 250000));
    } catch (err) {
      alert('Caricamento non riuscito: ' + err.message);
    } finally {
      text.textContent = 'Carica da PC';
      fileInput.value = '';
    }
  });

  document.getElementById('o-image-remove').addEventListener('click', () => setOfferImage(''));
  document.getElementById('offer-cancel-btn').addEventListener('click', resetOfferForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const num = id => { const v = document.getElementById(id).value; return v === '' ? null : Number(v); };
    const data = {
      title: document.getElementById('o-title').value.trim(),
      description: document.getElementById('o-description').value.trim(),
      badge: document.getElementById('o-badge').value.trim(),
      priceNote: document.getElementById('o-priceNote').value.trim(),
      linkUrl: document.getElementById('o-linkUrl').value.trim(),
      expiresAt: document.getElementById('o-expiresAt').value || null,
      price: num('o-price'),
      oldPrice: num('o-oldPrice'),
      imageUrl: offerImageData,
      order: parseInt(document.getElementById('o-order').value) || 0,
      active: document.getElementById('o-active').checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const btn = document.getElementById('offer-submit-btn');
    btn.disabled = true;
    try {
      if (editingOfferId) await db.collection('offers').doc(editingOfferId).update(data);
      else await db.collection('offers').add(data);
      resetOfferForm();
      loadOffersAdmin();
    } catch (err) {
      alert('Salvataggio non riuscito: ' + offerRulesError(err));
    } finally {
      btn.disabled = false;
    }
  });
}

function initAdminTabs(){
  const buttons = document.querySelectorAll('.tabbar button[data-panel]');
  const panels = document.querySelectorAll('.admin-panel');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel).style.display = 'block';
      if (btn.dataset.panel === 'panel-images') loadImageSlots();
      if (btn.dataset.panel === 'panel-offers') loadOffersAdmin();
    });
  });
}

function initCatalogSubTabs(){
  const buttons = document.querySelectorAll('.tabbar button[data-subpanel]');
  const panels = document.querySelectorAll('.admin-subpanel');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(btn.dataset.subpanel).style.display = 'block';
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
          <label class="upload-label" style="margin:0;">
            <i class="fa-solid fa-upload"></i><span>Carica da PC</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="uploadSlotImage('${page}','${slot.key}', this)">
          </label>
          <input type="url" placeholder="${(ov && ov.url && ov.url.startsWith('data:')) ? 'Immagine caricata dal PC' : 'oppure incolla un link https://...'}" value="${(ov && ov.url && !ov.url.startsWith('data:')) ? ov.url : ''}" style="flex:1; min-width:180px; padding:10px 14px; border-radius:var(--radius-sm); border:1.5px solid var(--ink-100); font-size:13.5px;">
          <button class="btn btn-primary btn-sm" onclick="saveSlotImageUrl('${page}','${slot.key}', this)">Salva link</button>
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

function compressImageToDataURL(file, maxDim = 1600, maxChars = 700000){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      let scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      let quality = 0.85;
      for (let attempt = 0; attempt < 8; attempt++) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length <= maxChars) return resolve(dataUrl);
        quality = Math.max(0.55, quality - 0.1);
        scale *= 0.85;
      }
      reject(new Error('Immagine troppo pesante anche dopo la compressione.'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error('File non valido: scegli un\'immagine JPG, PNG o WebP.'));
    };
    img.src = objUrl;
  });
}

async function uploadSlotImage(page, slotKey, fileInput){
  const file = fileInput.files[0];
  if (!file) return;
  const label = fileInput.closest('label');
  const text = label.querySelector('span');
  text.textContent = 'Caricamento...';
  try {
    const url = await compressImageToDataURL(file);
    await db.collection('site_images').doc(slotKey).set({
      page, slotKey, url,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    loadImageSlots();
  } catch (err) {
    alert('Caricamento non riuscito: ' + err.message);
    text.textContent = 'Carica da PC';
    fileInput.value = '';
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
  initCatalogSubTabs();
  initImagesPanel();
  initOffersForm();
  initUserManagement();
});
