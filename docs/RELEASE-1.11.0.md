# Gamysuf Arcade 1.11.0 · Grand Line Desire 2.6.0

3 Oktober 2026. Tiga revisi komentar browser: tombol Putar/Jeda cuplikan di atas trailer dihapus tanpa menghilangkan video, subtitle fanservice diperbesar menjadi 15–21 px (20 px untuk tablet 601–1000 px), dan ruang footer diisi atraksi Bipy Zoro–Sanji bersama Bipy pink.

Atraksi memakai lima artwork asli pemilik: Zoro siap/jump, Sanji kick/flower, serta Bipy pink. Siklus 8,8 detik menggerakkan maskot maju, melompat, berganti pose, mengeluarkan sapuan giok/emas dan hati, lalu kembali. Artwork, proporsi dan huruf B tidak digambar ulang. Ini animasi ilustrasi CSS, bukan video generatif. Gerak hanya berjalan ketika footer terlihat, halaman aktif, dialog tertutup dan animasi diizinkan. Jeda atraksi menghentikan timeline; preferensi sistem serta pengaturan global kurangi animasi menyediakan tampilan statis. Trailer mengikuti pengaturan global, tanpa kontrol overlay yang lama. Atribusi dan dashboard petugas tetap tersedia di bawah adegan.

Alur kartu, tujuh kartu per leader, harga belanja, peluang, koleksi, tiket dan antrean tidak diubah. Lima video kartu Gemini serta sembilan loop ilustrasi tetap sama; sembilan video generatif masih menunggu kuota sesuai VIDEO-GENERATION-STATUS.md.

Validasi lokal: 47 tes sumber dan pemeriksaan sintaks; 75 tes integrasi hub; 640 pemeriksaan footer/trailer/subtitle; 561 pemeriksaan alur kartu; 18 tangkapan arcade dengan nol error konsol. Pemeriksaan browser menggunakan Chromium, Firefox, WebKit pada 390×844, 768×1024, 844×390 dan 1440×900, dalam kedua tema. Ini emulasi viewport, bukan klaim pengujian perangkat fisik. Memeriksa decode lima artwork, pemutaran trailer, timeline gerak/jeda, penghentian offscreen, kurangi animasi dan dialog, serta nol error JavaScript. Bukti: artifacts/heart-footer/report.json dan artifacts/heart-browser-revision/report.json.

Paket Hostinger: 722 berkas, 164977027 byte, SHA-256 a9f778872769406ecf5bf80cd4a479578287232c4bc155a1634e9cc3fed48610. Lima pemeriksaan instalasi dan aplikasi hasil ekstraksi lulus. Bukti: artifacts/package/smoke-1.11.0.json. Penerapan dan verifikasi produksi dicatat setelah build selesai.
