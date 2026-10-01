'use strict';

/* Daftar hadiah Market-In 6.0 sesuai pesan pemilik (lihat PRD §5).
   [id, nama singkat, nama lengkap, brand, varian, berkas foto, stok awal]
   Foto produk yang sama dengan Beauty Drop disalin apa adanya. */
const productRows = [
  ['foundation-04', 'Fluid Foundation 04', 'FOCALLURE Fluid Foundation FA30 - 04 trial size', 'FOCALLURE', '04 · trial size', 'foundation-04.jpg'],
  ['duo-m03', 'Duo Lipgloss M03', 'PINKFLASH Duo Lipgloss PF-L13 - M03', 'PINKFLASH', 'M03', 'duo.jpg'],
  ['stick-hs03', 'Duo Makeup Stick HS03', 'PINKFLASH Duo Makeup Stick PF-F21 - HS03', 'PINKFLASH', 'HS03', 'stick.jpg'],
  ['foundation-03', 'Fluid Foundation 03', 'FOCALLURE Fluid Foundation FA30 - 03 trial size', 'FOCALLURE', '03 · trial size', 'foundation-03.jpg'],
  ['powder-000', 'Pressed Powder 000', 'PINKFLASH Lasting Matte Loose Pressed Powder - 000', 'PINKFLASH', '000', 'powder-000.jpg'],
  ['creamy-rd01', 'Creamy Lipgloss RD01', 'PINKFLASH Creamy Lipgloss RD01', 'PINKFLASH', 'RD01', 'creamy-rd01.jpg'],
  ['creamy-or01', 'Creamy Lipgloss OR01', 'PINKFLASH Creamy Lipgloss OR01', 'PINKFLASH', 'OR01', 'creamy-or01.jpg'],
  ['glossy-g03', 'Lasting Glossy G03', 'PINKFLASH L02 Lasting Glossy Lipgloss - G03', 'PINKFLASH', 'G03', 'glossy-g03.jpg'],
  ['watery-nu02', 'Watery Lip Cream NU02', 'PINKFLASH Watery Transferproof Lip Cream NU02', 'PINKFLASH', 'NU02', 'watery-nu02.jpg'],
  ['balm-pk01', 'Color Reviving Lip Balm', 'PINKFLASH Color Reviving Lip Balm PK01', 'PINKFLASH', 'PK01', 'balm-pk01.jpg']
];

/* "KUAS SET ISI 5 HELLO KITTY" tertulis dua kali di daftar pemilik:
   satu SKU dengan stok ganda. Gambar berupa ilustrasi berlabel sampai foto
   asli diunggah lewat dashboard, jadi imageChecked=false. */
const collabRows = [
  ['kuas-doraemon', 'Kuas Set Doraemon', 'Kuas Set isi 5 Doraemon', 'Doraemon', 'isi 5 kuas', 'kuas-doraemon.webp', 10],
  ['kuas-cony', 'Kuas Set Cony', 'Kuas Set isi 5 Cony', 'Cony', 'isi 5 kuas', 'kuas-cony.webp', 10],
  ['kuas-hello-kitty', 'Kuas Set Hello Kitty', 'Kuas Set isi 5 Hello Kitty', 'Hello Kitty', 'isi 5 kuas', 'kuas-hello-kitty.webp', 20],
  ['saput-mickey', 'Saput Mickey isi 4', 'Saput Mickey isi 4', 'Mickey', 'isi 4 saput', 'saput-mickey.webp', 10]
];

const TIER_POINTS = { bundling: 500, collab: 200, product: 80 };

const prize = (id, name, fullName, tier, stock, image, extra = {}) => ({
  id,
  name,
  fullName,
  tier,
  stock,
  initialStock: stock,
  image: `/assets/products/${image}`,
  enabled: true,
  imageChecked: false,
  points: TIER_POINTS[tier],
  ...extra
});

function prizes() {
  return [
    ...[1, 2, 3].map(n => prize(`bundling-${n}`, `Bundling Paket ${n}`, `Produk Bundling Paket ${n}`, 'bundling', 3, `bundling-${n}.webp`, {
      brand: 'Bpedia',
      variant: `Paket ${n}`,
      terms: 'Hadiah utama. Isi paket ditunjukkan petugas di booth. Tunjukkan kode GP- untuk klaim.'
    })),
    ...collabRows.map(([id, name, fullName, brand, variant, image, stock]) => prize(id, name, fullName, 'collab', stock, image, {
      brand,
      variant,
      terms: 'Hadiah kolab karakter. Tunjukkan kode GP- kepada petugas untuk klaim.'
    })),
    ...productRows.map(([id, name, fullName, brand, variant, image]) => prize(id, name, fullName, 'product', 15, image, {
      brand,
      variant,
      imageChecked: true,
      terms: 'Produk gratis. Tunjukkan kode GP- kepada petugas untuk klaim.'
    }))
  ];
}

const settings = {
  eventName: 'BIPY GACHA POP · MARKET-IN 6.0',
  mode: 'demo',
  paused: false,
  volume: 74,
  bgmVolume: 56,
  sfxVolume: 90,
  voiceVolume: 88,
  audioProfile: 'punchy',
  compressor: 'gentle',
  sound: true,
  duration: 5200,
  resultHold: 15,
  openCapsules: 30,
  emptyCapsules: 0,
  claimTerms: 'Hadiah fisik hanya dapat diklaim di booth Bpedia Market-In 6.0 selama acara berlangsung. Satu kode GP- berlaku untuk satu hadiah.'
};

const EVENT = {
  name: 'Market-In 6.0',
  place: 'Urban Forest Cipete',
  dates: '3–4 Okt 2026'
};

const HASHTAGS = ['#Bpedia', '#BelanjaBikinBahagia', '#MarketIn6'];

function defaultState() {
  return {
    schema: 1,
    campaignId: 'market-in-6-2026',
    revision: 0,
    prizes: prizes(),
    settings: structuredClone(settings),
    history: [],
    audit: [],
    pending: null,
    dailyCounters: {}
  };
}

const EMPTY = {
  id: 'empty',
  name: 'Coba Lagi',
  fullName: 'Kapsul kosong · coba lagi ya',
  tier: 'empty',
  stock: null,
  image: '/assets/products/empty.svg',
  points: 0,
  terms: 'Terima kasih sudah bermain bersama Bpedia. Download aplikasi Bpedia untuk promo lainnya.'
};

module.exports = { productRows, collabRows, prizes, settings, defaultState, EMPTY, EVENT, HASHTAGS, TIER_POINTS };
