/* The run thread: KYVAR's one illustration.
   Fine steel-blue strands flowing past ring nodes, drawn on <canvas
   data-thread="hero|lines|mini|word">. Colour carries state here too: the
   strands and rings are the machine (steel blue); one amber node is the
   person who decides, one green node is the verified result. Nothing else
   is coloured. Static drawing, no animation, so reduced-motion needs no
   special case. Purely decorative: every canvas is aria-hidden. */
(function () {
  var canvases = document.querySelectorAll('canvas[data-thread]');
  if (!canvases.length) return;

  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function mix(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); });
    var pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return 'rgb(' + pa.map(function (x, i) { return Math.round(x + (pb[i] - x) * t); }).join(',') + ')';
  }
  function palette() {
    return {
      a: css('--thread-a', '#1d6aa6'), b: css('--thread-b', '#6cb2e4'), c: css('--thread-c', '#c8e3f6'),
      line: css('--thread-line', '#9cadc1'), person: css('--person', '#f2b33d'), verified: css('--verified', '#4cc38a'),
      bg: css('--bg', '#0f1b2a')
    };
  }
  function fit(c) {
    var r = c.getBoundingClientRect();
    var d = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * d));
    c.height = Math.max(1, Math.round(r.height * d));
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
  // A ribbon: n strands spread across the normal of a cubic bezier.
  function ribbon(x, P, p, maxW, n, alpha, twist) {
    for (var i = 0; i < n; i++) {
      var f = i / (n - 1) - 0.5;
      x.beginPath();
      for (var k = 0; k <= 90; k++) {
        var t = k / 90, a = bez(p, t), b = bez(p, Math.min(1, t + 0.01));
        var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        dx /= L; dy /= L;
        var w = Math.sin(Math.PI * t) * maxW * Math.cos(twist * t * Math.PI) + maxW * 0.08;
        var ox = -dy * w * f, oy = dx * w * f;
        if (k) x.lineTo(a[0] + ox, a[1] + oy); else x.moveTo(a[0] + ox, a[1] + oy);
      }
      var g = i / (n - 1);
      x.strokeStyle = g < 0.5 ? mix(P.a, P.b, g * 2) : mix(P.b, P.c, (g - 0.5) * 2);
      x.globalAlpha = alpha * (0.45 + 0.55 * Math.cos(f * Math.PI));
      x.lineWidth = 1;
      x.stroke();
    }
    x.globalAlpha = 1;
  }
  function ring(x, cx, cy, r, col, fill) {
    x.beginPath(); x.arc(cx, cy, r, 0, 7); x.lineWidth = 1.5; x.strokeStyle = col; x.stroke();
    if (fill) { x.beginPath(); x.arc(cx, cy, r * 0.55, 0, 7); x.fillStyle = fill; x.fill(); }
  }
  function orbit(x, cx, cy, rx, ry, rot, col, a) {
    x.save(); x.translate(cx, cy); x.rotate(rot);
    x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, 7);
    x.strokeStyle = col; x.globalAlpha = a; x.lineWidth = 1; x.stroke();
    x.restore(); x.globalAlpha = 1;
  }

  var draw = {
    hero: function (c, P) {
      var o = fit(c), x = o.x, W = o.w, H = o.h, s = Math.min(1, W / 1200);
      seed = 11;
      ribbon(x, P, [[-40, H * .26], [W * .2, H * .06], [W * .04, H * .72], [W * .27, H * .9]], 78 * s, 48, .6, 1.5);
      ribbon(x, P, [[-60, H * .6], [W * .13, H * .38], [W * .22, H * .98], [W * .02, H * 1.05]], 50 * s, 30, .42, 1);
      ribbon(x, P, [[W + 40, H * .12], [W * .8, H * .02], [W * .99, H * .6], [W * .74, H * .68]], 70 * s, 46, .6, 1.2);
      ribbon(x, P, [[W * .72, H * .98], [W * .86, H * .7], [W * .93, H * .92], [W + 50, H * .8]], 44 * s, 28, .4, 1);
      orbit(x, W * .1, H * .5, 190 * s, 92 * s, -.5, P.line, .3);
      orbit(x, W * .1, H * .5, 260 * s, 140 * s, -.3, P.line, .14);
      orbit(x, W * .9, H * .38, 170 * s, 74 * s, .6, P.line, .3);
      if (W > 760) {
        [[.05, .18], [.2, .32], [.14, .8], [.85, .1], [.94, .5], [.79, .84]].forEach(function (q) { ring(x, W * q[0], H * q[1], 6, P.b); });
        ring(x, W * .235, H * .5, 9, P.person, P.person);
        ring(x, W * .8, H * .58, 8, P.verified, P.verified);
      }
    },
    lines: function (c, P) {
      var o = fit(c), x = o.x, W = o.w, H = o.h;
      x.lineWidth = 1; x.strokeStyle = P.line;
      for (var i = 0; i < 9; i++) {
        x.beginPath();
        x.moveTo(W * .08, H * (.15 + i * .08));
        x.bezierCurveTo(W * .45, H * (.1 + i * .09), W * .55, H * (.55 + i * .03), W, H * (.35 + i * .06));
        x.globalAlpha = .45; x.stroke();
      }
      x.globalAlpha = 1;
      for (var j = 0; j < 7; j++) {
        var px = W * (.2 + j * .11), py = H * (.3 + ((j * 37) % 5) * .1);
        x.fillStyle = P.bg; x.fillRect(px - 7, py - 7, 14, 14);
        x.strokeStyle = P.line; x.strokeRect(px - 7, py - 7, 14, 14);
      }
    },
    mini: function (c, P, i) {
      var o = fit(c), x = o.x, W = o.w, H = o.h;
      seed = 20 + i * 13;
      var y0 = H * (.2 + rnd() * .5), y1 = H * (.3 + rnd() * .5);
      ribbon(x, P, [[-10, y0], [W * .35, H * rnd()], [W * .65, H * rnd()], [W + 10, y1]], Math.min(46, H * .35), 26, .65, 1 + rnd());
      orbit(x, W * .5, H * .5, W * .38, H * .3, rnd() - .5, P.line, .25);
      ring(x, W * (.25 + rnd() * .5), H * (.3 + rnd() * .4), 5, P.b);
    },
    word: function (c, P) {
      var o = fit(c), x = o.x, W = o.w, H = o.h;
      seed = 5;
      for (var j = 0; j < 6; j++) {
        ribbon(x, P, [[-40, H * (.15 + j * .14)], [W * .3, H * (j % 2 ? -.1 : 1.1)], [W * .7, H * (j % 2 ? 1.1 : -.1)], [W + 40, H * (.25 + j * .12)]], H * .32, 40, .95, 1.2 + j * .2);
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

  function drawAll() {
    var P = palette();
    Array.prototype.forEach.call(canvases, function (c, i) {
      var f = draw[c.getAttribute('data-thread')];
      if (f && c.offsetWidth) f(c, P, i);
    });
  }

  drawAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(drawAll, 150); });
  new MutationObserver(drawAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  var mq = window.matchMedia('(prefers-color-scheme: light)');
  if (mq.addEventListener) mq.addEventListener('change', drawAll);
})();
