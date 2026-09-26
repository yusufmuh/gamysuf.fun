(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GameRules=api;})(this,function(){
 'use strict';
 const MYSTERY={id:'beauty-box',name:'Mystery Box',fullName:'Beauty Box Mystery',tier:'bonus',brand:'BPEDIA',variant:'Kesempatan terakhir · tanpa zonk',image:'',stock:null,description:'Pilih satu dari tiga kotak. Peluang hadiah utama dan bundling meningkat, tanpa zonk.'};
 function distribution(state,bonus=false){
  const available=state.prizes.filter(p=>p.enabled&&p.stock>0),stock=t=>available.filter(p=>p.tier===t).reduce((s,p)=>s+p.stock,0),s=state.settings,count=stock('bundling');
  const cap=count>=5?s.bundle:({4:1.5,3:1,2:.3,1:.1,0:0}[count]);
  const baseBundle=Math.min(s.bundle,cap),baseGrand=stock('grand')?(s.grand??.2):0;
  const grand=bonus?Math.min(40,baseGrand*(s.bonusGrandMultiplier??10)):baseGrand,bundling=bonus?Math.min(50,baseBundle*(s.bonusBundleMultiplier??6)):baseBundle;
  const zonk=bonus?0:s.zonk,mystery=bonus?0:(s.mystery??0),vw=stock('voucher')?s.voucherWeight:0,pw=stock('product')?s.productWeight:0;
  if(!vw&&!pw)return {grand:0,bundling:0,zonk:0,mystery:0,voucher:0,product:0,paused:true,reason:'Hadiah reguler habis atau bobotnya nol. Isi stok / bobot di admin sebelum melanjutkan.'};
  const remainder=100-grand-bundling-zonk-mystery;
  return {grand,bundling,zonk,mystery,voucher:remainder*vw/(vw+pw),product:remainder*pw/(vw+pw),paused:false};
 }
 function finalDistribution(state){const a=distribution(state),b=distribution(state,true);if(a.paused)return a;return {...a,grand:a.grand+a.mystery*b.grand/100,bundling:a.bundling+a.mystery*b.bundling/100,voucher:a.voucher+a.mystery*b.voucher/100,product:a.product+a.mystery*b.product/100,mystery:0};}
 // This RNG only arranges the display. It never participates in drawing a prize.
 function layoutRandom(seed){
  let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
 }
 function scatter(items,seed){
  const n=items.length;if(n<2)return items;
  const rng=layoutRandom(seed),pairs=[],family=p=>/eyebrow|fa73/.test(p.id)?'brow':/spon-/.test(p.id)?'sponge':null;
  const voucher=p=>p.tier==='voucher'||p.tier==='grand',hero=p=>['grand','bundling','bonus'].includes(p.tier);
  const voucherGap=Math.min(3,Math.floor(n/Math.max(1,items.filter(voucher).length))),heroGap=Math.min(3,Math.floor(n/Math.max(1,items.filter(hero).length)));
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
   const a=items[i],b=items[j];let gap=0,weight=0;
   if(a.id===b.id){gap=Math.max(1,Math.floor(n/3));weight=12;}
   else if(a.tier==='bundling'&&b.tier==='bundling'){gap=Math.max(1,Math.floor(n/3));weight=10;}
   else if(voucher(a)&&voucher(b)){gap=voucherGap;weight=5;}
   else if(hero(a)&&hero(b)){gap=heroGap;weight=3;}
   else if(family(a)&&family(a)===family(b)){gap=Math.min(2,Math.floor(n/2));weight=4;}
   if(gap>1)pairs.push([i,j,gap,weight]);
  }
  const score=order=>{const pos=[];order.forEach((v,i)=>pos[v]=i);let total=0;for(const [a,b,gap,w] of pairs){const d=Math.abs(pos[a]-pos[b]),short=Math.max(0,gap-Math.min(d,n-d));total+=short*short*w;}return total;};
  let best,bestScore=Infinity;
  // Bounded search also handles custom catalogs whose spacing constraints cannot all fit.
  for(let attempt=0;attempt<8;attempt++){
   let order=Array.from({length:n},(_,i)=>i);
   for(let i=n-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
   let cost=score(order);
   for(let step=0;step<900;step++){
    if(cost<bestScore){best=order.slice();bestScore=cost;}if(!cost)return order.map(i=>items[i]);
    const a=Math.floor(rng()*n),b=Math.floor(rng()*n);if(a===b)continue;
    [order[a],order[b]]=[order[b],order[a]];const next=score(order),temperature=2.5*(1-step/900)+.05;
    if(next<=cost||rng()<Math.exp((cost-next)/temperature))cost=next;else [order[a],order[b]]=[order[b],order[a]];
   }
   if(cost<bestScore){best=order.slice();bestScore=cost;}
  }
  return best.map(i=>items[i]);
 }
 function wheel(prizes,odds,zonk,seed='bpedia'){
  const items=prizes.filter(p=>p.enabled&&p.stock>0&&odds[p.tier]>0).map(p=>({...p}));
  if(odds.mystery>0)items.splice(Math.min(3,items.length),0,{...MYSTERY});
  if(odds.zonk>0)items.push({...zonk});
  for(const id of ['salsa-vinilash','zonk']){const at=items.findIndex(p=>p.id===id);if(at<0)continue;items.splice((at+Math.ceil(items.length/2))%items.length,0,{...items[at]});}
  return scatter(items,seed);
 }
 return {distribution,finalDistribution,wheel,MYSTERY};
});
