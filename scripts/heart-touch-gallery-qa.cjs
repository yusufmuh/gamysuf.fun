'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const playwright=require(path.join(process.env.APPDATA,'npm','node_modules','playwright'));
const {createHub}=require('../hub/server.cjs');
const live=(process.env.GAMYSUF_LIVE_URL||'').trim(),out=path.join(__dirname,'../artifacts',live?'heart-touch-gallery-live':'heart-touch-gallery');
const report={origin:'',checks:[],cases:[],errors:[]};
function check(value,label){assert.ok(value,label);report.checks.push(label);}
async function tap(page,locator,x=.5,y=.35){await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();assert.ok(box,'touch target has geometry');await page.touchscreen.tap(box.x+box.width*x,box.y+box.height*y);}
async function decodeImages(page,selector){for(const img of await page.locator(selector).all()){await img.scrollIntoViewIfNeeded();await img.evaluate(async element=>{await element.decode();if(!element.complete||element.naturalWidth===0)throw new Error('Image did not decode: '+element.src);});}}
async function run(browser,name,width,height,origin){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),label=`${name}-${width}x${height}`,start=report.checks.length;
 let writes=0;page.on('request',request=>{if(request.method()==='POST'&&/\/g\/heart\/api\/(play|result)$/.test(request.url()))writes++;});page.on('pageerror',error=>report.errors.push({label,message:error.message}));
 try{
  await page.goto(origin+'/g/heart/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HeartGame?.context().state);
  for(const theme of ['light','dark']){
   await page.locator(theme==='light'?'#lightThemeButton':'#darkThemeButton').click();
   const colors=await page.evaluate(()=>({pink:getComputedStyle(document.documentElement).getPropertyValue('--pink').trim().toUpperCase(),background:getComputedStyle(document.body).backgroundColor}));
   check(colors.pink===(theme==='light'?'#E62B5E':'#FF5C8A'),`${label} ${theme} exact Bpedia pink token`);
   check(colors.background===(theme==='light'?'rgb(255, 247, 248)':'rgb(42, 10, 24)'),`${label} ${theme} exact Bpedia background token`);
  }
  await page.locator('#lightThemeButton').click();await page.locator('#openStickerGallery').click();await page.waitForFunction(()=>document.querySelectorAll('#stickerGalleryGrid img').length===50);
  check(await page.locator('#stickerGalleryGrid img').count()===50,`${label} all fifty artworks appear in gallery`);
  await decodeImages(page,'#stickerGalleryGrid img');check(true,`${label} all fifty gallery images decode`);
  await page.locator('#stickerGalleryDialog').evaluate(dialog=>{dialog.scrollTop=0;});await page.screenshot({path:path.join(out,`${label}-gallery.png`)});
  const geometry=await page.evaluate(()=>{const d=document.querySelector('#stickerGalleryDialog');return {page:document.documentElement.scrollWidth<=innerWidth+1,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,dialog:d.scrollWidth<=d.clientWidth+1,uncropped:[...d.querySelectorAll('img')].every(img=>getComputedStyle(img).objectFit==='contain')};});
  check(geometry.page&&geometry.dialog&&geometry.uncropped,`${label} gallery fits screen and preserves full artwork: ${JSON.stringify(geometry)}`);
  for(const host of ['zoro','sanji']){await page.locator(`[data-sticker-filter="${host}"]`).click();check(await page.locator('#stickerGalleryGrid figure').count()===25,`${label} ${host} filter has twenty-five artworks`);check(await page.locator('#stickerGalleryGrid figure').evaluateAll((items,id)=>items.every(item=>item.dataset.host===id),host),`${label} ${host} filter preserves correct characters`);await decodeImages(page,'#stickerGalleryGrid img');}
  await page.locator('#closeStickerGallery').click();check(await page.locator('#openStickerGallery').evaluate(el=>el===document.activeElement),`${label} gallery returns keyboard focus`);
  for(const host of ['zoro','sanji']){
   if(host==='sanji')await page.locator('#backHomeButton').click();await page.locator(`.host-card[data-host="${host}"]`).click();
   const card=page.locator('.deck-card[data-service="cinderella"]');await tap(page,card.locator('.tcg'));
   await page.locator('#momentPreviewDialog').waitFor({state:'visible'});check(await page.locator('#momentPreviewTitle').textContent()==="Cinderella's Fit",`${label} ${host} artwork tap opens gacha preview`);
   await decodeImages(page,'#momentPreviewSticker');check((await page.locator('#momentPreviewSticker').getAttribute('src')).endsWith(`/assets/stickers/${host}-cinderella.webp`),`${label} ${host} preview uses supplied matching scene`);
   check(await page.locator('#momentGrid video').evaluateAll(items=>items.every(item=>item.paused)),`${label} underlying videos pause during preview`);await page.locator('#closeMomentPreview').click();
   await page.locator('#pickMode').click();await tap(page,card.locator('h3'),.5,.5);check(await card.evaluate(el=>el.classList.contains('chosen')),`${label} ${host} title tap selects direct-pick card`);
   const next=page.locator('.deck-card[data-service="twirl"]');await tap(page,next.locator('.tcg'));check(await next.evaluate(el=>el.classList.contains('chosen')),`${label} ${host} artwork tap changes direct-pick choice`);
   check(await page.locator('#momentGrid .deck-card').evaluateAll(cards=>cards.every(card=>{const outer=card.getBoundingClientRect(),button=card.querySelector('.card-choice').getBoundingClientRect();return button.height>=44&&button.height<=60&&button.top>=outer.top-1&&button.bottom<=outer.bottom+1;})),`${label} ${host} selection buttons remain inside their own cards`);
   await next.locator('.card-choice').focus();await page.keyboard.press('Enter');check(await next.evaluate(el=>el.classList.contains('chosen')),`${label} ${host} native keyboard selection works`);
   await next.locator('.peek-video').click();await page.locator('#momentPreviewDialog').waitFor({state:'visible'});check(await page.locator('#momentPreviewTitle').textContent()==='Princess Twirl',`${label} ${host} video preview stays separately clickable`);await page.locator('#closeMomentPreview').click();await page.locator('#gachaMode').click();
  }
  check(writes===0,`${label} gallery, previews and selections issue no tickets`);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} no horizontal page overflow`);
  await page.locator('#backHomeButton').click();await page.waitForFunction(()=>scrollY===0);await page.screenshot({path:path.join(out,`${label}-light.png`),fullPage:true});await page.screenshot({path:path.join(out,`${label}-light-preview.png`)});await page.locator('#darkThemeButton').click();await page.screenshot({path:path.join(out,`${label}-dark.png`),fullPage:true});await page.screenshot({path:path.join(out,`${label}-dark-preview.png`)});
  report.cases.push({label,checks:report.checks.length-start,pass:true});console.log(`${label}: ${report.checks.length-start} checks passed`);
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(out,{recursive:true});const temp=fs.mkdtempSync(path.join(os.tmpdir(),'heart-touch-'));let hub;try{if(!live)hub=await createHub({dataDir:temp,local:true,adminPin:'246810',heartPin:'1234'});const origin=live||hub.origin;report.origin=origin;for(const name of (process.env.HEART_TOUCH_BROWSERS||'chromium,firefox,webkit').split(',')){assert.ok(['chromium','firefox','webkit'].includes(name),'supported browser');const browser=await playwright[name].launch();try{for(const [w,h] of [[390,844],[768,1024],[844,390],[1440,900]])await run(browser,name,w,h,origin);}finally{await browser.close();}}check(report.errors.length===0,'no browser JavaScript errors');report.pass=true;}catch(error){report.pass=false;report.error=error.stack;process.exitCode=1;console.error(error.stack);}finally{if(hub)await hub.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(`Touch/gallery: ${report.checks.length} checks, pass=${report.pass}`);}})();
