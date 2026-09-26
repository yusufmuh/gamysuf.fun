'use strict';

// Presentation-only coin: no purchase, inventory mutation or prize draw here.
class FestivalFlow {
 constructor({audio,onReady,onHome}) {
  this.audio=audio;this.onReady=onReady;this.onHome=onHome;
  this.phase='home';this.state=null;this.sequence=0;this.timer=null;this.galleryKey='';
  this.$=id=>document.getElementById(id);
  this.motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  this.$('startFestival').addEventListener('click',()=>this.start());
  this.$('homeUsername').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();this.start();}});
  this.$('skipCoin').addEventListener('click',()=>this.enter());
  this.$('coinDialog').addEventListener('cancel',event=>{event.preventDefault();this.enter();});
  this.$('backHome').addEventListener('click',()=>{if(this.phase==='aim')this.home();});
  this.$('toggleMarquee').addEventListener('click',()=>{
   const paused=this.$('prizeMarquee').classList.toggle('paused');
   this.$('toggleMarquee').setAttribute('aria-pressed',String(paused));
   this.$('toggleMarquee').textContent=paused?'▶ Putar galeri':'Ⅱ Jeda galeri';
  });
 }
 get ready(){return this.phase==='aim';}
 setPhase(phase){
  this.phase=phase;document.body.dataset.stage=phase;
  this.$('festivalHome').hidden=phase!=='home';
  this.$('gameStage').hidden=phase==='home';
  this.$('backHome').hidden=phase==='home';
  this.$('backHome').disabled=phase!=='aim';
  this.$('startFestival').disabled=!this.state||this.state.settings.paused||phase!=='home';
 }
 update(state){
  this.state=state;
  this.$('startFestival').disabled=state.settings.paused||this.phase!=='home';
  this.$('homeStatus').textContent=state.settings.paused?'Panggung sedang dijeda petugas.':state.settings.mode==='demo'?'MODE DEMO · latihan bebas, tanpa klaim hadiah.':'PERMAINAN RESMI · ikuti arahan petugas booth.';
  this.$('homeWinCount').textContent=String(state.stats.won);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const winners=state.winners||[];
  this.$('homeWinners').innerHTML=winners.length?winners.slice(0,6).map((row,i)=>`<article class="winner-row"><span class="winner-place">${i===0?'♛':String(i+1).padStart(2,'0')}</span><div><b>${esc(row.username)}</b><p>${row.prizes.map(gift=>`${esc(gift.name)}${gift.count>1?` ×${gift.count}`:''}`).join(' · ')}</p></div><span class="winner-score">${row.points}<small>PTS</small></span></article>`).join(''):'<div class="winners-empty"><span>✧</span><b>Panggung pertamamu?</b><p>Namamu bisa jadi yang pertama di sini. Pemenang muncul setelah permainan resmi.</p><small>Hasil demo tidak masuk leaderboard.</small></div>';
  const prizes=state.prizes.filter(p=>p.enabled&&p.tier!=='zonk'&&(p.stock===null||p.stock>0));
  const key=JSON.stringify(prizes.map(p=>[p.id,p.name,p.image]));
  if(key!==this.galleryKey){
   this.galleryKey=key;
   const cards=prizes.map(p=>`<article class="showcase-prize"><div><img src="${esc(p.image)}" alt="" loading="lazy"></div><span>${esc(p.name)}</span></article>`).join('');
   this.$('prizeTrack').innerHTML=cards?`<div class="prize-track-group">${cards}</div><div class="prize-track-group" aria-hidden="true">${cards}</div>`:'<p>Hadiah sedang disiapkan petugas.</p>';
  }
 }
 async start(){
  if(this.phase!=='home'||!this.state||this.state.settings.paused)return;
  const sequence=++this.sequence;
  this.$('username').value=this.$('homeUsername').value.trim();
  this.setPhase('coin');
  this.$('coinDialog').showModal();
  // Set the visual timeout first: blocked audio must never strand the player.
  this.timer=setTimeout(()=>this.enter(),this.motion.matches?350:2800);
  try{
   await this.audio.activate();
   if(sequence!==this.sequence||this.phase!=='coin')return;
   this.audio.coinIntro();this.audio.startBgm();
   /* Celetuk MC menyusul setelah denting koin selesai, bukan menimpanya. */
   setTimeout(()=>{if(sequence===this.sequence&&this.phase==='coin')this.audio.mc?.('coin');},900);
  }catch{/* Silent hardware is allowed; gameplay remains available. */}
 }
 enter(){
  if(this.phase!=='coin')return;
  clearTimeout(this.timer);this.sequence++;
  this.$('coinDialog').close();this.setPhase('aim');
  this.onReady();this.$('cabinet').focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
 }
 grab(){if(!this.ready)return false;this.setPhase('grab');this.audio.startSuspense();return true;}
 recover(){this.audio.stopSuspense();this.setPhase('aim');}
 result(){this.audio.stopSuspense();this.setPhase('result');}
 home(){
  clearTimeout(this.timer);this.sequence++;this.audio.stopSuspense();
  if(this.$('coinDialog').open)this.$('coinDialog').close();
  this.setPhase('home');this.onHome();
  this.$('startFestival').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
 }
}
window.FestivalFlow=FestivalFlow;
