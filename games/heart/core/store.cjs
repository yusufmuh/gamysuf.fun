'use strict';
const fs=require('node:fs'),path=require('node:path');
const {defaultState}=require('./catalog.cjs');
const {validateState,migrateState}=require('./engine.cjs');
class Store{
 constructor(dir){this.dir=dir;this.file=path.join(dir,'event.json');fs.mkdirSync(dir,{recursive:true});
  if(fs.existsSync(this.file)){try{this.state=validateState(migrateState(JSON.parse(fs.readFileSync(this.file,'utf8'))));}catch{throw new Error('Data Heart Parade rusak. Simpan event.json dan cadangan .bak; data tidak direset otomatis.');}}
  else this.commit(defaultState());}
 commit(next){validateState(next);const file=this.file+'.tmp',fd=fs.openSync(file,'w',0o600);try{fs.writeFileSync(fd,JSON.stringify(next,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(fs.existsSync(this.file))fs.copyFileSync(this.file,this.file+'.bak');fs.renameSync(file,this.file);this.state=structuredClone(next);}
}
module.exports={Store};
