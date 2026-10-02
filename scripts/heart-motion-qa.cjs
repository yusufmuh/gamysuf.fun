'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm','node_modules','playwright'));
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');
const out=path.join(__dirname,'..','artifacts','heart-motion');

async function main(){
 fs.mkdirSync(out,{recursive:true});const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grand-line-motion-'));
 let hub,browser;const checks=[],cards=[],errors=[];
 try{
  hub=await createHub({dataDir:dir,adminPin:'246810',local:true});browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  const admin=await browser.newContext({extraHTTPHeaders:{Origin:hub.origin,'x-bpedia-client':'heartparade'}});const login=await admin.request.post(hub.origin+'/g/heart/api/login',{data:{pin:'246810'}});assert.equal(login.status(),200);
  const settings=await admin.request.post(hub.origin+'/g/heart/api/admin/settings',{data:{duration:1500}});assert.equal(settings.status(),200);await admin.close();
  await context.addInitScript(()=>{
   const original=Element.prototype.animate;window.__revealAnimations=[];
   Element.prototype.animate=function(frames,options){const animation=original.call(this,frames,options);if(this.closest('#playShell'))window.__revealAnimations.push({id:this.id,start:performance.now(),duration:options.duration||0});return animation;};
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(hub.origin+'/g/heart/');await page.locator('body[data-ready="1"]').waitFor();await page.mouse.move(0,0);
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='full');
  const idleBefore=await page.locator('.table-bipys .sticker').evaluateAll(images=>images.map(img=>getComputedStyle(img).transform));
  await page.waitForTimeout(700);
  const idleAfter=await page.locator('.table-bipys .sticker').evaluateAll(images=>images.map(img=>getComputedStyle(img).transform));
  assert.ok(idleAfter.every((value,i)=>value!=='none'&&value!==idleBefore[i]));checks.push('three full-body Bipy mascots actually move with staggered transforms');
  const catalog=await (await page.request.get(hub.origin+'/g/heart/api/state')).json();let playCount=0;
  page.on('request',r=>{if(r.url().endsWith('/g/heart/api/play')&&r.method()==='POST')playCount++;});
  async function open(host,service){
   await page.locator(`.host-card[data-host="${host}"]`).click();await page.locator(service?'#pickMode':'#gachaMode').click();
   if(service)await page.locator(`.card-choice[data-service="${service}"]`).click();
   const before=playCount,response=page.waitForResponse(r=>r.url().endsWith('/g/heart/api/play')&&r.request().method()==='POST');
   // A burst of repeated taps must still issue just one draw request.
   await page.locator('#startButton').evaluate(button=>{for(let n=0;n<8;n++)button.click();});
   const result=await (await response).json();assert.equal(playCount-before,1);
   await page.locator('#playShell[data-phase="result"]').waitFor({timeout:15000});await page.locator('#viewCard').click();
   return result;
  }
  async function finish(){
   await page.locator('#finishButton').click();await page.locator('#resultDialog').waitFor({state:'hidden'});
   await page.waitForTimeout(1100);
   const leaked=await page.evaluate(()=>document.getAnimations().filter(a=>!(a instanceof CSSAnimation)&&a.effect?.target?.closest?.('#playShell')).length);
   assert.equal(leaked,0,'completed reveal/flip animations must be cancelled after acknowledgement');assert.equal(await page.locator('#startButton').isEnabled(),true);
  }
  for(const card of catalog.cards){
   const result=await open(card.hostId,card.serviceId);assert.equal(result.card.id,card.id);
   await page.locator('#resultHost').evaluate(img=>img.decode());await page.waitForTimeout(350);
   const visual=await page.evaluate(()=>{
    const face=document.querySelector('#faceCard .tcg'),img=face.querySelector('.card-art img'),frame=face.querySelector('.card-art').getBoundingClientRect(),rect=img.getBoundingClientRect();
    const canvas=document.getElementById('heartFx')||document.querySelector('#playStage canvas');let pixels=0;
    if(canvas){const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;for(let i=3;i<data.length;i+=4)if(data[i])pixels++;}
    return {motif:face.dataset.motif,width:img.naturalWidth,height:img.naturalHeight,fit:getComputedStyle(img).objectFit,inside:rect.top>=frame.top-1&&rect.bottom<=frame.bottom+1,pixels,animations:window.__revealAnimations.slice(-6)};
   });
   assert.equal(visual.motif,card.animationMotif);assert.equal(visual.fit,'contain');assert.ok(visual.width>0&&visual.height>0&&visual.inside);assert.ok(visual.pixels>0,'card-specific canvas effect must render visible pixels');assert.ok(visual.animations.some(a=>a.id==='faceCard'));
   cards.push({id:card.id,...visual});
   await page.locator('#viewPoster').click();await page.waitForFunction(()=>document.querySelector('#facePoster').classList.contains('on')&&!document.getAnimations().some(a=>!(a instanceof CSSAnimation)&&a.effect?.target?.id==='facePoster'&&a.playState==='running'));
   if(card.id==='sanji-hug')await page.screenshot({path:path.join(out,'sanji-hug-full-motion.png')});
   await finish();
  }
  checks.push('all 14 distinct artworks reveal, animate their own seven motifs, flip to posters, and clean up after repeated taps');
  const gacha=await open('sanji');assert.equal(gacha.method,'gacha');await page.locator('#viewPoster').click();
  // Close while the flip is active. Its old completion must never mutate the next draw.
  await finish();const next=await open('zoro','pat');assert.equal(next.card.id,'zoro-pat');assert.equal(await page.locator('#resultTitle').textContent(),'Pat on Head');await finish();
  checks.push('full booster sequence and closing during a card flip recover without stale effects or duplicate requests');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.motion==='reduce');
  assert.ok((await page.locator('.table-bipys .sticker').evaluateAll(images=>images.map(img=>getComputedStyle(img).animationName))).every(value=>value==='none'));
  checks.push('reduced-motion preference stops idle Bipy motion');assert.deepEqual(errors,[]);checks.push('zero page or console errors during the full-motion session');
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,cards,playCount,errors},null,2));console.log(`Heart full-motion: ${checks.length} groups passed, ${cards.length} cards, ${playCount} draws.`);
 }catch(error){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,cards,errors,error:error.stack},null,2));throw error;}
 finally{if(browser)await browser.close();if(hub)await hub.close();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
