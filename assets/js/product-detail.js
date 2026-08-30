/* ===========================================================
   COSYTEC — Pagina dettaglio prodotto (Categoria > Serie > Variante)
   =========================================================== */

function getQueryParam(name){
  return new URLSearchParams(window.location.search).get(name);
}

function detailGalleryHTML(series, phClass){
  const images = (series.images && series.images.length) ? series.images : [''];
  const mainImg = images[0] ? `<img src="${images[0]}" alt="${series.name}">` : '';
  const thumbs = images.length > 1 ? images.map((img, i) => `
    <div class="ph ${phClass} ${i === 0 ? 'active' : ''}" data-img="${img}">
      ${img ? `<img src="${img}" alt="${series.name}">` : ''}
    </div>`).join('') : '';
  return `
    <div>
      <div class="ph detail-gallery-main ${phClass}" id="detail-gallery-main">${mainImg}</div>
      ${thumbs ? `<div class="detail-thumbs" id="detail-thumbs">${thumbs}</div>` : ''}
    </div>`;
}

function detailInfoHTML(series, variants){
  const featuresHTML = (series.features || []).map(f =>
    `<li><i class="fa-solid fa-circle-check"></i><span>${f}</span></li>`
  ).join('');

  const variantOptions = variants.map(v =>
    `<option value="${v.id}">${v.label}</option>`
  ).join('');

  const docsHTML = (series.documents && series.documents.length) ? `
    <div style="margin-top:36px;">
      <h3 style="font-size:19px; margin-bottom:6px;">Documentazione e certificazioni</h3>
      <p style="color:var(--ink-300); font-size:14px; margin-bottom:0;">Dichiarazioni del costruttore, certificazioni e documenti utili anche per il Conto Termico.</p>
      <div class="doc-list">
        ${series.documents.map(d => `<a href="${d.url}" target="_blank" rel="noopener"><i class="fa-solid fa-file-lines"></i> ${d.label}</a>`).join('')}
      </div>
    </div>` : '';

  return `
    <div>
      <span class="tag">${series.tag || ''}</span>
      <h2 style="margin:10px 0 14px;">${series.name}</h2>
      <p style="color:var(--ink-500); line-height:1.7;">${series.description || ''}</p>

      ${featuresHTML ? `<ul class="detail-features">${featuresHTML}</ul>` : ''}

      <div class="variant-box">
        <div class="field" style="margin:0;">
          <label>Potenza / Modello</label>
          <select id="variant-select">${variantOptions}</select>
        </div>
        <div class="row"><span>Modello</span><b id="variant-model">—</b></div>
        <div class="row"><span>Prezzo</span><span class="price-big" id="variant-price">—</span></div>
        <div class="row" id="variant-note-row" style="display:none;"><span id="variant-note" style="color:var(--ink-300);"></span></div>
      </div>

      <div class="detail-actions">
        <button class="btn btn-primary" id="add-cart-btn"><i class="fa-solid fa-cart-plus"></i> Aggiungi al carrello</button>
        <a href="preventivo.html" class="btn btn-outline">Richiedi preventivo</a>
        <a href="#" target="_blank" rel="noopener" class="btn btn-whatsapp" id="whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> Scrivi su WhatsApp</a>
      </div>
      <div id="added-feedback"><i class="fa-solid fa-check"></i> Aggiunto al carrello!</div>

      ${series.datasheetUrl ? `<a class="detail-pdf-link" href="${series.datasheetUrl}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> Scarica scheda tecnica ufficiale (PDF)</a>` : ''}

      ${docsHTML}
    </div>`;
}

function wireVariantSelector(series, variants){
  const select = document.getElementById('variant-select');
  const modelEl = document.getElementById('variant-model');
  const priceEl = document.getElementById('variant-price');
  const noteRow = document.getElementById('variant-note-row');
  const noteEl = document.getElementById('variant-note');
  const waBtn = document.getElementById('whatsapp-btn');
  const addBtn = document.getElementById('add-cart-btn');
  if(!select) return;

  function currentVariant(){
    return variants.find(v => v.id === select.value) || variants[0];
  }

  function update(){
    const v = currentVariant();
    modelEl.textContent = v.model || '—';
    priceEl.textContent = (v.price != null) ? euro(v.price) : 'Su richiesta';
    if(v.priceNote){
      noteEl.textContent = v.priceNote;
      noteRow.style.display = 'flex';
    } else {
      noteRow.style.display = 'none';
    }
    const waText = `Ciao! Sono interessato al modello ${series.name} (${v.label} - ${v.model}). Potreste darmi maggiori informazioni?`;
    waBtn.href = `https://wa.me/393272326589?text=${encodeURIComponent(waText)}`;
  }

  select.addEventListener('change', update);
  update();

  if(addBtn){
    addBtn.addEventListener('click', () => {
      if(typeof addToCart !== 'function'){
        alert('Il carrello è disponibile solo nella pagina pubblica del prodotto.');
        return;
      }
      const v = currentVariant();
      const phClass = phClassFor(series);
      const img = (series.images && series.images[0]) ? series.images[0] : '';
      addToCart({
        id: `${series.id}-${v.id}`,
        name: `${series.name} ${v.label}`,
        price: v.price || 0,
        icon: 'fa-fire',
        img: img,
        ph: phClass
      });
      const feedback = document.getElementById('added-feedback');
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 1800);
    });
  }
}

function wireGalleryThumbs(){
  const main = document.getElementById('detail-gallery-main');
  const thumbs = document.querySelectorAll('#detail-thumbs .ph');
  if(!main || !thumbs.length) return;
  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      thumbs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const img = t.dataset.img;
      main.innerHTML = img ? `<img src="${img}" alt="">` : '';
    });
  });
}

async function renderProductDetailPage(){
  const id = getQueryParam('id');
  const root = document.getElementById('detail-root');
  const titleEl = document.getElementById('detail-title');
  const breadcrumb = document.getElementById('detail-breadcrumb');
  if(!root) return;

  if(!id){
    root.innerHTML = '<p>Prodotto non specificato.</p>';
    return;
  }

  const result = await fetchSeriesWithVariants(id);
  if(!result || !result.variants || !result.variants.length){
    titleEl.textContent = 'Prodotto non trovato';
    root.innerHTML = `<p style="color:var(--ink-300);">Il modello richiesto non è disponibile o è stato rimosso. <a href="prodotti.html">Torna al catalogo prodotti</a>.</p>`;
    return;
  }

  const { series, variants } = result;
  const phClass = phClassFor(series);

  document.title = `${series.name} — Cosytec`;
  titleEl.textContent = series.name;
  if(breadcrumb){
    breadcrumb.innerHTML = `<a href="index.html">Home</a> / <a href="prodotti.html">Prodotti</a> / ${series.name}`;
  }

  root.innerHTML = `<div class="detail-wrap">${detailGalleryHTML(series, phClass)}${detailInfoHTML(series, variants)}</div>`;

  wireVariantSelector(series, variants);
  wireGalleryThumbs();
  updateCartBadge();
}

document.addEventListener('DOMContentLoaded', renderProductDetailPage);
