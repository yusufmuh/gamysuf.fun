# Gamysuf Arcade 1.8.0 · Revisi browser Grand Line Desire

3 Oktober 2026. **Live di [gamysuf.fun](https://gamysuf.fun) dan [Game 5](https://gamysuf.fun/g/heart/)**. Hub 1.8.0, sumber Game 5 2.3.0, stylesheet journey memakai cache `v=2.3.1`. Implementasi `4b73ed70418c340cac993f1a5710a91abe0dc289`, perbaikan frame leader `efcbecf3539a1c97a81e0030b01507963e28e143`. Runtime produksi cocok dengan commit yang dipublikasikan.

Kartu mode Pilih Fanservice langsung dibuka ketika bagian kartu diketuk, dengan satu permintaan hasil. Gacha tetap mengocok tujuh kartu sebelum satu kartu tertutup dipilih. Hasil pemain tanpa kode tiket/antrean, flip 3D dapat dipicu dengan mengetuk kartu atau keyboard, dan poster mengikuti tipografi Wanted/Dead or Alive dari [referensi resmi Toei](https://store.toei-anim.co.jp/shop/g/gMOVONP0916BEV/).

Seluruh kartu dan rincian hasil memakai duo Bipy pink pemilik yang sesuai momen. Trailer Gemini 10 detik baru memakai referensi Bipy resmi; Warm Hug Zoro dan Knight's Vow Sanji menggunakan animasi dari master tersebut. Dua belas video kartu lain merupakan motion graphics ilustrasi pemilik. Master disimpan di Downloads dengan nama `Bpedia-Grand-Line-Desire-Gemini-2026-10-03.mp4`; provenance dan hash pada manifest aset. Ini bukan klaim 14 video Gemini terpisah.

Home memperoleh latar maskot bergerak, gerakan leader dan kutipan baru. Blok musik Home dihapus; suara tetap melalui ikon header. CTA gacha dan input belanja disatukan sebelum dek; tema terang/gelap tetap memakai token Bpedia. Event di hub dan game ditampilkan Marketing 6.0. Portal `/studio` menautkan lima dashboard game tanpa login pemilik; backend autentikasi tetap dijaga.

Validasi lokal: 47/47 tes sumber, 75/75 tes hub, 558/558 pemeriksaan browser, 15/15 pemeriksaan panel belanja resmi di server terisolasi, 42/42 pemutaran video di tiga browser, ukuran 14 sumber video 720×900 SAR 1:1, serta tur lima game/portal dengan nol error konsol. Artefak: `artifacts/heart-browser-revision/`, `artifacts/heart-purchase-layout/`, `artifacts/heart-bipy-media/`.

Validasi produksi akhir: **561/561 pemeriksaan browser**, 12 kasus Chrome/Firefox/WebKit pada 390×844, 768×1024, 844×390 dan 1440×900, serta tiga kasus gerak penuh. Ketuk seluruh kartu, satu permintaan hasil, gacha tujuh kartu, flip sentuh/keyboard, ekspor poster, dua tema, galeri 50 aset, portal lima dashboard dan event Marketing 6.0 lulus tanpa error JavaScript. Pemeriksaan tambahan memastikan leader bergerak di dalam frame gambar. Screenshot desktop dan PNG poster hasil unduhan ditinjau secara visual.

**42/42 pemutaran video live** lulus di tiga browser. WebKit Windows dapat melaporkan dimensi compositor yang berubah; berkas sumber diperiksa terpisah dan rasio tampilan wajib tepat dalam toleransi satu piksel. Percobaan awal pemutaran live menunggu terlalu singkat; pemeriksaan akhir menunggu waktu pemutaran benar-benar maju. Ini merupakan emulasi browser/viewport, bukan pengujian semua perangkat fisik.

**206/206 endpoint publik, kode dan aset produksi** cocok dengan byte commit setelah penulisan ulang gateway; gambar CDN memakai bukti decode yang terikat pada hash bila diperlukan. CSS journey `v=2.3.1` terverifikasi. Pengujian produksi hanya memakai demo pribadi, tanpa autentikasi atau penerbitan tiket booth resmi. Kuota, koleksi lama, XP lama, antrean resmi dan data produksi tidak direset.

Paket akhir: `release/Gamysuf-Arcade-1.8.0-Hostinger.zip`, **712 berkas, 158.650.774 byte**, lulus lima pemeriksaan ekstraksi/instalasi/game/media/PIN/pencatatan pada server terisolasi. SHA-256 `4927c93edfaad0490ac501fb2e0e0a2dcd454387826045440361baff53afde55`.

Bukti akhir: `artifacts/deployment-1.8.0.json`, `artifacts/heart-browser-revision-live/report.json`, `artifacts/heart-bipy-media-live/report.json`, dan `artifacts/package/smoke-1.8.0.json`. Tab game pengguna sudah dimuat ulang dalam tema terang.
