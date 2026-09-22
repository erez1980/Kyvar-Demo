// Fire as soon as any part of the element enters the viewport. A ratio-based
// threshold never triggers for very tall blocks (long articles), leaving them blank.
const o=new IntersectionObserver(e=>e.forEach(x=>x.isIntersecting&&x.target.classList.add('on')),{threshold:0,rootMargin:'0px 0px -40px 0px'});
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
  const MODES = ['', 'light', 'dark'];
  const label = t => t === 'light' ? 'Theme: Light' : t === 'dark' ? 'Theme: Dark' : 'Theme: Auto (follows your system)';
  const btns = document.querySelectorAll('.themetoggle');
  btns.forEach(b => { b.title = label(root.dataset.theme || ''); });
  btns.forEach(b => b.addEventListener('click', () => {
    const cur = root.dataset.theme || '';
    const next = MODES[(MODES.indexOf(cur) + 1) % MODES.length];
    if (next) root.dataset.theme = next; else root.removeAttribute('data-theme');
    try { next ? localStorage.setItem('kyvar-theme', next) : localStorage.removeItem('kyvar-theme'); } catch(e){}
    btns.forEach(x => { x.title = label(next); });
    sync();
  }));
  if (mq.addEventListener) mq.addEventListener('change', sync);
  sync();
})();

// Mobile menu: site links plus jump-to-section links for long pages
(function () {
  const bar = document.querySelector('.nav .navlinks');
  const btn = document.querySelector('.navtoggle');
  if (!bar || !btn) return;

  const slug = s => s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // in-page targets: labelled sections (home) or article headings (long pages)
  const jumps = [];
  document.querySelectorAll('[data-navlabel]').forEach(el => {
    if (!el.id) el.id = slug(el.dataset.navlabel);
    jumps.push({ id: el.id, label: el.dataset.navlabel });
  });
  if (!jumps.length) {
    document.querySelectorAll('.prose h2').forEach(h => {
      if (!h.id) h.id = slug(h.textContent);
      jumps.push({ id: h.id, label: h.textContent.replace(/\.$/, '') });
    });
  }

  const siteLinks = [...bar.querySelectorAll('a:not(.pilotcta):not(.login)')]
    .map(a => `<a href="${a.getAttribute('href')}"${a.classList.contains('active') ? ' class="current"' : ''}>${esc(a.textContent.trim())}</a>`)
    .join('');
  const login = bar.querySelector('a.login');
  const cta = bar.querySelector('a.pilotcta');

  const panel = document.createElement('div');
  panel.className = 'navpanel';
  panel.id = 'navpanel';
  panel.innerHTML =
    '<h5>Site</h5>' + siteLinks +
    (jumps.length ? '<h5>On this page</h5><div class="onpage">' +
      jumps.map(j => `<a href="#${j.id}">${esc(j.label)}</a>`).join('') + '</div>' : '') +
    '<div class="panelcta">' +
      (cta ? `<a class="p" href="${cta.getAttribute('href')}">${esc(cta.textContent.trim())}</a>` : '') +
      (login ? `<a class="s" href="${login.getAttribute('href')}">${esc(login.textContent.trim())}</a>` : '') +
    '</div>';
  document.body.appendChild(panel);

  function setOpen(open) {
    panel.classList.toggle('on', open);
    document.body.classList.toggle('navopen', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    btn.innerHTML = open
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  }
  btn.addEventListener('click', () => setOpen(!panel.classList.contains('on')));
  panel.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  window.matchMedia('(min-width:761px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
})();
