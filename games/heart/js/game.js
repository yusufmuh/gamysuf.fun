'use strict';
(()=>{
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const PATHS={heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',flower:'<path d="M12 8C7-1 2 5 6 10c-9 1-5 9 1 7-2 9 7 9 8 3 7 5 12-2 6-6 7-6 0-12-5-7-1-7-7-6-4 1Z"/><circle cx="12" cy="13" r="3"/>',rose:'<path d="M12 21v-9m0 6c-1-5-7-5-7-5 0 5 7 5 7 5Zm0-2c2-5 7-5 7-5 0 4-7 5-7 5ZM5 4c1-2 4-2 7 0 3-2 6-2 7 0 1 4-3 8-7 8S4 8 5 4Z"/><path d="m7 3 5 5 5-5"/>',shoe:'<path d="M3 17c4-1 6-6 7-11l3 1c0 5 3 8 8 10v3H3Zm6-2 3 1m3 4v-5M4 20v2"/>',sparkle:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm7 0v4m-2-2h4M4 18v4m-2-2h4"/>',crown:'<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Zm3 8h12M6 22h12"/>',hand:'<path d="M8 13V5a2 2 0 0 1 4 0v7-8a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v9c0 4-3 6-7 6-3 0-5-2-7-4l-3-4c-2-3 1-5 3-3l2 2Z"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',sound:'<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',mute:'<path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6"/>'};
 const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]||PATHS.heart}</svg>`;
 document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
 const storage={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{}},session(k,v){try{if(v===undefined)return sessionStorage.getItem(k);if(v===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,v);}catch{return null;}}};
 const audio=new window.HeartAudio(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const ui={state:null,host:'zoro',stage:'home',busy:false,result:null,request:null,animation:null,lastFocus:null,collection:[],toastTimer:null};
 try{ui.collection=JSON.parse(storage.get('heart-collection')||'[]');if(!Array.isArray(ui.collection))ui.collection=[];}catch{}
 try{const r=JSON.parse(storage.session('heart-request')||'null');if(r&&typeof r.requestId==='string')ui.request=r;}catch{}
 function motion(){const minimal=reduced.matches||storage.get('gamysuf-reduced-motion')==='1'||storage.get('heart-reduced-motion')==='1';document.documentElement.dataset.motion=minimal?'reduce':'full';$('motionButton').setAttribute('aria-pressed',String(minimal));return minimal;}
 motion();reduced.addEventListener('change',()=>{if(motion()&&ui.stage==='drawing')finishAnimation();});
 async function api(route,body){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{const res=await fetch(route,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-bpedia-client':'heartparade'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});const json=await res.json();if(!res.ok)throw Object.assign(new Error(json.error||'Permintaan gagal.'),{status:res.status});return json;}
  catch(error){if(error.status)throw error;throw new Error('Koneksi belum stabil. Putaranmu tetap disimpan; coba lagi.');}finally{clearTimeout(timeout);}
 }
 const host=()=>ui.state?.hosts.find(h=>h.id===ui.host),demo=()=>ui.state?.settings.mode!=='live';
 function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(ui.toastTimer);ui.toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
 function connection(text){$('connectionText').textContent=text;$('connection').hidden=false;}
 function soundState(){const b=$('soundButton');b.innerHTML=icon(audio.muted?'mute':'sound');b.setAttribute('aria-label',audio.muted?'Aktifkan suara':'Matikan suara');window.dispatchEvent(new CustomEvent('gamysuf:audio-state',{detail:{muted:audio.muted}}));}
 function openDialog(id){ui.lastFocus=document.activeElement;$(id).showModal();}
 function closeDialog(id){$(id).close();if(ui.lastFocus?.isConnected)ui.lastFocus.focus({preventScroll:true});}
 function collection(){
  const all=ui.state?.services||[];
  $('stampAlbum').innerHTML=['zoro','sanji'].flatMap(h=>all.map(s=>{const owns=ui.collection.includes(`${h}:${s.id}`);return `<span class="stamp ${owns?'owned':''} ${h==='sanji'?'gold':''}" title="${esc(h==='zoro'?'Zoro':'Sanji')} · ${esc(s.name)} · ${owns?'terkumpul':'belum ditemukan'}" aria-label="${esc(h)} ${esc(s.name)} ${owns?'terkumpul':'belum ditemukan'}">${icon(s.icon)}</span>`;})).join('');
  $('collectionCount').textContent=`${ui.collection.filter(k=>['zoro','sanji'].some(h=>all.some(s=>k===h+':'+s.id))).length} dari 14 momen terkumpul di perangkat ini.`;
 }
 function render(){
  const s=ui.state;if(!s)return;
  if(!s.hosts.some(h=>h.id===ui.host&&h.enabled&&(demo()||h.remaining>0)))ui.host=s.hosts.find(h=>h.enabled&&(demo()||h.remaining>0))?.id||'zoro';
  document.body.dataset.host=ui.host;
  document.querySelectorAll('.host-card').forEach(card=>{const h=s.hosts.find(v=>v.id===card.dataset.host),selected=h.id===ui.host;card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',String(selected));card.disabled=!h.enabled||(!demo()&&h.remaining===0)||ui.busy;card.querySelector('.host-availability').textContent=!h.enabled?'Sedang istirahat':!demo()&&h.remaining===0?'Kuota habis':selected?'PESONA PILIHANMU':'Pilih '+h.name;});
  $('hostQuote').textContent=host()?.quote||'Momen manis akan segera kembali.';$('quoteName').textContent='— '+(host()?.name||'Bipy');
  $('modeBadge').textContent=demo()?'DEMO ONLINE · GRATIS':'TIKET RESMI BOOTH';
  const canPlay=!s.settings.paused&&s.settings.sessionOpen&&s.hosts.some(h=>h.enabled&&(demo()||h.remaining>0))&&s.services.some(v=>v.enabled);
  $('sessionNote').textContent=!canPlay?'Sesi istirahat · '+s.settings.schedule:demo()?'Kartu digital untuk koleksimu.':`${s.queue.waiting} tiket menunggu · ${s.settings.schedule}`;
  $('startButton').disabled=!canPlay||ui.busy;$('startButton').querySelector('span:nth-child(2)').textContent=ui.request?'Lanjutkan putaran':'Buka kapsul hati';
  $('momentGrid').innerHTML=s.services.map((v,i)=>`<article class="moment"><span class="moment-num">0${i+1}</span><div class="moment-symbol">${icon(v.icon)}</div><h3>${esc(v.name)}</h3><p>${esc(v.subtitle)}</p><small>${v.enabled?'Versi tanpa sentuhan tersedia':'Sedang tidak tersedia'}</small></article>`).join('')+'<article class="moment note-tile"><img src="/assets/brand/bipy-pink.webp" alt="Bipy" width="62" height="84" loading="lazy"><h3>Nyaman itu utama.</h3><p>Kamu boleh bilang berhenti,<br>kapan pun.</p></article>';
  $('orbit').innerHTML=s.services.map((v,i)=>`<span class="orbit-ticket" style="--angle:${i*360/7}deg">${icon(v.icon)}</span>`).join('');
  collection();document.body.dataset.ready='1';
 }
 async function refresh(){
  try{ui.state=await api('/api/state');$('connection').hidden=true;render();if(ui.state.pending&&ui.stage==='home')showResult(ui.state.pending);else if(ui.request&&ui.stage==='home')connection('Putaran sebelumnya belum terkonfirmasi. Klik Coba lagi untuk memulihkannya.');return true;}
  catch(error){connection(error.message);return false;}
 }
 function prepare(){
  if(!ui.state||ui.busy)return;audio.unlock();audio.select();if(ui.request){draw(ui.request);return;}
  $('prepHost').textContent='Bersama '+host().name;
  $('pickService').innerHTML='<option value="">Gacha · biarkan kapsul memilih</option>'+ui.state.services.filter(s=>s.enabled).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
  $('pickLabel').hidden=!ui.state.settings.allowPick;
  $('verifiedLabel').hidden=demo();$('verifiedCheck').checked=false;$('verifiedCheck').required=!demo();$('consentCheck').checked=false;$('recordingConsent').checked=false;$('prepError').hidden=true;
  $('prepMode').textContent=demo()?'Kartu digital gratis. Bukan tiket klaim booth.':'Tiket booth mengikuti misi dan ketersediaan cosplayer. Persetujuan tetap ditanyakan ulang.';
  openDialog('prepDialog');
 }
 function clearRequest(){ui.request=null;storage.session('heart-request',null);}
 async function draw(request){
  if(ui.busy)return;ui.busy=true;ui.request=request;storage.session('heart-request',JSON.stringify(request));$('drawButton').disabled=true;render();
  try{
   const result=await api('/api/play',request);clearRequest();$('connection').hidden=true;if($('prepDialog').open)closeDialog('prepDialog');animate(result);
  }catch(error){
   let recovered=null;try{const state=await api('/api/state');ui.state=state;recovered=state.pending;}catch{}
   if(recovered){clearRequest();if($('prepDialog').open)closeDialog('prepDialog');showResult(recovered);}
   else{if(error.status&&error.status<500)clearRequest();$('prepError').textContent=error.message;$('prepError').hidden=false;connection(error.message);}
  }finally{ui.busy=false;$('drawButton').disabled=false;render();}
 }
 function animate(result){
  ui.result=result;ui.host=result.host.id;document.body.dataset.host=ui.host;ui.stage='drawing';$('homeView').hidden=true;$('drawView').hidden=false;document.body.classList.add('drawing');
  $('drawHost').src=result.host.image;$('drawHost').alt=result.host.name;$('drawBipy').src=result.host.mascot;$('drawBipy').alt='Bipy '+result.host.name;
  $('drawView').scrollIntoView({behavior:'instant',block:'start'});audio.draw();
  if(motion()){showResult(result);return;}
  const start=performance.now(),duration=result.duration||4200;
  function tick(now){const p=Math.min(1,(now-start)/duration);$('drawProgress').style.width=(p*100)+'%';$('drawStatus').textContent=p<.5?'Bipy sedang memilih undangan untukmu…':p<.85?'Satu momen kecil, satu cerita baru…':'Undanganmu siap dibuka!';if(p<1&&ui.stage==='drawing')ui.animation=requestAnimationFrame(tick);else if(ui.stage==='drawing')showResult(result);}
  ui.animation=requestAnimationFrame(tick);
 }
 function finishAnimation(){if(ui.stage==='drawing'&&ui.result)showResult(ui.result);}
 function showResult(result){
  cancelAnimationFrame(ui.animation);document.body.classList.remove('drawing');ui.result=result;ui.stage='result';ui.host=result.host.id;document.body.dataset.host=ui.host;
  $('resultHost').src=result.host.image;$('resultHost').alt=result.host.name+' full body';$('resultHostName').textContent=result.host.name;$('resultBipy').src=result.host.mascot;
  $('resultSymbol').innerHTML=icon(result.service.icon);$('resultTitle').textContent=result.service.name;$('resultSubtitle').textContent=result.service.subtitle;
  $('resultDetail').textContent=result.comfort==='no-touch'?result.service.alternative:result.service.detail;
  $('resultComfort').textContent=result.comfort==='no-touch'?'Pilihanmu: tanpa sentuhan':'Sentuhan ringan · konfirmasi ulang sebelum mulai';
  $('ticketLabel').textContent=result.demo?'KARTU DIGITAL · DEMO ONLINE':`ANTREAN ${String(result.queueNumber).padStart(3,'0')} · ${result.host.name.toUpperCase()}`;
  $('ticketCode').textContent=result.id;$('ticketNote').textContent=result.demo?'Simpan sebagai kenang-kenangan. Tidak berlaku untuk klaim booth.':`Tunjukkan kode ke petugas. Estimasi saat terbit ±${Math.max(1,Math.ceil(result.estimatedSeconds/60))} menit; ikuti panggilan petugas.`;
  $('resultConsent').textContent=(result.recording?'Izin dokumentasi dipilih; konfirmasi ulang sebelum merekam.':'Tanpa dokumentasi. Jangan merekam tanpa izin baru.')+' Tamu dan cosplayer boleh berhenti atau memilih alternatif.';
  $('resultError').hidden=true;$('finishButton').disabled=false;
  const key=result.host.id+':'+result.service.id;if(!ui.collection.includes(key)){ui.collection.push(key);storage.set('heart-collection',JSON.stringify(ui.collection));}collection();audio.reveal();
  if(!$('resultDialog').open)openDialog('resultDialog');
 }
 async function acknowledge(){
  if(ui.busy||!ui.result)return;ui.busy=true;$('finishButton').disabled=true;
  try{ui.state=await api('/api/result',{id:ui.result.id});closeDialog('resultDialog');ui.result=null;ui.stage='home';$('drawView').hidden=true;$('homeView').hidden=false;$('playerName').value='';$('recordingConsent').checked=false;$('consentCheck').checked=false;$('connection').hidden=true;render();$('startButton').focus({preventScroll:true});$('homeView').scrollIntoView({behavior:'instant'});}
  catch(error){$('resultError').textContent='Kartu belum ditutup. '+error.message;$('resultError').hidden=false;}
  finally{ui.busy=false;$('finishButton').disabled=false;render();}
 }
 async function loadImage(url){const img=new Image();img.src=url;await img.decode();return img;}
 function contain(ctx,img,x,y,w,h){const ratio=Math.min(w/img.width,h/img.height),width=img.width*ratio,height=img.height*ratio;ctx.drawImage(img,x+(w-width)/2,y+(h-height)/2,width,height);}
 async function saveCard(){
  const r=ui.result;if(!r)return;$('saveCard').disabled=true;
  try{
   await document.fonts.ready;const [art,bipy]=await Promise.all([loadImage(r.host.image),loadImage(r.host.mascot)]);
   const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d');
   c.fillStyle='#FBF4E8';c.fillRect(0,0,1080,1350);c.fillStyle=r.host.id==='zoro'?'#DCE7D5':'#F6DCA2';c.fillRect(35,35,1010,960);c.strokeStyle='#B99372';c.lineWidth=2;c.strokeRect(20,20,1040,1310);
   c.fillStyle='#CE3C65';c.font='600 23px Poppins';c.textAlign='center';c.fillText('BIPY HEART PARADE / BPEDIA',540,92);contain(c,art,195,100,680,870);contain(c,bipy,775,690,195,300);
   c.fillStyle='#382B2D';c.font='italic 65px Fraunces';c.fillText(r.service.name,540,1070,970);c.font='500 26px Poppins';c.fillText('Bersama '+r.host.name,540,1120);c.font='500 21px Poppins';c.fillText(r.comfort==='no-touch'?'Versi tanpa sentuhan':'Sentuhan ringan, dengan persetujuan',540,1170);c.font='600 26px Poppins';c.fillText(r.id,540,1220);c.font='500 18px Poppins';c.fillText(r.demo?'KARTU DEMO ONLINE / TIDAK BERLAKU UNTUK KLAIM BOOTH':'TIKET BOOTH / VERIFIKASI DAN ANTRE MELALUI PETUGAS',540,1270,980);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Gagal membuat kartu.');
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`Heart-Parade-${r.host.name}-${r.service.id}.png`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Kartu siap disimpan di perangkatmu.');
  }catch{toast('Kartu belum bisa diunduh. Coba lagi setelah gambar selesai dimuat.');}finally{$('saveCard').disabled=false;}
 }
 $('startButton').addEventListener('click',prepare);
 document.querySelectorAll('.host-card').forEach(card=>card.addEventListener('click',()=>{if(ui.busy)return;ui.host=card.dataset.host;audio.unlock();audio.select();render();}));
 $('prepForm').addEventListener('submit',event=>{event.preventDefault();if(!$('prepForm').reportValidity())return;audio.unlock();const request={requestId:crypto.randomUUID(),host:ui.host,comfort:new FormData($('prepForm')).get('comfort'),consent:$('consentCheck').checked,recording:$('recordingConsent').checked,username:$('playerName').value.trim(),verified:!demo()&&$('verifiedCheck').checked,pick:ui.state.settings.allowPick?$('pickService').value:''};draw(ui.request||request);});
 document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{if(!ui.busy)closeDialog(button.dataset.close);}));
 $('prepDialog').addEventListener('cancel',event=>{if(ui.busy)event.preventDefault();});
 $('resultDialog').addEventListener('cancel',event=>{event.preventDefault();acknowledge();});
 $('finishButton').addEventListener('click',acknowledge);$('saveCard').addEventListener('click',saveCard);$('skipAnimation').addEventListener('click',finishAnimation);
 $('soundButton').addEventListener('click',()=>{audio.setMuted(!audio.muted);soundState();});
 $('motionButton').addEventListener('click',()=>{storage.set('heart-reduced-motion',motion()?'0':'1');if(motion())finishAnimation();toast(motion()?'Animasi dikurangi.':'Animasi diaktifkan.');});
 $('retryButton').addEventListener('click',async()=>{if(ui.busy)return;if(ui.request)await draw(ui.request);else await refresh();});
 document.addEventListener('keydown',event=>{if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,select,textarea,[contenteditable]'))return;if(event.key.toLowerCase()==='m'){event.preventDefault();audio.setMuted(!audio.muted);soundState();}if(event.code==='Space'&&ui.stage==='home'&&!document.querySelector('dialog[open]')&&!event.target.closest('button,a')){event.preventDefault();prepare();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&ui.stage==='drawing')finishAnimation();});
 window.addEventListener('gamysuf:audio',event=>{audio.setMuted(event.detail?.muted);soundState();});window.addEventListener('gamysuf:audio-query',soundState);
 window.addEventListener('online',()=>{if(!ui.busy&&ui.stage==='home'&&!ui.request)refresh();});window.addEventListener('offline',()=>connection('Koneksi terputus. Kartu yang sudah terbuka tetap tersimpan.'));
 soundState();refresh();setInterval(()=>{if(!document.hidden&&!ui.busy&&ui.stage==='home'&&!document.querySelector('dialog[open]')&&!ui.request)refresh();},20000);
})();
