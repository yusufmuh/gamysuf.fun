'use strict';
/* Lapisan partikel kanvas: setiap kartu punya motif sendiri (animationMotif)
   ditambah aksen host. Sprite dirender sekali, partikel dibatasi per perangkat,
   dan loop berhenti saat tab tersembunyi atau animasi dikurangi. */
(()=>{
 const TAU=Math.PI*2,rand=(a,b)=>a+Math.random()*(b-a),pick=list=>list[Math.floor(Math.random()*list.length)];
 const SPRITE=96,sprites=new Map();
 function sprite(key,draw){
  let c=sprites.get(key);if(c)return c;
  c=document.createElement('canvas');c.width=c.height=SPRITE;const g=c.getContext('2d');
  if(g){g.translate(SPRITE/2,SPRITE/2);draw(g,SPRITE/2);}
  sprites.set(key,c);return c;
 }
 function glow(g,r,color,alpha=.55){const grad=g.createRadialGradient(0,0,0,0,0,r);grad.addColorStop(0,color);grad.addColorStop(1,'rgba(255,255,255,0)');g.globalAlpha=alpha;g.fillStyle=grad;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();g.globalAlpha=1;}
 const SHAPES={
  glint:color=>sprite('glint'+color,(g,r)=>{glow(g,r*.6,color,.5);g.fillStyle='#fff';g.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,len=i%2?r*.14:r*.92;g.lineTo(Math.cos(a)*len,Math.sin(a)*len);}g.closePath();g.fill();g.fillStyle=color;g.globalAlpha=.6;g.beginPath();g.arc(0,0,r*.12,0,TAU);g.fill();}),
  star:color=>sprite('star'+color,(g,r)=>{glow(g,r*.8,color,.35);g.fillStyle=color;g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,len=i%2?r*.24:r*.6;g.lineTo(Math.cos(a)*len,Math.sin(a)*len);}g.closePath();g.fill();g.fillStyle='#fff';g.globalAlpha=.85;g.beginPath();g.arc(0,0,r*.1,0,TAU);g.fill();}),
  dot:color=>sprite('dot'+color,(g,r)=>{glow(g,r,color,.9);g.fillStyle='#fff';g.globalAlpha=.9;g.beginPath();g.arc(0,0,r*.16,0,TAU);g.fill();}),
  petal:color=>sprite('petal'+color,(g,r)=>{const grad=g.createLinearGradient(0,-r*.8,0,r*.8);grad.addColorStop(0,'#fff');grad.addColorStop(.25,color);grad.addColorStop(1,color);g.fillStyle=grad;g.beginPath();g.moveTo(0,-r*.8);g.bezierCurveTo(r*.62,-r*.45,r*.5,r*.55,0,r*.8);g.bezierCurveTo(-r*.5,r*.55,-r*.62,-r*.45,0,-r*.8);g.fill();g.strokeStyle='rgba(120,20,50,.25)';g.lineWidth=r*.05;g.beginPath();g.moveTo(0,-r*.5);g.lineTo(0,r*.6);g.stroke();}),
  blossom:color=>sprite('blossom'+color,(g,r)=>{for(let i=0;i<5;i++){g.save();g.rotate(i*TAU/5);g.fillStyle=color;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(r*.42,-r*.2,r*.38,-r*.78,r*.06,-r*.86);g.lineTo(0,-r*.74);g.lineTo(-r*.06,-r*.86);g.bezierCurveTo(-r*.38,-r*.78,-r*.42,-r*.2,0,0);g.fill();g.restore();}g.fillStyle='#e2668b';g.beginPath();g.arc(0,0,r*.16,0,TAU);g.fill();g.fillStyle='#fff3b0';for(let i=0;i<5;i++){const a=i*TAU/5+.6;g.beginPath();g.arc(Math.cos(a)*r*.26,Math.sin(a)*r*.26,r*.05,0,TAU);g.fill();}}),
  heart:color=>sprite('heart'+color,(g,r)=>{glow(g,r,color,.3);const s=r*.62;g.fillStyle=color;g.beginPath();g.moveTo(0,s*.9);g.bezierCurveTo(-s*1.5,-s*.1,-s*.7,-s*1.25,0,-s*.45);g.bezierCurveTo(s*.7,-s*1.25,s*1.5,-s*.1,0,s*.9);g.fill();g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(-s*.42,-s*.42,s*.2,s*.12,-.6,0,TAU);g.fill();})
 };
 const ROSE=['#ff9fbd','#ffc2d4','#ff7aa2'],GOLD=['#ffd36b','#ffe7a3','#f6b443'],RAINBOW=['#ff8fb1','#ffd36b','#9ff3c9','#9fd4ff','#c9a8ff','#ffffff'];
 const RARITY_COLORS={r:ROSE,sr:GOLD,sec:RAINBOW};
 /* Motif: rate = partikel per detik, cap = batas, every = event berkala. */
 const MOTIFS={
  'shoe-sparkles':{rate:16,cap:34,every:2.8,spawn(c){const x=rand(c.x-c.w*.15,c.x+c.w*1.15),y=rand(c.y-c.h*.08,c.y+c.h*1.02);return {sprite:SHAPES.glint(pick(['#dff4ff','#bfe6ff','#ffe0ee'])),x,y,vx:0,vy:rand(-14,-4),size:rand(7,17),life:rand(.8,1.6),vr:rand(-.8,.8),add:true,twinkle:true};},event:'shine'},
  'petal-waltz':{rate:9,cap:30,spawn(c){const R=Math.max(c.w,c.h)*rand(.48,.72);return {sprite:SHAPES.petal(pick(['#ff9fbd','#ffc8d8','#f7739c'])),orbit:{cx:c.x+c.w/2,cy:c.y+c.h/2,R,a:rand(0,TAU),w:rand(.55,.95)*(Math.random()<.2?-1:1)},x:0,y:0,size:rand(10,18),life:rand(4,6),vr:rand(-2.2,2.2),rot:rand(0,TAU)};}},
  'blossom-breeze':{rate:5,cap:24,spawn(c,f){const speed=rand(38,80)*Math.max(.7,f.w/700);return {sprite:SHAPES.blossom(pick(['#ffd6e2','#ffe9f0','#ffc1d3'])),x:-24,y:rand(c.y-c.h*.15,c.y+c.h*.95),vx:speed,vy:rand(-6,10),sway:rand(10,26),phase:rand(0,TAU),size:rand(12,22),life:(f.w+60)/speed,vr:rand(-1.4,1.4),rot:rand(0,TAU)};}},
  'rose-delivery':{rate:7,cap:34,every:2.4,spawn(c){return {sprite:SHAPES.petal(pick(['#d81f4a','#f04a6e','#ff8aa5'])),x:rand(c.x-c.w*.3,c.x+c.w*1.3),y:c.y+c.h+rand(0,30),vx:rand(-8,8),vy:rand(-90,-45),sway:rand(12,30),phase:rand(0,TAU),size:rand(10,17),life:rand(3,5),vr:rand(-2,2),rot:rand(0,TAU)};},event:'bloom'},
  'knight-glimmer':{rate:10,cap:26,every:2.2,spawn(c){const edge=Math.random();const x=edge<.5?pick([c.x-rand(0,c.w*.15),c.x+c.w+rand(0,c.w*.15)]):rand(c.x,c.x+c.w),y=edge<.5?rand(c.y,c.y+c.h):pick([c.y-rand(0,c.h*.06),c.y+c.h+rand(0,c.h*.06)]);return {sprite:SHAPES.glint(pick(['#ffd36b','#fff1c2','#ffe39a'])),x,y,vx:0,vy:rand(-10,-2),size:rand(7,15),life:rand(.7,1.4),vr:rand(-1,1),add:true,twinkle:true};},event:'cross'},
  'heart-embrace':{rate:7,cap:26,every:1.6,spawn(c){return {sprite:SHAPES.heart(pick(['#ff7aa2','#ff9fbd','#ffd1de','#ffffff'])),x:rand(c.x-c.w*.2,c.x+c.w*1.2),y:c.y+c.h*rand(.7,1.05),vx:rand(-6,6),vy:rand(-62,-28),sway:rand(6,16),phase:rand(0,TAU),size:rand(11,22),life:rand(2.4,3.8),pulse:true,vr:0};},event:'pulse'},
  'gentle-stars':{rate:6,cap:30,every:3.6,spawn(c,f){const near=Math.random()<.7;return {sprite:SHAPES.star(pick(['#fff6cf','#ffe08a','#ffffff','#ffd1e1'])),x:near?rand(c.x-c.w*.25,c.x+c.w*1.25):rand(0,f.w),y:near?rand(c.y-c.h*.1,c.y+c.h*1.05):rand(0,f.h),vx:0,vy:rand(-6,-1),size:rand(8,16),life:rand(3.5,6.5),vr:rand(-.3,.3),add:true,twinkle:true,speed:rand(2,4.5)};},event:'shooting'}
 };
 class HeartFX{
  constructor(canvas){
   this.canvas=canvas;this.ctx=canvas?.getContext('2d')||null;this.parts=[];this.effects=[];this.running=false;this.raf=0;this.cfg=null;this.anchor=null;this.reduced=false;this.w=0;this.h=0;this.dpr=1;
   const lowEnd=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
   this.quality=()=>Math.min(1,(lowEnd?.6:1)*(Math.min(innerWidth,innerHeight)<520?.65:1));
   this.loop=this.loop.bind(this);
   if(canvas&&'ResizeObserver' in window)new ResizeObserver(()=>{if(this.running)this.resize();}).observe(canvas);
   document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();else this.resume();});
  }
  resize(){
   if(!this.canvas)return;const r=this.canvas.getBoundingClientRect();
   this.dpr=Math.min(window.devicePixelRatio||1,Math.min(innerWidth,innerHeight)<520?1.5:2);
   const w=Math.max(1,Math.round(r.width*this.dpr)),h=Math.max(1,Math.round(r.height*this.dpr));
   if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
   this.w=r.width;this.h=r.height;
  }
  cardRect(){
   const c=this.canvas.getBoundingClientRect(),a=this.anchor?.getBoundingClientRect();
   if(!a||!a.width)return {x:this.w*.3,y:this.h*.15,w:this.w*.4,h:this.h*.7};
   return {x:a.left-c.left,y:a.top-c.top,w:a.width,h:a.height};
  }
  start({motif,host,rarity,anchor}){
   this.cfg={motif:MOTIFS[motif]?motif:'heart-embrace',host:host==='sanji'?'sanji':'zoro',rarity:String(rarity||'R').toLowerCase()};
   this.anchor=anchor||null;this.parts=[];this.effects=[];this.time=0;this.spawnDebt=0;this.extraDebt=0;this.nextEvent=.6;this.nextAccent=.9;this.swirl=0;
   if(this.reduced||!this.ctx){this.clear();return;}
   this.running=true;this.resize();this.last=performance.now();cancelAnimationFrame(this.raf);this.raf=requestAnimationFrame(this.loop);
  }
  stop(){this.running=false;this.cfg=null;cancelAnimationFrame(this.raf);this.parts=[];this.effects=[];this.clear();}
  pause(){cancelAnimationFrame(this.raf);this.raf=0;}
  resume(){if(this.running&&!this.reduced&&!document.hidden&&!this.raf){this.last=performance.now();this.raf=requestAnimationFrame(this.loop);}}
  setReduced(value){this.reduced=Boolean(value);if(this.reduced){this.pause();this.parts=[];this.effects=[];this.clear();}else if(this.cfg&&!this.raf){this.running=true;this.resize();this.resume();}}
  clear(){if(this.ctx&&this.canvas){this.ctx.setTransform(1,0,0,1,0,0);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);}}
  burst(rarity){
   if(this.reduced||!this.running)return;const c=this.cardRect(),cx=c.x+c.w/2,cy=c.y+c.h/2,colors=RARITY_COLORS[String(rarity||'r').toLowerCase()]||ROSE,n=Math.round(40*this.quality());
   for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(180,460);this.parts.push({sprite:SHAPES.dot(pick(colors)),x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,drag:2.6,size:rand(6,14),life:rand(.6,1.1),add:true,age:0,rot:0,vr:0});}
  }
  spawn(def,c){const p=def.spawn(c,this);p.age=0;p.rot??=0;if(p.orbit){p.x=p.orbit.cx;p.y=p.orbit.cy;}this.parts.push(p);}
  loop(now){
   this.raf=0;if(!this.running||this.reduced||document.hidden)return;
   const dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;this.time+=dt;
   const def=MOTIFS[this.cfg.motif],q=this.quality(),c=this.cardRect(),cap=Math.round(def.cap*q)+12;
   this.spawnDebt+=def.rate*q*dt;
   while(this.spawnDebt>=1){this.spawnDebt--;if(this.parts.length<cap)this.spawn(def,c);}
   const extraRate=this.cfg.rarity==='sec'?6:this.cfg.rarity==='sr'?3:0;this.extraDebt+=extraRate*q*dt;
   while(this.extraDebt>=1){this.extraDebt--;if(this.parts.length<cap+8)this.parts.push({sprite:SHAPES.glint(pick(this.cfg.rarity==='sec'?RAINBOW:GOLD)),x:rand(c.x,c.x+c.w),y:rand(c.y,c.y+c.h),vx:0,vy:-6,size:rand(6,12),life:rand(.6,1.2),add:true,twinkle:true,age:0,rot:0,vr:.6});}
   if(def.every&&this.time>=this.nextEvent){this.nextEvent=this.time+def.every;this.event(def.event,c,q);}
   if(this.time>=this.nextAccent){this.nextAccent=this.time+(this.cfg.host==='zoro'?2.9:.034);this.accent(c,q);}
   this.step(dt);this.draw(c);
   this.raf=requestAnimationFrame(this.loop);
  }
  event(name,c,q){
   if(name==='bloom'){const cx=c.x+c.w/2,cy=c.y+c.h*.45,n=Math.round(12*q)+4;for(let i=0;i<n;i++){const a=i/n*TAU,s=rand(110,170);this.parts.push({sprite:SHAPES.petal(pick(['#d81f4a','#ff8aa5'])),x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,drag:1.8,size:rand(10,16),life:1.3,rot:a+Math.PI/2,vr:0,age:0});}}
   else this.effects.push({type:name,age:0,life:name==='shine'?1.1:name==='cross'?.95:name==='pulse'?1.3:1.2,seed:Math.random()});
  }
  accent(c,q){
   if(this.cfg.host==='zoro'){this.effects.push({type:'swoosh',age:0,life:.9,seed:Math.random()});return;}
   this.swirl+=.21;const cx=c.x+c.w/2,cy=c.y+c.h/2,R=Math.max(c.w,c.h)*(.42+.18*Math.sin(this.time*.7)),a=this.swirl;
   if(this.parts.length<(MOTIFS[this.cfg.motif].cap*q+40))this.parts.push({sprite:SHAPES.dot(pick(GOLD)),x:cx+Math.cos(a)*R*.78,y:cy+Math.sin(a)*R*.55,vx:Math.cos(a)*12,vy:Math.sin(a)*12-6,size:rand(5,10),life:rand(.7,1.1),add:true,age:0,rot:0,vr:0});
  }
  step(dt){
   const next=[];
   for(const p of this.parts){
    p.age+=dt;if(p.age>=p.life)continue;
    if(p.orbit){p.orbit.a+=p.orbit.w*dt;const R=p.orbit.R*(1+.18*Math.sin(p.age*1.4));p.x=p.orbit.cx+Math.cos(p.orbit.a)*R*.82;p.y=p.orbit.cy+Math.sin(p.orbit.a)*R*.48-p.age*6;p.depth=Math.sin(p.orbit.a);}
    else{if(p.drag){const k=Math.exp(-p.drag*dt);p.vx*=k;p.vy*=k;}p.x+=(p.vx+(p.sway?Math.cos(p.phase+p.age*2.2)*p.sway:0))*dt;p.y+=p.vy*dt;}
    p.rot+=(p.vr||0)*dt;next.push(p);
   }
   this.parts=next;this.effects=this.effects.filter(e=>(e.age+=dt)<e.life);
  }
  draw(c){
   const g=this.ctx;g.setTransform(this.dpr,0,0,this.dpr,0,0);g.clearRect(0,0,this.w,this.h);
   for(const e of this.effects)this.drawEffect(g,e,c);
   for(const p of this.parts){
    const t=p.age/p.life;let alpha=Math.min(1,t*5,(1-t)*3);
    if(p.twinkle)alpha*=.45+.55*Math.abs(Math.sin((p.speed||5)*p.age+p.x));
    let size=p.size;if(p.pulse)size*=1+.16*Math.sin(p.age*7);if(p.depth!==undefined){alpha*=p.depth<0?.55:1;size*=p.depth<0?.82:1;}
    g.globalCompositeOperation=p.add?'lighter':'source-over';g.globalAlpha=Math.max(0,alpha);
    g.save();g.translate(p.x,p.y);if(p.rot)g.rotate(p.rot);g.drawImage(p.sprite,-size,-size,size*2,size*2);g.restore();
   }
   g.globalAlpha=1;g.globalCompositeOperation='source-over';
  }
  drawEffect(g,e,c){
   const t=e.age/e.life,cx=c.x+c.w/2,cy=c.y+c.h/2;g.save();
   if(e.type==='shine'){
    const radius=c.w*.045;g.beginPath();g.roundRect?g.roundRect(c.x,c.y,c.w,c.h,radius):g.rect(c.x,c.y,c.w,c.h);g.clip();
    const pos=-c.w+t*(c.w*3),grad=g.createLinearGradient(c.x+pos,c.y,c.x+pos+c.w*.5,c.y+c.h*.35);
    grad.addColorStop(0,'rgba(255,255,255,0)');grad.addColorStop(.5,'rgba(235,248,255,.38)');grad.addColorStop(1,'rgba(255,255,255,0)');
    g.globalCompositeOperation='lighter';g.fillStyle=grad;g.fillRect(c.x,c.y,c.w,c.h);
   }else if(e.type==='cross'){
    g.globalCompositeOperation='lighter';g.lineCap='round';
    const lines=[[c.x-c.w*.12,c.y+c.h*.12,c.x+c.w*1.12,c.y+c.h*.88],[c.x+c.w*1.12,c.y+c.h*.1,c.x-c.w*.12,c.y+c.h*.9]];
    lines.forEach(([x1,y1,x2,y2],i)=>{const local=Math.min(1,Math.max(0,(t-i*.18)/.32)),fade=Math.max(0,1-Math.max(0,t-.45)/.55);if(!local)return;const hx=x1+(x2-x1)*local,hy=y1+(y2-y1)*local,grad=g.createLinearGradient(x1,y1,hx,hy);grad.addColorStop(0,'rgba(255,214,107,0)');grad.addColorStop(1,`rgba(255,244,214,${.95*fade})`);g.strokeStyle=grad;g.lineWidth=Math.max(2,c.w*.016);g.shadowColor='rgba(255,210,110,.9)';g.shadowBlur=14;g.beginPath();g.moveTo(x1,y1);g.lineTo(hx,hy);g.stroke();});
   }else if(e.type==='pulse'){
    const s=Math.min(c.w,c.h)*(.35+t*.75),alpha=(1-t)*.55;g.globalAlpha=alpha;g.strokeStyle='#ff9fbd';g.lineWidth=3;g.translate(cx,cy);g.beginPath();g.moveTo(0,s*.9);g.bezierCurveTo(-s*1.5,-s*.1,-s*.7,-s*1.25,0,-s*.45);g.bezierCurveTo(s*.7,-s*1.25,s*1.5,-s*.1,0,s*.9);g.stroke();
   }else if(e.type==='shooting'){
    const sx=c.x-c.w*.4+e.seed*c.w*.4,sy=c.y-c.h*.05+e.seed*c.h*.2,len=c.w*1.6,hx=sx+len*t,hy=sy+len*.35*t,grad=g.createLinearGradient(hx-c.w*.35,hy-c.w*.08,hx,hy);
    grad.addColorStop(0,'rgba(255,246,207,0)');grad.addColorStop(1,`rgba(255,250,230,${(1-t)*.9})`);g.globalCompositeOperation='lighter';g.strokeStyle=grad;g.lineWidth=2.4;g.lineCap='round';g.beginPath();g.moveTo(hx-c.w*.35,hy-c.w*.08);g.lineTo(hx,hy);g.stroke();
   }else if(e.type==='swoosh'){
    // Tebasan giok ala trailer: busur melengkung dengan ekor yang menipis.
    g.globalCompositeOperation='lighter';g.lineCap='round';const rx=c.w*(.78+e.seed*.2),ry=c.h*.5,start=(e.seed>.5?-2.6:.4)+e.seed*.6,sweep=2.4,head=start+sweep*Math.min(1,t/.55),fade=Math.max(0,1-Math.max(0,t-.5)/.5),tail=1.3;
    for(let i=0;i<14;i++){const a0=head-tail*(i/14),a1=head-tail*((i+1)/14);if(a1<start)break;const k=1-i/14;g.strokeStyle=`rgba(${i<3?'230,255,246':'120,236,196'},${.85*k*fade})`;g.lineWidth=Math.max(1,c.w*.05*k);g.beginPath();g.ellipse(cx,cy,rx,ry,-.32,a1,a0);g.stroke();}
   }
   g.restore();
  }
 }
 window.HeartFX=HeartFX;
})();
