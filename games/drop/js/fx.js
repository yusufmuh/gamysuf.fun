'use strict';

/* Partikel layar penuh: kelopak tulip, konfeti, dan debu cahaya lampu gudang.
   Loop hanya berjalan selama ada partikel supaya laptop booth tetap dingin. */
(()=>{
 const TAU=Math.PI*2;
 const PALETTE=['#E62B5E','#F7729A','#F9A2C1','#FBCFDB','#F5B83D','#FFF7F8'];
 let canvas,ctx,width=0,height=0,dpr=1,running=false,ambientOn=false,lastTime=0;
 const particles=[];
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

 function resize(){
  dpr=Math.min(2,window.devicePixelRatio||1);
  width=window.innerWidth;height=window.innerHeight;
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 }

 function petal(p){
  ctx.beginPath();
  ctx.moveTo(0,-p.size);
  ctx.bezierCurveTo(p.size*.9,-p.size*.6,p.size*.7,p.size*.7,0,p.size);
  ctx.bezierCurveTo(-p.size*.7,p.size*.7,-p.size*.9,-p.size*.6,0,-p.size);
  ctx.fill();
 }

 function star(p){
  ctx.beginPath();
  for(let i=0;i<8;i++){
   const r=i%2?p.size*.38:p.size;
   const a=i*Math.PI/4;
   ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  ctx.closePath();ctx.fill();
 }

 function frame(time){
  const dt=Math.min(.05,(time-(lastTime||time))/1000);
  lastTime=time;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);
  if(ambientOn&&particles.filter(p=>p.kind==='dust').length<46&&Math.random()<.35)spawnDust();
  for(let i=particles.length-1;i>=0;i--){
   const p=particles[i];
   p.age+=dt;
   if(p.age>p.life||p.y>height+60){particles.splice(i,1);continue;}
   p.vy+=p.gravity*dt;
   p.vx*=1-p.drag*dt;p.vy*=1-p.drag*dt;
   p.x+=(p.vx+Math.sin(p.age*p.wobble+p.phase)*p.sway)*dt;
   p.y+=p.vy*dt;
   p.rot+=p.spin*dt;
   const fadeIn=Math.min(1,p.age/.25),fadeOut=Math.min(1,(p.life-p.age)/.6);
   ctx.save();
   ctx.globalAlpha=p.alpha*fadeIn*fadeOut;
   ctx.translate(p.x,p.y);ctx.rotate(p.rot);
   if(p.kind==='dust'){
    ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,p.size,0,TAU);ctx.fill();
   }else{
    ctx.scale(1,Math.abs(Math.cos(p.age*p.flip))+.25);
    ctx.fillStyle=p.color;
    if(p.shape==='petal')petal(p);
    else if(p.shape==='star')star(p);
    else ctx.fillRect(-p.size*.5,-p.size*.3,p.size,p.size*.6);
   }
   ctx.restore();
  }
  if(particles.length||ambientOn)requestAnimationFrame(frame);
  else{running=false;lastTime=0;ctx.clearRect(0,0,width,height);}
 }

 function start(){if(!running&&canvas){running=true;lastTime=0;requestAnimationFrame(frame);}}

 function spawnDust(){
  particles.push({kind:'dust',x:Math.random()*width,y:height*(.2+Math.random()*.8),vx:(Math.random()-.5)*8,vy:-6-Math.random()*14,gravity:0,drag:0,sway:10,wobble:.6+Math.random(),phase:Math.random()*TAU,rot:0,spin:0,flip:0,size:.8+Math.random()*1.8,color:Math.random()<.5?'rgba(245,201,107,.9)':'rgba(249,162,193,.9)',alpha:.25+Math.random()*.35,age:0,life:6+Math.random()*6});
 }

 function burst(x,y,{count=90,power=1,colors=PALETTE,shapes=['petal','petal','star','rect']}={}){
  if(reduced)count=Math.round(count/4);
  for(let i=0;i<count;i++){
   const angle=Math.random()*TAU,speed=(260+Math.random()*520)*power;
   particles.push({kind:'confetti',shape:shapes[i%shapes.length],x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-180*power,gravity:520,drag:1.6,sway:30,wobble:3+Math.random()*3,phase:Math.random()*TAU,rot:Math.random()*TAU,spin:(Math.random()-.5)*10,flip:3+Math.random()*5,size:5+Math.random()*7,color:colors[i%colors.length],alpha:1,age:0,life:2.6+Math.random()*1.6});
  }
  start();
 }

 function rain(seconds=3,{colors=PALETTE}={}){
  const total=reduced?30:Math.round(seconds*55);
  for(let i=0;i<total;i++){
   particles.push({kind:'confetti',shape:i%3?'petal':'star',x:Math.random()*width,y:-20-Math.random()*height*.6,vx:(Math.random()-.5)*40,vy:80+Math.random()*120,gravity:60,drag:.4,sway:40,wobble:1.5+Math.random()*2,phase:Math.random()*TAU,rot:Math.random()*TAU,spin:(Math.random()-.5)*4,flip:2+Math.random()*3,size:6+Math.random()*6,color:colors[i%colors.length],alpha:.95,age:0,life:seconds+3});
  }
  start();
 }

 function ambient(on){ambientOn=Boolean(on)&&!reduced;if(ambientOn)start();}

 function init(element){
  canvas=element;ctx=canvas.getContext('2d');
  resize();window.addEventListener('resize',resize);
 }

 window.BDFx={init,burst,rain,ambient,PALETTE};
})();
