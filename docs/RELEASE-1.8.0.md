# Gamysuf Arcade 1.8.0 · Revisi browser Grand Line Desire

3 Oktober 2026. Hub 1.8.0, sumber Game 5 2.3.0. Status awal: implementasi serta validasi lokal selesai; deployment belum dinyatakan terverifikasi.

Kartu mode Pilih Fanservice langsung dibuka ketika bagian kartu diketuk, dengan satu permintaan hasil. Gacha tetap mengocok tujuh kartu sebelum satu kartu tertutup dipilih. Hasil pemain tanpa kode tiket/antrean, flip 3D dapat dipicu dengan mengetuk kartu atau keyboard, dan poster mengikuti tipografi Wanted/Dead or Alive dari [referensi resmi Toei](https://store.toei-anim.co.jp/shop/g/gMOVONP0916BEV/).

Seluruh kartu dan rincian hasil memakai duo Bipy pink pemilik yang sesuai momen. Trailer Gemini 10 detik baru memakai referensi Bipy resmi; Warm Hug Zoro dan Knight's Vow Sanji menggunakan animasi dari master tersebut. Dua belas video kartu lain merupakan motion graphics ilustrasi pemilik. Master disimpan di Downloads dengan nama `Bpedia-Grand-Line-Desire-Gemini-2026-10-03.mp4`; provenance dan hash pada manifest aset. Ini bukan klaim 14 video Gemini terpisah.

Home memperoleh latar maskot bergerak, gerakan leader dan kutipan baru. Blok musik Home dihapus; suara tetap melalui ikon header. CTA gacha dan input belanja disatukan sebelum dek; tema terang/gelap tetap memakai token Bpedia. Event di hub dan game ditampilkan Marketing 6.0. Portal `/studio` menautkan lima dashboard game tanpa login pemilik; backend autentikasi tetap dijaga.

Validasi: 47/47 tes sumber, 75/75 tes hub, 558/558 pemeriksaan browser pada Chrome/Firefox/WebKit dengan viewport 390×844, 768×1024, 844×390 dan 1440×900, tiga kasus gerak penuh, 15/15 pemeriksaan panel belanja resmi di server terisolasi, 42/42 pemutaran video di tiga browser dengan proporsi yang benar, ukuran 14 sumber video 720×900 SAR 1:1, serta tur lima game/portal dengan nol error konsol. Artefak: `artifacts/heart-browser-revision/`, `artifacts/heart-purchase-layout/`.

Dokumen rilis diperbarui setelah paket dan hash produksi diverifikasi. Kuota, koleksi, XP, antrean resmi dan data produksi tidak direset.
