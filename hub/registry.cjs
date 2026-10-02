'use strict';

/* Daftar game bawaan hub. Setiap entri memuat teks panduan untuk halaman
   depan dan adapter kecil yang membaca respons hasil permainan di gateway,
   supaya XP dan kartu koleksi dicatat di server (tidak bisa dipalsukan dari
   browser). Menambah game Node baru = tambah folder games/<slug> berisi
   server.cjs dengan createApp({cloud}) lalu tambah satu entri di sini. */
const RARITY={bundling:'legendary',grand:'legendary',voucher:'rare',fanservice:'epic',collab:'epic',product:'common',newuser:'common'};
const rarityOf=tier=>RARITY[tier]||'common';
const prizeCard=prize=>prize&&!['zonk','empty','bonus'].includes(prize.tier)
 ?{cardId:prize.id,name:prize.name||prize.fullName,image:prize.image,rarity:rarityOf(prize.tier)}
 :null;
const HEART_HOST_IDS=['zoro','sanji'];
const HEART_SERVICE_IDS=['cinderella','twirl','whisper','offering','vow','hug','pat'];
function heartMomentImage(hostId,serviceId){
 if(!HEART_HOST_IDS.includes(hostId)||!HEART_SERVICE_IDS.includes(serviceId))return null;
 return `/assets/moments/${hostId}-${serviceId}.webp`;
}
// ID kartu = ID album lama; ganti artwork atau nama tidak mereset koleksi pemain.
function heartMomentCard(host,service,name){
 const image=heartMomentImage(host?.id,service?.id);
 return image?{cardId:`${host.id}-${service.id}`,name:name||`${service.name} · ${host.name}`,image,rarity:'epic'}:null;
}

/* Event booth yang menyatukan beberapa game di beranda. Game tetap berdiri
   sendiri; eventGroup hanya mengelompokkan tampilan. Jadwal cosplayer tanpa
   jam karena jam sesi diumumkan langsung oleh petugas booth. */
const EVENTS={
 'market-in-6':{
  id:'market-in-6',title:'Market-In 6.0',place:'Urban Forest Cipete',city:'Jakarta',dates:'3–4 Okt 2026',
  startDate:'2026-10-03',endDate:'2026-10-04',page:'/market-in',
  headline:'Dua game, satu booth Bpedia.',
  summary:'Gacha Pop untuk hadiah beauty dan voucher belanja, Heart Parade untuk kartu fanservice bersama Zoro & Sanji. Dua game berbeda, satu profil dan satu album koleksi.',
  cosplay:'Zoro & Sanji hadir 3–4 Okt — dua hari di booth Bpedia',
  teaser:'Gacha Pop & Heart Parade di satu booth. Zoro & Sanji hadir dua hari.',
  logo:'/hub/assets/market-in/market-in-6.webp?v=1.6.0',
  schedule:[
   {date:'2026-10-03',day:'Sabtu',label:'Sabtu, 3 Okt 2026',hosts:['Zoro','Sanji'],note:'Hari pertama di booth Bpedia. Jam sesi foto dan fanservice diumumkan petugas.'},
   {date:'2026-10-04',day:'Minggu',label:'Minggu, 4 Okt 2026',hosts:['Zoro','Sanji'],note:'Hari kedua di booth Bpedia. Datang lagi untuk melengkapi kartumu.'}
  ]
 }
};

const GAMES=[
 {
  slug:'spin',
  title:'Spin Wheels',
  brandTitle:'Bpedia Spin & Win',
  event:'Pesta Folka 2026',
  mechanic:'Roda keberuntungan · Mystery Beauty Box',
  accent:'#E62B5E',
  cover:'/hub/assets/covers/spin.jpg?v=1.1.0',
  tagline:'Putar roda, buka Mystery Beauty Box, temukan kartu favorit.',
  description:'Roda hadiah dengan produk PINKFLASH, FOCALLURE, SALSA, dan voucher belanja Bpedia. Kalau jarum berhenti di Mystery Beauty Box, kamu memilih satu dari tiga kotak dan semuanya berhadiah.',
  howTo:[
   'Pilih Demo untuk bermain online, lalu tekan tombol Putar atau Spasi.',
   'Tunggu roda berhenti. Hadiahnya langsung muncul sebagai kartu.',
   'Jarum di Mystery Beauty Box? Pilih satu dari tiga kotak; tidak ada zonk di dalamnya.',
   'Setiap hadiah baru masuk album koleksi dan menambah XP.'
  ],
  tips:['Mystery Beauty Box adalah jalan tercepat mendapat kartu langka.','Main tiap hari untuk menjaga streak dan misi harian.'],
  controls:[['Sentuh / klik','Putar roda atau pilih kotak'],['Spasi','Putar roda'],['M','Senyap']],
  admin:{path:'admin.html',login:'Username johan123, password = ADMIN_PIN'},
  loginRoutes:['/api/login'],
  resultRoutes:['/api/spin','/api/bonus'],
  extract(_route,json){
   if(!json||json.stage!=='result')return null;
   if(json.prize?.tier==='zonk')return {zonk:true};
   return prizeCard(json.prize);
  },
  cards(state){return state.prizes.map(prizeCard).filter(Boolean);},
  engineOptions(real){return {layoutSeed:real.layoutSeed};}
 },
 {
  slug:'nyapit',
  title:'Nyapit Bareng Bpedia',
  brandTitle:'NYAPIT BARENG BPEDIA',
  event:'Cozzone UP 2026',
  mechanic:'Mesin capit digital · maskot B!',
  accent:'#7B3FC4',
  cover:'/hub/assets/covers/nyapit.jpg?v=1.1.0',
  tagline:'Bidik kapsul, jatuhkan capit, dan rasakan tegangnya detik terakhir.',
  description:'Mesin capit penuh kapsul hadiah dengan maskot B! yang berlarian. Kamu mengarahkan capit ke kapsul pilihan; hadiah ditentukan mesin secara acak saat capit mengangkat kapsul.',
  howTo:[
   'Tekan Main Sekarang. Koin virtual masuk, gratis.',
   'Arahkan capit dengan panah, A/D, atau klik langsung kapsul di dalam kaca.',
   'Tekan Capit Sekarang atau Spasi untuk menurunkan capit.',
   'Kapsul yang terangkat terbuka jadi kartu hadiah lengkap dengan kode NY-.'
  ],
  tips:['Mengaduk bola dengan menggeser tidak menghabiskan percobaan.','Voucher pengguna baru bisa langsung dipakai di aplikasi Bpedia.'],
  controls:[['Sentuh / geser','Bidik kapsul'],['← → / A D','Gerakkan capit'],['Spasi / Enter','Turunkan capit'],['M','Senyap']],
  admin:{path:'admin.html',login:'PIN = ADMIN_PIN'},
  loginRoutes:['/api/login'],
  resultRoutes:['/api/play'],
  extract(_route,json){
   if(!json?.prize)return null;
   if(json.prize.tier==='zonk')return {zonk:true};
   return prizeCard(json.prize);
  },
  cards(state){return state.prizes.map(prizeCard).filter(Boolean);}
 },
 {
  slug:'drop',
  title:'Bipy Beauty Drop',
  brandTitle:'BIPY BEAUTY DROP',
  event:'TAKEOVER X 2026',
  mechanic:'Papan pin vault · kapsul mekar · kartu koleksi',
  accent:'#F5B83D',
  cover:'/hub/assets/covers/drop.jpg?v=1.1.0',
  tagline:'Bipy menjatuhkan kapsul kelopak; tunggu ia mekar jadi kartu hadiah.',
  description:'Kapsul memantul di papan pin bergaya The Vault of Time, mendarat di pintu misteri, lalu mekar menjadi kartu koleksi berkilau. Ada juga Gacha Fanservice bersama cosplayer Zoro & Sanji.',
  howTo:[
   'Pilih Beauty Drop, isi nama (opsional), lalu tekan DROP! atau Spasi.',
   'Kapsul memantul di 10 baris pin dan mendarat di salah satu pintu vault.',
   'Kapsul bergetar lalu mekar menjadi kartu hadiah; kuncup berarti belum mekar.',
   'Coba juga Gacha Fanservice: pilih cosplayer, lalu kapsul memilih fanservice-mu.'
  ],
  tips:['Semua kapsul berpeluang sama: murni hoki, tanpa persentase.','Kartu fanservice terhitung kartu epik di album.'],
  controls:[['Sentuh / klik','DROP! atau pilih cosplayer'],['Spasi / Enter','Aktifkan tombol yang dipilih'],['1 / 2','Pilih game di beranda'],['Esc','Kembali']],
  admin:{path:'admin.html',login:'PIN = ADMIN_PIN'},
  loginRoutes:['/api/login'],
  resultRoutes:['/api/play'],
  extract(_route,json){
   if(!json)return null;
   if(json.game==='fanservice'&&json.fanservice)return {cardId:`fs-${json.fanservice.id}`,name:`Fanservice ${json.fanservice.name}`,image:json.host?.id==='zoro'?'/assets/images/host-zoro.jpg':'/assets/images/host-sanji.jpg',rarity:'epic'};
   if(!json.prize)return null;
   if(json.prize.tier==='zonk')return {zonk:true};
   return prizeCard(json.prize);
  },
  cards(state){
   return [
    ...state.prizes.map(prizeCard).filter(Boolean),
    ...(state.fanservices||[]).map((item,index)=>({cardId:`fs-${item.id}`,name:`Fanservice ${item.name}`,image:index%2?'/assets/images/host-zoro.jpg':'/assets/images/host-sanji.jpg',rarity:'epic'}))
   ];
  }
 },
 {
  slug:'gacha',
  title:'Bipy Gacha Pop',
  brandTitle:'BIPY GACHA POP',
  event:'Market-In 6.0',
  eventGroup:'market-in-6',
  mechanic:'Mesin gacha satu tap · kapsul pop · kartu stiker',
  accent:'#39A7E5',
  cover:'/hub/assets/covers/gacha.jpg?v=1.6.0',
  tagline:'Sekali tap: tuas berputar, kapsul keluar, lalu pop jadi kartu stiker hadiah.',
  description:'Mesin kapsul gashapon bergaya Y2K Market-In 6.0. Cukup satu tap, tanpa isian apa pun: kapsul menggelinding dari corong lalu pop menjadi kartu stiker. Isinya Bundling Paket 1–3, kuas set kolab karakter, Saput Mickey, voucher belanja Bpedia, serta produk PINKFLASH & FOCALLURE.',
  howTo:[
   'Tekan GACHA!, sentuh mesinnya, atau tekan Spasi. Nama boleh dikosongkan.',
   'Tuas berputar dan kapsul di kubah berguncang, lalu satu kapsul keluar dari corong.',
   'Kapsul pop menjadi kartu stiker hadiah lengkap dengan kode GP-.',
   'Kelas hadiah tertera di kartu: bundling legendaris, kolab karakter epik, voucher belanja langka, beauty pick umum.'
  ],
  quickStart:['Tekan GACHA! sekali saja.','Kapsul keluar dan pop jadi kartu stiker.','Tunjukkan kode GP- ke petugas booth.'],
  tips:['Setiap kapsul berpeluang sama: murni hoki, tanpa persentase.','Kartu kolab karakter dihitung epik dan voucher belanja dihitung langka di album.'],
  controls:[['Sentuh / klik','GACHA! atau sentuh mesin'],['Spasi / Enter','Putar tuas'],['N','Isi nama (opsional)'],['M','Senyap'],['Esc','Tutup kartu hasil']],
  admin:{path:'admin.html',login:'PIN = ADMIN_PIN'},
  loginRoutes:['/api/login'],
  resultRoutes:['/api/play'],
  extract(_route,json){
   if(!json?.prize)return null;
   if(json.prize.tier==='empty')return {zonk:true};
   return prizeCard(json.prize);
  },
  cards(state){return state.prizes.map(prizeCard).filter(Boolean);}
 },
 {
  slug:'heart',title:'Bipy Heart Parade',brandTitle:'BIPY HEART PARADE',event:'Market-In 6.0',eventGroup:'market-in-6',
  mechanic:'Kartu fanservice · gacha booster atau pilih kartu · poster bounty',accent:'#D45778',cover:'/hub/assets/covers/heart.jpg?v=1.6.0',
  tagline:'Kartu fanservice Zoro & Sanji bergaya poster bounty. Harga normal dicoret, gratis untuk pelanggan Bpedia.',
  description:'Trading card fanservice bersama cosplayer Zoro dan Sanji. Buka Gacha Booster dan biarkan Bipy memilihkan kartu, atau Pilih Kartu untuk momen favoritmu. Setiap kartu tampil sebagai poster bounty: harga normal fanservice dicoret, GRATIS untuk pelanggan Bpedia. Lengkapi 14 kartu di album.',
  howTo:['Pilih Zoro atau Sanji, lalu pilih Gacha Booster atau Pilih Kartu.','Pilih interaksi tanpa sentuhan atau sentuhan ringan, lalu konfirmasikan kenyamananmu.','Kartu terbuka sebagai poster bounty: harga normal dicoret, GRATIS untuk pelanggan Bpedia.','Simpan kartu digitalmu. Kartu demo online tidak berlaku untuk klaim di booth.'],
  quickStart:['Pilih Zoro atau Sanji.','Gacha Booster, atau pilih sendiri kartunya.','Poster bounty terbuka: GRATIS untuk pelanggan Bpedia.'],
  tips:['Gacha Booster diacak server dan setiap momen berpeluang sama. Pilih Kartu memastikan momen yang kamu mau.','Setiap momen punya alternatif tanpa sentuhan. Tamu dan cosplayer boleh berhenti kapan saja.'],
  controls:[['Sentuh / klik','Pilih karakter, mode, dan kartu'],['Tab / Enter','Pindah dan pilih kartu dengan keyboard'],['M','Senyap'],['Esc','Tutup pilihan atau selesaikan kartu']],
  admin:{path:'admin.html',login:'PIN = ADMIN_PIN'},loginRoutes:['/api/login'],resultRoutes:['/api/play'],
  extract(_route,json){return heartMomentCard(json?.host,json?.service);},
  cards(state){
   const named=(list,id)=>({id,name:list?.find(item=>item.id===id)?.name});
   if(Array.isArray(state.cards)&&state.cards.length)return state.cards.map(card=>heartMomentCard(named(state.hosts,card.hostId),named(state.services,card.serviceId),card.name)).filter(Boolean);
   return state.hosts.flatMap(host=>state.services.map(service=>heartMomentCard(host,service))).filter(Boolean);
  }
 }
];

module.exports={GAMES,EVENTS,rarityOf,heartMomentImage,HEART_HOST_IDS,HEART_SERVICE_IDS};
