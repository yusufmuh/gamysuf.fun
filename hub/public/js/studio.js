'use strict';

(()=>{
 const $=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 let data=null;

 async function api(route,body){
  const options={headers:{'Content-Type':'application/json','x-gamysuf-client':'hub'},credentials:'same-origin'};
  if(body!==undefined){options.method='POST';options.body=JSON.stringify(body);}
  const response=await fetch(route,options);
  let output;
  try{output=await response.json();}catch{output={error:'Respons server tidak terbaca.'};}
  if(!response.ok)throw Object.assign(new Error(output.error||'Permintaan gagal.'),{status:response.status});
  return output;
 }

 function toast(text){
  const element=document.createElement('div');
  element.className='toast';
  element.innerHTML=`<span class="toast-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg></span><div><b>${esc(text)}</b><small>Studio</small></div>`;
  $('toasts').append(element);
  setTimeout(()=>{element.classList.add('leave');setTimeout(()=>element.remove(),400);},3200);
 }

 const readFile=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Berkas tidak bisa dibaca.'));reader.readAsDataURL(file);});

 function showApp(on){
  $('loginPanel').hidden=on;
  $('studioApp').hidden=!on;
  $('logoutButton').hidden=!on;
 }

 function render(){
  const {stats,games,settings,custom,maxCustom,leaderboard}=data;
  $('stPlayers').textContent=stats.players;
  $('stActive').textContent=stats.activeToday;
  $('stToday').textContent=stats.playsToday;
  $('stPlays').textContent=stats.plays;
  $('builtinList').innerHTML=games.map(game=>`<div class="builtin"><div><b>${esc(game.title)}</b><small>${esc(game.event)} · ${game.cards} kartu · ${stats.byGame[game.slug]||0} main online · ${game.demoVisitors} mesin demo aktif</small><small><span class="pill ${game.mode==='live'?'live':''}">${game.mode==='live'?'RESMI':'DEMO'}</span>${game.paused?'<span class="pill warn">DIJEDA</span>':''}Login: ${esc(game.login)}</small></div><a class="btn btn-ghost btn-small" href="${esc(game.adminUrl)}" target="_blank" rel="noopener">Dashboard</a></div>`).join('');
  $('annText').value=settings.announcement;
  $('annLink').value=settings.announcementLink;
  const options=[...games.map(game=>[game.slug,game.title]),...custom.filter(game=>game.published).map(game=>[game.id,game.title])];
  $('featured').innerHTML=options.map(([value,label])=>`<option value="${esc(value)}" ${value===settings.featured?'selected':''}>${esc(label)}</option>`).join('');
  $('hideList').innerHTML=games.map(game=>`<label><input type="checkbox" value="${esc(game.slug)}" ${settings.hidden.includes(game.slug)?'checked':''}> ${esc(game.title)}</label>`).join('');
  $('slotInfo').textContent=`${custom.length} / ${maxCustom} slot terpakai`;
  $('customList').innerHTML=custom.length?custom.map(game=>`<div class="custom-item">${game.cover?`<img src="${esc(game.cover)}" alt="">`:'<span class="noimg"></span>'}<div><b>${esc(game.title)}</b><small>${game.type==='link'?`Tautan: ${esc(game.url)}`:`/play/${esc(game.id)}/ · ${game.installed?'ZIP terpasang':'belum ada ZIP'}`} · ${game.published?'tampil':'draf'}</small></div><div class="actions">${game.type==='static'&&game.installed?`<a class="btn btn-ghost btn-small" href="/play/${esc(game.id)}/" target="_blank" rel="noopener">Coba</a>`:''}<button class="btn btn-ghost btn-small" type="button" data-edit="${esc(game.id)}">Edit</button><button class="btn btn-ghost btn-small" type="button" data-delete="${esc(game.id)}">Hapus</button></div></div>`).join(''):'<p class="empty">Belum ada game tambahan. Isi form di bawah untuk menambahkan satu.</p>';
  $('topList').innerHTML=leaderboard.top.length?leaderboard.top.map(row=>`<li><span class="pos">${row.rank}</span><img src="/hub/assets/avatars/${esc(row.avatar)}.png" alt=""><div><b>${esc(row.name)}</b><small>Level ${row.level} · ${row.cards} kartu</small></div><span class="score">${row.score}</span></li>`).join(''):'<li class="empty">Belum ada pemain minggu ini.</li>';
 }

 async function load(){
  data=await api('/hub-api/admin/state');
  showApp(true);
  render();
 }

 function fillForm(game=null){
  $('cfId').value=game?.id||'';
  $('cfSlug').value=game?.id||'';
  $('cfSlug').disabled=Boolean(game);
  $('cfTitle').value=game?.title||'';
  $('cfSubtitle').value=game?.subtitle||'';
  $('cfType').value=game?.type||'static';
  $('cfType').disabled=Boolean(game);
  $('cfUrl').value=game?.url||'';
  $('cfDesc').value=game?.description||'';
  $('cfHowTo').value=(game?.howTo||[]).join('\n');
  $('cfTags').value=(game?.tags||[]).join(', ');
  $('cfColor').value=game?.color||'#e62b5e';
  $('cfPublished').checked=Boolean(game?.published);
  $('cfCover').value='';$('cfZip').value='';
  $('uploadRow').hidden=!game;
  $('customError').textContent='';
  syncType();
 }
 function syncType(){
  const link=$('cfType').value==='link';
  $('cfUrlField').hidden=!link;
  $('cfZipField').hidden=link;
 }

 $('loginButton').addEventListener('click',async()=>{
  $('loginError').textContent='';
  try{await api('/hub-api/login',{pin:$('pin').value});$('pin').value='';await load();}
  catch(error){$('loginError').textContent=error.message;}
 });
 $('pin').addEventListener('keydown',event=>{if(event.key==='Enter')$('loginButton').click();});
 $('logoutButton').addEventListener('click',async()=>{try{await api('/hub-api/logout',{});}catch{}location.reload();});
 $('cfType').addEventListener('change',syncType);
 $('cfReset').addEventListener('click',()=>fillForm());

 $('saveSettings').addEventListener('click',async()=>{
  $('settingsError').textContent='';
  try{
   await api('/hub-api/admin/settings',{announcement:$('annText').value,announcementLink:$('annLink').value,featured:$('featured').value,hidden:[...document.querySelectorAll('#hideList input:checked')].map(input=>input.value)});
   await load();toast('Pengaturan arcade tersimpan');
  }catch(error){$('settingsError').textContent=error.message;}
 });

 $('customForm').addEventListener('submit',async event=>{
  event.preventDefault();
  $('customError').textContent='';
  const button=$('cfSave');button.disabled=true;
  try{
   const id=$('cfId').value||null;
   const payload={title:$('cfTitle').value,subtitle:$('cfSubtitle').value,description:$('cfDesc').value,url:$('cfUrl').value,color:$('cfColor').value,howTo:$('cfHowTo').value.split('\n').map(line=>line.trim()).filter(Boolean),tags:$('cfTags').value.split(',').map(tag=>tag.trim()).filter(Boolean),published:false};
   if(id)payload.id=id;else{payload.slug=$('cfSlug').value.trim();payload.type=$('cfType').value;}
   let {game}=await api('/hub-api/admin/game',payload);
   const cover=$('cfCover').files[0];
   if(cover){if(cover.size>5*1024*1024)throw new Error('Sampul maksimal 5 MB.');({game}=await api('/hub-api/admin/game/cover',{id:game.id,data:await readFile(cover)}));}
   const zip=$('cfZip').files[0];
   if(zip){
    if(zip.size>80*1024*1024)throw new Error('ZIP maksimal 80 MB.');
    button.textContent='Mengunggah ZIP…';
    const dataUrl=await readFile(zip);
    ({game}=await api('/hub-api/admin/game/zip',{id:game.id,data:dataUrl.slice(dataUrl.indexOf(',')+1)}));
   }
   if($('cfPublished').checked)({game}=await api('/hub-api/admin/game',{id:game.id,published:true}));
   await load();
   fillForm(data.custom.find(item=>item.id===game.id));
   toast(`Game "${game.title}" tersimpan`);
  }catch(error){$('customError').textContent=error.message;}
  finally{button.disabled=false;button.textContent='Simpan game';}
 });

 document.addEventListener('click',async event=>{
  const button=event.target.closest('button');
  if(!button)return;
  if(button.dataset.edit){fillForm(data.custom.find(game=>game.id===button.dataset.edit));$('customForm').scrollIntoView({behavior:'smooth'});}
  if(button.dataset.delete){
   const game=data.custom.find(item=>item.id===button.dataset.delete);
   if(!confirm(`Hapus game "${game.title}" beserta berkasnya?`))return;
   try{await api('/hub-api/admin/game/delete',{id:game.id});await load();fillForm();toast('Game dihapus');}
   catch(error){$('customError').textContent=error.message;}
  }
 });

 fillForm();
 load().catch(error=>{showApp(false);if(error.status!==401)$('loginError').textContent=error.message;});
})();
