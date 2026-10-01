# Rekaman suara asli (opsional)

Suara MC bawaan adalah TTS `id-ID-GadisNeural`. Untuk memakai rekaman MC/host asli:

1. Simpan rekaman di folder ini dengan nama yang sama dengan suara bawaan, misalnya `gp-welcome.mp3`,
   `prize-kuas-doraemon.wav`, atau `slogan-halo.mp3` (lihat daftar nama di `../voice-script.json`).
2. Tambahkan namanya ke `manifest.json`, contoh:
   ```json
   { "overrides": ["gp-welcome.mp3", "prize-kuas-doraemon.wav"] }
   ```
   Nama tanpa ekstensi dianggap `.wav`.
3. Format yang disarankan: MP3 64–128 kbps mono atau WAV 44,1 kHz 16-bit, puncak −2 dBTP, tanpa jeda panjang di awal.

Berkas yang tidak terdaftar di manifest diabaikan, sehingga game tetap jalan memakai suara bawaan.
