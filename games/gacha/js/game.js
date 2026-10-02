'use strict';

(()=>{
 const $=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const pick=list=>list[Math.floor(Math.random()*list.length)];
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const store={
  get(key){try{return localStorage.getItem(key);}catch{return null;}},
  set(key,value){try{localStorage.setItem(key,value);}catch{/* Preferensi opsional. */}}
 };

 const TIER={
  bundling:{ribbon:'LEGENDARIS',stars:'★★★★★',color:'#d99a12',ray:'#f5b83d38',glow:'#ffd76a',eyebrow:'KAPSUL EMAS · HADIAH UTAMA',lead:'Hadiah utama Market-In 6.0! Isi paket ditunjukkan petugas di booth.',group:'LEGENDARIS · BUNDLING'},
  collab:{ribbon:'EPIK · KOLAB',stars:'★★★★',color:'#2f8fd6',ray:'#39a7e538',glow:'#9fd6ff',eyebrow:'KAPSUL HOLO · KOLAB KARAKTER',lead:'Set kolab karakter yang lucu buat dandan harianmu.',group:'EPIK · KOLAB KARAKTER'},
  voucher:{ribbon:'LANGKA · VOUCHER',stars:'★★★',color:'#14745d',ray:'#9fd6a438',glow:'#baf3cc',eyebrow:'KAPSUL MINT · VOUCHER BELANJA',lead:'Klaim ke petugas untuk mendapat kode voucher. Perhatikan minimal belanjanya ya!',group:'LANGKA · VOUCHER BELANJA'},
  product:{ribbon:'BEAUTY PICK',stars:'★★★',color:'#e62b5e',ray:'#f9a2c138',glow:'#ff86ad',eyebrow:'KAPSUL PINK · PRODUK GRATIS',lead:'Produk favorit Bpedia, gratis untukmu.',group:'BEAUTY PICK · PRODUK'},
  empty:{ribbon:'KAPSUL KOSONG',stars:'',color:'#9c7e8a',ray:'#ffffff12',glow:'#ffffff',eyebrow:'COBA LAGI',lead:'Kapsul ini kosong. Antre lagi dan coba keberuntunganmu!',group:'KOSONG'}
 };
 const TIER_ORDER=['bundling','collab','voucher','product'];
 const BUBBLES={
  idle:['Sekali tap, langsung pop!','Hadiahnya lucu-lucu, cobain yuk!','Kuas set karakter nunggu kamu!','Semua kapsul berpeluang sama.','Tunjukkan kode GP- ke petugas ya!','#BelanjaBikinBahagia','Satu tap, satu kapsul, satu hadiah!'],
  spin:['Putar… putar…','Kapsul mana yang keluar ya?','Deg-degan!','Ayo, ayo, ayo!'],
  win:['Yeay! Selamat ya!','Cantik banget hadiahnya!','Hoki kamu hari ini!'],
  bundling:['HADIAH UTAMA! Tepuk tangan!','Kapsul emas! Luar biasa!'],
  voucher:['Voucher belanja! Hoki banget!','Klaim kode vouchermu di booth ya!'],
  empty:['Yah, kosong. Coba lagi ya!']
 };
 const SIDE_BIPY={idle:'rt-bipy-wave',spin:'rt-bipy-stand',win:'rt-bipy-bag',bundling:'rt-bipy-bag',empty:'rt-bipy-stand'};
 const TOP_BIPY={idle:'rt-bipy-peek',spin:'rt-bipy-peek',win:'rt-bipy-wink',bundling:'rt-bipy-wink',empty:'rt-bipy-peek'};
 const IDLE_ATTRACT_MS=40000;
 const BUBBLE_ROTATE_MS=7000;
 const STATE_POLL_MS=20000;

 const audio=window.BoothAudio?new window.BoothAudio():null;
 const ui={
  stage:'boot',busy:false,result:null,popped:false,muted:store.get('gpop-muted')==='1',audioUnlocked:false,welcomed:false,
  lastInput:Date.now(),lastAttract:Date.now(),lastBubble:0,holdTimer:0,holdUntil:0,pulls:[],plays:0,
  request:null,closing:false,connected:false,refreshing:false
 };
 let state=null,machine=null,toastTimer=0,returnFocus=null,fitFrame=0;

 async function api(route,body){
  const options={headers:{'Content-Type':'application/json','x-bpedia-client':'gachapop'}};
  if(body!==undefined){options.method='POST';options.body=JSON.stringify(body);}
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(route,{...options,signal:controller.signal});
   const output=await response.json();
   if(!response.ok)throw Object.assign(new Error(output.error||'Permintaan gagal.'),{status:response.status});
   return output;
  }catch(error){
   if(error.status)throw error;
   throw new Error(error.name==='AbortError'?'Server belum merespons. Sambungkan internet lalu coba lagi.':'Koneksi terputus. Hasil yang sudah keluar tetap tersimpan di server.');
  }finally{clearTimeout(timeout);}
 }

 function connection(connected){
  ui.connected=connected;
  $('connectionNotice').hidden=connected;
  if(!connected&&!ui.busy)setStage('blocked');
 }

 function uid(){
  if(crypto.randomUUID)return crypto.randomUUID();
  return [...crypto.getRandomValues(new Uint8Array(16))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
 }

 function toast(message,type='normal'){
  const element=$('toast');
  element.textContent=message;
  element.classList.toggle('error',type==='error');
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>element.classList.remove('visible'),3400);
 }

 /* ── Audio ─────────────────────────────────────────── */
 const soundOn=()=>!ui.muted&&Boolean(state?.settings.sound??true);
 function audioSettings(){return {...(state?.settings||{}),sound:soundOn()};}
 async function unlockAudio(){
  if(!audio)return;
  audio.configure(audioSettings());
  if(!soundOn())return;
  const ok=await audio.activate().catch(()=>false);
  if(!ok)return;
  const first=!ui.audioUnlocked;
  ui.audioUnlocked=true;
  audio.startBgm();
  if(first){
   audio.preload(['gp-tap','gp-pop','ui_petal_pop.mp3','ui_sparkle_cart.mp3','ui_payment_success.mp3','bpedia_jingle_utama.mp3','prize-voucher-25','prize-voucher-50','prize-voucher-100k']);
   if(ui.stage==='ready'&&!ui.welcomed){ui.welcomed=true;audio.sonicLogo();setTimeout(()=>{if(ui.stage==='ready')audio.speak('gp-welcome');},900);}
  }
 }
 function syncSound(){
  const on=soundOn();
  $('soundButton').setAttribute('aria-pressed',String(on));
  $('soundButton').setAttribute('aria-label',on?'Matikan suara':'Nyalakan suara');
  window.dispatchEvent(new CustomEvent('gamysuf:audio-state',{detail:{muted:!on}}));
  if(!audio)return;
  audio.configure(audioSettings());
  if(!on){audio.stopBgm();audio.stopVoice();}
  else if(ui.audioUnlocked)audio.startBgm();
 }
 function setMuted(muted){
  ui.muted=muted;
  store.set('gpop-muted',muted?'1':'0');
  syncSound();
  if(!muted)unlockAudio();
 }

 /* ── Tampilan ──────────────────────────────────────── */
 function setStage(stage){
  ui.stage=stage;
  document.body.dataset.stage=stage;
  const button=$('gachaButton');
  button.disabled=stage!=='ready';
  button.setAttribute('aria-busy',String(stage==='playing'));
 }

 function readyStage(){
  if(!state)return 'boot';
  if(!ui.connected||state.settings.paused||!state.capsules.prize)return 'blocked';
  return 'ready';
 }

 function bubble(kind,text){
  const line=text||pick(BUBBLES[kind]||BUBBLES.idle);
  const speech=$('speech');
  $('speechText').textContent=line;
  speech.classList.add('swap');
  void speech.offsetWidth;
  speech.classList.remove('swap');
  ui.lastBubble=Date.now();
 }

 function bipy(kind){
  const side=$('sideBipy'),top=$('topBipy');
  side.src=`/assets/brand/${SIDE_BIPY[kind]||SIDE_BIPY.idle}.png`;
  top.src=`/assets/brand/${TOP_BIPY[kind]||TOP_BIPY.idle}.png`;
  const jump=['win','bundling'].includes(kind);
  for(const element of [side,top]){
   element.classList.remove('jump');
   if(jump&&!reduced.matches){void element.offsetWidth;element.classList.add('jump');}
  }
 }

 function renderAll(){
  if(!state)return;
  const live=state.settings.mode==='live';
  $('modeButton').textContent=live?'MODE RESMI':'MODE DEMO';
  $('modeButton').classList.toggle('live',live);
  $('pauseBanner').hidden=!state.settings.paused;
  $('capsuleCount').textContent=state.capsules.total.toLocaleString('id-ID');
  $('capsuleLabel').textContent=state.capsules.prize?'kapsul menunggu':'kapsul habis · hubungi petugas';
  renderRail();renderTicker();renderPulls();
  if(!ui.busy)setStage(readyStage());
 }

 function renderRail(){
  const active=state.prizes.filter(prize=>prize.enabled);
  $('railNote').textContent=`${active.length} hadiah · setiap stok = 1 kapsul`;
  $('railGroups').innerHTML=TIER_ORDER.map(tier=>{
   const prizes=active.filter(prize=>prize.tier===tier);
   if(!prizes.length)return '';
   const capsules=state.capsules.byTier[tier]||0;
   const [,mid]=window.GPMachine?.paletteFor(tier)||['','#e62b5e'];
   return `<section class="rail-group" style="--cap-a:${mid}"><h3><i aria-hidden="true"></i>${esc(TIER[tier].group)}<span>${capsules} kapsul</span></h3><div class="rail-items">${prizes.map(prize=>{
    const count=state.capsules.byPrize[prize.id]||0;
    return `<article class="rail-item${count?'':' out'}"><img src="${esc(prize.image)}" alt="" loading="lazy" decoding="async"><b>${esc(prize.name)}</b><span class="count" aria-label="${count} kapsul">${count?`×${count}`:'habis'}</span></article>`;
   }).join('')}</div></section>`;
  }).join('');
 }

 function renderTicker(){
  const icons=['flower-yellow','heart','star-chrome','butterfly','flower-pink','sparkle'];
  const items=[...state.hashtags,'GACHA GRATIS · SEKALI TAP',...state.prizes.filter(prize=>prize.enabled).map(prize=>prize.name),'MARKET-IN 6.0 · URBAN FOREST CIPETE'];
  const run=items.map((text,index)=>`<span><img src="/assets/stickers/${icons[index%icons.length]}.svg" alt="">${esc(text)}</span>`).join('');
  $('tickerTrack').innerHTML=run+run;
 }

 function renderPulls(){
  const list=state.settings.mode==='live'&&state.recent?.length
   ?state.recent.slice(0,5).map(item=>({who:item.username,name:item.prize,tier:item.tier,image:item.image}))
   :ui.pulls.slice(0,5);
  $('pullsList').innerHTML=list.length
   ?list.map(item=>`<li><img src="${esc(item.image)}" alt=""><span><b>${esc(item.name)}</b><small>${esc(item.who)} · ${esc(TIER[item.tier]?.ribbon||'')}</small></span></li>`).join('')
   :'<li class="empty">Belum ada kapsul keluar. Jadilah yang pertama!</li>';
 }

 /* Lebar mesin dihitung dari ruang nyata di layar pertama: tinggi viewport
    dikurangi topbar, intro, kontrol, ticker, gamebar arcade, dan safe-area. */
 function fit(){
  fitFrame=0;
  const zone=$('machineZone'),wrap=$('machineWrap'),controls=$('controls');
  const rootStyle=getComputedStyle(document.documentElement);
  const bar=parseFloat(rootStyle.getPropertyValue('--gmy-bar-space'))||0;
  const viewport=window.visualViewport?.height||innerHeight;
  const row=getComputedStyle(zone).flexDirection==='row';
  const desktop=window.matchMedia('(min-width: 960px) and (min-height: 560px)').matches;
  const phone=window.matchMedia('(max-width: 599px)').matches;
  const top=zone.getBoundingClientRect().top+window.scrollY;
  let height,width;
  if(row){
   height=viewport-top-bar-14;
   width=zone.clientWidth-controls.offsetWidth-16;
  }else{
   const ticker=desktop?document.querySelector('.ticker').offsetHeight:0;
   height=viewport-top-bar-controls.offsetHeight-ticker-(desktop?22:18);
   width=zone.clientWidth*(desktop?.62:phone?.8:.6);
  }
  const mw=Math.max(140,Math.min(width,height/1.7,620));
  wrap.style.setProperty('--mw',`${Math.floor(mw)}px`);
  machine?.resize();
 }
 const scheduleFit=()=>{if(!fitFrame)fitFrame=requestAnimationFrame(fit);};

 /* ── Permainan ─────────────────────────────────────── */
 const timeScale=()=>reduced.matches?.35:Math.max(.6,Math.min(1.7,(state?.settings.duration||5200)/5200));

 function capsuleVars(element,palette){
  const [light,mid]=palette;
  element.style.setProperty('--cap-a',`linear-gradient(180deg,${light} 0%,${mid} 70%)`);
  element.style.setProperty('--cap-b','linear-gradient(180deg,#fff7f8 0%,#ead7df 100%)');
 }

 function spinKnob(duration){
  const knob=$('knob');
  if(!knob.animate)return null;
  return knob.animate([{transform:'rotate(0deg)'},{transform:'rotate(200deg)',offset:.55},{transform:'rotate(360deg)'}],{duration,easing:'cubic-bezier(.45,.05,.3,1)'});
 }

 async function play(){
  if(ui.busy||!state)return;
  if(!ui.connected){await refreshState();return;}
  ui.lastInput=Date.now();
  if(state.settings.paused){toast('Permainan sedang dijeda petugas.','error');return;}
  if(!state.capsules.prize){toast('Kapsul hadiah habis. Hubungi petugas untuk isi ulang.','error');return;}
  ui.busy=true;
  setStage('playing');
  unlockAudio();
  const k=timeScale();
  const started=performance.now();
  const button=$('gachaButton');
  button.classList.add('pressed');
  setTimeout(()=>button.classList.remove('pressed'),160);
  audio?.tap();
  spinKnob(950*k);
  audio?.crank(.95*k);
  machine?.agitate(1500*k,1);
  audio?.tumble(1.5*k,1);
  audio?.speak('gp-tap');
  bubble('spin');bipy('spin');
  window.GPFx?.sprinkle(button.getBoundingClientRect().left+button.offsetWidth/2,button.getBoundingClientRect().top);
  let result;
  ui.request||={requestId:uid(),username:$('playerName').value.trim()};
  try{
   result=await api('/api/play',ui.request);
   ui.request=null;
  }catch(error){
   toast(error.message,'error');
   if(error.status&&error.status<500)ui.request=null;
   if(!error.status||error.status>=500)connection(false);
   ui.busy=false;
   bipy('idle');bubble('idle');
   await refreshState();
   return;
  }
  ui.result=result;
  await sleep(Math.max(0,1100*k-(performance.now()-started)));
  const palette=machine?machine.takeOut(result.prize.tier):window.GPMachine.paletteFor(result.prize.tier);
  const out=$('outCapsule');
  capsuleVars(out,palette);
  capsuleVars($('bigCapsule'),palette);
  $('machine').classList.add('flap-open');
  await sleep(420*k);
  audio?.chute();
  out.classList.add('visible');
  const roll=out.animate?.([
   {transform:'translate(-30%,-90%) scale(.35) rotate(-90deg)',opacity:0},
   {transform:'translate(0,-10%) scale(.9) rotate(40deg)',opacity:1,offset:.45},
   {transform:'translate(0,8%) scale(1,.86) rotate(80deg)',offset:.62},
   {transform:'translate(0,-16%) scale(1) rotate(110deg)',offset:.78},
   {transform:'translate(0,0) scale(1) rotate(120deg)'}
  ],{duration:Math.max(260,720*k),easing:'ease-out',fill:'forwards'});
  await (roll?.finished.catch(()=>{})||sleep(720*k));
  audio?.speak('gp-pop');
  await sleep(220*k);
  await reveal(result,k);
 }

 function fillCard(result){
  const prize=result.prize;
  const tier=TIER[prize.tier]||TIER.product;
  const empty=prize.tier==='empty';
  const layer=$('revealLayer');
  layer.style.setProperty('--ray',tier.ray);
  $('bigCapsule').style.setProperty('--glow',tier.glow);
  const card=$('stickerCard');
  card.dataset.tier=prize.tier;
  card.style.setProperty('--tier',tier.color);
  $('cardRarity').textContent=tier.ribbon;
  $('cardStars').textContent=tier.stars;
  $('cardImage').src=prize.image;
  $('cardImage').alt=empty?'Kapsul kosong':`${prize.imageChecked?'Foto':'Ilustrasi'} ${prize.fullName}`;
  $('cardName').textContent=prize.name;
  $('cardSub').textContent=[prize.brand,prize.variant].filter(Boolean).join(' · ')||prize.fullName;
  $('cardSerial').textContent=`#${result.id}`;
  $('revealEyebrow').textContent=tier.eyebrow;
  $('revealTitle').textContent=empty?'Kapsulnya kosong':`Kamu dapat ${prize.name}!`;
  $('revealLead').textContent=empty?tier.lead:`${prize.fullName}. ${tier.lead}`;
  $('claimBox').hidden=empty;
  $('claimCode').textContent=result.id;
  $('claimPlayer').textContent=`Pemain: ${result.username}`;
  $('revealTerms').textContent=empty?prize.terms:`${prize.terms} ${result.demo?'':state.settings.claimTerms}`.trim();
  $('demoNote').hidden=!result.demo;
 }

 async function reveal(result,k,{instant=false}={}){
  const layer=$('revealLayer'),big=$('bigCapsule'),out=$('outCapsule');
  fillCard(result);
  returnFocus=document.activeElement;
  layer.hidden=false;
  layer.classList.remove('popped');
  big.className='big-capsule';
  big.hidden=false;
  document.body.classList.add('modal-open');
  for(const selector of ['.topbar','.stage','.ticker'])document.querySelector(selector).inert=true;
  setStage('reveal');
  const tier=result.prize.tier;
  if(!instant){
   const from=out.getBoundingClientRect(),to=big.getBoundingClientRect();
   out.classList.remove('visible');
   if(from.width&&big.animate){
    const dx=(from.left+from.width/2)-(to.left+to.width/2),dy=(from.top+from.height/2)-(to.top+to.height/2),scale=from.width/to.width;
    audio?.whoosh();
    await big.animate([{transform:`translate(${dx}px,${dy}px) scale(${scale}) rotate(120deg)`},{transform:'translate(0,0) scale(1.08) rotate(-8deg)',offset:.8},{transform:'none'}],{duration:Math.max(220,620*k),easing:'cubic-bezier(.2,.8,.2,1)'}).finished.catch(()=>{});
   }
   const legendary=tier==='bundling',epic=tier==='collab',voucher=tier==='voucher';
   const pulses=reduced.matches?1:legendary?8:epic?6:voucher?5:4;
   big.classList.add('charging');
   if(legendary)audio?.riser(pulses*.24*k);
   for(let i=0;i<pulses;i++){
    if(i>=pulses/2)big.classList.add('hard');
    audio?.charge(Math.min(3,1+i*.4));
    await sleep(240*k);
   }
  }
  out.classList.remove('visible');
  big.classList.remove('charging','hard');
  big.classList.add('popping');
  layer.classList.add('popped');
  ui.popped=true;
  const center=big.getBoundingClientRect();
  if(!instant)window.GPFx?.burst(center.left+center.width/2,center.top+center.height/2,{tier});
  if(tier==='empty'){audio?.empty();bubble('empty');bipy('empty');}
  else{
   audio?.pop();
   if(tier==='bundling'){audio?.fanfare();audio?.jingle();}
   else if(tier==='voucher'){audio?.win();audio?.claimChime();}
   else{audio?.win();audio?.sparkle();}
   bubble(tier==='bundling'?'bundling':tier==='voucher'?'voucher':'win');bipy(tier==='bundling'?'bundling':'win');
  }
  setTimeout(()=>{if(ui.popped&&ui.result?.id===result.id){tier==='empty'?audio?.speak('gp-empty'):audio?.prize(result.prize.id);}},instant?0:520);
  ui.pulls.unshift({who:result.username,name:result.prize.name,tier,image:result.prize.image});
  ui.pulls.length=Math.min(ui.pulls.length,8);
  ui.plays++;
  setTimeout(()=>$('closeReveal').focus({preventScroll:true}),instant?0:420);
  startHold();
 }

 /* Tutup otomatis: antrean keramaian tetap mengalir. Sentuhan di layar hasil
    memulai ulang hitungan supaya petugas sempat mencatat kode klaim. */
 function startHold(){
  clearInterval(ui.holdTimer);
  const seconds=state?.settings.resultHold||0;
  const ring=$('nextRing');
  if(!seconds){ring.style.strokeDashoffset='0';$('nextLabel').textContent='Lanjut · pemain berikutnya';return;}
  ui.holdUntil=Date.now()+seconds*1000;
  const tick=()=>{
   const left=Math.max(0,ui.holdUntil-Date.now());
   ring.style.strokeDashoffset=String(106.8*(1-left/(seconds*1000)));
   $('nextLabel').textContent=`Lanjut · ${Math.ceil(left/1000)} dtk`;
   if(left<=0){clearInterval(ui.holdTimer);closeReveal();}
  };
  tick();
  ui.holdTimer=setInterval(tick,250);
 }

 async function closeReveal(){
  if(!ui.popped||!ui.result||ui.closing)return;
  clearInterval(ui.holdTimer);
  const result=ui.result;
  ui.closing=true;
  $('closeReveal').disabled=true;
  $('nextLabel').textContent='Menyiapkan pemain berikutnya…';
  try{state=await api('/api/result',{id:result.id});}
  catch(error){
   if(error.status!==404){
    connection(false);
    toast(error.message,'error');
    $('nextLabel').textContent='Coba tutup lagi';
    return;
   }
  }finally{
   ui.closing=false;
   $('closeReveal').disabled=false;
  }
  connection(true);
  ui.popped=false;
  ui.result=null;
  const layer=$('revealLayer');
  layer.hidden=true;
  layer.classList.remove('popped');
  $('bigCapsule').className='big-capsule';
  document.body.classList.remove('modal-open');
  for(const selector of ['.topbar','.stage','.ticker'])document.querySelector(selector).inert=false;
  $('machine').classList.remove('flap-open');
  $('outCapsule').classList.remove('visible');
  $('outCapsule').getAnimations?.().forEach(animation=>animation.cancel());
  window.GPFx?.clear();
  ui.busy=false;
  $('playerName').value='';
  toggleName(false);
  machine?.setComposition(state.capsules.byTier);
  renderAll();
  bipy('idle');bubble('idle');
  ui.lastInput=Date.now();
  if(state.settings.mode==='live'&&ui.plays%3===0)audio?.speak('gp-next');
  const focusTarget=returnFocus&&document.contains(returnFocus)&&!returnFocus.disabled?returnFocus:$('gachaButton');
  focusTarget.focus({preventScroll:true});
 }

 async function refreshState(){
  if(ui.refreshing||ui.closing)return;
  ui.refreshing=true;
  $('retryConnection').disabled=true;
  try{
   const next=await api('/api/state');
   const compositionChanged=JSON.stringify(next.capsules.byTier)!==JSON.stringify(state?.capsules.byTier);
   state=next;
   connection(true);
   if(!ui.busy){renderAll();if(compositionChanged)machine?.setComposition(state.capsules.byTier);}
   syncSound();
   if(!ui.busy&&state.pending){
    ui.busy=true;ui.result=state.pending;ui.request=null;
    capsuleVars($('bigCapsule'),window.GPMachine.paletteFor(state.pending.prize.tier));
    await reveal(state.pending,1,{instant:true});
   }
  }catch(error){
   connection(false);
   if(!state)toast(`Mesin belum siap: ${error.message}`,'error');
  }finally{
   ui.refreshing=false;
   $('retryConnection').disabled=false;
  }
 }

 async function toggleMode(){
  if(!state||ui.busy)return;
  const next=state.settings.mode==='live'?'demo':'live';
  if(next==='live'&&!window.confirm('Aktifkan MODE RESMI? Setiap putaran mengurangi stok dan tercatat untuk klaim hadiah.'))return;
  try{state=await api('/api/mode',{mode:next});audio?.modeFlip(next==='live');renderAll();toast(next==='live'?'Mode resmi aktif. Stok berkurang setiap putaran.':'Mode demo aktif. Stok tidak berubah.');}
  catch(error){toast(error.message,'error');}
 }

 function toggleTheme(){
  if(window.GamysufTheme)return;
  const root=document.documentElement;
  const next=root.dataset.theme==='light'?'dark':'light';
  root.dataset.theme=next;
  store.set('gamysuf-theme',next);
  paintTheme();
 }
 function paintTheme(){
  if(window.GamysufTheme)return;
  const light=document.documentElement.dataset.theme==='light';
  document.querySelector('.brand-logo').src=light?'/assets/brand/bpedia-logo.png':'/assets/brand/bpedia-logo-reverse.png';
  document.querySelector('meta[name="theme-color"]').setAttribute('content',light?'#fff7f8':'#2a0a18');
  $('themeToggle').setAttribute('aria-label',light?'Aktifkan tema gelap':'Aktifkan tema terang');
  $('themeToggle').innerHTML=light
   ?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8a8.5 8.5 0 1 0 11.5 11.5Z"/></svg>'
   :'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M5 5l1.5 1.5m11 11L19 19M2 12h2m16 0h2M5 19l1.5-1.5m11-11L19 5"/></svg>';
 }

 function toggleName(force){
  const field=$('nameField');
  const open=typeof force==='boolean'?force:field.hidden;
  field.hidden=!open;
  $('nameToggle').setAttribute('aria-expanded',String(open));
  $('nameToggle').textContent=open?'− Nama':'+ Nama';
  if(open)$('playerName').focus();
  scheduleFit();
 }

 async function fullscreen(){
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen?.();}
  catch{toast('Layar penuh belum tersedia di browser ini.');}
 }

 /* Mode menarik perhatian: mesin melompat, kapsul beradu, MC memanggil. */
 function idleTick(){
  const now=Date.now();
  if(ui.stage==='ready'&&now-ui.lastBubble>BUBBLE_ROTATE_MS)bubble('idle');
  if(ui.stage!=='ready'||document.hidden)return;
  if(now-ui.lastInput<IDLE_ATTRACT_MS||now-ui.lastAttract<IDLE_ATTRACT_MS)return;
  ui.lastAttract=now;
  const element=$('machine');
  element.classList.remove('attract');
  if(!reduced.matches){void element.offsetWidth;element.classList.add('attract');}
  machine?.agitate(700,.55);
  audio?.tumble(.6,.6);
  if(ui.audioUnlocked)audio?.attract();
  bipy('win');setTimeout(()=>{if(ui.stage==='ready')bipy('idle');},1600);
 }

 /* ── Event ─────────────────────────────────────────── */
 $('gachaButton').addEventListener('click',play);
 $('machine').addEventListener('click',()=>{if(ui.stage==='ready')play();});
 $('closeReveal').addEventListener('click',closeReveal);
 $('revealLayer').addEventListener('pointerdown',event=>{if(ui.popped&&!event.target.closest('#closeReveal')&&state?.settings.resultHold)startHold();});
 $('soundButton').addEventListener('click',()=>setMuted(soundOn()));
 $('modeButton').addEventListener('click',toggleMode);
 $('themeToggle').addEventListener('click',toggleTheme);
 $('nameToggle').addEventListener('click',()=>toggleName());
 $('retryConnection').addEventListener('click',()=>{if(ui.popped)closeReveal();else refreshState();});
 $('playerName').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();play();}});

 document.addEventListener('keydown',event=>{
  if(event.repeat&&[' ','Enter'].includes(event.key)&&!event.target.matches?.('input,textarea,select')){
   event.preventDefault();event.stopImmediatePropagation();
  }
 },true);
 document.addEventListener('keydown',event=>{
  ui.lastInput=Date.now();
  if(!$('revealLayer').hidden){
   if(['Enter',' ','Escape'].includes(event.key)&&ui.popped&&event.target.id!=='closeReveal'){event.preventDefault();closeReveal();}
   if(event.key==='Tab'){event.preventDefault();$('closeReveal').focus();}
   return;
  }
  const typing=event.target.matches?.('input,textarea,select');
  if(typing)return;
  if((event.key===' '||event.key==='Enter')&&(!event.target.closest?.('button,a')||event.target.closest?.('#gachaButton'))){event.preventDefault();play();}
  else if(event.key==='n'||event.key==='N')toggleName(true);
  else if(event.key==='m'||event.key==='M')setMuted(soundOn());
  else if(event.key==='f'||event.key==='F')fullscreen();
 });
 for(const type of ['pointerdown','keydown','touchstart'])document.addEventListener(type,()=>{ui.lastInput=Date.now();unlockAudio();},{passive:true});
 document.addEventListener('visibilitychange',()=>{
  if(!audio)return;
  if(document.hidden){audio.stopBgm();audio.stopVoice();}
  else if(ui.audioUnlocked&&soundOn())audio.startBgm();
 });
 window.addEventListener('gamysuf:audio',event=>setMuted(Boolean(event.detail?.muted)));
 window.addEventListener('gamysuf:audio-query',syncSound);
 window.addEventListener('resize',scheduleFit);
 window.addEventListener('online',()=>{if(!ui.busy)refreshState();});
 window.addEventListener('offline',()=>connection(false));
 window.visualViewport?.addEventListener('resize',scheduleFit);
 window.addEventListener('orientationchange',()=>setTimeout(scheduleFit,250));

 /* ── Mulai ─────────────────────────────────────────── */
 (async()=>{
  const theme=store.get('gamysuf-theme');
  if(!window.GamysufTheme&&['dark','light'].includes(theme))document.documentElement.dataset.theme=theme;
  paintTheme();
  fit();
  machine=window.GPMachine?new window.GPMachine($('domeCanvas'),{reducedMotion:reduced.matches,onClack:level=>audio?.tumble(.12,level)}):null;
  setInterval(idleTick,1000);
  setInterval(()=>{if(!ui.busy&&!document.hidden)refreshState();},STATE_POLL_MS);
  await refreshState();
  if(!state){setStage('blocked');return;}
  machine?.setComposition(state.capsules.byTier);
  renderAll();
  if(!ui.busy)bubble('idle');
  if(document.fonts?.ready)document.fonts.ready.then(scheduleFit);
  setTimeout(scheduleFit,300);
  /* Musik dicoba langsung; browser yang menahan autoplay menyalakannya
     pada sentuhan pertama (lihat pointerdown di atas). */
  unlockAudio();
 })();
})();
