/* ===========================================================
   COSYTEC — Pannello admin prodotti
   =========================================================== */

let editingId = null;

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
  loadProductsList();

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

function resetForm(){
  editingId = null;
  document.getElementById('product-form').reset();
  document.getElementById('form-title').textContent = 'Aggiungi nuovo prodotto';
  document.getElementById('submit-btn').textContent = 'Aggiungi prodotto';
  document.getElementById('cancel-edit-btn').style.display = 'none';
}

async function loadProductsList(){
  const listEl = document.getElementById('products-list');
  listEl.innerHTML = '<p style="color:var(--ink-300);">Caricamento...</p>';
  const snap = await db.collection('products').orderBy('category').get();
  if (snap.empty) {
    listEl.innerHTML = '<p style="color:var(--ink-300);">Nessun prodotto ancora. Aggiungine uno dal form, oppure importa quelli di esempio.</p>';
    return;
  }
  let rows = [];
  snap.forEach(doc => {
    const p = doc.data();
    rows.push(`
      <div class="admin-row" data-id="${doc.id}">
        <img src="${p.imageUrl}" alt="" onerror="this.style.opacity=0.2">
        <div class="admin-row-info">
          <b>${p.name}</b>
          <span>${CATEGORY_LABELS[p.category] || p.category} · ${euroFmt(p.price)} ${p.active ? '' : '· <em>Nascosto</em>'}</span>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-outline btn-sm" onclick="editProduct('${doc.id}')">Modifica</button>
          <button class="btn btn-outline btn-sm" onclick="toggleActive('${doc.id}', ${!p.active})">${p.active ? 'Nascondi' : 'Mostra'}</button>
          <button class="btn btn-sm" style="background:#e0413c;color:#fff;" onclick="deleteProduct('${doc.id}')">Elimina</button>
        </div>
      </div>`);
  });
  listEl.innerHTML = rows.join('');
}

async function editProduct(id){
  const doc = await db.collection('products').doc(id).get();
  if (!doc.exists) return;
  const p = doc.data();
  editingId = id;
  document.getElementById('f-name').value = p.name || '';
  document.getElementById('f-tag').value = p.tag || '';
  document.getElementById('f-category').value = p.category || 'daikin';
  document.getElementById('f-price').value = p.price || '';
  document.getElementById('f-priceNote').value = p.priceNote || '';
  document.getElementById('f-description').value = p.description || '';
  document.getElementById('f-imageUrl').value = p.imageUrl || '';
  document.getElementById('f-imageStyle').value = p.imageStyle || 'white';
  document.getElementById('f-accent').value = p.accent || 'cool';
  document.getElementById('form-title').textContent = 'Modifica prodotto';
  document.getElementById('submit-btn').textContent = 'Salva modifiche';
  document.getElementById('cancel-edit-btn').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function toggleActive(id, newState){
  await db.collection('products').doc(id).update({ active: newState });
  loadProductsList();
}

async function deleteProduct(id){
  if (!confirm('Eliminare definitivamente questo prodotto?')) return;
  await db.collection('products').doc(id).delete();
  loadProductsList();
}

function initProductForm(){
  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('f-name').value.trim(),
      tag: document.getElementById('f-tag').value.trim(),
      category: document.getElementById('f-category').value,
      price: parseFloat(document.getElementById('f-price').value) || 0,
      priceNote: document.getElementById('f-priceNote').value.trim(),
      description: document.getElementById('f-description').value.trim(),
      imageUrl: document.getElementById('f-imageUrl').value.trim(),
      imageStyle: document.getElementById('f-imageStyle').value,
      accent: document.getElementById('f-accent').value,
      active: true
    };

    if (editingId) {
      await db.collection('products').doc(editingId).update(data);
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').add(data);
    }
    resetForm();
    loadProductsList();
  });

  document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);

  document.getElementById('seed-btn').addEventListener('click', async () => {
    if (!confirm('Importare i prodotti di esempio del sito? Questa operazione non duplica prodotti già importati in precedenza.')) return;
    await importSeedProducts();
    loadProductsList();
  });
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
  initProductForm();
  initAdminTabs();
  initImagesPanel();
  initUserManagement();
});
