/* π²-Flow page: step-through controls shared by the drawn figures. Exposes PV.stepFigure. Needs js/core.js.
 * The controls are PixVid's: Previous / Next, an Overview chip and one numbered chip per step, Left / Right keys,
 * click on the drawing to advance. Index -1 is Overview; after the last step comes Overview again.
 * The figure script draws every shape itself and passes render(step, from), called on every change. */
(function () {
  'use strict';

  var h = window.PV.h;
  var NONE = -2;

  function stepFigure(fig, labels, render) {
    var stage = fig.querySelector('.fig-scroll');
    var chipBox = fig.querySelector('.chips');
    var count = labels.length, last = count - 1;
    var plain = function (t) { var d = document.createElement('div'); d.innerHTML = t; return d.textContent.replace(/\\pi\b/g, 'π').replace(/\\\(|\\\)|\\(?=[a-zA-Z])/g, ''); };

    var chips = [''].concat(labels).map(function (text, i) {
      var c = h('button', { type: 'button', class: 'chip' + (i === 0 ? ' chip-ov' : ''), 'aria-pressed': 'false',
                            'aria-label': i === 0 ? 'Overview, the whole figure' : 'Step ' + i + ': ' + plain(text) }, i === 0 ? '' : String(i));
      if (i === 0) {
        c.innerHTML = '<svg class="ov-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
          '<rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1"/>' +
          '<rect x="1.5" y="9" width="5.5" height="5.5" rx="1"/><rect x="9" y="9" width="5.5" height="5.5" rx="1"/></svg>' +
          '<span class="ov-text">Overview</span>';
      }
      chipBox.append(c);
      return c;
    });
    var stepLabel = h('p', { class: 'steplabel', 'aria-hidden': 'true' });
    fig.querySelector('.figctl').after(stepLabel);
    var live = h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    fig.append(live);

    var cur = -1, hover = NONE, blocked = NONE, drawn = NONE;
    function shown() { return hover !== NONE ? hover : cur; }

    function update() {
      var s = shown();
      if (s !== drawn) { render(s, drawn); drawn = s; }
      chips.forEach(function (c, i) {
        var on = i - 1 === cur;
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      stepLabel.innerHTML = s < 0 ? 'Overview: the whole figure'
        : '<span class="sl-n">' + (s + 1) + ' / ' + count + '</span>' + labels[s];
      if (s >= 0 && window.MathJax && window.MathJax.typeset) window.MathJax.typeset([stepLabel]);
      fig.dataset.cur = String(cur);
    }
    function go(n) {
      hover = NONE;
      cur = n < -1 ? last : (n > last ? -1 : n);
      update();
      live.textContent = cur < 0 ? 'Overview' : 'Step ' + (cur + 1) + ' of ' + count + ': ' + plain(labels[cur]);
    }

    fig.querySelector('.navbtn.prev').addEventListener('click', function () { go(cur - 1); });
    fig.querySelector('.navbtn.next').addEventListener('click', function () { go(cur + 1); });
    stage.addEventListener('click', function () { go(cur + 1); });
    fig.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target.closest && e.target.closest('input')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    });
    chips.forEach(function (c, i) {
      c.addEventListener('click', function () { blocked = i; go(i - 1); });
      c.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || blocked === i) return;
        hover = i - 1; update();
      });
      c.addEventListener('pointerleave', function () {
        if (blocked === i) blocked = NONE;
        if (hover === NONE) return;
        hover = NONE; update();
      });
    });

    var hint = fig.querySelector('.scroll-hint');
    function checkHint() { if (hint) hint.hidden = !(stage.scrollWidth > stage.clientWidth + 2); }
    if (hint) {
      checkHint();
      if ('ResizeObserver' in window) new ResizeObserver(checkHint).observe(stage);
      else window.addEventListener('resize', checkHint);
    }

    update();
    return { set: go, get step() { return cur; } };
  }

  window.PV.stepFigure = stepFigure;
})();
