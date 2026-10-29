// Rakit ulang semua tautan WhatsApp CS (wa.me/6285136212005) di public/**/*.html supaya teks pra-isinya
// memuat brand + domain + URL lengkap halaman asal + maksud CTA. Idempoten: aman dijalankan berulang.
// URL halaman diambil dari <link rel="canonical"> (sudah origin + pathname bersih, tanpa query/hash).
// Halaman tanpa canonical (404) dirakit di sisi klien dari location.origin + location.pathname.
// Dipanggil di Dockerfile setelah build-artikel-hub.mjs (generator hub juga memakai prefillHtml untuk halamannya).
//   node scripts/wa-prefill.mjs           tulis perubahan
//   node scripts/wa-prefill.mjs --check   exit 1 kalau ada berkas yang belum sinkron
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NUMBER = '6285136212005';
const BRAND = 'Kelola Konten';
const HOST = 'kelolakonten.com';

const decodeEntities = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const escapeAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const stripTags = s => decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const closing = lang => (lang === 'en' ? ' Could you help?' : ' Bisa dibantu?');
const header = (lang, pageUrl) => lang === 'en'
  ? `Hello ${BRAND}, I'm from ${HOST}. Page: ${pageUrl}.`
  : `Halo ${BRAND}, saya dari ${HOST}. Halaman: ${pageUrl}.`;

// Ambil maksud CTA dari teks lama (format lama maupun format hasil skrip ini).
function intentFromText(text) {
  let t = text.trim()
    .replace(/^(Halo|Hello) Kelola Konten, (saya dari|I'm from) kelolakonten\.com\.\s*/i, '')
    .replace(/^(Halaman|Page): https?:\/\/\S+?\.(?=\s|$)\s*/i, '')
    .replace(/\s*(Bisa dibantu\?|Could you help\?)$/i, '')
    .replace(/^Halo( Kelola Konten)?,\s*/i, '')
    .trim();
  if (!t) return '';
  t = t[0].toUpperCase() + t.slice(1);
  return /[.?!]$/.test(t) ? t : `${t}.`;
}

function defaultIntent({ lang, anchorText, isArticle, title }) {
  if (lang === 'en') return "I'd like to ask about Kelola Konten.";
  if (/daftar tunggu/i.test(anchorText)) return 'Saya ingin gabung daftar tunggu Kelola Konten.';
  if (isArticle && title) return `Saya ingin tanya tentang Kelola Konten setelah membaca artikel "${title}".`;
  return 'Saya ingin tanya tentang Kelola Konten.';
}

const CLIENT_SCRIPT = `<script data-wa-prefill>(function(){var u=location.origin+location.pathname;document.querySelectorAll('a[data-wa-intent]').forEach(function(a){a.href='https://wa.me/${NUMBER}?text='+encodeURIComponent('Halo ${BRAND}, saya dari ${HOST}. Halaman: '+u+'. '+a.getAttribute('data-wa-intent')+' Bisa dibantu?');});})();</script>`;
const LINK_RE = /<a\b([^>]*?)\bhref="https:\/\/wa\.me\/6285136212005(?:\?text=([^"]*))?"([^>]*)>([\s\S]*?)<\/a>/gi;
const INTENT_ATTR_RE = /\s*data-wa-intent="[^"]*"/g;

export function prefillHtml(html) {
  if (!html.includes(`wa.me/${NUMBER}`)) return html;
  const lang = (html.match(/<html[^>]*\blang="([a-z]+)/i) || [])[1] === 'en' ? 'en' : 'id';
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/i) || [])[1];
  const pageUrl = canonical ? canonical.split(/[?#]/)[0] : null;
  const isArticle = /\/artikel\/(?!halaman\/)[^/]+$/.test(pageUrl || '');
  const title = stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');

  let out = html.replace(LINK_RE, (m, pre, enc, post, inner) => {
    let old = '';
    try { old = enc ? decodeURIComponent(decodeEntities(enc)) : ''; } catch { old = ''; }
    const attrIntent = (m.match(/data-wa-intent="([^"]*)"/) || [])[1];
    const intent = (attrIntent && decodeEntities(attrIntent)) || intentFromText(old) || defaultIntent({ lang, anchorText: stripTags(inner), isArticle, title });
    const cleanPre = pre.replace(INTENT_ATTR_RE, '');
    const cleanPost = post.replace(INTENT_ATTR_RE, '');
    if (!pageUrl) {
      // Tanpa canonical: href statis tanpa URL halaman (fallback no-JS), dilengkapi skrip klien saat dimuat.
      const fallback = `Halo ${BRAND}, saya dari ${HOST}. ${intent}${closing(lang)}`;
      return `<a${cleanPre} data-wa-intent="${escapeAttr(intent)}" href="https://wa.me/${NUMBER}?text=${encodeURIComponent(fallback)}"${cleanPost}>${inner}</a>`;
    }
    const text = `${header(lang, pageUrl)} ${intent}${closing(lang)}`;
    return `<a${cleanPre}href="https://wa.me/${NUMBER}?text=${encodeURIComponent(text)}"${cleanPost}>${inner}</a>`;
  });
  if (!pageUrl && !out.includes('data-wa-prefill')) out = out.replace(/<\/body>/i, `${CLIENT_SCRIPT}</body>`);
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../public', import.meta.url));
  const check = process.argv.includes('--check');
  const walk = dir => readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });
  let changed = 0;
  for (const file of walk(root)) {
    const html = readFileSync(file, 'utf8');
    const out = prefillHtml(html);
    if (out === html) continue;
    changed++;
    if (check) console.error(`[wa-prefill] belum sinkron: ${relative(root, file)}`);
    else writeFileSync(file, out);
  }
  console.log(`[wa-prefill] ${check ? 'perlu diperbarui' : 'diperbarui'}: ${changed} berkas`);
  if (check && changed) process.exit(1);
}
