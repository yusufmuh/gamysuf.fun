'use strict';

/* npm run qa [-- covers] [-- 1366x768]
   Butuh Electron. Hub tidak memasang Electron sebagai dependensi (agar deploy
   ringan); skrip memakai ELECTRON_PATH atau Electron milik proyek game 03. */
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const args=process.argv.slice(2);
const mode=args.includes('covers')?'covers':'qa';
const size=args.find(arg=>/^\d+x\d+$/.test(arg))||'1600x900';
const [width,height]=size.split('x');
const candidates=[
 process.env.ELECTRON_PATH,
 path.join(__dirname,'..','node_modules','electron','dist','electron.exe'),
 path.join(__dirname,'..','..','03 bipy-beauty-drop','node_modules','electron','dist','electron.exe')
].filter(Boolean);
const electron=candidates.find(file=>fs.existsSync(file));
if(!electron){console.error('Electron tidak ditemukan. Set ELECTRON_PATH ke electron.exe.');process.exit(1);}
const env={...process.env,CAPTURE_MODE:mode,CAPTURE_WIDTH:width,CAPTURE_HEIGHT:height};
delete env.ELECTRON_RUN_AS_NODE;
const result=spawnSync(electron,[path.join(__dirname,'capture-electron.cjs')],{stdio:'inherit',env});
process.exit(result.status??1);
