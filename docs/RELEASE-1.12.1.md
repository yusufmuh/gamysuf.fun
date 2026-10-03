# Gamysuf Arcade 1.12.1 · Grand Line Desire 2.7.1

3 Oktober 2026. Panel aksi di sebelah tujuh kartu kini mengikuti leader yang dipilih. Meja Zoro menampilkan Bipy hijau dengan pose siap, lompatan dan kemenangan. Meja Sanji menampilkan Bipy kuning dengan tendangan, mawar dan sajian. Judul, keterangan, gambar serta geraknya berganti ketika pemain kembali memilih leader, termasuk saat berganti mode gacha/pilih.

Enam ilustrasi berasal dari folder pemilik `Bipy varian zoro sanji`. SHA-256 sumber PNG dan aset WebP diverifikasi terhadap manifest; gambar tetap utuh, transparan dan proporsional. Tidak ada generasi baru atau perubahan tujuh kartu per leader. Animasi Zoro dan Sanji memiliki pola berbeda. Gerak berhenti di luar layar, saat dialog terbuka, ketika tab tersembunyi, pada home dan pada pilihan kurangi animasi. Label aksesibel mengikuti pose yang dipilih.

Validasi lokal: 47 tes sumber, 75 tes hub, 18 tangkapan tur arcade tanpa error konsol, serta 637 pemeriksaan panel aksi pada Chromium, Firefox dan WebKit. Viewport 390×844, 768×1024, 844×390 dan 1440×900 diuji dalam kedua tema. Pengujian mencakup Zoro→Sanji→Zoro, mode gacha/pilih, gambar terdekode, proporsi penuh, luapan horizontal, gerak nyata, penghentian animasi dan nol permintaan draw dari panel. Nol error JavaScript game. Laporan dan tangkapan: `artifacts/heart-host-actions/report.json`. Ini pengujian emulasi browser, bukan perangkat fisik.

Rilis memakai pipeline source-sync, paket Hostinger terisolasi, GitHub main dan pemeriksaan byte produksi. Bukti paket dan produksi disimpan setelah penerapan di `artifacts/release-final-1.12.1.json`, `artifacts/package/smoke-1.12.1.json`, `artifacts/deployment-1.12.1.json` serta `artifacts/heart-host-actions-live/report.json`.

Produksi terverifikasi pada 3 Oktober 2026, 08:34 WIB. Commit runtime `8aa32370cedf19d89e91bd36dace65f38ef2dda2` selesai diterapkan oleh Hostinger dalam 1m33s, build `01a0ff64-6d8b-707d-b0a2-34291244e4e4`. Situs live lulus 231 endpoint/hash serta seluruh 637 pemeriksaan panel aksi dalam tiga browser dan kedua tema, dengan nol error JavaScript game. Pergantian Zoro–Sanji–Zoro tidak melakukan draw atau mengubah stok.

Paket Hostinger memuat 737 berkas, 165457953 byte, SHA-256 `ca8937d71fb2948d99728ad2e340a06f80815aef3a00323c5bf63c7df379d030`. Enam pemeriksaan paket hasil ekstraksi lulus, termasuk hash gambar/narasi, pemutaran media dan alur tercatat pada data uji terisolasi. Tangkapan panel publik tersedia di `artifacts/heart-host-actions-live/actions-sanji-768-dark.png` dan `actions-zoro-768-light.png`.

Harga, stok, antrean, ID kartu, hasil tersimpan dan autentikasi mengikuti rilis sebelumnya. Home One Piece, binder visual, 14 suara hasil dan atraksi footer tetap disertakan. Lima video kartu Gemini aktif; sembilan video generatif masih menunggu kuota, dengan loop ilustrasi yang sudah berjalan sebagai media saat ini. Status media tetap dicatat di `VIDEO-GENERATION-STATUS.md`.
