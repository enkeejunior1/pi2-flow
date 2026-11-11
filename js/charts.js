/* π²-Flow page: the two charts, drawn in the browser. Exposes PV.initCharts. Needs js/core.js, js/draw.js.
 * #chart-vbench  VBench Total on Wan2.1-1.3B, grouped by NFE, stepped through like the drawn figures (js/stepfig.js).
 * Results table   rank shading per block.
 * #chart-loss    Stage 2 training loss, fresh pairs vs. a fixed set of 64 pairs (window.PI2_DATA). Lines draw on when on screen. */
(function () {
  'use strict';

  var se = window.PV.se, D = window.PV.draw, reduce = window.PV.reduce;

  function onScreen(el, cb) {
    if (!('IntersectionObserver' in window) || reduce.matches) { cb(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].intersectionRatio >= 0.45) { cb(); io.disconnect(); } }, { threshold: [0, 0.45] });
    io.observe(el);
  }

  /* VBench Total, PixVid-style step-through as on the previous page: the flow-map baselines, then π²-Flow with its gain over
   * the best of them, then the DMD-based baselines for reference. Flow-map methods are clustered; DMD sits apart. */
  var VB_LABELS = [
    'Flow-map distillation baselines: PDD<sup>\u2020</sup> (\\(\\pi\\)-Flow based, our reproduction) and SMD<sup>*</sup>',
    '\\(\\pi^2\\)-Flow, also a flow map: +0.70 over the best flow-map baseline at 4 NFE, +1.02 at 2 NFE',
    'DMD-based baselines, for reference: rCM<sup>*</sup> and AnyFlow<sup>*</sup>'
  ];
  function vbench() {
    var fig = document.getElementById('chart-vbench');
    var svg = fig && fig.querySelector('svg');
    if (!svg) return;
    var W = 640, L = 56, R = 12, T = 34, B = 252;
    var series = [
      { name: 'PDD\u2020', cls: 'b-base', step: 0, fam: 0 },
      { name: 'SMD*', cls: 'b-base2', step: 0, fam: 0 },
      { name: '\\(\\pi^2\\)-Flow', cls: 'b-ours', step: 1, fam: 0 },
      { name: 'rCM*', cls: 'b-dmd', step: 2, fam: 1 },
      { name: 'AnyFlow*', cls: 'b-dmd2', step: 2, fam: 1 }
    ];
    var groups = [{ name: '4 NFE', v: [84.08, 84.52, 85.22, 84.13, 84.89] }, { name: '2 NFE', v: [83.54, null, 84.56, 84.10, 83.98] }];
    var y0 = 82, y1 = 86;
    var Y = function (v) { return B - (v - y0) / (y1 - y0) * (B - T); };
    for (var t = y0; t <= y1; t++) {
      D.path(svg, 'M' + L + ' ' + Y(t) + 'H' + (W - R), t === y0 ? 'c-axis' : 'c-grid');
      D.text(svg, L - 8, Y(t) + 4, String(t), 'mono', 'end');
    }
    var yl = D.text(svg, 0, 0, 'VBench Total \u2191', 'mono', 'middle');
    yl.setAttribute('transform', 'translate(14 ' + ((T + B) / 2) + ') rotate(-90)');
    var gw = (W - L - R) / groups.length, bw = 36, gap = 6, fgap = 22;
    var bars = [], extras = [];
    groups.forEach(function (g, gi) {
      // Series without a value at this NFE take no slot, so the remaining bars of the group close up.
      var shown = series.map(function (s, i) { return i; }).filter(function (i) { return g.v[i] != null; });
      var span = shown.length * bw + (shown.length - 2) * gap + fgap;
      var cx = L + gw * (gi + 0.5), xs = [], x = cx - span / 2;
      shown.forEach(function (i, j) {
        if (j) x += series[i].fam !== series[shown[j - 1]].fam ? fgap : gap;
        xs[i] = x; x += bw;
      });
      D.text(svg, cx, B + 44, g.name, 'lbl', 'middle');
      [[0, 'flow map'], [1, 'DMD']].forEach(function (c) {
        var mem = shown.filter(function (i) { return series[i].fam === c[0]; });
        var a = xs[mem[0]], b = xs[mem[mem.length - 1]] + bw;
        D.path(svg, 'M' + a + ' ' + (B + 10) + 'V' + (B + 14) + 'H' + b + 'V' + (B + 10), 'c-bracket');
        D.text(svg, (a + b) / 2, B + 27, c[1], 'mono', 'middle');
      });
      g.v.forEach(function (v, si) {
        var x = xs[si], sr = series[si];
        if (v == null) return;
        var r = se('rect', { x: x, y: B, width: bw, height: 0, class: 'bar ' + sr.cls }, svg);
        var lab = D.text(svg, x + bw / 2, Y(v) - 7, v.toFixed(2), 'mono val ' + sr.cls, 'middle');
        bars.push({ r: r, lab: lab, top: Y(v), si: si });
      });
      // Gain of π²-Flow over the best flow-map baseline: a dashed line at that level across its bar, and the delta above.
      var base = Math.max.apply(null, g.v.slice(0, 2).filter(function (v) { return v != null; }));
      var e = se('g', { class: 'gain' }, svg);
      D.path(e, 'M' + (xs[2] - 3) + ' ' + Y(base) + 'H' + (xs[2] + bw + 3), 'c-gainline');
      D.text(e, xs[2] + bw / 2, Y(g.v[2]) - 22, '+' + (g.v[2] - base).toFixed(2), 'mono gain-v', 'middle');
      extras.push(e);
    });
    var legend = fig.querySelector('.legend');
    series.forEach(function (s) {
      var sp = document.createElement('span');
      sp.innerHTML = '<i class="sw ' + s.cls + '"></i><span class="nm">' + s.name + '</span>';
      legend.append(sp);
    });
    window.PV.typeset(legend);

    var seen = false;
    function render(s) {
      bars.forEach(function (b) {
        var st = series[b.si].step, on = seen && (s < 0 || st <= s), fresh = s >= 0 && st === s;
        var delay = reduce.matches ? 0 : (s < 0 ? series[b.si].step * 0.35 : 0);
        if (b.r) {
          b.r.style.transitionDelay = delay + 's';
          b.r.style.y = (on ? b.top : B) + 'px';
          b.r.style.height = (on ? B - b.top : 0) + 'px';
          b.r.classList.toggle('dim', s >= 0 && !fresh && st < s);
        }
        b.lab.style.transitionDelay = (delay + 0.5) + 's';
        b.lab.classList.toggle('on', on);
      });
      extras.forEach(function (e) { e.classList.toggle('on', seen && (s < 0 || s >= 1)); });
    }
    var cur = -1;
    window.PV.stepFigure(fig, VB_LABELS, function (s) { cur = s; render(s); });
    onScreen(svg, function () { seen = true; render(cur); });
  }

  /* Rank shading of the results table, as on the previous page: within each block of rows (one model and NFE), every
   * metric column is ranked among the distilled models; darker means a higher rank. The teacher is not ranked. */
  function rankTable() {
    var tb = document.querySelector('#results table tbody');
    if (!tb) return;
    var blocks = [], cur = null;
    Array.prototype.forEach.call(tb.rows, function (tr) {
      if (tr.classList.contains('teacher')) return;
      if (tr.classList.contains('block-start') || !cur) { cur = []; blocks.push(cur); }
      cur.push(tr);
    });
    blocks.forEach(function (rows) {
      var n = rows[0].cells.length;
      for (var c = 4; c < n; c++) {
        var vals = rows.map(function (r) { return parseFloat(r.cells[c].textContent); });
        var order = vals.slice().sort(function (a, b) { return b - a; });
        rows.forEach(function (r, i) { r.cells[c].classList.add('r' + (order.indexOf(vals[i]) + 1)); });
      }
    });
  }

  function loss() {
    var svg = document.querySelector('#chart-loss svg');
    var data = (window.PI2_DATA || {}).loss;
    if (!svg || !data) return;
    var W = 640, H = 280, L = 52, R = 16, T = 14, B = 236;
    var x0 = 0, x1 = 240, y0 = 16, y1 = 32;
    var X = function (v) { return L + (v - x0) / (x1 - x0) * (W - L - R); };
    var Y = function (v) { return B - (v - y0) / (y1 - y0) * (B - T); };
    for (var t = y0; t <= y1; t += 4) {
      D.path(svg, 'M' + L + ' ' + Y(t) + 'H' + (W - R), t === y0 ? 'c-axis' : 'c-grid');
      D.text(svg, L - 8, Y(t) + 4, String(t), 'mono', 'end');
    }
    [0, 60, 120, 180, 240].forEach(function (v) { D.text(svg, X(v), B + 18, String(v), 'mono', 'middle'); });
    D.text(svg, (L + W - R) / 2, B + 38, 'Stage 2 training iteration', 'mono', 'middle');
    var yl = D.text(svg, 0, 0, 'training loss ↓', 'mono', 'middle');
    yl.setAttribute('transform', 'translate(14 ' + ((T + B) / 2) + ') rotate(-90)');
    var lines = data.map(function (s) {
      var d = s.x.map(function (v, i) { return (i ? 'L' : 'M') + X(v).toFixed(1) + ' ' + Y(s.y[i]).toFixed(1); }).join('');
      var p = D.path(svg, d, 'line ' + (s.style === 'fixed' ? 'l-fixed' : 'l-fresh'), { pathLength: 100 });
      var lx = X(s.x[s.x.length - 1]), ly = Y(s.y[s.y.length - 1]);
      var lab = D.text(svg, lx - 4, s.style === 'fixed' ? ly + 18 : Y(31), s.style === 'fixed' ? 'fixed set of 64 pairs' : 'fresh pairs at every update',
                       'mono lab ' + (s.style === 'fixed' ? 'c-student' : ''), 'end');
      return { p: p, lab: lab };
    });
    onScreen(svg, function () { lines.forEach(function (l, i) {
      l.p.style.transitionDelay = (reduce.matches ? 0 : i * 0.3) + 's';
      l.p.classList.add('on'); l.lab.classList.add('on');
    }); });
  }

  window.PV.initCharts = function () { vbench(); loss(); rankTable(); };
})();
