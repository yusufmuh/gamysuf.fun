'use strict';
/* Renderer kartu, leader, poster bounty, dan booster. Semua markup berasal dari
   data server (catalog), sehingga harga/teks yang diubah petugas langsung ikut. */
(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const PATHS={
  heart:'M12 20.5 4.2 12.9a4.9 4.9 0 0 1 7-6.9l.8.8.8-.8a4.9 4.9 0 0 1 7 6.9Z',
  slash:'M4.5 19.5 15 9M15 9l4.5-5.2-1.2 4.4L15 9ZM7.8 13.2l3 3M3.5 10.5C7 6.2 11.6 4.6 17 5.4',
  strike:'M12 2.8v3.4M12 17.8v3.4M2.8 12h3.4M17.8 12h3.4M5.5 5.5l2.4 2.4M16.1 16.1l2.4 2.4M5.5 18.5l2.4-2.4M16.1 7.9l2.4-2.4M12 8.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Z',
  shoe:'M3 17c4-1 6-6 7-11l3 1c0 5 3 8 8 10v3H3Zm6-2 3 1',
  sparkle:'m12 2.5 2.4 6.6 6.6 2.4-6.6 2.4L12 20.5l-2.4-6.6L3 11.5l6.6-2.4Z',
  flower:'M12 12c-3-3-3-8 0-9 3 1 3 6 0 9Zm0 0c3-3 8-3 9 0-1 3-6 3-9 0Zm0 0c3 3 3 8 0 9-3-1-3-6 0-9Zm0 0c-3 3-8 3-9 0 1-3 6-3 9 0Z',
  rose:'M12 21v-8m0 5c-1-4-6-4-6-4 0 4 6 4 6 4Zm0-2c2-4 6-4 6-4 0 3.5-6 4-6 4ZM6 5c1-2 4-2 6 0 2-2 5-2 6 0 1 4-2.5 7-6 7S5 9 6 5Z',
  crown:'m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Zm3 8h12',
  hand:'M8 13V5a2 2 0 0 1 4 0v7-8a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v9c0 4-3 6-7 6-3 0-5-2-7-4l-3-4c-2-3 1-5 3-3l2 2Z',
  download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  sound:'m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  mute:'m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6',
  motion:'M4 12h3l2-5 4 10 2-5h5',
  still:'M5 12h14M5 7h14M5 17h9',
  calendar:'M4 6h16v14H4ZM4 10h16M8 3v5M16 3v5M8 14h2m3 0h2m-7 3h2',
  pin:'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Zm0-9a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8Z',
  lock:'M6 11h12v9H6Zm2.5 0V8a3.5 3.5 0 0 1 7 0v3',
  shuffle:'M3 7h3c5 0 7 10 12 10h3m0 0-3-3m3 3-3 3M3 17h3c1.8 0 3-1.3 4.2-3m3.6-4C15 8.3 16.2 7 18 7h3m0 0-3-3m3 3-3 3',
  cards:'M8 4h11v15H8ZM5 7v14h11',
  poster:'M5 3h14v18H5ZM8 7h8M8 10h8v6H8Z',
  play:'M8 5v14l11-7Z',
  pause:'M8 5h3v14H8Zm5 0h3v14h-3Z',
  check:'m5 12.5 4.5 4.5L19 7.5',
  ticket:'M3 8a2 2 0 0 0 0 4v5h18v-5a2 2 0 0 1 0-4V5H3Zm11-3v12',
  arrow:'M5 12h14m-6-6 6 6-6 6',
  noTouch:'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18ZM5.6 5.6l12.8 12.8',
  touch:'M8 13V5a2 2 0 0 1 4 0v7-8a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v9c0 4-3 6-7 6-3 0-5-2-7-4l-3-4c-2-3 1-5 3-3l2 2Z',
  camera:'M8 6h8l2 3h3v11H3V9h3Zm4 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z'
 };
 const SERVICE_ICON={cinderella:'shoe',twirl:'sparkle',whisper:'flower',offering:'rose',vow:'crown',hug:'heart',pat:'hand'};
 const icon=(name,cls='')=>`<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${PATHS[name]||PATHS.heart}"/></svg>`;
 const rupiah=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0,minimumFractionDigits:0});
 const money=value=>rupiah.format(Number.isFinite(value)?value:0);
 const power=value=>String(Number(value)||0);
 const attrIcon=attr=>attr==='Strike'?'strike':'slash';
 const RARITY={R:'Rare',SR:'Super Rare',SEC:'Secret Rare'};
 // "Saat dimainkan:" dan [Fanservice] diberi tanda kata kunci seperti efek TCG.
 function effectHtml(text){
  return esc(text).replace(/\[([^\]]{1,24})\]/g,'<span class="kw">$1</span>').replace(/Saat dimainkan:/g,'<span class="kw kw-play">Saat dimainkan</span>');
 }
 function scene(){return '<span class="tcg-scene" aria-hidden="true"></span>';}
 function bipySeal(){return '<span class="bipy-seal" aria-label="Stempel Bipy pink"><span class="seal-face"><img src="/assets/brand/bipy-pink.webp" alt="" width="640" height="1166"></span><b>BPEDIA BABES</b><small>MOMEN ISTIMEWA</small></span>';}
 function cardFace(card,{size='full',imgId='',lazy=true,video=false,hostName='',sealed=false}={}){
  if(!card)return '';
  const host=card.hostId==='sanji'?'sanji':'zoro',rarity=['R','SR','SEC'].includes(card.rarity)?card.rarity:'R';
  const name=String(card.name||'').split(' · ')[0];
  const media=video&&typeof card.video==='string'&&card.video?`<video class="tcg-video" src="${esc(card.video)}" muted loop playsinline preload="metadata" aria-hidden="true"></video>`:'';
  return `<div class="tcg host-${host} rar-${rarity.toLowerCase()} size-${size}" data-card="${esc(card.id)}" data-motif="${esc(card.animationMotif)}">
<div class="tcg-in">${scene()}<span class="card-art"><img${imgId?` id="${esc(imgId)}"`:''} src="${esc(card.image)}" alt="${esc(card.imageAlt)}" width="960" height="1440" decoding="async"${lazy?' loading="lazy"':''}></span>${media}
<span class="tcg-shade" aria-hidden="true"></span><span class="tcg-holo" aria-hidden="true"></span>
<span class="tcg-cost" title="Cost"><b>${esc(card.cost)}</b></span>
<span class="tcg-power"><small>POWER</small><b>${esc(power(card.power))}</b></span>
<span class="tcg-attr">${icon(attrIcon(card.attribute))}<small>${esc(card.attribute)}</small></span>
<span class="tcg-counter"><small>COUNTER</small><b>+${esc(card.counter)}</b></span>
<span class="tcg-bottom">${size==='full'?`<span class="tcg-effect">${effectHtml(card.effect)}</span>`:''}
<span class="tcg-plate"><small>FANSERVICE · ${esc(hostName||(host==='zoro'?'Zoro':'Sanji'))}</small><b class="tcg-name">${esc(name)}</b><span class="tcg-type">${esc(card.crew)}</span></span>
<span class="tcg-foot"><img src="/assets/brand/bpedia-white.webp" alt="" width="60" height="22" decoding="async"${lazy?' loading="lazy"':''}><span>${esc(rarity)} · ${esc(card.cardNo)}</span></span></span>
<span class="tcg-frame" aria-hidden="true"></span>${sealed?bipySeal():''}</div></div>`;
 }
 function leaderCard(host,{lazy=false}={}){
  const id=host.id==='sanji'?'sanji':'zoro';
  return `<div class="tcg tcg-leader host-${id} rar-leader size-full" data-card="leader-${id}">
<div class="tcg-in">${scene()}<span class="card-art"><img class="host-art" src="${esc(host.image)}" alt="${esc(host.name)} full body, ${id==='zoro'?'rambut hijau dan tiga pedang tersarung':'setelan hitam detail emas, mawar dan hidangan'}" width="1024" height="1536" decoding="async"${lazy?' loading="lazy"':' fetchpriority="high"'}></span>
<span class="tcg-shade" aria-hidden="true"></span><span class="tcg-holo" aria-hidden="true"></span>
<span class="tcg-life"><small>LIFE</small><b>${esc(host.leaderLife)}</b></span>
<span class="tcg-power"><small>POWER</small><b>${esc(power(host.leaderPower))}</b></span>
<span class="tcg-attr">${icon(attrIcon(host.attribute))}<small>${esc(host.attribute)}</small></span>
<span class="tcg-bottom"><span class="tcg-plate"><small class="leader-tag">LEADER</small><b class="tcg-name">${esc(host.fullName)}</b><span class="tcg-type">${esc(host.crew)}</span></span>
<span class="tcg-foot"><img src="/assets/brand/bpedia-white.webp" alt="" width="60" height="22" decoding="async"><span>${esc(host.role)}</span></span></span>
<span class="tcg-frame" aria-hidden="true"></span></div></div>`;
 }
 let backSeq=0;
 function cardBack({variant=''}={}){
  const ring=`backRing${++backSeq}`;
  return `<div class="tcg-back ${esc(variant)}" aria-hidden="true"><div class="back-in"><span class="back-lattice"></span>
<svg class="back-ring" viewBox="0 0 200 200"><defs><path id="${ring}" d="M100 22a78 78 0 1 1-.1 0"/></defs><circle cx="100" cy="100" r="92" class="r1"/><circle cx="100" cy="100" r="66" class="r2"/><text><textPath href="#${ring}" startOffset="0">GRAND LINE DESIRE · FANSERVICE CARD GAME · BP06 ·</textPath></text><path class="back-heart" d="M100 150 62 113a24 24 0 0 1 34-34l4 4 4-4a24 24 0 0 1 34 34Z"/></svg>
<img class="back-bipy" src="/assets/brand/bipy-pink.webp" alt="" width="110" height="200" decoding="async">
<img class="back-mark" src="/assets/brand/bpedia-white.webp" alt="" width="120" height="44" decoding="async"></div></div>`;
 }
 function poster(card,{hostName='',stamped=true,lazy=true,imgId='',sealed=false}={}){
  if(!card)return '';
  const host=card.hostId==='sanji'?'sanji':'zoro',name=String(card.name||'').split(' · ')[0];
  const offer=card.customerOffer||{label:'GRATIS',description:'untuk pelanggan Bpedia'};
  return `<div class="poster host-${host}${stamped?' is-stamped':''}" data-card="${esc(card.id)}">
<span class="poster-paper" aria-hidden="true"></span>${sealed?bipySeal():''}
<div class="poster-in"><b class="poster-wanted" aria-hidden="true">WANTED</b>
<span class="poster-photo">${scene()}<img${imgId?` id="${esc(imgId)}"`:''} src="${esc(card.image)}" alt="${esc(card.imageAlt)}" width="960" height="1440" decoding="async"${lazy?' loading="lazy"':''}><img class="poster-bipy" src="${esc(card.mascot)}" alt="${esc(card.bipyAlt)}" width="640" height="1166" decoding="async" loading="lazy"></span>
<span class="poster-dead">DICARI PARA PENGGEMAR</span>
<b class="poster-name">${esc(card.bountyName)}</b>
<span class="poster-price"><small>${esc(card.priceLabel||'Harga normal fanservice')}</small><span class="poster-amount"><s>${esc(money(card.price))}</s><svg class="poster-strike" viewBox="0 0 320 60" preserveAspectRatio="none" aria-hidden="true"><path class="s1" pathLength="1" d="M4 40C70 30 130 36 196 24S292 20 316 14"/><path class="s2" pathLength="1" d="M10 48C90 40 170 42 240 32S300 26 312 24"/></svg></span></span>
<span class="poster-stamp"><b>${esc(offer.label||'GRATIS')}</b><small>${esc(offer.description||'untuk pelanggan Bpedia')}</small></span>
<span class="poster-fine">Harga normal fanservice · gratis di booth Bpedia Market-In 6.0, 3–4 Okt</span>
<span class="poster-foot"><span>${esc(name)} · ${esc(hostName||(host==='zoro'?'Zoro':'Sanji'))} · ${esc(card.cardNo)}</span><img src="/assets/brand/bpedia-pink.webp" alt="Bpedia" width="90" height="33" decoding="async"${lazy?' loading="lazy"':''}></span></div></div>`;
 }
 // Gerigi foil booster dibuat sebagai polygon agar tidak perlu gambar tambahan.
 function crimp(top=true,bottom=true,teeth=18,depth=1.6){
  const pts=[];
  if(top)for(let i=0;i<=teeth*2;i++)pts.push(`${(i/(teeth*2)*100).toFixed(2)}% ${i%2?depth:0}%`);else pts.push('0% 0%','100% 0%');
  if(bottom)for(let i=teeth*2;i>=0;i--)pts.push(`${(i/(teeth*2)*100).toFixed(2)}% ${100-(i%2?depth:0)}%`);else pts.push('100% 100%','0% 100%');
  return `polygon(${pts.join(',')})`;
 }
 const PACK_CLIP=crimp(),TOP_CLIP=`polygon(0% 0%,100% 0%,100% 15%,${Array.from({length:13},(_,i)=>`${(100-i*100/12).toFixed(2)}% ${i%2?13.4:15.6}%`).join(',')},0% 15%)`;
 const BODY_CLIP=`polygon(${Array.from({length:13},(_,i)=>`${(i*100/12).toFixed(2)}% ${i%2?13.4:15.6}%`).join(',')},100% 100%,0% 100%)`;
 function boosterFace(host){
  const id=host.id==='sanji'?'sanji':'zoro';
  return `<span class="pack-face host-${id}"><span class="pack-foil"></span><span class="pack-scene tcg-scene"></span><img class="pack-art" src="${esc(host.image)}" alt="" width="1024" height="1536" decoding="async"><span class="pack-shine"></span>
<span class="pack-top-band"><img src="/assets/brand/bpedia-white.webp" alt="" width="70" height="25" decoding="async"><small>FANSERVICE CARD GAME</small></span>
<span class="pack-title"><small>BP06 · GRAND LINE DESIRE</small><b>${esc(host.name)}</b><em>Bipy Grand Line Desire</em></span>
<span class="pack-count">1 KARTU</span></span>`;
 }
 function booster(host,{tearable=false}={}){
  const id=host.id==='sanji'?'sanji':'zoro';
  if(!tearable)return `<span class="booster host-${id}" style="clip-path:${PACK_CLIP}">${boosterFace(host)}</span>`;
  return `<span class="booster tearable host-${id}"><span class="pack-part pack-body" style="clip-path:${BODY_CLIP}"><span class="pack-clip" style="clip-path:${PACK_CLIP}">${boosterFace(host)}</span></span><span class="pack-part pack-top" style="clip-path:${TOP_CLIP}"><span class="pack-clip" style="clip-path:${PACK_CLIP}">${boosterFace(host)}</span></span></span>`;
 }
 /* Foil mengikuti pointer; kemiringan dibatasi supaya teks tetap terbaca. */
 function attachTilt(el,{max=10,isEnabled=()=>true}={}){
  if(!el)return ()=>{};
  let frame=0,next=null;
  const apply=()=>{frame=0;if(!next)return;el.style.setProperty('--mx',next.mx+'%');el.style.setProperty('--my',next.my+'%');el.style.setProperty('--rx',next.rx+'deg');el.style.setProperty('--ry',next.ry+'deg');el.style.setProperty('--glare',next.glare);};
  const queue=v=>{next=v;if(!frame)frame=requestAnimationFrame(apply);};
  const move=event=>{
   if(!isEnabled()||event.pointerType==='touch'&&event.type==='pointermove'&&!event.isPrimary)return;
   const r=el.getBoundingClientRect();if(!r.width||!r.height)return;
   const x=Math.min(1,Math.max(0,(event.clientX-r.left)/r.width)),y=Math.min(1,Math.max(0,(event.clientY-r.top)/r.height));
   queue({mx:(x*100).toFixed(1),my:(y*100).toFixed(1),rx:((.5-y)*max).toFixed(2),ry:((x-.5)*max).toFixed(2),glare:'1'});
  };
  const leave=()=>queue({mx:'50',my:'30',rx:'0',ry:'0',glare:'0'});
  el.addEventListener('pointermove',move);el.addEventListener('pointerdown',move);el.addEventListener('pointerleave',leave);el.addEventListener('pointercancel',leave);
  return ()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerdown',move);el.removeEventListener('pointerleave',leave);el.removeEventListener('pointercancel',leave);cancelAnimationFrame(frame);};
 }
 window.HeartCards=Object.freeze({esc,icon,PATHS,SERVICE_ICON,RARITY,money,cardFace,leaderCard,cardBack,poster,booster,attachTilt,effectHtml});
})();
