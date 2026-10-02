'use strict';
const {hydrateResult}=require('./engine.cjs');
// Netralkan formula spreadsheet (CSV injection) pada setiap sel teks.
function cell(v){let s=String(v??'');if(/^(?:\s*[=+@-]|[\t\r\n])/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
const HEADER=['Kode','Waktu','Antrean','Nama','Cosplayer','Menu','No. kartu','Harga normal FS (Rp)','Metode','Kenyamanan','Izin dokumentasi','Status','Belanja terverifikasi (Rp)','Minimum belanja (Rp)','Verifikasi belanja'];
function row(r){
 // Harga diambil dari snapshot kartu saat diundi, bukan harga menu terkini.
 const card=hydrateResult(r).card||{};
 const verified=r.verified===true&&Number.isSafeInteger(r.purchaseAmount)&&r.purchaseAmount>=0&&Number.isSafeInteger(r.purchaseMinimum)&&r.purchaseAmount>=r.purchaseMinimum;
 return [r.id,r.at,r.queueNumber,r.username,r.host.name,r.service.name,card.cardNo,Number.isInteger(card.price)?card.price:'',r.method,r.comfort,r.recording?'Ya, konfirmasi ulang di booth':'Tidak',r.status,verified?r.purchaseAmount:'',verified?r.purchaseMinimum:'',verified?'Diperiksa petugas':'Misi lama; nominal tidak tercatat'];
}
function historyCsv(history){return '\uFEFF'+[HEADER,...history.filter(r=>!r.demo).map(row)].map(r=>r.map(cell).join(',')).join('\r\n');}
module.exports={historyCsv,HEADER};
