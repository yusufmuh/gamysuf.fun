'use strict';

const {randomInt,randomUUID}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {EMPTY,EVENT,HASHTAGS,TIER_POINTS,CATALOG_VERSION,migrateState}=require('./catalog.cjs');

const clone=structuredClone;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const tiers=['bundling','collab','product','voucher','empty'];
const prizeTiers=tiers.slice(0,-1);
const scoreFor=tier=>TIER_POINTS[tier]??0;
const usernamePattern=/^[\p{L}\p{N} ._]+$/u;
const imagePattern=/^\/(?:assets\/products\/[a-zA-Z0-9_.-]+|uploads\/[a-z0-9-]+)\.(?:jpg|png|svg|webp)$/;
const CAPSULE_LIMITS={openCapsules:[0,500],emptyCapsules:[0,1000]};

const available=prize=>prize.enabled&&(prize.stock===null||prize.stock>0);
const randomUnit=rng=>{
 const roll=Number(rng());
 if(!Number.isFinite(roll)||roll<0||roll>=1)throw fail('Angka acak tidak valid.');
 return roll;
};

/* Mesin kapsul: setiap unit stok adalah satu kapsul, hadiah tak terbatas
   diwakili `openCapsules` kapsul, dan kapsul kosong berjumlah tetap
   (bawaan 0 sehingga setiap tap berhadiah). Semua kapsul berpeluang sama,
   jadi tidak ada persentase yang diatur petugas. Kapsul kosong ikut hilang
   saat kapsul berhadiah habis supaya mesin tidak menjual putaran pasti kosong. */
function capsules(state){
 const rows=state.prizes.filter(available)
  .map(prize=>({id:prize.id,tier:prize.tier,count:prize.stock===null?state.settings.openCapsules:prize.stock}))
  .filter(row=>row.count>0);
 const prize=rows.reduce((total,row)=>total+row.count,0);
 const empty=prize>0?state.settings.emptyCapsules:0;
 const byTier=Object.fromEntries(tiers.map(tier=>[tier,tier==='empty'?empty:rows.filter(row=>row.tier===tier).reduce((total,row)=>total+row.count,0)]));
 return {rows,prize,empty,total:prize+empty,byTier};
}

function choose(state,rng){
 const pool=capsules(state);
 if(pool.prize<=0)throw fail('Kapsul hadiah sudah habis. Hubungi petugas untuk isi ulang.',409);
 let ticket=rng?Math.floor(randomUnit(rng)*pool.total):randomInt(pool.total);
 if(ticket>=pool.prize)return clone(EMPTY);
 for(const row of pool.rows){
  if(ticket<row.count)return clone(state.prizes.find(prize=>prize.id===row.id));
  ticket-=row.count;
 }
 return clone(state.prizes.find(prize=>prize.id===pool.rows.at(-1).id));
}

function validateSettings(settings){
 if(!settings||!['demo','live'].includes(settings.mode)||typeof settings.eventName!=='string'||!settings.eventName.trim()||settings.eventName.length>100||typeof settings.claimTerms!=='string'||settings.claimTerms.length>2000)throw fail('Pengaturan tidak valid.');
 for(const key of ['paused','sound'])if(typeof settings[key]!=='boolean')throw fail('Status tidak valid.');
 if(!Number.isFinite(settings.volume)||settings.volume<0||settings.volume>100)throw fail('Volume harus 0-100%.');
 for(const key of ['bgmVolume','sfxVolume','voiceVolume'])if(!Number.isFinite(settings[key])||settings[key]<0||settings[key]>100)throw fail('Volume kanal harus 0-100%.');
 if(!Number.isInteger(settings.duration)||settings.duration<3000||settings.duration>9000)throw fail('Durasi animasi harus 3-9 detik.');
 if(!Number.isInteger(settings.resultHold)||settings.resultHold<0||settings.resultHold>120)throw fail('Tutup otomatis kartu harus 0-120 detik.');
 if(!['crisp','punchy','flat'].includes(settings.audioProfile))throw fail('Profil audio tidak valid.');
 if(!['gentle','standard','off'].includes(settings.compressor))throw fail('Mode kompresor tidak valid.');
 for(const [key,[minimum,maximum]] of Object.entries(CAPSULE_LIMITS)){
  if(!Number.isInteger(settings[key])||settings[key]<minimum||settings[key]>maximum)throw fail(`Jumlah kapsul ${key==='openCapsules'?'hadiah tak terbatas':'kosong'} harus ${minimum}-${maximum}.`);
 }
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
 if(prize.points!==scoreFor(prize.tier)||typeof prize.terms!=='string'||prize.terms.length>2000)throw fail('Poin atau ketentuan hadiah tidak valid.');
 for(const key of ['brand','variant'])if(prize[key]!==undefined&&(typeof prize[key]!=='string'||prize[key].length>100))throw fail('Detail hadiah tidak valid.');
 ids.add(prize.id);
}

function validateHistory(item){
 if(!item||typeof item.id!=='string'||typeof item.requestId!=='string'||typeof item.username!=='string'||item.username.length<1||item.username.length>64||item.game!=='gacha'||!Number.isFinite(Date.parse(item.at))||item.demo!==false)throw fail('Riwayat tidak valid.');
 if(item.status==='claimed'&&!Number.isFinite(Date.parse(item.claimedAt)))throw fail('Waktu penyerahan tidak valid.');
 if(!tiers.includes(item.prize?.tier)||!['unclaimed','claimed','empty'].includes(item.status))throw fail('Riwayat tidak valid.');
 if(typeof item.prize.id!=='string'||typeof item.prize.fullName!=='string'||!item.prize.fullName.trim()||!imagePattern.test(item.prize.image)||item.prize.points!==scoreFor(item.prize.tier)||typeof item.prize.terms!=='string')throw fail('Detail hadiah pada riwayat tidak valid.');
 if((item.prize.tier==='empty')!==(item.status==='empty'))throw fail('Status kapsul kosong tidak valid.');
}

function validateState(state){
 if(!state||state.schema!==1||(Object.hasOwn(state,'catalogVersion')&&state.catalogVersion!==1&&state.catalogVersion!==CATALOG_VERSION)||!Number.isInteger(state.revision)||state.revision<0||!Array.isArray(state.prizes)||!state.prizes.length||!Array.isArray(state.history)||!Array.isArray(state.audit)||!state.dailyCounters||typeof state.dailyCounters!=='object')throw fail('Format data tidak valid.');
 validateSettings(state.settings);
 const prizeIds=new Set();
 for(const prize of state.prizes)validatePrize(prize,prizeIds);
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
 for(const item of history){
  const row=players.get(item.username)||{username:item.username,plays:0,won:0,points:0};
  row.plays++;
  row.won+=Number(item.prize.tier!=='empty');
  row.points+=item.prize.points||0;
  players.set(item.username,row);
 }
 return [...players.values()].sort((a,b)=>b.points-a.points||b.won-a.won||a.plays-b.plays||a.username.localeCompare(b.username,'id'));
}

/* Hasil resmi terbaru untuk pita "baru saja menang" di layar keramaian.
   Hanya nama panggilan dan nama hadiah; tidak ada kode klaim. */
function recentWins(history,limit=8){
 return history.filter(item=>item.demo===false&&item.prize.tier!=='empty').slice(-limit).reverse()
  .map(item=>({username:item.username,prize:item.prize.name,tier:item.prize.tier,image:item.prize.image,at:item.at}));
}

class Engine{
 constructor(store,{rng,now=()=>Date.now()}={}){
  this.store=store;
  this.rng=rng;
  this.now=now;
  this.demoPending=null;
  this.demoRequests=new Map();
  this.demoDailyCounters={};
 }

 get state(){return this.store.state;}

 view(admin=false){
  const state=this.state;
  const pool=capsules(state);
  const history=state.history;
  const publicView={
   prizes:clone(state.prizes),
   event:{...EVENT},
   hashtags:[...HASHTAGS],
   settings:clone(state.settings),
   capsules:{prize:pool.prize,empty:pool.empty,total:pool.total,byTier:pool.byTier,byPrize:Object.fromEntries(pool.rows.map(row=>[row.id,row.count]))},
   pending:clone(state.pending||this.demoPending),
   recent:recentWins(history),
   leaderboard:leaderboard(history).slice(0,10),
   stats:{
    plays:history.length,
    won:history.filter(item=>item.prize.tier!=='empty').length,
    claimed:history.filter(item=>item.status==='claimed').length,
    empty:history.filter(item=>item.prize.tier==='empty').length,
    stock:state.prizes.reduce((total,prize)=>total+(prize.stock??0),0),
    unlimited:state.prizes.filter(prize=>prize.enabled&&prize.stock===null).length,
    allRewardsDepleted:pool.prize===0
   }
  };
  return admin?{...publicView,leaderboard:leaderboard(history),history:clone(history),audit:clone(state.audit),revision:state.revision}:publicView;
 }

 commit(next,action,detail){
  next.revision++;
  next.audit.push({at:new Date(this.now()).toISOString(),action,...(detail?{detail}:{})});
  if(next.audit.length>5000)next.audit.splice(0,next.audit.length-5000);
  this.store.commit(next);
  return this.view(true);
 }

 ensureMutable(){
  if(this.state.pending||this.demoPending)throw fail('Tutup hasil permainan terlebih dahulu.',409);
 }

 play(requestId,username=''){
  if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw fail('ID permintaan tidak valid.');
  if(typeof username!=='string')throw fail('Nama tidak valid.');
  const trimmed=username.trim();
  if(trimmed&&(trimmed.length>24||!usernamePattern.test(trimmed)))throw fail('Nama hanya boleh 1-24 karakter: huruf, angka, spasi, titik, atau garis bawah.');
  const state=this.state;
  const previous=state.history.find(item=>item.requestId===requestId)||this.demoRequests.get(requestId);
  if(previous)return clone(previous);
  if(state.pending||this.demoPending)return clone(state.pending||this.demoPending);
  if(state.settings.paused)throw fail('Permainan sedang dijeda oleh petugas.',409);

  const prize=choose(state,this.rng);
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
   id:'GP-'+randomUUID().slice(0,8).toUpperCase(),
   requestId,
   username:player,
   game:'gacha',
   prize,
   status:prize.tier==='empty'?'empty':'unclaimed',
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
  if(prize.tier!=='empty'){
   const selected=next.prizes.find(item=>item.id===prize.id);
   if(selected.stock!==null)selected.stock--;
  }
  next.history.push(result);
  next.pending=result;
  this.commit(next,'play',{id:result.id,prizeId:prize.id});
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

 issuedCount(state,id){
  return state.history.filter(item=>item.prize.id===id&&item.prize.tier!=='empty').length;
 }

 stock(id,stock){
  this.ensureMutable();
  const next=clone(this.state);
  const prize=next.prizes.find(item=>item.id===id);
  if(!prize)throw fail('Hadiah tidak ditemukan.',404);
  if(stock!==null&&(!Number.isInteger(stock)||stock<0||stock>10000))throw fail('Stok harus 0-10.000 atau tak terbatas.');
  const previousStock=prize.stock;
  prize.stock=stock;
  if(previousStock===null&&prize.initialStock===null&&stock!==null)prize.initialStock=stock+this.issuedCount(next,id);
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
   prize={id,name:'Hadiah Baru',fullName:'Hadiah Baru',tier:'product',stock:0,initialStock:0,image:'/assets/products/bundling-1.webp',enabled:false,imageChecked:false,points:scoreFor('product'),terms:'Lengkapi ketentuan hadiah sebelum diaktifkan.'};
   next.prizes.push(prize);
  }
  const previousStock=creating?null:prize.stock;
  Object.assign(prize,patch);
  prize.points=scoreFor(prize.tier);
  if(image){prize.image=image;if(patch.imageChecked!==true)prize.imageChecked=false;}
  if(creating)prize.initialStock=prize.stock;
  else if(Object.hasOwn(patch,'stock')&&previousStock===null&&prize.initialStock===null&&prize.stock!==null)prize.initialStock=prize.stock+this.issuedCount(next,id);
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
  prize.points=scoreFor(prize.tier);
  if(Object.hasOwn(patch,'stock')&&previousStock===null&&prize.initialStock===null&&prize.stock!==null)prize.initialStock=prize.stock+this.issuedCount(next,id);
  validateState(next);
  return this.commit(next,'prize-updated',{id,keys:Object.keys(patch),...(Object.hasOwn(patch,'stock')?{previousStock,stock:prize.stock,delta:previousStock===null||prize.stock===null?null:prize.stock-previousStock}:{})});
 }

 deletePrize(id){
  this.ensureMutable();
  const next=clone(this.state);
  const index=next.prizes.findIndex(item=>item.id===id);
  if(index<0)throw fail('Hadiah tidak ditemukan.',404);
  if(next.history.some(item=>item.prize.id===id))throw fail('Hadiah yang sudah memiliki riwayat tidak dapat dihapus. Nonaktifkan saja.',409);
  if(next.prizes.length===1)throw fail('Minimal satu hadiah harus tetap ada.',409);
  next.prizes.splice(index,1);
  validateState(next);
  return this.commit(next,'prize-deleted',{id});
 }

 claim(id){
  const next=clone(this.state);
  const history=next.history.find(item=>item.id===id);
  if(!history||history.prize.tier==='empty')throw fail('Hadiah tidak ditemukan.',404);
  if(history.status==='claimed')return this.view(true);
  history.status='claimed';
  history.claimedAt=new Date(this.now()).toISOString();
  if(next.pending?.id===id){next.pending.status='claimed';next.pending.claimedAt=history.claimedAt;}
  return this.commit(next,'claimed',{id});
 }

 restore(restored){
  this.ensureMutable();
  const next=clone(validateState(restored));
  migrateState(next);
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

module.exports={Engine,choose,capsules,validateState,validateSettings,leaderboard,recentWins,fail,tiers,imagePattern,scoreFor,CAPSULE_LIMITS};
