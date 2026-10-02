# Gamysuf Arcade 1.6.1 · Grand Line Desire

Tanggal: 2 Oktober 2026. Status: persiapan deployment; produksi terakhir yang sudah diverifikasi adalah 1.6.0.

Game 5 berganti nama menjadi **Bipy Grand Line Desire · Zoro & Sanji Fanservice Card Game** dengan rute tetap `/g/heart/` dan 14 ID BP06 yang sama. Kartu dibuka langsung melalui booster acak atau pilihan sendiri. Permintaan default mencatat tanpa sentuhan, tanpa dokumentasi, dan persetujuan false; booth meminta persetujuan langsung sebelum interaksi nyata.

Perbaikan mencakup trailer di pembuka dengan poster lanskap, gambar poster bounty proporsional, Bipy utuh pada baris sendiri, kartu ponsel dua kolom yang lebih besar, tema Gelap/Terang eksplisit, tombol Demo/Main Tercatat dengan PIN petugas, serta gerak Bipy yang mengikuti reduced motion. Animasi flip, media hasil, dan timer dibersihkan ketika tiket ditutup agar hasil berikutnya tidak menerima efek dari putaran sebelumnya. Koleksi, riwayat, antrean, dan data resmi menggunakan ID serta penyimpanan lama.

| Validasi lokal | Hasil |
|---|---|
| Sumber Game 5 | 40/40 tes + pemeriksaan sintaks |
| Hub | 67/67 tes |
| UI Game 5 | 21/21: direct pick/gacha, PIN, tema, poster, ekspor PNG, pemulihan, antrean petugas |
| Responsif Game 5 | 4.140/4.140: Chromium/Firefox/WebKit × 12 viewport, 280–1920 px, ponsel/foldable/tablet/laptop/desktop |
| Animasi penuh | 5/5 kelompok pemeriksaan: 14 kartu, 16 draw, tujuh motif, Bipy bergerak/reduced motion, klik berulang, flip/close, tanpa efek tertinggal atau error konsol |
| Paket Hostinger | 601 berkas, 134.160.540 byte; smoke test paket terisolasi lulus termasuk dependensi produksi, lima game, 14 artwork, video/audio/range, dan login/mode/tiket petugas |
| Produksi | Menunggu deployment dan pemeriksaan byte/aset/UI publik |

Bukti lokal berada di `artifacts/heart-ui/report.json`, `artifacts/heart-motion/report.json`, dan `artifacts/qa-responsive/report-{chromium,firefox,webkit}-all-heart.json`. Matriks emulasi bukan bukti seluruh perangkat fisik. Pemeriksaan HTTP/hash produksi memakai berkas commit yang benar-benar dirilis; hasil UI lokal tidak dianggap bukti live.

Paket awal rilis: `release/Gamysuf-Arcade-1.6.1-Hostinger.zip`, SHA-256 `6a016ca8754b8804a93373a25ef7e00a7e0e71daf218ccd70a8f7d3b157654b8`. Bukti smoke: `artifacts/package/smoke-1.6.1.json`. Tur visual dashboard/lima game menghasilkan 18 tangkapan tanpa error konsol.
