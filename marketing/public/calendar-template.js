// Track access to the template; an external Google copy still requires the visitor's account.
document.querySelectorAll('[data-template-export]').forEach((link) => {
  link.addEventListener('click', () => {
    window.kelolaTrack?.('template_copied', {
      tool: 'template_kalender',
      method: link.dataset.templateExport,
      period: '7_hari'
    });
  });
});
