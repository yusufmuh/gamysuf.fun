# Rekaman Suara Asli (opsional)

Folder ini menimpa sulih suara TTS bawaan **tanpa perlu mengubah kode**.
Kalau folder ini kosong, aplikasi memakai suara TTS di `assets/audio/`.

## Cara pakai

1. Rekam kalimatnya (HP juga cukup, asal ruangannya tidak menggema).
2. Simpan sebagai **WAV PCM 16-bit, 44100 Hz, mono**, nama berkas persis seperti
   tabel di bawah, di dalam folder ini.
3. Daftarkan nama berkas (tanpa `.wav`) di `manifest.json`:

   ```json
   {
     "note": "...",
     "overrides": ["slogan-halo", "mc-mantap"]
   }
   ```

   Hanya nama yang terdaftar yang dipakai. Sisanya tetap memakai TTS, jadi Anda
   boleh mengganti sebagian dulu.
4. Tutup dan buka lagi aplikasinya.

Konversi cepat dari rekaman apa pun:

```bash
ffmpeg -i rekaman.m4a -af "highpass=f=80,lowpass=f=13500,loudnorm=I=-18:TP=-2:LRA=7" -ar 44100 -ac 1 -c:a pcm_s16le slogan-halo.wav
```

## Daftar kalimat

### Slogan merek — kalimat dikunci PRD §9.1, jangan diubah kata-katanya

| Berkas | Kalimat | Dipakai saat |
|---|---|---|
| `slogan-app` | BPEDIA, semua ada di aplikasi | Menganggur dan penutup hasil |
| `slogan-cantik` | Cantik bersama BPEDIA | Menang produk atau voucher |
| `slogan-belanja` | Belanja di BPEDIA, semua ada | Menganggur bergantian |
| `slogan-adaada` | Ada-ada ya, di BPEDIA aja | Zonk dan menganggur |
| `slogan-halo` | Halo BPEDIA, main yuk | Sapaan awal dan klik maskot |
| `slogan-skincare` | Download aplikasi BPEDIA dan temukan skincare mu | Modal hasil dan layar tutup |

Pelafalan BPEDIA mengikuti ejaan Indonesia: **"bipedia"**.

### Celetuk MC — bebas Anda ubah kata-katanya

| Berkas | Kalimat contoh | Dipakai saat |
|---|---|---|
| `mc-koin` | Koinnya masuk, lampunya nyala. Siap ya? | Koin masuk mesin |
| `mc-ayo` | Ayo dicoba dulu, siapa tahu lagi hoki. | Menganggur di panggung |
| `mc-bidik` | Pelan-pelan bidiknya, nggak usah buru-buru. | Menganggur saat membidik |
| `mc-tegang` | Tahan… tahan… | Capit sedang menukik |
| `mc-mantap` | Nah! Mantap itu. | Menang |
| `mc-hampir` | Yah, tinggal sedikit lagi. | Nyaris dapat |
| `mc-semangat` | Santai, masih ada kesempatan lain kok. | Zonk |

Kalau kata-kata MC diubah, sesuaikan juga teks balon percakapan di
`js/app.js` (objek `audioScript`) supaya tulisan di layar cocok dengan suaranya.

## Catatan

- Rekaman manusia adalah satu-satunya cara menghilangkan kesan sintetis
  sepenuhnya. Pengaturan TTS hanya bisa menguranginya.
- Jaga durasi di bawah ±3 detik. Kalimat panjang menahan musik latar terlalu
  lama karena BGM diredam selama suara diputar.
- Jangan memasukkan berkas yang tidak terdaftar di `manifest.json`; berkas itu
  akan diabaikan.
