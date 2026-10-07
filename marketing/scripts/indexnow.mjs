// IndexNow untuk kelolakonten.com.
//
// Dua cara pakai:
// 1. Otomatis saat deploy: server.mjs memanggil autoSubmit() 60 detik setelah kontainer baru hidup.
//    Fungsi ini membandingkan hash tiap halaman di sitemap.xml dengan manifest di data/indexnow-manifest.json
//    (volume persisten /app/data), lalu hanya mengirim URL yang baru atau berubah. Log tiap pengiriman
//    ditulis ke data/indexnow-log.ndjson. Matikan dengan env INDEXNOW_AUTO=0.
// 2. Manual dari laptop (folder website/marketing):
//      node scripts/indexnow.mjs --all                    kirim semua URL di sitemap.xml
//      node scripts/indexnow.mjs --urls <url> [<url>...]  kirim URL tertentu
//      node scripts/indexnow.mjs --changed                sama seperti mode otomatis (pakai manifest lokal di data/)
//      tambah --dry-run untuk melihat daftar URL tanpa mengirim.
//
// Berkas kunci publik: https://kelolakonten.com/5a239f9249c49d8ddecc17399be7b8a4.txt
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HOST = 'kelolakonten.com';
export const KEY = '5a239f9249c49d8ddecc17399be7b8a4';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const publicDir = join(projectRoot, 'public');
const dataDir = join(projectRoot, 'data');
const manifestPath = join(dataDir, 'indexnow-manifest.json');
const logPath = join(dataDir, 'indexnow-log.ndjson');

export function sitemapUrls() {
  const xml = readFileSync(join(publicDir, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]).filter(u => new URL(u).host === HOST);
}

function fileForUrl(u) {
  let p = decodeURIComponent(new URL(u).pathname);
  if (p.endsWith('/')) p += 'index.html';
  else if (!/\.[a-z0-9]+$/i.test(p)) p += '.html'; // URL bersih tanpa .html
  return join(publicDir, p);
}

function hashOf(u) {
  const f = fileForUrl(u);
  return existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex') : null;
}

export function changedUrls() {
  const old = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const next = {};
  const changed = [];
  for (const u of sitemapUrls()) {
    const h = hashOf(u);
    if (!h) continue;
    next[u] = h;
    if (old[u] !== h) changed.push(u);
  }
  return { changed, next };
}

export async function submit(urls) {
  if (!urls.length) return { status: 0, body: 'nothing to submit', count: 0 };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
  });
  const body = await res.text();
  const row = { at: new Date().toISOString(), status: res.status, count: urls.length, urls, body: body.slice(0, 300) };
  try { mkdirSync(dataDir, { recursive: true }); appendFileSync(logPath, JSON.stringify(row) + '\n'); } catch {}
  return row;
}

export async function autoSubmit() {
  const { changed, next } = changedUrls();
  if (!changed.length) { console.log('[indexnow] tidak ada URL berubah'); return; }
  const row = await submit(changed);
  console.log(`[indexnow] kirim ${row.count} URL, HTTP ${row.status}`);
  if (row.status === 200 || row.status === 202) writeFileSync(manifestPath, JSON.stringify(next, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run');
  let urls;
  if (args.includes('--all')) urls = sitemapUrls();
  else if (args.includes('--urls')) urls = args.slice(args.indexOf('--urls') + 1).filter(a => !a.startsWith('--'));
  else if (args.includes('--changed')) urls = changedUrls().changed;
  else { console.log('Pakai: node scripts/indexnow.mjs --all | --changed | --urls <url>... [--dry-run]'); process.exit(1); }
  if (dry) { console.log(urls.join('\n')); console.log(`${urls.length} URL (dry run)`); process.exit(0); }
  const row = await submit(urls);
  console.log(JSON.stringify({ status: row.status, count: row.count, body: row.body }));
  if (args.includes('--changed') && (row.status === 200 || row.status === 202)) writeFileSync(manifestPath, JSON.stringify(changedUrls().next, null, 2));
  process.exit(row.status === 200 || row.status === 202 ? 0 : 1);
}
