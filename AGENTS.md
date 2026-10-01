# Petunjuk untuk AI yang melanjutkan Gamysuf Arcade

1. Baca `docs/PRD-Gamysuf-Arcade.md` sampai habis; lanjutkan dari §10 Status.
2. Kode game asli ada di folder saudara `01 spenweels`, `02 nyapit`, `03 bipy-beauty-drop`, `04 bipy-gacha-pop`, `05 bipy-heart-parade`. Folder `games/` hanya salinan: ubah game di folder aslinya, lalu `npm run sync`.
3. Aturan tetap:
   - Jangan pernah mengaktifkan PIN/password bawaan di cloud; PIN hanya dari env `ADMIN_PIN`.
   - Pengunjung online selalu mesin demo pribadi; stok asli hanya untuk perangkat booth yang login.
   - XP/kartu hanya dihitung di server (gateway), bukan dari browser.
   - Tanpa script inline di halaman hub (CSP `script-src 'self'`).
   - Jangan pakai password akun pemilik; login GitHub/Hostinger dilakukan pemilik sendiri.
4. Setelah mengubah kode: `npm test`, `npm run qa`, lalu periksa tangkapan di `artifacts/qa`.
5. Sebelum berhenti: perbarui §10 dan §11 PRD.
