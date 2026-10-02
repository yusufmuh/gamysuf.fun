'use strict';

// Shared game controls. Results, stock and XP remain authoritative on the server.
(()=>{
 if(window.__gamysufInjected)return;
 window.__gamysufInjected=true;
 const game=document.currentScript?.dataset.game||'';
 const builtin=['spin','nyapit','drop','gacha','heart'].includes(game);
 const RESULT=/\/api\/(?:play|spin|bonus)$/;
 const nativeFetch=window.fetch.bind(window);
 const avatarFiles={wave:'wave',peek:'explorer',wink:'star',bag:'collector',stand:'stand',heart:'champion'};
 const names={spin:'Spin Wheels',nyapit:'Nyapit Bareng Bpedia',drop:'Bipy Beauty Drop',gacha:'Bipy Gacha Pop',heart:'Bipy Grand Line Desire'};
 const icons={back:'<path d="m14 6-6 6 6 6"/>',forward:'<path d="m10 6 6 6-6 6"/>',camera:'<path d="M8 5h8l2 3h3v12H3V8h3Z"/><circle cx="12" cy="13" r="4"/>',menu:'<path d="M5 6h14M5 12h14M5 18h14"/>',home:'<path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10"/>',screen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',sound:'<path d="M3 9h4l5-4v14l-5-4H3ZM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>'};
 const svg=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.menu}</svg>`;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const avatarSrc=avatar=>`/hub/assets/avatars/character-${avatarFiles[avatar]||'wave'}.png?v=1.2.0`;
 let since=Date.now(),me=null,muted=false,capturePromise=null,lastFocus=null;
 try{if(builtin)localStorage.setItem('gamysuf-last-game',game);}catch{/* Optional shortcut. */}
 const bar=document.createElement('nav');
 bar.id='gmyGamebar';bar.className='gmy-gamebar';bar.setAttribute('aria-label','Game bar Gamysuf');bar.dataset.html2canvasIgnore='true';
 const button=(action,title,icon)=>`<button type="button" data-gmy-action="${action}" aria-label="${title}" title="${title}">${svg(icon)}</button>`;
 bar.innerHTML=`<button type="button" class="gmy-player" data-gmy-action="profile" aria-label="Buka detail profil"><img id="gmyAvatar" src="${avatarSrc('wave')}" alt="Avatar pemain"><span class="gmy-player-text"><b id="gmyName">Pemain</b><small id="gmyLevel">Gamysuf Arcade</small></span></button><span class="gmy-divider" aria-hidden="true"></span>${button('back','Kembali','back')}${button('forward','Maju','forward')}${button('capture','Screenshot game','camera')}<button type="button" data-gmy-theme aria-label="Ganti tema"><span>◐</span></button><button type="button" data-gmy-action="menu" aria-label="Kontrol game" aria-haspopup="menu" aria-expanded="false" aria-controls="gmyMenu">${svg('menu')}</button><div id="gmyMenu" class="gmy-menu" role="menu" hidden><b>${esc(names[game]||'Gamysuf Arcade')}</b><button type="button" role="menuitem" data-gmy-action="guide">${svg('help')}Cara main & kontrol</button><button type="button" role="menuitem" data-gmy-action="audio">${svg('sound')}<span id="gmyAudioLabel">Matikan suara</span></button><button type="button" role="menuitem" data-gmy-action="fullscreen">${svg('screen')}Layar penuh</button><a role="menuitem" href="/">${svg('home')}Kembali ke arcade</a></div>`;
 const toasts=document.createElement('div');toasts.className='gmy-toasts';toasts.setAttribute('aria-live','polite');toasts.dataset.html2canvasIgnore='true';
 const dialog=document.createElement('dialog');dialog.id='gmyDialog';dialog.className='gmy-dialog';dialog.setAttribute('aria-labelledby','gmyDialogTitle');dialog.dataset.html2canvasIgnore='true';
 dialog.innerHTML=`<header><h2 id="gmyDialogTitle"></h2><button type="button" data-gmy-close aria-label="Tutup">${svg('close')}</button></header><div id="gmyDialogBody"></div>`;
 const menu=bar.querySelector('#gmyMenu');
 const menuButton=bar.querySelector('[data-gmy-action="menu"]');
 function menuOpen(open){menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('[role="menuitem"]')?.focus();}
 function toast(message,xp=0){
  const node=document.createElement('div');node.className='gmy-toast';node.textContent=message;
  if(xp){const points=document.createElement('b');points.textContent=`+${xp} XP`;node.append(points);}
  toasts.append(node);setTimeout(()=>node.remove(),4500);
 }
 function openPanel(title,content){lastFocus=document.activeElement;menuOpen(false);dialog.querySelector('h2').textContent=title;dialog.querySelector('#gmyDialogBody').innerHTML=content;if(!dialog.open)dialog.showModal();}
 function closePanel(){dialog.close();lastFocus?.focus();}
 function profile(){
  if(!me){toast('Profil sedang dimuat. Coba lagi sebentar.');check();return;}
  openPanel('Profil pemain',`<div class="gmy-profile-head"><img src="${avatarSrc(me.avatar)}" alt="${esc(me.nickname||'Avatar Bipy')}"><div><p>${esc(me.nickname||('Tamu #'+me.tag))}</p><h3>Level ${Number(me.level)||1}</h3><span>${Number(me.xp)||0} XP · ${Number(me.streak?.count)||0} hari beruntun</span></div></div><div class="gmy-profile-stats">${Object.entries(names).map(([slug,title])=>`<div><b>${Number(me.playsByGame?.[slug])||0}</b><span>${title}</span></div>`).join('')}</div><a class="gmy-primary" href="/?profile=1">Lihat & atur profil lengkap</a>`);
 }
 function guide(){
  const rows={heart:[['Pilih pesona','Pilih Zoro atau Sanji, lalu Gacha Booster atau kartumu sendiri.'],['Buka langsung','Kartu dibuka dengan setelan aman tanpa sentuhan dan tanpa dokumentasi.'],['Demo atau resmi','Gunakan Main tercatat bersama petugas untuk mendapat tiket booth HP-.']],spin:[['Masuk arena','Klik roda, lalu tekan tombol Putar roda.'],['Putar','Gunakan tombol utama atau Spasi saat arena aktif.'],['Kembali','Gunakan tombol tutup arena untuk kembali ke halaman game.']],nyapit:[['Mulai','Tekan Main, lalu masukkan koin di layar.'],['Bidik','Geser atau sentuh arena. Di keyboard, gunakan panah kiri/kanan.'],['Capit','Tekan tombol Capit atau Spasi. Tunggu sampai hasil tampil.']],drop:[['Pilih misi','Pilih Beauty Drop atau Gacha Fanservice.'],['Jatuhkan kapsul','Tekan DROP atau Spasi saat papan siap.'],['Fanservice','Pilih cosplayer, lalu ikuti pilihan misi di layar.']],gacha:[['Gacha','Tekan GACHA!, sentuh mesin, atau Spasi. Satu tap saja.'],['Kartu hasil','Tunjukkan kode GP- ke petugas booth. Kartu menutup otomatis untuk pemain berikutnya.'],['Pintasan','N isi nama, M senyap, F layar penuh, Esc tutup kartu.']]};
  openPanel('Cara main & kontrol',`<p class="gmy-intro">${esc(names[game]||'Ikuti petunjuk di dalam game.')}</p><dl class="gmy-controls">${(rows[game]||[]).map(([title,desc])=>`<dt>${title}</dt><dd>${desc}</dd>`).join('')}</dl><p class="gmy-note">Mode online memakai hadiah digital. Tema, suara, screenshot, dan profil tersedia di game bar.</p>`);
 }
 async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Browser ini belum mendukung layar penuh. Gunakan mode layar penuh browser.');}catch{toast('Layar penuh belum tersedia di browser ini.');}}
 function loadCapture(){
  if(window.html2canvas)return Promise.resolve(window.html2canvas);
  if(capturePromise)return capturePromise;
  capturePromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='/hub/vendor/html2canvas-1.4.1.min.js';
   const timeout=setTimeout(()=>{script.remove();capturePromise=null;reject(new Error('Capture timeout'));},15000);
   script.onload=()=>{clearTimeout(timeout);resolve(window.html2canvas);};
   script.onerror=()=>{clearTimeout(timeout);script.remove();capturePromise=null;reject(new Error('Capture unavailable'));};document.head.append(script);
  });return capturePromise;
 }
 async function capture(){
  const control=bar.querySelector('[data-gmy-action="capture"]');if(control.disabled)return;
  menuOpen(false);control.disabled=true;control.setAttribute('aria-busy','true');
  try{
   const render=await loadCapture();
   const arena=document.querySelector('.arena-dialog[open]');
   const target=arena||document.body;
   const canvas=await render(target,{
    backgroundColor:getComputedStyle(target).backgroundColor,scale:Math.min(window.devicePixelRatio||1,2),
    width:innerWidth,height:innerHeight,x:arena?0:scrollX,y:arena?0:scrollY,
    windowWidth:innerWidth,windowHeight:innerHeight,useCORS:true,logging:false,
    // The render-only about:blank clone must not reinterpret the page's CSP 'self'.
    // The real document and its response security policy remain unchanged.
    ignoreElements:node=>node.hasAttribute('data-html2canvas-ignore')||
     (node.tagName==='META'&&node.httpEquiv?.toLowerCase()==='content-security-policy')||
     (node.tagName==='LINK'&&node.rel?.toLowerCase().includes('icon')),
    onclone:(_doc,copy)=>{
     if(arena){copy.style.position='fixed';copy.style.inset='0';copy.style.margin='0';copy.style.animation='none';copy.scrollTop=arena.scrollTop;}
    }
   });
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!blob)throw new Error('No image');
   const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`gamysuf-${game.replace(/[^a-z0-9-]/g,'')}-${Date.now()}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Screenshot disimpan sebagai PNG.');
  }catch{toast('Screenshot belum bisa dibuat. Coba kembali setelah gambar selesai dimuat.');}
  finally{control.disabled=false;control.removeAttribute('aria-busy');}
 }
 async function check(){
  try{
   const response=await nativeFetch(`/hub-api/me?since=${since}`,{headers:{'x-gamysuf-client':'hub'},credentials:'same-origin'});if(!response.ok)return;
   me=await response.json();bar.querySelector('#gmyAvatar').src=avatarSrc(me.avatar);bar.querySelector('#gmyName').textContent=me.nickname||('Tamu #'+me.tag);bar.querySelector('#gmyLevel').textContent=`Level ${me.level} · ${me.xp} XP`;
   const events=me.feed||[];if(!events.length)return;
   since=Math.max(since,...events.map(event=>event.at));const important=events.filter(event=>event.type!=='xp');const total=events.reduce((sum,event)=>sum+(event.xp||0),0);
   (important.length?important.slice(-3):[{text:'XP permainan',xp:total}]).forEach((event,index)=>setTimeout(()=>toast(event.text,event.xp),index*700));
  }catch{/* Game is usable when profile API is unavailable. */}
 }
 function relocateBar(){
  // Spin uses a top-layer arena dialog. Controls must share that layer to remain clickable.
  const host=document.querySelector('.arena-dialog[open]')||document.body;
  if(bar.parentElement!==host)host.append(bar);
 }
 function mount(){
  document.documentElement.classList.add('gmy-has-bar');document.body.append(bar,toasts,dialog);window.GamysufTheme?.refresh();
  if(!window.GamysufTheme)bar.querySelector('[data-gmy-theme]').hidden=true;
  if(!builtin)bar.querySelector('[data-gmy-action="audio"]').hidden=true;
  relocateBar();new MutationObserver(relocateBar).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  window.dispatchEvent(new CustomEvent('gamysuf:audio-query'));
  check();
 }
 bar.addEventListener('click',event=>{
  const target=event.target.closest('[data-gmy-action]');if(!target)return;
  const action=target.dataset.gmyAction;if(action!=='menu')menuOpen(false);
  if(action==='menu')menuOpen(menu.hidden);
  else if(action==='profile')profile();else if(action==='guide')guide();
  else if(action==='back'){if(history.length>1)history.back();else location.assign('/');}
  else if(action==='forward')history.forward();else if(action==='capture')capture();else if(action==='fullscreen')fullscreen();
  else if(action==='audio'){muted=!muted;window.dispatchEvent(new CustomEvent('gamysuf:audio',{detail:{muted}}));bar.querySelector('#gmyAudioLabel').textContent=muted?'Aktifkan suara':'Matikan suara';}
 });
 document.addEventListener('click',event=>{if(!bar.contains(event.target))menuOpen(false);});
 document.addEventListener('keydown',event=>{
  if(dialog.open){event.stopImmediatePropagation();if(event.key==='Escape'){event.preventDefault();closePanel();}return;}
  if(bar.contains(event.target)){
   event.stopImmediatePropagation();
   if(event.key==='Escape'){menuOpen(false);menuButton.focus();}
   if(!menu.hidden&&['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
    event.preventDefault();const items=[...menu.querySelectorAll('[role="menuitem"]')].filter(item=>!item.hidden);const index=items.indexOf(document.activeElement);const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus();
   }
  }
 },true);
 dialog.querySelector('[data-gmy-close]').addEventListener('click',closePanel);
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closePanel();}});
 window.addEventListener('gamysuf:audio-state',event=>{muted=Boolean(event.detail?.muted);bar.querySelector('#gmyAudioLabel').textContent=muted?'Aktifkan suara':'Matikan suara';});
 window.addEventListener('pageshow',()=>{check();window.GamysufTheme?.refresh();});
 if(builtin)window.fetch=async(input,init)=>{
  const response=await nativeFetch(input,init);
  try{const url=new URL(typeof input==='string'?input:input.url,location.href);if(String(init?.method||input?.method||'GET').toUpperCase()==='POST'&&RESULT.test(url.pathname)&&response.ok)setTimeout(check,7000);}catch{/* Non-game requests pass through. */}
  return response;
 };
 if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
