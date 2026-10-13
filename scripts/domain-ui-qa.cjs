'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const playwright=require('playwright');
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts','domain-ui');
const observations=[],errors=[],renderers=[];
const check=(ok,label,detail='')=>{observations.push({ok:Boolean(ok),label,detail});if(!ok)console.error('FAIL '+label+' '+detail);};
const sizes=[[280,653],[320,568],[390,844],[717,512],[768,1024],[844,390],[1280,800],[1920,1080]];
async function geometry(page,label){
 const data=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,controls:['auto','touch','mute'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{id,w:r.width,h:r.height};})}));
 check(data.scrollWidth<=data.width+1,label+' overflow',JSON.stringify(data));
 check(data.controls.every(item=>item.w>=43.5&&item.h>=43.5),label+' touch targets',JSON.stringify(data.controls));
}
async function main(){
 fs.mkdirSync(out,{recursive:true});const temp=fs.mkdtempSync(path.join(os.tmpdir(),'domain-ui-'));let hub;
 try{
  hub=await createHub({dataDir:temp,adminPin:'246810',local:true});
  for(const name of ['chromium','firefox','webkit']){
   let browser;
   try{browser=await playwright[name].launch(name==='chromium'?{args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})}catch(error){check(false,name+' browser launch',error.message);continue;}
   try{
    const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true,reducedMotion:'no-preference'});
    await context.addInitScript(()=>{window.__audio=[];const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(!window.__audio.includes(this))window.__audio.push(this);return original.apply(this,arguments)};});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push({browser:name,message:error.message}));
    page.on('console',message=>{if(message.type()==='error'&&message.location().url.includes('/g/domain/'))errors.push({browser:name,message:message.text()});});
    await page.goto(hub.origin+'/g/domain/');await page.locator('#modeLabel').filter({hasText:'Mode demo'}).waitFor();
    await page.locator('#bipyStage[data-loaded-character="gojo"], #bipyStage .fallback-stage').first().waitFor({timeout:25000});
    renderers.push({browser:name,renderer:await page.locator('#bipyStage').getAttribute('data-renderer')});
    check(await page.locator('.cast-choice').count()===13,name+' all 13 characters');
    for(const [w,h]of sizes){await page.setViewportSize({width:w,height:h});await geometry(page,`${name} ${w}x${h} gojo`);await page.locator('#characters [data-value="geto"]').click();await geometry(page,`${name} ${w}x${h} geto`);await page.waitForFunction(()=>getComputedStyle(document.body).backgroundColor==='rgb(13, 6, 26)',null,{timeout:4000});check(true,name+' distinct Geto '+w);await page.locator('#characters [data-value="gojo"]').click();}
    await page.setViewportSize({width:1280,height:800});
    if(name==='chromium'){
     for(const id of ['gojo','geto','yuji','megumi','nobara','sukuna','yuta','maki','toge','panda','nanami','toji','kenjaku']){
      await page.locator(`[data-character="${id}"]`).click();await page.locator(`#bipyStage[data-loaded-character="${id}"]`).waitFor({timeout:15000});check(true,'chromium loads '+id);
     }
     await page.locator('#characters [data-value="geto"]').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'geto-desktop.png')});
     await page.locator('[data-view="model"]').click();await page.evaluate(()=>scrollTo(0,0));await page.locator('[data-pose="cast"]').first().click();await page.screenshot({path:path.join(out,'geto-model.png')});
     await page.locator('[data-view="illustration"]').click();await page.locator('#characters [data-value="gojo"]').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'gojo-desktop.png')});
     await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'gojo-mobile.png')});await page.setViewportSize({width:1280,height:800});
    }
    for(const round of [{host:'gojo',activity:'infinity',track:'fanservice',control:'auto'},{host:'geto',activity:'seal',track:'beauty',control:'auto'},{host:'gojo',activity:'infinity',track:'beauty',control:'touch'},{host:'geto',activity:'seal',track:'fanservice',control:'touch'}]){
     await page.locator(`#characters [data-value="${round.host}"]`).click();await page.locator(`#tracks [data-value="${round.track}"]`).click();await page.locator('#'+round.control).click();
     await page.locator('#playScreen:not([hidden])').waitFor();await page.locator('#arena3d[data-loaded-character], #arena3d .fallback-stage').first().waitFor({timeout:20000});
     const label=name+' '+round.activity+' '+round.track+' '+round.control;
     check(await page.locator('#playScreen').isVisible(),label+' starts from one launch');
     if(round.control==='touch'){
      const rect=await page.locator('#game').boundingBox();
      if(round.activity==='seal')for(let i=0;i<8;i++){const current=await page.locator('#game').boundingBox();await page.touchscreen.tap(current.x+current.width*(.22+.56*(.5+.5*Math.sin(i*2.2))),current.y+current.height*(.18+(i%4)*.16));await page.waitForFunction(index=>document.getElementById('score').textContent.startsWith(String(index+1)),i,{timeout:2500});}
      else {await page.touchscreen.tap(rect.x+rect.width*.5,rect.y+rect.height*.52);await page.locator('#game').press('ArrowRight');await page.locator('#game').press('ArrowUp');}
      await page.waitForTimeout(160);check((await page.locator('#score').innerText()).startsWith(round.activity==='seal'?'8':'1'),label+' actual touch input score',await page.locator('#score').innerText());
     }
     if(name==='chromium'&&round.activity==='infinity'&&round.control==='auto'){
      await page.waitForTimeout(1800);const playing=await page.evaluate(()=>window.__audio.some(a=>a.src.includes('bpedia-owner-bgm')&&!a.paused&&a.currentTime>0));check(playing,label+' supplied Bpedia music plays');
      await page.locator('#mute').click();check(await page.evaluate(()=>window.__audio.every(a=>a.paused)),label+' mute stops audio');await page.locator('#mute').click();
      await page.screenshot({path:path.join(out,'infinity-playing.png')});
     }
     await page.locator('#resultScreen:not([hidden])').waitFor({timeout:60000});
     const ticket=await page.locator('#ticketCode').innerText();check(ticket.includes('DEMO-'),label+' demo ticket');check((await page.locator('#claimInfo').innerText()).includes('tidak dapat diklaim'),label+' demo claim boundary');
     if(name==='chromium'&&round.activity==='seal'&&round.control==='auto'){await page.screenshot({path:path.join(out,'beauty-result.png')});await page.reload();await page.locator('#resultScreen:not([hidden])').waitFor();check(await page.locator('#ticketCode').innerText()===ticket,label+' pending survives reload');}
     await page.locator('#ack').click();await page.locator('#home:not([hidden])').waitFor();check(await page.locator('body').evaluate(body=>body.querySelector('#characters [aria-pressed="true"]')?.dataset.value===(body.classList.contains('theme-geto')?'geto':'gojo')),label+' host theme consistent');
     console.log('PASS '+label);
    }
    check(!errors.some(e=>e.browser===name),name+' no application errors',JSON.stringify(errors.filter(e=>e.browser===name)));
    await context.close();
   }catch(error){check(false,name+' UI run',error.stack||error.message);}finally{await browser.close();}
  }
 }finally{if(hub)await hub.close();const resolved=path.resolve(temp);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep))throw new Error('Temporary QA path outside intended root');fs.rmSync(resolved,{recursive:true,force:true});}
 const report={at:new Date().toISOString(),version:require('../package.json').version,total:observations.length,passed:observations.filter(x=>x.ok).length,failed:observations.filter(x=>!x.ok),errors,renderers,observations};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed,renderers},null,2));if(report.failed.length)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
