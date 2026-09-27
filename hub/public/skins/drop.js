'use strict';

/* Skin online Bipy Beauty Drop. Tidak mengubah logika game; hanya mengamati
   DOM game untuk: getar halus di HP saat kapsul jatuh & mekar, menggulir papan
   ke tengah layar bila tidak terlihat saat DROP, dan kartu hologram yang ikut
   kemiringan HP (Android). */
(()=>{
 const $=id=>document.getElementById(id);
 const buzz=pattern=>{try{if(matchMedia('(pointer:coarse)').matches)navigator.vibrate?.(pattern);}catch{/* tidak semua browser mendukung getar */}};
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

 function start(){
  const layer=$('revealLayer'),dropButton=$('dropButton');
  if(!layer||!dropButton)return;

  const launch=()=>{
   if(dropButton.disabled)return;
   buzz(18);
   const machine=document.querySelector('.machine');
   if(!machine)return;
   const box=machine.getBoundingClientRect();
   if(box.top<0||box.bottom>innerHeight)machine.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'});
  };
  dropButton.addEventListener('pointerdown',launch);
  document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&document.body.dataset.stage==='drop'&&event.target.tagName!=='INPUT')launch();});

  /* Kartu hologram ikut kemiringan HP (Android). Memakai penangan
     pointermove milik game; iOS dilewati agar tidak memunculkan izin sensor. */
  if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission!=='function'&&matchMedia('(pointer:coarse)').matches&&!reduced()){
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
   if(open&&!wasOpen)buzz(layer.classList.contains('zonk')?[40]:[26,60,26,60,90]);
   wasOpen=open;
  }).observe(layer,{attributes:true,attributeFilter:['class','hidden']});
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
