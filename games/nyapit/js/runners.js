'use strict';

/**
 * RunnerCrew — geng maskot kecil B! di jalur bawah kabinet.
 *
 * Mereka tidak memutar animasi CSS yang sama berulang-ulang. Tiap runner punya
 * tujuan sendiri, berbelok saat sampai, dan berganti perilaku mengikuti fase
 * permainan. Saat capit turun, mereka berlari ke arah capit dan melempar bola
 * hadiah ke atas untuk mengganggunya.
 *
 * PENTING: seluruh isi berkas ini dekoratif. Bola lemparan tidak menyentuh
 * undian, stok, maupun hasil server. Peluang hadiah tetap ditentukan engine.
 */

const MOODS = {
  cheer: { speed: 26,  pause: .55, tossEvery: 2.9, bob: 5,  chase: 0 },
  aim:   { speed: 42,  pause: .25, tossEvery: 1.9, bob: 7,  chase: .25 },
  tense: { speed: 104, pause: .04, tossEvery: .52, bob: 13, chase: 1 },
  win:   { speed: 58,  pause: .12, tossEvery: 1.1, bob: 17, chase: 0 },
  zonk:  { speed: 16,  pause: .8,  tossEvery: 3.6, bob: 3,  chase: 0 }
};

/* Delapan karakter dengan tingkah berbeda-beda. `kind` memilih properti dan
   gaya geraknya di CSS; `bob` dan `speed` menggeser ritme masing-masing supaya
   tidak ada dua maskot yang bergerak identik. */
const CAST = [
  { img: 'celebrate', tag: 'DJ B! ⚡',       kind: 'dj',       prop: '🎧', speed: 1,    bob: 1 },
  { img: 'encourage', tag: 'Belanja B! 🛍',  kind: 'shopping', prop: '🛍️', speed: .82,  bob: .7 },
  { img: 'celebrate', tag: 'Brikdens B! 🕺', kind: 'dance',    prop: '',   speed: 1.25, bob: 1.6 },
  { img: 'host',      tag: 'MC B! 🎤',       kind: 'mic',      prop: '🎤', speed: .55,  bob: .5 },
  { img: 'host',      tag: 'Kece B! 😎',     kind: 'shades',   prop: '🕶️', speed: 1.1,  bob: .9 },
  { img: 'host',      tag: 'Selfie B! ✌',    kind: 'selfie',   prop: '📸', speed: .9,   bob: .8 },
  { img: 'celebrate', tag: 'Pesta B! 🎈',    kind: 'balloon',  prop: '🎈', speed: .95,  bob: 1.2 },
  { img: 'encourage', tag: 'Kapten B! 🚩',   kind: 'flag',     prop: '🚩', speed: 1.05, bob: 1 }
];

/* Pembalap yang memutari kabinet. Ia tidak ikut jalur lari di bawah: lintasannya
   mengelilingi tepi mesin, dan ia melempar bola hadiah ke arah capit. */
const RIDER = { img: 'focus', tag: 'Kurir B! 🛵', lapSeconds: 17, throwEvery: 1.7 };

class RunnerCrew {
  /**
   * @param {HTMLElement} track   wadah runner (koordinat lokal, px)
   * @param {HTMLElement} tossLayer wadah bola lemparan (koordinat kabinet, px)
   * @param {object} options
   *   getClawPoint()  -> {x,y} viewport px milik capit, atau null
   *   onToss()        -> efek suara opsional
   *   onPoke(index)   -> runner diklik
   */
  constructor(track, tossLayer, options = {}) {
    this.track = track;
    this.tossLayer = tossLayer;
    /* Layer pembalap membentang seukuran kabinet; jalur larinya hanya pita di
       bawah. Keduanya dipisah supaya lintasan memutar tidak dibatasi pita itu. */
    this.riderLayer = options.riderLayer || null;
    this.getClawPoint = options.getClawPoint || (() => null);
    this.onToss = options.onToss || null;
    this.onPoke = options.onPoke || null;

    this.runners = [];
    this.rider = null;
    this.tosses = [];
    this.mood = 'cheer';
    this.cfg = MOODS.cheer;
    this.rafId = null;
    this.running = false;
    this.lastTime = 0;

    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.onMotionChange = () => (this.motion.matches ? this.freeze() : this.start());
    this.motion.addEventListener?.('change', this.onMotionChange);
  }

  build() {
    this.track.innerHTML = '';
    this.runners = CAST.map((cast, index) => {
      const el = document.createElement('div');
      el.className = 'runner';
      el.dataset.facing = '1';
      el.dataset.armed = '0';
      el.title = cast.tag;
      el.dataset.kind = cast.kind;
      el.innerHTML =
        `<span class="runner-tag">${cast.tag}</span>` +
        /* Penari dan MC sama-sama berdiri di bawah sorotan lampu panggung. */
        (cast.kind === 'mic' || cast.kind === 'dance'
          ? '<span class="runner-spotlight" aria-hidden="true"></span>' : '') +
        `<div class="runner-fig"><img src="/assets/images/mascot-v3/${cast.img}.png" alt="">` +
        (cast.prop ? `<span class="runner-prop">${cast.prop}</span>` : '') +
        '</div>' +
        `<span class="runner-hold"></span>` +
        `<span class="runner-shadow"></span>`;
      el.addEventListener('click', event => {
        event.stopPropagation();
        const runner = this.runners[index];
        if (runner) { runner.hop = 1.6; runner.tossTimer = 0; }
        this.onPoke?.(index);
      });
      this.track.appendChild(el);

      return {
        el,
        index,
        cast,
        x: 0,
        targetX: 0,
        vx: 0,
        facing: 1,
        phase: Math.random() * 10,
        waitFor: Math.random() * 1.2,
        tossTimer: 1 + Math.random() * 2,
        hop: 0,
        armed: false
      };
    });
    this.buildRider();
    this.layout();
  }

  /** Pembalap yang memutari tepi kabinet, di layer terpisah dari jalur lari. */
  buildRider() {
    if (!this.riderLayer) return;
    this.riderLayer.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'rider';
    el.title = RIDER.tag;
    el.innerHTML =
      '<span class="rider-trail" aria-hidden="true"></span>' +
      `<div class="rider-fig"><img src="/assets/images/mascot-v3/${RIDER.img}.png" alt="">` +
      '<span class="rider-bike">🛵</span></div>';
    this.riderLayer.appendChild(el);
    this.rider = { el, t: Math.random(), tossTimer: RIDER.throwEvery, facing: 1 };
  }

  /** Sebar ulang posisi awal; dipanggil saat pertama jalan dan saat resize. */
  layout() {
    const width = this.track.clientWidth;
    if (!width) return;
    this.runners.forEach((runner, index) => {
      const slot = (index + .5) / this.runners.length;
      runner.x = slot * width;
      runner.targetX = runner.x;
      this.draw(runner);
    });
  }

  setMood(mood) {
    if (!MOODS[mood]) return;
    this.mood = mood;
    this.cfg = MOODS[mood];
    /* Perintah baru: batalkan jeda supaya reaksinya terasa langsung. */
    for (const runner of this.runners) {
      runner.waitFor = 0;
      if (mood === 'tense') runner.tossTimer = Math.min(runner.tossTimer, .35);
    }
    this.start();
  }

  start() {
    if (this.running || this.motion.matches || !this.runners.length) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = time => {
      if (!this.running) return;
      const dt = Math.min((time - this.lastTime) / 1000, .05);
      this.lastTime = time;
      this.tick(dt, time / 1000);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  /** Diam rapi di posisi awal — untuk reduced-motion. */
  freeze() {
    this.stop();
    for (const toss of this.tosses) toss.el.remove();
    this.tosses = [];
    for (const runner of this.runners) {
      runner.el.dataset.armed = '0';
      runner.el.style.transform = `translate3d(${runner.x.toFixed(1)}px,0,0)`;
      runner.el.querySelector('.runner-fig').style.transform = '';
    }
    if (this.rider) this.rider.el.style.opacity = '0';
  }

  /**
   * Posisi pembalap pada lintasan keliling kabinet.
   * @param {number} t maju 0→1 sepanjang satu putaran penuh
   * @returns {{x:number,y:number,dir:number}} koordinat lokal riderLayer
   */
  riderPoint(t) {
    const w = this.riderLayer.clientWidth, h = this.riderLayer.clientHeight;
    const inset = 22;
    const left = inset, right = w - inset, top = inset, bottom = h - inset;
    const spanX = Math.max(1, right - left), spanY = Math.max(1, bottom - top);
    const perimeter = 2 * (spanX + spanY);
    let d = ((t % 1) + 1) % 1 * perimeter;

    /* Searah jarum jam: atas → kanan → bawah → kiri. `dir` dipakai untuk
       membalik sprite supaya pembalap selalu menghadap arah jalannya. */
    if (d < spanX) return { x: left + d, y: top, dir: 1 };
    d -= spanX;
    if (d < spanY) return { x: right, y: top + d, dir: 1 };
    d -= spanY;
    if (d < spanX) return { x: right - d, y: bottom, dir: -1 };
    d -= spanX;
    return { x: left, y: bottom - d, dir: -1 };
  }

  tickRider(dt) {
    const rider = this.rider;
    if (!rider || !this.riderLayer?.clientWidth) return;
    /* Mengejar capit tidak berlaku untuk pembalap: ia memang berkeliling.
       Saat fase tegang ia hanya ngebut dan melempar lebih sering. */
    const rush = this.mood === 'tense' ? 2.1 : this.mood === 'win' ? 1.5 : 1;
    rider.t += (dt / RIDER.lapSeconds) * rush;

    const point = this.riderPoint(rider.t);
    rider.facing = point.dir;
    rider.el.dataset.facing = String(point.dir);
    rider.el.style.opacity = '1';
    rider.el.style.transform = `translate3d(${point.x.toFixed(1)}px,${point.y.toFixed(1)}px,0)`;

    rider.tossTimer -= dt * rush;
    if (rider.tossTimer <= 0) {
      rider.tossTimer = RIDER.throwEvery * (.7 + Math.random() * .7);
      this.throwFromRider(point);
    }
  }

  /** Pembalap melempar bola hadiah ke arah capit sambil melaju. */
  throwFromRider(point) {
    if (this.motion.matches || this.tosses.length > 14) return;
    const riderRect = this.riderLayer.getBoundingClientRect();
    const layerRect = this.tossLayer.getBoundingClientRect();
    if (!riderRect.width || !layerRect.width) return;

    const startX = riderRect.left + point.x - layerRect.left;
    const startY = riderRect.top + point.y - layerRect.top;
    const claw = this.getClawPoint();
    const aimX = claw ? claw.x - layerRect.left : startX;
    const aimY = claw ? claw.y - layerRect.top : startY - 120;

    const el = document.createElement('div');
    el.className = 'toss-ball';
    this.tossLayer.appendChild(el);
    this.tosses.push({
      el,
      t: 0,
      flight: .62 + Math.random() * .26,
      x0: startX, y0: startY,
      x1: aimX + (Math.random() - .5) * 60,
      y1: aimY + (Math.random() - .5) * 30,
      spin: (Math.random() - .5) * 800
    });
    this.onToss?.();
  }

  destroy() {
    this.stop();
    this.motion.removeEventListener?.('change', this.onMotionChange);
  }

  tick(dt, seconds) {
    const width = this.track.clientWidth;
    if (!width) return;
    const clawX = this.clawTrackX();

    for (const runner of this.runners) {
      /* --- pilih tujuan ------------------------------------------------- */
      if (runner.waitFor > 0) {
        runner.waitFor -= dt;
      } else if (Math.abs(runner.x - runner.targetX) < 6) {
        if (this.cfg.chase && clawX !== null) {
          /* Kerumuni capit, tapi jangan menumpuk di satu titik. */
          const spread = (runner.index - (this.runners.length - 1) / 2) * 46;
          runner.targetX = this.clampX(clawX + spread, width);
        } else {
          runner.targetX = this.clampX(Math.random() * width, width);
        }
        runner.waitFor = this.cfg.pause * (.5 + Math.random());
      }

      /* --- gerak --------------------------------------------------------- */
      const delta = runner.targetX - runner.x;
      /* Kecepatan per karakter: si pembawa mic berjalan pelan, penari lebih
         gesit. Tanpa ini kedelapan maskot bergerak seperti satu barisan. */
      const step = Math.sign(delta) * Math.min(Math.abs(delta), this.cfg.speed * runner.cast.speed * dt);
      runner.x += step;
      runner.vx = step / Math.max(dt, .0001);
      if (Math.abs(runner.vx) > 4) runner.facing = runner.vx > 0 ? 1 : -1;

      /* --- lempar bola ---------------------------------------------------- */
      runner.tossTimer -= dt;
      runner.armed = runner.tossTimer < .34;
      if (runner.tossTimer <= 0) {
        runner.tossTimer = this.cfg.tossEvery * (.62 + Math.random() * .8);
        this.throwBall(runner);
        runner.hop = Math.max(runner.hop, .85);
      }

      if (runner.hop > 0) runner.hop = Math.max(0, runner.hop - dt * 3.1);
      this.draw(runner, seconds);
    }

    this.tickRider(dt);
    this.updateTosses(dt);
  }

  clampX(value, width) {
    return Math.max(10, Math.min(width - 10, value));
  }

  /** Posisi X capit dalam koordinat lokal track, atau null bila tidak relevan. */
  clawTrackX() {
    const point = this.getClawPoint();
    if (!point) return null;
    const rect = this.track.getBoundingClientRect();
    if (!rect.width) return null;
    return point.x - rect.left;
  }

  draw(runner, seconds = 0) {
    const c = this.cfg;
    const speedRatio = Math.min(1, Math.abs(runner.vx) / 90);
    /* Langkah kaki ikut kecepatan: berjalan pelan tidak boleh terlihat
       seperti sedang sprint di tempat. */
    const stride = Math.sin((seconds + runner.phase) * (7 + speedRatio * 13));
    const lift = Math.abs(stride) * c.bob * runner.cast.bob * (.35 + speedRatio) + runner.hop * 26;
    const lean = stride * (2 + speedRatio * 7) + runner.vx * .05;

    runner.el.dataset.facing = String(runner.facing);
    runner.el.dataset.armed = runner.armed ? '1' : '0';
    runner.el.style.transform = `translate3d(${runner.x.toFixed(1)}px,${(-lift).toFixed(1)}px,0)`;
    const fig = runner.el.querySelector('.runner-fig');
    if (fig) fig.style.transform = `rotate(${lean.toFixed(1)}deg) scaleY(${(1 - runner.hop * .09).toFixed(3)})`;
  }

  throwBall(runner) {
    if (this.motion.matches || this.tosses.length > 14) return;
    const trackRect = this.track.getBoundingClientRect();
    const layerRect = this.tossLayer.getBoundingClientRect();
    if (!trackRect.width || !layerRect.width) return;

    /* Titik lempar: tangan runner, dikonversi ke koordinat toss layer. */
    const startX = trackRect.left + runner.x - layerRect.left;
    const startY = trackRect.top - layerRect.top + 8;

    const claw = this.getClawPoint();
    const aimX = claw ? claw.x - layerRect.left : startX + (Math.random() - .5) * 150;
    const aimY = claw ? claw.y - layerRect.top : startY - 150;

    const flight = .58 + Math.random() * .3;
    const el = document.createElement('div');
    el.className = 'toss-ball';
    this.tossLayer.appendChild(el);

    this.tosses.push({
      el,
      t: 0,
      flight,
      x0: startX,
      y0: startY,
      /* Sedikit meleset supaya tidak terasa seperti homing missile. */
      x1: aimX + (Math.random() - .5) * 54,
      y1: aimY + (Math.random() - .5) * 26,
      spin: (Math.random() - .5) * 700
    });

    this.onToss?.();
  }

  updateTosses(dt) {
    for (let i = this.tosses.length - 1; i >= 0; i--) {
      const toss = this.tosses[i];
      toss.t += dt;
      const p = toss.t / toss.flight;

      if (p >= 1) {
        if (!toss.popped) {
          toss.popped = true;
          toss.el.classList.add('pop');
          setTimeout(() => toss.el.remove(), 280);
        }
        if (toss.t > toss.flight + .3) this.tosses.splice(i, 1);
        continue;
      }

      /* Lintasan parabola: interpolasi linear plus lengkung ke atas. */
      const x = toss.x0 + (toss.x1 - toss.x0) * p;
      const arc = Math.sin(p * Math.PI) * 62;
      const y = toss.y0 + (toss.y1 - toss.y0) * p - arc;
      toss.el.style.transform =
        `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(toss.spin * p).toFixed(0)}deg)`;
    }
  }
}

window.RunnerCrew = RunnerCrew;
