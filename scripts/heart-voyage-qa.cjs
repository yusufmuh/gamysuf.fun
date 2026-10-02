'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const playwright=require(path.join(process.env.APPDATA,'npm/node_modules/playwright'));
const {createHub}=require('../hub/server.cjs');
const live=process.env.GAMYSUF_LIVE_URL||'',out=path.join(__dirname,'../artifacts',live?'heart-voyage-live':'heart-voyage');
const report={checks:[],errors:[],cases:[],embed:{}};
function check(value,label){assert.ok(value,label);report.checks.push(label);}
async function ready(page){await page.waitForFunction(()=>window.HeartGame?.context().state);await page.locator('link[href*="voyage.css?v=2.4.0"]').waitFor({state:'attached'});}
async function fit(page,label){check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' no horizontal overflow');}
async function run(browser,name,w,h,origin){
 const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,reducedMotion:'no-preference'}),page=await context.newPage(),label=`${name}-${w}x${h}`;
 page.on('pageerror',e=>report.errors.push({label,error:e.message,stack:e.stack}));
 try{
  await page.goto(origin+'/g/heart/',{waitUntil:'domcontentloaded'});await ready(page);
  check(await page.locator('#rivalryVideo').count()===1,label+' mascot rivalry replaces parade');
  const video=page.locator('#rivalryVideo');await video.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#rivalryVideo').currentTime>0,{},{timeout:30000});
  check(await video.evaluate(el=>el.videoWidth>0&&!el.paused&&el.muted&&el.loop),label+' genuine rivalry video plays muted');
  await page.locator('#rivalryToggle').click();check(await video.evaluate(el=>el.paused),label+' rivalry pause works');await page.locator('#rivalryToggle').click();
  for(const theme of ['light','dark']){
   await page.locator(`#${theme}ThemeButton`).click();await page.locator('.host-card[data-host="zoro"]').click();
   check(await page.locator('#battleBackground iframe').count()===1,label+' '+theme+' official footage embedded');
   check(await page.locator('#battleBackground iframe').getAttribute('src').then(src=>src.includes('youtube-nocookie.com/embed/Llefi8QFN0c')&&src.includes('mute=1')),label+' '+theme+' official muted source');
   const buttonStyles=await page.locator('#gachaMode,#pickMode').evaluateAll(items=>items.map(item=>getComputedStyle(item).backgroundColor));check(buttonStyles[0]!==buttonStyles[1],label+' '+theme+' distinct mode button styles');
   check(await page.locator('#startButton').evaluate(el=>el.getBoundingClientRect().height>=60&&getComputedStyle(el).boxShadow!=='none'),label+' '+theme+' raised touch CTA');
   check(await page.locator('.journey-crew img').evaluateAll(items=>items.length===2&&items.every(el=>el.complete&&el.naturalWidth>0&&getComputedStyle(el).animationName==='crewHop')),label+' '+theme+' animated chibi toolbar');
   await fit(page,label+' '+theme+' deck');await page.screenshot({path:path.join(out,label+'-'+theme+'-deck.png')});
   await page.locator('#battleToggle').click();check(await page.locator('#battleBackground iframe').count()===0,label+' '+theme+' background pause unloads player');await page.locator('#battleToggle').click();
   await page.locator('#startButton').click();await page.locator('#dealDialog[open]').waitFor();await page.locator('#skipDealButton').click({timeout:1500}).catch(()=>{});await page.waitForFunction(()=>document.querySelector('#dealShell').dataset.phase==='choose');
   await page.waitForFunction(()=>[...document.querySelectorAll('.deal-back')].every(el=>Number(getComputedStyle(el).opacity)>.99));check(await page.locator('.deal-back .pirate-back .compass-rose').count()===7,label+' '+theme+' seven visible nautical card backs');
   check(await page.locator('#battleBackground iframe').count()===0,label+' '+theme+' modal stops battle footage');await fit(page,label+' '+theme+' shuffle');
   await page.screenshot({path:path.join(out,label+'-'+theme+'-shuffle.png')});await page.locator('#cancelDealButton').click();await page.locator('#backHomeButton').click();
  }
  await page.locator('#rivalryVideo').scrollIntoViewIfNeeded();await page.locator('#motionButton').click();
  check(await page.locator('#rivalryVideo').evaluate(el=>el.paused),label+' reduced motion pauses local video');
  check(await page.locator('.table-bipys .sticker').evaluateAll(items=>items.every(el=>getComputedStyle(el).animationName==='none')),label+' reduced motion stops variants');
  await page.locator('.host-card[data-host="sanji"]').click();check(await page.locator('#battleBackground iframe').count()===0,label+' reduced motion omits battle embed');report.cases.push({label,pass:true});console.log(label+' passed');
 }finally{await context.close();}
}
async function embed(browser,origin){
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 try{const response=await page.goto(origin+'/g/heart/');await ready(page);const csp=(await response.allHeaders())['content-security-policy']||await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');check(csp.includes('frame-src https://www.youtube-nocookie.com'),'CSP permits only selected YouTube embedding origin');await page.locator('.host-card[data-host="zoro"]').click();await page.waitForFunction(()=>document.querySelector('#battleBackground iframe'));
  await page.waitForTimeout(12000);const frame=page.frames().find(item=>item.url().includes('youtube-nocookie.com/embed/Llefi8QFN0c'));assert.ok(frame,'official player frame loaded');
  const details=await frame.evaluate(()=>({title:document.title,body:document.body.innerText.slice(0,600),video:document.querySelector('video')?{paused:document.querySelector('video').paused,time:document.querySelector('video').currentTime,muted:document.querySelector('video').muted,width:document.querySelector('video').videoWidth}:null}));report.embed=details;check(Boolean(details.video&&details.video.time>8&&!details.video.paused&&details.video.muted),'Official One Piece background video actually advances muted');
 }finally{await page.close();}
}
(async()=>{fs.mkdirSync(out,{recursive:true});let hub;try{if(!live)hub=await createHub({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'heart-voyage-')),local:true,adminPin:'246810'});const origin=live||hub.origin;report.origin=origin;for(const name of (process.env.HEART_VOYAGE_BROWSERS||'chromium,firefox,webkit').split(',')){const browser=await playwright[name].launch();try{for(const [w,h] of [[390,844],[768,1024],[844,390],[1440,900]])await run(browser,name,w,h,origin);if(name==='chromium')await embed(browser,origin);}finally{await browser.close();}}check(report.errors.length===0,'zero game JavaScript errors');report.pass=true;}catch(error){report.pass=false;report.error=error.stack;console.error(error.stack);process.exitCode=1;}finally{if(hub)await hub.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('Voyage QA: '+report.checks.length+' checks; pass='+report.pass);}})();
