# Bahan App Review Meta: gelombang 1

Untuk orang yang mengisi form App Review app **Kelola Konten** (App ID `1206217927733062`). Bagian berbahasa Inggris disalin apa adanya ke form Meta; bagian berbahasa Indonesia adalah petunjuk untuk pengisi.

Jangan menulis kata sandi akun reviewer di file ini (repo publik). Kata sandi hanya diketik di form App Review.

## Ringkasan pengajuan

| Use case | Izin | Fitur yang diperagakan |
|---|---|---|
| Manage everything on your Page | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management` | Hubungkan Facebook Page, buat dan jadwalkan post, post tayang di Page |
| Manage messaging & content on Instagram | `instagram_business_basic`, `instagram_business_content_publish` | Hubungkan akun Instagram Business, buat dan jadwalkan post, post tayang di Instagram |
| Access the Threads API | `threads_basic`, `threads_content_publish` | Hubungkan profil Threads, buat dan jadwalkan thread, thread tayang |

`public_profile` ikut otomatis dan tidak perlu deskripsi khusus.

Prasyarat yang sudah beres per 16 Oktober 2026: Business Verification (Creativism, Verified), Privacy Policy `https://kelolakonten.com/en/privacy`, Terms `https://kelolakonten.com/en/terms`, Data deletion callback, Deauthorize callback, `DISABLED_SCOPES` di production sehingga aplikasi hanya meminta 8 izin di atas.

## Video yang sudah jadi (19 Oktober 2026)

Direkam otomatis dengan Playwright di `https://app.kelolakonten.com`, UI bahasa Inggris, keterangan langkah di bawah layar, memakai "Post now" (waktu tunggu terbit dipotong). File disimpan di `docs/video/` pada komputer perekam (folder ini di-ignore git, tidak ikut ke repo):

| File | Dipakai untuk izin |
|---|---|
| `kelolakonten-fb.mp4` (1:40) | `pages_show_list`, `business_management`, `pages_read_engagement`, `pages_manage_posts` |
| `kelolakonten-ig.mp4` (1:14) | `instagram_business_basic`, `instagram_business_content_publish` |
| `kelolakonten-threads.mp4` (1:18) | `threads_basic`, `threads_content_publish` |

## Persiapan sebelum merekam (kalau perlu merekam ulang)

1. **Akun Kelola Konten reviewer** sudah aktif (tidak butuh kode OTP) dan bisa masuk di `https://app.kelolakonten.com/auth/login`.
2. **Bahasa aplikasi Inggris**: setelah masuk, ganti bahasa ke English lewat ikon bendera di kanan atas. Reviewer Meta bekerja dalam bahasa Inggris.
3. **Kosongkan channel** di akun yang dipakai merekam, supaya alur "Add Channel" terlihat dari awal. Kalau channel sudah ada, putuskan dulu.
4. **Akun uji platform** (milik tester yang sudah punya peran di app):
   - Facebook: akun yang menjadi admin satu Facebook Page;
   - Instagram: akun **Business atau Creator** (contoh: tanotif.global);
   - Threads: profil Threads dari akun Instagram yang sama.
5. **Siapkan satu gambar** (JPG atau PNG, misalnya 1080 x 1080) untuk post uji.
6. **Perekam layar**: rekam satu jendela browser, resolusi minimal 1280 x 720, tanpa potongan. Tidak perlu suara; kalau ada, pakai bahasa Inggris. Tampilkan kursor.
7. Login ke Facebook, Instagram, dan Threads di browser yang sama **sebelum** merekam, supaya dialog izin Meta langsung muncul tanpa layar login yang panjang (layar login boleh terekam, tetapi jangan perlihatkan kata sandi).

## Screencast

Satu video per platform paling mudah dinilai. Setiap video dipakai untuk semua izin platform itu.

**Video A: Facebook Page (dipakai untuk 4 izin Facebook)**

1. Buka `https://app.kelolakonten.com`, masuk, tunjukkan aplikasi dalam bahasa Inggris.
2. Calendar, klik **Add Channel**, pilih **Facebook Page**.
3. Dialog Meta muncul: tahan 2 sampai 3 detik di layar yang memperlihatkan nama **Kelola Konten** dan daftar izin. Klik lanjut sampai selesai, jangan hapus centang apa pun.
4. Di Kelola Konten muncul daftar Page yang kamu kelola: **ini memperagakan `pages_show_list` dan `business_management`**. Pilih satu Page, simpan.
5. Page muncul di daftar channel kiri dengan nama dan fotonya: **memperagakan `pages_read_engagement`**.
6. Klik **Create Post**, pilih Page itu, tulis teks pendek (misalnya "Testing scheduled post from Kelola Konten"), lampirkan gambar, atur jadwal 2 sampai 3 menit dari sekarang, simpan.
7. Tunjukkan post di kalender pada jam yang dijadwalkan.
8. Tunggu sampai jam itu (boleh dipercepat di editor video, tetapi beri teks "3 minutes later"), lalu buka Page di facebook.com dan tunjukkan post sudah tayang: **memperagakan `pages_manage_posts`**.

**Video B: Instagram (dipakai untuk 2 izin Instagram)**

1. Masuk ke Kelola Konten (bahasa Inggris), **Add Channel**, pilih **Instagram (Standalone)**.
2. Dialog Instagram muncul: tahan di layar yang memperlihatkan nama aplikasi dan izinnya, lalu izinkan.
3. Akun Instagram muncul di daftar channel dengan nama pengguna dan foto: **memperagakan `instagram_business_basic`**.
4. **Create Post**, pilih akun Instagram itu, tulis caption, lampirkan gambar, jadwalkan 2 sampai 3 menit lagi, simpan.
5. Setelah jam itu, buka profil Instagram di instagram.com atau aplikasi dan tunjukkan post sudah tayang: **memperagakan `instagram_business_content_publish`**.

**Video C: Threads (dipakai untuk 2 izin Threads)**

1. Masuk ke Kelola Konten (bahasa Inggris), **Add Channel**, pilih **Threads**.
2. Dialog Threads muncul: tahan di layar izin, lalu izinkan.
3. Profil Threads muncul di daftar channel: **memperagakan `threads_basic`**.
4. **Create Post**, pilih Threads, tulis teks (boleh dengan gambar), jadwalkan 2 sampai 3 menit lagi, simpan.
5. Setelah jam itu, buka profil di threads.com dan tunjukkan thread sudah tayang: **memperagakan `threads_content_publish`**.

Simpan sebagai MP4. Unggah video yang sama ke setiap izin yang diperagakannya.

## Deskripsi per izin (salin ke form)

Kolom "How will your app use this permission?" dan sejenisnya. Satu blok per izin.

### pages_show_list

```
Kelola Konten is a social media scheduling tool for small businesses, creators, and agencies. When a user connects Facebook, we use pages_show_list to display the list of Pages the user manages, so they can choose which Page Kelola Konten will publish to. We only read the Page list at connection time and store the ID, name, and picture of the Page the user selects. The screencast shows the Page picker right after the Facebook consent dialog.
```

### business_management

```
Many of our users manage Pages that belong to a Business portfolio rather than to their personal profile. We use business_management only to list the Pages owned by or shared with the user's businesses (owned_pages and client_pages), so those Pages appear in the same Page picker. We do not create, modify, or delete anything in the user's Business portfolio. The screencast shows business Pages appearing in the Page picker.
```

### pages_read_engagement

```
After the user selects a Page, Kelola Konten uses pages_read_engagement to read the Page's basic information (name, username, and profile picture) and to obtain the Page access token needed for publishing. This information is shown in the channel list so the user can recognize which Page each scheduled post goes to. The screencast shows the connected Page with its name and picture in the channel list.
```

### pages_manage_posts

```
This is the core feature of Kelola Konten: users write a post, attach images or video, choose a date and time, and we publish it to their Facebook Page at that time on their behalf. We use pages_manage_posts only to create the posts the user scheduled in Kelola Konten. We never publish anything the user did not create and schedule themselves. Users can publish immediately or schedule a time. The screencast shows a post with two images being created in Kelola Konten and published with "Post now", then appearing on the Facebook Page.
```

### instagram_business_basic

```
When a user connects an Instagram professional account through Instagram Login, Kelola Konten uses instagram_business_basic to read the account's ID, username, name, and profile picture. We show this in the channel list so the user can see which Instagram account each scheduled post will be published to. We do not read the user's media, followers, or messages. The screencast shows the Instagram account appearing in the channel list after the consent screen.
```

### instagram_business_content_publish

```
Kelola Konten lets users schedule Instagram posts in advance. At the time the user chooses, we use instagram_business_content_publish to publish the photo, video, or carousel the user created in Kelola Konten to their own Instagram professional account. We only publish content the user created and scheduled themselves. Users can publish immediately or schedule a time. The screencast shows a post being created in Kelola Konten and published with "Post now", then appearing on the Instagram profile.
```

### threads_basic

```
When a user connects their Threads profile, Kelola Konten uses threads_basic to read the profile ID, username, and profile picture. We display this in the channel list so the user can see which Threads profile each scheduled post goes to. The screencast shows the Threads profile appearing in the channel list after the consent screen.
```

### threads_content_publish

```
Kelola Konten lets users schedule Threads posts in advance. At the time the user chooses, we use threads_content_publish to publish the text and media the user created in Kelola Konten to their own Threads profile. We only publish content the user created and scheduled themselves. Users can publish immediately or schedule a time. The screencast shows a thread being created in Kelola Konten and published with "Post now", then appearing on the Threads profile.
```

## Catatan untuk reviewer (salin ke kolom App Review instructions / notes)

Isi `<REVIEWER_EMAIL>` dan `<REVIEWER_PASSWORD>` langsung di form.

```
About the app
Kelola Konten (https://app.kelolakonten.com) is a web app that helps small businesses, creators, and agencies plan and schedule social media posts. Users connect their own Facebook Page, Instagram professional account, and Threads profile, write posts in Kelola Konten, and we publish them at the time they choose.

Test account
URL: https://app.kelolakonten.com/auth/login
Email: <REVIEWER_EMAIL>
Password: <REVIEWER_PASSWORD>
The account is already activated, no email code is needed.

Language
The app opens in Indonesian by default. To switch to English, click the flag icon at the top right and choose English.

How to test
1. Sign in with the test account.
2. On the Calendar page, click "Add Channel".
3. Choose "Facebook Page", "Instagram (Standalone)", or "Threads" and approve the Meta consent screen. Instagram requires a Business or Creator account.
4. For Facebook, pick a Page from the list that appears.
5. Click "Create Post", select the connected channel, write a short text, optionally attach an image, set a time a few minutes ahead, and save.
6. At the scheduled time the post is published to the selected account. Open the Page or profile to see it.

Data handling
We only store the account or Page ID, name, username, profile picture, and access token needed to publish. We do not sell data or use it for advertising. Users can disconnect a channel or delete their account at any time, and we handle deauthorization and data deletion callbacks automatically.
Privacy Policy: https://kelolakonten.com/en/privacy
Data deletion instructions: https://kelolakonten.com/en/privacy#data-deletion
Terms of Service: https://kelolakonten.com/en/terms
```

## Setelah submit

- Pantau email dan **Alert Inbox**. Reviewer kadang meminta klarifikasi atau video tambahan; balas dalam bahasa Inggris dan jangan ubah fitur yang sedang dinilai.
- Selama review, jangan deploy perubahan yang menyentuh alur Add Channel atau Create Post.
- Kalau ditolak, baca alasan per izin, perbaiki hanya bagian itu (biasanya video kurang jelas memperlihatkan izin dipakai), lalu ajukan ulang.
- Setelah gelombang 1 disetujui: pengguna umum bisa menyambungkan channel tanpa menjadi tester. Gelombang 2 (insights, comments, replies) diajukan dengan dokumen terpisah; setelah disetujui, kosongkan `DISABLED_SCOPES` di Coolify (lihat [PANDUAN-META-PRODUCTION.md](PANDUAN-META-PRODUCTION.md)).
