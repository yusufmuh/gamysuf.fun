'use strict';

const {app,BrowserWindow}=require('electron');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
process.env.GAMYSUF_AUTOSTART='0';
const {createHub}=require('../hub/server.cjs');

const root=path.join(__dirname,'..');
const candidates=path.join(root,'artifacts','cover-candidates');
const covers=path.join(root,'hub','public','assets','covers');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-cover-ui-')));

app.whenReady().then(async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-cover-data-'));
 let hub;
 try{
  hub=await createHub({dataDir,adminPin:'246810',local:true});
  const browser=new BrowserWindow({width:1600,height:900,useContentSize:true,show:false,backgroundColor:'#14060d',webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true}});
  browser.showInactive();
  const errors=[];
  browser.webContents.on('console-message',(event,...legacy)=>{
   const level=event.level??legacy[0],message=event.message??legacy[1];
   if(level==='error'||level===3)errors.push(message);
  });
  const js=source=>browser.webContents.executeJavaScript(source);
  const until=async(condition,timeout=15000)=>{
   const end=Date.now()+timeout;
   while(Date.now()<end){if(await js(`Boolean(${condition})`).catch(()=>false))return;await wait(150);}
   throw new Error(`Tampilan belum siap: ${condition}`);
  };
  const routes={
   spin:{ready:`document.getElementById('spin-button')&&!document.getElementById('spin-button').disabled`,open:`document.getElementById('spin-button').click()`,shown:`document.getElementById('stage-dialog')?.open&&document.querySelectorAll('#wheel-items .wheel-item').length>=12&&[...document.querySelectorAll('#wheel-items img')].every(image=>image.complete&&image.naturalWidth>0)`},
   nyapit:{ready:`document.getElementById('startFestival')&&!document.getElementById('startFestival').disabled`,open:`document.getElementById('startFestival').click()`,shown:`document.body.dataset.stage==='aim'`},
   drop:{ready:`document.body.classList.contains('ready')`,open:`document.getElementById('startDrop').click()`,shown:`document.body.dataset.stage==='drop'&&document.getElementById('boardCanvas')?.width>0`}
  };
  fs.mkdirSync(candidates,{recursive:true});
  const report=[];
  for(const [slug,route] of Object.entries(routes)){
   const errorStart=errors.length;
   await browser.loadURL(`${hub.origin}/g/${slug}/`);
   await until(route.ready);
   await js(route.open);
   await until(route.shown,20000);
   if(slug==='drop'){
    await until(`!document.getElementById('dropButton').disabled`);
    await js(`document.getElementById('dropButton').click()`);
    await wait(1850);
   }else await wait(1200);
   const image=(await browser.webContents.capturePage()).resize({width:1200,height:675,quality:'best'});
   const jpeg=image.toJPEG(89);
   if(errors.length>errorStart)throw new Error(`${slug}: ${errors.slice(errorStart).join('; ')}`);
   fs.writeFileSync(path.join(candidates,`${slug}.jpg`),jpeg);
   report.push({slug,bytes:jpeg.length,sha256:crypto.createHash('sha256').update(jpeg).digest('hex')});
  }
  fs.writeFileSync(path.join(candidates,'capture.json'),JSON.stringify({capturedAt:new Date().toISOString(),report,errors},null,2));
  if(process.env.CAPTURE_COVERS_PUBLISH==='1'){
   fs.mkdirSync(covers,{recursive:true});
   for(const {slug} of report)fs.copyFileSync(path.join(candidates,`${slug}.jpg`),path.join(covers,`${slug}.jpg`));
  }
  console.log(`Tiga sampul gameplay 1200×675 tersimpan di ${process.env.CAPTURE_COVERS_PUBLISH==='1'?'hub/public/assets/covers':'artifacts/cover-candidates'}.`);
 }catch(error){console.error(error);process.exitCode=1;}
 finally{
  await hub?.close().catch(()=>{});
  fs.rmSync(dataDir,{recursive:true,force:true});
  app.exit(process.exitCode||0);
 }
});
