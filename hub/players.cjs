'use strict';

/* Profil pemain hub: XP, level, streak harian, misi harian, lencana, album
   kartu, dan papan peringkat. Semua dihitung dari hasil permainan yang
   melewati gateway (bukan laporan browser), dengan batas XP harian agar
   peringkat tetap adil. Identitas = cookie pengunjung acak; kode pemulihan
   memungkinkan pemain memindahkan profil ke perangkat lain. */
const fs=require('node:fs');
const path=require('node:path');

const DAY_FORMAT=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'});
const dayKey=ms=>DAY_FORMAT.format(new Date(ms));
const shiftDay=(key,days)=>{const date=new Date(`${key}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);};
function weekKey(ms){
 const date=new Date(`${dayKey(ms)}T00:00:00Z`);
 date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
 return date.toISOString().slice(0,10);
}

const XP={play:10,zonk:5,newCard:25,legendary:50,dailyFirst:20,badge:30};
const DAILY_PLAY_CAP=60;
const AVATARS=['wave','peek','wink','bag','stand','heart'];
const MISSIONS=[
 {id:'play-3',title:'Main 3 kali',goal:3,xp:30,metric:daily=>daily.plays},
 {id:'two-games',title:'Coba 2 game berbeda',goal:2,xp:40,metric:daily=>daily.games.length},
 {id:'new-card',title:'Dapat 1 kartu baru',goal:1,xp:50,metric:daily=>daily.newCards}
];
const BADGES=[
 {id:'first-play',name:'Langkah Pertama',detail:'Main untuk pertama kali.'},
 {id:'tri-arena',name:'Tiga Arena',detail:'Mainkan ketiga game Bpedia.'},
 {id:'collector-5',name:'Kolektor Pemula',detail:'Kumpulkan 5 kartu berbeda.'},
 {id:'collector-15',name:'Kolektor Sejati',detail:'Kumpulkan 15 kartu berbeda.'},
 {id:'collector-all',name:'Kolektor Legendaris',detail:'Lengkapi seluruh album kartu.'},
 {id:'lucky',name:'Hoki Besar',detail:'Dapatkan kartu legendaris.'},
 {id:'fan',name:'Tamu Spesial',detail:'Dapatkan kartu fanservice.'},
 {id:'streak-3',name:'Api Menyala',detail:'Main 3 hari berturut-turut.'},
 {id:'streak-7',name:'Setia Seminggu',detail:'Main 7 hari berturut-turut.'},
 {id:'marathon',name:'Maraton',detail:'Main 50 kali.'},
 {id:'mission-master',name:'Misi Tuntas',detail:'Selesaikan semua misi harian dalam sehari.'}
];
const BLOCKED=['anjing','bangsat','babi','kontol','memek','ngentot','goblok','tolol','jancok','pepek','titit','fuck','shit','bitch','asshole'];

/* Gelar pemain per rentang level: memberi tujuan jangka panjang yang terlihat
   di chip profil dan papan peringkat. */
const TITLES=[[1,'Pendatang Baru'],[3,'Pemburu Hoki'],[5,'Kolektor Muda'],[8,'Bintang Arcade'],[12,'Master Kapsul'],[16,'Legenda Bpedia']];
const titleFor=level=>TITLES.reduce((title,[min,name])=>level>=min?name:title,TITLES[0][1]);
const nextTitle=level=>TITLES.find(([min])=>min>level)||null;
const ACTIVITY_LIMIT=24;

function levelFor(xp){
 let level=1,need=100,rest=xp;
 while(rest>=need){rest-=need;level++;need=100+(level-1)*50;}
 return {level,into:rest,need};
}

function validNickname(value){
 if(typeof value!=='string')return null;
 const trimmed=value.trim().replace(/\s+/g,' ');
 if(trimmed.length<2||trimmed.length>20||!/^[\p{L}\p{N} ._-]+$/u.test(trimmed))return null;
 const plain=trimmed.toLowerCase().replace(/[^a-z]/g,'');
 if(BLOCKED.some(word=>plain.includes(word)))return null;
 return trimmed;
}

const displayName=player=>player.nickname||`Tamu #${player.id.slice(-4).toUpperCase()}`;

/* Progres setiap lencana (current/goal). Dipakai untuk membuka lencana saat
   hasil tercatat dan untuk menampilkan "hampir dapat" di beranda. */
function badgeProgress(player,{totalCards=0,builtinSlugs=[]}={}){
 const owned=Object.values(player.cards);
 const count=owned.length;
 const has=rarity=>owned.some(card=>card.rarity===rarity)?1:0;
 const played=builtinSlugs.filter(game=>player.playsByGame[game]).length;
 return {
  'first-play':{current:Math.min(player.plays,1),goal:1},
  'tri-arena':{current:played,goal:builtinSlugs.length},
  'collector-5':{current:Math.min(count,5),goal:5},
  'collector-15':{current:Math.min(count,15),goal:15},
  'collector-all':{current:Math.min(count,totalCards),goal:totalCards},
  'lucky':{current:has('legendary'),goal:1},
  'fan':{current:has('epic'),goal:1},
  'streak-3':{current:Math.min(player.streak.count,3),goal:3},
  'streak-7':{current:Math.min(player.streak.count,7),goal:7},
  'marathon':{current:Math.min(player.plays,50),goal:50},
  'mission-master':{current:player.daily.done.length,goal:MISSIONS.length}
 };
}

class Players{
 constructor(file,{now=()=>Date.now()}={}){
  this.file=file;
  this.now=now;
  this.timer=null;
  fs.mkdirSync(path.dirname(file),{recursive:true});
  let data={players:{}};
  if(fs.existsSync(file)){
   try{data=JSON.parse(fs.readFileSync(file,'utf8'));}
   catch{fs.copyFileSync(file,`${file}.corrupt-${Date.now()}`);data={players:{}};}
  }
  this.players=data.players||{};
  this.activity=[];
  const stale=this.now()-120*24*3600*1000;
  for(const [id,player] of Object.entries(this.players))if(player.lastSeen<stale&&player.xp<100)delete this.players[id];
 }

 save(){
  clearTimeout(this.timer);
  this.timer=setTimeout(()=>this.flush(),1200);
  this.timer.unref?.();
 }

 flush(){
  clearTimeout(this.timer);this.timer=null;
  const tmp=`${this.file}.tmp`;
  fs.writeFileSync(tmp,JSON.stringify({version:1,players:this.players}));
  fs.renameSync(tmp,this.file);
 }

 ensure(id){
  let player=this.players[id];
  if(!player){
   player=this.players[id]={id,nickname:null,avatar:'wave',createdAt:this.now(),lastSeen:this.now(),xp:0,week:{key:weekKey(this.now()),xp:0},plays:0,playsByGame:{},cards:{},badges:{},streak:{count:0,best:0,lastDay:null},daily:{day:dayKey(this.now()),plays:0,games:[],newCards:0,done:[]},feed:[],seen:[]};
  }
  return player;
 }

 roll(player){
  const now=this.now(),day=dayKey(now),week=weekKey(now);
  if(player.daily.day!==day)player.daily={day,plays:0,games:[],newCards:0,done:[]};
  if(player.week.key!==week)player.week={key:week,xp:0};
  player.lastSeen=now;
 }

 setProfile(id,{nickname,avatar}={}){
  const player=this.ensure(id);
  let clean;
  if(nickname!==undefined){
   clean=validNickname(nickname);
   if(!clean)throw Object.assign(new Error('Nama 2-20 karakter (huruf, angka, spasi, titik, garis bawah) dan sopan.'),{status:400});
  }
  if(avatar!==undefined){
   if(!AVATARS.includes(avatar))throw Object.assign(new Error('Avatar tidak dikenal.'),{status:400});
  }
  if(nickname!==undefined)player.nickname=clean;
  if(avatar!==undefined)player.avatar=avatar;
  this.roll(player);
  this.save();
  return player;
 }

 record(id,{slug,outcome,requestKey,totalCards=0,builtinSlugs=[]}){
  if(!outcome)return [];
  const player=this.ensure(id);
  if(player.seen.includes(requestKey))return [];
  player.seen.push(requestKey);
  if(player.seen.length>300)player.seen.splice(0,player.seen.length-300);
  this.roll(player);
  const before=levelFor(player.xp).level,now=this.now(),events=[];
  const add=(xp,text,type)=>{
   if(xp<=0&&type==='xp')return;
   player.xp+=xp;player.week.xp+=xp;
   events.push({at:now,type,text,xp});
  };
  const daily=player.daily;
  if(daily.plays===0){
   const yesterday=shiftDay(daily.day,-1);
   player.streak.count=player.streak.lastDay===yesterday?player.streak.count+1:player.streak.lastDay===daily.day?player.streak.count:1;
   player.streak.lastDay=daily.day;
   player.streak.best=Math.max(player.streak.best,player.streak.count);
   add(XP.dailyFirst,`Bonus harian · streak ${player.streak.count} hari`,'streak');
  }
  daily.plays++;player.plays++;
  player.playsByGame[slug]=(player.playsByGame[slug]||0)+1;
  if(!daily.games.includes(slug))daily.games.push(slug);
  if(daily.plays<=DAILY_PLAY_CAP)add(outcome.zonk?XP.zonk:XP.play,outcome.zonk?'Belum beruntung, tetap dapat XP':'Main',"xp");
  if(outcome.cardId){
   const key=`${slug}:${outcome.cardId}`;
   const card=player.cards[key];
   if(card)card.count++;
   else{
    player.cards[key]={game:slug,name:outcome.name,image:outcome.image,rarity:outcome.rarity,count:1,first:now};
    daily.newCards++;
    add(XP.newCard,`Kartu baru: ${outcome.name}`,'card');
    if(outcome.rarity==='legendary')add(XP.legendary,'Kartu legendaris!','card');
   }
  }
  for(const mission of MISSIONS){
   if(!daily.done.includes(mission.id)&&mission.metric(daily)>=mission.goal){
    daily.done.push(mission.id);
    add(mission.xp,`Misi selesai: ${mission.title}`,'mission');
   }
  }
  const progress=badgeProgress(player,{totalCards,builtinSlugs});
  for(const badge of BADGES){
   const {current,goal}=progress[badge.id];
   if(goal>0&&current>=goal&&!player.badges[badge.id]){
    player.badges[badge.id]=now;
    add(XP.badge,`Lencana baru: ${badge.name}`,'badge');
   }
  }
  const after=levelFor(player.xp).level;
  if(after>before)events.push({at:now,type:'level',text:`Naik ke level ${after}!`,xp:0});
  const highlight=events.find(event=>event.type==='card'&&/legendaris/i.test(event.text))
   ?`dapat kartu legendaris ${outcome.name}`
   :events.some(event=>event.type==='card')&&outcome.rarity==='epic'?`dapat kartu epik ${outcome.name}`
   :after>before&&after%5===0?`naik ke level ${after} · ${titleFor(after)}`
   :player.badges['collector-all']===now?'melengkapi seluruh album!':null;
  if(highlight){
   this.activity.push({at:now,game:slug,name:displayName(player),avatar:player.avatar,text:highlight});
   if(this.activity.length>ACTIVITY_LIMIT)this.activity.splice(0,this.activity.length-ACTIVITY_LIMIT);
  }
  player.feed.push(...events);
  if(player.feed.length>40)player.feed.splice(0,player.feed.length-40);
  this.save();
  return events;
 }

 view(id,{since=0,totalCards=0,builtinSlugs=[]}={}){
  const player=this.ensure(id);
  this.roll(player);
  const level=levelFor(player.xp);
  const today=player.daily;
  const alive=player.streak.lastDay===today.day||player.streak.lastDay===shiftDay(today.day,-1);
  const progress=badgeProgress({...player,streak:{...player.streak,count:alive?player.streak.count:0}},{totalCards,builtinSlugs});
  const upcoming=nextTitle(level.level);
  return {
   id:player.id,
   tag:player.id.slice(-4).toUpperCase(),
   nickname:player.nickname,
   avatar:player.avatar,
   xp:player.xp,
   weekXp:player.week.xp,
   level:level.level,
   levelInto:level.into,
   levelNeed:level.need,
   title:titleFor(level.level),
   nextTitle:upcoming?{level:upcoming[0],title:upcoming[1]}:null,
   plays:player.plays,
   playsByGame:player.playsByGame,
   streak:{count:alive?player.streak.count:0,best:player.streak.best,playedToday:today.plays>0},
   missions:MISSIONS.map(mission=>({id:mission.id,title:mission.title,goal:mission.goal,xp:mission.xp,progress:Math.min(mission.goal,mission.metric(today)),done:today.done.includes(mission.id)})),
   dailyCapLeft:Math.max(0,DAILY_PLAY_CAP-today.plays),
   today:{plays:today.plays,games:[...today.games]},
   badges:BADGES.map(badge=>({...badge,unlockedAt:player.badges[badge.id]||null,...progress[badge.id]})),
   cards:Object.entries(player.cards).map(([key,card])=>({key,...card})),
   feed:player.feed.filter(event=>event.at>since)
  };
 }

 leaderboard(range='week',id=null,limit=20){
  const week=weekKey(this.now());
  const score=player=>range==='week'?(player.week.key===week?player.week.xp:0):player.xp;
  const rows=Object.values(this.players).filter(player=>score(player)>0).sort((a,b)=>score(b)-score(a)||Object.keys(b.cards).length-Object.keys(a.cards).length||a.createdAt-b.createdAt);
  const shape=(player,index)=>{const level=levelFor(player.xp).level;return {rank:index+1,name:displayName(player),avatar:player.avatar,level,title:titleFor(level),score:score(player),cards:Object.keys(player.cards).length,you:player.id===id};};
  const top=rows.slice(0,limit).map(shape);
  const index=id?rows.findIndex(player=>player.id===id):-1;
  return {range,top,you:index>=limit?shape(rows[index],index):null,players:rows.length};
 }

 has(id){return Boolean(this.players[id]);}

 recent(limit=8){return this.activity.slice(-limit).reverse().map(item=>({...item}));}

 stats(){
  const today=dayKey(this.now());
  const players=Object.values(this.players);
  const active=players.filter(player=>player.daily.day===today&&player.daily.plays>0);
  const byGame={};
  for(const player of players)for(const [game,count] of Object.entries(player.playsByGame))byGame[game]=(byGame[game]||0)+count;
  return {players:players.length,activeToday:active.length,playsToday:active.reduce((sum,player)=>sum+player.daily.plays,0),plays:players.reduce((sum,player)=>sum+player.plays,0),byGame};
 }
}

module.exports={Players,levelFor,titleFor,validNickname,dayKey,weekKey,AVATARS,MISSIONS,BADGES,XP,DAILY_PLAY_CAP};
