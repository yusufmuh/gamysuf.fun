'use strict';

(()=>{
 const $=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
 const pick=list=>list[Math.floor(Math.random()*list.length)];
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

 const ICONS={
  hug:'<svg viewBox="0 0 24 24"><circle cx="8" cy="6.5" r="2.6"/><circle cx="16" cy="6.5" r="2.6"/><path d="M3.5 21v-3.2A5 5 0 0 1 8.5 13H9"/><path d="M20.5 21v-3.2a5 5 0 0 0-5-4.8H15"/><path d="M12 19.2l-2.1-2a1.4 1.4 0 0 1 2.1-1.8 1.4 1.4 0 0 1 2.1 1.8z"/></svg>',
  'back-hug':'<svg viewBox="0 0 24 24"><circle cx="14.5" cy="5.5" r="2.4"/><circle cx="9.5" cy="7.5" r="2.6"/><path d="M4.5 21v-3a5 5 0 0 1 5-5h1"/><path d="M19.5 21v-4.5a5 5 0 0 0-3.2-4.7"/><path d="M6.5 15.5c2.6 2 7.4 2 10.5-.6"/></svg>',
  'pet-pet':'<svg viewBox="0 0 24 24"><circle cx="12" cy="15.5" r="5"/><path d="M8 8.6V6.5a1.3 1.3 0 0 1 2.6 0V8M10.6 7.6V5.3a1.3 1.3 0 0 1 2.6 0v2.4M13.2 7.8V6a1.3 1.3 0 0 1 2.6 0v2.8"/><path d="M8 8.6c-.9.2-1.3 1-1.1 1.8M15.8 8.8c.4.5.5 1 .3 1.6"/><path d="M4 7.5L2.5 6.5M20 7.5l1.5-1M4.5 11H3M19.5 11H21"/></svg>',
  flower:'<svg viewBox="0 0 24 24"><path d="M7.5 4.5l2.5 2 2-3 2 3 2.5-2V9a4.5 4.5 0 0 1-9 0z"/><path d="M12 13.5V21"/><path d="M12 18c-2.6 0-4.6-1.3-5.5-3.6 2.6-.2 4.6 1.1 5.5 3.6zM12 16.5c1.8-.3 3.4-1.4 4.1-3.2-2-.1-3.6 1-4.1 3.2z"/></svg>',
  'kiss-hand':'<svg viewBox="0 0 24 24"><path d="M6.5 13.5V9.8a1.4 1.4 0 0 1 2.8 0v2.4M9.3 12V7.6a1.4 1.4 0 0 1 2.8 0V12M12.1 12V8.4a1.4 1.4 0 0 1 2.8 0v4.8"/><path d="M14.9 13.2l1.4-1.4a1.4 1.4 0 0 1 2 2l-3.3 4A5.5 5.5 0 0 1 10.8 20h-.6a3.7 3.7 0 0 1-3.7-3.7v-2.8"/><path d="M18.4 6.8l-1.3-1.2a.9.9 0 0 1 1.3-1.2.9.9 0 0 1 1.3 1.2z"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.6 4 4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>'
 };
 const STAMP='<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2.4 2"/><path d="M13 26V13.5l5.5 4.5L24 10l5.5 8 5.5-4.5V26c0 6.1-4.9 11-11 11s-11-4.9-11-11z" fill="currentColor" opacity=".92"/><circle cx="20.3" cy="27" r="1.5" fill="#FFF7F0"/><circle cx="27.7" cy="27" r="1.5" fill="#FFF7F0"/><path d="M21.2 31.2c1.6 1.4 4 1.4 5.6 0" fill="none" stroke="#FFF7F0" stroke-width="1.5" stroke-linecap="round"/></svg>';
 const TIER={
  bundling:{rarity:'Legendary · Hadiah Utama',stars:5},
  grand:{rarity:'Vault Rare · Hadiah Utama',stars:5},
  voucher:{rarity:'Super · Voucher',stars:4},
  product:{rarity:'Beauty Pick · Produk',stars:3},
  newuser:{rarity:'Welcome · Pengguna Baru',stars:2},
  zonk:{rarity:'Kuncup · Belum Mekar',stars:0}
 };
 const TIER_ORDER=['bundling','grand','voucher','product','newuser'];
 const LINES={
  idle:[
   ['zoro','Booth Bpedia di sini… eh, di sini. Pokoknya ikut aku.'],
   ['sanji','Selamat datang, tamu spesial! Mampir dulu ke booth Bpedia.'],
   ['zoro','Satu kapsul, satu tebasan hoki. Tekan DROP-nya.'],
   ['sanji','Selesaikan misi 3, fanservice-nya kami siapkan sepenuh hati.'],
   ['zoro','Jangan ragu. Hoki tidak menunggu orang yang ragu.'],
   ['sanji','Hadiah secantik ini memang pantas buat kamu.'],
   ['zoro','Kumpulkan tiga stempel Bipy. Itu tantangannya.'],
   ['sanji','Jangan lupa tag #BelanjaBikinBahagia ya!']
  ],
  drop:[['zoro','Fokus. Kapsulnya sudah jatuh.'],['sanji','Semoga kapsul ini mekar untukmu!'],['zoro','Hoki itu soal nyali. Lihat baik-baik.'],['sanji','Deg-degan? Aku juga!']],
  win:[['sanji','Luar biasa! Hadiah ini memang ditakdirkan untukmu.'],['zoro','Hmph. Hoki yang tajam.'],['sanji','Bawa pulang dan tampil makin percaya diri!'],['zoro','Tebasan yang bersih. Selamat.']],
  grand:[['sanji','Hadiah utama! Hari ini kamu bintangnya!'],['zoro','…Tebasan sempurna. Aku akui.']],
  zonk:[['zoro','Tebasan berikutnya pasti kena.'],['sanji','Jangan sedih, misi booth masih menunggu!']],
  fan:{zoro:['Siap. Tunjukkan tiketnya, aku tunggu.','Oke. Jangan kaget ya.','Aku di sini. Tidak akan tersesat kali ini.'],sanji:['Dengan senang hati, tamu spesial.','Suatu kehormatan melayanimu.','Tunggu aku di area cosplayer, ya.']}
 };
 const HOST_NAMES={zoro:'Zoro',sanji:'Sanji'};

 const audio=window.BoothAudio?new window.BoothAudio():null;
 const ui={stage:'boot',game:'drop',host:null,busy:false,result:null,closeReady:false,muted:localStorage.getItem('bdrop-muted')==='1',audioUnlocked:false,lastInput:Date.now(),bubbleIndex:0,sloganIndex:0};
 let state=null,board=null,toastTimer=null,tiltFrame=0,confirmResolve=null,dialogReturnFocus=null;
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');

 async function api(route,body){
  const options={headers:{'Content-Type':'application/json','x-bpedia-client':'beautydrop'}};
  if(body!==undefined){options.method='POST';options.body=JSON.stringify(body);}
  const response=await fetch(route,options);
  let output;
  try{output=await response.json();}catch{output={error:'Respons server tidak dapat dibaca.'};}
  if(!response.ok){const error=new Error(output.error||'Permintaan gagal.');error.status=response.status;throw error;}
  return output;
 }

 function uid(){
  if(crypto.randomUUID)return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('').replace(/^(.{8})(.{4})(.{4})(.{4})/,'$1-$2-$3-$4-');
 }

function toast(message,type='normal'){
  const element=$('toast');
  element.textContent=message;
  element.classList.toggle('error',type==='error');
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>element.classList.remove('visible'),3200);
}
 function syncModal(){
  const open=!$('revealLayer').hidden||!$('confirmLayer').hidden;
  document.body.classList.toggle('modal-open',open);
  document.querySelector('.topbar').inert=open;
  document.querySelector('.stage').inert=open;
 }

 /* ── Audio ─────────────────────────────────────────── */
 function audioSettings(){
  const settings=state?.settings||{};
  return {...settings,sound:Boolean(settings.sound)&&!ui.muted};
 }
 async function unlockAudio(){
  if(!audio)return;
  audio.configure(audioSettings());
  if(!audioSettings().sound)return;
  const first=!ui.audioUnlocked;
  const ok=await audio.activate().catch(()=>false);
  if(!ok)return;
  ui.audioUnlocked=true;
  audio.startBgm();
  if(first)audio.sonicLogo();
 }
function syncSound(){
  const on=!ui.muted&&Boolean(state?.settings.sound);
  $('soundButton').setAttribute('aria-pressed',String(on));
  $('soundButton').setAttribute('aria-label',on?'Matikan suara':'Nyalakan suara');
  window.dispatchEvent(new CustomEvent('gamysuf:audio-state',{detail:{muted:!on}}));
  if(!audio)return;
  audio.configure(audioSettings());
  if(!on)audio.stopBgm();
  else if(ui.audioUnlocked)audio.startBgm();
 }

 /* ── Tampilan umum ─────────────────────────────────── */
 const hostById=id=>state.hosts.find(host=>host.id===id);
 const hostName=id=>hostById(id)?.name||HOST_NAMES[id]||id;
 const available=prize=>prize.enabled&&(prize.stock===null||prize.stock>0);

 function setStage(stage){
  ui.stage=stage;
  document.body.dataset.stage=stage;
  $('homeView').hidden=stage!=='home';
  $('dropView').hidden=stage!=='drop';
  $('fanView').hidden=stage!=='fan';
  $('pickView').hidden=stage!=='pick';
  $('backButton').hidden=stage==='home';
  window.BDFx?.ambient(stage==='home');
  board?.twinkle(stage==='drop');
  if(stage==='drop')requestAnimationFrame(()=>board?.resize());
  ui.lastInput=Date.now();
 }

 function renderAll(){
  if(!state)return;
  const live=state.settings.mode==='live';
  $('modeButton').textContent=live?'MODE RESMI':'MODE DEMO';
  $('modeButton').classList.toggle('live',live);
  $('pauseBanner').hidden=!state.settings.paused;
  const fanOpen=state.settings.fanserviceOpen&&state.hosts.some(host=>host.enabled);
  $('startFan').disabled=!fanOpen;
  $('fanCtaNote').textContent=fanOpen?`Misi 3 · bareng ${state.hosts.filter(host=>host.enabled).map(host=>host.name).join(' & ')}`:'Cosplayer sedang istirahat · cek jadwal';
  renderMissions();
  renderTicker();
  renderMachine();
  renderHostCards();
  if(ui.stage==='pick')renderPick();
  syncSound();
 }

 function renderMissions(){
  $('missionList').innerHTML=state.missions.map(mission=>`<li class="mission"><span class="mission-stamp">${STAMP}<b>${mission.step}</b></span><div><h3>${esc(mission.title)}</h3><p>→ <strong>${esc(mission.reward)}</strong></p></div></li>`).join('');
 }

 let tickerKey='';
 function renderTicker(){
  const prizes=sortPrizes(state.prizes.filter(prize=>prize.enabled));
  const key=prizes.map(prize=>prize.id+prize.image).join('|')+state.hashtags.join('');
  if(key===tickerKey)return;
  tickerKey=key;
  const items=[];
  prizes.forEach((prize,index)=>{
   items.push(`<span class="ticker-item"><img src="${esc(prize.image)}" alt="">${esc(prize.name)}</span>`);
   if(index%4===3)items.push(`<span class="ticker-tag">${esc(state.hashtags[(index/4|0)%state.hashtags.length])}</span>`);
   else items.push('<span class="ticker-dot" aria-hidden="true">✦</span>');
  });
  const lap=items.join('');
  $('tickerTrack').innerHTML=lap+lap;
 }

 const sortPrizes=list=>[...list].sort((a,b)=>TIER_ORDER.indexOf(a.tier)-TIER_ORDER.indexOf(b.tier));

 function canDrop(){
  if(!state||ui.busy||ui.result||state.settings.paused)return false;
  if(ui.game==='drop')return state.capsules.prize>0;
  return state.settings.fanserviceOpen&&Boolean(hostById(ui.host)?.enabled)&&state.fanservices.some(item=>item.enabled);
 }

 function renderMachine(){
  const fan=ui.game==='fanservice';
  const meter=$('capsuleMeter');
  if(fan){
   const active=state.fanservices.filter(item=>item.enabled).length;
   $('capsuleCount').textContent=active;
   $('capsuleLabel').textContent='jenis fanservice di kapsul';
   meter.classList.toggle('empty',!active);
   $('contentsGrid').className='contents-grid fan-mode';
   $('contentsGrid').innerHTML=state.fanservices.map(item=>`<div class="fan-tile ${item.enabled?'':'off'}"><span class="icon">${ICONS[item.id]||ICONS.heart}</span><div><b>${esc(item.name)}</b><small>${esc(item.enabled?item.detail:'Sedang tidak tersedia')}</small></div></div>`).join('');
  }else{
   const empty=state.capsules.prize<=0;
   $('capsuleCount').textContent=empty?'0':state.capsules.total;
   $('capsuleLabel').textContent=empty?'kapsul hadiah habis · panggil petugas':'kapsul menunggu di mesin';
   meter.classList.toggle('empty',empty);
   $('contentsGrid').className='contents-grid';
   $('contentsGrid').innerHTML=sortPrizes(state.prizes.filter(prize=>prize.enabled||prize.stock!==0)).map(prize=>`<div class="prize-tile tier-${esc(prize.tier)} ${available(prize)?'':'out'}"><img src="${esc(prize.image)}" alt="${esc(prize.fullName)}" loading="lazy"><span>${esc(prize.name)}</span></div>`).join('');
  }
  $('dropButton').disabled=!canDrop();
 }

 function configureMachine(){
  const fan=ui.game==='fanservice';
  const theme=fan?ui.host:'drop';
  document.body.dataset.host=fan?ui.host:'';
  board?.setTheme(theme);
  const colors=window.BDBoard?.THEMES[theme]||window.BDBoard?.THEMES.drop;
  for(const element of [$('heldCapsule'),$('capsuleBig')]){
   element.style.setProperty('--cap-top',colors.top);
   element.style.setProperty('--cap-top-light',colors.topLight);
   element.style.setProperty('--cap-glow',colors.glow);
  }
  const name=fan?hostName(ui.host):'';
  $('dropEyebrow').textContent=fan?'MISI 3 · GACHA FANSERVICE':'MISI 1 · BEAUTY DROP';
  $('dropTitle').textContent=fan?`Gacha bareng ${name}`:'Lepas kapsulmu';
  $('dropLead').textContent=fan?`Kapsul berwarna ${name} memilih satu fanservice. Setelah mekar, tunjukkan tiketmu ke petugas lalu antre ke area cosplayer.`:'Bipy menjatuhkan satu kapsul kelopak ke papan vault. Begitu mendarat, kapsul mekar dan hadiahmu terbuka.';
  $('fairNote').textContent=fan?'Semua fanservice aktif punya kesempatan yang sama. Murni hoki.':'Semua kapsul punya kesempatan yang sama. Tidak ada persentase, murni hoki.';
  $('contentsTitle').textContent=fan?'Isi kapsul fanservice':'Isi mesin kapsul';
  $('contentsNote').textContent=fan?'Kapsul memilih salah satu jenis di bawah ini.':'Hadiah yang sama dengan booth Bpedia sebelumnya.';
  renderMachine();
 }

 function renderHostCards(){
  const enabled=state.hosts.filter(host=>host.enabled);
  if(!hostById(ui.host)?.enabled)ui.host=enabled[0]?.id||null;
  $('hostCards').innerHTML=state.hosts.map(host=>{
   const selected=host.id===ui.host;
   return `<button class="host-card ${selected?'selected':''}" type="button" data-host="${esc(host.id)}" aria-pressed="${selected}" ${host.enabled?'':'disabled'}><div class="host-card-inner"><img src="${esc(host.image)}" alt="${esc(host.name)}"><span class="host-card-badge">${host.enabled?(selected?'TERPILIH':'PILIH COSPLAYER'):'ISTIRAHAT'}</span><div class="host-card-info"><b>${esc(host.name)}</b><small>${esc(host.role)}</small></div></div></button>`;
  }).join('');
  const open=state.settings.fanserviceOpen&&!state.settings.paused&&Boolean(ui.host);
  document.querySelectorAll('.method-card').forEach(button=>{button.disabled=!open;});
  $('hostSchedule').textContent=state.settings.hostSchedule||'Jadwal cosplayer diumumkan petugas';
  $('hostSchedule').hidden=!state.settings.hostSchedule;
  const closed=!state.settings.fanserviceOpen;
  $('fanClosed').hidden=!closed;
  $('fanClosed').textContent=closed?'Sesi fanservice sedang tutup. Cosplayer sedang istirahat — cek jadwal di atas atau tanya petugas.':'';
 }

 function renderPick(){
  $('pickHostName').textContent=hostName(ui.host);
  $('pickGrid').innerHTML=state.fanservices.map(item=>`<button class="pick-card" type="button" data-pick="${esc(item.id)}" ${item.enabled?'':'disabled'}><span class="icon">${ICONS[item.id]||ICONS.heart}</span><b>${esc(item.name)}</b><small>${esc(item.enabled?item.detail:'Sedang tidak tersedia')}</small></button>`).join('');
 }

 /* ── Gelembung host ───────────────────────────────── */
 function say(element,[host,text],duration=5200){
  if(!element)return;
  element.querySelector('b').textContent=hostName(host);
  element.querySelector('span').textContent=text;
  element.classList.remove('show');void element.offsetWidth;element.classList.add('show');
  clearTimeout(element._timer);
  if(duration)element._timer=setTimeout(()=>element.classList.remove('show'),duration);
 }
 function homeBubble(){
  if(ui.stage!=='home'||document.hidden)return;
  const line=LINES.idle[ui.bubbleIndex++%LINES.idle.length];
  say(line[0]==='zoro'?$('bubbleZoro'):$('bubbleSanji'),line,4800);
 }
 function cheer(){
  for(const element of document.querySelectorAll('.hosts-duo,.mini-hosts img')){element.classList.remove('cheer');void element.offsetWidth;element.classList.add('cheer');}
  const bipy=$('bipyDropper');bipy.classList.remove('celebrate','toss');void bipy.offsetWidth;bipy.classList.add('celebrate');
 }

 /* ── Konfirmasi ───────────────────────────────────── */
function confirmDialog(title,text,okLabel='Ya, lanjut'){
  dialogReturnFocus=document.activeElement;
  $('confirmTitle').textContent=title;
  $('confirmText').textContent=text;
  $('confirmOk').textContent=okLabel;
  $('confirmLayer').hidden=false;
  syncModal();
  $('confirmOk').focus();
  return new Promise(resolve=>{confirmResolve=resolve;});
 }
function closeConfirm(answer){
  if(!confirmResolve)return;
  $('confirmLayer').hidden=true;
  syncModal();
  const resolve=confirmResolve;confirmResolve=null;resolve(answer);
  if(dialogReturnFocus?.isConnected)dialogReturnFocus.focus();
  dialogReturnFocus=null;
 }

 /* ── Permainan ────────────────────────────────────── */
 async function play(extra={}){
  if(!canDrop())return null;
  ui.busy=true;$('dropButton').disabled=true;
  unlockAudio();
  const body={requestId:uid(),username:$('playerName').value.trim(),game:ui.game,...extra};
  if(ui.game==='fanservice')body.host=ui.host;
  try{
   const result=await api('/api/play',body);
   return {result,fresh:result.requestId===body.requestId};
  }catch(error){
   ui.busy=false;
   toast(error.message,'error');
   await refresh();
   return null;
  }
 }

 async function dropCapsule(){
  const outcome=await play();
  if(!outcome)return;
  const {result,fresh}=outcome;
  if(!fresh){showResult(result,{instant:true});return;}
  ui.result=result;
  try{
   const dropper=$('bipyDropper');
   dropper.classList.remove('toss','celebrate');void dropper.offsetWidth;dropper.classList.add('toss');
   say($('miniBubble'),pick(LINES.drop),3600);
   audio?.speak('bd-drop');
   await sleep(360);
   $('heldCapsule').classList.add('gone');
   const landing=await board.drop({
    duration:result.duration||state.settings.duration,
    onRelease:()=>audio?.capsuleRelease(),
    onPin:(row,total)=>{if(row>=total)audio?.landThud();else audio?.pinTick(row,total);}
   });
   await sleep(320);
   await reveal(result,landing);
  }catch(error){
   /* Hasil sudah tercatat di server; animasi yang gagal tidak boleh
      membuat booth macet, jadi hasil tetap ditampilkan. */
   console.error(error);
   showResult(result,{instant:true});
  }
 }

 async function pickFanservice(id){
  const item=state.fanservices.find(entry=>entry.id===id);
  if(!item)return;
  const ok=await confirmDialog(`${item.name} bareng ${hostName(ui.host)}?`,'Pastikan tamu sudah checkout minimal Rp150rb di booth Bpedia. Tiket langsung terbit setelah dikonfirmasi.','Terbitkan tiket');
  if(!ok)return;
  ui.game='fanservice';
  configureMachine();
  const outcome=await play({pick:id});
  if(!outcome)return;
  if(!outcome.fresh){showResult(outcome.result,{instant:true});return;}
  ui.result=outcome.result;
  try{await reveal(outcome.result,{x:innerWidth/2,y:innerHeight*.45,r:innerWidth*.02},{short:true});}
  catch(error){console.error(error);showResult(outcome.result,{instant:true});}
 }

 function fillCard(result){
  const fan=result.game==='fanservice';
  const card=$('tcgCard'),art=$('cardArt');
  const zonk=!fan&&result.prize.tier==='zonk';
  card.className='tcg-card';
  art.classList.toggle('cover',fan);
  $('demoNote').hidden=!result.demo;
  $('cardSerial').textContent=result.id;
  if(fan){
   const host=hostById(result.host.id);
   card.classList.add(`tier-${result.host.id}`);
   $('cardRarity').textContent=result.method==='pilih'?'Fanservice · Pilihan':'Fanservice · Gacha';
   $('cardStars').textContent='★★★★★';
   $('cardImage').src=host?.image||'/assets/images/host-zoro.jpg';
   $('cardImage').alt=result.host.name;
   $('cardIcon').innerHTML=ICONS[result.fanservice.id]||ICONS.heart;
   $('cardName').textContent=result.fanservice.name;
   $('cardSub').textContent=`bareng ${result.host.name}`;
   $('revealEyebrow').textContent=result.method==='pilih'?'FANSERVICE PILIHANMU':'KAPSUL FANSERVICE MEKAR!';
   $('revealTitle').textContent=`${result.fanservice.name} bareng ${result.host.name}`;
   $('revealLead').textContent=result.fanservice.detail;
   $('voucherBox').hidden=true;
   $('claimLabel').textContent='Tiket antre cosplayer';
   $('claimCode').textContent=result.id;
   $('claimPlayer').textContent=`${result.username} · tunjukkan tiket ini ke petugas, lalu antre ke area cosplayer`;
   $('revealTerms').textContent=`Fanservice dilakukan sopan dan tetap on character. ${state.settings.hostSchedule||''}`.trim();
   $('claimCode').parentElement.hidden=false;
   return;
  }
  const prize=result.prize;
  const tier=TIER[prize.tier]||TIER.product;
  card.classList.add(`tier-${prize.tier}`);
  $('cardRarity').textContent=tier.rarity;
  $('cardStars').textContent=tier.stars?'★'.repeat(tier.stars)+'☆'.repeat(5-tier.stars):'';
  $('cardImage').src=prize.image;
  $('cardImage').alt=prize.fullName;
  $('cardIcon').innerHTML='';
  $('cardName').textContent=prize.name;
  $('cardSub').textContent=[prize.brand,prize.variant].filter(Boolean).join(' · ')||prize.fullName;
  if(zonk){
   $('revealEyebrow').textContent='KAPSUL BELUM MEKAR';
   $('revealTitle').textContent='Belum mekar kali ini';
   $('revealLead').textContent='Terima kasih sudah main! Lanjutkan misi 2 untuk foto bareng cosplayer dan misi 3 untuk fanservice.';
   $('voucherBox').hidden=true;
   $('claimCode').textContent=result.id;
   $('claimCode').parentElement.hidden=true;
   $('revealTerms').textContent=prize.terms;
   return;
  }
  $('revealEyebrow').textContent=['bundling','grand'].includes(prize.tier)?'HADIAH UTAMA MEKAR!':'KAPSULMU MEKAR!';
  $('revealTitle').textContent=prize.fullName;
  $('revealLead').textContent=result.demo?`Selamat, ${result.username}! Ini simulasi demo, jadi hadiah tidak diserahkan. Main di booth Bpedia untuk hadiah asli.`:`Selamat, ${result.username}! Hadiahmu siap diserahkan petugas Bpedia.`;
  $('voucherBox').hidden=!prize.voucherCode;
  $('voucherCode').textContent=prize.voucherCode||'';
  $('claimLabel').textContent=result.demo?'Kode simulasi (tidak bisa ditukar)':'Kode klaim untuk petugas';
  $('claimCode').textContent=result.id;
  $('claimPlayer').textContent=result.demo?`${result.username} · hasil latihan di mode demo`:`${result.username} · tunjukkan layar ini ke petugas Bpedia`;
  $('claimCode').parentElement.hidden=false;
  $('revealTerms').textContent=[prize.terms,prize.voucherCode?state.settings.voucherTerms:''].filter(Boolean).join(' ');
 }

 function celebrate(result){
  const cx=innerWidth/2,cy=innerHeight*.45;
  if(result.game==='fanservice'){
   audio?.win();
   setTimeout(()=>audio?.speak(result.method==='pilih'?'fs-pick':`fs-${result.fanservice.id}`),650);
   window.BDFx?.burst(cx,cy,{count:120});
   say($('revealBubble'),[result.host.id,pick(LINES.fan[result.host.id]||LINES.fan.sanji)],0);
   cheer();
   return;
  }
  const tier=result.prize.tier;
  if(tier==='zonk'){
   audio?.speak('bd-zonk');
   say($('revealBubble'),pick(LINES.zonk),0);
   return;
  }
  const grand=['bundling','grand'].includes(tier);
  if(grand){
   audio?.grand();audio?.grandJingle();
   window.BDFx?.burst(cx,cy,{count:200,power:1.3});
   window.BDFx?.rain(4);
   say($('revealBubble'),pick(LINES.grand),0);
  }else{
   audio?.win();audio?.sparkle();
   window.BDFx?.burst(cx,cy,{count:120});
   say($('revealBubble'),pick(LINES.win),0);
  }
  setTimeout(()=>audio?.playPrize(result.prize.id),grand?1400:700);
  cheer();
 }

async function reveal(result,from,{short=false}={}){
  if(reducedMotion.matches){showResult(result,{instant:true});return;}
  const layer=$('revealLayer'),capsule=$('capsuleBig');
  fillCard(result);
  layer.classList.remove('open','zonk');
  capsule.className='capsule-big';
  capsule.hidden=false;
  const size=capsule.offsetWidth||innerWidth*.15;
  capsule.style.setProperty('--fx',`${from.x-innerWidth/2}px`);
  capsule.style.setProperty('--fy',`${from.y-innerHeight*.45}px`);
  capsule.style.setProperty('--fs',String(clamp((from.r*2)/size,.08,1)));
  ui.closeReady=false;$('closeReveal').disabled=true;
  layer.hidden=false;
  syncModal();layer.focus();
  await frame();await frame();
  capsule.style.setProperty('--fx','0px');
  capsule.style.setProperty('--fy','0px');
  capsule.style.setProperty('--fs','1');
  await sleep(short?420:760);
  const suspense=short?1200:clamp((result.duration||7000)*.3,1300,3400);
  audio?.startSuspense();
  if(!short)audio?.speak(result.game==='fanservice'?'fs-intro':'bd-bloom');
  capsule.classList.add('shake');
  let level=0;
  const rattle=setInterval(()=>audio?.shakeRattle(level),170);
  await sleep(suspense*.6);
  level=1;capsule.classList.replace('shake','shake-hard');
  await sleep(suspense*.4);
  clearInterval(rattle);
  audio?.stopSuspense();
  capsule.classList.remove('shake','shake-hard');
  const zonk=result.game==='drop'&&result.prize.tier==='zonk';
  if(zonk){capsule.classList.add('fizzle');layer.classList.add('zonk');audio?.zonk();await sleep(620);}
  else{capsule.classList.add('open');audio?.bloomPop();await sleep(360);}
  layer.classList.add('open');
  audio?.cardFlip();
  celebrate(result);
  startTilt();
  setTimeout(()=>{ui.closeReady=true;$('closeReveal').disabled=false;$('closeReveal').focus();},1300);
 }

 function showResult(result,{instant=false}={}){
  ui.result=result;ui.busy=true;
  if(result.game==='fanservice'&&result.host){ui.game='fanservice';ui.host=result.host.id;}
  fillCard(result);
  const layer=$('revealLayer');
  $('capsuleBig').hidden=instant;
  layer.hidden=false;
  syncModal();
  layer.classList.toggle('zonk',result.game==='drop'&&result.prize.tier==='zonk');
  requestAnimationFrame(()=>layer.classList.add('open'));
  $('revealBubble').classList.remove('show');
  startTilt();
  ui.closeReady=true;$('closeReveal').disabled=false;
  setTimeout(()=>$('closeReveal').focus(),100);
 }

async function closeReveal(){
  if(!ui.result||!ui.closeReady)return;
  ui.closeReady=false;$('closeReveal').disabled=true;
  const id=ui.result.id;
  try{state=await api('/api/result',{id});}
  catch(error){ui.closeReady=true;$('closeReveal').disabled=false;toast(error.message,'error');return;}
  stopTilt();
  const layer=$('revealLayer');
  layer.hidden=true;layer.classList.remove('open','zonk');
  syncModal();
  $('capsuleBig').className='capsule-big';$('capsuleBig').hidden=false;
  $('heldCapsule').classList.remove('gone');
  $('bipyDropper').classList.remove('toss','celebrate');
  board?.clear();
  ui.result=null;ui.busy=false;
  $('playerName').value='';
  await refresh();
  if(ui.stage==='pick')setStage('fan');
  (ui.stage==='drop'?$('dropButton'):$('backButton')).focus();
  ui.lastInput=Date.now();
 }

 /* Kartu sedikit mengikuti arah pointer; tanpa pointer ia bergoyang pelan. */
 let pointer=null;
function startTilt(){
  stopTilt();
  if(reducedMotion.matches||window.matchMedia('(pointer: coarse)').matches)return;
  const card=$('tcgCard'),t0=performance.now();
  const tick=now=>{
   const t=(now-t0)/1000;
   let ry=Math.sin(t*.9)*7,rx=Math.cos(t*.7)*4;
   if(pointer&&now-pointer.at<2500){ry=pointer.x*16;rx=-pointer.y*12;}
   card.style.setProperty('--ry',`${ry.toFixed(2)}deg`);
   card.style.setProperty('--rx',`${rx.toFixed(2)}deg`);
   tiltFrame=requestAnimationFrame(tick);
  };
  tiltFrame=requestAnimationFrame(tick);
 }
 function stopTilt(){cancelAnimationFrame(tiltFrame);tiltFrame=0;}
 $('revealLayer').addEventListener('pointermove',event=>{pointer={x:event.clientX/innerWidth-.5,y:event.clientY/innerHeight-.5,at:performance.now()};});

 /* ── Data ─────────────────────────────────────────── */
 async function refresh(){
  try{state=await api('/api/state');renderAll();}
  catch(error){toast(error.message,'error');}
 }

 function goHome(){if(!ui.busy&&!ui.result)setStage('home');}

 /* ── Event ────────────────────────────────────────── */
 $('startDrop').addEventListener('click',()=>{ui.game='drop';configureMachine();setStage('drop');unlockAudio();});
 $('startFan').addEventListener('click',()=>{renderHostCards();setStage('fan');unlockAudio();audio?.speak('fs-intro');});
 $('backButton').addEventListener('click',()=>{
  if(ui.busy||ui.result)return;
  if(ui.stage==='pick')setStage('fan');
  else if(ui.stage==='drop'&&ui.game==='fanservice')setStage('fan');
  else setStage('home');
 });
 $('dropButton').addEventListener('click',dropCapsule);
 $('closeReveal').addEventListener('click',closeReveal);
 $('hostCards').addEventListener('click',event=>{
  const card=event.target.closest('[data-host]');
  if(!card||card.disabled)return;
  ui.host=card.dataset.host;
  renderHostCards();
  audio?.cardFlip();
 });
 document.querySelector('.method-row').addEventListener('click',event=>{
  const button=event.target.closest('[data-method]');
  if(!button||button.disabled||!ui.host)return;
  if(button.dataset.method==='pilih'){renderPick();setStage('pick');return;}
  ui.game='fanservice';configureMachine();setStage('drop');
 });
 $('pickGrid').addEventListener('click',event=>{
  const button=event.target.closest('[data-pick]');
  if(button&&!button.disabled)pickFanservice(button.dataset.pick);
 });
 $('modeButton').addEventListener('click',async()=>{
  if(!state||ui.busy||ui.result)return;
  const live=state.settings.mode==='live';
  const ok=await confirmDialog(live?'Kembali ke mode demo?':'Aktifkan mode resmi?',live?'Hasil berikutnya tidak mengurangi stok dan tidak tercatat di laporan.':'Setiap hasil akan mengurangi stok dan tercatat di laporan. Pastikan stok fisik dan foto hadiah sudah dicek petugas.',live?'Ganti ke demo':'Aktifkan resmi');
  if(!ok)return;
  try{state=await api('/api/mode',{mode:live?'demo':'live'});audio?.modeFlip(!live);renderAll();toast(live?'Mode demo aktif.':'Mode resmi aktif. Hasil tercatat.');}
  catch(error){toast(error.status===401?'Di versi online, ganti mode lewat Masuk admin setelah masuk dengan PIN.':error.message,'error');}
 });
 $('soundButton').addEventListener('click',()=>{
  ui.muted=!ui.muted;
  localStorage.setItem('bdrop-muted',ui.muted?'1':'0');
  syncSound();
  if(!ui.muted)unlockAudio();
 });
 window.addEventListener('gamysuf:audio',event=>{
  if(typeof event.detail?.muted!=='boolean')return;
  ui.muted=event.detail.muted;
  localStorage.setItem('bdrop-muted',ui.muted?'1':'0');
  syncSound();
  if(!ui.muted)unlockAudio();
 });
 window.addEventListener('gamysuf:audio-query',()=>{
  window.dispatchEvent(new CustomEvent('gamysuf:audio-state',{detail:{muted:ui.muted||!state?.settings.sound}}));
 });
 $('confirmOk').addEventListener('click',()=>closeConfirm(true));
 $('confirmCancel').addEventListener('click',()=>closeConfirm(false));
 $('confirmLayer').addEventListener('click',event=>{if(event.target===$('confirmLayer'))closeConfirm(false);});

 document.addEventListener('pointerdown',()=>{ui.lastInput=Date.now();if(!ui.audioUnlocked||audio?.ctx?.state==='suspended')unlockAudio();},{capture:true});
 document.addEventListener('keydown',event=>{
  ui.lastInput=Date.now();
  if(!ui.audioUnlocked||audio?.ctx?.state==='suspended')unlockAudio();
  if(confirmResolve){
   if(event.key==='Escape'){event.preventDefault();closeConfirm(false);}
   if(event.key==='Tab'){
    const first=$('confirmCancel'),last=$('confirmOk');
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
   return;
  }
  const typing=event.target.matches?.('input,textarea');
  if(ui.result){
   if(event.key==='Tab'){event.preventDefault();$('closeReveal').focus();return;}
   if(['Enter',' '].includes(event.key)&&ui.closeReady){event.preventDefault();closeReveal();}
   return;
  }
  if(event.key==='Escape'&&!ui.busy){$('backButton').click();return;}
  const interactive=event.target.closest?.('button,a,input,textarea,select,[role="button"]');
  if(ui.stage==='drop'&&!interactive&&(event.key==='Enter'||event.key===' ')){event.preventDefault();dropCapsule();return;}
  if(ui.stage==='home'&&!typing){
   if(event.key==='1')$('startDrop').click();
   if(event.key==='2'&&!$('startFan').disabled)$('startFan').click();
  }
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){audio?.stopBgm();stopTilt();return;}
  refresh();
  if(ui.audioUnlocked&&!ui.muted&&state?.settings.sound)audio?.startBgm();
  if(ui.result)startTilt();
 });

 /* ── Mulai ────────────────────────────────────────── */
 async function boot(){
  window.BDFx?.init($('fxCanvas'));
  board=new window.BDBoard.DropBoard($('boardCanvas'));
  try{state=await api('/api/state');}
  catch(error){toast(`Server lokal belum siap: ${error.message}`,'error');setTimeout(boot,2000);return;}
  if(audio)audio.configure(audioSettings());
  configureMachine();
  setStage('home');
  renderAll();
  // Try immediately; browser autoplay policies defer playback until the first trusted input.
  if(!ui.muted)void unlockAudio();
  if(state.pending)showResult(state.pending,{instant:true});
  setTimeout(homeBubble,900);
  setInterval(homeBubble,5600);
  setInterval(()=>{if(!ui.busy&&!ui.result&&!document.hidden)refresh();},9000);
  setInterval(()=>{
   const idle=Date.now()-ui.lastInput;
   if(ui.stage!=='home'&&!ui.busy&&!ui.result&&!confirmResolve&&idle>90000)setStage('home');
   if(ui.stage==='home'&&ui.audioUnlocked&&!ui.muted&&idle>40000&&!ui.result){
    const lines=['bd-welcome',...(window.BoothAudio?.SLOGANS||[])];
    audio?.speak(lines[ui.sloganIndex++%lines.length]);
    ui.lastInput=Date.now()-20000;
   }
  },5000);
  document.body.classList.add('ready');
 }
 boot();
})();
