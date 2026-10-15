# Menjalankan Kelola Konten di komputer lokal (Windows)

Untuk developer yang ingin menjalankan aplikasi Kelola Konten (fork Postiz) di laptop sendiri untuk development dan pengujian. Panduan ini sudah diuji di Windows 11 tanpa Docker, memakai PostgreSQL dan Redis yang terpasang langsung di Windows.

Jangan pernah menyalin nilai environment production (Coolify) ke `.env` lokal. Lokal memakai database, secret, dan kunci sendiri.

## Gambaran

Aplikasi terdiri dari 4 proses yang bergantung pada 3 layanan pendukung:

| Komponen | Port | Fungsi |
|---|---|---|
| PostgreSQL | 5432 | Database aplikasi (diakses lewat Prisma) |
| Redis | 6379 | Cache dan throttling |
| Temporal | 7233 (UI 8233) | Penjadwal: menjalankan workflow publish post, refresh token, email |
| Backend (NestJS) | 3042 (mengikuti `.env`) | API |
| Orchestrator (NestJS) | 3002 | Worker Temporal: mengerjakan workflow |
| Frontend (Next.js) | 4200 | Tampilan aplikasi |

Di production, nginx menyatukan frontend dan backend di satu domain (`/api` ke backend). Di lokal keduanya diakses langsung lewat port masing-masing.

## Langkah 1: pasang prasyarat (sekali saja)

1. **Node.js 22** (proyek meminta `>=22.12 <23`). Node 24 juga berhasil dipakai untuk install dan menjalankan, tetapi versi resmi tetap 22.
2. **pnpm 10.6.1**. Jangan pakai npm atau yarn untuk dependensi proyek.
   ```
   npm i -g pnpm@10.6.1
   ```
3. **PostgreSQL 17**, berjalan di `localhost:5432`. Panduan ini memakai user `postgres` dengan kata sandi `postgres`.
4. **Redis**, berjalan di `localhost:6379`. Cek dengan `redis-cli ping`, jawabannya harus `PONG`.
5. **Temporal CLI** (server Temporal versi satu file, tanpa Docker):
   ```
   winget install Temporal.TemporalCLI
   ```
   Tutup lalu buka lagi terminal setelah instalasi supaya perintah `temporal` dikenali.

## Langkah 2: buat database (sekali saja)

```
psql -U postgres -h localhost -c "CREATE DATABASE \"kelolakonten-postiz_db\""
```

Masukkan kata sandi `postgres` kalau diminta.

## Langkah 3: buat file `.env` (sekali saja)

Buat file `.env` di root repo (sejajar dengan `package.json`). File ini sudah ada di `.gitignore`, jadi tidak ikut ter-commit. Isi minimal:

```
# Local development only. Never copy production values here.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kelolakonten-postiz_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="ganti-dengan-string-acak-panjang"

FRONTEND_URL="http://localhost:4200"
NEXT_PUBLIC_BACKEND_URL="http://localhost:3042"
BACKEND_INTERNAL_URL="http://localhost:3042"
TEMPORAL_ADDRESS="localhost:7233"

# Port backend, harus sama dengan port di NEXT_PUBLIC_BACKEND_URL
PORT=3042

STORAGE_PROVIDER="local"
UPLOAD_DIRECTORY="C:/Users/NAMA_USER/creativism/kelolakonten-postiz/var/uploads"

IS_GENERAL="true"
NX_ADD_PLUGINS=false
API_LIMIT=30
```

Catatan:
- Ganti `NAMA_USER` di `UPLOAD_DIRECTORY` sesuai lokasi repo di komputermu.
- Port 3042 dipakai supaya tidak bentrok dengan aplikasi lain yang sering memakai 3000. Kalau diganti, ubah `NEXT_PUBLIC_BACKEND_URL` dan `BACKEND_INTERNAL_URL` bersamaan. Skrip `start-local.ps1` mengambil port backend dari `NEXT_PUBLIC_BACKEND_URL` dan mengabaikan `PORT`; `PORT` hanya dipakai kalau backend dijalankan manual tanpa skrip.
- `RESEND_API_KEY` sengaja tidak diisi. Akibatnya akun yang didaftarkan di lokal langsung aktif tanpa email aktivasi.
- Kunci media sosial (Facebook, Instagram, Threads, dll) opsional. Cara mengisinya untuk Meta ada di [PANDUAN-META-LOKAL.md](PANDUAN-META-LOKAL.md).

## Langkah 4: install dependensi dan siapkan tabel (sekali, ulangi kalau ada perubahan)

Dari root repo:

```
pnpm install
pnpm run prisma-db-push
```

- `pnpm install` cukup lama (sekitar 15 menit untuk pertama kali). Di akhir proses ia otomatis membuat Prisma Client.
- `prisma-db-push` membuat semua tabel (88 tabel) di database lokal sesuai `schema.prisma`.

Ulangi `pnpm install` setelah `package.json` atau `pnpm-lock.yaml` berubah. Ulangi `prisma-db-push` setelah `schema.prisma` berubah.

## Langkah 5: jalankan aplikasi

Pastikan PostgreSQL dan Redis menyala, lalu dari root repo jalankan:

```
powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1
```

Semua servis berjalan di background, **tanpa jendela**. Skrip menunggu sampai backend siap lalu menulis `Ready.` beserta alamatnya. Setelah itu terminal boleh ditutup; aplikasi tetap jalan.

| Alamat | Isi |
|---|---|
| http://localhost:4200 | Aplikasi |
| http://localhost:3042/health | Cek backend, harus menjawab `{"status":"ok",...}` |
| http://localhost:8233 | Temporal UI, untuk melihat workflow yang berjalan |

Pertama kali, daftar akun lewat http://localhost:4200/auth. Akun langsung aktif.

**Menghentikan semuanya:**

```
powershell -ExecutionPolicy Bypass -File scripts\stop-local.ps1
```

PostgreSQL dan Redis tidak ikut dimatikan.

### Pilihan saat menjalankan

| Perintah | Kapan dipakai | RAM |
|---|---|---|
| `scripts\start-local.ps1` | Sehari-hari: menguji fitur, klik-klik aplikasi | sekitar 1,5 GB |
| `scripts\start-local.ps1 -Build` | Setelah `git pull`, setelah mengubah kode backend/orchestrator/frontend, atau setelah mengubah `NEXT_PUBLIC_*` di `.env` | sama, ditambah build sekitar 10 menit |
| `scripts\start-local.ps1 -FrontendDev` | Sedang mengubah tampilan dan ingin hot reload (perubahan langsung terlihat) | sekitar 6 GB |
| `scripts\start-local.ps1 -NoOrchestrator` | Hanya mengerjakan tampilan; penjadwalan dan publish post tidak jalan | hemat sekitar 450 MB |

Pilihan bisa digabung, misalnya `-Build -NoOrchestrator`.

Cara kerja skrip:
- menghentikan dulu sisa proses dari run sebelumnya di port yang sama, jadi aman dijalankan berulang;
- membaca port backend dari `NEXT_PUBLIC_BACKEND_URL` di `.env`;
- menjalankan backend, orchestrator, dan frontend **dari hasil build** (seperti di production), bukan dikompilasi ulang setiap start. Build dibuat otomatis kalau belum ada, satu per satu supaya RAM tidak penuh;
- menyimpan data Temporal dan log di `%USERPROFILE%\.kelolakonten-dev\` (di luar repo), jadi data Temporal tidak hilang saat dimatikan.

Hasil pengukuran di laptop 16 GB (14 Okt 2026):

| Servis | Mode default | Dengan `-FrontendDev` |
|---|---|---|
| Frontend | 185 MB | sekitar 4.900 MB |
| Backend | 560 MB | 560 MB |
| Orchestrator | 440 MB | 440 MB |
| Temporal | 250 MB | 250 MB |

## Kenapa tidak memakai `pnpm run dev`

`pnpm run dev` menjalankan semua servis dalam mode dev sekaligus. Di Windows cara itu berat dan bermasalah:

| Masalah | Gejala | Yang dilakukan skrip |
|---|---|---|
| Server dev frontend sangat boros RAM | Sekitar 5 GB; kalau heap dibatasi 2 GB, crash saat membuka `/launches` | Default memakai build production (`next start`, sekitar 185 MB). Mode dev hanya lewat `-FrontendDev` |
| Turbopack dev (bundler default Next.js 16) | Semua halaman, termasuk `/api/health`, menjawab 404 | `-FrontendDev` memakai `next dev --webpack`. Build production dengan Turbopack tidak bermasalah |
| `nest start --watch` | Setelah ada file yang berubah, backend dan orchestrator mati dan tidak menyala lagi | Backend dan orchestrator dijalankan dari `dist` tanpa watch |
| Kompilasi backend setiap start | Sekitar 3 GB RAM dan beberapa menit setiap kali menyalakan | Kompilasi hanya saat `-Build` atau belum ada build |

Konsekuensinya: perubahan kode baru berlaku setelah `scripts\start-local.ps1 -Build`, kecuali kode frontend saat memakai `-FrontendDev`.

## Kalau ada masalah

| Gejala | Penyebab | Perbaikan |
|---|---|---|
| Skrip menulis `Backend did not answer within 5 minutes` | Backend gagal start | Baca `backend.error.log` (lihat lokasi log di bawah) |
| Backend error `Can't reach database server` | PostgreSQL mati atau `DATABASE_URL` salah | Nyalakan service PostgreSQL, cek user, kata sandi, dan nama database |
| Backend error koneksi Redis | Redis mati | Nyalakan Redis, cek `redis-cli ping` |
| Orchestrator error koneksi ke `localhost:7233` | Temporal belum siap atau mati | Baca `temporal.log`, lalu jalankan skrip lagi |
| Frontend terbuka tapi login gagal atau data kosong | Port backend tidak cocok, atau `NEXT_PUBLIC_*` diubah tanpa build ulang | Samakan port di `NEXT_PUBLIC_BACKEND_URL` dan `BACKEND_INTERNAL_URL`, lalu `scripts\start-local.ps1 -Build` |
| Perubahan kode tidak terlihat | Aplikasi masih memakai build lama | `scripts\start-local.ps1 -Build` |
| `EADDRINUSE` di log | Port dipakai proses lain | Jalankan skrip lagi (menghentikan sisa proses node/temporal); kalau dipakai aplikasi lain, tutup aplikasi itu |
| Skrip menolak jalan ("running scripts is disabled") | Execution policy Windows | Pakai perintah lengkap di Langkah 5 (ada `-ExecutionPolicy Bypass`) |
| Tombol channel media sosial error `client_id=undefined` | Kunci platform belum diisi di `.env` | Lihat [PANDUAN-META-LOKAL.md](PANDUAN-META-LOKAL.md), lalu jalankan skrip lagi |

Log setiap servis ada di `%USERPROFILE%\.kelolakonten-dev\logs\`. Setiap servis punya `<nama>.log` dan `<nama>.error.log` (nama: `temporal`, `backend`, `orchestrator`, `frontend`).
Log setiap servis ada di `%USERPROFILE%\.kelolakonten-dev\logs\` (`temporal.log`, `backend.log`, `orchestrator.log`, `frontend.log`).

## Alternatif dengan Docker

Kalau Docker Desktop terpasang, PostgreSQL, Redis, dan Temporal bisa dinyalakan sekaligus dengan `pnpm run dev:docker` (file [docker-compose.dev.yaml](../docker-compose.dev.yaml)). Perhatikan bahwa compose itu memakai user `postiz-local`, kata sandi `postiz-local-pwd`, dan database `postiz-db-local`, jadi `DATABASE_URL` di `.env` harus disesuaikan. Cara ini belum diuji di komputer tim.
