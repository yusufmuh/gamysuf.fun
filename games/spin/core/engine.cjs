'use strict';
const {randomInt,randomUUID}=require('node:crypto');
const {ZONK}=require('./catalog.cjs');
const GameRules=require('../js/game-rules.js');
const clone=v=>structuredClone(v);
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function summary(prizes){const s={grand:0,bundling:0,voucher:0,product:0,total:0};for(const p of prizes){s[p.tier]+=p.stock;s.total+=p.stock;}return s;}
const distribution=GameRules.distribution;
function choose(state,rng=()=>randomInt(1_000_000)/1_000_000,bonus=false){
 const odds=distribution(state,bonus);if(odds.paused)throw fail(odds.reason,409);
 const r=rng()*100;let acc=0,tier;
 for(const key of ['grand','bundling','zonk','mystery','voucher','product']){acc+=odds[key];if(r<acc){tier=key;break;}}
 if(!tier)throw fail('Angka acak di luar rentang.');
 if(tier==='zonk')return clone(ZONK);
 if(tier==='mystery')return clone(GameRules.MYSTERY);
 const items=state.prizes.filter(p=>p.tier===tier&&p.enabled&&p.stock>0);
 const total=items.reduce((s,p)=>s+p.stock,0);let n=rng()*total;
 for(const p of items){n-=p.stock;if(n<0)return clone(p);}
 throw fail('Hadiah tidak tersedia.',409);
}
function validateSettings(s){
 if(!['demo','live'].includes(s.mode)||typeof s.eventName!=='string'||s.eventName.length>80||typeof s.voucherTerms!=='string'||s.voucherTerms.length>800)throw fail('Pengaturan acara tidak valid.');
 for(const [k,min,max] of [['bundle',0,10],['zonk',0,5],['voucherWeight',0,100],['productWeight',0,100],['volume',0,100],['duration',3500,12000]])if(!Number.isFinite(s[k])||s[k]<min||s[k]>max)throw fail(`Nilai ${k} tidak valid.`);
 if(s.grand!==undefined&&(!Number.isFinite(s.grand)||s.grand<0||s.grand>5))throw fail('Peluang hadiah utama harus 0–5%.');
 for(const [k,min,max] of [['mystery',0,30],['bonusGrandMultiplier',1,20],['bonusBundleMultiplier',1,20],['minPurchase',0,10000000],['attractInterval',45,300]])if(s[k]!==undefined&&(!Number.isFinite(s[k])||s[k]<min||s[k]>max))throw fail(`Nilai ${k} harus ${min}–${max}.`);
 for(const k of ['voice','attract'])if(s[k]!==undefined&&typeof s[k]!=='boolean')throw fail('Pengaturan suara tidak valid.');
 if(s.voucherWeight+s.productWeight<=0)throw fail('Bobot produk dan voucher tidak boleh keduanya nol.');
 for(const k of ['confirmed','paused','sound'])if(typeof s[k]!=='boolean')throw fail('Pengaturan tidak valid.');
}
function validatePrize(p){
 if(typeof p.id!=='string'||!/^[a-z0-9-]{1,60}$/.test(p.id)||!['product','voucher','bundling','grand'].includes(p.tier))throw fail('Identitas hadiah tidak valid.');
 for(const key of ['name','fullName','brand','variant','description','note'])if(typeof p[key]!=='string'||p[key].length>(key==='description'||key==='note'?800:180))throw fail(`Kolom ${key} tidak valid.`);
 if(!p.name.trim()||!p.fullName.trim()||!Number.isInteger(p.stock)||p.stock<0||p.stock>10000)throw fail('Isi nama dan stok bulat antara 0–10.000.');
 if(typeof p.enabled!=='boolean'||typeof p.imageChecked!=='boolean')throw fail('Status hadiah tidak valid.');
 if(typeof p.image!=='string'||(!/^\/(assets\/products|uploads)\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp)$/.test(p.image)&&p.image!==''))throw fail('Gunakan foto lokal PNG, JPG, atau WebP.');
 if(p.promoCode!==undefined&&(typeof p.promoCode!=='string'||!/^[A-Z0-9-]{0,40}$/.test(p.promoCode)))throw fail('Kode voucher harus huruf besar / angka, maksimal 40 karakter.');
 if(['voucher','grand'].includes(p.tier)&&(!Number.isFinite(p.minimum)||p.minimum<0||p.minimum>100000000||!Number.isFinite(p.discount)||p.discount<=0||p.discount>100000000))throw fail('Nilai voucher tidak valid.');
}
function validateState(s){
 if(s.schema!==2||!Number.isInteger(s.revision)||!Array.isArray(s.prizes)||s.prizes.length>24||!Array.isArray(s.history)||!Array.isArray(s.audit))throw fail('Format cadangan tidak valid.');
 validateSettings(s.settings);s.prizes.forEach(validatePrize);
 if(new Set(s.prizes.map(p=>p.id)).size!==s.prizes.length)throw fail('ID hadiah ganda.');
 for(const h of s.history){if(typeof h.id!=='string'||typeof h.prize?.fullName!=='string'||!['grand','bundling','product','voucher','zonk'].includes(h.prize?.tier)||!['unclaimed','claimed','zonk'].includes(h.status)||!Number.isFinite(Date.parse(h.at))||(h.game!==undefined&&!['wheel','boxes'].includes(h.game)))throw fail('Riwayat cadangan tidak valid.');}
 if(s.pending&&!s.history.some(h=>h.id===s.pending.id)&&!(s.pending.stage==='awaiting-box'&&s.pending.prize?.id==='beauty-box'&&typeof s.pending.id==='string'&&typeof s.pending.requestId==='string'&&Array.isArray(s.pending.wheel)&&Number.isFinite(s.pending.readyAt)))throw fail('Hasil tertunda tidak ditemukan.');
 return s;
}
class Engine{
 constructor(store,{rng,now=()=>Date.now(),layoutSeed=randomUUID()}={}){this.store=store;this.rng=rng;this.now=now;this.layoutSeed=layoutSeed;this.demoPending=null;this.demoRequests=new Map();this.liveReadyAt=0;}
 get state(){return this.store.state;}
 // A committed result must remain visible after restart, even if live mode was selected only for this session.
 get mode(){return this.state.pending?'live':this.selectedMode??this.state.settings.mode;}
 view(admin=false){const s=this.state,odds=distribution(s);return {revision:s.revision,campaignId:s.campaignId,prizes:clone(s.prizes),wheel:GameRules.wheel(s.prizes,odds,ZONK,this.layoutSeed),settings:{...clone(s.settings),mode:this.mode},summary:summary(s.prizes),odds,bonusOdds:distribution(s,true),finalOdds:GameRules.finalDistribution(s),pending:clone(this.mode==='demo'?this.demoPending:s.pending),stats:{spins:s.history.length,bonus:s.history.filter(x=>x.bonus).length,won:s.history.filter(x=>x.prize.tier!=='zonk').length,claimed:s.history.filter(x=>x.status==='claimed').length,zonk:s.history.filter(x=>x.prize.tier==='zonk').length},...(admin?{history:clone(s.history),audit:clone(s.audit.slice(-200))}:{})};}
 commit(next,action,details={}){next.revision++;if(action)next.audit.push({at:new Date(this.now()).toISOString(),action,...details});this.store.commit(next);return this.view(true);}
 ensureMutable(){if(this.state.pending||this.demoPending)throw fail('Selesaikan hasil putaran yang masih terbuka terlebih dahulu.',409);}
 selectMode(mode){
  if(!['demo','live'].includes(mode))throw fail('Mode tidak valid.');this.ensureMutable();
  // Mode buttons are session-only: demo selection and demo play never write event data.
  this.selectedMode=mode;this.demoPending=null;this.demoRequests.clear();return this.view();
 }
 spin(requestId,game='wheel',choice=null){
  if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw fail('ID putaran tidak valid.');
  if(!['wheel','boxes'].includes(game)||(game==='boxes'&&(!Number.isInteger(choice)||choice<0||choice>2)))throw fail('Permainan atau pilihan kotak tidak valid.');
  const s=this.state,demo=this.mode==='demo';
  const previous=demo?this.demoRequests.get(requestId):s.history.find(h=>h.requestId===requestId);
  if(previous)return clone(previous);
  const pending=demo?this.demoPending:s.pending;if(pending)return clone(pending);
  if(s.campaignId==='pesta-folka-2026'&&game!=='wheel')throw fail('Beauty Box hanya terbuka dari hasil Mystery Box pada Spin Wheel.',409);
  if(s.settings.paused)throw fail('Permainan sedang dijeda oleh admin.',409);
  if(!demo&&this.now()<this.liveReadyAt)throw fail('Tunggu putaran selesai.',409);
  const purchase=null;
  const prize=choose(s,this.rng),odds=distribution(s);
  const wheel=GameRules.wheel(s.prizes,odds,ZONK,this.layoutSeed),indices=wheel.flatMap((p,i)=>p.id===prize.id?[i]:[]);
  if(!indices.length)throw fail('Hadiah tidak ditemukan pada roda.',500);
  const index=indices.length===1?indices[0]:indices[Math.floor((this.rng?this.rng():randomInt(1_000_000)/1_000_000)*indices.length)];
  const bonus=prize.tier==='bonus';
  const result={id:`BP-${randomUUID().slice(0,8).toUpperCase()}`,requestId,game,choice,at:new Date(this.now()).toISOString(),prize,wheel,index,odds,demo,purchase,duration:s.settings.duration,readyAt:this.now()+s.settings.duration,stage:bonus?'awaiting-box':'result',status:bonus?'bonus':prize.tier==='zonk'?'zonk':'unclaimed'};
  if(demo){this.demoPending=result;this.demoRequests.set(requestId,result);if(this.demoRequests.size>100)this.demoRequests.delete(this.demoRequests.keys().next().value);return clone(result);}
  const next=clone(s);if(!['zonk','bonus'].includes(prize.tier))next.prizes.find(p=>p.id===prize.id).stock--;
  next.pending=result;if(!bonus)next.history.push(result);this.commit(next,bonus?'mystery-unlocked':'spin',{id:result.id,prizeId:prize.id});this.liveReadyAt=this.now()+result.duration;
  return clone(result);
 }
 openBox(roundId,requestId,choice){
  if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId)||typeof roundId!=='string'||!Number.isInteger(choice)||choice<0||choice>2)throw fail('ID ronde atau pilihan kotak tidak valid.');
  const demo=this.mode==='demo',s=this.state,previous=demo?this.demoRequests.get(requestId):s.history.find(h=>h.bonusRequestId===requestId);
  if(previous){if(previous.id!==roundId)throw fail('ID permintaan sudah dipakai ronde lain.',409);if(previous.stage==='awaiting-box')throw fail('Gunakan ID permintaan baru untuk membuka bonus.',409);return clone(previous);}
  const pending=demo?this.demoPending:s.pending;
  if(pending?.id===roundId&&pending.stage==='result'&&pending.bonus)return clone(pending);
  if(!pending||pending.id!==roundId||pending.stage!=='awaiting-box')throw fail('Beauty Box hanya untuk ronde yang mendapat Mystery Box.',409);
  if(!demo&&this.now()<pending.readyAt)throw fail('Tunggu roda selesai sebelum memilih kotak.',409);
  const prize=choose(s,this.rng,true),odds=distribution(s,true);
  if(['zonk','bonus'].includes(prize.tier))throw fail('Hadiah bonus tidak valid.',500);
  const result={...clone(pending),prize,odds,wheelOdds:pending.odds,bonus:true,sourceGame:'wheel',game:'boxes',choice,bonusRequestId:requestId,stage:'result',status:'unclaimed',duration:Math.min(5000,s.settings.duration),at:new Date(this.now()).toISOString()};
  result.readyAt=this.now()+result.duration;
  if(demo){this.demoPending=result;this.demoRequests.set(requestId,result);this.demoRequests.set(pending.requestId,result);return clone(result);}
  const next=clone(s);next.prizes.find(p=>p.id===prize.id).stock--;next.pending=result;next.history.push(result);this.commit(next,'beauty-box-opened',{id:result.id,choice,prizeId:prize.id});this.liveReadyAt=result.readyAt;return clone(result);
 }
 acknowledge(id){
  const current=this.mode==='demo'?this.demoPending:this.state.pending;
  if(current?.id===id&&current.stage==='awaiting-box')throw fail('Buka satu Beauty Box untuk menyelesaikan ronde ini.',409);
  if(this.mode==='demo'){if(this.demoPending?.id!==id)throw fail('Hasil tidak ditemukan.',404);this.demoPending=null;return this.view();}
  if(this.state.pending?.id!==id)throw fail('Hasil tidak ditemukan.',404);
  if(this.now()<this.liveReadyAt)throw fail('Animasi putaran belum selesai.',409);
  const n=clone(this.state);n.pending=null;this.commit(n,'result-closed',{id});return this.view();
 }
 updateSettings(patch){this.ensureMutable();const n=clone(this.state);n.settings.grand??=.2;const allowed=Object.keys(n.settings);for(const k of Object.keys(patch))if(!allowed.includes(k))throw fail('Pengaturan tidak dikenal.');Object.assign(n.settings,patch);validateSettings(n.settings);
  this.commit(n,'settings-updated',{fields:Object.keys(patch)});if(Object.hasOwn(patch,'mode'))this.selectedMode=null;this.demoPending=null;this.demoRequests.clear();return this.view(true);
 }
 updatePrize(prize){this.ensureMutable();validatePrize(prize);const n=clone(this.state);const at=n.prizes.findIndex(p=>p.id===prize.id);if(at<0){if(n.prizes.length>=24)throw fail('Maksimal 24 jenis hadiah.');n.prizes.push(clone(prize));}else n.prizes[at]=clone(prize);return this.commit(n,'prize-updated',{prizeId:prize.id,stock:prize.stock});}
 adjust(id,delta){if(!Number.isInteger(delta)||Math.abs(delta)>10000||delta===0)throw fail('Perubahan stok tidak valid.');const p=this.state.prizes.find(p=>p.id===id);if(!p)throw fail('Hadiah tidak ditemukan.',404);return this.updatePrize({...clone(p),stock:p.stock+delta});}
 remove(id){this.ensureMutable();const n=clone(this.state);if(!n.prizes.some(p=>p.id===id))throw fail('Hadiah tidak ditemukan.',404);n.prizes=n.prizes.filter(p=>p.id!==id);return this.commit(n,'prize-removed',{prizeId:id});}
 claim(id){const n=clone(this.state),h=n.history.find(h=>h.id===id);if(!h||h.prize.tier==='zonk')throw fail('Hadiah tidak ditemukan.',404);if(h.status==='claimed')return this.view(true);h.status='claimed';h.claimedAt=new Date(this.now()).toISOString();return this.commit(n,'prize-claimed',{id});}
 restore(data){this.ensureMutable();let n=clone(validateState(data));if(n.campaignId==='pesta-folka-2026'){const upgraded=require('./migrations.cjs').upgradePestaFolkaV5(n);if(upgraded)n=upgraded;}else n.inventoryVersion=Math.max(3,n.inventoryVersion||3);n.settings.grand??=.2;n.settings.mode='demo';n.settings.confirmed=false;n.settings.paused=true;if(n.pending?.stage!=='awaiting-box')n.pending=null;n.revision=this.state.revision;this.commit(n,'backup-restored');this.selectedMode=null;this.demoPending=null;this.demoRequests.clear();return this.view(true);}
}
module.exports={Engine,distribution,choose,summary,validatePrize,validateSettings,validateState,fail};
