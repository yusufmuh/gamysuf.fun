# Gamysuf Arcade

Satu dashboard interaktif untuk tiga game booth Bpedia, berjalan di cloud (Hostinger Node.js) di **https://gamysuf.fun**:

| Game | Alamat | Event |
|---|---|---|
| Spin Wheels (roda + Mystery Beauty Box) | `/g/spin/` | Pesta Folka 2026 |
| Nyapit Bareng Bpedia (mesin capit) | `/g/nyapit/` | Cozzone UP 2026 |
| Bipy Beauty Drop (papan pin + kapsul mekar) | `/g/drop/` | TAKEOVER X 2026 |
| Slot game tambahan (ZIP HTML5 atau tautan) | `/play/<slug>/` | diatur di Studio |

Fitur pemain: profil & avatar Bipy, XP & level dengan gelar (Pendatang Baru → Legenda Bpedia), streak harian, 3 misi harian, 11 lencana dengan progres "target berikutnya", album 57 kartu, papan peringkat mingguan (hitung mundur musim) & sepanjang masa, saran game dari Bipy, pita aktivitas LIVE, bagikan progres, kode pemulihan profil, panduan & FAQ.
Studio pemilik (`/studio`): statistik, tautan dashboard tiap game, pengumuman, game unggulan, sembunyikan game, kelola game tambahan (maks. 6).

## Menjalankan

```bash
npm install
npm run dev                 # http://127.0.0.1:4400 · PIN lokal 123456
npm test                    # 11 tes: gateway, dispatch, pemain, Studio, keamanan ZIP
npm run sync                # salin ulang game dari folder 01/02/03 (laptop pemilik)
npm run qa                  # tur visual → artifacts/qa (Electron bila ada, selain itu Chromium/Playwright)
npm run qa -- 390x844       # ukuran lain; tambah "covers" untuk memperbarui sampul
npm run package:hostinger   # release/Gamysuf-Arcade-<versi>-Hostinger.zip
```

Produksi: `npm start` (entry `hub/server.cjs`), env `ADMIN_PIN` (6–12 digit, wajib), `NODE_ENV=production`, opsional `ALLOWED_HOSTS`, `GAMYSUF_DATA_DIR`. Cek kesehatan: `GET /hub-api/health`.

## Deploy ke Hostinger (gamysuf.fun)

1. hPanel → **Websites** → gamysuf.fun → **Node.js web app** → **Import Git repository** → pilih repo `yusufmuh/gamysuf.fun`, branch `main`.
2. Framework **Other** · Node **22** · Build command kosong · Entry file **`hub/server.cjs`**.
3. Environment variables: `ADMIN_PIN` (isi sendiri, 6–12 digit), `NODE_ENV=production`, opsional `ALLOWED_HOSTS=gamysuf.fun,www.gamysuf.fun`.
4. Deploy. Setiap push ke `main` memicu redeploy otomatis. Buka `https://gamysuf.fun/hub-api/health` untuk memastikan server hidup.

Alternatif tanpa Git: **Upload your files** → ZIP dari `npm run package:hostinger`. Detail lengkap di PRD §7.

Dokumen lengkap & status serah-terima: [docs/PRD-Gamysuf-Arcade.md](docs/PRD-Gamysuf-Arcade.md).
