'use strict';

// Read-only production probe. No login, game result, or inventory operation is sent.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {rewriteOutgoing}=require('../hub/rewrite.cjs');
const root=path.join(__dirname,'..');
const pkg=require('../package.json');
const base=process.argv[2]||'https://gamysuf.fun';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const releaseImageEvidence=path.join(root,'artifacts','live-image-verification',`report-${pkg.version}.json`);
const evidenceDir=path.dirname(releaseImageEvidence);
// Unchanged images may reuse older evidence only when BOTH byte hashes still match.
const previousEvidence=fs.existsSync(evidenceDir)?fs.readdirSync(evidenceDir).filter(file=>/^report-\d+\.\d+\.\d+\.json$/.test(file)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))[0]:null;
const imageEvidencePath=fs.existsSync(releaseImageEvidence)?releaseImageEvidence:path.join(evidenceDir,previousEvidence||'report.json');
const imageEvidence=fs.existsSync(imageEvidencePath)?JSON.parse(fs.readFileSync(imageEvidencePath,'utf8')):null;

async function main(){
 const checks=[];
 async function read(route){
  const response=await fetch(new URL(route,base),{signal:AbortSignal.timeout(25000),headers:{'Cache-Control':'no-cache'}});
  const bytes=Buffer.from(await response.arrayBuffer());
  checks.push({route,status:response.status,bytes:bytes.length,ok:response.ok});
  if(!response.ok)throw new Error(`${route}: HTTP ${response.status}`);
  return bytes;
 }
 const catalog=JSON.parse((await read('/hub-api/catalog')).toString());
 if(catalog.version!==pkg.version)throw new Error(`Expected ${pkg.version}, received ${catalog.version}`);
 const page=(await read('/')).toString();
 if(!page.includes('Navigasi cepat')||!page.includes(`/hub/css/responsive.css?v=${pkg.version}`)||!page.includes('Pilih Bipy versimu.'))throw new Error('Dashboard release markup not present.');
 for(const route of ['/studio','/g/spin/','/g/nyapit/','/g/drop/','/g/gacha/','/g/gacha/admin.html']){
  const html=(await read(route)).toString();
  if(!html.includes('Content-Security-Policy'))throw new Error(`${route}: CSP meta not present.`);
 }
 const assets=['css/responsive.css','css/avatars.css','css/theme.css','css/album-slider.css','css/game-theme.css','css/gamebar.css','js/hub.js','js/inject.js','js/theme.js','js/album-slider.js','vendor/html2canvas-1.4.1.min.js',...['gamysuf-3d-dark','gamysuf-3d-light','bpedia-pink','bpedia-white'].map(name=>`assets/brand/${name}.png`),...['wave','stand','explorer','star','collector','champion'].map(name=>`assets/avatars/character-${name}.png`),'assets/covers/spin.jpg','assets/covers/nyapit.jpg','assets/covers/drop.jpg','assets/covers/gacha.jpg'];
 for(const file of assets){
  // Compare the committed bytes that Linux deploys, regardless of Windows checkout line endings.
  const expected=execFileSync('git',['show',`HEAD:hub/public/${file}`],{cwd:root,maxBuffer:10*1024*1024});
  const actual=await read(`/hub/${file}?v=${pkg.version}`);
  const localHash=hash(expected),liveHash=hash(actual);
  checks[checks.length-1].localSha256=localHash;
  checks[checks.length-1].liveSha256=liveHash;
  const check=checks[checks.length-1];
  check.verification='exact committed bytes';
  check.ok=localHash===liveHash;
  if(!check.ok&&file.startsWith('assets/')){
   // CDN image optimization requires separate decoded-image evidence bound to both hashes.
   const evidence=imageEvidence?.images?.find(item=>new URL(item.url).pathname===`/hub/${file}`);
   const similarity=evidence?.decoded_similarity;
   const resized=evidence?.normalized_comparison;
   const proportionalDownscale=Boolean(resized?.reason==='hcdn proportional downscale'&&evidence.headers?.server==='hcdn'&&evidence.live.dimensions[0]===1600&&evidence.local.dimensions[0]>1600&&Math.abs(evidence.local.dimensions[0]/evidence.local.dimensions[1]-evidence.live.dimensions[0]/evidence.live.dimensions[1])<0.003&&JSON.stringify(resized.dimensions)===JSON.stringify(evidence.live.dimensions));
   check.ok=Boolean(evidence&&evidence.local.sha256===localHash&&evidence.live.sha256===liveHash&&(evidence.same_dimensions||proportionalDownscale)&&similarity?.ssim_0_1>=0.98&&similarity.dhash_hamming_bits_64<=(proportionalDownscale?1:0));
   if(check.ok){check.verification=proportionalDownscale?'decoded image evidence after CDN proportional downscale':'decoded image evidence for CDN image';check.ssim=similarity.ssim_0_1;check.evidence=path.relative(root,imageEvidencePath).replaceAll('\\','/');}
  }
  if(!check.ok)throw new Error(`${file}: deployed bytes differ; provide matching decoded-image evidence for CDN-transformed images.`);
 }
 for(const [slug,files] of Object.entries({spin:['js/app.js','js/audio.js','css/bipy.css'],nyapit:['js/app.js','js/audio.js','js/festival.js','css/stage.css'],drop:['js/game.js','css/game.css'],gacha:['js/game.js','js/machine.js','js/fx.js','js/audio.js','css/game.css']})){
  for(const file of files){
   const committed=execFileSync('git',['show',`HEAD:games/${slug}/${file}`],{cwd:root,maxBuffer:10*1024*1024});
   const expected=Buffer.from(rewriteOutgoing(committed.toString(),`/g/${slug}`));
   const actual=await read(`/g/${slug}/${file}?v=${pkg.version}`);
   const check=checks[checks.length-1];check.localSha256=hash(expected);check.liveSha256=hash(actual);check.ok=check.localSha256===check.liveSha256;check.verification='committed bytes after gateway URL rewrite';
   if(!check.ok)throw new Error(`${slug}/${file}: live game code mismatch.`);
  }
 }
 const report={verifiedAt:new Date().toISOString(),base,version:catalog.version,checks};
 const out=path.join(root,'artifacts',`deployment-${pkg.version}.json`);
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(`Verified ${base}: v${catalog.version}, ${checks.length} successful public endpoints; code hashes and release images verified.`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
