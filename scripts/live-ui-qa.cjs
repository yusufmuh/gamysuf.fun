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
const mediaAborts=[];
const verifiedMedia=[];
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
  // Defer media cancellation verdicts until the exact trailer has passed readiness checks.
  if(request.url().startsWith(base)&&request.resourceType()==='media'&&request.failure()?.errorText==='net::ERR_ABORTED'){
   mediaAborts.push({label,url:request.url(),error:request.failure().errorText});return;
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
async function verifyHeartTrailer(page,label='heart'){
 await page.waitForFunction(()=>{
  const video=document.getElementById('paradeTrailer');
  return video&&video.readyState>=1&&video.videoWidth>0&&video.videoHeight>0&&
   Number.isFinite(video.duration)&&video.duration>0&&!video.error;
 },null,{timeout:20000});
 const metadata=await page.locator('#paradeTrailer').evaluate(video=>({url:video.currentSrc,poster:video.poster,
  readyState:video.readyState,width:video.videoWidth,height:video.videoHeight,duration:video.duration,
  muted:video.muted,loop:video.loop,inline:video.playsInline,error:video.error?.message||null}));
 const expectedUrl=`${base}/g/heart/assets/video/heart-parade-promo.mp4`;
 const ready=metadata.url===expectedUrl&&metadata.readyState>=1&&metadata.width>0&&metadata.height>0&&
  Number.isFinite(metadata.duration)&&metadata.duration>0&&!metadata.error;
 check(ready,`${label} trailer metadata ready`,JSON.stringify(metadata));
 check(metadata.muted&&metadata.loop&&metadata.inline&&!await page.locator('#videoPlayButton').isDisabled(),
  `${label} trailer playback control ready`,JSON.stringify(metadata));
 const expectedPoster=`${base}/g/heart/assets/video/grand-line-promo-poster.webp`;
 check(metadata.poster===expectedPoster,`${label} trailer uses release poster`,metadata.poster);
 const poster=await page.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();return {url:image.currentSrc,width:image.naturalWidth,height:image.naturalHeight};},expectedPoster);
 check(poster.url===expectedPoster&&poster.width>0&&poster.height>0,`${label} trailer poster decoded`,JSON.stringify(poster));
 if(ready)verifiedMedia.push({label,...metadata,decodedPoster:poster});
}
async function verifyHeartOpening(page,label){
 await pageReady(page);await waitVisibleImages(page);
 check((await page.locator('#title').innerText()).replace(/\s+/g,' ').trim()==='Bipy Grand Line Desire',`${label} release title`);
 check((await page.locator('.t-sub').textContent()).trim()==='Zoro & Sanji Fanservice Card Game',`${label} release subtitle`);
 check(await page.locator('#prepDialog').count()===0,`${label} direct draw markup`);
 check(await page.locator('#demoModeButton').getAttribute('aria-pressed')==='true'&&await page.locator('#liveModeButton').getAttribute('aria-pressed')==='false',`${label} public visitor stays in Demo`);
 for(const selector of ['#demoModeButton','#liveModeButton','#darkThemeButton','#lightThemeButton']){
  const control=await page.locator(selector).evaluate(node=>{const r=node.getBoundingClientRect();return {inTopbar:Boolean(node.closest('.topbar')),width:r.width,height:r.height,visible:r.width>0&&r.height>0&&getComputedStyle(node).visibility!=='hidden'};});
  check(control.inTopbar&&control.visible&&control.width>=44&&control.height>=44,`${label} ${selector} topbar touch target`,JSON.stringify(control));
 }
 const opening=await page.evaluate(()=>{
  const box=element=>{const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  const trailer=box(document.querySelector('.hero-trailer')),table=box(document.querySelector('.table')),leaders=[...document.querySelectorAll('.leader-slot')].map(box),bipys=[...document.querySelectorAll('.table-bipys .sticker')].map(box);
  const poster=box(document.querySelector('#posterPreview .poster')),photo=box(document.querySelector('#posterPreview .poster-photo')),art=document.querySelector('#posterPreview .poster-photo>img:not(.poster-bipy)'),mascot=document.querySelector('#posterPreview .poster-bipy');
  const row=getComputedStyle(document.querySelector('.table-bipys')),fan=document.querySelector('#momentGrid');
  return {viewport:{width:innerWidth,height:innerHeight},trailer,table,leaders,bipys,overlaps:bipys.map(b=>leaders.map(l=>overlap(b,l))),row:{display:row.display,position:row.position},poster,photo,art:{...box(art),fit:getComputedStyle(art).objectFit},mascot:{...box(mascot),fit:getComputedStyle(mascot).objectFit},columns:getComputedStyle(fan).gridTemplateColumns.split(/\s+/).length};
 });
 check(opening.trailer.top>=0&&opening.trailer.top<opening.viewport.height&&opening.trailer.width>200,`${label} trailer in opening viewport`,JSON.stringify(opening.trailer));
 check(opening.bipys.length===3&&opening.bipys.every((b,i)=>b.width>40&&b.height>70&&b.left>=opening.table.left-1&&b.right<=opening.table.right+1&&opening.overlaps[i].every(area=>area===0)),`${label} three full Bipy mascots stay below leaders`,JSON.stringify({bipys:opening.bipys,overlaps:opening.overlaps,row:opening.row}));
 check(opening.art.fit==='contain'&&opening.mascot.fit==='contain'&&opening.photo.height/opening.poster.height>.3&&opening.art.top>=opening.photo.top-1&&opening.art.bottom<=opening.photo.bottom+1&&opening.mascot.bottom<=opening.photo.bottom+1,`${label} bounty preview contains artwork and Bipy`,JSON.stringify({poster:opening.poster,photo:opening.photo,art:opening.art,mascot:opening.mascot}));
 if(opening.viewport.width<=760)check(opening.columns===2,`${label} mobile deck uses two columns`,String(opening.columns));
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
  check(await deskPage.locator('#newArena').isVisible()&&await deskPage.locator('#newArena').getAttribute('href')==='#market-in'&&
    await deskPage.locator('#market-in').count()===1,'event shortcut targets the dashboard event section');
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
    if(game==='heart')await page.locator(`#${theme}ThemeButton`).click();
    else if(theme==='light')await page.locator('[data-gmy-theme]').click();
    await page.waitForFunction(value=>document.documentElement.dataset.theme===value,theme);
    await waitVisibleImages(page);
    const fit=await layout(page);
    check(fit.scrollWidth<=fit.viewport+2,`${game} ${theme} mobile horizontal fit`,JSON.stringify(fit));
    const logoSelector=game==='heart'?`.brand .logo-${theme}`:'img[data-brand="bpedia"]';
    const logos=await page.locator(logoSelector).evaluateAll(images=>images.map(image=>({src:image.src,loaded:image.complete&&image.naturalWidth>0,
     visible:getComputedStyle(image).display!=='none'&&image.getBoundingClientRect().width>0})));
    const brandName=theme==='light'?'bpedia-pink':'bpedia-white';
    check(logos.length&&logos.every(image=>image.loaded&&(game!=='heart'||image.visible)&&new URL(image.src).pathname.match(new RegExp(`${brandName}\\.(?:png|webp)$`))),`${game} ${theme} Bpedia logo loaded`,JSON.stringify(logos));
    check(!(await visibleBrokenImages(page)).length,`${game} ${theme} visible assets loaded`);
    if(game==='heart'){
     check(await page.locator(`#${theme}ThemeButton`).getAttribute('aria-pressed')==='true',`heart ${theme} explicit theme control`);
     await verifyHeartOpening(page,`heart mobile ${theme}`);
    }
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
   if(game==='heart'){
    await verifyHeartTrailer(page);
    const heartDesktop=await browser.newContext({viewport:{width:1449,height:851},reducedMotion:'reduce'});
    try{
     const desktopPage=await heartDesktop.newPage();watch(desktopPage,'heart-desktop');
     await desktopPage.goto(`${base}/g/heart/`,{waitUntil:'domcontentloaded'});await pageReady(desktopPage);
     for(const theme of ['dark','light']){
      await desktopPage.locator(`#${theme}ThemeButton`).click();
      await desktopPage.waitForFunction(value=>document.documentElement.dataset.theme===value,theme);
      await verifyHeartOpening(desktopPage,`heart desktop ${theme}`);
      const fit=await layout(desktopPage);check(fit.scrollWidth<=fit.viewport+2,`heart desktop ${theme} horizontal fit`,JSON.stringify(fit));
      await desktopPage.screenshot({path:path.join(out,`heart-desktop-${theme}-1449x851.png`)});
     }
     await verifyHeartTrailer(desktopPage,'heart-desktop');
    }finally{await heartDesktop.close();}
   }
   await context.close();
  }
 }catch(error){check(false,'smoke tour completed',error.stack||String(error));}
 finally{
  await browser?.close();
  for(const abort of mediaAborts){
   abort.verified=verifiedMedia.some(media=>media.label===abort.label&&media.url===abort.url);
   if(!abort.verified)errors.push(`${abort.label} request: ${abort.url} ${abort.error} (media readiness unverified)`);
  }
  check(!errors.length,'browser console, HTTP and network clean',JSON.stringify(errors));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),base,checks,errors,cancelledImages,mediaAborts,verifiedMedia},null,2));
 }
 console.log(`Live UI QA: ${checks.filter(item=>item.ok).length}/${checks.length} checks. ${out}`);
 if(checks.some(item=>!item.ok))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
