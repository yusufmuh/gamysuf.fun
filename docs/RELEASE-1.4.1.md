# Gamysuf Arcade 1.4.1 — Gacha Pop untuk antrean booth

1 Oktober 2026. Melanjutkan game keempat yang sudah tersedia pada 1.4.0, dengan perbaikan operasional dan akses lebih jelas dari dashboard.

## Perubahan

- Pintasan Gacha Pop bertema Market-In 6.0 tampil langsung di beranda, memakai stiker bunga dari aset game. Empat kartu arena tetap tersedia dengan panduan, profil, album, dan tema bersama.
- Gacha Pop 1.0.1: kegagalan koneksi awal dapat dipulihkan melalui Coba lagi dan pemeriksaan berkala. Permintaan dibatasi 12 detik agar tidak menggantung.
- Bila server telah memilih hadiah tetapi respons hilang, game mengambil kembali hasil tertunda yang sama. Permintaan yang belum pasti mempertahankan requestId untuk mencegah pengurangan stok ganda.
- Kartu klaim tetap terbuka ketika penutupan gagal; petugas dapat mencoba lagi. Nama tamu dibersihkan setelah hasil berhasil ditutup.
- Menahan Enter atau Spasi tidak menutup hasil atau memulai putaran berikutnya. Klik ganda tetap menghasilkan satu hadiah.
- Undian produksi memakai `crypto.randomInt(total)` langsung pada jumlah kapsul; tidak ada pengaturan atau angka persentase peluang. Semua hadiah, nilai stok awal, font, maskot, suara, dan logo tetap mengikuti PRD.
- Sepuluh foto produk sama persis dengan Beauty Drop. Tujuh hadiah tanpa foto tetap memakai ilustrasi berlabel.

## Validasi

| Pemeriksaan | Hasil |
|---|---|
| Tes sumber Spin / Nyapit / Drop / Gacha | 83 / 54 / 29 / 22 lulus |
| Tes gateway dan hosting | 14 lulus |
| Dashboard + 4 game, Chromium/Firefox/WebKit | 844 pemeriksaan, 0 kegagalan |
| Gamebar, profil, panduan, tema, suara, screenshot | 470/470 |
| Gacha: gangguan jaringan, respons hilang, reload, tombol ditahan, pergantian tamu | 39/39 pada tiga mesin browser |
| Gacha: WebKit, 13 ukuran | 104/104 |
| Gacha: Chromium terang + gamebar, 14 ukuran termasuk 3840×2160 | 112/112 |
| Gacha: Chromium gelap 3840×2160 | 8/8 |
| Pemeriksaan aset Gacha | 70 berkas wajib, 17 hadiah, MP3 valid, tanpa CDN eksternal |
| Tur Electron dashboard/game/Studio | 16 tangkapan, 0 error konsol |

Pengujian perangkat menggunakan viewport, sentuhan, dan orientasi browser; bukan pengujian pada seluruh perangkat fisik. Data QA berada di folder sementara, terpisah dari data produksi. Skenario jaringan sengaja membatalkan permintaan lokal; tidak ada exception JavaScript selama uji pemulihan.

## Publikasi dan bukti

- Sumber Gacha: `../04 bipy-gacha-pop`; salinan deploy melalui `npm run sync` ke `games/gacha`.
- GitHub: `yusufmuh/gamysuf.fun`, branch produksi `main`; Hostinger telah dikonfirmasi menggunakan deploy otomatis untuk aplikasi `gamysuf.fun`.
- ZIP: `release/Gamysuf-Arcade-1.4.1-Hostinger.zip`.
- Verifikasi domain setelah deploy: `artifacts/deployment-1.4.1.json` berisi status endpoint, versi publik, dan hash kode. Aset gambar yang tidak berubah hanya memakai bukti CDN terdahulu jika hash berkas lokal dan respons publik keduanya cocok.
- Tur UI produksi: `artifacts/live-ui-1.4.1/report.json`. Skrip turut memeriksa Gacha Pop dan pintasan beranda.

Stok awal 209 kapsul adalah nilai contoh PRD, belum stok fisik terkonfirmasi. Hello Kitty diperlakukan sebagai satu jenis sesuai PRD. Petugas perlu menyesuaikan stok, foto asli tujuh hadiah, dan isi bundling sebelum acara resmi. Pengunjung web tetap bermain dalam mode demo terisolasi.

## Sumber teknis dan tema

- [Node.js 20: randomInt](https://nodejs.org/docs/latest-v20.x/api/crypto.html#cryptorandomintmin-max-callback).
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort), [KeyboardEvent.repeat](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat).
- PDF dan logo Market-In 6.0 dari pemilik serta empat tautan Instagram diperiksa sebagai referensi tema acara. Visual mempertahankan bunga, pink/hijau/kuning retro, maskot Bipy, mesin kapsul, dan kartu stiker dari PRD; tidak menyalin poster tenant atau wajah influencer.
