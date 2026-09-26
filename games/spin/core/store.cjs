'use strict';
const fs=require('node:fs');const path=require('node:path');
const {defaultState}=require('./catalog.cjs');const {validateState}=require('./engine.cjs');
const {upgradeInventory,upgradePlayground,upgradePestaFolkaV5}=require('./migrations.cjs');
class Store{
 constructor(dir){this.dir=dir;this.file=path.join(dir,'event.json');fs.mkdirSync(dir,{recursive:true});if(fs.existsSync(this.file)){try{this.state=validateState(JSON.parse(fs.readFileSync(this.file,'utf8')));}catch{throw new Error('Data event rusak. Data tidak direset. Simpan event.json dan event.json.bak, lalu pulihkan dari cadangan.');}for(const [upgrade,name] of [[upgradeInventory,'before-inventory-v2.json'],[upgradePlayground,'before-playground-v3.json'],[upgradePestaFolkaV5,'before-pesta-folka-v5.json']]){const upgraded=upgrade(this.state);if(upgraded){const archive=path.join(dir,name);if(!fs.existsSync(archive))fs.copyFileSync(this.file,archive);this.commit(upgraded);}}}else{this.commit(defaultState());}}
 commit(next){validateState(next);const tmp=this.file+'.tmp';const fd=fs.openSync(tmp,'w');try{fs.writeFileSync(fd,JSON.stringify(next,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(fs.existsSync(this.file))fs.copyFileSync(this.file,this.file+'.bak');fs.renameSync(tmp,this.file);this.state=structuredClone(next);}
}
module.exports={Store};
