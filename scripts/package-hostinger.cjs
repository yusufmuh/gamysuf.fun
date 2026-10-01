'use strict';

/* ZIP siap unggah untuk Hostinger (Node.js web app → Upload your files):
   package.json di akar, hub + lima game, tanpa tes/skrip/dokumen internal.
   Cara lain yang direkomendasikan: impor repo GitHub (redeploy otomatis). */
const fs=require('node:fs');
const path=require('node:path');
const {zipSync}=require('fflate');

const root=path.join(__dirname,'..');
const pkg=require('../package.json');
const name=`Gamysuf-Arcade-${pkg.version}-Hostinger.zip`;
const STORED=/\.(?:png|jpe?g|webp|gif|mp3|woff2?|ico|zip)$/i;
const SKIP=/(?:^|\/)(?:desktop\.ini|\.DS_Store|Thumbs\.db)$/i;
const include=['hub','games','package-lock.json','README.md'];

const webPackage={...pkg,engines:{node:'22.x'},scripts:{start:pkg.scripts.start}};
const readme=`# Gamysuf Arcade ${pkg.version} · paket Hostinger

## Unggah
1. hPanel → Websites → gamysuf.fun (atau Add Website) → **Node.js web app** → **Upload your files**.
2. Unggah \`${name}\` apa adanya (package.json sudah di akar ZIP).
3. Pengaturan: Framework **Other** · Node **22** · Build command **kosong** · Output directory **kosong** · Entry file **hub/server.cjs**.
4. Environment variables:
   - \`ADMIN_PIN\` = 6–12 digit angka (wajib untuk Studio & dashboard game; tanpa ini semuanya terkunci).
   - \`NODE_ENV\` = \`production\`
   - opsional \`ALLOWED_HOSTS\` = \`gamysuf.fun,www.gamysuf.fun\`
   - opsional \`GAMYSUF_DATA_DIR\` (bawaan \`~/gamysuf-data\`, di luar folder build agar data tidak hilang saat redeploy)
5. Deploy, lalu buka https://gamysuf.fun (arcade) dan https://gamysuf.fun/studio (Studio pemilik).

## Login
- Studio & dashboard Nyapit/Beauty Drop/Gacha Pop/Heart Parade: PIN = ADMIN_PIN.
- Dashboard Spin Wheels: username \`johan123\`, password = ADMIN_PIN.
- Ganti PIN: ubah ADMIN_PIN di Environment variables lalu simpan (otomatis redeploy).
`;
const env=`# Isi di hPanel → Environment variables (atau Import .env).
ADMIN_PIN=
NODE_ENV=production
# ALLOWED_HOSTS=gamysuf.fun,www.gamysuf.fun
# GAMYSUF_DATA_DIR=/home/USERNAME/gamysuf-data
`;

const entries={};
const mtime=new Date('2026-10-03T00:00:00+07:00');
const add=(file,bytes)=>{entries[file]=[bytes,{level:STORED.test(file)?0:6,mtime}];};
function walk(relative){
 const full=path.join(root,relative);
 if(fs.statSync(full).isDirectory()){for(const item of fs.readdirSync(full).sort())walk(path.posix.join(relative,item));return;}
 if(!SKIP.test(relative))add(relative,fs.readFileSync(full));
}
add('package.json',Buffer.from(JSON.stringify(webPackage,null,2)+'\n'));
add('README-HOSTINGER.md',Buffer.from(readme));
add('hostinger.env.example',Buffer.from(env));
for(const item of include)if(fs.existsSync(path.join(root,item)))walk(item);
fs.mkdirSync(path.join(root,'release'),{recursive:true});
const zip=Buffer.from(zipSync(entries));
fs.writeFileSync(path.join(root,'release',name),zip);
console.log(`${name}: ${Object.keys(entries).length} berkas, ${(zip.length/1048576).toFixed(1)} MB → release/${name}`);
