const o=new IntersectionObserver(e=>e.forEach(x=>x.isIntersecting&&x.target.classList.add('on')),{threshold:.12});
document.querySelectorAll('.reveal').forEach(x=>o.observe(x));

// Theme toggle: manual override of the system color scheme, persisted per visitor
(function(){
  const root = document.documentElement;
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const eff = () => root.dataset.theme || (mq.matches ? 'light' : 'dark');
  function sync(){
    const t = root.dataset.theme || '';
    // swap the <picture> screenshot sources to match a forced theme
    document.querySelectorAll('picture>source[srcset*="-light.webp"]').forEach(s => {
      s.media = t === 'light' ? 'all' : t === 'dark' ? 'not all' : '(prefers-color-scheme: light)';
    });
    // browser-chrome color: a media-less meta placed first wins over the media-scoped pair
    let forced = document.querySelector('meta[name="theme-color"][data-forced]');
    if (t) {
      if (!forced) {
        forced = document.createElement('meta');
        forced.name = 'theme-color';
        forced.setAttribute('data-forced', '');
        const first = document.querySelector('meta[name="theme-color"]');
        (first ? first.parentNode : document.head).insertBefore(forced, first);
      }
      forced.content = t === 'light' ? '#f4f7fb' : '#050b17';
    } else if (forced) forced.remove();
  }
  document.querySelectorAll('.themetoggle').forEach(b => b.addEventListener('click', () => {
    const next = eff() === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('kyvar-theme', next); } catch(e){}
    sync();
  }));
  if (mq.addEventListener) mq.addEventListener('change', sync);
  sync();
})();
