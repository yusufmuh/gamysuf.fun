'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {GAMES,EVENTS}=require('../hub/registry.cjs');
const {SOURCES}=require('../scripts/sync-games.cjs');
const {createHub}=require('../hub/server.cjs');
const domain=GAMES.find(game=>game.slug==='domain');

async function setup(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'domain-hub-'));
 const hub=await createHub({dataDir:dir,adminPin:'246810'});
 t.after(async()=>{await hub.close();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:50});});
 return hub;
}
function call(hub,route,{body,visitor='a'.repeat(32),cookie=''}={}){
 const payload=body===undefined?null:JSON.stringify(body);
 const headers={host:'gamysuf.fun',cookie:`gamysuf_vid=${visitor}${cookie?'; '+cookie:''}`};
 if(payload)Object.assign(headers,{'content-type':'application/json','content-length':Buffer.byteLength(payload),origin:'https://gamysuf.fun','x-bpedia-client':'domainfestival'});
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:hub.server.address().port,path:route,method:payload?'POST':'GET',headers},res=>{
   const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{const text=Buffer.concat(chunks).toString();let json;try{json=JSON.parse(text);}catch{}resolve({status:res.statusCode,json,text,headers:res.headers});});
  });req.on('error',reject);if(payload)req.write(payload);req.end();
 });
}
test('Domain metadata and source mapping retain verified event facts',()=>{
 assert.equal(SOURCES.domain,'07 bipy-domain-festival');
 assert.equal(domain.eventGroup,'trademark-2026');
 assert.match(domain.mechanic,/Infinity Convergence.*Spirit Absorption/);
 const event=EVENTS[domain.eventGroup];
 assert.equal(event.place,'Trans Convention Centre');
 assert.equal(event.startDate,'2026-11-05');assert.equal(event.endDate,'2026-11-08');
 assert.equal(event.city,undefined);assert.equal(event.page,'/g/domain/');
});
test('Domain album adapter preserves beauty IDs and host-specific fanservice artwork',()=>{
 const state=require('../games/domain/core/catalog.cjs').defaultState();
 const cards=domain.cards(state);
 const beauty=state.rewards.filter(reward=>reward.track==='beauty');
 const fsRewards=state.rewards.filter(reward=>reward.track==='fanservice');
 assert.equal(cards.length,beauty.length+state.hosts.length*fsRewards.length);
 assert.equal(new Set(cards.map(card=>card.cardId)).size,cards.length);
 for(const reward of beauty){const card=domain.extract('/api/play',{reward,host:state.hosts[0]});assert.equal(card.cardId,reward.id);assert.equal(card.rarity,reward.id.startsWith('voucher-')?'rare':'common');}
 for(const host of state.hosts)for(const reward of fsRewards){const card=domain.extract('/api/play',{reward,host});assert.equal(card.cardId,`${host.id}-${reward.id}`);assert.equal(card.image,host.image);assert.equal(card.rarity,'epic');assert.deepEqual(cards.find(item=>item.cardId===card.cardId),card);}
});
test('Domain mounted gameplay records album while visitor results and real stock stay isolated',async t=>{
 const hub=await setup(t);
 const real=hub.mounts.get('domain').app.engine;
 const original=structuredClone(real.state);
 const page=await call(hub,'/g/domain/');assert.equal(page.status,200);assert.ok(page.text.includes('/hub/js/inject.js'));
 const studio=await call(hub,'/studio');assert.equal(studio.status,200);assert.match(studio.text,/href="\/g\/domain\/admin.html"/);assert.match(studio.text,/href="\/g\/domain\/"/);assert.match(studio.text,/staff-number">07</);
 const catalog=(await call(hub,'/hub-api/catalog')).json;
 assert.equal(catalog.totals.cards,125);
 assert.equal(catalog.games.find(game=>game.slug==='domain').url,'/g/domain/');
 const played=await call(hub,'/g/domain/api/play',{body:{requestId:'domain-hub-001',activity:'infinity',controlMode:'auto',rewardTrack:'fanservice',character:'gojo',comfort:'no-touch'}});
 assert.equal(played.status,200);assert.equal(played.json.demo,true);
 assert.ok(played.json.host.image.startsWith('/g/domain/assets/'));
 assert.equal((await call(hub,'/g/domain/api/state',{visitor:'b'.repeat(32)})).json.pending,null);
 assert.equal((await call(hub,'/g/domain/api/state')).json.pending.id,played.json.id);
 assert.deepEqual(real.state,original);
 const album=(await call(hub,'/hub-api/album')).json;
 const card=album.games.find(game=>game.slug==='domain').cards.find(item=>item.key===`domain:${played.json.host.id}-${played.json.reward.id}`);
 assert.ok(card.owned);assert.equal(card.image,played.json.host.image);
 assert.equal((await call(hub,card.image)).status,200);
 assert.equal((await call(hub,'/g/domain/api/play',{body:{requestId:'domain-hub-001',activity:'infinity',controlMode:'auto',rewardTrack:'fanservice',character:'gojo',comfort:'no-touch'}})).json.id,played.json.id);
});
test('Domain official gateway requires staff and preserves reservation/cancellation against anonymous demos',async t=>{
 const hub=await setup(t),real=hub.mounts.get('domain').app.engine;
 const route='/g/domain/api/',o={requestId:'official-gateway-001',activity:'seal',controlMode:'touch',rewardTrack:'beauty',character:'geto',verified:true,purchaseAmount:50000};
 assert.equal((await call(hub,route+'admin/settings',{body:{mode:'live'}})).status,401);
 const login=await call(hub,route+'login',{body:{pin:'246810'}});assert.equal(login.status,200);
 const cookie=login.headers['set-cookie'].map(value=>value.split(';')[0]).find(value=>value.startsWith('domain_session='));assert.ok(cookie);
 assert.equal((await call(hub,route+'admin/settings',{body:{mode:'live',purchaseThreshold:50000},cookie})).status,200);
 assert.equal((await call(hub,route+'admin/reward',{body:{id:'bundling-1',patch:{stock:1,terms:'Petugas mengonfirmasi paket booth.'}},cookie})).status,200);
 assert.equal((await call(hub,route+'play',{body:{...o,purchaseAmount:49999},cookie})).status,409);
 const issued=await call(hub,route+'play',{body:o,cookie});assert.equal(issued.status,200);assert.equal(issued.json.demo,false);assert.equal(issued.json.purchaseMinimum,50000);
 assert.equal(real.state.rewards.find(r=>r.id==='bundling-1').stock,0);
 assert.equal((await call(hub,route+'result',{body:{id:issued.json.id},cookie})).status,200);
 assert.equal((await call(hub,route+'play',{body:o,cookie})).json.id,issued.json.id);
 const demo=await call(hub,route+'play',{body:{...o,requestId:'anonymous-gateway-002'},visitor:'c'.repeat(32)});assert.equal(demo.status,200);assert.equal(demo.json.demo,true);
 assert.equal(real.state.history.length,1);assert.equal(real.state.rewards.find(r=>r.id==='bundling-1').stock,0);
 assert.equal((await call(hub,route+'admin/ticket',{body:{id:issued.json.id,action:'cancelled'}})).status,401);
 for(let i=0;i<2;i++)assert.equal((await call(hub,route+'admin/ticket',{body:{id:issued.json.id,action:'cancelled'},cookie})).status,200);
 assert.equal(real.state.rewards.find(r=>r.id==='bundling-1').stock,1);
 const exported=await call(hub,route+'admin/export',{cookie});assert.equal(exported.status,200);assert.ok(exported.text.includes(issued.json.id));assert.ok(!exported.text.includes(demo.json.id));
});
