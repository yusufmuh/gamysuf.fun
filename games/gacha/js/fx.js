'use strict';

/* Ledakan "pop": konfeti warna Bpedia × Market-In dan stiker Y2K yang
   berputar jatuh. Berbasis waktu nyata sehingga durasinya sama di layar
   60-144 Hz, dan loop berhenti sendiri saat partikel habis. */
(()=>{
 const canvas=document.getElementById('fxCanvas');
 if(!canvas)return;
 const ctx=canvas.getContext('2d');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const COLORS=['#e62b5e','#f9a2c1','#f5b83d','#ffd23f','#39a7e5','#9fd6a4','#9c8cff','#ffffff'];
 const STICKERS=['flower-yellow','flower-pink','flower-red','star-chrome','heart','butterfly','sparkle','lips','smile'].map(name=>{
  const image=new Image();image.decoding='async';image.src=`/assets/stickers/${name}.svg`;return image;
 });
 let particles=[],frame=0,last=0,dpr=1;

 function resize(){
  dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);
 }
 resize();
 addEventListener('resize',resize);

 const rand=(min,max)=>min+Math.random()*(max-min);

 function confetti(x,y,count,power,colors=COLORS){
  for(let i=0;i<count;i++){
   const angle=rand(0,Math.PI*2),speed=rand(260,820)*power;
   particles.push({kind:Math.random()<.35?'dot':'strip',x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-rand(120,420),size:rand(6,13),rot:rand(0,6.28),vr:rand(-12,12),color:colors[i%colors.length],life:rand(1.6,2.6),age:0,drag:.986,gravity:900});
  }
 }

 function stickers(x,y,count,power){
  for(let i=0;i<count;i++){
   const angle=rand(-Math.PI*.95,-Math.PI*.05),speed=rand(380,780)*power;
   particles.push({kind:'sticker',image:STICKERS[i%STICKERS.length],x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,size:rand(34,64)*Math.min(1.4,Math.max(.8,innerWidth/900)),rot:rand(-.6,.6),vr:rand(-4,4),life:rand(1.8,2.6),age:0,drag:.99,gravity:760});
  }
 }

 function streamers(count){
  for(let i=0;i<count;i++){
   particles.push({kind:'strip',x:rand(0,innerWidth),y:rand(-120,-10),vx:rand(-40,40),vy:rand(160,320),size:rand(8,15),rot:rand(0,6.28),vr:rand(-8,8),color:i%2?'#f5b83d':'#fff0b8',life:rand(2.4,3.4),age:0,drag:.995,gravity:220});
  }
 }

 function loop(time){
  const dt=Math.min(.05,(time-last)/1000||0);last=time;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,innerWidth,innerHeight);
  particles=particles.filter(p=>(p.age+=dt)<p.life&&p.y<innerHeight+120);
  for(const p of particles){
   const drag=Math.pow(p.drag,dt*60);
   p.vx*=drag;p.vy=p.vy*drag+p.gravity*dt;
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
   const fade=Math.min(1,(p.life-p.age)/.5);
   ctx.save();ctx.globalAlpha=fade;ctx.translate(p.x,p.y);ctx.rotate(p.rot);
   if(p.kind==='sticker'){if(p.image.complete&&p.image.naturalWidth)ctx.drawImage(p.image,-p.size/2,-p.size/2,p.size,p.size);}
   else if(p.kind==='dot'){ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,p.size*.42,0,Math.PI*2);ctx.fill();}
   else{ctx.fillStyle=p.color;ctx.scale(1,Math.cos(p.rot*1.7));ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);}
   ctx.restore();
  }
  if(particles.length)frame=requestAnimationFrame(loop);
  else{frame=0;ctx.clearRect(0,0,innerWidth,innerHeight);}
 }

 function start(){if(!frame){last=performance.now();frame=requestAnimationFrame(loop);}}

 window.GPFx={
  burst(x,y,{tier='product'}={}){
   const scale=reduced.matches?.25:1;
   const big=tier==='bundling',mid=tier==='collab',voucher=tier==='voucher';
   const colors=voucher?['#14745d','#51bd95','#baf3cc','#ffd23f','#ffffff']:COLORS;
   confetti(x,y,Math.round((big?150:mid?110:voucher?96:80)*scale),big?1.2:1,colors);
   stickers(x,y,Math.round((big?16:mid?12:8)*scale),big?1.15:1);
   if(big&&!reduced.matches){setTimeout(()=>streamers(70),260);setTimeout(()=>confetti(x,y-60,90,.9),520);}
   start();
  },
  sprinkle(x,y){confetti(x,y,reduced.matches?6:22,.45);start();},
  clear(){particles=[];}
 };
})();
