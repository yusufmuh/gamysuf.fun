# PRD — Bipy Heart Parade

**Game 05 · Gamysuf Arcade 1.5.0 · 1 Oktober 2026**

Pemilik produk: Muhammad Yusuf / Bpedia. Sumber kode: `../05 bipy-heart-parade`. Rute: `https://gamysuf.fun/g/heart/`.

## 1. Konsep dan tujuan

Bipy Heart Parade adalah permainan kapsul hati yang mempertemukan pemain dengan satu momen fanservice romantis bersama Zoro atau Sanji. Daya tarik utama berasal dari ilustrasi karakter dewasa full body, ekspresi ramah, kostum elegan, tiga varian Bipy, animasi undangan, dan kartu kenang-kenangan yang dapat disimpan.

Sasaran utama adalah pengunjung dewasa penggemar cosplay, khususnya perempuan, yang ingin pengalaman personal, playful, dan mudah difoto. Permainan online gratis menghasilkan kartu digital; interaksi fisik hanya dilakukan pada sesi booth yang dikelola petugas. Pilihan kenyamanan tersedia sebelum bermain dan dikonfirmasi kembali saat bertemu cosplayer.

Tujuan operasional: memancing ketertarikan dari luar booth, memperjelas pilihan momen, mengatur antrean per cosplayer, dan membawa pengunjung kembali ke ekosistem Bpedia. Tidak ada pembayaran, persentase peluang, atau nominal belanja baru yang dipaksakan oleh game ini.

## 2. Dasar sumber dan hubungan dengan game ketiga

- `market 6.0.pdf`: proposal visual 36 halaman. Materi venue yang diperiksa menyebut Urban Forest Cipete, 3–4 Oktober 2026. Angka target/historis dalam proposal bukan hasil aktual acara ini. Jadwal cosplayer, ketentuan transaksi, dan kuota operasional belum ditetapkan dalam bahan yang terverifikasi.
- JPEG logo Market-In dari pengguna menjadi referensi floral/Y2K. Pola papan catur pada JPEG merupakan piksel gambar; tidak dianggap sebagai transparansi asli. UI menampilkan teks event tanpa mengubah atau menggambar ulang logo tersebut.
- Game 03, `03 bipy-beauty-drop`: dipelajari alur pemilihan cosplayer, hasil yang ditentukan server, kartu hasil, mode demo/booth, dan pemulihan pending. Game tersebut tetap mempertahankan hadiah serta menu lamanya.
- Identitas aktual: `02_Brand Guidline/02_Bipy/bipy-full-berdiri.png` dan `03_Warna_Font/bpedia-tokens.css`. Bipy pink dan wordmark Bpedia berasal dari master; varian hijau/kuning adalah kostum tematik.
- Catatan repo PRD/CLAUDE dan rilis 1.3–1.4.1 menjadi referensi integrasi, responsivitas, hosting, dan isolasi data. Tidak ada klaim bahwa seluruh percakapan privat Claude/Antigravity telah dibaca.

Game kelima memakai kapsul hati dengan tujuh tiket yang mengorbit, berbeda dari papan pin Beauty Drop. Pengunjung boleh membiarkan kapsul memilih atau memilih menu langsung apabila opsi tersebut dibuka petugas. Hasil acak memilih seragam di antara menu aktif; kecepatan klik dan animasi tidak memengaruhinya.

## 3. Lingkup rilis

Termasuk: dua host, tujuh menu, tiga Bipy, 14 kombinasi koleksi, musik/SFX, pilihan tanpa sentuhan, kartu PNG 1080×1350, antrean petugas, kuota harian WIB, status layanan, ekspor CSV/backup JSON, panduan, serta integrasi album/XP/dashboard arcade.

Di luar rilis: pembayaran online, penjualan peluang gacha, integrasi inventori/transaksi toko, sistem reservasi lintas banyak booth, login pelanggan baru, rekaman kamera otomatis, dan publikasi Steam. Rilis ini adalah game web; paket native, pemeriksaan hak distribusi aset/karakter, dan proses penerimaan marketplace merupakan tahap tersendiri sebelum distribusi di toko tersebut.

## 4. Arah visual dan suara

**Zoro — The Jade Swordsman.** Rambut hijau, ciri luka mata, kostum hijau gelap, tiga pedang tersarung. Pose penuh percaya diri dengan tangan mengundang. Kepala sampai sepatu harus terlihat utuh.

**Sanji — The Golden Gentleman.** Rambut pirang, setelan hitam dengan detail emas, mawar dan hidangan penutup. Gestur hangat dan elegan. Kedua karakter tampil berpakaian lengkap dan jelas dewasa; ilustrasi tidak dipresentasikan sebagai foto cosplayer nyata atau kolaborasi resmi.

**Bipy Original / Jade / Golden Chef.** Pink memakai master Bipy. Jade mempertahankan hood tulip, proporsi chibi, wajah Bipy, warna hijau, bekas luka mata bergaya kartun, dan pedang properti. Golden Chef berwarna kuning, memakai setelan/apron, membawa wajan dan spatula. Nama Bipy dan identitas Bpedia tetap menjadi jangkar visual.

Komposisi editorial dengan panggung lengkung, ruang kosong terarah, motif bunga/kelopak, cream, dusty pink, jade, dan emas. Poppins untuk UI, Fraunces untuk judul romantis; font tersimpan lokal. Tema terang/gelap mengikuti pengaturan arcade. Ikon menu berupa SVG, bukan emoji yang berubah antar OS.

BGM taman memakai audio existing Beauty Drop yang dikompresi ke MP3; SFX seleksi, putaran, dan reveal menggunakan Web Audio. Musik mulai setelah interaksi yang diizinkan browser, tombol bisu tersimpan, audio berhenti saat tab tidak terlihat. Tidak memaksa autoplay yang ditolak OS.

## 5. Tujuh menu fanservice

| Menu | Pengalaman utama | Alternatif tanpa sentuhan | Acuan durasi |
|---|---|---|---|
| Cinderella's Fit | Membantu memakaikan sepatu saat tamu duduk nyaman | Pose pangeran dengan sepatu properti | 60 detik |
| Princess Twirl | Dansa kecil dan satu putaran pelan | Dansa berdampingan tanpa bergandengan | 45 detik |
| Blossom Whisper | Menyelipkan bunga di dekat telinga | Tamu memasang sendiri, cosplayer berpose di samping | 45 detik |
| Sweet Offering | Menyerahkan setangkai bunga | Penyerahan melalui nampan | 40 detik |
| Knight's Vow | Gestur cium punggung tangan; kontak hanya jika keduanya setuju | Membungkuk dan gestur cium dari jarak aman | 40 detik |
| Warm Hug | Pelukan singkat depan atau back hug ringan sesuai pilihan bersama | Pose hati berdampingan | 40 detik |
| Pat on Head | Usapan kepala singkat setelah persetujuan | Gestur tangan di atas kepala tanpa menyentuh rambut | 35 detik |

Durasi adalah asumsi perencanaan, bukan janji layanan. Tambahan transisi 20 detik per tiket dipakai dalam estimasi antrean. Estimasi menambahkan tiket yang sedang menunggu host yang sama; keterlambatan, pergantian properti, dan istirahat tetap dikelola petugas.

## 6. Alur pemain

1. Masuk dari dashboard atau tautan langsung. Lihat dua host full body, pilih Zoro/Sanji, lalu tekan **Buka kapsul hati**.
2. Dialog menampilkan pilihan **tanpa sentuhan** sebagai default, atau sentuhan ringan. Nama panggung opsional. Persetujuan interaksi wajib; izin dokumentasi terpisah dan tidak tercentang otomatis.
3. Pilih gacha atau menu langsung jika tersedia. Di perangkat booth, petugas memverifikasi peserta dewasa dan misi booth sebelum penerbitan tiket.
4. Server menyimpan hasil terlebih dahulu. Animasi 4,2 detik menampilkan karakter dan Bipy; tombol lewati dan reduced motion tersedia.
5. Kartu menampilkan menu, host, versi interaksi, dokumentasi, kode, serta penanda demo/booth. Pemain dapat mengunduh kartu PNG.
6. Tombol Selesai mengonfirmasi hasil ke server sebelum mengizinkan putaran berikutnya. Kartu booth tetap menunggu di antrean sampai petugas menandai selesai/batal.

Online menggunakan kode `DEMO-` dan label tidak berlaku untuk klaim booth. Booth menggunakan `HP-` serta nomor antrean harian. Tidak ada pengambilan foto/video otomatis.

## 7. Alur dan SOP petugas

Dashboard game: `/g/heart/admin.html`. PIN berasal dari konfigurasi hosting yang sudah ada; tidak ditulis pada PRD atau antarmuka publik. Perangkat online tanpa login selalu mendapat mesin demo pribadi, sekalipun petugas membuka mode booth.

Petugas dapat mengatur mode, jeda, sesi buka/tutup, teks jadwal, batas antrean, pilihan menu langsung, durasi reveal, host aktif, kuota harian, dan menu aktif. Nilai awal antrean 12 dan kuota 80 per host adalah nilai konfigurasi, bukan kapasitas acara yang telah disetujui. Kuota dihitung per tanggal WIB; tiket belum selesai tetap terlihat setelah pergantian hari.

Urutan kerja: konfirmasi misi → pilih kenyamanan → terbitkan tiket → panggil nomor sesuai host → konfirmasi ulang interaksi/dokumentasi → lakukan momen → tandai selesai. Petugas dapat mengganti ke versi tanpa sentuhan tanpa membuat tiket baru. Pembatalan melepaskan kuota, tetapi nomor antrean tidak dipakai ulang. Tiket selesai/batal tidak dapat dihidupkan kembali.

Ruang foto dan antrean dibuat terpisah dari jalur lalu lintas. Sediakan kursi stabil untuk Cinderella's Fit, ruang putar bebas hambatan, bunga/sepatu properti bersih, serta pedang properti tetap tersarung. Tidak menarik tamu, mengangkat tubuh, atau mendadak melakukan back hug. Kedua pihak boleh menolak, berhenti, atau mengganti menu. Jadwal istirahat dan ketersediaan cosplayer diumumkan sebelum menjanjikan layanan.

Hubungan funnel: booth mengarahkan pengunjung ke aplikasi/kanal Bpedia melalui misi yang ditetapkan tim; game mencatat penerbitan dan penyelesaian tiket. Data itu belum membuktikan install, pembelian, atau atribusi iklan. Pelaporan konversi harus digabungkan dengan bukti terpisah.

## 8. Ketahanan, privasi, dan arsitektur

Runtime Node.js memakai engine, store atomik, katalog, dan server tersendiri. Tidak menambah dependensi produksi ke hub. Asli berada di folder 05; `npm run sync` memasukkannya ke `games/heart`. Registry hub mengubah hasil menjadi 14 kartu epik, sehingga total album menjadi 88 kartu. XP dibukukan oleh gateway secara idempoten.

Setiap putaran mempunyai requestId. Klik ganda/retry menghasilkan kartu sama. Jika respons hilang, UI mengambil pending dari server. Reload membuka kembali hasil yang belum ditutup. Kegagalan acknowledgement mempertahankan kartu dan mencegah putaran baru. Perubahan ukuran saat animasi tidak menghitung ulang hasil. Putaran demo tidak mengurangi kuota/stok booth.

Data tiket: kode, waktu, host, menu, nama panggung opsional, pilihan kenyamanan/dokumentasi, nomor antrean, dan status. Tidak meminta nomor telepon, email, foto, alamat, atau tanggal lahir. Nama dibatasi 24 karakter; ekspor CSV menetralkan formula spreadsheet. Public API tidak mengirim seluruh riwayat. JSON event disimpan di direktori data persisten; backup dapat diunduh petugas.

Riwayat resmi tidak dihapus otomatis pada rilis ini. Pemilik menentukan retensi operasional dan mengelola backup sesuai kebutuhan acara. Demo tersimpan terbatas dan terpisah per pengunjung. Cookie sesi HttpOnly/SameSite, Origin/header khusus untuk mutasi, PIN scrypt, pembatasan percobaan login, CSP, dan pembatasan akses berkas sumber tetap diberlakukan.

## 9. Responsif dan aksesibilitas

Tampilan fluid 320–1920 piksel, landscape, tablet, serta simulasi buka/tutup foldable. Tidak mendeteksi merek perangkat; mengikuti ruang viewport yang benar-benar tersedia. Host tetap utuh dengan `object-fit: contain`, menu dua kolom di ponsel, dialog dapat digulir, dan tombol utama minimal sekitar 44 piksel.

Kontrol sentuh/mouse/keyboard, fokus dialog native, Escape, tombol suara, reduced motion dari OS dan aplikasi, teks status/alert, label gambar, serta penyimpanan preferensi yang tahan kegagalan localStorage. Tidak ada informasi penting yang bergantung pada suara. Browser modern Windows/macOS/Android/iOS ditargetkan melalui Chromium/Firefox/WebKit; emulasi browser tidak menggantikan pengujian perangkat fisik.

Anggaran runtime game baru sekitar 2 MB sebelum kompresi HTTP: WebP transparan, font lokal, MP3 0,67 MB, SVG, serta JavaScript/CSS ringan. PNG master tetap di arsip sumber untuk penyuntingan. Tidak memuat layanan font atau script eksternal saat bermain.

## 10. Kriteria penerimaan dan pengukuran

- Ketujuh nama menu dan dua host benar; seluruh menu aktif dapat diperoleh; menonaktifkan menu/host mencegah hasil baru terkait.
- Semua gambar/font/suara dimuat, tidak ada overflow horizontal pada matriks viewport, konsol tanpa exception, dan permainan dapat diulang.
- Demo, stok/kuota asli, sesi admin, XP, retry, serta pending terpisah dengan benar. Unduhan kartu dapat dibuka sebagai PNG 1080×1350.
- Tidak ada PIN default yang membuka hosting. Data persisten tidak bergantung pada direktori build Hostinger.
- GitHub commit, status deployment Hostinger, versi publik, endpoint, hash kode dan gambar CDN diverifikasi sesudah publikasi.

Pengukuran yang tersedia: jumlah tiket diterbitkan/diselesaikan/dibatalkan, jumlah antrean, penggunaan host/menu dari CSV, serta statistik arcade yang sudah ada. Tingkat penyelesaian = tiket selesai / tiket resmi terbit; tingkat pembatalan = tiket batal / tiket resmi terbit. Keduanya metrik turunan, bukan hasil aktual sebelum event berjalan. Waktu antre aktual dan konversi pembelian belum memiliki instrumentasi penuh pada rilis ini.

## 11. Verifikasi dan serah-terima

Tes yang harus dijalankan: tes engine/server sumber 05, tes hub/hosting, `scripts/heart-ui-qa.cjs`, `npm run qa`, `npm run qa:responsive`, pengemasan Hostinger, lalu `scripts/verify-deployment.cjs` dan probe UI produksi. Hasil aktual tersimpan di `docs/RELEASE-1.5.0.md` dan folder artifacts; tidak menyamakan rencana tes dengan bukti lulus.

Rujukan teknis yang diperiksa: [Node crypto](https://nodejs.org/api/crypto.html), [MDN AudioContext.resume](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume), [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices). Katalog aset/provenance: `docs/ASSETS-Heart-Parade.md`.
