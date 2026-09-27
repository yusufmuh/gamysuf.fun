'use strict';

// Local-only theme regression tour. Run after index.html includes theme.js/theme.css.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(process.env.APPDATA||'/usr/local/lib','npm','node_modules','playwright'));}
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');
const out=path.join(__dirname,'..','artifacts','theme-qa');
const results=[];
function check(ok,label,detail=''){
 results.push({ok:Boolean(ok),label,detail});
 if(!ok)console.error(`FAIL ${label}: ${detail}`);
}
async function state(page){
 return page.evaluate(()=>({theme:document.documentElement.dataset.theme,
  colorScheme:getComputedStyle(document.documentElement).colorScheme,
  body:getComputedStyle(document.body).backgroundColor,
  label:document.getElementById('themeToggle')?.getAttribute('aria-label'),
  pressed:document.getElementById('themeToggle')?.getAttribute('aria-pressed'),
  meta:document.querySelector('meta[name="theme-color"]')?.content,
  width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
}
async function run(){
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-theme-'));
 fs.mkdirSync(out,{recursive:true});
 let hub;
 try{
  hub=await createHub({dataDir,adminPin:'246810',local:true});
  for(const engine of ['chromium','webkit']){
   const browser=await playwright[engine].launch();
   try{
    for(const width of engine==='chromium'?[390,1366]:[390]){
     const context=await browser.newContext({viewport:{width,height:width===390?844:768},reducedMotion:'reduce'});
     const page=await context.newPage();
     const errors=[];
     page.on('pageerror',error=>errors.push(error.message));
     await page.goto(hub.origin+'/',{waitUntil:'domcontentloaded'});
     await page.locator('body[data-ready="1"]').waitFor();
     const initial=await state(page);
     check(initial.theme==='dark'&&initial.pressed==='false',`${engine} ${width} defaults dark`,JSON.stringify(initial));
     check(initial.meta==='#12050c',`${engine} ${width} dark browser chrome`,initial.meta);
     check(initial.scroll<=Math.max(initial.width,width)+2,`${engine} ${width} dark horizontal fit`,JSON.stringify(initial));
     await page.screenshot({path:path.join(out,`${engine}-${width}-dark.png`)});
     if(await page.locator('#onboardModal').isVisible())await page.locator('#onboardSkip').click();
     await page.locator('#themeToggle').click();
     const light=await state(page);
     check(light.theme==='light'&&light.pressed==='true',`${engine} ${width} toggles light`,JSON.stringify(light));
     check(light.colorScheme==='light'&&light.meta==='#fff9f6',`${engine} ${width} light palette applied`,JSON.stringify(light));
     check(light.label==='Aktifkan tema gelap',`${engine} ${width} accessible toggle label`,light.label);
     check(light.scroll<=Math.max(light.width,width)+2,`${engine} ${width} light horizontal fit`,JSON.stringify(light));
     await page.screenshot({path:path.join(out,`${engine}-${width}-light.png`)});
     await page.locator('#playerChip').click();
     check(await page.locator('#profileModal').isVisible(),`${engine} ${width} light profile dialog opens`);
     await page.screenshot({path:path.join(out,`${engine}-${width}-light-profile.png`)});
     await page.locator('#profileModal [data-close]').click();
     await page.locator('#album').scrollIntoViewIfNeeded();
     check(await page.locator('.gmy-album-slider-track').isVisible(),`${engine} ${width} light album carousel visible`);
     await page.screenshot({path:path.join(out,`${engine}-${width}-light-album.png`)});
     await page.locator('#openAlbum').click();
     check(await page.locator('#albumModal').isVisible(),`${engine} ${width} light album dialog opens`);
     await page.screenshot({path:path.join(out,`${engine}-${width}-light-album-dialog.png`)});
     await page.locator('#albumModal [data-close]').click();
     await page.reload({waitUntil:'domcontentloaded'});
     await page.locator('body[data-ready="1"]').waitFor();
     check((await state(page)).theme==='light',`${engine} ${width} light survives reload`);
     await page.locator('#themeToggle').click();
     check((await state(page)).theme==='dark',`${engine} ${width} returns dark`);
     check(!errors.length,`${engine} ${width} page errors`,JSON.stringify(errors));
     await context.close();
    }
   }finally{await browser.close();}
  }
  const browser=await playwright.chromium.launch();
  try{
   const context=await browser.newContext({viewport:{width:390,height:844}});
   await context.addInitScript(()=>{
    Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('Storage denied');}});
   });
   const page=await context.newPage();
   await page.goto(hub.origin+'/',{waitUntil:'domcontentloaded'});
   await page.locator('body[data-ready="1"]').waitFor();
   if(await page.locator('#onboardModal').isVisible())await page.locator('#onboardSkip').click();
   await page.locator('#themeToggle').click();
   check((await state(page)).theme==='light','storage denial still permits in-page toggle');
   await context.close();
  }finally{await browser.close();}
 }finally{
  await hub?.close();
  fs.rmSync(dataDir,{recursive:true,force:true});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),results},null,2));
 }
 console.log(`Theme QA: ${results.filter(result=>result.ok).length}/${results.length} checks. ${out}`);
 if(results.some(result=>!result.ok))process.exitCode=1;
}
run().catch(error=>{console.error(error);process.exitCode=1;});
