(() => {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  const top = document.getElementById('line-top');
  const mid = document.getElementById('line-mid');
  const bottom = document.getElementById('line-bot');

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    menu.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    top.setAttribute('d', open ? 'M6 6L18 18' : 'M4 6h16');
    mid.style.opacity = open ? '0' : '1';
    bottom.setAttribute('d', open ? 'M6 18L18 6' : 'M4 18h16');
  }
  btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      btn.focus();
    }
  });

  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'page');
  });

  window.setLang = (event, language) => {
    if (event) event.preventDefault();
    const lang = language === 'en' ? 'en' : 'ua';
    document.querySelectorAll('[data-en][data-ua]').forEach(element => {
      const label = element.classList.contains('nav-link') ? element.querySelector('.nav-label') : element;
      label.textContent = element.dataset[lang];
    });
    document.documentElement.lang = lang === 'ua' ? 'uk' : 'en';
    ['desk-btn-ua', 'btn-ua', 'desk-btn-en', 'btn-en'].forEach(id => {
      document.getElementById(id).setAttribute('aria-pressed', String(id.endsWith(lang)));
    });
    try { localStorage.setItem('selectedLang', lang); } catch {}
    const title = document.querySelector('[data-page-title]');
    document.title = title ? title.dataset[lang] + ' | Yurij Budnik' : 'Yurij Budnik';
  };

  let language = 'ua';
  try { language = localStorage.getItem('selectedLang') || 'ua'; } catch {}
  setLang(null, language);
  window.addEventListener('resize', () => {
    if (innerWidth >= 768) setMenu(false);
  });
})();
