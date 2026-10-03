'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const playwright=require(path.join(process.env.APPDATA,'npm/node_modules/playwright'));
const {createHub}=require('../hub/server.cjs');
const live=(process.env.GAMYSUF_LIVE_URL||'').trim(),out=path.join(__dirname,'../artifacts',live?'heart-collection-voice-live':'heart-collection-voice');
const services=['cinderella','twirl','whisper','offering','vow','hug','pat'];
const owned=services.map((service,index)=>`${index%2?'sanji':'zoro'}:${service}`);
const report={origin:'',checks:[],errors:[],cases:[]};
function check(value,label){assert.ok(value,label);report.checks.push(label);}
async function ready(page,origin){await page.goto(origin+'/g/heart/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HeartGame?.context().state);await page.locator('link[href*="presentation.css?v=2.7.1"]').waitFor({state:'attached'});}
async function fit(page,label){check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' no horizontal overflow');}
async function decode(locator){await locator.evaluateAll(images=>Promise.all(images.map(async i=>{i.loading='eager';if(!i.complete)await new Promise((resolve,reject)=>{i.addEventListener('load',resolve,{once:true});i.addEventListener('error',reject,{once:true});});await i.decode();})));}
async function layout(browser,name,w,h,origin){
 const label=`${name}-${w}x${h}`,context=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',error=>report.errors.push({label,error:error.message}));
 await context.addInitScript(keys=>localStorage.setItem('heart-collection',JSON.stringify(keys)),owned);
 try{
  await ready(page,origin);check(await page.locator('.quote,#hostQuote,#quoteName,#videoPlayButton').count()===0,label+' requested quote and overlay removed');
  check(await page.locator('.hero-trailer .trailer-duet').count()===1,label+' new trailer caption');check(await page.locator('#homeBattleToggle').isDisabled(),label+' background respects reduced motion');
  for(const theme of ['light','dark']){
   await page.locator(`#${theme}ThemeButton`).click();await page.locator('.leader-duel-arena').scrollIntoViewIfNeeded();await decode(page.locator('.tcg-leader .host-art'));
   check(await page.locator('.host-card').count()===2,label+' '+theme+' both leaders selectable');check(await page.locator('.leader-versus').textContent()==='VS',label+' '+theme+' rivalry visible');
   check(await page.locator('.tcg-leader .host-art').evaluateAll(images=>images.every(img=>{const art=img.getBoundingClientRect(),frame=img.parentElement.getBoundingClientRect();return img.complete&&img.naturalWidth>0&&getComputedStyle(img).objectFit==='contain'&&art.top>=frame.top-1&&art.bottom<=frame.bottom+1;})),label+' '+theme+' full body leader artwork contained');
   await page.locator('#binder').scrollIntoViewIfNeeded();await decode(page.locator('.binder-moment'));
   check(await page.locator('.binder-row').count()===2&&await page.locator('.binder-visual').count()===14,label+' '+theme+' fourteen collection artworks');check(await page.locator('.binder-visual.owned').count()===7,label+' '+theme+' ownership preserved');
   check(await page.locator('#binderCount').textContent()==='7/14',label+' '+theme+' correct collection progress');check(await page.locator('#binder .tcg,#binder .tcg-power,#binder .tcg-plate').count()===0,label+' '+theme+' complex card labels removed');
   check(await page.locator('.binder-visual').evaluateAll(items=>items.every(item=>item.getAttribute('aria-label').includes(' · ')&&!item.innerText.replace(/[✦✧]/g,'').trim())),label+' '+theme+' visual only with accessible moment labels');
   check(await page.locator('.binder-visual.owned .binder-foil').count()===7&&await page.locator('.binder-visual.owned .binder-spark').count()===14,label+' '+theme+' graphic effects retained');
   check(await page.locator('.binder-video').evaluateAll(videos=>videos.every(v=>v.paused&&v.muted&&v.hasAttribute('playsinline'))),label+' '+theme+' reduced motion keeps collection static');await fit(page,label+' '+theme);
   if(name==='chromium'&&[390,768,1440].includes(w)){await page.locator('.binder').screenshot({path:path.join(out,`binder-${w}-${theme}.png`)});await page.locator('.table').screenshot({path:path.join(out,`leaders-${w}-${theme}.png`)});}
  }
  report.cases.push({label,pass:true});console.log(label+' layout passed');
 }catch(error){await page.screenshot({path:path.join(out,label+'-failure.png')}).catch(()=>{});throw error;}finally{await context.close();}
}
async function voices(browser,name,origin){
 const context=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),label=name+' voices';
 page.on('pageerror',error=>report.errors.push({label,error:error.message}));let posts=0;page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/g/heart/api/play'))posts++;});
 try{
  await ready(page,origin);for(const host of ['zoro','sanji']){
   if(host==='sanji')await page.locator('#backHomeButton').click();await page.locator(`.host-card[data-host="${host}"]`).click();await page.locator('#pickMode').click();
   for(const service of services){
    const before=posts;await page.locator(`.deck-card[data-service="${service}"] .tcg`).click();await page.waitForFunction(()=>window.HeartGame.context().stage==='result');
    await page.waitForFunction(key=>{const voice=window.HeartGame.audioStatus().voice;return voice.key===key&&!voice.paused&&voice.time>.12&&voice.ready>=2;},`${host}-${service}`,{timeout:20000});
    const voice=await page.evaluate(()=>window.HeartGame.audioStatus().voice);check(!voice.error&&voice.src.endsWith(`/assets/audio/results/${host}-${service}.mp3`),label+' '+host+' '+service+' correct announcement actually plays');check(posts===before+1,label+' '+host+' '+service+' one draw');
    if(service==='hug'){
     await page.locator('#resultSoundButton').click();check(await page.evaluate(()=>{const s=window.HeartGame.audioStatus();return s.muted&&s.voice.paused;}),label+' '+host+' mute stops result voice');await page.locator('#replayResultVoice').click();check(await page.evaluate(()=>window.HeartGame.audioStatus().voice.paused),label+' '+host+' replay respects mute');
     await page.locator('#resultSoundButton').click();check(await page.evaluate(()=>window.HeartGame.audioStatus().voice.paused),label+' '+host+' unmute does not repeat result');await page.locator('#replayResultVoice').click();await page.waitForFunction(()=>{const v=window.HeartGame.audioStatus().voice;return !v.paused&&v.time>.1;});check(posts===before+1,label+' '+host+' replay does not draw');
    }
    await page.locator('#finishButton').click();await page.locator('#resultDialog').waitFor({state:'hidden'});check(await page.evaluate(()=>window.HeartGame.audioStatus().voice.paused),label+' '+host+' '+service+' close stops voice');
   }
  }
  await page.locator('#gachaMode').click();await page.locator('#startButton').click();await page.locator('#dealDialog[open]').waitFor();await page.locator('.deal-slot[data-slot="3"]').click();await page.waitForFunction(()=>window.HeartGame.context().stage==='result');await page.waitForFunction(()=>{const v=window.HeartGame.audioStatus().voice;return !v.paused&&v.time>.1;});check(true,label+' random gacha result is spoken');await page.locator('#finishButton').click();console.log(label+' passed');
 }catch(error){await page.screenshot({path:path.join(out,name+'-voice-failure.png')}).catch(()=>{});report.voiceFailure=await page.evaluate(()=>window.HeartGame?.audioStatus()).catch(()=>null);throw error;}finally{await context.close();}
}
async function motion(browser,name,origin){
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'}),page=await context.newPage(),label=name+' motion';await context.addInitScript(keys=>localStorage.setItem('heart-collection',JSON.stringify(keys)),owned);page.on('pageerror',error=>report.errors.push({label,error:error.message}));
 try{
  await ready(page,origin);await page.locator('.leader-duel-arena').scrollIntoViewIfNeeded();await page.mouse.move(0,0);await page.waitForFunction(()=>document.querySelector('.leader-duel-arena').dataset.active==='true');
  const before=await page.locator('.leader-slot.host-zoro .tcg').evaluate(e=>getComputedStyle(e).transform);await page.waitForFunction(value=>getComputedStyle(document.querySelector('.leader-slot.host-zoro .tcg')).transform!==value,before);check(true,label+' leader cards actually move');
  await page.locator('#binder').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#binder').dataset.active==='true');await page.waitForFunction(()=>[...document.querySelectorAll('.binder-video')].some(v=>!v.paused&&v.currentTime>.1&&v.videoWidth>0));check(true,label+' collection video actually plays');
  check(await page.locator('.owned .binder-foil').evaluateAll(elements=>elements.every(e=>e.getAnimations().some(a=>a.playState==='running'))),label+' collection graphic effects running');await page.locator('#motionButton').click();await page.waitForFunction(()=>[...document.querySelectorAll('.binder-video')].every(v=>v.paused));check(await page.locator('.binder-foil').evaluateAll(items=>items.every(e=>e.getAnimations().length===0)),label+' global motion control stops effects');
  await page.locator('#motionButton').click();await page.locator('#title').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#homeBattleBackground iframe'));
  const frameSource=await page.locator('#homeBattleBackground iframe').getAttribute('src');check(frameSource.includes('/embed/Llefi8QFN0c')&&frameSource.includes('mute=1')&&frameSource.includes('loop=1'),label+' official fight embedded muted and looping');
  if(name==='chromium'){
   let frame;await page.waitForFunction(()=>document.querySelector('#homeBattleBackground iframe'));for(let i=0;i<30;i++){frame=page.frames().find(f=>f.url().includes('youtube-nocookie.com/embed/Llefi8QFN0c'));if(frame&&await frame.evaluate(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>8&&v.videoWidth>0;}).catch(()=>false))break;await page.waitForTimeout(1000);}
   report.embed=frame?await frame.evaluate(()=>({title:document.title,body:document.body.innerText.slice(0,700),video:document.querySelector('video')?{time:document.querySelector('video').currentTime,muted:document.querySelector('video').muted,paused:document.querySelector('video').paused,width:document.querySelector('video').videoWidth}:null})):null;
   check(report.embed?.video?.time>8&&report.embed.video.muted&&!report.embed.video.paused,label+' official home fight actually plays');await page.screenshot({path:path.join(out,'home-official-fight.png')});
  }
  await page.locator('#homeBattleToggle').click();check(await page.locator('#homeBattleBackground iframe').count()===0,label+' home background pause works');await page.locator('#homeBattleToggle').click();await page.waitForFunction(()=>document.querySelector('#homeBattleBackground iframe'));await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('#homeBattleBackground iframe'));check(await page.locator('#homeBattleToggle').isDisabled(),label+' system motion preference removes background');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.host-card[data-host="zoro"]').click();check(await page.locator('#homeBattleBackground iframe').count()===0,label+' deck journey stops home footage');console.log(label+' passed');
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(out,{recursive:true});let hub;try{if(!live)hub=await createHub({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'heart-collection-')),local:true,adminPin:'246810'});report.origin=live||hub.origin;for(const name of (process.env.HEART_COLLECTION_BROWSERS||'chromium,firefox,webkit').split(',')){const browser=await playwright[name].launch();try{for(const [w,h] of [[390,844],[768,1024],[844,390],[1440,900]])await layout(browser,name,w,h,report.origin);await voices(browser,name,report.origin);await motion(browser,name,report.origin);}finally{await browser.close();}}check(report.errors.length===0,'zero game JavaScript errors');report.pass=true;}catch(error){report.pass=false;report.error=error.stack;console.error(error.stack);process.exitCode=1;}finally{if(hub)await hub.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(`Collection and voice QA: ${report.checks.length} checks; pass=${report.pass}`);}})();
