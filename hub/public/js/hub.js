'use strict';

(()=>{
 const $=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const AVATARS=['wave','peek','wink','bag','stand','heart'];
 const AVATAR_STYLE={
  wave:{file:'wave',name:'Bipy Original',tag:'Si paling ramah',detail:'Satu sapaan kecil untuk memulai petualangan besar.'},
  peek:{file:'explorer',name:'Bipy Explorer',tag:'Selalu penasaran',detail:'Peta siap, tas terisi. Arena baru menunggu untuk dijelajahi.'},
  wink:{file:'star',name:'Bipy Star',tag:'Bersinar di arena',detail:'Jubah kecil, bintang besar. Bawa ceriamu ke setiap permainan.'},
  bag:{file:'collector',name:'Bipy Collector',tag:'Pemburu koleksi',detail:'Selalu ada tempat untuk satu kartu baru di dalam koleksi.'},
  stand:{file:'stand',name:'Bipy Classic',tag:'Santai dan percaya diri',detail:'Gaya khas Bipy. Siap menemanimu, dari putaran pertama.'},
  heart:{file:'champion',name:'Bipy Champion',tag:'Semangat pemain',detail:'Kontroler di tangan, senyum di wajah. Waktunya masuk arena.'}
 };
 const avatarSrc=name=>`/hub/assets/avatars/character-${(AVATAR_STYLE[name]||AVATAR_STYLE.wave).file}.png?v=1.2.0`;
 const RARITY={legendary:'Legendaris',epic:'Epik',rare:'Langka',common:'Umum'};
 const number=value=>Number(value||0).toLocaleString('id-ID');
 const storage={
  get(key){try{return localStorage.getItem(key);}catch{return null;}},
  set(key,value){try{localStorage.setItem(key,value);}catch{/* Private browsing can deny storage. The server profile still works. */}},
  remove(key){try{localStorage.removeItem(key);}catch{/* Optional UI preference only. */}}
 };
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const setMotion=()=>{
  const reduced=reducedMotion.matches||storage.get('gamysuf-reduced-motion')==='1';
  document.documentElement.dataset.motion=reduced?'reduce':'full';
  $('motionToggle').setAttribute('aria-pressed',String(reduced));
  $('motionToggle').textContent=reduced?'Animasi dashboard dikurangi':'Kurangi animasi dashboard';
 };
 setMotion();
 reducedMotion.addEventListener('change',setMotion);
 const BADGE_ICONS={
  'first-play':'<path d="M5 19l4-4M9 15l10-10M14 5h5v5"/>',
  'tri-arena':'<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="8" width="5" height="12" rx="1.5"/><rect x="17" y="12" width="4" height="8" rx="1.5"/>',
  'collector-5':'<rect x="4" y="3" width="12" height="16" rx="2"/><path d="M8 21h10a2 2 0 0 0 2-2V7"/>',
  'collector-15':'<rect x="3" y="5" width="10" height="14" rx="2"/><rect x="11" y="3" width="10" height="14" rx="2"/>',
  'collector-all':'<path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 17l8 4 8-4"/>',
  'lucky':'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  'fan':'<path d="M12 20s-7-4.4-7-9.6A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>',
  'streak-3':'<path d="M12 21c3.9 0 6.5-2.6 6.5-6.3 0-3.2-2-5.2-3.6-7-.4 1.8-1.3 2.8-2.4 3.2.5-3-.8-5.9-3.5-7.4-.1 2.9-1.6 4.6-3 6.3C4.6 11.1 5.5 12.9 5.5 14.7 5.5 18.4 8.1 21 12 21z"/>',
  'streak-7':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  'marathon':'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2h4"/>',
  'mission-master':'<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>'
 };
 const TOAST_ICONS={
  xp:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  streak:BADGE_ICONS['streak-3'],
  card:BADGE_ICONS['collector-5'],
  mission:BADGE_ICONS['mission-master'],
  badge:BADGE_ICONS.lucky,
  level:'<path d="M12 19V5M5 12l7-7 7 7"/>'
 };
 const svg=(paths,extra='')=>`<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${paths}</svg>`;

 const store={catalog:null,me:null,album:null,boards:{},range:'week',featured:0,cycle:null,lastFocus:null};

 async function api(route,body){
  const options={headers:{'Content-Type':'application/json','x-gamysuf-client':'hub'},credentials:'same-origin'};
  if(body!==undefined){options.method='POST';options.body=JSON.stringify(body);}
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  let response;
  try{response=await fetch(route,{...options,signal:controller.signal});}
  catch(error){throw new Error(error.name==='AbortError'?'Server belum merespons. Coba lagi sebentar.':'Koneksi terputus. Periksa internet lalu coba lagi.');}
  finally{clearTimeout(timeout);}
  let output;
  try{output=await response.json();}catch{output={error:'Respons server tidak terbaca.'};}
  if(!response.ok)throw Object.assign(new Error(output.error||'Permintaan gagal.'),{status:response.status});
  return output;
 }

 const games=()=>[...(store.catalog?.games||[]),...(store.catalog?.custom||[])];
 const EV=window.GamysufEvent;
 const SPARKLE='<path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z"/>';
 const eventList=()=>Object.values(store.catalog?.events||{}).map(event=>({...event,members:(event.games||[]).map(slug=>games().find(game=>game.slug===slug)).filter(Boolean)})).filter(event=>event.members.length);
 const primaryEvent=()=>eventList()[0]||null;
 const linkAttrs=game=>game.external?' target="_blank" rel="noopener"':'';
 const cardsOwnedIn=slug=>(store.me?.cards||[]).filter(card=>card.game===slug).length;

 /* ── Hero: kabinet game unggulan ─────────────────── */
 function renderHero(){
  const catalog=store.catalog;
  $('heroGameCount').textContent=games().length;
  $('heroCardCount').textContent=catalog.totals.cards;
  $('statGames').textContent=games().length;
  $('statCards').textContent=number(catalog.totals.cards);
  $('statPlayers').textContent=number(catalog.totals.players);
  $('versionTag').textContent=`v${catalog.version}`;
  const event=primaryEvent();
  $('newArena').hidden=!event;
  if(event){
   $('newArenaKicker').textContent=`${event.title} · ${event.dates}`.toUpperCase();
   $('newArenaText').textContent=event.teaser||event.headline;
  }
  const list=games().filter(game=>game.cover);
  $('cabinetScreen').innerHTML=list.map((game,index)=>`<img src="${esc(game.cover)}" alt="Cuplikan ${esc(game.title)}" data-index="${index}" loading="${index?'lazy':'eager'}">`).join('');
  $('cabinetDots').innerHTML=list.map((game,index)=>`<button type="button" aria-pressed="false" aria-label="Tampilkan ${esc(game.title)}" data-feature="${index}"></button>`).join('');
  const featured=Math.max(0,list.findIndex(game=>game.slug===catalog.settings.featured));
  feature(featured);
  clearInterval(store.cycle);
  const recent=games().find(game=>game.slug===storage.get('gamysuf-last-game'));
  if(recent){$('resumeGame').hidden=false;$('resumeGame').href=recent.url;$('resumeGame').textContent=`Main lagi: ${recent.title} →`;}
  if(catalog.settings.announcement){
   $('announce').hidden=false;
   $('announceText').textContent=catalog.settings.announcement;
   $('announceLink').hidden=!catalog.settings.announcementLink;
   $('announceLink').href=catalog.settings.announcementLink||'#';
  }
 }

 function feature(index){
  const list=games().filter(game=>game.cover);
  const game=list[index];
  if(!game)return;
  store.featured=index;
  document.querySelectorAll('#cabinetScreen img').forEach(image=>image.classList.toggle('on',Number(image.dataset.index)===index));
  document.querySelectorAll('#cabinetDots button').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.feature)===index)));
  $('cabinetEvent').textContent=(game.event||'').toUpperCase();
  $('cabinetTitle').textContent=game.title;
  $('cabinetTagline').textContent=game.tagline||'';
  for(const link of [$('cabinetPlay'),$('heroPlay')]){
   link.href=game.url;
   link.target=game.external?'_blank':'';
   link.rel=game.external?'noopener':'';
  }
 }

 /* ── Event booth: beberapa game berbeda dalam satu event ── */
 function renderEvent(){
  const event=primaryEvent();
  const section=$('market-in');
  section.hidden=!event;
  if(!event){section.innerHTML='';return;}
  const state=EV.status(event);
  const panels=event.members.map(game=>`<article class="event-game" style="--accent:${esc(game.accent||'#E62B5E')}">
   <a class="event-game-cover" href="${esc(game.url)}" tabindex="-1" aria-hidden="true"${linkAttrs(game)}>${game.cover?`<img src="${esc(game.cover)}" alt="" loading="lazy" width="1200" height="675">`:''}</a>
   <div class="event-game-body">
    <p class="event-game-kicker">${esc(EV.kicker(game))}</p>
    <h3>${esc(game.title)}</h3>
    <p class="event-game-tagline">${esc(game.tagline||game.description||'')}</p>
    <ol class="event-steps">${(game.quickStart||game.howTo||[]).slice(0,3).map(step=>`<li>${esc(step)}</li>`).join('')}</ol>
    <div class="event-game-actions"><a class="btn btn-primary" href="${esc(game.url)}"${linkAttrs(game)}>Main ${esc(EV.shortTitle(game.title))}</a><button class="btn btn-ghost" type="button" data-howto="${esc(game.slug)}" aria-label="Cara main ${esc(game.title)}">Cara main</button></div>
   </div>
  </article>`).join('');
  const staff=event.members.filter(game=>game.staffUrl);
  section.innerHTML=`<div class="event-shell">
   <div class="event-intro">
    <div class="event-copy">
     <p class="event-eyebrow">${state.label?`<span class="event-status" data-phase="${state.phase}">${esc(state.label)}</span>`:''}<span>Event booth Bpedia</span></p>
     <h2 id="eventHubTitle">${esc(event.title)}. <em>${esc(event.headline)}</em></h2>
     <p class="event-summary">${esc(event.summary)}</p>
    </div>
    ${event.logo?`<img class="event-logo" src="${esc(event.logo)}" alt="Logo ${esc(event.title)}" width="600" height="226" loading="lazy">`:''}
   </div>
   <dl class="event-facts"><div><dt>Tanggal</dt><dd>${esc(EV.dayRange(event))}</dd></div><div><dt>Lokasi</dt><dd>${esc([event.place,event.city].filter(Boolean).join(', '))}</dd></div><div><dt>Di booth</dt><dd>${event.members.length} game berbeda · 1 album</dd></div></dl>
   ${event.cosplay?`<p class="event-ribbon">${svg(SPARKLE)}<span>${esc(event.cosplay)}</span>${svg(SPARKLE)}</p>`:''}
   <div class="event-games">${panels}</div>
   <footer class="event-foot">
    ${event.page?`<a class="event-page-link" href="${esc(event.page)}">Jadwal cosplayer &amp; cara dapat tiket booth<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg></a>`:''}
    ${staff.length?`<p class="event-staff"><span>Untuk petugas booth</span>${staff.map(game=>`<a href="${esc(game.staffUrl)}">Dashboard ${esc(EV.shortTitle(game.title))}</a>`).join('')}</p>`:''}
   </footer>
  </div>`;
 }

 /* ── Profil, misi, streak, lencana ───────────────── */
 function renderMe(){
  const me=store.me;
  const name=me.nickname||`Tamu #${me.tag}`;
  const progress=Math.round(me.levelInto/me.levelNeed*100);
  $('chipAvatar').src=avatarSrc(me.avatar);
  $('chipName').textContent=name;
  $('chipLevel').textContent=`Level ${me.level}`;
  $('chipXpBar').style.width=`${progress}%`;
  $('chipStreakCount').textContent=me.streak.count;
  $('chipStreak').classList.toggle('cold',!me.streak.playedToday);
  $('profileAvatar').src=avatarSrc(me.avatar);
  $('profileLevel').textContent=me.level;
  $('levelRing').style.setProperty('--p',progress);
  $('profileName').textContent=name;
  $('profileXp').textContent=`${number(me.levelInto)} / ${number(me.levelNeed)} XP menuju level ${me.level+1} · total ${number(me.xp)} XP`;
  $('profileXpBar').style.width=`${progress}%`;
  $('profilePlays').textContent=number(me.plays);
  $('profileCards').textContent=me.cards.length;
  $('profileBadges').textContent=me.badges.filter(badge=>badge.unlockedAt).length;
  $('missionList').innerHTML=me.missions.map(mission=>`<li class="mission ${mission.done?'done':''}"><span class="mission-check">${svg('<path d="M5 12l5 5 9-10"/>')}</span><div><b>${esc(mission.title)}</b><div class="bar"><i style="width:${Math.round(mission.progress/mission.goal*100)}%"></i></div><small>${mission.progress} / ${mission.goal}</small></div><span class="xp-chip">${mission.done?'Selesai':`+${mission.xp} XP`}</span></li>`).join('');
  $('capNote').textContent=me.dailyCapLeft>0?`Sisa ${me.dailyCapLeft} permainan ber-XP hari ini (batas 60 agar peringkat adil).`:'Batas XP hari ini tercapai. Tetap main untuk melengkapi album!';
  $('streakCount').textContent=me.streak.count;
  $('streakBest').textContent=me.streak.best;
  $('flame').classList.toggle('lit',me.streak.playedToday);
  $('streakNote').textContent=me.streak.playedToday?'Streak aman hari ini. Kembali besok untuk menambah api!':me.streak.count?'Main hari ini supaya streak tidak padam. Bonus +20 XP menunggu.':'Main hari ini untuk menyalakan streak dan dapat +20 XP bonus harian.';
  const lit=Math.min(7,me.streak.count);
  $('streakTrack').innerHTML=Array.from({length:7},(_,index)=>`<i class="${index<lit?'on':''}"></i>`).join('');
  const unlocked=me.badges.filter(badge=>badge.unlockedAt).length;
  $('badgeCount').textContent=`${unlocked} / ${me.badges.length}`;
  $('badgeList').innerHTML=me.badges.map(badge=>`<li class="badge ${badge.unlockedAt?'on':''}" title="${esc(badge.detail)}"><span class="badge-icon">${svg(BADGE_ICONS[badge.id]||BADGE_ICONS.lucky)}</span><b>${esc(badge.name)}</b><small>${esc(badge.detail)}</small></li>`).join('');
 }

 /* ── Kartu game + grup event ─────────────────────── */
 function progressOf(game){
  const owned=cardsOwnedIn(game.slug);
  const plays=store.me?.playsByGame?.[game.slug]||0;
  return game.builtin?`${owned}/${game.cards} kartu · ${plays}x main`:'Game tambahan';
 }
 const gameActions=game=>`<div class="game-actions"><button class="btn btn-ghost btn-small" type="button" data-howto="${esc(game.slug)}" aria-label="Cara main ${esc(game.title)}">Cara main</button><a class="btn btn-primary btn-small" href="${esc(game.url)}" aria-label="Main ${esc(game.title)}"${linkAttrs(game)}>Main sekarang</a></div>`;
 const gameCover=(game,badge)=>`<div class="game-cover">${game.cover?`<img src="${esc(game.cover)}" alt="Cuplikan ${esc(game.title)}" loading="lazy">`:''}<span class="game-badge">${esc(badge.toUpperCase())}</span><span class="game-progress">${esc(progressOf(game))}</span></div>`;
 const gameCard=game=>`<article class="game-card" style="--accent:${esc(game.accent||'#E62B5E')}">
   ${gameCover(game,game.event||'Arena baru')}
   <div class="game-body"><h3>${esc(game.title)}</h3><p class="game-mech">${esc(game.mechanic||'')}</p><p>${esc(game.description||game.tagline||'')}</p>${gameActions(game)}</div>
  </article>`;
 function eventTile(event){
  const state=EV.status(event);
  return `<article class="game-card event-tile" aria-labelledby="tile-${esc(event.id)}">
   <header class="event-tile-head">
    ${event.logo?`<img src="${esc(event.logo)}" alt="" width="600" height="226" loading="lazy">`:''}
    <div><p class="event-tile-kicker">${esc([state.label,event.dates].filter(Boolean).join(' · '))}</p><h3 id="tile-${esc(event.id)}">${esc(event.title)}</h3><p>${esc(event.place)} · ${event.members.length} game berbeda, satu booth</p></div>
    ${event.page?`<a class="btn btn-ghost btn-small" href="${esc(event.page)}">Info event</a>`:''}
   </header>
   <div class="event-tile-games">${event.members.map(game=>`<section class="event-tile-game" style="--accent:${esc(game.accent||'#E62B5E')}" aria-label="${esc(game.title)}">
    ${gameCover(game,EV.kicker(game))}
    <div class="game-body"><h4>${esc(game.title)}</h4><p class="game-mech">${esc(game.mechanic||'')}</p><p>${esc(game.tagline||game.description||'')}</p>${gameActions(game)}</div>
   </section>`).join('')}</div>
  </article>`;
 }
 function renderGames(){
  // Grup event tampil pertama sebagai satu tile ganda; setiap game di dalamnya tetap punya tombol main sendiri.
  const groups=eventList().filter(event=>event.members.length>1);
  const grouped=new Set(groups.flatMap(event=>event.members.map(game=>game.slug)));
  $('gameGrid').innerHTML=[...groups.map(eventTile),...games().filter(game=>!grouped.has(game.slug)).map(gameCard)].join('');
  $('gameGrid').classList.toggle('event-offset',groups.length%2===1);
  $('gameGrid').setAttribute('aria-busy','false');
 }

 /* ── Album ───────────────────────────────────────── */
 const miniCard=card=>`<div class="mini-card ${card.rarity} ${card.owned?'':'locked'}" title="${esc(card.owned?`${card.name} · ${RARITY[card.rarity]}`:`Belum ditemukan · ${RARITY[card.rarity]}`)}"><div>${card.image?`<img src="${esc(card.image)}" alt="" loading="lazy">`:''}<span>${esc(card.owned?card.name:'???')}</span></div>${card.count>1?`<em>×${card.count}</em>`:''}</div>`;

 function renderAlbum(){
  const album=store.album;
  $('albumOwned').textContent=album.owned;
  $('albumTotal').textContent=album.total;
  $('albumBar').style.width=`${album.total?Math.round(album.owned/album.total*100):0}%`;
  window.GamysufAlbumSlider.render(album);
  $('albumTabs').innerHTML=[`<button class="tab active" type="button" role="tab" aria-selected="true" data-album="all">Semua</button>`,...album.games.map(game=>`<button class="tab" type="button" role="tab" aria-selected="false" data-album="${esc(game.slug)}">${esc(game.title)}</button>`)].join('');
  renderAlbumGrid('all');
 }

 function renderAlbumGrid(filter){
  const cards=store.album.games.filter(game=>filter==='all'||game.slug===filter).flatMap(game=>game.cards).sort((a,b)=>Number(b.owned)-Number(a.owned));
  $('albumGrid').innerHTML=cards.map(miniCard).join('');
  document.querySelectorAll('#albumTabs .tab').forEach(tab=>{tab.classList.toggle('active',tab.dataset.album===filter);tab.setAttribute('aria-selected',String(tab.dataset.album===filter));});
 }

 /* ── Papan peringkat ─────────────────────────────── */
 function renderBoard(){
  const board=store.boards[store.range];
  if(!board)return;
  const [first,second,third,...rest]=board.top;
  const slot=(row,cls)=>row?`<div class="podium-slot ${cls}"><span class="rank">${row.rank}</span><img src="${avatarSrc(row.avatar)}" alt=""><b>${esc(row.name)}</b><small>Lv ${row.level} · ${number(row.score)} XP</small></div>`:'<div></div>';
  $('podium').innerHTML=board.top.length?slot(second,'second')+slot(first,'first')+slot(third,'third'):'<p class="empty" style="grid-column:1/-1">Belum ada pemain di periode ini. Jadilah yang pertama!</p>';
  $('board').innerHTML=rest.map(row=>`<li class="${row.you?'you':''}"><span class="pos">${row.rank}</span><img src="${avatarSrc(row.avatar)}" alt=""><div><b>${esc(row.name)}${row.you?' (kamu)':''}</b><small>Level ${row.level} · ${row.cards} kartu</small></div><span class="score">${number(row.score)}</span></li>`).join('');
  $('youRow').hidden=!board.you;
  if(board.you)$('youRow').textContent=`Posisimu: #${board.you.rank} dari ${number(board.players)} pemain · ${number(board.you.score)} XP`;
 }

 async function loadBoard(range){
  store.range=range;
  document.querySelectorAll('.board-panel .tab').forEach(tab=>{const active=tab.dataset.range===range;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));});
  store.boards[range]=await api(`/hub-api/leaderboard?range=${range}`);
  renderBoard();
 }

 /* ── Modal ───────────────────────────────────────── */
 function openModal(id){
  if(!store.me)return;
  store.lastFocus=document.activeElement;
  const modal=$(id);
  modal.hidden=false;
  document.body.classList.add('modal-open');
  for(const element of document.body.children){if(element!==modal&&!element.classList.contains('toasts')&&element.tagName!=='SCRIPT')element.inert=true;}
  requestAnimationFrame(()=>{if(!modal.hidden)modal.classList.add('open');});
  modal.setAttribute('tabindex','-1');
  // Focus a non-input target first so mobile keyboards don't hide the welcome screen.
  (modal.querySelector('[data-close]')||modal).focus({preventScroll:true});
 }
 function closeModal(modal){
  modal.classList.remove('open');
  modal.hidden=true;
  document.body.classList.remove('modal-open');
  for(const element of document.body.children)element.inert=false;
  store.lastFocus?.focus?.();
 }

 function avatarPicker(container,selected){
  const active=AVATARS.includes(selected)?selected:'wave';
  $(container).innerHTML=`<section class="avatar-stage" aria-label="Pratinjau karakter">
   <span class="avatar-edition">BPEDIA ORIGINALS</span><div class="avatar-display"><div class="avatar-halo" aria-hidden="true"></div><img class="avatar-fullbody onboard-bipy" src="${avatarSrc(active)}" alt="${AVATAR_STYLE[active].name}, tampak seluruh tubuh" width="320" height="480"><div class="avatar-plinth" aria-hidden="true"></div></div>
   <div class="avatar-caption" aria-live="polite"><span class="avatar-tag"></span><h3 class="avatar-name"></h3><p class="avatar-description"></p></div>
  </section><section class="avatar-selection"><div class="avatar-selection-heading"><span>PILIH KARAKTER</span><span>06 VARIAN</span></div><div class="avatar-roster" role="radiogroup" aria-label="Pilih avatar">
   ${AVATARS.map((name,index)=>`<button type="button" role="radio" tabindex="${name===active?0:-1}" aria-checked="${name===active}" data-avatar="${name}" aria-label="${AVATAR_STYLE[name].name}, ${AVATAR_STYLE[name].tag}"><span class="avatar-number">0${index+1}</span><span class="avatar-selected" aria-hidden="true">✓</span><img src="${avatarSrc(name)}" alt="" width="110" height="144"><span class="avatar-card-name">${AVATAR_STYLE[name].name.replace('Bipy ','')}</span></button>`).join('')}
  </div><p class="avatar-help">Pilih gayamu. Avatar bisa diganti kapan saja lewat profil.</p></section>`;
  selectAvatar($(container),active,false);
 }
 function selectAvatar(container,name,animate=true){
  const style=AVATAR_STYLE[name];
  if(!style)return;
  container.querySelectorAll('[data-avatar]').forEach(button=>{const selected=button.dataset.avatar===name;button.setAttribute('aria-checked',String(selected));button.tabIndex=selected?0:-1;});
  const preview=container.querySelector('.avatar-fullbody');
  preview.src=avatarSrc(name);preview.alt=`${style.name}, tampak seluruh tubuh`;
  container.querySelector('.avatar-tag').textContent=style.tag;
  container.querySelector('.avatar-name').textContent=style.name;
  container.querySelector('.avatar-description').textContent=style.detail;
  if(animate&&!reducedMotion.matches&&document.documentElement.dataset.motion!=='reduce')preview.animate([{opacity:.4,transform:'translateY(8px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:260,easing:'ease-out'});
 }
 const pickedAvatar=container=>$(container).querySelector('[aria-checked="true"]')?.dataset.avatar||'wave';

 function openGame(slug){
  const game=games().find(item=>item.slug===slug);
  if(!game)return;
  $('gameModalCover').src=game.cover||'/hub/assets/brand/icon-512.png';
  $('gameModalCover').alt=`Cuplikan ${game.title}`;
  $('gameModalEvent').textContent=`${(game.event||'').toUpperCase()}${game.mechanic?' · '+game.mechanic.toUpperCase():''}`;
  $('gameModalTitle').textContent=game.title;
  $('gameModalDesc').textContent=game.description||game.tagline||'';
  $('gameModalSteps').innerHTML=(game.howTo||[]).map(step=>`<li>${esc(step)}</li>`).join('')||'<li>Buka game lalu ikuti petunjuk di layar.</li>';
  $('gameModalControls').innerHTML=(game.controls||[]).map(([key,action])=>`<dt>${esc(key)}</dt><dd>${esc(action)}</dd>`).join('')||'<dt>Klik</dt><dd>Ikuti tombol di layar</dd>';
  $('gameModalTips').innerHTML=(game.tips||[]).map(tip=>`<li>${esc(tip)}</li>`).join('')||'<li>Selamat bermain!</li>';
  const play=$('gameModalPlay');
  play.href=game.url;play.target=game.external?'_blank':'';play.rel=game.external?'noopener':'';
  openModal('gameModal');
 }

 function openProfile(){
  const me=store.me;
  if(!me)return;
  $('profileNameInput').value=me.nickname||'';
  avatarPicker('profileAvatars',me.avatar);
  $('recoveryCode').textContent=me.recoveryCode.match(/.{1,8}/g).join('-');
  $('profileError').textContent='';
  $('perGame').innerHTML=(store.catalog?.games||[]).map(game=>`<div><b>${me.playsByGame[game.slug]||0}</b><small>${esc(game.title)}</small></div>`).join('');
  openModal('profileModal');
 }

 /* ── Toast umpan XP ──────────────────────────────── */
 function toast(event){
  const element=document.createElement('div');
  element.className=`toast ${event.type==='level'?'level':''}`;
  element.innerHTML=`<span class="toast-icon">${svg(TOAST_ICONS[event.type]||TOAST_ICONS.xp)}</span><div><b>${esc(event.text)}</b><small>${event.type==='level'?'Selamat!':'Gamysuf Arcade'}</small></div>${event.xp?`<span class="xp">+${event.xp}</span>`:''}`;
  $('toasts').append(element);
  setTimeout(()=>{element.classList.add('leave');setTimeout(()=>element.remove(),400);},4200);
 }
 function showFeed(){
  const key='gamysuf-feed-seen';
  const seen=Number(storage.get(key))||0;
  const events=(store.me?.feed||[]).filter(event=>event.at>seen);
  if(!events.length)return;
  const important=events.filter(event=>event.type!=='xp');
  const xp=events.reduce((sum,event)=>sum+(event.xp||0),0);
  const queue=[...important.slice(-2),{type:'xp',text:'XP baru sejak kunjungan terakhir',xp}].filter(event=>event.type!=='xp'||event.xp>0);
  queue.forEach((event,index)=>setTimeout(()=>toast(event),index*650));
  storage.set(key,String(Math.max(...events.map(event=>event.at))));
 }

 /* ── Hitung mundur misi (tengah malam WIB) ────────── */
 function tickReset(){
  const day=86400000,wib=Date.now()+7*3600000;
  const left=Math.ceil(wib/day)*day-wib;
  const h=String(Math.floor(left/3600000)).padStart(2,'0'),m=String(Math.floor(left%3600000/60000)).padStart(2,'0'),s=String(Math.floor(left%60000/1000)).padStart(2,'0');
  $('missionReset').textContent=`Reset ${h}:${m}:${s}`;
 }

 async function refresh({initial=false}={}){
  const [catalog,me,album]=await Promise.all([initial||!store.catalog?api('/hub-api/catalog'):store.catalog,api('/hub-api/me'),api('/hub-api/album')]);
  store.catalog=catalog;store.me=me;store.album=album;
  if(initial){renderHero();renderEvent();}
  renderMe();renderGames();renderAlbum();
  await loadBoard(store.range);
  showFeed();
  $('connectionNote').hidden=true;
 }

 /* ── Event ───────────────────────────────────────── */
 document.addEventListener('click',async event=>{
  const target=event.target.closest('button,a');
  if(!target)return;
  if(target.tagName==='A'){
   const game=games().find(item=>item.url===target.getAttribute('href'));
   if(game)storage.set('gamysuf-last-game',game.slug);
  }
  if(target.dataset.howto){openGame(target.dataset.howto);return;}
  if(target.dataset.feature){feature(Number(target.dataset.feature));clearInterval(store.cycle);return;}
  if(target.dataset.range){loadBoard(target.dataset.range).catch(()=>{});return;}
  if(target.dataset.album){renderAlbumGrid(target.dataset.album);return;}
  if(target.dataset.avatar){selectAvatar(target.closest('.avatar-picker'),target.dataset.avatar);return;}
  if(target.hasAttribute('data-close')){closeModal(target.closest('.modal'));return;}
 });
 document.querySelectorAll('.modal').forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal&&modal.id!=='onboardModal')closeModal(modal);}));
 document.addEventListener('keydown',event=>{
  const open=document.querySelector('.modal.open');
  if(event.key==='Escape'&&open){closeModal(open);return;}
  if(event.key==='Tab'&&open){
   const nodes=[...open.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]')].filter(node=>node.getClientRects().length&&node.tabIndex>=0);
   const first=nodes[0],last=nodes.at(-1);
   if(!first){event.preventDefault();open.focus();}
   else if(event.shiftKey&&(document.activeElement===first||document.activeElement===open)){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)&&event.target.matches('[role="tab"],[data-feature],[data-avatar]')){
   const targets=[...event.target.parentElement.querySelectorAll('button')];
   const current=targets.indexOf(event.target);
   const step=event.target.dataset.avatar&&['ArrowUp','ArrowDown'].includes(event.key)?3:1;
   const index=event.key==='Home'?0:event.key==='End'?targets.length-1:(current+(['ArrowRight','ArrowDown'].includes(event.key)?step:-step)+targets.length)%targets.length;
   event.preventDefault();targets[index].focus();targets[index].click();
  }
 });
 $('playerChip').addEventListener('click',openProfile);
 $('openProfile').addEventListener('click',openProfile);
 $('openAlbum').addEventListener('click',()=>openModal('albumModal'));
 $('onboardSkip').addEventListener('click',()=>{storage.set('gamysuf-onboarded','1');closeModal($('onboardModal'));});
 $('onboardSave').addEventListener('click',async()=>{
  $('onboardError').textContent='';
  try{
   store.me=await api('/hub-api/me',{nickname:$('nicknameInput').value,avatar:pickedAvatar('onboardAvatars')});
   storage.set('gamysuf-onboarded','1');
   closeModal($('onboardModal'));
   renderMe();
   toast({type:'badge',text:`Selamat datang, ${store.me.nickname}!`,xp:0});
  }catch(error){$('onboardError').textContent=error.message;}
 });
 $('nicknameInput').addEventListener('keydown',event=>{if(event.key==='Enter')$('onboardSave').click();});
 $('profileSave').addEventListener('click',async()=>{
  $('profileError').textContent='';
  try{
   const patch={avatar:pickedAvatar('profileAvatars')};
   if($('profileNameInput').value.trim())patch.nickname=$('profileNameInput').value;
   store.me=await api('/hub-api/me',patch);
   renderMe();await loadBoard(store.range);
   closeModal($('profileModal'));
   toast({type:'badge',text:'Profil tersimpan',xp:0});
  }catch(error){$('profileError').textContent=error.message;}
 });
 $('copyRecovery').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(store.me.recoveryCode);$('copyRecovery').textContent='Tersalin';setTimeout(()=>{$('copyRecovery').textContent='Salin';},1600);}
  catch{$('profileError').textContent='Browser menolak akses clipboard. Salin kode secara manual.';}
 });
 $('restoreButton').addEventListener('click',async()=>{
  $('profileError').textContent='';
  try{
   await api('/hub-api/me/restore',{code:$('restoreInput').value});
   storage.remove('gamysuf-feed-seen');
   location.reload();
  }catch(error){$('profileError').textContent=error.message;}
 });
 function connectionError(message){$('connectionText').textContent=message;$('connectionNote').hidden=false;}
 async function retry(){
  $('retryLoad').disabled=true;
  try{await refresh({initial:!store.catalog});}catch(error){connectionError(error.message);}
  finally{$('retryLoad').disabled=false;}
 }
 $('retryLoad').addEventListener('click',retry);
 $('motionToggle').addEventListener('click',()=>{storage.set('gamysuf-reduced-motion',storage.get('gamysuf-reduced-motion')==='1'?'0':'1');setMotion();});
 addEventListener('offline',()=>connectionError('Kamu sedang offline. Sambungkan internet untuk bermain dan menyimpan progres.'));
 addEventListener('online',retry);
 document.addEventListener('visibilitychange',()=>{
  document.documentElement.dataset.background=String(document.hidden);
  if(!document.hidden&&store.catalog)refresh().catch(error=>connectionError(error.message));
 });
 if('IntersectionObserver' in window){
  const visible=new Map();
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries)visible.set(entry.target.id,entry.isIntersecting?entry.intersectionRatio:0);
   const active=[...visible.entries()].sort((a,b)=>b[1]-a[1])[0];
   if(!active||!active[1])return;
   document.querySelectorAll('.mobile-nav a').forEach(link=>{
    if(link.dataset.section===active[0])link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
   });
  },{rootMargin:'-85px 0px -25% 0px',threshold:[0,.1,.3,.5,.8]});
  document.querySelectorAll('main>section[id]').forEach(section=>observer.observe(section));
 }

 (async()=>{
  try{
   await refresh({initial:true});
   if(new URLSearchParams(location.search).get('profile')==='1')openProfile();
   else if(!store.me.nickname&&!storage.get('gamysuf-onboarded')){avatarPicker('onboardAvatars','wave');openModal('onboardModal');}
  }catch(error){
   connectionError(error.message);
  }finally{
   document.body.dataset.ready='1';
  }
  tickReset();setInterval(tickReset,1000);
 })();
})();
