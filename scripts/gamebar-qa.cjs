'use strict';

// Isolated local regression tour for the shared gamebar (1.4.0). No game rounds.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.join(__dirname,'..');
let playwright;
try{playwright=require(path.join(process.env.APPDATA||'/usr/local/lib','npm','node_modules','playwright'));}
catch{playwright=require('playwright');}
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');

const out=path.join(root,'artifacts','gamebar-1.4.0');
const profile={nickname:'QA Bipy',avatar:'heart'};
const matrix=[
 ['chromium','spin',390,844],['chromium','nyapit',390,844],['chromium','drop',390,844],
 ['chromium','spin',1366,768],['chromium','nyapit',1366,768],['chromium','drop',1366,768],
 ['firefox','spin',390,844],['firefox','nyapit',390,844],['firefox','drop',390,844],
 ['webkit','spin',390,844],['webkit','nyapit',390,844],['webkit','drop',390,844],
 ['chromium','gacha',390,844],['chromium','gacha',1366,768],['firefox','gacha',390,844],['webkit','gacha',390,844]
].filter(([engine,game])=>{
 const engineOnly=process.argv.find(value=>value.startsWith('--engine='))?.split('=')[1];
 const gameOnly=process.argv.find(value=>value.startsWith('--game='))?.split('=')[1];
 return (!engineOnly||engineOnly===engine)&&(!gameOnly||gameOnly===game);
});
const checks=[];
const failures=[];
function check(ok,label,detail=''){
 const entry={ok:Boolean(ok),label,detail};checks.push(entry);
 if(!entry.ok){failures.push(entry);console.error(`FAIL ${label}: ${detail}`);}
}
function pngInfo(bytes){
 const signature=Buffer.from([137,80,78,71,13,10,26,10]);
 if(bytes.length<24||!bytes.subarray(0,8).equals(signature))return null;
 return {bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
async function fixture(context,origin){
 const response=await context.request.post(`${origin}/hub-api/me`,{
  headers:{Origin:origin,'x-gamysuf-client':'hub','content-type':'application/json'},data:profile
 });
 check(response.ok(),'local profile fixture accepted',`${response.status()} ${(await response.text()).slice(0,200)}`);
}
async function layout(page){
 return page.evaluate(()=>{
  const bar=document.querySelector('#gmyGamebar');
  const r=bar?.getBoundingClientRect();
  const buttons=[...bar.querySelectorAll(':scope > button')].filter(button=>!button.hidden).map(button=>{
   const b=button.getBoundingClientRect();
   const top=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
   return {action:button.dataset.gmyAction||'theme',width:b.width,height:b.height,hit:top===button||button.contains(top)};
  });
  const logos=[...document.querySelectorAll('img[data-brand="bpedia"]')].map(img=>({src:img.currentSrc||img.src,loaded:img.complete&&img.naturalWidth>0}));
  return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,bar:{left:r?.left,right:r?.right,top:r?.top,bottom:r?.bottom,parent:bar?.parentElement?.id||bar?.parentElement?.tagName},buttons,logos,
   avatar:document.querySelector('#gmyAvatar')?.currentSrc,name:document.querySelector('#gmyName')?.textContent,
   theme:document.documentElement.dataset.theme,storedTheme:localStorage.getItem('gamysuf-theme')};
 });
}
async function audioState(page){
 return page.evaluate(()=>{
  let state;
  window.addEventListener('gamysuf:audio-state',event=>{state=event.detail?.muted;},{once:true});
  window.dispatchEvent(new CustomEvent('gamysuf:audio-query'));
  return state;
 });
}
async function openMenu(page){
 await page.locator('#gmyGamebar [data-gmy-action="menu"]').click();
 await page.locator('#gmyMenu').waitFor({state:'visible'});
}
async function checkProfile(page,prefix){
 await page.locator('#gmyGamebar [data-gmy-action="profile"]').click();
 const dialog=page.locator('#gmyDialog');
 await dialog.waitFor({state:'visible'});
 check((await dialog.locator('h2').textContent())==='Profil pemain',`${prefix} profile dialog title`);
 check((await dialog.locator('.gmy-profile-head p').textContent())===profile.nickname,`${prefix} profile details name`);
 await dialog.locator('.gmy-profile-head img').evaluate(img=>img.decode());
 const avatar=await dialog.locator('.gmy-profile-head img').evaluate(img=>({src:img.currentSrc||img.src,loaded:img.complete&&img.naturalWidth>0}));
 check(avatar.src.includes('character-champion.png')&&avatar.loaded,`${prefix} full-body avatar`,JSON.stringify(avatar));
 check((await dialog.locator('.gmy-primary').getAttribute('href'))==='/?profile=1',`${prefix} edit profile link`);
 await dialog.locator('[data-gmy-close]').click();
 check(!(await dialog.evaluate(node=>node.open)),`${prefix} profile dialog closes`);
}
async function checkControls(page,prefix){
 await openMenu(page);
 const menu=page.locator('#gmyMenu');
 check((await menu.locator('a[href="/"]').count())===1,`${prefix} home link`);
 check((await menu.locator('[data-gmy-action="guide"]').count())===1,`${prefix} guide control`);
 check((await menu.locator('[data-gmy-action="fullscreen"]').count())===1,`${prefix} fullscreen control`);
 const before=await audioState(page);
 check(typeof before==='boolean',`${prefix} native audio query responds`,String(before));
 check((await page.locator('#gmyAudioLabel').textContent())===(before?'Aktifkan suara':'Matikan suara'),`${prefix} gamebar audio label synchronized`);
 await menu.locator('[data-gmy-action="audio"]').click();
 const after=await audioState(page);
 check(after===!before,`${prefix} shared audio toggle reaches game`,`${before}→${after}`);
 await openMenu(page);
 await menu.locator('[data-gmy-action="audio"]').click();
 check((await audioState(page))===before,`${prefix} shared audio restores original state`);
 await openMenu(page);
 await menu.locator('[data-gmy-action="guide"]').click();
 check((await page.locator('#gmyDialogTitle').textContent())==='Cara main & kontrol',`${prefix} guide dialog opens`);
 await page.locator('#gmyDialog [data-gmy-close]').click();
}
async function checkCapture(page,prefix){
 const control=page.locator('#gmyGamebar [data-gmy-action="capture"]');
 const reference=await page.screenshot({animations:'disabled'});
 fs.writeFileSync(path.join(out,`${prefix.replace(/\s+/g,'-')}-reference.png`),reference);
 const promise=page.waitForEvent('download',{timeout:30000});
 await control.click();
 const download=await promise;
 const file=await download.path();
 const bytes=fs.readFileSync(file);
 const info=pngInfo(bytes);
 check(Boolean(info&&info.bytes>10000&&info.width>=300&&info.height>=500),`${prefix} actual screenshot PNG download`,JSON.stringify(info));
 const imagePath=path.join(out,`${prefix.replace(/\s+/g,'-')}-camera.png`);
 fs.writeFileSync(imagePath,bytes);
 const visual=await page.evaluate(async images=>{
  const pixelsFor=async base64=>{
   const img=new Image();img.src=`data:image/png;base64,${base64}`;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;
   const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0,24,24);
   return context.getImageData(0,0,24,24).data;
  };
  const pixels=await pixelsFor(images.capture),expected=await pixelsFor(images.reference);
  const colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]},${pixels[i+3]}`);
  let difference=0;for(let i=0;i<pixels.length;i+=4)difference+=(Math.abs(pixels[i]-expected[i])+Math.abs(pixels[i+1]-expected[i+1])+Math.abs(pixels[i+2]-expected[i+2]))/3;
  return {colorCount:colors.size,visualDifference:difference/(pixels.length/4)};
 },{capture:bytes.toString('base64'),reference:reference.toString('base64')});
 check(visual.colorCount>=8&&visual.visualDifference<70,`${prefix} screenshot matches visible arena`,JSON.stringify(visual));
 check(!await control.isDisabled(),`${prefix} camera resets after download`);
 return {...info,...visual,imagePath};
}
async function checkCaptureFailure(context,origin){
 let page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/hub/vendor/html2canvas-1.4.1.min.js',route=>route.abort('failed'));
 await page.goto(`${origin}/g/nyapit/`,{waitUntil:'domcontentloaded'});
 await page.locator('#gmyGamebar').waitFor();
 await page.locator('#gmyGamebar [data-gmy-action="capture"]').click();
 await page.getByText('Screenshot belum bisa dibuat. Coba kembali setelah gambar selesai dimuat.').waitFor({timeout:10000});
 check(!await page.locator('#gmyGamebar [data-gmy-action="capture"]').isDisabled(),'camera failure offers retry');
 check(errors.length===0,'camera failure has no uncaught exception',JSON.stringify(errors));
 await page.close();
}
async function visit(browser,engine,game,width,height,origin){
 const prefix=`${engine} ${game} ${width}`;
 const context=await browser.newContext({viewport:{width,height},acceptDownloads:true,reducedMotion:'reduce'});
 let page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 try{
  await fixture(context,origin);
  await page.goto(`${origin}/g/${game}/`,{waitUntil:'domcontentloaded'});
  await page.locator('#gmyGamebar').waitFor({timeout:15000});
  await page.waitForFunction(()=>document.querySelector('#gmyName')?.textContent==='QA Bipy',null,{timeout:15000});
  for(const theme of ['dark','light']){
   if(theme==='light')await page.locator('#gmyGamebar [data-gmy-theme]').click();
   await page.waitForFunction(value=>document.documentElement.dataset.theme===value,theme);
   await page.waitForTimeout(220);
   const view=await layout(page);
   check(view.theme===theme&&view.storedTheme===(theme==='light'?'light':null),`${prefix} ${theme} theme`,JSON.stringify(view));
   check(view.scrollWidth<=width+2,`${prefix} ${theme} no horizontal overflow`,String(view.scrollWidth));
   check(view.bar.left>=0&&view.bar.right<=width&&view.bar.bottom<=height&&view.bar.top>=0,`${prefix} ${theme} bar within viewport`,JSON.stringify(view.bar));
   check(view.buttons.every(button=>button.width>=43.9&&button.height>=43.9&&button.hit),`${prefix} ${theme} visible controls min 44px and clickable`,JSON.stringify(view.buttons));
   check(view.logos.length>0&&view.logos.every(logo=>logo.loaded&&logo.src.includes(theme==='dark'?'bpedia-white.png':'bpedia-pink.png')),`${prefix} ${theme} Bpedia logo`,JSON.stringify(view.logos));
   check(view.name===profile.nickname&&view.avatar?.includes('character-champion.png'),`${prefix} ${theme} saved avatar in bar`,JSON.stringify({name:view.name,avatar:view.avatar}));
   if(game==='spin'&&width===390&&theme==='dark'){
    await page.locator('#spin-button').click();
    await page.locator('.arena-dialog[open]').waitFor({state:'visible'});
    const arena=await layout(page);
    check(arena.bar.parent==='stage-dialog'||arena.bar.parent==='arena-dialog',`${prefix} arena gamebar shares dialog top layer`,arena.bar.parent);
    check(arena.buttons.every(button=>button.hit),`${prefix} arena gamebar clickable`,JSON.stringify(arena.buttons));
    await checkCapture(page,`${prefix} arena`);
    await page.locator('#close-arena').click();
    await page.waitForFunction(()=>document.querySelector('#gmyGamebar')?.parentElement===document.body);
   }
   if(game==='gacha'&&engine==='chromium'&&width===390&&theme==='dark')await checkCapture(page,`${prefix} machine`);
   await page.screenshot({path:path.join(out,`${engine}-${game}-${width}-${theme}.png`),fullPage:false});
  }
  const previousPage=page;
  await previousPage.close();
  page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(`${origin}/g/${game}/`,{waitUntil:'domcontentloaded'});
  await page.locator('#gmyGamebar').waitFor();
  await page.waitForFunction(()=>document.querySelector('#gmyName')?.textContent==='QA Bipy');
  check((await layout(page)).theme==='light',`${prefix} light theme persists reload`);
  await checkProfile(page,prefix);
  await checkControls(page,prefix);
  if(engine==='chromium'&&game==='drop'&&width===390){
   const home=await context.newPage();
   await home.goto(`${origin}/?profile=1`,{waitUntil:'domcontentloaded'});
   await home.locator('#profileModal').waitFor({state:'visible'});
   check((await home.locator('#profileNameInput').inputValue())===profile.nickname,`${prefix} edit profile deep link`);
   await home.close();
  }
  check(errors.length===0,`${prefix} no console errors`,JSON.stringify(errors));
 }catch(error){check(false,`${prefix} tour`,error.stack||String(error));}
 finally{await context.close();}
}
async function run(){
 fs.mkdirSync(out,{recursive:true});
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-gamebar-'));
 let hub;
 const browsers=new Map();
 try{
  hub=await createHub({dataDir,adminPin:'246810',local:true});
  for(const [engine,game,width,height] of matrix){
   if(!browsers.has(engine)){
    try{browsers.set(engine,await playwright[engine].launch());}
    catch(error){check(false,`${engine} browser launch`,error.message);continue;}
   }
   await visit(browsers.get(engine),engine,game,width,height,hub.origin);
  }
  if(browsers.has('chromium')){
   const context=await browsers.get('chromium').newContext({viewport:{width:390,height:844}});
   try{await fixture(context,hub.origin);await checkCaptureFailure(context,hub.origin);}
   catch(error){check(false,'camera failure branch',error.stack||String(error));}
   finally{await context.close();}
  }
 }finally{
  for(const browser of browsers.values())await browser.close();
  await hub?.close();
  fs.rmSync(dataDir,{recursive:true,force:true});
  const report={version:'1.4.0',checks:checks.length,passed:checks.length-failures.length,failures,cases:checks};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({version:report.version,checks:report.checks,passed:report.passed,failures:report.failures},null,2));
 }
 if(failures.length)process.exitCode=1;
}
run().catch(error=>{console.error(error);process.exitCode=1;});
