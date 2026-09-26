# Gamysuf Arcade

Satu dashboard interaktif untuk tiga game booth Bpedia, berjalan di cloud (Hostinger Node.js):

| Game | Alamat | Event |
|---|---|---|
| Spin Wheels (roda + Mystery Beauty Box) | `/g/spin/` | Pesta Folka 2026 |
| Nyapit Bareng Bpedia (mesin capit) | `/g/nyapit/` | Cozzone UP 2026 |
| Bipy Beauty Drop (papan pin + kapsul mekar) | `/g/drop/` | TAKEOVER X 2026 |
| Slot game tambahan (ZIP HTML5 atau tautan) | `/play/<slug>/` | diatur di Studio |

Fitur pemain: profil & avatar Bipy, XP & level, streak harian, 3 misi harian, 11 lencana, album 57 kartu, papan peringkat mingguan/sepanjang masa, kode pemulihan profil, panduan & FAQ.
Studio pemilik (`/studio`): statistik, tautan dashboard tiap game, pengumuman, game unggulan, sembunyikan game, kelola game tambahan.

## Menjalankan

```bash
npm install
npm run dev                 # http://127.0.0.1:4400 · PIN lokal 123456
npm test                    # tes gateway, pemain, Studio, keamanan ZIP
npm run sync                # salin ulang game dari folder 01/02/03
npm run qa                  # tur visual Electron → artifacts/qa (tambah "covers" untuk sampul)
npm run package:hostinger   # release/Gamysuf-Arcade-<versi>-Hostinger.zip
```

Produksi: `npm start` (entry `hub/server.cjs`), env `ADMIN_PIN` (6–12 digit, wajib), `NODE_ENV=production`, opsional `ALLOWED_HOSTS`, `GAMYSUF_DATA_DIR`.

Dokumen lengkap & status serah-terima: [docs/PRD-Gamysuf-Arcade.md](docs/PRD-Gamysuf-Arcade.md).
