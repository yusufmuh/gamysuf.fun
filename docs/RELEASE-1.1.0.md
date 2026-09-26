# Gamysuf Arcade 1.1.0

Rilis web, 27 September 2026. Domain tujuan: https://gamysuf.fun/.

## Perubahan

- Dashboard: daftar game lebih awal, navigasi bawah untuk layar sentuh, tombol minimal 44 px, tata letak 320–1920 px, album yang bergulir dalam bagiannya sendiri, dan tampilan Studio yang menyesuaikan ponsel.
- Hero tidak mengganti tujuan tombol secara otomatis. Pilihan game tetap dapat diubah; pintasan permainan terakhir disimpan pada perangkat.
- Dialog menjaga fokus keyboard dan mematikan interaksi di belakangnya. Masalah jaringan menampilkan tombol coba lagi. Animasi mengikuti preferensi perangkat dan dapat dikurangi melalui panduan.
- Beauty Drop: papan dan tombol tampil bersama dalam orientasi potret; resize saat kapsul bergerak tidak mengubah hasil; cahaya slot berakhir, partikel mengikuti waktu nyata, gerak minimal melewati animasi dekoratif, hasil tetap terbuka jika penyimpanan penutupan gagal.
- Spin: kontrol musik mengikuti lebar layar, arena lanskap lebih ringkas, lingkaran dekorasi tidak meluap, dan audio yang tidak tersedia tidak menghalangi permainan.
- Nyapit: kabinet potret tidak lagi dibatasi tinggi desktop; mahkota, tombol, dan panel tetap terbaca. Audio Spin/Nyapit berhenti ketika halaman disembunyikan.
- Sampul diambil dari game sebenarnya, dengan font, foto produk, maskot, logo, dan audio proyek yang sudah ada. Tidak ada ketergantungan produksi baru.

## Pemeriksaan

- Tes server: hub 13/13, Spin 83/83, Nyapit 54/54, Drop 29/29.
- Pemeriksaan aset dan sintaks ketiga sumber lulus.
- Tur Electron 1600×900: 16 tangkapan, nol error konsol.
- Matriks responsif: 616/616 pemeriksaan lulus. Chromium pada lebar 320, 360, 390, 540, 768, 844 lanskap, 1024, 1366, dan 1920; Firefox/WebKit pada 320, 390, 768, 1366. Putaran animasi penuh ketiga game diuji pada Chromium 390; Drop dilipat/dibuka 390→540→390 saat kapsul jatuh lalu hasil ditutup dan tombol main kembali aktif.
- Pemeriksaan Drop setelah penyesuaian tablet terakhir: 24/24 pada 768×1024 dan 24/24 pada 1024×1366. Papan dan tombol terlihat bersama. Interaksi dashboard: 24/24.
- Rincian browser tersimpan di `artifacts/qa-responsive/report.json`; interaksi dashboard 24/24 lulus, rinciannya di `artifacts/hub-interaction-qa/report.json`.
- Seluruh permainan uji memakai data lokal sementara. Stok booth dan profil produksi tidak digunakan untuk QA.

## Deployment

Rilis disiapkan untuk repo `yusufmuh/gamysuf.fun`, entry `hub/server.cjs`, konfigurasi Hostinger yang sudah ada. Status build dan probe setelah publikasi disimpan dalam `artifacts/deployment-1.1.0.json`. File itu hanya ditulis setelah ada bukti dari Hostinger dan domain.

## Batas verifikasi

Pengujian browser menggunakan Chromium, Firefox, dan WebKit di komputer pengembang. Ukuran HP, tablet, lipat, dan desktop disimulasikan; ini bukan hasil uji pada semua perangkat fisik atau Safari di Mac/iPhone.

Rilis ini memperbarui versi web. Paket Steam, build macOS/Linux, pengujian gamepad, dan publikasi storefront belum dilakukan. PRD Drop masih mencatat kebutuhan foto cosplayer resmi; asal dan izin distribusi aset perlu dituntaskan sebelum distribusi komersial. Windows EXE versi sebelumnya tidak dibangun ulang oleh rilis web ini.
