/* π²-Flow page: SVG drawing helpers for the figures. Exposes PV.draw. Needs js/core.js.
 * Every shape on the figures is drawn here, in the browser; colors come from css/draw.css classes, not from this file.
 *
 * Items: a figure is a list of items (an SVG <g class="it">), each with
 *   from    the first step it is shown in (-1: always),
 *   panel   the panel it belongs to (other panels are veiled while a step is shown),
 *   delay   seconds after the step starts before it draws on,
 *   hide    steps (at or after from) in which it is hidden again.
 * Paths with class "dr" draw on (pathLength 100); everything else fades in. Flow paths carry moving dots while their step is shown. */
(function () {
  'use strict';

  var se = window.PV.se;

  function item(parent, opts) {
    var g = se('g', { class: 'it' + (opts.cls ? ' ' + opts.cls : '') }, parent);
    g._from = opts.from == null ? -1 : opts.from;
    g._panel = opts.panel == null ? -1 : opts.panel;
    g._hide = opts.hide || [];
    if (opts.delay) g.style.setProperty('--d', opts.delay + 's');
    return g;
  }

  function path(parent, d, cls, extra) {
    var a = { d: d, class: cls || '' };
    if (/\bdr\b/.test(cls || '')) a.pathLength = 100;
    Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; });
    return se('path', a, parent);
  }

  // Polyline through points [[x, y], ...] as a smooth Catmull-Rom curve.
  function smooth(pts) {
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  // Samples f(y) -> x from y0 to y1 (a vertical trajectory) or f(x) -> y (horizontal, when horiz is true).
  function sample(f, a, b, n, horiz) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = a + (b - a) * i / n;
      pts.push(horiz ? [t, f(t)] : [f(t), t]);
    }
    return pts;
  }

  // Filled arrowhead at (x, y) pointing along (dx, dy).
  function head(parent, x, y, dx, dy, cls, size) {
    var L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, s = size || 7;
    var bx = x - ux * s, by = y - uy * s, w = s * 0.5;
    return se('path', { class: cls || '', d: 'M' + x.toFixed(1) + ' ' + y.toFixed(1) +
      'L' + (bx - uy * w).toFixed(1) + ' ' + (by + ux * w).toFixed(1) +
      'L' + (bx + uy * w).toFixed(1) + ' ' + (by - ux * w).toFixed(1) + 'Z' }, parent);
  }

  // Straight arrow; the line stops at the base of the head.
  function arrow(parent, x1, y1, x2, y2, lineCls, headCls, size) {
    var L = Math.hypot(x2 - x1, y2 - y1), s = size || 7;
    var ex = x2 - (x2 - x1) / L * s * 0.8, ey = y2 - (y2 - y1) / L * s * 0.8;
    path(parent, 'M' + (+x1).toFixed(1) + ' ' + (+y1).toFixed(1) + 'L' + ex.toFixed(1) + ' ' + ey.toFixed(1), lineCls);
    head(parent, x2, y2, x2 - x1, y2 - y1, headCls, s);
  }

  function dot(parent, x, y, r, cls) { return se('circle', { cx: x, cy: y, r: r, class: cls || '' }, parent); }

  /* Math label. parts: [[text, style, attrs], ...]; style is one of
   *   i (italic), r (roman), sub (italic subscript), subr (roman subscript), sup (roman superscript),
   *   supi (italic superscript), hat (italic letter with a hat). attrs (optional) go on the tspan, e.g. { dx: -6 }.
   * Hats are drawn as small carets over the letter once its position is known (and again when the fonts arrive). */
  var hats = [];
  function math(parent, x, y, parts, cls, anchor) {
    var t = se('text', { x: x, y: y, class: 'math ' + (cls || ''), 'text-anchor': anchor || 'start' }, parent);
    var idx = 0, mine = [];
    parts.forEach(function (p) {
      var txt = p[0], st = p[1] || 'i';
      var a = {};
      if (st === 'r' || st === 'subr' || st === 'sup') a.class = 'rm';
      if (st === 'sub' || st === 'subr') { a['baseline-shift'] = '-28%'; a['font-size'] = '72%'; }
      if (st === 'sup' || st === 'supi') { a['baseline-shift'] = '38%'; a['font-size'] = '68%'; }
      Object.keys(p[2] || {}).forEach(function (k) { a[k] = p[2][k]; });
      var ts = se('tspan', a, t);
      ts.textContent = txt;
      if (st === 'hat') mine.push(idx);
      idx += txt.length;
    });
    if (mine.length) {
      var g = se('g', { class: 'hat ' + (cls || '') }, parent);
      var rec = { text: t, idx: mine, g: g };
      hats.push(rec);
      placeHat(rec);
    }
    return t;
  }
  function placeHat(rec) {
    while (rec.g.firstChild) rec.g.firstChild.remove();
    rec.idx.forEach(function (i) {
      try {
        var p = rec.text.getStartPositionOfChar(i), e = rec.text.getEndPositionOfChar(i);
        var fs = parseFloat(getComputedStyle(rec.text).fontSize) || 15;
        var cx = (p.x + e.x) / 2 + fs * 0.06, top = p.y - fs * 0.62, w = fs * 0.2, hgt = fs * 0.16;
        se('path', { d: 'M' + (cx - w) + ' ' + top + 'L' + cx + ' ' + (top - hgt) + 'L' + (cx + w) + ' ' + top }, rec.g);
      } catch (err) { /* not rendered yet */ }
    });
  }
  function refreshHats() { hats.forEach(placeHat); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshHats);
  window.addEventListener('load', refreshHats);

  /* LaTeX label, typeset by MathJax (vendor/mathjax) into SVG paths. (x, y) is the baseline point, anchor as for text;
   * size is the font size in px. Returns a <g> positioned by its transform, so moveTex(g, x, y) moves it. */
  function tex(parent, x, y, src, cls, anchor, size) {
    var g = se('g', { class: 'tex ' + (cls || '') }, parent);
    var fs = size || 16;
    if (!window.MathJax || !window.MathJax.tex2svg) {
      text(g, 0, 0, src.replace(/\\[a-zA-Z]+|[{}^_]/g, ''), 'math', anchor);
    } else {
      var s = window.MathJax.tex2svg(src, { display: false }).querySelector('svg');
      var vb = s.getAttribute('viewBox').split(/[\s,]+/).map(Number);
      var w = vb[2] / 1000 * fs, hgt = vb[3] / 1000 * fs;
      var dx = anchor === 'middle' ? -w / 2 : anchor === 'end' ? -w : 0;
      ['style', 'role', 'focusable', 'aria-hidden'].forEach(function (a) { s.removeAttribute(a); });
      s.setAttribute('x', dx.toFixed(1)); s.setAttribute('y', (vb[1] / 1000 * fs).toFixed(1));
      s.setAttribute('width', w.toFixed(1)); s.setAttribute('height', hgt.toFixed(1));
      s.setAttribute('overflow', 'visible');
      g.appendChild(s);
    }
    moveTex(g, x, y);
    return g;
  }
  function moveTex(g, x, y) { g.setAttribute('transform', 'translate(' + (+x).toFixed(1) + ' ' + (+y).toFixed(1) + ')'); }

  function text(parent, x, y, s, cls, anchor) {
    var t = se('text', { x: x, y: y, class: cls || 'lbl', 'text-anchor': anchor || 'start' }, parent);
    t.textContent = s;
    return t;
  }

  /* Shows step s of a figure built from items. s = -1 is Overview: everything, no veil, no motion. */
  function show(svg, items, flows, s, panelOf) {
    var P = s < 0 ? -1 : panelOf(s);
    svg.classList.toggle('overview', s < 0);
    items.forEach(function (it) {
      var on = s < 0 || (it._from <= s && it._hide.indexOf(s) < 0);
      it.classList.toggle('on', on);
      it.classList.toggle('new', s >= 0 && it._from === s);
      it.classList.toggle('dim', s >= 0 && it._panel >= 0 && it._panel !== P);
    });
    flows.forEach(function (f) { f.classList.toggle('on', s >= 0 && f._steps.indexOf(s) >= 0); });
  }

  // Moving dots along d while one of steps is shown.
  function flow(parent, d, steps, cls) {
    var g = se('g', { class: 'flow ' + (cls || '') }, parent);
    se('path', { class: 'dots halo', d: d }, g);
    se('path', { class: 'dots', d: d }, g);
    g._steps = steps;
    return g;
  }

  window.PV.draw = {
    item: item, path: path, smooth: smooth, sample: sample, head: head, arrow: arrow, dot: dot,
    math: math, tex: tex, moveTex: moveTex, text: text, show: show, flow: flow, refreshHats: refreshHats
  };
})();
