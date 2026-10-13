"use strict";
/** @typedef {{character:string,cosmetic?:string,activity:string,controlMode:string}} ArenaOptions */
/** A real 3D actor supplies motion; the transparent Canvas supplies interactive energy. */
class DomainArena {
  /** @param {FestivalResult} result @param {ArenaOptions} options */
  constructor(result, options) {
    this.result = result;
    this.options = options;
    this.canvas = $("game");
    this.context = this.canvas.getContext("2d");
    this.stage = null;
    this.width = 0;
    this.height = 0;
    this.elapsed = 0;
    this.last = 0;
    this.frameId = 0;
    this.disposed = false;
    this.auto = options.controlMode === "auto";
    this.seal = options.activity === "seal";
    this.dark = options.character === "geto";
    this.duration = (result.duration || 14000) / 1000;
    this.aim = { x: 0.5, y: 0.43 };
    this.target = { x: 0.5, y: 0.43 };
    this.pointerDown = false;
    this.energy = 0;
    this.completed = 0;
    this.nextSpirit = 0;
    this.phase = "";
    this.skillPlayed = false;
    this.particles = [];
    this.bursts = [];
    this.hitTargets = new Set();
    this.spirits = Array.from({ length: 8 }, (_, index) => ({
      x: 0.22 + 0.56 * (0.5 + 0.5 * Math.sin(index * 2.2)),
      y: 0.18 + (index % 4) * 0.16,
      index,
    }));
    this.onResize = () => this.resize();
    this.onVisibility = () => {
      this.last = performance.now();
      if (!document.hidden) sound("bpedia-owner-bgm", true);
    };
    this.onDown = (event) => {
      if (this.auto) return;
      this.pointerDown = true;
      this.canvas.setPointerCapture(event.pointerId);
      this.movePointer(event);
    };
    this.onMove = (event) => {
      if (!this.auto && this.pointerDown) this.movePointer(event);
    };
    this.onUp = () => {
      this.pointerDown = false;
    };
    this.onKey = (event) => this.moveKeyboard(event);
  }
  async start() {
    screens("playScreen");
    $("countdown").textContent = "DOMAIN CLASH";
    $("chargeBar").style.width = "0%";
    $("arenaWord").textContent = this.seal ? "SPIRIT" : "INFINITY";
    $("playActivity").textContent = this.seal
      ? "SPIRIT ABSORPTION"
      : "INFINITY CONVERGENCE";
    const name =
      confirmedRoster.find(
        (item) => item.id === (this.options.cosmetic || this.options.character),
      )?.name || this.options.character;
    $("playHost").textContent = "Bipy " + name;
    $("instruction").textContent = this.auto
      ? "Bipy mengendalikan domain. Nikmati pertunjukannya."
      : this.seal
        ? "Geser dari spirit bercahaya ke spirit berikutnya. Tombol panah juga bisa."
        : "Geser untuk membidik pusat energi. Tahan dan ikuti titik bercahaya. Tombol panah juga bisa.";
    this.resize();
    addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    addEventListener("keydown", this.onKey);
    this.canvas.addEventListener("pointerdown", this.onDown);
    this.canvas.addEventListener("pointermove", this.onMove);
    this.canvas.addEventListener("pointerup", this.onUp);
    this.canvas.addEventListener("pointercancel", this.onUp);
    this.canvas.focus({ preventScroll: true });
    sound("bpedia-owner-bgm", true);
    sound(this.options.character + "-welcome");
    createBipyStage(
      $("arena3d"),
      this.options.cosmetic || this.options.character,
      "arena",
    ).then((stage) => {
      if (this.disposed) {
        stage?.dispose();
        return;
      }
      this.stage = stage;
      this.stage?.setAction(this.phase || "idle");
    });
    this.frameId = requestAnimationFrame((now) => this.frame(now));
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    const scale = Math.min(devicePixelRatio, 2);
    this.canvas.width = this.width * scale;
    this.canvas.height = this.height * scale;
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
    this.stage?.resize();
  }
  /** @param {PointerEvent} event */
  movePointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.target = {
      x: Math.max(
        0.06,
        Math.min(0.94, (event.clientX - rect.left) / rect.width),
      ),
      y: Math.max(
        0.08,
        Math.min(0.88, (event.clientY - rect.top) / rect.height),
      ),
    };
    this.interact();
  }
  /** @param {KeyboardEvent} event */
  moveKeyboard(event) {
    if (
      this.auto ||
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(
        event.key,
      )
    )
      return;
    event.preventDefault();
    const amount = 0.035;
    this.target.x = Math.max(
      0.06,
      Math.min(
        0.94,
        this.target.x +
          (event.key === "ArrowRight"
            ? amount
            : event.key === "ArrowLeft"
              ? -amount
              : 0),
      ),
    );
    this.target.y = Math.max(
      0.08,
      Math.min(
        0.88,
        this.target.y +
          (event.key === "ArrowDown"
            ? amount
            : event.key === "ArrowUp"
              ? -amount
              : 0),
      ),
    );
    this.interact();
  }
  interact() {
    if (this.seal) {
      const target = this.spirits[this.nextSpirit];
      if (
        target &&
        this.distance(this.target, target) <
          Math.min(this.width, this.height) * 0.1
      ) {
        this.burst(target.x, target.y);
        this.nextSpirit++;
        this.completed++;
        this.energy = Math.min(1, this.energy + 0.1);
      }
    } else {
      const target = this.infinityTarget();
      const index = Math.floor(this.elapsed / 1.3);
      if (
        this.distance(this.target, target) <
          Math.min(this.width, this.height) * 0.12 &&
        !this.hitTargets.has(index)
      ) {
        this.hitTargets.add(index);
        this.completed++;
        this.energy = Math.min(1, this.energy + 0.07);
        this.burst(target.x, target.y);
      }
    }
  }
  distance(a, b) {
    return Math.hypot((a.x - b.x) * this.width, (a.y - b.y) * this.height);
  }
  infinityTarget() {
    const step = Math.floor(this.elapsed / 1.3);
    return {
      x: 0.5 + Math.sin(step * 1.8) * 0.29,
      y: 0.35 + Math.cos(step * 1.5) * 0.17,
    };
  }
  burst(x, y) {
    this.bursts.push({ x, y, age: 0 });
    for (let index = 0; index < (reduced ? 8 : 30); index++)
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        life: 1,
      });
  }
  setPhase(action, label) {
    if (action === this.phase) return;
    this.phase = action;
    this.stage?.setAction(action);
    $("phaseLabel").textContent = label;
  }
  frame(now) {
    if (this.disposed) return;
    const delta = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    if (document.hidden) {
      this.frameId = requestAnimationFrame((time) => this.frame(time));
      return;
    }
    this.elapsed += delta;
    const progress = Math.min(1, this.elapsed / this.duration);
    $("arena").classList.toggle("is-finale", progress > 0.84);
    if (progress < 0.12) this.setPhase("idle", "MEMASUKI DOMAIN");
    else if (progress < 0.36)
      this.setPhase(
        "charge",
        this.seal ? "SPIRIT DIPANGGIL" : "ENERGI MENYATU",
      );
    else if (progress < 0.56)
      this.setPhase("cast", this.seal ? "RANGKAI SPIRIT" : "LEPASKAN INFINITY");
    else if (progress < 0.65) this.setPhase("dodge", "DOMAIN BERGERAK");
    else if (progress < 0.84)
      this.setPhase(
        "charge",
        this.seal ? "SERAP KEKUATAN" : "KONVERGENSI MAKSIMUM",
      );
    else this.setPhase("victory", "DOMAIN TERBUKA");
    if (!this.skillPlayed && progress > 0.36) {
      this.skillPlayed = true;
      sound(this.options.character + "-skill");
    }
    $("countdown").textContent =
      progress < 0.09
        ? "DOMAIN CLASH"
        : progress > 0.86
          ? "DOMAIN\nEXPANSION"
          : "";
    $("time").textContent = String(
      Math.max(0, Math.ceil(this.duration - this.elapsed)),
    );
    if (this.auto) {
      if (this.seal) {
        const target = this.spirits[this.nextSpirit];
        if (target) {
          this.target = { x: target.x, y: target.y };
          if (this.elapsed > ((this.nextSpirit + 1) * this.duration) / 10)
            this.interact();
        }
      } else {
        this.target = this.infinityTarget();
        this.interact();
      }
    }
    this.aim.x += (this.target.x - this.aim.x) * Math.min(1, delta * 7);
    this.aim.y += (this.target.y - this.aim.y) * Math.min(1, delta * 7);
    this.stage?.aim((this.aim.x - 0.5) * 2, (this.aim.y - 0.5) * 2);
    this.energy = Math.max(this.energy, progress * 0.96);
    $("chargeBar").style.width = Math.round(this.energy * 100) + "%";
    $("chargeLabel").textContent = this.seal
      ? "CURSED SPIRIT ENERGY"
      : "INFINITY ENERGY";
    $("score").textContent =
      this.completed + (this.seal ? " spirit terserap" : " resonansi energi");
    this.draw(delta, progress);
    if (progress < 1)
      this.frameId = requestAnimationFrame((time) => this.frame(time));
    else {
      this.dispose();
      showResult(this.result);
    }
  }
  draw(delta, progress) {
    const ctx = this.context,
      w = this.width,
      h = this.height;
    ctx.clearRect(0, 0, w, h);
    const color = this.dark ? "#c879ff" : "#159bff",
      secondary = this.dark ? "#e16a98" : "#7cf3ff";
    const origin = { x: w * 0.5, y: h * 0.55 };
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = reduced ? 0 : 18;
    if (this.seal)
      this.drawSpirits(ctx, w, h, origin, color, secondary, progress);
    else this.drawInfinity(ctx, w, h, origin, color, secondary, progress);
    // A visible reticle follows the user's aim, rather than a hidden pointer target.
    if (!this.auto) {
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(this.aim.x * w, this.aim.y * h, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.aim.x * w - 25, this.aim.y * h);
      ctx.lineTo(this.aim.x * w + 25, this.aim.y * h);
      ctx.moveTo(this.aim.x * w, this.aim.y * h - 25);
      ctx.lineTo(this.aim.x * w, this.aim.y * h + 25);
      ctx.stroke();
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
    for (const particle of this.particles) {
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.beginPath();
      ctx.arc(particle.x * w, particle.y * h, 2.5, 0, 7);
      ctx.fill();
    }
    this.bursts = this.bursts.filter((burst) => burst.age < 0.8);
    for (const burst of this.bursts) {
      burst.age += delta;
      ctx.globalAlpha = Math.max(0, 1 - burst.age / 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(burst.x * w, burst.y * h, 12 + burst.age * 85, 0, 7);
      ctx.stroke();
    }
    ctx.restore();
    if (progress > 0.84) {
      const finale = (progress - 0.84) / 0.16;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = reduced ? 0 : 35;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.75 * (1 - finale * 0.4);
      for (let index = 0; index < 3; index++) {
        ctx.beginPath();
        ctx.ellipse(
          w * 0.5,
          h * 0.54,
          Math.min(w, h) *
            (0.25 + index * 0.065 + (reduced ? 0 : finale * 0.4)),
          Math.min(w, h) * (0.2 + index * 0.06),
          -finale * 0.35,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  drawInfinity(ctx, w, h, origin, color, secondary, progress) {
    const target = this.infinityTarget(),
      x = target.x * w,
      y = target.y * h,
      time = this.elapsed;
    const size =
      progress < 0.36 ? 18 + progress * 50 : 28 + Math.sin(time * 3) * 4;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.6);
    glow.addColorStop(0, "#ffffffaa");
    glow.addColorStop(0.25, color + "b0");
    glow.addColorStop(1, color + "00");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.6, 0, 7);
    ctx.fill();
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, size + 8, time * 2, time * 2 + Math.PI * 1.4);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let index = 0; index < 5; index++) {
      const angle = time * (reduced ? 0 : 0.7) + index * Math.PI * 0.4;
      const radius = Math.min(w, h) * (0.18 + index * 0.025);
      const startX = origin.x + Math.cos(angle) * radius,
        startY = origin.y + Math.sin(angle) * radius * 0.65;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(origin.x, origin.y, x, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.quadraticCurveTo(
      origin.x + (x - origin.x) * 0.6,
      origin.y - 80,
      this.aim.x * w,
      this.aim.y * h,
    );
    ctx.stroke();
    if (progress > 0.36 && progress < 0.8) {
      const otherX = w - x;
      const blend = ctx.createRadialGradient(
        otherX,
        y,
        0,
        otherX,
        y,
        size * 1.7,
      );
      blend.addColorStop(0, "#fff5");
      blend.addColorStop(0.2, "#ff669a66");
      blend.addColorStop(1, "#ff669a00");
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = blend;
      ctx.beginPath();
      ctx.arc(otherX, y, size * 1.7, 0, 7);
      ctx.fill();
    }
  }
  drawSpirits(ctx, w, h, origin, color, secondary, progress) {
    const time = this.elapsed;
    for (const spirit of this.spirits) {
      const consumed = spirit.index < this.nextSpirit;
      let x = spirit.x * w,
        y = spirit.y * h;
      if (consumed) {
        const orbit = time * 1.7 + spirit.index * 0.9;
        const radius = Math.min(w, h) * 0.17 * (1 - progress * 0.6);
        x = origin.x + Math.cos(orbit) * radius;
        y = origin.y + Math.sin(orbit) * radius * 0.6;
      }
      const next = spirit.index === this.nextSpirit;
      ctx.globalAlpha = consumed ? 0.5 : next ? 1 : 0.25;
      ctx.fillStyle = color;
      ctx.strokeStyle = next ? secondary : color;
      ctx.lineWidth = next ? 2.5 : 1;
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        consumed ? 11 : 18,
        consumed ? 13 : 22,
        Math.sin(time + spirit.index) * 0.2,
        0,
        7,
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 5, y - 2, 2.3, 0, 7);
      ctx.arc(x + 5, y - 2, 2.3, 0, 7);
      ctx.fill();
      if (next) {
        ctx.beginPath();
        ctx.arc(x, y, 32 + Math.sin(time * 2) * 3, 0, 7);
        ctx.stroke();
        ctx.font = "10px Poppins";
        ctx.fillText(String(spirit.index + 1), x + 37, y + 4);
      }
      if (consumed) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
          origin.x + Math.sin(time) * 30,
          origin.y - 40,
          origin.x,
          origin.y,
        );
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let index = 0; index < this.nextSpirit; index++) {
      const spirit = this.spirits[index];
      index
        ? ctx.lineTo(spirit.x * w, spirit.y * h)
        : ctx.moveTo(spirit.x * w, spirit.y * h);
    }
    ctx.stroke();
    if (progress > 0.62) {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      for (let index = 0; index < 100; index++) {
        const angle = index * 0.14 + time;
        const radius = index * 0.9;
        const x = origin.x + Math.cos(angle) * radius,
          y = origin.y + Math.sin(angle) * radius * 0.55;
        index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.stage?.dispose();
    this.stage = null;
    removeEventListener("resize", this.onResize);
    removeEventListener("keydown", this.onKey);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    $("arena3d").replaceChildren();
  }
}
let activeArena = null;
/** @param {FestivalResult} result @param {ArenaOptions} options */
function runGame(result, options) {
  activeArena?.dispose();
  activeArena = new DomainArena(result, options);
  activeArena.start().catch((error) => {
    notify(error.message);
    activeArena?.dispose();
    showResult(result);
  });
}
