'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {promisify}=require('node:util');
const {Store}=require('./core/store.cjs');
const {Engine,fail}=require('./core/engine.cjs');
const {defaultState}=require('./core/catalog.cjs');
const scrypt=promisify(crypto.scrypt);
/** @param {unknown} value @returns {string} */
function csvCell(value){let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
/** @param {Array<object>} history @returns {string} */
function historyCsv(history){const fields=['id','requestId','at','username','activity','rewardTrack','controlMode','status','queueNumber','comfort','consent','recording','purchaseAmount','purchaseMinimum'];const headers=[...fields,'hostId','hostName','performer','rewardId','rewardName','value','terms'];return '\uFEFF'+headers.map(csvCell).join(',')+'\r\n'+history.filter(r=>!r.demo).map(r=>[...fields.map(k=>r[k]),r.host.id,r.host.name,r.host.performer,r.reward.id,r.reward.name,r.reward.value,r.reward.terms].map(csvCell).join(',')).join('\r\n');}
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; font-src 'self'; frame-src https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.wav':'audio/wav','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'video/webm','.json':'application/json; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.glb':'model/gltf-binary','.bin':'application/octet-stream','.ogg':'audio/ogg'};
async function pinRecord(pin){const salt=crypto.randomBytes(24).toString('hex');return {salt,hash:(await scrypt(pin,salt,64)).toString('hex')};}
async function checkPin(pin,record){if(typeof pin!=='string'||pin.length>32||!record)return false;const hash=await scrypt(pin,record.salt,64),stored=Buffer.from(record.hash,'hex');return stored.length===hash.length&&crypto.timingSafeEqual(stored,hash);}
async function createApp({dataDir=path.join(__dirname,'.local-data'),port=0,host='127.0.0.1',hosted=false,adminPin=null,allowedHosts=null,rng,now=()=>Date.now(),cloud=null}={}){
 const store=new Store(dataDir),engine=new Engine(store,{rng,now}),authFile=path.join(dataDir,'auth.json');
 let auth=fs.existsSync(authFile)?JSON.parse(fs.readFileSync(authFile,'utf8')):null;
 if(hosted){auth=typeof adminPin==='string'&&/^\d{4,12}$/.test(adminPin)?await pinRecord(adminPin):null;}
 else if(typeof adminPin==='string'&&/^\d{4,12}$/.test(adminPin)){auth=await pinRecord(adminPin);}
 else if(!cloud){auth=null;}
 const sessions=new Map(),allow=new Set(String(allowedHosts||'').split(',').map(s=>s.trim()).filter(Boolean));
 let attempts=0,lockUntil=0,origin='';
 function authenticate(req){const token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('domain_session='))?.slice(15),session=sessions.get(token);if(!session||session.expires<now()){sessions.delete(token);throw fail('Masukkan PIN petugas untuk melanjutkan.',401);}session.expires=now()+(cloud?.sessionTtlMs||8*60*60*1000);return token;}
 function staff(req){try{authenticate(req);return true;}catch{return false;}}
 const visitors=new Map();
 const engineFor=req=>{
  if(staff(req))return engine;
  if(cloud)return cloud.engineFor(req,engine);
  let token=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('domain_visitor='))?.slice(15);
  if(!/^[a-f0-9]{32}$/.test(token||'')){token=crypto.randomBytes(16).toString('hex');req.domainVisitor=token;}
  let slot=visitors.get(token);
  if(!slot||(slot.revision!==engine.state.revision&&!slot.engine.state.pending)){
   const state=structuredClone(engine.state);state.settings.mode='demo';state.settings.paused=false;state.settings.sessionOpen=true;state.rewards=defaultState().rewards;state.hosts=defaultState().hosts;state.pending=null;state.history=[];state.audit=[];
   const memory={state,commit(next){this.state=structuredClone(next);}};
   slot={engine:new Engine(memory,{rng,now}),revision:engine.state.revision};visitors.set(token,slot);
   if(visitors.size>3000)visitors.delete(visitors.keys().next().value);
  }
  return slot.engine;
 };
 const app=http.createServer(async(req,res)=>{
  function send(status,data,headers={}){if(req.domainVisitor)headers['Set-Cookie']='domain_visitor='+req.domainVisitor+'; HttpOnly; SameSite=Strict; Path=/api/';res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(typeof data==='string'?data:JSON.stringify(data));}
  res.setHeader('Content-Security-Policy',CSP);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
  try{
   const requestHost=String(req.headers.host||'').toLowerCase();
   if(!/^[a-z0-9.-]+(?::\d+)?$/.test(requestHost)||(!hosted&&!/^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/.test(requestHost))||(allow.size&&!allow.has(requestHost.replace(/:\d+$/,''))))throw fail('Host tidak diizinkan.',403);
   const url=new URL(req.url,'http://'+requestHost),route=url.pathname;
   if(route.startsWith('/api/')){
    if(!['GET','POST'].includes(req.method))throw fail('Metode tidak diizinkan.',405);
    let body={};
    const post=req.method==='POST';
    if(post){
     const allowedOrigins=hosted?['http://'+requestHost,'https://'+requestHost]:['http://'+requestHost];
     if(!allowedOrigins.includes(req.headers.origin)||req.headers['x-bpedia-client']!=='domainfestival'||!req.headers['content-type']?.startsWith('application/json'))throw fail('Permintaan harus berasal dari aplikasi.',403);
     const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32768)throw fail('Permintaan terlalu besar.',413);chunks.push(chunk);}
     try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw fail('JSON tidak valid.');}
     if(!body||typeof body!=='object'||Array.isArray(body))throw fail('Data permintaan tidak valid.');
    }
    const requirePost=()=>{if(!post)throw fail('Gunakan POST.',405);};
    if(route.startsWith('/api/admin/')&&route!=='/api/admin/health')authenticate(req);
    if(route==='/api/state')return send(200,engineFor(req).view());
    if(route==='/api/play'){requirePost();return send(200,engineFor(req).play(body.requestId,body));}
    if(route==='/api/result'){requirePost();return send(200,engineFor(req).acknowledge(body.id));}
    if(route==='/api/mode'){requirePost();authenticate(req);engine.updateSettings({mode:body.mode});return send(200,engine.view());}
    if(route==='/api/login'){
     requirePost();if(!auth)throw fail('PIN petugas belum dikonfigurasi pada hosting.',503);
     if(now()<lockUntil)throw fail('Tunggu 60 detik sebelum mencoba PIN kembali.',429);
     if(!await checkPin(body.pin,auth)){attempts++;if(attempts>=5){attempts=0;lockUntil=now()+60000;throw fail('Lima PIN salah. Coba lagi setelah 60 detik.',429);}throw fail('PIN tidak cocok.',401);}
     attempts=0;const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{expires:now()+(cloud?.sessionTtlMs||8*60*60*1000)});
     return send(200,{ok:true},{'Set-Cookie':`domain_session=${token}; HttpOnly; SameSite=Strict; Path=/api/${hosted&&req.headers.origin.startsWith('https:')?'; Secure':''}`});
    }
    if(route==='/api/logout'){requirePost();sessions.delete(authenticate(req));return send(200,{ok:true},{'Set-Cookie':'domain_session=; HttpOnly; SameSite=Strict; Path=/api/; Max-Age=0'});}
    if(route==='/api/admin/health')return send(200,{ok:true});
    if(route==='/api/admin/state')return send(200,engine.view(true));
    if(route==='/api/admin/settings'){requirePost();return send(200,engine.updateSettings(body));}
    if(route==='/api/admin/host'){requirePost();return send(200,engine.updateHost(body.id,body.patch));}
    if(route==='/api/admin/reward'){requirePost();return send(200,engine.updateReward(body.id,body.patch));}
    if(route==='/api/admin/ticket'){requirePost();return send(200,engine.resolve(body.id,body.action));}
    if(route==='/api/admin/export')return send(200,historyCsv(engine.state.history),{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="domain-festival-antrean.csv"'});
    if(route==='/api/admin/backup')return send(200,JSON.stringify(engine.state,null,2),{'Content-Disposition':'attachment; filename="domain-festival-backup.json"'});
    if(route==='/api/admin/pin')throw fail('PIN dikelola melalui environment hosting.',409);
    throw fail('Rute tidak ditemukan.',404);
   }
   if(!['GET','HEAD'].includes(req.method))throw fail('Metode tidak diizinkan.',405);
   let raw;try{raw=decodeURIComponent(route);}catch{throw fail('Path tidak valid.');}
   if(raw.includes('..')||raw.includes('\\')||raw.includes('\0'))throw fail('Path tidak valid.',403);
   const rel=raw==='/'?'index.html':raw.slice(1);
   if(!['index.html','admin.html'].includes(rel)&&!/^(assets|css|js)\/[a-zA-Z0-9_./-]+$/.test(rel))throw fail('Berkas tidak ditemukan.',404);
   const file=path.join(__dirname,rel),type=TYPES[path.extname(file)];
   if(!type||!fs.existsSync(file)||!fs.statSync(file).isFile())throw fail('Berkas tidak ditemukan.',404);
   const stat=fs.statSync(file),media=/^(?:audio|video)\//.test(type),cache=/\.(html|css|js)$/.test(file)?'no-cache':'public, max-age=3600';
   if(media&&req.headers.range){
    const match=String(req.headers.range).match(/^bytes=(\d*)-(\d*)$/);
    let start,end;
    if(match&&match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),stat.size-1):stat.size-1;}
    else if(match&&match[2]){const suffix=Number(match[2]);start=Math.max(0,stat.size-suffix);end=stat.size-1;}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=stat.size||end<start){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`,'Accept-Ranges':'bytes'});return res.end();}
    const length=end-start+1;
    res.writeHead(206,{'Content-Type':type,'Cache-Control':cache,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':String(length)});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
    return;
   }
   res.writeHead(200,{'Content-Type':type,'Cache-Control':cache,'Content-Length':String(stat.size),...(media?{'Accept-Ranges':'bytes'}:{})});
   if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch(error){if(!res.headersSent)send(error.status||500,{error:error.status?error.message:'Server belum bisa memproses. Coba lagi.'});else res.end();}
 });
 await new Promise((resolve,reject)=>{app.once('error',reject);app.listen(port,host,resolve);});
 origin=`http://127.0.0.1:${app.address()?.port||port||4370}`;
 return {server:app,engine,dataDir,origin,close:()=>new Promise(resolve=>app.close(resolve))};
}
if(require.main===module){const local=process.argv.includes('--local');createApp({hosted:!local,port:Number(process.env.PORT)||(local?4370:3000),host:local?'127.0.0.1':'0.0.0.0',adminPin:process.env.ADMIN_PIN||null,allowedHosts:process.env.BPEDIA_ALLOWED_HOSTS||null,dataDir:process.env.BPEDIA_DATA_DIR||(local?undefined:path.join(os.homedir(),'bipy-domain-festival-data'))}).then(app=>console.log(`Bipy Domain Festival: ${app.origin}`)).catch(error=>{console.error(error.message);process.exitCode=1;});}
module.exports={createApp,TYPES,historyCsv};




