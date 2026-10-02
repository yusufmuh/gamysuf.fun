# Gamysuf Arcade 1.6.0

Satu dashboard interaktif untuk lima game booth Bpedia, berjalan di cloud (Hostinger Node.js):

| Game | Alamat | Event |
|---|---|---|
| Spin Wheels (roda + Mystery Beauty Box) | `/g/spin/` | Pesta Folka 2026 |
| Nyapit Bareng Bpedia (mesin capit) | `/g/nyapit/` | Cozzone UP 2026 |
| Bipy Beauty Drop (papan pin + kapsul mekar) | `/g/drop/` | TAKEOVER X 2026 |
| Game 4 · Bipy Gacha Pop (gacha satu tap, 20 hadiah / 497 kapsul awal) | `/g/gacha/` | Market-In 6.0 · 3–4 Okt 2026 |
| Game 5 · Bipy Heart Parade (14 kartu BP06, 7 menu × Zoro/Sanji) | `/g/heart/` | Market-In 6.0 · 3–4 Okt 2026 |
| Slot game tambahan (ZIP HTML5 atau tautan) | `/play/<slug>/` | diatur di Studio |

Halaman acara `/market-in` mengelompokkan Game 4 dan Game 5 di satu booth Bpedia di Urban Forest Cipete pada 3–4 Oktober 2026. Zoro dan Sanji dijadwalkan hadir kedua hari; jam sesi diumumkan petugas. Masing-masing game tetap memiliki rute, mekanik, stok atau antrean, serta dashboard petugas sendiri.

Gacha Pop memigrasikan katalog lama ke 20 hadiah/497 kapsul awal dengan memperhitungkan hadiah resmi yang sudah keluar dan mempertahankan pengaturan, foto, riwayat, hadiah tambahan, serta hasil tertunda. Tiga voucher belanja memiliki ketentuan sendiri. Heart Parade menyediakan Gacha Booster atau Pilih Kartu (jika diizinkan petugas), artwork dan varian Bipy per momen, trailer Gemini, BGM dari audio trailer, serta jingle Bpedia. Poster bounty mencoret harga normal FS referensi dan menampilkan **GRATIS untuk pelanggan Bpedia**; harga bawaan perlu dikonfirmasi tim booth. Pilihan tanpa sentuhan adalah default, persetujuan interaksi wajib, dan izin dokumentasi terpisah.

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

Status 2 Oktober 2026: **v1.6.0 sudah live di [gamysuf.fun](https://gamysuf.fun)**. Game 4 lulus 30/30 tes, `npm run check`, dan 336/336 pemeriksaan QA; Heart Parade lulus 18/18 pemeriksaan UI dan tata letak, dengan ekspor kartu 1080×1508 dan poster 1080×1528. Sumber Game 5 lulus 37/37 + check, hub 64/64, matriks Chromium/Firefox/WebKit 2.331/2.331, Market-In 110/110, Nyapit melalui hub 124/124, dan suite tambahan 866/866. Verifikasi produksi lulus 89/89 endpoint/hash/aset dan tur UI live lulus 50/50 tanpa error konsol, HTTP, atau jaringan yang belum terverifikasi. Paket Hostinger 1.6.0 berisi 600 berkas dan lulus smoke test terisolasi; SHA-256 `cd0125d4bf5fa92f79b0b01124fbaf11ee15c7819dcafe1210e0dfba3ca52047`. Rincian cakupan dan batas bukti: [docs/RELEASE-1.6.0.md](docs/RELEASE-1.6.0.md).
