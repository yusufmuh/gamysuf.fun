'use strict';

/**
 * MascotLife — menghidupkan render 3D maskot B! yang aslinya PNG diam.
 *
 * Kenapa bukan @keyframes CSS: keyframe mengulang persis tiap siklus, dan mata
 * langsung menangkap pengulangan itu sebagai "animasi murahan". Di sini gerakan
 * disusun dari beberapa gelombang sinus dengan periode yang tidak habis dibagi
 * satu sama lain (2.7s / 4.1s / 6.3s ...), sehingga kombinasinya baru berulang
 * setelah belasan menit — secara praktis tidak pernah terlihat mengulang.
 *
 * Nilai ditulis sebagai custom property (--m-x dan kawan-kawan), bukan sebagai
 * `style.transform` utuh, supaya CSS tetap memegang susunan transform-nya dan
 * efek lain tidak saling menimpa.
 */

const TAU = Math.PI * 2;

/* Amplitudo per state. Angka kecil disengaja: maskot harus terasa bernapas,
   bukan bergoyang seperti balon tiup di depan dealer mobil. */
const STATES = {
  idle:      { bob: 7,  sway: 5,  tilt: 2.2, breath: .016, speed: 1,    lean: 1 },
  focus:     { bob: 3,  sway: 2,  tilt: 1.1, breath: .010, speed: 1.35, lean: .55 },
  excited:   { bob: 13, sway: 8,  tilt: 3.6, breath: .028, speed: 1.9,  lean: 1.2 },
  celebrate: { bob: 18, sway: 6,  tilt: 5.0, breath: .040, speed: 2.4,  lean: .4 },
  sad:       { bob: 3,  sway: 3,  tilt: 1.6, breath: .012, speed: .62,  lean: .3 }
};

class MascotLife {
  /**
   * @param {HTMLElement} element gambar maskot
   * @param {object} options
   *   wrap      elemen pembungkus opsional yang ikut naik-turun (--wrap-y)
   *   shadow    elemen bayangan opsional yang melebar saat maskot turun
   *   leanRange jarak kursor (px) yang masih membuat maskot condong
   */
  constructor(element, options = {}) {
    this.el = element;
    this.wrap = options.wrap || null;
    this.shadow = options.shadow || null;
    this.leanRange = options.leanRange || 420;
    this.state = 'idle';
    this.cfg = STATES.idle;
    this.phase = Math.random() * 1000;   /* tiap maskot mulai di titik berbeda */
    this.rafId = null;
    this.running = false;

    /* Nilai "hidup" vs nilai target: semua transisi dilewatkan lerp supaya
       pergantian state tidak pernah melompat. */
    this.leanX = 0; this.leanY = 0;
    this.targetLeanX = 0; this.targetLeanY = 0;
    this.pop = 0;          /* dorongan sesaat dari pulse() */
    this.popVelocity = 0;

    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.onMotionChange = () => (this.motion.matches ? this.freeze() : this.start());
    this.motion.addEventListener?.('change', this.onMotionChange);
  }

  setState(state) {
    if (!STATES[state] || this.state === state) return;
    this.state = state;
    this.cfg = STATES[state];
    this.el.dataset.life = state;
  }

  /** Dorongan sekali jalan: dipakai saat ganti pose, menang, atau disentuh. */
  pulse(strength = 1) {
    if (this.motion.matches) return;
    this.popVelocity -= 0.9 * strength;
    this.start();
  }

  /** Condongkan maskot ke arah kursor. Koordinat viewport. */
  aimAt(clientX, clientY) {
    if (this.motion.matches) return;
    const rect = this.el.getBoundingClientRect();
    if (!rect.width) return;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const falloff = distance > this.leanRange ? 0 : 1 - distance / this.leanRange;
    const lean = falloff * this.cfg.lean;
    this.targetLeanX = (dx / Math.max(distance, 1)) * lean * 16;
    this.targetLeanY = (dy / Math.max(distance, 1)) * lean * 8;
  }

  releaseAim() { this.targetLeanX = 0; this.targetLeanY = 0; }

  start() {
    if (this.running || this.motion.matches) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = time => {
      if (!this.running) return;
      const dt = Math.min((time - this.lastTime) / 1000, .05);
      this.lastTime = time;
      this.tick(time / 1000, dt);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  /** Kembalikan ke pose netral dan berhenti — dipakai untuk reduced-motion. */
  freeze() {
    this.stop();
    this.write(0, 0, 0, 1, 1, 0);
  }

  destroy() {
    this.stop();
    this.motion.removeEventListener?.('change', this.onMotionChange);
  }

  tick(seconds, dt) {
    const t = (seconds + this.phase) * this.cfg.speed;
    const c = this.cfg;

    /* Tiga gelombang dengan periode tak sepadan: 2.7s, 4.1s, 6.3s. */
    const w1 = Math.sin(t * TAU / 2.7);
    const w2 = Math.sin(t * TAU / 4.1);
    const w3 = Math.sin(t * TAU / 6.3);

    /* Pegas untuk pop(): meredam sendiri, jadi hop terasa berbobot. */
    this.popVelocity += -14 * this.pop * dt;
    this.popVelocity *= Math.pow(0.0009, dt);
    this.pop += this.popVelocity * dt;

    /* Lerp menuju arah kursor, frame-rate independent. */
    const k = 1 - Math.pow(0.002, dt);
    this.leanX += (this.targetLeanX - this.leanX) * k;
    this.leanY += (this.targetLeanY - this.leanY) * k;

    const bob = (w1 * .7 + w3 * .3) * c.bob + this.pop * 44;
    const sway = (w2 * .75 + w1 * .25) * c.sway;
    const tilt = (w2 * .6 + w3 * .4) * c.tilt + this.leanX * .22;

    /* Napas: melebar sedikit saat turun, memanjang saat naik. Tanda dibalik
       terhadap bob supaya terbaca sebagai berat badan, bukan sekadar zoom. */
    const breath = w1 * c.breath;
    const squash = this.pop * .16;
    const scaleX = 1 + breath + squash;
    const scaleY = 1 - breath - squash;

    this.write(sway + this.leanX, bob + this.leanY, tilt, scaleX, scaleY, bob);
  }

  write(x, y, rot, sx, sy, bobPx) {
    const style = this.el.style;
    style.setProperty('--m-x', `${x.toFixed(2)}px`);
    style.setProperty('--m-y', `${y.toFixed(2)}px`);
    style.setProperty('--m-rot', `${rot.toFixed(2)}deg`);
    style.setProperty('--m-sx', sx.toFixed(4));
    style.setProperty('--m-sy', sy.toFixed(4));
    if (this.wrap) this.wrap.style.setProperty('--wrap-y', `${(y * .25).toFixed(2)}px`);
    /* Bayangan mengecil saat maskot naik: satu-satunya petunjuk kedalaman yang
       dipunyai render PNG datar. */
    if (this.shadow) this.shadow.style.setProperty('--sh', (1 - Math.max(0, -bobPx) / 90).toFixed(3));
  }
}

window.MascotLife = MascotLife;
