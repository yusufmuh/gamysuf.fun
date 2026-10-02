# Gamysuf Arcade 1.7.0 · Grand Line Desire

Tanggal: 2 Oktober 2026. Status: kandidat rilis; bukti produksi dicatat setelah publikasi.

Game 5 dibuka dengan trailer, pengenalan Zoro/Sanji, serta syarat belanja booth: Rp100.000 untuk gacha dan Rp150.000 untuk memilih fanservice. Pemain wajib memilih karakter terlebih dahulu. Dek Zoro berwarna hijau dan dek Sanji kuning. Gacha menampilkan tujuh menu, menumpuk dan mengocok kartu bersama Bipy dealer, kemudian menunggu pemain memilih satu kartu tertutup. Mode pilih menampilkan keterangan dan cuplikan setiap momen tanpa mengacak. Setiap hasil memperoleh animasi stempel bulat wajah Bipy berwarna pink; stempel ikut masuk ke ekspor kartu dan poster PNG.

Belanja diverifikasi petugas pada mode tercatat dan diperiksa kembali di server. Demo tidak menggunakan stok atau antrean resmi. Kartu/antrean lama tetap dibaca tanpa mengarang nominal pembelian. Pengulangan permintaan tidak menerbitkan tiket kedua. PIN booth 1234 ditampilkan sesuai permintaan pemilik dan hanya berlaku untuk Game 5; Studio serta game lain tetap memakai ADMIN_PIN.

Musik utama berasal dari berkas pemilik `3 menit.mp4`. Suite berulang 350,140 detik menggabungkan musik Bpedia dan dua dialog pengenalan Jepang: Zoro di detik 159 dan Sanji di detik 330. Dialog dibuat dengan suara sintetis Jepang, bukan rekaman atau tiruan pengisi suara resmi. Musik diperkecil selama dialog dan jingle hasil; pilihan bisu dan tab tersembunyi menjeda seluruh suara. Tidak ditambahkan lagu pembuka One Piece berlisensi dari sumber lain.

Empat belas cuplikan momen adalah berkas MP4 720×900, lima detik, H.264 tanpa audio, dengan badan dan kaki karakter tetap terlihat. Tiga belas memakai gerakan kamera dan motif pada ilustrasi; `zoro-vow` memakai video aksi Gemini yang sudah tersedia. Ini bukan klaim bahwa keempat belas adegan merupakan video aksi karakter baru. Tujuh ilustrasi POV Sanji HD dan dua dealer Bipy berasal dari folder pemilik. Potongan Zoro POV yang kurang lengkap disimpan sebagai arsip; pemain tetap melihat ilustrasi Zoro utuh. Provenance dan hash dicatat di [ASSETS-Heart-Parade.md](ASSETS-Heart-Parade.md) dan manifest aset.

Header menyediakan Demo/Main Tercatat, tema terang pink/gelap, suara, animasi, layar penuh dan Petugas. Antrean dan laporan Game 5 menampilkan karakter/menu, metode, nominal belanja per tiket, serta pemisahan demo. Jumlah nominal tiket bukan pendapatan unik karena satu transaksi dapat memiliki lebih dari satu tiket. Formulir persetujuan sebelum membuka kartu dihapus; petugas tetap mengonfirmasi interaksi dan dokumentasi di booth.

| Pemeriksaan | Hasil saat kandidat dibuat |
|---|---|
| Sumber Game 5 2.2.2 | 47/47 tes engine/server dan pemeriksaan sintaks lulus |
| Integrasi hub 1.7.0 | 75/75 tes lulus, termasuk pemeriksaan nominal serta isolasi PIN Game 5 |
| UI terarah | 21/21 lulus, termasuk gacha, pilih, pemulihan, ekspor dan mode resmi lokal |
| Audio nyata | 29/29 di Chromium, Firefox, WebKit; sembilan hasil demo |
| Media | 14/14 decode video, 42 frame ditinjau, 42/42 pemutaran browser |
| Tur dashboard/lima game | 18 tangkapan layar; tidak ada error konsol |
| Matriks alur responsif | 4.514/4.514 pemeriksaan, 21/21 kasus pada Chromium/Firefox/WebKit, 294 preview video, 63 hasil demo dan 168 screenshot; tidak ada error tak terduga |
| Paket Hostinger | 640 berkas; 149.840.596 byte; ekstraksi dan instalasi terisolasi, seluruh game, aset/range, PIN booth, tiket lokal terverifikasi dan acknowledgement lulus. SHA-256 `68f2febdcbc686c769f21008d4e0dbc749ef77047edb48efe85b6a35678bc11d` |
| Produksi | Diverifikasi setelah publikasi |

WebKit Windows pada lingkungan uji ini tidak menyediakan AudioContext; musik dan jingle native tetap berhasil. Ukuran decode video WebKit dapat berubah ketika compositor meresize tampilan; rasio sumber diperiksa dengan decode terpisah dan badan/kaki diperiksa pada screenshot. Emulasi browser/viewport bukan bukti pengujian semua perangkat fisik.

Matriks lokal 21 kasus memakai sumber 2.2.0. Pemeriksaan produksi menemukan empat video dek masih berjalan di belakang dialog hasil; 2.2.2 menjeda seluruh dek ketika dialog terbuka dan memulihkan hanya preview yang terlihat setelah ditutup. URL script berubah untuk menghindari cache lama. Perbaikan ini diuji terarah di tiga browser, kemudian alur produksi diperiksa kembali. Artefak pengujian berada di `artifacts/heart-ui/`, `artifacts/heart-audio/`, dan `artifacts/heart-journey/`. Bukti rilis sebelumnya tetap berlaku hanya pada versi yang disebutkan di [RELEASE-1.6.1.md](RELEASE-1.6.1.md).

## Bukti publikasi

Ditambahkan setelah verifikasi paket, commit dan produksi selesai.
