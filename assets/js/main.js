/* ===========================================================
   COSYTEC — shared front-end behaviour (mockup only, no backend)
   =========================================================== */

// ---------- Mobile drawer ----------
function initDrawer(){
  const openBtn = document.querySelector('.burger');
  const drawer = document.querySelector('.mobile-drawer');
  if(!openBtn || !drawer) return;
  const close = () => drawer.classList.remove('open');
  openBtn.addEventListener('click', () => drawer.classList.add('open'));
  drawer.querySelector('.backdrop').addEventListener('click', close);
  drawer.querySelector('.close-drawer').addEventListener('click', close);
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
}

// ---------- Scroll reveal ----------
function initReveal(){
  const els = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window) || !els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .15 });
  els.forEach(el => io.observe(el));
}

// ---------- Cart (localStorage mock) ----------
const CART_KEY = 'cosytec_cart_v1';

function getCart(){
  try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch(e){ return []; }
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}
function addToCart(item){
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if(existing){ existing.qty += 1; }
  else{ cart.push({ ...item, qty: 1 }); }
  saveCart(cart);
}
function updateQty(id, delta){
  const cart = getCart();
  const it = cart.find(i => i.id === id);
  if(!it) return;
  it.qty += delta;
  const filtered = it.qty <= 0 ? cart.filter(i => i.id !== id) : cart;
  saveCart(filtered);
  renderCartPage();
}
function removeFromCart(id){
  saveCart(getCart().filter(i => i.id !== id));
  renderCartPage();
}
function cartCount(){ return getCart().reduce((s,i) => s + i.qty, 0); }
function cartTotal(){ return getCart().reduce((s,i) => s + i.qty * i.price, 0); }

function updateCartBadge(){
  document.querySelectorAll('.cart-count').forEach(el => { el.textContent = cartCount(); });
}

function euro(n){
  return n.toLocaleString('it-IT', { style:'currency', currency:'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ---------- Shop page: add-to-cart buttons ----------
function initShopButtons(){
  document.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('[data-product]');
      if(!card) return;
      addToCart({
        id: card.dataset.id,
        name: card.dataset.name,
        price: parseFloat(card.dataset.price),
        icon: card.dataset.icon,
        img: card.dataset.img || '',
        ph: card.dataset.ph
      });
      const original = btn.innerHTML;
      btn.classList.add('added');
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Aggiunto';
      setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = original; }, 1400);
    });
  });
}

// ---------- Shop filters (category checkboxes, simple client-side) ----------
function initShopFilters(){
  const checkboxes = document.querySelectorAll('.filter-box input[type=checkbox][data-cat]');
  if(!checkboxes.length) return;
  const products = document.querySelectorAll('[data-product]');
  function apply(){
    const active = Array.from(checkboxes).filter(c => c.checked).map(c => c.dataset.cat);
    products.forEach(p => {
      const show = active.length === 0 || active.includes(p.dataset.cat);
      p.style.display = show ? '' : 'none';
    });
  }
  checkboxes.forEach(c => c.addEventListener('change', apply));
}

// ---------- Gallery filters + lightbox ----------
function initGallery(){
  const filterBtns = document.querySelectorAll('.gallery-filters button');
  const items = document.querySelectorAll('.gallery-item');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      items.forEach(it => {
        it.style.display = (cat === 'all' || it.dataset.cat === cat) ? '' : 'none';
      });
    });
  });

  const lightbox = document.querySelector('.lightbox');
  if(!lightbox) return;
  const lbPh = lightbox.querySelector('.ph');
  items.forEach(it => {
    it.addEventListener('click', () => {
      const src = it.querySelector('.ph');
      lbPh.className = src.className;
      lbPh.innerHTML = src.innerHTML;
      lightbox.classList.add('open');
    });
  });
  lightbox.addEventListener('click', (e) => {
    if(e.target === lightbox) lightbox.classList.remove('open');
  });
  lightbox.querySelector('.close-lb').addEventListener('click', () => lightbox.classList.remove('open'));
}

// ---------- Prodotti tabs ----------
function initTabs(){
  const buttons = document.querySelectorAll('.tabbar button');
  const panels = document.querySelectorAll('.tab-panel');
  if(!buttons.length) return;
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ---------- Preventivo form (invio reale via Formspree) ----------
// Sostituire con l'indirizzo del proprio form: https://formspree.io/f/xxxxxxxx
const FORMSPREE_ENDPOINT = 'INSERISCI_ENDPOINT_FORMSPREE';

function initQuoteForm(){
  const form = document.querySelector('#quote-form');
  if(!form) return;
  const errorBox = document.querySelector('#quote-error');
  const submitBtn = document.querySelector('#quote-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if(FORMSPREE_ENDPOINT === 'INSERISCI_ENDPOINT_FORMSPREE'){
      errorBox.textContent = 'Invio non ancora configurato: manca l\'endpoint Formspree.';
      errorBox.style.display = '';
      return;
    }

    errorBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Invio in corso...';

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });
      if(!res.ok) throw new Error('Invio non riuscito');
      form.style.display = 'none';
      document.querySelector('.form-success').classList.add('show');
    } catch (err) {
      errorBox.textContent = 'Invio non riuscito. Riprova oppure chiamaci direttamente.';
      errorBox.style.display = '';
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Invia richiesta <i class="fa-solid fa-paper-plane"></i>';
    }
  });
}

// ---------- Render cart page ----------
function renderCartPage(){
  const wrap = document.querySelector('#cart-render');
  if(!wrap) return;
  const cart = getCart();

  if(cart.length === 0){
    wrap.innerHTML = `
      <div class="empty-cart">
        <div class="ic"><i class="fa-solid fa-cart-shopping"></i></div>
        <h3>Il tuo carrello è vuoto</h3>
        <p>Esplora lo shop e aggiungi i prodotti che ti interessano.</p>
        <a href="shop.html" class="btn btn-primary">Vai allo shop</a>
      </div>`;
    document.querySelector('#cart-summary').style.display = 'none';
    updateCartBadge();
    return;
  }

  document.querySelector('#cart-summary').style.display = '';
  wrap.innerHTML = `
    <table class="cart-table">
      <thead><tr><th>Prodotto</th><th>Quantità</th><th>Prezzo</th><th></th></tr></thead>
      <tbody>
        ${cart.map(i => `
          <tr>
            <td>
              <div class="cart-row-info">
                <div class="ph ${i.img ? 'ph-white' : i.ph}">${i.img ? `<img src="${i.img}" alt="${i.name}">` : `<i class="fa-solid ${i.icon}"></i>`}</div>
                <div><b>${i.name}</b><span>Cod. ${i.id}</span></div>
              </div>
            </td>
            <td>
              <div class="qty-box">
                <button onclick="updateQty('${i.id}', -1)">−</button>
                <span>${i.qty}</span>
                <button onclick="updateQty('${i.id}', 1)">+</button>
              </div>
            </td>
            <td><b>${euro(i.price * i.qty)}</b></td>
            <td><button class="remove-btn" onclick="removeFromCart('${i.id}')"><i class="fa-solid fa-trash"></i></button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const subtotal = cartTotal();
  const shipping = subtotal > 0 ? 0 : 0;
  document.querySelector('#sum-subtotal').textContent = euro(subtotal);
  document.querySelector('#sum-total').textContent = euro(subtotal + shipping);
}

function initCheckout(){
  const form = document.querySelector('#checkout-form');
  if(!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveCart([]);
    document.querySelector('#checkout-view').style.display = 'none';
    document.querySelector('.order-success').classList.add('show');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDrawer();
  initReveal();
  updateCartBadge();
  initShopButtons();
  initShopFilters();
  initGallery();
  initTabs();
  initQuoteForm();
  renderCartPage();
  initCheckout();
});
