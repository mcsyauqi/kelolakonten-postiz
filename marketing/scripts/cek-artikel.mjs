#!/usr/bin/env node
/**
 * Gerbang mutu artikel Kelola Konten (pra-publish).
 *
 * Standar /artikel-seo yang dipakai gate audit Creativism
 * (D:/Projects/Creativism App/scripts/audit-artikel-kualitas.mjs, konstanta GATE):
 * 2000+ kata, 4+ gambar konten, 7+ FAQ (plus FAQPage schema), minimal 1 tabel.
 * Ditambah aturan situs: daftar isi, 10+ tautan internal, datePublished di JSON-LD,
 * tanpa em dash, tanpa ".html" di URL internal (URL bersih sejak 2026-10-07).
 *
 * Cara hitung SAMA dengan gate audit (wadah teks terbanyak, nav/aside/footer/header dibuang),
 * jadi gambar hero di dalam <header class="article-hero"> TIDAK dihitung: butuh 4 gambar di badan.
 *
 * Pakai (dari folder marketing/):
 *   node scripts/cek-artikel.mjs                      semua artikel di public/artikel/
 *   node scripts/cek-artikel.mjs public/artikel/x.html  hanya berkas itu, selalu memblok
 *
 * Artikel dengan datePublished >= BLOK_SEJAK (atau berkas yang disebut eksplisit) memblok:
 * exit 1. Artikel lama di bawah standar hanya peringatan (tunggakan dicatat di ledger
 * Creativism), supaya deploy harian tidak mati karena utang lama.
 * Dockerfile menjalankan skrip ini saat build, jadi artikel baru yang tipis membuat
 * deploy Coolify GAGAL dan terlihat merah, bukan diam-diam terbit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const GATE = { words: 2000, images: 4, faq: 7, tables: 1, internalLinks: 10 };
export const BLOK_SEJAK = "2026-10-10";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dirArtikel = path.join(root, "public", "artikel");

function contentImages(scope) {
  const seen = new Set();
  for (const m of scope.matchAll(/<img[^>]*>/gi)) {
    const tag = m[0];
    let src = (tag.match(/(?:data-src|data-lazy-src|src)="([^"]*)"/) || [])[1] || "";
    if (!src || /^data:/.test(src)) continue;
    if (/logo|icon|avatar|author|badge|favicon/i.test(src)) continue;
    seen.add(src.split("/").pop().split("?")[0]);
  }
  return seen.size;
}

function countFaq(html, scope) {
  let inSchema = 0;
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const nodes = Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed];
      for (const n of nodes) if (n && n["@type"] === "FAQPage") inSchema = Math.max(inSchema, (n.mainEntity || []).length);
    } catch {
      /* schema rusak dilaporkan terpisah */
    }
  }
  const summaries = (scope.match(/<summary/gi) || []).length;
  return { inSchema, summaries };
}

export function analyze(html) {
  const noSS = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  const arts = [...noSS.matchAll(/<article[\s\S]*?<\/article>/gi)].map((m) => m[0]);
  const kandidat = [
    arts.length ? arts.sort((a, b) => b.length - a.length)[0] : "",
    (noSS.match(/<main[\s\S]*?<\/main>/i) || [""])[0],
    noSS,
  ].filter(Boolean);
  const kataKasar = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").length;
  let scope = kandidat.reduce((a, b) => (kataKasar(b) > kataKasar(a) * 1.15 ? b : a));
  scope = scope.replace(/<(nav|aside|footer|header)[\s\S]*?<\/\1>/gi, "");
  const text = scope.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  const faq = countFaq(html, scope);
  const body = (noSS.match(/<article class="article-body"[\s\S]*?<\/article>/i) || [scope])[0];
  const internal = [...body.matchAll(/href="(\/[^"#]*)/g)].map((m) => m[1]);
  const ld = (html.match(/"datePublished":"(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
  return {
    words: text.split(" ").filter(Boolean).length,
    images: contentImages(scope),
    tables: (scope.match(/<table[^>]*>/gi) || []).length,
    faq: Math.max(faq.inSchema, faq.summaries),
    faqSchema: faq.inSchema,
    faqVisible: faq.summaries,
    internalLinks: new Set(internal).size,
    toc: /class="article-toc"/.test(html),
    datePublished: ld,
    emDash: (html.match(/\u2014/g) || []).length,
    htmlUrls: [...html.matchAll(/(?:href|content)="((?:https:\/\/kelolakonten\.com)?\/[^"]*\.html)"/g)].map((m) => m[1]),
  };
}

export function gagalGate(a) {
  const g = [];
  if (a.words < GATE.words) g.push(`kata ${a.words} < ${GATE.words}`);
  if (a.images < GATE.images) g.push(`gambar konten ${a.images} < ${GATE.images}`);
  if (a.faqVisible < GATE.faq) g.push(`FAQ terlihat ${a.faqVisible} < ${GATE.faq}`);
  if (a.faqSchema < GATE.faq) g.push(`FAQPage schema ${a.faqSchema} < ${GATE.faq}`);
  if (a.faqSchema !== a.faqVisible) g.push(`FAQ schema ${a.faqSchema} != FAQ terlihat ${a.faqVisible}`);
  if (a.tables < GATE.tables) g.push("tanpa tabel");
  if (a.internalLinks < GATE.internalLinks) g.push(`tautan internal ${a.internalLinks} < ${GATE.internalLinks}`);
  if (!a.toc) g.push("tanpa daftar isi");
  if (!a.datePublished) g.push("tanpa datePublished di JSON-LD");
  if (a.emDash) g.push(`em dash ${a.emDash}`);
  if (a.htmlUrls.length) g.push(`URL .html: ${a.htmlUrls.slice(0, 3).join(", ")}`);
  return g;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const eksplisit = process.argv.slice(2).filter((x) => !x.startsWith("--"));
  const files = eksplisit.length
    ? eksplisit.map((f) => path.resolve(f))
    : fs.readdirSync(dirArtikel).filter((f) => f.endsWith(".html") && f !== "index.html").map((f) => path.join(dirArtikel, f));
  let blok = 0;
  let peringatan = 0;
  for (const f of files.sort()) {
    const a = analyze(fs.readFileSync(f, "utf8"));
    const g = gagalGate(a);
    const wajib = eksplisit.length > 0 || (a.datePublished && a.datePublished >= BLOK_SEJAK);
    const label = path.basename(f);
    const angka = `kata ${a.words}, gambar ${a.images}, FAQ ${a.faqVisible}/${a.faqSchema} schema, tabel ${a.tables}, link ${a.internalLinks}`;
    if (!g.length) console.log(`LOLOS  ${label} (${angka})`);
    else if (wajib) {
      blok++;
      console.log(`GAGAL  ${label} (${angka})\n       ${g.join("; ")}`);
    } else {
      peringatan++;
      console.log(`WARN   ${label} terbit ${a.datePublished || "?"} sebelum ${BLOK_SEJAK}: ${g.join("; ")}`);
    }
  }
  console.log(`\n${files.length} artikel, ${blok} gagal memblok, ${peringatan} peringatan (artikel lama).`);
  if (blok) {
    console.error(`cek-artikel: ${blok} artikel di bawah standar. Perluas dulu, jangan terbitkan artikel tipis.`);
    process.exit(1);
  }
}
