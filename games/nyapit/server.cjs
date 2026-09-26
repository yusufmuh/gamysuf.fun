'use strict';

const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const {Store}=require('./core/store.cjs');
const {Engine,fail,validateState,imagePattern}=require('./core/engine.cjs');
const {defaultState}=require('./core/catalog.cjs');
const {managementReport,historyCsv,leaderboardCsv}=require('./core/report.cjs');

const scrypt=promisify(crypto.scrypt);
const TYPES={
 '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8',
 '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml',
 '.ico':'image/x-icon','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.wav':'audio/wav',
 /* Dibutuhkan assets/audio/custom/manifest.json (daftar rekaman suara booth).
    Hanya berlaku untuk berkas statis di css/, js/, dan assets/; data event dan
    kredensial ada di direktori data, bukan di sini. */
 '.json':'application/json; charset=utf-8'
};
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const MAX_RESTORE_BYTES=256*1024*1024;
const jakartaDate=value=>{
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
};

async function pinRecord(pin){
 const salt=crypto.randomBytes(24).toString('hex');
 return {salt,hash:(await scrypt(pin,salt,64)).toString('hex')};
}

async function checkPin(pin,record){
 if(typeof pin!=='string'||pin.length>32||!record?.salt||!record?.hash)return false;
 const hash=await scrypt(pin,record.salt,64);
 const stored=Buffer.from(record.hash,'hex');
 return stored.length===hash.length&&crypto.timingSafeEqual(stored,hash);
}

function atomicJson(file,value){
 const tmp=file+'.tmp';
 const fd=fs.openSync(tmp,'w',0o600);
 try{fs.writeFileSync(fd,JSON.stringify(value,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 fs.renameSync(tmp,file);
 try{fs.chmodSync(file,0o600);}catch{}
}

function imageDimensions(bytes,type){
 let width=0,height=0;
 if(type==='png'){
  if(bytes.length<57||bytes.subarray(12,16).toString('ascii')!=='IHDR'||bytes.readUInt32BE(8)!==13)throw fail('Struktur PNG tidak valid.');
  width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);
  let offset=8,hasData=false,hasEnd=false;
  while(offset+12<=bytes.length){
   const length=bytes.readUInt32BE(offset),end=offset+12+length;
   if(length>bytes.length||end>bytes.length)throw fail('Struktur PNG tidak valid.');
   const chunk=bytes.toString('ascii',offset+4,offset+8);
   let crc=0xffffffff;
   for(let i=offset+4;i<offset+8+length;i++){
    crc^=bytes[i];
    for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
   }
   if(((crc^0xffffffff)>>>0)!==bytes.readUInt32BE(offset+8+length))throw fail('Checksum PNG tidak valid.');
   if(chunk==='IDAT')hasData=true;
   if(chunk==='IEND'){if(length!==0||end!==bytes.length)throw fail('Struktur PNG tidak valid.');hasEnd=true;break;}
   offset=end;
  }
  if(!hasData||!hasEnd)throw fail('Data gambar PNG tidak lengkap.');
 }else if(type==='jpeg'){
  let offset=2;
  const sof=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  while(offset+4<=bytes.length){
   while(offset<bytes.length&&bytes[offset]!==0xff)offset++;
   while(offset<bytes.length&&bytes[offset]===0xff)offset++;
   if(offset>=bytes.length)break;
   const marker=bytes[offset++];
   if(marker===0xd8||marker===0xd9||marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
   if(offset+2>bytes.length)break;
   const length=bytes.readUInt16BE(offset);
   if(length<2||offset+length>bytes.length)break;
   if(sof.has(marker)){
    if(length<7)break;
    height=bytes.readUInt16BE(offset+3);width=bytes.readUInt16BE(offset+5);break;
   }
   offset+=length;
  }
  if(!width||!height)throw fail('Struktur JPG tidak valid.');
 }else if(type==='webp'){
  if(bytes.length<30||bytes.readUInt32LE(4)+8>bytes.length)throw fail('Struktur WebP tidak valid.');
  const chunk=bytes.subarray(12,16).toString('ascii');
  if(chunk==='VP8X'){
   width=1+bytes.readUIntLE(24,3);height=1+bytes.readUIntLE(27,3);
  }else if(chunk==='VP8L'&&bytes[20]===0x2f){
   width=1+bytes[21]+((bytes[22]&0x3f)<<8);height=1+((bytes[22]&0xc0)>>6)+(bytes[23]<<2)+((bytes[24]&0x0f)<<10);
  }else if(chunk==='VP8 '&&bytes.subarray(23,26).equals(Buffer.from([0x9d,0x01,0x2a]))){
   width=bytes.readUInt16LE(26)&0x3fff;height=bytes.readUInt16LE(28)&0x3fff;
  }else throw fail('Struktur WebP tidak valid.');
 }
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192||width*height>40000000)throw fail('Dimensi foto tidak valid.');
 return {width,height};
}

function decodeImage(data){
 if(typeof data!=='string'||data.length>6*1024*1024)throw fail('Foto maksimal 4 MB.');
 const match=data.match(/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/]+={0,2})$/);
 if(!match)throw fail('Format foto harus PNG, JPG, atau WebP.');
 const bytes=Buffer.from(match[2],'base64');
 if(bytes.length>4*1024*1024||bytes.length<12)throw fail('Ukuran foto tidak valid.');
 const isPng=bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
 const isJpeg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9;
 const isWebp=bytes.subarray(0,4).toString('ascii')==='RIFF'&&bytes.subarray(8,12).toString('ascii')==='WEBP';
 if((match[1]==='png'&&!isPng)||(match[1]==='jpeg'&&!isJpeg)||(match[1]==='webp'&&!isWebp))throw fail('Isi berkas foto tidak sesuai format.');
 const dimensions=imageDimensions(bytes,match[1]);
 return {bytes,ext:match[1]==='jpeg'?'jpg':match[1],...dimensions};
}

async function createApp({dataDir=path.join(__dirname,'.local-data','cozzone-2026'),port=0,rng,now,cloud=null}={}){
 const clock=now||(()=>Date.now());
 const store=new Store(dataDir);
 const engine=new Engine(store,{rng,now:clock});
 const uploadDir=path.join(dataDir,'uploads');
 fs.mkdirSync(uploadDir,{recursive:true});
 const authFile=path.join(dataDir,'auth.json');
 let auth;
 if(fs.existsSync(authFile)){
  try{auth=JSON.parse(fs.readFileSync(authFile,'utf8'));}catch{throw new Error('Konfigurasi auth rusak.');}
  if(!auth.salt||!auth.hash)throw new Error('Konfigurasi auth rusak.');
 }else{
  auth=await pinRecord('1234');
  atomicJson(authFile,auth);
 }
 const sessions=new Map();
 let attempts=0,lockUntil=0,origin;

 function referencedUploads(state){
  const paths=[...state.prizes.map(prize=>prize.image),...state.history.map(result=>result.prize?.image),state.pending?.prize?.image];
  return [...new Set(paths.filter(image=>typeof image==='string'&&image.startsWith('/uploads/')).map(image=>path.basename(image)))];
 }

 function requiredUpload(name){
  const file=path.join(uploadDir,name);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw fail(`Foto ${name} tidak ditemukan. Periksa cadangan dan folder uploads.`,409);
  return file;
 }

 function ensureImageExists(image){
  if(typeof image!=='string'||!imagePattern.test(image))throw fail('Path foto hadiah tidak valid.');
  const file=image.startsWith('/uploads/')?path.join(uploadDir,path.basename(image)):path.join(__dirname,image.slice(1));
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw fail('Foto hadiah tidak ditemukan. Unggah foto yang benar terlebih dahulu.');
 }

 function removeStage(stageDir,parentDir){
  const resolved=path.resolve(stageDir),parent=path.resolve(parentDir);
  if(!resolved.startsWith(parent+path.sep))throw new Error('Direktori sementara di luar lokasi data.');
  fs.rmSync(resolved,{recursive:true,force:true});
 }

 function archiveSnapshot(label){
  const archiveDir=path.join(dataDir,'archives',`${label}-${clock()}-${crypto.randomBytes(3).toString('hex')}`);
  const stageDir=archiveDir+'.tmp',archiveUploads=path.join(stageDir,'uploads');
  fs.mkdirSync(archiveUploads,{recursive:true});
  try{
   fs.copyFileSync(store.file,path.join(stageDir,'event.json'));
   for(const name of referencedUploads(store.state))fs.copyFileSync(requiredUpload(name),path.join(archiveUploads,name));
   fs.renameSync(stageDir,archiveDir);
  }catch(error){removeStage(stageDir,path.join(dataDir,'archives'));throw error;}
  return archiveDir;
 }

 const sessionTtl=cloud?.sessionTtlMs||30*60*1000;
 /* Mode cloud (Gamysuf Arcade): pengunjung publik bermain di mesin demo
    miliknya sendiri (cloud.engineFor), jadi stok asli tidak tersentuh dan
    pengunjung tidak saling bertabrakan. Hanya perangkat yang sudah masuk
    dashboard (booth) memakai mesin asli dan boleh mode resmi. */
 function isStaff(req){try{authenticate(req);return true;}catch{return false;}}
 const engineFor=req=>cloud&&!isStaff(req)?cloud.engineFor(req,engine):engine;

 function authenticate(req){
  const token=req.headers.cookie?.split(';').map(value=>value.trim()).find(value=>value.startsWith('nyapit_session='))?.split('=')[1];
  const session=sessions.get(token);
  if(!session||session.expires<clock()){
   if(token)sessions.delete(token);
   throw fail('Sesi berakhir. Masukkan PIN kembali.',401);
  }
  session.expires=clock()+sessionTtl;
  return token;
 }

 for(const name of referencedUploads(store.state))requiredUpload(name);

 const app=http.createServer(async(req,res)=>{
  function send(status,data,headers={}){
   res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
   res.end(typeof data==='string'?data:JSON.stringify(data));
  }
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Content-Security-Policy',CSP);
  try{
   if(req.headers.host!==new URL(origin).host)throw fail('Host tidak diizinkan.',403);
   const url=new URL(req.url,origin);
   const route=url.pathname;
   if(route.startsWith('/api/')){
    if(!['GET','POST'].includes(req.method))throw fail('Metode tidak diizinkan.',405);
    const isPost=req.method==='POST';
    const isAdmin=route.startsWith('/api/admin/');
    let token=null;
    if(isAdmin&&route!=='/api/admin/health')token=authenticate(req);
    let body={};
    if(isPost){
     if(req.headers.origin!==origin||req.headers['x-bpedia-client']!=='nyapit'||!req.headers['content-type']?.startsWith('application/json'))throw fail('Permintaan harus berasal dari aplikasi.',403);
      const maxBytes=route==='/api/admin/restore'?MAX_RESTORE_BYTES:['/api/admin/upload','/api/admin/prize/save'].includes(route)?6*1024*1024:1024*1024;
     let bytes=0;const chunks=[];
     for await(const chunk of req){bytes+=chunk.length;if(bytes>maxBytes)throw fail('Berkas terlalu besar.',413);chunks.push(chunk);}
     try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw fail('JSON tidak valid.');}
    }
    const post=()=>{if(!isPost)throw fail('Gunakan POST.',405);};

    if(route==='/api/state')return send(200,engineFor(req).view());
    if(route==='/api/play'){post();return send(200,engineFor(req).play(body.requestId,body.username));}
    if(route==='/api/result'){post();return send(200,engineFor(req).acknowledge(body.id));}
    /* Booth staff flip demo/live from the lobby without the admin PIN.  Only the
       mode key is accepted here, and the reply is the public view: updateSettings
       returns the admin view, which carries history and audit. */
    if(route==='/api/mode'){
     post();
     if(!['demo','live'].includes(body.mode))throw fail('Mode tidak dikenal.');
     if(cloud&&!isStaff(req))throw fail('Mode resmi hanya bisa diganti di perangkat booth yang sudah masuk dashboard petugas.',403);
     engine.updateSettings({mode:body.mode});
     return send(200,engine.view());
    }
    if(route==='/api/login'){
     post();
     if(clock()<lockUntil)throw fail('Terlalu banyak percobaan salah. Tunggu 60 detik.',429);
     const ok=await checkPin(body.pin,auth);
     if(!ok){
      attempts++;
      if(attempts>=5){lockUntil=clock()+60000;attempts=0;throw fail('Lima PIN salah. Akses dikunci selama 60 detik.',429);}
      throw fail(`PIN salah. Sisa percobaan: ${5-attempts}.`,401);
     }
     attempts=0;lockUntil=0;
     const token=crypto.randomBytes(32).toString('hex');
     sessions.set(token,{expires:clock()+sessionTtl});
     return send(200,{ok:true},{'Set-Cookie':`nyapit_session=${token}; HttpOnly; SameSite=Strict; Path=/api/`});
    }

    if(route==='/api/admin/health')return send(200,{ok:true});
    if(route==='/api/logout'){post();token=authenticate(req);sessions.delete(token);return send(200,{ok:true},{'Set-Cookie':'nyapit_session=; HttpOnly; SameSite=Strict; Path=/api/; Max-Age=0'});}
    if(route==='/api/admin/state')return send(200,engine.view(true));
    if(route==='/api/admin/settings'){post();return send(200,engine.updateSettings(body));}
    if(route==='/api/admin/stock'){post();return send(200,engine.stock(body.id,body.stock));}
    if(route==='/api/admin/prize/create'){post();return send(200,engine.createPrize(body));}
    if(route==='/api/admin/prize/save'){
     post();
     let image=null,file=null;
     if(body.data){const decoded=decodeImage(body.data);const name=`${crypto.randomUUID()}.${decoded.ext}`;file=path.join(uploadDir,name);fs.writeFileSync(file,decoded.bytes,{mode:0o600});image='/uploads/'+name;}
     try{return send(200,engine.savePrize(body.id||null,body.patch,image));}catch(error){if(file)try{fs.unlinkSync(file);}catch{}throw error;}
    }
     if(route==='/api/admin/prize/update'){post();if(body.patch&&Object.hasOwn(body.patch,'image'))ensureImageExists(body.patch.image);return send(200,engine.updatePrize(body.id,body.patch));}
    if(route==='/api/admin/prize/delete'){post();return send(200,engine.deletePrize(body.id));}
    if(route==='/api/admin/claim'){post();return send(200,engine.claim(body.id));}
    if(route==='/api/admin/pin'){
     post();
     if(cloud)throw fail('Di Gamysuf Arcade, PIN diatur lewat ADMIN_PIN di Environment variables hosting.',409);
     if(!await checkPin(body.currentPin,auth))throw fail('PIN saat ini salah.',401);
     if(typeof body.newPin!=='string'||!/^\d{4,12}$/.test(body.newPin))throw fail('PIN baru harus 4-12 digit angka.');
      const nextAuth=await pinRecord(body.newPin);
      atomicJson(authFile,nextAuth);
      auth=nextAuth;
     sessions.clear();
     return send(200,{ok:true},{'Set-Cookie':'nyapit_session=; HttpOnly; SameSite=Strict; Path=/api/; Max-Age=0'});
    }
    if(route==='/api/admin/upload'){
     post();
     const {bytes,ext}=decodeImage(body.data);
     const name=`${crypto.randomUUID()}.${ext}`;
     const file=path.join(uploadDir,name);
     fs.writeFileSync(file,bytes,{mode:0o600});
     try{
      const updated=engine.updatePrize(body.id,{image:'/uploads/'+name,imageChecked:false});
      return send(200,updated);
     }catch(error){try{fs.unlinkSync(file);}catch{}throw error;}
    }
    if(route==='/api/admin/export')return send(200,historyCsv(store.state.history),{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="bpedia-nyapit-riwayat.csv"'});
    if(route==='/api/admin/leaderboard.csv')return send(200,leaderboardCsv(store.state.history),{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="bpedia-nyapit-peringkat.csv"'});
    if(route==='/api/admin/report.xlsx'){
     const buffer=managementReport(store.state);
     res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="Bpedia-Nyapit-${jakartaDate(clock())}.xlsx"`,'Content-Length':buffer.length,'Cache-Control':'no-store'});
     return res.end(buffer);
    }
    if(route==='/api/admin/backup'){
     const uploads={};
      for(const name of referencedUploads(store.state))uploads[name]=fs.readFileSync(requiredUpload(name)).toString('base64');
     return send(200,JSON.stringify({format:'bpedia-nyapit-backup-v1',event:store.state,uploads},null,2),{'Content-Disposition':'attachment; filename="nyapit-backup.json"'});
    }
    if(route==='/api/admin/restore'){
     post();
     if(body.confirmation!=='PULIHKAN')throw fail('Ketik PULIHKAN untuk melanjutkan.');
     const backup=body.backup;
     if(backup?.format!=='bpedia-nyapit-backup-v1')throw fail('Cadangan tidak dikenali.');
     validateState(backup.event);engine.ensureMutable();
      const provided=backup.uploads||{},required=new Set(referencedUploads(backup.event));
     for(const name of required)if(!Object.hasOwn(provided,name))throw fail(`Foto ${name} tidak ada di cadangan.`);
     const restoredUploads=[];
     for(const [name,data] of Object.entries(provided)){
      if(!/^[a-z0-9-]+\.(?:png|jpg|webp)$/.test(name))throw fail('Nama foto cadangan tidak valid.');
      const ext=path.extname(name).slice(1);
      const decoded=decodeImage(`data:image/${ext==='jpg'?'jpeg':ext};base64,${data}`);
      restoredUploads.push([name,decoded.bytes]);
     }
     const stageDir=path.join(dataDir,`.restore-${crypto.randomUUID()}`),moved=[];
     fs.mkdirSync(stageDir,{recursive:false});
     try{
      for(const [name,bytes] of restoredUploads)fs.writeFileSync(path.join(stageDir,name),bytes,{mode:0o600});
      for(const [name,bytes] of restoredUploads){
       const target=path.join(uploadDir,name);
       if(fs.existsSync(target)){
        if(!crypto.timingSafeEqual(crypto.createHash('sha256').update(fs.readFileSync(target)).digest(),crypto.createHash('sha256').update(bytes).digest()))throw fail(`Foto ${name} berbeda dari berkas lokal dengan nama sama.`,409);
        continue;
       }
       fs.renameSync(path.join(stageDir,name),target);moved.push(target);
      }
      archiveSnapshot('before-restore');
      return send(200,engine.restore(backup.event));
     }catch(error){
      for(const target of moved)try{fs.unlinkSync(target);}catch{}
      throw error;
      }finally{removeStage(stageDir,dataDir);}
    }
    if(route==='/api/admin/reset'){
     post();engine.ensureMutable();
     if(body.confirmation!=='RESET EVENT')throw fail('Ketik RESET EVENT untuk memulai acara baru.');
     archiveSnapshot('event');
     const next=defaultState();next.revision=store.state.revision;
     return send(200,engine.commit(next,'reset'));
    }
    throw fail('Rute tidak ditemukan.',404);
   }

   if(!['GET','HEAD'].includes(req.method))throw fail('Metode tidak diizinkan.',405);
   const raw=decodeURIComponent(route);
   if(raw.includes('..')||raw.includes('\\')||raw.includes('\0'))throw fail('Path tidak valid.',403);
   const rel=raw==='/'?'index.html':raw.slice(1);
   const allowed=['index.html','admin.html','rancangan maskot.png','logo.png'].includes(rel)||/^(css|js|assets)\/[a-zA-Z0-9_./-]+$/.test(rel)||/^uploads\/[a-z0-9-]+\.(png|jpg|webp)$/.test(rel);
   if(!allowed)throw fail('Berkas tidak ditemukan.',404);
   const file=rel.startsWith('uploads/')?path.join(uploadDir,path.basename(rel)):path.join(__dirname,rel);
   if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw fail('Berkas tidak ditemukan.',404);
   const type=TYPES[path.extname(file).toLowerCase()];
   if(!type)throw fail('Format tidak diizinkan.',403);
   res.writeHead(200,{'Content-Type':type,'Cache-Control':/\.(?:html|css|js)$/.test(rel)?'no-cache':'public, max-age=3600'});
   if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch(error){
   if(!res.headersSent)send(error.status||500,{error:error.status?error.message:'Kesalahan server.'});else res.end();
  }
 });

 await new Promise((resolve,reject)=>{app.once('error',reject);app.listen(port,'127.0.0.1',resolve);});
 origin=`http://127.0.0.1:${app.address().port}`;
 return {server:app,engine,origin,dataDir,close:()=>new Promise(resolve=>app.close(resolve))};
}

if(require.main===module){
 createApp({port:Number(process.env.PORT)||4320,dataDir:process.env.BPEDIA_DATA_DIR||undefined})
  .then(app=>console.log(`Bpedia Nyapit: ${app.origin}`))
  .catch(error=>{console.error(error.message);process.exitCode=1;});
}

module.exports={createApp,decodeImage,checkPin,imageDimensions};
