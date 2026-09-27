# Gamysuf Arcade 1.3.0

27 September 2026. Menindaklanjuti komentar browser pada dashboard dan tiga game.

- Logo Gamysuf 3D pink/putih serta wordmark Bpedia resmi berganti bersama tema. Header/footer hub dan logo pada game konsisten; sumber di `asset-generation-1.3.0.md`.
- Game bar menampilkan avatar pilihan dan detail profil, pintasan pengaturan profil, kembali/maju, unduh screenshot PNG lokal, tema, suara, layar penuh, panduan kontrol, serta kembali ke arcade. Spin mempertahankan akses game bar di dalam dialog arena.
- Tema gelap/terang menyatu antara dashboard dan tiga game. Mesin dan gambar hadiah tetap mempertahankan warna aslinya.
- Semua game mencoba musik saat dibuka. Browser yang menolak autoplay memulai musik pada sentuhan/klik/tombol pertama. Pilihan bisu tetap dihormati.
- Spin memakai Bipy resmi full body pada sambutan, arena, hasil, dan login petugas. Klik roda membuka arena demo tanpa melakukan putaran atau mengaktifkan mode booth.
- Nyapit memakai 12 kapsul visual pada HP kecil dan 18 pada layar sedang, dengan area hadiah di luar kabinet. Jumlah visual tidak mengubah peluang atau stok server.
- Drop memiliki kontrol misi mobile ringkas, informasi event tetap terlihat, akses Masuk admin, dan istilah cosplayer menggantikan host pada alur pemain.

## Verifikasi

- Tes sumber Spin 83/83, Nyapit 54/54, Drop 29/29.
- QA sumber: Spin mobile/arena/result/audio; Nyapit 320–1366 px, resize, ronde menang animasi/reduced motion; Drop matrix Chromium/Firefox/WebKit.
- Tes hub 13/13; tur Electron 16 tangkapan layar, 0 error konsol.
- Regresi responsif akhir 388/388 (Chromium, Firefox, WebKit), termasuk putaran demo, hasil, replay, serta resize Drop saat kapsul bergerak. Laporan `artifacts/qa-responsive/report.json`.
- Game bar 355/355: tema, avatar/profil, akses keyboard, suara, arena Spin, unduh PNG aktual pada tiga browser, dan kegagalan screenshot yang dapat dicoba ulang. Laporan `artifacts/gamebar-1.3.0/report.json`.
- Audio aktual diuji di Chromium dengan autoplay diizinkan dan diblokir. Waktu AudioContext bertambah; hanya satu loop musik aktif; mute tersimpan menghentikan musik. Nyapit diperbaiki agar panggilan resume yang tertunda saat boot dipulihkan langsung dalam gesture. Laporan `artifacts/audio-1.3.0/report.json`.
- Dock dan tombol Drop diperiksa ulang 244/244; Nyapit landscape 844×390 23/23 di masing-masing Chromium/Firefox/WebKit, dengan input tetap terlihat di atas tombol.
- Bukti publikasi versi, commit Hostinger, hash kode dan aset live: `artifacts/deployment-1.3.0.json`. Tur domain publik: `artifacts/live-ui-1.3.0/report.json`. Probe produksi tidak mengirim putaran atau mengubah stok.

Ukuran perangkat diuji melalui viewport browser, bukan seluruh perangkat fisik. Autoplay bersuara sebelum interaksi tetap tunduk pada aturan browser; aplikasi menyediakan fallback sentuhan pertama. Screenshot menggunakan render DOM lokal, sehingga sebagian transformasi, potongan gambar, dan filter GPU bisa berbeda dari tampilan langsung. Rilis ini adalah peningkatan game browser; bukan sertifikasi atau rilis Steam.
