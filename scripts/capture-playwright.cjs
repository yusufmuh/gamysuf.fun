'use strict';

/* Versi Playwright/Chromium dari capture-electron.cjs untuk Linux, cloud, dan
   CI (tanpa Electron). Dijalankan oleh scripts/capture.cjs bila Electron tidak
   ditemukan. Mode dan ukuran sama: covers | qa, CAPTURE_WIDTH × CAPTURE_HEIGHT.
   QA juga memeriksa scroll horizontal (tata letak meluber) di beranda. */
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execSync}=require('node:child_process');
const {createHub}=require('../hub/server.cjs');

function loadPlaywright(){
 try{return require('playwright');}catch{}
 try{return require(path.join(execSync('npm root -g',{encoding:'utf8'}).trim(),'playwright'));}catch{}
 return null;
}

async function run(){
 const playwright=loadPlaywright();
 if(!playwright)throw new Error('Playwright tidak ditemukan. Pasang dengan: npm i -g playwright (lalu npx playwright install chromium).');
 const mode=process.env.CAPTURE_MODE||'qa';
 const width=Number(process.env.CAPTURE_WIDTH)||1600;
 const height=Number(process.env.CAPTURE_HEIGHT)||900;
 const root=path.join(__dirname,'..');
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-capture-'));
 const hub=await createHub({dataDir,adminPin:'246810',local:true});
 const base=hub.origin.replace('127.0.0.1','localhost');
 const browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--autoplay-policy=no-user-gesture-required']});
 const errors=[];
 const layout=[];
 try{
  if(mode==='covers'){
   const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:.75});
   const out=path.join(root,'hub','public','assets','covers');
   fs.mkdirSync(out,{recursive:true});
   for(const slug of ['spin','nyapit','drop']){
    await page.goto(`${base}/g/${slug}/`);
    await wait(9000);
    await page.screenshot({path:path.join(out,`${slug}.jpg`),type:'jpeg',quality:84});
    console.log(`sampul ${slug} tersimpan`);
   }
   return;
  }
  const page=await browser.newPage({viewport:{width,height}});
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('pageerror',error=>errors.push(String(error)));
  const out=path.join(root,'artifacts','qa',`${width}x${height}`);
  fs.rmSync(out,{recursive:true,force:true});
  fs.mkdirSync(out,{recursive:true});
  const save=name=>page.screenshot({path:path.join(out,name)});
  const js=code=>page.evaluate(code);
  /* Polling lewat evaluate (CDP), bukan waitForFunction: predikat string
     waitForFunction dievaluasi dengan eval di halaman dan ditolak CSP hub. */
  const until=async(condition,timeout=15000)=>{
   const end=Date.now()+timeout;
   while(Date.now()<end){
    if(await js(`Boolean(${condition})`).catch(()=>false))return true;
    await wait(150);
   }
   return false;
  };
  const overflow=async label=>{
   const extra=await js(`document.documentElement.scrollWidth-window.innerWidth`);
   if(extra>1)layout.push(`${label}: halaman melebar ${extra}px ke samping`);
  };
  await page.goto(`${base}/`);
  await until(`document.body.dataset.ready==='1'`);
  await wait(1200);
  await save('01-onboarding.png');
  await js(`document.querySelector('[data-avatar="wink"]')?.click();document.getElementById('nicknameInput').value='Rina Kolektor';document.getElementById('onboardSave').click()`);
  await wait(1500);
  await save('02-home-hero.png');
  await overflow('beranda');
  for(const [index,section] of ['daily','games','album','ranking','guide'].entries()){
   await js(`document.getElementById('${section}')?.scrollIntoView({block:'start',behavior:'instant'})`);
   await wait(900);
   await save(`03-${index+1}-${section}.png`);
  }
  await js(`window.scrollTo(0,0);document.querySelector('[data-howto="drop"]')?.click()`);
  await wait(900);
  await save('04-howto-drop.png');
  await js(`document.querySelector('.modal.open [data-close]')?.click()`);
  await wait(400);
  for(const slug of ['spin','nyapit','drop']){
   await page.goto(`${base}/g/${slug}/`);
   await wait(6000);
   await save(`05-game-${slug}.png`);
  }
  await page.goto(`${base}/g/drop/`);
  await until(`document.body.classList.contains('ready')`);
  await js(`document.getElementById('startDrop').click()`);
  await wait(900);
  await js(`document.getElementById('dropButton').click()`);
  await until(`document.getElementById('revealLayer').classList.contains('open')`,25000);
  await wait(7500);
  await save('06-drop-reveal-with-xp-toast.png');
  await page.goto(`${base}/`);
  await until(`document.body.dataset.ready==='1'`);
  await wait(2500);
  await save('07-home-after-play.png');
  await overflow('beranda setelah main');
  await js(`document.getElementById('openAlbum')?.click()`);
  await wait(1200);
  await save('08-album.png');
  await page.goto(`${base}/studio`);
  await wait(800);
  await save('09-studio-login.png');
  await js(`document.getElementById('pin').value='246810';document.getElementById('loginButton').click()`);
  await until(`!document.getElementById('studioApp').hidden`);
  await wait(1000);
  await save('10-studio.png');
  fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({errors,layout},null,2));
  console.log(`QA ${width}x${height} (Chromium): ${fs.readdirSync(out).length-1} tangkapan, ${errors.length} error konsol, ${layout.length} masalah tata letak`);
  if(errors.length)console.log(errors.join('\n'));
  if(layout.length){console.log(layout.join('\n'));process.exitCode=1;}
 }finally{
  await browser.close().catch(()=>{});
  await hub.close().catch(()=>{});
  fs.rmSync(dataDir,{recursive:true,force:true});
 }
}

run().catch(error=>{console.error(error);process.exitCode=1;});
