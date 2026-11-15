/* The run thread: KYVAR's one illustration.
   Fine steel-blue strands flowing past ring nodes, drawn on <canvas
   data-thread="hero|lines|mini|word">. Colour carries state here too: the
   strands and rings are the machine (steel blue); one amber node is the
   person who decides, one green node is the verified result.

   Motion: the strands sway slowly and small light pulses travel along them,
   like runs moving through the pipeline; the amber node breathes. A canvas
   animates only while it is on screen and the tab is visible, at ~30 fps.
   With prefers-reduced-motion the drawing is static. Purely decorative:
   every canvas is aria-hidden. */
(function () {
  var canvases = Array.prototype.slice.call(document.querySelectorAll('canvas[data-thread]'));
  if (!canvases.length) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function rgb(hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16); }); }
  function mix(a, b, t) {
    var pa = rgb(a), pb = rgb(b);
    return 'rgb(' + pa.map(function (x, i) { return Math.round(x + (pb[i] - x) * t); }).join(',') + ')';
  }
  var P;
  function palette() {
    P = {
      a: css('--thread-a', '#1d6aa6'), b: css('--thread-b', '#6cb2e4'), c: css('--thread-c', '#c8e3f6'),
      line: css('--thread-line', '#9cadc1'), person: css('--person', '#f2b33d'), verified: css('--verified', '#4cc38a'),
      bg: css('--bg', '#0f1b2a')
    };
    P.cClear = 'rgba(' + rgb(P.c).join(',') + ',0)';
    // strand colours precomputed once per theme
    P.ramp = [];
    for (var i = 0; i < 64; i++) {
      var g = i / 63;
      P.ramp.push(g < 0.5 ? mix(P.a, P.b, g * 2) : mix(P.b, P.c, (g - 0.5) * 2));
    }
  }

  // ---------- geometry ----------
  function size(c) {
    var r = c.getBoundingClientRect();
    var d = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    var x = c.getContext('2d');
    x.setTransform(d, 0, 0, d, 0, 0);
    x.clearRect(0, 0, r.width, r.height);
    return { x: x, w: r.width, h: r.height };
  }
  function bez(p, t) {
    var u = 1 - t;
    return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
            u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]];
  }
  // sway: move the two inner control points on slow ellipses
  function sway(p, T, k, amp) {
    if (!T) return p;
    return [p[0],
      [p[1][0] + Math.sin(T * 0.35 + k) * amp, p[1][1] + Math.cos(T * 0.28 + k * 1.7) * amp],
      [p[2][0] + Math.cos(T * 0.31 + k * 2.3) * amp, p[2][1] + Math.sin(T * 0.4 + k) * amp],
      p[3]];
  }
  // A ribbon: n strands spread across the normal of a cubic bezier.
  function ribbon(x, p, maxW, n, alpha, twist, T, steps) {
    steps = steps || 70;
    var pts = [], nrm = [], wid = [];
    for (var k = 0; k <= steps; k++) {
      var t = k / steps, a = bez(p, t), b = bez(p, Math.min(1, t + 0.01));
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      pts.push(a); nrm.push([-dy / L, dx / L]);
      wid.push(Math.sin(Math.PI * t) * maxW * Math.cos(twist * t * Math.PI + (T ? Math.sin(T * 0.25) * 0.6 : 0)) + maxW * 0.08);
    }
    x.lineWidth = 1;
    for (var i = 0; i < n; i++) {
      var f = i / (n - 1) - 0.5;
      x.beginPath();
      for (var j = 0; j <= steps; j++) {
        var px = pts[j][0] + nrm[j][0] * wid[j] * f, py = pts[j][1] + nrm[j][1] * wid[j] * f;
        if (j) x.lineTo(px, py); else x.moveTo(px, py);
      }
      x.strokeStyle = P.ramp[Math.round((i / (n - 1)) * 63)];
      x.globalAlpha = alpha * (0.45 + 0.55 * Math.cos(f * Math.PI));
      x.stroke();
    }
    x.globalAlpha = 1;
  }
  // light pulses travelling along a path: runs moving through the pipeline
  function pulses(x, p, T, count, speed, off) {
    if (!T) return;
    for (var i = 0; i < count; i++) {
      var t = ((T * speed + off + i / count) % 1 + 1) % 1;
      var q = bez(p, t), fade = Math.sin(Math.PI * t);
      var g = x.createRadialGradient(q[0], q[1], 0, q[0], q[1], 10);
      g.addColorStop(0, P.c); g.addColorStop(1, P.cClear);
      x.globalAlpha = 0.9 * fade;
      x.fillStyle = g; x.beginPath(); x.arc(q[0], q[1], 10, 0, 7); x.fill();
      x.fillStyle = P.c; x.beginPath(); x.arc(q[0], q[1], 2.2, 0, 7); x.fill();
    }
    x.globalAlpha = 1;
  }
  function ring(x, cx, cy, r, col, fill, breathe) {
    if (breathe) {
      x.globalAlpha = 0.35 * (1 - breathe);
      x.beginPath(); x.arc(cx, cy, r + 14 * breathe, 0, 7); x.lineWidth = 2; x.strokeStyle = col; x.stroke();
      x.globalAlpha = 1;
    }
    x.beginPath(); x.arc(cx, cy, r, 0, 7); x.lineWidth = 1.5; x.strokeStyle = col; x.stroke();
    if (fill) { x.beginPath(); x.arc(cx, cy, r * 0.55, 0, 7); x.fillStyle = fill; x.fill(); }
  }
  function orbit(x, cx, cy, rx, ry, rot, col, a) {
    x.save(); x.translate(cx, cy); x.rotate(rot);
    x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, 7);
    x.strokeStyle = col; x.globalAlpha = a; x.lineWidth = 1; x.stroke();
    x.restore(); x.globalAlpha = 1;
  }

  // ---------- drawings (T = seconds, 0 = static) ----------
  var draw = {
    hero: function (c, T) {
      var o = size(c), x = o.x, W = o.w, H = o.h, s = Math.min(1, W / 1200), A = 34 * s;
      var par = T ? Math.min(window.scrollY, H) * 0.12 : 0; // gentle parallax while scrolling past
      var r1 = sway([[-40, H * .26], [W * .2, H * .06], [W * .04, H * .72], [W * .27, H * .9 - par]], T, 0, A);
      var r2 = sway([[-60, H * .6], [W * .13, H * .38], [W * .22, H * .98], [W * .02, H * 1.05]], T, 1.3, A * .8);
      var r3 = sway([[W + 40, H * .12], [W * .8, H * .02], [W * .99, H * .6], [W * .74, H * .68 - par]], T, 2.6, A);
      var r4 = sway([[W * .72, H * .98], [W * .86, H * .7], [W * .93, H * .92], [W + 50, H * .8]], T, 3.9, A * .8);
      ribbon(x, r1, 78 * s, 48, .6, 1.5, T);
      ribbon(x, r2, 50 * s, 30, .42, 1, T);
      ribbon(x, r3, 70 * s, 46, .6, 1.2, T);
      ribbon(x, r4, 44 * s, 28, .4, 1, T);
      pulses(x, r1, T, 2, 0.07, 0);
      pulses(x, r3, T, 2, 0.06, 0.4);
      var rot = T ? T * 0.02 : 0;
      orbit(x, W * .1, H * .5, 190 * s, 92 * s, -.5 + rot, P.line, .3);
      orbit(x, W * .1, H * .5, 260 * s, 140 * s, -.3 - rot * .7, P.line, .14);
      orbit(x, W * .9, H * .38, 170 * s, 74 * s, .6 - rot, P.line, .3);
      if (W > 760) {
        [[.05, .18], [.2, .32], [.14, .8], [.85, .1], [.94, .5], [.79, .84]].forEach(function (q, i) {
          ring(x, W * q[0] + (T ? Math.sin(T * .5 + i) * 4 : 0), H * q[1] + (T ? Math.cos(T * .4 + i) * 4 : 0), 6, P.b);
        });
        ring(x, W * .235, H * .5, 9, P.person, P.person, T ? (T * 0.5) % 1 : 0);
        ring(x, W * .8, H * .58, 8, P.verified, P.verified);
      }
    },
    lines: function (c, T) {
      var o = size(c), x = o.x, W = o.w, H = o.h;
      x.lineWidth = 1;
      var paths = [];
      for (var i = 0; i < 9; i++) {
        var wob = T ? Math.sin(T * 0.3 + i * 0.7) * 14 : 0;
        var p = [[W * .08, H * (.15 + i * .08)], [W * .45, H * (.1 + i * .09) + wob], [W * .55, H * (.55 + i * .03) - wob], [W, H * (.35 + i * .06)]];
        paths.push(p);
        x.beginPath(); x.moveTo(p[0][0], p[0][1]); x.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]);
        x.strokeStyle = P.line; x.globalAlpha = .45; x.stroke();
      }
      x.globalAlpha = 1;
      pulses(x, paths[2], T, 1, 0.05, 0);
      pulses(x, paths[6], T, 1, 0.04, 0.5);
      for (var j = 0; j < 7; j++) {
        var px = W * (.2 + j * .11), py = H * (.3 + ((j * 37) % 5) * .1);
        x.fillStyle = P.bg; x.fillRect(px - 7, py - 7, 14, 14);
        x.strokeStyle = P.line; x.strokeRect(px - 7, py - 7, 14, 14);
      }
    },
    mini: function (c, T, i) {
      var o = size(c), x = o.x, W = o.w, H = o.h;
      seed = 20 + i * 13;
      var y0 = H * (.2 + rnd() * .5), y1 = H * (.3 + rnd() * .5);
      var p = sway([[-10, y0], [W * .35, H * rnd()], [W * .65, H * rnd()], [W + 10, y1]], T, i, 12);
      ribbon(x, p, Math.min(46, H * .35), 26, .65, 1 + rnd(), T, 50);
      orbit(x, W * .5, H * .5, W * .38, H * .3, rnd() - .5 + (T ? T * .03 : 0), P.line, .25);
      ring(x, W * (.25 + rnd() * .5), H * (.3 + rnd() * .4), 5, P.b);
      pulses(x, p, T, 1, 0.08, i * 0.3);
    },
    word: function (c, T) {
      var o = size(c), x = o.x, W = o.w, H = o.h;
      for (var j = 0; j < 6; j++) {
        var p = sway([[-40, H * (.15 + j * .14)], [W * .3, H * (j % 2 ? -.1 : 1.1)], [W * .7, H * (j % 2 ? 1.1 : -.1)], [W + 40, H * (.25 + j * .12)]], T, j, H * .12);
        ribbon(x, p, H * .32, 40, .95, 1.2 + j * .2, T, 60);
      }
      x.globalCompositeOperation = 'destination-in';
      x.font = '900 ' + Math.round(H * 1.02) + 'px Archivo, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'alphabetic';
      var txt = 'KYVAR', mw = x.measureText(txt).width || 1, k = Math.min(1, (W * .98) / mw);
      x.save(); x.translate(W / 2, H * .99); x.scale(k, 1); x.fillStyle = '#000'; x.fillText(txt, 0, 0); x.restore();
      x.globalCompositeOperation = 'source-over';
      x.save(); x.translate(W / 2, H * .99); x.scale(k, 1); x.lineWidth = 1 / k; x.strokeStyle = P.line; x.globalAlpha = .35; x.strokeText(txt, 0, 0); x.restore();
      x.globalAlpha = 1;
    }
  };

  // ---------- loop ----------
  var visible = new Set();
  var start = performance.now(), last = 0, raf = 0;
  function render(c, T) {
    var f = draw[c.getAttribute('data-thread')];
    if (f && c.offsetWidth) f(c, T, canvases.indexOf(c));
  }
  function now() { return reduce.matches ? 0 : (performance.now() - start) / 1000 + 4; }
  function drawStatic() { palette(); var T = now(); canvases.forEach(function (c) { render(c, T); }); }

  function frame(now) {
    raf = 0;
    if (reduce.matches || document.hidden || !visible.size) return;
    if (now - last >= 33) { // ~30 fps is plenty for a slow drift
      last = now;
      var T = (now - start) / 1000 + 4;
      visible.forEach(function (c) { render(c, T); });
    }
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !reduce.matches && !document.hidden && visible.size) raf = requestAnimationFrame(frame); }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      kick();
    }, { rootMargin: '80px 0px' });
    canvases.forEach(function (c) { io.observe(c); });
  }

  drawStatic();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawStatic);
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { drawStatic(); kick(); }, 150); });
  document.addEventListener('visibilitychange', kick);
  function onScheme() { drawStatic(); kick(); }
  new MutationObserver(onScheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  var mq = window.matchMedia('(prefers-color-scheme: light)');
  if (mq.addEventListener) { mq.addEventListener('change', onScheme); reduce.addEventListener('change', onScheme); }
})();
