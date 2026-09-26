'use strict';

const {randomInt,randomUUID}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {ZONK,MISSIONS,HASHTAGS}=require('./catalog.cjs');

const clone=structuredClone;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const tiers=['bundling','grand','voucher','product','newuser','zonk'];
const prizeTiers=tiers.slice(0,-1);
const games=['drop','fanservice'];
const methods=['gacha','pilih'];
const tierPoints={bundling:500,grand:400,voucher:100,product:80,newuser:40};
const scoreFor=(tier,id)=>tier==='voucher'?({'voucher-25':100,'voucher-50':120,'voucher-100000':150}[id]??100):(tierPoints[tier]??0);
const usernamePattern=/^[\p{L}\p{N} ._]+$/u;
const imagePattern=/^\/(?:assets\/products\/[a-zA-Z0-9_.-]+|uploads\/[a-z0-9-]+)\.(?:jpg|png|svg|webp)$/;
const hostImagePattern=/^\/assets\/images\/[a-z0-9-]+\.(?:jpg|png|webp)$/;
const slugPattern=/^[a-z0-9-]{1,40}$/;
const CAPSULE_LIMITS={openCapsules:[0,500],emptyCapsules:[0,1000]};

const available=prize=>prize.enabled&&(prize.stock===null||prize.stock>0);
const randomUnit=rng=>{
 const roll=Number(rng());
 if(!Number.isFinite(roll)||roll<0||roll>=1)throw fail('Angka acak tidak valid.');
 return roll;
};
const defaultRng=()=>randomInt(1000000)/1000000;

/* Mesin kapsul: setiap unit stok adalah satu kapsul, hadiah tak terbatas
   diwakili `openCapsules` kapsul, dan kapsul "belum mekar" berjumlah tetap.
   Semua kapsul berpeluang sama, jadi tidak ada persentase yang diatur
   petugas. Kapsul kosong ikut hilang saat kapsul berhadiah habis supaya mesin
   tidak pernah menjual permainan yang pasti zonk. */
function capsules(state){
 const rows=state.prizes.filter(available)
  .map(prize=>({id:prize.id,tier:prize.tier,count:prize.stock===null?state.settings.openCapsules:prize.stock}))
  .filter(row=>row.count>0);
 const prize=rows.reduce((total,row)=>total+row.count,0);
 const empty=prize>0?state.settings.emptyCapsules:0;
 const byTier=Object.fromEntries(tiers.map(tier=>[tier,tier==='zonk'?empty:rows.filter(row=>row.tier===tier).reduce((total,row)=>total+row.count,0)]));
 return {rows,prize,empty,total:prize+empty,byTier};
}

function choose(state,rng=defaultRng){
 const pool=capsules(state);
 if(pool.prize<=0)throw fail('Kapsul hadiah sudah habis. Hubungi petugas untuk isi ulang.',409);
 let ticket=Math.floor(randomUnit(rng)*pool.total);
 if(ticket>=pool.prize)return clone(ZONK);
 for(const row of pool.rows){
  if(ticket<row.count)return clone(state.prizes.find(prize=>prize.id===row.id));
  ticket-=row.count;
 }
 return clone(state.prizes.find(prize=>prize.id===pool.rows.at(-1).id));
}

function chooseFanservice(state,rng=defaultRng){
 const open=state.fanservices.filter(item=>item.enabled);
 if(!open.length)throw fail('Belum ada fanservice yang aktif.',409);
 return clone(open[Math.floor(randomUnit(rng)*open.length)]);
}

function validateSettings(settings){
 if(!settings||!['demo','live'].includes(settings.mode)||typeof settings.eventName!=='string'||!settings.eventName.trim()||settings.eventName.length>100||typeof settings.voucherTerms!=='string'||settings.voucherTerms.length>2000)throw fail('Pengaturan tidak valid.');
 for(const key of ['paused','sound','fanserviceOpen'])if(typeof settings[key]!=='boolean')throw fail('Status tidak valid.');
 if(!Number.isFinite(settings.volume)||settings.volume<0||settings.volume>100)throw fail('Volume harus 0-100%.');
 if(!Number.isInteger(settings.duration)||settings.duration<4000||settings.duration>12000)throw fail('Durasi animasi harus 4-12 detik.');
 for(const key of ['bgmVolume','sfxVolume','voiceVolume'])if(!Number.isFinite(settings[key])||settings[key]<0||settings[key]>100)throw fail('Volume kanal harus 0-100%.');
 if(!['crisp','punchy','flat'].includes(settings.audioProfile))throw fail('Profil audio tidak valid.');
 if(!['gentle','standard','off'].includes(settings.compressor))throw fail('Mode kompresor tidak valid.');
 for(const [key,[minimum,maximum]] of Object.entries(CAPSULE_LIMITS)){
  if(!Number.isInteger(settings[key])||settings[key]<minimum||settings[key]>maximum)throw fail(`Jumlah kapsul ${key==='openCapsules'?'hadiah tak terbatas':'belum mekar'} harus ${minimum}-${maximum}.`);
 }
 if(typeof settings.hostSchedule!=='string'||settings.hostSchedule.length>160)throw fail('Jadwal host maksimal 160 karakter.');
 return settings;
}

function validatePrize(prize,ids){
 if(!prize||typeof prize.id!=='string'||!/^[a-z0-9-]{1,60}$/.test(prize.id)||ids.has(prize.id))throw fail('ID hadiah tidak valid.');
 if(!prizeTiers.includes(prize.tier)||typeof prize.name!=='string'||!prize.name.trim()||prize.name.length>100||typeof prize.fullName!=='string'||!prize.fullName.trim()||prize.fullName.length>180)throw fail('Nama atau kategori hadiah tidak valid.');
 if(typeof prize.enabled!=='boolean'||typeof prize.imageChecked!=='boolean'||!imagePattern.test(prize.image))throw fail('Status atau foto hadiah tidak valid.');
 for(const key of ['stock','initialStock']){
  const value=prize[key];
  if(value!==null&&(!Number.isInteger(value)||value<0||value>10000))throw fail('Stok hadiah tidak valid.');
 }
 if(prize.points!==scoreFor(prize.tier,prize.id)||typeof prize.terms!=='string'||prize.terms.length>2000)throw fail('Poin atau ketentuan hadiah tidak valid.');
 for(const key of ['brand','variant'])if(prize[key]!==undefined&&(typeof prize[key]!=='string'||prize[key].length>100))throw fail('Detail hadiah tidak valid.');
 ids.add(prize.id);
}

function validateFanservice(item,ids){
 if(!item||typeof item.id!=='string'||!slugPattern.test(item.id)||ids.has(item.id))throw fail('ID fanservice tidak valid.');
 if(typeof item.name!=='string'||!item.name.trim()||item.name.length>40||typeof item.detail!=='string'||item.detail.length>160||typeof item.enabled!=='boolean')throw fail('Data fanservice tidak valid.');
 ids.add(item.id);
}

function validateHost(host,ids){
 if(!host||typeof host.id!=='string'||!slugPattern.test(host.id)||ids.has(host.id))throw fail('ID host tidak valid.');
 if(typeof host.name!=='string'||!host.name.trim()||host.name.length>40||typeof host.role!=='string'||host.role.length>80||typeof host.enabled!=='boolean'||!hostImagePattern.test(host.image))throw fail('Data host tidak valid.');
 ids.add(host.id);
}

function validateHistory(item){
 if(!item||typeof item.id!=='string'||typeof item.requestId!=='string'||typeof item.username!=='string'||item.username.length<1||item.username.length>64||!games.includes(item.game)||!Number.isFinite(Date.parse(item.at))||item.demo!==false)throw fail('Riwayat tidak valid.');
 if(item.status==='claimed'&&!Number.isFinite(Date.parse(item.claimedAt)))throw fail('Waktu penyerahan tidak valid.');
 if(item.game==='fanservice'){
  if(!['unclaimed','claimed'].includes(item.status)||!methods.includes(item.method)||typeof item.fanservice?.id!=='string'||typeof item.fanservice?.name!=='string'||!item.fanservice.name.trim()||typeof item.host?.id!=='string'||typeof item.host?.name!=='string'||!item.host.name.trim())throw fail('Riwayat fanservice tidak valid.');
  return;
 }
 if(!tiers.includes(item.prize?.tier)||!['unclaimed','claimed','zonk'].includes(item.status))throw fail('Riwayat tidak valid.');
 if(typeof item.prize.id!=='string'||typeof item.prize.fullName!=='string'||!item.prize.fullName.trim()||!imagePattern.test(item.prize.image)||item.prize.points!==scoreFor(item.prize.tier,item.prize.id)||typeof item.prize.terms!=='string')throw fail('Detail hadiah pada riwayat tidak valid.');
 if(item.prize.tier==='zonk'&&item.status!=='zonk')throw fail('Status zonk tidak valid.');
 if(item.prize.tier!=='zonk'&&item.status==='zonk')throw fail('Status hadiah tidak valid.');
}

function validateState(state){
 if(!state||state.schema!==2||!Number.isInteger(state.revision)||state.revision<0||!Array.isArray(state.prizes)||!state.prizes.length||!Array.isArray(state.fanservices)||!state.fanservices.length||!Array.isArray(state.hosts)||!state.hosts.length||!Array.isArray(state.history)||!Array.isArray(state.audit)||!state.dailyCounters||typeof state.dailyCounters!=='object')throw fail('Format data tidak valid.');
 validateSettings(state.settings);
 const prizeIds=new Set();
 for(const prize of state.prizes)validatePrize(prize,prizeIds);
 const fanserviceIds=new Set();
 for(const item of state.fanservices)validateFanservice(item,fanserviceIds);
 const hostIds=new Set();
 for(const host of state.hosts)validateHost(host,hostIds);
 const requests=new Set(),resultIds=new Set();
 for(const item of state.history){
  validateHistory(item);
  if(requests.has(item.requestId)||resultIds.has(item.id))throw fail('Riwayat ganda tidak valid.');
  requests.add(item.requestId);resultIds.add(item.id);
 }
 for(const count of Object.values(state.dailyCounters))if(!Number.isInteger(count)||count<0)throw fail('Nomor harian tidak valid.');
 if(state.pending){
  const recorded=state.history.find(item=>item.id===state.pending.id);
  if(!recorded||!isDeepStrictEqual(state.pending,recorded))throw fail('Hasil tertunda tidak cocok dengan riwayat.');
 }
 return state;
}

function leaderboard(history){
 const players=new Map();
 for(const item of history.filter(entry=>entry.game==='drop')){
  const row=players.get(item.username)||{username:item.username,plays:0,won:0,points:0};
  row.plays++;
  row.won+=Number(item.prize.tier!=='zonk');
  row.points+=item.prize.points||0;
  players.set(item.username,row);
 }
 return [...players.values()].sort((a,b)=>b.points-a.points||b.won-a.won||a.plays-b.plays||a.username.localeCompare(b.username,'id'));
}

function winnerBoard(history){
 const wins=history.filter(item=>item.game==='drop'&&item.demo===false&&item.prize.tier!=='zonk');
 return leaderboard(wins).slice(0,20).map(row=>{
  const gifts=new Map();
  for(const item of wins.filter(entry=>entry.username===row.username)){
   const key=item.prize.id+'|'+item.prize.fullName;
   const gift=gifts.get(key)||{name:item.prize.fullName,image:item.prize.image,count:0};
   gift.count++;gifts.set(key,gift);
  }
  return {...row,prizes:[...gifts.values()]};
 });
}

function fanserviceStats(history){
 const entries=history.filter(item=>item.game==='fanservice');
 const count=(key,value)=>entries.filter(item=>key(item)===value).length;
 return {
  total:entries.length,
  served:entries.filter(item=>item.status==='claimed').length,
  waiting:entries.filter(item=>item.status==='unclaimed').length,
  gacha:count(item=>item.method,'gacha'),
  pilih:count(item=>item.method,'pilih'),
  byType:Object.fromEntries([...new Set(entries.map(item=>item.fanservice.id))].map(id=>[id,count(item=>item.fanservice.id,id)])),
  byHost:Object.fromEntries([...new Set(entries.map(item=>item.host.id))].map(id=>[id,count(item=>item.host.id,id)]))
 };
}

class Engine{
 constructor(store,{rng,now=()=>Date.now()}={}){
  this.store=store;
  this.rng=rng||defaultRng;
  this.now=now;
  this.demoPending=null;
  this.demoRequests=new Map();
  this.demoDailyCounters={};
 }

 get state(){return this.store.state;}

 view(admin=false){
  const state=this.state;
  const drops=state.history.filter(item=>item.game==='drop');
  const pool=capsules(state);
  const publicView={
   prizes:clone(state.prizes),
   fanservices:clone(state.fanservices),
   hosts:clone(state.hosts),
   missions:clone(MISSIONS),
   hashtags:[...HASHTAGS],
   settings:clone(state.settings),
   capsules:{prize:pool.prize,empty:pool.empty,total:pool.total,byTier:pool.byTier,byPrize:Object.fromEntries(pool.rows.map(row=>[row.id,row.count]))},
   pending:clone(state.pending||this.demoPending),
   leaderboard:leaderboard(state.history),
   winners:winnerBoard(state.history),
   stats:{
    plays:drops.length,
    won:drops.filter(item=>item.prize.tier!=='zonk').length,
    claimed:drops.filter(item=>item.status==='claimed').length,
    zonk:drops.filter(item=>item.prize.tier==='zonk').length,
    stock:state.prizes.reduce((total,prize)=>total+(prize.stock??0),0),
    unlimited:state.prizes.filter(prize=>prize.enabled&&prize.stock===null).length,
    allRewardsDepleted:pool.prize===0,
    fanservice:fanserviceStats(state.history)
   }
  };
  return admin?{...publicView,history:clone(state.history),audit:clone(state.audit),revision:state.revision}:publicView;
 }

 commit(next,action,detail){
  next.revision++;
  next.audit.push({at:new Date(this.now()).toISOString(),action,...(detail?{detail}:{})});
  this.store.commit(next);
  return this.view(true);
 }

 ensureMutable(){
  if(this.state.pending||this.demoPending)throw fail('Tutup hasil permainan terlebih dahulu.',409);
 }

 play(requestId,username='',options={}){
  if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw fail('ID permintaan tidak valid.');
  if(typeof username!=='string')throw fail('Username tidak valid.');
  const {game='drop',host:hostId=null,pick=null}=options||{};
  if(!games.includes(game))throw fail('Jenis permainan tidak dikenal.');
  const trimmed=username.trim();
  if(trimmed&&(trimmed.length>24||!usernamePattern.test(trimmed)))throw fail('Nama hanya boleh 1-24 karakter: huruf, angka, spasi, titik, atau garis bawah.');
  const state=this.state;
  const previous=state.history.find(item=>item.requestId===requestId)||this.demoRequests.get(requestId);
  if(previous)return clone(previous);
  if(state.pending||this.demoPending)return clone(state.pending||this.demoPending);
  if(state.settings.paused)throw fail('Permainan sedang dijeda oleh petugas.',409);

  let outcome;
  if(game==='fanservice'){
   if(!state.settings.fanserviceOpen)throw fail('Sesi fanservice sedang tutup. Tanyakan jadwal host ke petugas.',409);
   const host=state.hosts.find(item=>item.id===hostId&&item.enabled);
   if(!host)throw fail('Pilih host yang sedang bertugas.');
   let fanservice;
   if(pick!==null&&pick!==undefined){
    fanservice=state.fanservices.find(item=>item.id===pick&&item.enabled);
    if(!fanservice)throw fail('Fanservice pilihan tidak tersedia.');
    fanservice=clone(fanservice);
   }else fanservice=chooseFanservice(state,this.rng);
   outcome={
    game,
    fanservice:{id:fanservice.id,name:fanservice.name,detail:fanservice.detail},
    host:{id:host.id,name:host.name},
    method:pick?'pilih':'gacha',
    status:'unclaimed'
   };
  }else{
   const prize=choose(state,this.rng);
   outcome={game,prize,status:prize.tier==='zonk'?'zonk':'unclaimed'};
  }

  const demo=state.settings.mode==='demo';
  const next=clone(state);
  const date=new Date(this.now());
  const day=`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
  const counters=demo?this.demoDailyCounters:next.dailyCounters;
  const count=(counters[day]||0)+1;
  counters[day]=count;
  const months=['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des'];
  const player=trimmed||`tamu-${String(count).padStart(3,'0')}-${date.getDate()}${months[date.getMonth()]}`;
  const result={
   id:(game==='fanservice'?'FS-':'BD-')+randomUUID().slice(0,8).toUpperCase(),
   requestId,
   username:player,
   ...outcome,
   demo,
   at:date.toISOString(),
   duration:state.settings.duration
  };
  if(demo){
   this.demoPending=result;
   this.demoRequests.set(requestId,result);
   if(this.demoRequests.size>100)this.demoRequests.delete(this.demoRequests.keys().next().value);
   return clone(result);
  }
  if(game==='drop'&&result.prize.tier!=='zonk'){
   const selected=next.prizes.find(item=>item.id===result.prize.id);
   if(selected.stock!==null)selected.stock--;
  }
  next.history.push(result);
  next.pending=result;
  this.commit(next,'play',game==='drop'?{id:result.id,game,prizeId:result.prize.id}:{id:result.id,game,fanserviceId:result.fanservice.id,hostId:result.host.id,method:result.method});
  return clone(result);
 }

 acknowledge(id){
  if(this.state.pending?.id===id){
   const next=clone(this.state);
   next.pending=null;
   this.commit(next,'result-closed',{id});
  }else if(this.demoPending?.id===id){
   this.demoPending=null;
  }else if(!this.state.history.some(item=>item.id===id)&&![...this.demoRequests.values()].some(result=>result.id===id))throw fail('Hasil tidak ditemukan.',404);
  return this.view();
 }

 updateSettings(patch){
  this.ensureMutable();
  const next=clone(this.state);
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(key=>!Object.hasOwn(next.settings,key)))throw fail('Pengaturan tidak dikenal.');
  Object.assign(next.settings,patch);
  validateSettings(next.settings);
  return this.commit(next,'settings',{keys:Object.keys(patch)});
 }

 /* Buka/tutup sesi fanservice dan jadwal host boleh diubah walau ada hasil
    yang belum ditutup: host bisa datang atau istirahat kapan saja. */
 updateFanserviceSession(patch){
  const allowed=['fanserviceOpen','hostSchedule'];
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||!Object.keys(patch).length||Object.keys(patch).some(key=>!allowed.includes(key)))throw fail('Pengaturan sesi fanservice tidak valid.');
  const next=clone(this.state);
  Object.assign(next.settings,patch);
  validateSettings(next.settings);
  return this.commit(next,'fanservice-session',{keys:Object.keys(patch)});
 }

 updateFanservice(id,patch){
  const allowed=['name','detail','enabled'];
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(key=>!allowed.includes(key)))throw fail('Perubahan fanservice tidak valid.');
  const next=clone(this.state);
  const item=next.fanservices.find(entry=>entry.id===id);
  if(!item)throw fail('Fanservice tidak ditemukan.',404);
  Object.assign(item,patch);
  if(typeof item.name==='string')item.name=item.name.trim();
  if(!next.fanservices.some(entry=>entry.enabled))throw fail('Minimal satu fanservice harus tetap aktif.');
  validateState(next);
  return this.commit(next,'fanservice-updated',{id,keys:Object.keys(patch)});
 }

 updateHost(id,patch){
  const allowed=['name','role','enabled'];
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(key=>!allowed.includes(key)))throw fail('Perubahan host tidak valid.');
  const next=clone(this.state);
  const host=next.hosts.find(entry=>entry.id===id);
  if(!host)throw fail('Host tidak ditemukan.',404);
  Object.assign(host,patch);
  if(typeof host.name==='string')host.name=host.name.trim();
  validateState(next);
  return this.commit(next,'host-updated',{id,keys:Object.keys(patch)});
 }

 stock(id,stock){
  this.ensureMutable();
  const next=clone(this.state);
  const prize=next.prizes.find(item=>item.id===id);
  if(!prize)throw fail('Hadiah tidak ditemukan.',404);
  if(stock!==null&&(!Number.isInteger(stock)||stock<0||stock>10000))throw fail('Stok harus 0-10.000 atau tak terbatas.');
  const previousStock=prize.stock;
  prize.stock=stock;
  const issued=next.history.filter(item=>item.game==='drop'&&item.prize.id===id&&item.prize.tier!=='zonk').length;
  if(previousStock===null&&prize.initialStock===null&&stock!==null)prize.initialStock=stock+issued;
  validateState(next);
  return this.commit(next,'stock',{id,previousStock,stock,delta:previousStock===null||stock===null?null:stock-previousStock});
 }

 savePrize(id,patch,image){
  this.ensureMutable();
  const next=clone(this.state);
  const allowed=['name','fullName','tier','stock','enabled','terms','imageChecked','brand','variant'];
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(key=>!allowed.includes(key)))throw fail('Perubahan hadiah tidak valid.');
  let prize=id?next.prizes.find(item=>item.id===id):null;
  const creating=!prize;
  if(id&&!prize)throw fail('Hadiah tidak ditemukan.',404);
  if(creating){
   id=`custom-${randomUUID().slice(0,12).toLowerCase()}`;
   prize={id,name:'Hadiah Baru',fullName:'Hadiah Baru',tier:'product',stock:0,initialStock:0,image:'/assets/products/bundling.svg',enabled:false,imageChecked:false,points:tierPoints.product,terms:'Lengkapi ketentuan hadiah sebelum diaktifkan.'};
   next.prizes.push(prize);
  }
  const previousStock=creating?null:prize.stock;
  Object.assign(prize,patch);
  prize.points=scoreFor(prize.tier,prize.id);
  if(image){prize.image=image;if(patch.imageChecked!==true)prize.imageChecked=false;}
  if(creating||Object.hasOwn(patch,'stock')){
   const issued=next.history.filter(item=>item.game==='drop'&&item.prize.id===id&&item.prize.tier!=='zonk').length;
   if(creating)prize.initialStock=prize.stock;
   else if(previousStock===null&&prize.initialStock===null&&prize.stock!==null)prize.initialStock=prize.stock+issued;
  }
  validateState(next);
  const view=this.commit(next,creating?'prize-created':'prize-updated',{id,keys:Object.keys(patch),imageChanged:Boolean(image),...(Object.hasOwn(patch,'stock')?{previousStock,stock:prize.stock,delta:previousStock===null||prize.stock===null?null:prize.stock-previousStock}:{})});
  return {...view,savedPrizeId:id};
 }

 updatePrize(id,patch){
  this.ensureMutable();
  const next=clone(this.state);
  const prize=next.prizes.find(item=>item.id===id);
  if(!prize)throw fail('Hadiah tidak ditemukan.',404);
  if(!patch||typeof patch!=='object'||Array.isArray(patch))throw fail('Perubahan hadiah tidak valid.');
  const allowed=['name','fullName','tier','stock','enabled','terms','image','imageChecked','brand','variant'];
  if(Object.keys(patch).some(key=>!allowed.includes(key)))throw fail('Kolom hadiah tidak dikenal.');
  const previousStock=prize.stock;
  Object.assign(prize,patch);
  prize.points=scoreFor(prize.tier,prize.id);
  if(Object.hasOwn(patch,'stock')){
   const issued=next.history.filter(item=>item.game==='drop'&&item.prize.id===id&&item.prize.tier!=='zonk').length;
   if(previousStock===null&&prize.initialStock===null&&prize.stock!==null)prize.initialStock=prize.stock+issued;
  }
  validateState(next);
  return this.commit(next,'prize-updated',{id,keys:Object.keys(patch),...(Object.hasOwn(patch,'stock')?{previousStock,stock:prize.stock,delta:previousStock===null||prize.stock===null?null:prize.stock-previousStock}:{})});
 }

 deletePrize(id){
  this.ensureMutable();
  const next=clone(this.state);
  const index=next.prizes.findIndex(item=>item.id===id);
  if(index<0)throw fail('Hadiah tidak ditemukan.',404);
  if(next.history.some(item=>item.game==='drop'&&item.prize.id===id))throw fail('Hadiah yang sudah memiliki riwayat tidak dapat dihapus. Nonaktifkan saja.',409);
  next.prizes.splice(index,1);
  validateState(next);
  return this.commit(next,'prize-deleted',{id});
 }

 claim(id){
  const next=clone(this.state);
  const history=next.history.find(item=>item.id===id);
  if(!history||(history.game==='drop'&&history.prize.tier==='zonk'))throw fail('Hadiah tidak ditemukan.',404);
  if(history.status==='claimed')return this.view(true);
  history.status='claimed';
  history.claimedAt=new Date(this.now()).toISOString();
  if(next.pending?.id===id){next.pending.status='claimed';next.pending.claimedAt=history.claimedAt;}
  return this.commit(next,'claimed',{id,game:history.game});
 }

 restore(restored){
  this.ensureMutable();
  const next=clone(validateState(restored));
  next.pending=null;
  next.settings.mode='demo';
  next.settings.paused=true;
  next.revision=Math.max(this.state.revision,next.revision);
  const view=this.commit(next,'restore',{forcedMode:'demo',paused:true});
  this.demoPending=null;
  this.demoRequests.clear();
  this.demoDailyCounters={};
  return view;
 }
}

module.exports={Engine,choose,chooseFanservice,capsules,validateState,validateSettings,leaderboard,winnerBoard,fanserviceStats,fail,tiers,games,imagePattern,scoreFor,CAPSULE_LIMITS};
