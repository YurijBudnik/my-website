(() => {
 const cover=document.querySelector('.hero-album'),video=cover?.querySelector('video');
 if(!cover||!video)return;
 const reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
 let hovered=false,focused=false;
 function update(){
  video.muted=true;
  if((hovered||focused)&&!document.hidden&&!reduced.matches){video.play().catch(()=>{});}
  else video.pause();
 }
 cover.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){hovered=true;update();}});
 cover.addEventListener('pointerleave',()=>{hovered=false;update();});
 cover.addEventListener('focus',()=>{focused=true;update();});
 cover.addEventListener('blur',()=>{focused=false;update();});
 document.addEventListener('visibilitychange',update);
 reduced.addEventListener('change',update);
 document.addEventListener('languagechange',e=>cover.setAttribute('aria-label',e.detail==='en'?'Music — Beyond Accordion':'Музика — Beyond Accordion'));
 cover.setAttribute('aria-label',document.documentElement.lang==='en'?'Music — Beyond Accordion':'Музика — Beyond Accordion');
})();
