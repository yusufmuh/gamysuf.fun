'use strict';

// Market-In 6.0 landing for booth QR codes. Static copy stays readable when a game API is unavailable.
(()=>{
 const $=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const EV=window.GamysufEvent;
 const PAGE='/market-in';
 const TIERS=[
  ['bundling','Legendaris','Bundling paket','legendary'],
  ['collab','Epik','Kolab karakter','epic'],
  ['voucher','Langka','Voucher belanja','rare'],
  ['product','Umum','Beauty pick','common']
 ];
 const storage={get(key){try{return localStorage.getItem(key);}catch{return null;}}};
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const setMotion=()=>{document.documentElement.dataset.motion=reducedMotion.matches||storage.get('gamysuf-reduced-motion')==='1'?'reduce':'full';};
 setMotion();
 reducedMotion.addEventListener('change',setMotion);

 async function getJson(route){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(route,{credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   return await response.json();
  }finally{clearTimeout(timeout);}
 }
 const text=(id,value)=>{if(value&&$(id))$(id).textContent=value;};

 function renderEvent(event){
  const state=EV.status(event);
  if(state.label){$('miStatus').textContent=state.label;$('miStatus').dataset.phase=state.phase;$('miStatus').hidden=false;}
  text('miDates',EV.dayRange(event));
  text('miPlace',[event.place,event.city].filter(Boolean).join(', '));
  text('miSummary',event.summary);
  text('miCosplay',event.cosplay);
  if(Array.isArray(event.schedule)&&event.schedule.length){
   $('miDays').innerHTML=event.schedule.map(day=>{
    const [,month,date]=String(day.date).split('-');
    const monthName=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][Number(month)-1]||'';
    return `<li class="mi-day"><p class="mi-day-date"><b>${esc(date)}</b><span>${esc(monthName)}</span></p><div><h3>${esc(day.label)}</h3><p class="mi-day-hosts">${(day.hosts||[]).map(host=>`<span>${esc(host)}</span>`).join('')}</p><p>${esc(day.note)}</p></div></li>`;
   }).join('');
  }
 }

 function renderGames(members){
  $('miGames').innerHTML=members.map(game=>`<article class="mi-game" style="--accent:${esc(game.accent||'#E62B5E')}">
   <a class="mi-game-cover" href="${esc(game.url)}" tabindex="-1" aria-hidden="true">${game.cover?`<img src="${esc(game.cover)}" alt="" width="1200" height="675" loading="lazy">`:''}</a>
   <div class="mi-game-body">
    <p class="mi-game-kicker">${esc(EV.kicker(game))}</p>
    <h3>${esc(game.title)}</h3>
    <p>${esc(game.description||game.tagline||'')}</p>
    <ol class="mi-game-steps">${(game.quickStart||game.howTo||[]).slice(0,3).map(step=>`<li>${esc(step)}</li>`).join('')}</ol>
    <a class="btn btn-primary" href="${esc(game.url)}">Main ${esc(EV.shortTitle(game.title))}</a>
   </div>
  </article>`).join('');
  $('miGames').setAttribute('aria-busy','false');
 }

 function fallbackGames(){
  $('miGames').innerHTML=[['Bipy Gacha Pop','/g/gacha/','Mesin gacha satu tap untuk hadiah beauty dan voucher belanja.','#39A7E5'],['Bipy Heart Parade','/g/heart/','Kartu fanservice Zoro & Sanji bergaya poster bounty.','#D45778']]
   .map(([title,url,copy,accent])=>`<article class="mi-game" style="--accent:${accent}"><div class="mi-game-body"><h3>${esc(title)}</h3><p>${esc(copy)}</p><a class="btn btn-primary" href="${url}">Main ${esc(EV.shortTitle(title))}</a></div></article>`).join('');
  $('miGames').setAttribute('aria-busy','false');
 }

 function fallback(id,host,message){
  $(host).setAttribute('aria-busy','false');
  $(host).hidden=true;
  $(id).hidden=false;
  $(id).textContent=message;
 }

 async function loadHeart(){
  try{
   const state=await getJson('/g/heart/api/state');
   const cards=(state.cards||[]).filter(card=>card&&(card.art||card.image));
   if(!cards.length)throw new Error('Kartu kosong');
   $('heartCards').innerHTML=cards.map(card=>{
    const [moment,host]=String(card.name||'').split(' · ');
    return `<article class="mi-card" data-rarity="${esc(card.rarity||'')}"><div class="mi-card-art"><img src="${esc(card.art||card.image)}" alt="${esc(card.imageAlt||card.name)}" width="320" height="480" loading="lazy" decoding="async"></div><div class="mi-card-meta">${card.cardNo?`<span>${esc(card.cardNo)}</span>`:''}${card.rarity?`<b>${esc(card.rarity)}</b>`:''}</div><h3>${esc(moment||card.name)}</h3>${host?`<p>${esc(host)}</p>`:''}</article>`;
   }).join('');
   $('heartCards').setAttribute('aria-busy','false');
  }catch{fallback('heartFallback','heartCards','Pratinjau kartu belum bisa dimuat. Semua kartu tetap bisa dilihat langsung di Heart Parade.');}
 }

 async function loadGacha(){
  try{
   const state=await getJson('/g/gacha/api/state');
   const prizes=(state.prizes||[]).filter(prize=>prize&&prize.enabled!==false&&prize.tier!=='empty');
   const known=new Set(TIERS.map(([tier])=>tier));
   const groups=[...TIERS,...[...new Set(prizes.map(prize=>prize.tier).filter(tier=>!known.has(tier)))].map(tier=>[tier,'Hadiah',tier,'common'])]
    .map(([tier,rank,label,rarity])=>({tier,rank,label,rarity,items:prizes.filter(prize=>prize.tier===tier)})).filter(group=>group.items.length);
   if(!groups.length)throw new Error('Hadiah kosong');
   $('gachaTiers').innerHTML=groups.map(group=>`<section class="mi-tier ${esc(group.rarity)}" aria-label="${esc(`${group.rank} · ${group.label}`)}">
    <header><span class="mi-tier-rank">${esc(group.rank)}</span><h3>${esc(group.label)}</h3><small>${group.items.length} jenis</small></header>
    <ul>${group.items.map(prize=>`<li>${prize.image?`<img src="${esc(prize.image)}" alt="" width="56" height="56" loading="lazy" decoding="async">`:''}<span>${esc(prize.name||prize.fullName)}</span></li>`).join('')}</ul>
   </section>`).join('');
   $('gachaTiers').setAttribute('aria-busy','false');
  }catch{fallback('gachaFallback','gachaTiers','Daftar hadiah belum bisa dimuat. Isi mesin tetap terlihat lengkap di dalam Gacha Pop.');}
 }

 /* Jingle hanya diputar setelah pengunjung menekan tombol. */
 let jingle=null;
 function setJingle(playing){
  $('jingle').setAttribute('aria-pressed',String(playing));
  $('jingle').classList.toggle('playing',playing);
  $('jingleLabel').textContent=playing?'Hentikan jingle':'Putar jingle Bpedia';
 }
 $('jingle').addEventListener('click',async()=>{
  if(!jingle){
   jingle=new Audio('/hub/assets/audio/bpedia-jingle.mp3?v=1.6.0');
   jingle.preload='auto';
   jingle.addEventListener('ended',()=>{jingle.currentTime=0;setJingle(false);});
   jingle.addEventListener('pause',()=>setJingle(false));
   jingle.addEventListener('playing',()=>setJingle(true));
  }
  if(!jingle.paused){jingle.pause();jingle.currentTime=0;return;}
  try{await jingle.play();}
  catch{$('jingleLabel').textContent='Jingle belum bisa diputar';setTimeout(()=>setJingle(false),2400);}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&jingle&&!jingle.paused)jingle.pause();});

 (async()=>{
  try{
   const catalog=await getJson('/hub-api/catalog');
   const events=Object.values(catalog.events||{});
   const event=events.find(item=>item.page===PAGE)||events[0];
   const members=event?(event.games||[]).map(slug=>(catalog.games||[]).find(game=>game.slug===slug)).filter(Boolean):[];
   if(event)renderEvent(event);
   if(members.length)renderGames(members);else fallbackGames();
   const visible=new Set(members.map(game=>game.slug));
   document.querySelectorAll('[data-play]').forEach(link=>{link.hidden=!visible.has(link.dataset.play);});
   const jobs=[];
   if(visible.has('heart'))jobs.push(loadHeart());else $('kartu').hidden=true;
   if(visible.has('gacha'))jobs.push(loadGacha());else $('hadiah').hidden=true;
   await Promise.all(jobs);
  }catch{
   fallbackGames();
   await Promise.all([loadHeart(),loadGacha()]);
  }finally{
   document.body.dataset.ready='1';
  }
 })();
})();
