'use strict';
const {zipSync,strToU8}=require('fflate');
const {leaderboard,distribution}=require('./engine.cjs');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const jakartaParts=value=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
const col=n=>{let s='';n++;while(n>0){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=(n-r-1)/26;}return s;};
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
 const won=live.filter(h=>h.prize.tier!=='zonk');
 const tierName={bundling:'Bundling utama',grand:'Voucher utama',voucher:'Voucher potongan',product:'Produk gratis',newuser:'Voucher pengguna baru',zonk:'Zonk'};
 const planned=state.settings.odds;
 let odds;try{odds=distribution(state);}catch{odds=null;}
 const perTier=Object.keys(tierName).map(tier=>{
  const n=live.filter(h=>h.prize.tier===tier).length;
  return [tierName[tier],n,live.length?Number((100*n/live.length).toFixed(2)):'belum diketahui',planned[tier],odds?Number(odds[tier].toFixed(2)):'belum diketahui'];
 });
 const byHour=new Map();
 for(const h of live){const p=jakartaParts(h.at),sortKey=`${p.year}-${p.month}-${p.day}T${p.hour}:00`,label=`${p.day}/${p.month}/${p.year} ${p.hour}:00 WIB`;const row=byHour.get(sortKey)||{label,count:0};row.count++;byHour.set(sortKey,row);}
 const followUp=[];
 for(const p of state.prizes){
  if(p.stock!==null&&p.enabled&&p.stock===0)followUp.push(['Stok habis',p.fullName,'Isi ulang stok atau nonaktifkan agar peluang dibagikan ke kategori lain.']);
  else if(p.stock!==null&&p.enabled&&p.stock<=3)followUp.push(['Stok menipis',p.fullName,`Sisa ${p.stock} pcs. Siapkan penggantian sebelum jam ramai.`]);
 }
 const unclaimed=live.filter(h=>h.status==='unclaimed');
 if(unclaimed.length)followUp.push(['Belum diserahkan',`${unclaimed.length} hadiah`,'Cocokkan kode pada tab Riwayat lalu tandai Diserahkan.']);
 if(!live.length)followUp.push(['Belum ada data','Mode permainan belum dipakai','Aktifkan mode permainan sebelum acara dimulai.']);
 const sheets={
  'Ringkasan':[['Laporan Bpedia Nyapit'],['Acara',state.settings.eventName],['Diekspor',new Date().toISOString()],['Mode saat ekspor',state.settings.mode],[],['Metrik','Nilai'],['Total percobaan',live.length],['Hadiah keluar',won.length],['Sudah diserahkan',live.filter(h=>h.status==='claimed').length],['Belum diserahkan',unclaimed.length],['Zonk',live.filter(h=>h.prize.tier==='zonk').length],['Sisa stok tercatat',state.prizes.reduce((n,p)=>n+(p.stock??0),0)],['Pemain tercatat',new Set(live.map(h=>h.username)).size]],
  'Riwayat':[['Kode','Waktu','Pemain','Hadiah','Kategori','Status','Diserahkan pada'],...live.map(h=>[h.id,h.at,h.username,h.prize.fullName,tierName[h.prize.tier],h.status,h.claimedAt||''])],
   'Inventori':[['Hadiah','Kategori','Stok awal tercatat','Penyesuaian stok bersih','Keluar','Sisa','Aktif'],...state.prizes.map(p=>{
    const issued=live.filter(h=>h.prize.id===p.id).length;
    const unlimited=p.stock===null||p.initialStock===null;
    return [p.fullName,tierName[p.tier],p.initialStock===null?'tak terbatas':p.initialStock,unlimited?'tidak berlaku':p.stock+issued-p.initialStock,issued,p.stock===null?'tak terbatas':p.stock,p.enabled?'ya':'tidak'];
   })],
  'Peringkat':[['Peringkat','Pemain','Percobaan','Hadiah','Poin'],...leaderboard(live).map((r,i)=>[i+1,r.username,r.plays,r.won,r.points])],
  'Distribusi':[['Kategori','Jumlah keluar','Persen aktual','Peluang rencana','Peluang efektif'],...perTier],
  'Aktivitas':[['Tanggal dan jam','Percobaan'],...[...byHour.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([,row])=>[row.label,row.count])],
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
 const tierName={bundling:'Bundling utama',grand:'Voucher utama',voucher:'Voucher potongan',product:'Produk gratis',newuser:'Voucher pengguna baru',zonk:'Zonk'};
 return '\ufeff'+[['Kode','Waktu','Pemain','Hadiah','Kategori','Status','Diserahkan pada'],...history.filter(h=>h.demo===false).map(h=>[h.id,h.at,h.username,h.prize.fullName,tierName[h.prize.tier],h.status,h.claimedAt||''])].map(r=>r.map(csvCell).join(',')).join('\r\n');
}
function leaderboardCsv(history){
 const rows=[['Peringkat','Pemain','Percobaan','Hadiah','Poin'],...leaderboard(history.filter(item=>item.demo===false)).map((row,index)=>[index+1,row.username,row.plays,row.won,row.points])];
 return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
module.exports={managementReport,historyCsv,leaderboardCsv,csvCell};
