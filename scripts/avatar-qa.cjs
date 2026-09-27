'use strict';

// Isolated local character-selection regression tour.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
let playwright;
try{playwright=require('playwright');}
catch{playwright=require(path.join(process.env.APPDATA||'/usr/local/lib','npm','node_modules','playwright'));}
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');

const root=path.join(__dirname,'..');
const out=path.join(root,'artifacts','avatar-qa');
const checks=[];
const submitMetrics=[];
const avatars=['wave','peek','wink','bag','stand','heart'];
const names={wave:'Bipy Original',peek:'Bipy Explorer',wink:'Bipy Star',bag:'Bipy Collector',stand:'Bipy Classic',heart:'Bipy Champion'};
const variants=[
 ['chromium',320,700],['chromium',390,844],['chromium',540,900],
 ['chromium',768,1024],['chromium',1449,851],['chromium',844,390],
 ['firefox',390,844],['firefox',1449,851],
 ['webkit',390,844],['webkit',1449,851]
];
function check(ok,label,detail=''){
 const entry={ok:Boolean(ok),label,detail};checks.push(entry);
 if(!entry.ok)console.error(`FAIL ${label}: ${detail}`);
}
async function snapshot(page,modalId){
 return page.evaluate(id=>{
  const modal=document.getElementById(id),card=modal.querySelector('.modal-card');
  const picker=modal.querySelector('.avatar-picker'),preview=picker.querySelector('.avatar-fullbody');
  const footer=modal.querySelector('.character-footer');
  const roster=[...picker.querySelectorAll('[data-avatar]')];
  const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const css=getComputedStyle(preview);
  return {viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,
   modal:rect(modal),card:rect(card),stage:rect(picker.querySelector('.avatar-stage')),
   display:rect(picker.querySelector('.avatar-display')),preview:rect(preview),
   previewStyle:{objectFit:css.objectFit,objectPosition:css.objectPosition},
   image:{src:preview.currentSrc||preview.src,complete:preview.complete,naturalWidth:preview.naturalWidth,naturalHeight:preview.naturalHeight},
   name:picker.querySelector('.avatar-name').textContent,
   footer:footer?rect(footer):null,
   scroll:{top:card.scrollTop,height:card.scrollHeight,client:card.clientHeight},
   roster:roster.map(button=>({id:button.dataset.avatar,checked:button.getAttribute('aria-checked'),tabIndex:button.tabIndex,
    imageComplete:button.querySelector('img').complete,naturalWidth:button.querySelector('img').naturalWidth,
    imageFit:getComputedStyle(button.querySelector('img')).objectFit})),
   activeId:document.activeElement?.dataset?.avatar||''};
 },modalId);
}
async function readyImages(page,modalId){
 await page.waitForFunction(id=>{
  const modal=document.getElementById(id);
  return [...modal.querySelectorAll('.avatar-picker img')].length===7&&
   [...modal.querySelectorAll('.avatar-picker img')].every(img=>img.complete&&img.naturalWidth>0);
 },modalId,{timeout:15000});
}
function checkLayout(s,label){
 const eps=2;
 check(s.documentWidth<=s.viewport.width+eps,`${label} no horizontal overflow`,JSON.stringify({width:s.documentWidth,viewport:s.viewport.width}));
 check(s.card.x>=-eps&&s.card.right<=s.viewport.width+eps&&s.card.y>=-eps&&s.card.bottom<=s.viewport.height+eps,`${label} modal inside viewport`,JSON.stringify(s.card));
 check(s.previewStyle.objectFit==='contain'&&s.image.complete&&s.image.naturalWidth>0,`${label} full-body preview loaded with contain`,JSON.stringify({style:s.previewStyle,image:s.image}));
 check(s.preview.x>=s.display.x-eps&&s.preview.right<=s.display.right+eps&&s.preview.y>=s.display.y-eps&&s.preview.bottom<=s.display.bottom+eps,`${label} preview box within display`,JSON.stringify({display:s.display,preview:s.preview}));
 check(s.roster.length===6&&s.roster.every(row=>row.imageComplete&&row.naturalWidth>0&&row.imageFit==='contain'),`${label} six full-body thumbnails loaded with contain`,JSON.stringify(s.roster));
 check(s.roster.filter(row=>row.tabIndex===0).length===1&&s.roster.filter(row=>row.checked==='true').length===1,`${label} one roving tab stop and selected radio`,JSON.stringify(s.roster));
}
async function select(page,modalId,id){
 const radio=page.locator(`#${modalId} [data-avatar="${id}"]`);
 await radio.click();
 await page.locator(`#${modalId} .avatar-fullbody`).evaluate(img=>img.decode());
 const s=await snapshot(page,modalId);
 check(s.roster.find(row=>row.id===id)?.checked==='true'&&s.name===names[id]&&s.image.src.includes(`character-${{peek:'explorer',wink:'star',bag:'collector',heart:'champion'}[id]||id}.png`),`${modalId} ${id} selection updates name and preview`,JSON.stringify({name:s.name,src:s.image.src}));
 check(s.activeId===id,`${modalId} ${id} click preserves radio focus`,s.activeId);
 return s;
}
async function footerReachable(page,modalId,label){
 const s=await page.evaluate(id=>{const card=document.querySelector(`#${id} .modal-card`);card.scrollTop=card.scrollHeight;return {scrollTop:card.scrollTop,maxScroll:card.scrollHeight-card.clientHeight};},modalId);
 const after=await snapshot(page,modalId);
 check(s.maxScroll<=1||s.scrollTop>=s.maxScroll-2,`${label} footer scroll reaches end`,JSON.stringify(s));
 check(Boolean(after.footer)&&after.footer.y>=-2&&after.footer.bottom<=after.viewport.height+2,`${label} footer visible after scroll`,JSON.stringify(after.footer));
}
async function submitVisibility(page,label,width,height){
 const metric=await page.evaluate(()=>{
  const card=document.querySelector('#onboardModal .modal-card');
  const button=document.getElementById('onboardSave');
  card.scrollTop=0;
  const cr=card.getBoundingClientRect(),br=button.getBoundingClientRect();
  const maxScroll=Math.max(0,card.scrollHeight-card.clientHeight);
  const neededScroll=Math.max(0,Math.ceil(br.bottom-cr.bottom+1));
  return {cardHeight:card.clientHeight,contentHeight:card.scrollHeight,
   maxScroll,neededScroll,initiallyVisible:br.top>=cr.top-1&&br.bottom<=cr.bottom+1,
   button:{top:Math.round(br.top),bottom:Math.round(br.bottom)},
   card:{top:Math.round(cr.top),bottom:Math.round(cr.bottom)}};
 });
 submitMetrics.push({label,width,height,...metric});
 const fits=metric.contentHeight<=metric.cardHeight+2;
 if(width===390&&height===844){
  check(!fits||metric.initiallyVisible,`${label} submit visible without scroll when dialog fits`,JSON.stringify(metric));
 }
 check(metric.initiallyVisible||metric.neededScroll<=metric.maxScroll+2,`${label} submit reachable with measured dialog scroll`,JSON.stringify(metric));
}
async function runVariant(browser,engine,width,height,origin){
 const label=`${engine} ${width}x${height}`;
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('body[data-ready="1"]').waitFor();
  await page.locator('#onboardModal.open').waitFor();
  await readyImages(page,'onboardModal');
  const initial=await snapshot(page,'onboardModal');
  checkLayout(initial,label);
  await submitVisibility(page,label,width,height);
  const desktop=width===1449&&engine==='chromium';
  const tested=desktop?avatars:(width===390?['peek','bag']:['wave','peek']);
  for(const id of tested){
   const state=await select(page,'onboardModal',id);
   checkLayout(state,`${label} ${id}`);
   if(desktop||engine==='chromium'&&[320,390,844].includes(width)){
    await page.locator('#onboardModal .modal-card').evaluate(card=>{card.scrollTop=0;});
    await page.locator('#onboardModal .modal-card').screenshot({path:path.join(out,`${engine}-${width}x${height}-${id}.png`)});
   }
  }
  await page.locator('#onboardModal [data-avatar="wave"]').focus();
  await page.keyboard.press('ArrowRight');
  let keyState=await snapshot(page,'onboardModal');
  check(keyState.activeId==='peek'&&keyState.roster.find(row=>row.id==='peek')?.checked==='true',`${label} arrow right selects and focuses next`,JSON.stringify({active:keyState.activeId,name:keyState.name}));
  await page.keyboard.press('ArrowDown');
  keyState=await snapshot(page,'onboardModal');
  check(keyState.activeId==='stand'&&keyState.roster.find(row=>row.id==='stand')?.checked==='true',`${label} arrow down follows three-column roster`,JSON.stringify({active:keyState.activeId,name:keyState.name}));
  await page.keyboard.press('End');
  keyState=await snapshot(page,'onboardModal');
  check(keyState.activeId==='heart'&&keyState.roster.find(row=>row.id==='heart')?.checked==='true',`${label} End reaches last radio`,JSON.stringify({active:keyState.activeId,name:keyState.name}));
  await footerReachable(page,'onboardModal',label);
  check(errors.length===0,`${label} page errors`,JSON.stringify(errors));
  if(engine==='chromium'&&width===390){
   await page.locator('#onboardModal [data-avatar="bag"]').click();
   await page.locator('#nicknameInput').fill('Avatar QA');
   await page.locator('#onboardSave').click();
   await page.locator('#onboardModal').waitFor({state:'hidden'});
   check((await page.locator('#chipAvatar').getAttribute('src')).includes('character-collector.png'),`${label} onboarding persists nondefault avatar in chip`);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('body[data-ready="1"]').waitFor();
   check(!(await page.locator('#onboardModal').isVisible())&&(await page.locator('#chipAvatar').getAttribute('src')).includes('character-collector.png'),`${label} nondefault avatar survives reload`);
   await page.locator('#playerChip').click();
   await page.locator('#profileModal.open').waitFor();
   await readyImages(page,'profileModal');
   const profile=await snapshot(page,'profileModal');
   check(profile.roster.find(row=>row.id==='bag')?.checked==='true',`${label} profile picker restores saved avatar`);
   await select(page,'profileModal','wink');
   await page.locator('#profileNameInput').fill('Avatar QA Updated');
   await page.locator('#profileSave').click();
   await page.locator('#profileModal').waitFor({state:'hidden'});
   check((await page.locator('#chipAvatar').getAttribute('src')).includes('character-star.png')&&(await page.locator('#profileName').textContent()).includes('Avatar QA Updated'),`${label} profile change saves avatar and name`);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('body[data-ready="1"]').waitFor();
   check((await page.locator('#chipAvatar').getAttribute('src')).includes('character-star.png')&&(await page.locator('#profileName').textContent()).includes('Avatar QA Updated'),`${label} changed avatar and name survive reload`);
  }
 }finally{await context.close();}
}
async function run(){
 fs.mkdirSync(out,{recursive:true});
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-avatar-'));
 let hub;
 try{
  hub=await createHub({dataDir,adminPin:'246810',local:true});
  for(const engine of ['chromium','firefox','webkit']){
   const browser=await playwright[engine].launch();
   try{for(const [,width,height] of variants.filter(row=>row[0]===engine))await runVariant(browser,engine,width,height,hub.origin);}
   finally{await browser.close();}
  }
 }finally{
  await hub?.close();
  fs.rmSync(dataDir,{recursive:true,force:true});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),variants,submitMetrics,checks},null,2));
 }
 console.log(`Avatar QA: ${checks.filter(row=>row.ok).length}/${checks.length} checks. ${out}`);
 if(checks.some(row=>!row.ok))process.exitCode=1;
}
run().catch(error=>{console.error(error);process.exitCode=1;});
