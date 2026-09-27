'use strict';

/* Menjalankan handler HTTP game bawaan di dalam proses hub, tanpa soket.
   Runner Node.js Hostinger hanya meneruskan trafik ke satu server (hub), jadi
   gateway memanggil handler game langsung dengan req/res tiruan.

   onHead(head) dipanggil sekali ketika game menetapkan status & header:
   - kembalikan Writable (res asli) → body diteruskan apa adanya (streaming,
     untuk gambar/audio/font, hemat memori);
   - kembalikan null → body ditampung lalu dikembalikan di hasil promise,
     supaya gateway bisa menulis ulang HTML/CSS/JS/JSON. */
const {Readable,Writable}=require('node:stream');

const httpError=(message,status)=>Object.assign(new Error(message),{status});

function dispatch(handler,{method='GET',url='/',headers={},body=null,timeoutMs=30000,onHead=()=>null}={}){
 return new Promise((resolve,reject)=>{
  let settled=false,head=null,target=null,timer=null;
  const chunks=[];
  const done=(error,value)=>{
   if(settled)return;
   settled=true;
   clearTimeout(timer);
   error?reject(error):resolve(value);
  };

  const req=new Readable({read(){if(body?.length)this.push(body);this.push(null);}});
  const socket={remoteAddress:'127.0.0.1',remotePort:0,encrypted:false,destroy(){},setTimeout(){},setNoDelay(){},setKeepAlive(){}};
  Object.assign(req,{method,url,headers,httpVersion:'1.1',httpVersionMajor:1,httpVersionMinor:1,socket,connection:socket,complete:true,aborted:false});

  const names=new Map();
  const values=new Map();
  const res=new Writable({
   write(chunk,_encoding,callback){
    sendHead();
    if(!target){chunks.push(chunk);return callback();}
    if(target.destroyed||target.writableEnded)return callback();
    if(target.write(chunk))return callback();
    const resume=()=>{target.off('drain',resume);target.off('close',resume);callback();};
    target.on('drain',resume);
    target.on('close',resume);
   },
   final(callback){
    sendHead();
    if(target){
     if(!target.writableEnded&&!target.destroyed)target.end();
     done(null,{statusCode:head.statusCode,headers:head.headers,body:null,streamed:true});
    }else done(null,{statusCode:head.statusCode,headers:head.headers,body:Buffer.concat(chunks),streamed:false});
    callback();
   }
  });
  Object.assign(res,{statusCode:200,statusMessage:'',headersSent:false,req,socket,connection:socket});
  res.setHeader=(name,value)=>{
   if(res.headersSent)throw httpError('Header sudah terkirim.',500);
   const key=String(name).toLowerCase();
   names.set(key,name);
   values.set(key,key==='set-cookie'?[].concat(value):value);
   return res;
  };
  res.appendHeader=(name,value)=>{
   const key=String(name).toLowerCase();
   const current=values.get(key);
   return res.setHeader(name,current===undefined?value:[].concat(current,value));
  };
  res.getHeader=name=>values.get(String(name).toLowerCase());
  res.hasHeader=name=>values.has(String(name).toLowerCase());
  res.getHeaderNames=()=>[...values.keys()];
  res.getHeaders=()=>Object.fromEntries(values);
  res.removeHeader=name=>{const key=String(name).toLowerCase();names.delete(key);values.delete(key);};
  res.writeHead=(status,reason,extra)=>{
   if(typeof reason!=='string')extra=reason;
   else res.statusMessage=reason;
   res.statusCode=status;
   if(Array.isArray(extra))for(let index=0;index<extra.length;index+=2)res.setHeader(extra[index],extra[index+1]);
   else if(extra)for(const [name,value] of Object.entries(extra))if(value!==undefined)res.setHeader(name,value);
   sendHead();
   return res;
  };
  res.flushHeaders=()=>sendHead();
  res.writeContinue=()=>{};
  res.setTimeout=()=>res;

  function sendHead(){
   if(head)return;
   res.headersSent=true;
   head={statusCode:res.statusCode,headers:Object.fromEntries(values)};
   target=onHead(head)||null;
   if(target)clearTimeout(timer);
  }

  res.on('error',error=>done(error));
  res.on('close',()=>done(httpError('Game menutup respons sebelum selesai.',502)));
  timer=setTimeout(()=>{
   done(httpError('Game tidak merespons. Coba muat ulang.',504));
   if(target&&!target.writableEnded)target.destroy();
  },timeoutMs);

  try{
   const result=handler(req,res);
   if(result&&typeof result.catch==='function')result.catch(error=>done(error));
  }catch(error){done(error);}
 });
}

module.exports={dispatch};
