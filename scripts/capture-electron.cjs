'use strict';

/* Dijalankan oleh Electron (lihat scripts/capture.cjs).
   covers : menangkap layar beranda tiap game lewat gateway → sampul kartu hub.
   qa     : tur visual hub + game, tangkapan disimpan di artifacts/qa/<lebar>x<tinggi>. */
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createHub}=require('../hub/server.cjs');

const mode=process.env.CAPTURE_MODE||'covers';
const width=Number(process.env.CAPTURE_WIDTH)||1600;
const height=Number(process.env.CAPTURE_HEIGHT)||900;
const root=path.join(__dirname,'..');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-capture-ui-')));

app.whenReady().then(async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-capture-'));
 const hub=await createHub({dataDir,adminPin:'246810',local:true});
 const base=hub.origin.replace('127.0.0.1','localhost');
 const win=new BrowserWindow({width,height,useContentSize:true,show:false,backgroundColor:'#14060d',webPreferences:{backgroundThrottling:false,sandbox:true,contextIsolation:true}});
 win.showInactive();
 const errors=[];
 win.webContents.on('console-message',(event,...legacy)=>{const level=event.level??legacy[0],message=event.message??legacy[1];if(level==='error'||level===3)errors.push(message);});
 const js=code=>win.webContents.executeJavaScript(code);
 const until=async(condition,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await js(`Boolean(${condition})`).catch(()=>false))return true;await wait(150);}return false;};
 async function shot(file){
  for(let attempt=1;;attempt++){
   try{return await win.webContents.capturePage();}
   catch(error){if(attempt>=4)throw error;await wait(400*attempt);}
  }
 }
 try{
  if(mode==='covers'){
   const out=path.join(root,'hub','public','assets','covers');
   fs.mkdirSync(out,{recursive:true});
   for(const slug of ['spin','nyapit','drop']){
    await win.loadURL(`${base}/g/${slug}/`);
    await wait(9000);
    const image=(await shot()).resize({width:1200,quality:'best'});
    fs.writeFileSync(path.join(out,`${slug}.jpg`),image.toJPEG(84));
    console.log(`sampul ${slug} tersimpan`);
   }
  }else{
   const out=path.join(root,'artifacts','qa',`${width}x${height}`);
   fs.rmSync(out,{recursive:true,force:true});
   fs.mkdirSync(out,{recursive:true});
   const save=async name=>{fs.writeFileSync(path.join(out,name),(await shot()).toPNG());};
   await win.loadURL(`${base}/`);
   await until(`document.body.dataset.ready==='1'`);
   await wait(1200);
   await save('01-onboarding.png');
   await js(`document.querySelector('[data-avatar="wink"]')?.click();document.getElementById('nicknameInput').value='Rina Kolektor';document.getElementById('onboardSave').click()`);
   await wait(1500);
   await save('02-home-hero.png');
   for(const [index,section] of ['daily','games','album','ranking','guide'].entries()){
    await js(`document.getElementById('${section}')?.scrollIntoView({block:'start'})`);
    await wait(900);
    await save(`03-${index+1}-${section}.png`);
   }
   await js(`window.scrollTo(0,0);document.querySelector('[data-howto="drop"]')?.click()`);
   await wait(900);
   await save('04-howto-drop.png');
   await js(`document.querySelector('.modal.open [data-close]')?.click()`);
   await wait(400);
   for(const slug of ['spin','nyapit','drop']){
    await win.loadURL(`${base}/g/${slug}/`);
    await wait(6000);
    await save(`05-game-${slug}.png`);
   }
   await win.loadURL(`${base}/g/drop/`);
   await until(`document.body.classList.contains('ready')`);
   await js(`document.getElementById('startDrop').click()`);
   await wait(900);
   await js(`document.getElementById('dropButton').click()`);
   await until(`document.getElementById('revealLayer').classList.contains('open')`,25000);
   await wait(7500);
   await save('06-drop-reveal-with-xp-toast.png');
   await win.loadURL(`${base}/`);
   await until(`document.body.dataset.ready==='1'`);
   await wait(2500);
   await save('07-home-after-play.png');
   await js(`document.getElementById('openAlbum')?.click()`);
   await wait(1200);
   await save('08-album.png');
   await win.loadURL(`${base}/studio`);
   await wait(800);
   await save('09-studio-login.png');
   await js(`document.getElementById('pin').value='246810';document.getElementById('loginButton').click()`);
   await until(`!document.getElementById('studioApp').hidden`);
   await wait(1000);
   await save('10-studio.png');
   fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({errors},null,2));
   console.log(`QA ${width}x${height}: ${fs.readdirSync(out).length-1} tangkapan, ${errors.length} error konsol`);
   if(errors.length)console.log(errors.join('\n'));
  }
 }catch(error){
  console.error(error);
  process.exitCode=1;
 }finally{
  await hub.close().catch(()=>{});
  fs.rmSync(dataDir,{recursive:true,force:true});
  app.exit(process.exitCode||0);
 }
});
