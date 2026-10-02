# Aset Bipy Heart Parade

Tanggal: 2 Oktober 2026 · Heart Parade 2.0.0 / Gamysuf Arcade 1.6.0. Aset runtime ada di `assets/` (disalin ke `games/heart/assets` oleh `npm run sync`); arsip master PNG/audio/video ada di folder sumber `05 bipy-heart-parade/docs/art-originals`, yang tidak ikut disalin ke hub.

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
| `docs/art-originals/audio/bpedia-jingle-2026-10-02.mpeg` | Voice note WhatsApp pemilik, 2 Oktober 2026. Disimpan utuh sebagai arsip asli, tidak disajikan ke pemain. | MP3 192 kbps, 44,1 kHz stereo, 32,00 detik | 768.050 | `e63b442774323f099232cb0eea54d8da06783b7d27b4ef1fa8f5ff7823cac5b5` |
| `assets/audio/bpedia-jingle.mp3` | Jingle penuh dari voice note di atas, dienkode ulang untuk runtime. | MP3 128 kbps, 44,1 kHz stereo, ±32,0 detik | 512.878 | `3fdbf36536fc36aea0d9838f6e338c696b7e47d3b5277a6ca03eb4a58e398674` |
| `assets/audio/bpedia-jingle-hook.mp3` | Potongan 6,8 detik pertama jingle (hook). | MP3 128 kbps, 44,1 kHz stereo, ±6,8 detik | 109.966 | `a8dcac2770bff10d6281343a735c1845123b33468a96c6e7481da87b7ec41117` |
| `assets/audio/heart-parade-bgm.mp3` | Audio asli trailer Gemini, diolah menjadi loop 28 detik dengan dua crossfade satu detik. | MP3 128 kbps, 48 kHz stereo, ±28,1 detik | 449.427 | `168196f778557aa4a32af1043867148b428adb983e7e028c080d8c3e131b2a66` |
| `assets/audio/garden-bgm.mp3` | BGM `bpedia-bgm.wav` Beauty Drop, dikompresi MP3 112 kbps. Bukan komposisi baru. Saat dokumen ini ditulis tidak dirujuk oleh `js/audio.js` (BGM aktif: `heart-parade-bgm.mp3`). | MP3 | 672.957 | `e7dd2c9484f1efdc0894762a66fd5037cae681e0d590d0a3223d4af508e44645` |
| `docs/art-originals/gemini/heart-parade-promo-master.mp4` | Master trailer Gemini dari dua scene kartu, akun Google pemilik. Arsip, tidak disajikan. | H.264 1280×720 + AAC 48 kHz, 10,005 detik | 5.571.616 | `50cec86a97016c292edb942bd81db1d9be476e9c2bd064207fadad8841652356` |
| `assets/video/heart-parade-promo.mp4` | Trailer runtime, dioptimalkan dari master. | H.264 1280×720 24 fps + AAC, 10,01 detik | 2.483.844 | `52f474f2b7c35c7ae26ced3fe9b2b56ced3d468168753d02ca83872073f8c5d8` |

Jingle tidak diklaim sebagai komposisi baru dari tim pengembang; asalnya adalah rekaman yang dikirim pemilik. Prompt trailer Gemini tercatat di `IMAGEGEN-PROMPTS-Heart-Parade.md`. Pemutaran audio menunggu interaksi pengguna dan mengikuti tombol bisu.

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

Status verifikasi aset di browser (pemuatan audio jingle, trailer, dan ilustrasi di matriks viewport): belum diverifikasi.
