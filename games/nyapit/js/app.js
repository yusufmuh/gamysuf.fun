'use strict';

/**
 * NYAPIT BARENG BPEDIA - Game Mesin Capit Booth Beautypedia
 * Cozzone Up 2026 · Economic Fair FEB Universitas Pancasila
 */

/* Enam kalimat pertama adalah slogan merek wajib PRD §9.1 — teksnya dikunci.
   Tujuh kalimat MC di bawahnya baru di v1.3: kalimat percakapan biasa yang
   dibacakan suara kedua, supaya booth tidak terdengar seperti satu narator
   iklan yang mengulang kalimat yang sama sepanjang hari. */
const audioScript = {
  'slogan-app': 'BPEDIA, semua ada di aplikasi!',
  'slogan-cantik': 'Cantik bersama BPEDIA!',
  'slogan-belanja': 'Belanja di BPEDIA, semua ada!',
  'slogan-adaada': 'BPEDIA, cari skincare-mu dan temukan diskon di aplikasi... BPEDIA!',
  'slogan-halo': 'Halo BPEDIA, main yuk!',
  'slogan-skincare': 'Download aplikasi BPEDIA dan temukan skincare-mu!',
  'mc-koin': 'Koin sudah masuk! Yuk siap-siap, semoga beruntung ya!',
  'mc-ayo': 'Ayo dicoba dulu, siapa tahu lagi hoki.',
  'mc-bidik': 'Pelan-pelan bidiknya, nggak usah buru-buru.',
  'mc-tegang': 'Tahan… tahan…',
  'mc-mantap': 'Wah, keren banget! Selamat ya, berhasil dapat hadiah!',
  'mc-hampir': 'Yah, tinggal sedikit lagi.',
  'mc-semangat': 'Santai, masih ada kesempatan lain kok.',
  'prize-bundling': 'Wah luar biasa! Selamat ya, kamu dapat Hadiah Utama Mystery Bundling!',
  'prize-voucher-500000': 'Keren banget! Selamat ya, kamu berhasil bawa pulang Voucher Spesial 500 Ribu Rupiah!',
  'prize-voucher-100000': 'Yeay selamat ya! Kamu mendapatkan Voucher Belanja 100 Ribu Rupiah!',
  'prize-voucher-50': 'Selamat ya! Kamu dapat Diskon 50 Persen belanja di aplikasi Bpedia!',
  'prize-voucher-25': 'Selamat ya! Kamu dapat Voucher Diskon 25 Persen di aplikasi Bpedia!',
  'prize-voucher-newuser': 'Selamat datang di Bpedia! Kamu dapat Voucher Pengguna Baru 25 Ribu Rupiah!',
  'prize-powder-000': 'Selamat ya! Kamu mendapatkan Pinkflash Lasting Matte Pressed Powder!',
  'prize-foundation-04': 'Selamat ya! Kamu berhasil membawa pulang Focallure Fluid Foundation 04!',
  'prize-duo-m03': 'Cantik banget! Selamat ya, kamu mendapatkan Pinkflash Duo Lipgloss!',
  'prize-salsa-vinilash': 'Selamat ya! Bulu mata makin lentik dengan Salsa Vinilash!',
  'prize-salsa-vinilash-pro': 'Keren banget! Selamat ya, kamu mendapatkan Salsa Vinilash Pro!',
  'prize-stick-hs03': 'Selamat ya! Riasan makin glowing dengan Duo Makeup Stick Pinkflash!',
  'prize-creamy-or01': 'Bibir makin manis! Selamat ya, kamu dapat Creamy Lipgloss Pinkflash!',
  'prize-creamy-rd01': 'Tampil makin fresh! Selamat ya, kamu dapat Creamy Lipgloss Pinkflash!',
  'prize-foundation-03': 'Selamat ya! Kamu mendapatkan Focallure Fluid Foundation 03!',
  'prize-glossy-g03': 'Bibir berkilau mempesona! Selamat ya, kamu dapat Pinkflash Lasting Glossy Lipgloss!',
  'prize-watery-nu02': 'Selamat ya! Kamu mendapatkan Pinkflash Watery Transferproof Lip Cream!',
  'prize-balm-pk01': 'Selamat ya! Bibir sehat dan lembap dengan Color Reviving Lip Balm!'
};

const PRIZE_THEMES = {
  'bundling': {
    themeClass: 'theme-royal-bundling',
    badge: '👑 GRAND PRIZE · MYSTERY BUNDLING',
    mascot: '/assets/images/mascot-v3/celebrate.png',
    congrats: 'Luar biasa! Dua kejutan istimewa berhasil kamu bawa pulang!'
  },
  'voucher-500000': {
    themeClass: 'theme-vip-500k',
    badge: '💎 VOUCHER SULTAN RP500.000',
    mascot: '/assets/images/mascot-v3/celebrate.png',
    congrats: 'Keren abis! Diskon belanja terbesar di booth Cozzone!'
  },
  'voucher-100000': {
    themeClass: 'theme-gold-100k',
    badge: '★ VOUCHER BELANJA RP100.000',
    mascot: '/assets/images/poses/pose_12_shop.png',
    congrats: 'Mantap! Borong kosmetik favoritmu di Bpedia!'
  },
  'voucher-50': {
    themeClass: 'theme-pink-50pct',
    badge: '✦ VOUCHER DISKON 50%',
    mascot: '/assets/images/poses/pose_12_shop.png',
    congrats: 'Diskon setengah harga untuk checkout impianmu!'
  },
  'voucher-25': {
    themeClass: 'theme-pink-25pct',
    badge: '✦ VOUCHER DISKON 25%',
    mascot: '/assets/images/poses/pose_12_shop.png',
    congrats: 'Belanja hemat makin seru di aplikasi Bpedia!'
  },
  'voucher-newuser': {
    themeClass: 'theme-welcome-newuser',
    badge: '🌸 VOUCHER PENGGUNA BARU RP25.000',
    mascot: '/assets/images/poses/pose_02_wave.png',
    congrats: 'Selamat bergabung di keluarga besar Beautypedia!'
  },
  'powder-000': {
    themeClass: 'theme-beauty-powder',
    badge: '✿ PINKFLASH FLAWLESS POWDER',
    mascot: '/assets/images/poses/pose_13_skincare.png',
    congrats: 'Wajah bebas kilap dan matte natural seharian!'
  },
  'foundation-04': {
    themeClass: 'theme-beauty-foundation',
    badge: '✿ FOCALLURE FLUID FOUNDATION 04',
    mascot: '/assets/images/poses/pose_11_mirror.png',
    congrats: 'Complexion sempurna dan tahan lama untukmu!'
  },
  'foundation-03': {
    themeClass: 'theme-beauty-foundation',
    badge: '✿ FOCALLURE FLUID FOUNDATION 03',
    mascot: '/assets/images/poses/pose_11_mirror.png',
    congrats: 'Flawless coverage yang menyatu lembut di kulit!'
  },
  'duo-m03': {
    themeClass: 'theme-beauty-lipgloss',
    badge: '💋 PINKFLASH DUO LIPGLOSS M03',
    mascot: '/assets/images/poses/pose_10_lipstick.png',
    congrats: 'Dua sensasi bibir berkilau dan penuh pesona!'
  },
  'salsa-vinilash': {
    themeClass: 'theme-beauty-lash',
    badge: '✨ SALSA VINILASH CURLER',
    mascot: '/assets/images/poses/pose_05_jump.png',
    congrats: 'Bulu mata lentik maksimal tanpa ribet!'
  },
  'salsa-vinilash-pro': {
    themeClass: 'theme-beauty-lash',
    badge: '✨ SALSA VINILASH PRO',
    mascot: '/assets/images/poses/pose_05_jump.png',
    congrats: 'Lentik presisi tahan seharian ala pro MUA!'
  },
  'stick-hs03': {
    themeClass: 'theme-beauty-stick',
    badge: '🌟 PINKFLASH DUO MAKEUP STICK',
    mascot: '/assets/images/poses/pose_14_selfie.png',
    congrats: 'Contour & highlight praktis untuk wajah tirus bercahaya!'
  },
  'creamy-or01': {
    themeClass: 'theme-beauty-lips',
    badge: '💄 PINKFLASH CREAMY LIPGLOSS OR01',
    mascot: '/assets/images/poses/pose_10_lipstick.png',
    congrats: 'Warna peach segar yang bikin senyummu makin ceria!'
  },
  'creamy-rd01': {
    themeClass: 'theme-beauty-lips',
    badge: '💄 PINKFLASH CREAMY LIPGLOSS RD01',
    mascot: '/assets/images/poses/pose_10_lipstick.png',
    congrats: 'Merah elegan memikat untuk momen spesialmu!'
  },
  'glossy-g03': {
    themeClass: 'theme-beauty-lips',
    badge: '💄 PINKFLASH LASTING GLOSSY G03',
    mascot: '/assets/images/poses/pose_15_bouquet.png',
    congrats: 'Efek bibir plumpy berkilau kaca yang tahan lama!'
  },
  'watery-nu02': {
    themeClass: 'theme-beauty-lips',
    badge: '💄 PINKFLASH WATERY LIP CREAM NU02',
    mascot: '/assets/images/poses/pose_10_lipstick.png',
    congrats: 'Ringan seperti air, transferproof sepanjang hari!'
  },
  'balm-pk01': {
    themeClass: 'theme-beauty-lips',
    badge: '🌸 PINKFLASH COLOR REVIVING BALM',
    mascot: '/assets/images/poses/pose_13_skincare.png',
    congrats: 'Bibir lembap ternutrisi dengan rona alami yang manis!'
  }
};

const tierMeta = {
  bundling: { label: 'Bundling Utama', hint: 'Paket Misteri Cozzone', color: '#ffbe0b' },
  grand: { label: 'Voucher Utama', hint: 'Potongan Rp500.000', color: '#9d4edd' },
  voucher: { label: 'Voucher Potongan', hint: '25%, 50%, atau Rp100.000', color: '#ff2a7a' },
  product: { label: 'Produk Gratis', hint: '12 Pilihan Produk', color: '#00f0ff' },
  newuser: { label: 'Voucher Pengguna Baru', hint: 'Potongan Rp25.000', color: '#34c58a' },
  zonk: { label: 'Belum Beruntung', hint: 'Semangat, boleh coba lagi!', color: '#9a8a90' }
};

/* Four high-resolution expressions; never use the old damaged atlas cutouts. */
const MASCOT_POSES = [
  { id: 'host', name: 'Halo, B!', img: '/assets/images/mascot-v3/host.png', slogan: 'slogan-halo' },
  { id: 'focus', name: 'Siap Mencapit', img: '/assets/images/mascot-v3/focus.png', slogan: 'slogan-app' },
  { id: 'celebrate', name: 'Hore, Dapat!', img: '/assets/images/mascot-v3/celebrate.png', slogan: 'slogan-cantik' },
  { id: 'encourage', name: 'Semangat Lagi', img: '/assets/images/mascot-v3/encourage.png', slogan: 'slogan-adaada' }
];

let currentPoseIndex = 0;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const audio = new window.BoothAudio();
document.addEventListener('visibilitychange', () => audio.handleVisibility());

const $ = id => document.getElementById(id);
const cabinet = $('cabinet'), claw = $('claw'), clawSprite = $('clawSprite');
const caughtPod = $('caughtPod'), caughtImg = $('caught'), ballsDiv = $('balls');
const playBtn = $('play'), soundBtn = $('sound'), mascotBtn = $('mascot'), mascotArea = $('mascotArea');
const hostMascotImg = $('hostMascotImg'), poseBadge = $('poseBadge'), nextPoseBtn = $('nextPoseBtn');
const speech = $('speech'), errorP = $('error'), modeSpan = $('mode');
const rankingDiv = $('ranking'), oddsDiv = $('odds'), resultDialog = $('result');

let state = null, busy = false, closingResult = false, lastResultId = null;
let targetX = 50, soundOverride = null, idleTimer = null, toastTimer = null, lastMoveTone = 0, particleTimer = null;
let physicsEngine = null;
let crew = null, heroLife = null, hostLife = null;
/* A gesture that begins on a capsule must never become a cabinet-click when
   the pointer is released over empty glass.  This also makes touch dragging
   feel like stirring, not an accidental paid/demo round. */
let suppressCabinetPlayUntil = 0;
let capsuleGesturePointerId = null;
let capsuleGestureStart = null;
/* Batas geser (px) yang memisahkan "tap untuk main" dari "aduk bolanya". Cukup
   longgar untuk jari yang bergoyang di layar sentuh, cukup ketat supaya gestur
   mengaduk yang disengaja tidak pernah menghabiskan satu percobaan. */
const DRAG_SLOP = 12;
const festival = new window.FestivalFlow({
  audio,
  onReady: () => {
    renderBalls(); setClawX(50, 1); setMachineState('BIDIK LALU CAPIT');
    /* Runner baru punya lebar jalur setelah panggung terlihat. */
    crew?.layout(); crew?.start(); setCrowdState('aim');
    hostLife?.start();
  },
  onHome: () => {
    /* Denyut menganggur juga dimatikan: di Home pit tidak terlihat, dan tanpa
       ini timer-nya terus membangunkan engine tiap 2,3 detik. */
    physicsEngine?.stop(); physicsEngine?.stopIdleDrift(); caughtPod.hidden = true;
    /* Ronde berikutnya harus mulai dengan pit utuh: kapsul yang tertangkap
       disembunyikan lewat opacity, jadi tanpa ini lubangnya ikut terbawa. */
    pitKey = '';
    /* Jalur maskot tidak terlihat di Home: hentikan supaya tidak membakar CPU. */
    crew?.stop();
  }
});

const visualSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function api(route, data) {
  const options = { headers: { 'Content-Type': 'application/json', 'x-bpedia-client': 'nyapit' } };
  if (data !== undefined) { options.method = 'POST'; options.body = JSON.stringify(data); }
  const response = await fetch(route, options);
  let body;
  try { body = await response.json(); } catch { body = { error: 'Respons server lokal tidak dapat dibaca.' }; }
  if (!response.ok) throw new Error(body.error || 'Permintaan gagal.');
  return body;
}

function setError(msg = '') { errorP.textContent = msg; }
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
}

function setMachineState(label, isBusy = false) {
  const el = $('machineState');
  el.innerHTML = `<i aria-hidden="true"></i> ${esc(label)}`;
  el.classList.toggle('busy', isBusy);
}

/* Pose menentukan gambar; MascotLife menentukan bagaimana ia bergerak. */
const POSE_LIFE = { host: 'idle', focus: 'focus', celebrate: 'celebrate', encourage: 'sad' };

function setHostPose(poseItem, playSlogan = true) {
  if (!poseItem) return;
  mascotArea.dataset.pose = poseItem.id;
  if (hostMascotImg) hostMascotImg.src = poseItem.img;
  if (poseBadge) poseBadge.textContent = `Gaya: ${poseItem.name}`;
  hostLife?.setState(POSE_LIFE[poseItem.id] || 'idle');
  if (playSlogan && poseItem.slogan) {
    say(poseItem.slogan);
  }
}

function cycleHostPose() {
  currentPoseIndex = (currentPoseIndex + 1) % MASCOT_POSES.length;
  setHostPose(MASCOT_POSES[currentPoseIndex], true);
  /* Lompatan kecil ditangani pegas di MascotLife, bukan transition sekali pakai
     yang akan bertabrakan dengan gerak idle. */
  hostLife?.pulse(1.2);
}

function setClawPose(poseType) {
  if (!clawSprite) return;
  // Keep the grasping hands consistent from aiming through lifting.
  const pose = poseType === 'slip' ? 'encourage' : 'focus';
  clawSprite.src = `/assets/images/mascot-v3/${pose}.png`;
  claw.dataset.phase = poseType;
}

function spawnParticles() {
  if (reducedMotion.matches || busy) return;
  const pit = ballsDiv;
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'cabinet-particle';
    el.textContent = ['✦', '♡', '✧', '·', '⚡'][Math.floor(Math.random() * 5)];
    el.style.cssText = `position:absolute;left:${8 + Math.random() * 84}%;bottom:${Math.random() * 30}%;font-size:${8 + Math.random() * 8}px;color:rgba(255,220,130,${.4 + Math.random() * .4});z-index:5;pointer-events:none;animation:particle-drift ${2 + Math.random() * 2}s ease-out forwards;--drift:${(Math.random() - .5) * 30}px`;
    pit.appendChild(el); setTimeout(() => el.remove(), 4200);
  }
}

function screenShake(intensity = 3) {
  if (reducedMotion.matches) return;
  const el = document.querySelector('.game-shell');
  el.style.transition = 'transform 60ms ease';
  el.style.transform = `translate(${(Math.random() - .5) * intensity}px, ${(Math.random() - .5) * intensity}px)`;
  setTimeout(() => { el.style.transform = `translate(${(Math.random() - .5) * intensity * .6}px, ${(Math.random() - .5) * intensity * .6}px)`; }, 70);
  setTimeout(() => { el.style.transform = ''; el.style.transition = ''; }, 150);
}

function renderState({ preserveSound = false } = {}) {
  if (!state) return;
  const live = state.settings.mode === 'live';
  modeSpan.textContent = live ? 'PERMAINAN RESMI' : 'MODE DEMO';
  modeSpan.classList.toggle('live', live);
  if (soundOverride === null) audio.configure(state.settings);
  else audio.configure({ ...state.settings, sound: soundOverride });
  updateSoundButton();
  renderOdds(); renderRanking(); renderModeSwitch();
  festival.update(state);
  if (festival.phase !== 'home') renderBalls();
  const paused = state.settings.paused;
  playBtn.disabled = busy || paused;
  playBtn.querySelector('small').textContent = paused ? 'DIJEDA OLEH PETUGAS' : busy ? 'CAPIT SEDANG BEKERJA' : 'MASKOT B! SIAP MENGAMBIL BOLA';
  playBtn.querySelector('b').textContent = paused ? 'PERMAINAN DIJEDA' : busy ? 'SEDANG MENCAPIT…' : 'CAPIT SEKARANG';
  $('stockNotice').classList.toggle('danger', state.stats.allRewardsDepleted);
  const unverified = state.prizes.filter(prize => prize.enabled && !prize.imageChecked).length;
  $('stockNotice').innerHTML = state.stats.allRewardsDepleted
    ? '<span aria-hidden="true">!</span> Semua hadiah fisik habis. Sistem otomatis hanya mengeluarkan hasil zonk.'
    : `<span aria-hidden="true">◆</span> ${live ? 'Peluang menyesuaikan stok aktif secara otomatis.' : `Mode demo tidak mengurangi stok${unverified ? ` · ${unverified} foto menunggu verifikasi` : ''}.`}`;
  if (paused) setMachineState('DIJEDA PETUGAS');
  else if (!busy) setMachineState('SIAP MAIN');
  if (state.pending && !resultDialog.open) {
    busy = true; playBtn.disabled = true; setMachineState('HASIL DIPULIHKAN', true); showResult(state.pending, true);
  }
}

/* ---- Tombol mode Demo / Permainan Resmi ---------------------------------
   Sesuai permintaan booth, pergantian mode di sini TIDAK meminta PIN admin.
   Konsekuensinya siapa pun yang berdiri di depan layar bisa menyalakan mode
   resmi, dan setiap permainan resmi mengurangi stok hadiah fisik sungguhan.
   Petugas perlu mengawasi layar Home selama acara. */
const modeSwitch = document.querySelector('.mode-switch');
const modeButtons = [...document.querySelectorAll('.mode-switch-btn')];
let modeBusy = false;

function renderModeSwitch() {
  if (!modeSwitch || !state) return;
  const mode = state.settings.mode === 'live' ? 'live' : 'demo';
  modeSwitch.dataset.mode = mode;
  for (const button of modeButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    button.disabled = modeBusy;
  }
}

async function setMode(mode) {
  if (modeBusy || !state || state.settings.mode === mode) return;
  modeBusy = true; renderModeSwitch();
  try {
    state = await api('/api/mode', { mode });
    renderState({ preserveSound: true });
    if (audio.enabled) audio.modeFlip(mode === 'live');
    toast(mode === 'live'
      ? 'Permainan resmi aktif. Stok hadiah asli akan berkurang.'
      : 'Mode demo aktif. Stok dan peringkat tidak berubah.');
  } catch (error) {
    /* Paling sering: hasil permainan belum ditutup (engine.ensureMutable). */
    toast(error.message);
  } finally {
    modeBusy = false; renderModeSwitch();
  }
}

for (const button of modeButtons) {
  button.addEventListener('click', () => setMode(button.dataset.mode));
}

function renderOdds() {
  oddsDiv.innerHTML = Object.entries(state.odds).map(([tier, value]) => {
    const meta = tierMeta[tier] || { label: tier, hint: '', color: '#ff2a7a' };
    return `<div class="odd-row" style="--dot:${meta.color}"><i aria-hidden="true"></i><div><b>${esc(meta.label)}</b><small>${esc(meta.hint)}</small></div><span class="odd-value">${Number(value).toFixed(1)}%</span></div>`;
  }).join('');
}

function renderRanking() {
  if (!state.leaderboard.length) {
    rankingDiv.innerHTML = '<div class="empty-state">Belum ada pemain di mode resmi.<br>Jadilah Cozzone Lucky Beauty pertama!</div>';
    return;
  }
  rankingDiv.innerHTML = state.leaderboard.slice(0, 7).map((row, index) => `<div class="rank-row"><span class="rank-medal">${index === 0 ? '★' : index + 1}</span><div class="rank-copy"><b>${esc(row.username)}</b><small>${row.won} hadiah · ${row.plays} main</small></div><span class="rank-points">${row.points}<small>POIN</small></span></div>`).join('');
}

function hash(text) { let val = 2166136261; for (const char of text) val = Math.imul(val ^ char.charCodeAt(0), 16777619); return val >>> 0; }

let pitKey = '';
const mobileArena = window.matchMedia('(max-width: 760px)');

function capsuleLayout() {
  if (window.innerWidth <= 420) return { rows: [4, 4, 4], gap: 27 };
  if (mobileArena.matches) return { rows: [6, 6, 6], gap: 29 };
  return { rows: [11, 10, 11, 10, 11], gap: 28 };
}

function renderBalls() {
  const prizes = state.prizes.filter(prize => prize.enabled && (prize.stock === null || prize.stock > 0));
  if (!prizes.length) {
    ballsDiv.innerHTML = '';
    pitKey = '';
    if (physicsEngine) { physicsEngine.stop(); physicsEngine.stopIdleDrift(); }
    return;
  }

  /* Penyegaran state berjalan tiap 15 detik dan dulu selalu membangun ulang
     seluruh pit. Akibatnya kapsul yang sedang diam tiba-tiba dibuat ulang dan
     harus menata diri dari awal — terlihat seperti tumpukan yang berkedut
     sendiri tiap belasan detik. Sekarang pit hanya dibangun ulang kalau daftar
     hadiahnya benar-benar berubah. */
  const layout = capsuleLayout();
  const nextKey = JSON.stringify([layout.rows, ...prizes.map(prize => [prize.id, prize.image, prize.tier])]);
  if (nextKey === pitKey && ballsDiv.querySelector('.prize-ball')) return;
  pitKey = nextKey;
  /* v1.3.1: lima baris, bukan enam. Kapsul tetap besar dan rapat sehingga
     tumpukan terlihat penuh, tetapi puncaknya turun dan papan neon
     "COZZONE UP 2026" di latar kabinet tidak lagi tertutup kapsul.
     (v1.2 mengisi 24% kabinet dengan 70 bola; v1.3 sempat 69 bola/6 baris.) */
  const rowCounts = layout.rows;
  const ROW_GAP = layout.gap;
  const ballsData = [];
  let prizeIndex = 0;

  rowCounts.forEach((count, row) => {
    for (let col = 0; col < count; col++) {
      const prize = prizes[prizeIndex % prizes.length];
      prizeIndex++;
      const seed = hash(`${visualSeed}-${row}-${col}-${prize.id}`);
      const colWidth = (mobileArena.matches ? 82 : 88) / (count - 1);
      const stagger = (row % 2 === 1) ? (colWidth * 0.5) : 0;
      const x = mobileArena.matches
        ? clamp(8 + col * colWidth + stagger + ((seed % 7) - 3) * 0.4, 8, 90)
        : clamp(6 + col * colWidth + stagger + ((seed % 7) - 3) * 0.4, 4, 96);
      /* y diukur dari dasar pit ke atas (lihat BallPhysicsEngine.init). */
      const y = 5 + row * ROW_GAP + ((seed >>> 4) % 4);
      const rotation = (seed % 31) - 15;
      const scale = (0.86 + row * 0.018 + ((seed >>> 7) % 8) / 100).toFixed(2);
      const z = 10 + row * 2;
      const surface = row === rowCounts.length - 1;
      const hopDelay = `${(-col * 0.13 - ((seed >>> 10) % 5) * 0.04).toFixed(2)}s`;
      const hopDuration = `${(1.85 + ((seed >>> 13) % 8) / 20).toFixed(2)}s`;
      ballsData.push({ prize, x: x.toFixed(2), y, rotation, scale, z, surface, hopDelay, hopDuration });
    }
  });

  ballsDiv.innerHTML = ballsData.map(({ prize, z, surface, hopDelay, hopDuration }, idx) => {
    return `<div id="ball-${idx}" class="prize-ball tier-${esc(prize.tier)}${surface ? ' surface-ball' : ''}" role="button" tabindex="0" aria-label="Usik kapsul ${esc(prize.name)}" data-prize-id="${esc(prize.id)}" style="--z:${z};--hop-delay:${hopDelay};--hop-duration:${hopDuration}" title="Sentuh/klik untuk membal: ${esc(prize.name)}"><div class="ball-shell"><img src="${esc(prize.image)}" alt="" aria-hidden="true"></div></div>`;
  }).join('');

  for (const image of ballsDiv.querySelectorAll('img')) {
    image.addEventListener('error', () => {
      image.src = '/assets/brand/bpedia-logo.png';
      image.closest('.prize-ball')?.classList.add('image-missing');
    }, { once: true });
  }

  /* Integrasi engine fisika interaktif */
  ballsData.forEach((item, idx) => {
    item.element = $(`ball-${idx}`);
  });

  if (!physicsEngine) {
    physicsEngine = new window.BallPhysicsEngine(ballsDiv, {
      onBounceSound: pitch => {
        if (audio.enabled) audio.ballBounce(pitch);
      }
    });
  }
  physicsEngine.init(ballsData);
}

let arenaResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(arenaResizeTimer);
  arenaResizeTimer = setTimeout(() => {
    if (state && !busy && festival.phase !== 'home') renderBalls();
  }, 160);
}, { passive: true });

/* Jangkauan bidik dibaca dari DOM, bukan angka tetap. Sejak v1.3 kapsul hanya
   ada di kanan dinding keranjang hadiah, jadi batas lama 10–90% akan
   mengarahkan capit ke ruang kosong di atas keranjang. */
function aimBounds() {
  const lane = cabinetLane();
  const pit = ballsDiv.getBoundingClientRect();
  if (!lane.width || !pit.width) return { min: 22, max: 94 };
  const min = ((pit.left - lane.left) / lane.width) * 100 + 4;
  const max = ((pit.left + pit.width - lane.left) / lane.width) * 100 - 4;
  return max > min ? { min, max } : { min: 22, max: 94 };
}

/* Titik jatuh hadiah: mulut keranjang, dalam persen lebar kabinet. */
function chuteAimPercent() {
  const lane = cabinetLane();
  if (mobileArena.matches) {
    const external = document.querySelector('#mobilePrizeBay .chute')?.getBoundingClientRect();
    if (!lane.width || !external?.width) return 76;
    return clamp(((external.left + external.width / 2 - lane.left) / lane.width) * 100, 20, 78);
  }
  const chute = document.querySelector('.chute')?.getBoundingClientRect();
  if (!lane.width || !chute?.width) return 9;
  return clamp(((chute.left + chute.width / 2 - lane.left) / lane.width) * 100, 3, 42);
}

function activeChute() {
  return document.querySelector(mobileArena.matches ? '#mobilePrizeBay .chute' : '.chute-bay .chute');
}

async function animateMobilePrizeDrop(duration) {
  const destination = activeChute()?.getBoundingClientRect();
  const origin = caughtPod.getBoundingClientRect();
  if (!destination?.width || !origin.width || reducedMotion.matches) return;
  const size = Math.max(28, Math.min(42, origin.width));
  const capsule = document.createElement('img');
  capsule.src = caughtImg.src;
  capsule.alt = '';
  capsule.className = 'mobile-drop-pod';
  capsule.style.width = `${size}px`;
  capsule.style.height = `${size}px`;
  capsule.style.left = `${origin.left + origin.width / 2 - size / 2}px`;
  capsule.style.top = `${origin.top + origin.height / 2 - size / 2}px`;
  document.body.append(capsule);
  caughtPod.hidden = true;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const dx = destination.left + destination.width / 2 - (origin.left + origin.width / 2);
  const dy = destination.top + destination.height * .42 - (origin.top + origin.height / 2);
  capsule.style.transition = `transform ${duration}ms cubic-bezier(.36,.02,.7,1), opacity ${duration}ms ease-in`;
  capsule.style.transform = `translate(${dx}px,${dy}px) scale(.65)`;
  capsule.style.opacity = '.2';
  await wait(duration + 40);
  capsule.remove();
}

function setClawX(percent, duration = 120) {
  const bounds = aimBounds();
  targetX = clamp(percent, bounds.min, bounds.max);
  claw.style.transitionDuration = `${duration}ms`;
  claw.style.left = `${targetX}%`;
  $('aimGuide').style.left = `${targetX}%`;
}

function aimFromClientX(clientX, duration = 120) {
  const rect = cabinetLane();
  if (!rect.width) return targetX;
  setClawX((clientX - rect.left) / rect.width * 100, duration);
  return targetX;
}

function cabinetLane() {
  const rect = cabinet.getBoundingClientRect();
  const scale = cabinet.offsetWidth ? rect.width / cabinet.offsetWidth : 1;
  return {left:rect.left+(cabinet.clientLeft||0)*scale,width:(cabinet.clientWidth||rect.width)*scale};
}

function captureAimX() {
  const bounds = aimBounds();
  return clamp(targetX, bounds.min, bounds.max);
}

function cabinetPercentToPitPercent(cabinetPercent) {
  const cabinetRect = cabinetLane();
  const pitRect = ballsDiv.getBoundingClientRect();
  if (!cabinetRect.width || !pitRect.width) return clamp(cabinetPercent, 0, 100);
  const clientX = cabinetRect.left + (clamp(cabinetPercent, 0, 100) / 100) * cabinetRect.width;
  return clamp(((clientX - pitRect.left) / pitRect.width) * 100, 0, 100);
}

function cabinetTopToPitY(cabinetTop) {
  const cabinetRect = cabinet.getBoundingClientRect();
  const pitRect = ballsDiv.getBoundingClientRect();
  return cabinetTop - (pitRect.top - cabinetRect.top);
}

function getBallAtPitPercent(pitPercent) {
  if (!physicsEngine) return null;
  const pitRect = ballsDiv.getBoundingClientRect();
  const targetXInPit = (clamp(pitPercent, 0, 100) / 100) * pitRect.width;

  /* BallPhysicsEngine stores `currentX` as its translated left edge.  Choose
     by centre here so an aim near a capsule cannot be biased to its left-hand
     neighbour.  Keep the engine fallback for test doubles and legacy state. */
  if (Array.isArray(physicsEngine.balls)) {
    let nearest = null;
    let nearestDistance = Infinity;
    const surface = physicsEngine.balls.filter(ball => !ball.isCaptured && ball.element?.classList?.contains('surface-ball'));
    for (const ball of surface.length ? surface : physicsEngine.balls) {
      if (ball.isCaptured) continue;
      const diameter = Number(ball.diameter) || ball.element?.getBoundingClientRect?.().width || 0;
      const centerX = Number(ball.currentX) + diameter / 2;
      const distance = Math.abs(centerX - targetXInPit);
      if (distance < nearestDistance) {
        nearest = ball;
        nearestDistance = distance;
      }
    }
    return nearest;
  }
  return physicsEngine.getBallAtTarget?.(pitPercent, null) || null;
}

cabinet.addEventListener('pointermove', event => {
  if (busy || !festival.ready) return;
  aimFromClientX(event.clientX);
  if (audio.enabled && performance.now() - lastMoveTone > 150) {
    audio.move(); lastMoveTone = performance.now();
  }
});

ballsDiv.addEventListener('pointerdown', event => {
  if (busy || !festival.ready || !event.target.closest('.prize-ball')) return;
  /* Bidik kapsul yang disentuh. Listener fisika mengurus pantulannya. */
  aimFromClientX(event.clientX, 90);
  capsuleGesturePointerId = event.pointerId;
  capsuleGestureStart = { x: event.clientX, y: event.clientY };
});

window.addEventListener('pointerup', event => {
  if (event.pointerId !== capsuleGesturePointerId) return;
  /* Tap pada kapsul = bermain; menggeser kapsul = hanya mengusik.
     Pemain mengharapkan "klik di mana pun, capit turun" — termasuk klik tepat
     di atas bola. Yang tetap harus dilindungi hanyalah gestur mengaduk: kalau
     jari digeser lebih dari DRAG_SLOP piksel, itu bukan niat bermain. */
  const start = capsuleGestureStart;
  const dragged = start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_SLOP;
  suppressCabinetPlayUntil = dragged ? performance.now() + 260 : 0;
  capsuleGesturePointerId = null;
  capsuleGestureStart = null;
}, { passive: true });

window.addEventListener('pointercancel', event => {
  if (event.pointerId === capsuleGesturePointerId) {
    suppressCabinetPlayUntil = performance.now() + 120;
    capsuleGesturePointerId = null;
    capsuleGestureStart = null;
  }
}, { passive: true });

cabinet.addEventListener('click', event => {
  if (busy || !festival.ready) return;
  /* Gestur mengaduk baru saja selesai: jangan ubah lepasannya jadi ronde. */
  if (performance.now() < suppressCabinetPlayUntil) return;
  /* Kontrol nyata (tombol, maskot kecil) tetap mengerjakan tugasnya sendiri.
     Kapsul TIDAK lagi dikecualikan di sini — itu justru area yang paling wajar
     diklik pemain. */
  if (event.target.closest('.cozzone-crowd, button')) return;
  /* Tap layar sentuh tidak selalu mengirim pointermove lebih dulu, jadi bidik
     dulu supaya koordinat yang dikunci adalah titik yang benar-benar ditekan. */
  if (Number.isFinite(event.clientX) && event.clientX !== 0) aimFromClientX(event.clientX, 90);
  triggerPlay();
});

playBtn.addEventListener('click', () => triggerPlay());

window.addEventListener('keydown', event => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
  if (event.key === 'Escape' && resultDialog.open) { event.preventDefault(); finishResult(); return; }
  /* Kios bisa aktif tanpa fullscreen perangkat (mis. permintaan ditolak); Esc
     bawaan peramban tidak akan menolongnya, jadi ditangani di sini. */
  if (event.key === 'Escape' && kioskOn && !document.fullscreenElement) { event.preventDefault(); exitKiosk(); return; }
  if (resultDialog.open) return;
  if (typing) {
    if (event.key === 'Enter' && event.target === $('username')) { event.preventDefault(); triggerPlay(); }
    return;
  }
  const interactive = event.target.closest?.('button,a,[role="button"],[contenteditable="true"]');
  if (event.key.toLowerCase() === 'm') { event.preventDefault(); soundBtn.click(); return; }
  if (!festival.ready) return;
  if (interactive && interactive !== cabinet) return;
  if(event.code==='Space'||event.key==='Enter'){event.preventDefault();triggerPlay();}
  else if((event.key==='ArrowLeft'||event.key.toLowerCase()==='a')&&!busy){
    event.preventDefault();setClawX(targetX-4);audio.move();
  }
  else if((event.key==='ArrowRight'||event.key.toLowerCase()==='d')&&!busy){
    event.preventDefault();setClawX(targetX+4);audio.move();
  }
});

/* Pose interaktif yang berganti dinamis mengikuti pergerakan kursor mouse */
const MOUSE_REACTIVE_POSES = [
  { id: 'host', name: 'Menyapa Kamu ♡', img: '/assets/images/mascot-v3/host.png', life: 'idle' },
  { id: 'focus', name: 'Fokus Membidik ⌖', img: '/assets/images/mascot-v3/focus.png', life: 'focus' },
  { id: 'celebrate', name: 'Heboh Hadiah! ★', img: '/assets/images/mascot-v3/celebrate.png', life: 'celebrate' },
  { id: 'encourage', name: 'Semangat Capit! ⚡', img: '/assets/images/mascot-v3/encourage.png', life: 'excited' },
  { id: 'shop', name: 'Yuk Belanja! 🛍️', img: '/assets/images/poses/pose_12_shop.png', life: 'idle' },
  { id: 'skincare', name: 'Glowing Bpedia ✿', img: '/assets/images/poses/pose_13_skincare.png', life: 'idle' },
  { id: 'jump', name: 'Lompat Ceria ✦', img: '/assets/images/poses/pose_05_jump.png', life: 'celebrate' },
  { id: 'point', name: 'Tunjuk Target ☞', img: '/assets/images/poses/pose_06_point.png', life: 'focus' }
];

let lastMouseX = 0, lastMouseY = 0, mouseTravel = 0, lastPoseChangeTime = 0;
let mousePoseIdx = 0;

function handleMascotMouseMove(clientX, clientY) {
  if (busy || resultDialog.open || reducedMotion.matches) return;
  const now = performance.now();
  const dx = clientX - (lastMouseX || clientX);
  const dy = clientY - (lastMouseY || clientY);
  const dist = Math.hypot(dx, dy);
  lastMouseX = clientX;
  lastMouseY = clientY;
  mouseTravel += dist;

  // Ubah pose secara dinamis saat mouse bergerak > 130px dan jeda minimal 280ms
  if (mouseTravel > 130 && now - lastPoseChangeTime > 280) {
    mouseTravel = 0;
    lastPoseChangeTime = now;

    const cabRect = cabinet?.getBoundingClientRect();
    let nextPose;
    if (cabRect && clientX >= cabRect.left && clientX <= cabRect.right) {
      const relY = (clientY - cabRect.top) / cabRect.height;
      if (relY > 0.52) {
        const pitPoses = [MOUSE_REACTIVE_POSES[2], MOUSE_REACTIVE_POSES[6]];
        nextPose = pitPoses[Math.floor(Math.random() * pitPoses.length)];
      } else if (dist > 20) {
        const fastPoses = [MOUSE_REACTIVE_POSES[3], MOUSE_REACTIVE_POSES[7]];
        nextPose = fastPoses[Math.floor(Math.random() * fastPoses.length)];
      } else {
        nextPose = MOUSE_REACTIVE_POSES[1];
      }
    } else if (cabRect && clientX < cabRect.left) {
      const hostPoses = [MOUSE_REACTIVE_POSES[0], MOUSE_REACTIVE_POSES[4], MOUSE_REACTIVE_POSES[5]];
      nextPose = hostPoses[Math.floor(Math.random() * hostPoses.length)];
    } else {
      mousePoseIdx = (mousePoseIdx + 1) % MOUSE_REACTIVE_POSES.length;
      nextPose = MOUSE_REACTIVE_POSES[mousePoseIdx];
    }

    if (nextPose) {
      if (hostMascotImg && hostMascotImg.src !== location.origin + nextPose.img) {
        hostMascotImg.src = nextPose.img;
      }
      if (poseBadge) poseBadge.textContent = `Gaya: ${nextPose.name}`;
      mascotArea.dataset.pose = nextPose.id;
      hostLife?.setState(nextPose.life || 'idle');
      hostLife?.pulse(0.35);
    }
  }
}

/* v1.2 membuat maskot menghindar dari kursor, yang terbaca seperti glitch.
   Sekarang ia condong ke arah kursor: pemain merasa diperhatikan, dan pose berganti dinamis. */
let mascotFrame = 0;
window.addEventListener('pointermove', event => {
  if (reducedMotion.matches || mascotFrame) return;
  mascotFrame = requestAnimationFrame(() => {
    mascotFrame = 0;
    if (festival.phase === 'home') heroLife?.aimAt(event.clientX, event.clientY);
    else if (!busy) {
      hostLife?.aimAt(event.clientX, event.clientY);
      handleMascotMouseMove(event.clientX, event.clientY);
    }
  });
}, { passive: true });

function scheduleIdlePose() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!busy && !resultDialog.open && !reducedMotion.matches) {
      /* Jangan pilih pose 'encourage' di sini: itu pose menghibur setelah zonk,
         dan memakainya saat menganggur membuat maskot terlihat murung sendiri. */
      const idlePoses = MASCOT_POSES.filter(pose => pose.id !== 'encourage');
      setHostPose(idlePoses[Math.floor(Math.random() * idlePoses.length)], false);
    }
    scheduleIdlePose();
  }, 6500 + Math.random() * 4500);
}

/* Interaksi tombol ganti gaya & sentuh maskot */
if (nextPoseBtn) {
  nextPoseBtn.addEventListener('click', e => {
    e.stopPropagation();
    cycleHostPose();
  });
}
mascotBtn.addEventListener('click', () => {
  cycleHostPose();
  if (audio.enabled) audio.ballBounce(1.25);
});

function updateSoundButton() {
  soundBtn.setAttribute('aria-pressed', String(audio.enabled));
  soundBtn.setAttribute('aria-label', audio.enabled ? 'Matikan suara' : 'Nyalakan suara');
  soundBtn.querySelector('span').textContent = audio.enabled ? '♫' : '♪';
  soundBtn.querySelector('b').textContent = audio.enabled ? 'Suara nyala' : 'Suara mati';
  window.dispatchEvent(new CustomEvent('gamysuf:audio-state', { detail: { muted: !audio.enabled } }));
}

soundBtn.addEventListener('click', async () => {
  audio.enabled = !audio.enabled; soundOverride = audio.enabled; audio.apply(); updateSoundButton();
  if (audio.enabled) { await audio.activate(); audio.startBgm(); if (festival.phase === 'grab') audio.startSuspense(); else say('slogan-app'); toast('Suara festival dinyalakan.'); }
  else { audio.stopBgm(); toast('Suara booth dimatikan.'); }
});

window.addEventListener('gamysuf:audio', async event => {
  if (typeof event.detail?.muted !== 'boolean') return;
  audio.enabled = !event.detail.muted;
  soundOverride = audio.enabled;
  audio.apply();
  updateSoundButton();
  if (audio.enabled) await audio.startBgm();
  else audio.stopBgm();
});
window.addEventListener('gamysuf:audio-query', () => {
  window.dispatchEvent(new CustomEvent('gamysuf:audio-state', { detail: { muted: !audio.enabled } }));
});

async function unlockBackgroundMusic() {
  if (!audio.enabled) return;
  await audio.startBgm();
  if (audio.ctx?.state === 'running' && audio.bgm) {
    window.removeEventListener('pointerdown', unlockBackgroundMusic);
    window.removeEventListener('keydown', unlockBackgroundMusic);
  }
}
window.addEventListener('pointerdown', unlockBackgroundMusic, { passive: true });
window.addEventListener('keydown', unlockBackgroundMusic);

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) $('confetti').innerHTML = '';
  physicsEngine?.setReducedMotion(reducedMotion.matches);
});

/* ---- Mode kios / layar penuh ---------------------------------------------
   Mode kios TIDAK digantungkan pada document.fullscreenElement. Di aplikasi
   desktop, F11 ditangani proses utama lewat win.setFullScreen() dan itu tidak
   memicu event `fullscreenchange` di halaman — akibatnya tombol Layar penuh
   terasa tidak berfungsi. Sekarang kios adalah keadaan yang kita pegang
   sendiri, dan fullscreen perangkat hanyalah pelengkap yang boleh gagal. */
let kioskOn = false;

function applyKiosk(on) {
  kioskOn = on;
  document.body.classList.toggle('kiosk', on);
  const button = $('fullscreen');
  button.querySelector('b').textContent = on ? 'Keluar penuh' : 'Layar penuh';
  button.setAttribute('aria-label', on ? 'Keluar layar penuh' : 'Masuk layar penuh');
  button.setAttribute('aria-pressed', String(on));
  /* Ukuran kabinet berubah drastis, jadi jangkauan bidik, tata letak kapsul,
     dan jalur maskot kecil harus dihitung ulang terhadap ukuran barunya. */
  requestAnimationFrame(() => {
    crew?.layout();
    physicsEngine?.reflow();
    if (festival.ready) setClawX(targetX, 1);
  });
}

async function enterKiosk() {
  applyKiosk(true);
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    toast('Layar penuh perangkat ditolak. Tampilan mesin tetap diperbesar.');
  }
}

async function exitKiosk() {
  applyKiosk(false);
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
}

$('fullscreen').addEventListener('click', () => (kioskOn ? exitKiosk() : enterKiosk()));
$('kioskExit').addEventListener('click', exitKiosk);

/* Ikuti perubahan yang datang dari luar tombol (Esc bawaan peramban, F11). */
document.addEventListener('fullscreenchange', () => {
  const full = Boolean(document.fullscreenElement);
  if (full !== kioskOn) applyKiosk(full);
});

function say(key) { speech.textContent = audioScript[key] || key; audio.slogan(key); }

/* Selang-seling celetuk MC dengan slogan merek. Satu suara saja per momen:
   BoothAudio.slogan() memotong suara sebelumnya, jadi menumpuk keduanya hanya
   akan saling memakan. */
function sayEither(mcKey, brandKey) { say(Math.random() < .55 ? mcKey : brandKey); }
function setProgress(msg, detail) {
  const el = $('cabinetMessage');
  el.querySelector('b').textContent = msg;
  el.querySelector('span').textContent = detail || '';
  el.classList.add('visible');
}
function clearProgress() { setTimeout(() => $('cabinetMessage').classList.remove('visible'), 180); }

/* Suasana panggung dipetakan ke perilaku geng maskot kecil.  `cheer` dipakai
   saat panggung belum dibuka; begitu pemain membidik mereka jadi lebih gelisah,
   dan saat capit menukik mereka mengejarnya sambil melempari bola. */
const CROWD_MOODS = { tense: 'tense', win: 'win', zonk: 'zonk' };

function setCrowdState(stage) {
  const crowd = $('cozzoneCrowd');
  if (crowd) crowd.dataset.state = stage;
  crew?.setMood(CROWD_MOODS[stage] || (festival.ready ? 'aim' : 'cheer'));
}

/* Titik incar lemparan: telapak capit, dalam koordinat viewport. */
function clawPoint() {
  if (festival.phase === 'home') return null;
  const rect = claw.getBoundingClientRect();
  if (!rect.width) return null;
  return { x: rect.left + rect.width / 2, y: rect.bottom - 22 };
}

function initCozzoneCrowd() {
  const track = $('crowdTrack'), layer = $('tossLayer');
  if (!track || !layer || !window.RunnerCrew) return;
  crew = new window.RunnerCrew(track, layer, {
    riderLayer: $('riderLayer'),
    getClawPoint: clawPoint,
    /* Lemparan sering; bunyikan sebagian saja supaya tidak jadi derau. */
    onToss: () => { if (audio.enabled && Math.random() < .34) audio.tossWhoosh(); },
    onPoke: () => {
      if (audio.enabled) audio.ballBounce(1.35);
      const phrases = ['slogan-halo', 'slogan-cantik', 'slogan-belanja', 'slogan-app'];
      say(phrases[Math.floor(Math.random() * phrases.length)]);
    }
  });
  crew.build();
  let layoutTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(() => crew.layout(), 140);
  }, { passive: true });
}

function initMascots() {
  if (!window.MascotLife) return;
  const hero = document.querySelector('.hero-mascot');
  if (hero) {
    heroLife = new window.MascotLife(hero, {
      wrap: document.querySelector('.hero-mascot-wrap'),
      shadow: document.querySelector('.hero-show .mascot-ground-shadow'),
      leanRange: 520
    });
    heroLife.setState('idle');
    heroLife.start();
  }
  if (hostMascotImg) {
    hostLife = new window.MascotLife(hostMascotImg, { leanRange: 340 });
    hostLife.setState('idle');
    hostLife.start();
  }
}

async function triggerPlay() {
  if (busy || !state || !festival.ready) return;
  if (state.settings.paused) { toast('Permainan sedang dijeda oleh petugas.'); return; }
  /* The server chooses the audited prize from odds/stock.  It must not choose
     the on-screen X coordinate: this lock is the player's actual aim. */
  const lockedAimX = captureAimX();
  festival.grab();
  setError(); busy = true; playBtn.disabled = true; setMachineState('MASKOT B! MENUKIK', true);
  setHostPose(MASCOT_POSES.find(p => p.id === 'focus'), false);
  setCrowdState('tense');
  playBtn.querySelector('small').textContent = 'B! SEDANG MENJANGKAU BOLA…';
  playBtn.querySelector('b').textContent = 'SEDANG MENCAPIT…';

  try {
    await audio.activate();
    if (audio.enabled) {
      audio.startSuspense();
      audio.djScratch();
      audio.startBgm();
      /* Sesudah startSuspense, bukan sebelum: startSuspense menghentikan suara
         yang sedang berjalan, jadi urutan terbalik akan memotong celetuknya. */
      say('mc-tegang');
    }
    const requestId = `req-${crypto.randomUUID()}`;
    const result = await api('/api/play', { requestId, username: $('username').value.trim() });
    await animateClaw(result, lockedAimX);
    showResult(result, false);
  } catch (error) {
    festival.recover();
    setError(error.message); toast(error.message); busy = false; playBtn.disabled = state.settings.paused;
    setHostPose(MASCOT_POSES[0], false); setCrowdState('cheer');
    setMachineState(state.settings.paused ? 'DIJEDA PETUGAS' : 'SIAP MAIN');
    playBtn.querySelector('small').textContent = state.settings.paused ? 'DIJEDA OLEH PETUGAS' : 'MASKOT B! SIAP MENGAMBIL BOLA';
    playBtn.querySelector('b').textContent = state.settings.paused ? 'PERMAINAN DIJEDA' : 'CAPIT SEKARANG';
  }
}

async function moveClaw({ left, top, duration }) {
  claw.style.transitionDuration = `${Math.max(1, duration)}ms`;
  /* Batas longgar: animasi terskrip harus boleh keluar dari jangkauan bidik
     pemain untuk mengantar hadiah ke keranjang di sisi kiri. */
  if (left !== undefined) { targetX = clamp(left, 3, 97); claw.style.left = `${targetX}%`; }
  if (top !== undefined) claw.style.top = `${top}px`;
  await wait(duration);
}

async function animateClaw(result, lockedAimX) {
  const total = reducedMotion.matches ? 850 : clamp(Number(result.duration) || 6000, 3000, 12000);
  const phase = frac => Math.max(reducedMotion.matches ? 60 : 120, Math.round(total * frac));
  const isWin = result.prize.tier !== 'zonk';

  /* Visual target is always the capsule nearest the player's locked aim.
     Do not retarget to the server-selected prize ID: that was the source of
     the side-jump to an adjacent capsule after clicking Play. */
  const bounds = aimBounds();
  const destination = clamp(lockedAimX, bounds.min, bounds.max);
  /* `destination` is cabinet-relative; the pit is inset on both sides, so
     convert before asking its physics coordinates for the closest capsule. */
  const pitDestination = cabinetPercentToPitPercent(destination);
  const targetBall = getBallAtPitPercent(pitDestination);
  const cRect = cabinet.getBoundingClientRect();
  let dropTop = Math.max(100, cRect.height - 230);

  if (targetBall) {
    const ballRect = targetBall.element.getBoundingClientRect();
    const clawHeight = claw.getBoundingClientRect().height || 175;
    const reachOffset = Math.max(120, clawHeight - 12);
    const ballCenterY = ballRect.top + ballRect.height * 0.5;
    dropTop = clamp(ballCenterY - cRect.top - reachOffset, 74, cRect.height - 145);
  }

  $('aimGuide').style.opacity = '0';
  setClawPose('aim');
  setProgress('Maskot B! Mengintai', 'Membidik bola incaran dengan fokus');
  setMachineState('MEMBIDIK BOLA', true);

  await moveClaw({ left: destination, duration: phase(.14) });

  setProgress('Maskot B! Meluncur Turun…', 'Tangannya bersiap mencapit bola hadiah');
  setMachineState('B! MENJANGKAU BOLA', true);
  setClawPose('dive');
  audio.drop();

  await moveClaw({ top: dropTop, duration: phase(.25) });

  /* Gelombang kejut fisika saat capit menyentuh dasar pit */
  if (physicsEngine) {
    physicsEngine.shockwave(pitDestination, targetBall?.currentY, 130, 24);
  }

  claw.classList.add('closed');
  setClawPose('grab');
  audio.grab();
  setMachineState('MEMELUK BOLA HADIAH', true);
  await wait(phase(.09));

  if (isWin) {
    caughtImg.src = result.prize.image;
    caughtImg.alt = result.prize.fullName;
    caughtPod.hidden = false;
    if (targetBall) {
      targetBall.isCaptured = true;
      targetBall.element.style.opacity = '0';
    }
  } else {
    const decoyImg = targetBall?.element?.querySelector('img');
    if (decoyImg) {
      caughtImg.src = decoyImg.src;
      caughtImg.alt = 'Kapsul terlepas';
      caughtPod.hidden = false;
    }
    cabinet.classList.add('miss');
    setTimeout(() => cabinet.classList.remove('miss'), 450);
  }

  setProgress(isWin ? 'B! Mengangkat Hadiah!' : 'Kapsul Terlalu Licin!', 'Membawa bola ke panggung Cozzone');
  setMachineState(isWin ? 'BOLA DIGENGGAM' : 'LICIN! COBA LAGI', true);
  setClawPose(isWin ? 'lift' : 'slip');
  audio.lift();

  await moveClaw({ top: isWin ? 31 : Math.max(90, dropTop - 85), duration: phase(.13) });

  /* Animasi terlepas untuk Zonk */
  if (!isWin && targetBall) {
    caughtPod.hidden = true;
    setProgress('Oops, bola terlepas!', 'Sedikit lagi—B! siap coba sekali lagi');
    setClawPose('slip');
    if (physicsEngine) {
      physicsEngine.shockwave(pitDestination, cabinetTopToPitY(dropTop), 80, 16);
    }
    await wait(phase(.06));
    await moveClaw({ top: 31, duration: phase(.08) });
  }

  /* Bergerak menuju keranjang hadiah di kiri, melewati dinding pemisah. */
  await moveClaw({ left: chuteAimPercent(), duration: phase(.14) });

  if (isWin) {
    setMachineState('MENUJU DROP ZONE', true);
    await moveClaw({ top: Math.max(140, cRect.height - 210), duration: phase(.10) });
    claw.classList.remove('closed');
    const chute = activeChute();
    chute?.classList.add('glow');
    audio.release();
    if (mobileArena.matches) await animateMobilePrizeDrop(phase(.10));
    caughtPod.hidden = true;
    await wait(phase(.06));
    chute?.classList.remove('glow');
  } else {
    claw.classList.remove('closed');
    await wait(phase(.08));
  }

  await moveClaw({ top: 31, duration: phase(.08) });
  setClawX(50, phase(.06));
  setClawPose('aim');
  clearProgress();
  await wait(phase(.05));
  $('aimGuide').style.opacity = '';
}

function launchConfetti(grand = false) {
  if (reducedMotion.matches) return;
  const layer = $('confetti');
  const colors = ['#ff2a7a', '#00f0ff', '#ffbe0b', '#7b2cbf', '#fff', '#f7bcc3'];
  const count = grand ? 100 : 50;
  layer.innerHTML = Array.from({ length: count }, (_, idx) => {
    const left = Math.random() * 100;
    const start = (Math.random() - .5) * 100;
    const end = (Math.random() - .5) * 360;
    return `<i class="confetti-piece" style="left:${left}%;--start:${start}px;--end:${end}px;--rotate:${Math.random() * 360}deg;--fall:${1.8 + Math.random() * 1.6}s;--confetti:${colors[idx % colors.length]}"></i>`;
  }).join('');
  setTimeout(() => { layer.innerHTML = ''; }, 3800);
}

function showResult(result, recovered = false) {
  festival.result();
  lastResultId = result.id; busy = true;
  const tier = result.prize.tier;
  const isZonk = tier === 'zonk';
  const isGrand = tier === 'grand' || tier === 'bundling';

  resultDialog.dataset.tier = tier;
  $('resultImage').src = result.prize.image;
  $('resultImage').alt = result.prize.fullName;

  /* Tema dan badge perayaan visual per hadiah */
  const theme = PRIZE_THEMES[result.prize.id];
  const badgeEl = $('resultPrizeBadge');
  const congratsEl = $('resultCongrats');

  if (theme && !isZonk) {
    resultDialog.className = `result-dialog ${theme.themeClass || ''}`;
    if (badgeEl) {
      badgeEl.textContent = theme.badge;
      badgeEl.hidden = false;
    }
    if (congratsEl) {
      congratsEl.textContent = theme.congrats;
      congratsEl.hidden = false;
    }
    if (resultMascotImg && theme.mascot) {
      resultMascotImg.src = theme.mascot;
    }
  } else {
    resultDialog.className = 'result-dialog';
    if (badgeEl) badgeEl.hidden = true;
    if (congratsEl) congratsEl.hidden = true;
    if (resultMascotImg) {
      resultMascotImg.src = isZonk ? '/assets/images/mascot-v3/encourage.png' : '/assets/images/mascot-v3/celebrate.png';
    }
  }

  $('resultEyebrow').textContent = recovered
    ? 'HASIL TERAKHIR DIPULIHKAN'
    : isZonk
      ? 'JANGAN MENYERAH, BEAUTY!'
      : isGrand
        ? 'WOW! GRAND PRIZE COZZONE!'
        : 'CANTIK! KAMU MENDAPATKAN';

  $('resultTitle').textContent = result.prize.fullName;
  $('resultPlayer').textContent = `Untuk ${result.username} · ${result.demo ? 'Simulasi Demo' : 'Permainan Resmi Booth'}`;

  const extra = ['voucher', 'grand', 'newuser'].includes(tier) ? state?.settings?.voucherTerms : '';
  $('resultTerms').textContent = [result.prize.terms, extra].filter(Boolean).join(' ');

  /* Voucher Pass Bpedia v1.4.0 */
  const voucherPass = $('resultVoucherPass');
  const promoCode = result.prize.voucherCode;
  if (voucherPass) {
    if (promoCode && !isZonk) {
      voucherPass.hidden = false;
      $('resultPromoCode').textContent = promoCode;
      $('resultPromoMinSpend').textContent = result.prize.minSpend || 'Gunakan di aplikasi Bpedia';
      const copyBtn = $('btnCopyPromo');
      if (copyBtn) {
        copyBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(promoCode);
            $('btnCopyPromoText').textContent = 'Tersalin! ✓';
            toast(`Kode voucher ${promoCode} berhasil disalin!`);
            setTimeout(() => {
              const textEl = $('btnCopyPromoText');
              if (textEl) textEl.textContent = 'Salin Kode';
            }, 2500);
          } catch (e) {
            toast(`Kode: ${promoCode}`);
          }
        };
      }
    } else {
      voucherPass.hidden = true;
    }
  }

  const codeWrap = $('resultCodeWrap');
  codeWrap.classList.toggle('demo', result.demo);
  $('resultCode').textContent = result.demo ? 'SIMULASI · TANPA KLAIM' : result.id;
  codeWrap.querySelector('small').textContent = result.demo ? 'MODE DEMO' : isZonk ? 'HASIL PERMAINAN' : 'KODE PENCATATAN HADIAH';
  codeWrap.querySelector('span').textContent = result.demo ? 'Stok dan peringkat tidak berubah' : isZonk ? 'Terima kasih sudah ikut meramaikan Cozzone Up!' : 'Tunjukkan kode ini kepada petugas booth Beautypedia';
  $('resultFootnote').hidden = result.demo || isZonk;

  /* Reaksi maskot host di panggung samping, plus maskot Home yang akan dilihat
     pemain begitu modal hasil ditutup. */
  setHostPose(MASCOT_POSES.find(p => p.id === (isZonk ? 'encourage' : 'celebrate')), false);
  hostLife?.pulse(isGrand ? 2.2 : isZonk ? .5 : 1.4);
  heroLife?.setState(isZonk ? 'sad' : 'celebrate');
  heroLife?.pulse(isGrand ? 2.2 : isZonk ? .4 : 1.3);
  setCrowdState(isZonk ? 'zonk' : 'win');
  setMachineState(recovered ? 'HASIL DIPULIHKAN' : isZonk ? 'COBA LAGI' : 'BERHASIL MENANG!', false);

  if (isGrand) {
    audio.crowdCheer(); audio.grand();
    audio.playPrize(result.prize.id);
    speech.textContent = audioScript['prize-' + result.prize.id] || audioScript['mc-mantap'];
    launchConfetti(true); screenShake(5);
  } else if (isZonk) {
    audio.zonk();
    /* Tiga kalimat bergantian: pemain yang zonk berkali-kali tidak boleh
       mendengar kalimat hiburan yang sama persis setiap kali. */
    const zonkLines = ['mc-semangat', 'mc-hampir', 'slogan-adaada'];
    say(zonkLines[Math.floor(Math.random() * zonkLines.length)]);
  } else {
    audio.crowdCheer();
    if (promoCode && typeof audio.voucherJingle === 'function') {
      audio.voucherJingle();
    } else {
      audio.win();
    }
    audio.playPrize(result.prize.id);
    speech.textContent = audioScript['prize-' + result.prize.id] || audioScript['mc-mantap'];
    launchConfetti(false); screenShake(2);
  }

  if (!resultDialog.open) resultDialog.showModal();
}

async function finishResult() {
  if (closingResult || !lastResultId) return;
  closingResult = true;
  $('closeResult').disabled = true;
  $('resultCloseIcon').disabled = true;

  try {
    state = await api('/api/result', { id: lastResultId });
    resultDialog.close();
    lastResultId = null;
    busy = false;
    caughtPod.hidden = true;
    const vp = $('resultVoucherPass');
    if (vp) vp.hidden = true;
    const badgeEl = $('resultPrizeBadge');
    if (badgeEl) badgeEl.hidden = true;
    const congratsEl = $('resultCongrats');
    if (congratsEl) congratsEl.hidden = true;
    resultDialog.className = 'result-dialog';
    claw.classList.remove('closed');
    claw.style.top = '31px';
    setClawPose('aim');
    setHostPose(MASCOT_POSES[0], false);
    setCrowdState('cheer');
    say('slogan-skincare');
    renderState({ preserveSound: true });
    festival.home();
  } catch (error) {
    setError(error.message);
    toast('Hasil belum dapat ditutup. Coba sekali lagi.');
  } finally {
    closingResult = false;
    $('closeResult').disabled = false;
    $('resultCloseIcon').disabled = false;
  }
}

$('closeResult').addEventListener('click', finishResult);
$('resultCloseIcon').addEventListener('click', finishResult);
resultDialog.addEventListener('cancel', e => { e.preventDefault(); finishResult(); });
resultDialog.addEventListener('click', e => {
  const rect = resultDialog.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
    finishResult();
  }
});

async function refreshState() {
  if (busy || resultDialog.open || document.hidden) return;
  try { state = await api('/api/state'); renderState({ preserveSound: true }); } catch {}
}

(async () => {
  try {
    state = await api('/api/state');
    audio.configure({ ...state.settings, ...(soundOverride === null ? {} : { sound: soundOverride }) });
    renderState();
    if (audio.enabled) audio.startBgm();
    initMascots();
    setHostPose(MASCOT_POSES[0], false);
    initCozzoneCrowd();
    scheduleIdlePose();
    setTimeout(() => {
      $('cabinetMessage').classList.add('visible');
      setTimeout(clearProgress, 2800);
    }, 450);
    setInterval(refreshState, 15000);
    setInterval(() => {
      if (audio.enabled && !busy && audio.ctx) {
        const keys = ['slogan-app', 'slogan-belanja', 'slogan-adaada', 'slogan-cantik', 'mc-ayo', 'mc-bidik'];
        say(keys[Math.floor(Math.random() * keys.length)]);
      }
    }, 45000);
    particleTimer = setInterval(spawnParticles, 3200);
  } catch {
    setError('Gagal terhubung ke server lokal. Tutup lalu buka kembali aplikasi.');
    $('homeStatus').textContent = 'Server lokal belum terhubung. Tutup lalu buka kembali aplikasi.';
    setMachineState('SERVER TIDAK TERHUBUNG');
    playBtn.disabled = true;
  }
})();
