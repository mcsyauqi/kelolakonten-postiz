# Kelola Konten: serah terima development

Diperbarui 13 Oktober 2026. Dokumen ini untuk developer yang melanjutkan Kelola Konten (dashboard aplikasi dan integrasi media sosial). Repo ini publik (AGPL-3.0), jadi **jangan menulis kunci, token, atau kata sandi di repo**. Semua rahasia ada di environment Coolify.

## Gambaran singkat

| Bagian | Isi | Lokasi kode | URL live |
|---|---|---|---|
| Situs marketing | HTML statis + server Node kecil (waitlist, redirect www/http) | `marketing/` (`marketing/public/` untuk halaman, artikel di `marketing/public/artikel/`) | https://kelolakonten.com |
| Aplikasi | Fork Postiz (Next.js frontend, NestJS backend, orchestrator Temporal) yang di-rebrand | `apps/`, `libraries/`, `docker-compose.kelolakonten.yaml` | https://app.kelolakonten.com |

Hosting: Coolify pribadi `coolify.mcsyauqi.com` (VPS Hostinger 72.61.143.148), DNS di Cloudflare (DNS-only, SSL Let's Encrypt via Coolify).

- App marketing: Coolify uuid `svuje7kxurw8exrvuj6gyjbj` (Dockerfile `marketing/Dockerfile`, volume persisten `/app/data` untuk waitlist lama).
- App Postiz: Coolify uuid `akiajnygc6oe6cbuir9ocupm` (docker compose `docker-compose.kelolakonten.yaml`: postiz, postgres, redis, temporal + db + elasticsearch). Build dari source sekitar 25 menit.
- Instance pribadi `postiz.mcsyauqi.com` adalah milik Syauqi dan TERPISAH. Jangan diubah.

## Deploy

Push ke `main` otomatis memicu deploy lewat workflow `.github/workflows/kelolakonten-deploy.yml`:

- perubahan di `marketing/**` men-deploy situs (sekitar 1 menit);
- perubahan di `apps/**`, `libraries/**`, compose, `package.json`, `pnpm-lock.yaml` men-deploy aplikasi (sekitar 25 menit).

Deploy manual: tab Actions, workflow "Kelola Konten deploy", Run workflow, pilih `marketing`, `app`, atau `both`. Token di secret `COOLIFY_DEPLOY_TOKEN` hanya bisa memicu deploy, jadi hasilnya dicek di situs live (atau dashboard Coolify bagi yang punya akses). Satu deploy aplikasi berjalan dalam satu waktu; jangan memicu berulang saat antrean server masih jalan.

Commit author yang dipakai selama ini: `Ahmad Thariq Syauqi <ahmadthariqsyauqi@gmail.com>`. Developer lain boleh memakai identitasnya sendiri karena hosting di Coolify, bukan Vercel.

## Environment aplikasi (nama variabel, nilainya di Coolify)

| Variabel | Status 13 Okt 2026 | Catatan |
|---|---|---|
| `MAIN_URL`, `FRONTEND_URL` | terisi | `https://app.kelolakonten.com` |
| `NEXT_PUBLIC_BACKEND_URL` | terisi | `https://app.kelolakonten.com/api` |
| `DISABLE_REGISTRATION` | `false` | pendaftaran publik dibuka 12 Okt 2026 |
| `EMAIL_PROVIDER` | `resend` | aktivasi akun wajib lewat email kalau provider aktif |
| `RESEND_API_KEY` | terisi | kunci send-only, domain `mail.creativismagency.com` |
| `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` | `noreply@mail.creativismagency.com` / `Kelola Konten` | domain kelolakonten.com belum bisa ditambahkan (batas paket Resend) |
| `EMAIL_REPLY_TO` | `hello@kelolakonten.com` (default compose) | |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | terisi | app Meta "Claude Code" (1206217927733062), mode development |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | terisi | OAuth client Google `202241489596-...` |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | terisi | app LinkedIn yang sudah ada |
| `TIKTOK_CLIENT_ID` / `TIKTOK_CLIENT_SECRET` | kosong | belum ada app TikTok for Developers |
| `INSTAGRAM_APP_ID/SECRET`, `THREADS_APP_ID/SECRET` | kosong | Instagram saat ini lewat login Facebook (provider `instagram`) |

## Integrasi media sosial: yang tersisa

Redirect URI dibentuk dari `FRONTEND_URL` + `/integrations/social/<provider>`. Kunci sudah terpasang, tetapi **alamat berikut belum didaftarkan di dashboard platform**, jadi tombol "Tambah Channel" untuk platform ini belum bisa dipakai:

| Platform | Daftarkan di | Redirect URI |
|---|---|---|
| Facebook Page | Meta for Developers, app "Claude Code", Facebook Login for Business, Valid OAuth Redirect URIs | `https://app.kelolakonten.com/integrations/social/facebook` |
| Instagram (via Facebook) | sama | `https://app.kelolakonten.com/integrations/social/instagram` |
| YouTube | Google Cloud Console, Credentials, OAuth client `202241489596-...`, Authorized redirect URIs | `https://app.kelolakonten.com/integrations/social/youtube` |
| LinkedIn profil / Page | LinkedIn Developers, Auth, Authorized redirect URLs | `https://app.kelolakonten.com/integrations/social/linkedin` dan `.../linkedin-page` |
| TikTok | buat app di developers.tiktok.com dulu, lalu isi `TIKTOK_CLIENT_ID/SECRET` | `https://app.kelolakonten.com/integrations/social/tiktok` |

Batasan platform yang wajib dijaga di copy dan UI:

- Meta app masih mode development: hanya akun yang punya peran di app (admin, developer, tester) yang bisa menghubungkan Instagram/Facebook. Untuk pengguna umum perlu App Review + Business Verification.
- TikTok dan YouTube: video dari aplikasi yang belum lolos audit platform tayang privat.
- Fitur berlabel "Segera" di situs (inbox DM terpadu, analitik kompetitor, laporan PDF berlogo agensi) belum ada di aplikasi. Jangan diklaim tersedia sebelum dibangun dan diuji.

Kode provider: `libraries/nestjs-libraries/src/integrations/social/*.provider.ts`.

## Perubahan Kelola Konten di atas Postiz upstream

- Bahasa bawaan Indonesia: `libraries/react-shared-libraries/src/translation/i18n.config.ts` (`fallbackLng = 'id'`) dan `apps/frontend/src/proxy.ts` (tanpa deteksi bahasa browser). Terjemahan di `libraries/react-shared-libraries/src/translation/locales/{id,en}/translation.json`; setiap teks baru wajib punya kunci di keduanya.
- Login Google disembunyikan di `apps/frontend/src/components/auth/{login,register}.tsx` selama belum dikonfigurasi.
- Email layanan berbahasa Indonesia: `apps/backend/src/services/auth/auth.service.ts`, `libraries/nestjs-libraries/src/database/prisma/organizations/organization.service.ts`, `libraries/nestjs-libraries/src/emails/resend.provider.ts` (versi teks + reply-to).
- Nama hari kalender: `apps/frontend/src/components/launches/calendar.tsx` (locale dayjs `id`).
- Logo dan favicon: `apps/frontend/public/` (logo final ada di repo marketing `marketing/public/brand/`).
- Lisensi: AGPL-3.0. Tautan "Kode sumber aplikasi" ke repo ini wajib tetap tampil. Jangan memakai nama atau logo Postiz sebagai merek.

## Status uji (12 Okt 2026, live)

Lulus: daftar (wajib aktivasi), email aktivasi masuk Inbox, aktivasi, masuk, lupa kata sandi, undangan tim, isolasi organisasi, tampilan Indonesia di 1440 px dan 390 px.

Belum diuji karena kanal belum bisa disambungkan: hubungkan akun, draft dengan media, jadwal, ubah jadwal, batal, publish, analitik, putus koneksi. Matriks uji lengkap: `build-everything/run-1/functional-test-matrix.csv` di folder proyek lokal Syauqi.

## Aturan copy dan tampilan

Bahasa Indonesia, tanpa em dash, tanpa harga atau jumlah pengguna, tanpa testimoni karangan. Situs marketing: navigasi dan footer harus identik di semua halaman; gaya beranda ada di blok `HOME V2` di `marketing/public/styles.css`.

## Kontak dan pelacakan

- Board Trello SEO dan produk: https://trello.com/b/uzkKBwOP/seo-kelolakontencom
- Pemilik produk: Syauqi.
