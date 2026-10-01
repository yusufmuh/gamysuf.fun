'use strict';

const SERVICES = [
 {id:'cinderella',name:"Cinderella's Fit",subtitle:'Sepatu pas, momen berkelas.',detail:'Cosplayer membantu memakaikan sepatu saat tamu duduk nyaman.',alternative:'Pose pangeran dengan sepatu properti, tanpa menyentuh kaki.',icon:'shoe',seconds:60},
 {id:'twirl',name:'Princess Twirl',subtitle:'Satu putaran kecil, satu senyum besar.',detail:'Dansa singkat dan satu putaran pelan, mengikuti kenyamanan tamu.',alternative:'Dansa berdampingan tanpa bergandengan tangan.',icon:'sparkle',seconds:45},
 {id:'whisper',name:'Blossom Whisper',subtitle:'Sekuntum bunga, sejuta cerita.',detail:'Bunga diselipkan di dekat telinga untuk pose foto yang manis.',alternative:'Tamu menyelipkan bunganya sendiri; cosplayer berpose di samping.',icon:'flower',seconds:45},
 {id:'offering',name:'Sweet Offering',subtitle:'Bunga ini, khusus untukmu.',detail:'Cosplayer menyerahkan setangkai bunga ke tangan tamu.',alternative:'Bunga diserahkan lewat nampan kecil tanpa sentuhan.',icon:'rose',seconds:40},
 {id:'vow',name:"Knight's Vow",subtitle:'Salam paling manis dari sang ksatria.',detail:'Gestur cium punggung tangan yang sopan; kontak hanya setelah keduanya setuju.',alternative:'Membungkuk hormat dan gestur cium dari jarak aman.',icon:'crown',seconds:40},
 {id:'hug',name:'Warm Hug',subtitle:'Momen hangat, sesuai nyamanmu.',detail:'Pelukan singkat dari depan atau back hug ringan, dipilih bersama sebelum mulai.',alternative:'Pose hati berdampingan tanpa pelukan.',icon:'heart',seconds:40},
 {id:'pat',name:'Pat on Head',subtitle:'Sedikit perhatian, banyak salah tingkah.',detail:'Usapan kepala singkat dan lembut setelah tamu menyetujui.',alternative:'Gestur tangan melayang di atas kepala, tanpa menyentuh rambut.',icon:'hand',seconds:35}
];
const HOSTS = [
 {id:'zoro',name:'Zoro',role:'The Jade Swordsman',quote:'Hari ini, aku tidak akan salah arah. Tujuanku kamu.',image:'/assets/characters/zoro.webp',mascot:'/assets/brand/bipy-jade.webp',color:'#27785E'},
 {id:'sanji',name:'Sanji',role:'The Golden Gentleman',quote:'Satu momen istimewa, disiapkan sepenuh hati untukmu.',image:'/assets/characters/sanji.webp',mascot:'/assets/brand/bipy-gold.webp',color:'#C48A23'}
];
function defaultState(){return {
 schema:1,revision:0,campaignId:'heart-parade-2026',
 settings:{mode:'demo',paused:false,sessionOpen:true,schedule:'Jadwal sesi cosplayer diumumkan petugas booth.',queueLimit:12,allowPick:true,duration:4200},
 hosts:HOSTS.map(h=>({...h,enabled:true,quota:80})),
 services:SERVICES.map(s=>({...s,enabled:true})),
 pending:null,history:[],audit:[],dailyCounters:{}
};}
module.exports={SERVICES,HOSTS,defaultState};
