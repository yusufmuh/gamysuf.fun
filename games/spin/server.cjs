'use strict';
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {promisify}=require('node:util');
const {Store}=require('./core/store.cjs');const {Engine,fail,validateState}=require('./core/engine.cjs');const {defaultState}=require('./core/catalog.cjs');
const {managementReport}=require('./core/report.cjs');
const {zipSync}=require('fflate');
const scrypt=promisify(crypto.scrypt),MAX_BODY=9*1024*1024,MAX_RESTORE=160*1024*1024;
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.wav':'audio/wav','.zip':'application/zip'};
async function passwordRecord(password){const salt=crypto.randomBytes(24).toString('hex');return {username:'johan123',salt,hash:(await scrypt(password,salt,64)).toString('hex')};}
async function checkPassword(password,record){if(typeof password!=='string'||password.length>200)return false;const hash=await scrypt(password,record.salt,64);const stored=Buffer.from(record.hash,'hex');return stored.length===hash.length&&crypto.timingSafeEqual(stored,hash);}
function csvCell(value){let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function historyCsv(history){return '\ufeff'+[['Kode','Waktu','Jalur hasil','Hadiah','Kategori','Status','Diserahkan pada','Kode promo'],...history.map(h=>[h.id,h.at,h.bonus?'Spin Wheel → bonus Beauty Box':h.game==='boxes'?'Beauty Box':'Spin Wheel',h.prize.fullName,h.prize.tier,h.status,h.claimedAt||'',h.prize.promoCode||''])].map(row=>row.map(csvCell).join(',')).join('\r\n');}
function decodeImage(data){
 if(typeof data!=='string'||data.length>6*1024*1024)throw fail('Foto maksimal 4 MB.');
 const m=data.match(/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/]+={0,2})$/);if(!m)throw fail('Format foto harus PNG, JPG, atau WebP.');
 const bytes=Buffer.from(m[2],'base64');if(bytes.length>4*1024*1024||bytes.length<12)throw fail('Ukuran foto tidak valid.');
 const ok=m[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!ok)throw fail('Isi file tidak cocok dengan format foto.');return {bytes,ext:m[1]==='jpeg'?'jpg':m[1]};
}
async function createApp({dataDir=path.join(__dirname,'.local-data','pesta-folka-2026'),port=0,rng,now,cloud=null}={}){
 const store=new Store(dataDir),engine=new Engine(store,{rng,now});const uploadDir=path.join(dataDir,'uploads');fs.mkdirSync(uploadDir,{recursive:true});
 const authFile=path.join(dataDir,'auth.json');let auth;
 if(fs.existsSync(authFile)){auth=JSON.parse(fs.readFileSync(authFile,'utf8'));if(!auth.salt||!auth.hash||auth.username!=='johan123')throw new Error('Konfigurasi admin rusak.');}
 else{auth=await passwordRecord('yusuf123');fs.writeFileSync(authFile,JSON.stringify(auth),{mode:0o600});}
 const sessions=new Map();let attempts=0,lockUntil=0,origin;
 const sessionTtl=cloud?.sessionTtlMs||30*60*1000;
 /* Mode cloud (Gamysuf Arcade): pengunjung publik bermain di mesin demo
    miliknya sendiri (cloud.engineFor), jadi stok asli tidak tersentuh dan
    pengunjung tidak saling bertabrakan. Hanya perangkat yang sudah masuk
    dashboard (booth) memakai mesin asli dan boleh mode resmi. */
 function isStaff(req){try{authenticate(req);return true;}catch{return false;}}
 const engineFor=req=>cloud&&!isStaff(req)?cloud.engineFor(req,engine):engine;
 function authenticate(req){const token=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('bpedia_session='))?.split('=')[1];const session=sessions.get(token);if(!session||session.expires<Date.now()){sessions.delete(token);throw fail('Sesi berakhir. Silakan masuk kembali.',401);}session.expires=Date.now()+sessionTtl;return token;}
 const app=http.createServer(async(req,res)=>{
  function send(status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(typeof data==='string'?data:JSON.stringify(data));}
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  try{
   if(req.headers.host!==new URL(origin).host)throw fail('Host tidak diizinkan.',403);
   const url=new URL(req.url,origin),route=url.pathname;
   if(route.startsWith('/api/')){
    if(!['GET','POST'].includes(req.method))throw fail('Metode tidak diizinkan.',405);
    let body={};if(req.method==='POST'){
     if(req.headers.origin!==origin||req.headers['x-bpedia-client']!=='spin-studio'||!req.headers['content-type']?.startsWith('application/json'))throw fail('Permintaan harus berasal dari aplikasi.',403);
     if(route.startsWith('/api/admin/'))authenticate(req);
     const limit=route==='/api/admin/restore'?MAX_RESTORE:MAX_BODY;
     let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>limit)throw fail('Berkas terlalu besar.',413);chunks.push(chunk);}try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw fail('JSON tidak valid.');}
    }
    const post=()=>{if(req.method!=='POST')throw fail('Gunakan POST.',405);};
    if(route==='/api/state')return send(200,engineFor(req).view());
    if(route==='/api/login'){
     post();if(Date.now()<lockUntil)throw fail('Terlalu banyak percobaan. Tunggu 60 detik.',429);
     const correct=await checkPassword(body.password,auth);
     if(!correct||body.username!==auth.username){attempts++;if(attempts>=5){lockUntil=Date.now()+60000;attempts=0;}throw fail('Username atau password salah.',401);}
     attempts=0;const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{expires:Date.now()+sessionTtl});return send(200,{username:auth.username},{'Set-Cookie':`bpedia_session=${token}; HttpOnly; SameSite=Strict; Path=/api/; Max-Age=28800`});
    }
    if(route==='/api/play-mode'){post();if(body.mode==='live')authenticate(req);return send(200,engineFor(req).selectMode(body.mode));}
    if(route==='/api/spin'){post();return send(200,engineFor(req).spin(body.requestId,body.game??'wheel',body.choice??null));}
    if(route==='/api/bonus'){post();return send(200,engineFor(req).openBox(body.roundId,body.requestId,body.choice));}
    if(route==='/api/result'){post();return send(200,engineFor(req).acknowledge(body.id));}
    const token=authenticate(req);
    if(route==='/api/logout'){post();sessions.delete(token);return send(200,{ok:true},{'Set-Cookie':'bpedia_session=; HttpOnly; SameSite=Strict; Path=/api/; Max-Age=0'});}
    if(route==='/api/admin/state')return send(200,engine.view(true));
    if(route==='/api/admin/settings'){post();return send(200,engine.updateSettings(body));}
    if(route==='/api/admin/prize'){post();return send(200,engine.updatePrize(body));}
    if(route==='/api/admin/stock'){post();return send(200,engine.adjust(body.id,body.delta));}
    if(route==='/api/admin/remove'){post();return send(200,engine.remove(body.id));}
    if(route==='/api/admin/claim'){post();return send(200,engine.claim(body.id));}
    if(route==='/api/admin/upload'){post();const {bytes,ext}=decodeImage(body.data);const name=`${crypto.randomUUID()}.${ext}`;fs.writeFileSync(path.join(uploadDir,name),bytes);return send(200,{image:'/uploads/'+name});}
    if(route==='/api/admin/password'){
     post();if(cloud)throw fail('Di Gamysuf Arcade, password diatur lewat ADMIN_PIN di Environment variables hosting.',409);if(!await checkPassword(body.currentPassword,auth))throw fail('Password saat ini salah.',401);
     if(typeof body.newPassword!=='string'||body.newPassword.length<8||body.newPassword.length>100)throw fail('Password baru minimal 8 dan maksimal 100 karakter.');auth=await passwordRecord(body.newPassword);fs.writeFileSync(authFile,JSON.stringify(auth),{mode:0o600});sessions.clear();return send(200,{ok:true});
    }
    if(route==='/api/admin/export')return send(200,historyCsv(store.state.history),{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="bpedia-riwayat.csv"'});
    if(route==='/api/admin/audio-list'){
     const audioDir=path.join(__dirname,'assets','audio');
     const scriptFile=path.join(audioDir,'voice-script.json');
     let script={};
     if(fs.existsSync(scriptFile)){try{script=JSON.parse(fs.readFileSync(scriptFile,'utf8'));}catch{}}
     const publicPhrase=(key,fallback)=>(script.phrases?.[key]||fallback).replaceAll('Byutipedia','Beautypedia').replaceAll('Biutipedia','Beautypedia');
     const items=[
      {id:'bpedia-bgm',title:'Beauty Pop BGM (Loop)',category:'BGM / Musik Latar',phrase:'Aransemen 120 BPM Pop Akustik: Rhodes, Nylon Guitar, Bass, Celeste, Drums',duration:'48 detik'},
      {id:'bpedia-jingle',title:'Jingle Beautypedia (Signature)',category:'Jingle Brand',phrase:publicPhrase('brand','Beautypedia! Cantikmu, ada di sini!'),duration:'9 detik'},
      {id:'bpedia-ringtone',title:'Ringtone Beautypedia (Theme)',category:'Ringtone / Extended',phrase:publicPhrase('brand','Beautypedia! Cantikmu, ada di sini!'),duration:'24 detik'},
      {id:'voice-brand',title:'Suara Slogan Brand',category:'Voiceover',phrase:publicPhrase('brand','Beautypedia! Cantikmu, ada di sini!'),duration:'3 detik'},
      {id:'voice-welcome',title:'Suara Sapaan Selamat Datang',category:'Voiceover',phrase:publicPhrase('welcome','Hai! Yuk, mampir ke booth Beautypedia!'),duration:'6 detik'},
      {id:'voice-spin',title:'Suara Aba-aba Putar Roda',category:'Voiceover',phrase:publicPhrase('spin','Ayo! Satu, dua, tiga! Putar!'),duration:'4 detik'},
      {id:'voice-mystery',title:'Suara Akses Mystery Box',category:'Voiceover',phrase:publicPhrase('mystery','Wow! Kamu dapat kotak misteri!'),duration:'4 detik'},
      {id:'voice-suspense',title:'Suara Membuka Kotak Hadiah',category:'Voiceover',phrase:publicPhrase('suspense','Eh, tunggu! Kira-kira apa isinya, ya?'),duration:'4 detik'},
      {id:'voice-win',title:'Suara Selamat Menang Hadiah',category:'Voiceover',phrase:publicPhrase('win','Yeay! Selamat, ya! Kamu dapat hadiah!'),duration:'4 detik'},
      {id:'voice-grand',title:'Suara Hadiah Utama (Jackpot)',category:'Voiceover',phrase:publicPhrase('grand','Wah! Selamat, ya! Kamu dapat hadiah utama!'),duration:'6 detik'},
      {id:'voice-bundle',title:'Suara Skincare Bundling',category:'Voiceover',phrase:publicPhrase('bundle','Asyik! Kamu dapat bundling!'),duration:'4 detik'},
      {id:'voice-zonk',title:'Suara Semangat Zonk',category:'Voiceover',phrase:publicPhrase('zonk','Yah... belum beruntung. Terima kasih sudah seru-seruan bareng kami!'),duration:'5 detik'}
     ].map(item=>{
      const mp3Path=path.join(audioDir,`${item.id}.mp3`),wavPath=path.join(audioDir,`${item.id}.wav`);
      return {
       ...item,
       mp3:`/assets/audio/${item.id}.mp3`,
       wav:`/assets/audio/${item.id}.wav`,
       mp3Size:fs.existsSync(mp3Path)?fs.statSync(mp3Path).size:0,
       wavSize:fs.existsSync(wavPath)?fs.statSync(wavPath).size:0
      };
     });
     return send(200,{items,voiceInfo:script});
    }
    if(route==='/api/admin/audio-zip'){
     const audioDir=path.join(__dirname,'assets','audio');
     const zipFiles={};
     if(fs.existsSync(audioDir)){
      for(const f of fs.readdirSync(audioDir)){
       if(['.mp3','.wav','.json','.txt'].includes(path.extname(f))){
        zipFiles[f]=fs.readFileSync(path.join(audioDir,f));
       }
      }
     }
     const zipBuffer=Buffer.from(zipSync(zipFiles));
     res.writeHead(200,{
      'Content-Type':'application/zip',
      'Content-Disposition':'attachment; filename="Bpedia-Audio-Studio-Package.zip"',
      'Content-Length':zipBuffer.length,
      'Cache-Control':'no-store'
     });
     return res.end(zipBuffer);
    }
    if(route==='/api/admin/report.xlsx'){
     const report=managementReport(store.state);res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="Bpedia-Laporan-Manajemen-${new Date().toISOString().slice(0,10)}.xlsx"`,'Content-Length':report.length,'Cache-Control':'no-store'});return res.end(report);
    }
    if(route==='/api/admin/backup'){
     const uploads={};for(const p of store.state.prizes){if(p.image.startsWith('/uploads/')){const name=path.basename(p.image),file=path.join(uploadDir,name);if(fs.existsSync(file))uploads[name]=fs.readFileSync(file).toString('base64');}}
     return send(200,JSON.stringify({format:'bpedia-backup-v2',event:store.state,uploads},null,2),{'Content-Disposition':'attachment; filename="bpedia-backup.json"'});
    }
    if(route==='/api/admin/restore'){
     post();if(body.confirmation!=='PULIHKAN')throw fail('Ketik PULIHKAN untuk melanjutkan.');const backup=body.backup;if(backup?.format!=='bpedia-backup-v2')throw fail('Cadangan tidak dikenali.');validateState(backup.event);engine.ensureMutable();const files=[];
     for(const [name,data] of Object.entries(backup.uploads||{})){if(!/^[a-z0-9-]+\.(png|jpg|webp)$/.test(name))throw fail('Nama foto tidak valid.');const ext=path.extname(name).slice(1);const result=decodeImage(`data:image/${ext==='jpg'?'jpeg':ext};base64,${data}`);files.push({name,bytes:result.bytes});}
     for(const p of backup.event.prizes)if(p.image.startsWith('/uploads/')&&!files.some(f=>'/uploads/'+f.name===p.image)&&!fs.existsSync(path.join(uploadDir,path.basename(p.image))))throw fail('Foto hadiah tidak disertakan dalam cadangan.');
     fs.copyFileSync(store.file,path.join(dataDir,`before-restore-${Date.now()}.json`));for(const f of files)fs.writeFileSync(path.join(uploadDir,f.name),f.bytes);return send(200,engine.restore(backup.event));
    }
    if(route==='/api/admin/reset'){
     post();engine.ensureMutable();if(body.confirmation!=='RESET EVENT')throw fail('Ketik RESET EVENT untuk memulai acara baru.');fs.copyFileSync(store.file,path.join(dataDir,`archive-${Date.now()}.json`));const n=defaultState();n.revision=store.state.revision;engine.commit(n,'event-reset');engine.selectedMode=null;return send(200,engine.view(true));
    }
    throw fail('Rute tidak ditemukan.',404);
   }
   if(req.method!=='GET'&&req.method!=='HEAD')throw fail('Metode tidak diizinkan.',405);
   const raw=decodeURIComponent(route);if(raw.includes('..')||raw.includes('\\')||raw.includes('\0'))throw fail('Path tidak valid.',403);
   const rel=raw==='/'?'index.html':raw.slice(1);const allowed=['index.html','admin.html','maskot.png'].includes(rel)||/^(css|js|assets)\/[a-zA-Z0-9_./-]+$/.test(rel)||/^uploads\/[a-z0-9-]+\.(png|jpg|webp)$/.test(rel);
   if(!allowed)throw fail('Berkas tidak ditemukan.',404);
   const file=rel.startsWith('uploads/')?path.join(uploadDir,path.basename(rel)):path.join(__dirname,rel);
   if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw fail('Berkas tidak ditemukan.',404);
   const type=TYPES[path.extname(file)];if(!type)throw fail('Format tidak diizinkan.',403);
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch(e){if(!res.headersSent)send(e.status||500,{error:e.status?e.message:'Tidak dapat menyimpan / membaca data. Periksa ruang disk dan izin folder.'});else res.end();}
 });
 await new Promise((resolve,reject)=>{app.once('error',reject);app.listen(port,'127.0.0.1',resolve);});const p=app.address()?.port;origin=`http://127.0.0.1:${p||(port||4300)}`;
 return {server:app,engine,origin,dataDir,close:()=>new Promise(resolve=>app.close(resolve))};
}
if(require.main===module)createApp({port:Number(process.env.PORT)||4317,dataDir:process.env.BPEDIA_DATA_DIR||undefined}).then(app=>console.log(`Bpedia Spin Studio: ${app.origin}`)).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={createApp,historyCsv,decodeImage};

