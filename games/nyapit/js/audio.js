'use strict';

/* Enam kalimat merek wajib PRD §9.1. Teksnya tidak boleh diubah. */
const SLOGANS=['slogan-app','slogan-cantik','slogan-belanja','slogan-adaada','slogan-halo','slogan-skincare'];

/* Celetuk MC booth. Ini tambahan v1.3, bukan pengganti slogan wajib: tugasnya
   memecah nada iklan yang kaku dengan kalimat percakapan sehari-hari.
   Hanya momen yang tidak punya balon percakapan yang dilayani di sini; sisanya
   (menang, zonk, menganggur) diputar app.js lewat say()/sayEither() supaya
   tulisan di layar selalu cocok dengan yang terdengar. */
const MC_LINES={
 coin:['mc-koin']
};

/* Tiga tingkat volume BGM. Dinamai supaya pemulihan sesudah suara selesai tidak
   pernah salah tingkat — inilah sumber bug "ketegangan hilang di tengah ronde". */
const BGM_NORMAL=.24;          // panggung tenang
const BGM_DUCK_VOICE=.07;      // ada slogan/celetuk berbunyi
const BGM_DUCK_SUSPENSE=.035;  // capit sedang menukik

class BoothAudio{
 constructor(){
  this.ctx=null;this.enabled=false;this.volume=.7;this.buffers=new Map();this.bgm=null;this.bgmStarting=null;this.voice=null;this.sloganAt=0;this.voiceSequence=0;
  this.bgmVolumeRatio=.75;this.sfxVolumeRatio=.85;this.voiceVolumeRatio=.90;
  this.audioProfile='crisp';this.compressorMode='gentle';
  this.bgmNormal=BGM_NORMAL;this.bgmDuckVoice=BGM_DUCK_VOICE;this.bgmDuckSuspense=BGM_DUCK_SUSPENSE;
 }

 async activate(){
  if(!this.ctx){
   const Context=window.AudioContext||window.webkitAudioContext;
   if(!Context)return false;
   this.ctx=new Context();
   this.master=this.ctx.createGain();
   this.lowCutFilter=this.ctx.createBiquadFilter();
   this.lowCutFilter.type='highpass';this.lowCutFilter.frequency.value=45;this.lowCutFilter.Q.value=0.7;
   this.clarityFilter=this.ctx.createBiquadFilter();
   this.clarityFilter.type='highshelf';this.clarityFilter.frequency.value=3500;
   if(this.clarityFilter.gain)this.clarityFilter.gain.value=4.5;
   this.compressor=this.ctx.createDynamicsCompressor();
   this.applyCompressor();
   this.applyProfile();
   this.bgmGain=this.ctx.createGain();this.bgmGain.gain.value=this.bgmNormal;
   this.sfxGain=this.ctx.createGain();this.sfxGain.gain.value=this.sfxVolumeRatio*0.95;
   this.voiceGain=this.ctx.createGain();this.voiceGain.gain.value=this.voiceVolumeRatio*1.0;
   this.bgmGain.connect(this.master);this.sfxGain.connect(this.master);this.voiceGain.connect(this.master);
   this.master.connect(this.lowCutFilter);this.lowCutFilter.connect(this.clarityFilter);
   this.clarityFilter.connect(this.compressor);this.compressor.connect(this.ctx.destination);
  }
  if(this.ctx.state==='suspended')await this.ctx.resume();
  this.apply();return true;
 }

 applyProfile(){
  if(!this.clarityFilter||!this.ctx)return;
  const now=this.ctx.currentTime;
  if(this.audioProfile==='crisp'){
   this.clarityFilter.type='highshelf';
   this.clarityFilter.frequency.setValueAtTime?.(3500,now);
   this.clarityFilter.gain?.setTargetAtTime?.(4.5,now,.02);
   if(this.lowCutFilter?.frequency)this.lowCutFilter.frequency.setValueAtTime?.(50,now);
  }else if(this.audioProfile==='punchy'){
   this.clarityFilter.type='peaking';
   this.clarityFilter.frequency.setValueAtTime?.(4000,now);
   this.clarityFilter.gain?.setTargetAtTime?.(3.0,now,.02);
   if(this.lowCutFilter?.frequency)this.lowCutFilter.frequency.setValueAtTime?.(35,now);
  }else{
   this.clarityFilter.type='highshelf';
   this.clarityFilter.frequency.setValueAtTime?.(3500,now);
   this.clarityFilter.gain?.setTargetAtTime?.(0,now,.02);
   if(this.lowCutFilter?.frequency)this.lowCutFilter.frequency.setValueAtTime?.(20,now);
  }
 }

 applyCompressor(){
  if(!this.compressor||!this.ctx)return;
  if(this.compressorMode==='gentle'){
   this.compressor.threshold.value=-8;
   this.compressor.knee.value=12;
   this.compressor.ratio.value=3;
   this.compressor.attack.value=.025;
   this.compressor.release.value=.15;
  }else if(this.compressorMode==='standard'){
   this.compressor.threshold.value=-14;
   this.compressor.knee.value=16;
   this.compressor.ratio.value=6;
   this.compressor.attack.value=.01;
   this.compressor.release.value=.22;
  }else if(this.compressorMode==='off'){
   this.compressor.threshold.value=0;
   this.compressor.knee.value=0;
   this.compressor.ratio.value=1;
   this.compressor.attack.value=.05;
   this.compressor.release.value=.1;
  }
 }

 apply(){if(this.master&&this.ctx)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.015);}

 configure({sound,volume,bgmVolume,sfxVolume,voiceVolume,audioProfile,compressor}){
  if(typeof sound==='boolean')this.enabled=sound;
  if(Number.isFinite(volume))this.volume=Math.max(0,Math.min(1,volume/100));
  if(Number.isFinite(bgmVolume)){
   this.bgmVolumeRatio=Math.max(0,Math.min(1,bgmVolume/100));
   this.bgmNormal=this.bgmVolumeRatio*0.72;
   this.bgmDuckVoice=this.bgmNormal*0.35;
   this.bgmDuckSuspense=this.bgmNormal*0.18;
   if(this.bgmGain&&this.ctx){
    const target=this.suspenseTimer?this.bgmDuckSuspense:(this.voice?this.bgmDuckVoice:this.bgmNormal);
    this.bgmGain.gain.setTargetAtTime(target,this.ctx.currentTime,.02);
   }
  }
  if(Number.isFinite(sfxVolume)){
   this.sfxVolumeRatio=Math.max(0,Math.min(1,sfxVolume/100));
   if(this.sfxGain&&this.ctx)this.sfxGain.gain.setTargetAtTime(this.sfxVolumeRatio*0.95,this.ctx.currentTime,.015);
  }
  if(Number.isFinite(voiceVolume)){
   this.voiceVolumeRatio=Math.max(0,Math.min(1,voiceVolume/100));
   if(this.voiceGain&&this.ctx)this.voiceGain.gain.setTargetAtTime(this.voiceVolumeRatio*1.0,this.ctx.currentTime,.015);
  }
  if(typeof audioProfile==='string'){this.audioProfile=audioProfile;this.applyProfile();}
  if(typeof compressor==='string'){this.compressorMode=compressor;this.applyCompressor();}
  this.apply();
 }

 /* Daftar rekaman suara asli milik booth. Dibaca sekali; kalau berkasnya tidak
    ada, aplikasi tetap jalan memakai TTS bawaan. Lihat assets/audio/custom/. */
 async customOverrides(){
  if(this.customSet)return this.customSet;
  this.customSet=new Set();
  try{
   const response=await fetch('/assets/audio/custom/manifest.json');
   if(response.ok){
    const parsed=await response.json();
    /* Bentuk objek {overrides:[...]} yang dipakai sekarang; bentuk array polos
       tetap diterima supaya manifest lama tidak tiba-tiba berhenti bekerja. */
    const list=Array.isArray(parsed)?parsed:parsed?.overrides;
    if(Array.isArray(list))for(const name of list)if(typeof name==='string')this.customSet.add(name);
   }
  }catch{/* Tidak ada rekaman kustom: itu keadaan normal. */}
  return this.customSet;
 }

 async load(name){
  if(this.buffers.has(name))return this.buffers.get(name);
  const overrides=await this.customOverrides();
  const path=overrides.has(name)?`/assets/audio/custom/${name}.wav`:`/assets/audio/${name}.wav`;
  const response=await fetch(path);
  if(!response.ok)throw new Error('audio hilang');
  const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());
  this.buffers.set(name,buffer);return buffer;
 }

 /* Celetuk MC. Gagal diam-diam: kalau berkasnya belum dibuat, permainan tetap
    berjalan tanpa suara tambahan. */
 mc(moment){
  const pool=MC_LINES[moment];
  if(!pool||!this.enabled)return null;
  return this.slogan(pool[Math.floor(Math.random()*pool.length)]);
 }

 async playFile(name,destination,onEnded){
  if(!this.enabled||!await this.activate())return null;
  try{
   const source=this.ctx.createBufferSource();source.buffer=await this.load(name);source.connect(destination||this.sfxGain);
   if(onEnded)source.addEventListener('ended',onEnded,{once:true});
   source.start();return source;
  }catch{return null;}
 }

 async startBgm(){
  if(!this.enabled||this.bgm)return this.bgm;
  if(this.bgmStarting)return this.bgmStarting;
  this.bgmStarting=(async()=>{
   if(!await this.activate()||!this.enabled)return null;
   try{
    const buffer=await this.load('bpedia-bgm');
    if(!this.enabled||this.bgm)return this.bgm;
    const source=this.ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.bgmGain);source.start();
    source.addEventListener('ended',()=>{if(this.bgm===source)this.bgm=null;},{once:true});this.bgm=source;return source;
   }catch{return null;}
  })();
  try{return await this.bgmStarting;}finally{this.bgmStarting=null;}
 }

 stopBgm(){this.stopSuspense();if(this.bgm){try{this.bgm.stop();}catch{}this.bgm=null;}}

 /* Ledakan derau pendek: bahan dasar bunyi logam dan desis lemparan. */
 noise(duration=.12,frequency=1800,gain=.09,type='bandpass'){
  if(!this.enabled||!this.ctx)return;
  const time=this.ctx.currentTime;
  const frames=Math.max(1,Math.floor(this.ctx.sampleRate*duration));
  const buffer=this.ctx.createBuffer(1,frames,this.ctx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);
  const source=this.ctx.createBufferSource();source.buffer=buffer;
  const filter=this.ctx.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;filter.Q.value=1.4;
  const envelope=this.ctx.createGain();
  envelope.gain.setValueAtTime(gain,time);
  envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(filter);filter.connect(envelope);envelope.connect(this.sfxGain);
  source.start(time);source.stop(time+duration);
 }

 /* Ritual koin: denting logam, koin menggelinding, mesin menerima, lalu jingle.
    Empat lapis ini yang membedakannya dari arpeggio datar versi 1.2. */
 coinIntro(){
  if(!this.enabled||!this.ctx)return;
  this.noise(.09,5200,.07,'highpass');
  this.tone([2093,2637],.055,'triangle',.07);
  setTimeout(()=>{if(this.enabled)this.tone([1318.5,1046.5,880,740],.062,'triangle',.055);},120);
  setTimeout(()=>{if(this.enabled){this.noise(.14,320,.12,'lowpass');this.tone([110,82.4],.13,'square',.07);}},430);
  setTimeout(()=>{if(this.enabled)this.tone([784,1046.5,1318.5,1568],.115,'sine',.12);},640);
 }

 /* Bunyi lemparan maskot kecil: pendek, lembut, tidak boleh menutupi musik. */
 tossWhoosh(){this.noise(.1,1500+Math.random()*900,.028,'bandpass');}

 /* Umpan balik ganti mode: naik untuk resmi, turun untuk demo. */
 modeFlip(live){this.tone(live?[523.25,698.46,880]:[698.46,523.25,392],.075,'triangle',.08);}

 /* Musik tegang yang benar-benar menanjak: denyut makin rapat, nada makin
    tinggi, dan ada drone rendah yang membuka filter-nya pelan-pelan. */
 startSuspense(){
  this.stopSuspense();
  if(!this.enabled||!this.ctx)return;
  if(this.voice){try{this.voice.stop();}catch{}this.voice=null;this.voiceSequence++;}
  this.bgmGain.gain.setTargetAtTime(this.bgmDuckSuspense,this.ctx.currentTime,.15);

  const now=this.ctx.currentTime;
  this.drone=this.ctx.createOscillator();
  this.droneGain=this.ctx.createGain();
  this.droneFilter=this.ctx.createBiquadFilter();
  this.drone.type='sawtooth';this.drone.frequency.setValueAtTime(55,now);
  this.droneFilter.type='lowpass';
  this.droneFilter.frequency.setValueAtTime(180,now);
  this.droneFilter.frequency.linearRampToValueAtTime(1500,now+7);
  this.droneGain.gain.setValueAtTime(0,now);
  this.droneGain.gain.linearRampToValueAtTime(.05,now+1.1);
  this.drone.connect(this.droneFilter);this.droneFilter.connect(this.droneGain);
  this.droneGain.connect(this.sfxGain);this.drone.start(now);

  let beat=0;
  const pulse=()=>{
   if(!this.enabled||!this.ctx)return;
   /* 320ms melambat jadi 120ms setelah kira-kira 16 ketukan. */
   const progress=Math.min(1,beat/16);
   const interval=320-progress*200;
   const root=164.81*(1+progress*.22);
   this.tone([beat%4===3?root*1.5:root,root*2],.07,'triangle',.085+progress*.05);
   if(beat%4===3)this.noise(.05,6000,.02,'highpass');
   beat++;
   this.suspenseTimer=setTimeout(pulse,interval);
  };
  pulse();
 }
 stopSuspense(){
  clearTimeout(this.suspenseTimer);this.suspenseTimer=null;
  if(this.drone){
   try{
    const now=this.ctx.currentTime;
    this.droneGain.gain.cancelScheduledValues(now);
    this.droneGain.gain.setTargetAtTime(0,now,.12);
    this.drone.stop(now+.5);
   }catch{}
   this.drone=null;this.droneGain=null;this.droneFilter=null;
  }
  if(this.bgmGain&&this.ctx)this.bgmGain.gain.setTargetAtTime(this.bgmNormal,this.ctx.currentTime,.18);
 }

 async slogan(name){
  const key=name||SLOGANS[this.sloganAt++%SLOGANS.length];
  const sequence=++this.voiceSequence;
  if(this.voice){try{this.voice.stop();}catch{}this.voice=null;}
  if(!this.enabled||!await this.activate())return null;
  const restore=()=>{
   if(sequence!==this.voiceSequence)return;
   this.voice=null;
   /* Kembali ke tingkat yang benar, bukan selalu ke normal: kalau capit masih
      menukik, BGM harus turun lagi ke tingkat tegang. Tanpa ini celetuk MC saat
      mencapit meninggalkan BGM di tingkat ducking suara dan ketegangannya
      kendur di tengah ronde. */
   const level=this.suspenseTimer?this.bgmDuckSuspense:this.bgmNormal;
   this.bgmGain.gain.setTargetAtTime(level,this.ctx.currentTime,.12);
  };
  try{
   const buffer=await this.load(key);
   if(sequence!==this.voiceSequence||!this.enabled)return null;
   this.bgmGain.gain.setTargetAtTime(this.bgmDuckVoice,this.ctx.currentTime,.06);
   const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.voiceGain);
   source.addEventListener('ended',restore,{once:true});this.voice=source;source.start();return source;
  }catch{restore();return null;}
 }

 async playPrize(prizeId){
  if(!prizeId||!this.enabled)return null;
  const key='prize-'+prizeId;
  try{
   return await this.slogan(key);
  }catch{
   return this.slogan('mc-mantap');
  }
 }

 tone(frequencies,duration=.18,type='sine',gain=.16){
  if(!this.enabled||!this.ctx)return;
  frequencies.forEach((frequency,index)=>{
   const time=this.ctx.currentTime+index*duration;
   const oscillator=this.ctx.createOscillator(),envelope=this.ctx.createGain();
   oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,time);
   envelope.gain.setValueAtTime(gain,time);envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
   oscillator.connect(envelope);envelope.connect(this.sfxGain);oscillator.start(time);oscillator.stop(time+duration);
  });
 }

 move(){this.tone([225],.045,'triangle',.035);}
 drop(){this.tone([520,390,260],.11,'triangle',.085);}
 grab(){this.tone([280,560],.1,'sine',.12);}
 lift(){this.tone([330,415,523],.09,'triangle',.08);}
 release(){this.tone([760,520,880],.1,'sine',.12);}
  win(){
    this.tone([523.25,659.25,783.99,1046.5],.12,'sine',.17);
    setTimeout(()=>{
      if(this.enabled)this.tone([1046.5,1318.5,1567.98,2093],.1,'triangle',.14);
    },260);
  }
  grand(){
    this.tone([523.25,659.25,783.99,1046.5,1318.51,1567.98],.14,'sine',.21);
    setTimeout(()=>{
      if(this.enabled)this.tone([783.99,1046.5,1318.51,1567.98,2093],.12,'triangle',.18);
    },320);
    setTimeout(()=>{
      if(this.enabled)this.tone([1318.51,1567.98,2093,2637],.15,'sine',.19);
    },640);
  }
  voucherJingle(){
    if(!this.enabled||!this.ctx)return;
    this.tone([659.25,830.61,987.77,1318.51],.11,'sine',.17);
    setTimeout(()=>{
      if(this.enabled)this.tone([987.77,1318.51,1661.22,1975.53],.12,'triangle',.15);
    },230);
  }
  zonk(){this.tone([392,330,262],.18,'sine',.11);}

 ballBounce(pitchFactor=1){
  if(!this.enabled||!this.ctx)return;
  const time=this.ctx.currentTime;
  const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
  osc.type='sine';
  const startFreq=Math.max(120,Math.min(900,190*pitchFactor));
  const endFreq=Math.max(200,Math.min(1400,440*pitchFactor));
  osc.frequency.setValueAtTime(startFreq,time);
  osc.frequency.exponentialRampToValueAtTime(endFreq,time+.07);
  gain.gain.setValueAtTime(.11,time);
  gain.gain.exponentialRampToValueAtTime(.001,time+.09);
  osc.connect(gain);gain.connect(this.sfxGain);
  osc.start(time);osc.stop(time+.1);
 }

 djScratch(){
  if(!this.enabled||!this.ctx)return;
  const time=this.ctx.currentTime;
  const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
  osc.type='sawtooth';
  osc.frequency.setValueAtTime(840,time);
  osc.frequency.exponentialRampToValueAtTime(220,time+.06);
  osc.frequency.exponentialRampToValueAtTime(580,time+.12);
  gain.gain.setValueAtTime(.08,time);
  gain.gain.exponentialRampToValueAtTime(.001,time+.13);
  osc.connect(gain);gain.connect(this.sfxGain);
  osc.start(time);osc.stop(time+.14);
 }

 crowdCheer(){
  if(!this.enabled||!this.ctx)return;
  this.tone([440,554,659,880],.22,'sine',.14);
 }
}

window.BoothAudio=BoothAudio;
