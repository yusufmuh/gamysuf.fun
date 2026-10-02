'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(process.env.APPDATA,'npm','node_modules','playwright'));}
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');
const root=path.join(__dirname,'..'),version=require('../package.json').version;
const liveUrl=(process.env.GAMYSUF_LIVE_URL||'').trim();
const out=path.join(root,'artifacts',liveUrl?`live-heart-journey-${version}`:'heart-journey');
const services=['cinderella','twirl','whisper','offering','vow','hug','pat'];
const sizes=[['small-320',320,740],['phone-390',390,844],['tablet-768',768,1024],['landscape-844',844,390],['foldable-540',540,720],['fold-open-717',717,512],['laptop-1440',1440,900]];
const option=name=>process.argv.find(v=>v.startsWith(`--${name}=`))?.split('=')[1];
const browserNames=['chromium','firefox','webkit'].filter(v=>!option('browser')||option('browser')===v);
const viewportFilter=(process.env.HEART_JOURNEY_VIEWPORTS||'').split(',').map(value=>value.trim()).filter(Boolean);
const cases=sizes.filter(([id,width])=>(!option('size')||option('size')===id)&&(!viewportFilter.length||viewportFilter.includes(id)||viewportFilter.includes(String(width)))&&(!process.argv.includes('--quick')||['small-320','phone-390','laptop-1440'].includes(id)));
const report={version,target:liveUrl?'live-public-demo':'isolated-hub',startedAt:new Date().toISOString(),checks:[],cases:[],media:[],screenshots:[],diagnostics:[],failures:[]};
function check(ok,label,details){report.checks.push({ok:Boolean(ok),label,...(details===undefined?{}:{details})});assert.ok(ok,label+(details===undefined?'':': '+JSON.stringify(details)));}
function collectCheck(ok,label,details){report.checks.push({ok:Boolean(ok),label,details});if(!ok){report.failures.push({label,details});console.error(`${label}: ${JSON.stringify(details)}`);}}
function save(){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({...report,passed:report.checks.filter(v=>v.ok).length,failed:report.checks.filter(v=>!v.ok).length},null,2)+'\n');}
async function shot(page,label,stage){const file=path.join(out,`${label}-${stage}.png`);await page.screenshot({path:file});report.screenshots.push(file);}
async function keyboardClick(page,selector){const locator=page.locator(selector);await locator.scrollIntoViewIfNeeded();await locator.focus();await page.keyboard.press('Enter');}
function monitor(page,label){
 const traffic={play:[],ack:[],otherWrites:[],decoded:new Set()};
 page.on('request',request=>{if(request.method()!=='POST')return;const url=request.url();let body;try{body=JSON.parse(request.postData()||'{}');}catch{body={};}if(url.endsWith('/g/heart/api/play'))traffic.play.push(body);else if(url.endsWith('/g/heart/api/result'))traffic.ack.push(body);else traffic.otherWrites.push({url,body});});
 page.on('pageerror',error=>report.diagnostics.push({label,type:'pageerror',message:error.message}));
 page.on('console',message=>{if(message.type()==='error')report.diagnostics.push({label,type:'console',url:message.location().url,message:message.text()});});
 page.on('response',response=>{if(response.status()>=400)report.diagnostics.push({label,type:'http',url:response.url(),status:response.status()});});
 page.on('requestfailed',request=>report.diagnostics.push({label,type:'requestfailed',url:request.url(),message:request.failure()?.errorText||'',media:/\/assets\/(?:video|audio)\//.test(request.url())}));
 return traffic;
}
async function auditGeometry(page,label,scope){
 const result=await page.evaluate(selector=>{
  const active=selector?document.querySelector(selector):document;
  const isShown=element=>{const r=element.getBoundingClientRect(),s=getComputedStyle(element);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
  const controls=[...active.querySelectorAll('button,a,input,select,summary')].filter(isShown).filter(el=>!el.matches('.skip,.skip-link')&&(!el.closest('dialog')||el.closest('dialog').open));
  const small=controls.map(el=>{const r=el.getBoundingClientRect();return {id:el.id,text:(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,50),width:r.width,height:r.height};}).filter(r=>r.width<43.5||r.height<43.5);
  const dialog=selector?document.querySelector(selector):null;
  return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,dialogWidth:dialog?.clientWidth,dialogScrollWidth:dialog?.scrollWidth,small};
 },scope||null);
 collectCheck(result.scrollWidth<=result.viewport+2,`${label} page fits viewport`,result);
 if(scope)collectCheck(result.dialogScrollWidth<=result.dialogWidth+2,`${label} dialog fits viewport`,result);
 collectCheck(!result.small.length,`${label} interactive targets reach44px`,result.small);
}
async function theme(page,label,value){await page.locator(value==='light'?'#lightThemeButton':'#darkThemeButton').click();await page.waitForFunction(expected=>document.documentElement.dataset.theme===expected,value);check(await page.locator(value==='light'?'#lightThemeButton':'#darkThemeButton').getAttribute('aria-pressed')==='true',`${label} ${value} theme pressed`);}
async function chooseHost(page,label,host,keyboard=false){
 if(await page.locator('body').getAttribute('data-journey')==='table')await keyboardClick(page,'#backHomeButton');
 await page.waitForFunction(()=>document.body.dataset.journey==='home');
 check(!await page.locator('#deck').isVisible(),`${label} home hides service table`);
 check(await page.locator('#startButton').isDisabled(),`${label} host choice mandatory`);
 if(keyboard)await keyboardClick(page,`.host-card[data-host="${host}"]`);else await page.locator(`.host-card[data-host="${host}"]`).click();
 await page.waitForFunction(expected=>document.body.dataset.journey==='table'&&document.body.dataset.host===expected,host);
 check(await page.locator('#momentGrid .deck-card').count()===7,`${label} ${host} has7 service previews`);
 check(!await page.locator('.hero').isVisible(),`${label} service table replaces host home`);
}
async function previewAll(page,label,host,traffic,catalog,reduced){
 await chooseHost(page,label,host,host==='zoro');
 for(const [index,id] of services.entries()){
  const card=catalog.cards.find(c=>c.id===`${host}-${id}`),before=traffic.play.length;
  const selector=`.peek-video[data-service="${id}"]`;
  if(index===0)await keyboardClick(page,selector);else await page.locator(selector).click();
  await page.locator('#momentPreviewDialog[open]').waitFor();
  check(await page.locator('#momentPreviewArt .tcg').getAttribute('data-card')===card.id,`${label} ${card.id} preview card`);
  const pov=page.locator('#momentPreviewPov');await pov.evaluate(img=>img.decode());
  check(await pov.getAttribute('src')===(card.povImage||card.image),`${label} ${card.id} correct POV source`);
  if(host==='zoro')check(!(await pov.getAttribute('src')).includes('/assets/pov/zoro-'),`${label} cropped Zoro POV stays archived`);
  const video=page.locator('#momentPreviewArt video');check(await video.count()===1,`${label} ${card.id} contains actual service MP4`);
  await video.evaluate(v=>new Promise((resolve,reject)=>{if(v.readyState>=2)return resolve();const timer=setTimeout(()=>reject(new Error('service video decode timeout')),12000);v.addEventListener('loadeddata',()=>{clearTimeout(timer);resolve();},{once:true});v.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('service video decode error '+v.error?.code));},{once:true});}));
  if(!reduced)await page.waitForFunction(()=>{const v=document.querySelector('#momentPreviewArt video');return v&&!v.paused&&v.currentTime>0;},null,{timeout:12000});
  const meta=await video.evaluate(v=>({url:v.currentSrc,width:v.videoWidth,height:v.videoHeight,duration:v.duration,paused:v.paused,muted:v.muted,inline:v.hasAttribute('playsinline'),fit:getComputedStyle(v).objectFit,error:v.error?.code||null}));
  meta.decoder=await video.evaluate(v=>new Promise((resolve,reject)=>{const probe=document.createElement('video');probe.preload='auto';probe.muted=true;probe.setAttribute('playsinline','');const cleanup=()=>{clearTimeout(timer);probe.pause();probe.removeAttribute('src');probe.load();};const timer=setTimeout(()=>{cleanup();reject(new Error('original service metadata timeout'));},12000);probe.addEventListener('loadeddata',()=>{const result={width:probe.videoWidth,height:probe.videoHeight,duration:probe.duration};cleanup();resolve(result);},{once:true});probe.addEventListener('error',()=>{cleanup();reject(new Error('original service metadata decode error'));},{once:true});probe.src=v.currentSrc;probe.load();}));
  check(meta.decoder&&Math.abs(meta.decoder.width/meta.decoder.height-.8)<.003&&Math.abs(meta.duration-5)<.1,`${label} ${card.id} service video decoded/proportional`,meta);
  if(Math.abs(meta.width/meta.height-.8)>=.003)meta.playbackDimensionQuirk='WebKit compositor dimensions differ from original loadedmetadata dimensions; source aspect remains4:5 and CSS contains it.';
  check(meta.muted&&meta.inline&&meta.fit==='contain'&&!meta.error,`${label} ${card.id} video muted/inline/contain`,meta);
  if(reduced)check(meta.paused,`${label} reduced motion preview stays paused`);
  traffic.decoded.add(meta.url);report.media.push({label,card:card.id,...meta});
  check(traffic.play.length===before,`${label} ${card.id} preview makes no draw`);
  if(index===0){await auditGeometry(page,label+' preview', '#momentPreviewDialog');await shot(page,label,host+'-service-preview');await page.keyboard.press('Escape');await page.locator('#momentPreviewDialog').waitFor({state:'hidden'});await page.waitForFunction(expected=>document.querySelector(expected)===document.activeElement,selector,{timeout:2000});check(await page.locator(selector).evaluate(el=>el===document.activeElement),`${label} preview Escape restores keyboard focus`);}
  else await page.locator('#closeMomentPreview').click();
  await page.locator('#momentPreviewDialog').waitFor({state:'hidden'});
 }
}
async function finishResult(page,label,result,traffic,before,reduced){
 await page.waitForFunction(()=>document.getElementById('playShell').dataset.phase==='result',null,{timeout:20000});
 check(result.demo&&result.status==='demo'&&result.id.startsWith('DEMO-'),`${label} result remains isolated free DEMO`,result.id);
 check(result.comfort==='no-touch'&&result.recording===false&&result.consent===false,`${label} safe defaults preserved`);
 check(!('purchaseAmount' in result),`${label} demo has no purchase claim`);
 check(traffic.play.length===before+1,`${label} repeated selection causes only one draw`);
 const request=traffic.play.at(-1);check(request.comfort==='no-touch'&&request.recording===false&&request.consent===false,`${label} safe draw payload`);
 await page.locator('#resultHost').evaluate(img=>img.decode());
 await page.locator('#faceCard .bipy-seal.is-stamped').waitFor();
 await page.locator('#faceCard .bipy-seal img').evaluate(img=>img.decode());
 check((await page.locator('#faceCard .bipy-seal img').getAttribute('src')).endsWith('/assets/brand/bipy-pink.webp'),`${label} card bears original pink Bipy stamp`);
 await page.waitForTimeout(reduced?50:700);
 await auditGeometry(page,label+' result','#resultDialog');
 await keyboardClick(page,'#viewPoster');await page.locator('#facePoster.on').waitFor();
 await page.waitForTimeout(reduced?30:1100);
 const seal=page.locator('#facePoster .bipy-seal');
 check(await seal.evaluate(el=>el.classList.contains('is-stamped')&&Number(getComputedStyle(el).opacity)>.5),`${label} poster Bipy stamp visible`);
 check((await seal.locator('img').getAttribute('src')).endsWith('/assets/brand/bipy-pink.webp'),`${label} poster bears original pink Bipy stamp`);
 check(await seal.evaluate(el=>getComputedStyle(el).borderTopColor)==='rgb(230, 43, 94)',`${label} Bipy stamp uses pink ink`);
 await shot(page,label,'poster-'+result.method);
 await keyboardClick(page,'#finishButton');await page.locator('#resultDialog').waitFor({state:'hidden'});
 check(traffic.ack.at(-1)?.id===result.id,`${label} ACK closes actual result`);
 check(await page.locator('body').getAttribute('data-journey')==='table',`${label} ACK returns to same host table`);
}
async function gacha(page,label,traffic,{reduced=false,cancel=false,slot=0}={}){
 await page.locator('#gachaMode').click();const before=traffic.play.length;
 await page.evaluate(()=>{window.__dealPhases=[];window.__dealObserver?.disconnect();window.__dealObserver=new MutationObserver(()=>window.__dealPhases.push(document.getElementById('dealShell').dataset.phase));window.__dealObserver.observe(document.getElementById('dealShell'),{attributes:true,attributeFilter:['data-phase']});});
 await page.locator('#startButton').click();await page.locator('#dealDialog[open]').waitFor();
 if(cancel){check(traffic.play.length===before,`${label} initial deck preview makes no draw`);await page.locator('#cancelDealButton').click();await page.locator('#dealDialog').waitFor({state:'hidden'});check(traffic.play.length===before,`${label} cancel deck makes no draw`);await page.locator('#startButton').click();}
 await page.waitForFunction(()=>document.getElementById('dealShell').dataset.phase==='choose',null,{timeout:15000});
 const phases=await page.evaluate(()=>window.__dealPhases);
 if(!reduced)for(const phase of ['preview','stack','shuffle','choose'])check(phases.includes(phase),`${label} gacha reaches ${phase}`,phases);
 else check(phases.includes('choose')&&!phases.includes('shuffle'),`${label} reduced gacha skips motion to closed choice`,phases);
 check(traffic.play.length===before,`${label} no draw before customer's closed-card choice`);
 check(await page.locator('#dealCards .deal-slot').count()===7,`${label}7 closed selectable cards`);
 check(await page.locator('#dealCards .deal-slot:disabled').count()===0,`${label} closed cards enabled only at choice`);
 await page.locator('#dealerBipy').evaluate(img=>img.decode());
 check((await page.locator('#dealerBipy').getAttribute('src')).includes('/assets/dealers/'),`${label} full-body dealer asset used`);
 await page.waitForTimeout(reduced?50:800);await auditGeometry(page,label+' closed choice','#dealDialog');await shot(page,label,'closed-choice');
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/g/heart/api/play')&&r.request().method()==='POST');
 const button=page.locator(`#dealCards .deal-slot[data-slot="${slot}"]`);await button.click();await button.evaluate(el=>el.click());
 const response=await responsePromise;check(response.status()===200,`${label} closed choice draw accepted`);const result=await response.json();
 check(result.method==='gacha',`${label} gacha result method`);
 await page.locator('#resultDialog[open]').waitFor();await finishResult(page,label,result,traffic,before,reduced);return result;
}
async function direct(page,label,traffic,catalog){
 await chooseHost(page,label,'sanji',true);await keyboardClick(page,'#pickMode');const before=traffic.play.length;
 await page.locator('.peek-video[data-service="hug"]').click();await page.locator('#momentPreviewDialog[open]').waitFor();
 check(await page.locator('#choosePreviewCard').isVisible(),`${label} direct preview offers explicit selection`);await keyboardClick(page,'#choosePreviewCard');
 check(await page.locator('.card-choice[data-service="hug"]').getAttribute('aria-pressed')==='true',`${label} direct Warm Hug chosen`);
 check(traffic.play.length===before,`${label} direct selection makes no premature draw`);
 await page.evaluate(()=>{window.__dealPhases=[];});
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/g/heart/api/play')&&r.request().method()==='POST');await keyboardClick(page,'#startButton');
 const response=await responsePromise;check(response.status()===200,`${label} direct choice draw accepted`);const result=await response.json();
 check(result.method==='pick'&&result.service.id==='hug'&&result.host.id==='sanji',`${label} direct service/host respected`);
 check(!(await page.evaluate(()=>window.__dealPhases)).length&&!await page.locator('#dealDialog').evaluate(d=>d.open),`${label} direct skips deck/stack/shuffle`);
 await finishResult(page,label,result,traffic,before,true);
}
async function runCase(browser,name,id,width,height,origin){
 const label=`${name}-${id}`,full=['phone-390','laptop-1440'].includes(id);
 const context=await browser.newContext({viewport:{width,height},colorScheme:'dark',reducedMotion:full?'no-preference':'reduce',hasTouch:width<1000});
 const page=await context.newPage(),traffic=monitor(page,label),firstCheck=report.checks.length;const caseReport={label,viewport:{width,height},fullMotion:full,status:'running'};report.cases.push(caseReport);
 try{
  await page.goto(origin+'/g/heart/');await page.locator('body[data-ready="1"]').waitFor({timeout:20000});
  check(await page.locator('body').getAttribute('data-journey')==='home',`${label} begins at mandatory host home`);
  check(!await page.locator('#deck').isVisible(),`${label} service table hidden before host choice`);
  await theme(page,label,'light');await auditGeometry(page,label+' light home');await theme(page,label,'dark');await auditGeometry(page,label+' dark home');
  await shot(page,label,'home');
  const response=await page.request.get(origin+'/g/heart/api/state');check(response.status()===200,`${label} public state available`);const catalog=await response.json();
  check(catalog.settings.mode==='demo',`${label} fresh visitor demo mode`);
  for(const host of ['zoro','sanji'])await previewAll(page,label,host,traffic,catalog,!full);
  await chooseHost(page,label,'zoro',true);await auditGeometry(page,label+' dark table');
  await gacha(page,label,traffic,{reduced:!full,cancel:true,slot:3});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.motion==='reduce');
  await theme(page,label,'light');await auditGeometry(page,label+' light table');
  await gacha(page,label+'-repeat',traffic,{reduced:true,slot:6});
  await direct(page,label+'-direct',traffic,catalog);
  await keyboardClick(page,'#backHomeButton');check(await page.locator('body').getAttribute('data-journey')==='home',`${label} can return to host home after repeats`);
  check(traffic.play.length===3&&traffic.ack.length===3,`${label}3 isolated draws and3 matching ACKs`,{play:traffic.play.length,ack:traffic.ack.length});
  check(!traffic.otherWrites.length,`${label} no admin/staff/official mutations`,traffic.otherWrites);
  const unexpected=report.diagnostics.filter(d=>d.label===label).filter(d=>{
   if(d.type==='requestfailed'&&d.media&&/ERR_ABORTED|aborted|cancelled/i.test(d.message)){d.expectedMediaCancellation=true;d.decodedService=traffic.decoded.has(d.url);return false;}
   return true;
  });check(!unexpected.length,`${label} no unexpected console/page/HTTP/request errors`,unexpected);
  const caseChecks=report.checks.slice(firstCheck);caseReport.status=caseChecks.every(value=>value.ok)?'passed':'failed';caseReport.draws=traffic.play;caseReport.acks=traffic.ack;
  console.log(`${label}: ${caseReport.status}, ${caseChecks.filter(value=>value.ok).length}/${caseChecks.length} checks`);
 }catch(error){caseReport.status='failed';caseReport.error=error.stack||error.message;report.failures.push({label,error:caseReport.error});await shot(page,label,'failure').catch(()=>{});console.error(`${label}: FAILED ${error.message}`);throw error;}
 finally{await context.close();save();}
}
async function main(){
 check(browserNames.length>0&&cases.length>0,'requested browser/viewport filters match cases');fs.mkdirSync(out,{recursive:true});
 let dir,hub,origin;
 try{if(liveUrl){const target=new URL(liveUrl);assert.ok(['http:','https:'].includes(target.protocol),'live target must use HTTP or HTTPS');origin=target.origin;}else{dir=fs.mkdtempSync(path.join(os.tmpdir(),'heart-journey-'));hub=await createHub({dataDir:dir,adminPin:'123456',heartPin:'1234',local:true});origin=hub.origin;}report.origin=origin;for(const name of browserNames){const browser=await playwright[name].launch();try{for(const [id,width,height] of cases)await runCase(browser,name,id,width,height,origin);}finally{await browser.close();}}
 check(report.checks.every(value=>value.ok),'all collected journey checks pass');
 console.log(`Heart journey: ${report.checks.length} checks passed across ${report.cases.length} cases. ${path.join(out,'report.json')}`);
 }finally{if(hub)await hub.close();if(dir){assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}report.finishedAt=new Date().toISOString();save();}
}
main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
