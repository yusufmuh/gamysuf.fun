# Gamysuf Arcade 1.6.1

Satu dashboard interaktif untuk lima game booth Bpedia, berjalan di cloud (Hostinger Node.js):

| Game | Alamat | Event |
|---|---|---|
| Spin Wheels (roda + Mystery Beauty Box) | `/g/spin/` | Pesta Folka 2026 |
| Nyapit Bareng Bpedia (mesin capit) | `/g/nyapit/` | Cozzone UP 2026 |
| Bipy Beauty Drop (papan pin + kapsul mekar) | `/g/drop/` | TAKEOVER X 2026 |
| Game 4 · Bipy Gacha Pop (gacha satu tap, 20 hadiah / 497 kapsul awal) | `/g/gacha/` | Market-In 6.0 · 3–4 Okt 2026 |
| Game 5 · Bipy Grand Line Desire (14 kartu BP06, 7 menu × Zoro/Sanji) | `/g/heart/` | Market-In 6.0 · 3–4 Okt 2026 |
| Slot game tambahan (ZIP HTML5 atau tautan) | `/play/<slug>/` | diatur di Studio |

Halaman acara `/market-in` mengelompokkan Game 4 dan Game 5 di satu booth Bpedia di Urban Forest Cipete pada 3–4 Oktober 2026. Zoro dan Sanji dijadwalkan hadir kedua hari; jam sesi diumumkan petugas. Masing-masing game tetap memiliki rute, mekanik, stok atau antrean, serta dashboard petugas sendiri.

Gacha Pop memigrasikan katalog lama ke 20 hadiah/497 kapsul awal dengan memperhitungkan hadiah resmi yang sudah keluar dan mempertahankan pengaturan, foto, riwayat, hadiah tambahan, serta hasil tertunda. Tiga voucher belanja memiliki ketentuan sendiri. Grand Line Desire menyediakan Gacha Booster atau Pilih Kartu (jika diizinkan petugas), artwork dan varian Bipy per momen, trailer Gemini di pembuka, BGM dari audio trailer, serta jingle Bpedia. Poster bounty mencoret harga normal FS referensi dan menampilkan **GRATIS untuk pelanggan Bpedia**; harga bawaan perlu dikonfirmasi tim booth. Kartu terbuka langsung dengan tanpa sentuhan, tanpa dokumentasi, dan persetujuan tersimpan false. Petugas memastikan persetujuan langsung sebelum interaksi atau dokumentasi di booth. Tombol Demo/Main Tercatat memakai autentikasi petugas; tema Gelap/Terang tersedia di header.

Fitur pemain: profil & avatar Bipy, XP & level, streak harian, 3 misi harian, 11 lencana, album 91 kartu, papan peringkat mingguan/sepanjang masa, kode pemulihan profil, panduan & FAQ. Online memakai demo pribadi; klaim hadiah atau fanservice dilakukan pada sesi booth resmi.
Studio pemilik (`/studio`): statistik, tautan dashboard tiap game, pengumuman, game unggulan, sembunyikan game, kelola game tambahan.

## Menjalankan

```bash
npm install
npm run dev                 # http://127.0.0.1:4400 · PIN lokal 123456
npm test                    # tes gateway, pemain, Studio, keamanan ZIP
npm run sync                # salin ulang game dari folder 01/02/03/04/05
npm run qa                  # tur visual Electron → artifacts/qa
npm run qa:responsive       # Chromium, Firefox, WebKit; viewport 320–1920 px dan gameplay
node scripts/capture-gameplay-covers.cjs # sampul gameplay → artifacts/cover-candidates
npm run package:hostinger   # release/Gamysuf-Arcade-<versi>-Hostinger.zip
```

Produksi: `npm start` (entry `hub/server.cjs`), env `ADMIN_PIN` (6–12 digit, wajib), `NODE_ENV=production`, opsional `ALLOWED_HOSTS`, `GAMYSUF_DATA_DIR`.

Dokumen lengkap & status serah-terima: [docs/PRD-Gamysuf-Arcade.md](docs/PRD-Gamysuf-Arcade.md).

Status 2 Oktober 2026: **v1.6.1 sudah live di [gamysuf.fun](https://gamysuf.fun)** dan [Game 5](https://gamysuf.fun/g/heart/). Game 5 lulus 40/40 tes + pemeriksaan sintaks, hub 67/67, UI terarah 21/21, matriks Game 5 Chromium/Firefox/WebKit 4.140/4.140, dan animasi penuh seluruh 14 kartu. Paket Hostinger berisi 601 berkas dan lulus smoke test terisolasi. Produksi lulus 93/93 pemeriksaan berkas/aset, 106/106 tampilan, dan 107/107 gameplay demo, tanpa error browser/jaringan yang belum terverifikasi. Bukti versi lama tetap disimpan sebagai riwayat; rincian rilis ini ada di [docs/RELEASE-1.6.1.md](docs/RELEASE-1.6.1.md).
