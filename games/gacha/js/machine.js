'use strict';

/* Kubah kaca mesin gacha: kapsul dua warna dengan fisika 2D sederhana
   (gravitasi, tumbukan antarkapsul, pantulan dinding kubah). Warna kapsul
   mengikuti kelas hadiah dan jumlahnya sebanding dengan isi mesin nyata,
   jadi visual tidak menjanjikan hadiah yang tidak ada. Loop animasi tidur
   saat semua kapsul diam supaya HP tetap dingin di booth yang ramai. */
(()=>{
 const PALETTES={
  bundling:[['#fff0b8','#f5b83d','#b97c0b']],
  collab:[['#c6e8ff','#39a7e5','#16609e'],['#e4dcff','#9c8cff','#5a45c8']],
  voucher:[['#d1ffe0','#51bd95','#14745d']],
  product:[['#ffc3d5','#e62b5e','#9c1240'],['#ffd8e3','#f7729a','#b8335f'],['#ffd0dc','#ff5d8c','#b3164b']],
  empty:[['#ffffff','#e8dde2','#a8949d']]
 };
 const RADIUS=.15;
 const GRAVITY=4.4;
 const WALL_BOUNCE=.38;
 const BALL_BOUNCE=.32;

 const rand=(min,max)=>min+Math.random()*(max-min);

 function paletteFor(tier,variant=0){
  const list=PALETTES[tier]||PALETTES.product;
  return list[variant%list.length];
 }

 function capsuleSprite(palette,size){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');
  const r=size/2-2,c=size/2;
  const [light,mid,dark]=palette;
  ctx.save();
  ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.clip();
  const top=ctx.createLinearGradient(0,c-r,0,c);
  top.addColorStop(0,light);top.addColorStop(.55,mid);top.addColorStop(1,dark);
  ctx.fillStyle=top;ctx.fillRect(0,0,size,c);
  const bottom=ctx.createLinearGradient(0,c,0,c+r);
  bottom.addColorStop(0,'rgba(255,247,248,.95)');bottom.addColorStop(1,'rgba(232,214,222,.92)');
  ctx.fillStyle=bottom;ctx.fillRect(0,c,size,c);
  ctx.fillStyle='rgba(69,18,43,.28)';ctx.fillRect(0,c-size*.03,size,size*.06);
  const shade=ctx.createRadialGradient(c-r*.35,c-r*.4,r*.1,c,c,r);
  shade.addColorStop(0,'rgba(255,255,255,0)');shade.addColorStop(.75,'rgba(255,255,255,0)');shade.addColorStop(1,'rgba(42,10,24,.32)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,size,size);
  ctx.restore();
  ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.lineWidth=Math.max(1.2,size*.035);ctx.strokeStyle='rgba(42,10,24,.55)';ctx.stroke();
  ctx.beginPath();ctx.ellipse(c-r*.38,c-r*.48,r*.26,r*.14,-.6,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.78)';ctx.fill();
  ctx.beginPath();ctx.arc(c+r*.45,c+r*.38,r*.08,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.55)';ctx.fill();
  return canvas;
 }

 class GPMachine{
  constructor(canvas,{reducedMotion=false,onClack}={}){
   this.canvas=canvas;
   this.ctx=canvas.getContext('2d');
   this.reducedMotion=reducedMotion;
   this.onClack=onClack;
   this.balls=[];
   this.sprites=new Map();
   this.frame=0;this.last=0;this.quiet=0;
   this.agitateUntil=0;this.agitateStrength=1;this.nextKick=0;
   this.count=28;
   this.resize();
  }

  resize(){
   const rect=this.canvas.getBoundingClientRect();
   const dpr=Math.min(window.devicePixelRatio||1,2.5);
   const size=Math.max(80,Math.round(rect.width*dpr));
   if(this.canvas.width!==size){this.canvas.width=this.canvas.height=size;this.sprites.clear();}
   this.scale=size/2;
   this.draw();
  }

  sprite(ball){
   const size=Math.ceil(RADIUS*2*this.scale)+4;
   const key=`${ball.tier}:${ball.variant}:${size}`;
   if(!this.sprites.has(key))this.sprites.set(key,capsuleSprite(paletteFor(ball.tier,ball.variant),size));
   return this.sprites.get(key);
  }

  /* Jumlah kapsul per kelas sebanding dengan isi mesin, minimal satu untuk
     kelas yang masih ada. Kapsul yang sudah di kubah dipertahankan posisinya. */
  setComposition(byTier){
   const width=this.canvas.getBoundingClientRect().width;
   this.count=width<190?20:width<260?24:28;
   const tiers=['bundling','collab','voucher','product','empty'];
   const total=tiers.reduce((sum,tier)=>sum+(byTier?.[tier]||0),0);
   let want;
   if(total>0){
    want=Object.fromEntries(tiers.map(tier=>[tier,byTier[tier]>0?Math.max(1,Math.round(this.count*byTier[tier]/total)):0]));
    let sum=Object.values(want).reduce((a,b)=>a+b,0);
    const biggest=tiers.reduce((a,b)=>want[b]>want[a]?b:a,'product');
    while(sum>this.count&&want[biggest]>1){want[biggest]--;sum--;}
    while(sum<this.count){want[biggest]++;sum++;}
   }else want={bundling:0,collab:0,voucher:0,product:0,empty:6};
   const current=this.balls.filter(ball=>!ball.removing);
   const leaving=this.balls.filter(ball=>ball.removing);
   const kept=[],spare=[];
   for(const ball of current){
    if(want[ball.tier]>0){want[ball.tier]--;kept.push(ball);}
    else spare.push(ball);
   }
   for(const tier of tiers){
    while(want[tier]>0){
     const ball=spare.pop()||this.spawn(kept.length);
     ball.tier=tier;ball.variant=Math.floor(Math.random()*6);
     kept.push(ball);want[tier]--;
    }
   }
   this.balls=[...kept,...leaving];
   if(!current.length)this.settle();
   this.wake();
  }

  spawn(index=0){
   const column=index%5,row=Math.floor(index/5);
   return {x:(column-2)*.3+rand(-.04,.04),y:-.55+row*.08+rand(-.03,.03),vx:rand(-.3,.3),vy:rand(0,.4),a:rand(0,Math.PI*2),va:rand(-2,2),tier:'product',variant:0};
  }

  /* Simulasi cepat di belakang layar agar tampilan pertama sudah rapi. */
  settle(){for(let i=0;i<420;i++)this.step(1/120,false);}

  agitate(duration=1200,strength=1){
   const now=performance.now();
   this.agitateUntil=now+(this.reducedMotion?Math.min(duration,300):duration);
   this.agitateStrength=this.reducedMotion?.4:strength;
   this.nextKick=0;
   this.wake();
  }

  /* Satu kapsul turun ke leher mesin. Mengembalikan palet untuk kapsul DOM
     yang keluar dari corong, supaya warnanya sama persis. */
  takeOut(tier){
   const candidates=this.balls.filter(ball=>!ball.removing&&ball.tier===tier);
   const pool=candidates.length?candidates:this.balls.filter(ball=>!ball.removing);
   if(!pool.length)return paletteFor(tier);
   const ball=pool.reduce((a,b)=>b.y>a.y?b:a);
   ball.removing=true;ball.t=0;ball.fromX=ball.x;ball.fromY=ball.y;
   this.wake();
   return paletteFor(tier,ball.tier===tier?ball.variant:0);
  }

  wake(){
   this.quiet=0;
   if(!this.frame){this.last=performance.now();this.frame=requestAnimationFrame(time=>this.loop(time));}
  }

  loop(time){
   const dt=Math.min(.034,(time-this.last)/1000||0);
   this.last=time;
   const steps=3;
   for(let i=0;i<steps;i++)this.step(dt/steps,true,time);
   this.draw();
   const moving=this.balls.some(ball=>ball.removing||Math.hypot(ball.vx,ball.vy)>.05);
   this.quiet=moving||time<this.agitateUntil?0:this.quiet+dt;
   if(this.quiet>.5||document.hidden){this.frame=0;return;}
   this.frame=requestAnimationFrame(next=>this.loop(next));
  }

  step(h,live=true,time=performance.now()){
   const agitating=live&&time<this.agitateUntil;
   if(agitating&&time>=this.nextKick){
    this.nextKick=time+110;
    let clacks=0;
    for(const ball of this.balls){
     if(ball.removing||Math.random()>.55)continue;
     ball.vx+=rand(-1.7,1.7)*this.agitateStrength;
     ball.vy-=rand(1.6,3.6)*this.agitateStrength;
     ball.va+=rand(-9,9);
     clacks++;
    }
    if(clacks&&this.onClack)this.onClack(Math.min(1,clacks/10));
   }
   const limit=1-RADIUS;
   for(const ball of this.balls){
    if(ball.removing){
     ball.t+=h/.5;
     const k=Math.min(1,ball.t);
     ball.x=ball.fromX*(1-k);
     ball.y=ball.fromY+(1.12-ball.fromY)*k*k;
     ball.a+=h*8;
     continue;
    }
    if(agitating){ball.vx+=-ball.y*1.4*h;ball.vy+=ball.x*1.4*h;}
    ball.vy+=GRAVITY*h;
    ball.x+=ball.vx*h;ball.y+=ball.vy*h;ball.a+=ball.va*h;
    ball.va*=.992;ball.vx*=.998;ball.vy*=.998;
    const distance=Math.hypot(ball.x,ball.y);
    if(distance>limit){
     const nx=ball.x/distance,ny=ball.y/distance;
     ball.x=nx*limit;ball.y=ny*limit;
     const vn=ball.vx*nx+ball.vy*ny;
     if(vn>0){
      ball.vx-=(1+WALL_BOUNCE)*vn*nx;ball.vy-=(1+WALL_BOUNCE)*vn*ny;
      const tangent=ball.vx*-ny+ball.vy*nx;
      ball.va=tangent/RADIUS*.6;
      ball.vx*=.985;ball.vy*=.985;
     }
    }
   }
   const minimum=RADIUS*2;
   for(let i=0;i<this.balls.length;i++){
    const a=this.balls[i];
    if(a.removing)continue;
    for(let j=i+1;j<this.balls.length;j++){
     const b=this.balls[j];
     if(b.removing)continue;
     const dx=b.x-a.x,dy=b.y-a.y;
     const d2=dx*dx+dy*dy;
     if(d2>=minimum*minimum||d2===0)continue;
     const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,overlap=(minimum-d)/2;
     a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
     const vn=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
     if(vn<0){
      const impulse=-(1+BALL_BOUNCE)*vn/2;
      a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
      const spin=((b.vx-a.vx)*-ny+(b.vy-a.vy)*nx)*.8;
      a.va-=spin;b.va+=spin;
     }
    }
   }
   this.balls=this.balls.filter(ball=>!ball.removing||ball.t<1);
  }

  draw(){
   const {ctx,canvas,scale}=this;
   if(!scale)return;
   ctx.clearRect(0,0,canvas.width,canvas.height);
   const ordered=[...this.balls].sort((a,b)=>a.y-b.y);
   for(const ball of ordered){
    const sprite=this.sprite(ball);
    const x=scale+ball.x*scale,y=scale+ball.y*scale;
    const shrink=ball.removing?1-Math.min(1,ball.t)*.35:1;
    ctx.save();
    ctx.globalAlpha=ball.removing?Math.max(0,1-ball.t*1.1):1;
    ctx.translate(x,y);ctx.rotate(ball.a);ctx.scale(shrink,shrink);
    ctx.drawImage(sprite,-sprite.width/2,-sprite.height/2);
    ctx.restore();
   }
  }
 }

 GPMachine.paletteFor=paletteFor;
 window.GPMachine=GPMachine;
})();
