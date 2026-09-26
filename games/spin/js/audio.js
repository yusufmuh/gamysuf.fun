'use strict';
class BoothAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.75;
    this.voice = true;
    this.buffers = new Map();
    this.sources = new Set();
    this.generation = 0;

    // BGM & loop states
    this.bgmSource = null;
    this.bgmPlaying = false;
    this.bgmTrack = 'bpedia-bgm';
    this.bgmLoop = true;
    this.bgmVolume = 0.65;
    this.bgmAuto = true;
    this.isDucked = false;

    // Audio-reactive analyser
    this.analyser = null;
    this.freqData = null;
    this.timeData = null;
    this.analyserActive = false;
    this.reactiveListeners = new Set();
    this.smoothedBass = 0;
    this.smoothedMid = 0;
    this.smoothedTreble = 0;
    this.smoothedEnergy = 0;
  }

  async activate() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Nodes
      this.master = this.ctx.createGain();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 8;
      this.compressor.ratio.value = 10;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.15;

      // Analyser Node for real-time visualization
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.frequencyBinCount);

      // Separate BGM and SFX channels
      this.bgmGain = this.ctx.createGain();
      this.duckGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      // Routing
      this.bgmGain.connect(this.duckGain);
      this.duckGain.connect(this.master);
      this.sfxGain.connect(this.master);

      this.master.connect(this.analyser);
      this.analyser.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.startAnalyser();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.apply();
  }

  apply() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const masterLevel = this.enabled ? this.volume * 0.72 : 0;
    this.master.gain.setTargetAtTime(masterLevel, t, 0.025);
    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(this.enabled ? this.bgmVolume : 0, t, 0.025);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.enabled ? 1.0 : 0, t, 0.025);
    }
  }

  configure(settings) {
    const wasVoice = this.voice;
    this.enabled = settings.sound !== false;
    this.volume = (settings.volume ?? 75) / 100;
    this.voice = settings.voice !== false;
    if (settings.bgmVolume !== undefined) {
      this.bgmVolume = Number(settings.bgmVolume) / 100;
    }
    if (settings.bgmLoop !== undefined) {
      this.bgmLoop = !!settings.bgmLoop;
    }
    if (settings.bgmTrack !== undefined && settings.bgmTrack !== this.bgmTrack) {
      this.bgmTrack = settings.bgmTrack;
      if (this.bgmPlaying) {
        this.playBGM(this.bgmTrack, this.bgmLoop);
      }
    }
    if (!this.enabled || (wasVoice && !this.voice)) {
      this.stopVoices();
    }
    this.apply();
  }

  async loadBuffer(name) {
    if (this.buffers.has(name)) return this.buffers.get(name);
    const response = await fetch('/assets/audio/' + name + '.mp3');
    if (!response.ok) throw new Error('Audio ' + name + ' tidak tersedia');
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.buffers.set(name, audioBuffer);
    return audioBuffer;
  }

  // --- Background Music (BGM) & Jingles ---
  async playBGM(track = this.bgmTrack, loop = this.bgmLoop) {
    await this.activate();
    this.bgmTrack = track;
    this.bgmLoop = loop;

    try {
      const buffer = await this.loadBuffer(track);
      if (this.bgmSource) {
        try {
          this.bgmSource.stop();
          this.bgmSource.disconnect();
        } catch {}
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      source.connect(this.bgmGain);

      source.onended = () => {
        if (!source.loop && this.bgmSource === source) {
          this.bgmPlaying = false;
          this.notifyBgmChange();
        }
      };

      source.start();
      this.bgmSource = source;
      this.bgmPlaying = true;
      this.notifyBgmChange();
    } catch (err) {
      console.warn('Bpedia BGM error:', err.message);
    }
  }

  pauseBGM() {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
        this.bgmSource.disconnect();
      } catch {}
      this.bgmSource = null;
    }
    this.bgmPlaying = false;
    this.notifyBgmChange();
  }

  resumeBGM() {
    return this.playBGM(this.bgmTrack, this.bgmLoop);
  }

  toggleBGM() {
    if (this.bgmPlaying) {
      this.pauseBGM();
    } else {
      this.resumeBGM();
    }
  }

  setBGMVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.enabled ? this.bgmVolume : 0, this.ctx.currentTime, 0.02);
    }
  }

  setLoop(loop) {
    this.bgmLoop = !!loop;
    if (this.bgmSource) {
      this.bgmSource.loop = this.bgmLoop;
    }
    this.notifyBgmChange();
  }

  notifyBgmChange() {
    window.dispatchEvent(new CustomEvent('bpedia:bgm-state', {
      detail: {
        playing: this.bgmPlaying,
        track: this.bgmTrack,
        loop: this.bgmLoop,
        volume: this.bgmVolume
      }
    }));
  }

  // --- Voice Ducking ---
  duck(target = 0.20, duration = 0.15) {
    if (!this.duckGain || !this.ctx) return;
    this.isDucked = true;
    const t = this.ctx.currentTime;
    this.duckGain.gain.cancelScheduledValues(t);
    this.duckGain.gain.setTargetAtTime(target, t, duration);
  }

  unduck(duration = 0.35) {
    if (!this.duckGain || !this.ctx) return;
    this.isDucked = false;
    const t = this.ctx.currentTime;
    this.duckGain.gain.cancelScheduledValues(t);
    this.duckGain.gain.setTargetAtTime(1.0, t, duration);
  }

  stopVoices() {
    this.generation++;
    for (const s of this.sources) {
      try { s.stop(); } catch {}
    }
    this.sources.clear();
    this.unduck(0.1);
  }

  async clip(name, spoken = true) {
    this.stopVoices();
    if (!this.enabled || (spoken && !this.voice)) return;
    await this.activate();
    const generation = this.generation;

    try {
      const buffer = await this.loadBuffer(name);
      if (generation !== this.generation || !this.enabled) return;

      if (spoken) {
        this.duck(0.18, 0.12);
      }

      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = 0.96;
      source.connect(gain);
      gain.connect(this.sfxGain);
      this.sources.add(source);

      source.onended = () => {
        this.sources.delete(source);
        source.disconnect();
        gain.disconnect();
        if (spoken && this.sources.size === 0) {
          this.unduck(0.35);
        }
      };
      source.start();
    } catch (error) {
      console.warn('Bpedia audio clip error:', name, error.message);
      if (spoken) this.unduck(0.1);
    }
  }

  brand() { this.clip('bpedia-jingle', false); }
  ringtone() { this.clip('bpedia-ringtone', false); }
  welcome() { this.clip('voice-welcome', true); }
  mystery() {
    this.clip('voice-mystery', true);
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => this.tone(f, 0.32, i * 0.08, 0.04, 'sine'));
  }
  suspense() {
    this.clip('voice-suspense', true);
    [130.81, 146.83, 164.81, 174.61].forEach((f, i) => this.tone(f, 0.30, i * 0.4, 0.03, 'sine'));
  }
  tone(freq, duration = 0.16, delay = 0, volume = 0.15, type = 'sine') {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.04);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  tick(speed = 1) { this.tone(900 + speed * 700, 0.045, 0, 0.06, 'sine'); }
  spin() {
    this.clip('voice-spin', true);
    [261.63, 329.63, 392.00, 523.25].forEach((f, i) => this.tone(f, 0.22, i * 0.06, 0.045, 'sine'));
  }
  win(tier) {
    this.clip('voice-' + ({ grand: 'grand', bundling: 'bundle', zonk: 'zonk' }[tier] || 'win'), true);
    if (tier === 'zonk') {
      [392.00, 349.23, 293.66].forEach((f, i) => this.tone(f, 0.30, i * 0.18, 0.045, 'sine'));
      return;
    }
    const notes = tier === 'grand' ? [523.25, 659.25, 783.99, 1046.50, 1318.51] : [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      this.tone(f, 0.45, i * 0.09, 0.04, 'sine');
    });
  }
  hello() {
    [659.25, 783.99, 1046.50].forEach((f, i) => this.tone(f, 0.20, i * 0.06, 0.05, 'sine'));
  }

  // --- Audio-Reactive Visualizer Analyser Loop ---
  startAnalyser() {
    if (this.analyserActive) return;
    this.analyserActive = true;

    const root = document.documentElement;
    const update = () => {
      if (!this.analyserActive) return;

      if (this.analyser && this.enabled && this.ctx && this.ctx.state === 'running') {
        this.analyser.getByteFrequencyData(this.freqData);
        this.analyser.getByteTimeDomainData(this.timeData);

        // Calculate frequency bands
        // Bass: bins 1..8 (~20Hz..300Hz)
        let bassSum = 0;
        for (let i = 1; i <= 8; i++) bassSum += this.freqData[i];
        const rawBass = bassSum / (8 * 255);

        // Mid: bins 9..32 (~300Hz..2500Hz)
        let midSum = 0;
        for (let i = 9; i <= 32; i++) midSum += this.freqData[i];
        const rawMid = midSum / (24 * 255);

        // Treble: bins 33..80 (~2500Hz..10000Hz)
        let trebleSum = 0;
        for (let i = 33; i <= 80; i++) trebleSum += this.freqData[i];
        const rawTreble = trebleSum / (48 * 255);

        // RMS Energy from time domain
        let energySum = 0;
        for (let i = 0; i < this.timeData.length; i++) {
          const v = (this.timeData[i] - 128) / 128;
          energySum += v * v;
        }
        const rawEnergy = Math.min(1.0, Math.sqrt(energySum / this.timeData.length) * 2.5);

        // Smooth with decay
        this.smoothedBass = this.smoothedBass * 0.75 + rawBass * 0.25;
        this.smoothedMid = this.smoothedMid * 0.8 + rawMid * 0.2;
        this.smoothedTreble = this.smoothedTreble * 0.8 + rawTreble * 0.2;
        this.smoothedEnergy = this.smoothedEnergy * 0.75 + rawEnergy * 0.25;

        const pulse = 1.0 + this.smoothedBass * 0.045 + this.smoothedEnergy * 0.03;
        const glow = Math.round(this.smoothedBass * 28 + this.smoothedMid * 16);
        const lightPulse = Math.min(1.0, (this.smoothedEnergy + this.smoothedTreble) * 1.3);

        // Set CSS variables for ultra-responsive styling
        root.style.setProperty('--audio-bass', this.smoothedBass.toFixed(3));
        root.style.setProperty('--audio-mid', this.smoothedMid.toFixed(3));
        root.style.setProperty('--audio-treble', this.smoothedTreble.toFixed(3));
        root.style.setProperty('--audio-energy', this.smoothedEnergy.toFixed(3));
        root.style.setProperty('--audio-pulse', pulse.toFixed(4));
        root.style.setProperty('--audio-glow', glow + 'px');
        root.style.setProperty('--audio-light', lightPulse.toFixed(3));

        for (const cb of this.reactiveListeners) {
          cb({
            bass: this.smoothedBass,
            mid: this.smoothedMid,
            treble: this.smoothedTreble,
            energy: this.smoothedEnergy,
            freqData: this.freqData
          });
        }
      } else {
        root.style.setProperty('--audio-bass', '0');
        root.style.setProperty('--audio-mid', '0');
        root.style.setProperty('--audio-treble', '0');
        root.style.setProperty('--audio-energy', '0');
        root.style.setProperty('--audio-pulse', '1');
        root.style.setProperty('--audio-glow', '0px');
        root.style.setProperty('--audio-light', '0');
      }

      requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
  }

  onAudioReactive(callback) {
    this.reactiveListeners.add(callback);
    return () => this.reactiveListeners.delete(callback);
  }
}
window.boothAudio = new BoothAudio();
