'use strict';

(()=>{
 const $=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const AVATARS=['wave','peek','wink','bag','stand','heart'];
 const avatarSrc=name=>`/hub/assets/avatars/${AVATARS.includes(name)?name:'wave'}.png`;
 const RARITY={legendary:'Legendaris',epic:'Epik',rare:'Langka',common:'Umum'};
 const number=value=>Number(value||0).toLocaleString('id-ID');
 const pct=(part,whole)=>whole?Math.max(0,Math.min(100,Math.round(part/whole*100))):0;
 const two=value=>String(value).padStart(2,'0');
 const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function ago(at){
  const minutes=Math.max(0,Math.round((Date.now()-at)/60000));
  if(minutes<1)return 'baru saja';
  if(minutes<60)return `${minutes} mnt lalu`;
  if(minutes<1440)return `${Math.round(minutes/60)} jam lalu`;
  return `${Math.round(minutes/1440)} hari lalu`;
 }
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
  const response=await fetch(route,options);
  let output;
  try{output=await response.json();}catch{output={error:'Respons server tidak terbaca.'};}
  if(!response.ok)throw Object.assign(new Error(output.error||'Permintaan gagal.'),{status:response.status});
  return output;
 }

 const games=()=>[...(store.catalog?.games||[]),...(store.catalog?.custom||[])];
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
  const list=games().filter(game=>game.cover);
  $('cabinetScreen').innerHTML=list.map((game,index)=>`<img src="${esc(game.cover)}" alt="Cuplikan ${esc(game.title)}" data-index="${index}" loading="${index?'lazy':'eager'}">`).join('');
  $('cabinetDots').innerHTML=list.map((game,index)=>`<button type="button" role="tab" aria-label="${esc(game.title)}" data-feature="${index}"></button>`).join('');
  const featured=Math.max(0,list.findIndex(game=>game.slug===catalog.settings.featured));
  feature(featured);
  clearInterval(store.cycle);
  if(list.length>1&&!reducedMotion())store.cycle=setInterval(()=>feature((store.featured+1)%list.length),6500);
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
  document.querySelectorAll('#cabinetDots button').forEach(button=>button.setAttribute('aria-selected',String(Number(button.dataset.feature)===index)));
  $('cabinetEvent').textContent=(game.event||'').toUpperCase();
  $('cabinetTitle').textContent=game.title;
  $('cabinetTagline').textContent=game.tagline||'';
  for(const link of [$('cabinetPlay'),$('heroPlay')]){
   link.href=game.url;
   link.target=game.external?'_blank':'';
   link.rel=game.external?'noopener':'';
  }
 }

 /* ── Profil, misi, streak, lencana ───────────────── */
 function renderMe(){
  const me=store.me;
  const name=me.nickname||`Tamu #${me.tag}`;
  const progress=Math.round(me.levelInto/me.levelNeed*100);
  $('chipAvatar').src=avatarSrc(me.avatar);
  $('chipName').textContent=name;
  $('chipLevel').textContent=`Lv ${me.level} · ${me.title}`;
  $('chipXpBar').style.width=`${progress}%`;
  $('chipStreakCount').textContent=me.streak.count;
  $('chipStreak').classList.toggle('cold',!me.streak.playedToday);
  $('profileAvatar').src=avatarSrc(me.avatar);
  $('profileLevel').textContent=me.level;
  $('levelRing').style.setProperty('--p',progress);
  $('profileName').textContent=name;
  $('profileTitle').textContent=me.title;
  $('profileTitle').title=me.nextTitle?`Gelar berikutnya: ${me.nextTitle.title} (level ${me.nextTitle.level})`:'Gelar tertinggi di arcade';
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
  const goal=nextGoal();
  $('badgeList').innerHTML=me.badges.map(badge=>{
   const meter=!badge.unlockedAt&&badge.goal>1?`<span class="badge-meter"><i style="width:${pct(badge.current,badge.goal)}%"></i></span><small class="badge-count">${badge.current}/${badge.goal}</small>`:'';
   return `<li class="badge ${badge.unlockedAt?'on':''} ${goal?.id===badge.id?'near':''}" title="${esc(badge.detail)}"><span class="badge-icon">${svg(BADGE_ICONS[badge.id]||BADGE_ICONS.lucky)}</span><b>${esc(badge.name)}</b><small>${esc(badge.detail)}</small>${meter}</li>`;
  }).join('');
  $('nextGoal').hidden=!goal;
  if(goal)$('nextGoal').innerHTML=`<span class="badge-icon">${svg(BADGE_ICONS[goal.id]||BADGE_ICONS.lucky)}</span><div><small>Target berikutnya · +30 XP</small><b>${esc(goal.name)}</b><div class="bar"><i style="width:${pct(goal.current,goal.goal)}%"></i></div><small>${goal.current}/${goal.goal} · ${esc(goal.detail)}</small></div>`;
  renderTip();
 }

 /* Lencana terkunci yang paling dekat untuk dibuka: memberi pemain satu
    tujuan jelas setiap kali membuka beranda. */
 function nextGoal(){
  const locked=(store.me?.badges||[]).filter(badge=>!badge.unlockedAt&&badge.goal>0);
  return locked.sort((a,b)=>b.current/b.goal-a.current/a.goal||(a.goal-a.current)-(b.goal-b.current))[0]||null;
 }

 /* ── Saran Bipy: game yang paling berguna dimainkan sekarang ── */
 function recommendation(){
  const list=store.catalog?.games||[];
  const me=store.me;
  if(!list.length||!me)return null;
  const missing=game=>Math.max(0,game.cards-cardsOwnedIn(game.slug));
  const mission=me.missions.find(item=>item.id==='two-games');
  if(!me.today.plays){
   const game=list.find(item=>item.slug===store.catalog.settings.featured)||list[0];
   return {game,text:`main sekali hari ini untuk bonus harian +20 XP${me.streak.count?` dan menjaga streak ${me.streak.count} hari`:''}.`};
  }
  if(mission&&!mission.done){
   const fresh=list.find(item=>!me.today.games.includes(item.slug));
   if(fresh)return {game:fresh,text:`coba ${fresh.title} untuk misi "${mission.title}" (+${mission.xp} XP).`};
  }
  const best=[...list].sort((a,b)=>missing(b)-missing(a))[0];
  if(missing(best)>0)return {game:best,text:`${best.title} masih menyimpan ${missing(best)} kartu yang belum kamu temukan.`};
  return {game:list[0],text:'album lengkap! Sekarang kejar puncak papan peringkat minggu ini.'};
 }
 function renderTip(){
  const tip=recommendation();
  $('heroTip').hidden=!tip;
  if(!tip)return;
  $('heroTipText').innerHTML=` ${esc(tip.text)} <a href="${esc(tip.game.url)}">Main ${esc(tip.game.title)} →</a>`;
 }

 /* ── Pita aktivitas langsung ─────────────────────── */
 function renderLive(){
  const catalog=store.catalog;
  const title=slug=>games().find(game=>game.slug===slug)?.title||'arcade';
  const items=(catalog.activity||[]).map(item=>`<li><img src="${avatarSrc(item.avatar)}" alt=""><b>${esc(item.name)}</b> ${esc(item.text)} <small>${esc(title(item.game))} · ${ago(item.at)}</small></li>`);
  if(catalog.totals.playsToday)items.unshift(`<li><span class="live-hot">${svg(TOAST_ICONS.streak)}</span><b>${number(catalog.totals.playsToday)} permainan</b> hari ini dari ${number(catalog.totals.players)} pemain</li>`);
  $('live').hidden=!items.length;
  if(!items.length)return;
  const track=items.join('');
  const still=items.length<2||reducedMotion();
  $('liveList').classList.toggle('still',still);
  $('liveList').innerHTML=still?track:track+track.replace(/<li>/g,'<li aria-hidden="true">');
  $('liveList').style.setProperty('--items',items.length);
 }

 /* ── Kartu game + slot ───────────────────────────── */
 function renderGames(){
  const catalog=store.catalog;
  const cards=games().map(game=>{
   const owned=cardsOwnedIn(game.slug);
   const plays=store.me?.playsByGame?.[game.slug]||0;
   const progress=game.builtin?`${owned}/${game.cards} kartu · ${plays}x main`:'Game tambahan';
   const meter=game.builtin?`<span class="game-meter" aria-hidden="true"><i style="width:${pct(owned,game.cards)}%"></i></span>`:'';
   const popular=game.plays?`<p class="game-pop">${svg(TOAST_ICONS.streak)}Dimainkan ${number(game.plays)}× di arcade</p>`:'';
   return `<article class="game-card" style="--accent:${esc(game.accent||'#E62B5E')}">
    <div class="game-cover">${game.cover?`<img src="${esc(game.cover)}" alt="Cuplikan ${esc(game.title)}" loading="lazy">`:''}<span class="game-badge">${esc((game.event||'ARENA BARU').toUpperCase())}</span><span class="game-progress">${esc(progress)}</span>${meter}</div>
    <div class="game-body"><h3>${esc(game.title)}</h3><p class="game-mech">${esc(game.mechanic||'')}</p>${popular}<p>${esc(game.description||game.tagline||'')}</p>
     <div class="game-actions"><button class="btn btn-ghost btn-small" type="button" data-howto="${esc(game.slug)}">Cara main</button><a class="btn btn-primary btn-small" href="${esc(game.url)}" ${game.external?'target="_blank" rel="noopener"':''}>Main</a></div></div>
   </article>`;
  });
  if(catalog.slots>0)cards.push(`<article class="slot-card"><span class="slot-icon">${svg('<path d="M12 5v14M5 12h14"/>')}</span><h3>Slot arena baru</h3><p>Game berikutnya sedang disiapkan. Mainkan tiga arena ini dulu dan kumpulkan kartunya.</p></article>`);
  $('gameGrid').innerHTML=cards.join('');
 }

 /* ── Album ───────────────────────────────────────── */
 const miniCard=card=>`<div class="mini-card ${card.rarity} ${card.owned?'':'locked'}" title="${esc(card.owned?`${card.name} · ${RARITY[card.rarity]}`:`Belum ditemukan · ${RARITY[card.rarity]}`)}"><div>${card.image?`<img src="${esc(card.image)}" alt="" loading="lazy">`:''}<span>${esc(card.owned?card.name:'???')}</span></div>${card.count>1?`<em>×${card.count}</em>`:''}</div>`;

 function renderAlbum(){
  const album=store.album;
  $('albumOwned').textContent=album.owned;
  $('albumTotal').textContent=album.total;
  $('albumBar').style.width=`${album.total?Math.round(album.owned/album.total*100):0}%`;
  $('albumRows').innerHTML=album.games.map(game=>{
   const owned=game.cards.filter(card=>card.owned).length;
   const sorted=[...game.cards].sort((a,b)=>Number(b.owned)-Number(a.owned));
   return `<div class="album-row"><h3><span>${esc(game.title)}</span><b>${owned}/${game.cards.length}</b></h3><div class="card-strip">${sorted.map(miniCard).join('')}</div></div>`;
  }).join('');
  $('albumTabs').innerHTML=[`<button class="tab active" type="button" data-album="all">Semua</button>`,...album.games.map(game=>`<button class="tab" type="button" data-album="${esc(game.slug)}">${esc(game.title)}</button>`)].join('');
  renderAlbumGrid('all');
 }

 function renderAlbumGrid(filter){
  const cards=store.album.games.filter(game=>filter==='all'||game.slug===filter).flatMap(game=>game.cards).sort((a,b)=>Number(b.owned)-Number(a.owned));
  $('albumGrid').innerHTML=cards.map(miniCard).join('');
  document.querySelectorAll('#albumTabs .tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.album===filter));
 }

 /* ── Papan peringkat ─────────────────────────────── */
 function renderBoard(){
  const board=store.boards[store.range];
  if(!board)return;
  const [first,second,third,...rest]=board.top;
  const slot=(row,cls)=>row?`<div class="podium-slot ${cls}"><span class="rank">${row.rank}</span><img src="${avatarSrc(row.avatar)}" alt=""><b>${esc(row.name)}</b><small>Lv ${row.level} · ${number(row.score)} XP</small><em>${esc(row.title||'')}</em></div>`:'<div></div>';
  $('podium').innerHTML=board.top.length?slot(second,'second')+slot(first,'first')+slot(third,'third'):'<p class="empty" style="grid-column:1/-1">Belum ada pemain di periode ini. Jadilah yang pertama!</p>';
  $('board').innerHTML=rest.map(row=>`<li class="${row.you?'you':''}"><span class="pos">${row.rank}</span><img src="${avatarSrc(row.avatar)}" alt=""><div><b>${esc(row.name)}${row.you?' (kamu)':''}</b><small>Lv ${row.level} · ${esc(row.title||'')} · ${row.cards} kartu</small></div><span class="score">${number(row.score)}</span></li>`).join('');
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
  store.lastFocus=document.activeElement;
  const modal=$(id);
  modal.hidden=false;
  requestAnimationFrame(()=>modal.classList.add('open'));
  modal.querySelector('input,button')?.focus();
 }
 function closeModal(modal){
  modal.classList.remove('open');
  modal.hidden=true;
  store.lastFocus?.focus?.();
 }

 function avatarPicker(container,selected){
  $(container).innerHTML=AVATARS.map(name=>`<button type="button" role="radio" aria-checked="${name===selected}" data-avatar="${name}" aria-label="Avatar ${name}"><img src="${avatarSrc(name)}" alt=""></button>`).join('');
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
  const owned=cardsOwnedIn(game.slug),plays=store.me?.playsByGame?.[game.slug]||0;
  $('gameModalProgress').hidden=!game.builtin;
  if(game.builtin)$('gameModalProgress').innerHTML=`<div><b>${owned}/${game.cards}</b><small>kartu ditemukan</small></div><div><b>${number(plays)}</b><small>kali kamu main</small></div><div><b>${number(game.plays||0)}</b><small>main di arcade</small></div><div class="bar"><i style="width:${pct(owned,game.cards)}%"></i></div>`;
  $('gameModalSteps').innerHTML=(game.howTo||[]).map(step=>`<li>${esc(step)}</li>`).join('')||'<li>Buka game lalu ikuti petunjuk di layar.</li>';
  $('gameModalControls').innerHTML=(game.controls||[]).map(([key,action])=>`<dt>${esc(key)}</dt><dd>${esc(action)}</dd>`).join('')||'<dt>Klik</dt><dd>Ikuti tombol di layar</dd>';
  $('gameModalTips').innerHTML=(game.tips||[]).map(tip=>`<li>${esc(tip)}</li>`).join('')||'<li>Selamat bermain!</li>';
  const play=$('gameModalPlay');
  play.href=game.url;play.target=game.external?'_blank':'';play.rel=game.external?'noopener':'';
  openModal('gameModal');
 }

 function openProfile(){
  const me=store.me;
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
 function confetti(){
  if(reducedMotion())return;
  const layer=document.createElement('div');
  layer.className='confetti';
  layer.setAttribute('aria-hidden','true');
  const colors=['#F5B83D','#E62B5E','#F9A2C1','#A77BFF','#4CC99A'];
  for(let index=0;index<70;index++){
   const piece=document.createElement('i');
   piece.style.cssText=`left:${Math.random()*100}%;background:${colors[index%colors.length]};animation-delay:${Math.random()*.6}s;animation-duration:${2.2+Math.random()*1.6}s;--x:${Math.round(Math.random()*160-80)}px;--r:${Math.round(Math.random()*720-360)}deg`;
   layer.append(piece);
  }
  document.body.append(layer);
  setTimeout(()=>layer.remove(),4600);
 }
 function showFeed(){
  const key='gamysuf-feed-seen';
  const seen=Number(localStorage.getItem(key))||0;
  const events=(store.me?.feed||[]).filter(event=>event.at>seen);
  if(!events.length)return;
  const important=events.filter(event=>event.type!=='xp');
  const xp=events.reduce((sum,event)=>sum+(event.xp||0),0);
  const keep=matchMedia('(max-width:640px)').matches?1:2;
  const queue=[...important.slice(-keep),{type:'xp',text:'XP baru sejak kunjungan terakhir',xp}].filter(event=>event.type!=='xp'||event.xp>0);
  queue.forEach((event,index)=>setTimeout(()=>toast(event),index*650));
  if(important.some(event=>event.type==='level'||event.type==='badge'))setTimeout(confetti,300);
  localStorage.setItem(key,String(Math.max(...events.map(event=>event.at))));
 }

 /* ── Hitung mundur misi (tengah malam WIB) ────────── */
 function tickReset(){
  const day=86400000,wib=Date.now()+7*3600000;
  const left=Math.ceil(wib/day)*day-wib;
  const h=String(Math.floor(left/3600000)).padStart(2,'0'),m=String(Math.floor(left%3600000/60000)).padStart(2,'0'),s=String(Math.floor(left%60000/1000)).padStart(2,'0');
  $('missionReset').textContent=`Reset ${h}:${m}:${s}`;
  const weekday=new Date(wib).getUTCDay();
  const weekLeft=left+(((8-weekday)%7||7)-1)*day;
  const days=Math.floor(weekLeft/day),rest=weekLeft%day;
  $('weekReset').textContent=`${days?`${days} hari `:''}${two(Math.floor(rest/3600000))}:${two(Math.floor(rest%3600000/60000))}:${two(Math.floor(rest%60000/1000))}`;
 }

 /* ── Bagikan progres (Web Share / salin) ─────────── */
 async function shareProgress(){
  const me=store.me;
  if(!me)return;
  const url=`${location.origin}/`;
  const text=`Aku ${me.title} level ${me.level} di Gamysuf Arcade: ${me.cards.length}/${store.album?.total||0} kartu, streak ${me.streak.count} hari. Berani adu hoki?`;
  try{
   if(navigator.share){await navigator.share({title:'Gamysuf Arcade',text,url});return;}
   await navigator.clipboard.writeText(`${text} ${url}`);
   toast({type:'badge',text:'Teks ajakan tersalin. Tempel ke chat temanmu!',xp:0});
  }catch(error){
   if(error?.name!=='AbortError')toast({type:'xp',text:'Browser menolak berbagi. Salin alamat gamysuf.fun secara manual.',xp:0});
  }
 }

 async function refresh({initial=false}={}){
  const [catalog,me,album]=await Promise.all([api('/hub-api/catalog'),api('/hub-api/me'),api('/hub-api/album')]);
  store.catalog=catalog;store.me=me;store.album=album;
  if(initial)renderHero();
  renderMe();renderGames();renderAlbum();renderLive();
  await loadBoard(store.range);
  showFeed();
 }

 /* ── Event ───────────────────────────────────────── */
 document.addEventListener('click',async event=>{
  const target=event.target.closest('button,a');
  if(!target)return;
  if(target.dataset.howto){openGame(target.dataset.howto);return;}
  if(target.dataset.feature){feature(Number(target.dataset.feature));clearInterval(store.cycle);return;}
  if(target.dataset.range){loadBoard(target.dataset.range).catch(()=>{});return;}
  if(target.dataset.album){renderAlbumGrid(target.dataset.album);return;}
  if(target.dataset.avatar){target.parentElement.querySelectorAll('[data-avatar]').forEach(button=>button.setAttribute('aria-checked',String(button===target)));return;}
  if(target.hasAttribute('data-close')){closeModal(target.closest('.modal'));return;}
 });
 document.querySelectorAll('.modal').forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal&&modal.id!=='onboardModal')closeModal(modal);}));
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const open=document.querySelector('.modal.open');
  if(open&&open.id!=='onboardModal')closeModal(open);
 });
 $('playerChip').addEventListener('click',openProfile);
 $('openProfile').addEventListener('click',openProfile);
 $('openAlbum').addEventListener('click',()=>openModal('albumModal'));
 $('shareProgress').addEventListener('click',shareProgress);
 $('onboardSkip').addEventListener('click',()=>{localStorage.setItem('gamysuf-onboarded','1');closeModal($('onboardModal'));});
 $('onboardSave').addEventListener('click',async()=>{
  $('onboardError').textContent='';
  try{
   store.me=await api('/hub-api/me',{nickname:$('nicknameInput').value,avatar:pickedAvatar('onboardAvatars')});
   localStorage.setItem('gamysuf-onboarded','1');
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
   localStorage.removeItem('gamysuf-feed-seen');
   location.reload();
  }catch(error){$('profileError').textContent=error.message;}
 });
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&store.catalog)refresh().catch(()=>{});});

 (async()=>{
  try{
   await refresh({initial:true});
   if(!store.me.nickname&&!localStorage.getItem('gamysuf-onboarded')){avatarPicker('onboardAvatars','wink');openModal('onboardModal');}
  }catch(error){
   toast({type:'xp',text:`Gagal memuat arcade: ${error.message}`,xp:0});
  }finally{
   document.body.dataset.ready='1';
  }
  tickReset();setInterval(tickReset,1000);
 })();
})();
