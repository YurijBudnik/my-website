(() => {
 'use strict';
 const video=document.querySelector('.media-hub-video');
 if(!video)return;
 // Mobile and desktop sources have different aspect ratios; the video follows the viewport.
 function updateSource(){
   const small=window.matchMedia('(max-width:700px)').matches;
   const current=video.dataset.variant;
   const next=small?'mobile':'desktop';
   if(current===next)return;
   video.dataset.variant=next;
   video.poster=`assets/media-panels/video-${next}.jpg`;
   video.src=`assets/media-panels/video-${next}.mp4`;
   video.load();
   const motion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if(!motion)video.play().catch(()=>{});
 }
 updateSource();
 window.addEventListener('resize',updateSource,{passive:true});
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)video.pause();
})();
