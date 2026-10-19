/* Media v4. Shared layout stays mounted while content changes. */
(() => {
  'use strict';
  const data = window.MEDIA_CONTENT;
  if (!data) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const content = $('#view-content');
  const audio = $('#shared-audio');
  const dialog = $('#overlay');
  const modal = $('#overlay-content');
  const labels = {media:['Медіа','Media'], music:['Музика','Music'], videos:['Відео','Video'], photos:['Фото','Photos'], scores:['Ноти','Scores']};
  const photos = Array.from({length:18}, (_,i) => `images/media/${i+1}.jpg`);
  const state = {lang:document.documentElement.lang==='en'?'en':'ua', track:0, photo:0, video:0, filter:'all', source:'', view:'media', score:null};
  const svg = (body, name) => `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon icon-${name}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const icons = {
    play:svg('<path d="m8 5 11 7-11 7Z"/>','play'),
    pause:svg('<path d="M8 5v14M16 5v14"/>','pause'),
    video:svg('<rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-4v12l-6-4"/>','video'),
    left:svg('<path d="m15 5-7 7 7 7"/>','left'),
    right:svg('<path d="m9 5 7 7-7 7"/>','right'),
    expand:svg('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>','expand'),
    bag:svg('<path d="M5 7h14l2 14H3L5 7Z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/>','bag'),
    dots:svg('<circle cx="4" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="20" cy="12" r="1"/>','dots')
  };
  const text = (ua,en) => state.lang==='en'?en:ua;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const price = score => `$${Number(score.price).toFixed(2)}`;
  const time = n => Number.isFinite(n)?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'0:00';
  const scoreUrl = score => `score-${score.id}.html`;
  const getScore = id => data.scores.find(score => score.id===id);
  let cart = [];
  try {const saved=JSON.parse(localStorage.getItem('budnik-cart-v3')||'[]'); if(Array.isArray(saved))cart=[...new Set(saved)].filter(getScore);} catch {}
  let restoreFocus = null;
  let touchStart = null;
  let carouselObservers = [];

  function route() {
    const name=location.pathname.split('/').pop().replace(/\.html$/,'');
    if(name.startsWith('score-'))return {view:'scores',id:name.slice(6)};
    if(name==='score')return {view:'scores',id:new URLSearchParams(location.search).get('id')};
    return {view:labels[name]?name:'media',id:null};
  }
  function announce(message){$('#app-status').textContent=message;}
  function cartCount(){
    $('#cart-count').textContent=cart.length||'';
    $('#cart-button').setAttribute('aria-label',`${text('Кошик','Cart')} (${cart.length})`);
  }
  function saveCart(){try{localStorage.setItem('budnik-cart-v3',JSON.stringify(cart));}catch{}cartCount();}
  function addToCart(id){
    if(!getScore(id))return;
    if(!cart.includes(id)){cart.push(id);saveCart();}
    announce(text('Ноти додано до кошика.','Sheet music added to your cart.'));
    $$('[data-add]').forEach(button=>{if(button.dataset.add===id)button.innerHTML=icons.bag+' '+text('У кошику','In cart');});
  }
  function openModal(html, kind=''){
    if(!dialog.open)restoreFocus=document.activeElement;
    modal.innerHTML=html;dialog.dataset.kind=kind;
    if(!dialog.open)dialog.showModal();
    document.body.classList.add('modal-open');
    $('.close-dialog').focus({preventScroll:true});
  }
  function closeModal(){dialog.close();}
  dialog.addEventListener('close',()=>{
    modal.innerHTML='';dialog.dataset.kind='';document.body.classList.remove('modal-open');
    if(restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});
  });
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();
  });
  $('.close-dialog').onclick=closeModal;
  function previewScore(id){const s=getScore(id);if(s)openModal(`<h2>${escape(s.title)}</h2><img class="sample-image" src="${s.sample}" alt="${text('Зразок нот','Sheet music sample')}"><p class="modal-caption">${text('Фрагмент партитури · Зразок','Score excerpt · Sample')}</p>`,'score');}
  function openVideo(id,start=0){audio.pause();openModal(`<iframe class="stage" title="${text('Відео виконання','Performance video')}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&start=${Number(start)||0}"></iframe>`,'video');}
  function showCart(){
    openModal(`<h2>${text('Кошик','Cart')}</h2>${cart.map(id=>{const s=getScore(id);return `<div class="cart-row"><img src="${s.cover}" alt=""><span>${escape(s.title)}</span><span>${price(s)}</span><button data-remove="${id}" aria-label="${text('Видалити','Remove')} ${escape(s.title)}">×</button></div>`;}).join('')}${cart.length?`<div class="cart-total"><span>${text('Разом','Total')}</span><strong>$${cart.reduce((sum,id)=>sum+getScore(id).price,0).toFixed(2)}</strong></div><p class="cart-note">${text('Онлайн-оплата ще не підключена. Вибрані ноти збережено у вашому кошику.','Online payment is not connected yet. Your selection is saved in this cart.')}</p>`:`<p class="empty">${text('Кошик поки порожній.','Your cart is empty.')}</p>`}`,'cart');
  }
  $('#cart-button').onclick=showCart;
  modal.addEventListener('click',event=>{const remove=event.target.closest('[data-remove]');if(remove){cart=cart.filter(id=>id!==remove.dataset.remove);saveCart();showCart();}});

  function card(score,small=false){
    return `<article class="score-card"><a href="${scoreUrl(score)}" class="cover-link"><img src="${score.cover}" alt="${escape(score.title)}" loading="lazy" width="600" height="850"></a><h2><a href="${scoreUrl(score)}">${escape(score.title)}</a></h2>${small?'':`<p>${text('Баян соло','Solo accordion')}</p><div class="card-actions"><div>${score.audio?`<button data-audio="${score.audio}" aria-label="${text('Послухати','Listen to')} ${escape(score.title)}">${icons.play}</button>`:''}${score.video?`<button data-video="${score.video}" aria-label="${text('Дивитися','Watch')} ${escape(score.title)}">${icons.video}</button>`:''}</div><a href="${scoreUrl(score)}">${text('Переглянути','Explore')} <span aria-hidden="true">→</span></a></div>`}</article>`;
  }
  function carousel(items, extra=''){
    return `<div class="carousel-wrap"><div class="carousel ${extra}" tabindex="0" aria-label="${text('Горизонтальна добірка','Scrollable collection')}">${items}</div><button class="edge left" data-scroll="-1" aria-label="${text('Гортати ліворуч','Scroll left')}">${icons.left}</button><button class="edge right" data-scroll="1" aria-label="${text('Гортати праворуч','Scroll right')}">${icons.right}</button></div>`;
  }
  function compactPlayer(score){
    if(!score.audio)return '';
    return `<div class="compact-player" data-player-src="${score.audio}"><span class="player-label">${text('Послухати','Listen')}</span><button data-audio="${score.audio}" aria-label="${text('Відтворити або призупинити','Play or pause')}">${icons.play}</button><input class="audio-progress" type="range" min="0" max="1000" value="0" aria-label="${text('Позиція відтворення','Playback position')}"><span class="compact-time">0:00</span></div>`;
  }
  function renderScores(){
    const list=state.filter==='all'?data.scores:data.scores.filter(s=>s.category===state.filter);
    return `<div class="filters" aria-label="${text('Фільтр нот','Filter sheet music')}"><button data-filter="all" aria-pressed="${state.filter==='all'}">${text('Усі','All')}</button><button data-filter="arrangements" aria-pressed="${state.filter==='arrangements'}">${text('Аранжування','Arrangements')}</button></div><div class="score-grid">${list.map(s=>card(s)).join('')}</div>`;
  }
  function renderDetail(score){
    return `<article class="detail"><div class="detail-cover"><button class="cover-button" data-preview="${score.id}" aria-label="${text('Переглянути ноти','Preview sheet music')} ${escape(score.title)}"><img src="${score.cover}" alt="${escape(score.title)}" width="600" height="850"><span>${icons.expand}</span></button><button class="preview-hint" data-preview="${score.id}">${text('Переглянути ноти','Preview sheet music')}</button></div><div class="detail-info"><h2>${escape(score.title)}</h2><p class="composer">${escape(score.composer)}</p><p class="arranger">${text('Аранжування Yurij Budnik','Arranged by Yurij Budnik')}</p><p class="description">${escape(state.lang==='en'?score.descriptionEn:score.descriptionUa)}</p>${compactPlayer(score)}${score.video?`<button class="video-link" data-video="${score.video}">${icons.video} ${text('Дивитися відео','Watch video')}</button>`:''}</div><div class="detail-purchase"><div class="buy-row"><button class="primary" data-add="${score.id}">${icons.bag} ${cart.includes(score.id)?text('У кошику','In cart'):text('Додати до кошика','Add to cart')}</button><span class="price">${price(score)}</span></div><p class="facts">${text('Баян соло','Solo accordion')} · PDF · ${score.pages} ${text('сторінок','pages')}</p></div></article><section class="related-scores"><h2 class="section-small">${text('Інші п’єси','Other pieces')}</h2>${carousel(data.scores.filter(s=>s.id!==score.id).map(s=>card(s,true)).join(''),'score-carousel')}</section>`;
  }
  function renderMusic(){
    return `<div class="album-layout"><div class="album-art"><div class="vinyl" aria-hidden="true"></div><img src="assets/top-tracks.jpg" alt="Yurij Budnik" width="700" height="700"><h2>${text('Вибрані твори','Selected works')}</h2></div><div class="album-tracks"><ol id="tracks">${data.tracks.map((s,i)=>`<li class="track ${i===state.track?'active':''}"><button data-track="${i}" aria-label="${text('Відтворити','Play')} ${escape(s.title)}"><span class="track-number">${String(i+1).padStart(2,'0')}</span><span class="track-name">${escape(s.title)}</span></button><span class="track-duration">${time(s.duration)}</span><button class="track-menu" data-links="${i}" aria-label="${text('Посилання для','Links for')} ${escape(s.title)}">${icons.dots}</button></li>`).join('')}</ol><div class="player" data-player-src="${data.tracks[state.track].src}"><div class="transport"><button data-track-step="-1" aria-label="${text('Попередній трек','Previous track')}">${icons.left}</button><button id="toggle-track" data-track="${state.track}" aria-label="${text('Відтворити або призупинити','Play or pause')}">${icons.play}</button><button data-track-step="1" aria-label="${text('Наступний трек','Next track')}">${icons.right}</button></div><span class="elapsed">0:00</span><input class="audio-progress" type="range" min="0" max="1000" value="0" aria-label="${text('Позиція відтворення','Playback position')}"><span class="total-time">${time(data.tracks[state.track].duration)}</span><label class="volume">${text('Гучність','Volume')}<input type="range" min="0" max="1" step="0.01" value="${audio.volume}" data-volume aria-label="${text('Гучність','Volume')}"></label></div></div></div>`;
  }
  function videoFrame(){const v=data.videos[state.video];return `<iframe class="stage" title="${escape(state.lang==='en'?v.titleEn:v.titleUa)}" allow="fullscreen; picture-in-picture" allowfullscreen src="https://www.youtube-nocookie.com/embed/${v.id}?start=${v.start||0}"></iframe><h2 class="stage-title">${escape(state.lang==='en'?v.titleEn:v.titleUa)}</h2>`;}
  function renderVideos(){return `<div id="video-stage">${videoFrame()}</div>${carousel(data.videos.map((v,i)=>`<button class="thumbnail ${i===state.video?'active':''}" data-vid="${i}" aria-pressed="${i===state.video}"><span class="video-thumb"><img loading="lazy" src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="">${icons.play}</span><span>${escape(state.lang==='en'?v.titleEn:v.titleUa)}</span></button>`).join(''),'video-carousel')}`;}
  function renderPhotos(){return `<div class="photo-stage"><img id="main-photo" src="${photos[state.photo]}" alt="${text('Юрій Буднік — фото','Yurij Budnik — photo')} ${state.photo+1}"><button data-photo-expand aria-label="${text('Відкрити фото','Open photo')}">${icons.expand}</button></div><p class="photo-counter">${state.photo+1} / ${photos.length}</p>${carousel(photos.map((src,i)=>`<button class="thumbnail ${i===state.photo?'active':''}" data-photo="${i}" aria-pressed="${i===state.photo}" aria-label="${text('Фото','Photo')} ${i+1}"><img loading="lazy" src="${src}" alt=""></button>`).join(''),'photo-carousel')}`;}
  function renderHub(){return `<div class="hub">${[['music','assets/top-tracks.jpg'],['videos','images/media/2.jpg'],['photos','images/media/1.jpg'],['scores',data.scores[0].cover]].map(([view,img])=>`<a href="${view}.html"><h2>${text(...labels[view])}</h2><img src="${img}" alt=""><span class="hub-arrow" aria-hidden="true">↗</span></a>`).join('')}</div>`;}

  function render(){
    carouselObservers.forEach(observer=>observer.disconnect());
    carouselObservers=[];
    const r=route();state.view=r.view;state.score=r.id;
    $('#section-title').textContent=text(...labels[r.view]);
    $('#back-scores').hidden=!r.id;
    $('#media-app').dataset.view=r.view;
    $('#media-app').dataset.detail=r.id?'true':'false';
    document.title=(r.id&&getScore(r.id)?getScore(r.id).title:text(...labels[r.view]))+' | Yurij Budnik';
    $$('[data-view]').forEach(link=>{if(link.dataset.view===r.view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    if(r.view==='scores')content.innerHTML=r.id?(getScore(r.id)?renderDetail(getScore(r.id)):`<p class="empty">${text('П’єсу не знайдено.','Piece not found.')} <a href="scores.html">${text('Усі ноти','All scores')}</a></p>`):renderScores();
    else content.innerHTML=({music:renderMusic,videos:renderVideos,photos:renderPhotos,media:renderHub})[r.view]();
    $$('[data-en][data-ua]', $('#media-app')).forEach(el=>el.textContent=el.dataset[state.lang]);
    $('.close-dialog').setAttribute('aria-label',text('Закрити','Close'));
    cartCount();syncAudio();initCarousels();
  }
  function playSource(source){
    if(state.source===source){if(audio.paused)audio.play().catch(audioError);else audio.pause();}
    else{audio.pause();state.source=source;audio.src=source;audio.play().catch(audioError);}
    syncAudio();
  }
  function audioError(){announce(text('Аудіо не вдалося відтворити. Спробуйте ще раз.','Audio could not be played. Please try again.'));syncAudio();}
  function selectTrack(index){
    state.track=(index+data.tracks.length)%data.tracks.length;
    playSource(data.tracks[state.track].src);
    if(state.view==='music'){
      $$('.track').forEach((row,i)=>row.classList.toggle('active',i===state.track));
      $('#toggle-track').dataset.track=state.track;
      $('.player').dataset.playerSrc=data.tracks[state.track].src;
      syncAudio();
    }
  }
  function syncAudio(){
    $$('[data-audio]').forEach(button=>{const playing=button.dataset.audio===state.source&&!audio.paused;button.innerHTML=playing?icons.pause:icons.play;button.setAttribute('aria-pressed',String(playing));});
    const toggle=$('#toggle-track');if(toggle)toggle.innerHTML=state.source===data.tracks[state.track].src&&!audio.paused?icons.pause:icons.play;
    $$('[data-player-src]').forEach(player=>{
      const selected=player.dataset.playerSrc===state.source;
      const elapsed=selected?audio.currentTime:0;
      const duration=selected&&Number.isFinite(audio.duration)?audio.duration:0;
      const seek=$('.audio-progress',player);if(seek)seek.value=duration?elapsed/duration*1000:0;
      const stamp=$('.compact-time',player)||$('.elapsed',player);if(stamp)stamp.textContent=time(elapsed);
      const total=$('.total-time',player);if(total)total.textContent=time(duration||data.tracks[state.track].duration);
    });
  }
  ['play','pause','timeupdate','loadedmetadata','error'].forEach(event=>audio.addEventListener(event,syncAudio));
  audio.addEventListener('ended',()=>{if(state.view==='music')selectTrack(state.track+1);});
  function showTrackLinks(i){const s=data.tracks[i];const links=[['YouTube',s.youtubeUrl],['SoundCloud',s.soundcloudUrl],['Instagram',s.instagramUrl]].filter(([,url])=>/^https:\/\//.test(url));openModal(`<h2>${escape(s.title)}</h2><div class="track-links">${links.length?links.map(([title,url])=>`<a href="${escape(url)}" target="_blank" rel="noopener">${title} ↗</a>`).join(''):`<p>${text('Посилання ще не додані.','Links have not been added yet.')}</p>`}</div>`,'links');}
  function choosePhoto(index){state.photo=(index+photos.length)%photos.length;const img=$('#main-photo');if(img){img.src=photos[state.photo];img.alt=text('Юрій Буднік — фото','Yurij Budnik — photo')+' '+(state.photo+1);$('.photo-counter').textContent=`${state.photo+1} / ${photos.length}`;}$$('[data-photo]').forEach((b,i)=>{b.classList.toggle('active',i===state.photo);b.setAttribute('aria-pressed',String(i===state.photo));});if(dialog.open&&dialog.dataset.kind==='photo')photoModal();}
  function photoModal(){openModal(`<div class="photo-modal"><img src="${photos[state.photo]}" alt="${text('Фото','Photo')} ${state.photo+1}"><div class="photo-modal-nav"><button data-modal-step="-1" aria-label="${text('Попереднє фото','Previous photo')}">${icons.left}</button><span>${state.photo+1} / ${photos.length}</span><button data-modal-step="1" aria-label="${text('Наступне фото','Next photo')}">${icons.right}</button></div></div>`,'photo');}
  modal.addEventListener('click',e=>{const b=e.target.closest('[data-modal-step]');if(b)choosePhoto(state.photo+Number(b.dataset.modalStep));});
  function initCarousels(){
    $$('.carousel').forEach(el=>{
      const update=()=>{const left=$('.edge.left',el.parentNode),right=$('.edge.right',el.parentNode);const max=el.scrollWidth-el.clientWidth;left.hidden=max<2;right.hidden=max<2;left.disabled=el.scrollLeft<2;right.disabled=el.scrollLeft>=max-2;};
      el.addEventListener('scroll',update,{passive:true});
      el.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();el.scrollBy({left:el.clientWidth*.65*(e.key==='ArrowLeft'?-1:1),behavior:'smooth'});}});
      requestAnimationFrame(update);
      if('ResizeObserver' in window){const observer=new ResizeObserver(update);observer.observe(el);carouselObservers.push(observer);}
    });
  }
  content.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.scroll){const el=$('.carousel',b.parentNode);el.scrollBy({left:Number(b.dataset.scroll)*el.clientWidth*.7,behavior:'smooth'});}
    else if(b.dataset.filter){state.filter=b.dataset.filter;render();}
    else if(b.dataset.preview)previewScore(b.dataset.preview);
    else if(b.dataset.add)addToCart(b.dataset.add);
    else if(b.dataset.audio)playSource(b.dataset.audio);
    else if(b.dataset.video)openVideo(b.dataset.video);
    else if(b.dataset.track!==undefined)selectTrack(Number(b.dataset.track));
    else if(b.dataset.trackStep)selectTrack(state.track+Number(b.dataset.trackStep));
    else if(b.dataset.links!==undefined)showTrackLinks(Number(b.dataset.links));
    else if(b.dataset.vid!==undefined){state.video=Number(b.dataset.vid);audio.pause();$('#video-stage').innerHTML=videoFrame();$$('[data-vid]').forEach((button,i)=>{button.classList.toggle('active',i===state.video);button.setAttribute('aria-pressed',String(i===state.video));});}
    else if(b.dataset.photo!==undefined)choosePhoto(Number(b.dataset.photo));
    else if(b.hasAttribute('data-photo-expand'))photoModal();
  });
  content.addEventListener('input',e=>{
    if(e.target.hasAttribute('data-volume'))audio.volume=Number(e.target.value);
    if(e.target.classList.contains('audio-progress')){const source=e.target.closest('[data-player-src]').dataset.playerSrc;if(state.source===source&&Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number(e.target.value)/1000;}
  });
  content.addEventListener('touchstart',e=>{if(e.target.closest('.photo-stage'))touchStart=e.changedTouches[0].clientX;},{passive:true});
  content.addEventListener('touchend',e=>{if(touchStart!==null){const delta=e.changedTouches[0].clientX-touchStart;if(Math.abs(delta)>45)choosePhoto(state.photo+(delta<0?1:-1));touchStart=null;}},{passive:true});
  document.addEventListener('keydown',e=>{
    if((state.view==='photos'||dialog.dataset.kind==='photo')&&!/INPUT|TEXTAREA/.test(e.target.tagName)&&!e.target.closest('.carousel')&&['ArrowLeft','ArrowRight'].includes(e.key)){if(dialog.open&&dialog.dataset.kind!=='photo')return;e.preventDefault();choosePhoto(state.photo+(e.key==='ArrowRight'?1:-1));}
  });
  document.addEventListener('click',e=>{
    const a=e.target.closest('a');if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.target||a.hasAttribute('download'))return;
    const url=new URL(a.href,location.href);
    if(url.origin!==location.origin||!/(?:media|music|videos|photos|scores|score(?:-[\w-]+)?)\.html$/.test(url.pathname))return;
    // File previews use normal navigation: History API is restricted on file://.
    if(location.protocol==='file:')return;
    e.preventDefault();audio.pause();if(dialog.open)closeModal();history.pushState({},'',url);render();announce('');window.scrollTo({top:0,behavior:'instant'});
  });
  window.addEventListener('popstate',()=>{audio.pause();if(dialog.open)closeModal();render();});
  document.addEventListener('languagechange',e=>{state.lang=e.detail;render();if(dialog.open){if(dialog.dataset.kind==='cart')showCart();else closeModal();}});
  window.addEventListener('storage',e=>{if(e.key==='budnik-cart-v3'){try{const saved=JSON.parse(e.newValue||'[]');cart=Array.isArray(saved)?[...new Set(saved)].filter(getScore):[];}catch{cart=[];}cartCount();}});
  render();
})();
