'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const ROOT=path.join(__dirname,'..','games','heart');
const {createApp,TYPES}=require(path.join(ROOT,'server.cjs'));
const {CARDS,SCHEDULE}=require(path.join(ROOT,'core/catalog.cjs'));
async function setup(t,opts={}){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'heart-server-'));const app=await createApp({dataDir:dir,...opts});t.after(async()=>{await app.close();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});});return app;}
async function call(app,route,body,cookie='',extra={}){const res=await fetch(app.origin+route,{method:body===undefined?'GET':'POST',headers:{origin:app.origin,'content-type':'application/json','x-bpedia-client':'heartparade',cookie,...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await res.text();let json;try{json=JSON.parse(text);}catch{}return {status:res.status,json,text,cookie:res.headers.get('set-cookie'),headers:res.headers};}
async function staff(t,opts={}){const app=await setup(t,{hosted:true,adminPin:'246810',...opts});const login=await call(app,'/api/login',{pin:'246810'});assert.equal(login.status,200);return {app,cookie:login.cookie.split(';')[0]};}
const draw={requestId:'server-draw-001',host:'sanji',comfort:'no-touch',recording:false,consent:true,purchaseAmount:150000};

test('direct player draw keeps consent false and rejects touch or recording without consent',async t=>{
 const app=await setup(t),request={...draw,consent:false};
 for(const patch of [{comfort:'touch'},{recording:true}])assert.equal((await call(app,'/api/play',{...request,...patch})).status,400);
 const result=await call(app,'/api/play',request);assert.equal(result.status,200);assert.equal(result.json.consent,false);
 assert.equal((await call(app,'/api/state')).json.pending.consent,false);
 assert.equal((await call(app,'/api/play',request)).json.id,result.json.id);
});
test('player mode switching requires a staff session and cannot discard an open card',async t=>{
 const {app,cookie}=await staff(t);
 assert.equal((await call(app,'/api/mode',{mode:'live'})).status,401);
 const live=await call(app,'/api/mode',{mode:'live'},cookie);assert.equal(live.status,200);assert.equal(live.json.settings.mode,'live');
 const result=await call(app,'/api/play',{...draw,consent:false,verified:true},cookie);assert.equal(result.status,200);assert.equal(result.json.demo,false);assert.equal(result.json.consent,false);
 assert.equal((await call(app,'/api/mode',{mode:'demo'},cookie)).status,409);
 assert.equal((await call(app,'/api/result',{id:result.json.id},cookie)).status,200);
 const demo=await call(app,'/api/mode',{mode:'demo'},cookie);assert.equal(demo.status,200);assert.equal(demo.json.settings.mode,'demo');
 assert.equal(app.engine.state.history.find(r=>r.id===result.json.id).status,'waiting');
});

test('public player flow, exact retry and pending recovery',async t=>{const app=await setup(t),p=await call(app,'/api/play',draw);assert.equal(p.status,200);assert.equal(p.json.demo,true);assert.equal((await call(app,'/api/state')).json.pending.id,p.json.id);assert.equal((await call(app,'/api/play',draw)).json.id,p.json.id);assert.equal((await call(app,'/api/result',{id:p.json.id})).status,200);});
test('official API requires staff purchase confirmation at each method threshold',async t=>{
 const {app,cookie}=await staff(t);await call(app,'/api/mode',{mode:'live'},cookie);
 const state=(await call(app,'/api/state',undefined,cookie)).json;
 assert.deepEqual(state.purchaseThresholds,{gacha:100000,pick:150000});
 assert.equal((await call(app,'/api/play',{...draw,verified:true,purchaseAmount:undefined},cookie)).status,400);
 assert.equal((await call(app,'/api/play',{...draw,verified:false},cookie)).status,409);
 for(const [method,pick,minimum] of [['gacha',undefined,100000],['pick','vow',150000]]){
  const request={...draw,requestId:`server-purchase-${method}`,pick,verified:true,purchaseAmount:minimum};
  assert.equal((await call(app,'/api/play',{...request,purchaseAmount:minimum-1},cookie)).status,409);
  const r=await call(app,'/api/play',request,cookie);assert.equal(r.status,200);assert.equal(r.json.demo,false);
  assert.equal(r.json.purchaseAmount,minimum);assert.equal(r.json.purchaseMinimum,minimum);assert.equal(r.json.verified,true);
  assert.equal((await call(app,'/api/play',{...request,purchaseAmount:0,verified:false},cookie)).json.id,r.json.id);
  await call(app,'/api/result',{id:r.json.id},cookie);
 }
 assert.equal(app.engine.state.history.length,2);assert.equal(app.engine.state.dailyCounters[Object.keys(app.engine.state.dailyCounters)[0]],2);
});
test('public catalog and recovered pending expose canonical card metadata',async t=>{
 const app=await setup(t),state=await call(app,'/api/state');assert.deepEqual(state.json.cards,CARDS);
 assert.equal(state.json.settings.schedule,SCHEDULE);
 const result=await call(app,'/api/play',{...draw,pick:'cinderella'});
 assert.equal(result.json.card.id,'sanji-cinderella');assert.equal(result.json.card.cardNo,'BP06-008');
 assert.deepEqual(result.json.card.customerOffer,{label:'GRATIS',amount:0,description:'untuk pelanggan Bpedia'});assert.equal(result.json.card.price,65000);
 delete app.engine.state.pending.card;delete app.engine.state.history[0].card;
 assert.equal((await call(app,'/api/state')).json.pending.card.image,'/assets/moments/sanji-cinderella.webp');
 assert.deepEqual((await call(app,'/api/play',{...draw,pick:'cinderella'})).json.card,result.json.card);
});
test('admin service route accepts {id,patch} and legacy {id,enabled}; prices reach the public catalog',async t=>{
 const {app,cookie}=await staff(t);
 assert.equal((await call(app,'/api/admin/service',{id:'vow',patch:{price:90000}})).status,401);
 const priced=await call(app,'/api/admin/service',{id:'vow',patch:{price:90000}},cookie);
 assert.equal(priced.status,200);assert.equal(priced.json.services.find(s=>s.id==='vow').price,90000);
 assert.deepEqual(priced.json.cards.filter(c=>c.serviceId==='vow').map(c=>[c.cardNo,c.price]),[['BP06-005',90000],['BP06-012',90000]]);
 assert.ok(Array.isArray(priced.json.history));
 const legacy=await call(app,'/api/admin/service',{id:'vow',enabled:false},cookie);
 assert.equal(legacy.status,200);assert.deepEqual((({enabled,price})=>({enabled,price}))(legacy.json.services.find(s=>s.id==='vow')),{enabled:false,price:90000});
 const both=await call(app,'/api/admin/service',{id:'vow',patch:{enabled:true,price:0}},cookie);
 assert.equal(both.status,200);assert.equal(both.json.services.find(s=>s.id==='vow').enabled,true);
 const revision=both.json.revision;
 for(const patch of [{price:-1},{price:1.5},{price:10000001},{price:'90000'},{color:'red'},{}])assert.equal((await call(app,'/api/admin/service',{id:'vow',patch},cookie)).status,400,JSON.stringify(patch));
 assert.equal((await call(app,'/api/admin/service',{id:'vow'},cookie)).status,400);
 assert.equal((await call(app,'/api/admin/service',{id:'unknown',patch:{price:1000}},cookie)).status,404);
 assert.equal((await call(app,'/api/admin/state',undefined,cookie)).json.revision,revision);
 const publicState=await call(app,'/api/state');assert.equal(publicState.status,200);
 assert.equal(publicState.json.cards.find(c=>c.id==='zoro-vow').price,0);
 assert.equal(publicState.json.history,undefined);
});
test('price snapshot survives later edits through the API and lands in the CSV export',async t=>{
 const {app,cookie}=await staff(t);
 assert.equal((await call(app,'/api/admin/settings',{mode:'live'},cookie)).status,200);
 const r=await call(app,'/api/play',{...draw,pick:'hug',verified:true,username:'=HYPERLINK("x")'},cookie);
 assert.equal(r.status,200);assert.equal(r.json.card.price,55000);assert.equal(r.json.card.cardNo,'BP06-013');
 assert.equal((await call(app,'/api/admin/service',{id:'hug',patch:{price:61000}},cookie)).status,200);
 assert.equal((await call(app,'/api/state',undefined,cookie)).json.pending.card.price,55000);
 assert.equal((await call(app,'/api/result',{id:r.json.id},cookie)).status,200);
 const admin=await call(app,'/api/admin/state',undefined,cookie);
 assert.equal(admin.json.history.find(x=>x.id===r.json.id).card.price,55000);assert.equal(admin.json.queue.byHost.sanji,1);
 const csv=await call(app,'/api/admin/export',undefined,cookie);
 assert.equal(csv.status,200);assert.match(csv.headers.get('content-type'),/text\/csv/);
 assert.match(csv.text,/"No\. kartu","Harga normal FS \(Rp\)"/);
 assert.match(csv.text,/"'=HYPERLINK\(""x""\)","Sanji","Warm Hug","BP06-013","55000"/);
});
test('moment and Bipy images serve WebP MIME and media map includes MP3, MP4 and WebM',async t=>{
 const app=await setup(t);assert.equal(TYPES['.mp4'],'video/mp4');assert.equal(TYPES['.webm'],'video/webm');assert.equal(TYPES['.mp3'],'audio/mpeg');
 for(const route of new Set(CARDS.flatMap(card=>[card.image,card.mascot]))){
  const response=await fetch(app.origin+route);assert.equal(response.status,200,route);
  assert.equal(response.headers.get('content-type'),'image/webp',route);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 }
 for(const route of ['/assets/audio/bpedia-jingle.mp3','/assets/audio/bpedia-jingle-hook.mp3']){const response=await fetch(app.origin+route);assert.equal(response.status,200,route);assert.equal(response.headers.get('content-type'),'audio/mpeg');await response.arrayBuffer();}
 for(const [route,type] of [['/assets/video/heart-parade-promo.mp4','video/mp4'],['/assets/audio/heart-parade-bgm.mp3','audio/mpeg']]){
  const response=await fetch(app.origin+route,{headers:{Range:'bytes=0-1023'}});assert.equal(response.status,206,route);assert.equal(response.headers.get('content-type'),type);assert.equal(response.headers.get('accept-ranges'),'bytes');assert.match(response.headers.get('content-range'),/^bytes 0-1023\/\d+$/);assert.equal((await response.arrayBuffer()).byteLength,1024);
 }
});
test('hosting without PIN has no default credentials and cannot issue live tickets',async t=>{const app=await setup(t,{hosted:true});assert.equal((await call(app,'/api/login',{pin:'123456'})).status,503);assert.equal((await call(app,'/api/mode',{mode:'live'})).status,401);assert.equal((await call(app,'/api/admin/state')).status,401);assert.equal((await call(app,'/api/admin/service',{id:'vow',patch:{price:1}})).status,401);});
test('staff login, mode, real ticket, serve and export',async t=>{const app=await setup(t,{hosted:true,adminPin:'246810'});const login=await call(app,'/api/login',{pin:'246810'});assert.equal(login.status,200);assert.match(login.cookie,/HttpOnly; SameSite=Strict/);const cookie=login.cookie.split(';')[0];assert.equal((await call(app,'/api/admin/settings',{mode:'live'},cookie)).status,200);assert.equal((await call(app,'/api/play',{...draw,verified:true})).status,401);assert.equal((await call(app,'/api/state')).status,401);const r=await call(app,'/api/play',{...draw,verified:true},cookie);assert.equal(r.json.demo,false);assert.equal((await call(app,'/api/admin/ticket',{id:r.json.id,action:'served'},cookie)).json.stats.served,1);assert.match((await call(app,'/api/admin/export',undefined,cookie)).text,/HP-/);const backup=await call(app,'/api/admin/backup',undefined,cookie);assert.equal(backup.json.services.find(s=>s.id==='vow').price,75000);assert.equal((await call(app,'/api/logout',{},cookie)).status,200);assert.equal((await call(app,'/api/admin/state',undefined,cookie)).status,401);});
test('online cloud visitors get a private demo engine while staff keep the booth engine',async t=>{
 const engines=new Map();
 const cloud={sessionTtlMs:60000,engineFor(req,booth){const id=String(req.headers['x-visitor']||'anon');if(!engines.has(id)){const {Engine}=require(path.join(ROOT,'core/engine.cjs')),{defaultState}=require(path.join(ROOT,'core/catalog.cjs'));engines.set(id,new Engine({state:defaultState(),commit(next){this.state=structuredClone(next);}}));}assert.notEqual(engines.get(id),booth);return engines.get(id);}};
 const app=await setup(t,{hosted:true,adminPin:'246810',cloud});
 const cookie=(await call(app,'/api/login',{pin:'246810'})).cookie.split(';')[0];
 assert.equal((await call(app,'/api/admin/settings',{mode:'live'},cookie)).status,200);
 const visitor=await call(app,'/api/play',{...draw,verified:true,purchaseAmount:0},'',{'x-visitor':'a'});
 assert.equal(visitor.status,200);assert.equal(visitor.json.demo,true);assert.match(visitor.json.id,/^DEMO-/);
 assert.equal('purchaseAmount' in visitor.json,false);assert.equal('verified' in visitor.json,false);
 assert.equal((await call(app,'/api/state',undefined,'',{'x-visitor':'b'})).json.pending,null);
 const booth=await call(app,'/api/play',{...draw,requestId:'server-booth-001',verified:true},cookie);
 assert.equal(booth.json.demo,false);assert.equal(app.engine.state.history.filter(r=>r.demo).length,0);
});
test('cross-origin mutation, source files and API method abuse are rejected',async t=>{const app=await setup(t);assert.equal((await call(app,'/api/play',draw,'',{origin:'https://evil.example'})).status,403);for(const route of ['/server.cjs','/core/store.cjs','/core/catalog.cjs','/tests/server.test.cjs','/.local-data/event.json','/docs/PRD-Bipy-Heart-Parade.md'])assert.equal((await call(app,route)).status,404,route);assert.equal((await call(app,'/api/play')).status,405);assert.equal((await call(app,'/api/state',[])).status,400);});
test('five invalid PINs lock authentication for sixty seconds',async t=>{let now=100000;const app=await setup(t,{now:()=>now,hosted:true,adminPin:'246810'});for(let i=0;i<5;i++)await call(app,'/api/login',{pin:'000000'});assert.equal((await call(app,'/api/login',{pin:'246810'})).status,429);now+=61000;assert.equal((await call(app,'/api/login',{pin:'246810'})).status,200);});
test('all local HTML and CSS asset references load and pages have strict CSP',async t=>{
 const app=await setup(t);
 for(const route of ['/','/admin.html']){
  const page=await call(app,route);assert.equal(page.status,200);
  assert.match(page.headers.get('content-security-policy'),/script-src 'self'/);
  assert.doesNotMatch(page.text,/<script(?![^>]*src=)[^>]*>/);assert.doesNotMatch(page.text,/\son[a-z]+\s*=/i);
  for(const match of page.text.matchAll(/(?:src|href)="(\/(?:assets|css|js)\/[^"?#]+)"/g)){
   assert.equal((await call(app,match[1])).status,200,match[1]);
   if(match[1].endsWith('.css'))for(const url of (await call(app,match[1])).text.matchAll(/url\('?(\/[^')]+)'?\)/g))assert.equal((await call(app,url[1])).status,200,url[1]);
  }
 }
});
test('staff dashboard is wired to the current contract without inline code',()=>{
 const html=fs.readFileSync(path.join(ROOT,'admin.html'),'utf8'),js=fs.readFileSync(path.join(ROOT,'js/admin.js'),'utf8'),css=fs.readFileSync(path.join(ROOT,'css/admin.css'),'utf8');
 assert.ok(js.includes(`'${SCHEDULE}'`),'teks jadwal Market-In di dashboard harus sama dengan SCHEDULE katalog');
 assert.match(js,/'\/api\/admin\/service',\{id,patch:\{price:value\}\}/);assert.match(js,/'\/api\/admin\/service',\{id:s\.id,patch:\{enabled:!s\.enabled\}\}/);
 assert.doesNotMatch(js,/\beval\s*\(|new Function|innerHTML\s*=\s*[^`'"]*\+\s*state/);
 for(const id of ['loginForm','pin','logout','mode','schedule','fillSchedule','queueLimit','duration','sessionOpen','paused','allowPick','hostControls','serviceControls','queueList','historyList','hostFilter','hostQueues','refreshQueue','stats','statusLine','themeToggle','adminError','adminNotice','purchaseSection','purchaseRules','purchaseSummaryNote','purchaseByHost','purchaseByService'])assert.match(html,new RegExp(`id="${id}"`),id);
 assert.match(html,/href="\/api\/admin\/export"/);assert.match(html,/href="\/api\/admin\/backup"/);
 assert.match(html,/href="\/studio"/);assert.match(html,/href="\/"/);
 assert.match(js,/state\.purchaseThresholds/);assert.match(js,/BigInt\(r\.purchaseAmount\)/);
 assert.doesNotMatch(html,/css\/game\.css/);assert.doesNotMatch(css,/@import|https?:\/\//);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/safe-area-inset-bottom/);
});
