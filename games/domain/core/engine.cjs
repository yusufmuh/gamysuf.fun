'use strict';
const {randomUUID,randomInt}=require('node:crypto');
const {REWARDS,HOSTS}=require('./catalog.cjs');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const obj=v=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,max=10000000)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const day=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
/** @param {unknown} value @returns {boolean} */
const localImage=value=>typeof value==='string'&&/^\/assets\/[a-zA-Z0-9_./-]+$/.test(value)&&!value.includes('..');
function validateState(s){
 if(!obj(s)||s.schema!==1||!integer(s.revision,Number.MAX_SAFE_INTEGER)||!Array.isArray(s.history)||!Array.isArray(s.audit)||!obj(s.dailyCounters))throw fail('Data event tidak valid.');
 const x=s.settings;if(!obj(x)||!['demo','live'].includes(x.mode)||['paused','sessionOpen'].some(k=>typeof x[k]!=='boolean')||!integer(x.purchaseThreshold)||!integer(x.queueLimit,100)||x.queueLimit<1||!integer(x.duration,15000)||x.duration<1000||typeof x.schedule!=='string'||x.schedule.length>180)throw fail('Pengaturan tidak valid.');
 if(!Array.isArray(s.hosts)||s.hosts.length!==2||new Set(s.hosts.map(h=>h.id)).size!==2||s.hosts.some(h=>!HOSTS.some(k=>k.id===h.id)||typeof h.name!=='string'||!h.name.trim()||h.name.length>60||typeof h.enabled!=='boolean'||!integer(h.quota,10000)))throw fail('Host tidak valid.');
 if(!Array.isArray(s.rewards)||s.rewards.length!==REWARDS.length||new Set(s.rewards.map(r=>r.id)).size!==REWARDS.length||s.rewards.some(r=>!REWARDS.some(k=>k.id===r.id&&k.track===r.track)||!integer(r.stock,100000)||!integer(r.value)||typeof r.enabled!=='boolean'||typeof r.terms!=='string'||r.terms.length>1000||typeof r.name!=='string'||!r.name.trim()||typeof r.detail!=='string'||typeof r.alternative!=='string'||typeof r.image!=='string'||!r.image.startsWith('/assets/')||!integer(r.seconds,600)))throw fail('Hadiah tidak valid.');
 for(const r of [...s.history,...(s.pending?[s.pending]:[])])if(!obj(r)||typeof r.id!=='string'||typeof r.requestId!=='string'||typeof r.demo!=='boolean'||!['waiting','served','cancelled','demo'].includes(r.status)||!['infinity','seal'].includes(r.activity)||!['auto','touch'].includes(r.controlMode)||!['fanservice','beauty'].includes(r.rewardTrack)||!REWARDS.some(k=>k.id===r.reward?.id)||!HOSTS.some(h=>h.id===r.host?.id)||!['touch','no-touch'].includes(r.comfort)||typeof r.consent!=='boolean'||typeof r.recording!=='boolean'||((r.comfort==='touch'||r.recording)&&r.consent!==true)||(!r.demo&&(r.verified!==true||!integer(r.purchaseAmount)||!integer(r.purchaseMinimum)||r.purchaseAmount<r.purchaseMinimum)))throw fail('Tiket tidak valid.');
 if(s.hosts.some(h=>!localImage(h.image)||typeof h.performer!=='string'||h.performer.length>80))throw fail('Identitas host tidak valid.');
 if(Object.entries(s.dailyCounters).some(([key,value])=>!/^\d{4}-\d{2}-\d{2}$/.test(key)||!integer(value,Number.MAX_SAFE_INTEGER)))throw fail('Nomor antrean tidak valid.');
 if(new Set(s.history.map(r=>r.id)).size!==s.history.length||new Set(s.history.map(r=>r.requestId)).size!==s.history.length)throw fail('Tiket duplikat.');
 if(s.pending){const stored=s.history.find(r=>r.id===s.pending.id);if(!stored||JSON.stringify(stored)!==JSON.stringify(s.pending))throw fail('Hasil tertunda tidak sesuai riwayat.');}
 if(s.history.some(r=>r.reward.track!==r.rewardTrack||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at))||!localImage(r.reward.image)||!localImage(r.host.image)||!integer(r.reward.value)||typeof r.reward.terms!=='string'||typeof r.username!=='string'||r.username.length>40||!integer(r.duration,15000)||r.duration<1000||(!r.demo&&(!integer(r.queueNumber,Number.MAX_SAFE_INTEGER)||r.queueNumber<1))||(r.demo&&r.queueNumber!==null)))throw fail('Snapshot tiket tidak valid.');
 if(s.audit.some(row=>!obj(row)||typeof row.type!=='string'||!Number.isFinite(Date.parse(row.at))))throw fail('Audit tidak valid.');
 return s;
}
/** Reward outcomes are server-owned; visual score is deliberately ignored.\n * Registry adapter: extract(_route,json) => json.reward ?\n * {cardId:json.reward.id,name:json.reward.name,image:json.reward.image,rarity:json.rewardTrack==='fanservice'?'epic':'common'} : null.\n * cards(state) maps state.rewards to the same cosmetic album shape.\n * createApp returns {server,engine,dataDir,origin,close}; mounted public requests use cloud.engineFor.\n */
class Engine{
 constructor(store,{rng,now=()=>Date.now()}={}){this.store=store;this.rng=rng;this.now=now;validateState(store.state);}
 get state(){return this.store.state;}
 waiting(){return this.state.history.filter(r=>!r.demo&&r.status==='waiting');}
 used(id){return this.state.history.filter(r=>!r.demo&&r.status!=='cancelled'&&r.rewardTrack==='fanservice'&&r.host.id===id&&day(r.at)===day(this.now())).length;}
 view(admin=false){const s=this.state;return structuredClone({settings:s.settings,hosts:s.hosts.map(h=>({...h,remaining:Math.max(0,h.quota-this.used(h.id))})),rewards:s.rewards,pending:s.pending,revision:s.revision,queue:{waiting:this.waiting().length},...(admin?{history:s.history,audit:s.audit}:{})});}
 commit(next,type,detail={}){next.revision=this.state.revision+1;next.audit.push({at:new Date(this.now()).toISOString(),type,...detail});validateState(next);this.store.commit(next);return this.view(true);}
 play(requestId,o={}){
  if(typeof requestId!=='string'||!/^[-a-zA-Z0-9]{8,80}$/.test(requestId)||!obj(o))throw fail('Permintaan tidak valid.');
  const s=this.state,prior=s.history.find(r=>r.requestId===requestId);if(prior)return structuredClone(prior);
  if(s.pending)throw fail('Selesaikan hasil sebelumnya.',409);
  if(s.settings.paused||!s.settings.sessionOpen)throw fail('Sesi sedang istirahat.',409);
  if(!['infinity','seal'].includes(o.activity)||!['auto','touch'].includes(o.controlMode)||!['fanservice','beauty'].includes(o.rewardTrack))throw fail('Pilihan permainan tidak valid.');
  const host=s.hosts.find(h=>h.id===o.character&&h.enabled);if(!host)throw fail('Pilih karakter tersedia.');
  const comfort=o.comfort??'no-touch',recording=o.recording??false,consent=o.consent??false;
  if(!['touch','no-touch'].includes(comfort)||typeof recording!=='boolean'||typeof consent!=='boolean'||((comfort==='touch'||recording)&&consent!==true))throw fail('Persetujuan eksplisit diperlukan.');
  const demo=s.settings.mode==='demo';
  if(!demo){if(o.verified!==true||!integer(o.purchaseAmount)||o.purchaseAmount<s.settings.purchaseThreshold)throw fail('Petugas perlu memverifikasi belanja.',409);if(this.waiting().length>=s.settings.queueLimit)throw fail('Antrean penuh.',409);if(o.rewardTrack==='fanservice'&&this.used(host.id)>=host.quota)throw fail('Kuota host habis.',409);}
  const pool=s.rewards.filter(r=>r.track===o.rewardTrack&&r.enabled&&(demo||r.stock>0));if(!pool.length)throw fail('Hadiah tersedia belum dikonfigurasi petugas.',409);
  let index;if(this.rng){const v=this.rng();if(!Number.isFinite(v)||v<0||v>=1)throw fail('Sumber acak tidak valid.',500);index=Math.floor(v*pool.length);}else index=randomInt(pool.length);
  const reward=structuredClone(pool[index]),next=structuredClone(s),key=day(this.now());
  if(o.rewardTrack==='fanservice')reward.image=host.image;
  if(!demo){next.rewards.find(r=>r.id===reward.id).stock--;next.dailyCounters[key]=(next.dailyCounters[key]||0)+1;}
  const result={id:(demo?'DEMO-':'DF-')+randomUUID().slice(0,8).toUpperCase(),requestId,at:new Date(this.now()).toISOString(),demo,activity:o.activity,rewardTrack:o.rewardTrack,controlMode:o.controlMode,host:structuredClone(host),reward,comfort,consent,recording,username:String(o.username||'Tamu Bpedia').replace(/[\p{Cc}\p{Cf}]/gu,'').trim().slice(0,40)||'Tamu Bpedia',status:demo?'demo':'waiting',queueNumber:demo?null:next.dailyCounters[key],duration:s.settings.duration,...(!demo?{verified:true,purchaseAmount:o.purchaseAmount,purchaseMinimum:s.settings.purchaseThreshold}:{})};
  if(o.rewardTrack==='fanservice')result.service=structuredClone(reward);
  next.pending=result;next.history.push(result);this.commit(next,'reserve',{id:result.id,demo,reward:reward.id});return structuredClone(result);
 }
 acknowledge(id){if(typeof id!=='string')throw fail('Kode hasil tidak valid.');if(!this.state.pending)return this.view();if(this.state.pending.id!==id)throw fail('Hasil berubah.',409);const n=structuredClone(this.state);n.pending=null;this.commit(n,'acknowledge',{id});return this.view();}
 updateSettings(patch){return this.update('settings',null,patch,['mode','paused','sessionOpen','queueLimit','purchaseThreshold','duration','schedule']);}
 updateReward(id,patch){return this.update('rewards',id,patch,['stock','enabled','value','terms']);}
 updateHost(id,patch){return this.update('hosts',id,patch,['quota','enabled','name','performer']);}
 update(key,id,patch,allowed){if(!obj(patch)||!Object.keys(patch).length||Object.keys(patch).some(k=>!allowed.includes(k)))throw fail('Perubahan tidak valid.');if(key==='settings'&&patch.mode&&patch.mode!==this.state.settings.mode&&this.state.pending)throw fail('Tutup hasil sebelum mengganti mode.',409);const n=structuredClone(this.state),target=id?n[key].find(r=>r.id===id):n[key];if(!target)throw fail('Tidak ditemukan.',404);Object.assign(target,patch);return this.commit(n,'update',{key,id});}
 resolve(id,action){if(!['served','cancelled','noTouch','no-touch'].includes(action))throw fail('Aksi tidak valid.');const n=structuredClone(this.state),r=n.history.find(h=>h.id===id&&!h.demo);if(!r)throw fail('Tiket resmi tidak ditemukan.',404);if(r.status!=='waiting'){if(r.status===action)return this.view(true);throw fail('Tiket sudah ditutup.',409);}if(action==='noTouch'||action==='no-touch')r.comfort='no-touch';else{r.status=action;r.resolvedAt=new Date(this.now()).toISOString();if(action==='cancelled')n.rewards.find(x=>x.id===r.reward.id).stock++;}if(n.pending?.id===id)n.pending=structuredClone(r);return this.commit(n,'resolve',{id,action});}
}
module.exports={Engine,validateState,fail};

