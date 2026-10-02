'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const playwright=require(path.join(process.env.APPDATA,'npm/node_modules/playwright'));
const {createHub}=require('../hub/server.cjs');
const live=(process.env.GAMYSUF_LIVE_URL||'').trim(),out=path.join(__dirname,'../artifacts',live?'heart-presentation-live':'heart-presentation');
const report={origin:'',checks:[],cases:[],errors:[]};
function check(value,label){assert.ok(value,label);report.checks.push(label);}
async function fit(page,label){check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' no overflow');}
async function run(browser,name,w,h,origin){
 const label=`${name}-${w}x${h}`,context=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();let draws=0;
 page.on('pageerror',e=>report.errors.push({label,error:e.message}));page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/g/heart/api/play'))draws++;});
 try{
  await page.goto(origin+'/g/heart/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HeartGame?.context().state);await page.locator('link[href*="presentation.css?v=2.5.0"]').waitFor({state:'attached'});
  check((await page.locator('.brand').textContent()).trim()==='×',label+' presents removed');check(await page.locator('.brand-crew img').count()===2,label+' two One Piece characters in brand accent');
  for(const host of ['zoro','sanji']){const image=page.locator(`.tcg-leader.host-${host} .host-art`);check((await image.getAttribute('src')).endsWith(`${host}-hero-hd.webp`),label+' '+host+' new hero');await page.waitForFunction(h=>{const i=document.querySelector(`.tcg-leader.host-${h} .host-art`);return i.complete&&i.naturalWidth===1024&&i.naturalHeight===1536;},host);}
  for(const theme of ['light','dark']){
   await page.locator(`#${theme}ThemeButton`).click();await fit(page,label+' '+theme+' home');check(await page.locator('.brand-crew img').evaluateAll(images=>images.every(i=>!getComputedStyle(i).filter.includes('invert'))),label+' '+theme+' anime colors preserved');check(await page.locator('.tcg-leader').evaluateAll(cards=>cards.every(card=>card.querySelector('.card-art').getBoundingClientRect().bottom<card.querySelector('.tcg-plate').getBoundingClientRect().top)),label+' '+theme+' complete leader bodies above labels');
   if(name==='chromium'&&w===1440)await page.screenshot({path:path.join(out,`hero-${theme}.png`),fullPage:false});
   for(const host of ['zoro','sanji']){
    await page.locator(`.host-card[data-host="${host}"]`).click();check(await page.locator('.deck-card').count()===7,label+' '+theme+' '+host+' seven cards retained');check(await page.locator('#deckActions img').count()===3,label+' '+theme+' '+host+' three owner Zoro poses');
    await page.locator('#deckActions').scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('#deckActions img')].every(i=>i.complete&&i.naturalWidth===800));
    check(await page.locator('#deckActions img').evaluateAll(images=>images.every(i=>getComputedStyle(i).objectFit==='contain'&&getComputedStyle(i).animationName==='none')),label+' '+theme+' '+host+' full mascots reduced motion');await fit(page,label+' '+theme+' '+host+' deck');
    if(name==='chromium'&&w===1440&&host==='sanji')await page.locator('#deckActions').screenshot({path:path.join(out,`bipy-actions-${theme}.png`)});
    const services=name==='chromium'&&w===390?['cinderella','twirl','whisper','offering','vow','hug','pat']:['hug','pat'];
    for(const service of services){
     const opener=page.locator(`.deck-card[data-service="${service}"] .peek-video`);await opener.click();await page.locator('#momentPreviewDialog[open]').waitFor();
     const image=page.locator('#momentPreviewPov');check((await image.getAttribute('src')).endsWith(`${host}-hero-hd.webp`),label+' '+theme+' '+host+' '+service+' replaced preview image');check((await page.locator('.pov-preview figcaption').textContent())==='Cosplayer pilihanmu',label+' accurate caption');
     await page.waitForFunction(()=>{const i=document.querySelector('#momentPreviewPov');return i.complete&&i.naturalWidth===1024;});
     const closer=page.getByRole('button',{name:'Tutup pratinjau momen',exact:true}),box=await closer.boundingBox();check(box.width>=48&&box.height>=48,label+' accessible flower close target');check(await closer.locator('svg').count()===1,label+' flower close icon');
     check((await page.locator('#momentPreviewSticker').getAttribute('src')).endsWith(`${host}-${service}.webp`),label+' '+service+' matching Bipy stays');await fit(page,label+' preview');
     if(name==='chromium'&&w===1440&&service==='hug')await page.screenshot({path:path.join(out,`preview-${host}-${theme}.png`)});
     await page.keyboard.press('Tab');await closer.focus();check(await closer.evaluate(el=>getComputedStyle(el).outlineStyle==='solid'),label+' close focus visible');await page.keyboard.press('Enter');await page.locator('#momentPreviewDialog').waitFor({state:'hidden'});check(await opener.evaluate(el=>document.activeElement===el),label+' focus restored');
    }
    await page.locator('#backHomeButton').click();
   }
  }
  check(draws===0,label+' preview and Bipy actions never draw a card');report.cases.push({label,pass:true});console.log(label+' passed');
 }finally{await context.close();}
}
async function motion(browser,name,origin){const page=await browser.newPage({viewport:{width:1440,height:900}});try{
 await page.goto(origin+'/g/heart/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HeartGame?.context().state);
 check(await page.locator('.brand-crew img').evaluateAll(images=>images.every(i=>getComputedStyle(i).animationName==='crewGreeting')),name+' brand anime accent animates');
 await page.locator('.host-card[data-host="zoro"]').click();await page.locator('#deckActions').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#deckActions').dataset.inView==='true');check(await page.locator('#deckActions img').evaluateAll(images=>images.every(i=>getComputedStyle(i).animationPlayState==='running')),name+' visible Bipy animates');
 await page.locator('#backHomeButton').click();await page.waitForFunction(()=>document.querySelector('#deckActions').dataset.inView==='false');check(await page.locator('#deckActions img').evaluateAll(images=>images.every(i=>getComputedStyle(i).animationPlayState==='paused')),name+' hidden Bipy animation pauses');
 await page.locator('#motionButton').click();check(await page.locator('.brand-crew img').evaluateAll(images=>images.every(i=>getComputedStyle(i).animationName==='none')),name+' user motion setting stops header animation');
 }finally{await page.close();}}
(async()=>{fs.mkdirSync(out,{recursive:true});const temp=fs.mkdtempSync(path.join(os.tmpdir(),'heart-presentation-'));let hub;try{if(!live)hub=await createHub({dataDir:temp,local:true,adminPin:'246810',heartPin:'1234'});report.origin=live||hub.origin;for(const name of (process.env.HEART_PRESENTATION_BROWSERS||'chromium,firefox,webkit').split(',')){const browser=await playwright[name].launch();try{for(const [w,h] of [[390,844],[768,1024],[844,390],[1440,900]])await run(browser,name,w,h,report.origin);await motion(browser,name,report.origin);}finally{await browser.close();}}check(report.errors.length===0,'zero JavaScript errors');report.pass=true;}catch(error){report.pass=false;report.error=error.stack;console.error(error.stack);process.exitCode=1;}finally{if(hub)await hub.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(`Presentation QA: ${report.checks.length} checks, pass=${report.pass}`);}})();
