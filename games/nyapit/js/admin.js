'use strict';

const $=id=>document.getElementById(id);
const tierMeta={
 bundling:{label:'Bundling utama',limit:20,color:'#d4a12e'},
 grand:{label:'Voucher utama',limit:20,color:'#a970d0'},
 voucher:{label:'Voucher potongan',limit:60,color:'#e45882'},
 product:{label:'Produk gratis',limit:60,color:'#ee8b65'},
 newuser:{label:'Voucher pengguna baru',limit:80,color:'#4fa784'},
 zonk:{label:'Zonk',limit:60,color:'#97858b'}
};
const tiers=Object.keys(tierMeta);
let data=null,toastTimer=null,activePrizeId=null,refreshTimer=null,oddsDirty=false,settingsDirty=false,previewUrl=null;

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const formatDate=value=>new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));

async function api(route,body){
 const options={headers:{'Content-Type':'application/json','x-bpedia-client':'nyapit'}};
 if(body!==undefined){options.method='POST';options.body=JSON.stringify(body);}
 const response=await fetch(route,options);
 let output;
 try{output=await response.json();}catch{output={error:'Respons server tidak dapat dibaca.'};}
 if(!response.ok){
  const error=new Error(output.error||'Permintaan gagal.');error.status=response.status;throw error;
 }
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
 renderHeader();renderSummary();if(!document.activeElement?.matches('[data-stock-input]'))renderInventory();if(!oddsDirty)renderOdds();renderHistory();renderRanking();if(!settingsDirty)renderSettings();
}

function renderHeader(){
 $('adminEventName').textContent=data.settings.eventName;
 $('adminMode').textContent=data.settings.mode==='live'?'PERMAINAN RESMI':'MODE DEMO';
 $('adminMode').classList.toggle('live',data.settings.mode==='live');
 $('adminPause').hidden=!data.settings.paused;
 $('adminRevision').textContent=`DATA R${data.revision}`;
}

function tierStock(){
 return Object.fromEntries(tiers.slice(0,-1).map(tier=>[tier,data.prizes.filter(prize=>prize.tier===tier&&prize.stock!==null).reduce((sum,prize)=>sum+prize.stock,0)]));
}

function renderSummary(){
 $('statPlays').textContent=data.stats.plays;$('statWon').textContent=data.stats.won;$('statClaimed').textContent=data.stats.claimed;$('statZonk').textContent=data.stats.zonk;$('statStock').textContent=data.stats.stock;
 $('statUnlimited').textContent=`+ ${data.stats.unlimited} item tak terbatas`;
 $('donutValue').textContent=data.stats.stock;
 const stock=tierStock(),stockTiers=tiers.slice(0,-1),total=Math.max(1,Object.values(stock).reduce((sum,value)=>sum+value,0));
 let cursor=0;const stops=[];
 for(const tier of stockTiers){const start=cursor;cursor+=stock[tier]/total*100;stops.push(`${tierMeta[tier].color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`);}
 $('stockDonut').style.background=`conic-gradient(${stops.join(',')})`;
 $('stockLegend').innerHTML=stockTiers.map(tier=>`<div class="legend-row" style="--legend:${tierMeta[tier].color}"><i></i><span>${esc(tierMeta[tier].label)}</span><b>${stock[tier]}</b></div>`).join('');

 const byHour=new Map();
 for(const item of data.history){const date=new Date(item.at);date.setMinutes(0,0,0);const key=date.toISOString();byHour.set(key,(byHour.get(key)||0)+1);}
 const hours=[...byHour.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12),max=Math.max(1,...hours.map(entry=>entry[1]));
 $('hourChart').innerHTML=hours.length?hours.map(([key,value])=>{const date=new Date(key);return `<div class="hour-bar" style="--bar-height:${Math.max(4,Math.round(value/max*100))}%"><b>${value}</b><small>${String(date.getHours()).padStart(2,'0')}:00</small></div>`;}).join(''):'<div class="empty-state" style="width:100%;align-self:center">Belum ada aktivitas mode permainan.</div>';
 $('summaryOdds').innerHTML=tiers.map(tier=>`<div class="effective-card"><small>${esc(tierMeta[tier].label)}</small><strong>${Number(data.odds[tier]).toFixed(2)}%</strong></div>`).join('');

 const warnings=[];
 const unverified=data.prizes.filter(prize=>!prize.imageChecked);
 const depleted=data.prizes.filter(prize=>prize.enabled&&prize.stock===0);
 const low=data.prizes.filter(prize=>prize.enabled&&prize.stock!==null&&prize.stock>0&&prize.stock<=3);
 const unclaimed=data.history.filter(item=>item.status==='unclaimed');
 if(data.settings.mode==='demo')warnings.push(['Mode demo aktif','Permainan tidak mengurangi stok dan tidak tercatat.','warning-item']);
 if(data.settings.paused)warnings.push(['Permainan dijeda','Layar game tidak menerima percobaan baru.','warning-item danger']);
 if(unverified.length)warnings.push([`${unverified.length} foto belum diverifikasi`,'Periksa varian/foto sebelum mode resmi.','warning-item danger']);
 if(depleted.length)warnings.push([`${depleted.length} hadiah stok nol`,'Hadiah sudah otomatis hilang dari kabinet.','warning-item']);
 if(low.length)warnings.push([`${low.length} hadiah hampir habis`,'Masing-masing tersisa 3 unit atau kurang.','warning-item']);
 if(unclaimed.length)warnings.push([`${unclaimed.length} hadiah belum diserahkan`,'Cocokkan kode pada tab Riwayat & Klaim.','warning-item danger']);
 if(!warnings.length)warnings.push(['Semua siap','Tidak ada perhatian operasional saat ini.','warning-item success']);
 $('warningList').innerHTML=warnings.map(([title,detail,className])=>`<div class="${className}"><b>${esc(title)}</b><br>${esc(detail)}</div>`).join('');
}

function filteredPrizes(){
 const query=$('inventorySearch').value.trim().toLocaleLowerCase('id');
 if(!query)return data.prizes;
 return data.prizes.filter(prize=>[prize.name,prize.fullName,tierMeta[prize.tier]?.label,prize.terms].some(value=>String(value||'').toLocaleLowerCase('id').includes(query)));
}

function renderInventory(){
 const tbody=$('inventoryTable').querySelector('tbody'),prizes=filteredPrizes();
 tbody.innerHTML=prizes.length?prizes.map(prize=>`<tr data-prize-row="${esc(prize.id)}"><td><img src="${esc(prize.image)}" alt="Foto ${esc(prize.name)}"></td><td class="table-prize"><b>${esc(prize.fullName)}</b><small>${esc(prize.terms||'Belum ada ketentuan')}</small></td><td>${esc(tierMeta[prize.tier]?.label||prize.tier)}<br><small>${prize.points} poin</small></td><td><div class="stock-control"><button type="button" class="tiny-button" data-step-stock="${esc(prize.id)}" data-step="-1" aria-label="Kurangi stok ${esc(prize.name)}" ${prize.stock===null||prize.stock===0?'disabled':''}>−</button><input aria-label="Stok ${esc(prize.name)}" type="number" min="0" max="10000" step="1" value="${prize.stock===null?'':prize.stock}" data-stock-input="${esc(prize.id)}" ${prize.stock===null?'disabled':''}><button type="button" class="tiny-button" data-step-stock="${esc(prize.id)}" data-step="1" aria-label="Tambah stok ${esc(prize.name)}" ${prize.stock===null||prize.stock>=10000?'disabled':''}>＋</button><button class="tiny-button primary" type="button" data-save-stock="${esc(prize.id)}">Simpan</button><button class="tiny-button" type="button" data-toggle-unlimited="${esc(prize.id)}">${prize.stock===null?'Batasi':'∞'}</button></div><small>${prize.stock===null?'tak terbatas':`${prize.stock} unit`}</small></td><td><label class="switch"><input type="checkbox" data-toggle-enabled="${esc(prize.id)}" ${prize.enabled?'checked':''}> ${prize.enabled?'Aktif':'Nonaktif'}</label></td><td><label class="switch"><input type="checkbox" data-toggle-checked="${esc(prize.id)}" ${prize.imageChecked?'checked':''}> ${prize.imageChecked?'Dicek':'Belum'}</label></td><td><button class="tiny-button" type="button" data-edit-prize="${esc(prize.id)}">Edit & foto</button></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty-state">Tidak ada hadiah yang cocok dengan pencarian.</div></td></tr>';
}

function currentOddsFromForm(){
 const odds={};document.querySelectorAll('[data-odds]').forEach(input=>{odds[input.dataset.odds]=Number(input.value);});return odds;
}

function calculateEffective(odds){
 const active=tiers.filter(tier=>tier==='zonk'||data.prizes.some(prize=>prize.tier===tier&&prize.enabled&&(prize.stock===null||prize.stock>0)));
 const base=active.reduce((sum,tier)=>sum+(odds[tier]||0),0);
 if(base<=0)return Object.fromEntries(tiers.map(tier=>[tier,tier==='zonk'?100:0]));
 return Object.fromEntries(tiers.map(tier=>[tier,active.includes(tier)?100*(odds[tier]||0)/base:0]));
}

function renderOdds(){
 $('oddsSliders').innerHTML=tiers.map(tier=>`<div class="slider-row"><label for="odds-${tier}">${esc(tierMeta[tier].label)} <small>maks. ${tierMeta[tier].limit}%</small></label><input id="odds-${tier}" type="range" min="0" max="${tierMeta[tier].limit}" step="1" value="${data.settings.odds[tier]}" data-odds="${tier}"><span class="slider-value" data-odds-value="${tier}">${data.settings.odds[tier]}%</span></div>`).join('');
 $('setDuration').value=data.settings.duration;$('durationValue').textContent=`${(data.settings.duration/1000).toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:2})} dtk`;
 updateOddsPreview();
}

function updateOddsPreview(){
 const odds=currentOddsFromForm(),total=tiers.reduce((sum,tier)=>sum+(odds[tier]||0),0),valid=Math.abs(total-100)<.00001;
 $('oddsTotal').textContent=`${total}%`;$('oddsTotal').className=valid?'valid':'invalid';$('saveOdds').disabled=!valid;
 const effective=calculateEffective(odds);
 $('effectiveOdds').innerHTML=tiers.map(tier=>`<div class="effective-card"><small>${esc(tierMeta[tier].label)}</small><strong>${effective[tier].toFixed(2)}%</strong></div>`).join('');
 const empty=tiers.slice(0,-1).filter(tier=>!data.prizes.some(prize=>prize.tier===tier&&prize.enabled&&(prize.stock===null||prize.stock>0)));
 $('oddsWarning').innerHTML=empty.length?`<div class="warning-item">Peluang ${empty.map(tier=>esc(tierMeta[tier].label)).join(', ')} sedang didistribusikan ulang karena tidak ada stok aktif.</div>`:'<div class="warning-item success">Semua kategori berhadiah memiliki stok aktif.</div>';
}

function filteredHistory(){
 const query=$('historySearch').value.trim().toLocaleLowerCase('id'),status=$('historyStatus').value;
 return [...data.history].reverse().filter(item=>(status==='all'||item.status===status)&&(!query||[item.id,item.username,item.prize.fullName,tierMeta[item.prize.tier]?.label].some(value=>String(value||'').toLocaleLowerCase('id').includes(query))));
}

function renderHistory(){
 const rows=filteredHistory(),tbody=$('historyTable').querySelector('tbody');
 tbody.innerHTML=rows.length?rows.map(item=>`<tr><td><b>${esc(item.id)}</b></td><td>${esc(formatDate(item.at))}</td><td>${esc(item.username)}</td><td class="table-prize"><b>${esc(item.prize.fullName)}</b></td><td>${esc(tierMeta[item.prize.tier]?.label||item.prize.tier)}</td><td><span class="badge ${item.status}">${item.status==='claimed'?'Diserahkan':item.status==='unclaimed'?'Belum diserahkan':'Zonk'}</span>${item.claimedAt?`<small>${esc(formatDate(item.claimedAt))}</small>`:''}</td><td>${item.prize.tier==='zonk'?'—':`<button class="tiny-button success" type="button" data-claim="${esc(item.id)}" ${item.status==='claimed'?'disabled':''}>${item.status==='claimed'?'Sudah':'Serahkan'}</button>`}</td></tr>`).join(''):'<tr><td colspan="7"><div class="empty-state">Belum ada riwayat yang sesuai filter.</div></td></tr>';
}

function renderRanking(){
 $('adminLeaderboard').innerHTML=data.leaderboard.length?data.leaderboard.map((row,index)=>`<article class="leader-card"><span class="rank-medal">${index===0?'★':index+1}</span><div><b>${esc(row.username)}</b><small>${row.won} hadiah · ${row.plays} percobaan</small></div><strong>${row.points} pt</strong></article>`).join(''):'<div class="empty-state">Belum ada peringkat dari mode permainan resmi.</div>';
}

let previewAudio=null,bgmTesting=false;
function getPreviewAudio(){
 if(!previewAudio&&window.BoothAudio)previewAudio=new window.BoothAudio();
 return previewAudio;
}
function syncPreviewAudio(){
 const audio=getPreviewAudio();
 if(!audio)return;
 audio.configure({
  sound:true,
  volume:Number($('setVolume').value),
  bgmVolume:Number($('setBgmVolume').value),
  sfxVolume:Number($('setSfxVolume').value),
  voiceVolume:Number($('setVoiceVolume').value),
  audioProfile:$('setAudioProfile').value,
  compressor:$('setCompressor').value
 });
}

function renderSettings(){
 $('setEventName').value=data.settings.eventName;$('setMode').value=data.settings.mode;$('setPaused').checked=data.settings.paused;$('setSound').checked=data.settings.sound;$('setVolume').value=data.settings.volume;$('volumeValue').textContent=`${data.settings.volume}%`;$('setBgmVolume').value=data.settings.bgmVolume??75;$('bgmVolumeValue').textContent=`${data.settings.bgmVolume??75}%`;$('setSfxVolume').value=data.settings.sfxVolume??85;$('sfxVolumeValue').textContent=`${data.settings.sfxVolume??85}%`;$('setVoiceVolume').value=data.settings.voiceVolume??90;$('voiceVolumeValue').textContent=`${data.settings.voiceVolume??90}%`;$('setAudioProfile').value=data.settings.audioProfile||'crisp';$('setCompressor').value=data.settings.compressor||'gentle';$('setVoucherTerms').value=data.settings.voucherTerms;
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
 activePrizeId=prize?.id||null;$('prizeModalTitle').textContent=prize?'Edit hadiah':'Tambah hadiah';$('prizeId').value=prize?.id||'';$('prizeName').value=prize?.name||'';$('prizeFullName').value=prize?.fullName||'';$('prizeTier').value=prize?.tier||'product';$('prizeStock').value=prize?.stock??0;$('prizeUnlimited').checked=prize?.stock===null;$('prizeStock').disabled=$('prizeUnlimited').checked;$('prizeImage').value='';$('prizePreview').src=prize?.image||'/assets/products/bundling.svg';$('prizeImageChecked').checked=prize?.imageChecked||false;$('prizeTerms').value=prize?.terms||'';$('prizeEnabled').checked=prize?.enabled||false;$('deletePrize').hidden=!prize;$('prizeModal').showModal();
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
  else if(button.dataset.claim){button.disabled=true;data=await api('/api/admin/claim',{id:button.dataset.claim});render();toast('Hadiah ditandai sudah diserahkan.','success');}
 }catch(error){handleError(error);render();}
});

document.addEventListener('change',async event=>{
 try{
  if(event.target.dataset.toggleEnabled){data=await api('/api/admin/prize/update',{id:event.target.dataset.toggleEnabled,patch:{enabled:event.target.checked}});render();toast('Status hadiah diperbarui.','success');}
  else if(event.target.dataset.toggleChecked){data=await api('/api/admin/prize/update',{id:event.target.dataset.toggleChecked,patch:{imageChecked:event.target.checked}});render();toast('Status verifikasi foto diperbarui.','success');}
  else if(['setMode','setPaused','setSound','setAudioProfile','setCompressor'].includes(event.target.id)){
   settingsDirty=true;
   syncPreviewAudio();
  }
 }catch(error){handleError(error);render();}
});

document.addEventListener('input',event=>{
 if(event.target.dataset.odds){oddsDirty=true;document.querySelector(`[data-odds-value="${event.target.dataset.odds}"]`).textContent=`${event.target.value}%`;updateOddsPreview();}
 else if(event.target===$('setDuration')){oddsDirty=true;$('durationValue').textContent=`${(Number(event.target.value)/1000).toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:2})} dtk`;}
 else if(event.target===$('setVolume')){settingsDirty=true;$('volumeValue').textContent=`${event.target.value}%`;syncPreviewAudio();}
 else if(event.target===$('setBgmVolume')){settingsDirty=true;$('bgmVolumeValue').textContent=`${event.target.value}%`;syncPreviewAudio();}
 else if(event.target===$('setSfxVolume')){settingsDirty=true;$('sfxVolumeValue').textContent=`${event.target.value}%`;syncPreviewAudio();}
 else if(event.target===$('setVoiceVolume')){settingsDirty=true;$('voiceVolumeValue').textContent=`${event.target.value}%`;syncPreviewAudio();}
 else if([$('setEventName'),$('setVoucherTerms')].includes(event.target))settingsDirty=true;
 else if(event.target===$('inventorySearch'))renderInventory();
 else if(event.target===$('historySearch'))renderHistory();
});
$('historyStatus').addEventListener('change',renderHistory);

$('testBgmBtn').addEventListener('click',async()=>{
 const audio=getPreviewAudio();
 if(!audio){toast('Audio Web API tidak didukung pada peramban ini.','error');return;}
 if(bgmTesting){
  audio.stopBgm();bgmTesting=false;$('testBgmBtn').textContent='▶ Tes Musik BGM';
 }else{
  syncPreviewAudio();
  $('testBgmBtn').textContent='⏳ Memuat...';
  const started=await audio.startBgm();
  if(started){
   bgmTesting=true;$('testBgmBtn').textContent='⏹ Berhenti Tes Musik';toast('Musik BGM diputar untuk pengujian speaker booth.','normal');
  }else{
   $('testBgmBtn').textContent='▶ Tes Musik BGM';toast('Gagal memutar musik tes. Periksa koneksi audio.','error');
  }
 }
});

$('testSfxBtn').addEventListener('click',async()=>{
 const audio=getPreviewAudio();
 if(!audio)return;
 syncPreviewAudio();
 audio.coinIntro();
});

$('testVoiceBtn').addEventListener('click',async()=>{
 const audio=getPreviewAudio();
 if(!audio)return;
 syncPreviewAudio();
 audio.slogan();
});

$('resetAudioBtn').addEventListener('click',()=>{
 $('setVolume').value=70;$('volumeValue').textContent='70%';
 $('setBgmVolume').value=75;$('bgmVolumeValue').textContent='75%';
 $('setSfxVolume').value=85;$('sfxVolumeValue').textContent='85%';
 $('setVoiceVolume').value=90;$('voiceVolumeValue').textContent='90%';
 $('setAudioProfile').value='crisp';
 $('setCompressor').value='gentle';
 settingsDirty=true;
 syncPreviewAudio();
 toast('Nilai audio disetel ke rekomendasi jernih & lantang. Klik Simpan Pengaturan.','success');
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

$('saveOdds').addEventListener('click',async()=>{
 try{data=await api('/api/admin/settings',{odds:currentOddsFromForm(),duration:Number($('setDuration').value)});oddsDirty=false;render();toast('Peluang dan durasi tersimpan.','success');}catch(error){handleError(error);}
});

$('saveSettings').addEventListener('click',async()=>{
 const requestedMode=$('setMode').value;
 if(requestedMode==='live'){
  const unverified=data.prizes.filter(prize=>prize.enabled&&!prize.imageChecked);
  if(unverified.length&&!confirm(`${unverified.length} foto hadiah aktif belum diverifikasi. Tetap aktifkan mode permainan resmi?`))return;
 }
 try{data=await api('/api/admin/settings',{eventName:$('setEventName').value.trim(),mode:requestedMode,paused:$('setPaused').checked,sound:$('setSound').checked,volume:Number($('setVolume').value),bgmVolume:Number($('setBgmVolume').value),sfxVolume:Number($('setSfxVolume').value),voiceVolume:Number($('setVoiceVolume').value),audioProfile:$('setAudioProfile').value,compressor:$('setCompressor').value,voucherTerms:$('setVoucherTerms').value});settingsDirty=false;render();toast('Pengaturan booth tersimpan.','success');}catch(error){handleError(error);}
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
 const patch={name:$('prizeName').value.trim(),fullName:$('prizeFullName').value.trim(),tier:$('prizeTier').value,stock:$('prizeUnlimited').checked?null:Number($('prizeStock').value),terms:$('prizeTerms').value,enabled:$('prizeEnabled').checked,imageChecked:$('prizeImageChecked').checked};
 submit.disabled=true;
 try{
  data=await api('/api/admin/prize/save',{id:activePrizeId,patch,...(file?{data:await readAsDataUrl(file)}:{})});closePrizeModal();render();toast('Hadiah tersimpan.','success');
 }catch(error){handleError(error);}finally{submit.disabled=false;}
});

$('deletePrize').addEventListener('click',async()=>{
 const prize=data.prizes.find(item=>item.id===activePrizeId);if(!prize)return;
 if(!confirm(`Hapus hadiah “${prize.fullName}”? Hadiah yang sudah punya riwayat tidak dapat dihapus.`))return;
 try{data=await api('/api/admin/prize/delete',{id:activePrizeId});closePrizeModal();render();toast('Hadiah dihapus.','success');}catch(error){handleError(error);}
});

$('exportRanking').addEventListener('click',async()=>{
 const text=['Peringkat\tPemain\tPercobaan\tHadiah\tPoin',...data.leaderboard.map((row,index)=>[index+1,row.username,row.plays,row.won,row.points].join('\t'))].join('\n');
 try{await navigator.clipboard.writeText(text);toast('Tabel peringkat disalin.','success');}catch{toast('Browser tidak mengizinkan akses clipboard.','error');}
});

$('doRestore').addEventListener('click',async()=>{
 const file=$('restoreFile').files[0];if(!file){toast('Pilih berkas cadangan JSON terlebih dahulu.','error');return;}
 let backup;try{backup=JSON.parse(await file.text());}catch{toast('Berkas cadangan bukan JSON yang valid.','error');return;}
 try{data=await api('/api/admin/restore',{confirmation:$('restoreConfirm').value,backup});oddsDirty=false;settingsDirty=false;render();toast('Cadangan dipulihkan. Mode demo aktif dan permainan dijeda.','success');$('restoreConfirm').value='';$('restoreFile').value='';}catch(error){handleError(error);}
});

/* Reset acara cukup lewat tombol — tidak perlu mengetik "RESET EVENT" lagi.
   Tetap dua langkah karena tindakan ini mengarsipkan lalu mengosongkan seluruh
   data acara; satu klik nyasar di booth akan mahal. Kata kunci ke server tidak
   dihapus, hanya tidak lagi dibebankan ke petugas. */
let resetArmed=0,resetTimer=null;
$('doReset').addEventListener('click',async()=>{
 const button=$('doReset'),hint=$('resetHint');
 if(Date.now()>resetArmed){
  resetArmed=Date.now()+5000;
  button.classList.add('armed');
  button.textContent='Klik lagi untuk konfirmasi';
  hint.textContent='Semua data acara diarsipkan lalu dikosongkan. Batal otomatis dalam 5 detik.';
  clearTimeout(resetTimer);
  resetTimer=setTimeout(()=>{
   resetArmed=0;button.classList.remove('armed');
   button.textContent='Arsipkan & reset';
   hint.textContent='Sekali klik untuk mulai, klik kedua untuk memastikan.';
  },5000);
  return;
 }
 clearTimeout(resetTimer);resetArmed=0;
 button.classList.remove('armed');button.textContent='Arsipkan & reset';
 hint.textContent='Sekali klik untuk mulai, klik kedua untuk memastikan.';
 try{data=await api('/api/admin/reset',{confirmation:'RESET EVENT'});oddsDirty=false;settingsDirty=false;render();toast('Data lama diarsipkan dan acara baru dimulai.','success');}catch(error){handleError(error);}
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
