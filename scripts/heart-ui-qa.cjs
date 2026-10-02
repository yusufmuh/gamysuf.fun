'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.APPDATA,'npm','node_modules','playwright'));
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');
const root=path.join(__dirname,'..'),out=path.join(root,'artifacts','heart-ui');

function monitor(page,label,diagnostics){
 const expected=new Set();
 function record(type,url,message){diagnostics.push({page:label,type,url,message,expected:expected.has(url)&&type!=='pageerror'&&(type!=='console'||/Failed to load resource/i.test(message))});}
 page.on('pageerror',e=>record('pageerror',page.url(),e.message));
 page.on('console',m=>{if(m.type()==='error')record('console',m.location().url,m.text());});
 page.on('requestfailed',r=>record('requestfailed',r.url(),r.failure()?.errorText||'Request failed'));
 page.on('response',r=>{if(r.status()>=400)record('response',r.url(),String(r.status()));});
 return expected;
}
async function stateOf(page,origin){const r=await page.request.get(origin+'/g/heart/api/state');assert.equal(r.status(),200);return r.json();}
async function prepare(page,{host='zoro',service='',recording=false}={}){
 await page.locator(`.host-card[data-host="${host}"]`).click();await page.locator(service?'#pickMode':'#gachaMode').click();
 if(service){await page.locator(`.card-choice[data-service="${service}"]`).click();assert.equal(await page.locator(`.card-choice[data-service="${service}"]`).getAttribute('aria-pressed'),'true');}
 else assert.equal(await page.locator('#gachaMode').getAttribute('aria-pressed'),'true');
 if(!await page.locator('#prepDialog').isVisible())await page.locator('#startButton').click();
 await page.locator('#prepDialog[open]').waitFor();
 assert.equal(await page.locator('#pickService').inputValue(),service);assert.equal(await page.locator('#pickService').isVisible(),false);
 assert.ok(await page.locator('[name="comfort"][value="no-touch"]').isChecked());
 assert.equal(await page.locator('#recordingConsent').isChecked(),false);assert.equal(await page.locator('#consentCheck').isChecked(),false);
 if(recording)await page.locator('#recordingConsent').check();await page.locator('#consentCheck').check();
}
async function draw(page,origin,options){
 await prepare(page,options);const responsePromise=page.waitForResponse(r=>r.url()===origin+'/g/heart/api/play'&&r.request().method()==='POST');
 await page.locator('#drawButton').click();const response=await responsePromise;assert.equal(response.status(),200);const result=await response.json();
 await page.locator('#resultDialog[open]').waitFor({timeout:20000});
 assert.equal(result.host.id,options.host);assert.equal(result.method,options.service?'pick':'gacha');if(options.service)assert.equal(result.service.id,options.service);
 assert.equal(result.comfort,'no-touch');assert.equal(result.recording,Boolean(options.recording));assert.equal(result.card.id,`${result.host.id}-${result.service.id}`);
 const catalog=await stateOf(page,origin);assert.deepEqual(result.card,catalog.cards.find(card=>card.id===result.card.id));
 assert.equal(await page.locator('#resultHostName').textContent(),result.host.name);assert.equal(await page.locator('#resultTitle').textContent(),result.service.name);
 assert.equal(await page.locator('#resultRomanticLine').textContent(),result.card.romanticLine);assert.equal(await page.locator('#resultHost').getAttribute('src'),result.card.image);
 const face=page.locator('#faceCard .tcg');assert.equal(await face.getAttribute('data-card'),result.card.id);
 assert.equal(await page.locator('#resultCardNo').textContent(),result.card.cardNo);assert.equal(await page.locator('#resultRarity').textContent(),result.card.rarity);
 for(const [selector,value] of [['.tcg-cost b',result.card.cost],['.tcg-power b',result.card.power],['.tcg-counter b','+'+result.card.counter],['.tcg-attr small',result.card.attribute],['.tcg-type',result.card.crew]])assert.equal(await face.locator(selector).textContent(),String(value));
 assert.equal((await face.locator('.tcg-effect').textContent()).replace(/\s+/g,' ').trim(),result.card.effect.replace(/[\[\]]/g,'').replace('Saat dimainkan:','Saat dimainkan'));
 await page.locator('#resultHost').evaluate(image=>image.decode());return result;
}
async function finish(page){await page.locator('#finishButton').click();await page.locator('#resultDialog').waitFor({state:'hidden'});assert.equal(await page.locator('#recordingConsent').isChecked(),false);assert.equal(await page.locator('#consentCheck').isChecked(),false);}
async function trailerCheck(page){
 await page.locator('#paradeTrailer').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>{const v=document.getElementById('paradeTrailer');return v.readyState>=1&&v.videoWidth>0&&Number.isFinite(v.duration)&&v.duration>0;},null,{timeout:20000});
 const meta=await page.locator('#paradeTrailer').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted,loop:v.loop,inline:v.playsInline,paused:v.paused,error:v.error?.message||null}));
 assert.ok(meta.width>0&&meta.height>0&&meta.duration>0);assert.ok(meta.muted&&meta.loop&&meta.inline&&meta.paused);assert.equal(meta.error,null);
 assert.equal(await page.locator('html').getAttribute('data-motion'),'reduce');assert.equal(await page.locator('#videoPlayButton').isDisabled(),false);
 await page.locator('#videoPlayButton').click();await page.waitForFunction(()=>!document.getElementById('paradeTrailer').paused);
 await page.locator('#videoPlayButton').click();await page.waitForFunction(()=>document.getElementById('paradeTrailer').paused&&document.getElementById('videoPlayButton').getAttribute('aria-pressed')==='false');
 assert.equal(await page.locator('#videoPlayButton').getAttribute('aria-pressed'),'false');
 // A new explicit play clears the user pause before checking motion changes.
 await page.locator('#videoPlayButton').click();await page.waitForFunction(()=>!document.getElementById('paradeTrailer').paused);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.documentElement.dataset.motion==='full');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('paradeTrailer').paused);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.getElementById('paradeTrailer').paused);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('paradeTrailer').paused);return meta;
}
async function verifyDownload(page,result,kind){
 const size={width:1080,height:kind==='card'?1508:1528},card=result.card;
 if(kind==='poster'){
  await page.locator('#viewPoster').click();await page.locator('#facePoster.on').waitFor();assert.equal(await page.locator('#viewPoster').getAttribute('aria-pressed'),'true');
  const poster=page.locator('#facePoster .poster'),price=await page.evaluate(value=>window.HeartCards.money(value),card.price);
  assert.equal(await poster.getAttribute('data-card'),card.id);assert.equal(await poster.locator('.poster-photo>img').first().getAttribute('src'),card.image);
  assert.equal(await poster.locator('.poster-name').textContent(),card.bountyName);assert.equal(await poster.locator('.poster-price s').textContent(),price);
  assert.equal(await poster.locator('.poster-stamp b').textContent(),card.customerOffer.label);assert.equal(await poster.locator('.poster-stamp small').textContent(),card.customerOffer.description);assert.equal(card.customerOffer.amount,0);
 }
 // Observe real canvas operations without replacing the renderer or its output.
 await page.evaluate(()=>{
  const traces=new Map(),proto=CanvasRenderingContext2D.prototype,native={fillText:proto.fillText,drawImage:proto.drawImage,stroke:proto.stroke,toBlob:HTMLCanvasElement.prototype.toBlob};
  const trace=canvas=>{if(!traces.has(canvas))traces.set(canvas,{texts:[],images:[],strokes:[]});return traces.get(canvas);};
  const samples=canvas=>{const {data}=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),pixels=[];for(let y=0;y<20;y++)for(let x=0;x<20;x++){const i=(Math.floor((y+.5)*canvas.height/20)*canvas.width+Math.floor((x+.5)*canvas.width/20))*4;pixels.push(...data.slice(i,i+4));}return pixels;};
  proto.fillText=function(text,...args){trace(this.canvas).texts.push(String(text));return native.fillText.call(this,text,...args);};
  proto.drawImage=function(img,...args){trace(this.canvas).images.push({src:img.currentSrc||img.src||null,width:img.naturalWidth||img.width,height:img.naturalHeight||img.height,args,texts:traces.get(img)?.texts||[]});return native.drawImage.call(this,img,...args);};
  proto.stroke=function(...args){trace(this.canvas).strokes.push({color:this.strokeStyle,width:this.lineWidth});return native.stroke.apply(this,args);};
  HTMLCanvasElement.prototype.toBlob=function(...args){window.__heartExportAudit.output={width:this.width,height:this.height,...trace(this),pixels:samples(this)};return native.toBlob.apply(this,args);};
  window.__heartExportAudit={samples,restore(){proto.fillText=native.fillText;proto.drawImage=native.drawImage;proto.stroke=native.stroke;HTMLCanvasElement.prototype.toBlob=native.toBlob;}};
 });
 try{
  const promise=page.waitForEvent('download');await page.locator(kind==='card'?'#saveCard':'#savePoster').click();const d=await promise;assert.equal(await d.failure(),null);
  const filename=`Heart-Parade-${kind==='poster'?'Poster-':''}${result.host.name}-${result.service.id}.png`;assert.equal(d.suggestedFilename(),filename);
  const file=path.join(out,`${card.id}-${kind}.png`);await d.saveAs(file);const png=fs.readFileSync(file);
  assert.deepEqual(png.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));assert.equal(png.toString('ascii',12,16),'IHDR');assert.equal(png.readUInt32BE(16),size.width);assert.equal(png.readUInt32BE(20),size.height);
  const audit=await page.evaluate(()=>window.__heartExportAudit.output);assert.ok(audit,'UI download must invoke the real PNG canvas renderer');assert.deepEqual({width:audit.width,height:audit.height},size);
  await page.evaluate(()=>window.__heartExportAudit.restore());
  const decoded=await page.evaluate(async url=>{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);return {width:img.naturalWidth,height:img.naturalHeight,pixels:window.__heartExportAudit.samples(canvas)};},'data:image/png;base64,'+png.toString('base64'));
  assert.deepEqual({width:decoded.width,height:decoded.height},size);assert.deepEqual(decoded.pixels,audit.pixels,'downloaded PNG pixels must match the audited export canvas');
  const colors=new Set();for(let i=0;i<decoded.pixels.length;i+=4)colors.add(decoded.pixels.slice(i,i+4).join(','));assert.ok(colors.size>100,`${kind} export must contain detailed, nonblank artwork`);
  const drawn=url=>audit.images.find(img=>img.src===new URL(url,page.url()).href);
  const art=drawn(card.image);assert.ok(art,`${kind} must paint selected card artwork`);assert.ok(art.width>0&&art.height>0&&art.args[2]>0&&art.args[3]>0);
  const text=audit.texts.concat(audit.images.flatMap(img=>img.texts));
  if(kind==='card'){
   for(const value of [String(card.cost),'POWER',String(card.power),card.attribute,'COUNTER','+'+card.counter,`FANSERVICE · ${result.host.name.toUpperCase()}`,card.name.split(' · ')[0],card.crew,`${card.rarity} · ${card.cardNo}`])assert.ok(text.includes(value),`card export missing ${value}`);
   assert.ok(text.join(' ').includes(card.effect.replace(/[\[\]]/g,'').replace('Saat dimainkan:','Saat dimainkan')),'card export must include complete effect text');
   assert.ok(drawn('/g/heart/assets/brand/bpedia-white.webp'),'card export must include Bpedia brand');
  }else{
   const price=await page.evaluate(value=>window.HeartCards.money(value),card.price);
   for(const value of ['WANTED','DICARI PARA PENGGEMAR',card.bountyName,card.priceLabel.toUpperCase(),price,card.customerOffer.label,card.customerOffer.description,`${card.name.split(' · ')[0]} · ${result.host.name} · ${card.cardNo}`])assert.ok(text.includes(value),`poster export missing ${value}`);
   assert.ok(drawn(card.mascot),'poster export must include selected Bipy');assert.ok(drawn('/g/heart/assets/brand/bpedia-pink.webp'),'poster export must include Bpedia brand');
   assert.ok(audit.strokes.some(s=>s.width===15&&/^rgba\(200, 16, 46,/.test(s.color)),'poster normal price must have its thick red strike');assert.ok(audit.strokes.some(s=>s.width===6&&/^rgba\(200, 16, 46,/.test(s.color)),'poster normal price must have its second red strike');
  }
  return {kind,cardId:card.id,filename,file,bytes:png.length,...size,distinctSampleColors:colors.size,texts:text,images:audit.images,strokes:audit.strokes};
 }finally{await page.evaluate(()=>{window.__heartExportAudit.restore();delete window.__heartExportAudit;});}
}
async function main(){
 fs.mkdirSync(out,{recursive:true});const dir=fs.mkdtempSync(path.join(os.tmpdir(),'heart-ui-'));let hub,browser;
 const checks=[],diagnostics=[];let artwork=[],media,download=[];
 try{
  hub=await createHub({dataDir:dir,adminPin:'246810',local:true});browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
  const page=await context.newPage(),expected=monitor(page,'desktop',diagnostics);expected.add(hub.origin+'/g/heart/assets/video/heart-parade-promo.mp4');
  await page.goto(hub.origin+'/g/heart/');await page.locator('body[data-ready="1"]').waitFor();
  const desktopLayout=await page.evaluate(()=>{const root=document.documentElement,hero=document.querySelector('.hero'),deck=document.querySelector('.deck-body');return {width:innerWidth,scrollWidth:root.scrollWidth,scrollHeight:root.scrollHeight,heroWidth:hero?.getBoundingClientRect().width||0,deckWidth:deck?.getBoundingClientRect().width||0};});
  assert.ok(desktopLayout.scrollWidth<=desktopLayout.width+2);assert.ok(desktopLayout.scrollHeight<10000);assert.ok(desktopLayout.heroWidth>900&&desktopLayout.deckWidth>900);checks.push('desktop TCG table is styled, bounded, and free of horizontal overflow');
  const state=await stateOf(page,hub.origin);assert.equal(state.cards.length,14);assert.equal(new Set(state.cards.map(c=>c.image)).size,14);
  for(const host of ['zoro','sanji']){
   await page.locator(`.host-card[data-host="${host}"]`).click();assert.equal(await page.locator('.card-choice[data-service]').count(),7);
   const images=await page.locator('#momentGrid .card-art>img').evaluateAll(images=>Promise.all(images.map(async img=>{img.loading='eager';await img.decode();return {url:img.src,width:img.naturalWidth,height:img.naturalHeight};})));
   assert.deepEqual(images.map(img=>img.url).sort(),state.cards.filter(c=>c.hostId===host).map(c=>new URL(c.image,hub.origin).href).sort());assert.ok(images.every(img=>img.width>0&&img.height>0));artwork.push(...images);
  }
  assert.equal(new Set(artwork.map(img=>img.url)).size,14);checks.push('14 unique server card images rendered and decoded across both hosts');
  media=await trailerCheck(page);checks.push('trailer metadata, explicit playback, and reduced-motion pause/autoplay behavior');
  await page.locator('.host-card[data-host="zoro"]').click();await page.locator('#startButton').scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
  await page.locator('.host-art').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));await page.screenshot({path:path.join(out,'heart-desktop.png'),fullPage:true});
  const first=await draw(page,hub.origin,{host:'zoro',service:'vow',recording:true});checks.push('Zoro explicit selection and recording opt-in');
  for(const kind of ['card','poster'])download.push(await verifyDownload(page,first,kind));checks.push('Zoro card 1080x1508 and poster 1080x1528 decode with selected art, BP06 metadata, stats/effect, offer, Bipy and brand');
  const ticket=first.id;await page.reload();await page.locator('#resultDialog[open]').waitFor();assert.equal(await page.locator('#ticketCode').textContent(),ticket);checks.push('pending ticket recovers after reload');
  const resultUrl=hub.origin+'/g/heart/api/result';expected.add(resultUrl);
  await page.route('**/g/heart/api/result',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'QA connection failure'})}));
  await page.locator('#finishButton').click();await page.locator('#resultError:visible').waitFor();assert.ok(await page.locator('#resultDialog').isVisible());checks.push('failed acknowledgement retains ticket');
  await page.unroute('**/g/heart/api/result');await finish(page);expected.delete(resultUrl);
  for(const host of ['zoro','sanji']){const result=await draw(page,hub.origin,{host});assert.ok(state.cards.some(c=>c.id===result.card.id));await finish(page);checks.push(`${host} gacha retains host, returns catalog card, resets consent`);}
  const playUrl=hub.origin+'/g/heart/api/play';expected.add(playUrl);let lostResult;
  await page.route('**/g/heart/api/play',async r=>{const response=await r.fetch();lostResult=await response.json();await r.abort('failed');});
  await prepare(page,{host:'zoro'});await page.locator('#drawButton').click();await page.locator('#resultDialog[open]').waitFor();assert.ok(lostResult);assert.equal(await page.locator('#ticketCode').textContent(),lostResult.id);assert.notEqual(lostResult.id,ticket);
  checks.push('lost draw response recovers the same existing result');await page.unroute('**/g/heart/api/play');await finish(page);expected.delete(playUrl);
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce',acceptDownloads:true}),phone=await mobile.newPage();monitor(phone,'phone',diagnostics);
  await phone.goto(hub.origin+'/g/heart/');await phone.locator('body[data-ready="1"]').waitFor();await phone.screenshot({path:path.join(out,'heart-phone.png'),fullPage:true});
  const phoneLayout=await phone.evaluate(()=>{const root=document.documentElement,leaders=document.querySelectorAll('.leader-slot'),cards=document.querySelectorAll('.deck-card'),start=document.getElementById('startButton')?.getBoundingClientRect();return {width:innerWidth,scrollWidth:root.scrollWidth,scrollHeight:root.scrollHeight,leaders:leaders.length,cards:cards.length,start:{width:start?.width||0,height:start?.height||0}};});
  assert.ok(phoneLayout.scrollWidth<=phoneLayout.width+2);assert.ok(phoneLayout.scrollHeight<8000);assert.equal(phoneLayout.leaders,2);assert.equal(phoneLayout.cards,7);assert.ok(phoneLayout.start.width>=44&&phoneLayout.start.height>=44);checks.push('phone TCG table stays compact with two leaders, seven cards, and a usable primary action');
  const sanji=await draw(phone,hub.origin,{host:'sanji',service:'twirl'});assert.equal(await phone.locator('#resultDialog').evaluate(d=>d.scrollTop),0);await phone.screenshot({path:path.join(out,'heart-phone-result.png')});checks.push('Sanji explicit selection and mobile result opens at scrollTop 0');
  const resultLayout=await phone.evaluate(()=>{const dialog=document.getElementById('resultDialog').getBoundingClientRect(),stage=document.getElementById('playStage').getBoundingClientRect(),card=document.querySelector('#faceCard .tcg').getBoundingClientRect();return {dialog:{left:dialog.left,right:dialog.right,top:dialog.top,bottom:dialog.bottom},stage:{width:stage.width,height:stage.height},card:{width:card.width,height:card.height}};});
  assert.ok(resultLayout.dialog.left>=0&&resultLayout.dialog.right<=390);assert.ok(resultLayout.stage.width>=340&&resultLayout.stage.height>=300);assert.ok(resultLayout.card.width>=170&&resultLayout.card.height>=235);checks.push('mobile result dialog renders a full trading card in a bounded animated stage');
  for(const kind of ['card','poster'])download.push(await verifyDownload(phone,sanji,kind));checks.push('Sanji mobile card/poster downloads retain selected art, stats/effect, BP06 metadata, offer, Bipy and brand');
  await phone.locator('#resultDialog').evaluate(d=>{d.scrollTop=d.scrollHeight;});await finish(phone);
  await prepare(phone,{host:'sanji',service:'hug',recording:true});await phone.locator('[name="comfort"][value="touch"]').check();await phone.locator('[data-close="prepDialog"]').click();await phone.locator('#startButton').click();
  assert.ok(await phone.locator('[name="comfort"][value="no-touch"]').isChecked());assert.equal(await phone.locator('#recordingConsent').isChecked(),false);assert.equal(await phone.locator('#consentCheck').isChecked(),false);
  await phone.locator('#consentCheck').check();await phone.locator('#drawButton').click();await phone.locator('#resultDialog[open]').waitFor();assert.equal(await phone.locator('#resultDialog').evaluate(d=>d.scrollTop),0);await finish(phone);checks.push('cancelled prep resets touch/recording/consent and replay resets mobile scroll');await mobile.close();
  expected.add(hub.origin+'/g/heart/assets/video/heart-parade-promo.mp4');expected.add(hub.origin+'/g/heart/api/admin/state');
  await page.goto(hub.origin+'/g/heart/admin.html');await page.screenshot({path:path.join(out,'admin-login.png')});await page.locator('#pin').fill('246810');await page.locator('#loginForm button').click();await page.locator('#adminContent:visible').waitFor();
  await page.locator('#mode').selectOption('live');await page.locator('#duration').fill('1500');await page.locator('#settingsForm button').click();await page.locator('#adminNotice:visible').waitFor();checks.push('staff session and reveal settings saved');
  const booth=await context.newPage(),boothExpected=monitor(booth,'booth',diagnostics);boothExpected.add(hub.origin+'/g/heart/assets/video/heart-parade-promo.mp4');await booth.goto(hub.origin+'/g/heart/');await booth.locator('body[data-ready="1"]').waitFor();await prepare(booth,{host:'sanji'});await booth.locator('#verifiedCheck').check();await booth.locator('#drawButton').click();await booth.locator('#resultDialog[open]').waitFor();assert.match(await booth.locator('#ticketCode').textContent(),/^HP-/);await finish(booth);
  await page.locator('#refreshQueue').click();await page.locator('#queueList [data-action="served"]').waitFor();await page.screenshot({path:path.join(out,'admin-phone-ticket.png'),fullPage:true});await page.locator('#queueList [data-action="served"]').click();await page.locator('#historyList .queue-ticket').waitFor({state:'attached'});assert.equal(await page.locator('#queueList [data-action="served"]').count(),0);checks.push('official booth ticket created and served through UI');await booth.close();
  assert.deepEqual(diagnostics.filter(e=>!e.expected),[]);checks.push('no unexpected console, page, HTTP or request failures');
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,artwork,media,download,diagnostics,errors:[]},null,2));console.log(`Heart UI: ${checks.length} checks passed; screenshots and card in ${out}`);
 }catch(e){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,artwork,media,download,diagnostics,error:e.stack||e.message},null,2));throw e;}
 finally{if(browser)await browser.close();if(hub)await hub.close();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
