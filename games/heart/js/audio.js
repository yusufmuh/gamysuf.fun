'use strict';
(()=>{
 const read=()=>{try{return localStorage.getItem('heart-muted')==='1';}catch{return false;}};
 class HeartAudio{
  constructor(){this.muted=read();this.unlocked=false;this.context=null;this.bgm=new Audio('/assets/audio/garden-bgm.mp3');this.bgm.loop=true;this.bgm.volume=.16;this.bgm.preload='none';document.addEventListener('visibilitychange',()=>{if(document.hidden)this.bgm.pause();else if(this.unlocked&&!this.muted)this.bgm.play().catch(()=>{});});}
  unlock(){this.unlocked=true;if(!this.muted){this.bgm.play().catch(()=>{});try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(AudioCtx){this.context||=new AudioCtx();if(this.context.state==='suspended')this.context.resume().catch(()=>{});}}catch{}}}
  setMuted(value){this.muted=Boolean(value);try{localStorage.setItem('heart-muted',this.muted?'1':'0');}catch{}if(this.muted)this.bgm.pause();else this.unlock();window.dispatchEvent(new CustomEvent('gamysuf:audio-state',{detail:{muted:this.muted}}));}
  notes(notes,spacing=.12){if(this.muted||!this.context||document.hidden)return;const ctx=this.context;notes.forEach((note,i)=>{const start=ctx.currentTime+i*spacing,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=note;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.075,start+.012);gain.gain.exponentialRampToValueAtTime(.001,start+.7);osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+.75);});}
  select(){this.notes([523.25,659.25],.06);}
  draw(){this.notes([392,493.88,587.33,783.99],.15);}
  reveal(){this.notes([523.25,659.25,783.99,1046.5,1318.5],.13);}
 }
 window.HeartAudio=HeartAudio;
})();
