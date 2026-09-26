'use strict';

const productRows = [
  ['powder-000', 'Pressed Powder 000', 'PINKFLASH Lasting Matte Loose Pressed Powder - 000', 'PINKFLASH', '000', 'powder-000.jpg'],
  ['foundation-04', 'Fluid Foundation 04', 'FOCALLURE Fluid Foundation FA30 - 04 trial size', 'FOCALLURE', '04 · trial size', 'foundation-04.jpg'],
  ['duo-m03', 'Duo Lipgloss M03', 'PINKFLASH Duo Lipgloss PF-L13 - M03', 'PINKFLASH', 'M03', 'duo.jpg'],
  ['salsa-vinilash', 'SALSA VINILASH', 'SALSA VINILASH', 'SALSA', '', 'curler.jpg'],
  ['salsa-vinilash-pro', 'SALSA VINILASH Pro', 'SALSA VINILASH Pro', 'SALSA', 'Pro', 'vinilash-pro.jpg'],
  ['stick-hs03', 'Duo Makeup Stick', 'PINKFLASH Duo Makeup Stick PF-PF21 - HS03', 'PINKFLASH', 'HS03', 'stick.jpg'],
  ['creamy-or01', 'Creamy Lipgloss OR01', 'PINKFLASH Creamy Lipgloss OR01', 'PINKFLASH', 'OR01', 'creamy-or01.jpg'],
  ['creamy-rd01', 'Creamy Lipgloss RD01', 'PINKFLASH Creamy Lipgloss RD01', 'PINKFLASH', 'RD01', 'creamy-rd01.jpg'],
  ['foundation-03', 'Fluid Foundation 03', 'FOCALLURE Fluid Foundation FA30 - 03 trial size', 'FOCALLURE', '03 · trial size', 'foundation-03.jpg'],
  ['glossy-g03', 'Lasting Glossy G03', 'PINKFLASH L02 Lasting Glossy Lipgloss - G03', 'PINKFLASH', 'G03', 'glossy-g03.jpg'],
  ['watery-nu02', 'Watery Lip Cream NU02', 'PINKFLASH Watery Transferproof Lip Cream NU02', 'PINKFLASH', 'NU02', 'watery-nu02.jpg'],
  ['balm-pk01', 'Color Reviving Balm', 'PINKFLASH Color Reviving Lip Balm PK01', 'PINKFLASH', 'PK01', 'balm-pk01.jpg']
];

const prize = (id, name, fullName, tier, stock, image, extra = {}) => ({
  id,
  name,
  fullName,
  tier,
  stock,
  initialStock: stock,
  image: `/assets/products/${image}`,
  enabled: true,
  imageChecked: ['grand', 'voucher', 'newuser'].includes(tier),
  ...extra
});

function prizes() {
  return [
    prize('bundling', 'Mystery Bundling', 'Hadiah Utama · Bundling 2 pcs', 'bundling', 2, 'bundling.svg', {
      points: 500,
      terms: 'Isi paket misteri ditentukan petugas.'
    }),
    prize('voucher-500000', 'Voucher Rp500rb', 'Hadiah Utama · Voucher potongan Rp500.000', 'grand', 1, 'voucher-500000.svg', {
      points: 400,
      minimum: 750000,
      discount: 500000,
      voucherCode: 'BPFOLKA5OO',
      terms: 'Kode lama: BPFOLKA5OO · Minimal belanja Rp750.000. Petugas wajib mengonfirmasi validitas saat event.'
    }),
    prize('voucher-25', 'Voucher 25%', 'Voucher potongan 25%', 'voucher', null, 'voucher-25.svg', {
      points: 100,
      minimum: 25000,
      discount: 25,
      voucherCode: 'BPFOLKA25',
      terms: 'Kode lama: BPFOLKA25 · Minimal belanja Rp25.000. Petugas wajib mengonfirmasi validitas saat event.'
    }),
    prize('voucher-50', 'Voucher 50%', 'Voucher potongan 50%', 'voucher', 15, 'voucher-50.svg', {
      points: 120,
      minimum: 50000,
      discount: 50,
      voucherCode: 'BPFOLKA50',
      terms: 'Kode lama: BPFOLKA50 · Minimal belanja Rp50.000. Petugas wajib mengonfirmasi validitas saat event.'
    }),
    prize('voucher-100000', 'Voucher Rp100rb', 'Voucher potongan Rp100.000', 'voucher', 15, 'voucher-100000.svg', {
      points: 150,
      minimum: 150000,
      discount: 100000,
      voucherCode: 'BPFOLKA100',
      terms: 'Kode lama: BPFOLKA100 · Minimal belanja Rp150.000. Petugas wajib mengonfirmasi validitas saat event.'
    }),
    ...productRows.map(([id, name, fullName, brand, variant, image]) => prize(id, name, fullName, 'product', 15, image, {
      points: 80,
      brand,
      variant,
      terms: 'Hadiah produk gratis. Tunjukkan kode hasil kepada petugas.'
    })),
    prize('voucher-newuser', 'Voucher Pengguna Baru', 'Voucher pengguna baru potongan Rp25.000', 'newuser', null, 'voucher-newuser.svg', {
      points: 40,
      minimum: 40000,
      discount: 25000,
      voucherCode: 'BPEVN25',
      terms: 'Kode: BPEVN25 · Khusus pengguna baru. Minimal belanja Rp40.000.'
    })
  ];
}

/* Jenis fanservice sesuai notulensi rapat persiapan (misi 3). Semua jenis
   punya peluang sama; petugas menonaktifkan jenis yang sedang tidak bisa
   dilayani host, bukan mengatur persentase. */
function fanservices() {
  return [
    { id: 'hug', name: 'Hug', detail: 'Pelukan hangat dari host pilihanmu.', enabled: true },
    { id: 'back-hug', name: 'Back Hug', detail: 'Host memeluk dari belakang untuk momen foto.', enabled: true },
    { id: 'pet-pet', name: 'Pet Pet', detail: 'Usapan gemas di kepala ala host.', enabled: true },
    { id: 'flower', name: 'Flower', detail: 'Bunga diselipkan di telinga atau diberikan di tangan.', enabled: true },
    { id: 'kiss-hand', name: 'Kiss on Hand', detail: 'Kecupan sopan di punggung tangan, tetap on character.', enabled: true }
  ];
}

function hosts() {
  return [
    { id: 'zoro', name: 'Zoro', role: 'Pendekar tiga pedang', image: '/assets/images/host-zoro.jpg', enabled: true },
    { id: 'sanji', name: 'Sanji', role: 'Koki gentleman', image: '/assets/images/host-sanji.jpg', enabled: true }
  ];
}

/* Papan misi bernomor 1-2-3 dari notulensi. Ditampilkan di layar utama agar
   pengunjung tahu jalur mendapatkan tiket main. */
const MISSIONS = [
  { step: 1, title: 'Follow & register akun Bpedia', reward: 'Freebies lewat Beauty Drop', game: 'drop' },
  { step: 2, title: 'Story IG/TikTok & repost 2 feed', reward: 'Foto bareng Zoro & Sanji', game: null },
  { step: 3, title: 'Checkout Rp100rb · Rp150rb', reward: 'Gacha fanservice · pilih sendiri', game: 'fanservice' }
];

const HASHTAGS = ['#Bpedia', '#BelanjaBikinBahagia', '#GPB'];

const settings = {
  eventName: 'BIPY BEAUTY DROP · TAKEOVER X 2026',
  mode: 'demo',
  paused: false,
  volume: 72,
  bgmVolume: 58,
  sfxVolume: 88,
  voiceVolume: 86,
  audioProfile: 'crisp',
  compressor: 'gentle',
  sound: true,
  duration: 7000,
  openCapsules: 40,
  emptyCapsules: 15,
  fanserviceOpen: true,
  hostSchedule: 'Zoro & Sanji hadir di booth · jam sesi diumumkan petugas',
  voucherTerms: 'Gunakan voucher di aplikasi Beautypedia. Masukkan kode promo saat checkout. Validitas kode event wajib dikonfirmasi petugas sebelum mode resmi.'
};

function defaultState() {
  return {
    schema: 2,
    campaignId: 'takeover-x-brickhall-2026',
    revision: 0,
    prizes: prizes(),
    fanservices: fanservices(),
    hosts: hosts(),
    settings: structuredClone(settings),
    history: [],
    audit: [],
    pending: null,
    dailyCounters: {}
  };
}

const ZONK = {
  id: 'zonk',
  name: 'Belum Mekar',
  fullName: 'Kapsulmu belum mekar kali ini',
  tier: 'zonk',
  stock: null,
  image: '/assets/products/zonk.svg',
  points: 0,
  terms: 'Terima kasih sudah bermain bersama Bpedia. Tetap ikuti misi booth untuk freebies dan fanservice.'
};

module.exports = { rows: productRows, productRows, prizes, fanservices, hosts, settings, defaultState, ZONK, MISSIONS, HASHTAGS };
