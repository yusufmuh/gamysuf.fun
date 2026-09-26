'use strict';

/* Papan pin "Vault of Time". Hadiah sudah dipilih server sebelum kapsul
   dilepas, jadi jalur kapsul di sini murni tontonan: acak kiri/kanan di tiap
   baris pin, lalu jatuh ke salah satu dari delapan pintu vault yang semuanya
   misteri. Gerak tiap lompatan memakai lengkung parabola agar terasa memantul
   tanpa risiko kapsul tersangkut seperti simulasi fisika bebas. */
(()=>{
 const TAU=Math.PI*2;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const THEMES={
  drop:{top:'#E62B5E',topLight:'#FF7AA0',bottom:'#FFF7F8',glow:'rgba(247,114,154,.85)',trail:'247,114,154'},
  zoro:{top:'#1F6B4A',topLight:'#3FA679',bottom:'#FDE7EC',glow:'rgba(84,201,146,.8)',trail:'84,201,146'},
  sanji:{top:'#C99A2E',topLight:'#F5C96B',bottom:'#FFF7F8',glow:'rgba(245,184,61,.85)',trail:'245,184,61'}
 };

 function drawCapsule(ctx,x,y,r,angle,theme,alpha=1){
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.shadowColor=theme.glow;
  ctx.shadowBlur=r*1.1;
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI);ctx.closePath();
  const bottom=ctx.createLinearGradient(0,0,0,r);
  bottom.addColorStop(0,theme.bottom);bottom.addColorStop(1,'#F3D3DD');
  ctx.fillStyle=bottom;ctx.fill();
  ctx.beginPath();ctx.arc(0,0,r,Math.PI,TAU);ctx.closePath();
  const top=ctx.createLinearGradient(0,-r,0,0);
  top.addColorStop(0,theme.topLight);top.addColorStop(1,theme.top);
  ctx.fillStyle=top;ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(69,18,43,.32)';
  ctx.fillRect(-r,-r*.07,r*2,r*.14);
  ctx.beginPath();
  ctx.moveTo(0,-r*.2);
  ctx.bezierCurveTo(-r*.34,-r*.3,-r*.32,-r*.72,0,-r*.78);
  ctx.bezierCurveTo(r*.32,-r*.72,r*.34,-r*.3,0,-r*.2);
  ctx.fillStyle='rgba(255,247,248,.55)';ctx.fill();
  ctx.beginPath();ctx.ellipse(-r*.42,-r*.42,r*.26,r*.14,-.7,0,TAU);
  ctx.fillStyle='rgba(255,255,255,.6)';ctx.fill();
  ctx.restore();
 }

 function tulipPath(ctx,x,y,size){
  ctx.beginPath();
  ctx.moveTo(x-size*.5,y-size*.05);
  ctx.lineTo(x-size*.5,y-size*.5);
  ctx.lineTo(x-size*.2,y-size*.25);
  ctx.lineTo(x,y-size*.62);
  ctx.lineTo(x+size*.2,y-size*.25);
  ctx.lineTo(x+size*.5,y-size*.5);
  ctx.lineTo(x+size*.5,y-size*.05);
  ctx.quadraticCurveTo(x+size*.5,y+size*.45,x,y+size*.45);
  ctx.quadraticCurveTo(x-size*.5,y+size*.45,x-size*.5,y-size*.05);
  ctx.closePath();
 }

 class DropBoard{
  constructor(canvas,{rows=10,cols=8}={}){
   this.canvas=canvas;
   this.ctx=canvas.getContext('2d');
   this.rows=rows;
   this.cols=cols;
   this.theme=THEMES.drop;
   this.glows=[];
   this.sparks=[];
   this.trail=[];
   this.ball=null;
   this.slotGlow=null;
   this.running=false;
   this.twinkleTimer=null;
   this.resize();
   if(window.ResizeObserver)new ResizeObserver(()=>this.resize()).observe(canvas);
   else window.addEventListener('resize',()=>this.resize());
  }

  setTheme(name){this.theme=THEMES[name]||THEMES.drop;this.draw();}

  resize(){
   const rect=this.canvas.getBoundingClientRect();
   if(rect.width<10||rect.height<10)return;
   const dpr=Math.min(2,window.devicePixelRatio||1);
   this.width=rect.width;this.height=rect.height;this.dpr=dpr;
   this.canvas.width=Math.round(rect.width*dpr);
   this.canvas.height=Math.round(rect.height*dpr);
   /* Tinggi konten dalam satuan jarak pin: baris pin + celah + pintu vault. */
   const units=(this.rows-1)*.86+.35+.55+1.8;
   const padX=rect.width*.07,padY=rect.height*.05;
   const spacing=Math.min((rect.width-padX*2)/(this.cols-.25),(rect.height-padY*2)/units);
   this.spacing=spacing;
   this.rowGap=spacing*.86;
   this.x0=rect.width/2-(this.cols-1)*spacing/2;
   this.y0=(rect.height-spacing*units)/2+spacing*.35;
   this.pinR=Math.max(2.4,spacing*.085);
   this.ballR=spacing*.33;
   this.slotTop=this.y0+(this.rows-1)*this.rowGap+spacing*.55;
   this.slotBottom=this.slotTop+spacing*1.8;
   this.buildStatic();
   this.draw();
  }

  pinX(row,index){return this.x0+(row%2?this.spacing/2:0)+index*this.spacing;}
  pinY(row){return this.y0+row*this.rowGap;}
  pinCount(row){return row%2?this.cols-1:this.cols;}
  slotX(slot){return this.x0+slot*this.spacing;}

  buildStatic(){
   const layer=document.createElement('canvas');
   layer.width=this.canvas.width;layer.height=this.canvas.height;
   const ctx=layer.getContext('2d');
   ctx.scale(this.dpr,this.dpr);
   const w=this.width,h=this.height;

   const plate=ctx.createLinearGradient(0,0,0,h);
   plate.addColorStop(0,'#2b1a2a');plate.addColorStop(.55,'#1c1420');plate.addColorStop(1,'#120a12');
   ctx.fillStyle=plate;ctx.fillRect(0,0,w,h);

   ctx.save();
   ctx.globalAlpha=.07;
   const brickH=Math.max(12,h/34),brickW=brickH*2.6;
   for(let y=0,row=0;y<h;y+=brickH,row++){
    for(let x=(row%2)*-brickW/2;x<w;x+=brickW){
     ctx.fillStyle=row%3?'#b5654e':'#8f4a3a';
     ctx.fillRect(x+1,y+1,brickW-2,brickH-2);
    }
   }
   ctx.restore();

   const vignette=ctx.createRadialGradient(w/2,h*.42,h*.1,w/2,h*.42,h*.85);
   vignette.addColorStop(0,'rgba(230,43,94,.10)');vignette.addColorStop(1,'rgba(10,4,8,.72)');
   ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);

   for(let row=0;row<this.rows;row++){
    for(let i=0;i<this.pinCount(row);i++){
     const x=this.pinX(row,i),y=this.pinY(row);
     ctx.beginPath();ctx.arc(x+this.pinR*.35,y+this.pinR*.5,this.pinR*1.05,0,TAU);
     ctx.fillStyle='rgba(0,0,0,.45)';ctx.fill();
     const brass=ctx.createRadialGradient(x-this.pinR*.35,y-this.pinR*.4,this.pinR*.1,x,y,this.pinR);
     brass.addColorStop(0,'#FFF4DB');brass.addColorStop(.45,'#F5B83D');brass.addColorStop(1,'#8A5A00');
     ctx.beginPath();ctx.arc(x,y,this.pinR,0,TAU);ctx.fillStyle=brass;ctx.fill();
    }
   }

   const top=this.slotTop,bottom=this.slotBottom,s=this.spacing;
   for(let slot=0;slot<this.cols;slot++){
    const cx=this.slotX(slot),left=cx-s/2+3,width=s-6;
    const door=ctx.createLinearGradient(0,top,0,bottom);
    door.addColorStop(0,'#3b1026');door.addColorStop(1,'#1a0610');
    ctx.fillStyle=door;
    ctx.beginPath();
    ctx.roundRect?ctx.roundRect(left,top,width,bottom-top,[6,6,10,10]):ctx.rect(left,top,width,bottom-top);
    ctx.fill();
    ctx.strokeStyle='rgba(249,162,193,.28)';ctx.lineWidth=1.5;ctx.stroke();
    tulipPath(ctx,cx,top+(bottom-top)*.58,s*.34);
    ctx.fillStyle='rgba(247,114,154,.22)';ctx.fill();
    ctx.strokeStyle='rgba(249,162,193,.45)';ctx.lineWidth=1.2;ctx.stroke();
   }
   for(let slot=0;slot<=this.cols;slot++){
    const x=this.slotX(slot)-s/2;
    const peg=ctx.createLinearGradient(x-3,0,x+3,0);
    peg.addColorStop(0,'#8A5A00');peg.addColorStop(.5,'#F5C96B');peg.addColorStop(1,'#8A5A00');
    ctx.fillStyle=peg;ctx.fillRect(x-2.5,top-s*.18,5,bottom-top+s*.18);
    ctx.beginPath();ctx.arc(x,top-s*.18,4,0,TAU);ctx.fill();
   }

   ctx.strokeStyle='rgba(245,184,61,.35)';ctx.lineWidth=2;
   ctx.strokeRect(1,1,w-2,h-2);
   const rivet=(x,y)=>{ctx.beginPath();ctx.arc(x,y,3.2,0,TAU);ctx.fillStyle='#F5C96B';ctx.fill();ctx.beginPath();ctx.arc(x-.8,y-.8,1.2,0,TAU);ctx.fillStyle='#FFF4DB';ctx.fill();};
   for(let x=16;x<w-8;x+=Math.max(48,w/10)){rivet(x,10);rivet(x,h-10);}
   for(let y=16;y<h-8;y+=Math.max(48,h/12)){rivet(10,y);rivet(w-10,y);}
   this.staticLayer=layer;
  }

  draw(){
   const ctx=this.ctx;
   if(!this.staticLayer)return;
   ctx.setTransform(1,0,0,1,0,0);
   ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
   ctx.drawImage(this.staticLayer,0,0);
   ctx.scale(this.dpr,this.dpr);
   const now=performance.now();

   if(this.slotGlow){
    const age=(now-this.slotGlow.t0)/1000;
    const pulse=.55+.45*Math.sin(age*9);
    const cx=this.slotX(this.slotGlow.slot),s=this.spacing;
    const glow=ctx.createRadialGradient(cx,this.slotBottom-s*.4,2,cx,this.slotBottom-s*.4,s*1.3);
    glow.addColorStop(0,`rgba(${this.theme.trail},${.55*pulse})`);glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow;ctx.fillRect(cx-s*1.4,this.slotTop-s*.4,s*2.8,this.slotBottom-this.slotTop+s*.5);
   }

   this.glows=this.glows.filter(glow=>now-glow.t0<520);
   for(const glow of this.glows){
    const p=(now-glow.t0)/520;
    ctx.beginPath();ctx.arc(glow.x,glow.y,this.pinR*(1.4+p*3.2),0,TAU);
    ctx.strokeStyle=`rgba(${glow.color||this.theme.trail},${(1-p)*.85})`;
    ctx.lineWidth=2.2*(1-p)+.4;ctx.stroke();
    ctx.beginPath();ctx.arc(glow.x,glow.y,this.pinR*1.05,0,TAU);
    ctx.fillStyle=`rgba(255,244,219,${(1-p)*.9})`;ctx.fill();
   }

   this.sparks=this.sparks.filter(spark=>now-spark.t0<spark.life);
   for(const spark of this.sparks){
    const t=(now-spark.t0)/1000;
    const x=spark.x+spark.vx*t,y=spark.y+spark.vy*t+420*t*t;
    const alpha=1-(now-spark.t0)/spark.life;
    ctx.fillStyle=`rgba(255,${200+Math.round(55*alpha)},${160+Math.round(60*alpha)},${alpha})`;
    ctx.fillRect(x-1.2,y-1.2,2.4,2.4);
   }

   if(this.trail.length>1){
    for(let i=1;i<this.trail.length;i++){
     const a=this.trail[i-1],b=this.trail[i],k=i/this.trail.length;
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
     ctx.strokeStyle=`rgba(${this.theme.trail},${k*.45})`;
     ctx.lineWidth=this.ballR*1.4*k;ctx.lineCap='round';ctx.stroke();
    }
   }
   if(this.ball)drawCapsule(ctx,this.ball.x,this.ball.y,this.ballR,this.ball.angle,this.theme,this.ball.alpha??1);
  }

  loop(){
   if(this.running)return;
   this.running=true;
   const tick=()=>{
    this.draw();
    if(this.ball&&this.ball.animating||this.glows.length||this.sparks.length||this.slotGlow){requestAnimationFrame(tick);}
    else this.running=false;
   };
   requestAnimationFrame(tick);
  }

  twinkle(on){
   clearInterval(this.twinkleTimer);
   if(!on)return;
   this.twinkleTimer=setInterval(()=>{
    if(document.hidden||this.ball?.animating)return;
    const row=Math.floor(Math.random()*this.rows);
    const i=Math.floor(Math.random()*this.pinCount(row));
    this.glows.push({x:this.pinX(row,i),y:this.pinY(row),t0:performance.now(),color:'245,184,61'});
    this.loop();
   },650);
  }

  hitPin(row,index,onPin){
   const x=this.pinX(row,index),y=this.pinY(row),now=performance.now();
   this.glows.push({x,y,t0:now});
   for(let k=0;k<5;k++)this.sparks.push({x,y:y-this.pinR,vx:(Math.random()-.5)*160,vy:-60-Math.random()*140,t0:now,life:380+Math.random()*260});
   onPin?.(row,this.rows);
  }

  /* Rute acak baris demi baris. Kapsul selalu mendarat di atas pin, lalu
     berbelok setengah jarak pin ke kiri atau kanan. */
  route(){
   const steps=[];
   let index=Math.random()<.5?Math.floor(this.cols/2)-1:Math.floor(this.cols/2);
   for(let row=0;row<this.rows;row++){
    steps.push({row,index});
    const goRight=Math.random()<.5;
    if(row%2===0){
     if(index===0)index=0;
     else if(index===this.cols-1)index=this.cols-2;
     else index=goRight?index:index-1;
    }else index=goRight?index+1:index;
   }
   const last=steps.at(-1);
   const right=Math.random()<.5;
   const slot=clamp(last.row%2?last.index+(right?1:0):last.index,0,this.cols-1);
   return {steps,slot};
  }

  clear(){this.ball=null;this.trail=[];this.slotGlow=null;this.draw();}

  drop({duration=7000,onPin,onRelease}={}){
   this.clear();
   const {steps,slot}=this.route();
   const dropMs=clamp(duration*.48,2600,5200);
   const entryMs=420,finalMs=520;
   const hopBase=(dropMs-entryMs-finalMs)/(this.rows-1);
   const contact=row=>this.pinY(row)-this.pinR-this.ballR*.92;
   const segments=[];
   const startX=this.pinX(0,steps[0].index)+(Math.random()-.5)*this.spacing*.12;
   segments.push({x0:startX,y0:-this.ballR*2,x1:this.pinX(0,steps[0].index),y1:contact(0),ms:entryMs,bounce:0,hit:steps[0]});
   for(let i=1;i<steps.length;i++){
    const a=steps[i-1],b=steps[i];
    segments.push({x0:this.pinX(a.row,a.index),y0:contact(a.row),x1:this.pinX(b.row,b.index),y1:contact(b.row),ms:hopBase*(.88+Math.random()*.24),bounce:this.rowGap*(.28+Math.random()*.2),hit:b});
   }
   const last=steps.at(-1);
   const floor=this.slotBottom-this.ballR-6;
   segments.push({x0:this.pinX(last.row,last.index),y0:contact(last.row),x1:this.slotX(slot),y1:floor,ms:finalMs,bounce:this.rowGap*.25,land:true});
   segments.push({x0:this.slotX(slot),y0:floor,x1:this.slotX(slot),y1:floor,ms:260,bounce:this.ballR*.9,settle:true});
   segments.push({x0:this.slotX(slot),y0:floor,x1:this.slotX(slot),y1:floor,ms:160,bounce:this.ballR*.35,settle:true});

   this.ball={x:startX,y:-this.ballR*2,angle:0,animating:true};
   onRelease?.();
   this.loop();
   return new Promise(resolve=>{
    /* Linimasa berbasis waktu nyata: bila frame tersendat (laptop lambat atau
       jendela tertutup), segmen yang sudah lewat dilompati sekaligus sehingga
       durasi total tetap sesuai pengaturan. */
    let index=0,segmentStart=performance.now();
    const finish=()=>{
     this.ball.animating=false;this.trail=[];
     const rect=this.canvas.getBoundingClientRect();
     resolve({slot,x:rect.left+this.ball.x,y:rect.top+this.ball.y,r:this.ballR});
    };
    const step=()=>{
     const now=performance.now();
     while(index<segments.length&&now-segmentStart>=segments[index].ms){
      const done=segments[index];
      if(done.hit)this.hitPin(done.hit.row,done.hit.index,onPin);
      if(done.land){this.slotGlow={slot,t0:now};onPin?.(this.rows,this.rows);}
      segmentStart+=done.ms;index++;
     }
     if(index>=segments.length){
      const last=segments.at(-1);
      this.ball.x=last.x1;this.ball.y=last.y1;
      finish();
      return;
     }
     const seg=segments[index];
     const u=clamp((now-segmentStart)/seg.ms,0,1);
     const x=seg.x0+(seg.x1-seg.x0)*u;
     const y=seg.bounce?seg.y0+(seg.y1-seg.y0)*u*u-seg.bounce*4*u*(1-u):seg.y0+(seg.y1-seg.y0)*u*u;
     this.ball.angle+=(x-this.ball.x)/this.ballR;
     this.ball.x=x;this.ball.y=y;
     this.trail.push({x,y});if(this.trail.length>14)this.trail.shift();
     requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
   });
  }
 }

 window.BDBoard={DropBoard,THEMES,drawCapsule};
})();
