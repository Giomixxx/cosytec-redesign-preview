/* ===========================================================
   COSYTEC — Simulatore Conto Termico 3.0 (stima indicativa)

   Per pompa di calore e sistema ibrido si usa la formula reale del
   GSE (Allegato 2 al Decreto 7 agosto 2025):

     Ia = Ei × Ci                    incentivo annuo (€)
     Ei = Qu × (1 − 1/SCOP) × kp     energia termica incentivata (kWh/anno)
     Qu = Prated × Quf               calore utile annuo (kWh/anno)

   Quf = ore equivalenti di utilizzo per zona climatica (Tabella 8):
     A 600 · B 850 · C 1.100 · D 1.400 · E 1.700 · F 1.800

   Ci = coefficiente di valorizzazione dell'energia, ≈0,150 €/kWh
   per le pompe di calore (fonte: esempio numerico ufficiale GSE).
   kp (premialità efficienza) e SCOP sono impostati su valori tipici
   di un impianto di fascia alta (i marchi che installiamo): questo
   rende la stima prudente per default, quindi realistica o per
   difetto, mai gonfiata.

   Erogazione assunta in 2 rate annuali, valida per potenza ≤35 kW
   (praticamente tutti gli impianti residenziali).

   Per biomassa, stufa a pellet e solare termico il GSE usa formule
   diverse (logaritmica per le stufe) con coefficienti non reperibili
   in modo affidabile: si mantiene quindi una fascia indicativa.

   Questi valori vanno rivisti periodicamente in base agli
   aggiornamenti GSE: non rappresentano un calcolo ufficiale.
   =========================================================== */

const QUF_PER_ZONA = { A: 600, B: 850, C: 1100, D: 1400, E: 1700, F: 1800 };
const CI_POMPA_CALORE = 0.150; // €/kWh
const SCOP_TIPICO = 4.6;       // efficienza stagionale tipica di un impianto di fascia alta
const KP_TIPICO = 1.05;        // lieve premialità per efficienza sopra il minimo richiesto
const RATE_EROGAZIONE = 2;     // anni, per potenza ≤35 kW

const CONTO_TERMICO_RANGES = {
  'biomassa': { min: 1500, max: 4000, label: 'Caldaia a biomassa / pellet' },
  'stufa-pellet': { min: 800, max: 2200, label: 'Stufa a pellet' },
  'solare-termico': { min: 700, max: 1800, label: 'Solare termico' }
};

const TIPI_FORMULA = {
  'pompa-calore': 'Climatizzatore a pompa di calore',
  'ibrido': 'Sistema ibrido (caldaia + pompa di calore)'
};

function calcolaIncentivoPompaCalore(potenzaKw, zona){
  const quf = QUF_PER_ZONA[zona] || QUF_PER_ZONA.B;
  const qu = potenzaKw * quf;
  const ei = qu * (1 - 1 / SCOP_TIPICO) * KP_TIPICO;
  const incentivoAnnuo = ei * CI_POMPA_CALORE;
  return incentivoAnnuo * RATE_EROGAZIONE;
}

function toggleSimFields(){
  const tipo = document.getElementById('sim-tipo').value;
  const pdcFields = document.getElementById('sim-pdc-fields');
  const potenzaInput = document.getElementById('sim-potenza');
  const isFormula = !!TIPI_FORMULA[tipo];
  pdcFields.style.display = isFormula ? 'grid' : 'none';
  potenzaInput.required = isFormula;
}

function initSimulatore(){
  const form = document.getElementById('simulatore-form');
  if(!form) return;

  document.getElementById('sim-tipo').addEventListener('change', toggleSimFields);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tipo = document.getElementById('sim-tipo').value;
    const comune = document.getElementById('sim-comune').value.trim();
    let valueText, labelText, disclaimerText;

    if(TIPI_FORMULA[tipo]){
      const potenza = parseFloat(document.getElementById('sim-potenza').value);
      const zona = document.getElementById('sim-zona').value;
      if(!potenza || potenza <= 0) return;

      const importo = calcolaIncentivoPompaCalore(potenza, zona);
      valueText = euro(Math.round(importo));
      labelText = `Stima per: ${TIPI_FORMULA[tipo]} da ${potenza} kW, zona climatica ${zona}`;
      disclaimerText = `Calcolo basato sulla formula ufficiale GSE (Conto Termico 3.0) con parametri tipici di un impianto efficiente, erogato in ${RATE_EROGAZIONE} rate annuali. L'importo reale dipende dal modello esatto (SCOP dichiarato), dal comune esatto e non può comunque superare il 65% della spesa sostenuta.`;
    } else {
      const range = CONTO_TERMICO_RANGES[tipo];
      if(!range) return;
      valueText = `${euro(range.min)} – ${euro(range.max)}`;
      labelText = `Stima per: ${range.label}`;
      disclaimerText = 'Stima indicativa a titolo puramente orientativo, non vincolante: l\'importo reale dipende da potenza dell\'impianto, zona climatica e altri parametri tecnici stabiliti dal GSE.';
    }

    document.getElementById('sim-result-value').textContent = valueText;
    document.getElementById('sim-result-label').textContent = labelText;
    document.getElementById('sim-disclaimer').textContent = disclaimerText;
    document.getElementById('sim-result').classList.add('show');

    const params = new URLSearchParams();
    params.set('intervento', TIPI_FORMULA[tipo] || (CONTO_TERMICO_RANGES[tipo] || {}).label || tipo);
    if(comune) params.set('comune', comune);
    document.getElementById('sim-cta-btn').href = `preventivo.html?${params.toString()}`;
  });
}

document.addEventListener('DOMContentLoaded', initSimulatore);
