'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const playwright=require(path.join(process.env.APPDATA,'npm/node_modules/playwright'));
const {createHub}=require('../hub/server.cjs');
const live=(process.env.GAMYSUF_LIVE_URL||'').trim(),out=path.join(__dirname,'../artifacts',live?'heart-footer-live':'heart-footer');
const report={origin:'',checks:[],cases:[],errors:[]};
function check(value,label){assert.ok(value,label);report.checks.push(label);}
async function fit(page,label){check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' no horizontal overflow');}
async function scene(page,label){
 await page.locator('#footerRivalry').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>[...document.querySelectorAll('.footer-duel img')].every(i=>i.complete&&i.naturalWidth>0));
 await page.locator('.footer-duel img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 check(await page.locator('.footer-duel').isVisible(),label+' footer attraction visible');
 const sources=await page.locator('.footer-duel img').evaluateAll(images=>images.map(i=>new URL(i.src).pathname));
 for(const asset of ['zoro-ready.webp','zoro-jump.webp','sanji-kick.webp','sanji-flower.webp','bipy-pink.webp'])check(sources.some(s=>s.endsWith('/'+asset)),label+' original mascot '+asset);
 check(await page.locator('.footer-duel img').evaluateAll(images=>images.every(i=>getComputedStyle(i).objectFit==='contain')),label+' complete mascots');
 check(await page.locator('#footerRivalryToggle').isDisabled(),label+' reduced motion honored');
 check(await page.locator('.duel-fighter,.duel-princess').evaluateAll(elements=>elements.every(e=>getComputedStyle(e).animationName==='none')),label+' static accessible alternative');
 check(await page.locator('.footer-meta a').isVisible(),label+' staff dashboard reachable');await fit(page,label);
}
async function layout(browser,name,w,h,origin){
 const label=`${name}-${w}x${h}`,context=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();let posts=0;
 page.on('pageerror',e=>report.errors.push({label,error:e.message}));page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/g/heart/api/play'))posts++;});
 try{
  await page.goto(origin+'/g/heart/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HeartGame?.context().state);await page.locator('link[href*="presentation.css?v=2.7.0"]').waitFor({state:'attached'});
  check(await page.locator('#videoPlayButton,#videoPlayLabel,.trailer-toggle').count()===0,label+' trailer overlay removed');check(await page.locator('#paradeTrailer').count()===1,label+' trailer retained');
  const font=await page.locator('.t-sub').evaluate(e=>({size:parseFloat(getComputedStyle(e).fontSize),line:parseFloat(getComputedStyle(e).lineHeight),width:e.getBoundingClientRect().width}));
  check(font.size>=(w>600&&w<=1000?20:15),label+' readable subtitle size '+font.size);check(font.line>=font.size*1.5,label+' subtitle line spacing');
  for(const theme of ['light','dark']){
   await page.locator(`#${theme}ThemeButton`).click();await scene(page,label+' '+theme+' home');
   if(name==='chromium'&&[390,768,1440].includes(w))await page.locator('.footer').screenshot({path:path.join(out,`footer-${w}-${theme}.png`)});
   await page.locator('.host-card[data-host="sanji"]').click();check(await page.locator('.deck-card').count()===7,label+' seven cards retained');await scene(page,label+' '+theme+' deck');await page.locator('#backHomeButton').click();
  }
  check(posts===0,label+' footer does not issue tickets');report.cases.push({label,pass:true});console.log(label+' passed');
 }finally{await context.close();}
}
async function motion(browser,name,origin){
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'}),page=await context.newPage(),label=name+' motion';page.on('pageerror',e=>report.errors.push({label,error:e.message}));
 try{
  await page.goto(origin+'/g/heart/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HeartGame?.context().state);
  await page.locator('#paradeTrailer').scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const v=document.querySelector('#paradeTrailer');return v.readyState>=2&&!v.paused&&v.currentTime>.1;});check(await page.locator('.trailer-screen button').count()===0,label+' unobstructed trailer plays');
  await page.locator('#motionButton').click();await page.waitForFunction(()=>document.querySelector('#paradeTrailer').paused);check(await page.locator('#paradeTrailer').evaluate(v=>v.paused),label+' global motion pauses trailer');await page.locator('#motionButton').click();await page.waitForFunction(()=>!document.querySelector('#paradeTrailer').paused);
  await page.locator('#footerRivalry').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#footerRivalry').dataset.inView==='true');
  const before=await page.locator('.duel-zoro').evaluate(e=>getComputedStyle(e).transform);await page.waitForFunction(value=>getComputedStyle(document.querySelector('.duel-zoro')).transform!==value,before);check(true,label+' fighter actually moves');
  check(await page.locator('.duel-fighter,.duel-princess').evaluateAll(elements=>elements.every(e=>e.getAnimations().some(a=>a.playState==='running'))),label+' all three characters animate');
  await page.locator('#footerRivalryToggle').click();check(await page.locator('#footerRivalryToggle').getAttribute('aria-pressed')==='false',label+' local pause accessible');
  await page.waitForFunction(()=>document.querySelector('.duel-zoro').getAnimations()[0].playState==='paused');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const paused=await page.locator('.duel-zoro').evaluate(e=>e.getAnimations()[0].currentTime);await page.waitForTimeout(250);check(await page.locator('.duel-zoro').evaluate((e,t)=>Math.abs(e.getAnimations()[0].currentTime-t)<1,paused),label+' local pause freezes actual timeline');
  await page.locator('#footerRivalryToggle').click();await page.waitForFunction(()=>document.querySelector('#footerRivalry').dataset.inView==='true');
  await page.locator('#title').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#footerRivalry').dataset.inView==='false');check(await page.locator('.duel-zoro').evaluate(e=>e.getAnimations()[0].playState==='paused'),label+' offscreen animation stops');
  await page.locator('#footerRivalry').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#footerRivalry').dataset.inView==='true');await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#footerRivalryToggle').disabled);check(await page.locator('.duel-fighter,.duel-princess').evaluateAll(elements=>elements.every(e=>e.getAnimations().length===0)),label+' system motion setting removes animation');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.querySelector('#footerRivalry').dataset.inView==='true');
  await page.locator('.host-card[data-host="zoro"]').click();await page.locator('#footerRivalry').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#footerRivalry').dataset.inView==='true');
  await page.locator('.deck-card[data-service="hug"] .peek-video').click();await page.locator('#momentPreviewDialog[open]').waitFor();check(await page.locator('#footerRivalry').getAttribute('data-in-view')==='false',label+' modal pauses background attraction');await page.locator('#closeMomentPreview').click();
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(out,{recursive:true});const temp=fs.mkdtempSync(path.join(os.tmpdir(),'heart-footer-'));let hub;try{if(!live)hub=await createHub({dataDir:temp,local:true,adminPin:'246810',heartPin:'1234'});report.origin=live||hub.origin;for(const name of ['chromium','firefox','webkit']){const browser=await playwright[name].launch();try{for(const [w,h] of [[390,844],[768,1024],[844,390],[1440,900]])await layout(browser,name,w,h,report.origin);await motion(browser,name,report.origin);}finally{await browser.close();}}check(report.errors.length===0,'zero JavaScript errors');report.pass=true;}catch(error){report.pass=false;report.error=error.stack;console.error(error.stack);process.exitCode=1;}finally{if(hub)await hub.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(`Footer QA: ${report.checks.length} checks, pass=${report.pass}`);}})();
