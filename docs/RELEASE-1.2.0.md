# Gamysuf Arcade 1.2.0

27 September 2026. Perbaikan berdasarkan komentar pemilik di dashboard.

## Pengalaman pemain

- Maskot sambutan yang keluar dari batas modal diganti layar pemilihan karakter. Pratinjau dan enam kartu pilihan memakai gambar seluruh tubuh dengan `object-fit: contain`, tanpa posisi negatif yang memotong kepala.
- Enam gaya: Original, Explorer, Star, Collector, Classic, Champion. Dua pose memakai master resmi; empat varian baru memakai referensi identitas Bipy. Galeri yang sama tersedia pada pengaturan profil. ID profil lama tetap berlaku.
- Pilihan avatar memiliki nama, cerita singkat, indikator terpilih, animasi pergantian ringan, dan navigasi panah/Home/End dengan satu tab stop. Animasi mengikuti preferensi gerakan.
- Tema terang berwarna ivory/pink dan tema gelap burgundy dapat dipilih melalui tombol matahari/bulan. Pilihan disimpan di perangkat; gelap tetap bawaan.
- Logo baru Gamysuf Arcade mengikuti tulip Bpedia. Master logo Bpedia tidak diubah. Prompt dan provenance aset tersimpan pada `docs/asset-generation-1.2.0-*.md`.
- Album beranda menjadi satu slider ringkas: sekitar dua kartu pada HP, empat pada tablet, enam pada desktop. Geser/keyboard/tombol manual dan Jeda/Putar tersedia. Otomatis hanya saat terlihat; berhenti saat interaksi, tab tersembunyi, atau preferensi kurangi gerakan aktif. Album lengkap tetap bisa dibuka.
- Validasi nama/avatar di server kini atomik: avatar tidak dikenal tidak lagi mengubah nama sebelum permintaan ditolak.

## Verifikasi

- `npm test`: 13/13, termasuk regresi validasi profil. Mesin tiga game tidak diubah dalam rilis ini.
- `node scripts/avatar-qa.cjs`: 332/332 pada Chromium 320/390/540/768/1449/844 lanskap, Firefox 390/1449, WebKit 390/1449. Gambar utuh, radio/keyboard, profil simpan/reload, batas modal dan tombol masuk terjangkau diperiksa.
- `node scripts/theme-qa.cjs`: 40/40, Chromium dan WebKit; tema tersimpan, meta warna, dialog/album, storage ditolak, dan layout tanpa overflow.
- `node scripts/hub-interaction-qa.cjs`: 24/24.
- Tur Electron: 16 tangkapan dan 0 error konsol. Teardown alat menutup renderer sebelum server agar koneksi HTTP tidak menahan proses QA.
- Slider: tombol minimal 44 px; geser, otomatis, jeda, viewport, reduced motion, dan mempertahankan fokus/posisi saat data sama diperiksa pada runtime terisolasi. Bukti di `artifacts/album-slider-qa/`.

Ukuran perangkat disimulasikan di browser pengembang. Dialog pada layar pendek tetap bergulir: misalnya WebKit 390×844 perlu sekitar 27 px untuk mencapai tombol; seluruh tubuh karakter tetap utuh.

## Publikasi dan bukti

Rilis memakai integrasi GitHub → Hostinger yang sama: `main`, Node 20, entry `hub/server.cjs`. Environment dan data pemain/booth dipertahankan. `scripts/verify-deployment.cjs` memeriksa versi, endpoint publik, hash kode dan aset rilis setelah deployment. Bukti hasil akhir disimpan di `artifacts/deployment-1.2.0.json`; pemeriksaan gambar CDN, bila byte dioptimalkan, di `artifacts/live-image-verification/report-1.2.0.json`.
