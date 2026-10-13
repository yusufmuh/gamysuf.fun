'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{firefox}=require('playwright');
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'domain-touch-'));let hub,browser;
 try{
  hub=await createHub({dataDir:dir,adminPin:'246810',local:true});browser=await firefox.launch();
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true});const page=await context.newPage();
  await page.goto(hub.origin+'/g/domain/');await page.locator('#characters [data-value="geto"]').click();await page.locator('#touch').click();await page.locator('#playScreen:not([hidden])').waitFor();
  await page.evaluate(()=>{window.__pointer=[];document.addEventListener('pointerdown',e=>window.__pointer.push({id:e.target.id,x:e.clientX,y:e.clientY,type:e.pointerType}),true)});
  for(let i=0;i<8;i++){
   const before=await page.evaluate(()=>{const r=document.getElementById('game').getBoundingClientRect();return{rect:{x:r.x,y:r.y,w:r.width,h:r.height},size:{w:activeArena.width,h:activeArena.height},next:activeArena.nextSpirit,point:activeArena.spirits[activeArena.nextSpirit]}});
   if(!before.point)break;const x=before.rect.x+before.rect.w*before.point.x,y=before.rect.y+before.rect.h*before.point.y;
   const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,{x,y});await page.touchscreen.tap(x,y);await page.waitForTimeout(180);
   console.log(JSON.stringify({i,before,hit,after:await page.evaluate(()=>({next:activeArena.nextSpirit,score:document.getElementById('score').textContent,target:activeArena.target,events:window.__pointer.slice(-1)}))}));
  }
 }finally{if(browser)await browser.close();if(hub)await hub.close();if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw new Error('Unexpected QA path');fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
