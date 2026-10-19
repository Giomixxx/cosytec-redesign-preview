/* ===========================================================
   COSYTEC — Statistiche (Google Analytics 4) con consenso
   Google Analytics viene caricato solo dopo che il visitatore
   ha accettato dal banner. Il rifiuto è altrettanto semplice
   e la scelta si può cambiare da "Preferenze cookie" nel footer.
   =========================================================== */
(function () {
  var GA_ID = 'G-SDJBX5BCYR';
  var KEY = 'cosytec_cookie_consent';

  function getChoice() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setChoice(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* storage non disponibile */ } }

  function loadGA() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    window['ga-disable-' + GA_ID] = false;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  function clearGACookies() {
    window['ga-disable-' + GA_ID] = true;
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') === 0) {
        var past = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        document.cookie = name + past;
        document.cookie = name + past + '; domain=cosytec.it';
        document.cookie = name + past + '; domain=.cosytec.it';
      }
    });
  }

  function removeBanner() {
    var b = document.getElementById('cookie-banner');
    if (b) b.remove();
  }

  function decide(value) {
    setChoice(value);
    removeBanner();
    if (value === 'granted') loadGA(); else clearGACookies();
  }

  function showBanner() {
    removeBanner();
    var b = document.createElement('div');
    b.id = 'cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Preferenze cookie');
    b.innerHTML =
      '<p>Usiamo Google Analytics per capire come viene usato il sito, ma solo se acconsenti. ' +
      'Puoi rifiutare senza problemi e cambiare idea quando vuoi da "Preferenze cookie" in fondo alla pagina. ' +
      '<a href="cookie-policy.html">Cookie Policy</a></p>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="btn btn-outline btn-sm" data-choice="denied">Rifiuta</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-choice="granted">Accetta</button>' +
      '</div>';
    b.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-choice');
      if (v) decide(v);
    });
    document.body.appendChild(b);
  }

  window.openCookiePreferences = showBanner;

  var choice = getChoice();
  if (choice === 'granted') loadGA();
  else if (choice === 'denied') window['ga-disable-' + GA_ID] = true;
  else showBanner();
})();
