'use strict';

// Controlled public demo gameplay only. No staff login, settings, or booth tickets.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let playwright;
try{playwright=require('playwright');}catch{playwright=require(path.join(process.env.APPDATA||'/usr/local/lib','npm','node_modules','playwright'));}
const base='https://gamysuf.fun',version='1.6.1',root=path.join(__dirname,'..');
const out=path.join(root,'artifacts',`live-heart-${version}`),game=base+'/g/heart/';
const checks=[],results=[],errors=[],cancelledImages=[],mediaAborts=[],verifiedMedia=[],requests=[],downloads=[];
function check(ok,label,detail=''){checks.push({ok:Boolean(ok),label,detail});assert.ok(ok,`${label}: ${detail}`);}
function watch(page,label){
 page.on('pageerror',error=>errors.push({label,type:'pageerror',message:error.message}));
 page.on('console',message=>{if(message.type()==='error')errors.push({label,type:'console',url:message.location().url,message:message.text()});});
 page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)errors.push({label,type:'HTTP',url:response.url(),status:response.status()});});
 page.on('request',request=>{
  if(request.method()==='POST')requests.push({label,url:request.url(),body:request.postDataJSON()});
  if(/\/api\/(?:admin(?:\/|$)|(?:login|logout|mode)(?:$|[/?]))/.test(request.url()))errors.push({label,type:'forbidden staff request',url:request.url()});
 });
 page.on('requestfailed',request=>{
  const item={label,url:request.url(),message:request.failure()?.errorText||'Request failed'};
  if(item.message==='net::ERR_ABORTED'&&request.resourceType()==='image'){cancelledImages.push(item);return;}
  if(item.message==='net::ERR_ABORTED'&&request.resourceType()==='media'){mediaAborts.push(item);return;}
  errors.push({...item,type:'requestfailed'});
 });
}
async function state(page){const response=await page.request.get(game+'api/state');check(response.status()===200,'demo state reachable',String(response.status()));return response.json();}
async function mediaReady(page,label){
 await page.waitForFunction(()=>{const v=document.getElementById('paradeTrailer');return v.readyState>=1&&v.videoWidth>0&&Number.isFinite(v.duration)&&v.duration>0&&!v.error;},null,{timeout:25000});
 const metadata=await page.locator('#paradeTrailer').evaluate(v=>({url:v.currentSrc,poster:v.poster,width:v.videoWidth,height:v.videoHeight,duration:v.duration,error:v.error?.message||null}));
 check(metadata.url===game+'assets/video/heart-parade-promo.mp4'&&!metadata.error,`${label} trailer metadata ready`,JSON.stringify(metadata));
 const decoded=await page.evaluate(async url=>{const img=new Image();img.src=url;await img.decode();return {url:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight};},metadata.poster);
 check(decoded.url===game+'assets/video/grand-line-promo-poster.webp'&&decoded.width>0&&decoded.height>0,`${label} trailer poster decoded`,JSON.stringify(decoded));
 verifiedMedia.push({label,...metadata,decodedPoster:decoded});
}
async function choose(page,host,service){
 await page.locator(`.host-card[data-host="${host}"]`).click();await page.locator(service?'#pickMode':'#gachaMode').click();
 if(service)await page.locator(`.card-choice[data-service="${service}"]`).click();
 check(await page.locator('#prepDialog').count()===0,'no approval dialog');
}
async function draw(page,label,host,service=''){
 const beforeState=await state(page);check(beforeState.settings.mode==='demo'&&beforeState.pending===null,`${label} visitor demo ready`);
 await choose(page,host,service);
 const before=requests.filter(r=>r.label===label&&r.url===game+'api/play').length;
 const responsePromise=page.waitForResponse(r=>r.url()===game+'api/play'&&r.request().method()==='POST');
 const animationBefore=await page.evaluate(()=>window.__heartLiveAnimations.length);
 // Keep the actual event handlers and server intact while issuing repeated taps.
 await page.locator('#startButton').evaluate(button=>{for(let i=0;i<8;i++)button.click();});
 const response=await responsePromise;check(response.status()===200,`${label} direct draw HTTP 200`,String(response.status()));
 const result=await response.json(),submitted=response.request().postDataJSON();
 for(const [field,value] of [['comfort','no-touch'],['recording',false],['consent',false]])check(submitted[field]===value&&result[field]===value,`${label} real ${field} preserved`,JSON.stringify({submitted:submitted[field],result:result[field]}));
 check(!Object.hasOwn(submitted,'verified'),`${label} request has no official verification`);
 check(result.demo===true&&result.status==='demo'&&/^DEMO-/.test(result.id)&&result.queueNumber===null,`${label} isolated DEMO outcome`,JSON.stringify({id:result.id,demo:result.demo,status:result.status,queue:result.queueNumber}));
 check(result.host.id===host&&result.method===(service?'pick':'gacha')&&(!service||result.service.id===service),`${label} requested outcome retained`,result.card.id);
 await page.locator('#resultDialog[open]').waitFor({timeout:20000});
 await page.locator('#playShell[data-phase="result"]').waitFor({timeout:20000});
 check(await page.locator('html').getAttribute('data-motion')==='full',`${label} full animation enabled`);
 const animations=await page.evaluate(offset=>window.__heartLiveAnimations.slice(offset),animationBefore);
 check(animations.some(a=>a.id==='faceBack')&&animations.some(a=>a.id==='faceCard'),`${label} real reveal animations executed`,JSON.stringify(animations));
 if(!service)check(animations.some(a=>a.id==='boosterStage'),`${label} full booster animation executed`);
 await page.locator('#viewCard').click();
 await page.waitForFunction(()=>document.querySelector('#faceCard.on')&&!document.getAnimations().some(a=>!(a instanceof CSSAnimation)&&a.effect?.target?.id==='faceCard'&&a.playState==='running'));
 await page.locator('#resultHost').evaluate(img=>img.decode());
 const art=await page.locator('#faceCard .card-art img').evaluate(img=>{const r=img.getBoundingClientRect(),frame=img.parentElement.getBoundingClientRect();return {url:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight,fit:getComputedStyle(img).objectFit,inside:r.top>=frame.top-1&&r.bottom<=frame.bottom+1&&r.left>=frame.left-1&&r.right<=frame.right+1};});
 check(art.url===new URL(result.card.image,base).href&&art.width>0&&art.height>0&&art.fit==='contain'&&art.inside,`${label} selected art decoded and proportional`,JSON.stringify(art));
 check((await page.locator('#ticketLabel').textContent()).includes('DEMO'),`${label} visible DEMO ticket`);
 await page.screenshot({path:path.join(out,`${label}-${result.card.id}-card.png`)});
 await page.locator('#viewPoster').click();
 await page.waitForFunction(()=>document.querySelector('#facePoster.on')&&!document.getAnimations().some(a=>!(a instanceof CSSAnimation)&&a.effect?.target?.id==='facePoster'&&a.playState==='running'));
 await page.locator('#facePoster img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
 const poster=await page.locator('#facePoster .poster').evaluate(node=>{const photo=node.querySelector('.poster-photo'),img=photo.querySelector('img:not(.poster-bipy)'),mascot=photo.querySelector('.poster-bipy'),frame=photo.getBoundingClientRect(),r=img.getBoundingClientRect(),b=mascot.getBoundingClientRect();return {card:node.dataset.card,fit:getComputedStyle(img).objectFit,mascotFit:getComputedStyle(mascot).objectFit,artInside:r.top>=frame.top-1&&r.bottom<=frame.bottom+1,mascotInside:b.top>=frame.top-1&&b.bottom<=frame.bottom+1};});
 check(poster.card===result.card.id&&poster.fit==='contain'&&poster.mascotFit==='contain'&&poster.artInside&&poster.mascotInside,`${label} flipped bounty poster contains art and Bipy`,JSON.stringify(poster));
 await page.screenshot({path:path.join(out,`${label}-${result.card.id}-poster.png`)});
 const after=requests.filter(r=>r.label===label&&r.url===game+'api/play').length;
 check(after-before===1,`${label} eight taps issue one draw`,String(after-before));
 const pending=await state(page);check(pending.pending?.id===result.id,`${label} one pending server outcome`);
 results.push({label,...result,submitted,animations,art,poster});return result;
}
async function exportPoster(page,label,result){
 const downloadPromise=page.waitForEvent('download');await page.locator('#savePoster').click();const download=await downloadPromise;
 check(await download.failure()===null,`${label} actual PNG downloaded`);
 const filename=`Grand-Line-Desire-Poster-${result.host.name}-${result.service.id}.png`;
 check(download.suggestedFilename()===filename,`${label} release export filename`,download.suggestedFilename());
 const file=path.join(out,filename);await download.saveAs(file);const bytes=fs.readFileSync(file);
 check(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.readUInt32BE(16)===1080&&bytes.readUInt32BE(20)===1528,`${label} PNG signature and dimensions`,String(bytes.length));
 const decoded=await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();for(let y=0;y<20;y++)for(let x=0;x<20;x++){const i=(Math.floor((y+.5)*canvas.height/20)*canvas.width+Math.floor((x+.5)*canvas.width/20))*4;colors.add([...pixels.slice(i,i+4)].join(','));}return {width:img.naturalWidth,height:img.naturalHeight,colors:colors.size};},'data:image/png;base64,'+bytes.toString('base64'));
 check(decoded.width===1080&&decoded.height===1528&&decoded.colors>100,`${label} downloaded PNG decodes with detailed artwork`,JSON.stringify(decoded));
 downloads.push({label,file:path.relative(root,file),filename,bytes:bytes.length,...decoded});
}
async function finish(page,label,id){
 const acknowledged=page.waitForResponse(r=>r.url()===game+'api/result'&&r.request().method()==='POST');
 await page.locator('#finishButton').click();const response=await acknowledged;check(response.status()===200,`${label} outcome acknowledged`,String(response.status()));
 await page.locator('#resultDialog').waitFor({state:'hidden'});
 const current=await state(page);check(current.pending===null&&current.settings.mode==='demo',`${label} acknowledgement clears only demo pending`,id);
 check(await page.locator('#startButton').isEnabled(),`${label} replay ready`);
}
async function main(){
 fs.mkdirSync(out,{recursive:true});let browser,error=null;
 try{
  browser=await playwright.chromium.launch();
  const probe=await browser.newContext();try{const response=await probe.request.get(base+'/hub-api/catalog');check(response.status()===200,'live catalog reachable');const catalog=await response.json();check(catalog.version===version,`live version ${version}`,String(catalog.version));}finally{await probe.close();}
  for(const spec of [{label:'desktop-full',viewport:{width:1440,height:1000},host:'sanji',service:'hug',theme:'dark'},{label:'mobile-light',viewport:{width:390,height:844},host:'zoro',service:'vow',theme:'light',isMobile:true,hasTouch:true}]){
   const context=await browser.newContext({viewport:spec.viewport,isMobile:Boolean(spec.isMobile),hasTouch:Boolean(spec.hasTouch),reducedMotion:'no-preference',acceptDownloads:true});
   try{
    await context.route('**/*',route=>{const request=route.request();if(request.method()==='POST'&&!['api/play','api/result'].some(name=>request.url()===game+name)){errors.push({label:spec.label,type:'blocked mutation',url:request.url()});return route.abort('blockedbyclient');}return route.continue();});
    await context.addInitScript(()=>{const native=Element.prototype.animate;window.__heartLiveAnimations=[];Element.prototype.animate=function(frames,options){const animation=native.call(this,frames,options);if(this.closest('#playShell'))window.__heartLiveAnimations.push({id:this.id,duration:options.duration||0});return animation;};});
    const page=await context.newPage();watch(page,spec.label);await page.goto(game,{waitUntil:'domcontentloaded'});await page.locator('body[data-ready="1"]').waitFor({timeout:25000});await page.evaluate(()=>document.fonts.ready);
    await page.locator(`#${spec.theme}ThemeButton`).click();check(await page.locator('html').getAttribute('data-theme')===spec.theme,`${spec.label} requested theme`);
    check(!(await context.cookies(game)).some(cookie=>cookie.name==='heart_session'),`${spec.label} no staff cookie`);
    await mediaReady(page,spec.label);await page.screenshot({path:path.join(out,`${spec.label}-opening.png`)});
    const picked=await draw(page,spec.label,spec.host,spec.service);if(spec.label==='desktop-full')await exportPoster(page,spec.label,picked);await finish(page,spec.label,picked.id);
    const gacha=await draw(page,spec.label,spec.host);await finish(page,spec.label,gacha.id);
    const broken=await page.locator('img').evaluateAll(images=>images.filter(img=>{const b=img.getBoundingClientRect();return b.width>0&&b.height>0&&getComputedStyle(img).display!=='none'&&img.complete&&!img.naturalWidth;}).map(img=>img.src));check(!broken.length,`${spec.label} final visible images load`,JSON.stringify(broken));
   }finally{await context.close();}
  }
 }catch(failure){error=failure.stack||String(failure);process.exitCode=1;}
 finally{
  await browser?.close();
  for(const abort of mediaAborts){abort.verified=verifiedMedia.some(media=>media.label===abort.label&&media.url===abort.url);if(!abort.verified)errors.push({...abort,type:'unverified media abort'});}
  checks.push({ok:errors.length===0,label:'zero unexpected console, page, HTTP and network errors',detail:errors});
  if(errors.length)process.exitCode=1;
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),base,version,scope:'isolated visitor demo gameplay only',checks,results,requests,downloads,errors,cancelledImages,mediaAborts,verifiedMedia,error},null,2)+'\n');
 }
 console.log(`Live Heart gameplay: ${checks.filter(c=>c.ok).length}/${checks.length} checks; ${results.length} demo draws; ${out}`);
 if(error)console.error(error);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
