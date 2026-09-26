'use strict';

// Read-only production probe. No login, game result, or inventory operation is sent.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const pkg=require('../package.json');
const base=process.argv[2]||'https://gamysuf.fun';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

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
 if(!page.includes('Navigasi cepat')||!page.includes('/hub/css/responsive.css?v=1.1.0'))throw new Error('Dashboard release markup not present.');
 for(const route of ['/studio','/g/spin/','/g/nyapit/','/g/drop/']){
  const html=(await read(route)).toString();
  if(!html.includes('Content-Security-Policy'))throw new Error(`${route}: CSP meta not present.`);
 }
 for(const file of ['css/responsive.css','js/hub.js','js/inject.js','assets/covers/spin.jpg','assets/covers/nyapit.jpg','assets/covers/drop.jpg']){
  const expected=fs.readFileSync(path.join(root,'hub','public',file));
  const actual=await read(`/hub/${file}?v=${pkg.version}`);
  const localHash=hash(expected),liveHash=hash(actual);
  checks[checks.length-1].localSha256=localHash;
  checks[checks.length-1].liveSha256=liveHash;
  checks[checks.length-1].ok=localHash===liveHash;
  if(localHash!==liveHash)throw new Error(`${file}: deployed bytes differ from verified local artifact.`);
 }
 const report={verifiedAt:new Date().toISOString(),base,version:catalog.version,checks};
 const out=path.join(root,'artifacts',`deployment-${pkg.version}.json`);
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(`Verified ${base}: v${catalog.version}, ${checks.length} successful public endpoints; six artifact hashes match.`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
