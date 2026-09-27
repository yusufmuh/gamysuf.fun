'use strict';

/* Capture real game screens at 16:9. Review artifacts/cover-candidates first;
   pass --publish to replace the three covers used by the hub. */
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const candidates=[
 process.env.ELECTRON_PATH,
 path.join(root,'node_modules','electron','dist','electron.exe'),
 path.join(root,'..','03 bipy-beauty-drop','node_modules','electron','dist','electron.exe')
].filter(Boolean);
const electron=candidates.find(file=>fs.existsSync(file));
if(!electron)throw new Error('Electron tidak ditemukan; set ELECTRON_PATH.');
const env={...process.env,CAPTURE_COVERS_PUBLISH:process.argv.includes('--publish')?'1':'0'};
delete env.ELECTRON_RUN_AS_NODE;
const result=spawnSync(electron,[path.join(__dirname,'capture-gameplay-covers-electron.cjs')],{stdio:'inherit',env});
process.exit(result.status??1);
