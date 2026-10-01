'use strict';

/* Sampul Gacha Pop 1200×675 dari gameplay asli lewat gateway lokal (Chromium
   Playwright): kapsul sedang berguncang dan satu kapsul keluar dari corong.
   node scripts/capture-gacha-cover.cjs, lalu kecilkan ke JPEG 1200×675 (q89)
   sebagai hub/public/assets/covers/gacha.jpg setelah ditinjau. */
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(process.env.APPDATA||'/usr/local/lib',process.env.APPDATA?'npm/node_modules':'node_modules','playwright'));}
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');

const root=path.join(__dirname,'..');
const candidate=path.join(root,'artifacts','cover-candidates','gacha.png');

(async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-gacha-cover-'));
 const hub=await createHub({dataDir,adminPin:'246810',local:true});
 const browser=await playwright.chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.5});
  await page.addInitScript(()=>{try{localStorage.setItem('gpop-muted','1');localStorage.setItem('gamysuf-theme','dark');}catch{}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${hub.origin}/g/gacha/`,{waitUntil:'load'});
  await page.locator('#gachaButton:not([disabled])').waitFor({timeout:20000});
  await page.evaluate(()=>document.getElementById('gmyGamebar')?.remove());
  await page.waitForTimeout(800);
  await page.locator('#gachaButton').click();
  await page.waitForTimeout(1950);
  fs.mkdirSync(path.dirname(candidate),{recursive:true});
  await page.screenshot({path:candidate});
  if(errors.length)throw new Error(errors.join('; '));
  console.log(`Kandidat sampul: ${path.relative(root,candidate)}`);
 }finally{
  await browser.close();
  await hub.close();
  fs.rmSync(dataDir,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
