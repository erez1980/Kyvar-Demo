/* ---------- Home hero: the run record ----------
   The markup is the finished record, so a reader without JS sees the whole
   run. Here it is rewound and replayed: the machine's steps tick through,
   the run stops at the approval gate, and nothing after it happens until the
   visitor presses Approve. That pause is the product, so it is the one
   orchestrated motion on the site. Reduced motion skips the stagger but keeps
   the stop at the gate, because that part is an action, not decoration. */
(function () {
  var rec = document.getElementById('runrecord');
  if (!rec) return;
  var steps = [].slice.call(rec.querySelectorAll('.rstep'));
  var gate = rec.querySelector('[data-gate]');
  var gateText = gate.querySelector('.rd');
  var approve = gate.querySelector('.rapprove button');
  var status = rec.querySelector('[data-status]');
  var replay = rec.querySelector('[data-replay]');
  var gi = steps.indexOf(gate);
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEP = still ? 0 : 420;
  var timers = [];

  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function finish(el) { el.classList.remove('pending'); el.classList.add('done'); }

  function reset() {
    timers.forEach(clearTimeout); timers = [];
    steps.forEach(function (el) { el.classList.remove('done', 'waiting'); el.classList.add('pending'); });
    replay.hidden = true;
    status.textContent = 'Running';
  }

  function run() {
    reset();
    for (var i = 0; i < gi; i++) (function (el, n) { later(function () { finish(el); }, STEP * (n + 1)); })(steps[i], i);
    later(function () {
      gate.classList.remove('pending');
      gate.classList.add('waiting');
      gateText.textContent = gateText.dataset.wait;
      status.textContent = 'Held at the approval gate. Nothing has changed yet.';
    }, STEP * (gi + 1));
  }

  approve.addEventListener('click', function () {
    var hadFocus = rec.contains(document.activeElement);
    gate.classList.remove('waiting');
    finish(gate);
    gateText.textContent = gateText.dataset.done;
    status.textContent = 'Approved. Running';
    var rest = steps.slice(gi + 1);
    rest.forEach(function (el, n) { later(function () { finish(el); }, STEP * (n + 1) * 1.4); });
    later(function () {
      status.textContent = 'Recorded in 3 min 12 s';
      replay.hidden = false;
      if (hadFocus) replay.focus();
    }, STEP * rest.length * 1.4 + (still ? 0 : 200));
  });

  replay.addEventListener('click', function () {
    run();
    if (!still) later(function () { approve.focus({ preventScroll: true }); }, STEP * (gi + 1) + 20);
  });

  // Start once the record is on screen, so a visitor who lands lower down
  // does not miss it.
  if ('IntersectionObserver' in window) {
    reset();
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); later(run, still ? 0 : 500); }
    }, { threshold: 0.35 });
    io.observe(rec);
  } else run();
})();
