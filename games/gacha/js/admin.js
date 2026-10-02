'use strict';

const $=id=>document.getElementById(id);
const tierMeta={
 bundling:{label:'Bundling utama',color:'#d4a12e'},
 collab:{label:'Kolab karakter',color:'#2f8fd6'},
 voucher:{label:'Voucher belanja',color:'#14745d'},
 product:{label:'Produk gratis',color:'#f7729a'},
 empty:{label:'Kapsul kosong',color:'#9c7e8a'}
};
const tiers=Object.keys(tierMeta);
let data=null,toastTimer=null,activePrizeId=null,refreshTimer=null,capsulesDirty=false,settingsDirty=false,previewUrl=null;

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const formatDate=value=>new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
const seconds=ms=>`${(ms/1000).toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:2})} dtk`;
const holdLabel=value=>Number(value)?`${value} dtk`:'manual';

async function api(route,body){
 const options={headers:{'Content-Type':'application/json','x-bpedia-client':'gachapop'}};
 if(body!==undefined){options.method='POST';options.body=JSON.stringify(body);}
 const response=await fetch(route,options);
 let output;
 try{output=await response.json();}catch{output={error:'Respons server tidak dapat dibaca.'};}
 if(!response.ok){const error=new Error(output.error||'Permintaan gagal.');error.status=response.status;throw error;}
 return output;
}

function toast(message,type='normal'){
 const element=$('toast');element.textContent=message;element.style.background=type==='error'?'#8f211d':type==='success'?'#176d51':'#35232a';element.classList.add('visible');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove('visible'),2800);
}

function handleError(error){
 if(error.status===401){$('adminView').hidden=true;$('loginView').hidden=false;$('loginError').textContent=error.message;$('pin').focus();clearInterval(refreshTimer);}
 else toast(error.message,'error');
}

async function refresh({quiet=false}={}){
 try{data=await api('/api/admin/state');render();if(!quiet)toast('Data dashboard diperbarui.','success');}
 catch(error){handleError(error);throw error;}
}

function render(){
 renderHeader();renderSummary();
 if(!document.activeElement?.matches('[data-stock-input]'))renderInventory();
 if(!capsulesDirty)renderCapsules();
 renderHistory();renderRanking();
 if(!settingsDirty)renderSettings();
}

function renderHeader(){
 $('adminEventName').textContent=data.settings.eventName;
 $('adminMode').textContent=data.settings.mode==='live'?'PERMAINAN RESMI':'MODE DEMO';
 $('adminMode').classList.toggle('live',data.settings.mode==='live');
 $('adminPause').hidden=!data.settings.paused;
 $('adminRevision').textContent=`DATA R${data.revision}`;
}

const statusLabel=item=>item.status==='empty'?'Kapsul kosong':item.status==='claimed'?'Diserahkan':'Belum diserahkan';

function renderSummary(){
 const stats=data.stats;
 const unverified=data.prizes.filter(prize=>prize.enabled&&!prize.imageChecked);
 $('statPlays').textContent=stats.plays;$('statWon').textContent=stats.won;$('statClaimedNote').textContent=`${stats.claimed} sudah diserahkan`;
 $('statZonk').textContent=stats.empty;
 $('statPhotos').textContent=unverified.length;
 $('statCapsules').textContent=data.capsules.total;$('statCapsuleNote').textContent=`${data.capsules.prize} berhadiah · ${data.capsules.empty} kosong`;
 $('donutValue').textContent=data.capsules.total;
 const total=Math.max(1,data.capsules.total);
 let cursor=0;const stops=[];
 for(const tier of tiers){const start=cursor;cursor+=data.capsules.byTier[tier]/total*100;stops.push(`${tierMeta[tier].color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`);}
 $('stockDonut').style.background=data.capsules.total?`conic-gradient(${stops.join(',')})`:'#f1e4e8';
 $('stockLegend').innerHTML=tiers.map(tier=>`<div class="legend-row" style="--legend:${tierMeta[tier].color}"><i></i><span>${esc(tierMeta[tier].label)}</span><b>${data.capsules.byTier[tier]}</b></div>`).join('');

 const byHour=new Map();
 for(const item of data.history){const date=new Date(item.at);date.setMinutes(0,0,0);const key=date.toISOString();byHour.set(key,(byHour.get(key)||0)+1);}
 const hours=[...byHour.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12),max=Math.max(1,...hours.map(entry=>entry[1]));
 $('hourChart').innerHTML=hours.length?hours.map(([key,value])=>{const date=new Date(key);return `<div class="hour-bar" style="--bar-height:${Math.max(4,Math.round(value/max*100))}%"><b>${value}</b><small>${String(date.getHours()).padStart(2,'0')}:00</small></div>`;}).join(''):'<div class="empty-state" style="width:100%;align-self:center">Belum ada aktivitas mode resmi.</div>';
 $('summaryTiers').innerHTML=tiers.slice(0,-1).map(tier=>{
  const issued=data.history.filter(item=>item.prize.tier===tier).length;
  return `<div class="effective-card"><small>${esc(tierMeta[tier].label)}</small><strong>${issued} keluar · ${data.capsules.byTier[tier]} di mesin</strong></div>`;
 }).join('');

 const warnings=[];
 const depleted=data.prizes.filter(prize=>prize.enabled&&prize.stock===0);
 const low=data.prizes.filter(prize=>prize.enabled&&prize.stock!==null&&prize.stock>0&&prize.stock<=3);
 const unclaimed=data.history.filter(item=>item.status==='unclaimed');
 if(data.settings.mode==='demo')warnings.push(['Mode demo aktif','Permainan tidak mengurangi stok dan tidak tercatat.','warning-item']);
 if(data.settings.paused)warnings.push(['Permainan dijeda','Layar game tidak menerima permainan baru.','warning-item danger']);
 if(!data.capsules.prize)warnings.push(['Kapsul hadiah habis','Isi ulang stok; mesin menolak permainan baru.','warning-item danger']);
 if(unverified.length)warnings.push([`${unverified.length} foto belum diverifikasi`,`${unverified.slice(0,3).map(prize=>prize.name).join(', ')}${unverified.length>3?', …':''}. Unggah foto asli lalu centang Foto dicek.`,'warning-item danger']);
 if(depleted.length)warnings.push([`${depleted.length} hadiah stok nol`,'Kapsulnya sudah otomatis keluar dari mesin.','warning-item']);
 if(low.length)warnings.push([`${low.length} hadiah hampir habis`,'Masing-masing tersisa 3 unit atau kurang.','warning-item']);
 if(unclaimed.length)warnings.push([`${unclaimed.length} hadiah belum diserahkan`,'Cocokkan kode GP- di tab Riwayat & Klaim.','warning-item danger']);
 if(!warnings.length)warnings.push(['Semua siap','Tidak ada perhatian operasional saat ini.','warning-item success']);
 $('warningList').innerHTML=warnings.map(([title,detail,className])=>`<div class="${className}"><b>${esc(title)}</b><br>${esc(detail)}</div>`).join('');
}

function filteredPrizes(){
 const query=$('inventorySearch').value.trim().toLocaleLowerCase('id');
 if(!query)return data.prizes;
 return data.prizes.filter(prize=>[prize.name,prize.fullName,tierMeta[prize.tier]?.label,prize.terms,prize.brand].some(value=>String(value||'').toLocaleLowerCase('id').includes(query)));
}

function renderInventory(){
 const tbody=$('inventoryTable').querySelector('tbody'),prizes=filteredPrizes();
 tbody.innerHTML=prizes.length?prizes.map(prize=>{
  const capsules=data.capsules.byPrize[prize.id]||0;
  return `<tr data-prize-row="${esc(prize.id)}"><td><img src="${esc(prize.image)}" alt="Foto ${esc(prize.name)}"></td><td class="table-prize"><b>${esc(prize.fullName)}</b><small>${esc(prize.terms||'Belum ada ketentuan')}</small></td><td>${esc(tierMeta[prize.tier]?.label||prize.tier)}<br><small>${prize.points} poin</small></td><td><div class="stock-control"><button type="button" class="tiny-button" data-step-stock="${esc(prize.id)}" data-step="-1" aria-label="Kurangi stok ${esc(prize.name)}" ${prize.stock===null||prize.stock===0?'disabled':''}>−</button><input aria-label="Stok ${esc(prize.name)}" type="number" min="0" max="10000" step="1" value="${prize.stock===null?'':prize.stock}" data-stock-input="${esc(prize.id)}" ${prize.stock===null?'disabled':''}><button type="button" class="tiny-button" data-step-stock="${esc(prize.id)}" data-step="1" aria-label="Tambah stok ${esc(prize.name)}" ${prize.stock===null||prize.stock>=10000?'disabled':''}>＋</button><button class="tiny-button primary" type="button" data-save-stock="${esc(prize.id)}">Simpan</button><button class="tiny-button" type="button" data-toggle-unlimited="${esc(prize.id)}">${prize.stock===null?'Batasi':'∞'}</button></div><small>${prize.stock===null?'tak terbatas':`${prize.stock} unit`} · ${capsules} kapsul di mesin</small></td><td><label class="switch"><input type="checkbox" data-toggle-enabled="${esc(prize.id)}" ${prize.enabled?'checked':''}> ${prize.enabled?'Aktif':'Nonaktif'}</label></td><td><label class="switch"><input type="checkbox" data-toggle-checked="${esc(prize.id)}" ${prize.imageChecked?'checked':''}> ${prize.imageChecked?'Dicek':'Belum'}</label></td><td><button class="tiny-button" type="button" data-edit-prize="${esc(prize.id)}">Edit &amp; foto</button></td></tr>`;
 }).join(''):'<tr><td colspan="7"><div class="empty-state">Tidak ada hadiah yang cocok dengan pencarian.</div></td></tr>';
}

/* Pratinjau dihitung ulang dari form agar petugas melihat efek angka sebelum
   menyimpan. Rumusnya sama dengan core/engine.cjs → capsules(). */
function previewCapsules(openCapsules,emptyCapsules){
 const byTier=Object.fromEntries(tiers.map(tier=>[tier,0]));
 for(const prize of data.prizes){
  if(!prize.enabled||(prize.stock!==null&&prize.stock<=0))continue;
  byTier[prize.tier]+=prize.stock===null?openCapsules:prize.stock;
 }
 const prize=tiers.slice(0,-1).reduce((sum,tier)=>sum+byTier[tier],0);
 byTier.empty=prize>0?emptyCapsules:0;
 return {byTier,prize,total:prize+byTier.empty};
}

function renderCapsules(){
 $('setOpenCapsules').value=data.settings.openCapsules;
 $('setEmptyCapsules').value=data.settings.emptyCapsules;
 $('setDuration').value=data.settings.duration;$('durationValue').textContent=seconds(data.settings.duration);
 $('setResultHold').value=data.settings.resultHold;$('resultHoldValue').textContent=holdLabel(data.settings.resultHold);
 updateCapsulePreview();
}

function updateCapsulePreview(){
 const open=Number($('setOpenCapsules').value),empty=Number($('setEmptyCapsules').value);
 const valid=Number.isInteger(open)&&open>=0&&open<=500&&Number.isInteger(empty)&&empty>=0&&empty<=1000;
 $('saveCapsules').disabled=!valid;
 if(!valid){$('capsulePreview').innerHTML='<div class="effective-card"><small>Periksa angka</small><strong>0-500 dan 0-1.000</strong></div>';return;}
 const pool=previewCapsules(open,empty);
 $('capsulePreview').innerHTML=tiers.map(tier=>`<div class="effective-card"><small>${esc(tierMeta[tier].label)}</small><strong>${pool.byTier[tier]} kapsul</strong></div>`).join('')+`<div class="effective-card"><small>Total di mesin</small><strong>${pool.total} kapsul</strong></div>`;
 const missing=tiers.slice(0,-1).filter(tier=>!pool.byTier[tier]);
 $('capsuleWarning').innerHTML=!pool.prize?'<div class="warning-item danger">Tidak ada kapsul berhadiah; mesin akan menolak permainan.</div>':missing.length?`<div class="warning-item">Belum ada kapsul untuk: ${missing.map(tier=>esc(tierMeta[tier].label)).join(', ')}.</div>`:'<div class="warning-item success">Semua kelas hadiah ada di mesin.</div>';
}

function filteredHistory(){
 const query=$('historySearch').value.trim().toLocaleLowerCase('id'),status=$('historyStatus').value;
 return [...data.history].reverse().filter(item=>(status==='all'||item.status===status)&&(!query||[item.id,item.username,item.prize.fullName,tierMeta[item.prize.tier]?.label].some(value=>String(value||'').toLocaleLowerCase('id').includes(query))));
}

function renderHistory(){
 const rows=filteredHistory(),tbody=$('historyTable').querySelector('tbody');
 tbody.innerHTML=rows.length?rows.map(item=>{
  const action=item.status==='empty'?'—':`<button class="tiny-button success" type="button" data-claim="${esc(item.id)}" ${item.status==='claimed'?'disabled':''}>${item.status==='claimed'?'Sudah':'Serahkan'}</button>`;
  return `<tr><td><b>${esc(item.id)}</b></td><td>${esc(formatDate(item.at))}</td><td>${esc(item.username)}</td><td class="table-prize"><b>${esc(item.prize.fullName)}</b></td><td>${esc(tierMeta[item.prize.tier]?.label||item.prize.tier)}</td><td><span class="badge ${esc(item.status==='empty'?'zonk':item.status)}">${esc(statusLabel(item))}</span>${item.claimedAt?`<small>${esc(formatDate(item.claimedAt))}</small>`:''}</td><td>${action}</td></tr>`;
 }).join(''):'<tr><td colspan="7"><div class="empty-state">Belum ada riwayat yang sesuai filter.</div></td></tr>';
}

function renderRanking(){
 $('adminLeaderboard').innerHTML=data.leaderboard.length?data.leaderboard.map((row,index)=>`<article class="leader-card"><span class="rank-medal">${index===0?'★':index+1}</span><div><b>${esc(row.username)}</b><small>${row.won} hadiah · ${row.plays} putaran</small></div><strong>${row.points} pt</strong></article>`).join(''):'<div class="empty-state">Belum ada peringkat dari mode resmi.</div>';
}

let previewAudio=null,bgmTesting=false;
function getPreviewAudio(){
 if(!previewAudio&&window.BoothAudio)previewAudio=new window.BoothAudio();
 return previewAudio;
}
function syncPreviewAudio(){
 const audio=getPreviewAudio();
 if(!audio)return;
 audio.configure({sound:true,volume:Number($('setVolume').value),bgmVolume:Number($('setBgmVolume').value),sfxVolume:Number($('setSfxVolume').value),voiceVolume:Number($('setVoiceVolume').value),audioProfile:$('setAudioProfile').value,compressor:$('setCompressor').value});
}

function renderSettings(){
 const s=data.settings;
 $('setEventName').value=s.eventName;$('setMode').value=s.mode;$('setPaused').checked=s.paused;$('setSound').checked=s.sound;
 for(const [id,key] of [['setVolume','volume'],['setBgmVolume','bgmVolume'],['setSfxVolume','sfxVolume'],['setVoiceVolume','voiceVolume']]){$(id).value=s[key];$(id.replace('set','').replace(/^./,c=>c.toLowerCase())+'Value').textContent=`${s[key]}%`;}
 $('setAudioProfile').value=s.audioProfile;$('setCompressor').value=s.compressor;$('setClaimTerms').value=s.claimTerms;
}

function selectTab(name){
 document.querySelectorAll('.tab-button').forEach(button=>{const active=button.dataset.tab===name;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
 document.querySelectorAll('.tab-pane').forEach(pane=>{const active=pane.id===`tab-${name}`;pane.hidden=!active;pane.classList.toggle('active',active);});
}
document.querySelector('.admin-tabs').addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const tabs=[...document.querySelectorAll('.tab-button')],current=tabs.indexOf(event.target);
 if(current<0)return;
 event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 selectTab(tabs[index].dataset.tab);tabs[index].focus();
});

function openPrizeModal(prize=null){
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
 activePrizeId=prize?.id||null;
 $('prizeModalTitle').textContent=prize?'Edit hadiah':'Tambah hadiah';
 $('prizeId').value=prize?.id||'';$('prizeName').value=prize?.name||'';$('prizeFullName').value=prize?.fullName||'';
 $('prizeTier').value=prize?.tier||'product';$('prizeStock').value=prize?.stock??0;$('prizeUnlimited').checked=prize?.stock===null;$('prizeStock').disabled=$('prizeUnlimited').checked;
 $('prizeBrand').value=prize?.brand||'';$('prizeVariant').value=prize?.variant||'';
 $('prizeImage').value='';$('prizePreview').src=prize?.image||'/assets/products/bundling-1.webp';$('prizeImageChecked').checked=prize?.imageChecked||false;
 $('prizeTerms').value=prize?.terms||'';$('prizeEnabled').checked=prize?.enabled||false;$('deletePrize').hidden=!prize;
 $('prizeModal').showModal();
}
function closePrizeModal(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}$('prizeModal').close();activePrizeId=null;}
function readAsDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.addEventListener('load',()=>resolve(reader.result),{once:true});reader.addEventListener('error',()=>reject(new Error('Foto tidak dapat dibaca.')),{once:true});reader.readAsDataURL(file);});}

document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 try{
  if(button.matches('.tab-button')){selectTab(button.dataset.tab);return;}
  if(button.dataset.saveStock){const input=document.querySelector(`[data-stock-input="${button.dataset.saveStock}"]`);if(input.value===''||!Number.isInteger(Number(input.value))){toast('Stok harus berupa angka bulat.','error');return;}data=await api('/api/admin/stock',{id:button.dataset.saveStock,stock:Number(input.value)});render();toast('Stok tersimpan.','success');}
  else if(button.dataset.stepStock){const prize=data.prizes.find(item=>item.id===button.dataset.stepStock);if(prize.stock===null)return;button.disabled=true;data=await api('/api/admin/stock',{id:prize.id,stock:Math.max(0,Math.min(10000,prize.stock+Number(button.dataset.step)))});render();toast('Stok diperbarui.','success');}
  else if(button.dataset.toggleUnlimited){const prize=data.prizes.find(item=>item.id===button.dataset.toggleUnlimited);data=await api('/api/admin/stock',{id:prize.id,stock:prize.stock===null?0:null});render();toast(prize.stock===null?'Stok kini dibatasi 0.':'Stok dibuat tak terbatas.','success');}
  else if(button.dataset.editPrize){openPrizeModal(data.prizes.find(item=>item.id===button.dataset.editPrize));}
  else if(button.dataset.claim){button.disabled=true;data=await api('/api/admin/claim',{id:button.dataset.claim});render();toast('Hadiah ditandai sudah diserahkan.','success');getPreviewAudio()?.activate().then(()=>previewAudio.claimChime());}
 }catch(error){handleError(error);render();}
});

document.addEventListener('change',async event=>{
 try{
  if(event.target.dataset.toggleEnabled){data=await api('/api/admin/prize/update',{id:event.target.dataset.toggleEnabled,patch:{enabled:event.target.checked}});render();toast('Status hadiah diperbarui.','success');}
  else if(event.target.dataset.toggleChecked){data=await api('/api/admin/prize/update',{id:event.target.dataset.toggleChecked,patch:{imageChecked:event.target.checked}});render();toast('Status verifikasi foto diperbarui.','success');}
  else if(['setMode','setPaused','setSound','setAudioProfile','setCompressor'].includes(event.target.id)){settingsDirty=true;syncPreviewAudio();}
 }catch(error){handleError(error);render();}
});

document.addEventListener('input',event=>{
 const target=event.target;
 if(target===$('setOpenCapsules')||target===$('setEmptyCapsules')){capsulesDirty=true;updateCapsulePreview();}
 else if(target===$('setDuration')){capsulesDirty=true;$('durationValue').textContent=seconds(Number(target.value));}
 else if(target===$('setResultHold')){capsulesDirty=true;$('resultHoldValue').textContent=holdLabel(target.value);}
 else if(['setVolume','setBgmVolume','setSfxVolume','setVoiceVolume'].includes(target.id)){settingsDirty=true;$(target.id.replace('set','').replace(/^./,c=>c.toLowerCase())+'Value').textContent=`${target.value}%`;syncPreviewAudio();}
 else if([$('setEventName'),$('setClaimTerms')].includes(target))settingsDirty=true;
 else if(target===$('inventorySearch'))renderInventory();
 else if(target===$('historySearch'))renderHistory();
});
$('historyStatus').addEventListener('change',renderHistory);

$('testBgmBtn').addEventListener('click',async()=>{
 const audio=getPreviewAudio();
 if(!audio){toast('Audio Web API tidak didukung pada peramban ini.','error');return;}
 if(bgmTesting){audio.stopBgm();bgmTesting=false;$('testBgmBtn').textContent='▶ Tes musik BGM';return;}
 syncPreviewAudio();
 $('testBgmBtn').textContent='⏳ Memuat…';
 const started=await audio.startBgm();
 if(started){bgmTesting=true;$('testBgmBtn').textContent='⏹ Berhenti tes musik';toast('Musik BGM diputar untuk uji speaker booth.');}
 else{$('testBgmBtn').textContent='▶ Tes musik BGM';toast('Gagal memutar musik tes. Periksa perangkat audio.','error');}
});
$('testSfxBtn').addEventListener('click',async()=>{const audio=getPreviewAudio();if(!audio)return;syncPreviewAudio();await audio.activate();audio.crank(.9);setTimeout(()=>{audio.pop();audio.win();},900);});
$('testVoiceBtn').addEventListener('click',()=>{const audio=getPreviewAudio();if(!audio)return;syncPreviewAudio();audio.speak('gp-welcome');});
$('resetAudioBtn').addEventListener('click',()=>{
 for(const [id,value] of [['setVolume',74],['setBgmVolume',56],['setSfxVolume',90],['setVoiceVolume',88]]){$(id).value=value;$(id.replace('set','').replace(/^./,c=>c.toLowerCase())+'Value').textContent=`${value}%`;}
 $('setAudioProfile').value='punchy';$('setCompressor').value='gentle';
 settingsDirty=true;syncPreviewAudio();
 toast('Nilai audio disetel ke rekomendasi. Klik Simpan pengaturan.','success');
});

$('doLogin').addEventListener('click',async()=>{
 $('loginError').textContent='';$('doLogin').disabled=true;
 try{await api('/api/login',{pin:$('pin').value});$('loginView').hidden=true;$('adminView').hidden=false;await refresh({quiet:true});refreshTimer=setInterval(()=>refresh({quiet:true}).catch(()=>{}),15000);}
 catch(error){$('loginError').textContent=error.message;}
 finally{$('doLogin').disabled=false;}
});
$('pin').addEventListener('keydown',event=>{if(event.key==='Enter')$('doLogin').click();});
$('doLogout').addEventListener('click',async()=>{try{await api('/api/logout',{});}catch{}location.reload();});
$('refreshSummary').addEventListener('click',()=>refresh());

$('saveCapsules').addEventListener('click',async()=>{
 try{data=await api('/api/admin/settings',{openCapsules:Number($('setOpenCapsules').value),emptyCapsules:Number($('setEmptyCapsules').value),duration:Number($('setDuration').value),resultHold:Number($('setResultHold').value)});capsulesDirty=false;render();toast('Isi kapsul dan waktu tersimpan.','success');}catch(error){handleError(error);}
});

$('saveSettings').addEventListener('click',async()=>{
 const requestedMode=$('setMode').value;
 if(requestedMode==='live'){
  const unverified=data.prizes.filter(prize=>prize.enabled&&!prize.imageChecked);
  if(unverified.length&&!confirm(`${unverified.length} foto hadiah aktif belum diverifikasi. Tetap aktifkan mode resmi?`))return;
 }
 try{data=await api('/api/admin/settings',{eventName:$('setEventName').value.trim(),mode:requestedMode,paused:$('setPaused').checked,sound:$('setSound').checked,volume:Number($('setVolume').value),bgmVolume:Number($('setBgmVolume').value),sfxVolume:Number($('setSfxVolume').value),voiceVolume:Number($('setVoiceVolume').value),audioProfile:$('setAudioProfile').value,compressor:$('setCompressor').value,claimTerms:$('setClaimTerms').value});settingsDirty=false;render();toast('Pengaturan booth tersimpan.','success');}catch(error){handleError(error);}
});

$('addPrize').addEventListener('click',()=>openPrizeModal());
$('closePrizeModal').addEventListener('click',closePrizeModal);$('cancelPrize').addEventListener('click',closePrizeModal);
$('prizeUnlimited').addEventListener('change',()=>{$('prizeStock').disabled=$('prizeUnlimited').checked;});
$('prizeImage').addEventListener('change',()=>{const file=$('prizeImage').files[0];if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}if(file){previewUrl=URL.createObjectURL(file);$('prizePreview').src=previewUrl;$('prizeImageChecked').checked=false;}});
$('prizeModal').addEventListener('cancel',event=>{event.preventDefault();closePrizeModal();});

$('prizeForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const submit=event.submitter||$('prizeForm').querySelector('[type="submit"]');if(submit.disabled)return;
 const file=$('prizeImage').files[0];
 if(file&&file.size>4*1024*1024){toast('Foto maksimal 4 MB.','error');return;}
 const patch={name:$('prizeName').value.trim(),fullName:$('prizeFullName').value.trim(),tier:$('prizeTier').value,stock:$('prizeUnlimited').checked?null:Number($('prizeStock').value),terms:$('prizeTerms').value,enabled:$('prizeEnabled').checked,imageChecked:$('prizeImageChecked').checked,brand:$('prizeBrand').value.trim(),variant:$('prizeVariant').value.trim()};
 submit.disabled=true;
 try{data=await api('/api/admin/prize/save',{id:activePrizeId,patch,...(file?{data:await readAsDataUrl(file)}:{})});closePrizeModal();render();toast('Hadiah tersimpan.','success');}
 catch(error){handleError(error);}finally{submit.disabled=false;}
});

$('deletePrize').addEventListener('click',async()=>{
 const prize=data.prizes.find(item=>item.id===activePrizeId);if(!prize)return;
 if(!confirm(`Hapus hadiah “${prize.fullName}”? Hadiah yang sudah punya riwayat tidak dapat dihapus.`))return;
 try{data=await api('/api/admin/prize/delete',{id:activePrizeId});closePrizeModal();render();toast('Hadiah dihapus.','success');}catch(error){handleError(error);}
});

$('exportRanking').addEventListener('click',async()=>{
 const text=['Peringkat\tPemain\tPutaran\tHadiah\tPoin',...data.leaderboard.map((row,index)=>[index+1,row.username,row.plays,row.won,row.points].join('\t'))].join('\n');
 try{await navigator.clipboard.writeText(text);toast('Tabel peringkat disalin.','success');}catch{toast('Browser tidak mengizinkan akses clipboard.','error');}
});

$('doRestore').addEventListener('click',async()=>{
 const file=$('restoreFile').files[0];if(!file){toast('Pilih berkas cadangan JSON terlebih dahulu.','error');return;}
 let backup;try{backup=JSON.parse(await file.text());}catch{toast('Berkas cadangan bukan JSON yang valid.','error');return;}
 try{data=await api('/api/admin/restore',{confirmation:$('restoreConfirm').value,backup});capsulesDirty=false;settingsDirty=false;render();toast('Cadangan dipulihkan. Mode demo aktif dan permainan dijeda.','success');$('restoreConfirm').value='';$('restoreFile').value='';}catch(error){handleError(error);}
});

/* Reset dua langkah: satu klik nyasar di booth tidak boleh mengosongkan acara. */
let resetArmed=0,resetTimer=null;
$('doReset').addEventListener('click',async()=>{
 const button=$('doReset'),hint=$('resetHint');
 const disarm=()=>{resetArmed=0;button.classList.remove('armed');button.textContent='Arsipkan & reset';hint.textContent='Sekali klik untuk mulai, klik kedua untuk memastikan.';};
 if(Date.now()>resetArmed){
  resetArmed=Date.now()+5000;button.classList.add('armed');button.textContent='Klik lagi untuk konfirmasi';
  hint.textContent='Semua data acara diarsipkan lalu dikosongkan. Batal otomatis dalam 5 detik.';
  clearTimeout(resetTimer);resetTimer=setTimeout(disarm,5000);
  return;
 }
 clearTimeout(resetTimer);disarm();
 try{data=await api('/api/admin/reset',{confirmation:'RESET EVENT'});capsulesDirty=false;settingsDirty=false;render();toast('Data lama diarsipkan dan acara baru dimulai.','success');}catch(error){handleError(error);}
});

$('changePin').addEventListener('click',async()=>{
 const currentPin=$('curPin').value,newPin=$('newPin').value;
 if(newPin!==$('confirmPin').value){toast('Pengulangan PIN baru tidak sama.','error');return;}
 try{await api('/api/admin/pin',{currentPin,newPin});toast('PIN berhasil diganti. Silakan masuk kembali.','success');setTimeout(()=>location.reload(),900);}catch(error){handleError(error);}
});

(async()=>{
 try{await refresh({quiet:true});$('loginView').hidden=true;$('adminView').hidden=false;refreshTimer=setInterval(()=>refresh({quiet:true}).catch(()=>{}),15000);}
 catch(error){if(error.status!==401)handleError(error);$('loginView').hidden=false;$('adminView').hidden=true;}
})();
