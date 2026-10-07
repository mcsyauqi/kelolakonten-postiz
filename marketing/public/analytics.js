(function () {
  const measurementId = 'G-N3GL8Q20VC';
  const consentStorageKey = 'kelola_analytics_consent';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  const readChoice = () => { try { return window.localStorage.getItem(consentStorageKey); } catch { return null; } };
  const saveChoice = (value) => { try { window.localStorage.setItem(consentStorageKey, value); } catch {} };

  const loadGoogleTag = () => {
    if (document.querySelector(`script[data-kelola-gtag="${measurementId}"]`)) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.kelolaGtag = measurementId;
    document.head.append(script);
  };

  const removeBanner = () => document.querySelector('[data-kelola-consent]')?.remove();

  window.kelolaGrantAnalytics = function () {
    removeBanner();
    if (window.kelolaAnalyticsConsentGranted) return;
    window.kelolaAnalyticsConsentGranted = true;
    saveChoice('granted');
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('config', measurementId, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
    loadGoogleTag();
  };

  window.kelolaDenyAnalytics = function () {
    saveChoice('denied');
    removeBanner();
  };

  // Parameter event hanya boleh berisi nilai pendek tanpa data pribadi (tanpa email, nomor, atau teks bebas pengunjung).
  const cleanParams = (params) => {
    const safe = {};
    Object.entries(params || {}).forEach(([key, value]) => {
      if (typeof value === 'boolean' || typeof value === 'number') safe[key] = value;
      else if (typeof value === 'string' && !/@|\d{8,}/.test(value)) safe[key] = value.slice(0, 60);
    });
    return safe;
  };

  window.kelolaTrack = function (name, params) {
    const safe = cleanParams(params);
    window.dataLayer.push({ event: name, ...safe });
    if (window.kelolaAnalyticsConsentGranted) window.gtag('event', name, safe);
  };

  const showBanner = () => {
    if (document.querySelector('[data-kelola-consent]')) return;
    const style = document.createElement('style');
    style.textContent = '.kk-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#fff;color:var(--ink,#172338);border:1px solid var(--line,#e1e5ec);border-radius:12px;box-shadow:0 16px 24px -8px rgba(15,23,42,.18);padding:16px 18px;font:15px/1.5 var(--body,system-ui,sans-serif)}.kk-consent p{margin:0 0 12px}.kk-consent a{color:var(--accent,#1e5bd8)}.kk-consent-actions{display:flex;gap:10px;flex-wrap:wrap}.kk-consent button{font:inherit;font-weight:600;border-radius:8px;padding:9px 16px;cursor:pointer;border:1px solid var(--accent,#1e5bd8)}.kk-consent .kk-yes{background:var(--accent,#1e5bd8);color:#fff}.kk-consent .kk-no{background:#fff;color:var(--accent,#1e5bd8)}';
    const box = document.createElement('div');
    box.className = 'kk-consent';
    box.dataset.kelolaConsent = '';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Persetujuan analitik');
    box.innerHTML = '<p>Kami memakai analitik anonim (Google Analytics) untuk mengetahui halaman dan alat mana yang berguna. Tidak ada data yang dikirim sebelum kamu setuju, dan event tidak memuat email. <a href="/privacy">Kebijakan privasi</a>.</p><div class="kk-consent-actions"><button type="button" class="kk-yes" data-consent-accept>Terima</button><button type="button" class="kk-no" data-consent-reject>Tolak</button></div>';
    box.querySelector('[data-consent-accept]').addEventListener('click', () => window.kelolaGrantAnalytics());
    box.querySelector('[data-consent-reject]').addEventListener('click', () => window.kelolaDenyAnalytics());
    document.head.append(style);
    document.body.append(box);
  };

  const choice = readChoice();
  if (choice === 'granted') window.kelolaGrantAnalytics();
  else if (choice !== 'denied') {
    if (document.body) showBanner();
    else document.addEventListener('DOMContentLoaded', showBanner);
  }

  const placementOf = (link) => {
    if (link.closest('footer')) return 'footer';
    if (link.closest('header, nav')) return 'nav';
    if (link.closest('article')) return 'article';
    return 'body';
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[data-wa-cta], a[href*="wa.me/"]');
    if (link) window.kelolaTrack('wa_cta_click', { placement: link.dataset.waCta || `${placementOf(link)}_${window.location.pathname.split('/').filter(Boolean)[0] || 'home'}` });
    const source = event.target.closest?.('a[href*="github.com/mcsyauqi/kelolakonten-postiz"]');
    if (source) window.kelolaTrack('source_link_click', { placement: source.dataset.sourcePlacement || placementOf(source) });
  });
}());
