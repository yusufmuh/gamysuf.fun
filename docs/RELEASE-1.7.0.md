# Gamysuf Arcade 1.7.0 · Grand Line Desire

Rilis: 2 Oktober 2026; verifikasi akhir dan pembaruan audio: 3 Oktober 2026. Status: dipublikasikan di https://gamysuf.fun/g/heart/. Versi hub 1.7.0; sumber Game 5 2.2.4. Implementasi terakhir dipublikasikan melalui commit `b5bd236` di GitHub main.

Game 5 dibuka dengan trailer, pengenalan Zoro/Sanji, serta syarat belanja booth: Rp100.000 untuk gacha dan Rp150.000 untuk memilih fanservice. Pemain wajib memilih karakter terlebih dahulu. Dek Zoro berwarna hijau dan dek Sanji kuning. Gacha menampilkan tujuh menu, menumpuk dan mengocok kartu bersama Bipy dealer, kemudian menunggu pemain memilih satu kartu tertutup. Mode pilih menampilkan keterangan dan cuplikan setiap momen tanpa mengacak. Setiap hasil memperoleh animasi stempel bulat wajah Bipy berwarna pink; stempel ikut masuk ke ekspor kartu dan poster PNG.

Belanja diverifikasi petugas pada mode tercatat dan diperiksa kembali di server. Demo tidak menggunakan stok atau antrean resmi. Kartu/antrean lama tetap dibaca tanpa mengarang nominal pembelian. Pengulangan permintaan tidak menerbitkan tiket kedua. PIN booth 1234 ditampilkan sesuai permintaan pemilik dan hanya berlaku untuk Game 5; Studio serta game lain tetap memakai ADMIN_PIN.

Musik utama berasal dari berkas pemilik `3 menit.mp4`. Suite berulang 350,140 detik menggabungkan musik Bpedia dan dua dialog pengenalan Jepang: Zoro di detik 159 dan Sanji di detik 330. Dialog dibuat dengan suara sintetis Jepang, bukan rekaman atau tiruan pengisi suara resmi. Musik diperkecil selama dialog dan jingle hasil; pilihan bisu dan tab tersembunyi menjeda seluruh suara. Tidak ditambahkan lagu pembuka One Piece berlisensi dari sumber lain.

Empat belas cuplikan momen adalah berkas MP4 720×900, lima detik, H.264 tanpa audio, dengan badan dan kaki karakter tetap terlihat. Tiga belas memakai gerakan kamera dan motif pada ilustrasi; `zoro-vow` memakai video aksi Gemini yang sudah tersedia. Ini bukan klaim bahwa keempat belas adegan merupakan video aksi karakter baru. Tujuh ilustrasi POV Sanji HD dan dua dealer Bipy berasal dari folder pemilik. Potongan Zoro POV yang kurang lengkap disimpan sebagai arsip; pemain tetap melihat ilustrasi Zoro utuh. Provenance dan hash dicatat di [ASSETS-Heart-Parade.md](ASSETS-Heart-Parade.md) dan manifest aset.

Header menyediakan Demo/Main Tercatat, tema terang pink/gelap, suara, animasi, layar penuh dan Petugas. Tema memakai ekspor guideline Bpedia terkini: pink terang `#E62B5E` dengan pearl `#FFF7F8`, serta pink gelap `#FF5C8A` dengan Berry Night `#2A0A18`. Gambar, judul, keterangan, dan seluruh permukaan kartu dapat diketuk; tombol cuplikan tetap memiliki fungsi tersendiri. Keyboard Enter/Space tetap memakai tombol native.

Seluruh 50 PNG tambahan pemilik digunakan: 40 adegan duo dan 10 pose dealer, dengan alpha dan kanvas utuh. Galeri Home menyediakan filter 25 Zoro/25 Sanji; 14 pratinjau menu menampilkan adegan yang sesuai. Empat pose aktif Bipy dealer disiapkan sejak karakter dipilih agar pergantian saat mengocok lebih mulus. Manifest mencatat dimensi serta hash sumber dan hasil optimasi; total WebP tambahan 4.444.776 byte. Berkas PNG asli tetap utuh.

Antrean dan laporan Game 5 menampilkan karakter/menu, metode, nominal belanja per tiket, serta pemisahan demo. Jumlah nominal tiket bukan pendapatan unik karena satu transaksi dapat memiliki lebih dari satu tiket. Formulir persetujuan sebelum membuka kartu dihapus; petugas tetap mengonfirmasi interaksi dan dokumentasi di booth.

| Pemeriksaan | Hasil terverifikasi |
|---|---|
| Sumber Game 5 2.2.4 | 47/47 tes engine/server dan pemeriksaan sintaks lulus |
| Integrasi hub 1.7.0 | 75/75 tes lulus, termasuk pemeriksaan nominal serta isolasi PIN Game 5 |
| UI terarah | 21/21 lulus, termasuk gacha, pilih, pemulihan, ekspor dan mode resmi lokal |
| Audio nyata produksi akhir, sumber 2.2.4 | 29/29 di Chromium, Firefox, WebKit; sembilan hasil demo. Kontrol bisu, pengulangan musik, jingle, volume, visibilitas tab dan pemulihan kegagalan lulus |
| Media | 14/14 decode video, 42 frame ditinjau, 42/42 pemutaran browser |
| Tur dashboard/lima game | 18 tangkapan layar; tidak ada error konsol |
| Matriks alur lokal, sumber 2.2.0 | 4.514/4.514 pemeriksaan, 21/21 kasus pada Chromium/Firefox/WebKit, 294 preview video, 63 hasil demo dan 168 screenshot; tidak ada error tak terduga |
| Sentuhan/galeri lokal, sumber 2.2.1 | 337/337 pemeriksaan, 12/12 kasus: tiga browser pada 390×844, 768×1024, 844×390, 1440×900; seluruh 50 gambar decode, filter benar, gambar/judul dapat diketuk, fokus keyboard kembali, warna tepat dan tanpa overflow |
| Sentuhan/galeri produksi, sumber 2.2.2 | 337/337 pemeriksaan, 12/12 kasus pada tiga browser dan empat ukuran yang sama; tidak ada error JavaScript, overflow, atau penerbitan tiket dari galeri/pratinjau/pemilihan kartu |
| Sentuhan/galeri produksi akhir, sumber 2.2.3 | 361/361 pemeriksaan, 12/12 kasus pada Chromium, Firefox, WebKit; 390×844, 768×1024, 844×390, 1440×900. Pengukuran tambahan memastikan tombol tetap berada dalam kartunya; sentuhan gambar/judul, keyboard, cuplikan, kedua tema dan seluruh 50 gambar lulus tanpa tiket atau error JavaScript |
| Alur produksi, sumber 2.2.2 | 2.336/2.336 pemeriksaan, 9/9 kasus pada tiga browser dan tiga ukuran; 126 preview video, 378 decode gambar, 27 hasil demo dan 27 ACK; tidak ada error tak terduga atau mutasi tiket resmi |
| Dashboard petugas produksi | 14/14 pemeriksaan: autentikasi PIN 1234, dua ambang belanja, laporan, CSV, tiga ukuran layar; pengaturan, riwayat dan revisi tetap sama |
| Paket Hostinger akhir | 692 berkas; 154.304.028 byte; 5/5 pemeriksaan ekstraksi/instalasi terisolasi, seluruh lima game, media/range, hash seluruh 50 aset tambahan, PIN booth, tiket lokal terverifikasi dan acknowledgement lulus. SHA-256 `423851fff0c5fa36a80711be2e54ca9b2ac156259bd5fd9bae80730ed40d5a3a` |
| Halaman/aset produksi | 186/186 endpoint publik berhasil; kode dan aset dibandingkan dengan berkas Git yang sudah dipublikasikan, termasuk seluruh 50 gambar, token warna, audio dan 14 MP4 |

WebKit Windows pada lingkungan uji ini tidak menyediakan AudioContext; musik dan jingle native tetap berhasil. Ukuran decode video WebKit dapat berubah ketika compositor meresize tampilan; rasio sumber diperiksa dengan decode terpisah dan badan/kaki diperiksa pada screenshot. Emulasi browser/viewport bukan bukti pengujian semua perangkat fisik.

Matriks lokal 21 kasus memakai sumber 2.2.0. Sumber 2.2.1 menjeda seluruh video dek ketika dialog terbuka dan memulihkan hanya preview yang terlihat setelah ditutup; 2.2.2 menyiapkan pose dealer lebih awal. Alur produksi 2.2.2 diperiksa kembali pada sembilan kasus. Percobaan awal Firefox sempat berhenti menunggu dialog; kasus tersebut dan matriks lengkap kemudian lulus tanpa perubahan perilaku aplikasi.

Pemeriksaan audio berulang menemukan tinggi tombol pilihan lama (`height:100%`) masih berlaku setelah tombol menjadi statis. Firefox dapat memperpanjang tombol hingga menutupi kartu berikutnya. Sumber 2.2.3 mengembalikan tinggi otomatis, mempertahankan batas sentuh minimal 46 piksel dan area klik seluruh kartu. Pemeriksaan tambahan mengukur setiap tombol agar tetap berada dalam kartunya sebelum dan setelah hasil. URL CSS menjadi `v=2.2.3` untuk menghindari cache lama. Laporan percobaan awal disimpan bersama bukti akhir.

Sumber 2.2.4 menulis volume efek langsung pada parameter gain ketika pilihan bisu berubah. Musik dan jingle tetap dijeda, serta sumber efek aktif dibersihkan. CSS/kartu/aset 2.2.3 tidak berubah; 361 pemeriksaan sentuh/tema tetap merujuk pada byte CSS yang sama. Pengujian ulang audio menilai gestur awal, pengulangan musik, bisu saat efek/jingle, pemulihan volume, tab tersembunyi dan kegagalan jingle yang sengaja disimulasikan.

Artefak pengujian berada di `artifacts/heart-ui/`, `artifacts/heart-audio/`, `artifacts/heart-audio-live/`, `artifacts/heart-journey/`, `artifacts/heart-touch-gallery/`, `artifacts/heart-touch-gallery-live/`, `artifacts/live-heart-journey-1.7.0/`, `artifacts/live-admin-1.7.0/`, `artifacts/package/smoke-1.7.0.json`, dan `artifacts/deployment-1.7.0.json`. Bukti rilis sebelumnya tetap berlaku hanya pada versi yang disebutkan di [RELEASE-1.6.1.md](RELEASE-1.6.1.md).

## Bukti publikasi

GitHub main dan Hostinger memuat implementasi `b5bd236`. Halaman live menggunakan audio `v=2.2.4`, `journey.js?v=2.2.2`, CSS journey `v=2.2.3`, serta `game.js` dan token warna `v=2.2.1`. Pemeriksaan deployment membandingkan byte komit dengan byte produksi setelah penyesuaian awalan route oleh gateway; gambar/video/audio dibandingkan persis, tanpa menonaktifkan pemeriksaan hash. Paket siap deploy berada di `release/Gamysuf-Arcade-1.7.0-Hostinger.zip`. PRD empat halaman tersedia sebagai PDF dan Word yang dapat diedit di `outputs/heart-parade/`.
