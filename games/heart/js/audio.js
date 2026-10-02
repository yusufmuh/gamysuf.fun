'use strict';
/* Musik Bpedia milik pemilik + SFX sintesis Web Audio. Tidak ada suara sebelum gestur pengguna;
   jingle "Hanya di Bpedia" diputar saat stempel GRATIS mendarat sambil
   menurunkan BGM sementara. */
(()=>{
 const pref={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{/* preferensi opsional */}}};
 const BGM_VOLUME=.22,DUCKED=.05;
 class HeartAudio{
  constructor(){
   this.muted=pref.get('heart-muted')==='1';this.unlocked=false;this.ctx=null;this.out=null;this.noiseBuffer=null;this.duckFrame=0;this.sources=new Set();this.hookTurn=0;
   this.bgm=new Audio('/assets/audio/bpedia-home-suite.mp3');this.bgm.loop=true;this.bgm.preload='none';this.bgm.volume=BGM_VOLUME;
   this.bgm.addEventListener('seeked',()=>{if(this.bgm.loop&&this.bgm.paused&&this.bgm.currentTime<.5&&this.unlocked&&!this.muted&&!document.hidden)this.bgm.play().catch(()=>{});});
   this.hook=new Audio('/assets/audio/bpedia-jingle-hook.mp3');this.hook.preload='none';this.hook.volume=.95;
   this.hook.addEventListener('ended',()=>{if(this.hook.ended)this.duck(false);});
   this.hook.addEventListener('pause',()=>{if(this.hook.paused)this.duck(false);});
   for(const event of ['error','abort'])this.hook.addEventListener(event,()=>this.duck(false));
   document.addEventListener('visibilitychange',()=>this.visibility());
  }
  context(){
   if(this.ctx)return this.ctx;
   const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;
   try{this.ctx=new Ctx();const comp=this.ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;this.out=this.ctx.createGain();this.out.gain.value=.85;this.out.connect(comp);comp.connect(this.ctx.destination);}catch{this.ctx=null;}
   return this.ctx;
  }
  /* Hanya dipanggil dari handler gestur (klik/tombol). */
  unlock(){
   this.unlocked=true;if(this.muted)return;
   const ctx=this.context();if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
   if(!document.hidden&&this.bgm.paused)this.bgm.play().catch(()=>{});
  }
  setMuted(value){
   this.muted=Boolean(value);pref.set('heart-muted',this.muted?'1':'0');
   if(this.out)this.out.gain.setValueAtTime(this.muted?0:.85,this.ctx.currentTime);
   if(this.muted){this.hookTurn++;this.clearSfx();this.bgm.pause();this.hook.pause();}else this.unlock();
  }
  visibility(){
   if(document.hidden){this.hookTurn++;this.clearSfx();this.bgm.pause();this.hook.pause();if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
   else if(this.unlocked&&!this.muted){this.ctx?.resume().catch(()=>{});this.bgm.play().catch(()=>{});}
  }
  duck(on){
   cancelAnimationFrame(this.duckFrame);const from=this.bgm.volume,to=on?DUCKED:BGM_VOLUME,start=performance.now(),span=on?180:700;
   const step=now=>{const t=Math.min(1,(now-start)/span);try{this.bgm.volume=from+(to-from)*t;}catch{/* iOS mengabaikan volume */}if(t<1)this.duckFrame=requestAnimationFrame(step);};
   this.duckFrame=requestAnimationFrame(step);
  }
  ready(){return !this.muted&&this.unlocked&&!document.hidden&&this.ctx&&this.ctx.state==='running';}
  track(source){this.sources.add(source);source.addEventListener('ended',()=>{this.sources.delete(source);source.disconnect();},{once:true});}
  clearSfx(){for(const source of this.sources){try{source.stop();source.disconnect();}catch{/* sumber telah berhenti */}}this.sources.clear();}
  noise(){
   if(this.noiseBuffer)return this.noiseBuffer;const ctx=this.ctx,len=ctx.sampleRate;const buf=ctx.createBuffer(1,len,ctx.sampleRate),data=buf.getChannelData(0);
   for(let i=0;i<len;i++)data[i]=Math.random()*2-1;return this.noiseBuffer=buf;
  }
  tone({f=440,to=null,type='sine',at=0,dur=.3,gain=.08,attack=.006,detune=0}){
   const ctx=this.ctx,t=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();
   o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);o.detune.value=detune;
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
   o.connect(g);g.connect(this.out);this.track(o);o.start(t);o.stop(t+dur+.05);
  }
  hiss({at=0,dur=.2,gain=.15,type='bandpass',f=1200,to=null,q=1,attack=.004}){
   const ctx=this.ctx,t=ctx.currentTime+at,src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
   src.buffer=this.noise();src.loop=true;filter.type=type;filter.Q.value=q;filter.frequency.setValueAtTime(f,t);if(to)filter.frequency.exponentialRampToValueAtTime(to,t+dur);
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
   src.connect(filter);filter.connect(g);g.connect(this.out);this.track(src);src.start(t,Math.random()*.5);src.stop(t+dur+.05);
  }
  tick(){if(!this.ready())return;this.tone({f:1560,to:980,type:'triangle',dur:.07,gain:.05});this.hiss({dur:.03,gain:.04,type:'highpass',f:4000});}
  shuffle(){if(!this.ready())return;for(let i=0;i<9;i++)this.hiss({at:i*.045+Math.random()*.01,dur:.05,gain:.05+Math.random()*.05,f:2600+Math.random()*1800,q:1.4});}
  shake(){if(!this.ready())return;for(let i=0;i<4;i++)this.hiss({at:i*.085,dur:.07,gain:.11,type:'lowpass',f:900+i*120,q:.8});this.tone({f:150,to:110,type:'sine',dur:.16,gain:.05});}
  tear(){if(!this.ready())return;this.hiss({dur:.36,gain:.26,f:1400,to:6800,q:.7});for(let i=0;i<7;i++)this.hiss({at:.02+i*.04,dur:.035,gain:.07,type:'highpass',f:3200+i*300});}
  whoosh(){if(!this.ready())return;this.hiss({dur:.5,gain:.16,f:380,to:2600,q:.9,attack:.18});}
  flip(){if(!this.ready())return;this.hiss({dur:.06,gain:.16,type:'highpass',f:2400});this.tone({f:420,to:880,type:'triangle',dur:.12,gain:.04});}
  chime(rarity='R'){
   if(!this.ready())return;const r=String(rarity).toUpperCase();
   const notes=r==='SEC'?[523.25,659.25,783.99,1046.5,1318.5,1567.98,2093,2637]:r==='SR'?[587.33,739.99,880,1174.66,1479.98]:[659.25,830.61,987.77,1318.5];
   const gap=r==='SEC'?.07:.09;
   notes.forEach((n,i)=>{this.tone({f:n,dur:1.1,gain:.06,at:i*gap});this.tone({f:n*2,dur:.6,gain:.018,at:i*gap,type:'triangle'});});
   if(r==='SEC'){this.tone({f:130.81,dur:1.6,gain:.07,at:0});for(let i=0;i<6;i++)this.tone({f:2400+i*260,dur:.5,gain:.012,at:.5+i*.06,type:'triangle',detune:i*7});}
   else if(r==='SR')this.tone({f:146.83,dur:1.1,gain:.05});
  }
  thump(){if(!this.ready())return;this.tone({f:150,to:42,type:'sine',dur:.34,gain:.32,attack:.003});this.hiss({dur:.12,gain:.2,type:'lowpass',f:700,q:.6});this.hiss({at:.01,dur:.05,gain:.06,type:'highpass',f:3000});}
  rewind(media){
   return new Promise(resolve=>{
    let timer=0;const finish=()=>{clearTimeout(timer);media.removeEventListener('seeked',finish);resolve();};
    media.addEventListener('seeked',finish,{once:true});
    try{media.currentTime=0;}catch{finish();return;}
    if(!media.seeking){finish();return;}
    timer=setTimeout(finish,1200);
   });
  }
  async jingle(){
   if(this.muted||!this.unlocked||document.hidden)return;
   const turn=++this.hookTurn;this.hook.pause();await this.rewind(this.hook);
   if(turn!==this.hookTurn||this.muted||document.hidden)return;
   this.duck(true);this.hook.play().catch(()=>{if(turn===this.hookTurn)this.duck(false);});
  }
 }
 window.HeartAudio=HeartAudio;
})();
