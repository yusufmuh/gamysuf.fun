'use strict';

/* Bipy Heart Parade · kartu fanservice bergaya trading card One Piece.
   price = harga normal fanservice (Rupiah) yang tampil dicoret pada poster
   bounty lalu digratiskan untuk pelanggan Bpedia. Nilainya dapat diubah
   petugas di dashboard; angka di sini hanya nilai awal. */
const SERVICES = [
 {id:'cinderella',name:"Cinderella's Fit",subtitle:'Sepatu pas, momen berkelas.',detail:'Cosplayer membantu memakaikan sepatu saat tamu duduk nyaman.',alternative:'Pose pangeran dengan sepatu properti, tanpa menyentuh kaki.',icon:'shoe',seconds:60,price:65000},
 {id:'twirl',name:'Princess Twirl',subtitle:'Satu putaran kecil, satu senyum besar.',detail:'Dansa singkat dan satu putaran pelan, mengikuti kenyamanan tamu.',alternative:'Dansa berdampingan tanpa bergandengan tangan.',icon:'sparkle',seconds:45,price:50000},
 {id:'whisper',name:'Blossom Whisper',subtitle:'Sekuntum bunga, sejuta cerita.',detail:'Bunga diselipkan di dekat telinga untuk pose foto yang manis.',alternative:'Tamu menyelipkan bunganya sendiri; cosplayer berpose di samping.',icon:'flower',seconds:45,price:45000},
 {id:'offering',name:'Sweet Offering',subtitle:'Bunga ini, khusus untukmu.',detail:'Cosplayer menyerahkan setangkai bunga ke tangan tamu.',alternative:'Bunga diserahkan lewat nampan kecil tanpa sentuhan.',icon:'rose',seconds:40,price:40000},
 {id:'vow',name:"Knight's Vow",subtitle:'Salam paling manis dari sang ksatria.',detail:'Gestur cium punggung tangan yang sopan; kontak hanya setelah keduanya setuju.',alternative:'Membungkuk hormat dan gestur cium dari jarak aman.',icon:'crown',seconds:40,price:75000},
 {id:'hug',name:'Warm Hug',subtitle:'Momen hangat, sesuai nyamanmu.',detail:'Pelukan singkat dari depan atau back hug ringan, dipilih bersama sebelum mulai.',alternative:'Pose hati berdampingan tanpa pelukan.',icon:'heart',seconds:40,price:55000},
 {id:'pat',name:'Pat on Head',subtitle:'Sedikit perhatian, banyak salah tingkah.',detail:'Usapan kepala singkat dan lembut setelah tamu menyetujui.',alternative:'Gestur tangan melayang di atas kepala, tanpa menyentuh rambut.',icon:'hand',seconds:35,price:35000}
];
const PRICE_LIMIT = 10000000;
const HOSTS = [
 {id:'zoro',name:'Zoro',fullName:'RORONOA ZORO',role:'The Jade Swordsman',attribute:'Slash',cardColor:'green',crew:'Bpedia Heart Crew / Swordsman',quote:'Hari ini, aku tidak akan salah arah. Tujuanku kamu.',image:'/assets/characters/zoro.webp',mascot:'/assets/brand/bipy-jade.webp',color:'#27785E',leaderLife:5,leaderPower:5000},
 {id:'sanji',name:'Sanji',fullName:'VINSMOKE SANJI',role:'The Golden Gentleman',attribute:'Strike',cardColor:'gold',crew:'Bpedia Heart Crew / Cook',quote:'Satu momen istimewa, disiapkan sepenuh hati untukmu.',image:'/assets/characters/sanji.webp',mascot:'/assets/brand/bipy-gold.webp',color:'#C48A23',leaderLife:5,leaderPower:5000}
];
const SCHEDULE = 'Zoro & Sanji hadir 3–4 Okt 2026, dua hari penuh di booth Bpedia · Urban Forest Cipete.';
const LEGACY_SCHEDULES = ['Jadwal sesi cosplayer diumumkan petugas booth.'];
function freezeCatalog(value){
 for(const child of Object.values(value))if(child&&typeof child==='object')freezeCatalog(child);
 return Object.freeze(value);
}
/* rarity mengikuti kelangkaan kartu TCG (R, SR, SEC). Semua hanya kosmetik:
   gacha tetap memilih seragam di antara menu aktif. */
const MOMENTS = {
 cinderella:{animationMotif:'shoe-sparkles',rarity:'SR',cost:5,power:{zoro:6000,sanji:6000},counter:1000,bipyName:'Bipy Glass Slipper',bipyAlt:'Bipy pink bertema sepatu Cinderella',
  effect:'[Fanservice] Tamu duduk nyaman, sepatu kaca dipasang dengan anggun. Saat dimainkan: kamu jadi ratu di booth ini.',
  lines:{zoro:'Kalau sepatu ini membawamu ke mana pun, izinkan aku berjalan di sisimu.',sanji:'Malam ini, langkah paling indah adalah langkahmu menuju senyumku.'}},
 twirl:{animationMotif:'petal-waltz',rarity:'R',cost:4,power:{zoro:5000,sanji:5000},counter:1000,bipyName:'Bipy Ballroom',bipyAlt:'Bipy pink bertema dansa ballroom',
  effect:'[Fanservice] Satu dansa kecil dan satu putaran pelan. Saat dimainkan: kelopak bunga ikut berdansa di sekelilingmu.',
  lines:{zoro:'Aku mungkin sering salah arah, tapi putaran ini selalu kembali kepadamu.',sanji:'Berikan satu putaran kecil; aku akan menjaga irama dan senyummu.'}},
 whisper:{animationMotif:'blossom-breeze',rarity:'R',cost:3,power:{zoro:4000,sanji:4000},counter:2000,bipyName:'Bipy Blossom',bipyAlt:'Bipy pink membawa bunga untuk momen Blossom Whisper',
  effect:'[Fanservice] Sekuntum bunga diselipkan di dekat telinga sambil menatap mata. Saat dimainkan: pose foto paling manis hari ini.',
  lines:{zoro:'Bunga ini boleh singgah sebentar; senyummu tinggal lebih lama di ingatanku.',sanji:'Kuselipkan satu bunga, dan kubiarkan pesonamu menyelesaikan ceritanya.'}},
 offering:{animationMotif:'rose-delivery',rarity:'R',cost:2,power:{zoro:4000,sanji:4000},counter:2000,bipyName:'Bipy Rose Courier',bipyAlt:'Bipy pink membawa setangkai mawar',
  effect:'[Fanservice] Setangkai bunga diserahkan langsung ke genggamanmu. Classic but deadly.',
  lines:{zoro:'Tak perlu peta untuk menemukan alasan memberikan bunga ini kepadamu.',sanji:'Setangkai mawar untukmu, disiapkan dengan seluruh perhatian yang kupunya.'}},
 vow:{animationMotif:'knight-glimmer',rarity:'SEC',cost:7,power:{zoro:9000,sanji:9000},counter:2000,bipyName:'Bipy Little Knight',bipyAlt:'Bipy pink bertema ksatria kecil dengan pedang properti',
  effect:'[Fanservice] Ciuman sopan ala ksatria di punggung tangan, hanya setelah keduanya setuju. Damage terbesar untuk penggemar gentleman.',
  lines:{zoro:'Izinkan ksatria ini menunduk sejenak, untuk menghormati hati yang berani.',sanji:'Hari ini, kehormatan terbesarku adalah membuatmu merasa istimewa.'}},
 hug:{animationMotif:'heart-embrace',rarity:'SR',cost:6,power:{zoro:7000,sanji:7000},counter:1000,bipyName:'Bipy Heart Keeper',bipyAlt:'Bipy pink memegang hati untuk momen Warm Hug',
  effect:'[Fanservice] Pelukan hangat dari depan atau back hug tipis, dipilih bersama sebelum mulai. Saat dimainkan: hati ikut hangat.',
  lines:{zoro:'Kau boleh mendekat atau tetap di sini; kehangatan ini mengikuti nyamanmu.',sanji:'Ada ruang untuk satu momen hangat, sepanjang itu membuatmu tersenyum.'}},
 pat:{animationMotif:'gentle-stars',rarity:'SR',cost:2,power:{zoro:5000,sanji:5000},counter:1000,bipyName:'Bipy Star Guardian',bipyAlt:'Bipy pink bertema bintang untuk momen Pat on Head',
  effect:'[Fanservice] Elusan lembut di kepala. Saat dimainkan: kamu salah tingkah, dan itu boleh.',
  lines:{zoro:'Setelah hari yang panjang, semoga perhatian kecil ini membuatmu lebih ringan.',sanji:'Kau sudah melangkah sejauh ini; biarkan satu perhatian kecil menemanimu.'}}
};
const CUSTOMER_OFFER = {label:'GRATIS',amount:0,description:'untuk pelanggan Bpedia'};
// Kartu ini juga ID album arcade; ganti artwork tidak mereset koleksi.
const CARDS=freezeCatalog(HOSTS.flatMap((host,hostIndex)=>SERVICES.map((service,serviceIndex)=>{
 const moment=MOMENTS[service.id];
 return {id:`${host.id}-${service.id}`,hostId:host.id,serviceId:service.id,name:`${service.name} · ${host.name}`,
  cardNo:`BP06-${String(hostIndex*SERVICES.length+serviceIndex+1).padStart(3,'0')}`,rarity:moment.rarity,
  cost:moment.cost,power:moment.power[host.id],counter:moment.counter,attribute:host.attribute,cardColor:host.cardColor,
  crew:host.crew,effect:moment.effect,bountyName:host.fullName,
  image:`/assets/stickers/${host.id}-${service.id}.webp`,imageAlt:`Bipy pink bersama ${host.name} dalam momen ${service.name}`,
  povImage:host.id==='sanji'?`/assets/pov/sanji-${service.id}.webp`:`/assets/moments/zoro-${service.id}.webp`,povAlt:`${host.name} dalam pose ${service.name}`,
  stickerImage:`/assets/stickers/${host.id}-${service.id}.webp`,stickerAlt:`Bipy bersama ${host.name} dalam momen ${service.name}`,
  mascot:`/assets/bipy-variants/bipy-${service.id}.webp`,bipyName:moment.bipyName,bipyAlt:moment.bipyAlt,
  romanticLine:moment.lines[host.id],animationMotif:moment.animationMotif,
  price:service.price,currency:'IDR',priceLabel:'Harga normal fanservice',
  customerOffer:{...CUSTOMER_OFFER},video:`/assets/video/moments/${host.id}-${service.id}-${(host.id==='zoro'&&service.id==='hug')||(host.id==='sanji'&&service.id==='vow')?'gemini':'bipy'}.mp4`};
})));
function cardFor(hostId,serviceId){return CARDS.find(card=>card.hostId===hostId&&card.serviceId===serviceId)||null;}
function defaultState(){return {
 schema:1,revision:0,campaignId:'heart-parade-2026',
 settings:{mode:'demo',paused:false,sessionOpen:true,schedule:SCHEDULE,queueLimit:12,allowPick:true,duration:4200},
 hosts:HOSTS.map(h=>({...h,enabled:true,quota:80})),
 services:SERVICES.map(s=>({...s,enabled:true})),
 pending:null,history:[],audit:[],dailyCounters:{}
};}
module.exports={SERVICES,HOSTS,CARDS,MOMENTS,PRICE_LIMIT,SCHEDULE,LEGACY_SCHEDULES,cardFor,defaultState};
