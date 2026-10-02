'use strict';
(()=>{
 const $=id=>document.getElementById(id),game=window.HeartGame,{cardFace,cardBack}=window.HeartCards;
 const dialog=$('dealDialog'),shell=$('dealShell'),previewDialog=$('momentPreviewDialog');
 let turn=0,animations=new Set(),selectedPreview='',priorFocus=null;
 const videos=new Set(),visibleVideos=new Set();
 const videoObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)visibleVideos.add(entry.target);else visibleVideos.delete(entry.target);}syncDeckVideos();},{threshold:.15});
 function syncDeckVideos(){const blocked=Boolean(document.querySelector('dialog[open]')),reduced=game.context().reduced;for(const video of videos){const playing=visibleVideos.has(video)&&document.body.dataset.journey==='table'&&!document.hidden&&!reduced&&!blocked;if(playing)video.play().catch(()=>{});else video.pause();}}
 const dialogObserver=new MutationObserver(syncDeckVideos);for(const modal of document.querySelectorAll('dialog'))dialogObserver.observe(modal,{attributes:true,attributeFilter:['open']});
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const dealerPoses={zoro:{preview:'welcome',stack:'confident',shuffle:'ready',choose:'cheer'},sanji:{preview:'welcome',stack:'serve',shuffle:'kick',choose:'flower'}};
 const preparedDealers=new Map();
 function prepareDealer(host){for(const pose of new Set(Object.values(dealerPoses[host]))){const src=`/assets/dealers/${host}-${pose}.webp`;if(preparedDealers.has(src))continue;const img=new Image();img.decoding='async';img.src=src;preparedDealers.set(src,img);}}
 function phase(value){shell.dataset.phase=value;const host=shell.dataset.host==='sanji'?'sanji':'zoro';$('dealerBipy').src=`/assets/dealers/${host}-${dealerPoses[host][value]}.webp`;$('dealerBipy').alt=`Bipy ${host==='zoro'?'Zoro':'Sanji'} · ${value==='choose'?'mempersilakanmu memilih kartu':value==='shuffle'?'mengocok kartu':'menyiapkan dek'}`;}
 function clear(){turn++;for(const animation of animations)animation.cancel();animations.clear();}
 async function animate(el,frames,options){const animation=el.animate(frames,{fill:'forwards',easing:'cubic-bezier(.22,.8,.2,1)',...options});animations.add(animation);try{await animation.finished;}catch{/* Atraksi dibatalkan. */}finally{animation.cancel();animations.delete(animation);}}
 function closeDeal(){clear();dialog.close();game.setDealing(false);priorFocus?.focus({preventScroll:true});}
 function choosePhase(){clear();phase('choose');$('dealStatus').textContent='Giliranmu, Babes. Pilih satu kartu tertutup.';$('skipDealButton').hidden=true;$('dealCards').querySelectorAll('button').forEach(button=>{button.disabled=false;});$('dealCards').querySelector('button')?.focus({preventScroll:true});}
 async function deal(){
  const context=game.context();if(!context.state||context.busy||context.dealing||dialog.open)return;
  game.unlock();game.setDealing(true);priorFocus=document.activeElement;clear();const current=turn;
  const cards=context.state.cards.filter(card=>card.hostId===context.host&&context.state.services.some(service=>service.id===card.serviceId&&service.enabled));
  if(!cards.length){game.setDealing(false);return;}
  shell.dataset.host=context.host;phase('preview');$('skipDealButton').hidden=false;
  $('dealCards').innerHTML=cards.map((card,index)=>`<button type="button" class="deal-slot" data-slot="${index}" style="--i:${index};--count:${cards.length}" disabled aria-label="Pilih kartu tertutup nomor ${index+1}"><span class="deal-front">${cardFace(card,{size:'mini'})}</span><span class="deal-back">${cardBack()}</span><span class="deal-number">${index+1}</span></button>`).join('');
  $('dealStatus').textContent=`Tujuh fanservice bersama ${context.host==='zoro'?'Zoro':'Sanji'}. Bipy akan mengocoknya untukmu.`;
  dialog.showModal();
  if(context.reduced){choosePhase();return;}
  await pause(1600);if(current!==turn||!dialog.open)return;
  phase('stack');game.shuffle();$('dealStatus').textContent='Semua momen dikumpulkan menjadi satu dek…';await pause(800);if(current!==turn||!dialog.open)return;
  phase('shuffle');$('dealStatus').textContent='Lihat tangan Bipy. Kartu berpindah, kejutan tetap terjaga.';
  await Promise.all([...$('dealCards').children].map((el,index)=>animate(el,[{transform:'translate(-50%,-50%) rotate(0deg)'},{transform:`translate(calc(-50% + ${index%2?120:-120}px),calc(-50% - ${35+index*7}px)) rotate(${index%2?18:-18}deg)`},{transform:`translate(-50%,-50%) rotate(${(index-3)*2}deg)`}],{duration:540,delay:index*35,iterations:3})));
  if(current!==turn||!dialog.open)return;choosePhase();
 }
 function preview(serviceId){
  const context=game.context(),card=game.card(serviceId),service=context.state?.services.find(item=>item.id===serviceId);if(!card||!service||context.busy)return;
  selectedPreview=serviceId;priorFocus=document.activeElement;game.unlock();$('momentPreviewArt').innerHTML=cardFace(card,{size:'full',lazy:false,video:true});
  $('momentPreviewPov').src=card.povImage||card.image;$('momentPreviewPov').alt=card.povAlt||card.imageAlt;
  $('momentPreviewSticker').src=card.stickerImage;$('momentPreviewSticker').alt=card.stickerAlt;
  $('momentPreviewHost').textContent=`${context.host==='zoro'?'ZORO · HIJAU GIOK':'SANJI · KUNING EMAS'} / ${card.cardNo}`;$('momentPreviewTitle').textContent=service.name;$('momentPreviewDetail').textContent=service.detail;
  $('choosePreviewCard').hidden=context.mode!=='pick';previewDialog.showModal();const video=$('momentPreviewArt').querySelector('video');if(video&&!context.reduced)video.play().catch(()=>{});
 }
 function closePreview(){for(const video of $('momentPreviewArt').querySelectorAll('video'))video.pause();previewDialog.close();priorFocus?.focus({preventScroll:true});}
 function update(){const context=game.context();prepareDealer(context.host);$('journeyHostLabel').textContent=context.host==='zoro'?'MEJA ZORO · HIJAU GIOK':'MEJA SANJI · KUNING EMAS';document.body.classList.toggle('journey-dealing',context.dealing);document.querySelectorAll('.card-choice').forEach(button=>{button.textContent=context.mode==='gacha'?'Kenali momen':'Pilih kartu ini';});for(const video of videos)if(!video.isConnected){video.pause();videoObserver.unobserve(video);videos.delete(video);visibleVideos.delete(video);}for(const video of document.querySelectorAll('#momentGrid video'))if(!videos.has(video)){videos.add(video);videoObserver.observe(video);}syncDeckVideos();}
 $('dealCards').addEventListener('click',event=>{const button=event.target.closest('.deal-slot');if(!button||button.disabled||shell.dataset.phase!=='choose')return;const slot=Number(button.dataset.slot);clear();dialog.close();game.chooseDeal(slot);});
 $('cancelDealButton').addEventListener('click',closeDeal);$('skipDealButton').addEventListener('click',choosePhase);dialog.addEventListener('cancel',event=>{event.preventDefault();closeDeal();});
 $('closeMomentPreview').addEventListener('click',closePreview);previewDialog.addEventListener('cancel',event=>{event.preventDefault();closePreview();});
 $('choosePreviewCard').addEventListener('click',()=>{closePreview();game.selectCard(selectedPreview,{open:true});});
 $('backHomeButton').addEventListener('click',()=>game.backHome());
 const gallery=$('stickerGalleryDialog');let galleryItems=null,galleryFocus=null,galleryFilter='all';
 function renderGallery(){if(!galleryItems)return;const items=galleryItems.filter(item=>galleryFilter==='all'||item.hostId===galleryFilter);$('stickerGalleryGrid').replaceChildren(...items.map(item=>{const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');figure.dataset.host=item.hostId;img.src=item.image;img.alt=item.title;img.width=item.width;img.height=item.height;img.loading='lazy';img.decoding='async';caption.textContent=item.title;figure.append(img,caption);return figure;}));$('stickerGalleryStatus').textContent=`${items.length} stiker · ${galleryFilter==='all'?'seluruh koleksi':galleryFilter==='zoro'?'Zoro & Bipy hijau':'Sanji & Bipy kuning'}`;gallery.scrollTop=0;}
 $('openStickerGallery').addEventListener('click',async()=>{galleryFocus=$('openStickerGallery');game.unlock();gallery.showModal();if(galleryItems){renderGallery();return;}try{const response=await fetch('/assets/stickers/manifest.json');if(!response.ok)throw new Error('Galeri belum tersedia.');const manifest=await response.json();if(!Array.isArray(manifest.items)||manifest.items.length!==50)throw new Error('Galeri belum lengkap.');galleryItems=manifest.items;renderGallery();}catch{$('stickerGalleryStatus').textContent='Galeri belum dapat dimuat. Tutup lalu buka kembali untuk mencoba lagi.';}});
 function closeGallery(){gallery.close();galleryFocus?.focus({preventScroll:true});}
 $('closeStickerGallery').addEventListener('click',closeGallery);gallery.addEventListener('cancel',event=>{event.preventDefault();closeGallery();});
 gallery.querySelector('.sticker-filters').addEventListener('click',event=>{const button=event.target.closest('button[data-sticker-filter]');if(!button)return;galleryFilter=button.dataset.stickerFilter;gallery.querySelectorAll('[data-sticker-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));renderGallery();});
 $('fullscreenButton').addEventListener('click',async()=>{game.unlock();try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else game.notify('Layar penuh mengikuti pengaturan browser perangkatmu.');}catch{game.notify('Gunakan mode layar penuh dari menu browser.');}});
 document.addEventListener('fullscreenchange',()=>{$('fullscreenButton').setAttribute('aria-label',document.fullscreenElement?'Keluar dari layar penuh':'Layar penuh');$('fullscreenButton').setAttribute('aria-pressed',String(Boolean(document.fullscreenElement)));});
 document.addEventListener('visibilitychange',()=>{syncDeckVideos();if(document.hidden){for(const video of $('momentPreviewArt').querySelectorAll('video'))video.pause();if(dialog.open&&shell.dataset.phase!=='choose')choosePhase();}else if(previewDialog.open&&!game.context().reduced){$('momentPreviewArt').querySelector('video')?.play().catch(()=>{});}});
 window.HeartJourney={deal,preview,update};update();
})();
