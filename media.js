(() => {
  const gallery = document.querySelector('.media-gallery');
  const items = [...gallery.querySelectorAll('.gallery-item')];
  const images = items.map(item => item.querySelector('img'));
  const box = document.getElementById('lightbox');
  const photo = document.getElementById('lightbox-img');
  const counter = document.getElementById('counter');
  const prev = document.getElementById('prevBtn');
  const next = document.getElementById('nextBtn');
  let index = 0, opener = null;

  // Each column keeps the same distance between the visible photographs.
  // Even columns begin 20% lower; image order remains 1, 2, 3 ... for viewing.
  function arrange() {
    const style = getComputedStyle(gallery);
    const columns = parseInt(style.getPropertyValue('--columns'), 10) || 1;
    const gap = parseFloat(style.getPropertyValue('--gallery-gap')) || 32;
    const width = gallery.clientWidth;
    if (!width) return;
    if (columns === 1) {
      gallery.classList.remove('is-positioned');
      gallery.style.height = '';
      items.forEach(item => {
        item.style.width = ''; item.style.left = ''; item.style.top = '';
      });
      return;
    }
    const itemWidth = (width - gap * (columns - 1)) / columns;
    const bottoms = Array(columns).fill(0);
    gallery.classList.add('is-positioned');
    items.forEach((item, i) => {
      const img = images[i];
      const height = img.naturalWidth ? itemWidth * img.naturalHeight / img.naturalWidth : itemWidth * .75;
      const column = i % columns;
      const first = i < columns;
      const y = first ? (column % 2 ? height * .2 : 0) : bottoms[column] + gap;
      item.style.width = itemWidth + 'px';
      item.style.left = (column * (itemWidth + gap)) + 'px';
      item.style.top = y + 'px';
      bottoms[column] = y + height;
    });
    gallery.style.height = Math.max(...bottoms) + 'px';
  }
  images.forEach(img => {
    img.addEventListener('load', arrange);
    img.addEventListener('error', arrange);
  });
  window.addEventListener('resize', arrange);
  if (window.ResizeObserver) {
    let lastWidth = -1;
    new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width !== lastWidth) { lastWidth = width; arrange(); }
    }).observe(gallery);
  }
  arrange();

  function show() {
    photo.classList.remove('photo-enter');
    photo.src = images[index].currentSrc || images[index].src;
    photo.alt = images[index].alt;
    counter.textContent = (index + 1) + ' / ' + images.length;
  }
  photo.addEventListener('load', () => {
    photo.classList.remove('photo-enter');
    void photo.offsetWidth;
    photo.classList.add('photo-enter');
  });
  items.forEach((item, i) => item.addEventListener('click', () => {
    index = i; opener = item; show();
    box.showModal();
    document.body.classList.add('photo-open');
    // Focus the dialog itself so the close button does not receive an opening highlight.
    box.setAttribute('tabindex', '-1');
    box.focus({ preventScroll: true });
  }));
  function close() { box.close(); }
  box.addEventListener('close', () => {
    document.body.classList.remove('photo-open');
    opener?.focus({ preventScroll: true });
  });
  document.getElementById('close-lightbox').addEventListener('click', close);
  box.addEventListener('click', event => {
    if (event.target === box || event.target.classList.contains('lightbox-layout')) close();
  });
  function step(direction, button) {
    button.classList.remove('arrow-flash');
    void button.offsetWidth;
    button.classList.add('arrow-flash');
    index = (index + direction + images.length) % images.length;
    show();
  }
  prev.addEventListener('click', () => step(-1, prev));
  next.addEventListener('click', () => step(1, next));
  document.addEventListener('keydown', event => {
    if (!box.open) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); step(1, next); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); step(-1, prev); }
  });
  let start = null;
  photo.addEventListener('touchstart', event => {
    start = { x:event.touches[0].clientX, y:event.touches[0].clientY };
  }, { passive:true });
  photo.addEventListener('touchend', event => {
    if (!start) return;
    const dx = start.x - event.changedTouches[0].clientX;
    const dy = start.y - event.changedTouches[0].clientY;
    start = null;
    const difference = Math.abs(dy) > Math.abs(dx) ? dy : dx;
    if (Math.abs(difference) > 50) step(difference > 0 ? 1 : -1, difference > 0 ? next : prev);
  }, { passive:true });
})();
