# Aset merek 1.3.0

Dibuat 27 September 2026 untuk komentar pemilik: logo Gamysuf 3D dan logo Bpedia konsisten terhadap tema.

## Master Bpedia resmi

Sumber `H:\My Drive\Bpedia\02_Brand Guidline\01_Logo`:
- `bpedia-wordmark.png` → `hub/public/assets/brand/bpedia-pink.png` (tema terang).
- `bpedia-wordmark-putih.png` → `hub/public/assets/brand/bpedia-white.png` (tema gelap).

Keduanya disalin apa adanya; raster master tidak diubah. Seluruh logo pada header game, roda Spin, header/footer hub dipilih oleh `theme.js` menggunakan preferensi yang sama.

## Gamysuf 3D

Dua aset dibuat dengan built-in imagegen, latar transparan. Bukan logo Bpedia resmi.

- `gamysuf-3d-dark.png`: sumber `exec-0e685c37-7e6a-475a-82ef-6444eed45877.png`.
- `gamysuf-3d-light.png`: sumber `exec-0ef52bbd-e41b-4e34-b4f4-d066fac1b40a.png`.
- Direktori hasil asli: `C:\Users\Yusuf\.codex\generated_images\01a0e003-4a3c-7fc2-8bb7-3ff6ded9094f`.
- Referensi tahap pertama: logo Gamysuf versi 1.2 (`gamysuf-arcade-logo-v2.png`). Tahap kedua memakai hasil tahap pertama untuk mempertahankan bentuk.

Prompt dark:

> Use case: logo-brand. Create a finished premium 3D logo asset for Gamysuf.fun, a Bpedia arcade. The reference is only the existing logo identity and layout: a tulip-shaped G with inset gamepad plus on the left and a bold wordmark on the right. Redesign it as clean softly beveled solid 3D white porcelain, entirely white and neutral pearl-grey shading, no pink or gold in this DARK THEME variant. Text exactly 'GAMYSUF.FUN' on first line and smaller spaced 'ARCADE' below. Front-facing orthographic view with shallow extrusion visible down-right, crisp restrained specular edges, no excessive glow or particles. Compact wide horizontal lockup around 3:1. Keep all glyphs thick, solid, clean, readable at 150px width. Transparent alpha background, not white or checkerboard; no floor, no mockup, no texture or speckling inside letters. Place artwork close to canvas edges with only 4% safe margin. Professional finished game-brand identity.

Prompt light:

> Edit this logo to produce its LIGHT THEME companion. Preserve exact composition, spelling GAMYSUF.FUN with ARCADE below, tulip G symbol, proportions, geometry, front camera, shallow 3D bevels and canvas layout. Change only white porcelain material to saturated Bpedia hot-pink enamel (#ED1C5B base with lighter rose bevel highlights and berry-pink shaded extrusion). Every part of symbol, gamepad plus, GAMYSUF.FUN, and ARCADE must be pink, no gold/white text. Clean smooth anti-aliased silhouette edges, no speckles or debris. Keep truly transparent alpha background and original wide aspect ratio. Polished solid 3D brand asset to place on ivory page.

## Screenshot

`html2canvas` versi 1.4.1 dipasang dari npm sebagai dependensi pengembangan; distribusi browser lokal disalin ke `hub/public/vendor/`. File lisensi MIT disertakan. Tidak memuat script dari CDN. Screenshot hanya dirender dan diunduh di perangkat pemain, tidak dikirim ke server.

Dokumentasi API yang diperiksa: https://html2canvas.hertzen.com/configuration dan panduan MDN Autoplay / Fullscreen API. Context7 tidak tersedia pada sesi ini, sehingga menggunakan dokumentasi resmi langsung.
