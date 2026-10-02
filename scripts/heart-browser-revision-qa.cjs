'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const playwright=require(path.join(process.env.APPDATA,'npm/node_modules/playwright'));
const {createHub}=require('../hub/server.cjs');
const live=(process.env.GAMYSUF_LIVE_URL||'').trim();
const out=path.join(__dirname,'../artifacts',live?'heart-browser-revision-live':'heart-browser-revision');
const report={origin:'',checks:[],cases:[],errors:[]};
function check(value,label){assert.ok(value,label);report.checks.push(label);}
async function tap(page,locator){await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();assert.ok(box);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height*.36);}
async function fit(page,label){check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' no page overflow');}
async function ready(page){await page.waitForFunction(()=>window.HeartGame?.context().state);assert.equal(await page.locator('link[href*="/css/journey.css?v=2.6.0"]').count(),1,'current frame-safe leader stylesheet');}
async function resultReady(page){await page.locator('#resultDialog[open]').waitFor();await page.waitForFunction(()=>window.HeartGame.context().stage==='result');}
async function finish(page){await page.locator('#finishButton').click();await page.locator('#resultDialog').waitFor({state:'hidden'});}
async function caseRun(browser,name,w,h,origin){
 const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),label=`${name}-${w}x${h}`;
 let writes=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/g/heart/api/play'))writes++;});page.on('pageerror',e=>report.errors.push({label,error:e.message}));
 try{
  await page.goto(origin+'/g/heart/',{waitUntil:'networkidle'});await ready(page);
  check(await page.locator('.home-music,#homeMusicButton,#homeMusicStatus,#ticketBox').count()===0,label+' removed requested music and ticket UI');
  for(const theme of ['light','dark']){await page.locator(`#${theme}ThemeButton`).click();check(await page.evaluate(t=>getComputedStyle(document.documentElement).getPropertyValue('--pink').trim().toUpperCase()===(t==='light'?'#E62B5E':'#FF5C8A'),theme),label+' '+theme+' exact brand pink');await fit(page,label+' '+theme);}
  await page.locator('#lightThemeButton').click();await page.screenshot({path:path.join(out,label+'-home.png')});
  check(await page.locator('.hero-mascots img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)),label+' both background mascots decode');
  await page.locator('#openStickerGallery').click();await page.waitForFunction(()=>document.querySelectorAll('#stickerGalleryGrid img').length===50);check(await page.locator('#stickerGalleryGrid img').count()===50,label+' supplied fifty artworks retained outside music block');await page.locator('#closeStickerGallery').click();
  for(const host of ['zoro','sanji']){
   if(host==='sanji')await page.locator('#backHomeButton').click();await page.locator(`.host-card[data-host="${host}"]`).click();
   check(await page.locator('#startButton').evaluate(b=>b.getBoundingClientRect().height>=56),label+' '+host+' prominent touch-sized gacha CTA');
   const beforePreview=writes;await tap(page,page.locator('.deck-card[data-service="twirl"] .tcg'));await page.locator('#momentPreviewDialog[open]').waitFor();check(writes===beforePreview,label+' '+host+' preview draws nothing');await page.locator('#closeMomentPreview').click();
   await page.locator('#pickMode').click();
   const services=name==='chromium'&&w===390?['cinderella','twirl','whisper','offering','vow','hug','pat']:[host==='zoro'?'hug':'vow'];
   for(const service of services){
    const before=writes,responsePromise=page.waitForResponse(r=>r.url().endsWith('/g/heart/api/play')&&r.request().method()==='POST');
    await tap(page,page.locator(`.deck-card[data-service="${service}"] .tcg`));const response=await responsePromise,data=await response.json();await resultReady(page);
    check(response.status()===200&&data.method==='pick'&&data.service.id===service&&data.host.id===host,label+' '+host+' '+service+' one artwork tap opens chosen result');
    check(writes===before+1,label+' '+host+' '+service+' exactly one draw');
    check((await page.locator('#resultBipy').getAttribute('src')).endsWith(`/assets/stickers/${host}-${service}.webp`),label+' '+host+' matching mascot');
    check(await page.locator('#faceCard video').getAttribute('src')===data.card.video,label+' '+host+' correct video');
    await tap(page,page.locator('#showcase'));await page.waitForFunction(()=>document.querySelector('#facePoster').classList.contains('on'));
    check(await page.locator('#facePoster .poster-dead').textContent()==='DEAD OR ALIVE',label+' '+host+' bounty wording');check(await page.locator('#facePoster .poster-photo img').count()===1,label+' '+host+' single duo photo');
    await page.locator('#showcase').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#faceCard').classList.contains('on'));check(await page.locator('#viewCard').getAttribute('aria-pressed')==='true',label+' '+host+' keyboard flips back');
    if(service==='hug'||service==='vow'){await page.screenshot({path:path.join(out,label+'-'+host+'-result.png')});await fit(page,label+' '+host+' result');}await finish(page);
   }
   await page.locator('#gachaMode').click();const before=writes;await page.locator('#startButton').click();await page.locator('#dealDialog[open]').waitFor();if(await page.locator('#skipDealButton').isVisible())await page.locator('#skipDealButton').click();await page.locator('.deal-slot').first().waitFor();check(await page.locator('.deal-slot').count()===7,label+' '+host+' seven gacha slots');
   const responsePromise=page.waitForResponse(r=>r.url().endsWith('/g/heart/api/play')&&r.request().method()==='POST');await tap(page,page.locator('.deal-slot[data-slot="3"]'));const data=await(await responsePromise).json();await resultReady(page);check(writes===before+1&&data.method==='gacha'&&data.host.id===host,label+' '+host+' one closed-card tap draws once');await finish(page);await fit(page,label+' '+host+' deck');
  }
  await page.screenshot({path:path.join(out,label+'-deck.png')});await page.goto(origin+'/studio',{waitUntil:'networkidle'});check(await page.locator('.staff-game a[href$="/admin.html"]').count()===5,label+' five game dashboards');check(await page.locator('#loginPanel,input[type=password]').count()===0,label+' central login removed');await fit(page,label+' portal');
  await page.goto(origin+'/',{waitUntil:'networkidle'});check((await page.locator('#newArenaKicker').textContent()).includes('MARKETING 6.0'),label+' Marketing 6.0 event');await fit(page,label+' hub');report.cases.push({label,pass:true});console.log(label+' passed');
 }catch(error){await page.screenshot({path:path.join(out,label+'-failure.png')}).catch(()=>{});throw error;}finally{await context.close();}
}

async function motionRun(browser,name,origin){
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push({label:name+'-motion',error:e.message}));
 try{
  await page.goto(origin+'/g/heart/',{waitUntil:'networkidle'});await ready(page);await page.locator('#lightThemeButton').click();const transforms=await page.locator('.hero-zoro,.tcg-leader .host-art').evaluateAll(items=>items.map(item=>getComputedStyle(item).transform));await page.waitForTimeout(250);const moved=await page.locator('.hero-zoro,.tcg-leader .host-art').evaluateAll(items=>items.map(item=>getComputedStyle(item).transform));check(moved.some((v,i)=>v!==transforms[i]),name+' background and leaders animate');check(await page.locator('.tcg-leader .host-art').evaluateAll(items=>items.every(item=>{const image=item.getBoundingClientRect(),frame=item.parentElement.getBoundingClientRect();return image.top>=frame.top-1&&image.left>=frame.left-1&&image.right<=frame.right+1&&image.bottom<=frame.bottom+1;})),name+' animated leaders stay inside artwork frame');
  if(name==='chromium')await page.screenshot({path:path.join(out,'desktop-light-home.png')});await page.locator('.host-card[data-host="zoro"]').click();await page.locator('#pickMode').click();await page.locator('.deck-card[data-service="hug"] .tcg').click();await page.locator('#resultDialog[open]').waitFor();await page.locator('#skipAnimation').click();await resultReady(page);
  await page.evaluate(()=>{document.querySelector('#showcase').addEventListener('click',()=>{window.observedFlip=document.querySelector('#faceCard').getAnimations().map(a=>({state:a.playState,duration:a.effect.getTiming().duration,transforms:a.effect.getKeyframes().map(frame=>frame.transform)}));},{once:true});});
  await page.locator('#showcase').click();check(await page.evaluate(()=>window.observedFlip.some(a=>a.state==='running'&&a.duration>0&&a.transforms.some(transform=>transform.includes('rotateY')))),name+' real 3D flip');await page.waitForFunction(()=>document.querySelector('#facePoster').classList.contains('on'));await page.waitForFunction(()=>document.querySelector('#showcase').getAttribute('aria-label')==='Balik poster bounty menjadi kartu');if(name==='chromium')await page.screenshot({path:path.join(out,'desktop-bounty.png')});check(await page.locator('#showcase').getAttribute('aria-label')==='Balik poster bounty menjadi kartu',name+' accessible flip label');
  const downloadPromise=page.waitForEvent('download');await page.locator('#savePoster').click();const download=await downloadPromise;await download.saveAs(path.join(out,name+'-bounty.png'));check(fs.statSync(path.join(out,name+'-bounty.png')).size>10000,name+' bounty export');await finish(page);await page.locator('#backHomeButton').click();await page.locator('#motionButton').click();check(await page.locator('.hero-zoro,.tcg-leader .host-art').evaluateAll(items=>items.every(item=>getComputedStyle(item).animationName==='none')),name+' reduced motion stops new animations');
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(out,{recursive:true});const temp=fs.mkdtempSync(path.join(os.tmpdir(),'heart-revision-'));let hub;try{if(!live)hub=await createHub({dataDir:temp,local:true,adminPin:'246810',heartPin:'1234'});report.origin=live||hub.origin;for(const name of (process.env.HEART_REVISION_BROWSERS||'chromium,firefox,webkit').split(',')){const browser=await playwright[name].launch();try{for(const [w,h] of [[390,844],[768,1024],[844,390],[1440,900]])await caseRun(browser,name,w,h,report.origin);await motionRun(browser,name,report.origin);}finally{await browser.close();}}check(report.errors.length===0,'zero JavaScript errors');report.pass=true;}catch(error){report.pass=false;report.error=error.stack;console.error(error.stack);process.exitCode=1;}finally{if(hub)await hub.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(`Browser revision: ${report.checks.length} checks, pass=${report.pass}`);}})();
