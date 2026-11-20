/* ---------- Home: watch one ticket get fixed ----------
   Six stages, one real screen each. While the section is on screen the stages
   play in a loop, each tab's bar filling as its time runs, with a longer hold at
   Approve because that pause is the product. A highlight glides to the part of
   the screen that matters. Picking a stage jumps there and keeps playing; Pause
   stops the loop. Reduced motion never plays: the stages are still there to
   pick. Off screen or in a hidden tab, the loop waits. */
(function () {
  var box = document.getElementById('watch');
  if (!box) return;
  var lis = [].slice.call(box.querySelectorAll('.kw-tabs li'));
  var btns = lis.map(function (li) { return li.querySelector('button'); });
  var screen = box.querySelector('.kw-screen');
  var imgs = [].slice.call(screen.querySelectorAll('.kw-shot img'));
  var focus = screen.querySelector('.kw-focus');
  var sys = screen.querySelector('[data-systag]');
  var capt = screen.querySelector('[data-capt]');
  var ctl = screen.querySelector('[data-ctl]');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEP = 4600, HOLD = 6800;
  var cur = 0, t0 = 0, raf = 0, paused = false, visible = false;

  function dur(i) { return lis[i].classList.contains('person') ? HOLD : STEP; }
  function need(i) { var im = imgs[i]; if (im && im.loading === 'lazy') im.loading = 'eager'; }

  function set(i) {
    cur = i; need(i); need((i + 1) % imgs.length);
    imgs.forEach(function (im, k) {
      im.classList.toggle('on', k === i);
      if (k === i) im.removeAttribute('aria-hidden'); else im.setAttribute('aria-hidden', 'true');
    });
    lis.forEach(function (li, k) {
      li.classList.toggle('on', k === i);
      li.classList.toggle('done', k < i);
      li.style.setProperty('--p', k < i ? '100%' : '0%');
    });
    btns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    var im = imgs[i];
    sys.textContent = im.dataset.sys;
    sys.classList.toggle('kyvar', im.dataset.sys === 'KYVAR');
    capt.textContent = im.dataset.cap;
    screen.classList.toggle('person', lis[i].classList.contains('person'));
    screen.classList.toggle('verified', lis[i].classList.contains('verified'));
    var f = (im.dataset.focus || '').split(',');
    if (f.length === 4) {
      focus.style.setProperty('--fx', f[0] + '%');
      focus.style.setProperty('--fy', f[1] + '%');
      focus.style.setProperty('--fw', f[2] + '%');
      focus.style.setProperty('--fh', f[3] + '%');
      focus.classList.add('on');
    } else focus.classList.remove('on');
  }

  function tick(now) {
    raf = 0;
    if (paused || !visible || document.hidden) return;
    if (!t0) t0 = now;
    var p = (now - t0) / dur(cur);
    if (p >= 1) { set((cur + 1) % imgs.length); t0 = now; p = 0; }
    lis[cur].style.setProperty('--p', (p * 100).toFixed(1) + '%');
    raf = requestAnimationFrame(tick);
  }
  function run() { if (!raf && !paused && visible && !document.hidden) { t0 = 0; raf = requestAnimationFrame(tick); } }
  function halt() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  btns.forEach(function (b, i) {
    b.addEventListener('click', function () { halt(); set(i); run(); });
  });
  ctl.addEventListener('click', function () {
    paused = !paused;
    ctl.textContent = paused ? 'Play' : 'Pause';
    if (paused) { halt(); } else run();
  });
  set(0);

  if (still || !('IntersectionObserver' in window) || !window.requestAnimationFrame) return;
  ctl.hidden = false;
  new IntersectionObserver(function (es) {
    visible = es.some(function (e) { return e.isIntersecting; });
    if (visible) run(); else halt();
  }, { threshold: 0.3 }).observe(box);
  document.addEventListener('visibilitychange', function () { if (document.hidden) halt(); else run(); });
})();
