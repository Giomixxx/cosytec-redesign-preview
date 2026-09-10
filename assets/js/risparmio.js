/* ===========================================================
   COSYTEC — Simulatore Conto Termico (stima indicativa)

   Le fasce sono indicative e vanno riviste periodicamente in base
   ai valori reali del GSE: non rappresentano un calcolo ufficiale.
   =========================================================== */

const CONTO_TERMICO_RANGES = {
  'pompa-calore': { min: 900, max: 2500, label: 'Climatizzatore a pompa di calore' },
  'ibrido': { min: 1800, max: 4500, label: 'Sistema ibrido (caldaia + pompa di calore)' },
  'biomassa': { min: 1500, max: 4000, label: 'Caldaia a biomassa / pellet' },
  'stufa-pellet': { min: 800, max: 2200, label: 'Stufa a pellet' },
  'solare-termico': { min: 700, max: 1800, label: 'Solare termico' }
};

function initSimulatore(){
  const form = document.getElementById('simulatore-form');
  if(!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tipo = document.getElementById('sim-tipo').value;
    const comune = document.getElementById('sim-comune').value.trim();
    const range = CONTO_TERMICO_RANGES[tipo];
    if(!range) return;

    document.getElementById('sim-result-value').textContent = `${euro(range.min)} – ${euro(range.max)}`;
    document.getElementById('sim-result-label').textContent = `Stima per: ${range.label}`;
    document.getElementById('sim-result').classList.add('show');

    const params = new URLSearchParams();
    params.set('intervento', range.label);
    if(comune) params.set('comune', comune);
    document.getElementById('sim-cta-btn').href = `preventivo.html?${params.toString()}`;
  });
}

document.addEventListener('DOMContentLoaded', initSimulatore);
