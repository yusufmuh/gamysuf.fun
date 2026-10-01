# Gamysuf Arcade 1.5.0 — Bipy Heart Parade

Tanggal rilis: 1 Oktober 2026. Game kelima di `/g/heart/` menambahkan tujuh menu fanservice, dua ilustrasi dewasa full body Zoro/Sanji, Bipy pink/Jade/Golden Chef, kapsul hati beranimasi, musik/SFX, serta kartu PNG 1080×1350.

Dashboard kini memuat lima arena, pintasan Heart Parade, panduan game kelima, dan 88 kartu koleksi. Grid memakai satu kolom di ponsel, dua di tablet, dan tiga di desktop. Preferensi suara/tema dan game bar tetap dibagi lintas game.

## Perilaku yang diperiksa

- Hasil ditetapkan server dan disimpan sebelum animasi. Retry memakai requestId sama; putaran yang responsnya hilang dipulihkan dari pending. Hasil tetap terbuka bila acknowledgement gagal.
- Pengunjung online memakai demo pribadi. Tiket demo tidak mengurangi kuota booth atau muncul di antrean resmi. XP/kartu dihitung server secara idempoten.
- Pilihan tanpa sentuhan menjadi default; persetujuan interaksi dan dokumentasi terpisah. Petugas memverifikasi misi sebelum penerbitan tiket resmi.
- Dashboard petugas mengatur host/menu, kuota harian WIB, batas antrean, jeda, jadwal, durasi, dan pemilihan langsung. Status selesai/batal bersifat final; alternatif tanpa sentuhan mempertahankan nomor tiket.
- Header judul pada ponsel memakai pemisah kata yang benar; clipping root membatasi dekorasi dan mencegah pembesaran viewport. QA khusus memastikan teks judul tidak terpotong, selain memeriksa overflow halaman.

## Bukti lokal

| Pemeriksaan | Hasil |
|---|---|
| Tes sumber Spin / Nyapit / Drop / Gacha Pop / Heart Parade | 83 / 54 / 29 / 22 / 20 lulus |
| Tes repo hub, hosting, gateway dan Heart Parade | 35/35 lulus; mencakup 20 tes Heart Parade yang juga tersedia di sumber 05 |
| Heart UI: pilih menu, unduh, reload, respons hilang, ack gagal, admin dan tiket | 8/8 lulus, `artifacts/heart-ui/report.json` |
| Tur Electron | 18 tangkapan, 0 error konsol, `artifacts/qa/1600x900/qa.json` |
| Responsif | 1082/1082 lulus pada matriks seluruh arcade, `artifacts/qa-responsive/report.json`; perbaikan game 05 diuji terpisah 544/544 serta pemeriksaan judul pada 320 px Chromium dan 390 px WebKit 33/33 per kasus |
| Dokumen | PDF 5 halaman dan Word yang dapat diedit; tabel tepat tujuh menu; kartu unduhan tepat 1080×1350 |
| Paket Hostinger | `release/Gamysuf-Arcade-1.5.0-Hostinger.zip` |

Matriks responsif: Chromium 320×640, 360×740, 390×844, 540×720, 768×1024, 1024×1366, 844×390, 1366×768, 1920×1080; Firefox/WebKit 320×640, 390×844, 768×1024, 1366×768. Gameplay seluruh game diuji pada Chromium 390 px; Heart Parade dimainkan pada setiap viewport/engine. Beauty Drop juga di-resize saat kapsul bergerak. Ini bukti browser/emulasi viewport, bukan hasil uji seluruh perangkat fisik.

## Publikasi dan pemulihan

Hostinger yang benar adalah Web App **gamysuf.fun**, repo `yusufmuh/gamysuf.fun`, branch `main`, Node 20.x, entry `hub/server.cjs`, auto-deploy aktif. Website PHP placeholder `gamysuf-fun-912185.hostingersite.com` bukan target produksi. Direktori data persisten dan konfigurasi produksi dipertahankan.

Setelah push, bukti harus berupa status Hostinger Selesai untuk commit rilis, `artifacts/deployment-1.5.0.json`, bukti gambar CDN di `artifacts/live-image-verification/report-1.5.0.json`, dan UI publik di `artifacts/live-ui-1.5.0/report.json`. Push berhasil saja bukan bukti deployment selesai. Probe produksi tidak menerbitkan tiket, mengubah stok, atau login admin.

Rollback memakai redeploy commit 1.4.1 `150f207185d67cf02c1d47dd70500973fcf5abe3` melalui riwayat deployment bila dibutuhkan; jangan menghapus direktori data. Heart Parade memakai subdirektori data sendiri, sehingga tidak memigrasikan data empat game sebelumnya.

PRD: `docs/PRD-Bipy-Heart-Parade.md`. Aset: `docs/ASSETS-Heart-Parade.md`. Salinan Notion sudah dibuat dan dibaca kembali: https://app.notion.com/p/3ecf134daa8381d5a9b2c2428fd1fa07.

Rilis ini ditujukan untuk browser/booth. Publikasi Steam belum dilakukan; paket native, hak distribusi karakter/aset, dan pengujian hardware/store masih merupakan pekerjaan tersendiri.
