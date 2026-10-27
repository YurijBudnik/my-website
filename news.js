(() => {
 'use strict';
 const data=window.NEWS_CONTENT;if(!data)return;
 const $=s=>document.querySelector(s),feed=$('#news-feed'),dialog=$('#news-dialog');
 let lang=document.documentElement.lang==='en'?'en':'ua',filter='all',year='all',returnTo=null,opened=null;
 const words=(ua,en)=>lang==='en'?en:ua;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const title=x=>lang==='en'?x.titleEn:x.title;
 const source=n=>data.sources.find(s=>s.number===n);
 function dated(x){
  const s=x.sourceNumbers.length===1?source(x.sourceNumbers[0]):null;
  const date=x.publicationDate||s?.publicationDate||x.eventDate;
  return {date,kind:x.publicationDate||s?.publicationDate?'publication':'event',precision:x.publicationDate?x.publicationDatePrecision:(s?.publicationDate?s.publicationDatePrecision:x.eventDatePrecision)};
 }
 function group(x){return dated(x).date?.slice(0,4)||'unknown';}
 function dateLabel(x){const d=dated(x);if(!d.date)return words('Архів · рік не зазначено','Archive · year not specified');let label=d.date;if(d.date.length===10)label=new Intl.DateTimeFormat(lang==='en'?'en-GB':'uk-UA',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d.date+'T12:00:00Z'));else if(d.date.length===7)label=new Intl.DateTimeFormat(lang==='en'?'en-GB':'uk-UA',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d.date+'-01T12:00:00Z'));return label+' · '+(d.kind==='publication'?words('публікація','published'):words('подія','event'));}
 const categories={bessarabia:['Бесарабія','Bessarabia'],philharmonic:['Філармонія','Philharmonic'],solo:['Сольні виступи','Solo performances'],archive:['Концертний архів','Concert archive']};
 function category(x){return categories[x.category]?.[lang==='en'?1:0]||words('Архів','Archive');}
 function card(x){return `<article class="story" data-id="${esc(x.id)}"><button class="story-image ${x.image?'':'story-text-image'}" data-open="${esc(x.id)}" aria-label="${esc(words('Переглянути: ','View: ')+title(x))}">${x.image?`<img src="${esc(x.image)}" alt="${esc(title(x))}" loading="lazy" width="1000" height="1200">`:`<span class="archive-monogram" aria-hidden="true">${x.sourceNumbers.length?'Facebook ↗':'ЮБ'}</span><span>${esc(x.sourceNumbers.length?words('Оригінальна публікація','Original post'):words('Концертний архів','Concert archive'))}</span>`}<span class="image-action" aria-hidden="true">↗</span></button><div class="story-body"><p class="story-meta">${esc(category(x))}<span>·</span>${esc(dateLabel(x))}</p><h3><button data-open="${esc(x.id)}">${esc(title(x))}</button></h3>${x.eventLabel?`<p class="event-label">${esc(lang==='en'?x.eventLabelEn:x.eventLabel)}</p>`:''}${x.caption?`<p class="story-caption">${esc(lang==='en'?x.captionEn:x.caption)}</p>`:''}<button class="text-link" data-open="${esc(x.id)}">${esc(x.sourceNumbers.length?words('Матеріал і джерело','Story & source'):words('Переглянути матеріал','View archive item'))} <span aria-hidden="true">↗</span></button></div></article>`;}
 function render(){
  const years=[...new Set(data.items.map(group).filter(g=>g!=='unknown'))].sort().reverse();
  $('#news-year').innerHTML=`<option value="all">${words('Усі роки','All years')}</option>`+years.map(y=>`<option value="${y}">${y}</option>`).join('')+`<option value="unknown">${words('Без року','Undated')}</option>`;$('#news-year').value=year;
  const items=data.items.filter(x=>(filter==='all'||x.category===filter)&&(year==='all'||group(x)===year)).sort((a,b)=>(dated(b).date||'').localeCompare(dated(a).date||''));
  const groups=[...new Set(items.map(group))];
  feed.innerHTML=groups.map(g=>`<section class="year-section ${g==='unknown'?'undated':'dated'}" aria-label="${g==='unknown'?words('Архів без підтвердженого року','Undated archive'):g}"><div class="year-heading"><h2>${g==='unknown'?words('З концертного архіву','From the concert archive'):g}</h2><span>${g==='unknown'?words('Афіші та світлини без підтвердженого року','Posters and photographs without a confirmed year'):words('У часовому порядку','In chronological order')}</span></div><div class="stories-grid">${items.filter(x=>group(x)===g).map(card).join('')}</div></section>`).join('')||`<p class="news-empty">${words('У цьому розділі поки немає матеріалів.','No items in this selection yet.')}</p>`;
  $('#news-status').textContent=words('Показано матеріалів: ','Showing items: ')+items.length;
 }
 function open(id){const x=data.items.find(x=>x.id===id);if(!x)return;opened=id;returnTo=document.activeElement;
  const sources=x.sourceNumbers.map(source).filter(Boolean).sort((a,b)=>(b.publicationDate||'').localeCompare(a.publicationDate||''));
  $('#dialog-content').innerHTML=`${x.image?`<div class="dialog-image"><img src="${esc(x.image)}" alt="${esc(title(x))}"></div>`:''}<div class="dialog-copy"><p class="eyebrow">${esc(category(x))}</p><h2 id="dialog-title">${esc(title(x))}</h2><p class="story-meta">${esc(dateLabel(x))}</p>${x.eventLabel?`<p>${esc(lang==='en'?x.eventLabelEn:x.eventLabel)}</p>`:''}${x.caption?`<p>${esc(lang==='en'?x.captionEn:x.caption)}</p>`:''}${sources.length?`<h3>${words('Оригінальні публікації','Original posts')}</h3>${sources.length>1?`<p class="source-note">${words('Посилання з добірки збережено разом. Відповідність окремих дописів цій світлині ще не підтверджена.','The collection’s links are kept together. Individual posts have not yet been matched to this photograph.')}</p>`:''}<div class="source-list">${sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.author||'Facebook')}${sources.length>1?' · '+words('Публікація ','Post ')+s.number:''}<span>${esc(s.publicationDate||words('Відкрити допис','Open post'))} ↗</span></a>`).join('')}</div>`:`<p class="source-note">${words('Матеріал з особистої концертної добірки.','Material from the artist’s concert collection.')}</p>`}</div>`;
  if(!dialog.open)dialog.showModal();document.body.classList.add('news-modal-open');$('.dialog-close').focus({preventScroll:true});
 }
 function close(){dialog.close();}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)open(b.dataset.open);const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===f)));render();}});
 $('#news-year').addEventListener('change',e=>{year=e.target.value;render();});
 $('.dialog-close').addEventListener('click',close);
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 dialog.addEventListener('close',()=>{opened=null;document.body.classList.remove('news-modal-open');if(returnTo?.isConnected)returnTo.focus({preventScroll:true});$('#dialog-content').innerHTML='';});
 document.addEventListener('languagechange',e=>{lang=e.detail==='en'?'en':'ua';render();if(opened)open(opened);});
 $('#news-tools').hidden=false;render();
})();
