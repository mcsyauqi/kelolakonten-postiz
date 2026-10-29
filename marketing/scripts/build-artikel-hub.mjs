#!/usr/bin/env node
/**
 * Generator hub artikel Kelola Konten (tanpa dependensi).
 *
 * Membaca semua public/artikel/<slug>.html, mengurutkan dari datePublished terbaru,
 * lalu menulis:
 *   public/artikel/index.html          halaman 1 (URL /artikel/)
 *   public/artikel/halaman/<N>.html    halaman 2 dst. (URL /artikel/halaman/<N>)
 *   sitemap.xml                        entri /artikel/ dan /artikel/halaman/<N> disegarkan
 * Halaman paginasi yang tidak lagi dibutuhkan dihapus. Jumlah halaman dihitung dari jumlah
 * artikel, jadi artikel baru otomatis memunculkan halaman baru.
 *
 * Isi kartu: label, judul pendek, ringkasan, dan gambar boleh diatur di scripts/artikel-hub.json
 * (kunci = slug). Tanpa entri, kartu tetap muncul memakai <h1>, meta description, dan
 * gambar/<slug>-hero.webp (atau og:image) dari artikelnya, dengan label "Artikel".
 *
 * Header, footer, dan isi <head> lain diambil dari public/artikel/index.html yang sudah ada,
 * jadi perubahan header/footer situs pada berkas itu tetap terbawa.
 *
 * Pakai (dari folder marketing/):
 *   node scripts/build-artikel-hub.mjs           tulis ulang hub + sitemap
 *   node scripts/build-artikel-hub.mjs --check   exit 1 kalau hasil belum sinkron (tidak menulis)
 * Dockerfile menjalankan skrip ini saat build, jadi deploy selalu memakai hub terbaru.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prefillHtml } from './wa-prefill.mjs';

export const PER_HALAMAN = 12;
const SITE = 'https://kelolakonten.com';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const dirArtikel = path.join(pub, 'artikel');
const dirHalaman = path.join(dirArtikel, 'halaman');
const fileIndex = path.join(dirArtikel, 'index.html');
const fileSitemap = path.join(pub, 'sitemap.xml');
const fileManifest = path.join(root, 'scripts', 'artikel-hub.json');
const CHECK = process.argv.includes('--check');

const JUDUL = 'Artikel media sosial';
const H1 = 'Panduan untuk kerja konten yang dapat diperiksa.';
const INTRO = 'Artikel ini membantu memilih rumus, menyusun kalender, dan menjelaskan batas koneksi platform.';
const DESKRIPSI = 'Panduan praktis untuk kalender konten, engagement rate, dan workflow UMKM.';
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const attr = (s) => String(s).replace(/&(?!#?\w+;)/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const urlHalaman = (n) => (n === 1 ? '/artikel/' : `/artikel/halaman/${n}`);
const fileHalaman = (n) => (n === 1 ? fileIndex : path.join(dirHalaman, `${n}.html`));

const manifest = fs.existsSync(fileManifest) ? JSON.parse(fs.readFileSync(fileManifest, 'utf8')) : {};
const urutManifest = Object.keys(manifest);

// 1. Kumpulkan artikel
const artikel = [];
for (const f of fs.readdirSync(dirArtikel)) {
  if (!f.endsWith('.html') || f === 'index.html') continue;
  const slug = f.slice(0, -5);
  const html = fs.readFileSync(path.join(dirArtikel, f), 'utf8');
  if (/<meta[^>]+name="robots"[^>]+noindex/i.test(html)) continue;
  const tanggal = (html.match(/"datePublished"\s*:\s*"([^"]+)"/) || [])[1];
  if (!tanggal) { console.warn(`[hub] lewati ${f}: tanpa datePublished`); continue; }
  const m = manifest[slug] || {};
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || slug;
  const desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '';
  let gambar = m.gambar;
  if (!gambar && fs.existsSync(path.join(dirArtikel, 'gambar', `${slug}-hero.webp`))) gambar = `/artikel/gambar/${slug}-hero.webp`;
  if (!gambar) gambar = ((html.match(/property="og:image"\s+content="([^"]*)"/) || [])[1] || '/og-default.png').replace(SITE, '');
  artikel.push({
    slug, tanggal, gambar,
    label: m.label || 'Artikel',
    judul: m.judul || (h1 ? plain(h1) : title.replace(/\s*\|\s*Kelola Konten$/, '')),
    ringkasan: m.ringkasan || desc,
    urut: urutManifest.includes(slug) ? urutManifest.indexOf(slug) : Infinity,
  });
}
artikel.sort((a, b) => (Date.parse(b.tanggal) - Date.parse(a.tanggal)) || (a.urut - b.urut) || a.slug.localeCompare(b.slug));
const total = artikel.length;
const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));

// 2. Kerangka dari index.html yang ada
const shell = fs.readFileSync(fileIndex, 'utf8');
const iMain = shell.indexOf('<main>');
const iMainEnd = shell.indexOf('</main>');
if (iMain < 0 || iMainEnd < 0) throw new Error('index.html tidak punya <main>...</main>');
const before = shell.slice(0, iMain);
const after = shell.slice(iMainEnd + '</main>'.length);

function tanggalTampil(iso) {
  const [y, mo, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${BULAN[mo - 1]} ${y}`;
}

function kartu(a, i) {
  const muat = i < 3 ? 'fetchpriority="high"' : 'loading="lazy"';
  const url = `/artikel/${a.slug}`;
  return `<article class="resource resource-has-media"><a class="resource-media" href="${url}" tabindex="-1" aria-hidden="true"><img src="${attr(a.gambar)}" alt="" width="1200" height="630" ${muat} decoding="async"></a>`
    + `<div class="resource-top"><span class="eyebrow">${a.label}</span><time datetime="${a.tanggal.slice(0, 10)}">${tanggalTampil(a.tanggal)}</time></div>`
    + `<h2>${a.judul}</h2><p>${a.ringkasan}</p><a class="resource-link" href="${url}" aria-label="Baca artikel: ${attr(plain(a.judul))}">Baca artikel</a></article>`;
}

function nomorTampil(n) {
  // 1, terakhir, dan tetangga halaman aktif; sisanya diringkas jadi elipsis.
  const set = new Set([1, jumlahHalaman, n - 1, n, n + 1].filter((x) => x >= 1 && x <= jumlahHalaman));
  const list = [...set].sort((a, b) => a - b);
  const out = [];
  list.forEach((x, i) => { if (i && x - list[i - 1] > 1) out.push(null); out.push(x); });
  return out;
}

function navigasi(n) {
  if (jumlahHalaman < 2) return '';
  const prev = n > 1
    ? `<a class="page-step" href="${urlHalaman(n - 1)}" rel="prev"><span aria-hidden="true">←</span> Sebelumnya</a>`
    : `<span class="page-step is-disabled" aria-hidden="true"><span>←</span> Sebelumnya</span>`;
  const next = n < jumlahHalaman
    ? `<a class="page-step" href="${urlHalaman(n + 1)}" rel="next">Berikutnya <span aria-hidden="true">→</span></a>`
    : `<span class="page-step is-disabled" aria-hidden="true">Berikutnya <span>→</span></span>`;
  const nums = nomorTampil(n).map((x) => (x === null
    ? '<span class="page-gap" aria-hidden="true">…</span>'
    : x === n
      ? `<span class="page-num" aria-current="page">${x}</span>`
      : `<a class="page-num" href="${urlHalaman(x)}" aria-label="Halaman ${x}">${x}</a>`)).join('');
  return `<nav class="pagination" aria-label="Halaman daftar artikel">${prev}<div class="page-nums">${nums}</div>${next}</nav>`;
}

function halaman(n) {
  const isi = artikel.slice((n - 1) * PER_HALAMAN, n * PER_HALAMAN);
  const awal = (n - 1) * PER_HALAMAN + 1;
  const akhir = awal + isi.length - 1;
  const url = SITE + urlHalaman(n);
  const title = n === 1 ? `${JUDUL} | Kelola Konten` : `${JUDUL} - Halaman ${n} | Kelola Konten`;
  const desc = n === 1 ? DESKRIPSI : `${DESKRIPSI} Halaman ${n} dari ${jumlahHalaman}.`;
  const crumbs = [{ name: 'Beranda', item: `${SITE}/` }, { name: JUDUL, item: `${SITE}/artikel/` }];
  if (n > 1) crumbs.push({ name: `Halaman ${n}`, item: url });
  const ldCrumb = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })) });
  const ldList = JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title.replace(/ \| Kelola Konten$/, ''), url, mainEntity: { '@type': 'ItemList', numberOfItems: isi.length, itemListElement: isi.map((a, i) => ({ '@type': 'ListItem', position: awal + i, url: `${SITE}/artikel/${a.slug}` })) } });
  const relLinks = (n > 1 ? `<link rel="prev" href="${SITE}${urlHalaman(n - 1)}">` : '') + (n < jumlahHalaman ? `<link rel="next" href="${SITE}${urlHalaman(n + 1)}">` : '');

  let head = before
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(desc)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${attr(desc)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`)
    .replace(/<link rel="(prev|next)" href="[^"]*">/g, '')
    .replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema.org","@type":"(BreadcrumbList|CollectionPage)"[\s\S]*?<\/script>/g, '')
    .replace('</head>', `<script type="application/ld+json">${ldCrumb}</script><script type="application/ld+json">${ldList}</script>${relLinks}</head>`);

  const konteks = jumlahHalaman > 1
    ? `${total} artikel · menampilkan ${awal}-${akhir} · halaman ${n} dari ${jumlahHalaman}`
    : `${total} artikel`;
  const main = `<main><section class="section wrap hub-artikel"><div class="section-head"><div class="eyebrow">Belajar</div><h1>${H1}</h1><p>${INTRO}</p><p class="hub-count">${konteks}</p></div>`
    + `<div class="resource-grid">\n${isi.map(kartu).join('\n')}</div>${navigasi(n)}</section>\n</main>`;
  return head + main + after;
}

// 3. Tulis / cek
const hasil = new Map();
// Tautan WA di header/footer disalin dari index.html; rakit ulang supaya URL halaman di teks pra-isi benar per halaman.
for (let n = 1; n <= jumlahHalaman; n++) hasil.set(fileHalaman(n), prefillHtml(halaman(n)));

const stale = fs.existsSync(dirHalaman)
  ? fs.readdirSync(dirHalaman).filter((f) => /^\d+\.html$/.test(f) && !hasil.has(path.join(dirHalaman, f))).map((f) => path.join(dirHalaman, f))
  : [];

// sitemap: entri /artikel/ dan /artikel/halaman/N, lastmod = artikel terbaru (artikel baru menggeser isi semua halaman)
let sitemap = fs.readFileSync(fileSitemap, 'utf8');
const eol = sitemap.includes('\r\n') ? '\r\n' : '\n';
sitemap = sitemap.replace(/[ \t]*<url><loc>https:\/\/kelolakonten\.com\/artikel\/(halaman\/\d+)?<\/loc>.*?<\/url>\r?\n/g, '');
const entri = [];
for (let n = 1; n <= jumlahHalaman; n++) {
  const terbaru = artikel[0]?.tanggal.slice(0, 10) || new Date().toISOString().slice(0, 10);
  entri.push(`  <url><loc>${SITE}${urlHalaman(n)}</loc><lastmod>${terbaru}</lastmod></url>${eol}`);
}
sitemap = sitemap.replace('</urlset>', entri.join('') + '</urlset>');
hasil.set(fileSitemap, sitemap);

let beda = [...hasil].filter(([f, isi]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== isi).map(([f]) => f);
if (CHECK) {
  const semua = [...beda, ...stale];
  if (semua.length) { console.error(`[hub] belum sinkron: ${semua.map((f) => path.relative(root, f)).join(', ')}\nJalankan: node scripts/build-artikel-hub.mjs`); process.exit(1); }
  console.log(`[hub] sinkron: ${total} artikel, ${jumlahHalaman} halaman`);
} else {
  fs.mkdirSync(dirHalaman, { recursive: true });
  for (const f of beda) fs.writeFileSync(f, hasil.get(f));
  for (const f of stale) fs.unlinkSync(f);
  console.log(`[hub] ${total} artikel, ${jumlahHalaman} halaman (${PER_HALAMAN}/halaman); ditulis ${beda.length}, dihapus ${stale.length}`);
}
