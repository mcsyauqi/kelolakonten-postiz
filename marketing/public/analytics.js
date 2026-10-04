(function () {
  const measurementId = 'G-ZTD9XVENS1';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { anonymize_ip: true, allow_google_signals: false });
  window.kelolaTrack = function (name, params) {
    const safe = params || {};
    window.gtag('event', name, safe);
    window.dataLayer.push({ event: name, ...safe });
  };
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[data-wa-cta]');
    if (link) window.kelolaTrack('wa_cta_click', { placement: link.dataset.waCta || 'unknown' });
    const source = event.target.closest?.('a[href*="github.com/mcsyauqi/kelolakonten-postiz"]');
    if (source) window.kelolaTrack('source_link_click', { placement: source.dataset.sourcePlacement || 'unknown' });
  });
}());
