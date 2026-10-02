# PRD — Bipy Grand Line Desire

**Game 05 · Grand Line Desire 2.1.0 · Gamysuf Arcade 1.6.1 · 2 Oktober 2026**

Pemilik produk: Muhammad Yusuf / Bpedia. Sumber kode: `../05 bipy-heart-parade`. Rute: `https://gamysuf.fun/g/heart/`. Dashboard petugas: `/g/heart/admin.html`.

## 1. Konsep dan tujuan

Bipy Grand Line Desire adalah permainan kartu fanservice romantis untuk booth Bpedia di Market-In 6.0. Pemain membuka satu kartu momen bersama Zoro atau Sanji. Setiap kartu dirancang seperti trading card bergaya One Piece Card Game (OPCG): nomor kartu, kelangkaan, cost, power, counter, atribut, warna, kru, teks efek, dan poster bounty. Daya tarik utama: 14 ilustrasi adegan berbeda, animasi pembukaan per kartu, poster bounty berisi harga normal fanservice yang dicoret lalu ditutup **GRATIS** untuk pelanggan Bpedia, trailer Gemini, serta jingle Bpedia.

Sasaran utama adalah pengunjung dewasa penggemar cosplay, khususnya perempuan, yang ingin pengalaman personal, playful, dan mudah difoto. Online menghasilkan kartu digital demo; interaksi fisik hanya terjadi di sesi booth yang dikelola petugas. Permainan dimulai langsung memakai setelan aman tanpa sentuhan dan tanpa dokumentasi. Pilihan interaksi nyata tetap dikonfirmasi langsung oleh petugas dan cosplayer di booth.

**Cosplayer Zoro dan Sanji hadir di booth Bpedia dua hari penuh, 3 dan 4 Oktober 2026**, Urban Forest Cipete. Teks jadwal bawaan: *Zoro & Sanji hadir 3–4 Okt 2026, dua hari penuh di booth Bpedia · Urban Forest Cipete.*

Tujuan operasional: memancing ketertarikan dari luar booth, memperjelas nilai momen yang didapat, mengatur antrean per cosplayer, dan membawa pengunjung kembali ke ekosistem Bpedia. Game ini tidak memproses pembayaran dan tidak menjual peluang.

## 2. Dasar sumber

- `market 6.0.pdf`: proposal visual 36 halaman. Materi venue menyebut Urban Forest Cipete, 3–4 Oktober 2026. Angka target/historis di proposal bukan hasil aktual acara ini.
- Kehadiran cosplayer 3–4 Oktober (dua hari) berasal dari arahan pemilik untuk rilis 1.6.0.
- JPEG logo Market-In dari pengguna menjadi referensi floral/Y2K. Pola papan catur pada JPEG adalah piksel gambar, bukan transparansi.
- Game 03 `03 bipy-beauty-drop`: referensi alur pilih cosplayer, hasil dari server, mode demo/booth, dan pemulihan pending.
- Identitas: `02_Brand Guidline/02_Bipy/bipy-full-berdiri.png` dan `03_Warna_Font/bpedia-tokens.css`. Bipy pink dan wordmark Bpedia dari master; varian jade/gold adalah kostum tematik.
- Konsep karakter merujuk One Piece. Aset tidak dinyatakan sebagai kolaborasi resmi atau bukti izin komersial.

## 3. Lingkup rilis 2.1.0

Termasuk: dua host, tujuh menu, 14 kartu BP06, dua cara bermain (gacha booster dan pilih kartu), animasi per kartu, poster bounty dengan harga normal yang dapat diubah petugas, jingle dan BGM, trailer utama di area pembuka, tombol Demo/Main tercatat, tema terang/gelap, alur satu klik tanpa dialog persetujuan, unduhan kartu, antrean per cosplayer, kuota harian WIB, ekspor CSV/backup JSON, migrasi data 1.5.x, serta integrasi album/XP/dashboard arcade.

Di luar rilis: pembayaran online, penjualan peluang gacha, integrasi transaksi toko, reservasi lintas booth, login pelanggan, rekaman kamera otomatis, dan publikasi Steam/marketplace. Distribusi di toko aplikasi memerlukan pemeriksaan hak karakter, font, audio, dan materi brand secara terpisah.

## 4. Mekanik kartu

### 4.1 Gacha booster vs pilih kartu

- **Gacha booster**: pemain membuka "booster" dan server memilih satu menu secara seragam di antara menu aktif untuk host yang dipilih. Kelangkaan R/SR/SEC hanya kosmetik; tidak memengaruhi peluang. Kecepatan klik dan animasi tidak memengaruhi hasil.
- **Pilih kartu**: pemain memilih menu langsung. Hanya tersedia jika petugas mengaktifkan "Izinkan pilih kartu langsung", dan di perangkat booth tetap memerlukan verifikasi misi.

Kedua cara menghasilkan kartu dan ID yang sama (`<host>-<menu>`), sehingga album arcade lama tetap kompatibel.

### 4.2 Kartu bergaya OPCG

| No. kartu | Menu | Host | Rarity | Cost | Power | Counter |
|---|---|---|---|---:|---:|---:|
| BP06-001 | Cinderella's Fit | Zoro | SR | 5 | 6000 | 1000 |
| BP06-002 | Princess Twirl | Zoro | R | 4 | 5000 | 1000 |
| BP06-003 | Blossom Whisper | Zoro | R | 3 | 4000 | 2000 |
| BP06-004 | Sweet Offering | Zoro | R | 2 | 4000 | 2000 |
| BP06-005 | Knight's Vow | Zoro | SEC | 7 | 9000 | 2000 |
| BP06-006 | Warm Hug | Zoro | SR | 6 | 7000 | 1000 |
| BP06-007 | Pat on Head | Zoro | SR | 2 | 5000 | 1000 |
| BP06-008 | Cinderella's Fit | Sanji | SR | 5 | 6000 | 1000 |
| BP06-009 | Princess Twirl | Sanji | R | 4 | 5000 | 1000 |
| BP06-010 | Blossom Whisper | Sanji | R | 3 | 4000 | 2000 |
| BP06-011 | Sweet Offering | Sanji | R | 2 | 4000 | 2000 |
| BP06-012 | Knight's Vow | Sanji | SEC | 7 | 9000 | 2000 |
| BP06-013 | Warm Hug | Sanji | SR | 6 | 7000 | 1000 |
| BP06-014 | Pat on Head | Sanji | SR | 2 | 5000 | 1000 |

Nomor kartu berurutan host-major (Zoro 001–007, Sanji 008–014). Zoro: atribut **Slash**, warna hijau, kru *Bpedia Heart Crew / Swordsman*, bounty atas nama RORONOA ZORO. Sanji: atribut **Strike**, warna emas, kru *Bpedia Heart Crew / Cook*, bounty atas nama VINSMOKE SANJI. Setiap menu memiliki teks efek `[Fanservice]` dan kalimat romantis khusus per host. Katalog dibekukan (`Object.freeze`) di server.

### 4.3 Animasi per kartu

Setiap menu memiliki motif animasi sendiri: `shoe-sparkles` (Cinderella's Fit), `petal-waltz` (Princess Twirl), `blossom-breeze` (Blossom Whisper), `rose-delivery` (Sweet Offering), `knight-glimmer` (Knight's Vow), `heart-embrace` (Warm Hug), `gentle-stars` (Pat on Head). Animasi memakai transform/opacity, dapat dilewati, dan mengikuti reduced motion dari OS maupun pengaturan game. Status implementasi visual: belum diverifikasi.

### 4.4 Poster bounty dan harga normal fanservice

Poster bounty menampilkan **harga normal fanservice** dalam Rupiah sebagai harga yang dicoret, lalu label **GRATIS untuk pelanggan Bpedia** (`customerOffer.amount = 0`). Harga ini adalah nilai referensi layanan, bukan tagihan; game tidak menerima pembayaran.

Nilai bawaan di bawah adalah **nilai awal yang perlu dikonfirmasi pemilik/tim booth** sebelum acara:

| Menu | Harga normal FS bawaan |
|---|---:|
| Cinderella's Fit | Rp 65.000 |
| Princess Twirl | Rp 50.000 |
| Blossom Whisper | Rp 45.000 |
| Sweet Offering | Rp 40.000 |
| Knight's Vow | Rp 75.000 |
| Warm Hug | Rp 55.000 |
| Pat on Head | Rp 35.000 |

Petugas dapat mengubah harga per menu di dashboard (bilangan bulat Rp 0–10.000.000). Harga berlaku sama untuk kartu Zoro dan Sanji pada menu tersebut. Kartu yang sudah terbit menyimpan *snapshot* harga saat diundi; perubahan harga hanya berlaku untuk kartu baru, sehingga poster, riwayat, dan CSV tidak berubah surut.

Nilai fiktif BERRY dari rilis 1.5.x telah dihapus dari katalog.

## 5. Tujuh menu fanservice

| Menu | Pengalaman utama | Alternatif tanpa sentuhan | Acuan durasi |
|---|---|---|---|
| Cinderella's Fit | Membantu memakaikan sepatu saat tamu duduk nyaman | Pose pangeran dengan sepatu properti | 60 detik |
| Princess Twirl | Dansa kecil dan satu putaran pelan | Dansa berdampingan tanpa bergandengan | 45 detik |
| Blossom Whisper | Menyelipkan bunga di dekat telinga | Tamu memasang sendiri, cosplayer berpose di samping | 45 detik |
| Sweet Offering | Menyerahkan setangkai bunga | Penyerahan melalui nampan | 40 detik |
| Knight's Vow | Gestur cium punggung tangan; kontak hanya jika keduanya setuju | Membungkuk dan gestur cium dari jarak aman | 40 detik |
| Warm Hug | Pelukan singkat depan atau back hug ringan sesuai pilihan bersama | Pose hati berdampingan | 40 detik |
| Pat on Head | Usapan kepala singkat setelah persetujuan | Gestur tangan di atas kepala tanpa menyentuh rambut | 35 detik |

Durasi adalah asumsi perencanaan, bukan janji layanan. Estimasi antrean menambahkan 20 detik transisi per tiket yang menunggu host yang sama.

## 6. Arah visual dan suara

**Zoro — The Jade Swordsman** dan **Sanji — The Golden Gentleman**: ilustrasi pria dewasa berpakaian lengkap, full body, tidak dipresentasikan sebagai foto cosplayer nyata. **Bipy Original / Jade / Golden Chef** mempertahankan wajah dan proporsi master Bipy.

Komposisi editorial: cream, dusty pink, jade, emas; Poppins untuk UI dan Fraunces untuk judul; font dibundel lokal. Ikon berupa SVG inline, bukan emoji.

Audio:
- **Jingle Bpedia**: berasal dari voice note WhatsApp pemilik tertanggal 2 Oktober 2026. Berkas asli disimpan utuh di `docs/art-originals/audio/bpedia-jingle-2026-10-02.mpeg`. Runtime: `assets/audio/bpedia-jingle.mp3` (versi penuh, ±32 detik) dan `assets/audio/bpedia-jingle-hook.mp3` (6,8 detik pertama). Ukuran dan hash ada di `ASSETS-Heart-Parade.md`.
- **BGM**: `assets/audio/heart-parade-bgm.mp3`, loop 28 detik yang diolah dari audio trailer Gemini.
- **Trailer**: video Gemini dari dua scene kartu; master di `docs/art-originals/gemini/`, runtime `assets/video/heart-parade-promo.mp4`.
- SFX pendek disintesis Web Audio. Musik mulai setelah interaksi yang diizinkan browser, status bisu tersimpan, audio berhenti saat tab tersembunyi.

## 7. Alur pemain

1. Pilih Zoro atau Sanji, lalu pilih **gacha booster** atau **pilih kartu** (jika dibuka petugas). Kartu langsung dibuka tanpa dialog tambahan.
2. Permintaan digital selalu memakai default **tanpa sentuhan**, tanpa dokumentasi, dan tanpa menyimpan nama. Persetujuan sentuhan/dokumentasi tidak pernah diasumsikan dari klik permainan.
3. **Demo** menghasilkan kode `DEMO-` pribadi dan tidak mengubah antrean. **Main tercatat** meminta PIN petugas, mengaktifkan sesi resmi, memverifikasi misi booth, lalu menerbitkan tiket `HP-`.
4. Server menyimpan hasil lebih dulu, lalu animasi kartu berjalan (durasi reveal diatur petugas). Tombol lewati dan reduced motion tersedia.
5. Kartu menampilkan nomor BP06, rarity, statistik, efek, poster bounty dengan harga normal dicoret dan GRATIS, versi interaksi, kode, serta penanda demo/booth. Kartu dapat diunduh.
6. Tombol Selesai mengonfirmasi hasil ke server sebelum putaran berikutnya. Tiket booth tetap di antrean sampai petugas menandai selesai/batal. Petugas mengonfirmasi kembali pilihan interaksi dan dokumentasi sebelum momen fisik dimulai.

Online memakai kode `DEMO-` dan tidak berlaku untuk klaim booth. Booth memakai `HP-` dan nomor antrean harian.

## 8. Dashboard dan SOP petugas

Dashboard berdiri sendiri (tidak memakai CSS game), mendukung tema terang/gelap mengikuti preferensi arcade (`gamysuf-theme`), dan dirancang untuk ponsel/tablet di booth: target sentuh minimal 44 piksel, navigasi bagian (Antrean · Sesi · Cosplayer · Menu & harga), dan input yang tidak tertimpa saat data diperbarui otomatis setiap 10 detik.

Fitur:
- Masuk dengan PIN (PIN dari konfigurasi hosting; tidak ditulis di PRD/antarmuka). Keluar.
- Ringkasan: menunggu, tiket terbit, sudah dilayani, dibatalkan; status mode, sesi, jeda, pilih kartu, jumlah menu aktif.
- **Antrean per cosplayer**: jumlah menunggu, nomor berikutnya, sisa kuota hari ini; filter Semua/Zoro/Sanji; aksi Sudah dilayani, Ganti tanpa sentuhan, Batalkan (dengan konfirmasi). Setiap tiket menampilkan nomor kartu, rarity, dan harga normal snapshot. Riwayat 100 tiket terakhir.
- **Sesi**: mode demo/booth resmi, jadwal (tombol **Isi jadwal Market-In (3–4 Okt)**), batas antrean, durasi reveal, sesi buka/tutup, jeda, izinkan pilih kartu.
- **Cosplayer**: aktif/istirahat dan kuota harian.
- **Menu & harga**: nomor kartu Zoro/Sanji dan rarity per menu, harga normal FS dengan format Rupiah id-ID (validasi bilangan bulat 0–10.000.000), aktif/nonaktif menu.
- Ekspor CSV dan cadangan JSON.

API: `POST /api/admin/service` menerima `{id, patch:{enabled?, price?}}`; bentuk lama `{id, enabled}` tetap diterima.

Nilai awal antrean 12 dan kuota 80 per host adalah konfigurasi, bukan kapasitas acara yang disetujui. Kuota dihitung per tanggal WIB; tiket belum selesai tetap terlihat setelah pergantian hari.

Urutan kerja: konfirmasi misi → pilih kenyamanan → terbitkan tiket → panggil nomor sesuai host → konfirmasi ulang interaksi/dokumentasi → lakukan momen → tandai selesai. Pembatalan melepaskan kuota, nomor antrean tidak dipakai ulang, tiket selesai/batal tidak dapat dihidupkan kembali.

Ruang foto dan antrean terpisah dari jalur lalu lintas. Sediakan kursi stabil untuk Cinderella's Fit, ruang putar bebas hambatan, properti bersih, dan pedang properti tetap tersarung. Tidak menarik tamu, mengangkat tubuh, atau mendadak melakukan back hug. Kedua pihak boleh menolak, berhenti, atau mengganti menu.

Funnel: game mencatat penerbitan dan penyelesaian tiket. Data ini tidak membuktikan install, pembelian, atau atribusi iklan.

## 9. Ketahanan, privasi, dan arsitektur

Runtime Node.js: `core/catalog.cjs`, `core/engine.cjs`, `core/store.cjs` (penulisan atomik + `.bak`), `core/report.cjs`, `server.cjs`. Sumber di folder 05; `npm run sync` di hub menyalinnya ke `games/heart`.

Setiap putaran memiliki requestId; retry menghasilkan kartu yang sama. Pending dipulihkan setelah reload. Demo online selalu memakai mesin demo pribadi dan tidak mengurangi kuota booth.

**Migrasi data 1.5.x** (`migrateState`, dijalankan Store saat memuat `event.json`): mengisi harga menu yang belum ada dengan nilai bawaan, menyegarkan detail host dari katalog (fullName, atribut, warna, kru) sambil mempertahankan status aktif dan kuota, serta mengganti teks jadwal lama dengan jadwal Market-In. Riwayat, antrean, pending, audit, penghitung harian, dan revision tidak diubah. Migrasi idempoten. Kartu riwayat lama tanpa snapshot harga diturunkan dari katalog saat dibaca (`hydrateResult`: snapshot kartu → snapshot menu → nilai bawaan katalog). Skema data tetap 1.

Data tiket: kode, waktu, host, menu, snapshot kartu, nama panggung opsional (maks. 24 karakter), kenyamanan/dokumentasi, nomor antrean, status. Tidak meminta telepon, email, foto, alamat, atau tanggal lahir.

CSV: Kode, Waktu, Antrean, Nama, Cosplayer, Menu, **No. kartu**, **Harga normal FS (Rp)**, Metode, Kenyamanan, Izin dokumentasi, Status. Harga diambil dari snapshot tiket. Sel yang diawali `=`, `+`, `-`, `@`, tab, atau CR dinetralkan agar tidak dieksekusi sebagai formula.

Keamanan: cookie sesi HttpOnly/SameSite=Strict, Origin + header khusus untuk mutasi, PIN scrypt, kunci 60 detik setelah lima PIN salah, tanpa PIN bawaan di hosting, CSP `script-src 'self'` tanpa script inline, dan berkas sumber tidak dapat diunduh.

## 10. Responsif dan aksesibilitas

Target: ponsel 280–430 px potret/lanskap, foldable (280×653, 344×882, 717×512, 884×1104), tablet 768–1366, laptop 1280–1440, desktop 1920; Chromium, Firefox, WebKit. Memakai dvh/svh dengan fallback dan safe-area; tidak ada overflow horizontal; kontrol penting tidak tertutup game bar hub.

Kontrol sentuh/mouse/keyboard, fokus terlihat, ARIA untuk saklar, status, dan pesan galat, reduced motion, serta preferensi yang tahan kegagalan localStorage. Emulasi browser tidak menggantikan uji perangkat fisik.

## 11. Kriteria penerimaan

- Tujuh menu, dua host, 14 kartu BP06-001–014 dengan artwork berbeda; seluruh menu aktif dapat diperoleh lewat gacha dan pilih kartu; menu/host nonaktif tidak menghasilkan kartu baru.
- Poster bounty menampilkan harga normal terkini untuk kartu baru, dicoret, dengan GRATIS untuk pelanggan Bpedia; kartu lama mempertahankan snapshot.
- Petugas dapat mengubah harga, status menu, sesi, jadwal, kuota, dan tiket dari ponsel/tablet.
- Data 1.5.x termigrasi tanpa kehilangan riwayat/antrean.
- Semua gambar/font/audio/video dimuat, tanpa overflow horizontal di matriks viewport, konsol tanpa exception.
- Tidak ada PIN default di hosting; data persisten di luar direktori build.

## 12. Verifikasi dan bukti

Hanya hasil yang benar-benar dijalankan yang dicatat di sini. Rencana tes bukan bukti lulus.

| Pemeriksaan | Status |
|---|---|
| `npm test` sumber 05 (engine + server, kontrak 2.1.0) | Lulus 40/40 pada 2 Oktober 2026 setelah sinkronisasi final |
| `npm run check` | Lulus pada 2 Oktober 2026 |
| QA dashboard petugas (Playwright, server lokal): login, validasi PIN, ubah harga, status menu, jadwal Market-In, kuota, filter antrean, aksi tiket, CSV; Chromium/Firefox/WebKit × 17 viewport × terang/gelap | Lulus pada 2 Oktober 2026: tanpa error konsol, tanpa overflow horizontal, tanpa target sentuh < 44 px |
| Tes hub `tests/heart-engine.test.cjs` dan `tests/heart-server.test.cjs` | Lulus 40/40 terhadap `games/heart` hasil `npm run sync`; seluruh suite hub 67/67 |
| QA UI permainan | 21/21: undian/pilih langsung, mode petugas, tema, geometri, ekspor, pemulihan, antrean. Matriks Game 5 Chromium/Firefox/WebKit × 12 viewport lulus 4.140/4.140 |
| QA animasi penuh | 14 kartu, 16 draw, tujuh motif, Bipy bergerak/reduced motion, klik berulang, flip/close dan pembersihan animasi; 5/5 kelompok lulus tanpa error konsol |
| Paket Hostinger 1.6.1 | 601 berkas; smoke test paket yang diekstrak terisolasi lulus termasuk dependensi, lima game, aset, media/range dan mode petugas |
| Deployment produksi 1.6.1 | Live di `https://gamysuf.fun/g/heart/`; 93/93 pemeriksaan endpoint/hash/aset, 106/106 tampilan, 107/107 gameplay demo. hPanel melaporkan main/49bdd502 selesai pada 2 Oktober 2026 17:19 WIB |

Bukti hub: `docs/RELEASE-1.6.1.md`, `artifacts/deployment-1.6.1.json`, `artifacts/live-ui-1.6.1/report.json`, dan `artifacts/live-heart-1.6.1/report.json`. Gameplay produksi memakai empat demo pengunjung terisolasi, tanpa login/perubahan mode petugas atau tiket resmi.

Rujukan teknis: [Node crypto](https://nodejs.org/api/crypto.html), [MDN AudioContext.resume](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume), [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices). Katalog aset dan provenance: `docs/ASSETS-Heart-Parade.md`.
