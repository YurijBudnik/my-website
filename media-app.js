/* Media v7. Shared layout stays mounted while content changes. */
(() => {
  'use strict';
  const data = window.MEDIA_CONTENT;
  if (!data) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const content = $('#view-content');
  content.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&e.target.src.includes('ytimg.com')){e.target.src='assets/media-panels/video-mobile.jpg';}},true);
  const audio = $('#shared-audio');
  const dialog = $('#overlay');
  const modal = $('#overlay-content');
  const labels = {media:['Медіа','Media'], music:['Музика','Music'], videos:['Відео','Video'], photos:['Фото','Photos'], scores:['Ноти','Scores']};
  const photos = Array.from({length:21}, (_,i) => `images/media/${i+1}.jpg`);
  const state = {lang:document.documentElement.lang==='en'?'en':'ua', track:0, photo:0, video:0, filter:'all', source:'', view:'media', score:null};
  const svg = (body, name) => `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon icon-${name}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const icons = {
    close:svg('<path d="m6 6 12 12M18 6 6 18"/>','close'),
    play:svg('<path d="m8 5 11 7-11 7Z"/>','play'),
    pause:svg('<path d="M8 5v14M16 5v14"/>','pause'),
    speaker:svg('<path d="M11 4 6 8H3v8h3l5 4Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>','speaker'),
    headphones:svg('<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>','headphones'),
    audioListen:svg('<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 9a5 5 0 0 1 0 6M19.5 6.5a9 9 0 0 1 0 11"/>','audio-listen'),
    audioPause:svg('<path d="M3 9v6h4l5 4V5L7 9H3Z"/><path d="M17 8v8M21 8v8"/>','audio-pause'),
    videoScreen:svg('<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m10 8.5 6 3.5-6 3.5Z"/>','video-screen'),
    photo:svg('<rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="16" cy="8" r="2"/><path d="m2 17 6-7 8 8M13 15l3-3 6 6"/>','photo'),
    score:svg('<path d="M14 2H6a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9Z M14 2v5a2 2 0 0 0 2 2h5M6 11h5M6 14h5M6 17h3M18 14h1M18 17h1M14 17v-6l3 2"/><ellipse cx="12" cy="18" rx="2" ry="1.4" transform="rotate(-25 12 18)"/>','score'),
    video:svg('<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/>','video'),
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
    $('#cart-button').hidden=!cart.length;
    $('#cart-button').setAttribute('aria-label',`${text('Кошик','Cart')} (${cart.length})`);
  }
  function saveCart(){try{localStorage.setItem('budnik-cart-v3',JSON.stringify(cart));}catch{}cartCount();syncCartButtons();}
  function syncCartButtons(){
    $$('[data-add]').forEach(button=>{
      const score=getScore(button.dataset.add),added=cart.includes(button.dataset.add);
      button.classList.toggle('in-cart',added);
      button.innerHTML=icons.bag+(button.classList.contains('quick-add')?'':' '+(added?text('Відкрити кошик','Open cart'):text('Додати до кошика','Add to cart')));
      button.setAttribute('aria-label',`${added?text('Відкрити кошик','Open cart'):text('Додати до кошика','Add to cart')} — ${score.title}`);
    });
  }
  function flyToCart(id,source){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const img=source?.closest('.score-card')?.querySelector('img')||$('.detail-cover img');
    const target=$('#cart-button');
    if(!img||!img.animate)return;
    const from=img.getBoundingClientRect(),to=target.getBoundingClientRect();
    if(!from.width||to.bottom<0||to.top>window.innerHeight)return;
    const ghost=document.createElement('img');ghost.src=getScore(id).cover;ghost.alt='';ghost.className='cart-flight';ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});
    document.body.appendChild(ghost);
    const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
    const flight=ghost.animate([{transform:'translate(0,0) scale(1)',opacity:.8},{transform:`translate(${dx*.45}px,${dy*.55-45}px) scale(.55)`,opacity:.65,offset:.5},{transform:`translate(${dx}px,${dy}px) scale(.07)`,opacity:0}],{duration:760,easing:'cubic-bezier(.25,.65,.3,1)'});
    flight.onfinish=()=>{ghost.remove();target.animate([{filter:'brightness(1)'},{filter:'brightness(1.5)'},{filter:'brightness(1)'}],{duration:340});};
    flight.oncancel=()=>ghost.remove();
  }
  function addToCart(id,source){
    if(!getScore(id))return;
    if(cart.includes(id)){showCart();return;}
    cart.push(id);saveCart();syncCartButtons();flyToCart(id,source);
    announce(text('Ноти додано до кошика.','Sheet music added to your cart.'));
  }
  function openModal(html, kind=''){
    if(!dialog.open)restoreFocus=document.activeElement;
    modal.innerHTML=html;dialog.dataset.kind=kind;
    if(!dialog.open)dialog.showModal();
    document.body.classList.add('modal-open');
    (kind==='album'?$('.album-dismiss'):$('.close-dialog')).focus({preventScroll:true});
  }
  function closeModal(){dialog.close();}
  dialog.addEventListener('close',()=>{
    modal.innerHTML='';dialog.dataset.kind='';document.body.classList.remove('modal-open');
    if(restoreFocus?.isConnected){if(mobileQuery.matches)restoreFocus.blur();else restoreFocus.focus({preventScroll:true});}
    initAmbient();
  });
  dialog.addEventListener('click',event=>{
    if(dialog.dataset.kind==='album'){closeModal();return;}
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();
  });
  $('.close-dialog').innerHTML=icons.close;
  $('.close-dialog').onclick=closeModal;
  function previewScore(id){const s=getScore(id);if(s)openModal(`<h2>${escape(s.title)}</h2><img class="sample-image" src="${s.sample}" alt="${text('Зразок нот','Sheet music sample')}"><p class="modal-caption">${text('Фрагмент партитури · Зразок','Score excerpt · Sample')}</p>`,'score');}
  function openVideo(id,start=0){audio.pause();openModal(`<div class="video-modal-frame"><iframe class="stage" title="${text('Відео виконання','Performance video')}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&start=${Number(start)||0}&rel=0"></iframe></div>`,'video');}
  function showCart(){
    openModal(`<h2>${text('Кошик','Cart')}</h2>${cart.map(id=>{const s=getScore(id);return `<div class="cart-row"><img src="${s.cover}" alt=""><span>${escape(s.title)}</span><span>${price(s)}</span><button data-remove="${id}" aria-label="${text('Видалити','Remove')} ${escape(s.title)}">×</button></div>`;}).join('')}${cart.length?`<div class="cart-total"><span>${text('Разом','Total')}</span><strong>$${cart.reduce((sum,id)=>sum+getScore(id).price,0).toFixed(2)}</strong></div><p class="cart-note">${text('Онлайн-оплата ще не підключена. Вибрані ноти збережено у вашому кошику.','Online payment is not connected yet. Your selection is saved in this cart.')}</p>`:`<p class="empty">${text('Кошик поки порожній.','Your cart is empty.')}</p>`}`,'cart');
  }
  $('#cart-button').onclick=showCart;
  modal.addEventListener('click',event=>{const remove=event.target.closest('[data-remove]');if(remove){cart=cart.filter(id=>id!==remove.dataset.remove);saveCart();showCart();}});

  // Distinct and labeled audio/video actions, shared by catalogue and individual score pages.
  function scoreMediaButtons(score){
    return `<div class="score-media-actions">${score.audio?`<button type="button" class="score-action score-action--audio" data-audio="${escape(score.audio)}" aria-pressed="false" aria-label="${text('Прослухати аудіо','Listen to audio')} — ${escape(score.title)}" title="${text('Прослухати аудіо','Listen to audio')}"><span class="score-icon">${icons.audioListen}</span><span class="score-action-name">${text('Аудіо','Audio')}</span></button>`:''}${score.video?`<button type="button" class="score-action score-action--video" data-video="${escape(score.video)}" aria-label="${text('Переглянути відео','Watch video')} — ${escape(score.title)}" title="${text('Переглянути відео','Watch video')}"><span class="score-icon">${icons.videoScreen}</span><span class="score-action-name">${text('Відео','Video')}</span></button>`:''}</div>`;
  }
  function card(score,small=false){
    return `<article class="score-card"><div class="score-cover-wrap"><a href="${scoreUrl(score)}" class="cover-link"><img src="${score.cover}" alt="${escape(score.title)}" loading="lazy" width="600" height="850"></a>${small?`<button class="quick-add" data-add="${score.id}" aria-label="${text('Додати до кошика','Add to cart')} — ${escape(score.title)}">${icons.bag}</button>`:''}</div><h2><a href="${scoreUrl(score)}">${escape(score.title)}</a></h2>${small?'':`<div class="card-actions">${scoreMediaButtons(score)}<a href="${scoreUrl(score)}">${text('Переглянути','Explore')} <span aria-hidden="true">→</span></a></div>`}</article>`;
  }
  function carousel(items, extra=''){
    return `<div class="carousel-wrap"><div class="carousel ${extra}" tabindex="0" aria-label="${text('Горизонтальна добірка','Scrollable collection')}">${items}</div><button class="edge left" data-scroll="-1" aria-label="${text('Гортати ліворуч','Scroll left')}">${icons.left}</button><button class="edge right" data-scroll="1" aria-label="${text('Гортати праворуч','Scroll right')}">${icons.right}</button></div>`;
  }
  function compactPlayer(score){
    if(!score.audio)return '';
    return `<div class="compact-player" data-player-src="${escape(score.audio)}"><button type="button" class="score-action score-action--audio" data-audio="${escape(score.audio)}" aria-pressed="false" aria-label="${text('Прослухати аудіо','Listen to audio')} — ${escape(score.title)}"><span class="score-icon">${icons.audioListen}</span><span class="score-action-name">${text('Аудіо','Audio')}</span></button><input class="audio-progress" type="range" min="0" max="1000" value="0" aria-label="${text('Позиція відтворення','Playback position')}"><span class="compact-time">0:00</span></div>`;
  }
  function renderScores(){
    const list=state.filter==='all'?data.scores:data.scores.filter(s=>s.category===state.filter);
    return `<div class="filters" aria-label="${text('Фільтр нот','Filter sheet music')}"><button data-filter="all" aria-pressed="${state.filter==='all'}">${text('Усі','All')}</button><button data-filter="arrangements" aria-pressed="${state.filter==='arrangements'}">${text('Аранжування','Arrangements')}</button></div><div class="score-grid">${list.map(s=>card(s)).join('')}</div>`;
  }
  function renderDetail(score){
    return `<article class="detail"><div class="detail-cover"><button class="cover-button" data-preview="${score.id}" aria-label="${text('Переглянути ноти','Preview sheet music')} ${escape(score.title)}"><img src="${score.cover}" alt="${escape(score.title)}" width="600" height="850"><span>${icons.expand}</span></button><button class="preview-hint" data-preview="${score.id}">${text('Переглянути ноти','Preview sheet music')}</button></div><div class="detail-info"><h2>${escape(score.title)}</h2><p class="composer">${escape(score.composer)}</p><p class="arranger">${text('Аранжування Yurij Budnik','Arranged by Yurij Budnik')}</p><p class="description">${escape(state.lang==='en'?score.descriptionEn:score.descriptionUa)}</p><div class="detail-media-tools">${compactPlayer(score)}${score.video?`<button class="score-action score-action--video" data-video="${escape(score.video)}" aria-label="${text('Переглянути відео','Watch video')} — ${escape(score.title)}"><span class="score-icon">${icons.videoScreen}</span><span class="score-action-name">${text('Відео','Video')}</span></button>`:''}</div><div class="detail-purchase"><div class="buy-row"><button class="primary" data-add="${score.id}">${icons.bag} ${cart.includes(score.id)?text('У кошику','In cart'):text('Додати до кошика','Add to cart')}</button><span class="price">${price(score)}</span></div><p class="facts">PDF · ${score.pages} ${text('сторінок','pages')}</p></div></div></article><section class="related-scores"><h2 class="section-small">${text('Інші п’єси','Other pieces')}</h2>${carousel(data.scores.filter(s=>s.id!==score.id).map(s=>card(s,true)).join(''),'score-carousel')}</section>`;
  }
  function renderMusic(){
    return `<div class="album-layout"><div class="album-art"><button class="album-open" data-album-open aria-label="${text('Збільшити обкладинку та відтворити відео','Expand cover and play video')}"><video class="album-cover-video" data-ambient autoplay muted loop playsinline preload="metadata" poster="assets/album-cover.jpg" aria-label="Yurij Budnik"><source src="assets/album-cover.mp4" type="video/mp4"></video></button></div><div class="album-tracks"><ol id="tracks">${data.tracks.map((s,i)=>`<li class="track ${i===state.track?'active':''}"><button data-track="${i}" aria-label="${text('Відтворити','Play')} ${escape(s.title)}"><span class="track-number">${i+1}</span><span class="track-play" aria-hidden="true">${icons.play}</span><span class="track-name">${escape(s.title)}</span></button><span class="track-duration">${time(s.duration)}</span><button class="track-menu" data-links="${i}" aria-label="${text('Посилання для','Links for')} ${escape(s.title)}">${icons.dots}</button></li>`).join('')}</ol><div class="player" data-player-src="${data.tracks[state.track].src}"><div class="now-playing"><span class="now-title">${escape(data.tracks[state.track].title)}</span><small>Yurij Budnik</small></div><div class="transport"><button data-track-step="-1" aria-label="${text('Попередній трек','Previous track')}">${icons.left}</button><button id="toggle-track" data-track="${state.track}" aria-label="${text('Відтворити або призупинити','Play or pause')}">${icons.play}</button><button data-track-step="1" aria-label="${text('Наступний трек','Next track')}">${icons.right}</button></div><span class="elapsed">0:00</span><input class="audio-progress" type="range" min="0" max="1000" value="0" aria-label="${text('Позиція відтворення','Playback position')}"><span class="total-time">${time(data.tracks[state.track].duration)}</span><label class="volume">${icons.speaker}<input type="range" min="0" max="1" step="0.01" value="${audio.volume}" data-volume aria-label="${text('Гучність','Volume')}"></label></div></div></div>`;
  }
  function videoFrame(){const v=data.videos[state.video];return `<iframe class="stage" title="${escape(state.lang==='en'?v.titleEn:v.titleUa)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen src="https://www.youtube-nocookie.com/embed/${v.id}?controls=1&playsinline=1&rel=0&start=${v.start||0}"></iframe><div class="stage-caption"><h2 class="stage-title">${escape(state.lang==='en'?v.titleEn:v.titleUa)}</h2><span>${state.video+1} / ${data.videos.length}</span></div><p class="video-description">${videoDescription()}</p>`;}
  function videoDescription(){const v=data.videos[state.video];return escape(state.lang==='en'?v.descriptionEn:v.descriptionUa);}
  function albumModal(){
    openModal(`<button class="album-dismiss" aria-label="${text('Закрити обкладинку','Close album cover')}"><video class="expanded-album" disablepictureinpicture disableremoteplayback src="assets/album-cover.mp4" poster="assets/album-cover.jpg" autoplay muted loop playsinline aria-label="${text('Відеообкладинка альбому','Album video cover')}"></video></button>`,'album');
    $$('.album-cover-video').forEach(v=>v.pause());
    const v=$('.expanded-album');v.muted=true;v.play()?.catch(()=>{});
  }

  function renderVideos(){return `<div id="video-stage">${videoFrame()}</div>${carousel(data.videos.map((v,i)=>`<button class="thumbnail ${i===state.video?'active':''}" data-vid="${i}" aria-pressed="${i===state.video}"><span class="video-thumb"><img loading="lazy" src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt=""></span><span class="video-caption"><span class="video-number">${i+1}</span>${escape(state.lang==='en'?v.titleEn:v.titleUa)}</span></button>`) .join(''),'video-carousel')}`;}

  function renderPhotos(){return `<div class="photo-stage"><img id="main-photo" src="${photos[state.photo]}" alt="${text('Юрій Буднік — фото','Yurij Budnik — photo')} ${state.photo+1}"><button data-photo-expand aria-label="${text('Відкрити фото','Open photo')}">${icons.expand}</button></div><p class="photo-counter">${state.photo+1} / ${photos.length}</p>${carousel(photos.map((src,i)=>`<button class="thumbnail ${i===state.photo?'active':''}" data-photo="${i}" aria-pressed="${i===state.photo}" aria-label="${text('Фото','Photo')} ${i+1}"><img loading="lazy" src="${src}" alt=""></button>`).join(''),'photo-carousel')}<button class="photo-top" data-photo-top hidden aria-label="${text('На початок сторінки','Back to top')}"><svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 14 6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;}
  function renderHub(){
    const entries=[['videos','video','video','Дивитися','Watch'],['photos','photo','photo','Відкрити','Explore'],['music','music','headphones','Слухати','Listen'],['scores','scores','score','Переглянути','Explore']];
    return `<div class="hub">${entries.map(([view,asset,icon,ua,en])=>`<a class="hub-panel hub-${asset}" href="${view}.html" aria-label="${text(...labels[view])}">${asset==='video'?`<video class="hub-visual" data-panel-video data-ambient autoplay muted loop playsinline preload="metadata" poster="assets/media-panels/video-desktop.jpg" aria-hidden="true"></video>`:`<picture class="hub-visual"><source media="(max-width:760px)" srcset="assets/media-panels/${asset}-mobile.jpg"><img src="assets/media-panels/${asset}-desktop.jpg" alt="" fetchpriority="high"></picture>`}<h2>${text(...labels[view])}</h2><span class="hub-action" aria-hidden="true"><span class="hub-icon">${icons[icon]}</span><span>${text(ua,en)}</span><span class="hub-arrow">⟶</span></span></a>`).join('')}</div>`;
  }
  const mobileQuery=window.matchMedia('(max-width:760px)');
  const galleryDesktopQuery=window.matchMedia('(min-width:761px), (min-width:600px) and (orientation:landscape)');
  const reducedQuery=window.matchMedia('(prefers-reduced-motion:reduce)');
  function initAmbient(){
    const panel=$('[data-panel-video]');
    if(panel){const mode=mobileQuery.matches?'mobile':'desktop';const src=`assets/media-panels/video-${mode}.mp4`;if(panel.getAttribute('src')!==src){panel.poster=`assets/media-panels/video-${mode}.jpg`;panel.src=src;}}
    $$('[data-ambient]').forEach(v=>{v.muted=true;if(document.hidden||reducedQuery.matches||(mobileQuery.matches&&v.classList.contains('album-cover-video'))||dialog.dataset.kind==='album')v.pause();else v.play()?.catch(()=>{});});
  }
  mobileQuery.addEventListener('change',initAmbient);
  reducedQuery.addEventListener('change',initAmbient);
  document.addEventListener('visibilitychange',initAmbient);

  function render(){
    carouselObservers.forEach(observer=>observer.disconnect());
    carouselObservers=[];
    const r=route();state.view=r.view;state.score=r.id;document.body.dataset.mediaView=r.view;
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
    cartCount();syncCartButtons();syncAudio();initCarousels();initAmbient();updatePhotoTop();
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
    $$('[data-audio]').forEach(button=>{const playing=button.dataset.audio===state.source&&!audio.paused;if(button.classList.contains('score-action')){const target=button.querySelector('.score-icon');if(target)target.innerHTML=playing?icons.audioPause:icons.audioListen;}else button.innerHTML=playing?icons.pause:(button.dataset.audioIcon==='headphones'?icons.headphones:icons.play);button.setAttribute('aria-pressed',String(playing));});
    $$('.track-play').forEach((el,i)=>{el.innerHTML=state.track===i&&state.source===data.tracks[i].src&&!audio.paused?icons.pause:icons.play;});
    const now=$('.now-title');if(now)now.textContent=data.tracks[state.track].title;
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
  // Іконки оновлюємо лише при зміні стану.
  ['play', 'pause', 'loadedmetadata', 'error'].forEach(event => {
    audio.addEventListener(event, syncAudio);
  });
  
  // Під час відтворення оновлюємо тільки час і повзунок.
  audio.addEventListener('timeupdate', () => {
    $$('[data-player-src]').forEach(player => {
      if (player.dataset.playerSrc !== state.source) return;
  
      const elapsed = audio.currentTime;
      const duration = Number.isFinite(audio.duration)
        ? audio.duration
        : 0;
  
      const seek = $('.audio-progress', player);
      if (seek) {
        seek.value = duration ? elapsed / duration * 1000 : 0;
      }
  
      const stamp =
        $('.compact-time', player) || $('.elapsed', player);
  
      if (stamp) {
        stamp.textContent = time(elapsed);
      }
    });
  });
  function showTrackLinks(i){
    const track=data.tracks[i];const score=data.scores.find(s=>s.audio===track.src)||getScore(track.scoreId);
    const video=track.youtubeUrl||score?.video;
    let videoLink=video?(video.startsWith('https://')?`<a href="${escape(video)}" target="_blank" rel="noopener">${icons.video}${text('Переглянути відео','Watch video')}</a>`:`<button data-track-video="${escape(video)}">${icons.video}${text('Переглянути відео','Watch video')}</button>`):`<span aria-disabled="true">${icons.video}${text('Відео ще не додано','Video not added yet')}</span>`;
    const soundcloud=/^https:\/\//.test(track.soundcloudUrl)?`<a href="${escape(track.soundcloudUrl)}" target="_blank" rel="noopener">${icons.headphones}${text('Слухати на SoundCloud','Listen on SoundCloud')} ↗</a>`:`<span aria-disabled="true">${icons.headphones}SoundCloud — ${text('незабаром','coming soon')}</span>`;
    openModal(`<h2>${escape(track.title)}</h2><div class="track-links">${videoLink}${score?`<a href="${scoreUrl(score)}">${icons.score}${text('Переглянути ноти','View sheet music')}</a>`:''}${soundcloud}</div>`,'links');
  }

  function choosePhoto(index, axis='x', direction=1){
    state.photo=(index+photos.length)%photos.length;
    const img=$('#main-photo');if(img){img.src=photos[state.photo];img.alt=text('Юрій Буднік — фото','Yurij Budnik — photo')+' '+(state.photo+1);$('.photo-counter').textContent=`${state.photo+1} / ${photos.length}`;}
    $$('[data-photo]').forEach((b,i)=>{b.classList.toggle('active',i===state.photo);b.setAttribute('aria-pressed',String(i===state.photo));});
    if(dialog.open&&dialog.dataset.kind==='photo'){
      const current=$('.photo-modal-image');current.src=photos[state.photo];current.alt=text('Фото','Photo')+' '+(state.photo+1);$('.photo-modal-count').textContent=`${state.photo+1} / ${photos.length}`;
      if(mobileQuery.matches&&!reducedQuery.matches&&current.animate)current.animate([{opacity:.25,transform:`translate${axis.toUpperCase()}(${direction*55}px)`},{opacity:1,transform:'translate(0,0)'}],{duration:240,easing:'ease-out'});
    }
  }
  function photoModal(){openModal(`<div class="photo-modal"><button class="photo-side prev" data-modal-step="-1" aria-label="${text('Попереднє фото','Previous photo')}">${icons.left}</button><img class="photo-modal-image" src="${photos[state.photo]}" alt="${text('Фото','Photo')} ${state.photo+1}"><button class="photo-side next" data-modal-step="1" aria-label="${text('Наступне фото','Next photo')}">${icons.right}</button><span class="photo-modal-count">${state.photo+1} / ${photos.length}</span></div>`,'photo');}
  modal.addEventListener('click',e=>{
    const v=e.target.closest('[data-track-video]');if(v){openVideo(v.dataset.trackVideo);return;}
    const b=e.target.closest('[data-modal-step]');if(b){const direction=Number(b.dataset.modalStep);choosePhoto(state.photo+direction,'x',direction);b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash');setTimeout(()=>b.classList.remove('flash'),500);}
  });
  let swipe=null;
  modal.addEventListener('touchstart',e=>{if(dialog.dataset.kind==='photo'&&mobileQuery.matches&&e.touches.length===1){swipe={x:e.touches[0].clientX,y:e.touches[0].clientY};}},{passive:true});
  modal.addEventListener('touchmove',e=>{if(swipe&&e.touches.length===1)e.preventDefault();},{passive:false});
  modal.addEventListener('touchend',e=>{if(!swipe)return;const dx=e.changedTouches[0].clientX-swipe.x,dy=e.changedTouches[0].clientY-swipe.y;swipe=null;const axis=Math.abs(dx)>Math.abs(dy)?'x':'y',delta=axis==='x'?dx:dy;if(Math.abs(delta)>40){const direction=delta<0?1:-1;choosePhoto(state.photo+direction,axis,direction);}},{passive:true});
  modal.addEventListener('touchcancel',()=>{swipe=null;});

  function updatePhotoTop(){const b=$('.photo-top');if(b)b.hidden=state.view!=='photos'||(window.scrollY||0)<160;}
  window.addEventListener('scroll',updatePhotoTop,{passive:true});
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
    if(event.target.id==='main-photo'){photoModal();return;}
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.scroll){const el=$('.carousel',b.parentNode);el.scrollBy({left:Number(b.dataset.scroll)*el.clientWidth*(mobileQuery.matches?1.05:.85),behavior:'smooth'});b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash');setTimeout(()=>b.classList.remove('flash'),500);}
    else if(b.hasAttribute('data-photo-top')){window.scrollTo({top:0,behavior:'instant'});updatePhotoTop();}
    else if(b.dataset.filter){state.filter=b.dataset.filter;render();}
    else if(b.dataset.preview)previewScore(b.dataset.preview);
    else if(b.dataset.add)addToCart(b.dataset.add,b);
    else if(b.dataset.audio)playSource(b.dataset.audio);
    else if(b.dataset.video)openVideo(b.dataset.video);
    else if(b.dataset.track!==undefined)selectTrack(Number(b.dataset.track));
    else if(b.dataset.trackStep)selectTrack(state.track+Number(b.dataset.trackStep));
    else if(b.dataset.links!==undefined)showTrackLinks(Number(b.dataset.links));
    else if(b.hasAttribute('data-album-open'))albumModal();
    else if(b.dataset.vid!==undefined){state.video=Number(b.dataset.vid);audio.pause();$('#video-stage').innerHTML=videoFrame();$('.video-description').textContent=videoDescription();$$('[data-vid]').forEach((button,i)=>{button.classList.toggle('active',i===state.video);button.setAttribute('aria-pressed',String(i===state.video));});}
    else if(b.dataset.photo!==undefined){choosePhoto(Number(b.dataset.photo));if(!galleryDesktopQuery.matches)photoModal();}
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
  window.addEventListener('storage',e=>{if(e.key==='budnik-cart-v3'){try{const saved=JSON.parse(e.newValue||'[]');cart=Array.isArray(saved)?[...new Set(saved)].filter(getScore):[];}catch{cart=[];}cartCount();syncCartButtons();syncCartButtons();}});
  render();
})();
