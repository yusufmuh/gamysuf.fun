'use strict';
const {randomInt,randomUUID}=require('node:crypto');
const {SERVICES,HOSTS,CARDS,PRICE_LIMIT,SCHEDULE,LEGACY_SCHEDULES,cardFor}=require('./catalog.cjs');
const clone=structuredClone;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const dateKey=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
const obj=v=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const validPrice=v=>Number.isInteger(v)&&v>=0&&v<=PRICE_LIMIT;
const PURCHASE_MINIMUM=Object.freeze({gacha:100000,pick:150000});
const validPurchase=v=>Number.isSafeInteger(v)&&v>=0;
function hydrateResult(result){
 if(!result)return null;
 const hydrated=clone(result),card=cardFor(result.host?.id,result.service?.id);
 if(card){
  hydrated.card=clone(card);
  const price=validPrice(result.card?.price)?result.card.price:validPrice(result.service?.price)?result.service.price:card.price;
  hydrated.card.price=price;
 }
 return hydrated;
}
/* Data lama (sebelum kartu TCG) belum punya harga FS dan detail host baru.
   Migrasi ini tidak mengubah riwayat, kuota, antrean, atau revision. */
function migrateState(raw){
 if(!obj(raw))return raw;
 const s=clone(raw);
 if(Array.isArray(s.services))s.services=s.services.map(v=>{const base=SERVICES.find(f=>f.id===v?.id);return base&&obj(v)?{...base,...v,price:validPrice(v.price)?v.price:base.price}:v;});
 if(Array.isArray(s.hosts))s.hosts=s.hosts.map(h=>{const base=HOSTS.find(f=>f.id===h?.id);return base&&obj(h)?{...base,enabled:h.enabled,quota:h.quota}:h;});
 if(obj(s.settings)&&LEGACY_SCHEDULES.includes(s.settings.schedule))s.settings.schedule=SCHEDULE;
 return s;
}
function validateSettings(s){
 if(!obj(s)||!['demo','live'].includes(s.mode)||['paused','sessionOpen','allowPick'].some(k=>typeof s[k]!=='boolean')||typeof s.schedule!=='string'||s.schedule.length>180||!Number.isInteger(s.queueLimit)||s.queueLimit<1||s.queueLimit>100||!Number.isInteger(s.duration)||s.duration<1000||s.duration>8000)throw fail('Pengaturan sesi tidak valid.');
 return s;
}
function validateState(s){
 if(!obj(s)||s.schema!==1||!Number.isInteger(s.revision)||s.revision<0||!Array.isArray(s.history)||!Array.isArray(s.audit)||!obj(s.dailyCounters))throw fail('Format data Heart Parade tidak valid.');
 validateSettings(s.settings);
 if(!Array.isArray(s.hosts)||s.hosts.length!==HOSTS.length||new Set(s.hosts.map(h=>h.id)).size!==HOSTS.length||s.hosts.some(h=>!HOSTS.some(v=>v.id===h.id)||typeof h.enabled!=='boolean'||!Number.isInteger(h.quota)||h.quota<0||h.quota>1000))throw fail('Data cosplayer tidak valid.');
 if(!Array.isArray(s.services)||s.services.length!==SERVICES.length||new Set(s.services.map(v=>v.id)).size!==SERVICES.length||s.services.some(v=>!SERVICES.some(f=>f.id===v.id)||typeof v.enabled!=='boolean'||!validPrice(v.price)))throw fail('Menu fanservice tidak valid.');
 for(const r of [...s.history,...(s.pending?[s.pending]:[])]){
  if(!obj(r)||typeof r.id!=='string'||typeof r.requestId!=='string'||typeof r.demo!=='boolean'||!['waiting','served','cancelled','demo'].includes(r.status)||!HOSTS.some(h=>h.id===r.host?.id)||!SERVICES.some(v=>v.id===r.service?.id)||!['touch','no-touch'].includes(r.comfort)||typeof r.recording!=='boolean'||!['gacha','pick'].includes(r.method))throw fail('Data tiket tidak valid.');
  // Older mission tickets have no purchase snapshot and remain valid unchanged.
  if('purchaseAmount' in r||'purchaseMinimum' in r){
   if(r.demo||r.verified!==true||!validPurchase(r.purchaseAmount)||r.purchaseMinimum!==PURCHASE_MINIMUM[r.method]||r.purchaseAmount<r.purchaseMinimum)throw fail('Verifikasi belanja tiket tidak valid.');
  }
 }
 return s;
}
class Engine{
 constructor(store,{rng,now=()=>Date.now()}={}){this.store=store;this.rng=rng;this.now=now;validateState(store.state);}
 get state(){return this.store.state;}
 commit(next,type,detail={}){next.revision=this.state.revision+1;next.audit=[...next.audit,{at:new Date(this.now()).toISOString(),type,...detail}].slice(-1000);validateState(next);this.store.commit(next);return this.view(true);}
 waiting(host){return this.state.history.filter(r=>!r.demo&&r.status==='waiting'&&(!host||r.host.id===host));}
 used(host){const day=dateKey(this.now());return this.state.history.filter(r=>!r.demo&&r.status!=='cancelled'&&r.host.id===host&&dateKey(r.at)===day).length;}
 view(admin=false){
  const s=this.state;
  const prices=Object.fromEntries(s.services.map(v=>[v.id,v.price]));
  const view={settings:clone(s.settings),purchaseThresholds:clone(PURCHASE_MINIMUM),hosts:s.hosts.map(h=>({...clone(h),remaining:Math.max(0,h.quota-this.used(h.id))})),services:clone(s.services),cards:CARDS.map(card=>({...clone(card),price:prices[card.serviceId]??card.price})),pending:hydrateResult(s.pending),revision:s.revision,queue:{waiting:this.waiting().length,byHost:Object.fromEntries(s.hosts.map(h=>[h.id,this.waiting(h.id).length]))}};
  if(admin){view.history=s.history.map(hydrateResult);view.audit=clone(s.audit);view.stats={issued:s.history.filter(r=>!r.demo).length,served:s.history.filter(r=>r.status==='served').length,cancelled:s.history.filter(r=>r.status==='cancelled').length};}
  return view;
 }
 play(requestId,options={}){
  if(typeof requestId!=='string'||!/^[-a-zA-Z0-9]{8,80}$/.test(requestId))throw fail('ID permintaan tidak valid.');
  if(!obj(options))throw fail('Pilihan tidak valid.');
  const s=this.state,prior=s.history.find(r=>r.requestId===requestId)||[s.pending].find(r=>r?.requestId===requestId);
  if(prior)return hydrateResult(prior);
  if(s.pending)throw fail('Selesaikan kartu sebelumnya terlebih dahulu.',409);
  if(s.settings.paused||!s.settings.sessionOpen)throw fail('Sesi sedang istirahat. Cek jadwal cosplayer.',409);
  const host=s.hosts.find(h=>h.id===options.host&&h.enabled);
  if(!host)throw fail('Pilih cosplayer yang sedang tersedia.');
  if(!['touch','no-touch'].includes(options.comfort)||typeof options.consent!=='boolean'||typeof options.recording!=='boolean')throw fail('Pilihan kenyamanan dan persetujuan tidak valid.');
  if((options.comfort==='touch'||options.recording)&&options.consent!==true)throw fail('Sentuhan atau dokumentasi memerlukan persetujuan eksplisit.');
  const demo=s.settings.mode==='demo',purchaseMinimum=PURCHASE_MINIMUM[options.pick?'pick':'gacha'];
  if(!demo){
   if(options.verified!==true)throw fail('Petugas perlu memeriksa belanja pelanggan terlebih dahulu.',409);
   if(!validPurchase(options.purchaseAmount))throw fail('Nominal belanja terverifikasi harus angka rupiah bulat dan tidak negatif.');
   if(options.purchaseAmount<purchaseMinimum)throw fail(`Belanja minimal Rp${purchaseMinimum.toLocaleString('id-ID')} untuk ${options.pick?'pilih fanservice':'gacha fanservice'}.`,409);
   if(this.waiting().length>=s.settings.queueLimit)throw fail('Antrean penuh. Tunggu beberapa tiket selesai dilayani.',409);
   if(this.used(host.id)>=host.quota)throw fail('Kuota cosplayer hari ini habis.',409);
  }
  const pool=s.services.filter(v=>v.enabled);
  if(!pool.length)throw fail('Belum ada menu aktif.',409);
  let service,method='gacha';
  if(options.pick){
   if(!s.settings.allowPick)throw fail('Pilihan langsung belum dibuka petugas.',409);
   service=pool.find(v=>v.id===options.pick);method='pick';
   if(!service)throw fail('Menu pilihan sedang tidak tersedia.',409);
  }else{
   let index;
   if(this.rng){const value=this.rng();if(!Number.isFinite(value)||value<0||value>=1)throw fail('Sumber acak tidak valid.',500);index=Math.floor(value*pool.length);}
   else index=randomInt(pool.length);
   service=pool[index];
  }
  const username=String(options.username||'Tamu Bpedia').trim().replace(/[\p{Cc}\p{Cf}]/gu,'').slice(0,24)||'Tamu Bpedia';
  const next=clone(s),day=dateKey(this.now());
  const queueNumber=demo?null:(next.dailyCounters[day]||0)+1;
  if(!demo)next.dailyCounters[day]=queueNumber;
  const result={id:(demo?'DEMO-':'HP-')+randomUUID().slice(0,8).toUpperCase(),requestId,at:new Date(this.now()).toISOString(),username,game:'heart',demo,host:{id:host.id,name:host.name,image:host.image,mascot:host.mascot},service:clone(service),method,comfort:options.comfort,recording:options.recording,consent:options.consent,queueNumber,status:demo?'demo':'waiting',estimatedSeconds:demo?0:this.waiting(host.id).reduce((n,r)=>n+r.service.seconds+20,0),duration:s.settings.duration};
  if(!demo)Object.assign(result,{verified:true,purchaseAmount:options.purchaseAmount,purchaseMinimum});
  result.card={...clone(cardFor(host.id,service.id)),price:service.price};
  next.pending=result;
  // Demo memory is bounded; real tickets remain available for audit and daily quotas.
  next.history=demo?[...next.history.filter(r=>!r.demo),...next.history.filter(r=>r.demo).slice(-249),result]:[...next.history,result];
  this.commit(next,'draw',{id:result.id,host:host.id,service:service.id,demo});
  return clone(result);
 }
 acknowledge(id){
  if(typeof id!=='string')throw fail('Kode kartu tidak valid.');
  if(!this.state.pending)return this.view();
  if(this.state.pending.id!==id)throw fail('Kartu berubah. Muat ulang hasil terakhir.',409);
  const next=clone(this.state);next.pending=null;this.commit(next,'acknowledge',{id});return this.view();
 }
 updateSettings(patch){
  if(!obj(patch)||!Object.keys(patch).length||Object.keys(patch).some(k=>!['mode','paused','sessionOpen','schedule','queueLimit','allowPick','duration'].includes(k)))throw fail('Perubahan sesi tidak valid.');
  if(patch.mode&&patch.mode!==this.state.settings.mode&&this.state.pending)throw fail('Tutup kartu sebelum mengganti mode.',409);
  const next=clone(this.state);Object.assign(next.settings,patch);return this.commit(next,'settings');
 }
 updateHost(id,patch){
  if(!obj(patch)||!Object.keys(patch).length||Object.keys(patch).some(k=>!['enabled','quota'].includes(k)))throw fail('Perubahan cosplayer tidak valid.');
  const next=clone(this.state),host=next.hosts.find(h=>h.id===id);if(!host)throw fail('Cosplayer tidak ditemukan.',404);
  Object.assign(host,patch);return this.commit(next,'host',{id});
 }
 updateService(id,patch){
  if(typeof patch==='boolean')patch={enabled:patch};
  if(!obj(patch)||!Object.keys(patch).length||Object.keys(patch).some(k=>!['enabled','price'].includes(k)))throw fail('Perubahan menu tidak valid.');
  if('enabled' in patch&&typeof patch.enabled!=='boolean')throw fail('Status menu tidak valid.');
  if('price' in patch&&!validPrice(patch.price))throw fail(`Harga fanservice harus angka bulat 0–${PRICE_LIMIT.toLocaleString('id-ID')} rupiah.`);
  const next=clone(this.state),service=next.services.find(v=>v.id===id);if(!service)throw fail('Menu tidak ditemukan.',404);
  Object.assign(service,patch);return this.commit(next,'service',{id,...patch});
 }
 resolve(id,action){
  if(!['served','cancelled','no-touch'].includes(action))throw fail('Aksi tiket tidak valid.');
  const next=clone(this.state),ticket=next.history.find(r=>r.id===id&&!r.demo);
  if(!ticket)throw fail('Tiket resmi tidak ditemukan.',404);
  if(ticket.status!=='waiting'){
   if(ticket.status===action)return this.view(true);
   throw fail('Tiket sudah ditutup.',409);
  }
  if(action==='no-touch')ticket.comfort='no-touch';
  else{ticket.status=action;ticket.resolvedAt=new Date(this.now()).toISOString();}
  if(next.pending?.id===id)next.pending=clone(ticket);
  return this.commit(next,'ticket',{id,action});
 }
}
module.exports={Engine,validateState,validateSettings,migrateState,dateKey,fail,hydrateResult,PURCHASE_MINIMUM};
