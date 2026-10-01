'use strict';
function cell(v){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function historyCsv(history){return '\uFEFF'+[['Kode','Waktu','Antrean','Nama','Cosplayer','Menu','Metode','Kenyamanan','Izin dokumentasi','Status'],...history.filter(r=>!r.demo).map(r=>[r.id,r.at,r.queueNumber,r.username,r.host.name,r.service.name,r.method,r.comfort,r.recording?'Ya, konfirmasi ulang di booth':'Tidak',r.status])].map(r=>r.map(cell).join(',')).join('\r\n');}
module.exports={historyCsv};
