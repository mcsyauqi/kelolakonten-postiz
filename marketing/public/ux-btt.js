/* Tombol kembali ke atas + progress bar baca. Tanpa library.
 * Konfigurasi lewat atribut di tag <script>:
 *   data-color   warna brand (latar tombol + bar), default #111
 *   data-fg      warna ikon, default #fff
 *   data-radius  radius tombol, default 12px
 *   data-label   aria-label, default "Kembali ke atas"
 *   data-header  selector header sticky (opsional; default deteksi otomatis)
 *   data-progress "0" untuk mematikan progress bar
 */
(function () {
  if (window.__uxBtt) return;
  window.__uxBtt = 1;
  var d = document, w = window;
  var sc = d.currentScript || d.querySelector('script[data-ux-btt]');
  var ds = (sc && sc.dataset) || {};
  var color = ds.color || '#111', fg = ds.fg || '#fff', radius = ds.radius || '12px';
  var label = ds.label || ((d.documentElement.lang || '').toLowerCase().indexOf('en') === 0 ? 'Back to top' : 'Kembali ke atas');
  var css = '' +
    '.uxb-prog{position:fixed;left:0;top:0;height:3px;width:100%;z-index:2147483000;pointer-events:none;background:transparent}' +
    '.uxb-prog.uxb-in{position:absolute;top:auto;bottom:0}' +
    '.uxb-prog>i{display:block;height:100%;width:0;background:' + color + ';transition:width .08s linear}' +
    '.uxb-btn{position:fixed;right:20px;bottom:20px;z-index:2147482999;width:48px;height:48px;min-width:44px;min-height:44px;padding:0;margin:0;border:0;border-radius:' + radius + ';' +
    'background:' + color + ';color:' + fg + ';display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.18);' +
    'opacity:0;visibility:hidden;transform:translateY(12px);transition:opacity .2s,transform .2s,visibility .2s}' +
    '.uxb-btn.uxb-on{opacity:1;visibility:visible;transform:none}' +
    '.uxb-btn:hover{filter:brightness(1.08)}' +
    '.uxb-btn:focus{outline:none}' +
    '.uxb-btn:focus-visible{outline:3px solid ' + color + ';outline-offset:3px;box-shadow:0 0 0 2px #fff,0 6px 18px rgba(0,0,0,.18)}' +
    '.uxb-btn svg{width:22px;height:22px;display:block}' +
    '@media (max-width:640px){.uxb-btn{right:14px;bottom:14px;width:46px;height:46px}}' +
    '@media (prefers-reduced-motion:reduce){.uxb-btn{transition:none}.uxb-prog>i{transition:none}}' +
    '@media print{.uxb-btn,.uxb-prog{display:none!important}}';
  var st = d.createElement('style');
  st.textContent = css;
  (d.head || d.documentElement).appendChild(st);

  function init() {
    if (d.querySelector('.uxb-btn')) return;
    // Progress bar: di tepi bawah header sticky/fixed, kalau tidak ada di top viewport.
    var bar = null;
    // Situs yang sudah punya progress bar sendiri: jangan dobel.
    var own = d.querySelector('#readingProgress, #reading-progress, .reading-progress, .read-progress, [data-reading-progress]');
    if (ds.progress !== '0' && !own) {
      bar = d.createElement('div');
      bar.className = 'uxb-prog';
      bar.setAttribute('aria-hidden', 'true');
      bar.appendChild(d.createElement('i'));
      var hd = null;
      var cands = ds.header ? d.querySelectorAll(ds.header) : d.querySelectorAll('header, .header, .site-header, .navbar, nav');
      for (var k = 0; k < cands.length; k++) {
        var cs = getComputedStyle(cands[k]);
        var r = cands[k].getBoundingClientRect();
        if ((cs.position === 'sticky' || cs.position === 'fixed') && r.top <= 1 && r.height > 20 && r.width > w.innerWidth * 0.6) { hd = cands[k]; break; }
      }
      if (hd) { bar.classList.add('uxb-in'); hd.appendChild(bar); }
      else d.body.appendChild(bar);
    }
    var btn = d.createElement('button');
    btn.type = 'button';
    btn.className = 'uxb-btn';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
    btn.addEventListener('click', function () {
      var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
      try { w.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { w.scrollTo(0, 0); }
    });
    d.body.appendChild(btn);

    var fill = bar && bar.firstChild, ticking = false;
    function update() {
      ticking = false;
      var y = w.scrollY || d.documentElement.scrollTop || 0;
      if (fill) {
        var h = d.documentElement.scrollHeight - w.innerHeight;
        fill.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
      }
      if (y > 400) btn.classList.add('uxb-on'); else btn.classList.remove('uxb-on');
    }
    function onScroll() { if (!ticking) { ticking = true; (w.requestAnimationFrame || setTimeout)(update); } }
    // Hindari elemen fixed lain di kanan bawah (tombol WA, chat, share bar): naikkan tombol di atasnya.
    function avoid() {
      dedupe();
      var vw = w.innerWidth, vh = w.innerHeight, base = vw <= 640 ? 14 : 20, need = base;
      var all = d.body.getElementsByTagName('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el === btn || el === bar || btn.contains(el) || (bar && bar.contains(el))) continue;
        var cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        if (r.bottom < vh - 160 || r.top > vh) continue;          // bukan di area bawah
        if (r.right < vw - 90) continue;                           // tidak menyentuh kolom kanan
        if (r.top < vh * 0.4) continue;                            // panel tinggi (drawer) diabaikan
        need = Math.max(need, Math.round(vh - r.top + 12));
      }
      btn.style.bottom = need + 'px';
    }
    // Tombol kembali ke atas lama bawaan tema (mis. dibuat main.js): sembunyikan supaya tidak dobel.
    function dedupe() {
      var olds = d.querySelectorAll('.back-to-top, #back-to-top, #backToTop, .backtotop, .scroll-to-top, #scroll-to-top, .scrolltop, #scrollTop, .go-top, #go-top, .to-top');
      for (var i = 0; i < olds.length; i++) {
        if (olds[i] === btn || btn.contains(olds[i])) continue;
        var cs = getComputedStyle(olds[i]);
        if (cs.position === 'fixed') olds[i].style.setProperty('display', 'none', 'important');
      }
    }
    w.addEventListener('scroll', onScroll, { passive: true });
    setTimeout(avoid, 600);
    // Banner cookie / chat yang ditutup lewat klik: hitung ulang posisi.
    d.addEventListener('click', function (e) { if (!btn.contains(e.target)) setTimeout(avoid, 450); }, true);
    w.addEventListener('resize', function () { onScroll(); avoid(); }, { passive: true });
    update(); avoid();
    setTimeout(avoid, 1500); setTimeout(avoid, 4000);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
