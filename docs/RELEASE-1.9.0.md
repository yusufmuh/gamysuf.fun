# Gamysuf Arcade 1.9.0 · Grand Line Desire 2.4.0

3 Oktober 2026. Rilis disiapkan untuk [Game 5](https://gamysuf.fun/g/heart/); verifikasi produksi menyusul setelah deployment.

Belakang kartu memakai kompas pelaut, ombak, tali emas dan Bipy pink. Toolbar menampilkan Bipy varian Zoro/Sanji bergerak, CTA kocok memakai perspektif/tombol timbul, dan mode Gacha/Pilih memiliki warna serta bentuk yang berbeda. Semua kartu tetap dapat diketuk langsung pada mode Pilih Fanservice. Tema terang #E62B5E dan gelap #FF5C8A mengikuti token Bpedia.

Parade diganti video baru Zoro–Sanji bersaing secara lucu untuk Princess Bipy. Tiga video kartu baru sudah ditinjau: Zoro Princess Twirl, Sanji Cinderella's Fit dan Sanji Princess Twirl. Total **lima kartu memakai animasi karakter Gemini**, termasuk dua potongan trailer sebelumnya. **Sembilan lainnya tetap loop ilustrasi pemilik**, karena Gemini kehabisan kuota dan Grok berhenti pada 50% dengan Usage limit reached. Tidak ada hasil Grok yang telah selesai. Master diterima berada di Downloads; file runtime, potongan dan hash tercatat pada manifest. Daftar kartu: [VIDEO-GENERATION-STATUS.md](VIDEO-GENERATION-STATUS.md).

Dek menampilkan [cuplikan resmi Crunchyroll](https://www.youtube.com/watch?v=Llefi8QFN0c) melalui embed YouTube tanpa cookie, dengan suara bisu dan lapisan warna Bpedia. Jeda, dialog, tab tersembunyi serta pilihan kurangi animasi menghentikan pemutar. Video resmi benar-benar diputar saat validasi, bukan hanya menampilkan thumbnail.

Validasi lokal: **47/47 tes sumber**, pemeriksaan sintaks, **561/561 pemeriksaan browser**, **315/315 pemeriksaan perjalanan pelaut**, **42/42 pemutaran video**, **15/15 pemeriksaan panel belanja**, serta 18 tangkapan tur arcade dengan nol error konsol. Browser: Chromium, Firefox dan WebKit pada 390×844, 768×1024, 844×390 dan 1440×900. Ukuran 14 video kartu diperiksa 720×900 SAR 1:1. Ini merupakan emulasi viewport/browser, bukan bukti pengujian semua perangkat fisik.

Pemeriksaan pemutar WebKit awal menemukan izin fullscreen embed tidak lengkap; atribut izin diperbaiki dan 315 pemeriksaan perjalanan terakhir lulus dengan nol error JavaScript. Pemeriksaan flip menunggu keadaan animasi selesai, sehingga hasil tidak bergantung jeda tetap.

Integrasi hub: **75/75 tes lulus**, termasuk aset rilis, pencatatan dan pemisahan PIN. Paket Hostinger **718 berkas, 164.339.113 byte**, lulus lima pemeriksaan ekstraksi, instalasi, boot seluruh game, byte range media, 50 hash galeri dan alur petugas terisolasi. SHA-256 `ca33b8fa0c4b3d9a24bbb1065882e917b93787c9c478de490b629ffb3efe3743`. Berkas: `release/Gamysuf-Arcade-1.9.0-Hostinger.zip`; bukti `artifacts/package/smoke-1.9.0.json`.

Bukti produksi menyusul setelah deployment. Kuota, koleksi, XP, antrean serta direktori data produksi dipertahankan.
