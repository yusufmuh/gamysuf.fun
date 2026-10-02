'use strict';
(()=>{
 const {esc,icon,cardFace,leaderCard,cardBack,poster,booster,attachTilt,RARITY,money}=window.HeartCards;
 const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const storage={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{/* mode privat */}},session(k,v){try{if(v===undefined)return sessionStorage.getItem(k);if(v===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,v);}catch{return null;}return null;}};
 const audio=new window.HeartAudio(),fx=new window.HeartFX($('fxCanvas')),reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
 const ui={state:null,host:'zoro',mode:'gacha',pick:'',preview:'',stage:'home',busy:false,result:null,request:null,lastFocus:null,collection:[],toastTimer:0,anims:new Set(),timers:new Set(),run:0,tear:null,view:'card',posterStamped:false,userToggled:false,flipping:false,keys:{},previewTimer:0,staffMode:null,modeBusy:false,hostChosen:false,dealing:false,dealtSlot:null};
 const SERVICE_ORDER=['cinderella','twirl','whisper','offering','vow','hug','pat'];
 document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
 try{const saved=JSON.parse(storage.get('heart-collection')||'[]');if(Array.isArray(saved))ui.collection=saved.filter(k=>typeof k==='string');}catch{/* koleksi lama rusak diabaikan */}
 try{const r=JSON.parse(storage.session('heart-request')||'null');if(r&&typeof r.requestId==='string')ui.request=r;}catch{/* permintaan lama diabaikan */}

 let motionState=null;
 function motion(){
  const minimal=reducedQuery.matches||storage.get('gamysuf-reduced-motion')==='1'||storage.get('heart-reduced-motion')==='1';
  if(motionState!==minimal){motionState=minimal;document.documentElement.dataset.motion=minimal?'reduce':'full';const b=$('motionButton');b.setAttribute('aria-pressed',String(minimal));b.innerHTML=icon(minimal?'still':'motion');b.setAttribute('aria-label',minimal?'Aktifkan animasi':'Kurangi animasi');b.title=minimal?'Aktifkan animasi':'Kurangi animasi';fx.setReduced(minimal);}
  return minimal;
 }
 motion();
 function themeState(){
  const root=document.documentElement,saved=storage.get('gamysuf-theme');
  const theme=window.GamysufTheme?.get?.()||root.dataset.theme||(saved==='light'?'light':'dark');
  root.dataset.theme=theme;
  $('darkThemeButton').setAttribute('aria-pressed',String(theme==='dark'));
  $('lightThemeButton').setAttribute('aria-pressed',String(theme==='light'));
 }
 function setTheme(theme){
  if(window.GamysufTheme?.set)window.GamysufTheme.set(theme);
  else{
   document.documentElement.dataset.theme=theme;storage.set('gamysuf-theme',theme);
   document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='light'?'#fff9f6':'#12050c');
   window.dispatchEvent(new CustomEvent('gamysuf:theme',{detail:{theme}}));
  }
  themeState();
 }
 async function api(route,body){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const res=await fetch(route,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Bpedia-Client':'heartparade'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});
   let json=null;try{json=await res.json();}catch{/* bukan JSON */}
   if(!res.ok)throw Object.assign(new Error(json?.error||'Permintaan gagal.'),{status:res.status});
   if(!json)throw new Error('Respons server tidak lengkap.');
   return json;
  }catch(error){if(error.status)throw error;throw new Error('Koneksi belum stabil. Putaranmu tetap disimpan; coba lagi.');}
  finally{clearTimeout(timeout);}
 }
 const demo=()=>ui.state?.settings.mode!=='live';
 const hostOf=id=>ui.state?.hosts.find(h=>h.id===id)||null,host=()=>hostOf(ui.host);
 const available=h=>Boolean(h?.enabled)&&(demo()||h.remaining>0);
 const cardOf=(hostId,serviceId)=>ui.state?.cards.find(c=>c.hostId===hostId&&c.serviceId===serviceId)||null;
 const serviceOf=id=>ui.state?.services.find(v=>v.id===id)||null;
 const shortName=card=>String(card?.name||'').split(' · ')[0];
 function resultCard(r){return r.card||cardOf(r.host.id,r.service.id);}
 function toast(text){const t=$('toast');t.textContent=text;t.hidden=false;clearTimeout(ui.toastTimer);ui.toastTimer=setTimeout(()=>{t.hidden=true;},3600);}
 function connection(text){$('connectionText').textContent=text;$('connection').hidden=false;}
 function soundState(){const b=$('soundButton');b.innerHTML=icon(audio.muted?'mute':'sound');b.setAttribute('aria-label',audio.muted?'Aktifkan suara':'Matikan suara');b.setAttribute('aria-pressed',String(audio.muted));window.dispatchEvent(new CustomEvent('gamysuf:audio-state',{detail:{muted:audio.muted}}));}
 function toggleMute(){audio.setMuted(!audio.muted);soundState();toast(audio.muted?'Suara dimatikan.':'Suara aktif.');}
 function openDialog(id){const d=$(id);if(d.open)return;ui.lastFocus=document.activeElement&&document.activeElement!==document.body?document.activeElement:$('startButton');d.showModal();}
 function closeDialog(id){const d=$(id);if(!d.open)return;d.close();if(ui.lastFocus?.isConnected)ui.lastFocus.focus({preventScroll:true});}
 function resetResultScroll(){
  const dialog=$('resultDialog'),top=()=>{if(dialog.open)dialog.scrollTop=0;};
  top();queueMicrotask(top);requestAnimationFrame(()=>{top();requestAnimationFrame(top);});
 }
 const timer=(fn,ms)=>{const t=setTimeout(()=>{ui.timers.delete(t);fn();},ms);ui.timers.add(t);return t;};
 function clearTimers(){ui.timers.forEach(clearTimeout);ui.timers.clear();}

 /* ---------- Meja kartu ---------- */
 function renderLeaders(){
  const s=ui.state,key=JSON.stringify(s.hosts.map(h=>[h.id,h.fullName,h.leaderLife,h.leaderPower,h.attribute,h.crew,h.role,h.image]));
  if(ui.keys.leaders!==key){
   ui.keys.leaders=key;
   $('leaders').innerHTML=s.hosts.map(h=>`<div class="leader-slot host-${esc(h.id)}" data-host="${esc(h.id)}">${leaderCard(h)}<button type="button" class="host-card" data-host="${esc(h.id)}" aria-pressed="false" aria-label="Pilih leader ${esc(h.name)}"><span class="leader-state"></span></button></div>`).join('');
   $('leaders').querySelectorAll('.leader-slot').forEach(slot=>attachTilt(slot,{max:9,isEnabled:()=>!motion()}));
  }
  $('leaders').querySelectorAll('.leader-slot').forEach(slot=>{
   const h=hostOf(slot.dataset.host),selected=h?.id===ui.host,button=slot.querySelector('.host-card');
   slot.classList.toggle('selected',selected);slot.classList.toggle('off',!available(h));
   button.setAttribute('aria-pressed',String(selected));button.disabled=!available(h)||ui.busy||ui.modeBusy||ui.stage!=='home';
   button.querySelector('.leader-state').textContent=!h?.enabled?'Sedang istirahat':!available(h)?'Kuota hari ini habis':selected?'Leader pilihanmu':`Pilih ${h.name}`;
  });
  const h=host();
  $('hostQuote').textContent=h?.quote||'Momen manis akan segera kembali.';
  $('quoteName').textContent=h?`— ${h.name}, ${h.role}`:'— Bipy';
 }
 function renderSession(){
  const s=ui.state,canPlay=!s.settings.paused&&s.settings.sessionOpen&&s.hosts.some(available)&&s.services.some(v=>v.enabled);
  $('modeBadge').textContent=demo()?'DEMO ONLINE · GRATIS':'MAIN TERCATAT · BOOTH';$('modeBadge').classList.toggle('live',!demo());
  renderStaffMode();
  $('scheduleText').textContent=s.settings.schedule||'Zoro & Sanji hadir 3–4 Okt 2026, dua hari penuh di booth Bpedia.';
  $('sessionNote').textContent=!canPlay?'Sesi sedang istirahat. Kartu bisa dibuka lagi setelah petugas membuka sesi.':demo()?'Kartu digital gratis untuk koleksimu. Tiket booth diterbitkan petugas.':`${s.queue.waiting} tiket menunggu di antrean booth.`;
  return canPlay;
 }
 function renderMode(canPlay){
  const s=ui.state,h=host(),locked=!s.settings.allowPick,home=ui.stage==='home',idle=!ui.busy&&!ui.modeBusy&&!ui.dealing&&home;
  document.body.dataset.mode=ui.mode;
  $('gachaMode').setAttribute('aria-pressed',String(ui.mode==='gacha'));$('pickMode').setAttribute('aria-pressed',String(ui.mode==='pick'));
  $('gachaMode').disabled=!idle;$('pickMode').disabled=!idle;$('pickMode').setAttribute('aria-disabled',String(locked));$('pickMode').classList.toggle('locked',locked);
  const lockKey=String(locked);if(ui.keys.lock!==lockKey){ui.keys.lock=lockKey;$('pickModeIcon').innerHTML=icon(locked?'lock':'cards');}
  $('pickModeNote').textContent=locked?'Sedang dikunci petugas':'Belanja Rp150.000 · pilih momenmu';
  const pickCard=ui.pick?cardOf(ui.host,ui.pick):null;
  $('startButton').disabled=!canPlay||!idle||ui.dealing||!ui.hostChosen;
  $('startLabel').textContent=ui.request?'Lanjutkan putaran':ui.mode==='gacha'?'Kocok tujuh kartu':pickCard?`Dapatkan ${shortName(pickCard)}`:'Pilih satu kartu dulu';
  $('deckHint').textContent=ui.request?'Putaran sebelumnya belum terkonfirmasi. Lanjutkan untuk memulihkannya.':ui.mode==='gacha'?'Kenali tujuh momen di bawah. Bipy akan mengocoknya, lalu Babes memilih satu kartu tertutup.':pickCard?`${shortName(pickCard)} pilihanmu. Ketuk kartunya untuk langsung membukanya.`:'Ketuk bagian mana pun pada kartu favoritmu. Momenmu langsung terbuka.';
  $('purchaseCheck').hidden=demo();$('purchaseTierHint').textContent=ui.mode==='gacha'?'Gacha mulai Rp100.000':'Pilihan langsung mulai Rp150.000';$('purchaseAmount').min=ui.mode==='gacha'?'100000':'150000';
  const boosterKey=h?`${h.id}:${h.image}`:'';
  if(h&&ui.keys.booster!==boosterKey){ui.keys.booster=boosterKey;$('boosterPreview').innerHTML=booster(h);}
  $('boosterButton').disabled=!canPlay||!idle||ui.mode!=='gacha';$('boosterButton').setAttribute('aria-label',`Buka Gacha Booster ${h?.name||''}`.trim());
  $('boosterButton').tabIndex=ui.mode==='gacha'?0:-1;
 }
 function renderDeck(){
  const s=ui.state,h=host();if(!h)return;
  const key=`${h.id}|${s.settings.allowPick}|${s.services.map(v=>v.id+':'+v.enabled).join(',')}|${s.cards.map(c=>c.id+c.image).join(',')}`;
  if(ui.keys.deck!==key){
   const hostChanged=ui.keys.deckHost&&ui.keys.deckHost!==h.id;ui.keys.deck=key;ui.keys.deckHost=h.id;
   $('deckHostName').textContent=h.name;
   const ordered=[...s.services].sort((a,b)=>SERVICE_ORDER.indexOf(a.id)-SERVICE_ORDER.indexOf(b.id)),mid=(ordered.length-1)/2;
   $('momentGrid').innerHTML=ordered.map((v,i)=>{const c=cardOf(h.id,v.id);if(!c)return '';const o=i-mid;return `<article class="deck-card${v.enabled?'':' unavailable'}" data-service="${esc(v.id)}" style="--i:${i};--o:${o};--o2:${o*o}">${cardFace(c,{size:'mini',hostName:h.name,video:true})}${v.enabled?'':'<span class="deck-off">Sedang tidak tersedia</span>'}<div class="moment-caption"><h3>${esc(v.name)}</h3><p>${esc(v.detail)}</p><button type="button" class="peek-video secondary" data-service="${esc(v.id)}">${icon('play')} Lihat momen</button><button type="button" class="card-choice" data-service="${esc(v.id)}" aria-pressed="false" aria-label="${esc(v.name)} bersama ${esc(h.name)}, ${esc(RARITY[c.rarity]||c.rarity)}${v.enabled?'':', sedang tidak tersedia'}"${v.enabled?'':' disabled'}>Pilih kartu ini</button></div></article>`;}).join('');
   $('momentGrid').insertAdjacentHTML('beforeend',`<aside class="deck-actions" id="deckActions" aria-labelledby="deckActionsTitle"><p class="eyebrow">BIPY · JADE SWORDSMAN</p><h3 id="deckActionsTitle">Pendekar kecil,<br><em>aksi besar.</em></h3><div class="bipy-action-stage"><figure class="action-ready"><img src="/assets/dealers/zoro-ready.webp" alt="Bipy Zoro bersiap dengan pedang" width="800" height="1000" loading="lazy" decoding="async"><figcaption>Siap beraksi</figcaption></figure><figure class="action-jump"><img src="/assets/dealers/zoro-jump.webp" alt="Bipy Zoro melompat sambil mengangkat pedang" width="800" height="1000" loading="lazy" decoding="async"><figcaption>Lompatan giok</figcaption></figure><figure class="action-cheer"><img src="/assets/dealers/zoro-cheer.webp" alt="Bipy Zoro tersenyum dan mengacungkan jempol" width="800" height="1000" loading="lazy" decoding="async"><figcaption>Satu kemenangan!</figcaption></figure></div><p class="action-signoff">Tiga pedang. Satu semangat Bipy.</p></aside>`);
   if(hostChanged&&!motion()){const fan=$('momentGrid');fan.classList.remove('deal');void fan.offsetWidth;fan.classList.add('deal');}
  }
  updateDeck();
 }
 function updateDeck(){
  const idle=!ui.busy&&!ui.modeBusy&&!ui.dealing&&ui.stage==='home';
  $('momentGrid').querySelectorAll('.deck-card').forEach(el=>{
   const id=el.dataset.service,v=serviceOf(id),chosen=ui.mode==='pick'&&ui.pick===id,button=el.querySelector('.card-choice');
   el.classList.toggle('chosen',chosen);el.classList.toggle('previewing',ui.preview===id&&!chosen);
   button.setAttribute('aria-pressed',String(chosen));button.disabled=!v?.enabled||!idle;
  });
 }
 function previewCard(){
  const h=host();if(!h)return null;
  const enabled=ui.state.services.filter(v=>v.enabled);
  const id=[ui.mode==='pick'?ui.pick:'',ui.preview].find(x=>x&&enabled.some(v=>v.id===x))||[...enabled].sort((a,b)=>b.price-a.price)[0]?.id;
  return id?cardOf(h.id,id):null;
 }
 function renderPoster(){
  const card=previewCard(),h=host();if(!card||!h)return;
  const key=`${card.id}:${card.price}`;if(ui.keys.poster===key)return;
  const first=!ui.keys.poster;ui.keys.poster=key;
  $('posterPreview').innerHTML=poster(card,{hostName:h.name,stamped:first||motion()});
  $('posterCaption').textContent=`${shortName(card)}: harga normal ${money(card.price)}, gratis untuk pelanggan Bpedia.`;
  if(!first&&!motion()){const p=$('posterPreview').querySelector('.poster');p.classList.add('stamping');}
 }
 function renderParade(){
  if(ui.keys.parade)return;ui.keys.parade='1';
  $('paradeTrack').innerHTML='<div class="rivalry-stage"><video id="rivalryVideo" src="/assets/video/bipy-princess-rivalry-gemini.mp4" poster="/assets/video/bipy-princess-rivalry-poster.webp" muted loop playsinline preload="metadata" aria-label="Zoro dan Sanji beradu aksi komedi untuk menarik perhatian Princess Bipy"></video></div><div class="rivalry-caption"><span>PRINCESS BIPY · PETUALANGAN PILIHANMU</span><button type="button" id="rivalryToggle" aria-pressed="true">Jeda adegan</button></div>';
 }
 function renderBinder(){
  const s=ui.state,owned=new Set(ui.collection),key=`${[...owned].sort().join(',')}|${s.cards.map(c=>c.id).join(',')}`;
  const count=s.cards.filter(c=>owned.has(`${c.hostId}:${c.serviceId}`)).length;
  $('binderCount').textContent=`${count}/14`;$('binderBar').style.transform=`scaleX(${count/14})`;
  $('collectionCount').textContent=count===14?'Lengkap! Semua kartu Zoro & Sanji ada di binder-mu.':count?`${14-count} kartu lagi untuk melengkapi binder.`:'Kartu yang kamu buka akan tersimpan di sini.';
  if(ui.keys.binder===key)return;ui.keys.binder=key;
  $('binder').innerHTML=['zoro','sanji'].map(hid=>{const h=hostOf(hid);return `<div class="binder-row host-${esc(hid)}" role="list" aria-label="Kartu ${esc(h?.name||hid)}"><span class="binder-label" aria-hidden="true">${esc(h?.name||hid)}</span>${SERVICE_ORDER.map(sid=>{const c=cardOf(hid,sid);if(!c)return '';const has=owned.has(`${hid}:${sid}`);return `<div class="slot${has?' owned':''}" role="listitem" aria-label="${esc(shortName(c))} · ${esc(h?.name||hid)} · ${has?'sudah dimiliki':'belum ditemukan'}">${has?cardFace(c,{size:'mini',hostName:h?.name}):`<span class="slot-empty" aria-hidden="true"><img src="${esc(c.image)}" alt="" width="960" height="1440" loading="lazy" decoding="async"><b>?</b><small>${esc(shortName(c))}</small></span>`}</div>`;}).join('')}</div>`;}).join('');
 }
 function render(){
  const s=ui.state;if(!s)return;
  if(!available(host()))ui.host=s.hosts.find(available)?.id||ui.host;
  if(!s.settings.allowPick&&ui.mode==='pick'){ui.mode='gacha';ui.pick='';}
  if(ui.pick&&!serviceOf(ui.pick)?.enabled)ui.pick='';
  document.body.dataset.host=ui.host;
  const canPlay=renderSession();renderLeaders();renderMode(canPlay);renderDeck();renderPoster();renderParade();renderBinder();
  document.body.dataset.ready='1';
  window.HeartJourney?.update();
 }
 async function refresh(){
  if(ui.modeBusy)return false;
  try{
   ui.state=await api('/api/state');$('connection').hidden=true;render();
   if(ui.state.pending&&ui.stage==='home'){clearRequest();openResult(ui.state.pending,{recovered:true});}
   else if(ui.request&&ui.stage==='home')connection('Putaran sebelumnya belum terkonfirmasi. Tekan Coba lagi untuk memulihkannya.');
   return true;
  }catch(error){connection(error.message);renderStaffMode();return false;}
 }
 function renderStaffMode(){
  const mode=ui.state?.settings.mode;
  for(const [id,value] of [['demoModeButton','demo'],['liveModeButton','live']]){
   const button=$(id);button.setAttribute('aria-pressed',String(mode===value));
   button.disabled=ui.busy||ui.modeBusy||ui.stage!=='home'||Boolean(ui.request)||Boolean(ui.state?.pending);
  }
 }
 function clearStaffPin(){
  $('staffPin').value='';$('staffModeError').hidden=true;
 }
 function requestStaffPin(mode){
  ui.staffMode=mode;clearStaffPin();openDialog('staffModeDialog');$('staffPin').focus({preventScroll:true});
 }
 async function switchStaffMode(mode,{login=false}={}){
  if(ui.busy||ui.modeBusy||ui.stage!=='home'||ui.request||ui.state?.pending)return;
  if(!login&&ui.state?.settings.mode===mode)return;
  ui.modeBusy=true;render();renderStaffMode();$('staffModeForm').setAttribute('aria-busy','true');$('staffModeCancel').disabled=true;
  try{
   if(login){
    const pin=$('staffPin').value;$('staffPin').value='';
    await api('/api/login',{pin});
   }
   const state=await api('/api/mode',{mode});
   ui.state=state;ui.staffMode=null;clearStaffPin();closeDialog('staffModeDialog');$('connection').hidden=true;render();
   toast(mode==='live'?'Main Tercatat aktif. Petugas memeriksa misi peserta sebelum bermain.':'Demo aktif. Hasil tidak masuk antrean booth.');
  }catch(error){
   if(error.status===401&&!login)requestStaffPin(mode);
   else if($('staffModeDialog').open){$('staffModeError').textContent=error.message;$('staffModeError').hidden=false;$('staffPin').focus({preventScroll:true});}
   else{connection(error.message);toast(error.message);}
  }finally{ui.modeBusy=false;$('staffModeForm').removeAttribute('aria-busy');$('staffModeCancel').disabled=false;render();renderStaffMode();}
 }
 function setMode(mode){
  if(ui.busy||ui.modeBusy||ui.stage!=='home'||!ui.state)return;
  if(mode==='pick'&&!ui.state.settings.allowPick){toast('Pilih Kartu sedang dikunci petugas. Gunakan Gacha Booster.');return;}
  if(ui.mode===mode)return;
  ui.mode=mode;if(mode==='gacha')ui.pick='';audio.unlock();audio.tick();if(mode==='pick')audio.shuffle();render();
 }
 function selectCard(id,{open=false}={}){
  if(ui.busy||ui.modeBusy||ui.stage!=='home'||!ui.state)return;
  const v=serviceOf(id);if(!v?.enabled)return;
  if(!ui.state.settings.allowPick){ui.preview=id;updateDeck();renderPoster();toast('Pilih Kartu sedang dikunci petugas. Gunakan Gacha Booster.');return;}
  ui.mode='pick';ui.pick=id;ui.preview=id;audio.unlock();audio.tick();render();
  if(open)prepare();
 }
 function moveDeck(dir){
  const enabled=SERVICE_ORDER.filter(id=>serviceOf(id)?.enabled);if(!enabled.length)return;
  const current=ui.mode==='pick'&&ui.pick?ui.pick:(document.activeElement?.closest?.('.deck-card')?.dataset.service||ui.preview||enabled[0]);
  const next=enabled[(Math.max(0,enabled.indexOf(current))+dir+enabled.length)%enabled.length];
  if(ui.mode==='pick'){ui.pick=next;ui.preview=next;audio.tick();render();}else{ui.preview=next;updateDeck();renderPoster();}
  const button=$('momentGrid').querySelector(`.card-choice[data-service="${next}"]`);
  button?.focus({preventScroll:true});button?.closest('.deck-card')?.scrollIntoView({behavior:motion()?'auto':'smooth',block:'nearest',inline:'center'});
 }

 /* ---------- Undian langsung ---------- */
 function prepare(){
  if(!ui.state||ui.busy||ui.modeBusy||ui.stage!=='home')return;audio.unlock();
  if(!ui.hostChosen){toast('Pilih Zoro atau Sanji terlebih dahulu.');$('leaders').scrollIntoView({behavior:motion()?'auto':'smooth',block:'center'});return;}
  if(ui.request){draw(ui.request);return;}
  const h=host();if(!h)return;
  if(ui.mode==='pick'&&!ui.pick){const first=$('momentGrid').querySelector('.card-choice:not(:disabled)');first?.closest('.deck-card')?.scrollIntoView({behavior:motion()?'auto':'smooth',block:'nearest',inline:'center'});first?.focus({preventScroll:true});toast('Pilih satu kartu favoritmu dulu.');return;}
  audio.tick();
  const request={requestId:crypto.randomUUID(),host:ui.host,comfort:'no-touch',recording:false,consent:false};
  if(!demo()){request.verified=true;request.purchaseAmount=Number($('purchaseAmount').value);const minimum=ui.mode==='gacha'?100000:150000;if(!Number.isSafeInteger(request.purchaseAmount)||request.purchaseAmount<minimum){toast(`Belanja minimal ${money(minimum)} untuk ${ui.mode==='gacha'?'gacha':'memilih fanservice'}.`);$('purchaseAmount').focus();return;}}
  if(ui.mode==='gacha'&&ui.dealtSlot===null){window.HeartJourney?.deal();return;}
  if(ui.mode==='pick')request.pick=ui.pick;
  draw(request);
 }
 function clearRequest(){ui.request=null;storage.session('heart-request',null);}
 async function draw(request){
  if(ui.busy||ui.modeBusy||ui.stage!=='home')return;
  ui.busy=true;ui.request=request;storage.session('heart-request',JSON.stringify(request));$('startButton').setAttribute('aria-busy','true');render();
  try{
   const result=await api('/api/play',request);
   clearRequest();$('connection').hidden=true;ui.busy=false;openResult(result);
  }catch(error){
   let recovered=null;try{const state=await api('/api/state');ui.state=state;recovered=state.pending;}catch{/* tetap tampilkan galat awal */}
   ui.busy=false;
   if(recovered){clearRequest();openResult(recovered,{recovered:true});}
   else{if(error.status&&error.status<500)clearRequest();connection(error.message);toast(error.message);}
  }finally{ui.busy=false;$('startButton').removeAttribute('aria-busy');render();}
 }

 /* ---------- Reveal & hasil ---------- */
 const shell=$('playShell'),showcase=$('showcase');
 function anim(el,frames,options){
  if(!el?.animate)return Promise.resolve();
  const settings={fill:'forwards',easing:'cubic-bezier(.2,.8,.2,1)',...options},a=el.animate(frames,settings);ui.anims.add(a);
  return a.finished.then(()=>{
   if(settings.fill==='none'||settings.fill==='auto'){a.cancel();ui.anims.delete(a);}
  },()=>{ui.anims.delete(a);throw new Error('cancelled');});
 }
 function stopAnims(){ui.anims.forEach(a=>{try{a.cancel();}catch{/* sudah selesai */}});ui.anims.clear();}
 const faces={back:$('faceBack'),card:$('faceCard'),poster:$('facePoster')};
 function showFace(name){Object.entries(faces).forEach(([k,el])=>el.classList.toggle('on',k===name));}
 function syncResultMedia(){
  const video=faces.card.querySelector('video');if(!video)return;
  const playing=ui.stage==='result'&&ui.view==='card'&&!ui.flipping&&$('resultDialog').open&&!document.hidden&&!motion();
  if(playing){if(video.paused)video.play().catch(()=>{});}else video.pause();
 }
 function status(text){$('drawStatus').textContent=text;}
 function hostFor(r){const h=hostOf(r.host.id);return h?{...h,...r.host,image:h.image}:{...r.host,role:'',fullName:r.host.name};}
 function fillResult(r){
  const card=resultCard(r),h=hostFor(r),rarity=card.rarity||'R';
  shell.dataset.host=r.host.id;shell.dataset.rarity=rarity.toLowerCase();
  faces.back.innerHTML=`<div class="spinner">${cardBack()}${cardBack({variant:'rear'})}</div>`;
  faces.card.innerHTML=cardFace(card,{size:'full',imgId:'resultHost',lazy:false,video:true,hostName:r.host.name,sealed:true});
  faces.poster.innerHTML=poster(card,{hostName:r.host.name,stamped:false,lazy:false,sealed:true});
  $('boosterStage').innerHTML=booster(h,{tearable:true});$('boosterStage').setAttribute('aria-label',`Sobek booster ${r.host.name}`);
  const video=faces.card.querySelector('video');if(video)video.addEventListener('error',()=>video.remove(),{once:true});
  $('resultRarity').textContent=rarity;$('resultRarity').dataset.rarity=rarity.toLowerCase();$('resultRarity').title=RARITY[rarity]||rarity;
  $('resultCardNo').textContent=card.cardNo;$('resultMethod').textContent=r.method==='pick'?'Pilih Kartu':'Gacha Booster';
  $('resultTitle').textContent=r.service.name;$('resultHostName').textContent=r.host.name;$('resultRole').textContent=h.role||'';
  $('resultRomanticLine').textContent=card.romanticLine;
  $('resultBipy').src=card.stickerImage||card.image;$('resultBipy').alt=`Bipy bersama ${r.host.name} · ${r.service.name}`;$('resultBipyName').textContent=`Bipy × ${r.host.name}`;
  const noTouch=r.comfort==='no-touch';
  $('resultComfort').innerHTML=`${icon(noTouch?'noTouch':'hand')}<p><b>${noTouch?'Tanpa sentuhan':'Sentuhan ringan · konfirmasi ulang sebelum mulai'}</b><span>${esc(noTouch?r.service.alternative:r.service.detail)}</span></p>`;
  $('flipHint').innerHTML='<span aria-hidden="true">↻</span> Ketuk kartu untuk membalik ke poster bounty';showcase.setAttribute('aria-label','Balik kartu menjadi poster bounty');
  $('resultConsent').textContent=(r.recording?'Izin dokumentasi dipilih; petugas tetap bertanya sebelum merekam.':'Tanpa dokumentasi.')+' Sentuhan dan dokumentasi hanya setelah persetujuan langsung tamu dan cosplayer. Keduanya boleh berhenti atau memilih alternatif.';
  $('resultError').hidden=true;$('finishButton').disabled=false;
 }
 function decodeAll(root){return Promise.race([Promise.all([...root.querySelectorAll('img')].map(img=>img.decode?img.decode().catch(()=>{}):null)),sleep(1600)]);}
 function openResult(r,{recovered=false}={}){
  stopAnims();clearTimers();ui.run++;
  ui.result=r;ui.host=r.host.id;ui.hostChosen=true;document.body.dataset.journey='table';ui.stage='drawing';ui.view='card';ui.userToggled=false;ui.posterStamped=false;ui.flipping=false;
  document.body.dataset.host=ui.host;fillResult(r);
  shell.dataset.phase='reveal';shell.dataset.method=r.method==='pick'?'pick':'gacha';shell.classList.remove('rays-on');showcase.dataset.view='card';
  $('viewCard').setAttribute('aria-pressed','true');$('viewPoster').setAttribute('aria-pressed','false');
  showFace(null);$('boosterStage').classList.remove('on');
  if(!$('resultDialog').open){ui.lastFocus=$('startButton');$('resultDialog').showModal();}
  $('skipAnimation').focus({preventScroll:true});resetResultScroll();
  if(recovered||motion()){finishReveal({quiet:recovered});return;}
  runReveal(r,ui.run);
 }
 async function runReveal(r,run){
  const alive=()=>run===ui.run&&ui.stage==='drawing',D=clamp(Number(r.duration)||4200,1000,8000),started=performance.now(),card=resultCard(r);
  try{
   status(r.method==='pick'?'Momen pilihanmu sedang dibuka…':'Kartu pilihan Babes sedang dibuka…');
   await decodeAll($('playStage'));if(!alive())return;
   if(r.method==='pick')await pickSequence(D*.6,alive,card);else await gachaSequence(D,alive,card);
   if(!alive())return;
   const rest=(r.method==='pick'?D*.6:D)-(performance.now()-started);if(rest>0)await sleep(Math.max(260,rest));
   if(alive())finishReveal();
  }catch{if(alive())finishReveal();}
 }
 function waitTear(ms,alive){
  const pack=$('boosterStage');
  return new Promise(resolve=>{
   let done=false,sx=null,sy=null;
   const finish=()=>{if(done)return;done=true;clearTimeout(t);pack.removeEventListener('click',finish);pack.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);ui.tear=null;resolve();};
   const down=e=>{sx=e.clientX;sy=e.clientY;},move=e=>{if(sx!==null&&Math.hypot(e.clientX-sx,e.clientY-sy)>26)finish();};
   const t=setTimeout(finish,ms);pack.addEventListener('click',finish);pack.addEventListener('pointerdown',down);window.addEventListener('pointermove',move);ui.tear=finish;
   if(!alive())finish();
  });
 }
 async function revealFace(card){
  shell.classList.add('rays-on');
  anim($('flash'),[{opacity:0},{opacity:.95,offset:.18},{opacity:0}],{duration:620,easing:'ease-out',fill:'none'}).catch(()=>{});
  audio.chime(card.rarity);
  await anim(faces.back,[{transform:'rotateY(0deg) scale(1)'},{transform:'rotateY(90deg) scale(1.03)'}],{duration:190,easing:'cubic-bezier(.55,0,1,.45)'});
  showFace('card');audio.flip();
  fx.start({motif:card.animationMotif,host:card.hostId,rarity:card.rarity,anchor:$('tilt')});fx.burst(card.rarity);
  await anim(faces.card,[{transform:'rotateY(-90deg) scale(1.06)'},{transform:'rotateY(0deg) scale(1)'}],{duration:360,easing:'cubic-bezier(0,0,.2,1)'});
  status(`${RARITY[card.rarity]||card.rarity} · ${shortName(card)}`);
 }
 async function gachaSequence(D,alive,card){
  if(ui.dealtSlot!==null){showFace('back');audio.whoosh();await anim(faces.back,[{transform:`translateX(${(ui.dealtSlot-3)*5}%) scale(.72) rotate(-6deg)`,opacity:0},{transform:'none',opacity:1}],{duration:520});if(!alive())throw new Error('cancelled');await revealFace(card);return;}
  const pack=$('boosterStage'),top=pack.querySelector('.pack-top'),body=pack.querySelector('.pack-body');
  pack.classList.add('on');audio.whoosh();
  await anim(pack,[{transform:'translate3d(0,-120vh,0) rotate(-16deg)'},{transform:'translate3d(0,3%,0) rotate(2.5deg)',offset:.78},{transform:'translate3d(0,0,0) rotate(0deg)'}],{duration:clamp(D*.13,320,700),easing:'cubic-bezier(.2,.9,.25,1)'});
  if(!alive())throw new Error('cancelled');
  audio.shuffle();status('Ketuk atau geser booster untuk menyobek');pack.classList.add('ready');pack.focus({preventScroll:true});
  const shake=pack.animate([{transform:'rotate(0deg)'},{transform:'rotate(-2.2deg) translateX(-1%)'},{transform:'rotate(2.2deg) translateX(1%)'},{transform:'rotate(0deg)'}],{duration:180,iterations:Infinity});ui.anims.add(shake);
  audio.shake();const rattle=setInterval(()=>audio.shake(),440);
  await waitTear(clamp(D*.29,450,1200),alive);clearInterval(rattle);shake.cancel();ui.anims.delete(shake);pack.classList.remove('ready');
  if(!alive())throw new Error('cancelled');
  status('Kartu keluar dari booster…');audio.tear();showFace('back');
  await Promise.all([
   anim(top,[{transform:'none',opacity:1},{transform:'translate(42%,-80%) rotate(26deg)',opacity:0}],{duration:440,easing:'cubic-bezier(.3,.6,.4,1)'}),
   anim(faces.back,[{transform:'translateY(26%) scale(.9)',opacity:0},{opacity:1,offset:.2},{transform:'translateY(-3%) scale(1)',opacity:1}],{duration:600,delay:110}),
   anim(body,[{transform:'none',opacity:1},{transform:'translateY(70%) rotate(5deg)',opacity:0}],{duration:640,delay:240,easing:'cubic-bezier(.5,0,.7,.4)'})
  ]);
  if(!alive())throw new Error('cancelled');
  pack.classList.remove('on');audio.whoosh();
  await anim(faces.back,[{transform:'translateY(-3%) scale(1)'},{transform:'translateY(0) scale(1)'}],{duration:160});
  await revealFace(card);
 }
 async function pickSequence(D,alive,card){
  showFace('back');audio.whoosh();
  await anim(faces.back,[{transform:'translateY(12%) scale(.84)',opacity:0},{transform:'none',opacity:1}],{duration:clamp(D*.3,350,650),easing:'cubic-bezier(.25,.8,.3,1)'});
  if(!alive())throw new Error('cancelled');
  await revealFace(card);
 }
 function finishReveal({quiet=false}={}){
  if(!ui.result)return;
  const wasDrawing=ui.stage==='drawing'&&!quiet;ui.run++;ui.tear?.();stopAnims();
  const r=ui.result,card=resultCard(r),first=showcase.getBoundingClientRect();
  $('boosterStage').classList.remove('on','ready');showFace(ui.view==='poster'?'poster':'card');
  shell.dataset.phase='result';shell.classList.add('rays-on');ui.stage='result';
  if(ui.view==='poster'){const p=faces.poster.querySelector('.poster');p?.classList.add('is-stamped');}
  const last=showcase.getBoundingClientRect();
  if(!motion()&&first.width&&last.width&&wasDrawing){
   const s=first.width/last.width,dx=first.left+first.width/2-(last.left+last.width/2),dy=first.top+first.height/2-(last.top+last.height/2);
   anim(showcase,[{transform:`translate(${dx}px,${dy}px) scale(${s})`},{transform:'none'}],{duration:560,easing:'cubic-bezier(.2,.8,.2,1)',fill:'none'}).catch(()=>{});
  }
  fx.start({motif:card.animationMotif,host:card.hostId,rarity:card.rarity,anchor:$('tilt')});
  syncResultMedia();
  const key=`${r.host.id}:${r.service.id}`;if(!ui.collection.includes(key)){ui.collection.push(key);storage.set('heart-collection',JSON.stringify(ui.collection));}
  if(ui.state)renderBinder();
  if(wasDrawing&&motion())audio.chime(card.rarity);
  status(`${RARITY[card.rarity]||card.rarity} · ${shortName(card)} · ${r.host.name}`);
  resetResultScroll();$('resultTitle').focus({preventScroll:true});
  for(const seal of $('playStage').querySelectorAll('.bipy-seal'))seal.classList.add('is-stamped');
  if(!quiet){timer(()=>{audio.thump();audio.jingle();},motion()?0:420);}
 }
 function skip(){if(ui.stage==='drawing'){ui.tear?.();finishReveal();}}
 async function showView(view,{user=false}={}){
  if(ui.stage!=='result'||ui.flipping||!faces[view])return;if(user)ui.userToggled=true;if(ui.view===view)return;
  const run=ui.run,result=ui.result,alive=()=>run===ui.run&&result===ui.result&&ui.stage==='result';
  ui.flipping=true;const from=faces[ui.view],to=faces[view];syncResultMedia();
  $('viewCard').setAttribute('aria-pressed',String(view==='card'));$('viewPoster').setAttribute('aria-pressed',String(view==='poster'));showcase.dataset.view=view;
  try{
   if(motion()){showFace(view);}
   else{
    audio.flip();await anim(from,[{transform:'rotateY(0deg) scale(1)'},{transform:'rotateY(90deg) scale(.94)'}],{duration:290,easing:'cubic-bezier(.55,0,1,.45)',fill:'none'});
    if(!alive())return;showFace(view);
    await anim(to,[{transform:'rotateY(-90deg) scale(.94)'},{transform:'rotateY(0deg) scale(1)'}],{duration:390,easing:'cubic-bezier(0,0,.2,1)',fill:'none'});
   }
   if(!alive())return;ui.view=view;
   if(view==='poster'&&!ui.posterStamped)stampPoster();
  }catch{
   if(!alive())return;showFace(view);ui.view=view;
   if(view==='poster'&&!ui.posterStamped)stampPoster();
  }finally{if(alive()){ui.flipping=false;syncResultMedia();const label=view==='poster'?'Balik poster bounty menjadi kartu':'Balik kartu menjadi poster bounty';showcase.setAttribute('aria-label',label);$('flipHint').innerHTML=`<span aria-hidden="true">↻</span> ${view==='poster'?'Ketuk poster untuk kembali ke kartu':'Ketuk kartu untuk membalik ke poster bounty'}`;}}
 }
 function stampPoster(){
  ui.posterStamped=true;const p=faces.poster.querySelector('.poster');if(!p)return;
  if(motion()){p.classList.add('is-stamped');audio.thump();status('GRATIS untuk pelanggan Bpedia');return;}
  p.classList.remove('is-stamped');void p.offsetWidth;p.classList.add('stamping');
  timer(()=>{audio.thump();status('GRATIS untuk pelanggan Bpedia');},900);
 }
 async function acknowledge(){
  if(ui.busy||!ui.result)return;ui.busy=true;$('finishButton').disabled=true;
  try{
   ui.state=await api('/api/result',{id:ui.result.id});clearRequest();
   ui.run++;stopAnims();clearTimers();fx.stop();
   $('resultDialog').close();ui.result=null;ui.stage='home';ui.dealtSlot=null;ui.flipping=false;showFace(null);syncResultMedia();
   $('connection').hidden=true;
   ui.busy=false;render();$('startButton').focus({preventScroll:true});$('deck').scrollIntoView({behavior:'auto',block:'start'});
  }catch(error){$('resultError').textContent='Kartu belum ditutup. '+error.message;$('resultError').hidden=false;}
  finally{ui.busy=false;$('finishButton').disabled=false;if(ui.state)render();}
 }
 async function save(kind){
  const r=ui.result;if(!r)return;const button=$(kind==='card'?'saveCard':'savePoster');if(button.disabled)return;
  button.disabled=true;button.setAttribute('aria-busy','true');
  try{
   const card=resultCard(r),blob=await(kind==='card'?window.HeartExport.card:window.HeartExport.poster)(card,{hostName:r.host.name});
   window.HeartExport.download(blob,kind==='card'?`Grand-Line-Desire-${r.host.name}-${r.service.id}.png`:`Grand-Line-Desire-Poster-${r.host.name}-${r.service.id}.png`);
   toast(kind==='card'?'Kartu siap disimpan di perangkatmu.':'Poster bounty siap disimpan di perangkatmu.');
  }catch{toast('Gambar belum bisa disimpan. Coba lagi setelah semua gambar termuat.');}
  finally{button.disabled=false;button.removeAttribute('aria-busy');}
 }

 /* ---------- Kemiringan perangkat (hanya bila tanpa prompt izin) ---------- */
 const tiltEl=$('tilt');attachTilt(tiltEl,{max:12,isEnabled:()=>ui.stage==='result'&&!motion()});
 if('DeviceOrientationEvent' in window&&typeof window.DeviceOrientationEvent.requestPermission!=='function'&&matchMedia('(pointer: coarse)').matches){
  let frame=0,last=null;
  window.addEventListener('deviceorientation',e=>{
   if(ui.stage!=='result'||motion()||e.gamma===null)return;last=e;
   if(!frame)frame=requestAnimationFrame(()=>{frame=0;const g=clamp(last.gamma||0,-30,30)/30,b=clamp((last.beta||0)-45,-30,30)/30;tiltEl.style.setProperty('--ry',(g*8).toFixed(2)+'deg');tiltEl.style.setProperty('--rx',(-b*8).toFixed(2)+'deg');tiltEl.style.setProperty('--mx',(50+g*40).toFixed(1)+'%');tiltEl.style.setProperty('--my',(50+b*40).toFixed(1)+'%');tiltEl.style.setProperty('--glare','1');});
  });
 }

 /* ---------- Event ---------- */
 $('startButton').addEventListener('click',prepare);$('boosterButton').addEventListener('click',prepare);
 $('gachaMode').addEventListener('click',()=>setMode('gacha'));$('pickMode').addEventListener('click',()=>setMode('pick'));
 $('leaders').addEventListener('click',event=>{
  const button=event.target.closest('.host-card');if(!button||button.disabled||ui.busy||ui.stage!=='home')return;
  ui.host=button.dataset.host;ui.hostChosen=true;document.body.dataset.journey='table';audio.unlock();audio.tick();render();window.scrollTo({top:0,behavior:motion()?'auto':'smooth'});
 });
 $('momentGrid').addEventListener('click',event=>{const preview=event.target.closest('.peek-video');if(preview){window.HeartJourney?.preview(preview.dataset.service,preview);return;}const button=event.target.closest('.card-choice')||event.target.closest('.deck-card')?.querySelector('.card-choice');if(button&&!button.disabled){if(ui.mode==='gacha')window.HeartJourney?.preview(button.dataset.service,button);else selectCard(button.dataset.service,{open:true});}});
 showcase.addEventListener('click',()=>showView(ui.view==='card'?'poster':'card',{user:true}));
 showcase.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();showView(ui.view==='card'?'poster':'card',{user:true});}});
 const setPreview=id=>{clearTimeout(ui.previewTimer);ui.previewTimer=setTimeout(()=>{if(ui.stage!=='home'||ui.preview===id)return;ui.preview=id;updateDeck();renderPoster();},110);};
 $('momentGrid').addEventListener('pointerover',event=>{const card=event.target.closest('.deck-card');if(card&&event.pointerType==='mouse')setPreview(card.dataset.service);});
 $('momentGrid').addEventListener('focusin',event=>{const card=event.target.closest('.deck-card');if(card)setPreview(card.dataset.service);});
 $('demoModeButton').addEventListener('click',()=>switchStaffMode('demo'));
 $('liveModeButton').addEventListener('click',()=>switchStaffMode('live'));
 $('staffModeForm').addEventListener('submit',event=>{event.preventDefault();if(!$('staffModeForm').reportValidity()||!ui.staffMode)return;switchStaffMode(ui.staffMode,{login:true});});
 $('staffModeCancel').addEventListener('click',()=>{if(ui.modeBusy)return;ui.staffMode=null;clearStaffPin();closeDialog('staffModeDialog');});
 $('staffModeDialog').addEventListener('cancel',event=>{if(ui.modeBusy)event.preventDefault();else{ui.staffMode=null;clearStaffPin();}});
 $('staffModeDialog').addEventListener('close',()=>{ui.staffMode=null;clearStaffPin();});
 $('staffModeDialog').addEventListener('click',event=>{if(event.target===$('staffModeDialog')&&!ui.modeBusy){ui.staffMode=null;clearStaffPin();closeDialog('staffModeDialog');}});
 $('darkThemeButton').addEventListener('click',()=>setTheme('dark'));
 $('lightThemeButton').addEventListener('click',()=>setTheme('light'));
 window.addEventListener('gamysuf:theme',themeState);
 document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{if(!ui.busy&&!ui.modeBusy)closeDialog(button.dataset.close);}));
 $('resultDialog').addEventListener('cancel',event=>{event.preventDefault();if(ui.stage==='drawing')skip();else acknowledge();});
 $('finishButton').addEventListener('click',acknowledge);$('saveCard').addEventListener('click',()=>save('card'));$('savePoster').addEventListener('click',()=>save('poster'));
 $('skipAnimation').addEventListener('click',skip);
 $('viewCard').addEventListener('click',()=>showView('card',{user:true}));$('viewPoster').addEventListener('click',()=>showView('poster',{user:true}));
 $('soundButton').addEventListener('click',toggleMute);
 $('motionButton').addEventListener('click',()=>{const next=!motion();storage.set('heart-reduced-motion',next?'1':'0');motion();if(next)skip();updateTrailer();syncResultMedia();toast(next?'Animasi dikurangi.':'Animasi diaktifkan.');});
 $('retryButton').addEventListener('click',async()=>{if(ui.busy)return;if(ui.request)await draw(ui.request);else await refresh();});
 reducedQuery.addEventListener('change',()=>{if(motion())skip();updateTrailer();syncResultMedia();});
 window.addEventListener('storage',event=>{if(event.key==='gamysuf-reduced-motion'||event.key==='heart-reduced-motion'){if(motion())skip();updateTrailer();syncResultMedia();}else if(event.key==='gamysuf-theme'&&['dark','light'].includes(event.newValue)){if(!window.GamysufTheme)document.documentElement.dataset.theme=event.newValue;themeState();}});

 const trailer=$('paradeTrailer');let trailerInView=false,trailerUserPaused=false;
 function trailerState(){const playing=!trailer.paused,b=$('videoPlayButton');$('videoPlayLabel').textContent=playing?'Jeda cuplikan':'Putar cuplikan';b.querySelector('[data-icon]').innerHTML=icon(playing?'pause':'play');b.setAttribute('aria-label',playing?'Jeda cuplikan':'Putar cuplikan');b.setAttribute('aria-pressed',String(playing));}
 function updateTrailer(){if(document.hidden||motion()||!trailerInView||trailerUserPaused)trailer.pause();else trailer.play().catch(()=>{});}
 trailer.addEventListener('play',trailerState);trailer.addEventListener('pause',trailerState);
 trailer.addEventListener('error',()=>{$('videoPlayButton').disabled=true;$('videoPlayLabel').textContent='Cuplikan belum tersedia';},true);
 $('videoPlayButton').addEventListener('click',()=>{if(trailer.paused){trailerUserPaused=false;trailer.play().catch(()=>toast('Cuplikan belum bisa diputar. Permainan tetap siap.'));}else{trailerUserPaused=true;trailer.pause();}});
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{trailerInView=entries[0].isIntersecting;updateTrailer();},{threshold:.25}).observe(trailer);
 document.addEventListener('visibilitychange',()=>{updateTrailer();if(document.hidden&&ui.stage==='drawing')skip();syncResultMedia();});

 document.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  const typing=event.target.closest?.('input,select,textarea,[contenteditable]');if(typing)return;
  if(event.key.toLowerCase()==='m'&&!event.repeat){event.preventDefault();toggleMute();return;}
  const open=document.querySelector('dialog[open]');
  if(ui.stage==='home'&&!open){
   if((event.key==='ArrowLeft'||event.key==='ArrowRight')&&(event.target===document.body||event.target.closest('#deck'))){event.preventDefault();moveDeck(event.key==='ArrowRight'?1:-1);return;}
   if((event.code==='Space'||event.key==='Enter')&&!event.repeat&&!event.target.closest('button,a,summary,video,[role="button"]')){event.preventDefault();prepare();}
  }else if(open?.id==='resultDialog'&&ui.stage==='result'&&(event.key==='ArrowLeft'||event.key==='ArrowRight')&&!event.target.closest('button')){event.preventDefault();showView(event.key==='ArrowRight'?'poster':'card',{user:true});}
 });
 const unlockOnce=()=>audio.unlock();document.addEventListener('click',unlockOnce,{once:true,capture:true});document.addEventListener('keydown',unlockOnce,{once:true,capture:true});
 window.addEventListener('gamysuf:audio',event=>{audio.setMuted(Boolean(event.detail?.muted));soundState();});window.addEventListener('gamysuf:audio-query',soundState);
 window.addEventListener('online',()=>{if(!ui.busy&&ui.stage==='home'&&!ui.request)refresh();});window.addEventListener('offline',()=>connection('Koneksi terputus. Kartu yang sudah terbuka tetap tersimpan.'));
 window.HeartGame={context:()=>({state:ui.state,host:ui.host,mode:ui.mode,pick:ui.pick,busy:ui.busy||ui.modeBusy,stage:ui.stage,dealing:ui.dealing,reduced:motion(),demo:demo()}),setMode,selectCard,card:serviceId=>cardOf(ui.host,serviceId),setDealing:value=>{ui.dealing=Boolean(value);render();},chooseDeal:slot=>{if(!Number.isInteger(slot)||slot<0||slot>6)return;ui.dealing=false;ui.dealtSlot=slot;render();prepare();},backHome:()=>{if(ui.busy||ui.stage!=='home'||ui.dealing)return;ui.hostChosen=false;ui.dealtSlot=null;document.body.dataset.journey='home';render();window.scrollTo({top:0,behavior:'smooth'});},music:()=>{audio.setMuted(false);audio.unlock();soundState();},audioStatus:()=>({muted:audio.muted,paused:audio.bgm.paused,time:audio.bgm.currentTime}),unlock:()=>audio.unlock(),shuffle:()=>audio.shuffle(),tick:()=>audio.tick(),notify:toast};
 soundState();themeState();renderStaffMode();refresh();
 setInterval(()=>{if(!document.hidden&&!ui.busy&&ui.stage==='home'&&!document.querySelector('dialog[open]')&&!ui.request)refresh();},20000);
})();
