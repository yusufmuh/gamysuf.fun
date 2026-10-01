'use strict';

// Run with: node scripts/responsive-qa.cjs [--quick]
// Uses the globally installed Playwright when the project has no local copy.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.join(__dirname, '..');
let playwright;
try { playwright = require('playwright'); }
catch {
  const npmRoot = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm', 'node_modules')
    : '/usr/local/lib/node_modules';
  playwright = require(path.join(npmRoot, 'playwright'));
}
process.env.GAMYSUF_AUTOSTART = '0';
const {createHub} = require('../hub/server.cjs');
const quick = process.argv.includes('--quick');
const browserFilter = process.argv.find(arg=>arg.startsWith('--browser='))?.split('=')[1];
const sizeFilter = process.argv.find(arg=>arg.startsWith('--size='))?.split('=')[1];
const gameFilter = process.argv.find(arg=>arg.startsWith('--game='))?.split('=')[1];
const out = path.join(root, 'artifacts', 'qa-responsive');
const sizes = [
  ['small-320',320,640], ['phone-360',360,740], ['phone-390',390,844],
  ['foldable-540',540,720], ['tablet-768',768,1024], ['tablet-1024',1024,1366], ['landscape-844',844,390],
  ['desktop-1366',1366,768], ['desktop-1920',1920,1080]
];
const cases = (quick ? sizes.filter(([id]) => ['small-320','phone-390','landscape-844','desktop-1366'].includes(id)) : sizes)
  .filter(([id])=>!sizeFilter||id===sizeFilter);
const failures = [];
const observations = [];
function check(ok, label, details='') {
  observations.push({ok:Boolean(ok),label,details});
  if (!ok) failures.push({label,details});
}
async function geometry(page) {
  const viewportWidth=page.viewportSize().width;
  return page.evaluate(viewportWidth => {
    const width = Math.max(document.documentElement.clientWidth,viewportWidth);
    const offenders = [...document.querySelectorAll('body *')]
      .filter(node => {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') return false;
        const box = node.getBoundingClientRect();
        return box.width > 0 && (box.right > width + 2 || box.left < -2);
      }).slice(0,8).map(node => ({tag:node.tagName,id:node.id,cls:String(node.className).slice(0,80),
        rect:[Math.round(node.getBoundingClientRect().left),Math.round(node.getBoundingClientRect().right)]}));
    return {width, scrollWidth:document.documentElement.scrollWidth, offenders};
  },viewportWidth);
}
async function target(page, selector) {
  return page.locator(selector).first().evaluate(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {visible:rect.width>0 && rect.height>0 && style.visibility!=='hidden',
      width:Math.round(rect.width),height:Math.round(rect.height),
      inViewport:rect.right>0 && rect.left<innerWidth && rect.bottom>0 && rect.top<innerHeight};
  });
}
async function pillClear(page,selector,label) {
  const overlap=await page.evaluate(selector=>{
    const pill=document.querySelector('.gmy-gamebar');
    const control=document.querySelector(selector);
    if(!pill||!control||getComputedStyle(pill).visibility==='hidden')return false;
    const a=pill.getBoundingClientRect(),b=control.getBoundingClientRect();
    if(b.bottom<0||b.top>innerHeight)return false;
    return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  },selector);
  check(!overlap,`${label} game bar clear of ${selector}`);
}
async function visit(page, base, route, browserName, sizeId) {
  const errors=[];
  const badResponses=[];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if(message.type()==='error') errors.push(message.text());});
  page.on('response', response => {if(response.status()>=400 && new URL(response.url()).origin===base) badResponses.push(`${response.status()} ${response.url()}`);});
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1200);
  const stem=`${browserName}-${sizeId}-${route==='/'?'hub':route.split('/')[2]}`;
  const layout=await geometry(page);
  check(layout.scrollWidth<=layout.width+2,`${stem} horizontal overflow`,JSON.stringify(layout));
  const broken=await page.locator('img').evaluateAll(images=>images.filter(image=>{
    const style=getComputedStyle(image);
    return style.display!=='none' && Boolean(image.getAttribute('src')) && image.complete && image.naturalWidth===0;
  }).map(image=>image.currentSrc||image.src).slice(0,10));
  check(!broken.length,`${stem} images loaded`,JSON.stringify(broken));
  await page.screenshot({path:path.join(out,`${stem}.png`),fullPage:false});
  return {stem,errors,badResponses};
}
async function hubFlow(page, base, browserName, sizeId) {
  const log=await visit(page,base,'/',browserName,sizeId);
  await page.locator('body[data-ready="1"]').waitFor({timeout:20000});
  const onboarding=page.locator('#onboardModal');
  check(await onboarding.isVisible(),`${log.stem} onboarding visible`);
  await page.locator('#nicknameInput').fill('QA Lokal');
  await page.locator('#onboardSave').click({timeout:5000});
  await onboarding.waitFor({state:'hidden'});
  check((await page.locator('#chipName').textContent()).includes('QA Lokal'),`${log.stem} onboarding saved`);
  await page.screenshot({path:path.join(out,`${log.stem}-after-onboard.png`),fullPage:false});
  for(const slug of ['spin','nyapit','drop','gacha']) {
    await page.locator(`[data-howto="${slug}"]`).first().click();
    check(await page.locator('#gameModal').isVisible(),`${log.stem} ${slug} guide visible`);
    await page.locator('#gameModalPlay').click({trial:true,timeout:3000});
    const modal=await geometry(page);
    check(modal.scrollWidth<=modal.width+2,`${log.stem} ${slug} guide overflow`,JSON.stringify(modal));
    await page.locator('#gameModal [data-close]').first().click();
  }
  for(const selector of ['#heroPlay','#playerChip','.game-card a.btn-primary']) {
    const control=await target(page,selector);
    check(control.visible && control.width>=32 && control.height>=32,`${log.stem} ${selector} touch target`,JSON.stringify(control));
  }
  await page.locator('#openAlbum').click();
  check(await page.locator('#albumModal').isVisible(),`${log.stem} album visible`);
  await page.locator('#albumModal [data-close]').first().click({trial:true,timeout:3000});
  await page.locator('#albumModal [data-close]').first().click();
  check(!log.errors.length,`${log.stem} console errors`,JSON.stringify(log.errors));
  check(!log.badResponses.length,`${log.stem} HTTP errors`,JSON.stringify(log.badResponses));
}
async function gameFlow(page,base,slug,browserName,sizeId,play=false) {
  const log=await visit(page,base,`/g/${slug}/`,browserName,sizeId);
  if(slug==='spin') {
    await page.locator('#spin-button:not([disabled])').waitFor({timeout:20000});
    const control=await target(page,'#spin-button');
    check(control.visible && control.width>=32 && control.height>=32,`${log.stem} spin touch target`,JSON.stringify(control));
    await pillClear(page,'#spin-button',log.stem);
    if(play) {
      await page.locator('#spin-button').click();
      await page.locator('#stage-dialog[open]').waitFor({timeout:5000});
      await page.locator('#spin-button').click();
      await page.waitForFunction(() => document.querySelector('#result-dialog')?.open ||
        (!document.querySelector('#box-stage')?.hidden &&
          document.querySelector('#beauty-boxes [data-box]')),null,{timeout:35000});
      if(!(await page.locator('#result-dialog[open]').count()))
        await page.locator('#beauty-boxes [data-box]').first().click();
      await page.locator('#result-dialog[open]').waitFor({timeout:35000});
      check(true,`${log.stem} spin result`);
      await page.locator('#result-done').click();
      await page.locator('#result-dialog').waitFor({state:'hidden'});
      check(!(await page.locator('#spin-button').isDisabled()),`${log.stem} spin replay ready`);
    }
  } else if(slug==='nyapit') {
    await page.locator('#homeUsername').fill('QA Lokal');
    await page.locator('#startFestival:not([disabled])').waitFor({timeout:20000});
    const control=await target(page,'#startFestival');
    check(control.visible && control.width>=32 && control.height>=32,`${log.stem} start touch target`,JSON.stringify(control));
    await pillClear(page,'#startFestival',log.stem);
    if(play) {
      await page.locator('#startFestival').click();
      await page.locator('#gameStage:visible').waitFor({timeout:20000});
      await page.locator('#play').click();
      await page.locator('#result[open]').waitFor({timeout:45000});
      check(true,`${log.stem} nyapit result`);
      await page.locator('#closeResult').click();
      await page.locator('#result').waitFor({state:'hidden'});
      check(true,`${log.stem} nyapit result close`);
    }
  } else if(slug==='drop') {
    await page.locator('body.ready').waitFor({timeout:20000});
    await page.locator('#startDrop').click();
    await page.locator('#dropView:visible').waitFor();
    const control=await target(page,'#dropButton');
    check(control.visible && control.width>=32 && control.height>=32,`${log.stem} drop touch target`,JSON.stringify(control));
    await pillClear(page,'#dropButton',log.stem);
    const board=await page.locator('#boardCanvas').evaluate(node=>({width:node.width,height:node.height,box:node.getBoundingClientRect().width}));
    check(board.width>0 && board.height>0 && board.box>0,`${log.stem} board resized`,JSON.stringify(board));
    if(play) {
      await page.locator('#dropButton').click();
      await page.setViewportSize({width:540,height:720});
      await page.waitForTimeout(250);
      const folded=await page.locator('#boardCanvas').evaluate(node=>({width:node.width,height:node.height,box:node.getBoundingClientRect().width}));
      check(folded.width>0&&folded.height>0&&folded.box>0,`${log.stem} board midflight unfold`,JSON.stringify(folded));
      await page.setViewportSize({width:390,height:844});
      await page.waitForTimeout(250);
      const refolded=await page.locator('#boardCanvas').evaluate(node=>({width:node.width,height:node.height,box:node.getBoundingClientRect().width}));
      check(refolded.width>0&&refolded.height>0&&refolded.box>0,`${log.stem} board midflight refold`,JSON.stringify(refolded));
      await page.locator('#revealLayer.open').waitFor({timeout:35000});
      check(await page.locator('#demoNote').isVisible(),`${log.stem} demo reveal`);
      await page.locator('#closeReveal:not([disabled])').waitFor({timeout:15000});
      await page.locator('#closeReveal').click();
      await page.locator('#revealLayer').waitFor({state:'hidden'});
      check(!(await page.locator('#dropButton').isDisabled()),`${log.stem} drop replay ready`);
    }
  } else {
    await page.locator('body[data-stage="ready"]').waitFor({timeout:20000});
    const control=await target(page,'#gachaButton');
    check(control.visible && control.inViewport && control.width>=180 && control.height>=56,`${log.stem} gacha touch target`,JSON.stringify(control));
    await pillClear(page,'#gachaButton',log.stem);
    const fit=await page.evaluate(()=>{const button=document.getElementById('gachaButton').getBoundingClientRect();const bar=document.querySelector('.gmy-gamebar')?.getBoundingClientRect();return {bottom:Math.round(button.bottom),barTop:bar?Math.round(bar.top):innerHeight,innerHeight};});
    check(fit.bottom<=fit.barTop,`${log.stem} gacha button above game bar`,JSON.stringify(fit));
    const dome=await page.locator('#domeCanvas').evaluate(node=>({width:node.width,box:node.getBoundingClientRect().width}));
    check(dome.width>0&&dome.box>0,`${log.stem} dome canvas sized`,JSON.stringify(dome));
    if(play) {
      await page.locator('#gachaButton').click();
      await page.locator('#revealLayer.popped').waitFor({timeout:30000});
      check(await page.locator('#demoNote').isVisible(),`${log.stem} gacha demo reveal`);
      const close=await target(page,'#closeReveal');
      check(close.visible&&close.inViewport,`${log.stem} gacha next button visible`,JSON.stringify(close));
      await page.locator('#closeReveal').click();
      await page.locator('#revealLayer').waitFor({state:'hidden'});
      await page.locator('#gachaButton:not([disabled])').waitFor({timeout:10000});
      check(true,`${log.stem} gacha replay ready`);
    }
  }
  const layout=await geometry(page);
  check(layout.scrollWidth<=layout.width+2,`${log.stem} game view overflow`,JSON.stringify(layout));
  await page.screenshot({path:path.join(out,`${log.stem}-game.png`),fullPage:false});
  check(!log.errors.length,`${log.stem} console errors`,JSON.stringify(log.errors));
  check(!log.badResponses.length,`${log.stem} HTTP errors`,JSON.stringify(log.badResponses));
}
async function main() {
  fs.mkdirSync(out,{recursive:true});
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-responsive-'));
  let hub;
  try {
    hub=await createHub({dataDir,adminPin:'246810',local:true});
    const base=hub.origin;
    for(const browserName of ['chromium','firefox','webkit'].filter(name=>!browserFilter||name===browserFilter)) {
      let browser;
      try { browser=await playwright[browserName].launch(); }
      catch(error) { check(false,`${browserName} launch`,error.message); continue; }
      try {
        const selected=browserName==='chromium'||sizeFilter?cases:cases.filter(([id])=>['small-320','phone-390','tablet-768','desktop-1366'].includes(id));
        for(const [sizeId,width,height] of selected) {
          const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=844,isMobile:width<=540 && browserName!=='firefox',reducedMotion:browserName==='chromium'&&sizeId==='phone-390'?'no-preference':'reduce'});
          const page=await context.newPage();
          try {
            try {await hubFlow(page,base,browserName,sizeId);}
            catch(error) {check(false,`${browserName}-${sizeId} hub flow`,error.stack||error.message);}
            for(const slug of ['spin','nyapit','drop','gacha'].filter(name=>!gameFilter||name===gameFilter)) {
              try {await gameFlow(page,base,slug,browserName,sizeId,
                browserName==='chromium' && sizeId==='phone-390');}
              catch(error) {
                const state=await page.evaluate(()=>({url:location.href,scrollWidth:document.documentElement.scrollWidth,
                  spinLabel:document.querySelector('#spin-label')?.textContent,
                  spinDisabled:document.querySelector('#spin-button')?.disabled,
                  boxHidden:document.querySelector('#box-stage')?.hidden,
                  boxCount:document.querySelectorAll('#beauty-boxes [data-box]').length,
                  resultOpen:document.querySelector('#result-dialog')?.open,
                  toast:document.querySelector('#toast')?.textContent})).catch(()=>null);
                await page.screenshot({path:path.join(out,`${browserName}-${sizeId}-${slug}-failure.png`)}).catch(()=>{});
                check(false,`${browserName}-${sizeId}-${slug} flow`,`${error.stack||error.message}\nState: ${JSON.stringify(state)}`);
              }
            }
          } catch(error) { check(false,`${browserName}-${sizeId} setup`,error.stack||error.message); }
          finally {await context.close();}
        }
      } finally {await browser.close();}
    }
  } finally {
    if(hub) await hub.close();
    fs.rmSync(dataDir,{recursive:true,force:true});
    const reportName=browserFilter||sizeFilter||gameFilter
      ? `report-${[browserFilter||'all',sizeFilter||'all',gameFilter||'all'].join('-')}.json`
      : 'report.json';
    fs.writeFileSync(path.join(out,reportName),JSON.stringify({at:new Date().toISOString(),quick,observations,failures},null,2));
  }
  console.log(`Responsive QA: ${observations.length} checks, ${failures.length} failures. ${out}`);
  if(failures.length) process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
