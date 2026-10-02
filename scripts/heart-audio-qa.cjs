'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const playwright=require(path.join(process.env.APPDATA,'npm','node_modules','playwright'));
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');
const root=path.join(__dirname,'..'),live=process.env.GAMYSUF_LIVE_URL||'',out=path.join(root,'artifacts',live?'heart-audio-live':'heart-audio');
const requested=(process.env.HEART_AUDIO_BROWSERS||'chromium,firefox,webkit').split(',').map(v=>v.trim()).filter(Boolean);

async function snapshot(page){return page.evaluate(()=>{
 const a=window.__heartAudio;
 const media=m=>({src:m.currentSrc||m.src,time:m.currentTime,duration:Number.isFinite(m.duration)?m.duration:null,paused:m.paused,loop:m.loop,volume:m.volume,readyState:m.readyState,error:m.error?{code:m.error.code,message:m.error.message}:null});
 return {muted:a.muted,unlocked:a.unlocked,context:a.ctx?.state||null,gain:a.out?.gain.value??null,sources:a.sources?.size??null,bgm:media(a.bgm),hook:media(a.hook),events:window.__heartAudioEvents.slice(-16)};
});}
async function waitAudio(page,predicate,timeout=15000){await page.waitForFunction(predicate,null,{timeout});}

async function diagnoseLoop(browserType,origin){
 const browser=await browserType.launch(),context=await browser.newContext(),runs=[];let page,current;
 try{
  page=await context.newPage();
  await page.route(origin+'/native-audio-diagnostic',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="en"><body><button id="nativePlay">Play native Bpedia music</button></body></html>'}));
  await page.goto(origin+'/native-audio-diagnostic');
  for(const variant of ['natural accelerated ending','seek near ending']){
   await page.evaluate(({origin,variant})=>{
    window.__nativeMusic?.pause();window.__nativeEvents=[];
    const media=new Audio(origin+'/g/heart/assets/audio/bpedia-home-suite.mp3');media.loop=true;media.preload='auto';window.__nativeMusic=media;
    const trace=(event,extra={})=>window.__nativeEvents.push({event,time:media.currentTime,paused:media.paused,seeking:media.seeking,rate:media.playbackRate,at:performance.now(),...extra});
    for(const event of ['loadedmetadata','playing','pause','ended','seeking','seeked','waiting','stalled','error'])media.addEventListener(event,()=>trace(event));
    document.getElementById('nativePlay').onclick=()=>{trace('gesture-play');media.play().then(()=>trace('play-promise-resolved'),error=>trace('play-promise-rejected',{message:error.message}));};
    if(variant==='natural accelerated ending'){
     for(const rate of [4,2]){try{media.playbackRate=rate;break;}catch(error){trace('rate-rejected',{rate,message:error.message});}}
    }
   },{origin,variant});
   await page.locator('#nativePlay').click();
   await page.waitForFunction(()=>window.__nativeMusic.readyState>=2&&!window.__nativeMusic.paused&&window.__nativeMusic.currentTime>.1);
   const before=await page.evaluate(()=>({duration:window.__nativeMusic.duration,rate:window.__nativeMusic.playbackRate,time:window.__nativeMusic.currentTime}));
   current={variant,before};console.log(`Native ${browserType.name()} ${variant}: rate ${before.rate}, duration ${before.duration}s`);
   if(variant==='natural accelerated ending')await page.waitForFunction(()=>window.__nativeMusic.currentTime>window.__nativeMusic.duration-5,null,{timeout:120000});
   else await page.evaluate(()=>{const m=window.__nativeMusic;m.currentTime=m.duration-.25;});
   await page.waitForFunction(()=>{const m=window.__nativeMusic;return !m.seeking&&(m.currentTime<5||m.paused);},null,{timeout:20000});
   const boundary=await page.evaluate(()=>({time:window.__nativeMusic.currentTime,paused:window.__nativeMusic.paused,ended:window.__nativeMusic.ended}));
   await page.waitForTimeout(650);
   const after=await page.evaluate(()=>({time:window.__nativeMusic.currentTime,paused:window.__nativeMusic.paused,ended:window.__nativeMusic.ended,error:window.__nativeMusic.error?.message||null,events:window.__nativeEvents}));
   runs.push({variant,before,boundary,after,keptPlaying:!after.paused&&after.time>boundary.time+.1});
  }
  return {browser:browserType.name(),runs};
 }catch(error){if(page)try{current={...current,after:await page.evaluate(()=>({time:window.__nativeMusic.currentTime,paused:window.__nativeMusic.paused,rate:window.__nativeMusic.playbackRate,seeking:window.__nativeMusic.seeking,error:window.__nativeMusic.error?.message||null,events:window.__nativeEvents}))};}catch{}return {browser:browserType.name(),runs,incomplete:current,error:error.stack};}
 finally{await context.close();await browser.close();}
}

async function audit(browserType,origin){
 const browser=await browserType.launch(),checks=[],errors=[],expectedFailures=[],samples={},limitations=[],failures=[];let context,page;
 try{
  context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
   localStorage.setItem('heart-muted','0');localStorage.setItem('heart-reduced-motion','0');localStorage.setItem('gamysuf-reduced-motion','0');
   window.__heartAudioEvents=[];
   Object.defineProperty(window,'HeartAudio',{configurable:true,set(Type){
    const Observed=new Proxy(Type,{construct(Target,args,newTarget){
     const a=Reflect.construct(Target,args,newTarget);window.__heartAudio=a;
     for(const [name,media] of [['bgm',a.bgm],['hook',a.hook]])for(const event of ['playing','pause','ended','error','abort'])media.addEventListener(event,()=>window.__heartAudioEvents.push({name,event,time:media.currentTime,at:performance.now()}));
     return a;
    }});
    Object.defineProperty(window,'HeartAudio',{configurable:true,writable:true,value:Observed});
   }});
  });
  page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.location().url.includes('intentional-audio-failure')&&!m.text().includes('intentional-audio-failure'))errors.push(m.text());});
  page.on('requestfailed',r=>{if(r.url().includes('intentional-audio-failure'))expectedFailures.push({url:r.url(),error:r.failure()?.errorText});});
  await page.goto(origin+'/g/heart/');await page.locator('body[data-ready="1"]').waitFor();await waitAudio(page,()=>Boolean(window.__heartAudio));
  samples.beforeGesture=await snapshot(page);assert.ok(samples.beforeGesture.bgm.paused&&samples.beforeGesture.hook.paused);assert.equal(samples.beforeGesture.unlocked,false);assert.notEqual(samples.beforeGesture.context,'running');checks.push('no music, jingle or running audio context before a user gesture');
  await page.locator('.host-card[data-host="sanji"]').click();
  await waitAudio(page,()=>{const a=window.__heartAudio;return !a.bgm.paused&&a.bgm.currentTime>.15&&a.bgm.readyState>=2;});
  const synth=await page.evaluate(()=>window.__heartAudio.ctx!==null);
  if(synth)await waitAudio(page,()=>window.__heartAudio.ctx.state==='running');
  else limitations.push('Native AudioContext could not be created on this browser runtime; real media playback is tested, synthesized effects and master gain are unavailable.');
  samples.started=await snapshot(page);assert.ok(samples.started.bgm.src.endsWith('/assets/audio/bpedia-home-suite.mp3'));assert.ok(Math.abs(samples.started.bgm.duration-350.14)<.4);assert.equal(samples.started.bgm.loop,true);assert.ok(Math.abs(samples.started.bgm.volume-.22)<.002);assert.equal(samples.started.bgm.error,null);checks.push('real leader click plays the Bpedia suite with alternating Japanese booth narration, with looping and normal volume');
  await page.evaluate(()=>{const m=window.__heartAudio.bgm;m.currentTime=m.duration-.25;});
  try{
   await waitAudio(page,()=>{const m=window.__heartAudio.bgm;return !m.paused&&m.currentTime<2;});const restarted=await page.evaluate(()=>window.__heartAudio.bgm.currentTime);await page.waitForTimeout(500);samples.looped=await snapshot(page);assert.ok(!samples.looped.bgm.paused&&samples.looped.bgm.time>restarted+.1,'looped native BGM must continue making playback progress');checks.push('BGM actually loops across its ending without stopping');
  }catch(error){
   samples.loopFailure=await snapshot(page);failures.push('Native BGM did not remain playing across its loop boundary: '+error.message);
   await page.locator('#backHomeButton').click();await page.locator('.host-card[data-host="zoro"]').click();await waitAudio(page,()=>!window.__heartAudio.bgm.paused&&window.__heartAudio.bgm.currentTime>.1);
  }
  await page.locator('#soundButton').click();await waitAudio(page,()=>{const a=window.__heartAudio;return (!a.out||a.out.gain.value<.001)&&a.sources.size===0;});samples.buttonMuted=await snapshot(page);assert.ok(samples.buttonMuted.muted&&samples.buttonMuted.bgm.paused&&samples.buttonMuted.hook.paused);assert.equal(samples.buttonMuted.sources,0);
  await page.locator('#soundButton').click();await waitAudio(page,()=>{const a=window.__heartAudio;return !a.bgm.paused&&(!a.out||a.out.gain.value>.84);});checks.push(synth?'real sound button mutes both media and master gain, then resumes BGM':'real sound button mutes both media and resumes BGM without synthesized audio support');
  let draws=0;
  async function draw(service){
   await page.locator('#pickMode').click();await page.locator(`.card-choice[data-service="${service}"]`).click();
   const response=page.waitForResponse(r=>r.url().endsWith('/g/heart/api/play')&&r.request().method()==='POST');await page.locator('#startButton').click();
   const result=await (await response).json();assert.equal(result.demo,true,'audio QA must never issue official booth tickets');assert.equal(result.service.id,service);draws++;return result;
  }
  await draw('vow');
  if(synth){
   await waitAudio(page,()=>window.__heartAudio.sources.size>=14&&document.querySelector('#resultDialog').open);
   samples.activeSfx=await snapshot(page);await page.keyboard.press('m');await waitAudio(page,()=>window.__heartAudio.out.gain.value<.001&&window.__heartAudio.sources.size===0);samples.sfxMuted=await snapshot(page);assert.equal(samples.sfxMuted.sources,0);assert.ok(samples.sfxMuted.bgm.paused);await page.keyboard.press('m');checks.push('mute during the real Secret Rare reveal clears scheduled effects immediately');
  }
  await page.locator('#playShell[data-phase="result"]').waitFor();
  await waitAudio(page,()=>{const a=window.__heartAudio;return !a.hook.paused&&a.hook.currentTime>.12&&a.bgm.volume<.065;});samples.ducked=await snapshot(page);assert.equal(samples.ducked.hook.volume,.95);assert.ok(samples.ducked.hook.duration>0);assert.equal(samples.ducked.hook.error,null);
  await page.keyboard.press('m');await waitAudio(page,()=>!window.__heartAudio.out||window.__heartAudio.out.gain.value<.001);samples.hookMuted=await snapshot(page);assert.ok(samples.hookMuted.hook.paused&&samples.hookMuted.bgm.paused);
  await page.keyboard.press('m');await waitAudio(page,()=>{const a=window.__heartAudio;return !a.bgm.paused&&a.hook.paused&&a.bgm.volume>.215;});samples.hookUnmuted=await snapshot(page);checks.push('actual poster stamp plays the Bpedia hook and ducks BGM; mute/unmute drops the interrupted hook and restores normal music');
  await page.locator('#finishButton').click();await page.locator('#resultDialog').waitFor({state:'hidden'});
  await draw('twirl');await page.locator('#playShell[data-phase="result"]').waitFor();await waitAudio(page,()=>{const a=window.__heartAudio;return !a.hook.paused&&a.hook.currentTime>.12&&a.bgm.volume<.065;});
  await page.evaluate(()=>{const hook=window.__heartAudio.hook;hook.currentTime=hook.duration-.2;});
  await waitAudio(page,()=>{const a=window.__heartAudio;return a.hook.ended&&a.bgm.volume>.215;});samples.hookEnded=await snapshot(page);checks.push('the real jingle ended event restores BGM from ducked volume');
  await page.locator('#finishButton').click();await page.locator('#resultDialog').waitFor({state:'hidden'});
  // Change only visibility input; native media playback and AudioContext remain intact.
  await page.evaluate(()=>{window.__audioHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__audioHidden});window.__audioHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
  if(synth)await waitAudio(page,()=>window.__heartAudio.ctx.state==='suspended');samples.hidden=await snapshot(page);assert.ok(samples.hidden.bgm.paused&&samples.hidden.hook.paused);assert.equal(samples.hidden.sources,0);
  await page.evaluate(()=>{window.__audioHidden=false;document.dispatchEvent(new Event('visibilitychange'));});await waitAudio(page,()=>{const a=window.__heartAudio;return (!a.ctx||a.ctx.state==='running')&&!a.bgm.paused;});samples.visible=await snapshot(page);checks.push(synth?'visibility handler pauses media, clears effects and suspends context, then resumes only BGM':'visibility handler pauses both native media and resumes only BGM');
  // Trigger native media loading failure while the poster jingle is already playing.
  await page.route('**/intentional-audio-failure.mp3',route=>route.abort('failed'));
  await draw('offering');await page.locator('#playShell[data-phase="result"]').waitFor();await waitAudio(page,()=>{const a=window.__heartAudio;return !a.hook.paused&&a.hook.currentTime>.12&&a.bgm.volume<.065;});
  await page.evaluate(()=>{const hook=window.__heartAudio.hook;hook.src=new URL('intentional-audio-failure.mp3',hook.src).href;hook.load();});
  await waitAudio(page,()=>window.__heartAudio.hook.error&&window.__heartAudio.bgm.volume>.215);samples.failedHook=await snapshot(page);assert.ok(expectedFailures.length>0||samples.failedHook.hook.error,'failed audio request must produce native media error evidence');checks.push('native jingle error/abort after playback begins restores normal BGM');
  await page.locator('#finishButton').click();await page.locator('#resultDialog').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);checks.push('zero page or unexpected console errors');
  return {browser:browserType.name(),checks,draws,samples,limitations,expectedFailures,errors,...(failures.length?{error:failures.join('\n')}:{})};
 }catch(error){if(page)try{samples.failure=await snapshot(page);}catch{}return {browser:browserType.name(),checks,samples,limitations,expectedFailures,errors,error:[...failures,error.stack].join('\n')};}
 finally{if(context)await context.close();await browser.close();}
}

async function main(){
 fs.mkdirSync(out,{recursive:true});const temp=live?null:fs.mkdtempSync(path.join(os.tmpdir(),'grand-line-audio-'));let hub;
 const report={mode:live?'live visitor demo':'isolated local hub',version:require('../package.json').version,at:new Date().toISOString(),browsers:[]};
 try{
  if(!live)hub=await createHub({dataDir:temp,local:true,adminPin:'246810'});const origin=(live||hub.origin).replace(/\/$/,'');report.origin=origin;
  const diagnostic=process.env.HEART_AUDIO_DIAGNOSE_LOOP==='1';
  for(const name of requested){assert.ok(['chromium','firefox','webkit'].includes(name),`Unknown browser: ${name}`);report.browsers.push(await(diagnostic?diagnoseLoop:audit)(playwright[name],origin));fs.writeFileSync(path.join(out,diagnostic?'loop-diagnostic.json':'report.json'),JSON.stringify(report,null,2));}
  if(diagnostic){console.log(JSON.stringify(report,null,2));return;}
  const failures=report.browsers.filter(b=>b.error);if(failures.length)throw new Error(failures.map(b=>`${b.browser}: ${b.error}`).join('\n'));
  console.log(`Heart audio: ${report.browsers.length} browsers, ${report.browsers.reduce((n,b)=>n+b.checks.length,0)} meaningful checks, ${report.browsers.reduce((n,b)=>n+b.draws,0)} demo draws.`);
 }finally{if(hub)await hub.close();if(temp){assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(temp,{recursive:true,force:true});}}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
