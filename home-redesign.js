(() => {
  'use strict';
  const tracks = [...document.querySelectorAll('.bn-track')];
  const playSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l10 6-10 6z" /></svg>';
  const pauseSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h3v12H8zM14 6h3v12h-3z" /></svg>';
  function format(seconds){ if(!Number.isFinite(seconds))return null; return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`; }
  function stopDisplay(track){
    const button=track.querySelector('.bn-play');
    button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-label',`Відтворити ${button.dataset.title}`);
    button.innerHTML=playSVG;
    track.querySelector('.bn-track-art-button')?.setAttribute('aria-label',`Відтворити ${button.dataset.title}`);
  }
  tracks.forEach(track => {
    const audio=track.querySelector('audio');
    const button=track.querySelector('.bn-play');
    const artButton=track.querySelector('.bn-track-art-button');
    if(artButton){artButton.setAttribute('aria-label',`Відтворити ${button.dataset.title}`);artButton.addEventListener('click',()=>button.click());}
    const time=track.querySelector('.bn-track-time');
    audio.addEventListener('loadedmetadata',()=>{const duration=format(audio.duration);if(duration)time.textContent=duration;});
    audio.addEventListener('play',()=>{
      tracks.forEach(other=>{ if(other!==track){const old=other.querySelector('audio');if(!old.paused)old.pause();stopDisplay(other);} });
      button.setAttribute('aria-pressed','true');
      button.setAttribute('aria-label',`Пауза ${button.dataset.title}`);
      button.innerHTML=pauseSVG;
      track.querySelector('.bn-track-art-button')?.setAttribute('aria-label',`Пауза ${button.dataset.title}`);
    });
    audio.addEventListener('pause',()=>stopDisplay(track));
    audio.addEventListener('ended',()=>{audio.currentTime=0;stopDisplay(track);});
    button.addEventListener('click',async()=>{
      if(!audio.paused){audio.pause();return;}
      // Stop the previous recording before starting a new one.
      tracks.forEach(other=>{if(other!==track)other.querySelector('audio').pause();});
      try{await audio.play();}catch(error){stopDisplay(track);console.warn('Audio playback unavailable',error);}
    });
  });
})();
