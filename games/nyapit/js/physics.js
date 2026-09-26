'use strict';

/**
 * BallPhysicsEngine: Simulasi fisika interaktif 60 FPS untuk bola hadiah Bpedia.
 * Menangani:
 * - Dorongan (impulse) saat bola diklik / disentuh
 * - Reaksi berantai (chain reaction) mendorong bola-bola tetangga
 * - Interaksi 'aduk' (stirring) saat kursor ditekan & digeser di atas pit
 * - Gelombang kejut (shockwave) saat capit Maskot B! mendarat
 * - Animasi squash & stretch (membal) elastis
 */
class BallPhysicsEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.balls = [];
    this.rafId = null;
    this.isActive = false;
    this.onBounceSound = options.onBounceSound || null;
    this.isPointerDown = false;
    this.lastPointerPos = { x: 0, y: 0 };
    this.lastSoundTime = 0;
    this.activeUntil = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.resizeTimer = null;

    this.springK = 0.12;       /* Kekuatan pegas kembali ke posisi semula */
    this.damping = 0.82;       /* Redaman gesekan */
    this.rotSpringK = 0.10;
    this.rotDamping = 0.84;
    this.squashSpringK = 0.15;
    this.squashDamping = 0.78;

    this.bindEvents();
    this.reducedMotion.addEventListener?.('change', event => this.setReducedMotion(event.matches));
    window.addEventListener('resize', () => this.scheduleReflow(120), { passive: true });

    /* Sejak kabinet memakai tinggi flex, ukuran pit belum final pada saat
       init() dipanggil: engine sempat membaca tinggi yang jauh lebih kecil,
       seluruh baris terjepit ke batas atas, dan tumpukan kolaps jadi satu baris.
       ResizeObserver memastikan tata letak dihitung ulang begitu kotaknya benar
       — termasuk saat masuk/keluar mode kios. */
    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleReflow(90));
      this.resizeObserver.observe(this.container);
    }
  }

  scheduleReflow(delay = 100) {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.reflow(), delay);
  }

  init(elementsData) {
    this.stop();
    this.balls = [];
    const containerRect = this.container.getBoundingClientRect();
    const cWidth = containerRect.width || 800;
    const cHeight = containerRect.height || 220;

    elementsData.forEach((item, index) => {
      const el = item.element;
      if (!el) return;

      /* Konversi posisi persentase/pixel awal menjadi koordinat absolut relatif container */
      const percentX = parseFloat(item.x) || 50;
      const pixelY = parseFloat(item.y) || 20; /* dari dasar pit */
      const diameter = parseFloat(getComputedStyle(el).width) || 48;
      const baseLeft = (percentX / 100) * cWidth;
      const baseTop = cHeight - pixelY - diameter;

      const ball = {
        index,
        element: el,
        prizeId: item.prize.id,
        prizeTier: item.prize.tier,
        baseX: baseLeft,
        baseY: baseTop,
        currentX: baseLeft,
        currentY: baseTop,
        vx: 0,
        vy: 0,
        baseAngle: item.rotation || 0,
        angle: item.rotation || 0,
        vAngle: 0,
        squash: 1.0,
        vSquash: 0,
        diameter,
        radius: Math.max(18, diameter * (parseFloat(item.scale) || 1) * 0.46),
        scale: parseFloat(item.scale) || 1.0,
        percentX,
        pixelY,
        isCaptured: false
      };

      this.balls.push(ball);
      this.updateBallTransform(ball);
    });

    if (!this.reducedMotion.matches) {
      this.start(2400);
      this.startIdleDrift();
    }
    /* Ukuran pit baru final setelah frame berikutnya; lihat catatan
       ResizeObserver di konstruktor. */
    requestAnimationFrame(() => this.reflow());
  }

  /**
   * Denyut hidup saat menganggur: tiap beberapa detik beberapa kapsul disenggol
   * sangat pelan sehingga tumpukan tidak pernah terlihat membeku.
   *
   * Sengaja TIDAK memakai animasi CSS per kapsul: 53 elemen yang beranimasi
   * terus-menerus memaksa compositor bekerja tiap frame (terukur memakan ~20
   * fps). Dorongan sesaat membangunkan engine hanya sebentar lalu tidur lagi.
   */
  startIdleDrift() {
    this.stopIdleDrift();
    this.idleTimer = setInterval(() => {
      if (this.reducedMotion.matches || !this.balls.length) return;
      const awake = this.balls.filter(ball => !ball.isCaptured);
      if (!awake.length) return;
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const ball = awake[Math.floor(Math.random() * awake.length)];
        ball.vy -= 1.1 + Math.random() * 1.6;
        ball.vx += (Math.random() - 0.5) * 1.8;
        ball.vAngle += (Math.random() - 0.5) * 3.4;
        ball.squash = Math.min(ball.squash, 0.96);
      }
      this.start(1500);
    }, 2300);
  }

  stopIdleDrift() {
    clearInterval(this.idleTimer);
    this.idleTimer = null;
  }

  bindEvents() {
    /* Klik bola HARUS menggelembung ke kabinet: sejak v1.3.1 pemain boleh
       mengklik di mana pun — termasuk tepat di atas bola — dan capit turun ke
       titik itu. app.js yang memutuskan apakah lepasan tersebut sebuah tap
       (bermain) atau geseran (hanya mengaduk), jadi jangan hentikan bubbling di
       sini. preventDefault tetap dipakai supaya tidak ada seleksi teks. */
    this.container.addEventListener('click', (e) => {
      if (!e.target.closest?.('.prize-ball')) return;
      e.preventDefault();
    });

    this.container.addEventListener('pointerdown', (e) => {
      const target = e.target.closest('.prize-ball');
      if (!target) return;
      this.isPointerDown = true;
      if (this.reducedMotion.matches) {
        this.showTapFeedback(target);
        return;
      }
      const rect = this.container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this.lastPointerPos = { x: clickX, y: clickY };
      this.handlePointerImpulse(clickX, clickY, 1.4);
    });

    this.container.addEventListener('keydown', e => {
      const target = e.target.closest('.prize-ball');
      if (!target || (e.code !== 'Space' && e.key !== 'Enter')) return;
      e.preventDefault();
      e.stopPropagation();
      if (this.reducedMotion.matches) {
        this.showTapFeedback(target);
        return;
      }
      const ball = this.balls.find(item => item.element === target);
      if (ball) this.handlePointerImpulse(ball.currentX, ball.currentY, 1.4);
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;
      const rect = this.container.getBoundingClientRect();
      const currX = e.clientX - rect.left;
      const currY = e.clientY - rect.top;
      
      /* Jika kursor berada di dalam area pit saat ditekan, aduk bola di dekatnya */
      if (currX >= 0 && currX <= rect.width && currY >= 0 && currY <= rect.height) {
        const dx = currX - this.lastPointerPos.x;
        const dy = currY - this.lastPointerPos.y;
        const speed = Math.hypot(dx, dy);
        if (speed > 2) {
          this.handleStir(currX, currY, dx * 0.25, dy * 0.25);
        }
      }
      this.lastPointerPos = { x: currX, y: currY };
    });

    const endPointer = () => {
      this.isPointerDown = false;
    };
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);
  }

  showTapFeedback(element) {
    element.classList.remove('tap-feedback');
    void element.offsetWidth;
    element.classList.add('tap-feedback');
    setTimeout(() => element.classList.remove('tap-feedback'), 180);
  }

  setReducedMotion(value) {
    if (value) {
      this.stop();
      this.stopIdleDrift();
      for (const ball of this.balls) {
        ball.currentX = ball.baseX;
        ball.currentY = ball.baseY;
        ball.vx = ball.vy = ball.vAngle = ball.vSquash = 0;
        ball.angle = ball.baseAngle;
        ball.squash = 1;
        this.updateBallTransform(ball);
      }
    } else {
      this.start(1000);
    }
  }

  reflow() {
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    for (const ball of this.balls) {
      const dx = ball.currentX - ball.baseX;
      const dy = ball.currentY - ball.baseY;
      ball.baseX = (ball.percentX / 100) * rect.width;
      ball.diameter = parseFloat(getComputedStyle(ball.element).width) || ball.diameter || 48;
      ball.radius = Math.max(18, ball.diameter * ball.scale * 0.46);
      ball.baseY = rect.height - ball.pixelY - ball.diameter;
      ball.currentX = ball.baseX + dx * .25;
      ball.currentY = ball.baseY + dy * .25;
      this.updateBallTransform(ball);
    }
    this.start(1200);
  }

  handlePointerImpulse(clickX, clickY, multiplier = 1.0) {
    let closestBall = null;
    let minDist = Infinity;

    /* Cari bola yang paling dekat dengan titik sentuh */
    for (const ball of this.balls) {
      if (ball.isCaptured) continue;
      const dist = Math.hypot(ball.currentX - clickX, ball.currentY - clickY);
      if (dist < minDist) {
        minDist = dist;
        closestBall = ball;
      }
    }

    if (closestBall && minDist < 95) {
      /* Mainkan suara pop/bounce */
      const now = performance.now();
      if (now - this.lastSoundTime > 80 && this.onBounceSound) {
        this.lastSoundTime = now;
        const pitch = 0.85 + (1.0 - minDist / 95) * 0.5;
        this.onBounceSound(pitch);
      }

      /* Efek squishy & pantulan ke atas */
      closestBall.squash = 0.72;
      closestBall.vy -= (16 + Math.random() * 8) * multiplier;
      closestBall.vx += (Math.random() - 0.5) * 14 * multiplier;
      closestBall.vAngle += (Math.random() - 0.5) * 28 * multiplier;

      /* Berikan dorongan pada bola-bola sekitar (Chain Reaction) */
      for (const other of this.balls) {
        if (other === closestBall || other.isCaptured) continue;
        const dx = other.currentX - closestBall.currentX;
        const dy = other.currentY - closestBall.currentY;
        const d = Math.hypot(dx, dy);
        if (d < 110) {
          const force = ((110 - d) / 110) * 9 * multiplier;
          const angle = Math.atan2(dy, dx);
          other.vx += Math.cos(angle) * force;
          other.vy += Math.sin(angle) * force - force * 0.5;
          other.vAngle += (Math.random() - 0.5) * force * 1.5;
          other.squash = Math.max(0.8, other.squash - force * 0.02);
        }
      }

      this.wakeUp();
    }
  }

  handleStir(x, y, forceX, forceY) {
    let stirred = false;
    for (const ball of this.balls) {
      if (ball.isCaptured) continue;
      const dist = Math.hypot(ball.currentX - x, ball.currentY - y);
      if (dist < 65) {
        const factor = (65 - dist) / 65;
        ball.vx += forceX * factor * 1.8;
        ball.vy += forceY * factor * 1.8;
        ball.vAngle += forceX * 1.2;
        stirred = true;
      }
    }
    if (stirred) {
      const now = performance.now();
      if (now - this.lastSoundTime > 140 && this.onBounceSound) {
        this.lastSoundTime = now;
        this.onBounceSound(1.1);
      }
      this.wakeUp();
    }
  }

  /**
   * Gelombang kejut saat capit mendarat di dasar pit
   */
  shockwave(targetPercentX, dropY, radius = 130, force = 22) {
    if (this.reducedMotion.matches) return;
    const cRect = this.container.getBoundingClientRect();
    const shockX = (targetPercentX / 100) * cRect.width;
    const shockY = dropY || (cRect.height - 40);

    for (const ball of this.balls) {
      if (ball.isCaptured) continue;
      const dx = ball.currentX - shockX;
      const dy = ball.currentY - shockY;
      const dist = Math.hypot(dx, dy);

      if (dist < radius) {
        const factor = (radius - dist) / radius;
        const angle = Math.atan2(dy, dx);
        ball.vx += Math.cos(angle) * force * factor * 1.4;
        ball.vy += Math.sin(angle) * force * factor * 0.7 - force * 0.4;
        ball.vAngle += (Math.random() - 0.5) * force * 3;
        ball.squash = 0.75;
      }
    }
    this.wakeUp();
  }

  start(duration = 2400) {
    if (this.reducedMotion.matches) return;
    this.activeUntil = Math.max(this.activeUntil, performance.now() + duration);
    if (this.isActive) return;
    this.isActive = true;
    let lastTime = performance.now();

    const loop = (time) => {
      if (!this.isActive) return;
      if (time >= this.activeUntil) {
        this.stop();
        return;
      }
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      this.update(dt);
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.isActive = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  wakeUp() {
    this.start(4500);
  }

  update(dt) {
    let totalMotion = 0;
    const cRect = this.container.getBoundingClientRect();
    const cWidth = cRect.width || 800;
    const cHeight = cRect.height || 220;

    for (const ball of this.balls) {
      if (ball.isCaptured) continue;

      /* 1. Gaya pegas menuju titik awal (baseX, baseY) */
      const fx = -this.springK * (ball.currentX - ball.baseX);
      const fy = -this.springK * (ball.currentY - ball.baseY);

      ball.vx = (ball.vx + fx) * this.damping;
      ball.vy = (ball.vy + fy) * this.damping;

      ball.currentX += ball.vx;
      ball.currentY += ball.vy;

      /* Batasan batas kabinet */
      const minX = 4, maxX = cWidth - ball.diameter;
      const minY = 8, maxY = cHeight - ball.diameter * 0.72;
      if (ball.currentX < minX) { ball.currentX = minX; ball.vx *= -0.5; }
      if (ball.currentX > maxX) { ball.currentX = maxX; ball.vx *= -0.5; }
      if (ball.currentY < minY) { ball.currentY = minY; ball.vy *= -0.5; }
      if (ball.currentY > maxY) { ball.currentY = maxY; ball.vy *= -0.5; }

      /* 2. Rotasi elastis */
      const fRot = -this.rotSpringK * (ball.angle - ball.baseAngle);
      ball.vAngle = (ball.vAngle + fRot) * this.rotDamping;
      ball.angle += ball.vAngle;

      /* 3. Squash & stretch elastis */
      const fSquash = -this.squashSpringK * (ball.squash - 1.0);
      ball.vSquash = (ball.vSquash + fSquash) * this.squashDamping;
      ball.squash += ball.vSquash;

      totalMotion += Math.abs(ball.vx) + Math.abs(ball.vy) + Math.abs(ball.vAngle) + Math.abs(ball.squash - 1.0);

      this.updateBallTransform(ball);
    }

    /* Tabrakan sederhana antar bola dekat (Soft relaxation) */
    for (let i = 0; i < this.balls.length; i++) {
      const b1 = this.balls[i];
      if (b1.isCaptured) continue;
      for (let j = i + 1; j < this.balls.length; j++) {
        const b2 = this.balls[j];
        if (b2.isCaptured) continue;
        const dx = b2.currentX - b1.currentX;
        const dy = b2.currentY - b1.currentY;
        const dist = Math.hypot(dx, dy);
        const minDist = (b1.radius + b2.radius) * 0.88;
        if (dist > 0 && dist < minDist) {
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          b1.currentX -= nx * overlap * 0.35;
          b1.currentY -= ny * overlap * 0.35;
          b2.currentX += nx * overlap * 0.35;
          b2.currentY += ny * overlap * 0.35;
          b1.vx -= nx * overlap * 0.15;
          b2.vx += nx * overlap * 0.15;
        }
      }
    }
  }

  updateBallTransform(ball) {
    const sqX = (ball.scale / ball.squash).toFixed(3);
    const sqY = (ball.scale * ball.squash).toFixed(3);
    const posX = ball.currentX.toFixed(1);
    const posY = ball.currentY.toFixed(1);
    const deg = ball.angle.toFixed(1);

    ball.element.style.transform = `translate3d(${posX}px, ${posY}px, 0) rotate(${deg}deg) scale(${sqX}, ${sqY})`;
  }

  getBallAtTarget(targetPercentX, prizeId) {
    const cRect = this.container.getBoundingClientRect();
    const targetPixelX = (targetPercentX / 100) * cRect.width;

    let bestBall = null;
    let minDiff = Infinity;

    for (const ball of this.balls) {
      if (ball.isCaptured) continue;
      if (prizeId && ball.prizeId !== prizeId) continue;
      const diff = Math.abs(ball.currentX - targetPixelX);
      if (diff < minDiff) {
        minDiff = diff;
        bestBall = ball;
      }
    }

    if (!bestBall && prizeId) {
      return this.getBallAtTarget(targetPercentX, null);
    }
    return bestBall;
  }
}

window.BallPhysicsEngine = BallPhysicsEngine;
