/* ---------- Home: one ServiceNow incident through the seven gates ----------
   The markup is the finished run, so a reader without JS sees every gate and
   what it did. Here the run is rewound and played once when the section is
   on screen: each gate lights up and its part of the example appears beside
   it. The run waits a moment at the approval gate, because that pause is the
   product. It plays once and then offers Replay; while it plays, the same
   control shows every step at once. Reduced motion never rewinds. */
(function () {
  var box = document.getElementById('gates');
  if (!box) return;
  var rows = [].slice.call(box.querySelectorAll('.g'));
  var gate = box.querySelector('[data-gate]');
  var gateText = box.querySelector('[data-gatetext]');
  var status = box.querySelector('[data-status]');
  var ctl = box.querySelector('[data-ctl]');
  var gi = rows.indexOf(gate);
  var doneText = status.textContent;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEP = 1500, HOLD = 2600;
  var timers = [], running = false;

  if (still || !('IntersectionObserver' in window)) return;

  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clear() { timers.forEach(clearTimeout); timers = []; }
  function show(i) {
    rows.forEach(function (el, n) {
      el.classList.remove('waiting');
      el.classList.toggle('pending', n > i);
      el.classList.toggle('now', n === i);
    });
  }

  function end() {
    clear(); running = false;
    rows.forEach(function (el) { el.classList.remove('pending', 'now', 'waiting'); });
    gateText.textContent = gateText.dataset.done;
    status.textContent = doneText;
    ctl.textContent = 'Replay';
  }

  function run() {
    clear(); running = true;
    ctl.hidden = false;
    ctl.textContent = 'Show all steps';
    status.textContent = 'Running';
    gateText.textContent = gateText.dataset.wait;
    show(-1);
    var t = 400;
    rows.forEach(function (el, i) {
      later(function () {
        show(i);
        if (i === gi) { el.classList.add('waiting'); status.textContent = 'Held at the approval gate'; }
      }, t);
      if (i === gi) {
        t += HOLD;
        later(function () {
          el.classList.remove('waiting');
          gateText.textContent = gateText.dataset.done;
          status.textContent = 'Approved. Running';
        }, t);
        t += 900;
      } else t += STEP;
    });
    later(end, t);
  }

  ctl.addEventListener('click', function () { if (running) end(); else run(); });

  // Rewind only once the script is certain it will play, then start when the
  // gates are on screen, so a visitor who lands lower down does not miss it.
  show(-1);
  gateText.textContent = gateText.dataset.wait;
  status.textContent = '';
  var io = new IntersectionObserver(function (es) {
    if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); run(); }
  }, { threshold: 0.3 });
  io.observe(box);
})();
