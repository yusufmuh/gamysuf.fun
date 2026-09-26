'use strict';

/* npm run qa [-- covers] [-- 1366x768]
   Memakai Electron bila ada (ELECTRON_PATH atau Electron milik proyek game 03,
   seperti di laptop pemilik). Tanpa Electron (Linux, cloud, CI) memakai
   Playwright + Chromium lewat capture-playwright.cjs. Keduanya bukan
   dependensi hub agar deploy tetap ringan. */
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const args=process.argv.slice(2);
const mode=args.includes('covers')?'covers':'qa';
const size=args.find(arg=>/^\d+x\d+$/.test(arg))||'1600x900';
const [width,height]=size.split('x');
const binary=process.platform==='win32'?'electron.exe':'electron';
const candidates=[
 process.env.ELECTRON_PATH,
 path.join(__dirname,'..','node_modules','electron','dist',binary),
 path.join(__dirname,'..','..','03 bipy-beauty-drop','node_modules','electron','dist',binary)
].filter(Boolean);
const electron=process.env.CAPTURE_ENGINE==='chromium'?null:candidates.find(file=>fs.existsSync(file));
const env={...process.env,CAPTURE_MODE:mode,CAPTURE_WIDTH:width,CAPTURE_HEIGHT:height};
delete env.ELECTRON_RUN_AS_NODE;
const result=electron
 ?spawnSync(electron,[path.join(__dirname,'capture-electron.cjs')],{stdio:'inherit',env})
 :spawnSync(process.execPath,[path.join(__dirname,'capture-playwright.cjs')],{stdio:'inherit',env});
process.exit(result.status??1);
