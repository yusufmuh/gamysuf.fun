'use strict';

const {randomInt,randomUUID}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {ZONK}=require('./catalog.cjs');

const clone=structuredClone;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const tiers=['bundling','grand','voucher','product','newuser','zonk'];
const prizeTiers=tiers.slice(0,-1);
const tierLimits={
 bundling:[0,20],
 grand:[0,20],
 voucher:[0,60],
 product:[0,60],
 newuser:[0,80],
 zonk:[0,60]
};
const tierPoints={bundling:500,grand:400,voucher:100,product:80,newuser:40};
const scoreFor=(tier,id)=>tier==='voucher'?({'voucher-25':100,'voucher-50':120,'voucher-100000':150}[id]??100):(tierPoints[tier]??0);
const usernamePattern=/^[\p{L}\p{N} ._]+$/u;
const imagePattern=/^\/(?:assets\/products\/[a-zA-Z0-9_.-]+|uploads\/[a-z0-9-]+)\.(?:jpg|png|svg|webp)$/;

const available=prize=>prize.enabled&&(prize.stock===null||prize.stock>0);

function distribution(state){
 const active=tiers.filter(tier=>tier==='zonk'||state.prizes.some(prize=>prize.tier===tier&&available(prize)));
 const activeTotal=active.reduce((total,tier)=>total+state.settings.odds[tier],0);
 if(activeTotal<=0){
  return Object.fromEntries(tiers.map(tier=>[tier,tier==='zonk'?100:0]));
 }
 return Object.fromEntries(tiers.map(tier=>[tier,active.includes(tier)?100*state.settings.odds[tier]/activeTotal:0]));
}

function choose(state,rng=()=>randomInt(1000000)/1000000){
 const odds=distribution(state);
 let roll=Number(rng());
 if(!Number.isFinite(roll)||roll<0||roll>=1)throw fail('Angka acak tidak valid.');
 let cursor=roll*100;
 let tier='zonk';
 for(const current of tiers){
  cursor-=odds[current];
  if(cursor<0){tier=current;break;}
 }
 if(tier==='zonk')return clone(ZONK);
 const items=state.prizes.filter(prize=>prize.tier===tier&&available(prize));
 const weight=items.reduce((total,prize)=>total+(prize.stock??1),0);
 if(!items.length||weight<=0)throw fail('Hadiah tidak tersedia.',409);
 roll=Number(rng());
 if(!Number.isFinite(roll)||roll<0||roll>=1)throw fail('Angka acak tidak valid.');
 cursor=roll*weight;
 for(const prize of items){
  cursor-=prize.stock??1;
  if(cursor<0)return clone(prize);
 }
 return clone(items.at(-1));
}

function validateSettings(settings){
 if(!settings||!['demo','live'].includes(settings.mode)||typeof settings.eventName!=='string'||!settings.eventName.trim()||settings.eventName.length>100||typeof settings.voucherTerms!=='string'||settings.voucherTerms.length>2000)throw fail('Pengaturan tidak valid.');
 for(const key of ['paused','sound'])if(typeof settings[key]!=='boolean')throw fail('Status tidak valid.');
 if(!Number.isFinite(settings.volume)||settings.volume<0||settings.volume>100||!Number.isFinite(settings.duration)||settings.duration<3000||settings.duration>12000)throw fail('Volume atau durasi tidak valid.');
 if(settings.bgmVolume===undefined)settings.bgmVolume=75;
 else if(!Number.isFinite(settings.bgmVolume)||settings.bgmVolume<0||settings.bgmVolume>100)throw fail('Volume musik harus 0-100%.');
 if(settings.sfxVolume===undefined)settings.sfxVolume=85;
 else if(!Number.isFinite(settings.sfxVolume)||settings.sfxVolume<0||settings.sfxVolume>100)throw fail('Volume efek harus 0-100%.');
 if(settings.voiceVolume===undefined)settings.voiceVolume=90;
 else if(!Number.isFinite(settings.voiceVolume)||settings.voiceVolume<0||settings.voiceVolume>100)throw fail('Volume maskot harus 0-100%.');
 if(settings.audioProfile===undefined)settings.audioProfile='crisp';
 else if(!['crisp','punchy','flat'].includes(settings.audioProfile))throw fail('Profil audio tidak valid.');
 if(settings.compressor===undefined)settings.compressor='gentle';
 else if(!['gentle','standard','off'].includes(settings.compressor))throw fail('Mode kompresor tidak valid.');
 if(!settings.odds)throw fail('Peluang tidak valid.');
 for(const tier of tiers){
  const value=settings.odds[tier];
  const [minimum,maximum]=tierLimits[tier];
  if(!Number.isFinite(value)||value<minimum||value>maximum)throw fail(`Peluang ${tier} harus ${minimum}-${maximum}%.`);
 }
 if(Math.abs(tiers.reduce((total,tier)=>total+settings.odds[tier],0)-100)>0.000001)throw fail('Jumlah peluang wajib 100%.');
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

function validateState(state){
 if(!state||state.schema!==1||!Number.isInteger(state.revision)||state.revision<0||!Array.isArray(state.prizes)||!state.prizes.length||!Array.isArray(state.history)||!Array.isArray(state.audit)||!state.dailyCounters||typeof state.dailyCounters!=='object')throw fail('Format data tidak valid.');
 validateSettings(state.settings);
 const ids=new Set();
 for(const prize of state.prizes)validatePrize(prize,ids);
 const requests=new Set();
 const resultIds=new Set();
 for(const history of state.history){
  if(!history||typeof history.id!=='string'||resultIds.has(history.id)||typeof history.requestId!=='string'||requests.has(history.requestId)||typeof history.username!=='string'||history.username.length<1||history.username.length>64||!tiers.includes(history.prize?.tier)||!['unclaimed','claimed','zonk'].includes(history.status)||!Number.isFinite(Date.parse(history.at))||history.demo!==false)throw fail('Riwayat tidak valid.');
  if(typeof history.prize.id!=='string'||typeof history.prize.fullName!=='string'||!history.prize.fullName.trim()||!imagePattern.test(history.prize.image)||history.prize.points!==scoreFor(history.prize.tier,history.prize.id)||typeof history.prize.terms!=='string')throw fail('Detail hadiah pada riwayat tidak valid.');
  if(history.prize.tier==='zonk'&&history.status!=='zonk')throw fail('Status zonk tidak valid.');
  if(history.prize.tier!=='zonk'&&history.status==='zonk')throw fail('Status hadiah tidak valid.');
  if(history.status==='claimed'&&!Number.isFinite(Date.parse(history.claimedAt)))throw fail('Waktu penyerahan tidak valid.');
  requests.add(history.requestId);resultIds.add(history.id);
 }
 for(const count of Object.values(state.dailyCounters))if(!Number.isInteger(count)||count<0)throw fail('Nomor harian tidak valid.');
  if(state.pending){
   const recorded=state.history.find(history=>history.id===state.pending.id);
   if(!recorded||!isDeepStrictEqual(state.pending,recorded))throw fail('Hasil tertunda tidak cocok dengan riwayat.');
  }
 return state;
}

function leaderboard(history){
 const players=new Map();
 for(const item of history){
  const row=players.get(item.username)||{username:item.username,plays:0,won:0,points:0};
  row.plays++;
  row.won+=Number(item.prize.tier!=='zonk');
  row.points+=item.prize.points||0;
  players.set(item.username,row);
 }
 return [...players.values()].sort((a,b)=>b.points-a.points||b.won-a.won||a.plays-b.plays||a.username.localeCompare(b.username,'id'));
}

function winnerBoard(history){
 const wins=history.filter(item=>item.demo===false&&item.prize.tier!=='zonk');
 return leaderboard(wins).slice(0,20).map(row=>{
  const gifts=new Map();
  for(const item of wins.filter(item=>item.username===row.username)){
   const key=item.prize.id+'|'+item.prize.fullName;
   const gift=gifts.get(key)||{name:item.prize.fullName,image:item.prize.image,count:0};
   gift.count++;gifts.set(key,gift);
  }
  return {...row,prizes:[...gifts.values()]};
 });
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
  const effectiveOdds=distribution(state);
  const publicView={
   prizes:clone(state.prizes),
   settings:clone(state.settings),
   odds:effectiveOdds,
   pending:clone(state.pending||this.demoPending),
   leaderboard:leaderboard(state.history),
   winners:winnerBoard(state.history),
   stats:{
    plays:state.history.length,
    won:state.history.filter(item=>item.prize.tier!=='zonk').length,
    claimed:state.history.filter(item=>item.status==='claimed').length,
    zonk:state.history.filter(item=>item.prize.tier==='zonk').length,
    stock:state.prizes.reduce((total,prize)=>total+(prize.stock??0),0),
    unlimited:state.prizes.filter(prize=>prize.enabled&&prize.stock===null).length,
    allRewardsDepleted:state.prizes.every(prize=>!available(prize))
   }
  };
  return admin?{...publicView,history:clone(state.history),audit:clone(state.audit),revision:state.revision}:publicView;
 }

 commit(next,action,detail){
  next.revision++;
  next.audit.push({at:new Date(this.now()).toISOString(),action,...(detail?{detail}:{} )});
  this.store.commit(next);
  return this.view(true);
 }

 ensureMutable(){
  if(this.state.pending||this.demoPending)throw fail('Tutup hasil permainan terlebih dahulu.',409);
 }

 play(requestId,username=''){
  if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw fail('ID permintaan tidak valid.');
  if(typeof username!=='string')throw fail('Username tidak valid.');
  const trimmed=username.trim();
  if(trimmed&&(trimmed.length>24||!usernamePattern.test(trimmed)))throw fail('Username hanya boleh 1-24 karakter: huruf, angka, spasi, titik, atau garis bawah.');
  const state=this.state;
  const previous=state.history.find(item=>item.requestId===requestId)||this.demoRequests.get(requestId);
  if(previous)return clone(previous);
  if(state.pending||this.demoPending)return clone(state.pending||this.demoPending);
  if(state.settings.paused)throw fail('Permainan sedang dijeda oleh petugas.',409);
  const demo=state.settings.mode==='demo';
  const next=clone(state);
  const date=new Date(this.now());
  const day=`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
  const counters=demo?this.demoDailyCounters:next.dailyCounters;
  const count=(counters[day]||0)+1;
  counters[day]=count;
  const months=['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des'];
  const player=trimmed||`pelanggan-${String(count).padStart(3,'0')}-${date.getDate()}${months[date.getMonth()]}`;
  const prize=choose(state,this.rng);
  const result={
   id:'NY-'+randomUUID().slice(0,8).toUpperCase(),
   requestId,
   username:player,
   prize,
   demo,
   at:date.toISOString(),
   duration:state.settings.duration,
   status:prize.tier==='zonk'?'zonk':'unclaimed'
  };
  if(demo){
   this.demoPending=result;
   this.demoRequests.set(requestId,result);
   if(this.demoRequests.size>100)this.demoRequests.delete(this.demoRequests.keys().next().value);
   return clone(result);
  }
  if(prize.tier!=='zonk'){
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
  }else if(!this.state.history.some(history=>history.id===id)&&!this.demoRequestsHasResult(id))throw fail('Hasil tidak ditemukan.',404);
  return this.view();
 }

 demoRequestsHasResult(id){return [...this.demoRequests.values()].some(result=>result.id===id);}

 updateSettings(patch){
  this.ensureMutable();
  const next=clone(this.state);
  validateSettings(next.settings);
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(key=>!Object.hasOwn(next.settings,key)))throw fail('Pengaturan tidak dikenal.');
  Object.assign(next.settings,patch);
  validateSettings(next.settings);
  return this.commit(next,'settings',{keys:Object.keys(patch)});
 }

 stock(id,stock){
  this.ensureMutable();
  const next=clone(this.state);
  const prize=next.prizes.find(item=>item.id===id);
  if(!prize)throw fail('Hadiah tidak ditemukan.',404);
  if(stock!==null&&(!Number.isInteger(stock)||stock<0||stock>10000))throw fail('Stok harus 0-10.000 atau tak terbatas.');
  const previousStock=prize.stock;
  prize.stock=stock;
  const issued=next.history.filter(item=>item.prize.id===id&&item.prize.tier!=='zonk').length;
  if(previousStock===null&&prize.initialStock===null&&stock!==null)prize.initialStock=stock+issued;
  validateState(next);
  return this.commit(next,'stock',{id,previousStock,stock,delta:previousStock===null||stock===null?null:stock-previousStock});
 }

 createPrize(input={}){
  this.ensureMutable();
  const next=clone(this.state);
  const tier=prizeTiers.includes(input.tier)?input.tier:'product';
  const stock=input.stock===null?null:Number.isInteger(input.stock)?input.stock:0;
  const name=typeof input.name==='string'&&input.name.trim()?input.name.trim():'Hadiah Baru';
  const fullName=typeof input.fullName==='string'&&input.fullName.trim()?input.fullName.trim():name;
  const id=`custom-${randomUUID().slice(0,12).toLowerCase()}`;
  next.prizes.push({
   id,name,fullName,tier,stock,initialStock:stock,
   image:'/assets/products/bundling.svg',enabled:false,imageChecked:false,
   points:scoreFor(tier,id),
   terms:typeof input.terms==='string'?input.terms:'Lengkapi ketentuan hadiah sebelum diaktifkan.'
  });
  validateState(next);
  return this.commit(next,'prize-created',{id});
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
   const issued=next.history.filter(item=>item.prize.id===id&&item.prize.tier!=='zonk').length;
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
   const issued=next.history.filter(item=>item.prize.id===id&&item.prize.tier!=='zonk').length;
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
  if(next.history.some(item=>item.prize.id===id))throw fail('Hadiah yang sudah memiliki riwayat tidak dapat dihapus. Nonaktifkan saja.',409);
  next.prizes.splice(index,1);
  validateState(next);
  return this.commit(next,'prize-deleted',{id});
 }

 claim(id){
  const next=clone(this.state);
  const history=next.history.find(item=>item.id===id);
  if(!history||history.prize.tier==='zonk')throw fail('Hadiah tidak ditemukan.',404);
  if(history.status==='claimed')return this.view(true);
  history.status='claimed';
  history.claimedAt=new Date(this.now()).toISOString();
  if(next.pending?.id===id){next.pending.status='claimed';next.pending.claimedAt=history.claimedAt;}
  return this.commit(next,'claimed',{id});
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

module.exports={Engine,choose,distribution,validateState,validateSettings,leaderboard,winnerBoard,fail,tiers,tierLimits,imagePattern,scoreFor};
