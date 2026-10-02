'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{createHash}=require('node:crypto');
// Menguji salinan games/heart hasil `npm run sync`; sumber tes ada di ../05 bipy-heart-parade/tests.
const ROOT=path.join(__dirname,'..','games','heart');
const {Engine,validateState,migrateState,hydrateResult}=require(path.join(ROOT,'core/engine.cjs'));
const {defaultState,SERVICES,HOSTS,CARDS,PRICE_LIMIT,SCHEDULE,LEGACY_SCHEDULES,cardFor}=require(path.join(ROOT,'core/catalog.cjs'));
const {Store}=require(path.join(ROOT,'core/store.cjs')),{historyCsv,HEADER}=require(path.join(ROOT,'core/report.cjs'));
const options={host:'zoro',comfort:'no-touch',consent:true,recording:false,verified:true};
const DEFAULT_PRICES={cinderella:65000,twirl:50000,whisper:45000,offering:40000,vow:75000,hug:55000,pat:35000};
const NOW=Date.parse('2026-10-03T05:00:00Z');
function memoryStore(state=defaultState()){return {state,commit(next){this.state=structuredClone(next);}};}
function engine(extra={}){return new Engine(memoryStore(),{rng:()=>.4,now:()=>NOW,...extra});}
function tempDir(t,prefix){const dir=fs.mkdtempSync(path.join(os.tmpdir(),prefix));t.after(()=>{assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});});return dir;}

/* Bentuk data event.json rilis 1.5.x: tanpa harga FS, host tanpa detail kartu TCG,
   jadwal lama, dan kartu riwayat masih membawa nilai BERRY fiktif. */
function legacyState(){
 const s=defaultState();
 s.revision=17;
 s.settings={...s.settings,mode:'live',schedule:LEGACY_SCHEDULES[0],queueLimit:9};
 s.services=s.services.map(({price,...rest})=>({...rest,enabled:rest.id!=='pat'}));
 s.hosts=HOSTS.map(h=>({id:h.id,name:h.name,role:h.role,quote:h.quote,image:h.image,mascot:h.mascot,color:h.color,enabled:h.id==='zoro',quota:h.id==='zoro'?42:80}));
 const service=id=>{const {price,...rest}=SERVICES.find(v=>v.id===id);return {...rest,enabled:true};};
 const oldCard=(host,id)=>({id:`${host}-${id}`,hostId:host,serviceId:id,listValue:25000000,currency:'BERRY',fictional:true,valueLabel:'Nilai koleksi fiktif',customerOffer:{label:'GRATIS',amount:0,currency:'BERRY',description:'0 BERRY untuk pelanggan Bpedia'},video:null});
 const ticket=(n,host,id,status,extra={})=>({id:`HP-LEGACY${n}`,requestId:`legacy-request-${n}`,at:'2026-10-03T03:0'+n+':00.000Z',username:`Tamu ${n}`,game:'heart',demo:false,host:{id:host,name:host==='zoro'?'Zoro':'Sanji',image:`/assets/characters/${host}.webp`,mascot:'/assets/brand/bipy-jade.webp'},service:service(id),method:'gacha',comfort:'touch',recording:false,consent:true,queueNumber:n,status,estimatedSeconds:0,duration:4200,...extra});
 s.history=[ticket(1,'zoro','hug','served',{card:oldCard('zoro','hug'),resolvedAt:'2026-10-03T03:10:00.000Z'}),ticket(2,'sanji','vow','waiting',{card:oldCard('sanji','vow')}),ticket(3,'zoro','pat','waiting')];
 s.audit=[{at:'2026-10-03T03:01:00.000Z',type:'draw',id:'HP-LEGACY1'}];
 s.dailyCounters={'2026-10-03':3};
 return s;
}

test('seven requested services and fourteen distinct host combinations',()=>{const e=engine();assert.equal(e.state.services.length,7);assert.deepEqual(e.state.services.map(s=>s.name),["Cinderella's Fit",'Princess Twirl','Blossom Whisper','Sweet Offering',"Knight's Vow",'Warm Hug','Pat on Head']);assert.equal(new Set(e.state.hosts.flatMap(h=>e.state.services.map(s=>h.id+':'+s.id))).size,14);});

test('fourteen frozen OPCG-style cards: distinct artwork, BP06 numbers in host-major order, rarity and default FS prices',()=>{
 assert.equal(CARDS.length,14);assert.equal(new Set(CARDS.map(c=>c.id)).size,14);
 assert.equal(new Set(CARDS.map(c=>c.image)).size,14);assert.equal(new Set(CARDS.map(c=>c.romanticLine)).size,14);
 assert.equal(new Set(CARDS.map(c=>c.mascot)).size,7);assert.equal(new Set(CARDS.map(c=>c.animationMotif)).size,7);
 assert.deepEqual(CARDS.map(c=>c.cardNo),Array.from({length:14},(_,i)=>`BP06-${String(i+1).padStart(3,'0')}`));
 assert.equal(Object.isFrozen(CARDS),true);assert.throws(()=>CARDS.push({}),TypeError);
 assert.deepEqual(Object.fromEntries(SERVICES.map(s=>[s.id,s.price])),DEFAULT_PRICES);assert.equal(PRICE_LIMIT,10000000);
 const hashes=new Set();
 for(const [hostIndex,host] of HOSTS.entries())for(const [serviceIndex,service] of SERVICES.entries()){
  const card=cardFor(host.id,service.id);
  assert.equal(card.id,`${host.id}-${service.id}`);
  assert.equal(card.cardNo,`BP06-${String(hostIndex*SERVICES.length+serviceIndex+1).padStart(3,'0')}`);
  assert.ok(['R','SR','SEC'].includes(card.rarity),card.id);
  for(const key of ['cost','power','counter'])assert.ok(Number.isInteger(card[key])&&card[key]>=0,`${card.id}.${key}`);
  assert.equal(card.attribute,host.id==='zoro'?'Slash':'Strike');assert.equal(card.cardColor,host.id==='zoro'?'green':'gold');
  assert.equal(card.bountyName,host.fullName);assert.equal(card.crew,host.crew);assert.equal(typeof card.effect,'string');assert.ok(card.effect.length>20);
  assert.equal(card.price,DEFAULT_PRICES[service.id]);assert.equal(card.currency,'IDR');assert.equal(card.priceLabel,'Harga normal fanservice');
  assert.deepEqual(card.customerOffer,{label:'GRATIS',amount:0,description:'untuk pelanggan Bpedia'});
  for(const legacy of ['listValue','fictional','valueLabel'])assert.equal(legacy in card,false,`${card.id} masih membawa ${legacy}`);
  assert.equal(Object.isFrozen(card),true);assert.equal(Object.isFrozen(card.customerOffer),true);
  assert.throws(()=>{card.customerOffer.amount=100;},TypeError);assert.throws(()=>{card.price=1;},TypeError);
  const art=fs.readFileSync(path.join(ROOT,card.image));hashes.add(createHash('sha256').update(art).digest('hex'));
  assert.equal(art.subarray(8,12).toString(),'WEBP',card.image);
  assert.equal(fs.existsSync(path.join(ROOT,card.mascot)),true,card.mascot);
 }
 assert.equal(hashes.size,14);assert.equal(cardFor('unknown','pat'),null);
 assert.equal(defaultState().settings.schedule,SCHEDULE);assert.match(SCHEDULE,/3–4 Okt 2026/);
});

test('all fourteen cards are reachable by gacha and direct pick using the same stable IDs',()=>{
 for(const host of HOSTS)for(const [index,service] of SERVICES.entries()){
  const random=engine({rng:()=>index/SERVICES.length}),picked=engine();
  const a=random.play(`request-random-${host.id}-${index}`,{...options,host:host.id});
  const b=picked.play(`request-direct-${host.id}-${index}`,{...options,host:host.id,pick:service.id});
  assert.equal(a.method,'gacha');assert.equal(b.method,'pick');
  assert.deepEqual(a.card,cardFor(host.id,service.id));assert.deepEqual(a.card,b.card);
 }
});

test('view() cards carry the current staff price while the frozen catalog keeps the default',()=>{
 const e=engine();e.updateService('vow',{price:90000});
 for(const view of [e.view(),e.view(true)]){
  for(const card of view.cards)assert.equal(card.price,card.serviceId==='vow'?90000:DEFAULT_PRICES[card.serviceId],card.id);
  assert.equal(view.services.find(s=>s.id==='vow').price,90000);
 }
 assert.equal(cardFor('zoro','vow').price,75000);assert.equal(SERVICES.find(s=>s.id==='vow').price,75000);
 const v=e.view();v.cards[0].price=1;v.cards[0].customerOffer.amount=5;
 assert.equal(e.view().cards[0].price,DEFAULT_PRICES.cinderella);assert.equal(e.view().cards[0].customerOffer.amount,0);
});

test('play() snapshots the price; later edits never rewrite pending, history or retries',()=>{
 const e=engine();e.updateSettings({mode:'live'});
 const first=e.play('request-snapshot-1',{...options,pick:'vow'});
 assert.equal(first.card.price,75000);assert.equal(first.card.cardNo,'BP06-005');
 e.updateService('vow',{price:120000});
 assert.equal(e.view().pending.card.price,75000);
 e.acknowledge(first.id);
 assert.equal(e.view(true).history.find(r=>r.id===first.id).card.price,75000);
 assert.equal(e.play('request-snapshot-1',options).card.price,75000);
 const second=e.play('request-snapshot-2',{...options,host:'sanji',pick:'vow'});
 assert.equal(second.card.price,120000);assert.equal(second.card.cardNo,'BP06-012');
 e.updateService('vow',{price:0});
 assert.equal(e.view().pending.card.price,120000);
 assert.equal(e.view(true).history.find(r=>r.id===first.id).card.price,75000);
});

test('hydrateResult falls back from card snapshot to service snapshot to catalog default',()=>{
 const e=engine();e.updateService('hug',{price:88000});
 const r=e.play('request-hydrate',{...options,pick:'hug'});
 const noCard=structuredClone(r);delete noCard.card;
 assert.equal(hydrateResult(noCard).card.price,88000);
 const bad=structuredClone(r);bad.card.price=-5;assert.equal(hydrateResult(bad).card.price,88000);
 const bare=structuredClone(noCard);delete bare.service.price;assert.equal(hydrateResult(bare).card.price,55000);
 const tampered=structuredClone(r);tampered.card={...tampered.card,image:'/x',cardNo:'FAKE',price:1.5};
 const hydrated=hydrateResult(tampered);assert.equal(hydrated.card.image,cardFor('zoro','hug').image);assert.equal(hydrated.card.cardNo,'BP06-006');assert.equal(hydrated.card.price,88000);
 assert.equal(hydrateResult(null),null);
});

test('updateService accepts legacy booleans and patches, rejects bad prices and unknown keys without committing',()=>{
 const e=engine();
 e.updateService('whisper',false);assert.equal(e.state.services.find(s=>s.id==='whisper').enabled,false);
 e.updateService('whisper',true);assert.equal(e.state.services.find(s=>s.id==='whisper').enabled,true);
 e.updateService('whisper',{enabled:false});assert.equal(e.state.services.find(s=>s.id==='whisper').enabled,false);
 e.updateService('whisper',{enabled:true,price:47500});assert.deepEqual((({enabled,price})=>({enabled,price}))(e.state.services.find(s=>s.id==='whisper')),{enabled:true,price:47500});
 e.updateService('pat',{price:0});e.updateService('twirl',{price:PRICE_LIMIT});
 assert.equal(e.state.services.find(s=>s.id==='pat').price,0);assert.equal(e.state.services.find(s=>s.id==='twirl').price,PRICE_LIMIT);
 const revision=e.state.revision,before=structuredClone(e.state);
 for(const patch of [{price:-1},{price:1.5},{price:PRICE_LIMIT+1},{price:'65000'},{price:Number.NaN},{price:null},{price:Infinity},{enabled:'yes'},{},{color:'red'},{price:1000,label:'x'},null,'true',[],1])
  assert.throws(()=>e.updateService('vow',patch),/tidak valid|Harga fanservice/,JSON.stringify(patch));
 assert.throws(()=>e.updateService('unknown',{price:1000}),err=>err.status===404);
 assert.equal(e.state.revision,revision);assert.deepEqual(e.state,before);
 assert.equal(e.state.audit.filter(a=>a.type==='service').at(-1).price,PRICE_LIMIT);
});

test('migrateState upgrades a 1.5.x event without touching history, queue, quotas or revision, and is idempotent',()=>{
 const legacy=legacyState(),original=structuredClone(legacy);
 assert.throws(()=>validateState(legacy),/Menu fanservice/);
 const migrated=migrateState(legacy);
 assert.deepEqual(legacy,original,'input tidak boleh dimutasi');
 assert.doesNotThrow(()=>validateState(migrated));
 assert.deepEqual(Object.fromEntries(migrated.services.map(s=>[s.id,s.price])),DEFAULT_PRICES);
 assert.deepEqual(migrated.services.map(s=>s.enabled),legacy.services.map(s=>s.enabled));
 for(const host of migrated.hosts){
  const base=HOSTS.find(h=>h.id===host.id),old=legacy.hosts.find(h=>h.id===host.id);
  for(const key of ['fullName','attribute','cardColor','crew','leaderLife','leaderPower'])assert.deepEqual(host[key],base[key],`${host.id}.${key}`);
  assert.equal(host.enabled,old.enabled);assert.equal(host.quota,old.quota);
 }
 assert.equal(migrated.settings.schedule,SCHEDULE);
 assert.deepEqual({...migrated.settings,schedule:null},{...legacy.settings,schedule:null});
 for(const key of ['history','pending','audit','dailyCounters','revision','schema','campaignId'])assert.deepEqual(migrated[key],legacy[key],key);
 assert.deepEqual(migrateState(migrated),migrated);
 assert.deepEqual(migrateState(migrateState(legacy)),migrated);
 const custom=legacyState();custom.settings.schedule='Sesi 13.00–15.00 WIB';custom.services[0].price=12345;custom.services[1].price=-1;custom.services[2].price=1.5;
 const kept=migrateState(custom);
 assert.equal(kept.settings.schedule,'Sesi 13.00–15.00 WIB');assert.equal(kept.services[0].price,12345);
 assert.equal(kept.services[1].price,DEFAULT_PRICES.twirl);assert.equal(kept.services[2].price,DEFAULT_PRICES.whisper);
 for(const raw of [null,undefined,'x',[],42])assert.equal(migrateState(raw),raw);
});

test('Store loads a legacy event.json through migration and keeps queue, numbering and history intact',t=>{
 const dir=tempDir(t,'heart-legacy-'),legacy=legacyState();
 fs.writeFileSync(path.join(dir,'event.json'),JSON.stringify(legacy,null,2));
 const e=new Engine(new Store(dir),{now:()=>NOW});
 assert.equal(e.state.revision,17);assert.deepEqual(e.state.history,legacy.history);
 assert.equal(e.state.settings.schedule,SCHEDULE);assert.equal(e.state.hosts.find(h=>h.id==='zoro').quota,42);
 assert.equal(e.waiting().length,2);assert.equal(e.used('zoro'),2);
 const admin=e.view(true);
 assert.deepEqual(admin.history.map(r=>r.card.cardNo),['BP06-006','BP06-012','BP06-007']);
 assert.deepEqual(admin.history.map(r=>r.card.price),[55000,75000,35000]);
 for(const r of admin.history)assert.equal('listValue' in r.card,false);
 assert.equal(e.play('legacy-request-2',options).id,'HP-LEGACY2');
 const next=e.play('request-after-migration',{...options,pick:'vow'});
 assert.equal(next.queueNumber,4);assert.equal(next.card.price,75000);assert.equal(e.state.revision,18);
 assert.equal(new Store(dir).state.history.length,4);
});

test('legacy pending and history hydrate without changing tickets, ownership, queue or persisted state',()=>{
 const original=engine();original.updateSettings({mode:'live'});
 const first=original.play('request-legacy-old',{...options,pick:'hug'});original.acknowledge(first.id);
 const second=original.play('request-legacy-pending',{...options,host:'sanji',pick:'vow'});
 const state=structuredClone(original.state);state.history.forEach(r=>delete r.card);delete state.pending.card;
 const before=structuredClone(state),restored=new Engine(memoryStore(state),{now:()=>NOW});
 assert.deepEqual(restored.state,before);assert.equal(restored.view().pending.card.id,'sanji-vow');
 assert.equal(restored.view(true).history[0].card.id,'zoro-hug');assert.equal(restored.view(true).history[1].queueNumber,second.queueNumber);
 assert.equal(restored.waiting().length,2);assert.equal(restored.used('zoro'),original.used('zoro'));
 assert.deepEqual(restored.play('request-legacy-old',options),{...before.history[0],card:structuredClone(cardFor('zoro','hug'))});
 assert.equal(restored.play('request-legacy-pending',options).id,second.id);
 assert.equal(restored.state.revision,before.revision);assert.deepEqual(restored.state,before);
 const publicView=restored.view();publicView.cards[0].image='/tampered';publicView.pending.card.customerOffer.amount=999;
 assert.equal(restored.view().cards[0].image,CARDS[0].image);assert.equal(restored.view().pending.card.customerOffer.amount,0);
 restored.state.pending.card={id:'tampered',image:'/tampered'};
 assert.deepEqual(restored.view().pending.card,cardFor('sanji','vow'));
});

test('draw is server selected and retry idempotent before and after acknowledgement',()=>{const e=engine(),r=e.play('request-001',options);assert.equal(r.service.id,'whisper');assert.equal(r.demo,true);assert.deepEqual(e.play('request-001',options),r);assert.throws(()=>e.play('request-002',options),/sebelumnya/);e.acknowledge(r.id);assert.deepEqual(e.play('request-001',options),r);assert.equal(e.state.history.length,1);});
test('consent and comfort validated before any draw',()=>{for(const patch of [{consent:false},{comfort:'unknown'},{recording:undefined},{host:'unknown'}]){const e=engine();assert.throws(()=>e.play('request-consent',{...options,...patch}));assert.equal(e.state.history.length,0);}});
test('each active menu reachable; disabled services and hosts cannot be drawn',()=>{for(let i=0;i<7;i++){const e=engine({rng:()=>i/7});assert.equal(e.play('request-'+i,options).service.id,SERVICES[i].id);}const e=engine();e.updateService('whisper',false);assert.notEqual(e.play('request-disabled',options).service.id,'whisper');e.acknowledge(e.state.pending.id);e.updateHost('zoro',{enabled:false});assert.throws(()=>e.play('request-host',options),/tersedia/);});
test('direct selection obeys allowPick and active services',()=>{const e=engine();assert.equal(e.play('request-pick',{...options,pick:'vow'}).method,'pick');e.acknowledge(e.state.pending.id);e.updateSettings({allowPick:false});assert.throws(()=>e.play('request-pick2',{...options,pick:'vow'}),/belum dibuka/);const f=engine();f.updateService('vow',{enabled:false});assert.throws(()=>f.play('request-pick3',{...options,pick:'vow'}),/tidak tersedia/);});
test('pause, closed session and no active services reject new draws',()=>{for(const patch of [{paused:true},{sessionOpen:false}]){const e=engine();e.updateSettings(patch);assert.throws(()=>e.play('request-paused',options),/istirahat/);}const e=engine();e.state.services.forEach(s=>s.enabled=false);assert.throws(()=>e.play('request-empty',options),/menu aktif/);});
test('live requires verified mission, respects queue and daily quota, ack does not serve',()=>{const e=engine();e.updateSettings({mode:'live',queueLimit:1});assert.throws(()=>e.play('request-unverified',{...options,verified:false}),/memeriksa/);const r=e.play('request-live',options);assert.match(r.id,/^HP-/);assert.equal(r.queueNumber,1);e.acknowledge(r.id);assert.equal(e.waiting().length,1);assert.throws(()=>e.play('request-full',options),/Antrean penuh/);e.resolve(r.id,'served');assert.equal(e.waiting().length,0);e.updateHost('zoro',{quota:1});assert.throws(()=>e.play('request-quota',options),/Kuota/);});
test('queue counts are tracked per host',()=>{const e=engine();e.updateSettings({mode:'live'});const a=e.play('request-q-a',options);e.acknowledge(a.id);const b=e.play('request-q-b',{...options,host:'sanji'});e.acknowledge(b.id);const c=e.play('request-q-c',{...options,host:'sanji'});assert.deepEqual(e.view().queue,{waiting:3,byHost:{zoro:1,sanji:2}});assert.ok(c.estimatedSeconds>0);assert.equal(e.waiting('sanji').length,2);});
test('no-touch substitution preserves the ticket and cannot revive completed tickets',()=>{const e=engine();e.updateSettings({mode:'live'});const r=e.play('request-touch',{...options,comfort:'touch'});e.resolve(r.id,'no-touch');assert.equal(e.state.pending.comfort,'no-touch');e.resolve(r.id,'served');assert.equal(e.state.pending.status,'served');e.resolve(r.id,'served');assert.throws(()=>e.resolve(r.id,'cancelled'),/sudah ditutup/);});
test('cancelled ticket releases quota but never reuses its queue number',()=>{const e=engine();e.updateSettings({mode:'live'});e.updateHost('zoro',{quota:1});const a=e.play('request-cancel',options);e.acknowledge(a.id);e.resolve(a.id,'cancelled');const b=e.play('request-next',options);assert.equal(b.queueNumber,2);});
test('demo practice preserves official records and public view hides history',()=>{const e=engine();e.updateSettings({mode:'live'});const a=e.play('request-real',options);e.acknowledge(a.id);e.updateSettings({mode:'demo'});e.play('request-demo',options);assert.equal(e.state.history.find(r=>r.id===a.id).status,'waiting');assert.equal(e.view().history,undefined);assert.equal(e.view().audit,undefined);assert.equal(e.waiting().length,1);});
test('daily host quota resets at midnight WIB while outstanding queue is preserved',()=>{let time=Date.parse('2026-10-03T16:59:00Z');const e=engine({now:()=>time});e.updateSettings({mode:'live'});e.updateHost('zoro',{quota:1});const a=e.play('request-before',options);e.acknowledge(a.id);time+=120000;assert.equal(e.used('zoro'),0);assert.equal(e.waiting().length,1);assert.equal(e.play('request-after',options).queueNumber,1);});
test('invalid settings, quota and RNG fail without committing',()=>{const e=engine();assert.throws(()=>e.updateSettings({queueLimit:0}));assert.throws(()=>e.updateSettings({anything:true}));assert.throws(()=>e.updateSettings({schedule:'x'.repeat(181)}));assert.throws(()=>e.updateHost('zoro',{quota:1.5}));assert.throws(()=>engine({rng:()=>1}).play('request-rng',options));assert.equal(e.state.revision,0);assert.throws(()=>validateState({...defaultState(),hosts:[]}));});
test('atomic store persists pending ticket and backup, corrupt data never silently resets',t=>{const dir=tempDir(t,'heart-store-');const e=new Engine(new Store(dir));const r=e.play('request-persist',options);assert.equal(new Store(dir).state.pending.id,r.id);assert.ok(fs.existsSync(path.join(dir,'event.json.bak')));fs.writeFileSync(path.join(dir,'event.json'),'{bad');assert.throws(()=>new Store(dir),/tidak direset/);});
test('staff price edits persist through the store',t=>{const dir=tempDir(t,'heart-price-');const e=new Engine(new Store(dir));e.updateService('cinderella',{price:70000});e.updateService('pat',false);const reloaded=new Store(dir).state.services;assert.equal(reloaded.find(s=>s.id==='cinderella').price,70000);assert.equal(reloaded.find(s=>s.id==='pat').enabled,false);});

test('CSV adds card number and snapshot FS price, excludes demos and neutralizes spreadsheet formulas',()=>{
 const e=engine();e.updateSettings({mode:'live'});
 const a=e.play('request-report',{...options,username:'=1+1',pick:'cinderella'});e.acknowledge(a.id);
 e.updateService('cinderella',{price:99000});
 const b=e.play('request-report-2',{...options,host:'sanji',username:'@SUM(A1)',pick:'cinderella'});e.acknowledge(b.id);
 const c=e.play('request-report-3',{...options,username:'-2+3',pick:'pat'});e.acknowledge(c.id);
 const d=e.play('request-report-4',{...options,username:'+cmd',pick:'twirl'});
 const csv=historyCsv(e.state.history),lines=csv.replace(/^\uFEFF/,'').split('\r\n');
 assert.ok(csv.startsWith('\uFEFF'));
 assert.deepEqual(HEADER,['Kode','Waktu','Antrean','Nama','Cosplayer','Menu','No. kartu','Harga normal FS (Rp)','Metode','Kenyamanan','Izin dokumentasi','Status']);
 assert.equal(lines[0],HEADER.map(h=>`"${h}"`).join(','));
 assert.equal(lines.length,5);
 assert.match(lines[1],/^"HP-[^"]+",".+","1","'=1\+1","Zoro","Cinderella's Fit","BP06-001","65000","pick"/);
 assert.match(lines[2],/"'@SUM\(A1\)","Sanji","Cinderella's Fit","BP06-008","99000"/);
 assert.match(lines[3],/"'-2\+3","Zoro","Pat on Head","BP06-007","35000"/);
 assert.match(lines[4],new RegExp(`^"${d.id}".*"'\\+cmd".*"BP06-002","50000"`));
 assert.doesNotMatch(historyCsv(engine().state.history),/DEMO-/);
 const demo=engine();demo.play('request-demo-csv',options);assert.equal(historyCsv(demo.state.history).split('\r\n').length,1);
 const legacyCsv=historyCsv(legacyState().history).split('\r\n');
 assert.match(legacyCsv[1],/"BP06-006","55000"/);assert.match(legacyCsv[3],/"BP06-007","35000"/);
});
