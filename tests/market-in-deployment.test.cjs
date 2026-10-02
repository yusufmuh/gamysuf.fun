'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {createHub}=require('../hub/server.cjs');
const {collectMarketInReleaseAssets,committedHubHtml,verifyMarketInBytes,MARKET_IN_RELEASE_FILES}=require('../scripts/verify-deployment.cjs');

const root=path.join(__dirname,'..');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const expected=Buffer.from('committed release bytes');
const optimized=Buffer.from('CDN image bytes');
function evidenceFor(file,changes={}){
 return {images:[{
  url:`https://gamysuf.fun/hub/${file}?v=1.7.0`,
  local:{sha256:hash(expected),dimensions:[520,780]},
  live:{sha256:hash(optimized),dimensions:[520,780]},
  same_dimensions:true,decoded_similarity:{ssim_0_1:0.99,dhash_hamming_bits_64:0},
  ...changes
 }]};
}

test('Market-In release manifest requires HTML, both CSS/JS files, hub audio and three images in commit',()=>{
 const extra=['assets/audio/welcome.ogg','assets/market-in/schedule.jpg'];
 const unrelated=['assets/market-in/master.psd','assets/covers/heart.jpg','js/studio.js'];
 const files=[...MARKET_IN_RELEASE_FILES,...extra,...unrelated].map(file=>`hub/public/${file}`);
 assert.deepEqual(collectMarketInReleaseAssets(files),[...MARKET_IN_RELEASE_FILES,...extra].sort());
 for(const required of MARKET_IN_RELEASE_FILES){
  assert.throws(()=>collectMarketInReleaseAssets(files.filter(file=>file!==`hub/public/${required}`)),error=>error.message.includes(required));
 }
});

test('Market-In rejects changed HTML, CSS, JavaScript or audio even with image-shaped evidence',()=>{
 for(const file of MARKET_IN_RELEASE_FILES){
  const check={};
  verifyMarketInBytes(check,file,expected,expected,null);
  assert.equal(check.ok,true,file);
  assert.equal(check.localSha256,check.liveSha256,file);
  if(/\.(?:html|css|js|mp3)$/.test(file)){
   assert.throws(()=>verifyMarketInBytes({},file,expected,optimized,evidenceFor(file)),/live Market-In file mismatch/);
  }
 }
});

test('Market-In CDN image evidence must bind route, both hashes, dimensions and decoded similarity',()=>{
 const file='assets/market-in/zoro.webp';
 const check={};
 verifyMarketInBytes(check,file,expected,optimized,evidenceFor(file));
 assert.equal(check.ok,true);
 assert.equal(check.verification,'decoded image evidence for CDN image');
 const invalid=[
  null,
  evidenceFor(file,{url:'https://gamysuf.fun/hub/assets/market-in/sanji.webp'}),
  evidenceFor(file,{local:{sha256:'stale',dimensions:[520,780]}}),
  evidenceFor(file,{live:{sha256:'stale',dimensions:[520,780]}}),
  evidenceFor(file,{same_dimensions:false}),
  evidenceFor(file,{decoded_similarity:{ssim_0_1:0.979,dhash_hamming_bits_64:0}}),
  evidenceFor(file,{decoded_similarity:{ssim_0_1:0.99,dhash_hamming_bits_64:1}})
 ];
 for(const report of invalid)assert.throws(()=>verifyMarketInBytes({},file,expected,optimized,report),/live Market-In file mismatch/);
});

test('Market-In permits only the documented hcdn proportional image downscale',()=>{
 const file='assets/market-in/schedule.jpg';
 const report=evidenceFor(file,{
  local:{sha256:hash(expected),dimensions:[3200,4800]},
  live:{sha256:hash(optimized),dimensions:[1600,2400]},
  same_dimensions:false,headers:{server:'hcdn'},
  normalized_comparison:{reason:'hcdn proportional downscale',dimensions:[1600,2400]},
  decoded_similarity:{ssim_0_1:0.99,dhash_hamming_bits_64:1}
 });
 const check={};
 verifyMarketInBytes(check,file,expected,optimized,report);
 assert.equal(check.verification,'decoded image evidence after CDN proportional downscale');
 for(const changes of [{headers:{server:'other'}},{live:{sha256:hash(optimized),dimensions:[1600,1600]}},{decoded_similarity:{ssim_0_1:0.99,dhash_hamming_bits_64:2}}]){
  const invalid=structuredClone(report);Object.assign(invalid.images[0],changes);
  assert.throws(()=>verifyMarketInBytes({},file,expected,optimized,invalid),/live Market-In file mismatch/);
 }
});

test('committed Market-In HTML hashes include hub CSP insertion and preserve every original byte',()=>{
 const source='const HUB_CSP="default-src \'self\'; script-src \'self\'; frame-ancestors \'self\'; object-src \'none\'";';
 const html='<html><head>\r\n<title>Market-In</title></head><body>Event</body></html>\r\n';
 const meta='<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; object-src \'none\'">';
 assert.equal(committedHubHtml(html,source).toString(),html.replace('<head>',`<head>${meta}`));
 const existing=html.replace('<head>',`<head>${meta}`);
 assert.equal(committedHubHtml(existing,source).toString(),existing,'existing policy must not be inserted twice');
 assert.throws(()=>committedHubHtml(html,''),/Committed hub CSP policy not found/);
});

test('Market-In served HTML, code, audio and images pass the same production byte checks',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'market-in-deployment-'));
 const hub=await createHub({dataDir:dir});
 t.after(async()=>{await hub.close();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:50});});
 const base=`http://127.0.0.1:${hub.server.address().port}`;
 const serverSource=fs.readFileSync(path.join(root,'hub/server.cjs'),'utf8');
 for(const file of MARKET_IN_RELEASE_FILES){
  const local=fs.readFileSync(path.join(root,'hub/public',file));
  const bytes=file==='market-in.html'?committedHubHtml(local.toString(),serverSource):local;
  const route=file==='market-in.html'?'/market-in':`/hub/${file}`;
  const response=await fetch(`${base}${route}`,{signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200,route);
  const actual=Buffer.from(await response.arrayBuffer());
  const check={};verifyMarketInBytes(check,file,bytes,actual,null);
  assert.equal(check.ok,true,route);
  if(file==='market-in.html'){
   assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
   const alias=await fetch(`${base}/market-in/`);
   assert.deepEqual(Buffer.from(await alias.arrayBuffer()),actual,'event route alias serves identical HTML');
   assert.throws(()=>verifyMarketInBytes({},file,bytes,Buffer.from(actual.toString().replace('Dua game booth','Changed event title')),null),/live Market-In file mismatch/);
  }
 }
});
