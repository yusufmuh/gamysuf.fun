'use strict';

/* Rebuild only the Spin Wheel cover using a fully rendered arena in Chromium.
   Review artifacts/cover-candidates/spin-playwright.jpg; pass --publish to use it. */
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(process.env.APPDATA||'/usr/local/lib','npm','node_modules','playwright'));}
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');

async function capture(){
 const root=path.join(__dirname,'..');
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-spin-cover-'));
 let hub,browser;
 try{
  hub=await createHub({dataDir,adminPin:'246810',local:true});
  browser=await playwright.chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1200,height:675},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(hub.origin+'/g/spin/',{waitUntil:'domcontentloaded'});
  await page.locator('#spin-button:not([disabled])').waitFor({timeout:20000});
  await page.locator('#spin-button').click();
  await page.locator('#stage-dialog[open]').waitFor({timeout:5000});
  await page.waitForFunction(()=>{
   const items=[...document.querySelectorAll('#wheel-items .wheel-item')];
   const photos=[...document.querySelectorAll('#wheel-items img')];
   return items.length>=12&&photos.length>=12&&photos.every(image=>image.complete&&image.naturalWidth>0);
  },null,{timeout:20000});
  await page.waitForTimeout(700);
  if(errors.length)throw new Error(errors.join('; '));
  const out=path.join(root,'artifacts','cover-candidates');
  fs.mkdirSync(out,{recursive:true});
  const candidate=path.join(out,'spin-playwright.jpg');
  await page.screenshot({path:candidate,type:'jpeg',quality:89,animations:'disabled'});
  if(process.argv.includes('--publish')){
   fs.copyFileSync(candidate,path.join(root,'hub','public','assets','covers','spin.jpg'));
  }
  console.log(`Spin arena captured: ${candidate}`);
 }finally{
  await browser?.close();
  await hub?.close();
  fs.rmSync(dataDir,{recursive:true,force:true});
 }
}
capture().catch(error=>{console.error(error);process.exitCode=1;});
