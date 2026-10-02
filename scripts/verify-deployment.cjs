'use strict';

// Read-only production probe. No login, game result, or inventory operation is sent.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {rewriteOutgoing}=require('../hub/rewrite.cjs');
const {HEART_HOST_IDS,HEART_SERVICE_IDS}=require('../hub/registry.cjs');
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

const MARKET_IN_RELEASE_FILES=Object.freeze([
 'market-in.html','css/event-hub.css','css/market-in.css','js/event-utils.js','js/market-in.js',
 'assets/audio/bpedia-jingle.mp3','assets/market-in/market-in-6.webp','assets/market-in/zoro.webp','assets/market-in/sanji.webp'
]);
const IMAGE_FILE=/\.(?:png|jpe?g|webp)$/i;

function collectMarketInReleaseAssets(files){
 const available=new Set(files.map(file=>file.replace(/^hub\/public\//,'')));
 for(const file of MARKET_IN_RELEASE_FILES)if(!available.has(file))throw new Error(`Required Market-In release file missing from commit: ${file}`);
 return [...available].filter(file=>MARKET_IN_RELEASE_FILES.includes(file)||/^assets\/audio\/.*\.(?:mp3|wav|ogg|oga|m4a|aac)$/i.test(file)||file.startsWith('assets/market-in/')&&IMAGE_FILE.test(file)).sort();
}

function committedHubHtml(html,serverSource){
 // Reproduce the committed hub's deterministic CSP insertion, with no code evaluation.
 const policy=serverSource.match(/^const HUB_CSP="([^"\r\n]+)";/m)?.[1];
 if(!policy)throw new Error('Committed hub CSP policy not found.');
 if(/http-equiv=["']Content-Security-Policy["']/i.test(html))return Buffer.from(html);
 const content=policy.split(';').map(part=>part.trim()).filter(part=>part&&!/^(?:frame-ancestors|sandbox|report-uri|report-to)\b/i.test(part)).join('; ');
 const tag=`<meta http-equiv="Content-Security-Policy" content="${content.replace(/"/g,'&quot;')}">`;
 return Buffer.from(/<head[^>]*>/i.test(html)?html.replace(/<head[^>]*>/i,match=>`${match}${tag}`):tag+html);
}

function collectHeartReleaseAssets(files){
 const required=[
  ...HEART_HOST_IDS.flatMap(host=>HEART_SERVICE_IDS.map(service=>`assets/moments/${host}-${service}.webp`)),
  ...HEART_SERVICE_IDS.map(service=>`assets/bipy-variants/bipy-${service}.webp`),
  ...['pink','jade','gold'].map(variant=>`assets/brand/bipy-${variant}.webp`),
  'assets/video/grand-line-promo-poster.webp','assets/audio/bpedia-main-bgm.mp3','assets/audio/bpedia-home-suite.mp3',...HEART_HOST_IDS.flatMap(host=>HEART_SERVICE_IDS.map(service=>`assets/video/moments/${host}-${service}.mp4`)),...HEART_HOST_IDS.map(host=>`assets/dealers/${host}.webp`)
 ];
 const available=new Set(files.map(file=>file.replace(/^games\/heart\//,'')));
 for(const file of required)if(!available.has(file))throw new Error(`Required Heart Parade release asset missing from commit: ${file}`);
 return [...available].filter(file=>required.includes(file)||/^assets\/(?:moments|bipy-variants|dealers|pov|stickers)\//.test(file)||/^assets\/brand\/(?:bipy-|bpedia-tokens)/.test(file)||/^assets\/audio\/.*\.(?:mp3|wav|ogg)$/i.test(file)||/\.(?:mp4|webm)$/i.test(file)).sort();
}

function verifyDecodedImage(check,route,localHash,liveHash,report=imageEvidence){
 const evidence=report?.images?.find(item=>new URL(item.url).pathname===route);
 const similarity=evidence?.decoded_similarity;
 const resized=evidence?.normalized_comparison;
 const proportionalDownscale=Boolean(resized?.reason==='hcdn proportional downscale'&&evidence.headers?.server==='hcdn'&&evidence.live.dimensions[0]===1600&&evidence.local.dimensions[0]>1600&&Math.abs(evidence.local.dimensions[0]/evidence.local.dimensions[1]-evidence.live.dimensions[0]/evidence.live.dimensions[1])<0.003&&JSON.stringify(resized.dimensions)===JSON.stringify(evidence.live.dimensions));
 check.ok=Boolean(evidence&&evidence.local.sha256===localHash&&evidence.live.sha256===liveHash&&(evidence.same_dimensions||proportionalDownscale)&&similarity?.ssim_0_1>=0.98&&similarity.dhash_hamming_bits_64<=(proportionalDownscale?1:0));
 if(check.ok){check.verification=proportionalDownscale?'decoded image evidence after CDN proportional downscale':'decoded image evidence for CDN image';check.ssim=similarity.ssim_0_1;check.evidence=path.relative(root,imageEvidencePath).replaceAll('\\','/');}
}

function verifyMarketInBytes(check,file,expected,actual,report=imageEvidence){
 const route=file==='market-in.html'?'/market-in':`/hub/${file}`;
 check.localSha256=hash(expected);check.liveSha256=hash(actual);
 check.verification=file==='market-in.html'?'committed HTML after hub CSP insertion':'exact committed bytes';
 check.ok=check.localSha256===check.liveSha256;
 if(!check.ok&&IMAGE_FILE.test(file))verifyDecodedImage(check,route,check.localSha256,check.liveSha256,report);
 if(!check.ok)throw new Error(`${file}: live Market-In file mismatch; only images may use matching decoded-image evidence.`);
}

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
 for(const route of ['/studio','/g/spin/','/g/nyapit/','/g/drop/','/g/gacha/','/g/gacha/admin.html','/g/heart/','/g/heart/admin.html']){
  const html=(await read(route)).toString();
  if(!html.includes('Content-Security-Policy'))throw new Error(`${route}: CSP meta not present.`);
 }
 const hubFiles=execFileSync('git',['ls-tree','-r','--name-only','HEAD','hub/public'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 const committedServer=execFileSync('git',['show','HEAD:hub/server.cjs'],{cwd:root,encoding:'utf8',maxBuffer:10*1024*1024});
 for(const file of collectMarketInReleaseAssets(hubFiles)){
  const committed=execFileSync('git',['show',`HEAD:hub/public/${file}`],{cwd:root,maxBuffer:64*1024*1024});
  const expected=file==='market-in.html'?committedHubHtml(committed.toString(),committedServer):committed;
  const route=file==='market-in.html'?'/market-in':`/hub/${file}`;
  const actual=await read(`${route}?v=${pkg.version}`);
  verifyMarketInBytes(checks[checks.length-1],file,expected,actual);
 }
 const assets=['css/responsive.css','css/avatars.css','css/theme.css','css/album-slider.css','css/game-theme.css','css/gamebar.css','js/hub.js','js/inject.js','js/theme.js','js/album-slider.js','vendor/html2canvas-1.4.1.min.js',...['gamysuf-3d-dark','gamysuf-3d-light','bpedia-pink','bpedia-white'].map(name=>`assets/brand/${name}.png`),...['wave','stand','explorer','star','collector','champion'].map(name=>`assets/avatars/character-${name}.png`),'assets/covers/spin.jpg','assets/covers/nyapit.jpg','assets/covers/drop.jpg','assets/covers/gacha.jpg','assets/covers/heart.jpg'];
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
   verifyDecodedImage(check,`/hub/${file}`,localHash,liveHash);
  }
  if(!check.ok)throw new Error(`${file}: deployed bytes differ; provide matching decoded-image evidence for CDN-transformed images.`);
 }
 for(const [slug,files] of Object.entries({spin:['js/app.js','js/audio.js','css/bipy.css'],nyapit:['js/app.js','js/audio.js','js/festival.js','css/stage.css'],drop:['js/game.js','css/game.css'],gacha:['js/game.js','js/machine.js','js/fx.js','js/audio.js','css/game.css'],heart:['js/journey.js','css/journey.css','js/game.js','js/audio.js','js/admin.js','js/cards.js','js/export.js','js/fx.js','css/game.css','css/admin.css']})){
  const committedIndex=execFileSync('git',['show',`HEAD:games/${slug}/index.html`],{cwd:root,encoding:'utf8'});
  const cacheQueries=new Map([...committedIndex.matchAll(/(?:src|href)="\/([^"?#]+)\?([^"]+)"/g)].map(match=>[match[1],match[2]]));
  for(const file of files){
   const committed=execFileSync('git',['show',`HEAD:games/${slug}/${file}`],{cwd:root,maxBuffer:10*1024*1024});
   const expected=Buffer.from(rewriteOutgoing(committed.toString(),`/g/${slug}`));
   const actual=await read(`/g/${slug}/${file}?${cacheQueries.get(file)||`v=${pkg.version}`}`);
   const check=checks[checks.length-1];check.localSha256=hash(expected);check.liveSha256=hash(actual);check.ok=check.localSha256===check.liveSha256;check.verification='committed bytes after gateway URL rewrite';
   if(!check.ok)throw new Error(`${slug}/${file}: live game code mismatch.`);
  }
 }
 const heartFiles=execFileSync('git',['ls-tree','-r','--name-only','HEAD','games/heart/assets'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 const momentHashes=new Set();
 for(const file of collectHeartReleaseAssets(heartFiles)){
  const route=`/g/heart/${file}`;
  const committed=execFileSync('git',['show',`HEAD:games/heart/${file}`],{cwd:root,maxBuffer:64*1024*1024});
  const isText=/\.(?:json|css|js|html)$/i.test(file),expected=isText?Buffer.from(rewriteOutgoing(committed.toString('utf8'),'/g/heart')):committed;
  const actual=await read(`${route}?v=${pkg.version}`);
  const check=checks[checks.length-1];check.localSha256=hash(expected);check.liveSha256=hash(actual);check.ok=check.localSha256===check.liveSha256;check.verification=isText?'exact committed Heart Parade text after gateway URL rewrite':'exact committed Heart Parade asset bytes';
  if(file.startsWith('assets/moments/')){
   if(momentHashes.has(check.localSha256))throw new Error(`${file}: duplicate Heart Parade moment artwork bytes.`);
   momentHashes.add(check.localSha256);
  }
  if(!check.ok&&/\.(?:png|jpe?g|webp)$/i.test(file))verifyDecodedImage(check,route,check.localSha256,check.liveSha256);
  if(!check.ok)throw new Error(`${file}: live Heart Parade asset mismatch.`);
 }
 const report={verifiedAt:new Date().toISOString(),base,version:catalog.version,checks};
 const out=path.join(root,'artifacts',`deployment-${pkg.version}.json`);
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(`Verified ${base}: v${catalog.version}, ${checks.length} successful public endpoints; code hashes and release images verified.`);
}
module.exports={collectHeartReleaseAssets,collectMarketInReleaseAssets,committedHubHtml,verifyMarketInBytes,MARKET_IN_RELEASE_FILES};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
