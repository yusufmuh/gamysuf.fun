'use strict';

/* Disisipkan gateway ke halaman setiap game: tombol kembali ke Gamysuf,
   indikator level, dan notifikasi XP/kartu setelah hasil permainan keluar.
   Tidak mengubah logika game; hanya mengamati fetch ke rute hasil. */
(()=>{
 if(window.__gamysufInjected)return;
 window.__gamysufInjected=true;
 const game=document.currentScript?.dataset.game||'';
 const RESULT=/\/api\/(?:play|spin|bonus)$/;
 let since=Date.now();
 const nativeFetch=window.fetch.bind(window);

 const style=document.createElement('style');
 style.textContent=`
 .gmy-pill{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));min-height:44px;box-sizing:border-box;z-index:2147483000;display:flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:999px;background:rgba(18,5,12,.9);color:#FFF7F8;border:1px solid rgba(245,184,61,.45);box-shadow:0 10px 30px rgba(0,0,0,.45);font:700 12px/1.2 Poppins,system-ui,sans-serif;text-decoration:none;opacity:.85;transition:opacity .2s,transform .2s;backdrop-filter:blur(8px);touch-action:manipulation}
 .gmy-pill:hover,.gmy-pill:focus-visible{opacity:1;transform:translateY(-2px)}
 .gmy-pill img{width:28px;height:28px;border-radius:50%}
 .gmy-pill small{display:block;font-weight:600;color:#F5C96B;font-size:10px}
 .gmy-toasts{position:fixed;right:14px;top:14px;z-index:2147483001;display:grid;gap:8px;width:min(300px,calc(100vw - 28px));pointer-events:none}
 .gmy-toast{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 14px;border-radius:14px;background:linear-gradient(135deg,#3b1026,#1d0914);border:1px solid rgba(245,184,61,.5);color:#FFF7F8;font:600 13px/1.3 Poppins,system-ui,sans-serif;box-shadow:0 14px 34px rgba(0,0,0,.5);animation:gmyIn .45s cubic-bezier(.34,1.56,.64,1)}
 .gmy-toast b{color:#F5C96B;white-space:nowrap}
 .gmy-toast.out{animation:gmyOut .3s ease forwards}
 @keyframes gmyIn{from{opacity:0;transform:translateY(-12px) scale(.96)}}
 @keyframes gmyOut{to{opacity:0;transform:translateY(-10px)}}
 @media(max-width:700px),(max-height:500px){.gmy-pill{width:44px;height:44px;padding:7px;justify-content:center}.gmy-pill>span{display:none}.gmy-toasts{top:max(70px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));width:min(270px,calc(100vw - 20px))}.gmy-toast{font-size:11px;padding:8px 12px}}
 @media (prefers-reduced-motion:reduce){.gmy-toast,.gmy-toast.out{animation:none}}
 body.modal-open .gmy-pill{visibility:hidden}`;
 document.head.append(style);

 const pill=document.createElement('a');
 pill.className='gmy-pill';
 pill.href='/';
 pill.setAttribute('aria-label','Kembali ke Gamysuf Arcade');
 pill.title='Kembali ke Gamysuf Arcade';
 try{if(['spin','nyapit','drop'].includes(game))localStorage.setItem('gamysuf-last-game',game);}catch{/* Optional shortcut; gameplay does not depend on local storage. */}
 pill.innerHTML='<img src="/hub/assets/brand/icon-192.png" alt=""><span>GAMYSUF<small id="gmyLevel">Arcade</small></span>';
 const toasts=document.createElement('div');
 toasts.className='gmy-toasts';
 toasts.setAttribute('aria-live','polite');
 const mount=()=>{document.body.append(pill,toasts);};
 if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});

 function toast(text,xp){
  const element=document.createElement('div');
  element.className='gmy-toast';
  const label=document.createElement('span');
  label.textContent=text;
  element.append(label);
  if(xp){const points=document.createElement('b');points.textContent=`+${xp} XP`;element.append(points);}
  toasts.append(element);
  setTimeout(()=>{element.classList.add('out');setTimeout(()=>element.remove(),320);},3600);
 }

 async function check(){
  try{
   const response=await nativeFetch(`/hub-api/me?since=${since}`,{headers:{'x-gamysuf-client':'hub'},credentials:'same-origin'});
   if(!response.ok)return;
   const me=await response.json();
   const level=document.getElementById('gmyLevel');
   if(level)level.textContent=`Level ${me.level} · ${me.xp} XP`;
   const events=me.feed||[];
   if(!events.length)return;
   since=Math.max(since,...events.map(event=>event.at));
   const important=events.filter(event=>event.type!=='xp');
   const total=events.reduce((sum,event)=>sum+(event.xp||0),0);
   const list=important.length?important.slice(-3):[{text:'XP permainan',xp:total}];
   list.forEach((event,index)=>setTimeout(()=>toast(event.text,event.xp),index*700));
  }catch{/* Arcade opsional; game tetap berjalan tanpa notifikasi. */}
 }

 if(!game.startsWith('custom:')){
  window.fetch=async(input,init)=>{
   const response=await nativeFetch(input,init);
   try{
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    if(method==='POST'&&RESULT.test(url.pathname)&&response.ok)setTimeout(check,7000);
   }catch{/* abaikan URL yang tidak bisa dibaca */}
   return response;
  };
 }
 check();
})();
