# PRD — GAMYSUF ARCADE (hub 5 game Bpedia)

> Sumber kebenaran + catatan serah-terima. AI mana pun yang melanjutkan: baca sampai habis,
> lanjutkan dari **§10 Status**, dan perbarui §10–§11 sebelum berhenti (termasuk karena limit).

## 1. Ringkasan
| Item | Isi |
|---|---|
| Produk | Gamysuf Arcade 1.8.0: dashboard 5 game booth Bpedia + slot game tambahan |
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
| `gacha` · Game 4 | `../04 bipy-gacha-pop` (v1.0.1, katalog v2) | Gacha satu tap, 20 hadiah / 497 kapsul awal, kartu stiker | Market-In 6.0 (3–4 Okt 2026) |
| `heart` · Game 5 | `../05 bipy-heart-parade` (v2.2.4) | Gacha Rp100.000 / Pilih Rp150.000, 7 menu × Zoro/Sanji, 14 kartu BP06, 50 stiker | Market-In 6.0 (3–4 Okt 2026) |

`games/<slug>/` hanyalah **salinan** berkas runtime (`npm run sync`). Ubah game di folder aslinya, lalu sync.
Kelima game memiliki opsi `cloud` di `server.cjs` masing-masing (commit di repo lokal game 01/02/03, perilaku desktop/.exe tidak berubah).

### Market-In 6.0: dua game dalam satu acara

Halaman `/market-in` mengelompokkan Game 4 `/g/gacha/` dan Game 5 `/g/heart/` melalui `eventGroup: market-in-6`. Pengelompokan ini berada di beranda dan halaman acara; kedua game tetap memiliki mekanik, hasil, dashboard petugas, serta data operasional sendiri. Lokasi: Urban Forest Cipete, Jakarta; tanggal 3–4 Oktober 2026. Zoro dan Sanji dijadwalkan hadir pada kedua hari. Jam sesi foto/fanservice diumumkan petugas, sehingga dokumentasi tidak menetapkan jam tanpa sumber.

Game 4 memakai katalog final 20 hadiah/497 kapsul awal, termasuk voucher 25%, 50%, dan Rp100.000. Migrasi katalog v1→v2 menghitung stok tersisa setelah hadiah resmi keluar, mempertahankan foto/verifikasi, status aktif, pengaturan, hadiah buatan petugas, riwayat, serta pending. Voucher yang sudah diatur petugas dipertahankan. Migrasi idempoten, ditulis atomik dengan cadangan data lama, dan versi asing ditolak tanpa reset. Restore tetap mengikuti pengamanan demo + jeda. Stok awal katalog tidak membuktikan stok fisik booth saat ini.

Game 5 menyediakan 14 kartu BP06-001–014 dari tujuh menu: Cinderella's Fit, Princess Twirl, Blossom Whisper, Sweet Offering, Knight's Vow, Warm Hug, dan Pat on Head, masing-masing bersama Zoro dan Sanji. Gacha Booster memilih menu aktif di server; Pilih Kartu tersedia bila diizinkan petugas. Setiap momen memakai artwork, motif animasi, dan varian Bipy; Bipy Original/Jade/Golden Chef menjadi karakter utama. Poster bounty mencoret harga normal FS dalam Rupiah, lalu menampilkan **GRATIS untuk pelanggan Bpedia**. Harga bawaan adalah nilai referensi awal yang perlu dikonfirmasi tim booth, dapat diubah petugas, dan disimpan sebagai snapshot pada kartu. Nilai BERRY fiktif rilis sebelumnya telah dihapus; tidak ada pembayaran di game.

Home memperkenalkan karakter dan syarat belanja: Rp100.000 untuk gacha, Rp150.000 untuk memilih fanservice. Pilihan Zoro/Sanji wajib sebelum masuk meja; kartu gacha ditumpuk dan dikocok Bipy dealer, lalu pelanggan memilih satu kartu tertutup. Pemilihan langsung tidak diacak. Mode resmi memeriksa nominal belanja di server dan mencatat snapshot per tiket. Setiap hasil memiliki stempel bulat Bipy pink yang ikut diekspor.

Trailer berasal dari Gemini. Musik utama Bpedia disusun menjadi suite berulang 350,140 detik dengan dialog Jepang sintetis Zoro dan Sanji, serta jingle Bpedia dari berkas pemilik. Pemutaran menunggu ketukan pengguna. Tombol bisu menghentikan musik, jingle dan efek suara yang dijadwalkan. Keempat belas video momen mencakup 13 animasi ilustrasi dan satu video aksi yang tersedia; provenance dicatat di manifest. Tanpa sentuhan adalah default digital; persetujuan interaksi nyata dan izin dokumentasi dikonfirmasi petugas di booth. Demo online bukan tiket klaim booth.

## 3. Arsitektur
```
hub/server.cjs        gateway + API hub + Studio + penyaji game tambahan (createHub)
hub/rewrite.cjs       awalan URL /g/<slug> (keluar) & pelepasan awalan (body JSON masuk), cookie Path
hub/visitors.cjs      mesin demo per pengunjung (Engine asli game di atas MemoryStore)
hub/registry.cjs      metadata & panduan game bawaan + adapter hasil → kartu/XP
hub/public/market-in.html + js/market-in.js  halaman acara dua game, hadiah, kartu, dan jadwal
hub/players.cjs       profil, XP, level, streak, misi, lencana, album, peringkat (JSON di data dir)
hub/custom-games.cjs  slot game tambahan (ZIP HTML5 / tautan), sampul, pengaturan arcade
hub/public/           index.html (arcade), studio.html, css/, js/hub.js, js/studio.js, js/inject.js, assets/
games/{spin,nyapit,drop,gacha,heart}/  salinan runtime game
scripts/              sync-games.cjs, capture(-electron).cjs, package-hostinger.cjs
tests/*.test.cjs      tes gateway, isolasi pengunjung, PIN, XP, Studio, aset, migrasi, dan hosting
```

### Alur permintaan
1. `/g/<slug>/*` → gateway memeriksa Origin (POST wajib same-origin), menulis ulang Host/Origin ke server internal game (127.0.0.1:port acak), menambah header `x-gamysuf-visitor`, lalu memproksi.
2. Respons HTML/CSS/JS/JSON diberi awalan `/g/<slug>`; cookie sesi game dipindah ke `Path=/g/<slug>/api/` (+`Secure` di HTTPS); halaman utama menerima tema bersama dan `inject.js` (game bar, avatar/profil, screenshot lokal, navigasi, suara, layar penuh, panduan, notifikasi XP).
3. Di dalam game (mode `cloud`): permintaan tanpa sesi admin → `cloud.engineFor()` = mesin demo milik pengunjung itu (stok asli aman, tidak ada tabrakan antar pengunjung). Perangkat yang login dashboard game → mesin asli (mode resmi booth).
4. Respons hasil (`/api/play`, `/api/spin`, `/api/bonus`) dengan `demo:true` dicatat `players.record()` → XP/kartu/misi/lencana (anti-curang karena dibaca di server, idempoten per requestId).

### Keamanan
- `ADMIN_PIN` (6–12 digit) ditulis ke autentikasi Studio serta game 1–4 saat start. Game 5 memakai kode booth 1234 yang ditampilkan sesuai permintaan pemilik, terisolasi dari Studio/game lain; opsional `HEART_BOOTH_PIN` dapat menggantinya. Tanpa ADMIN_PIN: semua login terkunci (503), demo tetap bisa dimainkan.
- Ganti PIN/password dari dashboard game dimatikan di cloud (409) — PIN hanya dari env.
- Studio: sesi cookie `gamysuf_admin` (HttpOnly, SameSite=Strict, 8 jam), kunci 60 dtk setelah 5 PIN salah, POST wajib Origin + header `x-gamysuf-client: hub`.
- ZIP game tambahan: tolak path traversal/absolut, whitelist ekstensi, ≤4000 berkas, ≤200 MB; disajikan di `/play/<slug>/` dengan CSP longgar khusus game (hanya pemilik yang bisa unggah).
- Data persisten di `~/gamysuf-data` (di luar `hbuilds/` Hostinger yang dibuat ulang setiap deploy).

## 4. Fitur pemain (engagement sehat, tanpa pembelian)
- Onboarding: nama panggung + 6 avatar Bipy full body, galeri dan pratinjau karakter yang sama pada profil. ID profil lama dipertahankan.
- Tema terang/gelap tersimpan dan digunakan pada dashboard serta lima game; logo Gamysuf 3D serta wordmark resmi Bpedia pink/putih mengikuti tema. Album beranda berupa slider ringkas dengan jeda, sentuh dan keyboard.
- Semua game mencoba musik saat dibuka, memulihkan pada interaksi pertama bila autoplay dibatasi browser, dan menghormati pilihan bisu pemain.
- XP: main +10, belum beruntung +5, kartu baru +25, legendaris pertama +50, bonus harian +20, misi +30/+40/+50, lencana +30. Batas 60 permainan ber-XP per hari.
- Level: level n butuh 100 + 50(n−1) XP.
- Streak harian (WIB), 3 misi harian (main 3×, 2 game berbeda, 1 kartu baru), 11 lencana.
- Album 91 kartu (16 Spin + 18 Nyapit + 23 Drop termasuk 5 fanservice + 20 Gacha Pop + 14 Heart Parade), rarity Legendaris/Epik/Langka/Umum. Gacha Pop: bundling = legendaris, kolab karakter = epik, voucher = langka, produk = umum. ID kartu Heart Parade lama tetap dipakai; pergantian artwork tidak mereset koleksi/XP.
- Peringkat mingguan (reset Senin 00.00 WIB) & sepanjang masa; kode pemulihan untuk pindah perangkat.
- Panduan: cara kerja 4 langkah, aturan main adil, tabel XP, FAQ, modal "Cara main" per game (langkah, kontrol, tips).
- Kejujuran: online selalu demo; hadiah fisik hanya di booth. Beauty Drop menampilkan teks "simulasi demo" pada hasil demo.

## 5. Portal petugas (`/studio`)
Lima tautan dashboard admin/petugas dan tautan game. Tidak ada login pemilik terpusat. Pengaturan serta autentikasi dilakukan pada masing-masing game. API admin hub lama tetap dilindungi untuk kompatibilitas data; tidak ada UI publik untuk operasinya.

## 6. Menambah game
- Slot ZIP/tautan lama tetap dibaca oleh server; UI tambah game terpusat sudah dihapus sesuai revisi 1.8.0.
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
npm test                        # tes hub dan hosting; hasil v1.6.0 pada §10
npm run qa                      # 18 tangkapan layar + daftar error konsol (artifacts/qa/1600x900)
npm run qa -- 1366x768
npm run qa:responsive           # Chromium/Firefox/WebKit + gameplay; perlu Playwright beserta browsernya
node scripts/hub-interaction-qa.cjs # dialog, keyboard, koneksi, preferensi, Studio
node scripts/capture-gameplay-covers.cjs # tinjau sampul di artifacts/cover-candidates
npm run package:hostinger
```
Tes game asli: `npm test` di folder 01 (83), 02 (54), 03 (29).

Target responsif: ponsel 280–430 px potret/lanskap; foldable 280×653, 344×882, 717×512, 884×1104; tablet 768–1366; laptop 1280–1440; desktop 1920. Uji Chromium, Firefox, dan WebKit, dua tema, kontrol sentuh/mouse/keyboard, fokus dialog, reduced motion, audio, pemulihan koneksi, kartu hasil, serta dashboard petugas. Kontrol penting harus terlihat di atas game bar, tanpa overflow horizontal; target sentuh dashboard minimal 44 px. Emulasi viewport bukan bukti uji seluruh perangkat fisik.

## 9. Keputusan terkunci
- Satu proses Node untuk hub + 5 game (satu web app Hostinger, satu domain).
- Awalan jalur `/g/<slug>/` + penulisan ulang otomatis, bukan menulis ulang kode front-end game.
- Pengunjung online = mesin demo pribadi; mode resmi hanya perangkat booth yang login.
- XP dihitung di server dari respons game, bukan dari laporan browser.

## 10. Status (PERBARUI SETIAP BERHENTI)

**3 Oktober 2026 · 1.8.0:** Revisi 16 komentar browser diterapkan pada Game 5 sumber 2.3.0. Kartu dipilih satu ketukan, kotak tiket pemain dan blok musik Home dihapus, flip poster bounty langsung, duo Bipy konsisten dan trailer Gemini baru. Event tampil sebagai Marketing 6.0; `/studio` menjadi portal lima dashboard petugas. Validasi dan status deployment terkini ada di [RELEASE-1.8.0.md](RELEASE-1.8.0.md). Catatan versi lama di bawah adalah riwayat.

**3 Oktober 2026 · 1.7.0:** Game 5 2.2.4 menyediakan home pengenalan, pilihan karakter wajib, gacha belanja Rp100.000 dengan atraksi Bipy dan pilihan kartu tertutup, serta pilih langsung belanja Rp150.000. Seluruh permukaan kartu bisa diketuk. Tema terang/gelap memakai pink guideline Bpedia; 50 gambar pemilik dipakai di galeri, pratinjau dan pose dealer. Server memeriksa nominal, demo tetap terpisah, stempel Bipy masuk ekspor, dan setiap menu memiliki cuplikan. Musik Bpedia menjadi suite 350,140 detik dengan dialog Jepang sintetis. Bukti pengujian dan produksi dicatat pada [RELEASE-1.7.0.md](RELEASE-1.7.0.md). Angka 1.6.x di bawah merupakan riwayat.

**2 Oktober 2026 · 1.6.1 live:** Game 5 menjadi Bipy Grand Line Desire, kartu dibuka langsung, trailer masuk pembuka, Bipy terpisah dari leader, poster proporsional, dan tombol tema serta Demo/Main Tercatat eksplisit. Sumber 40/40 + check, hub 67/67, UI 21/21, responsif Game 5 4.140/4.140, animasi penuh 14 kartu lulus, dan paket 601 berkas lulus smoke test terisolasi. Produksi: 93/93 endpoint/hash/aset, 106/106 UI dan 107/107 gameplay demo. hPanel melaporkan main/49bdd502 selesai pukul 17:19 WIB. Lihat [RELEASE-1.6.1.md](RELEASE-1.6.1.md). Bukti 1.6.0 berikut adalah riwayat.

**2 Oktober 2026 · Gamysuf Arcade 1.6.0 sudah live di [gamysuf.fun](https://gamysuf.fun).** Lima game terdaftar; Game 4 dan Game 5 dikelompokkan pada halaman Market-In. Sumber game sudah disinkronkan, matriks lintas browser sudah lulus, paket Hostinger sudah diuji terisolasi, dan rilis produksi telah diverifikasi. Catatan rilis: [RELEASE-1.6.0.md](RELEASE-1.6.0.md).

| Bukti selesai | Hasil dan batas cakupan |
|---|---|
| Sumber Game 4 (setelah sinkronisasi final) | 30/30 tes + `npm run check`; QA Game 4 336/336; katalog 20 hadiah/497 kapsul dan migrasi aman |
| Sumber Game 5 | 37/37 tes + `npm run check`; kontrak engine/server Heart Parade 2.0.0 |
| Hub setelah sinkronisasi | 64/64 tes |
| QA Market-In terarah | 110/110 pemeriksaan |
| Nyapit sumber | 18 pemeriksaan browser + 54 tes |
| QA Nyapit melalui hub terarah | 124/124 pemeriksaan |
| QA Heart Parade ponsel terarah (putaran sebelumnya) | 85/85 pemeriksaan |
| UI Heart Parade setelah sinkronisasi final | 18/18 pemeriksaan UI dan tata letak; ekspor kartu 1080×1508 dan poster 1080×1528 |
| Suite tambahan sebelumnya | 866/866 pemeriksaan; cakupan tambahan, bukan pengganti matriks penuh setelah perubahan terakhir |
| Matriks responsif final | 2.331/2.331 pemeriksaan Chromium, Firefox, dan WebKit; ponsel, foldable, tablet, laptop, dan desktop |
| Paket Hostinger | 600 berkas; 134.124.400 byte; smoke test terisolasi lulus untuk hub, Market-In, Game 4, Game 5, API, video, audio, MIME, dan byte range; SHA-256 `cd0125d4bf5fa92f79b0b01124fbaf11ee15c7819dcafe1210e0dfba3ca52047` |
| Produksi | 89/89 endpoint, hash kode, dan aset lulus; katalog 1.6.0, 14 artwork Heart Parade unik, 7 varian Bipy, 4 audio, 1 video, serta byte range HTTP 206 terverifikasi |
| UI live | 50/50 pemeriksaan dashboard dan game lulus tanpa error konsol, HTTP, atau jaringan yang belum terverifikasi |

Matriks memakai browser dan viewport emulasi; perangkat fisik tetap dapat memiliki perilaku vendor yang berbeda. Bukti versi lama hanya berlaku pada rilis yang disebutkan di berkasnya. Bukti produksi 1.6.0 tersimpan di `artifacts/deployment-1.6.0.json`, `artifacts/live-ui-1.6.0/report.json`, dan `artifacts/live-image-verification/report-1.6.0.json`.

### Catatan runtime Hostinger
- Data produksi berada di luar direktori build (`~/gamysuf-data`); jangan hapus atau reset saat deployment.
- Loader Hostinger dapat membajak `http.Server.prototype.listen`; `createHub` memakai `net.Server.prototype.listen` asli saat membuat game, kemudian gateway memanggil handler game melalui `dispatchInMemory`.
- `shouldAutostart()` menangani entry loader dan pengecualian alat/test; `tests/hosting.test.cjs` memeriksa perilakunya. Hub tidak autostart dalam Electron QA.
- CDN dapat mengganti header CSP; kebijakan juga ditanam melalui meta CSP. Pemeriksaan produksi harus menguji respons yang benar-benar disajikan CDN.
- Push ke branch produksi dapat memicu deployment. Bukti lokal, commit, paket, dan produksi harus dicatat sesuai tahapnya.

## 11. Log serah-terima

- **2026-10-03 (Codex, revisi browser 1.8.0)**: 47 tes sumber dan 75 tes integrasi lulus; 558 pemeriksaan browser serta 15 pemeriksaan panel belanja lokal lulus. Animasi Gemini baru dibuat dan diunduh; dua adegan kartu menggunakan potongan master tersebut. Produksi harus cocok dengan hash rilis dan laporan RELEASE-1.8.0.md.

- **2026-10-03 (Codex, verifikasi akhir 1.7.0)**: sumber Game 5 2.2.4 melalui `b5bd236` menyederhanakan pengaturan volume efek saat bisu. Audio produksi 29/29 di tiga browser dengan sembilan hasil demo lulus; tes sumber 47/47 dan integrasi 75/75 diperiksa ulang. CSS 2.2.3 serta seluruh aset tetap identik dengan 361 pemeriksaan sentuh/tema yang sudah lulus. Endpoint/hash produksi 186/186 dan paket akhir 692 berkas lulus; SHA-256 dan catatan batasan dicatat di `RELEASE-1.7.0.md`.

- **2026-10-02 (Codex, produksi 1.7.0)**: Game 5 sumber 2.2.3 sudah dipublikasikan melalui implementasi `ee94b25`. Klik seluruh kartu, warna guideline terang/gelap dan seluruh 50 gambar terverifikasi: 361/361 pemeriksaan sentuh/galeri live pada 12 kasus. Perbaikan tinggi tombol Firefox menjaga pilihan berulang tetap dapat diklik. Tes sumber 47/47, integrasi 75/75 dan endpoint/aset live 186/186 lulus; paket 692 berkas lulus lima pemeriksaan terisolasi. Bukti lengkap, hash ZIP dan batasan media ada di `RELEASE-1.7.0.md`; PRD PDF/Word empat halaman ada di `outputs/heart-parade/`.

- **2026-10-02 (Codex, kandidat 1.7.0)**: menerapkan alur pembelian/karakter/dealer/kartu sesuai brief terbaru, suite musik Bpedia dan dialog Jepang, 14 video momen, POV Sanji, stempel Bipy, laporan nominal per tiket, tema, kontrol sentuh dan PIN Game 5 terpisah. PRD Game 5 serta provenance media diperbarui; verifikasi produksi dicatat setelah deployment.

- **2026-10-02 (Codex, produksi 1.6.1)**: menyelesaikan delapan komentar browser Game 5 dan bug tambahan pada ukuran ilustrasi, poster, lifecycle flip/video, serta cache. Commit implementasi `d53c5cab`, cache `49bdd502`, produksi 1.6.1 terverifikasi dengan 93 pemeriksaan berkas/aset, 106 UI, dan 107 gameplay demo. Game tetap `/g/heart/`, ID BP06 dan data resmi dipertahankan.

- **2026-10-02 (Codex, persiapan 1.6.0)**: menyelaraskan dokumentasi lima game, halaman Market-In 3–4 Oktober, katalog Game 4 dan migrasi, kartu BP06/mode/kenyamanan Game 5, serta album 91 kartu. Hasil lokal yang selesai dan gerbang rilis tersisa dicatat pada §10 dan `RELEASE-1.6.0.md`. Catatan persiapan `RELEASE-1.5.1.md` digantikan oleh catatan 1.6.0 agar versi tidak ambigu.
- **2026-10-02 (Codex, produksi 1.6.0)**: mendorong rilis ke `main`, memverifikasi katalog produksi 1.6.0, 89 endpoint/hash/aset, byte range audio/video, dan 50 pemeriksaan UI live. Game 4 dan Game 5 dapat diakses melalui halaman Market-In dan rute masing-masing.
- **Riwayat 1.5.0–1.1.0**: lihat masing-masing `docs/RELEASE-<versi>.md` dan berkas bukti dengan versi yang sama. Hasil lama tidak dijadikan bukti kelulusan rilis 1.6.0.
