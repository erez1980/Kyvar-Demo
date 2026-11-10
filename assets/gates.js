/* ---------- Home: one ServiceNow incident through the seven gates ----------
   Each gate has a real screen beside it, from ServiceNow or KYVAR. Without JS
   every gate and its example are readable and the first screen shows. Here
   the screens play once when the section is on screen, waiting longer at the
   approval gate, because that pause is the product. A visitor can pick any
   gate to see its screen; that stops the play. Reduced motion never plays:
   the gates are still there to pick. */
(function () {
  var box = document.getElementById('gates');
  if (!box) return;
  var rows = [].slice.call(box.querySelectorAll('.g'));
  var picks = rows.map(function (r) { return r.querySelector('.gpick'); });
  var screen = document.getElementById('gscreen');
  var imgs = [].slice.call(screen.querySelectorAll('.gshot img'));
  var sys = screen.querySelector('[data-systag]');
  var name = screen.querySelector('[data-stepname]');
  var status = screen.querySelector('[data-status]');
  var ctl = screen.querySelector('[data-ctl]');
  var doneText = status.textContent;
  var gi = rows.indexOf(box.querySelector('[data-gate]'));
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEP = 2600, HOLD = 4200;
  var timers = [], playing = false;

  function need(i) { var im = imgs[i]; if (im && im.loading === 'lazy') im.loading = 'eager'; }
  function set(i) {
    need(i); need(i + 1);
    imgs.forEach(function (im, k) { im.classList.toggle('on', k === i); });
    rows.forEach(function (r, k) { r.classList.toggle('on', k === i); r.classList.toggle('seen', k < i); });
    picks.forEach(function (p, k) { p.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    var s = imgs[i].dataset.sys;
    sys.textContent = s;
    sys.classList.toggle('kyvar', s === 'KYVAR');
    name.textContent = imgs[i].dataset.step;
    screen.classList.toggle('person', i === gi);
  }
  function clear() { timers.forEach(clearTimeout); timers = []; }
  function stop() {
    clear(); playing = false;
    status.textContent = doneText;
    ctl.hidden = false; ctl.textContent = 'Replay';
  }
  function play() {
    clear(); playing = true;
    ctl.hidden = false; ctl.textContent = 'Stop';
    var t = 0;
    rows.forEach(function (r, i) {
      timers.push(setTimeout(function () {
        set(i);
        status.textContent = i === gi ? 'Held until a person approves. Nothing has changed yet.' : doneText;
      }, t));
      t += i === gi ? HOLD : STEP;
    });
    timers.push(setTimeout(stop, t - STEP + 600));
  }

  picks.forEach(function (p, i) {
    p.addEventListener('click', function () { if (playing) stop(); set(i); });
  });
  ctl.addEventListener('click', function () { if (playing) stop(); else play(); });
  set(0);

  if (still || !('IntersectionObserver' in window)) { ctl.hidden = true; return; }
  var io = new IntersectionObserver(function (es) {
    if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); play(); }
  }, { threshold: 0.35 });
  io.observe(box);
})();
