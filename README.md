# Gamysuf Arcade 1.8.0

Satu dashboard interaktif untuk lima game booth Bpedia, berjalan di cloud (Hostinger Node.js):

| Game | Alamat | Event |
|---|---|---|
| Spin Wheels (roda + Mystery Beauty Box) | `/g/spin/` | Pesta Folka 2026 |
| Nyapit Bareng Bpedia (mesin capit) | `/g/nyapit/` | Cozzone UP 2026 |
| Bipy Beauty Drop (papan pin + kapsul mekar) | `/g/drop/` | TAKEOVER X 2026 |
| Game 4 · Bipy Gacha Pop (gacha satu tap, 20 hadiah / 497 kapsul awal) | `/g/gacha/` | Marketing 6.0 · 3–4 Okt 2026 |
| Game 5 · Bipy Grand Line Desire (14 kartu BP06, 7 menu × Zoro/Sanji) | `/g/heart/` | Marketing 6.0 · 3–4 Okt 2026 |

Halaman acara `/market-in` mengelompokkan Game 4 dan Game 5 di satu booth Bpedia di Urban Forest Cipete pada 3–4 Oktober 2026. Zoro dan Sanji dijadwalkan hadir kedua hari; jam sesi diumumkan petugas. Masing-masing game tetap memiliki rute, mekanik, stok atau antrean, serta dashboard petugas sendiri.

Gacha Pop memigrasikan katalog lama ke 20 hadiah/497 kapsul awal dengan memperhitungkan hadiah resmi yang sudah keluar dan mempertahankan pengaturan, foto, riwayat, hadiah tambahan, serta hasil tertunda. Tiga voucher belanja memiliki ketentuan sendiri. Grand Line Desire dibuka dengan trailer dan pilihan Zoro/Sanji wajib. **Belanja booth Rp100.000 mendapat gacha**: tujuh menu diperkenalkan, kartu ditumpuk dan dikocok bersama Bipy dealer, lalu pemain memilih satu kartu tertutup. **Belanja Rp150.000 mendapat pilih fanservice**: ketuk bagian mana pun pada kartu favorit untuk langsung membuka hasil; tombol cuplikan tetap tersedia terpisah. Server memeriksa nominal mode tercatat; demo terpisah dari stok dan antrean resmi. Setiap hasil memakai duo Bipy yang sesuai momen dan dapat diketuk untuk flip 3D menjadi poster bounty Wanted/Dead or Alive. Harga FS referensi dicoret dan diganti **GRATIS untuk pelanggan Bpedia** yang memenuhi syarat; harga bawaan perlu dikonfirmasi tim booth.

Musik Bpedia dari berkas pemilik disusun menjadi suite berulang hampir enam menit dengan dua dialog pengenalan Jepang sintetis. Trailer baru di Gemini menggunakan referensi Bipy resmi. Empat belas cuplikan momen terdiri atas dua potongan animasi karakter dari master Gemini baru dan 12 motion graphics ilustrasi duo pemilik. Tema terang pink/gelap, bisu, animasi, layar penuh dan Demo/Main Tercatat tersedia di header. Pemutaran suara menunggu interaksi pertama sesuai browser. Formulir persetujuan sebelum kartu dihapus; petugas mengonfirmasi interaksi nyata dan dokumentasi di booth.

Fitur pemain: profil & avatar Bipy, XP & level, streak harian, 3 misi harian, 11 lencana, album 91 kartu, papan peringkat mingguan/sepanjang masa, kode pemulihan profil, panduan & FAQ. Online memakai demo pribadi; klaim hadiah atau fanservice dilakukan pada sesi booth resmi.
Portal petugas (`/studio`): tautan mode admin/petugas pada lima game, tanpa login pemilik terpusat. Admin setiap game mempertahankan autentikasinya.

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
node scripts/heart-journey-qa.cjs # alur kartu lintas browser/viewport
node scripts/heart-audio-qa.cjs   # pemutaran, loop, bisu dan jingle nyata
node scripts/hostinger-package-smoke.cjs # instalasi paket terisolasi
node scripts/verify-deployment.cjs # byte kode/aset produksi vs commit
```

Produksi: `npm start` (entry `hub/server.cjs`), env `ADMIN_PIN` (6–12 digit, wajib), `NODE_ENV=production`, opsional `ALLOWED_HOSTS`, `GAMYSUF_DATA_DIR`. Game 5 memakai **PIN booth 1234** yang ditampilkan sesuai permintaan pemilik, terisolasi dari Studio serta game lain yang tetap memakai ADMIN_PIN. Opsional `HEART_BOOTH_PIN` dapat menggantinya saat startup. Tanpa ADMIN_PIN, dashboard terkunci.

Dokumen lengkap & status serah-terima: [docs/PRD-Gamysuf-Arcade.md](docs/PRD-Gamysuf-Arcade.md).

Status 3 Oktober 2026: **1.8.0 live**, Game 5 sumber 2.3.0 dan CSS journey v2.3.1. Satu ketukan membuka pilihan kartu, flip poster Wanted, trailer Gemini baru dan duo Bipy sesuai momen. Sumber 47/47 tes, integrasi 75/75, browser live 561/561, video live 42/42 dan endpoint/hash 206/206 lulus. Portal petugas mengarah ke dashboard tiap game. Bukti dan paket: [docs/RELEASE-1.8.0.md](docs/RELEASE-1.8.0.md). PRD Game 5: [docs/PRD-Bipy-Heart-Parade.md](docs/PRD-Bipy-Heart-Parade.md).
