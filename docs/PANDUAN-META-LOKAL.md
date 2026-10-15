# Panduan: Facebook, Instagram, dan Threads untuk development lokal

Untuk developer yang menguji fitur "Tambah Channel" Meta di komputer sendiri. Development memakai **app Meta khusus dev**, terpisah dari app production. Pengaturan production ada di [PANDUAN-META-PRODUCTION.md](PANDUAN-META-PRODUCTION.md).

Jangan menulis kunci atau secret di file ini. Semua nilai hanya disalin ke `.env` lokal, yang tidak ikut ter-commit.

## Kenapa app dev dipisah

| | App production "Kelola Konten" | App dev "Kelola Konten Dev" |
|---|---|---|
| Dipakai oleh | `https://app.kelolakonten.com` | komputer developer (localhost atau tunnel) |
| Mode | Published (Live) | Development (tidak pernah di-publish) |
| Siapa yang bisa login | semua orang, setelah App Review | hanya akun yang punya peran di app (admin, developer, tester) |
| Redirect `http://localhost` | ditolak | otomatis diizinkan untuk Facebook Login |
| Izin (permissions) | butuh App Review (Advanced Access) | langsung berlaku untuk akun yang punya peran |

Dengan app terpisah, eksperimen di lokal (menambah redirect, mengubah izin, mengganti mode) tidak bisa merusak login pengguna production. Daftar redirect production juga tetap bersih untuk App Review.

## Gambaran

Empat tombol Meta di aplikasi memakai tiga jenis login, jadi butuh tiga pasang kunci:

| Tombol di aplikasi | Variabel `.env` | Diambil dari (di app dev) | Path redirect |
|---|---|---|---|
| Facebook Page | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | App settings > Basic | `/integrations/social/facebook` |
| Instagram (Facebook Business) | sama dengan Facebook | sama | `/integrations/social/instagram` |
| Instagram (Standalone) | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | use case Instagram > API setup with Instagram login | `/integrations/social/instagram-standalone` |
| Threads | `THREADS_APP_ID`, `THREADS_APP_SECRET` | use case Threads > Settings | `/integrations/social/threads` |

Redirect lengkapnya adalah `FRONTEND_URL` + path di atas, dan harus didaftarkan **persis sama** (http/https, port, tanpa garis miring di akhir).

## Langkah 0: pilih cara menjalankan lokal

**A. Lewat tunnel HTTPS (disarankan, semua 4 tombol bisa diuji sama seperti production)**

Frontend dan backend diakses lewat Cloudflare Tunnel:

| Hostname | Diarahkan ke |
|---|---|
| `postiz.creativism.id` | `http://localhost:4200` (frontend) |
| `postiz-api.creativism.id` | `http://localhost:3042` (backend) |

`.env`:

```
FRONTEND_URL="https://postiz.creativism.id"
NEXT_PUBLIC_BACKEND_URL="https://postiz-api.creativism.id"
BACKEND_INTERNAL_URL="http://localhost:3042"
PORT=3042
```

Di zone Cloudflare `creativism.id` wajib ada Cache Rule **Bypass cache** untuk kedua hostname ini (Caching > Cache Rules, letakkan paling atas). Tanpa rule ini Cloudflare menyimpan respons API yang berisi data akun dan menyajikannya ke orang lain.

Semua redirect memakai `https://postiz.creativism.id/integrations/social/...`.

**B. Murni localhost (tanpa tunnel)**

```
FRONTEND_URL="http://localhost:4200"
NEXT_PUBLIC_BACKEND_URL="http://localhost:3042"
BACKEND_INTERNAL_URL="http://localhost:3042"
PORT=3042
```

- Facebook Page dan Instagram (Facebook Business): redirect `http://localhost:4200/...` otomatis diizinkan app dev, **tidak perlu didaftarkan**.
- Instagram (Standalone) dan Threads hanya menerima HTTPS. Kode otomatis membungkus redirect menjadi `https://redirectmeto.com/http://localhost:4200/integrations/social/<provider>` selama `FRONTEND_URL` masih http. Alamat itulah yang didaftarkan. `redirectmeto.com` adalah layanan pihak ketiga; kode OAuth yang lewat sana tidak bisa dipakai tanpa app secret, tetapi kalau ingin menghindarinya, pakai cara A.

Setiap mengganti `FRONTEND_URL` atau `NEXT_PUBLIC_BACKEND_URL`, jalankan ulang dengan build: `scripts\start-local.ps1 -Build`.

## Langkah 1: siapkan akun uji

1. Akun **Facebook** pribadi yang nanti diberi peran di app dev.
2. Satu **Facebook Page** yang dikelola akun itu (untuk tombol Facebook Page).
3. Satu akun **Instagram Business atau Creator**. Akun personal ditolak Instagram dan akan diminta beralih ke akun profesional.
   - Untuk "Instagram (Facebook Business)": akun IG harus **terhubung ke Facebook Page** di atas (Page > Pengaturan > Akun tertaut).
   - Untuk "Instagram (Standalone)": cukup akun Business/Creator, tidak perlu Page.
4. Akun **Threads** (profil Threads dari akun Instagram yang sama).

## Langkah 2: buat app dev

**Cara 1: Test App bawaan Meta (paling cepat)**

1. Buka https://developers.facebook.com/apps, masuk ke app production **Kelola Konten**.
2. Klik dropdown nama app di kiri atas, pilih **Create Test App** (di beberapa versi dashboard ada di App settings > Advanced atau menu "Test apps").
3. Beri nama `Kelola Konten Dev`, klik **Create**.
4. Test app menyalin use case dan izin dari app utama, selalu berada di mode Development, dan punya App ID serta secret sendiri.

**Cara 2: app baru biasa (kalau Create Test App tidak tersedia)**

1. https://developers.facebook.com/apps > **Create app**.
2. Nama: `Kelola Konten Dev`. Contact email: email tim.
3. Use case: pilih **Manage everything on your Page**, **Manage messaging & content on Instagram**, dan **Access the Threads API** (kalau dashboard hanya mengizinkan satu use case di awal, tambahkan sisanya nanti lewat **Use cases > Add use case**).
4. Business portfolio: pilih **Creativism** (sama dengan app production).
5. **Create app**. Jangan klik **Publish**; biarkan di mode Development.

Setelah app dev jadi, isi **App settings > Basic**: Privacy Policy URL `https://kelolakonten.com/privacy`, Terms of Service URL `https://kelolakonten.com/terms`, lalu **Save changes**.

## Langkah 3: beri peran ke akun penguji

Peran **tidak ikut tersalin** dari app production.

1. Menu kiri **App roles > Roles > Add People**.
2. Tambahkan akun Facebook penguji sebagai **Developer** atau **Tester**. Akun itu menerima notifikasi; terima di https://developers.facebook.com/requests.
3. Bagian **Instagram Testers**: tambahkan username IG penguji. Terima undangannya dari akun IG itu di https://www.instagram.com/accounts/manage_access/, tab **Tester invites**, **Accept**.
4. Bagian **Threads Testers**: tambahkan username Threads. Terima dari aplikasi Threads di HP: **Settings > Account > Website permissions > Invites > Accept** (versi web kadang tidak menampilkan tombol Accept). Setelah diterima, app pindah ke tab **Active**.

## Langkah 4: Facebook Page dan Instagram (Facebook Business)

**4a. Kunci**

1. **App settings > Basic**.
2. **App ID** ke `FACEBOOK_APP_ID`. **App secret** (klik Show) ke `FACEBOOK_APP_SECRET`.

**4b. Redirect URI**

1. Menu kiri, panah di sebelah **Facebook Login for Business** > **Settings**.
2. **Client OAuth login** dan **Web OAuth login**: **Yes**.
3. **Valid OAuth Redirect URIs**:
   - Cara A (tunnel): `https://postiz.creativism.id/integrations/social/facebook` dan `https://postiz.creativism.id/integrations/social/instagram`
   - Cara B (localhost): tidak perlu diisi; kalau diisi `http://localhost...`, Meta menandainya merah karena sudah otomatis diizinkan.
4. **Save changes**.

**4c. Izin Facebook Page**

1. **Use cases** > kartu **Manage everything on your Page** > **Customize** > **Permissions and features**.
2. Status izin berikut harus **Ready for testing** (klik **+ Add** kalau belum):
   - `pages_show_list`, `pages_manage_posts`, `pages_manage_engagement`, `pages_read_engagement`, `read_insights`, `business_management`

**4d. Izin Instagram via Facebook**

1. **Use cases** > kartu **Manage messaging & content on Instagram** > **Customize** > **Permissions and features**.
2. Harus **Ready for testing**:
   - `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`

Kalau tombol **+ Add** memunculkan "Something went wrong": coba di jendela Incognito tanpa ekstensi, cek tab **Required actions** di menu atas, dan pastikan akunmu Admin app serta punya akses ke business portfolio.

## Langkah 5: Instagram (Standalone)

1. **Use cases** > **Manage messaging & content on Instagram** > **Customize** > **API setup with Instagram login**.
2. **Instagram app ID** ke `INSTAGRAM_APP_ID`, **Instagram app secret** (Show) ke `INSTAGRAM_APP_SECRET`. Ini berbeda dari App ID Facebook.
3. Klik **Sync app name** supaya nama di layar login Instagram sama dengan nama app.
4. **Permissions and features**: harus **Ready for testing**:
   - `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_business_manage_insights`

   Tombol "Add all required permissions" di halaman API setup ikut menambahkan `instagram_business_manage_messages`, yang tidak dipakai aplikasi tetapi tidak mengganggu. Dua izin `content_publish` dan `manage_insights` tetap harus ditambahkan manual.
5. Langkah **Set up Instagram business login** > **Business login settings**:
   - **OAuth redirect URIs**: cara A `https://postiz.creativism.id/integrations/social/instagram-standalone`, cara B `https://redirectmeto.com/http://localhost:4200/integrations/social/instagram-standalone`
   - **Deauthorize callback URL** dan **Data deletion request URL**: `https://kelolakonten.com/privacy`
   - **Save**.
6. Langkah "Generate access tokens" dan "Configure webhooks" tidak perlu; aplikasi mengambil token sendiri lewat OAuth.

## Langkah 6: Threads

1. **Use cases** > kartu **Access the Threads API** > **Customize** (kalau belum ada: **Add use case**). Kalau dashboard menolak menggabungkan Threads dengan use case lain di app yang sama, buat app dev terpisah khusus Threads.
2. **Permissions and features**: harus **Ready for testing**:
   - `threads_basic`, `threads_content_publish`, `threads_manage_replies`, `threads_manage_insights`
3. **Settings**:
   - **Threads app ID** ke `THREADS_APP_ID`, **Threads app secret** ke `THREADS_APP_SECRET`.
   - **Threads Display Name**: `Kelola Konten Dev`.
   - **Redirect Callback URLs**: cara A `https://postiz.creativism.id/integrations/social/threads`, cara B `https://redirectmeto.com/http://localhost:4200/integrations/social/threads`
   - **Uninstall Callback URL** dan **Delete Callback URL**: `https://kelolakonten.com/privacy`
   - **Save**.

## Langkah 7: isi `.env`

Tambahkan atau ganti di `.env` root repo dengan nilai dari app **dev**:

```
FACEBOOK_APP_ID=""
FACEBOOK_APP_SECRET=""
INSTAGRAM_APP_ID=""
INSTAGRAM_APP_SECRET=""
THREADS_APP_ID=""
THREADS_APP_SECRET=""
```

Opsional, tampilkan hanya Facebook, Instagram (kedua jenis), dan Threads di layar Tambah Channel dengan menyembunyikan 31 provider lain (nilai yang sama dengan production, dijelaskan di [PANDUAN-META-PRODUCTION.md](PANDUAN-META-PRODUCTION.md)):

```
HIDDEN_PROVIDERS="bluesky,devto,discord,dribbble,gmb,hashnode,kick,lemmy,linkedin,linkedin-page,listmonk,mastodon,medium,mewe,moltbook,nostr,pinterest,reddit,skool,slack,telegram,tiktok,tiktok-business,tumblr,twitch,vk,whop,wordpress,wrapcast,x,youtube"
```

Variabel ini dibaca backend saat jalan, jadi cukup restart tanpa `-Build`.

Restart backend dan orchestrator: `scripts\start-local.ps1` (tambahkan `-Build` hanya kalau `FRONTEND_URL` atau `NEXT_PUBLIC_BACKEND_URL` ikut berubah).

Channel yang dulu tersambung lewat app lain (misalnya app production) harus disambungkan ulang; token dari app lain tidak berlaku.

## Langkah 8: cek sebelum klik

Pastikan URL OAuth sudah memakai App ID dev, tanpa `client_id=undefined`. Cara cepat: login ke aplikasi lokal, buka di tab baru:

- `<NEXT_PUBLIC_BACKEND_URL>/integrations/social/facebook`
- `<NEXT_PUBLIC_BACKEND_URL>/integrations/social/instagram`
- `<NEXT_PUBLIC_BACKEND_URL>/integrations/social/instagram-standalone`
- `<NEXT_PUBLIC_BACKEND_URL>/integrations/social/threads`

Setiap respons berisi `url`. Periksa `client_id` (App ID dev, atau Instagram/Threads app ID dev) dan `redirect_uri` (sama dengan yang didaftarkan).

## Langkah 9: uji

Dengan browser yang sedang login ke akun Facebook/Instagram/Threads penguji:

1. Buka aplikasi lokal > **Kalender** > **Tambah Channel**.
2. **Facebook Page**: izinkan semua izin (jangan hapus centang apa pun), pilih Page. Hasil: Page muncul di daftar channel.
3. **Instagram (Facebook Business)**: izinkan, pilih Page yang terhubung ke IG. Hasil: akun IG muncul.
4. **Instagram (Standalone)**: login Instagram, izinkan. Hasil: akun IG muncul.
5. **Threads**: izinkan. Hasil: akun Threads muncul.

Notifikasi "Channel Updated" (bukan "Channel Added") untuk Instagram Standalone dan Threads itu normal; itu teks bawaan untuk provider tanpa langkah pilih Page.

## Kalau gagal

| Pesan / gejala | Penyebab | Perbaikan |
|---|---|---|
| `client_id=undefined` / "Invalid App ID" | Kunci kosong atau backend belum di-restart | Langkah 7 |
| "URL blocked" / "redirect_uri is not whitelisted" | Redirect belum terdaftar atau beda satu karakter | Langkah 4b, 5, 6; cek http/https dan port |
| "Insecure Login Blocked" | App yang dipakai bukan app dev (Published) | Pastikan `.env` berisi kunci app dev |
| "Invalid Scopes: ..." | Izin belum Ready for testing | Langkah 4c, 4d, 5, 6 |
| "App not active" / "This app isn't available" | Akun yang login tidak punya peran di app dev | Langkah 3 |
| "Change to professional account?" (Instagram) | Akun IG masih personal | Ubah ke Business/Creator (akun profesional tidak bisa private) |
| IG (Facebook Business) tidak menemukan akun | IG bukan Business/Creator, tidak terhubung ke Page, atau bukan admin Page | Langkah 1 |
| Channel tersambung tapi daftar channel kosong | Cloudflare menyimpan cache respons API (cara A) | Pasang Cache Rule Bypass (Langkah 0) lalu Purge Cache |
