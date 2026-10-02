'use strict';

// Shared by the arcade home and /market-in. Event dates follow WIB because the booths are in Jakarta.
(()=>{
 const today=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
 const dayDiff=(from,to)=>Math.round((Date.parse(to)-Date.parse(from))/86400000);
 function status(event,now=today()){
  if(!event?.startDate||!event?.endDate)return {phase:'unknown',label:''};
  if(now<event.startDate){const days=dayDiff(now,event.startDate);return {phase:'soon',label:days===1?'Mulai besok':`${days} hari lagi`};}
  if(now<=event.endDate)return {phase:'live',label:now===event.endDate?'Hari terakhir':now===event.startDate?'Hari pertama':'Sedang berlangsung'};
  return {phase:'done',label:'Event selesai'};
 }
 const shortTitle=title=>String(title||'').replace(/^Bipy\s+/,'');
 const dayRange=event=>{
  const days=Array.isArray(event?.schedule)?event.schedule:[];
  return days.length>1?`${days[0].day}–${days.at(-1).day}, ${event.dates}`:String(event?.dates||'');
 };
 const kicker=game=>String(game?.mechanic||'').split(' · ')[0];
 window.GamysufEvent=Object.freeze({today,status,shortTitle,dayRange,kicker});
})();
