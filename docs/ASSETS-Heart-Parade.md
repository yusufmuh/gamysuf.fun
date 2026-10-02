# Aset Bipy Grand Line Desire

Tanggal: 2 Oktober 2026 · Grand Line Desire 2.2.0 / Gamysuf Arcade 1.7.0. Rilis ini menambah perjalanan kartu, video momen, dealer Bipy, POV Sanji, cap Bipy, dan rangkaian musik dengan narasi Jepang. Aset runtime ada di `assets/` (disalin ke `games/heart/assets` oleh `npm run sync`); arsip master PNG/audio/video ada di folder sumber `05 bipy-heart-parade/docs/art-originals`, yang tidak ikut disalin ke hub. Musik utama baru berasal dari master pemilik di `H:/My Drive/Bpedia/02_Brand Guidline/10_music/3 menit.mp4`.

| Aset | Asal dan perlakuan |
|---|---|
| Zoro, full body | Gambar baru melalui imagegen. Brief: ilustrasi pria dewasa, rambut hijau, ciri luka mata, pakaian hijau gelap elegan, tiga pedang tersarung, pose mengundang, kepala sampai sepatu terlihat, transparan. Tidak memakai foto cosplayer. |
| Sanji, full body | Gambar baru melalui imagegen. Brief: pria dewasa pirang, setelan hitam detail emas, mawar dan hidangan penutup, ekspresi hangat, full body transparan. |
| Bipy Jade | Edit imagegen dari master Bipy resmi: hood tulip hijau, luka kartun, pedang properti; wajah/proporsi Bipy dipertahankan. |
| Bipy Golden Chef | Edit imagegen dari master Bipy: hood tulip kuning, setelan hitam dan apron, wajan pancake serta spatula. |
| Bipy pink | Master `H:/My Drive/Bpedia/02_Brand Guidline/02_Bipy/bipy-full-berdiri.png`, hanya dikonversi WebP. |
| Wordmark Bpedia | Master pink/putih brand yang sudah ada, tidak digambar ulang. |
| Poppins/Fraunces | Berkas font yang sudah ada di proyek Bpedia; dibundel lokal. Status lisensi untuk distribusi store perlu dicek. |
| Ilustrasi momen (14) | `assets/moments/<host>-<menu>.webp`, satu per kartu, total 3.571.138 byte. Master PNG di `docs/art-originals/moments/`. |
| Varian Bipy (7) | `assets/bipy-variants/bipy-<menu>.webp`, dipakai bersama oleh dua host untuk menu yang sama, total 596.102 byte. Master PNG di `docs/art-originals/bipy-variants/`. |
| SFX | Nada pendek yang disintesis Web Audio (select/draw/reveal). |
| Ikon | SVG lokal untuk menu, kapsul hati, unduhan, dan audio. |

PNG imagegen disimpan utuh; `scripts/optimize-art.py` membuat WebP transparan untuk runtime tanpa mengubah dimensi. Prompt di tabel adalah ringkasan brief, bukan transkrip verbatim; brief lengkap di `IMAGEGEN-PROMPTS-Heart-Parade.md`.

Konsep karakter merujuk One Piece. Dokumen ini tidak menyatakan aset sebagai kolaborasi resmi atau bukti izin komersial. Sebelum paket Steam/marketplace: verifikasi hak karakter, font, audio, dan materi brand, siapkan dokumen lisensi, rating konten, dan uji hardware.

## Audio dan video

Ukuran dalam byte; hash SHA-256 dihitung dari berkas di folder sumber pada 2 Oktober 2026.

| Berkas | Asal dan perlakuan | Format | Byte | SHA-256 |
|---|---|---|---:|---|
| `H:/My Drive/Bpedia/02_Brand Guidline/10_music/3 menit.mp4` | Master musik utama dari pemilik; identik dengan kiriman WhatsApp `16.47.15.mp4`. Berkas sumber dipertahankan, tidak disajikan sebagai audio runtime. | MP4 berisi AAC, 44,1 kHz stereo, 180,070748 detik | 5.795.800 | `deab2da6f472bb91558d22c57251bd4d1cb23905ced8cd25504de7a4ad6d03ae` |
| `assets/audio/bpedia-main-bgm.mp3` | Basis musik Bpedia; rangkaian aktif 2.2.0 tercatat di bawah, diturunkan dari master pemilik di atas. `loudnorm I=-18:TP=-1.5:LRA=11`, fade masuk 0,2 detik dan fade keluar 0,65 detik. | MP3 128 kbps, 44,1 kHz stereo, 180,070748 detik | 2.882.416 | `473c767a8df149d5ae04b9a52a92ea87e8bf43bca712144f3b7b1acd0142642e` |
| `docs/art-originals/audio/bpedia-jingle-2026-10-02.mpeg` | Voice note WhatsApp pemilik, 2 Oktober 2026; sumber cocok dengan kiriman `17.35.07.mpeg`. Disimpan utuh sebagai arsip asli, tidak disajikan ke pemain. | MP3 192 kbps, 44,1 kHz stereo, 32,00 detik | 768.050 | `e63b442774323f099232cb0eea54d8da06783b7d27b4ef1fa8f5ff7823cac5b5` |
| `assets/audio/bpedia-jingle.mp3` | Jingle penuh dari voice note di atas, dienkode ulang untuk runtime. | MP3 128 kbps, 44,1 kHz stereo, ±32,0 detik | 512.878 | `3fdbf36536fc36aea0d9838f6e338c696b7e47d3b5277a6ca03eb4a58e398674` |
| `assets/audio/bpedia-jingle-hook.mp3` | Potongan 6,8 detik pertama jingle (hook). | MP3 128 kbps, 44,1 kHz stereo, ±6,8 detik | 109.966 | `a8dcac2770bff10d6281343a735c1845123b33468a96c6e7481da87b7ec41117` |
| `assets/audio/heart-parade-bgm.mp3` | Legacy, tidak aktif. Audio asli trailer Gemini, diolah menjadi loop 28 detik dengan dua crossfade satu detik; digantikan oleh `bpedia-main-bgm.mp3`. | MP3 128 kbps, 48 kHz stereo, ±28,1 detik | 449.427 | `168196f778557aa4a32af1043867148b428adb983e7e028c080d8c3e131b2a66` |
| `assets/audio/garden-bgm.mp3` | Legacy, tidak aktif. BGM `bpedia-bgm.wav` Beauty Drop, dikompresi MP3 112 kbps. Bukan komposisi baru dan tidak dirujuk oleh `js/audio.js`. | MP3 | 672.957 | `e7dd2c9484f1efdc0894762a66fd5037cae681e0d590d0a3223d4af508e44645` |
| `docs/art-originals/gemini/heart-parade-promo-master.mp4` | Master trailer Gemini dari dua scene kartu, akun Google pemilik. Arsip, tidak disajikan. | H.264 1280×720 + AAC 48 kHz, 10,005 detik | 5.571.616 | `50cec86a97016c292edb942bd81db1d9be476e9c2bd064207fadad8841652356` |
| `assets/video/heart-parade-promo.mp4` | Trailer runtime, dioptimalkan dari master. | H.264 1280×720 24 fps + AAC, 10,01 detik | 2.483.844 | `52f474f2b7c35c7ae26ced3fe9b2b56ced3d468168753d02ca83872073f8c5d8` |
| `assets/video/grand-line-promo-poster.webp` | Frame lanskap dari trailer runtime pada 9,5 detik, menjaga komposisi Zoro, Sanji, dan Bipy pada layar pembuka. | WebP 960×540 | 32.102 | `bad8b8bc02ee30246ce95700d80a0b9570c631eda2755d67b72df7c842ff18ce` |

Musik utama dan jingle berasal dari berkas yang dikirim pemilik; tidak diklaim sebagai komposisi baru dari tim pengembang. Jingle penuh dan hook tetap memakai aset sebelumnya. Prompt trailer Gemini tercatat di `IMAGEGEN-PROMPTS-Heart-Parade.md`. Pemutaran audio menunggu interaksi pengguna dan mengikuti tombol bisu. Saat dibisukan atau tab tersembunyi, runtime menjeda musik/hook dan menghentikan SFX yang masih berjalan maupun tertunda. Volume BGM yang diturunkan untuk hook dipulihkan bila hook gagal atau dibatalkan.

## Katalog kartu BP06

Katalog server menyimpan 14 kartu kanonis di `core/catalog.cjs`. ID tetap `zoro-cinderella` hingga `sanji-pat`, sehingga kepemilikan album `heart:<id>` tetap kompatibel. Seluruh 14 berkas ilustrasi momen memiliki hash SHA-256 berbeda (diuji di `tests/engine.test.cjs`).

| Menu / ID layanan | Zoro | Sanji | Rarity | Varian Bipy | Motif animasi | Harga normal FS bawaan |
|---|---|---|---|---|---|---:|
| Cinderella's Fit / `cinderella` | BP06-001 | BP06-008 | SR | `bipy-cinderella.webp` | `shoe-sparkles` | Rp 65.000 |
| Princess Twirl / `twirl` | BP06-002 | BP06-009 | R | `bipy-twirl.webp` | `petal-waltz` | Rp 50.000 |
| Blossom Whisper / `whisper` | BP06-003 | BP06-010 | R | `bipy-whisper.webp` | `blossom-breeze` | Rp 45.000 |
| Sweet Offering / `offering` | BP06-004 | BP06-011 | R | `bipy-offering.webp` | `rose-delivery` | Rp 40.000 |
| Knight's Vow / `vow` | BP06-005 | BP06-012 | SEC | `bipy-vow.webp` | `knight-glimmer` | Rp 75.000 |
| Warm Hug / `hug` | BP06-006 | BP06-013 | SR | `bipy-hug.webp` | `heart-embrace` | Rp 55.000 |
| Pat on Head / `pat` | BP06-007 | BP06-014 | SR | `bipy-pat.webp` | `gentle-stars` | Rp 35.000 |

Harga normal FS adalah nilai bawaan yang perlu dikonfirmasi tim booth dan dapat diubah petugas (Rp 0–10.000.000). Poster bounty mencoret harga tersebut dan menampilkan **GRATIS untuk pelanggan Bpedia**. Nilai fiktif BERRY dari rilis 1.5.x tidak lagi dipakai. Statistik cost/power/counter per kartu tercantum di PRD bagian 4.2.

**Bukti historis lokal 2.1.0 / hub 1.6.1, 2 Oktober 2026:** 14 ilustrasi berhasil didekode, trailer dan kontrol pemutaran lulus, ekspor kartu 1080×1508 serta poster 1080×1528 mempertahankan ilustrasi, proporsi, Bipy, logo, dan harga. UI terarah lulus 21/21. Matriks responsif Game 5 lulus 4.140/4.140 pada Chromium, Firefox, dan WebKit dengan 12 ukuran layar. Ini bukti browser/viewport emulasi; matriks tersebut belum dijalankan ulang untuk musik baru 2.1.1.

**Bukti historis produksi 1.6.1** pada `https://gamysuf.fun`: 93/93 pemeriksaan endpoint/hash/aset lulus, mencakup 14 artwork unik, varian Bipy, video, poster pembuka baru, dan kode renderer/ekspor. UI live 106/106 dan gameplay demo 107/107 lulus; unduhan poster nyata 1080×1528 terverifikasi. Bukti rinci berada pada `docs/RELEASE-1.6.1.md` dan folder `artifacts` hub; hasil ini tidak dianggap sebagai QA audio baru.

## Tambahan 2.2.0

Pemetaan PNG pemilik ke tujuh POV Sanji dan dua dealer terdapat pada assets/pov/manifest.json, beserta dimensi dan hash. Tujuh Zoro POV merupakan potongan kolase rendah resolusi dan diarsipkan, tidak dipakai runtime UI. Ilustrasi Zoro yang utuh menjadi fallback. Sumber asli tidak ditimpa.

Empat belas cuplikan tercatat di `assets/video/moments/manifest.json`: 13 animasi ilustrasi dan satu video aksi Zoro Knight's Vow yang dipangkas dari master Gemini yang sesuai. Semua memakai H.264/yuv420p, 720×900, 24 fps, lima detik, tanpa audio, dan faststart; total 4.340.172 byte. Decode penuh 14/14 dan pemutaran browser 42/42 lulus. WebKit dapat melaporkan dimensi hasil resize compositor setelah playback; rasio sumber diperiksa lewat decode terpisah dan screenshot memperlihatkan badan serta kaki utuh.

Audio aktif beserta hash ada pada assets/audio/manifest.json. Rangkaian Bpedia memakai dua narasi Jepang orisinal, bukan suara aktor/voice clone. Sumber sintesis: https://github.com/rany2/edge-tts. Master musik/jingle pemilik tetap utuh.

| Audio | Detik | Byte | SHA-256 |
|---|---:|---:|---|
| `assets/audio/bpedia-main-bgm.mp3` | 180.071 | 2882416 | `473c767a8df149d5ae04b9a52a92ea87e8bf43bca712144f3b7b1acd0142642e` |
| `assets/audio/bpedia-home-suite.mp3` | 350.140 | 5603330 | `1bfeba19dd65cea446e5abf90bc16317a0a0bbedf173e92d85a34e87c576da5d` |
| `assets/audio/zoro-welcome-ja.mp3` | 17.544 | 105264 | `68d6ff1816b6759745e24899aba2e79f19f0e8768591c272adcc059311e880b5` |
| `assets/audio/sanji-welcome-ja.mp3` | 16.944 | 101664 | `af4f2d61e91a70a98b4ebf548bc3abc2099db1021af48ddd0c935968e68aba3b` |
| `assets/audio/bpedia-jingle-hook.mp3` | 6.800 | 109966 | `a8dcac2770bff10d6281343a735c1845123b33468a96c6e7481da87b7ec41117` |

QA audio lokal: 10 pemeriksaan Chromium, 10 Firefox dan 9 WebKit; seluruhnya lulus. UI terarah 21/21 dan matriks perjalanan 4.514/4.514 lulus pada 21 kombinasi browser/viewport. Status rilis dan bukti produksi dicatat pada [RELEASE-1.7.0.md](RELEASE-1.7.0.md) di hub.

## Tambahan gambar pemilik · 2.2.1

Seluruh 50 PNG dari `Bipy varian zoro sanji`, `zoro fanservice`, dan `sanji fanservice` dipakai. Galeri memuat 40 adegan duo dan 10 pose Bipy (25 gambar per karakter), pratinjau tujuh menu per karakter memakai adegan yang cocok, dan dealer berganti pose mengikuti tahap atraksi. WebP mempertahankan alpha serta badan/kaki utuh; semua PNG asli tetap utuh. Total WebP tambahan 4.444.776 byte. Manifest `assets/stickers/manifest.json` mencatat 50 nama sumber, dimensi, hash sumber, hash hasil, karakter, judul dan peran. Helper sumber: `docs/prepare-sticker-assets.py`.

Token brand pada `assets/brand/bpedia-tokens.css` disalin dari guideline pemilik: pink terang #E62B5E, pink gelap #FF5C8A, latar terang #FFF7F8 dan Berry Night #2A0A18.

## Runtime 2.3.0 · konsistensi Bipy dan Gemini baru

`CARDS.image` sekarang memakai 14 `/assets/stickers/<host>-<service>.webp` yang sesuai momen. Artwork adult lama tetap menjadi arsip/POV, tidak menjadi ilustrasi utama kartu baru. Video aktif: `zoro-hug-gemini.mp4`, `sanji-vow-gemini.mp4`, dan 12 `<host>-<service>-bipy.mp4`. Manifest motion graphics menyimpan 14 loop dasar; dua di antaranya digantikan video Gemini pada runtime. `docs/animate-bipy-scenes.py` mereproduksi loop dasar tanpa mengubah PNG asli.

Trailer `heart-parade-bipy-promo.mp4` dibuat baru pada 3 Oktober 2026 dari referensi Bipy resmi; hasil lama yang mengganti Bipy menjadi manusia tidak dipakai. File master Downloads, hash, referensi dan waktu pemotongan ada dalam `assets/video/gemini-bipy-manifest.json`. Ketiga video Gemini tanpa audio; musik game tetap dikontrol melalui ikon suara.
