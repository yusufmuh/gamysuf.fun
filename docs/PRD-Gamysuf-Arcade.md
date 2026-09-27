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
scripts/              sync-games.cjs, media-lite.cjs, capture.cjs (+ -electron / -playwright), responsive-qa.cjs, hub-interaction-qa.cjs, capture-gameplay-covers*.cjs, verify-deployment.cjs, package-hostinger.cjs
tests/*.test.cjs      hub.test.cjs + hosting.test.cjs (gateway, dispatch, aset biner, media ringan, isolasi pengunjung, PIN, XP, Studio, keamanan ZIP, loader Hostinger, meta CSP)
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
- Onboarding: nama panggung + 6 avatar Bipy full body, galeri dan pratinjau karakter yang sama pada profil. ID profil lama dipertahankan.
- Tema terang/gelap tersimpan di perangkat; logo Gamysuf Arcade bertema tulip Bpedia; album beranda berupa slider ringkas dengan jeda, sentuh dan keyboard.
- XP: main +10, belum beruntung +5, kartu baru +25, legendaris pertama +50, bonus harian +20, misi +30/+40/+50, lencana +30. Batas 60 permainan ber-XP per hari.
- Level: level n butuh 100 + 50(n−1) XP.
- Streak harian (WIB), 3 misi harian (main 3×, 2 game berbeda, 1 kartu baru), 11 lencana.
- Album 57 kartu (16 Spin + 18 Nyapit + 23 Drop termasuk 5 fanservice), rarity Legendaris/Epik/Langka/Umum.
- Peringkat mingguan (reset Senin 00.00 WIB) & sepanjang masa; kode pemulihan untuk pindah perangkat.
- Panduan: cara kerja 4 langkah, aturan main adil, tabel XP, FAQ, modal "Cara main" per game (langkah, kontrol, tips).
- Kejujuran: online selalu demo; hadiah fisik hanya di booth. Beauty Drop menampilkan teks "simulasi demo" pada hasil demo.
- v1.1 (engagement): gelar per level (Pendatang Baru Lv1, Pemburu Hoki Lv3, Kolektor Muda Lv5, Bintang Arcade Lv8, Master Kapsul Lv12, Legenda Bpedia Lv16); progres setiap lencana + kartu "Target berikutnya"; "Saran Bipy" di hero (bonus harian → misi 2 game → game dengan kartu terbanyak yang belum ditemukan); pita LIVE (jumlah main hari ini + kartu legendaris/epik, level kelipatan 5, album lengkap; di memori, 24 terakhir); popularitas per game; progres per game di modal Cara main; hitung mundur musim mingguan; tombol Bagikan progres (Web Share/salin); confetti saat naik level/lencana; toast ringkas di HP.

### Responsif & perangkat (skin online)
Tata letak HP/tablet/lipat utama kini ada di game itu sendiri (rilis web 1.1.0 di `games/`, dari sumber 01/02/03). Skin di `hub/public/skins/` (tidak tertimpa `npm run sync`) hanya menambal yang belum ditangani game; setiap kali game di-sync, ukur ulang dengan skin menyala/mati dan buang aturan skin yang sudah tidak perlu:
- **Beauty Drop** (`drop.css/js`): tanpa aturan tata letak (dipegang game). Tambahan: halaman tidak melebar 1 px oleh dekorasi, gelembung Zoro tidak terpotong di tablet mendatar, getar halus (Android) saat DROP & kartu mekar, papan digulir ke tengah bila tidak terlihat saat DROP, kartu hologram ikut kemiringan HP (Android; iOS dilewati agar tanpa izin sensor). Label kode demo jujur ("Kode simulasi") dari game dipakai apa adanya.
- **Spin** (`spin.css`): teks 5–8 px di HP dinaikkan; orbit dekoratif roda tidak melebarkan halaman (tanpa skin: 27–100 px scroll samping di HP/lipat/tablet). Pemutar musik HP diatur game.
- **Nyapit** (`nyapit.css`): mesin capit di urutan pertama di HP (tanpa skin tombol capit ±1185 px di bawah); dialog koin muat di HP mendatar.
- `inject.js`: tombol GAMYSUF 44 px ikon saja di HP, disembunyikan saat dialog terbuka (versi `main`).
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
npm test                        # tes hub + hosting
npm run qa                      # 16 tangkapan layar + error konsol + cek scroll horizontal (artifacts/qa/1600x900)
npm run qa -- 1366x768          # juga 390x844 untuk HP
CAPTURE_ENGINE=chromium npm run qa   # paksa Playwright/Chromium walau Electron ada
npm run qa -- covers            # perbarui sampul game dari tampilan terbaru
npm run qa:responsive           # Chromium/Firefox/WebKit + gameplay; perlu Playwright beserta browsernya
node scripts/hub-interaction-qa.cjs # dialog, keyboard, koneksi, preferensi, Studio
node scripts/capture-gameplay-covers.cjs # tinjau sampul di artifacts/cover-candidates
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
**Rilis web 1.2.0 (Codex, 2026-09-27):** menindaklanjuti komentar browser pemilik: maskot sambutan tidak lagi terpotong; galeri enam karakter full body dengan pratinjau dan pilihan tersimpan; logo tulip Gamysuf Arcade; tema terang/gelap; album bergerak yang menampilkan sedikit kartu pada HP. Validasi profil atomik diperbaiki. Avatar 332/332, tema 40/40, interaksi 24/24, tes hub 13/13; tur Electron 16 tangkapan tanpa error konsol. Catatan lengkap di `docs/RELEASE-1.2.0.md`; bukti publikasi akhir di `artifacts/deployment-1.2.0.json`. Sumber game 01/02/03 tidak berubah pada rilis ini.

**Rilis web 1.1.0 (Codex, 2026-09-27):** dashboard memiliki navigasi sentuh, game sebelum misi, pilihan game unggulan yang stabil, pintasan game terakhir, pemulihan koneksi, fokus dialog, kontrol animasi, dan Studio responsif. Spin/Nyapit memperbaiki musik, arena, overflow, dan siklus audio. Drop menempatkan seluruh papan dan tombol dalam layar potret, menjaga animasi saat resize, membatasi loop cahaya, mengatur partikel berdasarkan waktu, memperbesar tombol, serta memperbaiki dialog dan pemulihan audio. Logo, maskot, hasil server, stok booth dan mode demo tetap memakai sumber asli.

Validasi rilis dan deployment dicatat di `docs/RELEASE-1.1.0.md`. Paket arsip: `release/Gamysuf-Arcade-1.1.0-Hostinger.zip`. Salinan `games/` berasal dari sumber saudara 01/02/03; perubahan game selanjutnya tetap dilakukan di sumber tersebut.

Pembaruan 2026-09-27 (Codex): ketiga sampul hub di `hub/public/assets/covers/` diganti tangkapan gameplay asli berukuran 1200×675. Spin menampilkan arena roda lengkap, Nyapit menampilkan kabinet capit beserta bola, dan Drop menampilkan kapsul yang sedang memantul di papan pin bersama Bipy. Sumber tangkapan sementara dan `capture.json` ada di `artifacts/cover-candidates/`; skrip reproduksi ada di `scripts/capture-gameplay-covers*.cjs`.

Terakhir diperbarui: 2026-09-27 oleh Codex. **Rilis web 1.2.0**, tujuan https://gamysuf.fun. Bukti publikasi akhir: `artifacts/deployment-1.2.0.json` (versi, status HTTP dan verifikasi aset live).

Pembaruan 2026-09-27 (Claude, PR #1 dari `claude/zen-meitner-wrzrju`): menggabungkan `main` 0f0ac25 dengan skin online per game (`hub/public/skins/`), media ringan (`hub/media-lite/`, MP3/WebP), `hub/dispatch.cjs`, server game tanpa soket, dan fitur engagement v1.1 (gelar, target lencana, Saran Bipy, pita LIVE, bagikan, confetti). Merge PR #1 ke `main` = deploy produksi.

| Area | Status |
|---|---|
| Patch mode cloud di game 01/02/03 (+ fallback origin) | ✅ tes 83 / 54 / 29 lulus, sumber = salinan `games/` (sync tanpa diff) |
| Hub: gateway (`dispatch.cjs`), visitors, players, custom games, Studio, API | ✅ tes hub + hosting lulus (loader Hostinger, meta CSP, media ringan) |
| Front-end arcade + Studio + inject | ✅ 616 pemeriksaan responsif + 24 interaksi, Chromium/Firefox/WebKit (main); QA Chromium PR #1 0 error konsol, 0 scroll horizontal |
| Responsif per game (skin drop/spin/nyapit) & dashboard ≤380 px | ✅ di PR #1; skin menyesuaikan diri dengan tata letak game 1.1.0 dari `main` (lihat §3 Responsif) |
| Media ringan (MP3/WebP) | ✅ di PR #1: audio 51,5→5,5 MB, gambar 33,6→4,7 MB; halaman HP 0,7–1,6 MB |
| CI GitHub Actions (npm test + paket Hostinger) | ✅ `.github/workflows/ci.yml` |
| GitHub | ✅ `github.com/yusufmuh/gamysuf.fun` (**publik** — pertimbangkan jadikan privat); PR #1 dari `claude/zen-meitner-wrzrju`, merge oleh pemilik = deploy produksi |
| Deploy Hostinger | Node 20, repo `yusufmuh/gamysuf.fun` branch main, entry `hub/server.cjs`; lingkungan dan data produksi dipertahankan. Bukti per rilis: `artifacts/deployment-<versi>.json` |
| Sisa pembersihan (keputusan pemilik) | ⏳ website kosong `gamysuf-fun-508313` & `gamysuf-fun-912185.hostingersite.com` (halaman default PHP) bisa dihapus |
| Keamanan | ⚠️ `.git/config` lokal menyimpan token GitHub (ghp_…) di URL remote: cabut token itu dan pakai `gh auth login` |

### Catatan runtime Hostinger (penting untuk AI berikutnya)
- Loader Node Hostinger membajak `http.Server.prototype.listen` dan tidak selalu menjalankan `hub/server.cjs` sebagai `require.main`.
- Karena itu: (a) selama `createApp` game, `createHub` mengganti `listen()` dengan penanda siap tanpa soket — server internal game tidak terikat ke port/soket mana pun dan memakai origin cadangan `127.0.0.1:4300`; (b) gateway memanggil handler game **in-memory** lewat `hub/dispatch.cjs`, bukan lewat TCP; (c) `shouldAutostart()` menyalakan server kecuali di-require dari `tests/`, `scripts/`, `artifacts/` atau di dalam Electron (paksa dengan `GAMYSUF_AUTOSTART=1/0`).
- Tes `tests/hosting.test.cjs` meniru kondisi ini; jalankan sebelum push karena push ke `main` = deploy produksi.
- CDN Hostinger (hcdn) **mengganti header Content-Security-Policy** menjadi `upgrade-insecure-requests`. Karena itu `withMetaCsp()` menanam kebijakan yang sama sebagai `<meta http-equiv>` di semua HTML (hub, game via gateway, game tambahan). Header lain (X-Frame-Options, nosniff, Referrer-Policy) tetap lolos. Skin online (`/hub/skins/…`) dan media ringan berasal dari origin yang sama sehingga lolos kebijakan itu.
- Hub tidak pernah autostart di dalam Electron (alat QA); `scripts/capture-electron.cjs` juga memaksa `GAMYSUF_AUTOSTART=0`.

## 11. Log serah-terima
- **2026-09-27 (Codex, web 1.2.0)**: perbaikan empat komentar UI pemilik (avatar full body, logo, tema, slider album). Asset master Bpedia tetap utuh; prompt/provenance varian baru tercatat. Cek galeri/avatar/tema memakai data lokal terisolasi; deployment tetap melalui main ke Hostinger.
- **2026-09-27 (Codex, web 1.1.0)**: perbaikan dashboard dan tiga game lintas layar; QA browser dengan data sementara yang terpisah dari produksi; paket Hostinger dan skrip regresi responsif. Detail hasil akhir pada catatan rilis 1.1.0.
- **2026-09-27 (Claude)**: membangun hub dari nol, patch mode cloud di 3 game, sampul via Electron, QA, tes, paket Hostinger, PRD ini.
- **2026-09-27 (agen lain, identitas git pemilik)**: 4 commit perbaikan Hostinger (entry guard, isolasi listen, dispatch in-memory, fallback origin), membuat repo `yusufmuh/gamysuf.fun`, deploy ke gamysuf.fun.
- **2026-09-27 (Claude, sesi cloud, branch PR #1)**: v1.1.0 — entry guard tidak menyalakan server kedua saat dimuat skrip/tes; dispatch dipindah ke `hub/dispatch.cjs` (statusCode implisit, writeHead dengan reason, streaming aset biner, 5xx untuk error/batas waktu); beranda tidak melebar (album); celah Studio; `/hub-api/session`, `/hub-api/health`; fitur engagement v1.1 (§4); meta OG/canonical; robots menutup `/g/*/admin.html`; QA Playwright + Chromium dengan cek scroll horizontal; CI GitHub Actions.
- **2026-09-27 (Claude, sesi cloud, branch PR #1)**: responsif semua perangkat lewat skin online `hub/public/skins/` (drop: tata letak HP/tablet/lipat, getar, tilt, layar penuh, sembunyikan kode klaim demo; spin: header & teks HP; nyapit: urutan mesin & dialog koin), dashboard ≤380 px & meta PWA iOS, `inject.js` ringkas di HP; media ringan `npm run media:lite` (lamejs → MP3, Chromium → WebP) + negosiasi `Accept` di gateway.
- **2026-09-27 (Claude)**: memindahkan fallback origin ke sumber game 01/02/03, entry guard yang tidak menyalakan server saat di-require alat lokal, alamat socket loader aman, label demo jujur di Beauty Drop, `tests/hosting.test.cjs` (3 skenario loader), QA ulang, PRD.
- **2026-09-27 (Claude)**: CSP ditanam sebagai meta karena CDN mengganti header; hub tidak autostart di Electron.
- **2026-09-27 (Codex)**: menangkap ulang ketiga sampul dari layar gameplay sebenarnya melalui Electron/gateway lokal, meninjau komposisi 16:9, menyimpan JPEG 1200×675 dan skrip reproduksi tanpa mengubah artwork game.
- **2026-09-27 (Claude, sesi cloud, branch PR #1)**: menggabungkan `main` (46a2da0, lalu dbb1d68 & 83eb7ee) ke PR #1. Konflik `hub/server.cjs`: `shouldAutostart()` dan `withMetaCsp()` versi `main` dipakai, digabung dengan `dispatch.cjs`, skin online, dan media ringan; server game tanpa soket (listen no-op saat createApp). Tes 16/16, QA 0 error, alur Beauty Drop HP/tablet lulus di bawah meta CSP.
- **2026-09-27 (Claude, sesi cloud, branch PR #1)**: menggabungkan `main` 0f0ac25 (rilis web 1.1.0 Codex: tata letak sentuh di game, `responsive.css`, sampul gameplay, QA lintas browser). Konflik: `hub.js` (toggle animasi & `storage` versi `main` dipakai; Saran Bipy, pita LIVE, gelar, target lencana, bagikan, confetti dipertahankan dan ikut toggle animasi; rotasi otomatis kabinet tetap dimatikan seperti `main`), `index.html` (urutan game→misi versi `main` + elemen v1.1 branch), `inject.js` (versi `main`), `server.cjs` (inject.js ber-versi + skin + dispatch.cjs), README/PRD/package.json (`qa:responsive` + `media:lite`). Pengukuran skin menyala/mati di 6 perangkat: tata letak Beauty Drop dari game lebih baik (tombol Beauty Drop terlihat di layar pertama), jadi aturan tata letak di `drop.css` dibuang; skin Spin (scroll samping) & Nyapit (tombol capit) tetap diperlukan. `media:lite` dibuat ulang untuk sampul baru; bug `file:null` di skrip diperbaiki. Tes 16/16, QA 1600×900 & 390×844 0 error.
- **2026-09-27 (Claude, sesi cloud, branch PR #1)**: menggabungkan `main` e5e12e9 (rilis 1.2.0: avatar karakter, tema, carousel koleksi). Hanya tabel status PRD yang konflik. `media:lite` dibuat ulang: 6 avatar karakter + logo v2 dari ±7,1 MB PNG menjadi ±0,8 MB WebP (dicek visual berdampingan). Tes 16/16, QA 1600×900 & 390×844 0 error, interaksi hub 24/24, avatar QA 214/214 & tema QA 27/27 (Chromium; Firefox/WebKit tidak tersedia di sesi cloud).
