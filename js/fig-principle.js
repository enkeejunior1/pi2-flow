/* π²-Flow page: "Design principle" figure (#fig-principle), three panels drawn in the browser on the geometry of Figure 1
 * of the paper (figures/teacher_reliability.py): the same six teacher trajectories, grid levels, rollouts and arrows,
 * in the paper's axes coordinates (x in [0, 1], y in [0, PH/PW], y up), scaled by S px per unit.
 * The graded ID region and its dashed boundary come from webpage/build_principle_assets.py (media/id-region.png,
 * js/data-principle.js). Six steps; the panel of each step is STEP_PANEL. Needs js/core.js, js/draw.js, js/stepfig.js. */
(function () {
  'use strict';

  var se = window.PV.se, D = window.PV.draw, G = window.PI2_PRINCIPLE;

  var LABELS = [
    'The teacher\u2019s trajectories, and the region around them where the teacher is reliable (its ID region)',
    '\\(\\pi\\)-Flow: one evaluation at \\(x_s\\) gives a policy \\(\\pi\\), rolled out to \\(\\hat{x}_t\\), where its velocity is matched to the teacher\u2019s',
    'A short jump keeps \\(\\hat{x}_{t_1}\\) in the ID region, where the teacher\u2019s velocity points along its trajectory',
    'A long jump carries \\(\\hat{x}_{t_2}\\) out of distribution, where the teacher\u2019s velocity is unreliable',
    '\\(\\pi^2\\)-Flow, Stage 1: four short jumps along the teacher\u2019s trajectory, lengthened progressively in training (4 NFE)',
    'Stage 2: two jumps learned along the 4-NFE trajectory, never querying the teacher at student states (2 NFE)'
  ];
  var STEP_PANEL = [0, 0, 1, 1, 2, 2];

  // Paper geometry (figures/teacher_reliability.py)
  var S = 327, GAP = (1040 - 3 * S) / 2, YM = 1.74 / 2.22, TOPM = 2;
  var LEVELS = [0.68, 0.53, 0.38, 0.23, 0.08], Y_TOP = 0.68, Y_BOT = 0.08;
  var AX_X = 0.14, X_END = 0.98, XC = 0.57, SRC = 2, ERR = 0.30;
  var TOPS = [-0.30, -0.18, -0.06, 0.06, 0.18, 0.30].map(function (v) { return XC + v; });
  var BOTS = [-0.29, -0.22, -0.15, 0.15, 0.22, 0.29].map(function (v) { return XC + v; });
  var PT = S / 160;  // px per point of the paper's 2.22 in panel

  function frac(y) { var s = Math.min(1, Math.max(0, (Y_TOP - y) / (Y_TOP - Y_BOT))); return 3 * s * s - 2 * s * s * s; }
  function tx(i, y) { return TOPS[i] + (BOTS[i] - TOPS[i]) * frac(y); }
  function X(x) { return x * S; }
  function Y(y) { return TOPM + (YM - y) * S; }
  function f1(v) { return v.toFixed(1); }
  function poly(pts) { return 'M' + pts.map(function (p) { return f1(X(p[0])) + ' ' + f1(Y(p[1])); }).join('L'); }
  function curve(fx, y0, y1, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) { var y = y0 + (y1 - y0) * i / n; pts.push([fx(y), y]); }
    return pts;
  }
  function onTraj(y) { return [tx(SRC, y), y]; }

  /* Arrow from p to q in paper coordinates, trimmed by shrink px at both ends; rad bends it like matplotlib's arc3. */
  function arrow(g, p, q, lineCls, headCls, opts) {
    opts = opts || {};
    var a = [X(p[0]), Y(p[1])], b = [X(q[0]), Y(q[1])], sh = opts.shrink || 0, size = opts.size || 7, rad = opts.rad || 0;
    var c = [(a[0] + b[0]) / 2 - rad * (b[1] - a[1]), (a[1] + b[1]) / 2 + rad * (b[0] - a[0])];
    function unit(u, v) { var L = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1; return [(v[0] - u[0]) / L, (v[1] - u[1]) / L]; }
    var us = rad ? unit(a, c) : unit(a, b), ue = rad ? unit(c, b) : unit(a, b);
    var s0 = [a[0] + us[0] * sh, a[1] + us[1] * sh], tip = [b[0] - ue[0] * sh, b[1] - ue[1] * sh];
    var e0 = [tip[0] - ue[0] * size * 0.8, tip[1] - ue[1] * size * 0.8];
    var d = 'M' + f1(s0[0]) + ' ' + f1(s0[1]) + (rad ? 'Q' + f1(c[0]) + ' ' + f1(c[1]) + ' ' : 'L') + f1(e0[0]) + ' ' + f1(e0[1]);
    var path = D.path(g, d, lineCls);
    D.head(opts.headParent || g, tip[0], tip[1], ue[0], ue[1], headCls, size);
    return { d: d, path: path };
  }

  function build(svg) {
    var items = [], flows = [];
    function I(parent, from, panel, cls, delay, hide) {
      var g = D.item(parent, { from: from, panel: panel, cls: cls, delay: delay, hide: hide });
      items.push(g);
      return g;
    }
    function F(parent, d, steps, cls) { var f = D.flow(parent, d, steps, cls); flows.push(f); return f; }
    /* Arrow that draws on from p to q over dur s, starting delay s into the step, with its flow revealed behind the
     * line (a mask drawn on in step with it) and the head shown once the line reaches it. */
    var nMask = 0;
    function drawnArrow(parent, from, panel, p, q, delay, dur, lineCls, headCls, flowCls, opts) {
      var g = I(parent, from, panel, '', delay);
      g.style.setProperty('--dur', dur + 's');
      g.style.setProperty('--ease', 'linear');
      var hg = I(parent, from, panel, '', delay + dur * 0.85);
      var ar = arrow(g, p, q, lineCls + ' dr', headCls, Object.assign({ headParent: hg }, opts));
      var id = 'pr-mask-' + (nMask++);
      var mask = se('mask', { id: id, maskUnits: 'userSpaceOnUse', x: -100, y: -100, width: 1400, height: 600 }, g);
      D.path(mask, ar.d, 'mask-dr dr');
      var f = F(parent, ar.d, [from], flowCls);
      f.setAttribute('mask', 'url(#' + id + ')');
      f.style.transitionDelay = '0s';
      return ar;
    }
    function M(g, p, dx, dy, src, cls, anchor) { return D.tex(g, X(p[0] + dx), Y(p[1] + dy) + 5, src, cls, anchor || 'middle', 15.5); }

    /* Graded ID region, teacher trajectories, and the noise-level axis with guides at the labeled levels. */
    function base(g, panel, labels, opts) {
      var a = I(g, -1, panel, 'base');
      var E = G.extent;
      se('image', { href: 'media/id-region.png', x: f1(X(E[0])), y: f1(Y(E[3])), width: f1(X(E[1] - E[0])),
        height: f1((E[3] - E[2]) * S), preserveAspectRatio: 'none' }, a);
      if (opts.boundary) G.boundary.forEach(function (ln) { D.path(a, poly(ln), 'idline'); });
      var trajs = [];
      for (var i = 0; i < TOPS.length; i++) {
        var d = poly(curve(function (y) { return tx(i, y); }, Y_TOP + 0.05, Y_BOT - 0.04, 40));
        D.path(a, d, 'traj');
        trajs.push(d);
      }
      if (opts.highlight) D.path(a, trajs[SRC], 'teacher-traj');
      D.arrow(a, X(AX_X), Y(Y_TOP + 0.06), X(AX_X), Y(Y_BOT - 0.05), 'ax', 'ax-head', 6);
      labels.forEach(function (lab, k) {
        if (!lab) return;
        var y = Y(LEVELS[k]);
        D.path(a, 'M' + f1(X(AX_X) - 3.5) + ' ' + f1(y) + 'H' + f1(X(AX_X)), 'tick');
        D.path(a, 'M' + f1(X(AX_X)) + ' ' + f1(y) + 'H' + f1(X(X_END)), 'guide');
        D.tex(a, X(AX_X - 0.02), y + 4.5, lab, 'lvl', 'end', 13.5);
      });
      D.text(a, f1(X(AX_X)), f1(Y(Y_TOP + 0.082) + 4), 'noise', 'mono', 'middle');
      D.text(a, f1(X(AX_X)), f1(Y(Y_BOT - 0.064) + 4), 'data', 'mono', 'middle');
      return trajs;
    }
    function source(g) {
      var p = onTraj(Y_TOP);
      D.dot(g, f1(X(p[0])), f1(Y(p[1])), 4.5, 'pt-ink');
      M(g, p, -0.052, 0.028, 'x_s');
      return p;
    }
    // Text runs and \( \) math laid out side by side, centered; laid out again once the web fonts have loaded.
    function title(g, s, panel) {
      var row = se('g', {}, I(g, -1, panel, 'ptitle'));
      var parts = s.split(/\\\(|\\\)/).map(function (p, i) {
        return i % 2 ? D.tex(row, 0, 0, p, 'ptitle-tex', 'start', 15.5) : p && D.text(row, 0, 0, p, 'ptitle', 'start');
      }).filter(Boolean);
      function layout() {
        var x = 0;
        parts.forEach(function (p) {
          if (p.tagName === 'text') { p.setAttribute('x', f1(x)); x += p.getComputedTextLength(); }
          else { p.setAttribute('transform', 'translate(' + f1(x) + ' 0)'); x += p.getBBox().width + 0.5; }
        });
        row.setAttribute('transform', 'translate(' + f1(S / 2 - x / 2) + ' ' + f1(TOPM + YM * S + 26) + ')');
      }
      layout();
      if (document.fonts) document.fonts.ready.then(layout);
    }

    /* ---- (a) π-Flow ---- */
    var A = se('g', { class: 'panel' }, svg);
    var tA = base(A, 0, ['s', null, 't', null, null], {});
    tA.forEach(function (d) { F(A, d, [0]); });
    var tl = I(A, 0, 0);
    D.text(tl, f1(X(0.57)), f1(Y(0.125)), 'teacher', 'lbl c-teacher', 'middle');
    D.text(tl, f1(X(0.57)), f1(Y(0.125) + 15), 'trajectories', 'lbl c-teacher', 'middle');
    var yt = LEVELS[2];
    var roll = function (y) { return tx(SRC, y) + 0.05 * Math.sin(Math.PI / 2 * (Y_TOP - y) / (Y_TOP - yt)); };
    var pt = [roll(yt), yt];
    var box = I(A, 1, 0);
    se('rect', { x: f1(X(0.635)), y: f1(Y(0.632 + 0.092)), width: f1(X(0.315)), height: f1(0.092 * S), rx: 5, class: 'pbox' }, box);
    M(box, [0.792, 0.678], 0, 0, '\\pi = f_\\theta(x_s, s)', 'c-student');
    var p0 = onTraj(Y_TOP);
    arrow(box, [0.635, 0.678], [p0[0] + 0.022, p0[1]], 'student-thin', 'student-head', { size: 6 });
    var a1 = I(A, 1, 0, '', 0.2);
    var rd = poly(curve(roll, Y_TOP, yt, 40));
    D.path(a1, rd, 'student dr');
    F(A, rd, [1], 'f-student');
    source(I(A, 1, 0));
    var a1b = I(A, 1, 0, '', 0.8);
    D.dot(a1b, f1(X(pt[0])), f1(Y(pt[1])), 4.5, 'pt-student');
    M(a1b, [pt[0] + 0.048, (Y_TOP + yt) / 2 + 0.01], 0, 0, '\\Phi^{\\bar\\theta}_{t\\leftarrow s}(x_s)', 'c-student', 'start');
    M(a1b, [pt[0] + 0.032, pt[1] + 0.025], 0, 0, '\\hat{x}_t', 'c-student', 'start');
    var a2 = I(A, 1, 0, '', 1.3);
    arrow(a2, pt, [pt[0] + 0.048, pt[1] - 0.115], 'student-v', 'student-head', { size: 7 });
    arrow(a2, pt, [pt[0] - 0.048, pt[1] - 0.115], 'teacher-v', 'teacher-head', { size: 7 });
    M(a2, [pt[0] + 0.048, pt[1] - 0.145], 0, 0, '\\pi(\\hat{x}_t, t)', 'c-student', 'start');
    M(a2, [pt[0] - 0.055, pt[1] - 0.145], 0, 0, 'v_\\phi(\\hat{x}_t, t)', 'c-teacher', 'end');
    title(A, '(a) \\(\\pi\\)-Flow', 0);

    /* ---- (b) state-dependent teacher reliability ---- */
    var B = se('g', { transform: 'translate(' + f1(S + GAP) + ',0)', class: 'panel' }, svg);
    var tB = base(B, 1, ['s', 't_1', null, 't_2', null], { highlight: true, boundary: true });
    D.text(I(B, -1, 1), f1(X(0.865)), f1(Y(0.615) + 4), 'ID region', 'lbl c-id', 'middle');
    F(B, tB[SRC], [2, 3]);
    var y1 = LEVELS[1], y2 = LEVELS[3];
    var rollB = function (y) { return tx(SRC, y) + ERR * (Y_TOP - y); };
    source(I(B, 2, 1));
    // The OOD step hides the short jump and redraws the long one from x_s in one line.
    var s1 = poly(curve(rollB, Y_TOP, y1, 12));
    var b1 = I(B, 2, 1, '', 0.2, [3]);
    D.path(b1, s1, 'student dr');
    F(B, s1, [2], 'f-student');
    var p1 = [rollB(y1), y1];
    var b1b = I(B, 2, 1, '', 0.8, [3]);
    var dx1 = tx(SRC, y1 - 0.10) - tx(SRC, y1);
    arrow(b1b, p1, [p1[0] + dx1, p1[1] - 0.10], 'good-v', 'good-head', { size: 7 });
    D.dot(b1b, f1(X(p1[0])), f1(Y(p1[1])), 5, 'pt-good');
    M(b1b, [p1[0] + 0.038, p1[1] + 0.025], 0, 0, '\\hat{x}_{t_1}\\ \\text{(ID)}', 'c-good', 'start');
    var s2 = poly(curve(rollB, Y_TOP, y2, 24));
    var b2 = I(B, 3, 1, '', 0.2);
    D.path(b2, s2, 'student dr');
    F(B, s2, [3], 'f-student');
    var p2 = [rollB(y2), y2];
    var b2b = I(B, 3, 1, '', 0.8);
    arrow(b2b, p2, [p2[0] + 0.075, p2[1] - 0.085], 'bad-v', 'bad-head', { size: 7 });
    D.dot(b2b, f1(X(p2[0])), f1(Y(p2[1])), 5.5, 'pt-bad');
    M(b2b, [p2[0] + 0.038, p2[1] + 0.024], 0, 0, '\\hat{x}_{t_2}\\ \\text{(OOD)}', 'c-bad', 'start');
    title(B, '(b) State-dependent teacher reliability', 1);

    /* ---- (c) π²-Flow ---- */
    var C = se('g', { transform: 'translate(' + f1(2 * (S + GAP)) + ',0)', class: 'panel' }, svg);
    base(C, 2, ['\\sigma_0', '\\sigma_{K/4}', '\\sigma_{K/2}', '\\sigma_{3K/4}', '\\sigma_K'], {});
    var pts = LEVELS.map(onTraj);
    var JD = 0.5, JGAP = 0.12;
    for (var k = 0; k < 4; k++) {
      var t0 = 0.15 + (JD + JGAP) * k;
      drawnArrow(C, 4, 2, pts[k], pts[k + 1], t0, JD, 'student', 'student-head', 'f-student', { shrink: 3 * PT, size: 7.5 });
      D.dot(I(C, 4, 2, '', t0 + JD), f1(X(pts[k + 1][0])), f1(Y(pts[k + 1][1])), 4, 'pt-student');
    }
    source(I(C, 4, 2));
    var c1 = I(C, 4, 2, '', 0.4);
    var yl = 0.5 * (LEVELS[0] + LEVELS[1]);
    D.text(c1, f1(X(pts[1][0] + 0.046)), f1(Y(yl) - 3), 'Stage 1', 'lbl c-student');
    D.text(c1, f1(X(pts[1][0] + 0.046)), f1(Y(yl) + 13), '(4 NFE)', 'lbl c-student');
    var RAD = 0.48;
    [[0, 2], [2, 4]].forEach(function (ab, i) {
      var g = I(C, 5, 2, '', 0.2 + 0.6 * i);
      var ar = arrow(g, pts[ab[0]], pts[ab[1]], 'stage2 dr', 'stage2-head', { shrink: 4 * PT, size: 7.5, rad: RAD });
      F(C, ar.d, [5], 'f-stage2');
    });
    var c2 = I(C, 5, 2, '', 0.5);
    var bul = [(pts[0][0] + pts[2][0]) / 2 - RAD * (pts[0][1] - pts[2][1]) / 2, (pts[0][1] + pts[2][1]) / 2];
    D.text(c2, f1(X(bul[0] - 0.022)), f1(Y(bul[1]) - 3), 'Stage 2', 'lbl c-stage2', 'end');
    D.text(c2, f1(X(bul[0] - 0.022)), f1(Y(bul[1]) + 13), '(2 NFE)', 'lbl c-stage2', 'end');
    title(C, '(c) \\(\\pi^2\\)-Flow (ours)', 2);

    return { items: items, flows: flows };
  }

  function init() {
    var fig = document.getElementById('fig-principle');
    if (!fig || !G) return;
    var svg = fig.querySelector('svg.fig-svg');
    var built = build(svg);
    var stage = fig.querySelector('.fig-scroll');
    window.PV.stepFigure(fig, LABELS, function (s) {
      D.show(svg, built.items, built.flows, s, function (i) { return STEP_PANEL[i]; });
      // Phones: the drawing scrolls sideways, so bring the panel of the step into view.
      if (s >= 0 && stage.scrollWidth > stage.clientWidth + 2) {
        var k = svg.getBoundingClientRect().width / 1040, P = STEP_PANEL[s];
        var left = (P * (S + GAP) + S / 2) * k - stage.clientWidth / 2;
        stage.scrollTo({ left: Math.max(0, left), behavior: window.PV.reduce.matches ? 'auto' : 'smooth' });
      }
    });
  }

  window.PV.initPrinciple = init;
})();
