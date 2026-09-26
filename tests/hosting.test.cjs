'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const net=require('node:net');
const {spawn}=require('node:child_process');

const ROOT=path.join(__dirname,'..');
const HUB=path.join(ROOT,'hub','server.cjs');

function freePort(){
 return new Promise((resolve,reject)=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const {port}=server.address();server.close(()=>resolve(port));});server.on('error',reject);});
}

function get(port,route){
 return new Promise((resolve,reject)=>{
  http.get({host:'127.0.0.1',port,path:route,headers:{host:'gamysuf.fun'}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString('utf8')}));}).on('error',reject);
 });
}

function run(t,script,env){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-host-'));
 const file=path.join(dir,'loader.cjs');
 fs.writeFileSync(file,script);
 const child=spawn(process.execPath,[file],{env:{...process.env,NODE_ENV:'production',GAMYSUF_DATA_DIR:path.join(dir,'data'),...env},stdio:['ignore','pipe','pipe']});
 let output='';
 child.stdout.on('data',chunk=>output+=chunk);
 child.stderr.on('data',chunk=>output+=chunk);
 t.after(()=>{child.kill();fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
 return {child,output:()=>output};
}

async function waitFor(check,timeout=20000){
 const end=Date.now()+timeout;
 while(Date.now()<end){if(check())return true;await new Promise(resolve=>setTimeout(resolve,100));}
 return false;
}

test('loader hosting di luar proyek yang membajak listen tetap menyajikan hub dan tiga game',async t=>{
 const port=await freePort();
 /* Meniru loader LiteSpeed/Passenger: setiap http.Server.listen diarahkan ke
    satu soket milik loader. Hanya server pertama yang boleh memakainya. */
 const loader=`
const http=require('node:http');
const original=http.Server.prototype.listen;
let taken=false;
http.Server.prototype.listen=function(...args){
 if(taken)throw new Error('Loader: listen kedua ditolak');
 taken=true;
 const callback=args.find(arg=>typeof arg==='function');
 return original.call(this,${port},'127.0.0.1',callback);
};
require(${JSON.stringify(HUB)});
`;
 const proc=run(t,loader,{ADMIN_PIN:'246810',PORT:''});
 assert.ok(await waitFor(()=>/siap di/.test(proc.output())),`hub tidak menyala: ${proc.output()}`);
 assert.doesNotMatch(proc.output(),/ditolak|Error/);
 const home=await get(port,'/');
 assert.equal(home.status,200);
 assert.match(home.text,/Gamysuf Arcade/);
 for(const slug of ['spin','nyapit','drop']){
  const page=await get(port,`/g/${slug}/`);
  assert.equal(page.status,200,slug);
  const state=await get(port,`/g/${slug}/api/state`);
  assert.equal(state.status,200,`${slug} api`);
 }
});

test('di-require oleh skrip di dalam proyek tidak menyalakan server otomatis',async t=>{
 const port=await freePort();
 const dir=path.join(ROOT,'artifacts');
 fs.mkdirSync(dir,{recursive:true});
 const file=path.join(dir,`require-probe-${process.pid}.cjs`);
 fs.writeFileSync(file,`const {createHub}=require(${JSON.stringify(HUB)});console.log(typeof createHub);setTimeout(()=>process.exit(0),1500);`);
 t.after(()=>fs.rmSync(file,{force:true}));
 const child=spawn(process.execPath,[file],{env:{...process.env,NODE_ENV:'production',PORT:String(port),GAMYSUF_DATA_DIR:path.join(os.tmpdir(),`gamysuf-probe-${process.pid}`)},stdio:['ignore','pipe','pipe']});
 let output='';
 child.stdout.on('data',chunk=>output+=chunk);
 const code=await new Promise(resolve=>child.on('exit',resolve));
 assert.equal(code,0);
 assert.match(output,/function/);
 assert.doesNotMatch(output,/siap di/);
 await assert.rejects(()=>get(port,'/'),'port harus tetap kosong');
});

test('pembungkus hosting di akar proyek (bukan folder alat) tetap menyalakan server',async t=>{
 const port=await freePort();
 const file=path.join(ROOT,`.hosting-wrapper-${process.pid}.cjs`);
 fs.writeFileSync(file,`require('./hub/server.cjs');`);
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'gamysuf-wrap-'));
 const child=spawn(process.execPath,[file],{env:{...process.env,NODE_ENV:'production',PORT:String(port),ADMIN_PIN:'246810',GAMYSUF_DATA_DIR:data},stdio:['ignore','pipe','pipe']});
 let output='';
 child.stdout.on('data',chunk=>output+=chunk);
 child.stderr.on('data',chunk=>output+=chunk);
 t.after(()=>{child.kill();fs.rmSync(file,{force:true});fs.rmSync(data,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
 assert.ok(await waitFor(()=>/siap di/.test(output)),`server tidak menyala: ${output}`);
 assert.equal((await get(port,'/g/drop/api/state')).status,200);
});
