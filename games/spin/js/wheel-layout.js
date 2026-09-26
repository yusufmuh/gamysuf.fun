(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WheelLayout=api;})(this,function(){
 'use strict';
 const labels={
  'beauty-box':['MYSTERY','BOX'],'bundle-1':['Bundling','PAKET 1'],'bundle-3':['Bundling','PAKET 3'],
  'salsa-eyebrow-guru':['GURU','4 IN 1'],'salsa-remover':['REMOVER','40 ML'],'salsa-spon-basah':['SPON','BASAH'],
  'salsa-eyebrow-black':['ALIS','BLACK'],'salsa-eyebrow-ash':['ALIS','ASH'],'salsa-spon-mandi':['SPON','MANDI'],
  'focallure-fa73':['BRUSH','FA73'],'masker-bioaqua':['MASKER','BIOAQUA'],
  'bundle':['Bundling',''],'powder-000':['POWDER','000'],'powder-222':['POWDER','222'],
  'foundation-04':['FA30','04'],'foundation-03':['FA30','03'],'duo-m03':['DUO LIP','M03'],
  'salsa-vinilash':['VINYLASH','SALSA'],'stick-hs03':['STICK','HS03'],
  'creamy-oroi':['GLOSS','OR01*'],'creamy-rdoi':['GLOSS','RD01*'],'lip-oil':['LIP OIL','PF-L12']
 };
 function caption(p){
  if(p.tier==='zonk')return ['ZONK',''];
  if(['grand','voucher'].includes(p.tier))return [p.discount<100?`${p.discount}%`:p.discount>=1000000?`${Number((p.discount/1000000).toPrecision(3))}jt`:p.discount>=1000?`${Number((p.discount/1000).toPrecision(3))}rb`:`Rp${p.discount}`,p.tier==='grand'?'UTAMA':'VOUCHER'];
  if(labels[p.id])return labels[p.id];
  const short=s=>Array.from(String(s||'').toUpperCase()).slice(0,7).join('');
  return [short(p.name),short(p.variant)];
 }
 function geometry(count){
  const height=22,radius=34.8,inner=radius-height/2;
  const width=count<=2?18:Math.min(18,2*inner*Math.tan(Math.PI/count)*.86);
  return {width,height,radius,font:Math.min(2.05,width*.205)};
 }
 return {caption,geometry};
});
