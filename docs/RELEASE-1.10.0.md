# Gamysuf Arcade 1.10.0 · Grand Line Desire 2.5.0

3 Oktober 2026. Revisi enam komentar pratinjau dan hero: ilustrasi Zoro/Sanji dewasa baru, full body 1024×1536 transparan; gambar lama yang mencampur figur dewasa dan Bipy pada panel kiri pratinjau diganti. Panel kiri kini berjudul **Cosplayer pilihanmu**, sementara panel Bipy tetap memperlihatkan pose yang sesuai untuk setiap fanservice.

Tombol tutup memakai ikon bunga Bpedia, target 52×52 px dan indikator fokus keyboard. Safari mengembalikan fokus ke tombol pembuka yang sebenarnya. Tulisan presents dihapus dan diganti duo karakter One Piece bergaya anime yang bergerak ringan di samping logo asli. Aksen ini merupakan animasi ilustrasi CSS, bukan cuplikan resmi anime. Cuplikan resmi Crunchyroll tetap berada di latar dek.

Ruang kedelapan di dek memuat tiga pose Bipy Zoro dari folder pemilik: siap beraksi, melompat, dan memberi jempol. Ketiganya memakai artwork asli tanpa perubahan proporsi. Gerakan berhenti ketika panel tidak terlihat atau pengguna mengurangi animasi. Pada tablet, hero memakai satu kolom agar kedua figur leader tetap cukup besar. Label kartu tidak menutup kaki karakter.

Artwork dibuat dengan **OpenAI built-in image_gen**, menggunakan figur lama sebagai referensi identitas. Master PNG ada di `docs/artwork/` dan Downloads pemilik, WebP runtime di `games/heart/assets/characters/`. Prompt, referensi, dimensi, hash dan provenance tercatat di `hero-hd-manifest.json`. Figur dewasa bergaya romantis dan berpakaian; ilustrasi Bipy tidak digabungkan dengan artwork hero tersebut.

Harga belanja Rp100.000/Rp150.000, tujuh kartu per karakter, ID BP06, koleksi, peluang gacha, antrean dan data petugas tetap mengikuti kontrak sebelumnya. Lima video fanservice Gemini dan sembilan loop ilustrasi tidak berubah pada revisi ini; sembilan video generatif masih menunggu kuota sebagaimana dicatat dalam `VIDEO-GENERATION-STATUS.md`.

Validasi lokal saat penulisan: 47 tes sumber dan pemeriksaan sintaks, 75 tes hub, serta 1265 pemeriksaan tampilan di Chromium, Firefox dan WebKit, pada 390×844, 768×1024, 844×390 dan 1440×900 dalam kedua tema. Uji tampilan memeriksa seluruh 14 kombinasi pratinjau, gambar terdekode, ikon, fokus keyboard, ruang aksi Bipy, animasi dan mode kurangi animasi, serta nol permintaan draw ketika hanya membuka pratinjau. Bukti lokal: `artifacts/heart-presentation/report.json`. Verifikasi produksi dan paket dilengkapi setelah penerapan selesai.

Validasi alur kartu lokal terakhir: 561/561 pemeriksaan, nol error JavaScript. Tur seluruh arcade: 18 tangkapan, nol error konsol. Paket Hostinger 1.10.0: 722 berkas, 164.974.674 byte, SHA-256 b28a636ba6d89178f0fa800276756105bd832fca7b686f40454763bb313da94a; lima pemeriksaan instalasi dan aplikasi hasil ekstraksi lulus. Bukti: artifacts/heart-browser-revision/report.json dan artifacts/package/smoke-1.10.0.json.
