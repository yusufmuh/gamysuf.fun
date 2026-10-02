'use strict';

/* Daftar hadiah Market-In 6.0 sesuai pesan pemilik (lihat PRD §5).
   [id, nama singkat, nama lengkap, brand, varian, berkas foto, stok awal]
   Foto produk yang sama dengan Beauty Drop disalin apa adanya. */
const productRows = [
  ['foundation-04', 'Fluid Foundation 04', 'FOCALLURE Fluid Foundation FA30 - 04 trial size', 'FOCALLURE', '04 · trial size', 'foundation-04.jpg', 20],
  ['duo-m03', 'Duo Lipgloss M03', 'PINKFLASH Duo Lipgloss PF-L13 - M03', 'PINKFLASH', 'M03', 'duo.jpg', 19],
  ['stick-hs03', 'Duo Makeup Stick HS03', 'PINKFLASH Duo Makeup Stick PF-F21 - HS03', 'PINKFLASH', 'HS03', 'stick.jpg', 20],
  ['foundation-03', 'Fluid Foundation 03', 'FOCALLURE Fluid Foundation FA30 - 03 trial size', 'FOCALLURE', '03 · trial size', 'foundation-03.jpg', 19],
  ['powder-000', 'Pressed Powder 000', 'PINKFLASH Lasting Matte Loose Pressed Powder - 000', 'PINKFLASH', '000', 'powder-000.jpg', 20],
  ['creamy-rd01', 'Creamy Lipgloss RD01', 'PINKFLASH Creamy Lipgloss RD01', 'PINKFLASH', 'RD01', 'creamy-rd01.jpg', 19],
  ['creamy-or01', 'Creamy Lipgloss OR01', 'PINKFLASH Creamy Lipgloss OR01', 'PINKFLASH', 'OR01', 'creamy-or01.jpg', 20],
  ['glossy-g03', 'Lasting Glossy G03', 'PINKFLASH L02 Lasting Glossy Lipgloss - G03', 'PINKFLASH', 'G03', 'glossy-g03.jpg', 24],
  ['watery-nu02', 'Watery Lip Cream NU02', 'PINKFLASH Watery Transferproof Lip Cream NU02', 'PINKFLASH', 'NU02', 'watery-nu02.jpg', 20],
  ['balm-pk01', 'Color Reviving Lip Balm', 'PINKFLASH Color Reviving Lip Balm PK01', 'PINKFLASH', 'PK01', 'balm-pk01.jpg', 17]
];

/* Hello Kitty memakai satu SKU dengan jumlah final pemilik.
   Gambar berupa ilustrasi berlabel sampai foto
   asli diunggah lewat dashboard, jadi imageChecked=false. */
const collabRows = [
  ['kuas-doraemon', 'Kuas Set Doraemon', 'Kuas Set isi 5 Doraemon', 'Doraemon', 'isi 5 kuas', 'kuas-doraemon.webp', 71],
  ['kuas-cony', 'Kuas Set Cony', 'Kuas Set isi 5 Cony', 'Cony', 'isi 5 kuas', 'kuas-cony.webp', 23],
  ['kuas-hello-kitty', 'Kuas Set Hello Kitty', 'Kuas Set isi 5 Hello Kitty', 'Hello Kitty', 'isi 5 kuas', 'kuas-hello-kitty.webp', 25],
  ['saput-mickey', 'Saput Mickey isi 4', 'Saput Mickey isi 4', 'Mickey', 'isi 4 saput', 'saput-mickey.webp', 114]
];

const voucherRows = [
  ['voucher-25', 'Voucher 25%', 'Voucher potongan 25% minimal belanja Rp25.000', 'Potongan 25% · min. Rp25.000', 15, 'Rp25.000'],
  ['voucher-50', 'Voucher 50%', 'Voucher potongan 50% minimal belanja Rp50.000', 'Potongan 50% · min. Rp50.000', 15, 'Rp50.000'],
  ['voucher-100k', 'Voucher Rp100rb', 'Voucher potongan Rp100.000 minimal belanja Rp150.000', 'Potongan Rp100.000 · min. Rp150.000', 30, 'Rp150.000']
];

const TIER_POINTS = { bundling: 500, collab: 200, product: 80, voucher: 120 };

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
    ...[1, 2, 3].map(n => prize(`bundling-${n}`, `Bundling Paket ${n}`, `Produk Bundling Paket ${n}`, 'bundling', 2, `bundling-${n}.webp`, {
      brand: 'Bpedia',
      variant: `Paket ${n}`,
      terms: 'Hadiah utama. Isi paket ditunjukkan petugas di booth. Tunjukkan kode GP- untuk klaim.'
    })),
    ...collabRows.map(([id, name, fullName, brand, variant, image, stock]) => prize(id, name, fullName, 'collab', stock, image, {
      brand,
      variant,
      terms: 'Hadiah kolab karakter. Tunjukkan kode GP- kepada petugas untuk klaim.'
    })),
    ...productRows.map(([id, name, fullName, brand, variant, image, stock]) => prize(id, name, fullName, 'product', stock, image, {
      brand,
      variant,
      imageChecked: true,
      terms: 'Produk gratis. Tunjukkan kode GP- kepada petugas untuk klaim.'
    })),
    ...voucherRows.map(([id, name, fullName, variant, stock, minimum]) => prize(id, name, fullName, 'voucher', stock, `${id}.webp`, {
      brand: 'Bpedia',
      variant,
      imageChecked: true,
      terms: `Tunjukkan kode GP- untuk klaim di booth Bpedia. Petugas memberikan kode voucher. Minimal belanja ${minimum}.`
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

const CATALOG_VERSION = 2;

/* Data 1.4.x belum memiliki penanda katalog. Riwayat menyimpan snapshot
   hadiah; jangan menulis ulang snapshot atau menghitung pending dua kali. */
function migrateState(state) {
  require('./engine.cjs').validateState(state);
  if (state.catalogVersion === CATALOG_VERSION) return false;

  const catalog = prizes();
  const originals = new Map(catalog.filter(item => item.tier !== 'voucher').map(item => [item.id, item]));
  const issuedCounts = new Map();
  for (const item of state.history) {
    if (item.prize.tier !== 'empty') issuedCounts.set(item.prize.id, (issuedCounts.get(item.prize.id) || 0) + 1);
  }
  const issued = Object.fromEntries(issuedCounts);
  let refreshed = 0;
  const nextPrizes = state.prizes.map(existing => {
    const current = originals.get(existing.id);
    if (!current) return existing;
    refreshed++;
    return {
      ...existing,
      ...current,
      stock: current.initialStock === null ? null : Math.max(0, current.initialStock - (issued[existing.id] || 0)),
      enabled: existing.enabled,
      image: existing.image,
      imageChecked: existing.imageChecked
    };
  });
  const present = new Set(nextPrizes.map(item => item.id));
  const added = [];
  for (const voucher of catalog.filter(item => item.tier === 'voucher')) {
    if (present.has(voucher.id)) continue;
    nextPrizes.push(voucher);
    present.add(voucher.id);
    added.push(voucher.id);
  }
  state.prizes = nextPrizes;
  state.catalogVersion = CATALOG_VERSION;
  state.revision++;
  state.audit.push({at: new Date().toISOString(), action: 'catalog-migrated', detail: {from: 1, to: CATALOG_VERSION, refreshed, added, issued}});
  return true;
}

function defaultState() {
  return {
    schema: 1,
    catalogVersion: CATALOG_VERSION,
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

module.exports = { productRows, collabRows, voucherRows, prizes, settings, defaultState, migrateState, CATALOG_VERSION, EMPTY, EVENT, HASHTAGS, TIER_POINTS };
