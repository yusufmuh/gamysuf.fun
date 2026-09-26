'use strict';

const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const {GAMES}=require('./registry.cjs');
const {createVisitorEngines}=require('./visitors.cjs');
const {Players}=require('./players.cjs');
const {CustomGames,MAX_GAMES}=require('./custom-games.cjs');
const {rewriteOutgoing,rewriteIncoming,rewriteCookie,rewriteLocation}=require('./rewrite.cjs');
const {dispatch}=require('./dispatch.cjs');

const scrypt=promisify(crypto.scrypt);
const ROOT=path.join(__dirname,'..');
const PUBLIC=path.join(__dirname,'public');
const VERSION=require('../package.json').version;
const TYPES={
 '.html':'text/html; charset=utf-8','.htm':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8','.map':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.csv':'text/csv; charset=utf-8',
 '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.ico':'image/x-icon','.bmp':'image/bmp',
 '.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.oga':'audio/ogg','.m4a':'audio/mp4','.aac':'audio/aac','.mp4':'video/mp4','.webm':'video/webm',
 '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.wasm':'application/wasm',
 '.data':'application/octet-stream','.bin':'application/octet-stream','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.atlas':'text/plain; charset=utf-8','.fnt':'text/plain; charset=utf-8','.unityweb':'application/octet-stream','.br':'application/octet-stream','.gz':'application/gzip'
};
const HUB_CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'";
/* Game tambahan hasil unggahan boleh memakai pola umum game HTML5 (inline
   script, eval, wasm, CDN https). Hanya pemegang ADMIN_PIN yang bisa unggah. */
const PLAY_CSP="default-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https: wss: data: blob:; font-src 'self' data: https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'";
const HOP=new Set(['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade']);
const VISITOR_COOKIE='gamysuf_vid';
const ADMIN_COOKIE='gamysuf_admin';
const ADMIN_TTL=8*60*60*1000;
const GAME_SESSION_TTL=12*60*60*1000;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});

function cookieValue(req,name){
 for(const part of String(req.headers.cookie||'').split(';')){
  const index=part.indexOf('=');
  if(index>0&&part.slice(0,index).trim()===name)return part.slice(index+1).trim();
 }
 return null;
}

function readBody(req,limit){
 return new Promise((resolve,reject)=>{
  const chunks=[];let size=0;
  req.on('data',chunk=>{
   size+=chunk.length;
   if(size>limit){reject(fail('Berkas terlalu besar.',413));req.destroy();return;}
   chunks.push(chunk);
  });
  req.on('end',()=>resolve(Buffer.concat(chunks)));
  req.on('error',reject);
 });
}

/* auth.json setiap game ditulis ulang dari ADMIN_PIN pada setiap start, jadi
   password/PIN bawaan di kode game tidak pernah berlaku di cloud. Tanpa
   ADMIN_PIN, diisi rahasia acak (tidak ada yang bisa masuk). */
async function seedGameAuth(slug,dataDir,pin){
 const secret=pin||crypto.randomBytes(24).toString('hex');
 const salt=crypto.randomBytes(24).toString('hex');
 const hash=(await scrypt(secret,salt,64)).toString('hex');
 const record=slug==='spin'?{username:'johan123',salt,hash}:{salt,hash};
 fs.writeFileSync(path.join(dataDir,'auth.json'),JSON.stringify(record),{mode:0o600});
}

/* Skin online per game (hub/public/skins/<slug>.css|js): tata letak HP,
   tablet, dan layar lipat plus polesan khusus versi cloud. Disisipkan setelah
   CSS game sehingga versi booth/desktop (folder 01/02/03) tidak berubah dan
   npm run sync tidak menimpanya. */
function skinTags(slug){
 const tags=[];
 if(fs.existsSync(path.join(PUBLIC,'skins',`${slug}.css`)))tags.push(`<link rel="stylesheet" href="/hub/skins/${slug}.css?v=${VERSION}">`);
 if(fs.existsSync(path.join(PUBLIC,'skins',`${slug}.js`)))tags.push(`<script defer src="/hub/skins/${slug}.js?v=${VERSION}"></script>`);
 return tags.join('');
}

/* Media ringan (npm run media:lite): URL aset game & hub dilayani dengan MP3
   (dari WAV) atau WebP (dari PNG/JPG, hanya untuk browser yang mengirim
   Accept: image/webp) selama checksum berkas sumber sama dengan manifest.
   Bila game di-sync dan asetnya berubah, gateway kembali ke berkas asli. */
function loadMediaLite(){
 const dir=path.join(__dirname,'media-lite');
 const lite=new Map();
 let manifest={};
 try{manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));}catch{return lite;}
 for(const [key,entry] of Object.entries(manifest)){
  if(!entry?.file||key.includes('..')||entry.file.includes('..'))continue;
  const source=key.startsWith('hub/')?path.join(PUBLIC,key.slice(4)):path.join(ROOT,'games',key);
  const file=path.join(dir,entry.file);
  if(fs.existsSync(source)&&fs.existsSync(file)&&crypto.createHash('sha1').update(fs.readFileSync(source)).digest('hex')===entry.sha1)lite.set(key,{file,image:entry.type==='image/webp'});
 }
 return lite;
}

/* Versi ringan yang boleh dikirim untuk permintaan ini, atau null. */
function liteFor(lite,key,req){
 const entry=lite.get(key);
 if(!entry||!['GET','HEAD'].includes(req.method))return null;
 if(entry.image&&!/image\/webp/i.test(String(req.headers.accept||'')))return null;
 return entry;
}

async function createHub({dataDir,port=0,host='127.0.0.1',adminPin=null,local=false,allowedHosts=null,now=()=>Date.now(),rng}={}){
 if(!dataDir)throw new Error('dataDir wajib diisi.');
 fs.mkdirSync(dataDir,{recursive:true});
 const pinValid=typeof adminPin==='string'&&/^\d{6,12}$/.test(adminPin);
 if(adminPin&&!pinValid)console.error('ADMIN_PIN harus 6-12 digit angka. Semua dashboard dikunci sampai diperbaiki.');
 const hostAllow=new Set(String(allowedHosts||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean));
 const players=new Players(path.join(dataDir,'hub','players.json'),{now});
 const custom=new CustomGames(path.join(dataDir,'hub'));
 const mounts=new Map();
 /* Runner Node.js Hostinger (lsnode) mengganti http.Server.listen agar server
    pertama terikat ke soketnya. Server internal game harus memakai listen asli
    supaya soket itu tetap milik hub; trafik game dipanggil langsung di memori
    lewat dispatch.cjs, bukan lewat port internal. */
 const hostingerListen=http.Server.prototype.listen;
 const nativeListen=require('node:net').Server.prototype.listen;
 try{
  http.Server.prototype.listen=nativeListen;
  for(const game of GAMES){
   const gameDir=path.join(ROOT,'games',game.slug);
   const gameData=path.join(dataDir,'games',game.slug);
   fs.mkdirSync(gameData,{recursive:true});
   await seedGameAuth(game.slug,gameData,pinValid?adminPin:null);
   const {createApp}=require(path.join(gameDir,'server.cjs'));
   const {Engine}=require(path.join(gameDir,'core','engine.cjs'));
   const visitors=createVisitorEngines({Engine,options:real=>game.engineOptions?.(real)||{},now});
   const app=await createApp({dataDir:gameData,port:0,rng,cloud:{engineFor:(req,real)=>visitors.get(req.headers['x-gamysuf-visitor'],real),sessionTtlMs:GAME_SESSION_TTL}});
   const handler=app.server.listeners('request')[0];
   mounts.set(game.slug,{game,app,visitors,handler,origin:app.origin,prefix:`/g/${game.slug}`,skin:skinTags(game.slug)});
  }
 }finally{
  http.Server.prototype.listen=hostingerListen;
 }
 const builtinSlugs=GAMES.map(game=>game.slug);
 const mediaLite=loadMediaLite();

 function cardsOf(mount){
  const seen=new Set();
  return mount.game.cards(mount.app.engine.state).filter(card=>!seen.has(card.cardId)&&seen.add(card.cardId)).map(card=>({...card,key:`${mount.game.slug}:${card.cardId}`,image:card.image?mount.prefix+card.image:null}));
 }
 const totalCards=()=>[...mounts.values()].reduce((sum,mount)=>sum+cardsOf(mount).length,0);
 const viewOf=(vid,options={})=>({...players.view(vid,{...options,totalCards:totalCards(),builtinSlugs}),recoveryCode:vid});

 const adminSessions=new Map();
 let attempts=0,lockUntil=0;
 function adminToken(req){
  const token=cookieValue(req,ADMIN_COOKIE);
  const session=token&&adminSessions.get(token);
  if(!session||session.expires<now()){if(token)adminSessions.delete(token);return null;}
  session.expires=now()+ADMIN_TTL;
  return token;
 }
 function requireAdmin(req){if(!adminToken(req))throw fail('Sesi Studio berakhir. Masukkan PIN kembali.',401);}

 function publicGame(game){
  return {slug:game.slug,title:game.title,brandTitle:game.brandTitle,event:game.event,mechanic:game.mechanic,accent:game.accent,cover:game.cover,tagline:game.tagline,description:game.description,howTo:game.howTo,tips:game.tips,controls:game.controls,url:`/g/${game.slug}/`,builtin:true};
 }
 function publicCustom(game){
  return {slug:game.id,title:game.title,brandTitle:game.title,event:game.subtitle,mechanic:game.tags.join(' · '),accent:game.color,cover:game.cover,tagline:game.subtitle,description:game.description,howTo:game.howTo,tips:[],controls:[],url:game.type==='link'?game.url:`/play/${game.id}/`,external:game.type==='link',builtin:false};
 }

 function send(ctx,status,body,headers={}){
  const payload=Buffer.isBuffer(body)?body:Buffer.from(typeof body==='string'?body:JSON.stringify(body));
  const out={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers,'Content-Length':payload.length};
  const cookies=[...(out['Set-Cookie']?[].concat(out['Set-Cookie']):[]),...ctx.cookies];
  delete out['Set-Cookie'];
  if(cookies.length)out['Set-Cookie']=cookies;
  ctx.res.writeHead(status,out);
  ctx.res.end(ctx.req.method==='HEAD'?undefined:payload);
 }

 function serveFile(ctx,file,{csp=HUB_CSP,cache='public, max-age=86400',transform=null,headers:extra={}}={}){
  if(!file||!fs.existsSync(file)||!fs.statSync(file).isFile())return notFound(ctx);
  const type=TYPES[path.extname(file).toLowerCase()];
  if(!type)return notFound(ctx);
  const headers={'Content-Type':type,'Cache-Control':/text\/html/.test(type)?'no-cache':cache,'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',...extra};
  if(transform&&/text\/html/.test(type))return send(ctx,200,Buffer.from(transform(fs.readFileSync(file,'utf8'))),headers);
  const size=fs.statSync(file).size;
  const cookies=ctx.cookies.length?{'Set-Cookie':ctx.cookies}:{};
  ctx.res.writeHead(200,{...headers,...cookies,'Content-Length':size});
  if(ctx.req.method==='HEAD')return ctx.res.end();
  fs.createReadStream(file).pipe(ctx.res);
 }

 function notFound(ctx){
  if(ctx.pathname.startsWith('/hub-api/'))return send(ctx,404,{error:'Rute tidak ditemukan.'});
  return send(ctx,404,Buffer.from('<!doctype html><meta charset="utf-8"><title>Tidak ditemukan · Gamysuf</title><body style="font-family:sans-serif;background:#14060d;color:#fff7f8;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1>404</h1><p>Halaman ini tidak ada di arcade.</p><a style="color:#f9a2c1" href="/">Kembali ke Gamysuf</a></div>'),{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"});
 }

 function recordResult(ctx,mount,route,text){
  try{
   const json=JSON.parse(text);
   if(json.demo===false)return;
   const outcome=mount.game.extract(route,json);
   if(!outcome)return;
   const key=json.bonusRequestId||json.requestId||json.id;
   players.record(ctx.vid,{slug:mount.game.slug,outcome:{...outcome,image:outcome.image?mount.prefix+outcome.image:null},requestKey:`${mount.game.slug}:${key}`,totalCards:totalCards(),builtinSlugs});
  }catch(error){console.error(`Gagal mencatat hasil ${mount.game.slug}: ${error.message}`);}
 }

 async function proxy(ctx,mount,rest){
  const {req,res}=ctx;
  const route=rest.split('?')[0]||'/';
  let liteKey=`${mount.game.slug}${route}`;
  try{liteKey=decodeURIComponent(liteKey);}catch{/* URL rusak: pakai apa adanya */}
  const lite=liteFor(mediaLite,liteKey,req);
  if(lite)return serveFile(ctx,lite.file,{cache:'public, max-age=604800',headers:lite.image?{Vary:'Accept'}:{}});
  const origin=req.headers.origin;
  const sameOrigin=origin===`https://${ctx.host}`||origin===`http://${ctx.host}`;
  if(!['GET','HEAD'].includes(req.method)&&!sameOrigin)throw fail('Permintaan harus berasal dari situs ini.',403);
  if(!pinValid&&mount.game.loginRoutes.includes(route))throw fail('Dashboard terkunci: isi ADMIN_PIN (6-12 digit angka) di Environment variables hosting, lalu redeploy.',503);
  const headers={};
  for(const [key,value] of Object.entries(req.headers)){
   if(HOP.has(key)||key.startsWith('x-gamysuf-')||['host','origin','referer','accept-encoding','cookie','content-length'].includes(key))continue;
   headers[key]=value;
  }
  const cookies=String(req.headers.cookie||'').split(';').map(part=>part.trim()).filter(part=>part&&!part.startsWith(`${ADMIN_COOKIE}=`)&&!part.startsWith(`${VISITOR_COOKIE}=`));
  if(cookies.length)headers.cookie=cookies.join('; ');
  headers.host=new URL(mount.origin).host;
  if(origin&&sameOrigin)headers.origin=mount.origin;
  headers['x-gamysuf-visitor']=ctx.vid;
  let body=null;
  if(!['GET','HEAD'].includes(req.method)){
   const limit=route.endsWith('/restore')?320*1024*1024:/upload|prize/.test(route)?16*1024*1024:2*1024*1024;
   body=await readBody(req,limit);
   if(/json/i.test(req.headers['content-type']||''))body=Buffer.from(rewriteIncoming(body.toString('utf8'),mount.prefix));
   headers['content-length']=String(body.length);
  }
  let out=null,type='';
  const upstream=await dispatch(mount.handler,{method:req.method,url:rest,headers,body,onHead:head=>{
   type=String(head.headers['content-type']||'');
   out={};
   for(const [key,value] of Object.entries(head.headers))if(!HOP.has(key)&&key!=='content-length'&&key!=='set-cookie')out[key]=value;
   const setCookies=[...[].concat(head.headers['set-cookie']||[]).map(cookie=>rewriteCookie(cookie,mount.prefix,ctx.secure)),...ctx.cookies];
   if(setCookies.length)out['set-cookie']=setCookies;
   if(out.location)out.location=rewriteLocation(out.location,mount.prefix);
   if(mediaLite.get(liteKey)?.image)out.vary='Accept';
   if(/text\/html|text\/css|javascript|application\/json/i.test(type)&&req.method!=='HEAD')return null;
   if(head.headers['content-length']!==undefined)out['content-length']=head.headers['content-length'];
   res.writeHead(head.statusCode,out);
   return res;
  }});
  if(upstream.streamed)return;
  let text=upstream.body.toString('utf8');
  if(upstream.statusCode===200&&req.method==='POST'&&mount.game.resultRoutes.includes(route))recordResult(ctx,mount,route,text);
  text=rewriteOutgoing(text,mount.prefix);
  if(/text\/html/i.test(type)&&(route==='/'||route==='/index.html'))text=text.replace(/<\/head>/i,`${mount.skin}<script defer src="/hub/js/inject.js" data-game="${mount.game.slug}"></script></head>`);
  const buffer=Buffer.from(text,'utf8');
  out['content-length']=String(buffer.length);
  res.writeHead(upstream.statusCode,out);
  res.end(buffer);
 }

 function checkPost(ctx){
  const {req}=ctx;
  const origin=req.headers.origin;
  if(origin!==`https://${ctx.host}`&&origin!==`http://${ctx.host}`)throw fail('Permintaan harus berasal dari situs ini.',403);
  if(req.headers['x-gamysuf-client']!=='hub'||!String(req.headers['content-type']||'').startsWith('application/json'))throw fail('Permintaan harus berasal dari aplikasi.',403);
 }

 async function hubApi(ctx){
  const {req,url}=ctx;
  const route=ctx.pathname;
  let body={};
  if(req.method==='POST'){
   checkPost(ctx);
   const limit=route==='/hub-api/admin/game/zip'?120*1024*1024:route==='/hub-api/admin/game/cover'?8*1024*1024:256*1024;
   const raw=await readBody(req,limit);
   try{body=JSON.parse(raw.toString('utf8')||'{}');}catch{throw fail('JSON tidak valid.');}
  }else if(req.method!=='GET')throw fail('Metode tidak diizinkan.',405);
  const post=()=>{if(req.method!=='POST')throw fail('Gunakan POST.',405);};
  const settings=custom.settings();

  if(route==='/hub-api/catalog'){
   const stats=players.stats();
   const games=GAMES.filter(game=>!settings.hidden.includes(game.slug)).map(game=>({...publicGame(game),cards:cardsOf(mounts.get(game.slug)).length,plays:stats.byGame[game.slug]||0}));
   return send(ctx,200,{version:VERSION,games,custom:custom.list().map(publicCustom),slots:Math.max(0,MAX_GAMES-custom.list({includeDrafts:true}).length),settings:{announcement:settings.announcement,announcementLink:settings.announcementLink,featured:settings.featured},totals:{cards:totalCards(),players:stats.players,plays:stats.plays,playsToday:stats.playsToday},activity:players.recent()});
  }
  if(route==='/hub-api/session')return send(ctx,200,{admin:Boolean(adminToken(req)),pinConfigured:pinValid});
  if(route==='/hub-api/health')return send(ctx,200,{ok:true,version:VERSION,uptime:Math.round(process.uptime()),games:[...mounts.keys()],pinConfigured:pinValid});
  if(route==='/hub-api/me'&&req.method==='GET'){
   const since=Number(url.searchParams.get('since'))||0;
   return send(ctx,200,viewOf(ctx.vid,{since}));
  }
  if(route==='/hub-api/me'){post();players.setProfile(ctx.vid,body);return send(ctx,200,viewOf(ctx.vid));}
  if(route==='/hub-api/me/restore'){
   post();
   const code=String(body.code||'').toLowerCase().replace(/[^a-f0-9]/g,'');
   if(!/^[a-f0-9]{32}$/.test(code)||!players.has(code))throw fail('Kode pemulihan tidak ditemukan.',404);
   ctx.vid=code;
   ctx.cookies=[`${VISITOR_COOKIE}=${code}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${ctx.secure?'; Secure':''}`];
   return send(ctx,200,viewOf(code));
  }
  if(route==='/hub-api/leaderboard'){
   const range=url.searchParams.get('range')==='all'?'all':'week';
   return send(ctx,200,players.leaderboard(range,ctx.vid));
  }
  if(route==='/hub-api/album'){
   const owned=new Map(players.view(ctx.vid).cards.map(card=>[card.key,card]));
   const games=GAMES.filter(game=>!settings.hidden.includes(game.slug)).map(game=>({slug:game.slug,title:game.title,accent:game.accent,cards:cardsOf(mounts.get(game.slug)).map(card=>({key:card.key,name:card.name,rarity:card.rarity,image:card.image,owned:owned.has(card.key),count:owned.get(card.key)?.count||0}))}));
   return send(ctx,200,{games,total:totalCards(),owned:owned.size});
  }
  if(route==='/hub-api/login'){
   post();
   if(!pinValid)throw fail('Studio terkunci: isi ADMIN_PIN (6-12 digit angka) di Environment variables hosting.',503);
   if(now()<lockUntil)throw fail('Terlalu banyak percobaan. Tunggu 60 detik.',429);
   const pin=String(body.pin??'');
   const ok=pin.length===adminPin.length&&crypto.timingSafeEqual(Buffer.from(pin),Buffer.from(adminPin));
   if(!ok){attempts++;if(attempts>=5){attempts=0;lockUntil=now()+60000;throw fail('Lima PIN salah. Studio dikunci 60 detik.',429);}throw fail(`PIN salah. Sisa percobaan: ${5-attempts}.`,401);}
   attempts=0;
   const token=crypto.randomBytes(32).toString('hex');
   adminSessions.set(token,{expires:now()+ADMIN_TTL});
   return send(ctx,200,{ok:true},{'Set-Cookie':`${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${ctx.secure?'; Secure':''}`});
  }
  if(route==='/hub-api/logout'){post();const token=cookieValue(req,ADMIN_COOKIE);adminSessions.delete(token);return send(ctx,200,{ok:true},{'Set-Cookie':`${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`});}

  if(route.startsWith('/hub-api/admin/')){
   requireAdmin(req);
   const known=GAMES.map(game=>game.slug);
   if(route==='/hub-api/admin/state'){
    return send(ctx,200,{
     version:VERSION,
     settings:custom.settings(),
     custom:custom.list({includeDrafts:true}),
     maxCustom:MAX_GAMES,
     stats:players.stats(),
     leaderboard:players.leaderboard('week',null,10),
     games:GAMES.map(game=>{const mount=mounts.get(game.slug);const view=mount.app.engine.view();return {slug:game.slug,title:game.title,event:game.event,mode:view.settings?.mode,paused:Boolean(view.settings?.paused),adminUrl:`/g/${game.slug}/${game.admin.path}`,login:game.admin.login,demoVisitors:mount.visitors.size(),cards:cardsOf(mount).length};})
    });
   }
   if(route==='/hub-api/admin/settings'){post();return send(ctx,200,{settings:custom.updateSettings(body,[...known,...custom.list({includeDrafts:true}).map(game=>game.id)])});}
   if(route==='/hub-api/admin/game'){post();return send(ctx,200,{game:custom.upsert(body,[...known,'hub','hub-api','hub-media','g','play','studio','admin','api'])});}
   if(route==='/hub-api/admin/game/delete'){post();custom.remove(body.id);return send(ctx,200,{ok:true});}
   if(route==='/hub-api/admin/game/cover'){post();return send(ctx,200,{game:custom.setCover(body.id,body.data)});}
   if(route==='/hub-api/admin/game/zip'){post();return send(ctx,200,{game:custom.installZip(body.id,body.data)});}
  }
  throw fail('Rute tidak ditemukan.',404);
 }

 function serveCustom(ctx,id,rest){
  const game=custom.get(id);
  if(!game||(!game.published&&!adminToken(ctx.req)))return notFound(ctx);
  if(game.type==='link'){ctx.res.writeHead(302,{Location:game.url,'Cache-Control':'no-store'});return ctx.res.end();}
  if(rest===undefined){ctx.res.writeHead(301,{Location:`/play/${id}/${ctx.url.search}`});return ctx.res.end();}
  let relative;
  try{relative=decodeURIComponent(rest);}catch{return notFound(ctx);}
  if(relative.endsWith('/'))relative+='index.html';
  const file=custom.sitePath(id,relative);
  const inject=html=>html.replace(/<\/head>/i,`<script defer src="/hub/js/inject.js" data-game="custom:${id}"></script></head>`);
  return serveFile(ctx,file,{csp:PLAY_CSP,cache:'public, max-age=3600',transform:relative.endsWith('index.html')?inject:null});
 }

 function serveStatic(ctx){
  let relative;
  try{relative=decodeURIComponent(ctx.pathname);}catch{return notFound(ctx);}
  if(relative.includes('..')||relative.includes('\\')||relative.includes('\0'))return notFound(ctx);
  const pages={'/':'index.html','/index.html':'index.html','/studio':'studio.html','/studio.html':'studio.html','/manifest.webmanifest':'manifest.webmanifest','/favicon.ico':'assets/brand/favicon.ico','/robots.txt':'robots.txt'};
  if(pages[relative])return serveFile(ctx,path.join(PUBLIC,pages[relative]));
  if(relative.startsWith('/hub/')&&/^\/hub\/[a-zA-Z0-9_./-]+$/.test(relative)){
   const key=`hub${relative.slice(4)}`;
   const lite=liteFor(mediaLite,key,ctx.req);
   if(lite)return serveFile(ctx,lite.file,{headers:{Vary:'Accept'}});
   return serveFile(ctx,path.join(PUBLIC,relative.slice(5)),{headers:mediaLite.has(key)?{Vary:'Accept'}:{}});
  }
  return notFound(ctx);
 }

 const server=http.createServer(async(req,res)=>{
  const ctx={req,res,cookies:[],vid:null,host:'',secure:false,pathname:'/',url:null};
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  try{
   ctx.host=String(req.headers.host||'').toLowerCase();
   if(!/^[a-z0-9.-]+(?::\d+)?$/.test(ctx.host))throw fail('Host tidak valid.',400);
   const bareHost=ctx.host.replace(/:\d+$/,'');
   if(local&&!['127.0.0.1','localhost'].includes(bareHost))throw fail('Host tidak diizinkan.',403);
   if(hostAllow.size&&!hostAllow.has(bareHost))throw fail('Host tidak diizinkan.',403);
   ctx.secure=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https'||String(req.headers.origin||'').startsWith('https://');
   ctx.url=new URL(req.url,`http://${ctx.host}`);
   ctx.pathname=ctx.url.pathname;
   ctx.vid=cookieValue(req,VISITOR_COOKIE);
   if(!/^[a-f0-9]{32}$/.test(ctx.vid||'')){
    ctx.vid=crypto.randomBytes(16).toString('hex');
    ctx.cookies.push(`${VISITOR_COOKIE}=${ctx.vid}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${ctx.secure?'; Secure':''}`);
   }
   const gameMatch=ctx.pathname.match(/^\/g\/([a-z0-9-]+)(\/.*)?$/);
   if(gameMatch){
    const mount=mounts.get(gameMatch[1]);
    if(!mount||custom.settings().hidden.includes(gameMatch[1])&&!adminToken(req))return notFound(ctx);
    if(!gameMatch[2]){res.writeHead(301,{Location:`/g/${gameMatch[1]}/${ctx.url.search}`,...(ctx.cookies.length?{'Set-Cookie':ctx.cookies}:{})});return res.end();}
    return await proxy(ctx,mount,gameMatch[2]+ctx.url.search);
   }
   if(ctx.pathname.startsWith('/hub-api/'))return await hubApi(ctx);
   const playMatch=ctx.pathname.match(/^\/play\/([a-z0-9-]+)(\/.*)?$/);
   if(playMatch)return serveCustom(ctx,playMatch[1],playMatch[2]);
   if(ctx.pathname.startsWith('/hub-media/'))return serveFile(ctx,custom.mediaPath(ctx.pathname.slice(11)));
   return serveStatic(ctx);
  }catch(error){
   if(res.headersSent){res.end();return;}
   const status=error.status||500;
   if(status>=500&&!error.status)console.error(error);
   send(ctx,status,{error:error.status?error.message:'Kesalahan server.'});
  }
 });

 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
 const address=server.address();
 return {
  server,players,custom,mounts,dataDir,pinConfigured:pinValid,
  origin:`http://127.0.0.1:${address.port}`,
  async close(){
   players.flush();
   await new Promise(resolve=>server.close(resolve));
   for(const mount of mounts.values())await mount.app.close();
  }
 };
}

/* Mulai otomatis saat dijalankan langsung (npm start) atau dimuat pembungkus
   hosting dari luar proyek (runner Hostinger memakai require(), jadi
   require.main !== module). Tes dan skrip proyek (tests/, scripts/) hanya
   memakai createHub, tanpa ikut menyalakan server produksi kedua. */
function shouldAutostart(){
 if(require.main===module)return true;
 if(process.env.GAMYSUF_NO_AUTOSTART==='1'||process.env.NODE_ENV==='test'||process.execArgv.includes('--test'))return false;
 const main=require.main?.filename||'';
 return !['tests','scripts'].some(dir=>main.startsWith(path.join(ROOT,dir)+path.sep));
}

if(shouldAutostart()){
 const local=process.argv.includes('--local');
 const adminPin=process.env.ADMIN_PIN||(local?'123456':null);
 createHub({
  local,
  port:Number(process.env.PORT)||(local?4400:3000),
  host:local?'127.0.0.1':(process.env.HOST||'0.0.0.0'),
  dataDir:process.env.GAMYSUF_DATA_DIR||(local?path.join(ROOT,'.local-data'):path.join(os.homedir(),'gamysuf-data')),
  adminPin,
  allowedHosts:process.env.ALLOWED_HOSTS||null
 }).then(hub=>{
  const address=hub.server.address();
  console.log(`Gamysuf Arcade v${VERSION} (${local?'lokal':'cloud'}) siap di port ${address.port} · data: ${hub.dataDir}${hub.pinConfigured?'':' · PERINGATAN: ADMIN_PIN belum diisi/valid, Studio dan dashboard game terkunci'}${local?` · PIN lokal: ${adminPin}`:''}`);
  const stop=()=>{try{hub.players.flush();}catch{}process.exit(0);};
  process.on('SIGTERM',stop);
  process.on('SIGINT',stop);
 }).catch(error=>{console.error(error);process.exitCode=1;});
}

module.exports={createHub};
