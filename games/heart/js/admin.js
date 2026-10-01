'use strict';
(()=>{
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let state=null,busy=false,noticeTimer;
 async function api(route,body){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-bpedia-client':'heartparade'},credentials:'same-origin',...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal}),j=await r.json();if(!r.ok)throw Object.assign(new Error(j.error||'Permintaan gagal.'),{status:r.status});return j;}catch(e){if(e.status)throw e;throw new Error('Koneksi terputus. Segarkan antrean sebelum mencoba kembali.');}finally{clearTimeout(timeout);}}
 function error(e){$('adminError').textContent=e.message;$('adminError').hidden=false;if(e.status===401){$('loginPanel').hidden=false;$('adminContent').hidden=true;$('logout').hidden=true;state=null;}}
 function notice(message){$('adminError').hidden=true;$('adminNotice').textContent=message;$('adminNotice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('adminNotice').hidden=true,3500);}
 function renderTickets(){
  if(!state)return;
  $('stats').innerHTML=[['Menunggu',state.queue.waiting],['Tiket terbit',state.stats.issued],['Sudah dilayani',state.stats.served],['Dibatalkan',state.stats.cancelled]].map(([name,n])=>`<div class="stat"><span>${name}</span><strong>${n}</strong></div>`).join('');
  const filter=$('hostFilter').value,real=state.history.filter(r=>!r.demo&&(!filter||r.host.id===filter));
  function ticket(r,active){return `<article class="queue-ticket"><span class="queue-number">${String(r.queueNumber).padStart(3,'0')}</span><div><h3>${esc(r.username)} · ${esc(r.host.name)} / ${esc(r.service.name)}</h3><p><code>${esc(r.id)}</code> · ${new Date(r.at).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'})} WIB</p><p>${r.comfort==='no-touch'?'TANPA SENTUHAN':'Sentuhan ringan, tanya ulang'} · ${r.recording?'Dokumentasi: tanya ulang sebelum merekam':'TANPA DOKUMENTASI'}</p><p>${esc(r.comfort==='no-touch'?r.service.alternative:r.service.detail)}</p>${active?'':`<p>Status: ${r.status==='served'?'Sudah dilayani':'Dibatalkan'}</p>`}</div>${active?`<div class="ticket-actions"><button class="primary" data-ticket="${r.id}" data-action="served">Sudah dilayani</button>${r.comfort==='touch'?`<button class="secondary" data-ticket="${r.id}" data-action="no-touch">Tanpa sentuhan</button>`:''}<button class="secondary danger" data-ticket="${r.id}" data-action="cancelled">Batalkan tiket</button></div>`:''}</article>`;}
  const waiting=real.filter(r=>r.status==='waiting');$('queueList').innerHTML=waiting.length?waiting.map(r=>ticket(r,true)).join(''):'<p class="empty-queue">Belum ada tiket menunggu untuk filter ini.</p>';
  $('historyList').innerHTML=real.filter(r=>r.status!=='waiting').reverse().slice(0,100).map(r=>ticket(r,false)).join('')||'<p class="empty-queue">Belum ada tiket selesai.</p>';
 }
 function render(full=true){
  $('loginPanel').hidden=true;$('adminContent').hidden=false;$('logout').hidden=false;
  if(full){for(const key of ['mode','schedule','queueLimit','duration'])$(key).value=state.settings[key];for(const key of ['sessionOpen','paused','allowPick'])$(key).checked=state.settings[key];
   $('hostControls').innerHTML=state.hosts.map(h=>`<div class="host-control"><button class="secondary" data-host-toggle="${h.id}" aria-pressed="${h.enabled}">${h.enabled?'Aktif':'Istirahat'}</button><span><b>${esc(h.name)}</b><small>${h.remaining} slot tersisa hari ini</small></span><label>Kuota<input type="number" id="quota-${h.id}" min="0" max="1000" value="${h.quota}"></label><button class="secondary" data-quota="${h.id}">Simpan</button></div>`).join('');
   $('serviceControls').innerHTML=state.services.map(s=>`<button class="service-control" data-service="${s.id}" aria-pressed="${s.enabled}">${s.enabled?'✓':'—'} ${esc(s.name)}</button>`).join('');}
  renderTickets();
 }
 async function load(full=true,quiet=false){try{state=await api('/api/admin/state');render(full);if(!quiet)$('adminError').hidden=true;}catch(e){if(!quiet||e.status===401)error(e);}}
 async function mutate(route,body,message){if(busy)return;busy=true;try{state=await api(route,body);render();notice(message);}catch(e){error(e);}finally{busy=false;}}
 $('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;try{await api('/api/login',{pin:$('pin').value});$('pin').value='';await load();}catch(err){error(err);}finally{busy=false;}});
 $('logout').addEventListener('click',async()=>{try{await api('/api/logout',{});state=null;$('loginPanel').hidden=false;$('adminContent').hidden=true;$('logout').hidden=true;}catch(e){error(e);}});
 $('settingsForm').addEventListener('submit',e=>{e.preventDefault();mutate('/api/admin/settings',{mode:$('mode').value,schedule:$('schedule').value,queueLimit:Number($('queueLimit').value),duration:Number($('duration').value),sessionOpen:$('sessionOpen').checked,paused:$('paused').checked,allowPick:$('allowPick').checked},'Pengaturan sesi tersimpan.');});
 $('hostControls').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.hostToggle){const h=state.hosts.find(h=>h.id===b.dataset.hostToggle);mutate('/api/admin/host',{id:h.id,patch:{enabled:!h.enabled}},'Status cosplayer diperbarui.');}if(b.dataset.quota){const id=b.dataset.quota;mutate('/api/admin/host',{id,patch:{quota:Number($('quota-'+id).value)}},'Kuota harian tersimpan.');}});
 $('serviceControls').addEventListener('click',e=>{const b=e.target.closest('[data-service]');if(b){const s=state.services.find(s=>s.id===b.dataset.service);mutate('/api/admin/service',{id:s.id,enabled:!s.enabled},'Status menu tersimpan.');}});
 $('queueList').addEventListener('click',e=>{const b=e.target.closest('[data-ticket]');if(!b)return;if(b.dataset.action==='cancelled'&&!window.confirm('Batalkan tiket ini? Kode akan ditandai batal di riwayat.'))return;mutate('/api/admin/ticket',{id:b.dataset.ticket,action:b.dataset.action},b.dataset.action==='no-touch'?'Alternatif tanpa sentuhan tersimpan.':'Status tiket diperbarui.');});
 $('hostFilter').addEventListener('change',renderTickets);$('refreshQueue').addEventListener('click',()=>load(false));
 load();setInterval(()=>{if(state&&!busy&&!document.hidden)load(false,true);},10000);
})();
