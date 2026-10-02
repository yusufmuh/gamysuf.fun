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
  ['fold-cover-280',280,653], ['small-320',320,640], ['phone-360',360,740], ['phone-390',390,844],
  ['foldable-540',540,720], ['fold-open-717',717,512], ['tablet-768',768,1024], ['tablet-1024',1024,1366], ['landscape-844',844,390],
  ['laptop-1280',1280,800], ['desktop-1366',1366,768], ['desktop-1920',1920,1080]
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
  const stem=`${browserName}-${sizeId}-${route==='/'?'hub':route.startsWith('/g/')?route.split('/')[2]:route.replace(/\W+/g,'')}`;
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
async function linkResolves(page,base,href,label) {
  const response=await page.request.get(new URL(href,base).href,{maxRedirects:0});
  check(response.status()===200,`${label} ${href} resolves`,String(response.status()));
}
async function eventChecks(page,base,stem) {
  const section=page.locator('#market-in');
  check(await section.isVisible(),`${stem} Market-In section visible`);
  check(await page.locator('#newArena').getAttribute('href')==='#market-in',`${stem} hero pill targets event section`);
  const order=await page.evaluate(()=>{const hero=document.querySelector('.hero'),event=document.getElementById('market-in');return hero.nextElementSibling===event;});
  check(order,`${stem} event section follows hero`);
  check((await section.textContent()).includes('Zoro & Sanji hadir 3–4 Okt'),`${stem} cosplayer ribbon`);
  const ctas=await page.locator('#market-in .event-game-actions a.btn-primary').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  check(JSON.stringify(ctas)===JSON.stringify(['/g/gacha/','/g/heart/']),`${stem} event CTAs`,JSON.stringify(ctas));
  for(const href of ctas) await linkResolves(page,base,href,`${stem} event CTA`);
  for(const selector of ['#market-in .event-game-actions a.btn-primary','#market-in .event-game-actions button','#market-in .event-staff a','.event-tile a.btn-primary']) {
    await page.locator(selector).first().scrollIntoViewIfNeeded();
    const control=await target(page,selector);
    check(control.visible && control.inViewport && control.width>=44 && control.height>=44,`${stem} ${selector} touch target`,JSON.stringify(control));
  }
  const staff=await page.locator('#market-in .event-staff a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  check(JSON.stringify(staff)===JSON.stringify(['/g/gacha/admin.html','/g/heart/admin.html']),`${stem} staff links`,JSON.stringify(staff));
  for(const href of staff) await linkResolves(page,base,href,`${stem} staff`);
  const tile=await page.locator('#gameGrid > .event-tile a.btn-primary').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  check(JSON.stringify(tile)===JSON.stringify(['/g/gacha/','/g/heart/']),`${stem} Market-In double tile keeps two play buttons`,JSON.stringify(tile));
  const singles=await page.locator('#gameGrid > .game-card:not(.event-tile) a.btn-primary').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  check(['/g/spin/','/g/nyapit/','/g/drop/'].every(href=>singles.includes(href)),`${stem} other games keep own tiles`,JSON.stringify(singles));
  const layout=await geometry(page);
  check(layout.scrollWidth<=layout.width+2,`${stem} event section overflow`,JSON.stringify(layout));
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`${stem}-event.png`),fullPage:false});
}
async function marketInFlow(page, base, browserName, sizeId) {
  const log=await visit(page,base,'/market-in',browserName,sizeId);
  await page.locator('body[data-ready="1"]').waitFor({timeout:20000});
  for(const href of ['/g/gacha/','/g/heart/']) {
    const selector=`.mi-actions a[href="${href}"]`;
    const control=await target(page,selector);
    check(control.visible && control.width>=44 && control.height>=44,`${log.stem} hero CTA ${href}`,JSON.stringify(control));
    await linkResolves(page,base,href,`${log.stem} hero CTA`);
  }
  const games=await page.locator('#miGames a.btn-primary').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
  check(JSON.stringify(games)===JSON.stringify(['/g/gacha/','/g/heart/']),`${log.stem} game cards`,JSON.stringify(games));
  check(await page.locator('#miDays .mi-day').count()===2,`${log.stem} two cosplayer days`);
  await page.locator('#heartCards[aria-busy="false"],#heartFallback:not([hidden])').first().waitFor({timeout:15000});
  check(await page.locator('#heartCards .mi-card').count()===14,`${log.stem} fourteen Heart Parade cards`);
  await page.locator('#gachaTiers[aria-busy="false"],#gachaFallback:not([hidden])').first().waitFor({timeout:15000});
  const tiers=await page.locator('#gachaTiers .mi-tier').count();
  check(tiers>=3,`${log.stem} Gacha Pop prize classes`,String(tiers));
  check(!/\bstok\s*\d|×\d/i.test(await page.locator('#gachaTiers').textContent()),`${log.stem} no stock numbers`);
  const jingle=await target(page,'#jingle');
  check(jingle.visible && jingle.height>=44,`${log.stem} jingle touch target`,JSON.stringify(jingle));
  check(await page.locator('#jingle').getAttribute('aria-pressed')==='false',`${log.stem} jingle waits for tap`);
  for(const selector of ['#jadwal','#kartu','#hadiah']) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    const layout=await geometry(page);
    check(layout.scrollWidth<=layout.width+2,`${log.stem} ${selector} overflow`,JSON.stringify(layout));
  }
  await page.locator('#kartu').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`${log.stem}-cards.png`),fullPage:false});
  check(!log.errors.length,`${log.stem} console errors`,JSON.stringify(log.errors));
  check(!log.badResponses.length,`${log.stem} HTTP errors`,JSON.stringify(log.badResponses));
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
  await eventChecks(page,base,log.stem);
  for(const slug of ['spin','nyapit','drop','gacha','heart']) {
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
  } else if(slug==='gacha') {
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
  if(slug==='heart') {
    await page.locator('body[data-ready="1"]').waitFor({timeout:20000});
    check(await page.locator('#prepDialog').count()===0,`${log.stem} draw has no preparation dialog`);
    for(const [theme,other] of [['light','dark'],['dark','light']]) {
      const button=page.locator(`#${theme}ThemeButton`),control=await target(page,`#${theme}ThemeButton`);
      check(control.visible&&control.width>=44&&control.height>=44,`${log.stem} ${theme} theme touch target`,JSON.stringify(control));
      await button.click();
      check(await page.locator('html').getAttribute('data-theme')===theme,`${log.stem} explicit ${theme} theme applies`);
      check(await button.getAttribute('aria-pressed')==='true'&&await page.locator(`#${other}ThemeButton`).getAttribute('aria-pressed')==='false',`${log.stem} ${theme} theme pressed states`);
      check(await page.evaluate(()=>localStorage.getItem('gamysuf-theme'))===theme,`${log.stem} ${theme} theme preference saved`);
      const themedLayout=await geometry(page);
      check(themedLayout.scrollWidth<=themedLayout.width+2,`${log.stem} ${theme} theme overflow`,JSON.stringify(themedLayout));
    }
    for(const selector of ['#demoModeButton','#liveModeButton']) {
      const control=await target(page,selector);
      check(control.visible&&control.width>=44&&control.height>=44,`${log.stem} ${selector} mode touch target`,JSON.stringify(control));
    }
    check(await page.locator('#demoModeButton').getAttribute('aria-pressed')==='true'&&await page.locator('#liveModeButton').getAttribute('aria-pressed')==='false',`${log.stem} initial demo mode`);
    const apiHeaders={'Origin':base,'Content-Type':'application/json','X-Bpedia-Client':'heartparade'};
    const unauthorized=await page.request.post(base+'/g/heart/api/mode',{headers:apiHeaders,data:{mode:'live'}});
    check(unauthorized.status()===401,`${log.stem} recorded mode requires staff authentication`);
    const login=await page.request.post(base+'/g/heart/api/login',{headers:apiHeaders,data:{pin:'246810'}});
    check(login.status()===200,`${log.stem} isolated QA staff session`);
    for(const [mode,id,other] of [['live','liveModeButton','demoModeButton'],['demo','demoModeButton','liveModeButton']]) {
      const switched=page.waitForResponse(response=>response.url()===base+'/g/heart/api/mode'&&response.request().method()==='POST');
      await page.locator('#'+id).click();const response=await switched,state=await response.json();
      check(response.status()===200&&state.settings.mode===mode,`${log.stem} ${mode} mode confirmed by server`);
      await page.locator(`#${id}[aria-pressed="true"]:not([disabled])`).waitFor();
      check(await page.locator('#'+other).getAttribute('aria-pressed')==='false',`${log.stem} ${mode} mode pressed states`);
    }
    const directDraw=async label=>{
      const played=page.waitForResponse(response=>response.url()===base+'/g/heart/api/play'&&response.request().method()==='POST');
      await page.locator('#startButton').click();const response=await played,result=await response.json(),request=JSON.parse(response.request().postData()||'{}');
      check(response.status()===200,`${log.stem} ${label} direct draw succeeds`,String(response.status()));
      for(const [field,value] of [['comfort','no-touch'],['recording',false],['consent',false]]) {
        check(request[field]===value,`${log.stem} ${label} submits ${field}`,JSON.stringify(request[field]));
        check(result[field]===value,`${log.stem} ${label} preserves ${field}`,JSON.stringify(result[field]));
      }
      await page.locator('#resultDialog[open]').waitFor({timeout:20000});
      check(await page.locator('#demoModeButton').isDisabled()&&await page.locator('#liveModeButton').isDisabled(),`${log.stem} ${label} open result locks session mode`);
      return result;
    };
    const titleFit=await page.locator('#title').evaluate(n=>({width:n.clientWidth,content:n.scrollWidth}));
    check(titleFit.content<=titleFit.width+2,`${log.stem} complete title visible`,JSON.stringify(titleFit));
    await page.locator('[data-host="sanji"].host-card').click();
    await page.locator('#pickMode').click();
    check(await page.locator('.card-choice[data-service]').count()===7,`${log.stem} seven visible card choices`);
    const sanjiArt=await page.locator('#momentGrid .card-art>img').evaluateAll(images=>Promise.all(images.map(async image=>{
      image.loading='eager';await image.decode();return image.src;
    })));
    const choice=await target(page,'.card-choice[data-service="twirl"]');
    check(choice.visible&&choice.width>=44&&choice.height>=44,`${log.stem} card choice touch target`);
    await page.locator('.card-choice[data-service="twirl"]').click();
    check(await page.locator('#pickMode').getAttribute('aria-pressed')==='true',`${log.stem} explicit selection mode`);
    const control=await target(page,'#startButton');
    check(control.visible&&control.width>=44&&control.height>=44,`${log.stem} heart touch target`);
    const picked=await directDraw('picked card');
    check(picked.method==='pick'&&picked.service.id==='twirl'&&picked.host.id==='sanji',`${log.stem} visible choice retained by server`);
    await page.waitForFunction(()=>document.querySelector('#resultDialog')?.scrollTop===0,null,{timeout:1000});
    check(await page.locator('#resultDialog').evaluate(dialog=>dialog.scrollTop)===0,`${log.stem} result initially scrolls from top`);
    check((await page.locator('#resultHostName').textContent())==='Sanji',`${log.stem} chosen host retained`);
    check((await page.locator('#resultTitle').textContent())==='Princess Twirl',`${log.stem} explicit card retained`);
    check((await page.locator('#ticketLabel').textContent()).includes('DEMO'),`${log.stem} demo label`);
    const resultLayout=await geometry(page);
    check(resultLayout.scrollWidth<=resultLayout.width+2,`${log.stem} heart result overflow`,JSON.stringify(resultLayout));
    await page.screenshot({path:path.join(out,`${log.stem}-result.png`)});
    await page.locator('#finishButton').click();
    await page.locator('#resultDialog').waitFor({state:'hidden'});
    check(!await page.locator('#demoModeButton').isDisabled()&&!await page.locator('#liveModeButton').isDisabled(),`${log.stem} result acknowledgement unlocks session mode`);
    await page.locator('[data-host="zoro"].host-card').click();
    await page.locator('#gachaMode').click();
    check(await page.locator('#gachaMode').getAttribute('aria-pressed')==='true',`${log.stem} gacha selection mode`);
    const zoroArt=await page.locator('#momentGrid .card-art>img').evaluateAll(images=>Promise.all(images.map(async image=>{
      image.loading='eager';await image.decode();return image.src;
    })));
    check(new Set([...sanjiArt,...zoroArt]).size===14,`${log.stem} fourteen unique decoded artwork URLs`);
    const gacha=await directDraw('gacha replay');
    check(gacha.method==='gacha'&&gacha.host.id==='zoro',`${log.stem} gacha clears explicit service`);
    await page.waitForFunction(()=>document.querySelector('#resultDialog')?.scrollTop===0,null,{timeout:1000});
    check(await page.locator('#resultDialog').evaluate(dialog=>dialog.scrollTop)===0,`${log.stem} replay result scroll resets`);
    check((await page.locator('#resultHostName').textContent())==='Zoro',`${log.stem} gacha host retained`);
    await page.locator('#finishButton').click();await page.locator('#resultDialog').waitFor({state:'hidden'});
    const reduced=await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
    check(await page.locator('html').getAttribute('data-motion')===(reduced?'reduce':'full'),`${log.stem} motion preference retained`);
    check(!await page.locator('#startButton').isDisabled(),`${log.stem} heart replay ready`);
    await page.request.post(base+'/g/heart/api/logout',{headers:apiHeaders,data:{}});
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
        const selected=browserName==='chromium'||sizeFilter||gameFilter==='heart'?cases:cases.filter(([id])=>['small-320','phone-390','tablet-768','desktop-1366'].includes(id));
        for(const [sizeId,width,height] of selected) {
          const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<=844,isMobile:width<=540 && browserName!=='firefox',reducedMotion:browserName==='chromium'&&sizeId==='phone-390'?'no-preference':'reduce'});
          const page=await context.newPage();
          try {
            try {await hubFlow(page,base,browserName,sizeId);}
            catch(error) {check(false,`${browserName}-${sizeId} hub flow`,error.stack||error.message);}
            try {await marketInFlow(page,base,browserName,sizeId);}
            catch(error) {check(false,`${browserName}-${sizeId} market-in flow`,error.stack||error.message);}
            for(const slug of ['spin','nyapit','drop','gacha','heart'].filter(name=>!gameFilter||name===gameFilter)) {
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
