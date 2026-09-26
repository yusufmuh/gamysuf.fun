# PRD — GAMYSUF ARCADE (hub 3 game Bpedia)

> Sumber kebenaran + catatan serah-terima. AI mana pun yang melanjutkan: baca sampai habis,
> lanjutkan dari **§10 Status**, dan perbarui §10–§11 sebelum berhenti (termasuk karena limit).

## 1. Ringkasan
| Item | Isi |
|---|---|
| Produk | Dashboard/arcade web yang menyatukan 3 game booth Bpedia + slot game tambahan |
| Domain | **gamysuf.fun** (Hostinger, akun pemilik) |
| Folder | `C:\Users\Yusuf\coding\00 game\00 gamysuf-arcade` |
| Repo | GitHub `yusufmuh/gamysuf.fun` (branch `main`; kerja AI lewat branch `claude/*` + PR) |
| Pemilik | Muhammad Yusuf |
| Runtime | Node.js ≥20 (Hostinger: 22), satu proses, dependensi hanya `fflate` |

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
hub/dispatch.cjs      memanggil handler HTTP game di memori (tanpa port internal; streaming aset biner)
hub/public/skins/     skin online per game (<slug>.css/.js): tata letak HP/tablet/lipat, getar, dll.
hub/media-lite/       MP3 (dari WAV) & WebP (dari PNG/JPG) + manifest checksum (npm run media:lite)
hub/rewrite.cjs       awalan URL /g/<slug> (keluar) & pelepasan awalan (body JSON masuk), cookie Path
hub/visitors.cjs      mesin demo per pengunjung (Engine asli game di atas MemoryStore)
hub/registry.cjs      metadata & panduan game bawaan + adapter hasil → kartu/XP
hub/players.cjs       profil, XP, level, streak, misi, lencana, album, peringkat (JSON di data dir)
hub/custom-games.cjs  slot game tambahan (ZIP HTML5 / tautan), sampul, pengaturan arcade
hub/public/           index.html (arcade), studio.html, css/, js/hub.js, js/studio.js, js/inject.js, assets/
games/{spin,nyapit,drop}/  salinan runtime game
scripts/              sync-games.cjs, media-lite.cjs, capture.cjs (+ -electron / -playwright), package-hostinger.cjs
tests/hub.test.cjs    12 tes (gateway, dispatch, aset biner, media ringan, isolasi pengunjung, PIN, XP, Studio, keamanan ZIP)
.github/workflows/    ci.yml: npm test + paket Hostinger di setiap PR/push main
```

### Alur permintaan
1. `/g/<slug>/*` → gateway memeriksa Origin (POST wajib same-origin), menulis ulang Host/Origin ke origin internal game, menambah header `x-gamysuf-visitor`, lalu memanggil handler game **di memori** (`dispatch.cjs`). HTML/CSS/JS/JSON ditampung untuk ditulis ulang; gambar/audio/font diteruskan streaming.
2. Respons HTML/CSS/JS/JSON diberi awalan `/g/<slug>`; cookie sesi game dipindah ke `Path=/g/<slug>/api/` (+`Secure` di HTTPS); skin online (`/hub/skins/<slug>.css|js`, bila ada) dan `inject.js` disisipkan ke halaman utama game (tombol GAMYSUF + notifikasi XP).
   Aset `.wav` dan PNG/JPG yang ada di `hub/media-lite/manifest.json` (checksum sumber cocok) dijawab dengan MP3/WebP; WebP hanya bila browser mengirim `Accept: image/webp` (`Vary: Accept`).
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
- v1.1 (engagement): gelar per level (Pendatang Baru Lv1, Pemburu Hoki Lv3, Kolektor Muda Lv5, Bintang Arcade Lv8, Master Kapsul Lv12, Legenda Bpedia Lv16); progres setiap lencana + kartu "Target berikutnya"; "Saran Bipy" di hero (bonus harian → misi 2 game → game dengan kartu terbanyak yang belum ditemukan); pita LIVE (jumlah main hari ini + kartu legendaris/epik, level kelipatan 5, album lengkap; di memori, 24 terakhir); popularitas per game; progres per game di modal Cara main; hitung mundur musim mingguan; tombol Bagikan progres (Web Share/salin); confetti saat naik level/lencana; toast ringkas di HP.

### Responsif & perangkat (skin online)
Game booth dirancang untuk TV 16:9. Versi online memakai skin di `hub/public/skins/` (tidak menyentuh folder 01/02/03, tidak tertimpa `npm run sync`):
- **Beauty Drop** (`drop.css/js`): layar tegak = tata letak mengalir & bisa digulir; HP tegak = unit `--u` 9–11,5 px, teks min. ±11 px, target sentuh ≥40 px, papan selebar layar, tombol DROP menempel di bawah & papan otomatis digulir ke tengah; HP mendatar = kontrol kiri, papan kanan + petunjuk putar HP; hasil demo tanpa kode klaim/syarat penukaran; getar halus (Android) saat DROP & kartu mekar; kartu hologram ikut kemiringan HP (Android, iOS dilewati agar tanpa izin sensor); tombol layar penuh di bilah atas untuk perangkat sentuh.
- **Spin** (`spin.css`): pemutar musik pindah ke baris sendiri ≤900 px (pilih lagu & volume disembunyikan ≤1100 px); teks 5–8 px di HP dinaikkan; orbit dekoratif tidak melebarkan halaman.
- **Nyapit** (`nyapit.css`): mesin capit kembali di urutan pertama di HP (tombol MAIN tidak lagi ±1100 px di bawah); dialog koin muat di HP mendatar.
- `inject.js`: tombol GAMYSUF ringkas (ikon saja) di HP.
Matriks uji: 390×844, 844×390, 344×882 (lipat tertutup), 884×1104 (lipat terbuka), 820×1180, 1180×820, 1366×768, 1440×900, 1920×1080 — tanpa scroll horizontal.

## 5. Studio (`/studio`)
Statistik (pemain, aktif hari ini, main hari ini, total), daftar game bawaan + tombol Dashboard + info login, pengumuman beranda (+tautan), game unggulan kabinet, sembunyikan game bawaan, kelola maksimal 6 game tambahan (slug, judul, subjudul, deskripsi, cara main, tag, warna, sampul, ZIP/tautan, publikasi), Top 10 minggu ini.

## 6. Menambah game
- **Tanpa kode**: Studio → Tambah game (ZIP HTML5 dengan `index.html`, atau tautan https).
- **Game Node dengan server**: buat folder `games/<slug>/` berisi `server.cjs` yang mengekspor `createApp({dataDir,port,cloud})` (pola sama dengan game 03: `engineFor(req)` untuk rute publik), `core/engine.cjs` mengekspor `Engine`, lalu tambah entri di `hub/registry.cjs` (title, cover, howTo, resultRoutes, extract, cards). Tambahkan sumbernya di `scripts/sync-games.cjs`.

## 7. Deploy Hostinger
- Rekomendasi: hPanel → Websites → gamysuf.fun → Node.js web app → **Import Git repository** (repo `yusufmuh/gamysuf.fun`, branch `main`) → auto-deploy saat push.
- Alternatif: **Upload your files** → `release/Gamysuf-Arcade-<versi>-Hostinger.zip`.
- Pengaturan: Framework **Other**, Node **22**, Build command kosong, Entry file **hub/server.cjs**.
- Env: `ADMIN_PIN` (wajib, diisi pemilik sendiri), `NODE_ENV=production`, opsional `ALLOWED_HOSTS=gamysuf.fun,www.gamysuf.fun`.
- Catatan Hostinger: bila domain sudah terdaftar sebagai website lain di paket, flow Node.js meminta website lama dihapus dulu.
- Runner Node.js Hostinger memuat entry lewat `require()` (bukan `node hub/server.cjs`) dan membajak `http.Server.listen`. Karena itu: server mulai otomatis bila `require.main` di luar proyek (tes/skrip di `tests/`, `scripts/`, `artifacts/` dan Electron tidak ikut menyalakan server; `GAMYSUF_AUTOSTART=0` untuk alat lain), selama `createApp` game, `listen()` hanya memberi tanda siap (server internal game tidak terikat ke port/soket mana pun, origin cadangan `127.0.0.1:4300` dari commit pemilik 46a2da0), dan trafik game lewat `dispatch.cjs`.
- Verifikasi setelah deploy: `https://gamysuf.fun/hub-api/health` → `{ok:true, pinConfigured:true}`.

## 8. Menjalankan & verifikasi
```bash
npm install && npm run dev      # 127.0.0.1:4400, PIN lokal 123456
npm test                        # 11 tes hub
npm run qa                      # 16 tangkapan layar + error konsol + cek scroll horizontal (artifacts/qa/1600x900)
npm run qa -- 1366x768          # juga 390x844 untuk HP
CAPTURE_ENGINE=chromium npm run qa   # paksa Playwright/Chromium walau Electron ada
npm run qa -- covers            # perbarui sampul game dari tampilan terbaru
npm run package:hostinger
npm run media:lite              # setelah sync: MP3/WebP ringan (butuh devDependency lamejs; gambar butuh Playwright)
```
Tes game asli: `npm test` di folder 01 (83), 02 (54), 03 (29).

## 9. Keputusan terkunci
- Satu proses Node untuk hub + 3 game (satu web app Hostinger, satu domain).
- Awalan jalur `/g/<slug>/` + penulisan ulang otomatis, bukan menulis ulang kode front-end game.
- Pengunjung online = mesin demo pribadi; mode resmi hanya perangkat booth yang login.
- XP dihitung di server dari respons game, bukan dari laporan browser.
- Game bawaan dipanggil di memori (dispatch.cjs), bukan lewat port 127.0.0.1, agar cocok dengan runner Hostinger satu-soket.
- Penyesuaian versi online (HP/tablet, kejujuran demo) lewat skin hub, bukan mengubah salinan `games/`; media ringan lewat manifest checksum, bukan mengganti berkas game.

## 10. Status (PERBARUI SETIAP BERHENTI)
Terakhir diperbarui: 2026-09-27 WIB oleh Claude (sesi cloud, merge `main` 83eb7ee ke PR #1). **LIVE di https://gamysuf.fun** (dari `main`).

| Area | Status |
|---|---|
| Patch mode cloud di game 01/02/03 (+ fallback origin) | ✅ tes 83 / 54 / 29 lulus, sumber = salinan `games/` (sync tanpa diff) |
| Hub: gateway (`dispatch.cjs`), visitors, players, custom games, Studio, API | ✅ tes hub 16/16 (`hub.test.cjs` + `hosting.test.cjs`: loader Hostinger, meta CSP, media ringan) |
| Front-end arcade v1.1 (gelar, target, saran Bipy, LIVE, bagikan, confetti) + Studio + inject | ✅ QA Chromium 1600×900 & 390×844: 0 error konsol, 0 scroll horizontal |
| Responsif semua perangkat (skin drop/spin/nyapit, dashboard ≤380 px) | ✅ 9 profil perangkat tanpa scroll horizontal; alur Beauty Drop diuji di HP, lipat, tablet (branch PR #1) |
| Media ringan (MP3/WebP) | ✅ audio 51,5→5,5 MB, gambar 33,6→4,7 MB; halaman HP 0,7–1,6 MB (branch PR #1) |
| CI GitHub Actions (npm test + paket Hostinger) | ✅ `.github/workflows/ci.yml` |
| GitHub | ✅ `github.com/yusufmuh/gamysuf.fun` (**publik** — pertimbangkan jadikan privat); v1.1 di PR #1 dari `claude/zen-meitner-wrzrju`, merge oleh pemilik = deploy produksi |
| Deploy Hostinger | ✅ gamysuf.fun menyajikan hub + 3 game dari `main`; ADMIN_PIN sudah diisi pemilik |
| Sisa pembersihan (keputusan pemilik) | ⏳ website kosong `gamysuf-fun-508313` & `gamysuf-fun-912185.hostingersite.com` (halaman default PHP) bisa dihapus |
| Keamanan | ⚠️ `.git/config` lokal menyimpan token GitHub (ghp_…) di URL remote: cabut token itu dan pakai `gh auth login` |

### Catatan runtime Hostinger (penting untuk AI berikutnya)
- Loader Node Hostinger membajak `http.Server.prototype.listen` dan tidak selalu menjalankan `hub/server.cjs` sebagai `require.main`.
- Karena itu: (a) selama `createApp` game, `createHub` mengganti `listen()` dengan penanda siap tanpa soket — server internal game tidak terikat ke port/soket mana pun dan memakai origin cadangan `127.0.0.1:4300`; (b) gateway memanggil handler game **in-memory** lewat `hub/dispatch.cjs`, bukan lewat TCP; (c) `shouldAutostart()` menyalakan server kecuali di-require dari `tests/`, `scripts/`, `artifacts/` atau di dalam Electron (paksa dengan `GAMYSUF_AUTOSTART=1/0`).
- Tes `tests/hosting.test.cjs` meniru kondisi ini; jalankan sebelum push karena push ke `main` = deploy produksi.
- CDN Hostinger (hcdn) **mengganti header Content-Security-Policy** menjadi `upgrade-insecure-requests`. Karena itu `withMetaCsp()` menanam kebijakan yang sama sebagai `<meta http-equiv>` di semua HTML (hub, game via gateway, game tambahan). Header lain (X-Frame-Options, nosniff, Referrer-Policy) tetap lolos. Skin online (`/hub/skins/…`) dan media ringan berasal dari origin yang sama sehingga lolos kebijakan itu.
- Hub tidak pernah autostart di dalam Electron (alat QA); `scripts/capture-electron.cjs` juga memaksa `GAMYSUF_AUTOSTART=0`.

## 11. Log serah-terima
- **2026-09-27 (Claude)**: membangun hub dari nol, patch mode cloud di 3 game, sampul via Electron, QA, tes, paket Hostinger, PRD ini.
- **2026-09-27 (agen lain, identitas git pemilik)**: 4 commit perbaikan Hostinger (entry guard, isolasi listen, dispatch in-memory, fallback origin), membuat repo `yusufmuh/gamysuf.fun`, deploy ke gamysuf.fun.
- **2026-09-27 (Claude, sesi cloud, branch PR #1)**: v1.1.0 — entry guard tidak menyalakan server kedua saat dimuat skrip/tes; dispatch dipindah ke `hub/dispatch.cjs` (statusCode implisit, writeHead dengan reason, streaming aset biner, 5xx untuk error/batas waktu); beranda tidak melebar (album); celah Studio; `/hub-api/session`, `/hub-api/health`; fitur engagement v1.1 (§4); meta OG/canonical; robots menutup `/g/*/admin.html`; QA Playwright + Chromium dengan cek scroll horizontal; CI GitHub Actions.
- **2026-09-27 (Claude, sesi cloud, branch PR #1)**: responsif semua perangkat lewat skin online `hub/public/skins/` (drop: tata letak HP/tablet/lipat, getar, tilt, layar penuh, sembunyikan kode klaim demo; spin: header & teks HP; nyapit: urutan mesin & dialog koin), dashboard ≤380 px & meta PWA iOS, `inject.js` ringkas di HP; media ringan `npm run media:lite` (lamejs → MP3, Chromium → WebP) + negosiasi `Accept` di gateway.
- **2026-09-27 (Claude)**: memindahkan fallback origin ke sumber game 01/02/03, entry guard yang tidak menyalakan server saat di-require alat lokal, alamat socket loader aman, label demo jujur di Beauty Drop, `tests/hosting.test.cjs` (3 skenario loader), QA ulang, PRD.
- **2026-09-27 (Claude)**: CSP ditanam sebagai meta karena CDN mengganti header; hub tidak autostart di Electron.
- **2026-09-27 (Claude, sesi cloud, branch PR #1)**: menggabungkan `main` (46a2da0, lalu dbb1d68 & 83eb7ee) ke PR #1. Konflik `hub/server.cjs`: `shouldAutostart()` dan `withMetaCsp()` versi `main` dipakai, digabung dengan `dispatch.cjs`, skin online, dan media ringan; server game tanpa soket (listen no-op saat createApp). Tes 16/16, QA 0 error, alur Beauty Drop HP/tablet lulus di bawah meta CSP.
