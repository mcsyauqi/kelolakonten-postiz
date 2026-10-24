# Peta pemilik keyword Kelola Konten

## Revisi 13 Oktober 2026

Catatan revisi internal, 13 Oktober 2026.

Ini revisi pemilik keyword, bukan penghapusan catatan historis. File peta sebelumnya belum ada di `marketing/research/`; baseline 5 Oktober tetap disimpan di tab **Cluster & Halaman**, sedangkan keputusan terbaru ditambahkan sebagai baris revisi bertanggal. Untuk keyword yang sama, revisi bertanggal paling baru adalah pemilik aktif.

| Keyword | Pemilik aktif | Intent dan keputusan |
|---|---|---|
| content planner | https://kelolakonten.com/artikel/content-planner-untuk-umkm | SERP campuran panduan, template, dan produk. Pertahankan artikel UMKM yang sudah live dan terindeks; jangan membuka halaman produk kedua sebelum fungsinya siap. |
| engagement rate instagram | https://kelolakonten.com/alat/cek-engagement-rate | Intent dominan kalkulator. Alat manual ini menerima angka interaksi serta reach/pengikut dari pengguna, bukan mengambil data akun otomatis. |
| cek engagement rate | https://kelolakonten.com/alat/cek-engagement-rate | Satu alat yang sama melayani intent perhitungan; tidak dibuat URL duplikat untuk sinonim query. |
| kalender konten | https://kelolakonten.com/alat/template-kalender | Intent banyak mengarah ke template. Generator kerangka yang sudah live menjadi pemilik; panduan proses tetap di artikel tersendiri. |

### Halaman pendukung, bukan pemilik query umum

| Keyword turunan | Halaman pendukung | Diferensiasi |
|---|---|---|
| cara menghitung engagement rate instagram | https://kelolakonten.com/artikel/cara-menghitung-engagement-rate-instagram | Title: Rumus Engagement Rate Instagram: Cara Menghitung dan Contoh. H1 berfokus pada rumus dan contoh data sendiri. Tautan kontekstual ke alat cek dipertahankan. |
| cara membuat kalender konten | https://kelolakonten.com/artikel/cara-membuat-kalender-konten | Title: Cara Membuat Kalender Konten: Panduan Alur Kerja Tim. H1 berfokus pada alur kerja tim. Tautan kontekstual ke template dipertahankan. |

Halaman fitur umum tetap menargetkan **social media management tools**, bukan **content planner**. Rencana `/fitur/content-planner/` dan `/tools/engagement-rate-instagram/` tidak diaktifkan sebagai pemilik; tidak ada URL baru, redirect, atau canonical lintas halaman yang dibuat.

### Dasar keputusan

- SERP Google Indonesia, bahasa Indonesia, desktop, 13 Oktober 2026, sepuluh slot organik per keyword. Empat query menghasilkan 40 slot. Pada `content planner`, dua URL berulang sehingga sepuluh slot hanya memuat delapan URL unik; ini tidak dihitung sebagai sepuluh kompetitor berbeda.
- `engagement rate instagram`: tujuh dari sepuluh slot berupa kalkulator; satu artikel, satu posting sosial, satu video.
- `cek engagement rate`: tujuh kalkulator dan satu kalkulator disertai panduan; satu artikel dan satu video.
- `kalender konten`: dua halaman template, empat artikel tentang template, tiga panduan, satu produk. Tidak semua hasil merupakan alat interaktif, tetapi kebutuhan template dominan.
- GSC menggunakan properti `sc-domain:kelolakonten.com`, jendela final 14 September sampai 11 Oktober 2026. Data query/halaman untuk empat keyword belum menghasilkan baris; itu bukan bukti kanibalisasi ranking atau impresi per keyword nol. Pemilihan intent terutama memakai SERP dan kemampuan halaman yang benar-benar live.
- Content planner dipertahankan di URL yang telah terindeks; alat dan artikel dibedakan menurut tindakan pengguna dan penjelasan, bukan dengan membuat URL sinonim tambahan.

Contoh hasil SERP yang mendasari tipe halaman:

- https://remarketing.id/contentplanner/
- https://www.canva.com/solutions/content-planning-scheduling/
- https://www.jagoanhosting.com/blog/content-planner/
- https://www.wask.co/instagram-engagement-rate-calculator
- https://kol.id/instagram
- https://hypeauditor.com/free-tools/instagram-engagement-calculator/
- https://asana.com/id/templates/social-media-calendar
- https://www.notion.com/id/templates/category/content-calendar
- https://qontak.com/blog/contoh-template-kalender-konten-gratis/

### Pagar publikasi

- Semua URL pemilik menggunakan URL bersih tanpa `.html`.
- Artikel pendukung tetap mempunyai title/H1 yang berbeda dari alat pemilik dan tautan dalam badan artikel menuju pemilik.
- Fungsi kalkulator dan generator tidak diubah. Tidak ada klaim pengambilan data Instagram otomatis atau benchmark universal.
- Tidak ada perubahan kode aplikasi Postiz, workflow deploy, harga, logo, atau routing pada revisi ini.
- Bukti internal, respons API mentah, log, PDF, dan screenshot tidak disimpan dalam repository publik.
