'use strict';

/* Menyalin berkas runtime game dari folder proyek aslinya ke games/<slug>.
   Sumber kebenaran kode game tetap di folder masing-masing (01, 02, 03, 04);
   folder games/ di sini hanya salinan agar repo hub bisa di-deploy sendirian.
   Jalankan ulang setiap kali game asli diperbarui: npm run sync */
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const parent=path.join(root,'..');
const SOURCES={
 spin:'01 spenweels',
 nyapit:'02 nyapit',
 drop:'03 bipy-beauty-drop',
 gacha:'04 bipy-gacha-pop'
};
const ENTRIES=['server.cjs','index.html','admin.html','core','js','css','assets','maskot.png','logo.png','rancangan maskot.png'];
const SKIP=[
 /(?:^|\/)desktop\.ini$/i,
 /(?:^|\/)\.DS_Store$/,
 /^assets\/brand\/08 /,
 /^assets\/brand\/bipy-(?:full|ngintip|tas|wajah)[^/]*\.png$/,
 /^assets\/images\/cosplayer-brickhall-hero\.png$/,
 /^assets\/products\/src\//,
 /\.(?:psd|ai|xcf|mp4|mov)$/i
];

function copy(src,dest,relative,stats){
 const stat=fs.statSync(src);
 if(stat.isDirectory()){
  fs.mkdirSync(dest,{recursive:true});
  for(const name of fs.readdirSync(src))copy(path.join(src,name),path.join(dest,name),relative?`${relative}/${name}`:name,stats);
  return;
 }
 if(SKIP.some(pattern=>pattern.test(relative)))return;
 fs.copyFileSync(src,dest);
 stats.files++;stats.bytes+=stat.size;
}

for(const [slug,folder] of Object.entries(SOURCES)){
 const source=path.join(parent,folder);
 if(!fs.existsSync(path.join(source,'server.cjs')))throw new Error(`Game sumber tidak ditemukan: ${source}`);
 const target=path.join(root,'games',slug);
 if(path.dirname(path.resolve(target))!==path.resolve(root,'games')||!Object.hasOwn(SOURCES,slug))throw new Error('Target sync berada di luar folder games.');
 fs.rmSync(target,{recursive:true,force:true});
 fs.mkdirSync(target,{recursive:true});
 const stats={files:0,bytes:0};
 for(const entry of ENTRIES){
  const src=path.join(source,entry);
  if(fs.existsSync(src))copy(src,path.join(target,entry),entry,stats);
 }
 fs.writeFileSync(path.join(target,'SOURCE.txt'),`Disalin dari "${folder}" oleh scripts/sync-games.cjs. Ubah game di folder aslinya, lalu jalankan npm run sync.\n`);
 console.log(`${slug.padEnd(7)} ← ${folder}: ${stats.files} berkas, ${(stats.bytes/1048576).toFixed(1)} MB`);
}
