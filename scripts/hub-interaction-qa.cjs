'use strict';

/* Local, isolated interaction tour. Writes only artifacts/hub-interaction-qa/. */
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(process.env.APPDATA||'/usr/local/lib','npm','node_modules','playwright'));}
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');

const out=path.join(__dirname,'..','artifacts','hub-interaction-qa');
const records=[];
function check(ok,label,detail=''){
 records.push({ok:Boolean(ok),label,detail});
 if(!ok)console.error(`FAIL ${label}: ${detail}`);
}
async function layout(page){
 return page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,focus:document.activeElement?.id||document.activeElement?.className||''}));
}
async function run(){
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-interaction-'));
 let hub,browser;
 try{
  fs.mkdirSync(out,{recursive:true});
  hub=await createHub({dataDir,adminPin:'246810',local:true});
  browser=await playwright.chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(hub.origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('body[data-ready="1"]').waitFor();
  check(await page.locator('#onboardModal').isVisible(),'onboarding opens');
  check(await page.evaluate(()=>document.querySelector('main').inert),'onboarding backgrounds inert');
  const avatars=page.locator('#onboardAvatars [data-avatar]');
  await avatars.first().focus();
  await page.keyboard.press('ArrowRight');
  check(await avatars.nth(1).getAttribute('aria-checked')==='true','avatar ArrowRight selects next');
  await page.keyboard.press('End');
  check(await avatars.last().getAttribute('aria-checked')==='true','avatar End selects last');
  await page.locator('#nicknameInput').fill('QA Interaksi');
  await page.locator('#onboardSave').click();
  await page.locator('#onboardModal').waitFor({state:'hidden'});
  check(!await page.evaluate(()=>document.querySelector('main').inert),'onboarding restores background');

  const dots=page.locator('#cabinetDots [data-feature]');
  await dots.first().focus();
  await page.keyboard.press('ArrowRight');
  check(await dots.nth(1).getAttribute('aria-pressed')==='true','featured ArrowRight selects next');
  await page.keyboard.press('Home');
  check(await dots.first().getAttribute('aria-pressed')==='true','featured Home selects first');

  const guide=page.locator('[data-howto="spin"]').first();
  await guide.focus();await guide.click();
  await page.locator('#gameModal.open').waitFor();
  check(await page.evaluate(()=>document.querySelector('main').inert),'guide backgrounds inert');
  const focusInside=await page.evaluate(()=>document.querySelector('#gameModal').contains(document.activeElement));
  check(focusInside,'guide receives focus');
  const focusables=page.locator('#gameModal a[href],#gameModal button:not([disabled]),#gameModal input:not([disabled]),#gameModal [tabindex="0"]');
  await focusables.last().focus();await page.keyboard.press('Tab');
  check(await focusables.first().evaluate(node=>node===document.activeElement),'guide Tab wraps last to first');
  await focusables.first().focus();await page.keyboard.press('Shift+Tab');
  check(await focusables.last().evaluate(node=>node===document.activeElement),'guide Shift+Tab wraps first to last');
  await page.keyboard.press('Escape');
  await page.locator('#gameModal').waitFor({state:'hidden'});
  check(await guide.evaluate(node=>node===document.activeElement),'guide Escape restores trigger focus');
  check(!await page.evaluate(()=>document.querySelector('main').inert),'guide Escape restores background');

  await page.locator('#playerChip').click();
  await page.locator('#profileModal.open').waitFor();
  const profileAvatars=page.locator('#profileAvatars [data-avatar]');
  await profileAvatars.first().focus();await page.keyboard.press('End');
  check(await profileAvatars.last().getAttribute('aria-checked')==='true','profile avatar End selects last');
  await page.keyboard.press('Escape');

  await page.locator('#guide details').filter({has:page.locator('#motionToggle')}).locator('summary').click();
  await page.locator('#motionToggle').click();
  check(await page.locator('html').getAttribute('data-motion')==='reduce','motion preference applies');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('body[data-ready="1"]').waitFor();
  check(await page.locator('html').getAttribute('data-motion')==='reduce','motion preference survives reload');

  await context.setOffline(true);
  await page.locator('#connectionNote:visible').waitFor({timeout:5000});
  check((await page.locator('#connectionText').textContent()).includes('offline'),'offline banner explains state');
  await page.screenshot({path:path.join(out,'hub-offline-390.png')});
  await context.setOffline(false);
  await page.locator('#connectionNote').waitFor({state:'hidden',timeout:15000});
  check(true,'online event retries and clears banner');
  const hubLayout=await layout(page);
  check(hubLayout.scrollWidth<=hubLayout.width+2,'hub 390 horizontal fit',JSON.stringify(hubLayout));

  for(const width of [320,390]){
   const studioContext=await browser.newContext({viewport:{width,height:740}});
   const studio=await studioContext.newPage();
   studio.on('pageerror',error=>errors.push(error.message));
   await studio.goto(hub.origin+'/studio',{waitUntil:'domcontentloaded'});
   await studio.locator('#pin').fill('246810');
   await studio.locator('#loginButton').click();
   await studio.locator('#studioApp:visible').waitFor({timeout:15000});
   const measure=await layout(studio);
   check(measure.scrollWidth<=measure.width+2,`Studio ${width} horizontal fit`,JSON.stringify(measure));
   check(await studio.locator('#stPlayers').isVisible(),`Studio ${width} stats visible`);
   await studio.screenshot({path:path.join(out,`studio-${width}.png`),fullPage:false});
   await studioContext.close();
  }
  check(!errors.length,'browser console and page errors',JSON.stringify(errors));
  await context.close();
 }catch(error){check(false,'QA script completed',error.stack||String(error));}
 finally{
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),records},null,2));
  await browser?.close();
  await hub?.close();
  fs.rmSync(dataDir,{recursive:true,force:true});
 }
 if(records.some(record=>!record.ok))process.exitCode=1;
 console.log(`${records.filter(record=>record.ok).length}/${records.length} interaction checks passed; ${out}`);
}
run().catch(error=>{console.error(error);process.exitCode=1;});
