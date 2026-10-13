'use strict';
const crypto=require('node:crypto');
const {rewriteOutgoing}=require('../hub/rewrite.cjs');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const DOMAIN_CHARACTERS=['gojo','geto','yuji','megumi','nobara','sukuna','yuta','maki','toge','panda','nanami','toji','kenjaku'];
function collectDomainReleaseAssets(files){
 const available=[...new Set(files.map(file=>file.replace(/^games\/domain\//,'')))].sort();
 for(const required of ['server.cjs','core/catalog.cjs','core/engine.cjs','core/store.cjs','index.html','admin.html','js/app.js','js/audio.js'])if(!available.includes(required))throw new Error(`Domain release file missing: ${required}`);
 for(const character of DOMAIN_CHARACTERS)if(!available.includes(`assets/models/${character}.glb`))throw new Error('Domain release GLB actor missing: '+character);
 if(!available.some(file=>/^js\/vendor\/.*\.m?js$/i.test(file)))throw new Error('Domain release has no local Three.js vendor.');
 if(!available.some(file=>/^assets\/audio\/.*\.(mp3|ogg|wav)$/i.test(file)))throw new Error('Domain release has no local audio.');
 return available.filter(file=>/^(?:assets|css|js)\//.test(file));
}
/** Read-only public probe; no official session or result endpoint is called. */
async function verifyDomainRelease({base,files,readCommitted,checks=[],version,fetcher=fetch}){
 const assets=collectDomainReleaseAssets(files);
 for(const file of assets){
  const route=`/g/domain/${file}`,response=await fetcher(new URL(`${route}?v=${version}`,base),{signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}}),actual=Buffer.from(await response.arrayBuffer());
  const check={route,status:response.status,bytes:actual.length,ok:response.ok};checks.push(check);if(!response.ok)throw new Error(`${route}: HTTP ${response.status}`);
  const type=response.headers.get('content-type')||'',binary=/\.(?:glb|bin|mp3|ogg|wav|woff2?)$/i.test(file),text=/\.(?:m?js|css|json)$/i.test(file);
  if(/\.glb$/i.test(file)){if(!type.startsWith('model/gltf-binary')||actual.readUInt32LE(0)!==0x46546c67||actual.readUInt32LE(4)!==2||actual.readUInt32LE(8)!==actual.length)throw new Error(`${route}: invalid GLB or MIME`);}
  if(/\.m?js$/i.test(file)&&!type.includes('javascript'))throw new Error(`${route}: module MIME invalid`);
  if(/\.(?:mp3|ogg|wav)$/i.test(file)&&!type.startsWith('audio/'))throw new Error(`${route}: audio MIME invalid`);
  if(binary||text){const committed=readCommitted(file),expected=text?Buffer.from(rewriteOutgoing(committed.toString('utf8'),'/g/domain')):committed;check.localSha256=digest(expected);check.liveSha256=digest(actual);check.ok=check.localSha256===check.liveSha256;check.verification=text?'committed text after gateway rewrite':'exact committed binary';if(!check.ok)throw new Error(`${route}: deployed hash mismatch`);}
  else check.verification='public asset availability';
  if(/\.(?:mp3|ogg|wav)$/i.test(file)){
   const ranged=await fetcher(new URL(route,base),{headers:{Range:'bytes=0-31'},signal:AbortSignal.timeout(30000)}),bytes=Buffer.from(await ranged.arrayBuffer());const entry={route,kind:'range',status:ranged.status,ok:ranged.status===206&&bytes.length===32&&ranged.headers.get('content-range')===`bytes 0-31/${actual.length}`&&bytes.equals(actual.subarray(0,32))};checks.push(entry);if(!entry.ok)throw new Error(`${route}: audio byte range invalid`);
  }
 }
 return checks;
}
module.exports={collectDomainReleaseAssets,verifyDomainRelease};

