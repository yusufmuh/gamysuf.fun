'use strict';

/* Skin online Bipy Beauty Drop. Tidak mengubah logika game; hanya mengamati
   DOM game untuk: getar halus di HP saat kapsul jatuh & mekar, menggulir papan
   ke tengah layar saat DROP di HP tegak, menandai hasil demo (drop.css
   menyembunyikan kode klaim), dan petunjuk putar HP saat layar mendatar. */
(()=>{
 const $=id=>document.getElementById(id);
 const buzz=pattern=>{try{if(matchMedia('(pointer:coarse)').matches)navigator.vibrate?.(pattern);}catch{/* tidak semua browser mendukung getar */}};

 function start(){
  const layer=$('revealLayer'),demoNote=$('demoNote'),dropButton=$('dropButton');
  if(!layer||!dropButton)return;

  const hint=document.createElement('div');
  hint.className='gmy-rotate-hint';
  hint.setAttribute('role','note');
  hint.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M3 12a9 9 0 0 1 4-7.5M21 12a9 9 0 0 1-4 7.5"/></svg>Putar HP ke posisi tegak untuk papan lebih besar';
  document.body.append(hint);

  /* Layar penuh untuk HP/tablet yang mendukungnya (Android, iPad): bilah
     alamat browser tidak lagi memakan ruang papan. Versi booth sudah kiosk. */
  const actions=document.querySelector('.top-actions');
  if(actions&&document.fullscreenEnabled&&matchMedia('(pointer:coarse)').matches){
   const full=document.createElement('button');
   full.type='button';
   full.className='icon-button gmy-full';
   full.setAttribute('aria-label','Layar penuh');
   full.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
   full.addEventListener('click',()=>{(document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen({navigationUI:'hide'})).catch(()=>{});});
   actions.insertBefore(full,document.getElementById('soundButton'));
  }

  const launch=()=>{
   if(dropButton.disabled)return;
   buzz(18);
   const machine=document.querySelector('.machine');
   if(!machine||!matchMedia('(max-aspect-ratio:1/1)').matches)return;
   const box=machine.getBoundingClientRect();
   if(box.top<0||box.bottom>innerHeight)machine.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };
  dropButton.addEventListener('pointerdown',launch);
  document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&document.body.dataset.stage==='drop'&&event.target.tagName!=='INPUT')launch();});

  /* Kartu hologram ikut kemiringan HP (Android). Memakai penangan
     pointermove milik game; iOS dilewati agar tidak memunculkan izin sensor. */
  if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission!=='function'&&matchMedia('(pointer:coarse)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   let queued=null;
   addEventListener('deviceorientation',event=>{
    if(layer.hidden||!layer.classList.contains('open')||event.gamma==null||event.beta==null)return;
    if(!queued)requestAnimationFrame(()=>{
     const {gamma,beta}=queued;queued=null;
     const x=Math.max(-.5,Math.min(.5,gamma/60)),y=Math.max(-.5,Math.min(.5,(beta-50)/70));
     layer.dispatchEvent(new PointerEvent('pointermove',{clientX:(x+.5)*innerWidth,clientY:(y+.5)*innerHeight}));
    });
    queued={gamma:event.gamma,beta:event.beta};
   },{passive:true});
  }

  let wasOpen=false;
  new MutationObserver(()=>{
   const open=!layer.hidden&&layer.classList.contains('open');
   layer.querySelector('.reveal-info')?.classList.toggle('gmy-demo-result',Boolean(demoNote&&!demoNote.hidden));
   if(open&&!wasOpen){
    buzz(layer.classList.contains('zonk')?[40]:[26,60,26,60,90]);
    layer.scrollTop=0;
   }
   wasOpen=open;
  }).observe(layer,{attributes:true,attributeFilter:['class','hidden']});
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
