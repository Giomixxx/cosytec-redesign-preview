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

function showDashboard(user){
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = '';
  document.getElementById('admin-email').textContent = user.email;
  loadProductsList();
}

function initAuth(){
  if (!auth) {
    const errorBox = document.getElementById('login-error');
    errorBox.textContent = 'Firebase non è ancora configurato: inserisci le credenziali in assets/js/firebase-config.js.';
    errorBox.style.display = '';
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
      errorBox.style.display = '';
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

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initProductForm();
});
