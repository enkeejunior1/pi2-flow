/* π²-Flow page: step-through controls shared by the drawn figures. Exposes PV.stepFigure. Needs js/core.js.
 * The controls are PixVid's: Previous / Next, an Overview chip and one numbered chip per step, Left / Right keys,
 * click on the drawing to advance. Index -1 is Overview; after the last step comes Overview again.
 * The figure script draws every shape itself and passes render(step, from), called on every change. */
(function () {
  'use strict';

  var h = window.PV.h, reduce = window.PV.reduce;
  var NONE = -2;

  function stepFigure(fig, labels, render, opts) {
    opts = opts || {};
    var ovMs = opts.ovMs || 2500, stepMs = opts.stepMs || 5500;
    var stage = fig.querySelector('.fig-scroll');
    var ctl = fig.querySelector('.figctl');
    var chipBox = fig.querySelector('.chips');
    var count = labels.length, last = count - 1;
    var plain = function (t) { var d = document.createElement('div'); d.innerHTML = t; return d.textContent.replace(/\\pi\b/g, 'π').replace(/\\\(|\\\)|\\(?=[a-zA-Z])/g, ''); };

    var playBtn = h('button', { type: 'button', class: 'fig-play', 'aria-label': 'Play steps', 'aria-pressed': 'false', title: 'Play / pause' });
    playBtn.innerHTML = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">' +
      '<path class="i-play" d="M5.2 3.2v9.6L13 8z"/><path class="i-pause" d="M4.2 3.2h2.6v9.6H4.2zM9.2 3.2h2.6v9.6H9.2z"/></svg>';
    ctl.insertBefore(playBtn, ctl.firstChild);

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
    ctl.after(stepLabel);
    var live = h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    fig.append(live);

    var cur = -1, hover = NONE, blocked = NONE, drawn = NONE;
    var playing = false, autoPlayedOnce = false, userActed = false, inView = false;
    var raf = 0, tStart = 0;

    function shown() { return hover !== NONE ? hover : cur; }
    function curDur() { return cur < 0 ? ovMs : stepMs; }
    function clearProg() { chips.forEach(function (c) { c.style.removeProperty('--prog'); }); }

    function syncPlayBtn() {
      playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      playBtn.setAttribute('aria-label', playing ? 'Pause steps' : 'Play steps');
      fig.classList.toggle('playing', playing);
      if (!playing) clearProg();
    }

    function update() {
      var s = shown();
      if (s !== drawn) { render(s, drawn); drawn = s; }
      chips.forEach(function (c, i) {
        var on = i - 1 === cur;
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (!on) c.style.removeProperty('--prog');
      });
      stepLabel.innerHTML = s < 0 ? 'Overview: the whole figure'
        : '<span class="sl-n">' + (s + 1) + ' / ' + count + '</span>' + labels[s];
      if (s >= 0 && window.MathJax && window.MathJax.typeset) window.MathJax.typeset([stepLabel]);
      fig.dataset.cur = String(cur);
    }

    function go(n) {
      hover = NONE;
      cur = n < -1 ? last : (n > last ? -1 : n);
      tStart = performance.now();
      clearProg();
      update();
      live.textContent = cur < 0 ? 'Overview' : 'Step ' + (cur + 1) + ' of ' + count + ': ' + plain(labels[cur]);
    }

    function stopPlay() {
      if (!playing) return;
      playing = false;
      cancelAnimationFrame(raf);
      raf = 0;
      syncPlayBtn();
    }

    function tick(now) {
      if (!playing) return;
      if (!tStart) tStart = now;
      var dur = curDur(), p = Math.min(1, (now - tStart) / dur);
      var activeChip = chips[cur + 1];
      if (activeChip) activeChip.style.setProperty('--prog', p.toFixed(3));
      if (p >= 1) {
        if (cur >= last) {
          autoPlayedOnce = true;
          stopPlay();
          go(-1);
          return;
        }
        go(cur + 1);
      }
      raf = requestAnimationFrame(tick);
    }

    function startPlay(fromFirstStep) {
      if (playing) return;
      if (fromFirstStep && cur < 0) go(0);
      else tStart = performance.now();
      playing = true;
      syncPlayBtn();
      raf = requestAnimationFrame(tick);
    }

    function syncAuto() {
      if (inView && !document.hidden && !autoPlayedOnce && !userActed && !reduce.matches) startPlay(false);
      else if (!inView || document.hidden) stopPlay();
    }

    playBtn.addEventListener('click', function () {
      if (playing) { userActed = true; stopPlay(); }
      else { userActed = true; startPlay(true); }
    });
    fig.querySelector('.navbtn.prev').addEventListener('click', function () { userActed = true; stopPlay(); go(cur - 1); });
    fig.querySelector('.navbtn.next').addEventListener('click', function () { userActed = true; stopPlay(); go(cur + 1); });
    stage.addEventListener('click', function () { userActed = true; stopPlay(); go(cur + 1); });
    fig.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target.closest && e.target.closest('input')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); userActed = true; stopPlay(); go(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); userActed = true; stopPlay(); go(cur - 1); }
    });
    chips.forEach(function (c, i) {
      c.addEventListener('click', function () { userActed = true; stopPlay(); blocked = i; go(i - 1); });
      c.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || blocked === i || playing) return;
        hover = i - 1; update();
      });
      c.addEventListener('pointerleave', function () {
        if (blocked === i) blocked = NONE;
        if (hover === NONE) return;
        hover = NONE; update();
      });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        inView = es[0].intersectionRatio >= 0.35;
        syncAuto();
      }, { threshold: [0, 0.35, 1] }).observe(stage);
    }
    document.addEventListener('visibilitychange', syncAuto);

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
