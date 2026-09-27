'use strict';

// Runs before the first paint in the hub and the three hosted games.
(() => {
 const root=document.documentElement;
 const game=document.currentScript?.dataset.game;
 if(game)root.dataset.gamysufGame=game;
 const key='gamysuf-theme';
 const assets='/hub/assets/brand/';
 const icons={
  dark:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M5 5l1.5 1.5m11 11L19 19M2 12h2m16 0h2M5 19l1.5-1.5m11-11L19 5"/></svg>',
  light:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8a8.5 8.5 0 1 0 11.5 11.5Z"/></svg>'
 };
 let theme='dark';
 try{if(localStorage.getItem(key)==='light')theme='light';}catch{/* Optional preference. */}
 root.dataset.theme=theme;
 function brandImages(){
  if(game)document.querySelectorAll('img').forEach(img=>{
   if(!img.dataset.brand&&/\/(?:bpedia-logo[^/]*|logo)\.png(?:\?|$)/i.test(img.getAttribute('src')||''))img.dataset.brand='bpedia';
  });
  document.querySelectorAll('img[data-brand]').forEach(img=>{
   const file=img.dataset.brand==='gamysuf'?`gamysuf-3d-${theme}.png`:`bpedia-${theme==='light'?'pink':'white'}.png`;
   const src=`${assets}${file}?v=1.3.0`;
   if(img.getAttribute('src')!==src)img.src=src;
   img.classList.add('gmy-brand-image');
  });
 }
 function paint(){
  root.dataset.theme=theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='light'?'#fff9f6':'#12050c');
  document.querySelectorAll('#themeToggle,[data-gmy-theme]').forEach(button=>{
   const next=theme==='dark'?'terang':'gelap';
   button.setAttribute('aria-label',`Aktifkan tema ${next}`);
   button.setAttribute('aria-pressed',String(theme==='light'));
   button.title=`Aktifkan tema ${next}`;
   button.innerHTML=`${icons[theme]}<span class="theme-label">${theme==='dark'?'Terang':'Gelap'}</span>`;
  });
  brandImages();
 }
 function set(value){
  if(!['dark','light'].includes(value))return;
  theme=value;
  try{localStorage.setItem(key,theme);}catch{/* In-page controls remain available. */}
  paint();
  window.dispatchEvent(new CustomEvent('gamysuf:theme',{detail:{theme}}));
 }
 window.GamysufTheme=Object.freeze({get:()=>theme,set,toggle:()=>set(theme==='dark'?'light':'dark'),refresh:paint});
 function bind(){
  paint();
  document.addEventListener('click',event=>{if(event.target.closest('#themeToggle,[data-gmy-theme]'))window.GamysufTheme.toggle();});
  new MutationObserver(records=>{if(records.some(record=>record.addedNodes.length))brandImages();}).observe(document.body,{childList:true,subtree:true});
 }
 window.addEventListener('storage',event=>{if(event.key===key&&['dark','light'].includes(event.newValue)){theme=event.newValue;paint();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
