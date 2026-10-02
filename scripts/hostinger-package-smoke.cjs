'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),{unzipSync}=require('fflate');
const root=path.join(__dirname,'..'),version=require('../package.json').version,zipPath=path.join(root,'release',`Gamysuf-Arcade-${version}-Hostinger.zip`);
async function main(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-package-')),appDir=path.join(temp,'app'),checks=[];let hub;
 fs.mkdirSync(appDir,{recursive:true});
 try{
  const zip=fs.readFileSync(zipPath),entries=unzipSync(zip);
  for(const [file,bytes] of Object.entries(entries)){
   const target=path.resolve(appDir,file);assert.ok(target.startsWith(path.resolve(appDir)+path.sep),'ZIP entry must stay inside extracted application');
   fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  }
  assert.equal(JSON.parse(fs.readFileSync(path.join(appDir,'package.json'),'utf8')).version,version);
  execFileSync(process.env.ComSpec||'cmd.exe',['/d','/c','npm ci --omit=dev --ignore-scripts --no-audit --no-fund'],{cwd:appDir,stdio:'pipe'});
  checks.push('exact ZIP extracts safely and installs its production dependencies in an isolated directory');
  process.env.GAMYSUF_AUTOSTART='0';const {createHub}=require(path.join(appDir,'hub','server.cjs'));
  hub=await createHub({dataDir:path.join(temp,'data'),adminPin:'246810',heartPin:'1234',local:true});
  async function get(route,headers={}){const response=await fetch(hub.origin+route,{headers});assert.ok(response.ok,`${route}: HTTP ${response.status}`);return response;}
  const catalog=await (await get('/hub-api/catalog')).json();assert.equal(catalog.version,version);assert.equal(catalog.games.length,5);
  for(const route of ['/','/market-in','/g/spin/','/g/nyapit/','/g/drop/','/g/gacha/','/g/heart/'])assert.match(await (await get(route)).text(),/<html/i);
  checks.push('hub, event page and all five games boot from the packaged application');
  const html=await (await get('/g/heart/')).text();assert.ok(html.includes('Grand Line'));assert.ok(!html.includes('id="prepDialog"'));
  assert.ok((await (await get('/g/heart/css/game.css')).text()).includes('/g/heart/assets/fonts/'));
  const poster=await get('/g/heart/assets/video/grand-line-promo-poster.webp');assert.match(poster.headers.get('content-type'),/image\/webp/);assert.equal((await poster.arrayBuffer()).byteLength,32102);
  const state=await (await get('/g/heart/api/state')).json();assert.equal(state.cards.length,14);
  for(const card of state.cards){const art=await get(card.image);assert.match(art.headers.get('content-type'),/image\/webp/);assert.ok((await art.arrayBuffer()).byteLength>10000);}
  for(const route of ['/g/heart/assets/video/heart-parade-bipy-promo.mp4','/g/heart/assets/video/moments/zoro-hug-gemini.mp4','/g/heart/assets/video/moments/sanji-vow-gemini.mp4','/g/heart/assets/audio/bpedia-home-suite.mp3']){
   const response=await get(route,{Range:'bytes=0-255'});assert.equal(response.status,206);assert.equal((await response.arrayBuffer()).byteLength,256);
  }
  checks.push('14 artworks, new poster, rewritten font paths, video/audio MIME and byte ranges survive packaging');
  assert.ok(html.includes('stickerGalleryDialog')&&html.includes('bpedia-tokens.css?v=2.3.0')&&!html.includes('id="ticketBox"')&&!html.includes('home-music'));
  const stickers=await (await get('/g/heart/assets/stickers/manifest.json')).json();assert.equal(stickers.items.length,50);
  for(const item of stickers.items){const response=await get(item.image);assert.match(response.headers.get('content-type'),/image\/webp/);assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),item.sha256);}
  for(const card of state.cards)assert.ok(stickers.items.some(item=>item.image===card.stickerImage&&item.hostId===card.hostId));
  checks.push('all fifty sticker/dealer assets preserve exact manifest hashes; fourteen previews use matching characters; both Bpedia themes ship');
  let cookies='';
  async function post(route,data){const response=await fetch(hub.origin+route,{method:'POST',headers:{Origin:hub.origin,'Content-Type':'application/json','x-bpedia-client':'heartparade',Cookie:cookies},body:JSON.stringify(data)});assert.equal(response.status,200,route);const received=response.headers.getSetCookie();if(received.length)cookies=received.map(cookie=>cookie.split(';')[0]).join('; ');return response.json();}
  await post('/g/heart/api/login',{pin:'1234'});await post('/g/heart/api/mode',{mode:'live'});
  const result=await post('/g/heart/api/play',{requestId:crypto.randomUUID(),host:'sanji',pick:'hug',purchaseAmount:150000,verified:true,comfort:'no-touch',recording:false,consent:false});
  assert.match(result.id,/^HP-/);assert.equal(result.card.id,'sanji-hug');assert.equal(result.demo,false);assert.equal(result.consent,false);
  assert.equal(result.purchaseAmount,150000);assert.equal(result.purchaseMinimum,150000);
  const acknowledged=await post('/g/heart/api/result',{id:result.id});assert.equal(acknowledged.pending,null);
  checks.push('staff authentication, recorded mode, safe direct draw and acknowledgement work in the extracted release');
  const report={version,zip:zipPath,files:Object.keys(entries).length,bytes:zip.length,sha256:crypto.createHash('sha256').update(zip).digest('hex'),checks};
  fs.mkdirSync(path.join(root,'artifacts','package'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts','package',`smoke-${version}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{if(hub)await hub.close();assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
