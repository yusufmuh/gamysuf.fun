'use strict';

/* Slot game tambahan yang dikelola dari Studio (tanpa ubah kode):
   - type 'static': unggah ZIP game HTML5 (index.html + aset), disajikan di /play/<id>/
   - type 'link'  : tautan ke game yang sudah online di tempat lain (https)
   ZIP diperiksa ketat: tanpa path traversal, hanya ekstensi web yang umum,
   batas jumlah dan ukuran berkas. Hanya pemegang ADMIN_PIN yang bisa mengunggah. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {unzipSync}=require('fflate');

const MAX_GAMES=6;
const MAX_FILES=4000;
const MAX_UNPACKED=200*1024*1024;
const ALLOWED_EXT=new Set(['html','htm','js','mjs','css','json','map','txt','md','xml','csv','png','jpg','jpeg','gif','webp','avif','svg','ico','bmp','mp3','wav','ogg','oga','m4a','aac','mp4','webm','woff','woff2','ttf','otf','wasm','data','bin','glb','gltf','atlas','fnt','unityweb','br','gz']);
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const slug=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(value);
const text=(value,max,field)=>{
 if(value===undefined||value===null)return '';
 if(typeof value!=='string'||value.length>max)throw fail(`${field} maksimal ${max} karakter.`);
 return value.trim();
};

class CustomGames{
 constructor(dir){
  this.dir=dir;
  this.file=path.join(dir,'custom-games.json');
  this.mediaDir=path.join(dir,'media');
  this.sitesDir=path.join(dir,'sites');
  fs.mkdirSync(this.mediaDir,{recursive:true});
  fs.mkdirSync(this.sitesDir,{recursive:true});
  this.data=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{games:[],settings:{announcement:'',announcementLink:'',featured:'drop',hidden:[]}};
  this.data.settings||={announcement:'',announcementLink:'',featured:'drop',hidden:[]};
 }

 persist(){
  const tmp=`${this.file}.tmp`;
  fs.writeFileSync(tmp,JSON.stringify(this.data,null,2));
  fs.renameSync(tmp,this.file);
 }

 list({includeDrafts=false}={}){
  return this.data.games.filter(game=>includeDrafts||game.published).map(game=>({...game}));
 }

 get(id){return this.data.games.find(game=>game.id===id)||null;}

 settings(){return {...this.data.settings,hidden:[...this.data.settings.hidden]};}

 updateSettings(patch,knownSlugs){
  const next={...this.data.settings};
  if(patch.announcement!==undefined)next.announcement=text(patch.announcement,160,'Pengumuman');
  if(patch.announcementLink!==undefined){
   const link=text(patch.announcementLink,300,'Tautan pengumuman');
   if(link&&!/^https:\/\/[^\s]+$/.test(link)&&!/^\/[^\s]*$/.test(link))throw fail('Tautan pengumuman harus https:// atau path lokal.');
   next.announcementLink=link;
  }
  if(patch.featured!==undefined){
   if(!knownSlugs.includes(patch.featured))throw fail('Game unggulan tidak dikenal.');
   next.featured=patch.featured;
  }
  if(patch.hidden!==undefined){
   if(!Array.isArray(patch.hidden)||patch.hidden.some(item=>!knownSlugs.includes(item)))throw fail('Daftar game tersembunyi tidak valid.');
   next.hidden=[...new Set(patch.hidden)];
  }
  this.data.settings=next;
  this.persist();
  return this.settings();
 }

 upsert(input={},reserved=[]){
  const existing=input.id?this.get(input.id):null;
  if(input.id&&!existing)throw fail('Game tidak ditemukan.',404);
  if(!existing&&this.data.games.length>=MAX_GAMES)throw fail(`Maksimal ${MAX_GAMES} game tambahan.`,409);
  const id=existing?existing.id:input.slug;
  if(!existing&&(!slug(id)||reserved.includes(id)||this.get(id)))throw fail('Slug 3-40 huruf kecil/angka/tanda hubung, dan belum dipakai.');
  const type=input.type??existing?.type??'static';
  if(!['static','link'].includes(type))throw fail('Jenis game tidak dikenal.');
  const title=text(input.title??existing?.title,60,'Judul');
  if(!title)throw fail('Judul wajib diisi.');
  let url=text(input.url??existing?.url,500,'Tautan');
  if(type==='link'&&!/^https:\/\/[^\s]+$/.test(url))throw fail('Tautan game harus diawali https://');
  if(type==='static')url='';
  const color=input.color??existing?.color??'#E62B5E';
  if(!/^#[0-9a-fA-F]{6}$/.test(color))throw fail('Warna harus format #RRGGBB.');
  const howTo=input.howTo??existing?.howTo??[];
  if(!Array.isArray(howTo)||howTo.length>6||howTo.some(step=>typeof step!=='string'||step.length>160))throw fail('Cara main maksimal 6 langkah, masing-masing 160 karakter.');
  const tags=input.tags??existing?.tags??[];
  if(!Array.isArray(tags)||tags.length>5||tags.some(tag=>typeof tag!=='string'||tag.length>20))throw fail('Maksimal 5 tag, masing-masing 20 karakter.');
  const game={
   id,
   type,
   title,
   subtitle:text(input.subtitle??existing?.subtitle,80,'Subjudul'),
   description:text(input.description??existing?.description,400,'Deskripsi'),
   url,
   color,
   howTo:howTo.map(step=>step.trim()).filter(Boolean),
   tags:tags.map(tag=>tag.trim()).filter(Boolean),
   published:Boolean(input.published??existing?.published??false),
   cover:existing?.cover||null,
   installed:existing?.installed||false,
   createdAt:existing?.createdAt||new Date().toISOString(),
   updatedAt:new Date().toISOString()
  };
  if(game.published&&game.type==='static'&&!game.installed)throw fail('Unggah ZIP game terlebih dahulu sebelum dipublikasikan.',409);
  if(existing)Object.assign(existing,game);else this.data.games.push(game);
  this.persist();
  return {...game};
 }

 remove(id){
  const index=this.data.games.findIndex(game=>game.id===id);
  if(index<0)throw fail('Game tidak ditemukan.',404);
  const [game]=this.data.games.splice(index,1);
  fs.rmSync(path.join(this.sitesDir,id),{recursive:true,force:true});
  if(game.cover)fs.rmSync(path.join(this.mediaDir,path.basename(game.cover)),{force:true});
  this.persist();
 }

 setCover(id,dataUrl){
  const game=this.get(id);
  if(!game)throw fail('Game tidak ditemukan.',404);
  const match=typeof dataUrl==='string'&&dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)throw fail('Sampul harus PNG, JPG, atau WebP.');
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length<64||bytes.length>5*1024*1024)throw fail('Sampul maksimal 5 MB.');
  const signature={png:bytes.subarray(0,4).equals(Buffer.from([0x89,0x50,0x4e,0x47])),jpeg:bytes[0]===0xff&&bytes[1]===0xd8,webp:bytes.toString('ascii',8,12)==='WEBP'};
  if(!signature[match[1]])throw fail('Isi berkas sampul tidak sesuai format.');
  const name=`${id}-${crypto.randomBytes(4).toString('hex')}.${match[1]==='jpeg'?'jpg':match[1]}`;
  fs.writeFileSync(path.join(this.mediaDir,name),bytes);
  if(game.cover)fs.rmSync(path.join(this.mediaDir,path.basename(game.cover)),{force:true});
  game.cover=`/hub-media/${name}`;
  game.updatedAt=new Date().toISOString();
  this.persist();
  return {...game};
 }

 installZip(id,base64){
  const game=this.get(id);
  if(!game)throw fail('Game tidak ditemukan.',404);
  if(game.type!=='static')throw fail('Hanya game jenis unggahan yang menerima ZIP.');
  if(typeof base64!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw fail('Data ZIP tidak valid.');
  const zip=Buffer.from(base64,'base64');
  if(zip.length<22||zip.readUInt32LE(0)!==0x04034b50)throw fail('Berkas bukan ZIP yang valid.');
  let entries;
  try{entries=unzipSync(new Uint8Array(zip));}catch{throw fail('ZIP rusak atau tidak bisa dibaca.');}
  const files=Object.entries(entries).filter(([name])=>!name.endsWith('/'));
  if(!files.length)throw fail('ZIP kosong.');
  if(files.length>MAX_FILES)throw fail(`ZIP maksimal ${MAX_FILES} berkas.`);
  const names=files.map(([name])=>name.replace(/\\/g,'/'));
  const tops=new Set(names.map(name=>name.split('/')[0]));
  const strip=tops.size===1&&names.every(name=>name.includes('/'))&&!names.includes('index.html')?`${[...tops][0]}/`:'';
  let total=0;
  const cleaned=[];
  for(const [raw,bytes] of files){
   const name=raw.replace(/\\/g,'/').slice(strip.length);
   if(/(?:^|\/)__MACOSX\//.test(name)||/(?:^|\/)\.DS_Store$/.test(name)||/(?:^|\/)Thumbs\.db$/i.test(name))continue;
   if(!name||name.startsWith('/')||/^[a-zA-Z]:/.test(name)||name.split('/').some(part=>part==='..'||part==='.'||part===''))throw fail(`Nama berkas tidak aman: ${raw}`);
   const ext=path.extname(name).slice(1).toLowerCase();
   if(!ALLOWED_EXT.has(ext))throw fail(`Jenis berkas tidak diizinkan: ${name}`);
   total+=bytes.length;
   if(total>MAX_UNPACKED)throw fail('Isi ZIP melebihi 200 MB.');
   cleaned.push([name,bytes]);
  }
  if(!cleaned.some(([name])=>name==='index.html'))throw fail('ZIP harus berisi index.html di akar (atau di satu folder utama).');
  const target=path.join(this.sitesDir,id);
  const stage=`${target}.staging-${crypto.randomBytes(3).toString('hex')}`;
  fs.mkdirSync(stage,{recursive:true});
  try{
   for(const [name,bytes] of cleaned){
    const dest=path.join(stage,...name.split('/'));
    if(!dest.startsWith(stage+path.sep))throw fail(`Nama berkas tidak aman: ${name}`);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,bytes);
   }
   fs.rmSync(target,{recursive:true,force:true});
   fs.renameSync(stage,target);
  }catch(error){fs.rmSync(stage,{recursive:true,force:true});throw error;}
  game.installed=true;
  game.updatedAt=new Date().toISOString();
  this.persist();
  return {...game,files:cleaned.length,bytes:total};
 }

 sitePath(id,relative){
  const game=this.get(id);
  if(!game||game.type!=='static'||!game.installed)return null;
  const clean=relative.replace(/^\/+/,'')||'index.html';
  if(clean.split('/').some(part=>part==='..'))return null;
  const file=path.join(this.sitesDir,id,...clean.split('/'));
  if(!file.startsWith(path.join(this.sitesDir,id)+path.sep))return null;
  return file;
 }

 mediaPath(name){
  if(!/^[a-z0-9-]+\.(?:png|jpg|webp)$/.test(name))return null;
  return path.join(this.mediaDir,name);
 }
}

module.exports={CustomGames,MAX_GAMES};
