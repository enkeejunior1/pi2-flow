/* π²-Flow page: the two Method figures, drawn in the browser. Needs js/core.js, js/draw.js, js/stepfig.js.
 * The curves are those of the previous page's method animation (webpage/animate_sec2.py), in its units: grid index k in
 * [0, 128] across the horizon (noise left, data right), y up, the teacher's trajectory y_t(k) inside a band of half-width HW
 * where the teacher is reliable, and the 4-NFE expert drawn as one gentle arc per segment (chainY).
 *
 * #fig-stage1  Stage 1 jump-length curriculum, zoomed into segment 2 (a strip on top shows where it sits in the horizon),
 *              with the teacher's trajectory of the full-horizon figure. Query levels are split into B = 64 bins; at
 *              iteration j of J = 256 the ceil(jB/J) bins closest to the source are open. The student's longest jump is a
 *              row of small arrows along the teacher's trajectory, one more for every two bins that open. A training-iteration bar drives
 *              it: it plays on its own while on screen, and can be scrubbed.
 * #fig-stage2  Stage 2: the 2-NFE student learns along the frozen 4-NFE trajectories. Four steps; in the last one its two
 *              jumps converge onto the expert's trajectory. */
(function () {
  'use strict';

  var se = window.PV.se, D = window.PV.draw, reduce = window.PV.reduce;

  // Previous page geometry (webpage/animate_sec2.py)
  var Y_MID = 0.270, HW = 0.034, SEG = [0, 32, 64, 96, 128], OFF = [0.0, 0.006, -0.004, 0.005, 0.002], BULGE = 0.014;
  var OOD_OFF = 0.058, B = 64, J = 256;
  var SIG = ['\\sigma_0', '\\sigma_{K/4}', '\\sigma_{K/2}', '\\sigma_{3K/4}', '\\sigma_K'];

  function yt(k) { var u = k / 128; return Y_MID - 0.035 * Math.sin(1.05 * Math.PI * u) + 0.012 * Math.sin(2.1 * Math.PI * u); }
  function chainY(k) {
    var i = Math.min(3, Math.floor(k / 32)), v = (k - SEG[i]) / 32;
    return yt(k) + OFF[i] * (1 - v) + OFF[i + 1] * v + BULGE * Math.sin(Math.PI * v);
  }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function clamp(u) { return Math.max(0, Math.min(1, u)); }
  function f1(v) { return v.toFixed(1); }

  /* A view maps (k, y) to SVG px: k in [k0, k1] onto [xl, xr], y about Y_MID onto yc, SY px per unit of y. */
  function view(k0, k1, xl, xr, yc, sy) {
    var V = {
      x: function (k) { return xl + (k - k0) / (k1 - k0) * (xr - xl); },
      y: function (y) { return yc - (y - Y_MID) * sy; }
    };
    V.line = function (f, a, b, n) {
      var pts = [];
      for (var i = 0; i <= n; i++) { var k = a + (b - a) * i / n; pts.push([V.x(k), V.y(f(k))]); }
      return D.smooth(pts);
    };
    V.band = function (parent, a, b) {
      var g = se('g', { class: 'band' }, parent), up = [], lo = [];
      for (var i = 0; i <= 40; i++) { var k = a + (b - a) * i / 40; up.push([V.x(k), V.y(yt(k) + HW)]); lo.push([V.x(k), V.y(yt(k) - HW)]); }
      D.path(g, D.smooth(up) + 'L' + D.smooth(lo.slice().reverse()).slice(1) + 'Z', 'idfill');
      D.path(g, V.line(yt, a, b, 40), 'idcore', { 'stroke-width': f1(HW * sy * 1.3) });
      D.path(g, D.smooth(up), 'idline');
      D.path(g, D.smooth(lo), 'idline');
      return g;
    };
    return V;
  }

  // The first n of a fixed row of small arrows along f, each `per` grid units long from k = 0: a longer jump appends
  // arrows rather than stretching them.
  function smallArrows(V, f, per, n) {
    var d = '', hd = '', HL = 4, HW2 = 2.2;
    for (var i = 0; i < n; i++) {
      var ka = i * per, kb = (i + 1) * per;
      var a = V.x(ka) + (i ? 1.2 : 5), b = V.x(kb) - 1.2;
      var Y = function (x) { return V.y(f(ka + (x - V.x(ka)) / (V.x(kb) - V.x(ka)) * per)); };
      var dy = Y(b) - Y(b - 1), ux = 1 / Math.hypot(1, dy), uy = dy * ux, bx = b - ux * HL, by = Y(b) - uy * HL;
      d += 'M' + f1(a) + ' ' + f1(Y(a)) + 'L' + f1(bx) + ' ' + f1(by);
      hd += 'M' + f1(b) + ' ' + f1(Y(b)) + 'L' + f1(bx - uy * HW2) + ' ' + f1(by + ux * HW2) + 'L' + f1(bx + uy * HW2) + ' ' + f1(by - ux * HW2) + 'Z';
    }
    return { d: d, hd: hd };
  }
  function endHead(g, V, f, k, cls) {
    var x = V.x(k), y = V.y(f(k)), xp = V.x(k - 0.6), yp = V.y(f(k - 0.6));
    D.head(g, x, y, x - xp, y - yp, cls, 7);
  }

  /* ---------------- Stage 1: curriculum, zoomed into segment 2 ---------------- */
  function initStage1() {
    var fig = document.getElementById('fig-stage1');
    if (!fig) return;
    var svg = fig.querySelector('svg.fig-svg');
    var XL = 44, XR = 462, AY = 252, ZT = 94, YC = 164, SY = 1.3;
    // The teacher's trajectory and band of the full-horizon figure (noise x = 70 to data x = 930), segment 2 = x 285 to 500.
    var T0 = function (x) { var u = x - 70; return 16 * Math.sin(u / 140) - 10 * (Math.sin(u / 63 + 0.8) - Math.sin(0.8)); };
    var W0 = function (x) { return 34 + 10 * (x - 70) / 860; };
    var xo = function (k) { return 285 + k / 32 * 215; };
    var mid = T0(xo(16));
    var V = { x: function (k) { return XL + k / 32 * (XR - XL); }, y: function (v) { return v; } };
    var Ty = function (k) { return YC + SY * (T0(xo(k)) - mid); };
    var Sy = function (k) { return Ty(k) - 5; };  // the student's rollout, inside the band, just above the teacher's trajectory
    var line = function (f, a, b, n) {
      var pts = [];
      for (var i = 0; i <= n; i++) { var k = a + (b - a) * i / n; pts.push([V.x(k), f(k)]); }
      return D.smooth(pts);
    };

    // Strip: the whole horizon, segment 2 (pi_2) highlighted, brackets for the curriculum segments and the uniform one,
    // and zoom lines down to the enlarged segment.
    var OX = function (k) { return XL + k / 128 * (XR - XL); }, sy = 46;
    var strip = se('g', { class: 'axis' }, svg);
    [[0, 96, 'curriculum'], [96, 128, 'uniform']].forEach(function (b) {
      var a = OX(b[0]) + 2, c = OX(b[1]) - 2;
      D.path(strip, 'M' + f1(a) + ' 22V17H' + f1(c) + 'V22', 'bracket');
      D.text(strip, f1((a + c) / 2), 12, b[2], 'mono', 'middle');
    });
    D.path(strip, 'M' + XL + ' ' + sy + 'H' + XR, 'ax');
    D.path(strip, 'M' + f1(OX(32)) + ' ' + sy + 'H' + f1(OX(64)), 'seg-on');
    D.tex(strip, OX(48), sy - 11, '\\pi_2', 'c-student', 'middle', 13);
    SEG.forEach(function (k, i) {
      D.path(strip, 'M' + f1(OX(k)) + ' ' + (sy - 4) + 'V' + (sy + 4), 'tick');
      D.tex(strip, OX(k), sy + 18, SIG[i], 'lvl', 'middle', 10.5);
    });
    // Stopped short: the ID band rises above ZT near the right edge.
    [[OX(32), XL], [OX(64), XR]].forEach(function (p) {
      var y0 = sy + 26, t = 0.6;
      D.path(strip, 'M' + f1(p[0]) + ' ' + y0 + 'L' + f1(p[0] + t * (p[1] - p[0])) + ' ' + f1(y0 + t * (ZT - 4 - y0)), 'zoomline');
    });

    var zone = se('rect', { x: XL, y: ZT, width: 0, height: AY - ZT, class: 'open-zone' }, svg);
    var bandG = se('g', { class: 'band' }, svg), up = [], lo = [];
    for (var q = 0; q <= 40; q++) {
      var kk = -1 + 34 * q / 40, w = SY * W0(xo(kk));
      up.push([V.x(kk), Ty(kk) - w]); lo.push([V.x(kk), Ty(kk) + w]);
    }
    D.path(bandG, D.smooth(up) + 'L' + D.smooth(lo.slice().reverse()).slice(1) + 'Z', 'idfill');
    D.path(bandG, line(Ty, -1, 33, 40), 'idcore', { 'stroke-width': 46 });
    D.path(bandG, D.smooth(up), 'idline');
    D.path(bandG, D.smooth(lo), 'idline');
    D.path(svg, line(Ty, -1, 33, 60), 'teacher-traj thin');
    D.text(svg, XR, f1(Ty(27) + 38), 'teacher trajectory', 'mono c-teacher', 'end');
    D.text(svg, XL + 6, f1(up[0][1] - 8), 'ID region', 'mono c-id');
    var edge = D.path(svg, '', 'frontier');

    // Axis of the enlarged segment, with its 64 bins.
    var ax = se('g', { class: 'axis' }, svg);
    D.arrow(ax, XL - 6, AY, XR + 14, AY, 'ax', 'ax-head', 6);
    [[0, SIG[1]], [32, SIG[2]]].forEach(function (t) {
      D.path(ax, 'M' + f1(V.x(t[0])) + ' ' + (AY - 5) + 'V' + (AY + 5), 'tick');
      D.tex(ax, V.x(t[0]), AY + 22, t[1], 'lvl', 'middle', 13.5);
    });
    var bins = [];
    for (var b = 0; b < B; b++) {
      var bx = V.x(32 * (b + 0.5) / B);
      bins.push(se('line', { x1: f1(bx), x2: f1(bx), y1: AY - 9, y2: AY - 3, class: 'bin' }, svg));
    }

    var ch = se('g', { class: 'chain' }, svg);
    var lines = D.path(ch, '', 'student-chain'), heads = D.path(ch, '', 'student-head');
    var endDot = D.dot(ch, 0, 0, 4.4, 'pt-good');
    D.dot(svg, XL, f1(Sy(0)), 4.6, 'pt-student');
    D.tex(svg, XL - 8, Sy(0) - 24, 'x_{\\sigma_{K/4}}', 'c-student', 'start', 15);
    var maxLbl = D.text(svg, 0, 0, 'maximal jump', 'mono c-student');
    var readout = D.text(svg, (XL + XR) / 2, AY + 40, '', 'mono strong', 'middle');

    var range = fig.querySelector('input[type=range]');
    var btn = fig.querySelector('.pp');
    var time = fig.querySelector('.time');

    function set(j) {
      j = Math.max(0, Math.min(J, j));
      var open = Math.ceil(j * B / J), done = open >= B, km = 32 * open / B, xm = V.x(km);
      zone.setAttribute('width', f1(xm - XL));
      edge.setAttribute('d', done || !open ? '' : 'M' + f1(xm) + ' ' + ZT + 'V' + (AY - 2));
      bins.forEach(function (t, i) { t.classList.toggle('open', i < open); });
      var c = smallArrows(V, Sy, 64 / B, Math.floor(open / 2));
      lines.setAttribute('d', c.d); heads.setAttribute('d', c.hd);
      endDot.setAttribute('cx', f1(xm)); endDot.setAttribute('cy', f1(Sy(km)));
      endDot.setAttribute('class', done ? 'pt-student' : 'pt-good');
      endDot.style.opacity = open ? 1 : 0;
      var mr = xm > XR - 90;
      maxLbl.setAttribute('x', f1(mr ? xm - 6 : xm + 6));
      maxLbl.setAttribute('y', AY - 15);
      maxLbl.setAttribute('text-anchor', mr ? 'end' : 'start');
      maxLbl.style.opacity = done || !open ? 0 : 1;
      if (done !== readout._done) {
        readout._done = done;
        if (done) { readout.textContent = 'j = 256: the jump spans the segment, \\(\\pi_2\\) of the 4-NFE policy'; window.PV.typeset(readout); }
      }
      if (!done) readout.textContent = 'iteration ' + Math.round(j) + ' / ' + J + ' · ' + open + ' of ' + B + ' bins open';
      range.value = String(Math.round(j));
      range.style.setProperty('--p', (j / J * 100) + '%');
      time.textContent = 'j = ' + Math.round(j);
    }

    // Playback: 0 to J in 9 s, hold 2 s, restart. Runs only while on screen and not paused by the user.
    var j = J, playing = false, userPaused = false, inView = false, raf = 0, lastT = 0, hold = 0;
    var RATE = J / 9;
    function frame(t) {
      var dt = lastT ? (t - lastT) / 1000 : 0;
      lastT = t;
      if (hold > 0) { hold -= dt; if (hold <= 0) j = 0; }
      else { j += RATE * dt; if (j >= J) { j = J; hold = 2; } }
      set(j);
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (playing) return;
      playing = true; lastT = 0;
      if (j >= J) { j = 0; hold = 0; }
      btn.setAttribute('aria-pressed', 'true'); btn.setAttribute('aria-label', 'Pause');
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      playing = false; cancelAnimationFrame(raf);
      btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', 'Play');
    }
    function sync() { if (inView && !userPaused && !reduce.matches) start(); else stop(); }
    btn.addEventListener('click', function () { userPaused = playing; if (!playing && reduce.matches) { start(); return; } sync(); });
    range.addEventListener('input', function () { userPaused = true; stop(); j = Number(range.value); hold = 0; set(j); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[0].intersectionRatio >= 0.5; sync(); }, { threshold: [0, 0.5, 1] }).observe(svg);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else sync(); });
    set(J);
  }

  /* ---------------- Stage 2: learn along the 4-NFE trajectories ---------------- */
  var S2_LABELS = [
    'Freeze the 4-NFE policy and roll it out once on 64 fixed prompt\u2013noise pairs, recording its states and velocities on every grid interval',
    'The 2-NFE student is evaluated at the noise and at the expert\u2019s midpoint state. At initialization, its half-horizon jumps leave the band',
    'On every grid interval, the student\u2019s trajectory is matched to the expert\u2019s',
    'Training pulls both jumps onto the 4-NFE trajectory. The teacher is never queried at a student state'
  ];
  var KNOTS = [];
  for (var q = 2; q < 128; q += 4) KNOTS.push(q);

  function initStage2() {
    var fig = document.getElementById('fig-stage2');
    if (!fig) return;
    var svg = fig.querySelector('svg.fig-svg');
    var XL = 44, XR = 432, AY = 252;
    var V = view(0, 128, XL, XR, 166, 900);
    var items = [], flows = [];
    function I(from, cls, delay) { var g = D.item(svg, { from: from, cls: cls, delay: delay }); items.push(g); return g; }

    var ax = se('g', { class: 'axis' }, svg);
    D.arrow(ax, XL - 6, AY, XR + 16, AY, 'ax', 'ax-head', 6);
    SEG.forEach(function (k, i) {
      var x = V.x(k);
      D.path(ax, 'M' + f1(x) + ' ' + (AY - 5) + 'V' + (AY + 5), 'tick');
      D.tex(ax, x, AY + 22, SIG[i], 'lvl', 'middle', 13.5);
      if (i > 0 && i < 4) D.path(ax, 'M' + f1(x) + ' 40V' + (AY - 6), 'seg-line');
      if (i < 4) D.text(ax, f1(V.x(k + 16)), 30, 'Segment ' + (i + 1), 'lbl seg-name', 'middle');
    });
    D.text(ax, XL, AY + 38, 'noise', 'mono', 'middle');
    D.text(ax, XR, AY + 38, 'data', 'mono', 'middle');
    V.band(svg, -2, 130);

    // Step 0: the frozen expert, one arc per segment, and its state on every grid interval.
    for (var i = 0; i < 4; i++) {
      var g = I(0, '', 0.25 * i);
      var d = V.line(chainY, SEG[i] + 0.4, SEG[i + 1] - 0.9, 24);
      D.path(g, d, 'student dr');
      endHead(g, V, chainY, SEG[i + 1] - 0.4, 'student-head');
      flows.push(D.flow(svg, d, [0], 'f-student'));
    }
    var kn = I(0, '', 1.0);
    KNOTS.forEach(function (k) { D.dot(kn, f1(V.x(k)), f1(V.y(chainY(k))), 1.9, 'grid-dot'); });
    var nodes = I(0, '', 0.9);
    SEG.forEach(function (k, n) { D.dot(nodes, f1(V.x(k)), f1(V.y(chainY(k))), n ? 4 : 4.6, n ? 'pt-student' : 'pt-ink'); });
    var el = I(0, '', 1.1);
    // Below the band in segment 1, clear of its lower edge, which falls toward the middle of the horizon.
    D.tex(el, XL - 4, V.y(yt(32) - HW) + 19, '\\text{frozen } \\pi^T = \\pi^{\\text{4NFE}}', 'c-student', 'start', 13);
    D.text(el, XL - 4, f1(V.y(yt(32) - HW) + 32), '(stop-grad)', 'mono c-student');

    // Step 1: anchors, and the student's two jumps at initialization (c = 0).
    var anc = I(1);
    [[0, 'x_{\\sigma_0}', -9, 5, 'end'], [64, 'x^T_{\\sigma_{K/2}}', 11, 15, 'start'], [128, 'x^T_{\\sigma_K}', 10, 5, 'start']].forEach(function (a) {
      var x = V.x(a[0]), y = V.y(chainY(a[0]));
      D.dot(anc, f1(x), f1(y), 7, 'ring-target');
      D.tex(anc, x + a[2], y + a[3], a[1], 'c-stage2', a[4], 15);
    });
    var JUMPS = [[0, 64], [64, 128]];
    function stu(k0, c, k) {
      var v = (k - k0) / 64;
      var arc = yt(k) + lerp(chainY(k0) - yt(k0), OOD_OFF, Math.pow(v, 1.4)) + 0.02 * Math.sin(Math.PI * v);
      // After training the student runs just above the expert (merging at the anchors), so both stay visible.
      return lerp(arc, chainY(k) + 0.011 * Math.min(1, 6 * v, 6 * (1 - v)), c);
    }
    var sp = JUMPS.map(function (J0, n) {
      var g = I(1, '', 0.2 + 0.7 * n);
      return {
        g: g,
        path: D.path(g, '', 'stage2 dr'),
        head: D.path(g, '', 'stage2-head'),
        tip: D.dot(g, 0, 0, 4.4, 'pt-stage2 hollow'),
        ood: D.dot(g, 0, 0, 10, 'ring-ood'),
        lbl: D.tex(g, 0, 0, '\\text{2-NFE student } \\pi^S\\ \\text{(step ' + (n + 1) + ')}', 'c-stage2', n ? 'end' : 'middle', 14),
        match: D.path(I(2), '', 'match-line')
      };
    });
    D.tex(I(2), V.x(64), 56, 'L_2\\ \\text{trajectory matching}', 'c-stage2', 'middle', 14);

    function draw(c) {
      JUMPS.forEach(function (J0, n) {
        var s = sp[n], f = function (k) { return stu(J0[0], c, k); };
        s.path.setAttribute('d', V.line(f, J0[0], J0[1] - 0.9, 48));
        var x = V.x(J0[1]), y = V.y(f(J0[1])), xp = V.x(J0[1] - 0.6), yp = V.y(f(J0[1] - 0.6));
        var L = Math.hypot(x - xp, y - yp), ux = (x - xp) / L, uy = (y - yp) / L, bx = x - ux * 7, by = y - uy * 7;
        s.head.setAttribute('d', 'M' + f1(x) + ' ' + f1(y) + 'L' + f1(bx - uy * 3.5) + ' ' + f1(by + ux * 3.5) + 'L' + f1(bx + uy * 3.5) + ' ' + f1(by - ux * 3.5) + 'Z');
        s.tip.setAttribute('cx', f1(x)); s.tip.setAttribute('cy', f1(y));
        s.ood.setAttribute('cx', f1(x)); s.ood.setAttribute('cy', f1(y));
        s.ood.style.opacity = f1(clamp(1 - c / 0.4));
        // Step 1 sits above its arc; step 2 ends just left of its tip, above its climb.
        if (n === 0) D.moveTex(s.lbl, V.x(30), V.y(f(30) + 0.028));
        else D.moveTex(s.lbl, x - 16, y - 8);
        s.lbl.style.opacity = f1(clamp(1 - c / 0.5));
        var md = '';
        KNOTS.forEach(function (k) {
          if (k <= J0[0] || k >= J0[1]) return;
          md += 'M' + f1(V.x(k)) + ' ' + f1(V.y(chainY(k))) + 'V' + f1(V.y(f(k)));
        });
        s.match.setAttribute('d', md);
      });
    }

    var c = 0, tween = 0;
    draw(0);
    function morph(target, ms) {
      cancelAnimationFrame(tween);
      if (reduce.matches || !ms) { c = target; draw(c); return; }
      var from = c, t0 = 0;
      function step(t) {
        if (!t0) t0 = t;
        var u = Math.min(1, (t - t0) / ms), k = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        c = from + (target - from) * k;
        draw(c);
        if (u < 1) tween = requestAnimationFrame(step);
      }
      tween = requestAnimationFrame(step);
    }

    window.PV.stepFigure(fig, S2_LABELS, function (s) {
      D.show(svg, items, flows, s, function () { return 0; });
      if (s === 3) morph(1, 2600);
      else morph(s < 0 ? 1 : 0, 0);
    });
  }

  window.PV.initMethod = function () { initStage1(); initStage2(); };
})();
