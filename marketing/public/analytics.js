(function () {
  const measurementId = 'G-N3GL8Q20VC';
  const consentStorageKey = 'kelola_analytics_consent';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  const loadGoogleTag = () => {
    if (document.querySelector(`script[data-kelola-gtag="${measurementId}"]`)) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.kelolaGtag = measurementId;
    document.head.append(script);
  };

  window.kelolaGrantAnalytics = function () {
    if (window.kelolaAnalyticsConsentGranted) return;
    window.kelolaAnalyticsConsentGranted = true;
    try { window.localStorage.setItem(consentStorageKey, 'granted'); } catch {}
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('config', measurementId, { anonymize_ip: true, allow_google_signals: false });
    loadGoogleTag();
  };

  window.kelolaTrack = function (name, params) {
    const safe = params || {};
    window.dataLayer.push({ event: name, ...safe });
    if (window.kelolaAnalyticsConsentGranted) window.gtag('event', name, safe);
  };

  try {
    if (window.localStorage.getItem(consentStorageKey) === 'granted') window.kelolaGrantAnalytics();
  } catch {}

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[data-wa-cta]');
    if (link) window.kelolaTrack('wa_cta_click', { placement: link.dataset.waCta || 'unknown' });
    const source = event.target.closest?.('a[href*="github.com/mcsyauqi/kelolakonten-postiz"]');
    if (source) window.kelolaTrack('source_link_click', { placement: source.dataset.sourcePlacement || 'unknown' });
  });
}());

