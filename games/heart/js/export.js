'use strict';
/* Ekspor PNG kartu (1080×1508) dan poster bounty (1080×1528) memakai <canvas>.
   Semua aset same-origin; bila browser menganggap SVG mencemari kanvas,
   gambar diulang tanpa lapisan SVG agar unduhan tetap berhasil. */
(()=>{
 const {PATHS,money}=window.HeartCards;
 const THEME={
  zoro:{frame:['#071d16','#2b8a66','#0c3a2b','#7fdcb3','#08261c'],accent:'#2a8a66',deep:'#0d3528',light:'#c6f5df',sky:['#f6fcf5','#d3eee0','#86c1a6','#2f7259','#123528'],scene:'/assets/ui/scene-zoro.svg'},
  sanji:{frame:['#3b2507','#e2b75a','#7a5212','#fbe6a8','#4a2e08'],accent:'#b9801f',deep:'#3f2606',light:'#ffe7ad',sky:['#fff3c9','#f4cd73','#c98a2b','#6b3510','#2f1306'],scene:'/assets/ui/scene-sanji.svg'}
 };
 const cache=new Map();
 function load(url){
  if(!url)return Promise.resolve(null);
  if(!cache.has(url))cache.set(url,new Promise(resolve=>{const img=new Image();img.decoding='async';img.addEventListener('load',()=>{(img.decode?img.decode():Promise.resolve()).then(()=>resolve(img),()=>resolve(img));},{once:true});img.addEventListener('error',()=>{cache.delete(url);resolve(null);},{once:true});img.src=url;}));
  return cache.get(url);
 }
 // Lapisan foto opsional dari CSS (--scene-photo / --poster-paper) ikut dipakai bila diisi integrator.
 function cssImage(className,prop){
  const probe=document.createElement('div');probe.className=className;probe.style.cssText='position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
  document.body.append(probe);const value=getComputedStyle(probe).getPropertyValue(prop).trim();probe.remove();
  const match=/^url\((['"]?)(.+?)\1\)$/.exec(value);return match?match[2]:null;
 }
 async function fonts(){
  try{await document.fonts.ready;await Promise.all(['italic 900 120px Fraunces','italic 500 40px Fraunces','800 40px Poppins','700 30px Poppins','600 30px Poppins','500 30px Poppins'].map(f=>document.fonts.load(f)));}catch{/* fallback font sistem */}
 }
 function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
 function cover(g,img,x,y,w,h,ay=.5){if(!img)return;const s=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*s,ih=img.naturalHeight*s;g.drawImage(img,x+(w-iw)/2,y+(h-ih)*ay,iw,ih);}
 function contain(g,img,x,y,w,h,ax=.5,ay=.5){if(!img)return;const s=Math.min(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*s,ih=img.naturalHeight*s;g.drawImage(img,x+(w-iw)*ax,y+(h-ih)*ay,iw,ih);}
 function spacing(g,px){if('letterSpacing' in g)g.letterSpacing=px+'px';}
 async function bipySeal(g,x,y,r){
  const art=await load('/assets/brand/bipy-pink.webp');
  const stamp=document.createElement('canvas');stamp.width=320;stamp.height=320;const s=stamp.getContext('2d');
  s.strokeStyle='#e62b5e';s.fillStyle='#e62b5e';s.lineWidth=9;s.beginPath();s.arc(160,160,145,0,Math.PI*2);s.stroke();s.lineWidth=3;s.beginPath();s.arc(160,160,132,0,Math.PI*2);s.stroke();
  if(art){s.save();s.filter='grayscale(1) sepia(1) saturate(3) hue-rotate(295deg)';s.drawImage(art,0,0,art.naturalWidth,Math.min(art.naturalHeight,art.naturalWidth),90,47,140,140);s.restore();}
  s.textAlign='center';s.font='800 29px Poppins';s.fillText('BPEDIA BABES',160,230);s.font='600 17px Poppins';s.fillText('MOMEN ISTIMEWA',160,260);
  s.globalCompositeOperation='destination-out';for(let i=0;i<190;i++){s.beginPath();s.arc((i*47)%320,(i*83)%320,1.1+(i%4)*.3,0,Math.PI*2);s.fill();}
  g.save();g.translate(x,y);g.rotate(-.22);g.globalAlpha=.93;g.drawImage(stamp,-r,-r,r*2,r*2);g.restore();
 }
 function fit(g,text,maxWidth,make,start,min){let size=start;g.font=make(size);while(size>min&&g.measureText(text).width>maxWidth){size-=2;g.font=make(size);}return size;}
 function gradient(g,x0,y0,x1,y1,stops){const grad=g.createLinearGradient(x0,y0,x1,y1);stops.forEach((c,i)=>grad.addColorStop(i/(stops.length-1),c));return grad;}
 function iconPath(g,name,x,y,size,color,width=2){const p=new Path2D(PATHS[name]||PATHS.heart);g.save();g.translate(x-size/2,y-size/2);g.scale(size/24,size/24);g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.stroke(p);g.restore();}
 /* Teks efek: kata kunci [..] dan "Saat dimainkan:" digambar sebagai pil. */
 function effectTokens(text){
  const tokens=[];String(text||'').replace(/\[([^\]]{1,24})\]|Saat dimainkan:|(\S+)/g,(m,kw,word)=>{tokens.push(kw?{kw:kw}:m==='Saat dimainkan:'?{kw:'Saat dimainkan'}:{word});return m;});return tokens;
 }
 function layoutEffect(g,tokens,maxWidth,fontSize){
  const lines=[[]];let width=0;const space=fontSize*.3;
  for(const t of tokens){
   g.font=t.kw?`700 ${fontSize*.82}px Poppins`:`500 ${fontSize}px Poppins`;
   const w=g.measureText(t.kw||t.word).width+(t.kw?fontSize*.9:0);
   if(width&&width+space+w>maxWidth){lines.push([]);width=0;}
   lines[lines.length-1].push({...t,w});width+=(width?space:0)+w;
  }
  return lines;
 }
 async function paintScene(g,host,x,y,w,h,{safe,ay=.5}){
  const t=THEME[host];g.fillStyle=gradient(g,0,y,0,y+h,t.sky);g.fillRect(x,y,w,h);
  if(!safe)cover(g,await load(t.scene),x,y,w,h,ay);
  const photo=cssImage(`tcg host-${host}`,'--scene-photo');if(photo)cover(g,await load(photo),x,y,w,h,ay);
 }
 async function drawCard(card,{hostName,safe=false}){
  await fonts();
  const host=card.hostId==='sanji'?'sanji':'zoro',t=THEME[host],W=1080,H=1508,B=28;
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const g=canvas.getContext('2d');if(!g)throw new Error('Kanvas tidak tersedia.');
  const [art,mark]=await Promise.all([load(card.image),load('/assets/brand/bpedia-white.webp')]);
  if(!art)throw new Error('Gambar kartu belum termuat.');
  rr(g,0,0,W,H,56);g.save();g.clip();
  g.fillStyle=gradient(g,0,0,W,H,t.frame);g.fillRect(0,0,W,H);
  const ix=B,iy=B,iw=W-B*2,ih=H-B*2;
  g.save();rr(g,ix,iy,iw,ih,30);g.clip();
  await paintScene(g,host,ix,iy,iw,ih,{safe});
  g.drawImage(art,ix,iy+ih*.035,iw,iw*1.5);
  let shade=g.createLinearGradient(0,iy,0,iy+ih*.2);shade.addColorStop(0,'rgba(8,5,6,.42)');shade.addColorStop(1,'rgba(8,5,6,0)');g.fillStyle=shade;g.fillRect(ix,iy,iw,ih*.2);
  shade=g.createLinearGradient(0,iy+ih*.48,0,iy+ih);shade.addColorStop(0,'rgba(8,5,6,0)');shade.addColorStop(1,'rgba(8,5,6,.82)');g.fillStyle=shade;g.fillRect(ix,iy+ih*.48,iw,ih*.52);
  if(card.rarity!=='R'){g.globalCompositeOperation='soft-light';g.globalAlpha=card.rarity==='SEC'?.55:.4;g.fillStyle=gradient(g,ix,iy,ix+iw,iy+ih,card.rarity==='SEC'?['#ff8fb1','#ffd36b','#9ff3c9','#9fd4ff','#c9a8ff']:['#fff1c2','#d6a548','#fff7dc','#b9801f']);g.fillRect(ix,iy,iw,ih);g.globalAlpha=1;g.globalCompositeOperation='source-over';}
  g.restore();
  g.lineWidth=5;g.strokeStyle=t.light;rr(g,ix,iy,iw,ih,30);g.stroke();g.lineWidth=2;g.strokeStyle='rgba(0,0,0,.45)';rr(g,ix+6,iy+6,iw-12,ih-12,26);g.stroke();
  // Cost
  const cx=ix+96,cy=iy+96;g.beginPath();g.arc(cx,cy,66,0,Math.PI*2);g.fillStyle=gradient(g,cx-60,cy-60,cx+60,cy+60,[t.light,t.accent,t.deep]);g.fill();g.lineWidth=7;g.strokeStyle='#fff4d6';g.stroke();
  g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='800 80px Poppins';g.fillText(String(card.cost),cx,cy+5);
  // Power + atribut
  g.textAlign='right';g.textBaseline='alphabetic';g.font='700 22px Poppins';spacing(g,6);g.fillStyle='#fff';g.fillText('POWER',ix+iw-40,iy+66);spacing(g,0);
  g.font='italic 900 104px Fraunces';g.lineJoin='round';g.lineWidth=12;g.strokeStyle='rgba(10,6,8,.7)';g.strokeText(String(card.power),ix+iw-36,iy+166);g.fillStyle='#fff';g.fillText(String(card.power),ix+iw-36,iy+166);
  const ax=ix+iw-88,ay=iy+246;g.beginPath();g.arc(ax,ay,46,0,Math.PI*2);g.fillStyle='rgba(12,8,9,.74)';g.fill();g.lineWidth=4;g.strokeStyle=t.light;g.stroke();iconPath(g,card.attribute==='Strike'?'strike':'slash',ax,ay,58,'#fff',2);
  g.textAlign='center';g.font='700 24px Poppins';g.fillStyle='#fff';g.fillText(card.attribute,ax,ay+80);
  // Counter di tepi kiri
  g.save();g.translate(ix,iy+ih*.3);rr(g,-30,0,104,330,26);g.fillStyle='rgba(12,8,9,.72)';g.fill();g.lineWidth=3;g.strokeStyle=t.light;g.stroke();g.rotate(-Math.PI/2);g.textAlign='center';g.fillStyle=t.light;g.font='700 20px Poppins';spacing(g,5);g.fillText('COUNTER',-165,30);spacing(g,0);g.fillStyle='#fff';g.font='800 40px Poppins';g.fillText('+'+card.counter,-165,72);g.restore();
  // Plat nama, efek, kaki kartu
  const footY=H-B-34,plateH=196,plateY=footY-34-plateH,fontSize=30,maxText=iw-150;
  const lines=layoutEffect(g,effectTokens(card.effect),maxText,fontSize).slice(0,5),boxH=lines.length*fontSize*1.42+48,boxY=plateY-22-boxH,boxX=ix+44,boxW=iw-88;
  rr(g,boxX,boxY,boxW,boxH,22);g.fillStyle='rgba(255,250,242,.92)';g.fill();g.lineWidth=3;g.strokeStyle=t.accent;g.stroke();
  g.textBaseline='middle';g.textAlign='left';
  lines.forEach((line,i)=>{let x=boxX+32;const y=boxY+24+fontSize*.71+i*fontSize*1.42;for(const tok of line){if(tok.kw){rr(g,x,y-fontSize*.62,tok.w,fontSize*1.24,fontSize*.62);g.fillStyle=tok.kw==='Saat dimainkan'?'#2b6cb0':t.accent;g.fill();g.fillStyle='#fff';g.font=`700 ${fontSize*.82}px Poppins`;g.fillText(tok.kw,x+fontSize*.45,y+1);}else{g.fillStyle='#2b1d1f';g.font=`500 ${fontSize}px Poppins`;g.fillText(tok.word,x,y+1);}x+=tok.w+fontSize*.3;}});
  rr(g,ix+26,plateY,iw-52,plateH,24);g.fillStyle=gradient(g,ix,plateY,ix+iw,plateY+plateH,[t.deep,t.accent,t.deep]);g.globalAlpha=.94;g.fill();g.globalAlpha=1;g.lineWidth=3;g.strokeStyle=t.light;g.stroke();
  g.textAlign='center';g.textBaseline='alphabetic';g.fillStyle=t.light;g.font='700 22px Poppins';spacing(g,6);g.fillText(`FANSERVICE · ${String(hostName||'').toUpperCase()}`,W/2,plateY+44);spacing(g,0);
  const name=String(card.name||'').split(' · ')[0];fit(g,name,iw-140,s=>`italic 900 ${s}px Fraunces`,84,50);g.fillStyle='#fff';g.fillText(name,W/2,plateY+128);
  g.font='600 25px Poppins';g.fillStyle='rgba(255,255,255,.86)';g.fillText(card.crew,W/2,plateY+170,iw-120);
  if(mark){const mh=34,mw=mh*mark.naturalWidth/mark.naturalHeight;g.drawImage(mark,ix+46,footY-mh+6,mw,mh);}
  g.textAlign='right';g.font='700 26px Poppins';g.fillStyle='rgba(255,255,255,.92)';g.fillText(`${card.rarity} · ${card.cardNo}`,ix+iw-46,footY);
  g.restore();
  return canvas;
 }
 function strike(g,x0,x1,y,width,color,seed){g.save();g.strokeStyle=color;g.lineCap='round';g.lineJoin='round';g.lineWidth=width;g.beginPath();g.moveTo(x0,y+10);g.bezierCurveTo(x0+(x1-x0)*.3,y-4+seed,x0+(x1-x0)*.62,y+8-seed,x1,y-22);g.stroke();g.restore();}
 async function drawPoster(card,{hostName,safe=false}){
  await fonts();
  const host=card.hostId==='sanji'?'sanji':'zoro',W=1080,H=1528,ink='#3a2410';
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const g=canvas.getContext('2d');if(!g)throw new Error('Kanvas tidak tersedia.');
  const paperPhoto=cssImage('poster','--poster-paper');
  const [art,logo,paper,photo]=await Promise.all([load(card.image),load('/assets/brand/bpedia-pink.webp'),safe?null:load('/assets/ui/poster-paper.svg'),paperPhoto?load(paperPhoto):null]);
  if(!art)throw new Error('Gambar poster belum termuat.');
  g.fillStyle='#ead2a2';g.fillRect(0,0,W,H);
  if(paper)g.drawImage(paper,0,0,W,H);
  else{let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<5200;i++){g.fillStyle=`rgba(90,55,20,${rnd()*.07})`;g.fillRect(rnd()*W,rnd()*H,1+rnd()*2.5,1+rnd()*2.5);}}
  if(photo)cover(g,photo,0,0,W,H);
  const burn=g.createRadialGradient(W/2,H/2,H*.38,W/2,H/2,H*.76);burn.addColorStop(0,'rgba(107,61,18,0)');burn.addColorStop(1,'rgba(61,30,6,.55)');g.fillStyle=burn;g.fillRect(0,0,W,H);
  g.strokeStyle=ink;g.lineWidth=5;g.strokeRect(34,34,W-68,H-68);g.lineWidth=1.6;g.strokeRect(48,48,W-96,H-96);
  g.textAlign='center';g.textBaseline='alphabetic';g.fillStyle=ink;spacing(g,10);fit(g,'WANTED',W-130,s=>`900 ${s}px Georgia`,230,160);g.fillText('WANTED',W/2,240);spacing(g,0);
  const px=120,py=300,pw=W-240,ph=640;
  g.fillStyle=ink;g.fillRect(px-14,py-14,pw+28,ph+28);
  g.save();g.beginPath();g.rect(px,py,pw,ph);g.clip();await paintScene(g,host,px,py,pw,ph,{safe,ay:.25});
  contain(g,art,px+18,py+10,pw-36,ph-20,.5,1);
  const vignette=g.createLinearGradient(0,py,0,py+ph);vignette.addColorStop(.7,'rgba(58,36,16,0)');vignette.addColorStop(1,'rgba(58,36,16,.35)');g.fillStyle=vignette;g.fillRect(px,py,pw,ph);
  g.restore();
  g.font='900 62px Georgia';spacing(g,6);g.fillStyle=ink;g.fillText('DEAD OR ALIVE',W/2,1028);spacing(g,0);
  fit(g,card.bountyName,W-150,s=>`900 ${s}px Georgia`,102,64);g.fillText(card.bountyName,W/2,1134);
  g.font='700 24px Poppins';spacing(g,5);g.fillText(String(card.priceLabel||'Harga normal fanservice').toUpperCase(),W/2-120,1196);spacing(g,0);
  const price=money(card.price);g.font='italic 900 112px Fraunces';const pw2=g.measureText(price).width,priceX=W/2-120;g.fillText(price,priceX,1322);
  strike(g,priceX-pw2/2-26,priceX+pw2/2+26,1282,15,'rgba(200,16,46,.92)',6);strike(g,priceX-pw2/2-10,priceX+pw2/2+34,1298,6,'rgba(200,16,46,.75)',-4);
  // Stempel tinta: digambar terpisah lalu diberi bintik agar terasa seperti cap karet.
  const st=document.createElement('canvas');st.width=470;st.height=210;const s=st.getContext('2d');
  s.strokeStyle='#cf1f47';s.fillStyle='#cf1f47';s.lineWidth=10;rr(s,10,10,450,190,22);s.stroke();s.lineWidth=3;rr(s,26,26,418,158,14);s.stroke();
  s.textAlign='center';s.textBaseline='alphabetic';s.font='800 106px Poppins';spacing(s,4);s.fillText(card.customerOffer?.label||'GRATIS',235,124);spacing(s,0);s.font='700 30px Poppins';s.fillText(card.customerOffer?.description||'untuk pelanggan Bpedia',235,168);
  s.globalCompositeOperation='destination-out';let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;for(let i=0;i<420;i++){s.globalAlpha=.25+rnd()*.5;s.beginPath();s.arc(rnd()*470,rnd()*210,rnd()*3.2,0,Math.PI*2);s.fill();}
  g.save();g.translate(W/2+285,1290);g.rotate(-.1);g.globalAlpha=.94;g.globalCompositeOperation='multiply';g.drawImage(st,-141,-63,282,126);g.restore();
  g.font='500 27px Poppins';g.fillStyle='#4a2e14';g.fillText('Harga normal fanservice · gratis di booth Bpedia',W/2,1404,W-160);g.fillText('Marketing 6.0, 3–4 Okt',W/2,1440,W-160);
  g.textAlign='left';g.font='700 22px Poppins';g.fillStyle=ink;g.fillText(`${String(card.name||'').split(' · ')[0]} · ${hostName||''} · ${card.cardNo}`,74,1478,W-330);
  if(logo){const lh=40,lw=lh*logo.naturalWidth/logo.naturalHeight;g.drawImage(logo,W-74-lw,1478-lh+6,lw,lh);}
  return canvas;
 }
 function toBlob(canvas){return new Promise((resolve,reject)=>{try{canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG gagal dibuat.')),'image/png');}catch(error){reject(error);}});}
 async function render(draw,card,options){
  try{return await toBlob(await draw(card,options));}
  catch(error){if(error?.name!=='SecurityError')throw error;return toBlob(await draw(card,{...options,safe:true}));}
 }
 function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 window.HeartExport=Object.freeze({card:(card,options={})=>render(drawCard,card,options),poster:(card,options={})=>render(drawPoster,card,options),download,preload:card=>Promise.all([load(card?.image),load(card?.mascot)])});
})();
