'use strict';
(()=>{
 const {api,esc,icon,visual,toast,open,percent}=Bpedia,$=s=>document.querySelector(s);
 let state=null,spinning=false,rotation=0,result=null,poseTimer,soundOverride=null,requestId=null,confettiFrame,launchTimer;
 const arena=$('#stage-dialog'),wheelStage=$('#wheel-stage'),controls=$('.spin-controls'),mascot=$('.mascot-section');
 let lastDodge=0,escapeTimer,currentGame='wheel',bonusRequestId=null,lastActivity=Date.now(),firstUserGesture=false;
 const boxStage=$('#box-stage');

 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const zonk={id:'zonk',name:'Zonk',fullName:'Zonk · belum beruntung',tier:'zonk',image:''};
 function wheelItems(){return state.wheel||GameRules.wheel(state.prizes,state.odds,zonk);}
 function drawWheel(items){
  const count=items.length||1,layout=WheelLayout.geometry(count);let paths='',labels='';
  const point=a=>[300+298*Math.cos(a),300+298*Math.sin(a)];
  if(items.length===1){paths=`<circle cx="300" cy="300" r="298" fill="#f4d5dc"/>`;}
  for(let i=0;i<items.length;i++){
   const p=items[i],a=(i/count*360-90)*Math.PI/180,b=((i+1)/count*360-90)*Math.PI/180;
   const [x1,y1]=point(a),[x2,y2]=point(b),mid=(a+b)/2;
   const color=p.tier==='bonus'?'#993369':p.tier==='grand'?'#ffe8b5':p.tier==='bundling'?'#c72e62':p.tier==='zonk'?'#efdce5':['#fff2f5','#ffd3e0','#ffe2e9','#ffc4d8'][i%4];
   if(items.length>1)paths+=`<path d="M300 300 L${x1} ${y1} A298 298 0 ${b-a>Math.PI?1:0} 1 ${x2} ${y2} Z" fill="${color}" stroke="#fff9f2" stroke-width="1.3"/>`;
   const [label,shade]=WheelLayout.caption(p);
   const art=p.image?visual(p):`<span class="wheel-symbol">${icon(p.tier==='grand'?'crown':p.tier==='voucher'?'ticket':p.tier==='bundling'?'gift':p.tier==='bonus'?'boxes':'sparkles')}</span>`;
   labels+=`<div class="wheel-item ${esc(p.tier)}" data-prize="${esc(p.id)}" aria-label="${esc(p.fullName)}" style="left:${50+layout.radius*Math.cos(mid)}%;top:${50+layout.radius*Math.sin(mid)}%;width:${layout.width}%;height:${layout.height}%;--label-size:${layout.font}cqw;transform:translate(-50%,-50%) rotate(${mid*180/Math.PI+90}deg)"><div class="wheel-photo">${art}</div><span class="wheel-caption"><b>${esc(label)}</b><small>${esc(shade)}</small></span></div>`;
  }
  if(!items.length)paths='<circle cx="300" cy="300" r="298" fill="#f4e7e6"/><text x="300" y="190" fill="#986577" text-anchor="middle" font-size="18">Hadiah sedang disiapkan</text>';
  $('#wheel-sectors').innerHTML=paths;$('#wheel-items').innerHTML=labels;
 }
 function pose(name,message){clearTimeout(poseTimer);const rig=$('#mascot-rig');rig.className='mascot-rig';void rig.offsetWidth;if(name)rig.classList.add(name);if(message)$('#mascot-speech').textContent=message;if(!['excited','nervous'].includes(name))poseTimer=setTimeout(()=>rig.className='mascot-rig',4100);}
 function resetEscape(){clearTimeout(escapeTimer);const button=$('#mascot-button');button.style.setProperty('--escape-x','0px');button.style.setProperty('--escape-y','0px');button.style.setProperty('--escape-tilt','0deg');button.classList.remove('dodging');}
 function openArena(){
  if(!state||arena.open)return;resetEscape();$('#stage-wheel-slot').append(wheelStage,boxStage);$('#stage-controls-slot').append(controls);$('#stage-mascot-slot').append(mascot);document.body.classList.add('arena-open');open(arena);render({redraw:!result});$('#spin-button').focus({preventScroll:true});pose('waving',currentGame==='boxes'?'Pilih kotakmu, atau biarkan aku memilih!':'Klik aku atau tombol putar. Ayo cari kejutanmu!');
 }
 function closeArena(){
  if(spinning||result||(state?.pending&&state.pending.stage!=='awaiting-box')){toast('Selesaikan putaran dan tutup hasil terlebih dahulu.');return;}
  resetEscape();$('#home-wheel-slot').append(wheelStage);$('#home-box-slot').append(boxStage);$('#home-controls-slot').append(controls);$('#home-mascot-slot').append(mascot);arena.close();document.body.classList.remove('arena-open');render();$('#spin-button').focus({preventScroll:true});
 }
 function play(){if(!arena.open)openArena();else if(state?.pending?.stage==='awaiting-box')openBonus(Math.floor(Math.random()*3));else spin();}
 function resetBoxes(){boxStage.classList.remove('is-unboxing','is-revealed');boxStage.querySelectorAll('[data-box]').forEach(b=>{b.classList.remove('is-selected');b.querySelector('.box-reveal').innerHTML='';});$('#box-status').textContent='Ketiga kotak setara. Pilih satu — tanpa zonk.';}
 function selectGame(){if(state?.pending?.stage==='awaiting-box'){currentGame='boxes';openArena();return;}if(spinning||result||state?.pending){toast('Selesaikan hasil permainan terlebih dahulu.');return;}currentGame='wheel';resetBoxes();render();openArena();}
 function renderGame(){
  const boxes=currentGame==='boxes',bonus=state.pending?.stage==='awaiting-box';wheelStage.hidden=boxes;boxStage.hidden=!boxes;document.body.classList.toggle('is-box-game',boxes);
  $('#stage-title').textContent=boxes?'Beauty Box · Bonus':'Spin Wheel';$('.wheel-label').innerHTML='<span class="label-line"></span>'+(boxes?'BONUS BEAUTY BOX':'SPIN WHEEL')+'<span class="label-line"></span>';
  $('#arena-note').textContent=boxes?'Kesempatan terakhir · satu kotak · tanpa zonk':'Dapat Mystery Box? Lanjut ke bonus tanpa zonk · segmen bukan ukuran peluang';
  document.querySelectorAll('[data-game]').forEach(b=>{b.setAttribute('aria-pressed',String(!boxes));b.disabled=spinning||!!result;});
  document.querySelectorAll('[data-mode]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.mode===state.settings.mode));b.disabled=spinning||!!result||!!state.pending;});
  boxStage.querySelectorAll('[data-box]').forEach(b=>b.disabled=spinning||!!result||!bonus);
 }

 function animateBoxes(r){
  resetBoxes();const selected=boxStage.querySelector('[data-box="'+r.choice+'"]');selected.classList.add('is-selected');selected.querySelector('.box-reveal').innerHTML=visual(r.prize);boxStage.style.setProperty('--reveal-time',r.duration+'ms');boxStage.classList.add('is-unboxing');$('#box-status').textContent='Kotak '+(r.choice+1)+' sedang membuka kejutanmu…';
  return new Promise(resolve=>setTimeout(()=>{boxStage.classList.remove('is-unboxing');boxStage.classList.add('is-revealed');$('#box-status').textContent=r.prize.fullName;resolve();},r.duration));
 }
 async function requestMode(mode){
  if(spinning||result||state?.pending){toast('Selesaikan hasil permainan sebelum mengganti mode.');return;}
  if(mode===state.settings.mode){toast(mode==='demo'?'Mode demo aktif. Tidak ada hasil yang disimpan.':'Mode permainan aktif. Hasil disimpan dan stok berkurang.');return;}
  if(mode==='demo'){try{state=await api('/api/play-mode',{mode});render();toast('Mode demo: stok dan riwayat tidak berubah.');}catch(e){toast(e.message,true);}return;}
  try{state=await api('/api/play-mode',{mode:'live'});render();toast('Mode permainan aktif. Hasil disimpan dan stok berkurang.');}
  catch(e){if(e.status!==401){toast(e.message,true);return;}$('#mode-login-fields').hidden=false;$('#mode-error').hidden=true;$('#mode-password').value='';open($('#mode-dialog'));$('#mode-password').focus();}
 }
 $('#mode-form').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('#confirm-mode'),dialog=$('#mode-dialog');btn.disabled=true;dialog.dataset.busy='true';
  try{if(!$('#mode-login-fields').hidden)await api('/api/login',{username:$('#mode-username').value.trim(),password:$('#mode-password').value});state=await api('/api/play-mode',{mode:'live'});dialog.close();$('#mode-password').value='';render();toast('Mode permainan aktif. Hadiah berikutnya akan mengurangi stok.');}
  catch(err){$('#mode-error').textContent=err.status===401?'Masuk sebagai admin untuk mengaktifkan permainan.':err.message;$('#mode-error').hidden=false;if(err.status===401){$('#mode-login-fields').hidden=false;$('#mode-username').focus();}}
  finally{btn.disabled=false;delete dialog.dataset.busy;}
 });
 function dodge(event){
  if(event.pointerType!=='mouse'||reduced.matches||innerWidth<700||spinning||result||$('dialog[open]:not(#stage-dialog)')||$('#mascot-button').matches(':focus-visible')||performance.now()-lastDodge<400)return;
  const button=$('#mascot-button'),rect=button.getBoundingClientRect(),zone=mascot.getBoundingClientRect();
  const center={x:rect.left+rect.width*.49,y:rect.top+rect.height*.52};
  const distance=Math.hypot(center.x-event.clientX,center.y-event.clientY);if(distance>115)return;
  const matrix=new DOMMatrixReadOnly(getComputedStyle(button).transform),base={x:center.x-matrix.m41,y:center.y-matrix.m42};
  const maxX=Math.max(20,Math.min(arena.open?72:48,(zone.width-145)/2)),maxY=arena.open?18:22;
  const candidates=[[-maxX,-maxY],[-maxX,maxY],[maxX,-maxY],[maxX,maxY],[0,-maxY],[0,maxY]];
  const score=([x,y])=>Math.hypot(base.x+x-event.clientX,base.y+y-event.clientY);
  candidates.sort((a,b)=>score(b)-score(a));const target=candidates[0];if(score(target)<distance+12)return;
  lastDodge=performance.now();clearTimeout(escapeTimer);button.style.setProperty('--escape-x',`${target[0]}px`);button.style.setProperty('--escape-y',`${target[1]}px`);button.style.setProperty('--escape-tilt',`${target[0]>0?7:-7}deg`);button.classList.add('dodging');
  pose('escaping',Math.random()>.5?'Eits, aku kabur dulu!':'Kejar aku? Putar dulu, yuk!');escapeTimer=setTimeout(resetEscape,1600);
 }
 function syncSound(){
  boothAudio.configure(state.settings);
  if(soundOverride!==null){boothAudio.enabled=soundOverride;boothAudio.apply();}
  $('#sound-button').innerHTML=icon(boothAudio.enabled?'volume':'mute');
  $('#sound-button').setAttribute('aria-label',boothAudio.enabled?'Matikan suara':'Aktifkan suara');
  $('#sound-button').setAttribute('aria-pressed',String(boothAudio.enabled));
  updateMusicBarUI();
 }
 function updateMusicBarUI(){
  const bar=$('#music-player-bar'),btn=$('#music-play-btn'),loopBtn=$('#music-loop-btn'),loopText=$('#music-loop-text'),title=$('#music-track-title'),status=$('#music-track-status'),trackSelect=$('#music-track-select'),volSlider=$('#music-vol-slider');
  if(!bar)return;
  const playing=boothAudio.bgmPlaying&&boothAudio.enabled;
  bar.classList.toggle('is-playing',playing);
  btn.innerHTML=icon(playing?'pause':'play');
  btn.setAttribute('aria-label',playing?'Jeda musik latar':'Putar musik latar');
  const trackNames={'bpedia-bgm':'♫ Bpedia Beauty Pop (BGM)','bpedia-jingle':'♫ Bpedia Jingle Signature','bpedia-ringtone':'♫ Bpedia Ringtone Theme'};
  title.textContent=trackNames[boothAudio.bgmTrack]||'♫ Bpedia Sound';
  status.textContent=playing?(boothAudio.bgmLoop?'Memutar · Loop ON':'Memutar sekali'):'Musik latar · Standby';
  loopBtn.setAttribute('aria-pressed',String(boothAudio.bgmLoop));
  loopText.textContent=boothAudio.bgmLoop?'Loop ON':'Loop OFF';
  if(trackSelect&&trackSelect.value!==boothAudio.bgmTrack)trackSelect.value=boothAudio.bgmTrack;
  if(volSlider)volSlider.value=Math.round(boothAudio.bgmVolume*100);
 }

 function render({redraw=true}={}){
  if(!state)return;const s=state.summary,demo=state.settings.mode==='demo';
  $('#total-prizes').textContent=s.total;$('#bundle-stock').textContent=s.bundling;$('#voucher-stock').textContent=s.voucher;$('#product-stock').textContent=s.product;$('#grand-stock').textContent=s.grand;renderGame();
  $('#event-name').textContent=state.settings.eventName;$('#mode-badge').textContent=demo?'MODE DEMO · STOK AMAN':state.settings.paused?'PERMAINAN DIJEDA':'MODE PERMAINAN · DATA TERSIMPAN';$('#mode-badge').classList.toggle('live',!demo&&!state.settings.paused);
  const unavailable=state.settings.paused||state.odds.paused;
  const bonus=state.pending?.stage==='awaiting-box';$('#spin-button').disabled=spinning||!!result||(!bonus&&(!!state.pending||unavailable));
  $('#spin-label').textContent=spinning?(currentGame==='boxes'?'Kotak sedang dibuka…':'Sedang berputar…'):state.settings.paused?'Permainan dijeda':state.odds.paused?'Hadiah sedang disiapkan':!arena.open?(currentGame==='boxes'?'Buka Beauty Box':'Buka spin layar penuh'):currentGame==='boxes'?'Pilihkan kotak untukku':demo?'Coba putar rodanya':'Putar & raih hadiah';
  $('#spin-hint').innerHTML=unavailable?'Petugas sedang menyiapkan hadiah berikutnya.':!arena.open?'Langsung spin · tanpa form verifikasi':demo?'Demo · tidak menyimpan hasil · <kbd>SPASI</kbd>':'Permainan · stok berkurang · <kbd>SPASI</kbd>';
  $('#stage-mode').textContent=$('#mode-badge').textContent;$('#stage-remaining').textContent=s.total;$('#close-arena').disabled=spinning||(!bonus&&!!state.pending)||!!result;
  $('#mascot-button').setAttribute('aria-label',arena.open?(currentGame==='boxes'?'Pilih kotak bersama maskot Bpedia':'Putar roda bersama maskot Bpedia'):'Sapa maskot Bpedia');$('#stage-catalog span').textContent=`Lihat ${state.prizes.length} jenis hadiah`;
  $('#arena-stock-note').textContent=`${s.grand} utama · ${s.bundling} bundling · ${s.voucher} voucher · ${s.product} produk`;
  if(redraw&&!spinning&&!result)drawWheel(wheelItems());
  if(bonus){$('#spin-label').textContent=arena.open?'Pilihkan satu kotak':'Lanjutkan bonus Beauty Box';$('#spin-hint').textContent='Bonus sudah didapat · stok belum berkurang · buka satu kotak';}$('#eligibility-chip').textContent=demo?'DEMO · tanpa pengurangan stok':'PERMAINAN · LANGSUNG SPIN';const picks=['powder-000','foundation-04','duo-m03','salsa-vinilash','stick-hs03'].map(id=>state.prizes.find(p=>p.id===id)).filter(Boolean);
  $('#shelf-products').innerHTML=picks.map(p=>`<button class="shelf-item" data-show-prize="${esc(p.id)}"><span class="shelf-image">${visual(p)}</span><span class="shelf-info"><small>${esc(p.brand)}</small><strong>${esc(p.name)}</strong><span>${esc(p.variant)}</span></span></button>`).join('');
  const grand=state.prizes.find(p=>p.tier==='grand'&&p.enabled);$('#grand-visual').innerHTML=grand?visual(grand):'<span class="empty">Hadiah utama sedang disiapkan.</span>';$('#grand-title').textContent=grand?.name||'Hadiah utama';$('#grand-minimum').textContent=grand?.variant||'';$('#grand-note').textContent=grand?.stock?'Voucher eksklusif di aplikasi Beautypedia.':'Hadiah utama sudah habis / belum aktif.';
  syncSound();
 }
 async function refresh(){try{const next=await api('/api/state');const changed=!state||next.revision!==state.revision||next.settings.mode!==state.settings.mode;state=next;$('#connection-error').hidden=true;if(changed)render();if(next.pending&&!spinning&&!result&&!(next.pending.stage==='awaiting-box'&&currentGame==='boxes'))recover(next.pending);}catch(e){$('#connection-error').textContent='Koneksi lokal terputus. Stok tidak diubah. Buka ulang aplikasi jika diperlukan.';$('#connection-error').hidden=false;$('#spin-button').disabled=true;}}
 function animateTo(to,duration,count){return new Promise(resolve=>{const from=rotation,start=performance.now();let lastTick=-1;function frame(now){const t=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-t,5);rotation=from+(to-from)*ease;$('#wheel-rotor').style.transform=`rotate(${rotation}deg)`;const tick=Math.floor(rotation/(360/count));if(tick!==lastTick&&t<.995){boothAudio.tick(1-t);const pointer=$('#wheel-pointer');pointer.classList.remove('tick');void pointer.offsetWidth;pointer.classList.add('tick');lastTick=tick;}if(t<1)requestAnimationFrame(frame);else{rotation=to;resolve();}}requestAnimationFrame(frame);});}
 async function spin(){
  if(spinning||result||!state||state.pending||$('#spin-button').disabled||$('dialog[open]:not(#stage-dialog)'))return;
  if(!arena.open)openArena();resetEscape();spinning=true;lastActivity=Date.now();$('#spin-button').disabled=true;$('#close-arena').disabled=true;
  try{
   try{await boothAudio.activate();}catch{toast('Audio belum tersedia. Game tetap berjalan.');}
   requestId=requestId||crypto.randomUUID();const r=await api('/api/spin',{requestId,game:'wheel'});requestId=null;result=r;currentGame='wheel';renderGame();drawWheel(r.wheel);
   document.body.classList.add('is-spinning');$('#spin-label').textContent='Keberuntungan berputar…';pose('pushing','Satu, dua… aku putar, ya!');launchTimer=setTimeout(()=>{if(spinning)pose('excited','Ayo, beauty! Kejutanmu sebentar lagi!');},850);boothAudio.spin();
   const target=WheelMath.targetRotation(rotation,r.index,r.wheel.length,7);
   if(reduced.matches){$('#wheel-rotor').style.transform=`rotate(${target}deg)`;rotation=target;await new Promise(resolve=>setTimeout(resolve,r.duration));}else await animateTo(target,r.duration,r.wheel.length);
   document.body.classList.remove('is-spinning');spinning=false;try{state=await api('/api/state');}catch{state.pending=r;toast('Hasil tersimpan. Koneksi sedang dicoba kembali.',true);}
   if(r.stage==='awaiting-box'){enterBonus(r);return;}showResult(r);render({redraw:false});
  }catch(e){if(e.status===400||e.status===409)requestId=null;clearTimeout(launchTimer);spinning=false;document.body.classList.remove('is-spinning');pose('waving','Petugas bantu periksa dulu, ya.');toast(e.message,true);await refresh();if(!result)render();}
 }
 function enterBonus(r,recovered=false){
  clearTimeout(launchTimer);result=null;spinning=false;currentGame='boxes';state.pending=r;resetBoxes();openArena();render({redraw:false});
  const o=state.bonusOdds;$('#box-status').textContent=`Voucher utama ${percent(o.grand)} · bundling ${percent(o.bundling)} · zonk 0%`;
  pose('excited',recovered?'Bonusmu aman! Lanjut pilih satu kotak.':'Wah! Kesempatan terakhir, tanpa zonk!');if(!recovered)boothAudio.mystery();
  $('#beauty-boxes [data-box]').focus({preventScroll:true});
 }
 async function openBonus(choice){
  const pending=state?.pending;if(spinning||result||pending?.stage!=='awaiting-box'||$('dialog[open]:not(#stage-dialog)'))return;
  spinning=true;lastActivity=Date.now();renderGame();$('#spin-button').disabled=true;$('#close-arena').disabled=true;resetEscape();
  try{
   try{await boothAudio.activate();}catch{}bonusRequestId=bonusRequestId||crypto.randomUUID();
   const r=await api('/api/bonus',{roundId:pending.id,requestId:bonusRequestId,choice});bonusRequestId=null;result=r;document.body.classList.add('is-spinning');$('#spin-label').textContent='Kotak sedang membuka kejutan…';$('#spin-hint').textContent=r.demo?'Demo · stok tetap aman':'Hasil final tersimpan · satu stok sudah dicatat';pose('nervous','Duh, deg-degan… apa ya isinya?');boothAudio.suspense();
   await animateBoxes(r);spinning=false;document.body.classList.remove('is-spinning');try{state=await api('/api/state');}catch{state.pending=r;}showResult(r);render({redraw:false});
  }catch(e){spinning=false;document.body.classList.remove('is-spinning');toast(e.message,true);await refresh();if(!result)render({redraw:false});}
 }
 function recover(r){if(r.stage==='awaiting-box'){enterBonus(r,true);return;}result=r;currentGame=r.game||'wheel';openArena();drawWheel(r.wheel);rotation=WheelMath.targetRotation(0,r.index,r.wheel.length,0);$('#wheel-rotor').style.transform=`rotate(${rotation}deg)`;showResult(r,true);render({redraw:false});}

 function resultScene(p){
  const rig=$('#mascot-rig').cloneNode(true);rig.removeAttribute('id');rig.className='mascot-rig '+(p.tier==='grand'?'party':p.tier==='zonk'?'bowing':'dancing');rig.querySelector('.piece-head').alt='Maskot Bpedia '+(p.tier==='zonk'?'menyemangati':'merayakan hadiah');
  return '<div class="result-scene '+(p.tier==='grand'?'is-grand':'')+'"><div class="result-mascot"><span class="result-bubble">'+(p.tier==='grand'?'WOOHOO! Hadiah utama!':p.tier==='zonk'?'Tetap semangat, ya!':'Selamat ya, beauty!')+'</span>'+rig.outerHTML+(p.tier==='grand'?'<span class="party-popper" aria-hidden="true"><i></i><b>✦</b><em>✧</em></span>':'')+'</div><div class="result-visual">'+visual(p)+'</div></div>';
 }
 function showResult(r,recovered=false){
  const p=r.prize,isZonk=p.tier==='zonk';
  $('#result-content').innerHTML=`<div class="result-eyebrow">${isZonk?'A LITTLE PAUSE IN YOUR LUCK':p.tier==='grand'?'YOU GOT THE GRAND PRIZE':'A BEAUTY TREAT, JUST FOR YOU'}</div><h2 id="result-title">${isZonk?'Tetap <em>glowing.</em>':'Lucky <em>you!</em>'}</h2><p class="result-sub">${isZonk?'Kali ini belum dapat hadiah.':'Kejutan cantik ini jadi milikmu.'}</p><div class="result-visual">${visual(p)}</div><h3 class="result-name">${esc(p.fullName)}</h3><p class="result-detail">${esc(p.description||'')}</p>${['voucher','grand'].includes(p.tier)?`<details class="result-terms"><summary>Cara klaim & ketentuan voucher</summary><p>${esc(state.settings.voucherTerms)}</p></details>`:''}${p.promoCode?`<div class="promo-code-display"><small>KODE VOUCHER APLIKASI</small><strong>${esc(p.promoCode)}</strong></div>`:''}${r.bonus?'<p class="bonus-earned">✦ Hadiah dari bonus Beauty Box · tanpa zonk</p>':''}${r.demo?'<p class="demo-notice">MODE DEMO · Bukan hadiah atau voucher yang bisa ditukar.</p>':`<div class="claim-code"><span>${isZonk?'Kode putaran':'Tunjukkan kode ke petugas'}</span><strong>${esc(r.id)}</strong></div><p class="result-detail">${isZonk?'Terima kasih sudah bermain.':['voucher','grand'].includes(p.tier)?'Kode BP-… adalah bukti hadiah booth. Kode BPFOLKA pada tiket digunakan saat checkout aplikasi.':'Petugas memeriksa kode lalu menyerahkan hadiah.'}</p>`}${recovered?'<p class="demo-notice">Hasil putaran sebelumnya dipulihkan. Stok tidak dikurangi lagi.</p>':''}<button class="btn" id="result-done">${icon('arrow-left')} Kembali ke SpinWills</button>`;
  const scene=document.createElement('div');scene.innerHTML=resultScene(p);$('#result-content .result-visual').replaceWith(scene.firstElementChild);$('#result-dialog').classList.toggle('grand-result',p.tier==='grand');if(!isZonk)$('#result-title').innerHTML='Selamat <em>ya!</em>';
  open($('#result-dialog'));$('#result-title').tabIndex=-1;$('#result-title').focus({preventScroll:true});$('#result-dialog').scrollTop=0;pose(isZonk?'bowing':'dancing',isZonk?'Senyumnya jangan hilang, ya!':'Yeay! Beauty treat buat kamu!');if(!recovered){boothAudio.win(p.tier);if(!isZonk&&!reduced.matches)confetti(p.tier==='grand');}
  $('#result-done').addEventListener('click',closeResult);
 }
 async function closeResult(){const dialog=$('#result-dialog');if(!result||dialog.dataset.busy)return;dialog.dataset.busy='true';const btn=$('#result-done');if(btn)btn.disabled=true;try{state=await api('/api/result',{id:result.id});dialog.close();result=null;currentGame='wheel';resetBoxes();lastActivity=Date.now();pose('waving','Putaran baru, kejutan baru. Siap?');render();}catch(e){toast(e.message,true);if(btn)btn.disabled=false;}finally{delete dialog.dataset.busy;}}
 function showRules(){
  if(!state)return;const a=state.odds,b=state.bonusOdds;
  $('#info-content').innerHTML=`<span class="eyebrow">PESTA FOLKA · PANDUAN</span><h2 id="info-title">Langsung putar.<br><em>Bawa kejutannya.</em></h2><div class="steps"><div class="step"><b>01</b><h3>Mulai langsung</h3><p>Tidak ada formulir nominal pembelian, verifikasi akun, atau referensi struk sebelum spin.</p></div><div class="step"><b>02</b><h3>Putar roda</h3><p>Dapat hadiah langsung, zonk, atau akses Mystery Box. Mystery Box membawa kamu memilih satu dari tiga kotak bonus.</p></div><div class="step"><b>03</b><h3>Ambil satu hadiah</h3><p>Tunjukkan kode hasil ke petugas. Bonus tanpa zonk, tetapi hadiah utama/bundling tetap tidak dijamin.</p></div></div><h3>Peluang saat ini</h3><div class="table-scroll"><table><thead><tr><th>Hasil</th><th>Spin Wheel</th><th>Beauty Box</th></tr></thead><tbody>${[['grand','Voucher utama'],['bundling','Bundling'],['voucher','Voucher reguler'],['product','Produk'],['zonk','Zonk'],['mystery','Akses Beauty Box']].map(([k,v])=>`<tr><td>${v}</td><td>${percent(a[k])}</td><td>${percent(b[k])}</td></tr>`).join('')}</tbody></table></div><p class="rules-copy">Luas segmen bukan ukuran peluang. Dua zona Zonk / Vinilash tidak menggandakan peluang. Di dalam kategori, peluang barang sebanding dengan stoknya. Beauty Box tidak bisa dipilih langsung dan hanya boleh dibuka satu kali per ronde. Stok berkurang saat hadiah akhir dipilih; akses Mystery Box tidak mengurangi stok. Bonus utama ×${state.settings.bonusGrandMultiplier||10} (maks. 40%) dan bundling ×${state.settings.bonusBundleMultiplier||6} (maks. 50%) dari peluang roda saat itu. Bundling menipis tetap dibatasi pada roda: 2 paket ≤0,3%, 1 paket ≤0,1%; bonus memakai pengali atas nilai terbatas ini.</p><p class="notice">Jika hadiah reguler habis atau bobotnya nol, roda dijeda. Tidak ada hadiah utama yang dipaksa keluar. Demo tidak menyimpan hasil dan tidak mengeluarkan hadiah.</p><h3>Voucher Beautypedia</h3><p class="rules-copy">${state.prizes.filter(p=>['voucher','grand'].includes(p.tier)&&p.enabled).map(p=>esc(p.fullName)+' — '+esc(p.variant)+' — '+esc(p.promoCode||'Kode dari petugas')).join('<br>')}</p><p class="rules-copy">${esc(state.settings.voucherTerms)}</p>`;open($('#info-dialog'));
 }

 function showCatalog(id){if(!state)return;const prizes=id?state.prizes.filter(p=>p.id===id):state.prizes;$('#info-content').innerHTML=`<span class="eyebrow">THE BEAUTY LINEUP</span><h2 id="info-title">Kenalan dengan <em>hadiahnya.</em></h2><p class="lead">Foto katalog produk asli, bukan gambar produk buatan AI. Kecocokan shade dan ukuran ditinjau tim booth. Stok yang tidak aktif tidak ikut diundi.</p><div class="catalog-grid">${prizes.map(p=>`<article class="catalog-item"><div class="catalog-photo">${visual(p)}</div><div><small>${esc(p.brand)}</small><h3>${esc(p.fullName)}</h3><p>${esc(p.variant)}</p><span class="badge ${p.stock===0?'gray':''}">${p.enabled?`${p.stock} tersedia`:'Tidak aktif'}</span>${!p.imageChecked?`<p style="margin-top:9px">${esc(p.note)}</p>`:''}</div></article>`).join('')}</div>`;open($('#info-dialog'));}
 function confetti(gold){
  cancelAnimationFrame(confettiFrame);const canvas=$('#confetti'),ctx=canvas.getContext('2d');$('#result-dialog').append(canvas);canvas.width=innerWidth;canvas.height=innerHeight;canvas.style.display='block';
  const colors=gold?['#cf9e56','#f5ddb0','#b8325c','#f3b5c7']:['#b8325c','#e4a2b7','#f1cfad','#d4b083'],popper=$('.party-popper')?.getBoundingClientRect(),origin=gold&&popper?{x:popper.right-8,y:popper.top+8}:{x:innerWidth/2,y:innerHeight*.4};
  const particles=[],start=performance.now();let last=start,bursts=0;
  function burst(time){for(let i=0;i<(gold?85:100);i++)particles.push({x:origin.x,y:origin.y,vx:(Math.random()-(gold?.25:.5))*15,vy:-Math.random()*13-4,r:Math.random()*6+3,a:Math.random()*6,born:time,color:colors[Math.floor(Math.random()*colors.length)]});}
  burst(start);
  function frame(now){const dt=Math.min(2,(now-last)/16.667);last=now;const age=now-start;if(gold&&bursts<2&&age>600*(bursts+1)){burst(now);bursts++;}ctx.clearRect(0,0,canvas.width,canvas.height);
   for(const p of particles){ctx.globalAlpha=Math.max(0,1-(now-p.born-1700)/1500);p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.14*dt;p.a+=.045*dt;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.color;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*.55);ctx.restore();}
   if(age<(gold?4500:3300))confettiFrame=requestAnimationFrame(frame);else canvas.style.display='none';
  }confettiFrame=requestAnimationFrame(frame);
 }
 $('#beauty-boxes').innerHTML=Array.from({length:3},(_,i)=>'<button class="beauty-box" data-box="'+i+'" aria-label="Pilih kotak '+(i+1)+'"><span class="box-number">0'+(i+1)+'</span><span class="box-object"><span class="box-reveal"></span><span class="box-front"><span>B</span></span><span class="box-lid"><span></span></span></span><span class="box-label">'+['The Blush Box','The Rose Box','The Peach Box'][i]+'</span><small>KLIK UNTUK MEMBUKA</small></button>').join('');
 $('#beauty-boxes').addEventListener('click',e=>{const b=e.target.closest('[data-box]');if(b)openBonus(Number(b.dataset.box));});
 document.addEventListener('click',e=>{const game=e.target.closest('[data-game]'),mode=e.target.closest('[data-mode]');if(e.target.closest('[data-bonus-info]'))showRules();if(game)selectGame(game.dataset.game);if(mode)requestMode(mode.dataset.mode);});
 Bpedia.lightDismiss($('#result-dialog'),closeResult);
 arena.addEventListener('click',e=>{if(e.target===arena||e.target.classList.contains('arena-layout')||e.target.classList.contains('arena-wheel-area'))closeArena();});
 $('#wheel-lights').innerHTML=Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2;return `<span class="wheel-light" style="left:${50+48.25*Math.cos(a)}%;top:${50+48.25*Math.sin(a)}%;--delay:${i*.045}s"></span>`;}).join('');
 $('#spin-button').addEventListener('click',play);for(const id of ['rules-button','odds-button','terms-button'])$('#'+id).addEventListener('click',showRules);for(const id of ['catalog-button','all-prizes-button'])$('#'+id).addEventListener('click',()=>showCatalog());
 $('#shelf-products').addEventListener('click',e=>{const b=e.target.closest('[data-show-prize]');if(b)showCatalog(b.dataset.showPrize);});
 $('#mascot-button').addEventListener('click',async()=>{if(spinning||result)return;if(arena.open){play();return;}try{await boothAudio.activate();boothAudio.hello();}catch{}pose('waving','Hai! Semoga keberuntunganmu secantik senyummu.');});
 $('#sound-button').addEventListener('click',async()=>{try{await boothAudio.activate();soundOverride=!boothAudio.enabled;syncSound();if(soundOverride){boothAudio.hello();if(!boothAudio.bgmPlaying)boothAudio.playBGM();}else{boothAudio.stopVoices();boothAudio.pauseBGM();}toast(soundOverride?'Suara aktif. Musik latar siap diputar.':'Suara dimatikan.');}catch{toast('Perangkat audio belum tersedia.',true);}});
 $('#fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Gunakan F11 untuk layar penuh.');}});
 document.addEventListener('keydown',e=>{if(e.code==='KeyM'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){$('#sound-button').click();return;}if(e.code==='Space'&&!['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(e.target.tagName)&&!e.repeat){e.preventDefault();if(!$('dialog[open]:not(#stage-dialog)'))play();}});
 $('#close-arena').addEventListener('click',closeArena);$('#stage-catalog').addEventListener('click',()=>showCatalog());arena.addEventListener('cancel',e=>{e.preventDefault();closeArena();});document.addEventListener('pointermove',dodge,{passive:true});mascot.addEventListener('pointerleave',()=>{clearTimeout(escapeTimer);escapeTimer=setTimeout(resetEscape,1200);});window.addEventListener('blur',resetEscape);reduced.addEventListener('change',resetEscape);
 $('#result-dialog').addEventListener('cancel',e=>{e.preventDefault();closeResult();});
 setInterval(()=>{if(!spinning&&!result&&!document.hidden){const choices=[['waving','Beautypedia! Cantikmu, ada di sini!'],['dancing','Sedikit putaran, banyak kejutan!'],['bowing','Selamat datang di beauty playground.']];const p=choices[Math.floor(Math.random()*choices.length)];pose(...p);}},14000);
 $('#brand-sound').addEventListener('click',async()=>{try{await boothAudio.activate();boothAudio.brand();pose('dancing','Beautypedia! Cantikmu, ada di sini!');lastActivity=Date.now();}catch{toast('Audio belum tersedia.',true);}});
 document.addEventListener('pointerdown',()=>lastActivity=Date.now(),{passive:true});

 // Auto-play BGM on first user interaction gesture
 async function handleFirstGesture(){
  if(firstUserGesture)return;
  firstUserGesture=true;
  try{
   await boothAudio.activate();
   if(boothAudio.enabled&&!boothAudio.bgmPlaying&&boothAudio.bgmAuto){
    await boothAudio.playBGM();
   }
  }catch(e){}
 }
 ['pointerdown','keydown','click'].forEach(evt=>window.addEventListener(evt,handleFirstGesture,{once:true,passive:true}));

 // Music & Jingle controller bar listeners
 $('#music-play-btn')?.addEventListener('click',async()=>{
  try{
   await boothAudio.activate();
   boothAudio.toggleBGM();
   updateMusicBarUI();
  }catch(e){toast('Audio tidak dapat diaktifkan.',true);}
 });
 $('#music-loop-btn')?.addEventListener('click',()=>{
  boothAudio.setLoop(!boothAudio.bgmLoop);
  updateMusicBarUI();
  toast(boothAudio.bgmLoop?'Musik diulang terus menerus (Loop: ON)':'Musik diputar satu kali (Loop: OFF)');
 });
 $('#music-track-select')?.addEventListener('change',async(e)=>{
  try{
   await boothAudio.playBGM(e.target.value,boothAudio.bgmLoop);
   updateMusicBarUI();
   toast('Memutar '+e.target.options[e.target.selectedIndex].text);
  }catch(err){toast(err.message,true);}
 });
 $('#music-vol-slider')?.addEventListener('input',(e)=>{
  boothAudio.setBGMVolume(Number(e.target.value)/100);
 });
 window.addEventListener('bpedia:bgm-state',updateMusicBarUI);

 setInterval(()=>{if(state?.settings.attract&&boothAudio.ctx&&boothAudio.enabled&&!document.hidden&&!spinning&&!result&&!state.pending&&!$('dialog[open]:not(#stage-dialog)')&&Date.now()-lastActivity>(state.settings.attractInterval||90)*1000){lastActivity=Date.now();boothAudio.welcome();pose('waving','Hai, beauty! Yuk mampir ke booth Beautypedia!');document.body.classList.add('booth-call');setTimeout(()=>document.body.classList.remove('booth-call'),6000);}},1000);
 setInterval(()=>{if(!spinning&&!result&&!document.hidden)refresh();},4000);refresh();
})();
