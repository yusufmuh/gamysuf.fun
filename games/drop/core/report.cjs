'use strict';
const {zipSync,strToU8}=require('fflate');
const {leaderboard,capsules,fanserviceStats}=require('./engine.cjs');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const jakartaParts=value=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
const col=n=>{let s='';n++;while(n>0){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=(n-r-1)/26;}return s;};
const tierName={bundling:'Bundling utama',grand:'Voucher utama',voucher:'Voucher potongan',product:'Produk gratis',newuser:'Voucher pengguna baru',zonk:'Belum mekar'};
const BOM=String.fromCharCode(0xfeff);
const gameName={drop:'Beauty Drop',fanservice:'Fanservice'};
const statusName=item=>item.status==='zonk'?'Belum mekar':item.status==='claimed'?(item.game==='fanservice'?'Sudah dilayani':'Sudah diserahkan'):(item.game==='fanservice'?'Menunggu host':'Belum diserahkan');
const rewardName=item=>item.game==='fanservice'?`${item.fanservice.name} · ${item.host.name} (${item.method==='pilih'?'pilih sendiri':'gacha'})`:item.prize.fullName;
const categoryName=item=>item.game==='fanservice'?'Fanservice':tierName[item.prize.tier];

function sheet(rows){
 const body=rows.map((row,r)=>{
  const cells=row.map((value,c)=>{
   const ref=col(c)+(r+1);
   if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"><v>${value}</v></c>`;
   return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
  }).join('');
  return `<row r="${r+1}">${cells}</row>`;
 }).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function managementReport(state){
 const live=state.history.filter(h=>h.demo===false);
 const drops=live.filter(h=>h.game==='drop');
 const won=drops.filter(h=>h.prize.tier!=='zonk');
 const fans=live.filter(h=>h.game==='fanservice');
 const fanStats=fanserviceStats(live);
 const pool=capsules(state);
 const byHour=new Map();
 for(const h of live){
  const p=jakartaParts(h.at),sortKey=`${p.year}-${p.month}-${p.day}T${p.hour}:00`,label=`${p.day}/${p.month}/${p.year} ${p.hour}:00 WIB`;
  const row=byHour.get(sortKey)||{label,drop:0,fanservice:0};row[h.game]++;byHour.set(sortKey,row);
 }
 const followUp=[];
 for(const p of state.prizes){
  if(p.stock!==null&&p.enabled&&p.stock===0)followUp.push(['Stok habis',p.fullName,'Isi ulang stok atau biarkan nonaktif; kapsulnya sudah otomatis keluar dari mesin.']);
  else if(p.stock!==null&&p.enabled&&p.stock<=3)followUp.push(['Stok menipis',p.fullName,`Sisa ${p.stock} pcs. Siapkan penggantian sebelum jam ramai.`]);
 }
 const unclaimed=drops.filter(h=>h.status==='unclaimed');
 if(unclaimed.length)followUp.push(['Belum diserahkan',`${unclaimed.length} hadiah`,'Cocokkan kode BD- pada tab Riwayat lalu tandai Diserahkan.']);
 if(fanStats.waiting)followUp.push(['Fanservice menunggu',`${fanStats.waiting} tiket`,'Panggil antrean tiket FS- lalu tandai Sudah dilayani.']);
 if(!live.length)followUp.push(['Belum ada data','Mode permainan resmi belum dipakai','Aktifkan mode resmi sebelum booth dibuka.']);
 const sheets={
  'Ringkasan':[
   ['Laporan Bipy Beauty Drop'],['Acara',state.settings.eventName],['Diekspor',new Date().toISOString()],['Mode saat ekspor',state.settings.mode],[],
   ['Metrik','Nilai'],
   ['Total Beauty Drop',drops.length],['Hadiah keluar',won.length],['Hadiah sudah diserahkan',drops.filter(h=>h.status==='claimed').length],['Hadiah belum diserahkan',unclaimed.length],['Belum mekar',drops.filter(h=>h.prize.tier==='zonk').length],
   ['Tiket fanservice',fans.length],['Fanservice lewat gacha',fanStats.gacha],['Fanservice pilih sendiri',fanStats.pilih],['Fanservice sudah dilayani',fanStats.served],
   ['Sisa stok tercatat',state.prizes.reduce((n,p)=>n+(p.stock??0),0)],['Kapsul berhadiah di mesin',pool.prize],['Kapsul belum mekar di mesin',pool.empty],
   ['Pemain tercatat',new Set(live.map(h=>h.username)).size]
  ],
  'Riwayat':[['Kode','Waktu','Permainan','Pemain','Hadiah / fanservice','Kategori','Status','Diserahkan pada'],...live.map(h=>[h.id,h.at,gameName[h.game],h.username,rewardName(h),categoryName(h),statusName(h),h.claimedAt||''])],
  'Inventori':[['Hadiah','Kategori','Stok awal tercatat','Penyesuaian stok bersih','Keluar','Sisa','Kapsul di mesin','Aktif'],...state.prizes.map(p=>{
   const issued=drops.filter(h=>h.prize.id===p.id).length;
   const unlimited=p.stock===null||p.initialStock===null;
   const inMachine=pool.rows.find(row=>row.id===p.id)?.count??0;
   return [p.fullName,tierName[p.tier],p.initialStock===null?'tak terbatas':p.initialStock,unlimited?'tidak berlaku':p.stock+issued-p.initialStock,issued,p.stock===null?'tak terbatas':p.stock,inMachine,p.enabled?'ya':'tidak'];
  })],
  'Komposisi kapsul':[['Kategori','Kapsul di mesin saat ekspor','Keluar sepanjang acara'],...Object.keys(tierName).map(tier=>[tierName[tier],pool.byTier[tier],drops.filter(h=>h.prize.tier===tier).length])],
  'Fanservice':[['Jenis','Tiket','Aktif'],...state.fanservices.map(f=>[f.name,fanStats.byType[f.id]||0,f.enabled?'ya':'tidak']),[],['Host','Tiket','Bertugas'],...state.hosts.map(h=>[h.name,fanStats.byHost[h.id]||0,h.enabled?'ya':'tidak'])],
  'Peringkat':[['Peringkat','Pemain','Percobaan','Hadiah','Poin'],...leaderboard(drops).map((r,i)=>[i+1,r.username,r.plays,r.won,r.points])],
  'Aktivitas':[['Tanggal dan jam','Beauty Drop','Fanservice'],...[...byHour.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([,row])=>[row.label,row.drop,row.fanservice])],
  'Tindak lanjut':[['Jenis','Objek','Tindakan'],...followUp]
 };
 const names=Object.keys(sheets);
 const files={
  '[Content_Types].xml':strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`),
  '_rels/.rels':strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
  'xl/workbook.xml':strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n,i)=>`<sheet name="${esc(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`),
  'xl/_rels/workbook.xml.rels':strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`)
 };
 names.forEach((name,i)=>{files[`xl/worksheets/sheet${i+1}.xml`]=strToU8(sheet(sheets[name]));});
 return Buffer.from(zipSync(files));
}

function csvCell(value){let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}

function historyCsv(history){
 return BOM+[['Kode','Waktu','Permainan','Pemain','Hadiah / fanservice','Kategori','Status','Diserahkan pada'],...history.filter(h=>h.demo===false).map(h=>[h.id,h.at,gameName[h.game],h.username,rewardName(h),categoryName(h),statusName(h),h.claimedAt||''])].map(r=>r.map(csvCell).join(',')).join('\r\n');
}

function leaderboardCsv(history){
 const rows=[['Peringkat','Pemain','Percobaan','Hadiah','Poin'],...leaderboard(history.filter(item=>item.demo===false)).map((row,index)=>[index+1,row.username,row.plays,row.won,row.points])];
 return BOM+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}

module.exports={managementReport,historyCsv,leaderboardCsv,csvCell,statusName,rewardName};
