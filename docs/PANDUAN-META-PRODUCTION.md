# Panduan: Facebook, Instagram, dan Threads untuk production

Untuk developer atau pemilik produk yang menyiapkan channel Meta di production, `https://app.kelolakonten.com`. Development lokal memakai app Meta terpisah; lihat [PANDUAN-META-LOKAL.md](PANDUAN-META-LOKAL.md).

Jangan menulis kunci atau secret di file ini. Nilainya hanya diisi di environment Coolify.

## Ringkasan

| | Nilai production |
|---|---|
| App Meta | **Kelola Konten**, App ID `1206217927733062`, status Published |
| Business portfolio | Creativism |
| Instagram app ID (Instagram Login) | `836475935883075` |
| Threads app ID | `877659928390300` |
| Domain aplikasi | `https://app.kelolakonten.com` |
| Tempat kunci | Coolify, app `kelolakonten-postiz` (uuid `akiajnygc6oe6cbuir9ocupm`), tab Environment Variables |

Yang harus diubah agar Meta mengarah ke production ada di empat tempat: redirect URI di dashboard Meta, environment Coolify, data dasar app, dan App Review. Urutannya di bawah.

## Langkah 1: redirect URI production

Semua redirect production berbentuk `https://app.kelolakonten.com/integrations/social/<provider>`. Karena `FRONTEND_URL` production sudah HTTPS, kode **tidak** memakai `redirectmeto.com`.

**1a. Facebook Page dan Instagram (Facebook Business)**

1. Dashboard app **Kelola Konten** > menu kiri **Facebook Login for Business** > **Settings**.
2. **Client OAuth login**, **Web OAuth login**, **Enforce HTTPS**, **Use Strict Mode for redirect URIs**: semua **Yes**.
3. **Valid OAuth Redirect URIs** harus berisi:
   - `https://app.kelolakonten.com/integrations/social/facebook`
   - `https://app.kelolakonten.com/integrations/social/instagram`
4. Hapus alamat development, misalnya `https://postiz.creativism.id/...`, setelah development sudah pindah ke app dev.
5. Alamat `https://postiz.mcsyauqi.com/...` milik instance pribadi Syauqi. Jangan dihapus sebelum instance itu pindah ke app Meta sendiri (bicarakan dengan Syauqi).
6. **Save changes**.

**1b. Instagram (Standalone)**

1. **Use cases** > **Manage messaging & content on Instagram** > **Customize** > **API setup with Instagram login** > langkah 4 > **Business login settings**.
2. **OAuth redirect URIs**: `https://app.kelolakonten.com/integrations/social/instagram-standalone`
3. **Deauthorize callback URL** dan **Data deletion request URL**: `https://kelolakonten.com/privacy` (lihat catatan di Langkah 4).
4. Hapus redirect development. **Save**.
5. Pastikan **Instagram app name** = `Kelola Konten - IG` atau `Kelola Konten` (tombol **Sync app name**).

**1c. Threads**

1. **Use cases** > **Access the Threads API** > **Customize** > **Settings**.
2. **Redirect Callback URLs**: `https://app.kelolakonten.com/integrations/social/threads`
3. **Uninstall Callback URL** dan **Delete Callback URL**: `https://kelolakonten.com/privacy`
4. **Threads Display Name**: `Kelola Konten`.
5. Hapus redirect development. **Save**.

## Langkah 2: environment Coolify

1. Buka Coolify > project Kelola Konten > production > app **kelolakonten-postiz** > **Environment Variables**.
2. Pastikan variabel berikut terisi dengan nilai dari app **production** (bukan app dev):

| Variabel | Nilai / sumber |
|---|---|
| `FRONTEND_URL`, `MAIN_URL` | `https://app.kelolakonten.com` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://app.kelolakonten.com/api` |
| `FACEBOOK_APP_ID` | `1206217927733062` |
| `FACEBOOK_APP_SECRET` | App settings > Basic > App secret |
| `INSTAGRAM_APP_ID` | `836475935883075` |
| `INSTAGRAM_APP_SECRET` | API setup with Instagram login > Instagram app secret |
| `THREADS_APP_ID` | `877659928390300` |
| `THREADS_APP_SECRET` | Access the Threads API > Settings > Threads app secret |

   Per 13 Oktober 2026, `INSTAGRAM_*` dan `THREADS_*` masih kosong di production.
3. Tambahkan `HIDDEN_PROVIDERS` (lihat bagian "Menampilkan hanya Facebook, Instagram, dan Threads" di bawah), supaya pengguna tidak melihat tombol channel yang belum disiapkan.
4. **Save**, lalu deploy ulang (tombol **Deploy** di Coolify, atau tab Actions GitHub > workflow "Kelola Konten deploy" > target `app`). Build sekitar 25 menit.

`NEXT_PUBLIC_BACKEND_URL` dibaca saat build, jadi kalau nilainya berubah, deploy ulang wajib, bukan restart saja.

### Menampilkan hanya Facebook, Instagram, dan Threads (tahap 1)

`HIDDEN_PROVIDERS` berisi identifier provider yang disembunyikan dari layar **Tambah Channel**, dipisah koma tanpa spasi. Tahap 1 hanya menampilkan empat tombol: Facebook Page (`facebook`), Instagram Facebook Business (`instagram`), Instagram Standalone (`instagram-standalone`), dan Threads (`threads`). Semua yang lain disembunyikan, 31 identifier.

Nilai yang dipasang di Coolify (satu baris, tanpa tanda kutip):

```
bluesky,devto,discord,dribbble,gmb,hashnode,kick,lemmy,linkedin,linkedin-page,listmonk,mastodon,medium,mewe,moltbook,nostr,pinterest,reddit,skool,slack,telegram,tiktok,tiktok-business,tumblr,twitch,vk,whop,wordpress,wrapcast,x,youtube
```

Daftar ini diambil dari backend yang sedang berjalan (`GET /integrations`, 35 provider). Kalau provider baru ditambahkan di kode, daftar itu perlu diperbarui; cara cek ulang ada di bawah.

**Wajib: variabel ini harus ikut diteruskan di compose.** [docker-compose.kelolakonten.yaml](../docker-compose.kelolakonten.yaml) hanya meneruskan variabel yang ditulis satu per satu di bagian `environment:`. Baris `HIDDEN_PROVIDERS: ${HIDDEN_PROVIDERS:-}` sudah ditambahkan, tetapi baru berlaku setelah file compose itu ada di `main`. Urutan paling hemat satu kali build:

1. Isi `HIDDEN_PROVIDERS` di Coolify (Environment Variables), **Save**.
2. Commit dan push perubahan compose ke `main`. Push itu memicu deploy otomatis (perubahan compose termasuk yang men-deploy aplikasi).
3. Setelah deploy selesai, buka `https://app.kelolakonten.com`, **Tambah Channel**, dan pastikan hanya empat tombol yang tampil.

Kalau variabel diisi di Coolify tetapi compose belum ter-deploy, tombolnya tetap tampil semua tanpa pesan error.

**Yang perlu diketahui:**

- Ini hanya menyembunyikan tombol, bukan memblokir. Channel yang sudah tersambung tetap tampil di kalender, dan alamat OAuth provider yang disembunyikan tetap bisa dipanggil langsung (kodenya hanya memfilter daftar tombol). Cukup untuk merapikan tampilan, bukan sebagai batasan keamanan.
- Daftar dibaca backend saat dijalankan, jadi tidak perlu build frontend.
- Saat menyiapkan tahap berikutnya, hapus nama provider dari daftar ini setelah kunci dan redirect-nya siap, misalnya `youtube` dan `linkedin,linkedin-page` (kuncinya sudah ada di Coolify, tetapi redirect belum didaftarkan; lihat [HANDOFF-KELOLA-KONTEN.md](HANDOFF-KELOLA-KONTEN.md)).

**Cek ulang daftar provider** (tanpa login), dari komputer lokal atau production:

```
curl -s https://app.kelolakonten.com/api/integrations
```

Setiap `"identifier":"..."` di hasilnya adalah satu provider. Setelah `HIDDEN_PROVIDERS` aktif, hasil ini hanya berisi empat identifier tahap 1.

## Langkah 3: data dasar app

**App settings > Basic** di app production harus lengkap; ini juga syarat App Review:

- **Display name**: `Kelola Konten`
- **App icon**: 1024 x 1024, logo Kelola Konten
- **Privacy Policy URL**: `https://kelolakonten.com/privacy`
- **Terms of Service URL**: `https://kelolakonten.com/terms`
- **User data deletion**: Data deletion instructions URL, `https://kelolakonten.com/privacy` (halaman itu harus memuat cara meminta penghapusan data)
- **Category** dan **Contact email** (alamat tim yang aktif)
- **App domains**: `kelolakonten.com`

Cek juga tab **Required actions** di menu atas. Item yang terlambat (misalnya Data Use Checkup) bisa membatasi app, termasuk menolak penambahan izin.

## Langkah 4: App Review dan Business Verification

Selama izin masih berstatus *Ready for testing* (Standard Access), **hanya akun yang punya peran di app** yang bisa menyambungkan channel di production. Agar pengguna umum bisa memakainya:

**4a. Business Verification**

- Di https://business.facebook.com > Settings > Security Center, verifikasi business portfolio **Creativism** (dokumen legal perusahaan, domain, nomor telepon). Ini syarat Advanced Access untuk izin Page dan Instagram.

**4b. App Review: minta Advanced Access**

Menu kiri **Review** > **App Review** (atau di setiap use case, Permissions and features > Actions > Request advanced access). Izin yang dipakai aplikasi:

| Channel | Izin |
|---|---|
| Facebook Page | `pages_show_list`, `pages_manage_posts`, `pages_manage_engagement`, `pages_read_engagement`, `read_insights`, `business_management` |
| Instagram (Facebook Business) | `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights` |
| Instagram (Standalone) | `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_business_manage_insights` |
| Threads | `threads_basic`, `threads_content_publish`, `threads_manage_replies`, `threads_manage_insights` |

Untuk setiap izin Meta meminta:

- penjelasan kenapa izin itu dibutuhkan, dalam bahasa Inggris (contoh: "Kelola Konten lets businesses schedule and publish posts to their own Facebook Page");
- **screencast** alur nyata di `https://app.kelolakonten.com`: login, Tambah Channel, dialog izin Meta, channel tersambung, membuat dan menjadwalkan post, post tampil di platform;
- akun uji untuk reviewer (email dan password akun Kelola Konten yang aktif).

Ajukan hanya izin yang benar-benar dipakai. Izin tambahan yang tidak dipakai (misalnya `instagram_business_manage_messages`) memperbesar peluang ditolak.

**4c. Batasan selama review**

- TikTok dan YouTube: video dari aplikasi yang belum lolos audit platform tayang privat (lihat [HANDOFF-KELOLA-KONTEN.md](HANDOFF-KELOLA-KONTEN.md)).
- Copy di situs dan aplikasi tidak boleh mengklaim channel Meta sudah bisa dipakai umum sebelum Advanced Access disetujui.

**Catatan callback penghapusan data:** saat ini Deauthorize, Uninstall, dan Delete callback diarahkan ke halaman privasi karena aplikasi belum punya endpoint khusus. Meta menerima ini untuk pengujian, tetapi untuk App Review sebaiknya dibuat endpoint yang benar-benar menghapus data pengguna saat menerima callback Meta (signed request). Catat ini sebagai pekerjaan backend sebelum mengajukan review.

## Langkah 5: cek setelah deploy

1. Login ke `https://app.kelolakonten.com` dengan akun yang punya peran di app Meta production.
2. Buka di tab baru, satu per satu:
   - `https://app.kelolakonten.com/api/integrations/social/facebook`
   - `https://app.kelolakonten.com/api/integrations/social/instagram`
   - `https://app.kelolakonten.com/api/integrations/social/instagram-standalone`
   - `https://app.kelolakonten.com/api/integrations/social/threads`
3. Di setiap respons, pastikan:
   - `client_id` = `1206217927733062` (Facebook, Instagram via Facebook), `836475935883075` (Instagram Standalone), `877659928390300` (Threads), bukan `undefined` dan bukan ID app dev;
   - `redirect_uri` = `https://app.kelolakonten.com/integrations/social/<provider>` tanpa `redirectmeto.com`.
4. Uji Tambah Channel untuk keempat tombol dengan akun penguji, lalu jadwalkan satu post uji ke tiap channel dan pastikan tayang.

## Kalau gagal

| Pesan / gejala | Penyebab | Perbaikan |
|---|---|---|
| `client_id=undefined` | Variabel kosong di Coolify, atau belum deploy ulang | Langkah 2 |
| `client_id` berisi ID app dev | Coolify diisi kunci app dev | Ganti dengan kunci app production, deploy ulang |
| "URL blocked" / "Invalid redirect_uri" | Redirect production belum terdaftar | Langkah 1 |
| "App not active" / "This app isn't available" untuk pengguna umum | Izin belum Advanced Access | Langkah 4 |
| "Invalid Scopes" | Izin belum ditambahkan di use case | Permissions and features di use case terkait |
| `redirect_uri` berisi `redirectmeto.com` | `FRONTEND_URL` production bukan https | Perbaiki `FRONTEND_URL` di Coolify, deploy ulang |
