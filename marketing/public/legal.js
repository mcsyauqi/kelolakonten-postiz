// Shows the confirmation code when a visitor arrives from a data deletion
// callback response (privacy page opened with ?code=...).
(() => {
  const code = new URLSearchParams(window.location.search).get('code');
  const box = document.querySelector('.legal-status');
  if (!code || !box || !/^[A-Za-z0-9]{6,64}$/.test(code)) return;
  box.querySelector('[data-deletion-code]').textContent = code;
  box.hidden = false;
  box.scrollIntoView({ block: 'center' });
})();
