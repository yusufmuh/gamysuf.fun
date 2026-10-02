# Gamysuf Arcade 1.6.0 — Market-In 6.0

Status pada 2 Oktober 2026: kandidat rilis lokal siap dipublikasikan. Versi 1.6.0 belum dikonfirmasi melalui pemeriksaan produksi. Dokumen ini menggantikan catatan persiapan 1.5.1.

## Perubahan

Arcade memuat lima game: Spin Wheels `/g/spin/`, Nyapit Bareng Bpedia `/g/nyapit/`, Bipy Beauty Drop `/g/drop/`, Game 4 Bipy Gacha Pop `/g/gacha/`, dan Game 5 Bipy Heart Parade `/g/heart/`. Halaman `/market-in` mengelompokkan Game 4 dan Game 5 sebagai dua pengalaman di booth Bpedia yang sama. Rute, mekanik, data stok/antrean, dan dashboard keduanya tetap terpisah.

Market-In 6.0 berlangsung di Urban Forest Cipete, Jakarta, pada **3–4 Oktober 2026**. Zoro dan Sanji dijadwalkan hadir kedua hari; jam sesi diumumkan petugas booth. Jadwal tersebut bersumber dari arahan acara dan pemilik, bukan catatan hasil kehadiran aktual.

**Game 4:** katalog versi 2 memuat 20 hadiah dengan 497 kapsul awal, termasuk voucher belanja 25%, 50%, dan Rp100.000. Alur satu tap tetap dipakai. Migrasi data lama menghitung stok tersisa setelah hadiah resmi di riwayat, mempertahankan foto/verifikasi, status aktif, pengaturan, hadiah tambahan, riwayat, dan pending. Voucher yang sudah ada tidak menimpa pengaturan petugas. Migrasi idempoten, menyimpan data lama sebagai cadangan, dan menolak versi asing tanpa reset. Restore mempertahankan pengamanan demo + jeda. Stok katalog awal bukan hasil hitung fisik booth.

**Game 5:** Heart Parade 2.0.0 menyediakan 14 kartu BP06-001–014, yaitu tujuh menu × Zoro/Sanji: Cinderella's Fit, Princess Twirl, Blossom Whisper, Sweet Offering, Knight's Vow, Warm Hug, dan Pat on Head. Pemain memilih Gacha Booster atau Pilih Kartu bila dibuka petugas. Kartu memuat nomor, rarity, cost/power/counter, atribut/kru, efek, dan poster bounty; ID koleksi lama dipertahankan. Artwork dan motif animasi berbeda per momen, dengan tujuh varian Bipy per menu serta Bipy Original/Jade/Golden Chef.

Poster bounty mencoret **harga normal FS referensi dalam Rupiah** dan menampilkan **GRATIS untuk pelanggan Bpedia**. Harga bawaan perlu dikonfirmasi tim booth; petugas dapat mengubahnya, dan kartu yang sudah terbit mempertahankan snapshot harga. Nilai BERRY fiktif rilis 1.5.x telah dihapus. Game tidak memproses pembayaran.

Trailer Gemini memakai dua scene kartu, dengan audio trailer diolah menjadi loop BGM. Jingle Bpedia berasal dari rekaman pemilik. Musik mengikuti interaksi browser dan pilihan bisu. Tanpa sentuhan menjadi default; persetujuan interaksi wajib dan izin dokumentasi terpisah. Tamu serta cosplayer dapat berhenti atau beralih ke alternatif tanpa sentuhan. Kartu demo online tidak berlaku untuk klaim sesi booth.

Album seluruh arcade menjadi 91 kartu (16 Spin + 18 Nyapit + 23 Drop + 20 Gacha Pop + 14 Heart Parade). Pembaruan artwork Heart Parade mempertahankan kepemilikan kartu dan XP. Sumber game berada di folder saudara 01–05; `games/` adalah hasil sinkronisasi.

## Bukti lokal yang selesai

| Pemeriksaan | Hasil |
|---|---|
| Sumber Game 4 setelah sinkronisasi final: engine/server, katalog dan migrasi | 30/30 tes + `npm run check` lulus |
| QA Game 4 setelah sinkronisasi final | 336/336 pemeriksaan lulus |
| Sumber Game 5: engine/server Heart Parade 2.0.0 | 37/37 tes + check lulus |
| Hub setelah sinkronisasi | 64/64 tes lulus |
| Market-In: QA terarah | 110/110 pemeriksaan lulus |
| Nyapit sumber | 18 pemeriksaan browser + 54 tes lulus |
| Nyapit melalui hub: QA terarah | 124/124 pemeriksaan lulus |
| Heart Parade ponsel: QA terarah pada putaran sebelumnya | 85/85 pemeriksaan lulus |
| Heart Parade UI setelah sinkronisasi final | 18/18 pemeriksaan UI dan tata letak lulus; ekspor kartu 1080×1508 dan poster 1080×1528 |
| Suite tambahan sebelumnya | 866/866 pemeriksaan lulus |
| Matriks responsif final | 2.331/2.331 pemeriksaan Chromium, Firefox, dan WebKit lulus |
| Paket Hostinger | 600 berkas; 134.124.400 byte; isi bersih dan smoke test terisolasi lulus untuk hub, Market-In, Game 4, Game 5, API, video, audio, MIME, dan byte range; SHA-256 `cd0125d4bf5fa92f79b0b01124fbaf11ee15c7819dcafe1210e0dfba3ca52047` |

Hasil ini berasal dari lingkungan pengembangan. Matriks memakai browser dan viewport emulasi; perangkat fisik tetap dapat memiliki perilaku vendor yang berbeda.

## Gerbang rilis

Target responsif meliputi ponsel 280–430 px potret/lanskap, foldable 280×653 / 344×882 / 717×512 / 884×1104, tablet 768–1366, laptop 1280–1440, desktop 1920, serta Chromium/Firefox/WebKit dan dua tema. Seluruh alur penting harus tetap terlihat di atas game bar, tanpa overflow horizontal; kontrol sentuh dashboard minimal 44 px. Periksa keyboard/fokus, reduced motion, audio, aset, kartu hasil, pemulihan koneksi, mode demo/booth, serta antrean petugas.

Sebelum rilis dinyatakan selesai, periksa build/versi/commit produksi, endpoint, hash kode/aset, dan UI live. Catat bukti di `artifacts/deployment-1.6.0.json` serta laporan UI live versi ini. Data persisten di luar direktori build harus dipertahankan. Dokumen teknis dan status lanjutan: [PRD-Gamysuf-Arcade.md](PRD-Gamysuf-Arcade.md).
