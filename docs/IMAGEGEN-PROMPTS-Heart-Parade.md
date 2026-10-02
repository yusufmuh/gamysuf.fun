# Imagegen Prompt Set — Bipy Heart Parade

Dokumen ini mencatat prompt produksi untuk aset visual Game 05. Seluruh karakter pria digambarkan sebagai dewasa, berpakaian lengkap, dan berinteraksi dengan Bipy sebagai maskot nonmanusia. Teks kartu, nilai BERRY, dan logo dirender oleh antarmuka agar tetap tajam serta mudah diperbarui.

## Referensi visual

- Zoro: `docs/art-originals/zoro.png`
- Sanji: `docs/art-originals/sanji.png`
- Bipy pink: `docs/art-originals/bipy-pink.png`

## Instruksi dasar kartu Zoro

> Create a polished transparent game collectible scene asset. Match the adult green-haired swordsman reference: handsome adult man, scar over the closed left eye, long dark jade embroidered coat, black outfit, red sash, and three swords safely sheathed. Match or reinterpret Bipy as a clearly nonhuman tulip convention mascot with the same pink flower hood, blonde fringe, dark eyes, pink costume marked B, and rounded mitten hands. Both figures fully visible and fully clothed; wholesome theatrical interaction; no sensual framing. High-end anime-inspired adult character rendering with a polished 3D mascot finish, warm soft illumination, three-quarter camera, and transparent padding. No background, frame, added text, logo, watermark, or checkerboard. Portrait 2:3 card composition.

| Runtime asset | Adegan khusus |
|---|---|
| `assets/moments/zoro-cinderella.webp` | Cinderella's Fit: the swordsman kneels courteously and presents a sparkling pink glass slipper beside Bipy seated on a cream chair; hands, chair, slipper, swords, and footwear remain visible. |
| `assets/moments/zoro-twirl.webp` | Princess Twirl: he steps sideways with an inviting open palm while Bipy makes a cheerful spin; coat hem, tulip hood, and petals form opposing arcs. |
| `assets/moments/zoro-whisper.webp` | Blossom Whisper: he crouches to Bipy's height and presents a tiny pink blossom beside the tulip hood while Bipy holds it in place; warm eye contact with a visible respectful gap. |
| `assets/moments/zoro-offering.webp` | Sweet Offering: he offers one pink tulip on a small tray while Bipy reaches toward it; the tray and flower are central. |
| `assets/moments/zoro-vow.webp` | Knight's Vow: he kneels with one hand over his heart and bows toward Bipy's raised mitten with a large visible gap and no mouth contact. |
| `assets/moments/zoro-hug.webp` | Warm Hug: the adult performer and a human-height Bipy mascot share a friendly shoulder-to-shoulder side hug for a convention photo; swords angle safely away. |
| `assets/moments/zoro-pat.webp` | Pat on Head: he stands beside a human-height Bipy mascot and lightly pats the upper tulip-hood tip while Bipy waves. |

## Instruksi dasar kartu Sanji

> Create a polished transparent game collectible scene asset. Match the adult blond gentleman reference: handsome adult man, side-swept blond hair covering one eye, curled eyebrow, small goatee, black double-breasted suit with gold shirt and accents, and elegant black shoes. Match or reinterpret Bipy as a clearly nonhuman tulip convention mascot with the same pink flower hood, blonde fringe, dark eyes, pink costume marked B, and rounded mitten hands. Both figures fully visible and fully clothed; wholesome theatrical interaction; no sensual framing. High-end anime-inspired adult character rendering with a polished 3D mascot finish, warm gold illumination, three-quarter camera, and transparent padding. No background, frame, added text, logo, watermark, or checkerboard. Portrait 2:3 card composition.

| Runtime asset | Adegan khusus |
|---|---|
| `assets/moments/sanji-cinderella.webp` | Cinderella's Fit: the gentleman kneels with a formal flourish and displays a satin pink glass slipper on a velvet cushion beside seated Bipy. |
| `assets/moments/sanji-twirl.webp` | Princess Twirl: he makes an elegant dance step with one hand over his chest while Bipy twirls independently beneath an arc of rose petals. |
| `assets/moments/sanji-whisper.webp` | Blossom Whisper: he kneels sideways and presents a pink rose beside Bipy's hood while Bipy attaches the blossom; faces remain separated. |
| `assets/moments/sanji-offering.webp` | Sweet Offering: he bows and presents a rose on a silver dessert tray with a heart-shaped cake while Bipy accepts the rose. |
| `assets/moments/sanji-vow.webp` | Knight's Vow: he kneels, places one hand over his heart, and bows toward Bipy's raised mitten from a large visible distance with no mouth contact. |
| `assets/moments/sanji-hug.webp` | Warm Hug: he stands behind and to the side of a human-height Bipy mascot with both arms loosely around its upper shoulders in a gentle back-hug photo pose. |
| `assets/moments/sanji-pat.webp` | Pat on Head: he lightly pats Bipy's oversized tulip hood while holding a plate of heart-shaped pancakes. |

## Instruksi dasar varian Bipy

> Create one transparent full-body mascot costume variant based exactly on the Bipy reference: nonhuman round chibi tulip mascot, large pink flower hood, blonde fringe, big dark eyes, blush, white collar, pink dress with clear letter B, rounded mitten hands, and pink shoes. Preserve the same identity and proportions. Polished 3D mascot render, warm studio light, full body centered with transparent padding. No background, floor, added text besides the existing B, watermark, or checkerboard.

| Runtime asset | Varian khusus |
|---|---|
| `assets/bipy-variants/bipy-cinderella.webp` | Seated on a cream stool, holding a sparkling glass slipper, powder-blue ribbon, and tiny silver crown. |
| `assets/bipy-variants/bipy-twirl.webp` | Joyful dance pose with one foot lifted, pink-gold ribbon, and petal overskirt. |
| `assets/bipy-variants/bipy-whisper.webp` | Small pink flower on the right side of the tulip hood, leaf accents, and shy cheek pose. |
| `assets/bipy-variants/bipy-offering.webp` | Presents one pink rose on a small silver tray with both mitten hands. |
| `assets/bipy-variants/bipy-vow.webp` | Cream-rose ceremonial cape, small gold crown, and one mitten raised for a royal greeting. |
| `assets/bipy-variants/bipy-hug.webp` | Short heart-pattern cape, open welcoming arms, and two small heart accents. |
| `assets/bipy-variants/bipy-pat.webp` | Bashful pose with hands clasped under the chin and a rose-gold tiara. |

## Optimisasi

Master PNG disimpan di `docs/art-originals/moments/` dan `docs/art-originals/bipy-variants/`. `scripts/optimize-art.py` membuat WebP transparan untuk runtime tanpa menghapus master.

## Gemini video dan musik

Dua scene master (`zoro-twirl.png` dan `sanji-offering.png`) diunggah ke Gemini Video melalui akun Google pengguna. Prompt produksi:

> Create a cinematic 8-second landscape promo video from the two uploaded Heart Parade card scenes. Preserve the exact adult green-haired swordsman, adult blond gentleman, and pink tulip Bipy mascot designs. Begin with the green scene: a slow parallax push-in, jade light ribbons and petals orbiting the pair as Bipy twirls. Transition through a spinning heart-shaped collectible card into the gold scene: rose petals, warm gold glints, Bipy receiving the rose and cake, then both scenes resolve as two luminous card silhouettes side by side. Smooth premium anime game-opening motion, clean full-body framing, elegant and playful, no sensual framing, no new characters, no added text, no logo, no watermark. Add original native instrumental audio: romantic pirate-adventure waltz with warm strings, nylon guitar, gentle hand drums and one bright chime on the card reveal; no vocals, no copyrighted melody, ending that can loop cleanly.

Gemini menghasilkan master 10,005 detik pada 1280×720 dengan video H.264 dan audio AAC 48 kHz stereo. Master disimpan sebagai `docs/art-originals/gemini/heart-parade-promo-master.mp4`. Runtime video dioptimalkan ke `assets/video/heart-parade-promo.mp4`; audionya diproses menjadi loop 28 detik melalui dua crossfade satu detik di `assets/audio/heart-parade-bgm.mp3`.
