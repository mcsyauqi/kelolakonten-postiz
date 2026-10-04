import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, appendFileSync, readFileSync } from 'node:fs';
import { join, normalize, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(projectRoot, 'public');
const dataDir = resolve(projectRoot, 'data');
mkdirSync(dataDir, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.woff2':'font/woff2', '.ico':'image/x-icon' };
const attempts = new Map();
const roles = new Set(['UMKM', 'Agensi', 'Kreator']);

function headers(status, type, cache = 'no-store') {
  return { 'Content-Type': type, 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };
}
function send(res, status, type, body, cache) { res.writeHead(status, headers(status, type, cache)); res.end(body); }
function readBody(req) { return new Promise((resolveBody, reject) => { let raw = ''; req.on('data', chunk => { raw += chunk; if (raw.length > 20000) reject(new Error('too_large')); }); req.on('end', () => resolveBody(raw)); req.on('error', reject); }); }
function rateLimited(ip) {
  const now = Date.now();
  const row = attempts.get(ip) || { count: 0, started: now };
  if (now - row.started > 10 * 60 * 1000) { row.count = 0; row.started = now; }
  row.count += 1;
  attempts.set(ip, row);
  return row.count > 30;
}
function emailValid(value) { return value.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value); }

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/api/waitlist') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (rateLimited(ip)) return send(res, 429, 'application/json; charset=utf-8', JSON.stringify({ ok: false, error: 'rate_limited' }));
    try {
      const body = JSON.parse(await readBody(req));
      const email = String(body.email || '').trim().toLowerCase();
      const role = roles.has(String(body.role || '')) ? String(body.role) : 'UMKM';
      const consent = body.consent === true;
      if (!emailValid(email)) return send(res, 400, 'application/json; charset=utf-8', JSON.stringify({ ok: false, error: 'email_invalid' }));
      if (!consent) return send(res, 400, 'application/json; charset=utf-8', JSON.stringify({ ok: false, error: 'consent_required' }));
      const waitlistPath = join(dataDir, 'waitlist.ndjson');
      const duplicate = existsSync(waitlistPath) && readFileSync(waitlistPath, 'utf8').split(/\r?\n/).some(line => {
        try { return JSON.parse(line).email === email; } catch { return false; }
      });
      if (duplicate) return send(res, 200, 'application/json; charset=utf-8', JSON.stringify({ ok: true, duplicate: true }), 'no-store');
      appendFileSync(waitlistPath, JSON.stringify({ email, role, consentAt: new Date().toISOString() }) + '\n', { encoding: 'utf8', flag: 'a' });
      return send(res, 201, 'application/json; charset=utf-8', JSON.stringify({ ok: true }), 'no-store');
    } catch { return send(res, 400, 'application/json; charset=utf-8', JSON.stringify({ ok: false, error: 'request_invalid' })); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain; charset=utf-8', 'Method Not Allowed');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'text/plain; charset=utf-8', 'Bad Request'); }
  if (pathname === '/') pathname = '/index.html';
  if (/\/[^/]+\.html\/$/i.test(pathname)) {
    const clean = pathname.replace(/\/$/, '');
    res.writeHead(301, { Location: clean, ...headers(301, 'text/plain; charset=utf-8') });
    return res.end();
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  else if (!extname(pathname)) pathname += '.html';
  const safePath = normalize(pathname).replace(/^([.][.][/\\])+/, '');
  const file = resolve(root, `.${safePath.startsWith('/') ? safePath : `/${safePath}`}`);
  if (!file.startsWith(root + sep) && file !== root) return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
  if (!existsSync(file)) {
    const custom404 = join(root, '404.html');
    if (existsSync(custom404)) {
      res.writeHead(404, headers(404, 'text/html; charset=utf-8'));
      if (req.method === 'HEAD') return res.end();
      return createReadStream(custom404).pipe(res);
    }
    return send(res, 404, 'text/html; charset=utf-8', '<!doctype html><title>Halaman tidak ditemukan | Kelola Konten</title><p>Halaman ini belum ada. <a href="/">Kembali ke beranda</a>.</p>');
  }
  const contentType = mime[extname(file).toLowerCase()] || 'application/octet-stream';
  const cache = ['.css', '.js', '.html'].includes(extname(file).toLowerCase()) ? 'no-cache' : 'public, max-age=300';
  res.writeHead(200, headers(200, contentType, cache));
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
});
server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log(`Kelola Konten marketing listening on ${process.env.PORT || 8080}`));


