(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AdminCharts=api;})(this,function(){
 'use strict';
 function activity(history,now=Date.now()){
  const hour=3600000,end=Math.floor(now/hour)*hour,start=end-11*hour;
  const bins=Array.from({length:12},(_,i)=>({at:start+i*hour,wheel:0,boxes:0}));
  for(const row of history){const t=Date.parse(row.at);if(!Number.isFinite(t)||t<start||t>now)continue;const i=Math.floor((t-start)/hour);if(bins[i])bins[i][row.game==='boxes'?'boxes':'wheel']++;}
  return bins;
 }
 function gameCounts(history){return history.reduce((s,h)=>{s[h.game==='boxes'?'boxes':'wheel']++;return s;},{wheel:0,boxes:0});}
 function issued(history){return history.reduce((s,h)=>{if(h.prize.tier!=='zonk')s[h.prize.tier]=(s[h.prize.tier]||0)+1;return s;},{grand:0,bundling:0,voucher:0,product:0});}
 return {activity,gameCounts,issued};
});
