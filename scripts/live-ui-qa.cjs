'use strict';

// Public, read-only smoke tour. Run only after deployment is confirmed.
// node scripts/live-ui-qa.cjs
const fs=require('node:fs');
const path=require('node:path');
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(process.env.APPDATA||'/usr/local/lib','npm','node_modules','playwright'));}

const base=(process.env.GAMYSUF_LIVE_URL||'https://gamysuf.fun').replace(/\/$/,'');
const version=require('../package.json').version;
const out=path.join(__dirname,'..','artifacts',`live-ui-${version}`);
const checks=[];
const errors=[];
const cancelledImages=[];
function check(ok,label,detail=''){
 checks.push({ok:Boolean(ok),label,detail});
 if(!ok)console.error(`FAIL ${label}: ${detail}`);
}
function watch(page,label){
 page.on('pageerror',error=>errors.push(`${label} page: ${error.message}`));
 page.on('console',message=>{if(message.type()==='error')errors.push(`${label} console: ${message.text()}`);});
  page.on('requestfailed',request=>{
  // Theme/avatar rendering replaces image URLs; navigation can also cancel pending images.
  // Keep these cancellations as evidence and verify the final visible images after decode().
  if(request.resourceType()==='image'&&request.failure()?.errorText==='net::ERR_ABORTED'){
   cancelledImages.push(`${label}: ${request.url()}`);return;
  }
  if(request.url().startsWith(base))errors.push(`${label} request: ${request.url()} ${request.failure()?.errorText||''}`);
 });
 page.on('response',response=>{
  if(response.url().startsWith(base)&&response.status()>=400)
   errors.push(`${label} HTTP ${response.status()}: ${response.url()}`);
 });
}
async function layout(page){
 const viewport=page.viewportSize();
 return page.evaluate(expected=>({viewport:expected,clientWidth:document.documentElement.clientWidth,
  scrollWidth:document.documentElement.scrollWidth}),viewport.width);
}
async function visibleBrokenImages(page){
 return page.locator('img').evaluateAll(images=>images.filter(image=>{
  const rect=image.getBoundingClientRect();
  const style=getComputedStyle(image);
  return image.getAttribute('src')&&style.display!=='none'&&style.visibility!=='hidden'&&
    rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight&&
    image.complete&&image.naturalWidth===0;
 }).map(image=>image.currentSrc||image.src));
}
async function pageReady(page){
 await page.locator('body[data-ready="1"]').waitFor({timeout:20000});
 await page.evaluate(async()=>{await document.fonts.ready;});
}
async function waitVisibleImages(page){
 await page.evaluate(async()=>{
  const visible=[...document.images].filter(image=>{
   const box=image.getBoundingClientRect();
   return image.getAttribute('src')&&box.width>0&&box.height>0&&box.bottom>0&&box.top<innerHeight;
  });
  await Promise.all(visible.map(image=>image.decode().catch(()=>{})));
 });
}
async function main(){
 fs.mkdirSync(out,{recursive:true});
 let browser;
 try{
  browser=await playwright.chromium.launch();
  const desktop=await browser.newContext({viewport:{width:1449,height:851},reducedMotion:'reduce'});
  const deskPage=await desktop.newPage();
  watch(deskPage,'desktop');
  const versionResponse=await deskPage.request.get(`${base}/hub-api/catalog`,{timeout:15000});
  check(versionResponse.ok(),'live catalog reachable',String(versionResponse.status()));
  const catalog=versionResponse.ok()?await versionResponse.json():{};
  check(catalog.version===version,`live version ${version}`,String(catalog.version));
  if(catalog.version!==version)throw new Error(`Live version is ${catalog.version||'unavailable'}; stopped before screenshots.`);

  await deskPage.goto(`${base}/`,{waitUntil:'domcontentloaded'});
  await pageReady(deskPage);
  check(await deskPage.locator('#onboardModal').isVisible(),'desktop onboarding appears');
  check(await deskPage.locator('#onboardAvatars .avatar-roster img').count()===6,'six avatar choices rendered');
  await deskPage.waitForFunction(()=>[...document.querySelectorAll('#onboardAvatars .avatar-roster img')]
    .every(image=>image.complete&&image.naturalWidth>0),null,{timeout:15000});
  check(await deskPage.locator('#onboardAvatars .avatar-fullbody').evaluate(image=>image.complete&&image.naturalWidth>0),
    'desktop full-body preview loaded');
  const onboardLayout=await layout(deskPage);
  check(onboardLayout.scrollWidth<=Math.max(onboardLayout.clientWidth,onboardLayout.viewport)+2,
    'desktop onboarding horizontal fit',JSON.stringify(onboardLayout));
  await waitVisibleImages(deskPage);
  check(!(await visibleBrokenImages(deskPage)).length,'desktop onboarding visible assets loaded',
    JSON.stringify(await visibleBrokenImages(deskPage)));
  await deskPage.screenshot({path:path.join(out,'01-desktop-onboarding-1449x851.png')});

  // Skip writes only to this isolated browser's localStorage; no profile is submitted.
  await deskPage.locator('#onboardSkip').click();
  check(await deskPage.locator('#newArena').isVisible()&&await deskPage.locator('#newArena').getAttribute('href')==='/g/heart/',
    'Heart Parade shortcut is visible on dashboard');
  await deskPage.locator('#themeToggle').click();
  await deskPage.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  await deskPage.locator('#topnav').scrollIntoViewIfNeeded();
  const lightLayout=await layout(deskPage);
  check(lightLayout.scrollWidth<=Math.max(lightLayout.clientWidth,lightLayout.viewport)+2,
    'desktop light dashboard horizontal fit',JSON.stringify(lightLayout));
  check(await deskPage.locator('#themeToggle').getAttribute('aria-pressed')==='true',
    'desktop theme toggle marks light mode');
  check((await deskPage.locator('.topnav .brand img').getAttribute('src')).includes('gamysuf-3d-light.png'),
    'light header uses pink 3D wordmark');
  await waitVisibleImages(deskPage);
  check(!(await visibleBrokenImages(deskPage)).length,'desktop light dashboard visible assets loaded',
    JSON.stringify(await visibleBrokenImages(deskPage)));
  await deskPage.screenshot({path:path.join(out,'02-desktop-light-header-1449x851.png')});
  await desktop.close();

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
   deviceScaleFactor:1,reducedMotion:'reduce'});
  const mobilePage=await mobile.newPage();
  watch(mobilePage,'mobile');
  await mobilePage.goto(`${base}/`,{waitUntil:'domcontentloaded'});
  await pageReady(mobilePage);
  check(await mobilePage.locator('#onboardModal').isVisible(),'mobile context starts fresh onboarding');
  await mobilePage.locator('#onboardSkip').click();
  await mobilePage.locator('#album').evaluate(section=>section.scrollIntoView({block:'start'}));
  await mobilePage.locator('.gmy-album-slider-track .gmy-album-card').first().waitFor({timeout:15000});
  const album=await mobilePage.locator('.gmy-album-slider-track').evaluate(node=>({cards:node.querySelectorAll('.gmy-album-card').length,
   width:node.clientWidth,scrollWidth:node.scrollWidth}));
  check(album.cards>=6&&album.scrollWidth>album.width,'mobile album carousel populated and scrollable',JSON.stringify(album));
  const mobileLayout=await layout(mobilePage);
  check(mobileLayout.scrollWidth<=Math.max(mobileLayout.clientWidth,mobileLayout.viewport)+2,
    'mobile album horizontal fit',JSON.stringify(mobileLayout));
  await waitVisibleImages(mobilePage);
  check(!(await visibleBrokenImages(mobilePage)).length,'mobile album visible assets loaded',
    JSON.stringify(await visibleBrokenImages(mobilePage)));
  await mobilePage.screenshot({path:path.join(out,'03-mobile-album-390x844.png')});
  await mobile.close();
  for(const game of ['spin','nyapit','drop','gacha','heart']){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const page=await context.newPage();watch(page,game);
   await page.goto(`${base}/g/${game}/`,{waitUntil:'domcontentloaded'});
   await page.locator('#gmyGamebar').waitFor();
   await page.evaluate(()=>document.fonts.ready);
   for(const theme of ['dark','light']){
    if(theme==='light')await page.locator('[data-gmy-theme]').click();
    await page.waitForFunction(value=>document.documentElement.dataset.theme===value,theme);
    await waitVisibleImages(page);
    const fit=await layout(page);
    check(fit.scrollWidth<=fit.viewport+2,`${game} ${theme} mobile horizontal fit`,JSON.stringify(fit));
    const logos=await page.locator('img[data-brand="bpedia"]').evaluateAll(images=>images.map(image=>({src:image.src,loaded:image.complete&&image.naturalWidth>0})));
    const brandName=theme==='light'?'bpedia-pink':'bpedia-white';
    check(logos.length&&logos.every(image=>image.loaded&&new URL(image.src).pathname.match(new RegExp(`${brandName}\\.(?:png|webp)$`))),`${game} ${theme} Bpedia logo loaded`,JSON.stringify(logos));
    check(!(await visibleBrokenImages(page)).length,`${game} ${theme} visible assets loaded`);
    await page.screenshot({path:path.join(out,`${game}-mobile-${theme}-390x844.png`)});
   }
   if(game==='gacha'){
    await page.setViewportSize({width:1449,height:851});
    await page.locator('[data-gmy-theme]').click();
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
    await waitVisibleImages(page);
    const fit=await layout(page);
    check(fit.scrollWidth<=fit.viewport+2,'gacha desktop horizontal fit',JSON.stringify(fit));
    await page.screenshot({path:path.join(out,'gacha-desktop-dark-1449x851.png')});
   }
   await context.close();
  }
 }catch(error){check(false,'smoke tour completed',error.stack||String(error));}
 finally{
  await browser?.close();
  check(!errors.length,'browser console, HTTP and network clean',JSON.stringify(errors));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),base,checks,errors,cancelledImages},null,2));
 }
 console.log(`Live UI QA: ${checks.filter(item=>item.ok).length}/${checks.length} checks. ${out}`);
 if(checks.some(item=>!item.ok))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
