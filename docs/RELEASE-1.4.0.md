# Gamysuf Arcade 1.4.0

1 Oktober 2026. Game ke-4 **Bipy Gacha Pop** untuk Market-In 6.0 (Urban Forest Cipete, 3–4 Oktober 2026) dan penghalusan lintas perangkat.

## Game baru: Bipy Gacha Pop (`/g/gacha/`)

- Mesin gashapon satu tap untuk keramaian: tekan GACHA!, sentuh mesin, atau Spasi. Tuas berputar, kapsul di kubah berguncang dengan fisika 2D, satu kapsul keluar dari corong, lalu pop menjadi kartu stiker die-cut dengan kode klaim `GP-`.
- 17 hadiah sesuai daftar pemilik: Bundling Paket 1–3 (legendaris), Kuas Set isi 5 Doraemon/Cony/Hello Kitty dan Saput Mickey isi 4 (epik kolab), serta 10 produk PINKFLASH/FOCALLURE (foto sama dengan game 1–3). "Hello Kitty" yang tertulis dua kali dijadikan satu SKU dengan stok ganda.
- Peluang = jumlah kapsul, tanpa persentase. Bawaan tanpa kapsul kosong. Warna kapsul mengikuti kelas hasil yang dipilih server.
- Kartu hasil menutup otomatis (bawaan 15 dtk) agar antrean mengalir. Setelah 40 dtk tanpa interaksi, mesin menjalankan mode menarik perhatian.
- Aset: ilustrasi vektor untuk 7 hadiah tanpa foto (berlabel "ilustrasi"; karakter berlisensi tidak digambar), 9 stiker Y2K, logo Market-In 6.0 tanpa latar, Bipy resmi, font Poppins/Fraunces lokal. Audio terdiri dari BGM musik merek 3 menit (MP3 128 kbps), SFX sintesis Web Audio, 16 suara MC baru, dan suara warisan. Semua MP3 untuk jaringan HP, total paket game 8,7 MB.
- Dashboard petugas: stok & unggah foto asli, isi kapsul, durasi & tutup otomatis, riwayat & klaim, peringkat, laporan Excel/CSV, cadangan & pemulihan.
- Sumber kebenaran: `C:\Users\Yusuf\coding\00 game\04 bipy-gacha-pop` (PRD sendiri di `docs/PRD-Bipy-Gacha-Pop.md`).

## Hub

- Registry `gacha`, sync folder 04, gamebar (nama, panduan kontrol, suara), album 74 kartu (kolab = epik), lencana "Semua Arena", sampul gameplay `covers/gacha.jpg`.
- Grid arena 2×2 di tablet/laptop dan 4 kolom di layar ≥1640 px, sehingga kartu ke-4 tidak menggantung sendiri.
- Teks beranda/meta menjadi empat game. Aset CSS/JS memakai `?v=1.4.0` agar cache CDN diperbarui.

## Perbaikan game lain

- Bipy Beauty Drop: papan tablet potret memperhitungkan `--gmy-bar-space`, sehingga tombol DROP tidak tertutup gamebar di WebKit/iPad 768×1024.
- Perubahan web 1.3.0 yang sudah live di game 01/02/03 kini juga di-commit di repo sumbernya masing-masing (isi identik dengan `games/`).

## Verifikasi

- Tes sumber: Spin 83/83, Nyapit 54/54, Drop 29/29, Gacha Pop 22/22 (+ `npm run check`). Tes hub 14/14, termasuk tes gateway Gacha Pop (XP/kartu dicatat server, stok booth tidak tersentuh, mode resmi ditolak untuk pengunjung).
- Gacha Pop mandiri (`scripts/qa-responsive.cjs`): 104/104 per mode di Chromium, Firefox, WebKit (tema gelap), dan Chromium tema terang + gamebar 76 px. Mencakup 13 ukuran: 320×568, 360×740, 390×844, 412×915, lipat 540×720 & 884×1104, tablet 768×1024 & 1024×768, lanskap pendek 844×390 & 740×360, desktop 1366, 1920, dan 2560. Diperiksa tombol GACHA! terlihat tanpa gulir, tanpa overflow, satu putaran sampai kartu, kartu tertutup, dan tanpa error konsol.
- Arcade `npm run qa:responsive`: 844/844 (empat game + dashboard, tiga mesin browser). Satu kasus Drop WebKit 768 sempat gagal lalu diperbaiki di sumber.
- Game bar `scripts/gamebar-qa.cjs`: 470/470, termasuk Gacha Pop (tema, avatar, profil, suara bersama, panduan, unduh screenshot PNG asli dari layar mesin).

Ukuran perangkat diuji lewat viewport browser (emulasi sentuh/mobile), bukan seluruh perangkat fisik. Autoplay bersuara sebelum interaksi tetap tunduk pada kebijakan browser; game menyalakan musik pada sentuhan pertama. Ilustrasi hadiah tanpa foto perlu diganti foto asli lewat dashboard sebelum mode resmi.
