'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {zipSync,strToU8}=require('fflate');
const {createHub}=require('../hub/server.cjs');
const {rewriteOutgoing,rewriteIncoming,rewriteCookie}=require('../hub/rewrite.cjs');
const {Players,validNickname,levelFor}=require('../hub/players.cjs');

const HOST='gamysuf.fun';
const ORIGIN=`https://${HOST}`;
const CLIENT={spin:'spin-studio',nyapit:'nyapit',drop:'beautydrop',gacha:'gachapop',heart:'heartparade'};
const vid=char=>char.repeat(32);

async function hubFor(t,options={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-test-'));
 const hub=await createHub({dataDir:dir,adminPin:'246810',...options});
 t.after(async()=>{await hub.close();fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:50});});
 return hub;
}

function call(hub,route,{method='GET',body,visitor=vid('a'),cookie='',origin=ORIGIN,client}={}){
 const payload=body===undefined?null:JSON.stringify(body);
 const headers={host:HOST,cookie:[`gamysuf_vid=${visitor}`,cookie].filter(Boolean).join('; ')};
 if(payload){
  const game=route.match(/^\/g\/(\w+)/)?.[1];
  Object.assign(headers,{'content-type':'application/json','content-length':Buffer.byteLength(payload),origin});
  if(game)headers['x-bpedia-client']=CLIENT[game];else headers['x-gamysuf-client']=client??'hub';
 }
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:hub.server.address().port,path:route,method,headers},res=>{
   const chunks=[];res.on('data',chunk=>chunks.push(chunk));
   res.on('end',()=>{const text=Buffer.concat(chunks).toString('utf8');let json;try{json=JSON.parse(text);}catch{}resolve({status:res.statusCode,headers:res.headers,text,json});});
  });
  req.on('error',reject);
  if(payload)req.write(payload);
  req.end();
 });
}

test('rewrite memberi awalan pada URL absolut dan melepasnya lagi dari body',()=>{
 const html=`<link href="/css/a.css"><img src='/assets/x.png'><a href="/">Home</a><script>fetch('/api/state');const u=\`/assets/m/\${n}.png\`;const r=/^\\/uploads\\//;</script><p>url(/assets/f.woff2)</p>`;
 const out=rewriteOutgoing(html,'/g/drop');
 assert.match(out,/href="\/g\/drop\/css\/a\.css"/);
 assert.match(out,/src='\/g\/drop\/assets\/x\.png'/);
 assert.match(out,/href="\/g\/drop\/"/);
 assert.match(out,/fetch\('\/g\/drop\/api\/state'\)/);
 assert.match(out,/`\/g\/drop\/assets\/m\//);
 assert.match(out,/url\(\/g\/drop\/assets\/f\.woff2\)/);
 assert.ok(out.includes('/^\\/uploads\\//'),'regex literal tidak disentuh');
 assert.equal(rewriteOutgoing(out,'/g/drop'),out,'idempoten');
 assert.equal(rewriteIncoming('{"image":"/g/drop/uploads/a.png"}','/g/drop'),'{"image":"/uploads/a.png"}');
 assert.equal(rewriteCookie('s=1; HttpOnly; SameSite=Strict; Path=/api/','/g/drop',true),'s=1; HttpOnly; SameSite=Strict; Path=/g/drop/api/; Secure');
});

test('lima game tampil lewat gateway dengan URL berawalan dan tombol Gamysuf',async t=>{
 const hub=await hubFor(t);
 for(const slug of ['spin','nyapit','drop','gacha','heart']){
  const page=await call(hub,`/g/${slug}/`);
  assert.equal(page.status,200,slug);
  assert.ok(page.text.includes('/hub/js/inject.js'),`${slug}: inject`);
  assert.doesNotMatch(page.text,/(?:src|href)="\/(?:css|js|assets)\//,`${slug}: masih ada URL tanpa awalan`);
  const state=await call(hub,`/g/${slug}/api/state`);
  assert.equal(state.status,200);
  assert.equal(state.json.settings.mode,'demo');
  assert.ok((state.json.prizes||state.json.hosts).every(prize=>!prize.image||prize.image.startsWith(`/g/${slug}/`)));
 }
 assert.equal((await call(hub,'/g/drop')).status,301);
 assert.equal((await call(hub,'/g/unknown/')).status,404);
 assert.equal((await call(hub,'/g/drop/server.cjs')).status,404);
});

test('pengunjung publik bermain di mesin demo pribadi; stok asli tidak tersentuh',async t=>{
 const hub=await hubFor(t);
 const played=await call(hub,'/g/nyapit/api/play',{method:'POST',visitor:vid('a'),body:{requestId:'hub-test-0001',username:'A'}});
 assert.equal(played.status,200);
 assert.equal(played.json.demo,true);
 assert.equal((await call(hub,'/g/nyapit/api/state',{visitor:vid('a')})).json.pending.id,played.json.id);
 assert.equal((await call(hub,'/g/nyapit/api/state',{visitor:vid('b')})).json.pending,null,'pengunjung lain tidak melihat hasil A');
 const real=hub.mounts.get('nyapit').app.engine.state;
 assert.equal(real.history.length,0);
 assert.equal(real.pending,null);
 assert.equal((await call(hub,'/g/nyapit/api/mode',{method:'POST',body:{mode:'live'}})).status,403);
 assert.equal((await call(hub,'/g/drop/api/play',{method:'POST',origin:'https://evil.example',body:{requestId:'hub-test-0002'}})).status,403);
});

test('PIN bawaan game tidak berlaku; ADMIN_PIN membuka dashboard dengan cookie berawalan',async t=>{
 const hub=await hubFor(t);
 assert.equal((await call(hub,'/g/drop/api/login',{method:'POST',body:{pin:'1234'}})).status,401);
 assert.equal((await call(hub,'/g/spin/api/login',{method:'POST',body:{username:'johan123',password:'yusuf123'}})).status,401);
 const spin=await call(hub,'/g/spin/api/login',{method:'POST',body:{username:'johan123',password:'246810'}});
 assert.equal(spin.status,200);
 const login=await call(hub,'/g/drop/api/login',{method:'POST',body:{pin:'246810'}});
 assert.equal(login.status,200);
 const cookie=login.headers['set-cookie'][0];
 assert.match(cookie,/Path=\/g\/drop\/api\//);
 assert.match(cookie,/Secure/);
 const session=cookie.split(';')[0];
 assert.equal((await call(hub,'/g/drop/api/admin/state',{cookie:session})).status,200);
 const mode=await call(hub,'/g/drop/api/mode',{method:'POST',cookie:session,body:{mode:'live'}});
 assert.equal(mode.status,200,'perangkat booth yang login boleh mode resmi');
 assert.equal((await call(hub,'/g/drop/api/admin/pin',{method:'POST',cookie:session,body:{currentPin:'246810',newPin:'135790'}})).status,409);
});

test('tanpa ADMIN_PIN semua login terkunci tetapi game tetap bisa dimainkan',async t=>{
 const hub=await hubFor(t,{adminPin:null});
 assert.equal((await call(hub,'/g/drop/api/login',{method:'POST',body:{pin:'1234'}})).status,503);
 assert.equal((await call(hub,'/hub-api/login',{method:'POST',body:{pin:'123456'}})).status,503);
 assert.equal((await call(hub,'/g/drop/api/play',{method:'POST',body:{requestId:'hub-test-open-01'}})).status,200);
});

test('hasil permainan tercatat di server: XP, kartu, misi, lencana, peringkat',async t=>{
 const hub=await hubFor(t);
 await call(hub,'/hub-api/me',{method:'POST',body:{nickname:'Rina',avatar:'wink'}});
 assert.equal((await call(hub,'/hub-api/me',{method:'POST',body:{nickname:'Nama Baru',avatar:'tidak-ada'}})).status,400);
 const unchanged=(await call(hub,'/hub-api/me')).json;
 assert.equal(unchanged.nickname,'Rina','nama tidak boleh berubah saat avatar ditolak');
 assert.equal(unchanged.avatar,'wink','avatar lama tetap tersimpan');
 await call(hub,'/g/drop/api/play',{method:'POST',body:{requestId:'hub-xp-000001',game:'drop'}});
 await call(hub,'/g/nyapit/api/result',{method:'POST',body:{id:'x'}});
 const me=(await call(hub,'/hub-api/me')).json;
 assert.equal(me.nickname,'Rina');
 assert.equal(me.plays,1);
 assert.ok(me.xp>=30);
 assert.ok(me.badges.find(badge=>badge.id==='first-play').unlockedAt);
 const again=await call(hub,'/g/drop/api/play',{method:'POST',body:{requestId:'hub-xp-000001',game:'drop'}});
 assert.equal(again.status,200);
 assert.equal((await call(hub,'/hub-api/me')).json.plays,1,'requestId sama tidak dihitung dua kali');
 const board=(await call(hub,'/hub-api/leaderboard?range=week',{visitor:vid('c')})).json;
 assert.equal(board.top[0].name,'Rina');
 const album=(await call(hub,'/hub-api/album')).json;
 assert.equal(album.total,album.games.reduce((sum,game)=>sum+game.cards.length,0));
 assert.ok(album.games.find(game=>game.slug==='drop').cards.some(card=>card.key==='drop:fs-hug'));
 assert.equal((await call(hub,'/hub-api/me',{method:'POST',body:{nickname:'a'}})).status,400);
});

test('logika pemain: streak, misi, batas XP harian, level, nama sopan',()=>{
 let now=Date.parse('2026-10-03T03:00:00Z');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-players-'));
 const players=new Players(path.join(dir,'p.json'),{now:()=>now});
 const id=vid('d');
 const card=n=>({cardId:`c${n}`,name:`Kartu ${n}`,image:null,rarity:n===1?'legendary':'common'});
 let events=players.record(id,{slug:'drop',outcome:card(1),requestKey:'r1',totalCards:57,builtinSlugs:['spin','nyapit','drop']});
 assert.ok(events.some(event=>event.text.includes('legendaris')));
 assert.ok(players.view(id).badges.find(badge=>badge.id==='lucky').unlockedAt);
 players.record(id,{slug:'spin',outcome:card(2),requestKey:'r2'});
 players.record(id,{slug:'nyapit',outcome:{zonk:true},requestKey:'r3',builtinSlugs:['spin','nyapit','drop']});
 const view=players.view(id);
 assert.ok(view.missions.every(mission=>mission.done));
 assert.ok(view.badges.find(badge=>badge.id==='tri-arena').unlockedAt);
 assert.ok(view.badges.find(badge=>badge.id==='mission-master').unlockedAt);
 now+=24*3600*1000;
 players.record(id,{slug:'drop',outcome:{zonk:true},requestKey:'r4'});
 assert.equal(players.view(id).streak.count,2);
 now+=3*24*3600*1000;
 players.record(id,{slug:'drop',outcome:{zonk:true},requestKey:'r5'});
 assert.equal(players.view(id).streak.count,1,'streak putus setelah absen');
 const before=players.view(id).xp;
 for(let i=0;i<70;i++)players.record(id,{slug:'drop',outcome:{zonk:true},requestKey:`cap-${i}`});
 const after=players.view(id);
 assert.equal(after.dailyCapLeft,0);
 assert.ok(after.xp-before<70*5+200,'XP permainan berhenti setelah batas harian');
 assert.equal(levelFor(0).level,1);
 assert.equal(levelFor(100).level,2);
 assert.equal(validNickname('  Rina   K '),'Rina K');
 assert.equal(validNickname('dasar goblok'),null);
 players.flush();
 fs.rmSync(dir,{recursive:true,force:true});
});

test('Studio: login PIN, CSRF, dan slot game tambahan (tautan & ZIP aman)',async t=>{
 const hub=await hubFor(t);
 assert.equal((await call(hub,'/hub-api/admin/state')).status,401);
 assert.equal((await call(hub,'/hub-api/login',{method:'POST',body:{pin:'111111'}})).status,401);
 assert.equal((await call(hub,'/hub-api/login',{method:'POST',client:'lain',body:{pin:'246810'}})).status,403);
 const login=await call(hub,'/hub-api/login',{method:'POST',body:{pin:'246810'}});
 assert.equal(login.status,200);
 const cookie=login.headers['set-cookie'].find(item=>item.startsWith('gamysuf_admin=')).split(';')[0];
 const admin=(route,body)=>call(hub,route,{method:body?'POST':'GET',body,cookie});
 assert.equal((await admin('/hub-api/admin/state')).json.games.length,5);

 assert.equal((await admin('/hub-api/admin/game',{slug:'drop',title:'Bentrok',type:'link',url:'https://x.test'})).status,400,'slug bawaan tidak boleh dipakai');
 const link=await admin('/hub-api/admin/game',{slug:'kuis-bpedia',title:'Kuis Bpedia',type:'link',url:'https://example.com/kuis',published:true,howTo:['Jawab pertanyaan'],tags:['kuis']});
 assert.equal(link.status,200,link.text);
 const catalog=(await call(hub,'/hub-api/catalog')).json;
 assert.equal(catalog.custom[0].url,'https://example.com/kuis');
 assert.equal(catalog.slots,5);

 assert.equal((await admin('/hub-api/admin/game',{slug:'bipy-run',title:'Bipy Run',type:'static',published:true})).status,409,'belum ada ZIP');
 assert.equal((await admin('/hub-api/admin/game',{slug:'bipy-run',title:'Bipy Run',type:'static'})).status,200);
 const evil=Buffer.from(zipSync({'../../etc/evil.html':strToU8('x'),'index.html':strToU8('x')})).toString('base64');
 assert.equal((await admin('/hub-api/admin/game/zip',{id:'bipy-run',data:evil})).status,400,'path traversal ditolak');
 const exe=Buffer.from(zipSync({'index.html':strToU8('x'),'run.exe':strToU8('MZ')})).toString('base64');
 assert.equal((await admin('/hub-api/admin/game/zip',{id:'bipy-run',data:exe})).status,400,'ekstensi berbahaya ditolak');
 const good=Buffer.from(zipSync({'bipy-run/index.html':strToU8('<!doctype html><html><head><title>Run</title></head><body>Bipy Run</body></html>'),'bipy-run/js/game.js':strToU8('console.log(1)')})).toString('base64');
 const installed=await admin('/hub-api/admin/game/zip',{id:'bipy-run',data:good});
 assert.equal(installed.status,200,installed.text);
 assert.equal((await call(hub,'/play/bipy-run/')).status,404,'draf tidak tampil untuk publik');
 assert.equal((await admin('/hub-api/admin/game',{id:'bipy-run',published:true})).status,200);
 const page=await call(hub,'/play/bipy-run/');
 assert.equal(page.status,200);
 assert.ok(page.text.includes('Bipy Run'));
 assert.ok(page.text.includes('data-game="custom:bipy-run"'));
 assert.equal((await call(hub,'/play/bipy-run/js/game.js')).status,200);
 assert.equal((await call(hub,'/play/bipy-run/../../package.json')).status,404);
 assert.equal((await admin('/hub-api/admin/settings',{announcement:'Main di booth TAKEOVER X!',featured:'bipy-run',hidden:['spin']})).status,200);
 const after=(await call(hub,'/hub-api/catalog')).json;
 assert.equal(after.settings.featured,'bipy-run');
 assert.ok(!after.games.some(game=>game.slug==='spin'));
 assert.equal((await call(hub,'/g/spin/')).status,404,'game tersembunyi tidak bisa dibuka publik');
});

test('halaman hub dan aset statis tersaji dengan CSP',async t=>{
 const hub=await hubFor(t);
 const home=await call(hub,'/');
 assert.equal(home.status,200);
 assert.match(home.headers['content-security-policy'],/script-src 'self'/);
 assert.match(home.headers['set-cookie']?.[0]||'',/gamysuf_vid=/.test(home.headers['set-cookie']?.[0]||'')?/gamysuf_vid/:/.*/);
 for(const route of ['/studio','/hub/css/hub.css','/hub/js/hub.js','/hub/js/inject.js','/hub/assets/covers/drop.jpg','/manifest.webmanifest','/favicon.ico','/robots.txt'])assert.equal((await call(hub,route)).status,200,route);
 assert.equal((await call(hub,'/hub/../package.json')).status,404);
 assert.equal((await call(hub,'/server.cjs')).status,404);
});

test('CSP juga ditanam sebagai meta karena CDN hosting mengganti header CSP',async t=>{
 const hub=await hubFor(t);
 const meta=/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/;
 for(const route of ['/','/studio','/g/spin/','/g/nyapit/','/g/drop/','/g/drop/admin.html','/g/gacha/','/g/gacha/admin.html','/g/heart/','/g/heart/admin.html']){
  const page=await call(hub,route);
  const match=page.text.match(meta);
  assert.ok(match,`${route}: meta CSP hilang`);
  assert.match(match[1],/script-src 'self'/,route);
  assert.doesNotMatch(match[1],/frame-ancestors/,route);
  assert.equal(page.text.match(/http-equiv="Content-Security-Policy"/g).length,1,`${route}: meta ganda`);
 }
});

test('Gacha Pop lewat gateway: satu tap jadi kartu album & XP, stok booth tidak tersentuh',async t=>{
 const hub=await hubFor(t);
 const played=await call(hub,'/g/gacha/api/play',{method:'POST',body:{requestId:'gacha-hub-0001'}});
 assert.equal(played.status,200,played.text);
 assert.equal(played.json.demo,true);
 assert.match(played.json.id,/^GP-[0-9A-F]{8}$/);
 assert.ok(played.json.prize.image.startsWith('/g/gacha/assets/products/'));
 const me=(await call(hub,'/hub-api/me')).json;
 assert.ok(me.cards.some(card=>card.key===`gacha:${played.json.prize.id}`),'kartu hasil tercatat di profil');
 assert.ok(me.xp>0);
 const album=(await call(hub,'/hub-api/album')).json;
 const gacha=album.games.find(game=>game.slug==='gacha');
 assert.equal(gacha.cards.length,17);
 assert.deepEqual([...new Set(gacha.cards.map(card=>card.rarity))].sort(),['common','epic','legendary']);
 assert.equal(album.total,88);
 assert.equal(hub.mounts.get('gacha').app.engine.state.history.length,0);
 assert.equal((await call(hub,'/g/gacha/api/result',{method:'POST',body:{id:played.json.id}})).status,200);
 assert.equal((await call(hub,'/g/gacha/api/mode',{method:'POST',body:{mode:'live'}})).status,403);
});

test('Heart Parade: isolated demo, idempotent XP and fourteen collectible moments',async t=>{
 const hub=await hubFor(t);
 const draw={requestId:'heart-hub-001',host:'sanji',comfort:'no-touch',consent:true,recording:false};
 const first=await call(hub,'/g/heart/api/play',{method:'POST',body:draw});
 assert.equal(first.status,200);assert.equal(first.json.demo,true);
 assert.equal(first.json.host.id,'sanji');assert.match(first.json.host.image,/^\/g\/heart\/assets\//);
 assert.equal((await call(hub,'/g/heart/api/state',{visitor:vid('b')})).json.pending,null);
 assert.equal(hub.mounts.get('heart').app.engine.state.history.length,0);
 const me=(await call(hub,'/hub-api/me')).json;
 assert.ok(me.cards.some(card=>card.key===`heart:sanji-${first.json.service.id}`));
 assert.equal((await call(hub,'/g/heart/api/play',{method:'POST',body:draw})).json.id,first.json.id);
 assert.equal((await call(hub,'/hub-api/me')).json.xp,me.xp);
 const album=(await call(hub,'/hub-api/album')).json;
 assert.equal(album.games.find(game=>game.slug==='heart').cards.length,14);assert.equal(album.total,88);
 assert.equal((await call(hub,'/g/heart/api/result',{method:'POST',body:{id:first.json.id}})).status,200);
 const login=await call(hub,'/g/heart/api/login',{method:'POST',body:{pin:'246810'}});
 const cookie=login.headers['set-cookie'].map(s=>s.split(';')[0]).join('; ');
 assert.equal((await call(hub,'/g/heart/api/admin/settings',{method:'POST',cookie,body:{mode:'live'}})).status,200);
 const booth=await call(hub,'/g/heart/api/play',{method:'POST',cookie,body:{...draw,requestId:'heart-booth-002',verified:true}});
 assert.equal(booth.json.demo,false);assert.match(booth.json.id,/^HP-/);
 assert.equal((await call(hub,'/g/heart/api/state',{visitor:vid('b')})).json.settings.mode,'demo');
});
