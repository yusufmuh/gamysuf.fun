'use strict';
(()=>{
 const root=document.documentElement,THEME_KEY='gamysuf-theme';
 // Halaman petugas tidak disuntik theme.js oleh hub; pakai kunci preferensi arcade yang sama.
 function readTheme(){try{const v=localStorage.getItem(THEME_KEY);if(v==='light'||v==='dark')return v;}catch{/* Preferensi opsional. */}return location.pathname.startsWith('/g/')?'dark':null;}
 const initialTheme=readTheme();if(initialTheme)root.dataset.theme=initialTheme;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

 function init(){
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const PRICE_LIMIT=10000000;
 // Sama dengan SCHEDULE di core/catalog.cjs (dijaga oleh tes).
 const MARKET_IN_SCHEDULE='Zoro & Sanji hadir 3–4 Okt 2026, dua hari penuh di booth Bpedia · Urban Forest Cipete.';
 const rupiah=n=>'Rp '+Number(n).toLocaleString('id-ID');
 const groupDigits=n=>Number(n).toLocaleString('id-ID');
 const pad=n=>Number.isInteger(n)?String(n).padStart(3,'0'):'—';
 const clock=iso=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'—':d.toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'})+' WIB';};
 const hostColor=c=>/^#[0-9a-f]{6}$/i.test(String(c))?c:'#8A6F72';
 let state=null,busy=false,noticeTimer=0,filter='',settingsDirty=false,builtKey='';
 const drafts={price:{},quota:{}};
 // Cookie sesi HttpOnly tidak terbaca; penanda ini hanya mencegah probe 401 saat belum pernah masuk.
 const SESSION_HINT='heart-parade-staff';
 const sessionHint={get(){try{return localStorage.getItem(SESSION_HINT)==='1';}catch{return true;}},set(on){try{if(on)localStorage.setItem(SESSION_HINT,'1');else localStorage.removeItem(SESSION_HINT);}catch{/* Opsional. */}}};

 function parsePrice(text){
  const clean=String(text).trim().replace(/^rp\.?\s*/i,'').replace(/\s+/g,'');
  if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(clean))return null;
  const value=Number(clean.replace(/\./g,''));
  return Number.isSafeInteger(value)&&value<=PRICE_LIMIT?value:null;
 }

 function paintThemeButton(){
  const dark=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
  $('themeToggle').setAttribute('aria-label',dark?'Ganti ke tema terang':'Ganti ke tema gelap');
  root.classList.toggle('is-dark',dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#1C141C':'#F7F0E6');
 }
 $('themeToggle').addEventListener('click',()=>{
  const next=root.classList.contains('is-dark')?'light':'dark';root.dataset.theme=next;
  try{localStorage.setItem(THEME_KEY,next);}catch{/* Tetap berlaku untuk halaman ini. */}
  paintThemeButton();
 });
 matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',paintThemeButton);
 paintThemeButton();

 async function api(route,body){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const r=await fetch(route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-bpedia-client':'heartparade'},credentials:'same-origin',cache:'no-store',...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});
   let j=null;try{j=await r.json();}catch{/* Respons non-JSON ditangani di bawah. */}
   if(!r.ok)throw Object.assign(new Error(j?.error||'Permintaan gagal. Coba lagi.'),{status:r.status});
   if(!j||typeof j!=='object')throw Object.assign(new Error('Respons server tidak dikenali. Muat ulang halaman.'),{status:502});
   return j;
  }catch(e){if(e.status)throw e;throw new Error('Koneksi terputus. Segarkan antrean sebelum mencoba kembali.');}
  finally{clearTimeout(timeout);}
 }

 function showLogin(){sessionHint.set(false);state=null;builtKey='';$('bootStatus').hidden=true;$('loginPanel').hidden=false;$('adminContent').hidden=true;$('logout').hidden=true;}
 function error(e){
  $('adminErrorText').textContent=e.message;$('adminError').hidden=false;
  if(e.status===401){showLogin();$('pin').focus();}
 }
 function notice(message){
  $('adminError').hidden=true;const el=$('adminNotice');el.textContent=message;el.classList.add('show');
  clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{el.classList.remove('show');el.textContent='';},3500);
 }
 $('dismissError').addEventListener('click',()=>{$('adminError').hidden=true;});

 /* ---------- Struktur sekali bangun; data diperbarui tanpa mengganti input yang sedang diisi ---------- */
 function cardsFor(serviceId){return state.hosts.map(h=>({host:h,card:state.cards.find(c=>c.hostId===h.id&&c.serviceId===serviceId)})).filter(v=>v.card);}
 function build(){
  const key=state.hosts.map(h=>h.id).join()+'|'+state.services.map(s=>s.id).join();
  if(key===builtKey)return;builtKey=key;
  $('hostFilter').innerHTML=[['','Semua'],...state.hosts.map(h=>[h.id,h.name])].map(([id,name])=>`<button type="button" class="seg" data-filter="${esc(id)}" aria-pressed="${id===filter}">${esc(name)}<span class="seg-count" data-filter-count="${esc(id)}"></span></button>`).join('');
  $('hostQueues').innerHTML=state.hosts.map(h=>`<article class="host-queue" data-host-queue="${esc(h.id)}" style="--host:${hostColor(h.color)}"><header><h3>${esc(h.name)}</h3><span class="host-state" data-q="state"></span></header><p class="big"><strong data-q="waiting">0</strong><span>menunggu</span></p><p class="next" data-q="next"></p><p class="quota-line" data-q="quota"></p></article>`).join('');
  $('hostControls').innerHTML=state.hosts.map(h=>`<article class="host-control" style="--host:${hostColor(h.color)}">
   <div class="host-id"><h3>${esc(h.name)}</h3><p>${esc(h.role||'')}</p><p class="hint" data-host-remaining="${esc(h.id)}"></p></div>
   <button type="button" class="switch-btn" role="switch" aria-checked="false" data-host-toggle="${esc(h.id)}" aria-label="${esc(h.name)} menerima tiket"><span class="switch-ui" aria-hidden="true"></span><span data-switch-text>—</span></button>
   <form class="inline-form" data-quota-form="${esc(h.id)}" novalidate><label class="field compact" for="quota-${esc(h.id)}"><span>Kuota harian</span><input id="quota-${esc(h.id)}" type="number" inputmode="numeric" min="0" max="1000" step="1" data-quota-input="${esc(h.id)}"></label><button class="btn ghost" type="submit">Simpan</button></form>
  </article>`).join('');
  $('serviceControls').innerHTML=state.services.map(s=>{
   const chips=cardsFor(s.id).map(({host,card})=>`<li class="card-chip" style="--host:${hostColor(host.color)}"><span class="chip-host">${esc(host.name)}</span><b>${esc(card.cardNo)}</b><span class="rarity rarity-${esc(card.rarity)}" title="Kelangkaan ${esc(card.rarity)}">${esc(card.rarity)}</span></li>`).join('');
   return `<article class="menu-row" data-service-row="${esc(s.id)}">
    <div class="menu-info"><h3>${esc(s.name)}</h3><p>${esc(s.subtitle||'')}</p><ul class="card-chips" aria-label="Nomor kartu ${esc(s.name)}">${chips}</ul></div>
    <form class="price-form" data-price-form="${esc(s.id)}" novalidate>
     <label for="price-${esc(s.id)}">Harga normal FS</label>
     <div class="money"><span aria-hidden="true">Rp</span><input id="price-${esc(s.id)}" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="14" data-price-input="${esc(s.id)}" aria-describedby="price-${esc(s.id)}-hint"></div>
     <button class="btn primary" type="submit" data-price-save="${esc(s.id)}">Simpan</button>
     <p class="hint" id="price-${esc(s.id)}-hint" data-price-hint="${esc(s.id)}"></p>
    </form>
    <button type="button" class="switch-btn" role="switch" aria-checked="false" data-service-toggle="${esc(s.id)}" aria-label="${esc(s.name)} tersedia di gacha"><span class="switch-ui" aria-hidden="true"></span><span data-switch-text>—</span></button>
   </article>`;
  }).join('');
 }

 function setSwitch(btn,on,onText,offText){btn.setAttribute('aria-checked',String(on));btn.querySelector('[data-switch-text]').textContent=on?onText:offText;}
 function setInput(input,value,draft){if(draft!==undefined||document.activeElement===input)return;input.value=value;}

 function syncSettings(){
  for(const key of ['mode','schedule','queueLimit','duration'])$(key).value=state.settings[key];
  for(const key of ['sessionOpen','paused','allowPick'])$(key).checked=state.settings[key];
  settingsDirty=false;$('settingsDirty').hidden=true;scheduleCount();
 }
 function scheduleCount(){$('scheduleCount').textContent=`${$('schedule').value.length}/180`;}

 function syncStatus(){
  const s=state.settings,live=s.mode==='live';
  const open=s.sessionOpen&&!s.paused;
  $('statusLine').innerHTML=[
   `<span class="pill ${live?'pill-live':''}">${live?'Booth resmi':'Mode demo'}</span>`,
   `<span class="pill ${open?'pill-ok':'pill-warn'}">${s.paused?'Putaran dijeda':s.sessionOpen?'Sesi dibuka':'Sesi ditutup'}</span>`,
   `<span class="pill">${s.allowPick?'Pilih kartu: dibuka':'Pilih kartu: ditutup'}</span>`,
   `<span class="pill">${state.services.filter(v=>v.enabled).length}/${state.services.length} menu aktif</span>`
  ].join('');
 }

 function syncHosts(){
  const waitingAll=state.history.filter(r=>!r.demo&&r.status==='waiting');
  for(const h of state.hosts){
   const card=document.querySelector(`[data-host-queue="${CSS.escape(h.id)}"]`);if(!card)continue;
   const mine=waitingAll.filter(r=>r.host.id===h.id).sort((a,b)=>(a.queueNumber??0)-(b.queueNumber??0)),next=mine[0];
   card.classList.toggle('is-off',!h.enabled);
   card.querySelector('[data-q="state"]').textContent=h.enabled?'Aktif':'Istirahat';
   card.querySelector('[data-q="waiting"]').textContent=String(state.queue.byHost?.[h.id]??mine.length);
   card.querySelector('[data-q="next"]').textContent=next?`Berikutnya #${pad(next.queueNumber)} · ${next.username} · ${next.service.name}`:'Belum ada tiket menunggu.';
   card.querySelector('[data-q="quota"]').textContent=`Sisa kuota hari ini ${groupDigits(h.remaining)} dari ${groupDigits(h.quota)}`;
   const toggle=document.querySelector(`[data-host-toggle="${CSS.escape(h.id)}"]`);setSwitch(toggle,h.enabled,'Aktif','Istirahat');
   setInput($('quota-'+h.id),h.quota,drafts.quota[h.id]);
   document.querySelector(`[data-host-remaining="${CSS.escape(h.id)}"]`).textContent=`${groupDigits(h.remaining)} slot tersisa hari ini`;
  }
  for(const btn of $('hostFilter').querySelectorAll('[data-filter]')){
   const id=btn.dataset.filter,count=id?waitingAll.filter(r=>r.host.id===id).length:waitingAll.length;
   btn.querySelector('[data-filter-count]').textContent=String(count);btn.setAttribute('aria-pressed',String(id===filter));
  }
 }

 function syncServices(){
  for(const s of state.services){
   const input=$('price-'+s.id),hint=document.querySelector(`[data-price-hint="${CSS.escape(s.id)}"]`);
   setSwitch(document.querySelector(`[data-service-toggle="${CSS.escape(s.id)}"]`),s.enabled,'Aktif','Nonaktif');
   document.querySelector(`[data-service-row="${CSS.escape(s.id)}"]`).classList.toggle('is-off',!s.enabled);
   setInput(input,groupDigits(s.price),drafts.price[s.id]);
   if(drafts.price[s.id]===undefined&&input.getAttribute('aria-invalid')!=='true')hint.textContent=`Tersimpan ${rupiah(s.price)} · pelanggan Bpedia GRATIS`;
   priceDirty(s.id);
  }
 }
 function priceDirty(id){
  const s=state.services.find(v=>v.id===id),btn=document.querySelector(`[data-price-save="${CSS.escape(id)}"]`);
  const draft=drafts.price[id],value=draft===undefined?s.price:parsePrice(draft);
  btn.disabled=draft===undefined||value===s.price;
 }

 function ticketHtml(r,active){
  const card=r.card||{},price=Number.isInteger(card.price)?rupiah(card.price):'—';
  const meta=[card.cardNo,card.rarity,`harga normal ${price}`].filter(Boolean).map(esc).join(' · ');
  const comfort=r.comfort==='no-touch'?'<span class="tag tag-safe">Tanpa sentuhan</span>':'<span class="tag">Sentuhan ringan · tanya ulang</span>';
  const record=r.recording?'<span class="tag">Dokumentasi: tanya ulang</span>':'<span class="tag tag-safe">Tanpa dokumentasi</span>';
  const status=r.status==='served'?'Sudah dilayani':r.status==='cancelled'?'Dibatalkan':'Menunggu';
  const id=esc(r.id);
  const purchase=r.verified===true&&Number.isSafeInteger(r.purchaseAmount)&&Number.isSafeInteger(r.purchaseMinimum)?`Belanja terverifikasi ${rupiah(r.purchaseAmount)} · minimum ${rupiah(r.purchaseMinimum)}`:'Tiket misi lama · nominal belanja tidak tercatat';
  return `<article class="ticket queue-ticket ${active?'':'is-closed'}" style="--host:${hostColor(state.hosts.find(h=>h.id===r.host.id)?.color)}">
   <p class="ticket-no"><small>No.</small>${pad(r.queueNumber)}</p>
   <div class="ticket-body">
    <h3>${esc(r.username)} <span>· ${esc(r.host.name)} / ${esc(r.service.name)}</span></h3>
    <p class="ticket-meta"><code>${id}</code> · ${esc(clock(r.at))} · ${r.method==='pick'?'pilih langsung':'gacha'}</p>
    <p class="ticket-meta">${meta}</p>
    <p class="ticket-purchase">${esc(purchase)}</p>
    <p class="tags">${comfort}${record}${active?'':`<span class="tag tag-status">${status}</span>`}</p>
    <p class="ticket-detail">${esc(r.comfort==='no-touch'?r.service.alternative:r.service.detail)}</p>
   </div>
   ${active?`<div class="ticket-actions"><button type="button" class="btn primary" data-ticket="${id}" data-action="served">Sudah dilayani</button>${r.comfort==='touch'?`<button type="button" class="btn ghost" data-ticket="${id}" data-action="no-touch">Ganti tanpa sentuhan</button>`:''}<button type="button" class="btn ghost danger" data-ticket="${id}" data-action="cancelled">Batalkan</button></div>`:''}
  </article>`;
 }
 function renderTickets(){
  const st=state.stats;
  const issued=state.history.filter(r=>!r.demo),gacha=issued.filter(r=>r.method==='gacha').length,pick=issued.filter(r=>r.method==='pick').length;
  const verified=issued.filter(r=>r.verified===true&&Number.isSafeInteger(r.purchaseAmount)&&r.purchaseAmount>=0&&Number.isSafeInteger(r.purchaseMinimum)&&r.purchaseAmount>=r.purchaseMinimum);
  const total=verified.reduce((sum,r)=>sum+BigInt(r.purchaseAmount),0n);
  const stats=[['Menunggu',groupDigits(state.queue.waiting)],['Tiket terbit',groupDigits(st.issued)],['Sudah dilayani',groupDigits(st.served)],['Dibatalkan',groupDigits(st.cancelled)],['Klaim gacha',groupDigits(gacha)],['Klaim pilih langsung',groupDigits(pick)],['Belanja pada tiket','Rp '+total.toLocaleString('id-ID')]];
  $('stats').innerHTML=stats.map(([name,value])=>`<div class="stat"><span>${esc(name)}</span><strong>${esc(value)}</strong></div>`).join('');
  const thresholds=state.purchaseThresholds;
  $('purchaseRules').textContent=thresholds?`Gacha: belanja minimal ${rupiah(thresholds.gacha)}. Pilih langsung: minimal ${rupiah(thresholds.pick)}. Demo online tetap gratis.`:'Batas belanja belum tersedia. Segarkan data sebelum menerbitkan tiket.';
  $('purchaseSummaryNote').textContent=`Ringkasan semua tiket resmi terbit, termasuk yang dibatalkan. ${groupDigits(verified.length)} tiket mempunyai nominal belanja; ${groupDigits(issued.length-verified.length)} tiket lama tanpa nominal. Jumlah ini berasal dari catatan per tiket, bukan omzet atau jumlah struk unik. Demo tidak dihitung.`;
  function breakdown(items,key,label){
   return `<table class="report-table"><caption>${esc(label)}</caption><thead><tr><th scope="col">${esc(label)}</th><th scope="col">Gacha</th><th scope="col">Pilih</th><th scope="col">Total</th><th scope="col">Belanja (Rp)</th></tr></thead><tbody>${items.map(item=>{
    const rows=issued.filter(r=>r[key]?.id===item.id);
    const amount=verified.filter(r=>r[key]?.id===item.id).reduce((sum,r)=>sum+BigInt(r.purchaseAmount),0n);
    return `<tr><th scope="row">${esc(item.name)}</th><td>${groupDigits(rows.filter(r=>r.method==='gacha').length)}</td><td>${groupDigits(rows.filter(r=>r.method==='pick').length)}</td><td>${groupDigits(rows.length)}</td><td>${amount.toLocaleString('id-ID')}</td></tr>`;
   }).join('')}</tbody></table>`;
  }
  $('purchaseByHost').innerHTML=breakdown(state.hosts,'host','Cosplayer');
  $('purchaseByService').innerHTML=breakdown(state.services,'service','Menu');
  const real=state.history.filter(r=>!r.demo&&(!filter||r.host.id===filter));
  const waiting=real.filter(r=>r.status==='waiting').sort((a,b)=>(a.queueNumber??0)-(b.queueNumber??0));
  $('queueList').innerHTML=waiting.length?waiting.map(r=>ticketHtml(r,true)).join(''):`<p class="empty">${state.settings.mode==='live'?'Belum ada tiket menunggu untuk filter ini.':'Perangkat masih mode demo. Tiket resmi muncul setelah mode booth resmi aktif.'}</p>`;
  $('historyList').innerHTML=real.filter(r=>r.status!=='waiting').reverse().slice(0,100).map(r=>ticketHtml(r,false)).join('')||'<p class="empty">Belum ada tiket selesai.</p>';
 }

 function render({settings=false}={}){
  $('bootStatus').hidden=true;$('loginPanel').hidden=true;$('adminContent').hidden=false;$('logout').hidden=false;
  build();if(settings||!settingsDirty)syncSettings();
  syncStatus();syncHosts();syncServices();renderTickets();
 }

 async function load({quiet=false,settings=false}={}){
  try{state=await api('/api/admin/state');sessionHint.set(true);render({settings});if(!quiet)$('adminError').hidden=true;return true;}
  catch(e){
   if(!state){showLogin();if(e.status!==401)error(e);return false;}
   if(!quiet||e.status===401)error(e);return false;
  }
 }
 async function mutate(route,body,message,trigger,opts={}){
  if(busy)return false;busy=true;$('adminMain').setAttribute('aria-busy','true');if(trigger)trigger.disabled=true;
  try{state=await api(route,body);render(opts);notice(message);return true;}
  catch(e){error(e);return false;}
  finally{busy=false;$('adminMain').removeAttribute('aria-busy');if(trigger&&trigger.isConnected&&!trigger.matches('[data-price-save]'))trigger.disabled=false;if(state&&trigger?.matches('[data-price-save]'))priceDirty(trigger.dataset.priceSave);}
 }

 /* ---------- Login & keluar ---------- */
 $('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const pin=$('pin').value.trim();
  if(!/^\d{4,12}$/.test(pin)){$('pin').setAttribute('aria-invalid','true');error(new Error('PIN berisi 4–12 digit angka.'));$('pin').focus();return;}
  $('pin').removeAttribute('aria-invalid');busy=true;const btn=e.submitter||e.target.querySelector('button');btn.disabled=true;
  try{await api('/api/login',{pin});$('pin').value='';$('adminError').hidden=true;busy=false;await load({settings:true});if(state)$('adminMain').focus();}
  catch(err){error(err);}finally{busy=false;btn.disabled=false;}
 });
 $('logout').addEventListener('click',async()=>{
  try{await api('/api/logout',{});}catch(e){if(e.status!==401){error(e);return;}}
  showLogin();notice('Kamu sudah keluar dari meja petugas.');$('pin').focus();
 });

 /* ---------- Sesi ---------- */
 function markSettingsDirty(){settingsDirty=true;$('settingsDirty').hidden=false;}
 $('settingsForm').addEventListener('input',markSettingsDirty);
 $('schedule').addEventListener('input',()=>{markSettingsDirty();scheduleCount();});
 $('fillSchedule').addEventListener('click',()=>{
  $('schedule').value=MARKET_IN_SCHEDULE;markSettingsDirty();scheduleCount();
  notice('Jadwal Market-In terisi. Tekan Simpan sesi untuk menerapkan.');
 });
 $('settingsForm').addEventListener('submit',e=>{
  e.preventDefault();
  const queueLimit=Number($('queueLimit').value),duration=Number($('duration').value),schedule=$('schedule').value.trim();
  if(!Number.isInteger(queueLimit)||queueLimit<1||queueLimit>100){error(new Error('Batas tiket menunggu harus angka bulat 1–100.'));$('queueLimit').focus();return;}
  if(!Number.isInteger(duration)||duration<1000||duration>8000){error(new Error('Durasi reveal harus 1.000–8.000 milidetik.'));$('duration').focus();return;}
  mutate('/api/admin/settings',{mode:$('mode').value,schedule,queueLimit,duration,sessionOpen:$('sessionOpen').checked,paused:$('paused').checked,allowPick:$('allowPick').checked},'Pengaturan sesi tersimpan.',e.submitter,{settings:true});
 });

 /* ---------- Cosplayer ---------- */
 $('hostControls').addEventListener('click',e=>{
  const b=e.target.closest('[data-host-toggle]');if(!b||!state)return;
  const h=state.hosts.find(v=>v.id===b.dataset.hostToggle);if(!h)return;
  mutate('/api/admin/host',{id:h.id,patch:{enabled:!h.enabled}},h.enabled?`${h.name} ditandai istirahat.`:`${h.name} kembali menerima tiket.`,b);
 });
 $('hostControls').addEventListener('input',e=>{const id=e.target.dataset.quotaInput;if(id)drafts.quota[id]=e.target.value;});
 $('hostControls').addEventListener('submit',async e=>{
  e.preventDefault();const id=e.target.dataset.quotaForm;if(!id)return;
  const input=$('quota-'+id),quota=Number(input.value);
  if(input.value.trim()===''||!Number.isInteger(quota)||quota<0||quota>1000){input.setAttribute('aria-invalid','true');error(new Error('Kuota harian harus angka bulat 0–1.000.'));input.focus();return;}
  input.removeAttribute('aria-invalid');
  const prev=drafts.quota[id];delete drafts.quota[id];
  if(!await mutate('/api/admin/host',{id,patch:{quota}},'Kuota harian tersimpan.',e.submitter))drafts.quota[id]=prev??input.value;
 });

 /* ---------- Menu & harga ---------- */
 $('serviceControls').addEventListener('click',e=>{
  const b=e.target.closest('[data-service-toggle]');if(!b||!state)return;
  const s=state.services.find(v=>v.id===b.dataset.serviceToggle);if(!s)return;
  if(s.enabled&&state.services.filter(v=>v.enabled).length===1&&!window.confirm('Ini menu aktif terakhir. Tanpa menu aktif, putaran baru tidak bisa dimulai. Tetap nonaktifkan?'))return;
  mutate('/api/admin/service',{id:s.id,patch:{enabled:!s.enabled}},s.enabled?`${s.name} dinonaktifkan.`:`${s.name} aktif kembali.`,b);
 });
 $('serviceControls').addEventListener('input',e=>{
  const id=e.target.dataset.priceInput;if(!id)return;
  drafts.price[id]=e.target.value;e.target.removeAttribute('aria-invalid');
  const value=parsePrice(e.target.value),hint=document.querySelector(`[data-price-hint="${CSS.escape(id)}"]`);
  hint.textContent=value===null?'Isi angka bulat 0–10.000.000, tanpa sen.':`Akan disimpan ${rupiah(value)} · belum tersimpan`;
  priceDirty(id);
 });
 $('serviceControls').addEventListener('focusout',e=>{
  const id=e.target.dataset?.priceInput;if(!id)return;
  const value=parsePrice(e.target.value);if(value!==null)e.target.value=groupDigits(value);
  else if(drafts.price[id]!==undefined)e.target.setAttribute('aria-invalid','true');
 });
 $('serviceControls').addEventListener('submit',async e=>{
  e.preventDefault();const id=e.target.dataset.priceForm;if(!id||!state)return;
  const input=$('price-'+id),value=parsePrice(input.value),s=state.services.find(v=>v.id===id),hint=document.querySelector(`[data-price-hint="${CSS.escape(id)}"]`);
  if(value===null){input.setAttribute('aria-invalid','true');hint.textContent='Isi angka bulat 0–10.000.000, tanpa sen.';error(new Error(`Harga ${s.name} harus angka bulat 0–10.000.000 rupiah.`));input.focus();return;}
  input.removeAttribute('aria-invalid');
  if(value===s.price){delete drafts.price[id];syncServices();return;}
  const prev=drafts.price[id];delete drafts.price[id];
  if(!await mutate('/api/admin/service',{id,patch:{price:value}},`Harga ${s.name} kini ${rupiah(value)}.`,e.submitter||e.target.querySelector('[data-price-save]'))){drafts.price[id]=prev??input.value;priceDirty(id);}
  else if(document.activeElement!==input)input.value=groupDigits(value);
 });

 /* ---------- Antrean ---------- */
 $('hostFilter').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b||!state)return;filter=b.dataset.filter;syncHosts();renderTickets();});
 $('queueList').addEventListener('click',e=>{
  const b=e.target.closest('[data-ticket]');if(!b)return;
  if(b.dataset.action==='cancelled'&&!window.confirm('Batalkan tiket ini? Kode ditandai batal di riwayat dan slot kuota dikembalikan.'))return;
  mutate('/api/admin/ticket',{id:b.dataset.ticket,action:b.dataset.action},b.dataset.action==='no-touch'?'Versi tanpa sentuhan tersimpan.':b.dataset.action==='served'?'Tiket ditandai sudah dilayani.':'Tiket dibatalkan.',b);
 });
 $('refreshQueue').addEventListener('click',async()=>{if(await load())notice('Antrean diperbarui.');});

 if(sessionHint.get())load({settings:true});else showLogin();
 setInterval(()=>{if(state&&!busy&&!document.hidden)load({quiet:true});},10000);
 }
})();
