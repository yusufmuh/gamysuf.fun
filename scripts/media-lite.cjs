'use strict';

/* npm run media:lite
   Membuat versi ringan aset game untuk pemain online di hub/media-lite/:
   - audio : WAV → MP3 (80 kbps mono / 128 kbps stereo) dengan lamejs;
   - gambar: PNG/JPG ≥ 60 KB → WebP (kualitas 0,86) dengan Chromium headless.
   Gateway menyajikan versi ringan di URL yang sama selama checksum berkas
   sumber cocok dengan manifest.json (WebP hanya untuk browser yang mengirim
   Accept: image/webp). Kode game tidak berubah. Jalankan ulang setelah
   npm run sync bila aset game berubah. Tanpa Playwright, bagian gambar
   dilewati dan hasil gambar lama tetap dipakai. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {execSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const out=path.join(root,'hub','media-lite');
const MONO_KBPS=80,STEREO_KBPS=128,WEBP_QUALITY=.86,IMAGE_MIN_BYTES=60*1024;
const sha1=bytes=>crypto.createHash('sha1').update(bytes).digest('hex');

function loadLame(){
 let file;
 try{file=require.resolve('@breezystack/lamejs');}
 catch{throw new Error('Encoder MP3 belum terpasang. Jalankan: npm install (devDependency @breezystack/lamejs).');}
 /* Paket hanya menyediakan build IIFE (var lamejs=...), jadi dijalankan di
    konteks global, bukan lewat require. */
 vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
 return globalThis.lamejs;
}

function loadPlaywright(){
 try{return require('playwright');}catch{}
 try{return require(path.join(execSync('npm root -g',{encoding:'utf8'}).trim(),'playwright'));}catch{}
 return null;
}

function readWav(buffer){
 if(buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WAVE')throw new Error('bukan WAV RIFF');
 let offset=12,format=null,data=null;
 while(offset+8<=buffer.length){
  const id=buffer.toString('ascii',offset,offset+4),size=buffer.readUInt32LE(offset+4);
  if(id==='fmt ')format={code:buffer.readUInt16LE(offset+8),channels:buffer.readUInt16LE(offset+10),rate:buffer.readUInt32LE(offset+12),bits:buffer.readUInt16LE(offset+22)};
  if(id==='data')data=buffer.subarray(offset+8,Math.min(buffer.length,offset+8+size));
  offset+=8+size+(size%2);
 }
 if(!format||!data)throw new Error('chunk fmt/data tidak ada');
 if(format.code!==1||format.bits!==16||format.channels>2)throw new Error(`format tidak didukung (${format.code}/${format.bits}-bit/${format.channels}ch)`);
 const aligned=new Uint8Array(data.length);
 aligned.set(data);
 return {...format,samples:new Int16Array(aligned.buffer,0,Math.floor(aligned.length/2))};
}

function encodeMp3(lamejs,wav){
 const encoder=new lamejs.Mp3Encoder(wav.channels,wav.rate,wav.channels===2?STEREO_KBPS:MONO_KBPS);
 const chunks=[],block=1152;
 const push=frame=>{if(frame.length)chunks.push(Buffer.from(frame));};
 if(wav.channels===1){
  for(let i=0;i<wav.samples.length;i+=block)push(encoder.encodeBuffer(wav.samples.subarray(i,i+block)));
 }else{
  const frames=Math.floor(wav.samples.length/2),left=new Int16Array(frames),right=new Int16Array(frames);
  for(let i=0;i<frames;i++){left[i]=wav.samples[i*2];right[i]=wav.samples[i*2+1];}
  for(let i=0;i<frames;i+=block)push(encoder.encodeBuffer(left.subarray(i,i+block),right.subarray(i,i+block)));
 }
 push(encoder.flush());
 return Buffer.concat(chunks);
}

function walk(dir,pattern,base=dir,list=[]){
 if(!fs.existsSync(dir))return list;
 for(const name of fs.readdirSync(dir).sort()){
  const full=path.join(dir,name);
  if(fs.statSync(full).isDirectory())walk(full,pattern,base,list);
  else if(pattern.test(name))list.push(path.relative(base,full).split(path.sep).join('/'));
 }
 return list;
}

/* Kunci manifest = "<slug>/<path URL di dalam game>" (mis. drop/assets/audio/x.wav)
   atau "hub/assets/..." untuk gambar beranda. */
function sources(){
 const list=[];
 for(const slug of fs.readdirSync(path.join(root,'games')).sort()){
  const assets=path.join(root,'games',slug,'assets');
  for(const rel of walk(assets,/\.wav$/i)){
   const file=path.join(assets,rel);
   if(!fs.existsSync(file.replace(/\.wav$/i,'.mp3')))list.push({key:`${slug}/assets/${rel}`,file,kind:'audio'});
  }
  for(const rel of walk(assets,/\.(?:png|jpe?g)$/i)){
   const file=path.join(assets,rel);
   if(fs.statSync(file).size>=IMAGE_MIN_BYTES)list.push({key:`${slug}/assets/${rel}`,file,kind:'image'});
  }
 }
 /* Gambar beranda hub (avatar, Bipy, sampul) di /hub/assets/... */
 const hubAssets=path.join(root,'hub','public','assets');
 for(const rel of walk(hubAssets,/\.(?:png|jpe?g)$/i)){
  const file=path.join(hubAssets,rel);
  if(fs.statSync(file).size>=IMAGE_MIN_BYTES)list.push({key:`hub/assets/${rel}`,file,kind:'image'});
 }
 return list;
}

(async()=>{
 const lamejs=loadLame();
 const manifestFile=path.join(out,'manifest.json');
 const previous=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):{};
 const manifest={};
 const stats={audio:[0,0,0],image:[0,0,0]};
 const images=[];
 for(const source of sources()){
  const bytes=fs.readFileSync(source.file);
  const hash=sha1(bytes);
  const target=source.key.replace(/\.[a-z0-9]+$/i,source.kind==='audio'?'.mp3':'.webp');
  const old=previous[source.key];
  if(old?.sha1===hash&&fs.existsSync(path.join(out,old.file))){manifest[source.key]=old;continue;}
  if(source.kind==='image'){images.push({...source,bytes,hash,target});continue;}
  try{
   const mp3=encodeMp3(lamejs,readWav(bytes));
   fs.mkdirSync(path.dirname(path.join(out,target)),{recursive:true});
   fs.writeFileSync(path.join(out,target),mp3);
   manifest[source.key]={sha1:hash,file:target,type:'audio/mpeg',sourceBytes:bytes.length,bytes:mp3.length};
  }catch(error){console.warn(`lewati ${source.key}: ${error.message}`);}
 }

 if(images.length){
  const playwright=loadPlaywright();
  if(!playwright)console.warn(`Playwright tidak ada: ${images.length} gambar baru dilewati.`);
  else{
   const browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
   const page=await browser.newPage();
   try{
    for(const image of images){
     const mime=/\.png$/i.test(image.file)?'image/png':'image/jpeg';
     const encoded=await page.evaluate(async({data,mime,quality})=>{
      const blob=new Blob([Uint8Array.from(atob(data),char=>char.charCodeAt(0))],{type:mime});
      const bitmap=await createImageBitmap(blob,{premultiplyAlpha:'none',colorSpaceConversion:'none'});
      const canvas=new OffscreenCanvas(bitmap.width,bitmap.height);
      canvas.getContext('2d').drawImage(bitmap,0,0);
      const webp=await canvas.convertToBlob({type:'image/webp',quality});
      if(webp.type!=='image/webp')return null;
      const view=new Uint8Array(await webp.arrayBuffer());
      let binary='';for(let i=0;i<view.length;i+=32768)binary+=String.fromCharCode(...view.subarray(i,i+32768));
      return btoa(binary);
     },{data:image.bytes.toString('base64'),mime,quality:WEBP_QUALITY});
     const webp=encoded&&Buffer.from(encoded,'base64');
     /* Simpan hanya bila jelas lebih kecil; sisanya tetap memakai berkas asli. */
     if(!webp||webp.length>image.bytes.length*.8){manifest[image.key]={sha1:image.hash,file:null,sourceBytes:image.bytes.length};continue;}
     fs.mkdirSync(path.dirname(path.join(out,image.target)),{recursive:true});
     fs.writeFileSync(path.join(out,image.target),webp);
     manifest[image.key]={sha1:image.hash,file:image.target,type:'image/webp',sourceBytes:image.bytes.length,bytes:webp.length};
    }
   }finally{await browser.close();}
  }
 }

 for(const [key,entry] of Object.entries(manifest)){
  if(!entry.file)continue;
  const kind=entry.type==='audio/mpeg'?'audio':'image';
  stats[kind][0]++;stats[kind][1]+=entry.sourceBytes;stats[kind][2]+=entry.bytes;
 }
 for(const [key,entry] of Object.entries(previous))if(entry?.file&&manifest[key]?.file!==entry.file)fs.rmSync(path.join(out,entry.file),{force:true});
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,1)+'\n');
 const mb=value=>(value/1048576).toFixed(1);
 console.log(`media-lite: audio ${stats.audio[0]} berkas ${mb(stats.audio[1])} → ${mb(stats.audio[2])} MB · gambar ${stats.image[0]} berkas ${mb(stats.image[1])} → ${mb(stats.image[2])} MB`);
})().catch(error=>{console.error(error.message||error);process.exitCode=1;});
