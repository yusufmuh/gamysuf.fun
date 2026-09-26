'use strict';
const { defaultPrizes } = require('./legacy-catalog.cjs');

// Upgrade only recognizable old starting quantities. Customized inventories and
// already-issued prizes must never be silently reset during an application update.
function upgradeInventory(state) {
  if (state.inventoryVersion >= 2) return null;
  const next = structuredClone(state);
  const defaults = defaultPrizes().filter(p=>p.tier!=='grand');
  const awarded = new Map();
  for (const row of state.history) {
    if (row.prize.tier !== 'zonk') awarded.set(row.prize.id, (awarded.get(row.prize.id) || 0) + 1);
  }
  const oldStock = p => p.tier === 'bundling' ? 5 : p.tier === 'product' ? 2 : p.id === 'voucher-100000' ? 6 : 7;
  const recognizable = state.prizes.length === defaults.length && defaults.every(p => {
    const current = state.prizes.find(item => item.id === p.id);
    return current && current.tier === p.tier && current.stock === oldStock(p) - (awarded.get(p.id) || 0);
  });
  if (recognizable) {
    for (const p of next.prizes) {
      const initial = defaults.find(item => item.id === p.id);
      p.stock = initial.stock - (awarded.get(p.id) || 0);
      if (p.tier === 'voucher' && p.note.startsWith('Pembagian sementara')) p.note = initial.note;
    }
  }
  next.inventoryVersion = 2;
  next.revision++;
  next.audit.push({ at: new Date().toISOString(), action: recognizable ? 'inventory-definition-265-applied' : 'custom-inventory-preserved-on-upgrade' });
  return next;
}
function upgradePlayground(state){
 if(state.inventoryVersion>=3)return null;
 const next=structuredClone(state),grand=defaultPrizes().find(p=>p.tier==='grand');
 const canAdd=!next.prizes.some(p=>p.id===grand.id)&&next.prizes.length<24;
 if(canAdd)next.prizes.unshift(grand);
 const bundle=next.prizes.find(p=>p.id==='bundle');
 if(bundle&&bundle.variant==='Hadiah utama'){bundle.variant='Paket skincare';bundle.name='Bundling';}
 next.settings.grand??=.2;next.settings.confirmed=false;
 if(!next.pending)next.settings.mode='demo';
 next.inventoryVersion=3;next.revision++;
 next.audit.push({at:new Date().toISOString(),action:'playground-v3-upgraded',grandAdded:canAdd,requiresConfirmation:true});
 return next;
}
function upgradePestaFolkaV5(state){
 if(state.campaignId!=='pesta-folka-2026'||(state.inventoryVersion||0)>=5)return null;
 const {prizes,settings}=require('./folka.cjs'),next=structuredClone(state),awarded=new Map();
 for(const h of next.history)if(h.prize?.tier!=='zonk')awarded.set(h.prize.id,(awarded.get(h.prize.id)||0)+1);
 next.prizes=prizes().map(p=>({...p,stock:Math.max(0,p.stock-(awarded.get(p.id)||0))}));
 next.settings={...settings,...next.settings,minPurchase:0};
 next.inventoryVersion=5;next.revision++;
 next.audit.push({at:new Date().toISOString(),action:'pesta-folka-catalog-v5-applied',stock:next.prizes.reduce((n,p)=>n+p.stock,0),purchaseVerification:false});
 return next;
}
module.exports = { upgradeInventory,upgradePlayground,upgradePestaFolkaV5 };

