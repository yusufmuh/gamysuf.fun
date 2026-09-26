'use strict';

/* Mesin demo per pengunjung. Tiap pengunjung publik mendapat Engine milik
   game itu sendiri di atas store di memori (salinan katalog asli, mode demo,
   tanpa riwayat), jadi:
   - stok asli tidak pernah berkurang oleh pemain online;
   - hasil tertunda satu pengunjung tidak muncul di layar pengunjung lain.
   Mesin dibangun ulang saat petugas mengubah katalog (revision berubah),
   kecuali pengunjung sedang menunggu hasil yang belum ditutup. */
class MemoryStore{
 constructor(state){this.state=state;}
 commit(next){this.state=structuredClone(next);}
}

function demoState(real){
 const state=structuredClone(real);
 state.pending=null;
 state.history=[];
 state.audit=[];
 if(state.settings){
  state.settings.mode='demo';
  if(Object.hasOwn(state.settings,'paused'))state.settings.paused=false;
 }
 return state;
}

function createVisitorEngines({Engine,options=()=>({}),limit=3000,idleMs=2*60*60*1000,now=()=>Date.now()}){
 const slots=new Map();

 function evict(){
  const cutoff=now()-idleMs;
  for(const [id,slot] of slots)if(slot.seen<cutoff)slots.delete(id);
  while(slots.size>limit)slots.delete(slots.keys().next().value);
 }

 function hasPending(engine){
  try{return Boolean(engine.view().pending);}catch{return false;}
 }

 function get(visitorId,real){
  const id=/^[a-f0-9]{32}$/.test(visitorId||'')?visitorId:'anonymous';
  let slot=slots.get(id);
  const revision=real.state.revision;
  if(!slot||(slot.revision!==revision&&!hasPending(slot.engine))){
   const engine=new Engine(new MemoryStore(demoState(real.state)),options(real));
   if('selectedMode' in engine)engine.selectedMode='demo';
   slot={engine,revision};
  }
  slots.delete(id);
  slot.seen=now();
  slots.set(id,slot);
  if(slots.size>limit||slots.size%200===0)evict();
  return slot.engine;
 }

 return {get,size:()=>slots.size,evict};
}

module.exports={createVisitorEngines,MemoryStore,demoState};
