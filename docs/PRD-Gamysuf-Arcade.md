# PRD — GAMYSUF ARCADE (hub 3 game Bpedia)

> Sumber kebenaran + catatan serah-terima. AI mana pun yang melanjutkan: baca sampai habis,
> lanjutkan dari **§10 Status**, dan perbarui §10–§11 sebelum berhenti (termasuk karena limit).

## 1. Ringkasan
| Item | Isi |
|---|---|
| Produk | Dashboard/arcade web yang menyatukan 3 game booth Bpedia + slot game tambahan |
| Domain | **gamysuf.fun** (Hostinger, akun pemilik) |
| Folder | `C:\Users\Yusuf\coding\00 game\00 gamysuf-arcade` |
| Repo | GitHub `yusufmuh/gamysuf.fun` — lihat §10 |
| Pemilik | Muhammad Yusuf |
| Runtime | Node.js ≥20 (Hostinger terverifikasi: 20), satu proses, dependensi produksi hanya `fflate` |

Permintaan pengguna: "buat 3 game menjadi 1 dashboard interaktif yang bisa mengakses 3 game dan bisa menambahkan 1 project game lain; upload ke GitHub; domain gamysuf.fun di Hostinger; dashboard semenarik mungkin; seluruh game berjalan di cloud; buat petunjuk dll. yang profesional, menarik, dan membuat pemain ketagihan."

## 2. Game yang disatukan
| Slug | Sumber (sumber kebenaran kode) | Mekanik | Event |
|---|---|---|---|
| `spin` | `../01 spenweels` (v2.6.0) | Roda + Mystery Beauty Box | Pesta Folka 2026 |
| `nyapit` | `../02 nyapit` (v1.4.0) | Mesin capit + maskot B! | Cozzone UP 2026 |
| `drop` | `../03 bipy-beauty-drop` (v1.0.0) | Papan pin + kapsul mekar + gacha fanservice | TAKEOVER X 2026 |

`games/<slug>/` hanyalah **salinan** berkas runtime (`npm run sync`). Ubah game di folder aslinya, lalu sync.
Ketiga game diberi opsi `cloud` di `server.cjs` masing-masing (commit di repo lokal game 01/02/03, perilaku desktop/.exe tidak berubah).

## 3. Arsitektur
```
hub/server.cjs        gateway + API hub + Studio + penyaji game tambahan (createHub)
hub/rewrite.cjs       awalan URL /g/<slug> (keluar) & pelepasan awalan (body JSON masuk), cookie Path
hub/visitors.cjs      mesin demo per pengunjung (Engine asli game di atas MemoryStore)
hub/registry.cjs      metadata & panduan game bawaan + adapter hasil → kartu/XP
hub/players.cjs       profil, XP, level, streak, misi, lencana, album, peringkat (JSON di data dir)
hub/custom-games.cjs  slot game tambahan (ZIP HTML5 / tautan), sampul, pengaturan arcade
hub/public/           index.html (arcade), studio.html, css/, js/hub.js, js/studio.js, js/inject.js, assets/
games/{spin,nyapit,drop}/  salinan runtime game
scripts/              sync-games.cjs, capture(-electron).cjs, package-hostinger.cjs
tests/hub.test.cjs    9 tes (gateway, isolasi pengunjung, PIN, XP, Studio, keamanan ZIP)
```

### Alur permintaan
1. `/g/<slug>/*` → gateway memeriksa Origin (POST wajib same-origin), menulis ulang Host/Origin ke server internal game (127.0.0.1:port acak), menambah header `x-gamysuf-visitor`, lalu memproksi.
2. Respons HTML/CSS/JS/JSON diberi awalan `/g/<slug>`; cookie sesi game dipindah ke `Path=/g/<slug>/api/` (+`Secure` di HTTPS); `inject.js` disisipkan ke halaman utama game (tombol GAMYSUF + notifikasi XP).
3. Di dalam game (mode `cloud`): permintaan tanpa sesi admin → `cloud.engineFor()` = mesin demo milik pengunjung itu (stok asli aman, tidak ada tabrakan antar pengunjung). Perangkat yang login dashboard game → mesin asli (mode resmi booth).
4. Respons hasil (`/api/play`, `/api/spin`, `/api/bonus`) dengan `demo:true` dicatat `players.record()` → XP/kartu/misi/lencana (anti-curang karena dibaca di server, idempoten per requestId).

### Keamanan
- `ADMIN_PIN` (6–12 digit) ditulis ulang ke `auth.json` setiap game saat start → PIN/password bawaan di kode game (1234 / johan123:yusuf123) **tidak pernah berlaku** di cloud. Tanpa ADMIN_PIN: semua login terkunci (503), game tetap bisa dimainkan.
- Ganti PIN/password dari dashboard game dimatikan di cloud (409) — PIN hanya dari env.
- Studio: sesi cookie `gamysuf_admin` (HttpOnly, SameSite=Strict, 8 jam), kunci 60 dtk setelah 5 PIN salah, POST wajib Origin + header `x-gamysuf-client: hub`.
- ZIP game tambahan: tolak path traversal/absolut, whitelist ekstensi, ≤4000 berkas, ≤200 MB; disajikan di `/play/<slug>/` dengan CSP longgar khusus game (hanya pemilik yang bisa unggah).
- Data persisten di `~/gamysuf-data` (di luar `hbuilds/` Hostinger yang dibuat ulang setiap deploy).

## 4. Fitur pemain (engagement sehat, tanpa pembelian)
- Onboarding: nama panggung + 6 avatar Bipy.
- XP: main +10, belum beruntung +5, kartu baru +25, legendaris pertama +50, bonus harian +20, misi +30/+40/+50, lencana +30. Batas 60 permainan ber-XP per hari.
- Level: level n butuh 100 + 50(n−1) XP.
- Streak harian (WIB), 3 misi harian (main 3×, 2 game berbeda, 1 kartu baru), 11 lencana.
- Album 57 kartu (16 Spin + 18 Nyapit + 23 Drop termasuk 5 fanservice), rarity Legendaris/Epik/Langka/Umum.
- Peringkat mingguan (reset Senin 00.00 WIB) & sepanjang masa; kode pemulihan untuk pindah perangkat.
- Panduan: cara kerja 4 langkah, aturan main adil, tabel XP, FAQ, modal "Cara main" per game (langkah, kontrol, tips).
- Kejujuran: online selalu demo; hadiah fisik hanya di booth. Beauty Drop menampilkan teks "simulasi demo" pada hasil demo.

## 5. Studio (`/studio`)
Statistik (pemain, aktif hari ini, main hari ini, total), daftar game bawaan + tombol Dashboard + info login, pengumuman beranda (+tautan), game unggulan kabinet, sembunyikan game bawaan, kelola maksimal 6 game tambahan (slug, judul, subjudul, deskripsi, cara main, tag, warna, sampul, ZIP/tautan, publikasi), Top 10 minggu ini.

## 6. Menambah game
- **Tanpa kode**: Studio → Tambah game (ZIP HTML5 dengan `index.html`, atau tautan https).
- **Game Node dengan server**: buat folder `games/<slug>/` berisi `server.cjs` yang mengekspor `createApp({dataDir,port,cloud})` (pola sama dengan game 03: `engineFor(req)` untuk rute publik), `core/engine.cjs` mengekspor `Engine`, lalu tambah entri di `hub/registry.cjs` (title, cover, howTo, resultRoutes, extract, cards). Tambahkan sumbernya di `scripts/sync-games.cjs`.

## 7. Deploy Hostinger
- Rekomendasi: hPanel → Websites → gamysuf.fun → Node.js web app → **Import Git repository** (repo `gamysuf-arcade`) → auto-deploy saat push.
- Alternatif: **Upload your files** → `release/Gamysuf-Arcade-<versi>-Hostinger.zip`.
- Pengaturan: Framework **Other**, Node **22**, Build command kosong, Entry file **hub/server.cjs**.
- Env: `ADMIN_PIN` (wajib, diisi pemilik sendiri), `NODE_ENV=production`, opsional `ALLOWED_HOSTS=gamysuf.fun,www.gamysuf.fun`.
- Catatan Hostinger: bila domain sudah terdaftar sebagai website lain di paket, flow Node.js meminta website lama dihapus dulu.

## 8. Menjalankan & verifikasi
```bash
npm install && npm run dev      # 127.0.0.1:4400, PIN lokal 123456
npm test                        # 9 tes hub
npm run qa                      # 16 tangkapan layar + daftar error konsol (artifacts/qa/1600x900)
npm run qa -- 1366x768
npm run qa:responsive           # Chromium/Firefox/WebKit + gameplay; perlu Playwright beserta browsernya
node scripts/hub-interaction-qa.cjs # dialog, keyboard, koneksi, preferensi, Studio
node scripts/capture-gameplay-covers.cjs # tinjau sampul di artifacts/cover-candidates
npm run package:hostinger
```
Tes game asli: `npm test` di folder 01 (83), 02 (54), 03 (29).

## 9. Keputusan terkunci
- Satu proses Node untuk hub + 3 game (satu web app Hostinger, satu domain).
- Awalan jalur `/g/<slug>/` + penulisan ulang otomatis, bukan menulis ulang kode front-end game.
- Pengunjung online = mesin demo pribadi; mode resmi hanya perangkat booth yang login.
- XP dihitung di server dari respons game, bukan dari laporan browser.

## 10. Status (PERBARUI SETIAP BERHENTI)
**Rilis web 1.1.0 (Codex, 2026-09-27):** dashboard memiliki navigasi sentuh, game sebelum misi, pilihan game unggulan yang stabil, pintasan game terakhir, pemulihan koneksi, fokus dialog, kontrol animasi, dan Studio responsif. Spin/Nyapit memperbaiki musik, arena, overflow, dan siklus audio. Drop menempatkan seluruh papan dan tombol dalam layar potret, menjaga animasi saat resize, membatasi loop cahaya, mengatur partikel berdasarkan waktu, memperbesar tombol, serta memperbaiki dialog dan pemulihan audio. Logo, maskot, hasil server, stok booth dan mode demo tetap memakai sumber asli.

Validasi rilis dan deployment dicatat di `docs/RELEASE-1.1.0.md`. Paket arsip: `release/Gamysuf-Arcade-1.1.0-Hostinger.zip`. Salinan `games/` berasal dari sumber saudara 01/02/03; perubahan game selanjutnya tetap dilakukan di sumber tersebut.

Pembaruan 2026-09-27 (Codex): ketiga sampul hub di `hub/public/assets/covers/` diganti tangkapan gameplay asli berukuran 1200×675. Spin menampilkan arena roda lengkap, Nyapit menampilkan kabinet capit beserta bola, dan Drop menampilkan kapsul yang sedang memantul di papan pin bersama Bipy. Sumber tangkapan sementara dan `capture.json` ada di `artifacts/cover-candidates/`; skrip reproduksi ada di `scripts/capture-gameplay-covers*.cjs`.

Terakhir diperbarui: 2026-09-27 oleh Codex. **Rilis web 1.1.0**, tujuan https://gamysuf.fun. Bukti publikasi akhir: `artifacts/deployment-1.1.0.json` (versi, status HTTP dan SHA-256 berkas live).

| Area | Status |
|---|---|
| Patch mode cloud di game 01/02/03 (+ fallback origin) | ✅ tes 83 / 54 / 29 lulus, sumber = salinan `games/` (sync tanpa diff) |
| Hub: gateway (dispatch in-memory), visitors, players, custom games, Studio, API | ✅ tes hub 13/13 (termasuk simulasi loader Hostinger & meta CSP) |
| Front-end arcade + Studio + inject | ✅ 616 pemeriksaan responsif + 24 interaksi, Chromium/Firefox/WebKit; QA Electron 16 tangkapan, 0 error konsol |
| GitHub | ✅ `github.com/yusufmuh/gamysuf.fun` (**publik** — pertimbangkan jadikan privat) |
| Deploy Hostinger | Node 20, repo `yusufmuh/gamysuf.fun` branch main, entry `hub/server.cjs`; lingkungan dan data produksi dipertahankan; lihat bukti rilis di atas |
| Sisa pembersihan (keputusan pemilik) | ⏳ website kosong `gamysuf-fun-508313` & `gamysuf-fun-912185.hostingersite.com` (halaman default PHP) bisa dihapus |
| Keamanan | ⚠️ `.git/config` lokal menyimpan token GitHub (ghp_…) di URL remote: cabut token itu dan pakai `gh auth login` |

### Catatan runtime Hostinger (penting untuk AI berikutnya)
- Loader Node Hostinger membajak `http.Server.prototype.listen` dan tidak selalu menjalankan `hub/server.cjs` sebagai `require.main`.
- Karena itu: (a) saat membuat server game, `createHub` sementara memakai `net.Server.prototype.listen` asli; (b) gateway memanggil handler game **in-memory** (`dispatchInMemory`), bukan lewat TCP; (c) `shouldAutostart()` menyalakan server kecuali di-require dari `tests/`, `scripts/`, `artifacts/` (paksa dengan `GAMYSUF_AUTOSTART=1/0`).
- Tes `tests/hosting.test.cjs` meniru tiga kondisi ini; jalankan sebelum push karena push ke `main` = deploy produksi.
- CDN Hostinger (hcdn) **mengganti header Content-Security-Policy** menjadi `upgrade-insecure-requests`. Karena itu `withMetaCsp()` menanam kebijakan yang sama sebagai `<meta http-equiv>` di semua HTML (hub, game via gateway, game tambahan). Header lain (X-Frame-Options, nosniff, Referrer-Policy) tetap lolos.
- Hub tidak pernah autostart di dalam Electron (alat QA); `scripts/capture-electron.cjs` juga memaksa `GAMYSUF_AUTOSTART=0`.

## 11. Log serah-terima
- **2026-09-27 (Codex, web 1.1.0)**: perbaikan dashboard dan tiga game lintas layar; QA browser dengan data sementara yang terpisah dari produksi; paket Hostinger dan skrip regresi responsif. Detail hasil akhir pada catatan rilis 1.1.0.
- **2026-09-27 (Claude)**: membangun hub dari nol, patch mode cloud di 3 game, sampul via Electron, QA, tes, paket Hostinger, PRD ini.
- **2026-09-27 (agen lain, identitas git pemilik)**: 4 commit perbaikan Hostinger (entry guard, isolasi listen, dispatch in-memory, fallback origin), membuat repo `yusufmuh/gamysuf.fun`, deploy ke gamysuf.fun.
- **2026-09-27 (Claude)**: memindahkan fallback origin ke sumber game 01/02/03, entry guard yang tidak menyalakan server saat di-require alat lokal, alamat socket loader aman, label demo jujur di Beauty Drop, `tests/hosting.test.cjs` (3 skenario loader), QA ulang, PRD.
- **2026-09-27 (Claude)**: CSP ditanam sebagai meta karena CDN mengganti header; hub tidak autostart di Electron.
- **2026-09-27 (Codex)**: menangkap ulang ketiga sampul dari layar gameplay sebenarnya melalui Electron/gateway lokal, meninjau komposisi 16:9, menyimpan JPEG 1200×675 dan skrip reproduksi tanpa mengubah artwork game.
