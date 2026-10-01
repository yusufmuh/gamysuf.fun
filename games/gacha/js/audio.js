'use strict';

/* Audio Bipy Gacha Pop: satu AudioContext, tiga kanal (BGM, SFX, suara MC)
   lewat EQ dan kompresor yang bisa diatur dashboard. Bunyi mekanik mesin
   (ratchet tuas, kapsul beradu, menggelinding, pop) disintesis langsung supaya
   bereaksi pada waktu animasi; momen besar memakai rekaman merek Bpedia. */
const SLOGANS=['slogan-halo','slogan-belanja','slogan-cantik','slogan-app','slogan-adaada','slogan-skincare'];
const CROWD=['gp-crowd-1','gp-crowd-2','gp-crowd-3'];

class BoothAudio{
 constructor(){
  this.ctx=null;this.enabled=false;this.volume=.74;this.buffers=new Map();this.pending=new Map();
  this.bgm=null;this.bgmStarting=null;this.voice=null;this.voiceSequence=0;this.attractAt=0;
  this.bgmVolumeRatio=.56;this.sfxVolumeRatio=.9;this.voiceVolumeRatio=.88;
  this.audioProfile='punchy';this.compressorMode='gentle';
  this.bgmNormal=.4;this.bgmDuck=.14;
 }

 async activate(){
  if(!this.ctx){
   const Context=window.AudioContext||window.webkitAudioContext;
   if(!Context)return false;
   this.ctx=new Context();
   this.master=this.ctx.createGain();
   this.lowCut=this.ctx.createBiquadFilter();this.lowCut.type='highpass';this.lowCut.frequency.value=45;
   this.clarity=this.ctx.createBiquadFilter();
   this.compressor=this.ctx.createDynamicsCompressor();
   this.bgmGain=this.ctx.createGain();this.sfxGain=this.ctx.createGain();this.voiceGain=this.ctx.createGain();
   this.bgmGain.connect(this.master);this.sfxGain.connect(this.master);this.voiceGain.connect(this.master);
   this.master.connect(this.lowCut);this.lowCut.connect(this.clarity);this.clarity.connect(this.compressor);this.compressor.connect(this.ctx.destination);
   this.applyProfile();this.applyCompressor();this.applyLevels();
  }
  if(this.ctx.state==='suspended'){try{await this.ctx.resume();}catch{return false;}}
  this.apply();
  return this.ctx.state==='running';
 }

 get running(){return Boolean(this.ctx&&this.ctx.state==='running');}

 applyProfile(){
  if(!this.clarity)return;
  const now=this.ctx.currentTime;
  const profiles={crisp:['highshelf',3500,4.5,50],punchy:['peaking',3800,3,35],flat:['highshelf',3500,0,20]};
  const [type,frequency,gain,cut]=profiles[this.audioProfile]||profiles.crisp;
  this.clarity.type=type;
  this.clarity.frequency.setValueAtTime(frequency,now);
  this.clarity.gain.setTargetAtTime(gain,now,.02);
  this.lowCut.frequency.setValueAtTime(cut,now);
 }

 applyCompressor(){
  if(!this.compressor)return;
  const modes={gentle:[-10,12,3,.02,.16],standard:[-16,16,6,.01,.22],off:[0,0,1,.05,.1]};
  const [threshold,knee,ratio,attack,release]=modes[this.compressorMode]||modes.gentle;
  this.compressor.threshold.value=threshold;this.compressor.knee.value=knee;this.compressor.ratio.value=ratio;
  this.compressor.attack.value=attack;this.compressor.release.value=release;
 }

 applyLevels(){
  if(!this.ctx)return;
  const now=this.ctx.currentTime;
  this.bgmNormal=this.bgmVolumeRatio*.62;
  this.bgmDuck=this.bgmNormal*.32;
  this.bgmGain.gain.setTargetAtTime(this.voice?this.bgmDuck:this.bgmNormal,now,.05);
  this.sfxGain.gain.setTargetAtTime(this.sfxVolumeRatio*.95,now,.02);
  this.voiceGain.gain.setTargetAtTime(this.voiceVolumeRatio*1.05,now,.02);
 }

 apply(){if(this.master)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.02);}

 configure({sound,volume,bgmVolume,sfxVolume,voiceVolume,audioProfile,compressor}={}){
  if(typeof sound==='boolean')this.enabled=sound;
  const ratio=value=>Math.max(0,Math.min(1,value/100));
  if(Number.isFinite(volume))this.volume=ratio(volume);
  if(Number.isFinite(bgmVolume))this.bgmVolumeRatio=ratio(bgmVolume);
  if(Number.isFinite(sfxVolume))this.sfxVolumeRatio=ratio(sfxVolume);
  if(Number.isFinite(voiceVolume))this.voiceVolumeRatio=ratio(voiceVolume);
  if(typeof audioProfile==='string')this.audioProfile=audioProfile;
  if(typeof compressor==='string')this.compressorMode=compressor;
  if(this.ctx){this.applyProfile();this.applyCompressor();this.applyLevels();this.apply();}
 }

 /* Rekaman asli booth menimpa TTS. Isi manifest boleh "gp-welcome" (dicari
    .mp3 lalu .wav) atau nama lengkap "gp-welcome.wav". */
 async customOverrides(){
  if(this.customSet)return this.customSet;
  this.customSet=new Map();
  try{
   const response=await fetch('/assets/audio/custom/manifest.json');
   if(response.ok){
    const parsed=await response.json();
    const list=Array.isArray(parsed)?parsed:parsed?.overrides;
    if(Array.isArray(list))for(const entry of list){
     if(typeof entry!=='string'||!/^[a-z0-9_-]+(?:\.(?:mp3|wav))?$/i.test(entry))continue;
     const base=entry.replace(/\.(?:mp3|wav)$/i,'');
     this.customSet.set(base,/\.(?:mp3|wav)$/i.test(entry)?entry:`${base}.wav`);
    }
   }
  }catch{/* Tanpa rekaman kustom: keadaan normal. */}
  return this.customSet;
 }

 async load(name){
  if(this.buffers.has(name))return this.buffers.get(name);
  if(this.pending.has(name))return this.pending.get(name);
  const task=(async()=>{
   const overrides=await this.customOverrides();
   const base=name.replace(/\.(?:mp3|wav)$/i,'');
   const path=overrides.has(base)?`/assets/audio/custom/${overrides.get(base)}`:`/assets/audio/${/\.(?:mp3|wav)$/i.test(name)?name:`${name}.mp3`}`;
   const response=await fetch(path);
   if(!response.ok)throw new Error('audio hilang');
   const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());
   this.buffers.set(name,buffer);
   return buffer;
  })();
  this.pending.set(name,task);
  try{return await task;}finally{this.pending.delete(name);}
 }

 /* Memuat suara momen penting lebih awal agar tidak ada jeda saat kapsul pop. */
 preload(names){
  if(!this.ctx)return;
  for(const name of names)this.load(name).catch(()=>{});
 }

 async playFile(name,{gain=1}={}){
  if(!this.enabled||!await this.activate())return null;
  try{
   const source=this.ctx.createBufferSource();source.buffer=await this.load(name);
   const level=this.ctx.createGain();level.gain.value=gain;
   source.connect(level);level.connect(this.sfxGain);source.start();
   return source;
  }catch{return null;}
 }

 async startBgm(){
  if(!this.enabled||this.bgm)return this.bgm;
  if(this.bgmStarting)return this.bgmStarting;
  this.bgmStarting=(async()=>{
   if(!await this.activate()||!this.enabled)return null;
   try{
    const buffer=await this.load('gacha-bgm.mp3');
    if(!this.enabled||this.bgm)return this.bgm;
    const source=this.ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.bgmGain);source.start();
    source.addEventListener('ended',()=>{if(this.bgm===source)this.bgm=null;},{once:true});
    this.bgm=source;return source;
   }catch{return null;}
  })();
  try{return await this.bgmStarting;}finally{this.bgmStarting=null;}
 }

 stopBgm(){if(this.bgm){try{this.bgm.stop();}catch{}this.bgm=null;}}

 duck(on){
  if(!this.bgmGain)return;
  this.bgmGain.gain.setTargetAtTime(on?this.bgmDuck:this.bgmNormal,this.ctx.currentTime,on?.06:.25);
 }

 async speak(name){
  const sequence=++this.voiceSequence;
  if(this.voice){try{this.voice.stop();}catch{}this.voice=null;}
  if(!this.enabled||!await this.activate())return null;
  try{
   const buffer=await this.load(name);
   if(sequence!==this.voiceSequence||!this.enabled)return null;
   const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.voiceGain);
   this.duck(true);
   source.addEventListener('ended',()=>{if(sequence===this.voiceSequence){this.voice=null;this.duck(false);}},{once:true});
   this.voice=source;source.start();
   return source;
  }catch{if(sequence===this.voiceSequence)this.duck(false);return null;}
 }

 stopVoice(){this.voiceSequence++;if(this.voice){try{this.voice.stop();}catch{}this.voice=null;}this.duck(false);}

 async prize(prizeId){
  const spoken=await this.speak(`prize-${prizeId}`);
  return spoken||this.speak('mc-mantap');
 }

 /* Panggilan keramaian bergantian antara ajakan Gacha Pop dan slogan merek. */
 attract(){
  const pool=[...CROWD,SLOGANS[this.attractAt%SLOGANS.length]];
  const name=pool[this.attractAt%pool.length];
  this.attractAt++;
  return this.speak(name);
 }

 /* ── Sintesis ──────────────────────────────────────── */
 noise(duration=.12,frequency=1800,gain=.09,type='bandpass',delay=0,q=1.4){
  if(!this.enabled||!this.running)return;
  const time=this.ctx.currentTime+delay;
  const frames=Math.max(1,Math.floor(this.ctx.sampleRate*duration));
  const buffer=this.ctx.createBuffer(1,frames,this.ctx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/frames,2);
  const source=this.ctx.createBufferSource();source.buffer=buffer;
  const filter=this.ctx.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;
  const envelope=this.ctx.createGain();
  envelope.gain.setValueAtTime(gain,time);envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(filter);filter.connect(envelope);envelope.connect(this.sfxGain);
  source.start(time);source.stop(time+duration+.02);
 }

 tone(frequencies,duration=.18,type='sine',gain=.16,delay=0){
  if(!this.enabled||!this.running)return;
  frequencies.forEach((frequency,index)=>{
   const time=this.ctx.currentTime+delay+index*duration;
   const oscillator=this.ctx.createOscillator(),envelope=this.ctx.createGain();
   oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,time);
   envelope.gain.setValueAtTime(.0001,time);
   envelope.gain.exponentialRampToValueAtTime(gain,time+.008);
   envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
   oscillator.connect(envelope);envelope.connect(this.sfxGain);oscillator.start(time);oscillator.stop(time+duration+.02);
  });
 }

 sweep(from,to,duration,type='sine',gain=.1,delay=0){
  if(!this.enabled||!this.running)return;
  const time=this.ctx.currentTime+delay;
  const oscillator=this.ctx.createOscillator(),envelope=this.ctx.createGain();
  oscillator.type=type;
  oscillator.frequency.setValueAtTime(from,time);oscillator.frequency.exponentialRampToValueAtTime(to,time+duration);
  envelope.gain.setValueAtTime(.0001,time);envelope.gain.exponentialRampToValueAtTime(gain,time+.02);envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
  oscillator.connect(envelope);envelope.connect(this.sfxGain);oscillator.start(time);oscillator.stop(time+duration+.02);
 }

 /* Tuas diputar: tiga klik ratchet logam dengan dentum per klik. */
 crank(duration=.9){
  const step=duration/3;
  for(let i=0;i<3;i++){
   this.noise(.05,4200+i*500,.12,'bandpass',i*step,6);
   this.noise(.09,900,.09,'lowpass',i*step+.012);
   this.tone([150+i*25],.07,'square',.035,i*step);
  }
  this.noise(.22,1600,.035,'bandpass',.05,.7);
 }

 /* Kapsul plastik beradu di kubah: butiran klik acak, makin rapat lalu reda. */
 tumble(duration=1.2,intensity=1){
  if(!this.enabled||!this.running)return;
  const hits=Math.round(16*duration*intensity);
  for(let i=0;i<hits;i++){
   const t=Math.pow(Math.random(),.8)*duration;
   this.noise(.025+Math.random()*.03,2200+Math.random()*2600,.03+Math.random()*.035*intensity,'bandpass',t,4);
  }
 }

 /* Kapsul lepas ke corong: gelinding berbunyi turun lalu membentur baki. */
 chute(){
  this.noise(.32,700,.06,'bandpass',0,1.6);
  this.sweep(520,180,.3,'triangle',.05);
  this.tray(.32);
 }
 tray(delay=0){
  this.noise(.12,260,.16,'lowpass',delay);
  this.tone([196,147],.07,'sine',.11,delay);
  this.noise(.05,3600,.05,'bandpass',delay+.12,5);
  this.noise(.04,3000,.03,'bandpass',delay+.24,5);
 }
 whoosh(){this.noise(.35,1200,.05,'bandpass',0,.8);this.sweep(300,900,.32,'sine',.03);}

 /* Ketegangan sebelum pop: getar naik nada, makin cepat untuk hadiah besar. */
 charge(level=1){
  this.noise(.06,2600+level*500,.05+level*.02,'bandpass',0,3);
  this.tone([180+level*70],.06,'triangle',.05+level*.015);
 }
 riser(duration=1.4){this.sweep(220,1400,duration,'sawtooth',.03);this.noise(duration,3000,.025,'highpass');}

 pop(){
  this.noise(.08,1800,.22,'bandpass',0,1.2);
  this.sweep(900,180,.12,'sine',.18);
  this.tone([1046.5,1568],.07,'triangle',.08,.06);
  return this.playFile('ui_petal_pop.mp3',{gain:.9});
 }
 sparkle(){return this.playFile('ui_sparkle_cart.mp3',{gain:.8});}
 jingle(){return this.playFile('bpedia_jingle_utama.mp3',{gain:.85});}
 sonicLogo(){return this.playFile('bpedia_sonic_logo_pop.mp3',{gain:.85});}
 claimChime(){return this.playFile('ui_payment_success.mp3',{gain:.8});}
 attention(){return this.playFile('notif_promo_kilat.mp3',{gain:.6});}

 win(){
  this.tone([523.25,659.25,783.99,1046.5],.1,'triangle',.12);
  this.tone([1318.5,1568,2093],.08,'sine',.08,.42);
 }
 fanfare(){
  this.tone([392,523.25,659.25,783.99,1046.5],.11,'sawtooth',.06);
  this.tone([523.25,659.25,783.99,1046.5,1318.5],.11,'triangle',.11);
  this.tone([1046.5,1318.5,1568,2093,2637],.1,'sine',.1,.56);
 }
 empty(){this.tone([392,330,262],.16,'sine',.1);}
 tap(){this.tone([660,990],.05,'triangle',.07);this.noise(.04,5000,.04,'highpass');}
 tick(){this.tone([1200],.03,'square',.02);}
 modeFlip(live){this.tone(live?[523.25,698.46,880]:[698.46,523.25,392],.075,'triangle',.08);}
}
BoothAudio.SLOGANS=SLOGANS;
BoothAudio.CROWD=CROWD;

window.BoothAudio=BoothAudio;
