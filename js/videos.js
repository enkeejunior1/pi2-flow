/* π²-Flow page: video comparisons. Reads window.PI2_MEDIA (media/manifest.js). Exposes PV.renderVideos.
 * Each scene is one synchronized group: one play bar, one scrub line, every clip follows the first live clip.
 * Clips load lazily (within 200 px of the viewport); a hidden scene never loads. */
(function () {
  'use strict';

  var h = window.PV.h, se = window.PV.se, reduce = window.PV.reduce;
  var MEDIA = window.PI2_MEDIA || {};

  function fmt(t) {
    if (!isFinite(t)) return '0:00';
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function caption(c) {
    var p = h('p', { class: 'tile-cap' });
    p.append(h('b', {}, c.name));
    if (c.name.indexOf('\\(') >= 0) window.PV.typeset(p);
    if (c.k) p.append(h('span', { class: 'k' }, c.k));
    return p;
  }

  /* One synchronized group. tiles: [{ cap: {name, k}, cls, srcs: [..] }]; a tile with several srcs is a 2 x 2 seed block.
   * Returns the group element; el._pv has setSrc(tileIndex, srcIndex, src), prefetch() and ready(cb). */
  function makeGroup(tiles, prompt) {
    var root = h('div', { class: 'group' });
    var players = h('div', { class: 'players', style: '--n:' + tiles.length });
    var vids = [];
    var refs = [];   // refs[tile][src] = video
    var readyCbs = [], isReady = false;

    tiles.forEach(function (t, ti) {
      var block = t.srcs.length > 1;
      var tile = h('div', { class: (block ? 'block ' : 'tile ') + (t.cls || '') });
      tile.append(caption(t.cap));
      var wrap = block ? h('div', { class: 'seeds' }) : tile;
      refs[ti] = [];
      t.srcs.forEach(function (src) {
        var box = h('div', { class: 'player' + (!block && /\bours\b/.test(t.cls || '') ? ' ours' : '') });
        var v = document.createElement('video');
        v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('loop', '');
        v.preload = 'none';
        v.dataset.src = src;
        v.addEventListener('error', function () { fail(v, box); });
        v.addEventListener('canplay', function () { join(v); });
        v.addEventListener('canplaythrough', checkReady);
        v.addEventListener('suspend', checkReady);
        box.append(v);
        wrap.append(box);
        vids.push(v);
        refs[ti].push(v);
      });
      if (block) tile.append(wrap);
      players.append(tile);
    });
    root.append(players);
    if (prompt) root.append(h('p', { class: 'prompt' }, prompt));

    var btn = h('button', { type: 'button', class: 'pp', 'aria-label': 'Play', 'aria-pressed': 'false' });
    var icon = se('svg', { viewBox: '0 0 16 16', width: '14', height: '14', 'aria-hidden': 'true', focusable: 'false' }, btn);
    se('path', { class: 'i-play', d: 'M5.5 3.2v9.6L13 8z' }, icon);
    se('path', { class: 'i-pause', d: 'M4.5 3.2h2.6v9.6H4.5zM8.9 3.2h2.6v9.6H8.9z' }, icon);
    var range = h('input', { type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'Scrub' });
    var time = h('span', { class: 'time' }, '0:00 / 0:00');
    var controls = h('div', { class: 'controls' }, btn, range, time);
    root.append(controls);

    var userPaused = false, inView = false, loaded = false, scrubbing = false, raf = 0;
    function live() { return vids.filter(function (v) { return !v._failed; }); }
    function master() { return live()[0]; }
    function shouldPlay() { return inView && !userPaused && !reduce.matches && !root.hidden; }

    function fail(v, box) {
      v._failed = true;
      v.remove();
      box.append(h('div', { class: 'failed-msg' }, 'Could not load this video'));
      checkReady();
    }
    function buffered(v) {
      var b = v.buffered;
      return v.readyState >= 3 && isFinite(v.duration) && b.length > 0 && b.end(b.length - 1) >= v.duration - 0.05;
    }
    function checkReady() {
      if (isReady || !loaded || !live().every(buffered)) return;
      isReady = true;
      readyCbs.splice(0).forEach(function (cb) { cb(); });
    }
    function load() {
      if (loaded) return;
      loaded = true;
      live().forEach(function (v) { v.preload = 'auto'; v.src = v.dataset.src; v.load(); });
    }
    function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    function playAll() { live().forEach(play); }
    function pauseAll() { live().forEach(function (v) { v.pause(); }); }
    // A clip that becomes playable joins the group: all start together, a late clip (a swapped source) jumps to the master's time.
    function join(v) {
      checkReady();
      if (!shouldPlay()) return;
      var l = live(), m = l[0];
      if (!l.every(function (x) { return x.readyState >= 3; })) {
        if (m && !m.paused && v !== m) { v.currentTime = m.currentTime; play(v); }
        return;
      }
      if (m.paused) { l.forEach(function (x) { x.currentTime = m.currentTime; }); playAll(); }
      else if (v.paused) { v.currentTime = m.currentTime; play(v); }
    }
    function setRange(x) { range.value = String(x); range.style.setProperty('--p', (x / 10) + '%'); }
    function tick() {
      var m = master();
      if (m) {
        if (!m.paused) {
          live().forEach(function (v) { if (v !== m && !v.seeking && v.readyState >= 2 && Math.abs(v.currentTime - m.currentTime) > 0.12) v.currentTime = m.currentTime; });
        }
        if (!scrubbing && m.duration) setRange(Math.round(m.currentTime / m.duration * 1000));
        time.textContent = fmt(m.currentTime) + ' / ' + fmt(m.duration);
        var playing = !m.paused;
        if (btn.getAttribute('aria-pressed') !== String(playing)) {
          btn.setAttribute('aria-pressed', String(playing));
          btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        }
      }
      raf = requestAnimationFrame(tick);
    }
    btn.addEventListener('click', function () {
      var m = master();
      if (!m) return;
      if (m.paused) { userPaused = false; load(); live().forEach(function (v) { v.currentTime = m.currentTime; }); playAll(); }
      else { userPaused = true; pauseAll(); }
    });
    range.addEventListener('pointerdown', function () { scrubbing = true; });
    window.addEventListener('pointerup', function () { scrubbing = false; });
    range.addEventListener('input', function () {
      var m = master();
      if (!m || !m.duration) return;
      setRange(Number(range.value));
      var t = Number(range.value) / 1000 * m.duration;
      live().forEach(function (v) { v.currentTime = t; });
    });

    function observe(visible) {
      inView = visible;
      if (visible) { load(); if (!raf) tick(); live().forEach(join); }
      else { pauseAll(); cancelAnimationFrame(raf); raf = 0; }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { observe(es[0].isIntersecting); }, { rootMargin: '200px' }).observe(root);
    } else { observe(true); }

    root._pv = {
      prefetch: load,
      ready: function (cb) { if (isReady) cb(); else readyCbs.push(cb); },
      setSrc: function (ti, si, src) {
        var v = refs[ti] && refs[ti][si];
        if (!v || v.dataset.src === src) return;
        v.dataset.src = src;
        if (v._failed) return;
        if (loaded) { v.pause(); v.src = src; v.load(); }
      }
    };
    return root;
  }

  /* Scene selector: a strip of thumbnail buttons above the groups; only the chosen group is shown.
   * Once the card is near the viewport, hovering or focusing a button prefetches its scene, and the scene after the shown one loads ahead. */
  function sceneSelector(groups, titles, thumbs, card) {
    var row = h('div', { class: 'scene-select', role: 'group', 'aria-label': 'Prompt' });
    var current = 0, armed = false;
    function warm(i) { var g = groups[i]; if (armed && g) g._pv.prefetch(); }
    function ahead(i) { groups[i]._pv.ready(function () { if (i === current) warm(i + 1); }); }
    var buttons = groups.map(function (g, i) {
      var b = h('button', { type: 'button', 'aria-pressed': i === 0 ? 'true' : 'false' });
      var img = h('img', { src: thumbs[i], alt: '', width: '240', height: '138', draggable: 'false', decoding: 'async' });
      img.addEventListener('error', function () { b.classList.add('no-thumb'); });
      b.append(h('span', { class: 'scene-thumb' }, img), h('span', { class: 'scene-title' }, titles[i]));
      b.addEventListener('pointerenter', function () { warm(i); });
      b.addEventListener('focus', function () { warm(i); });
      b.addEventListener('keydown', function (e) {
        var n = buttons.length;
        var to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i + n - 1) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
        if (to < 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault(); buttons[to].focus();
      });
      b.addEventListener('click', function () {
        current = i;
        groups.forEach(function (o, j) { o.hidden = j !== i; buttons[j].setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
        if (armed) ahead(i);
      });
      row.append(b);
      return b;
    });
    groups.forEach(function (g, i) { g.hidden = i !== 0; });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { armed = true; ahead(0); io.disconnect(); }
      }, { rootMargin: '200px' });
      io.observe(card);
    }
    return row;
  }

  /* Quality card: ours at 4 and 2 NFE, then the baselines at the NFE chosen in the switch. */
  function renderQuality() {
    var card = document.getElementById('cmp');
    var list = MEDIA.quality || [];
    if (!card || !list.length) return;
    var slot = card.querySelector('.slot');
    var bases = MEDIA.baselines || [];
    var nfe = '2';
    var groups = list.map(function (e) {
      var tiles = [
        { cap: { name: '\\(\\pi^2\\)-Flow', k: '4 NFE' }, cls: 'ours', srcs: [e.ours[4]] },
        { cap: { name: '\\(\\pi^2\\)-Flow', k: '2 NFE' }, cls: 'ours', srcs: [e.ours[2]] }
      ];
      var present = bases.filter(function (b) { return e[b.key] && e[b.key][nfe]; });
      present.forEach(function (b) { tiles.push({ cap: { name: b.name, k: b.kind + ' · ' + nfe + ' NFE' }, key: b.key, srcs: [e[b.key][nfe]] }); });
      var g = makeGroup(tiles, e.prompt);
      g._tiles = tiles;
      g._entry = e;
      return g;
    });
    slot.append(sceneSelector(groups, list.map(function (e) { return e.title; }), list.map(function (e) { return e.thumb; }), card));
    groups.forEach(function (g) { slot.append(g); });

    card.querySelectorAll('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        nfe = b.dataset.nfe;
        card.querySelectorAll('.seg button').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        groups.forEach(function (g) {
          g._tiles.forEach(function (t, ti) {
            if (!t.key) return;
            var b2 = bases.filter(function (x) { return x.key === t.key; })[0];
            g._pv.setSrc(ti, 0, g._entry[t.key][nfe]);
            var k = g.querySelectorAll('.tile')[ti].querySelector('.k');
            if (k) k.textContent = b2.kind + ' · ' + nfe + ' NFE';
          });
        });
      });
    });
  }

  /* Diversity card: one 2 x 2 block of seeds per method, all 12 clips in one synchronized group; every method at the NFE
   * chosen in the switch. */
  function renderDiversity() {
    var card = document.getElementById('div');
    var list = MEDIA.diversity || [];
    if (!card || !list.length) return;
    var slot = card.querySelector('.slot');
    var on = card.querySelector('.seg button[aria-pressed="true"]');
    var nfe = on ? on.dataset.nfe : '4';
    function k(m) { return m.k + ' · ' + nfe + ' NFE'; }
    var groups = list.map(function (e) {
      var tiles = e.methods.map(function (m) { return { cap: { name: m.name, k: k(m) }, cls: m.ours ? 'ours' : '', srcs: m.seeds[nfe] }; });
      var g = makeGroup(tiles, e.prompt);
      g._entry = e;
      return g;
    });
    slot.append(sceneSelector(groups, list.map(function (e) { return e.title; }), list.map(function (e) { return e.thumb; }), card));
    groups.forEach(function (g) { slot.append(g); });

    card.querySelectorAll('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        nfe = b.dataset.nfe;
        card.querySelectorAll('.seg button').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        groups.forEach(function (g) {
          var blocks = g.querySelectorAll('.block');
          g._entry.methods.forEach(function (m, ti) {
            m.seeds[nfe].forEach(function (src, si) { g._pv.setSrc(ti, si, src); });
            var kk = blocks[ti] && blocks[ti].querySelector('.k');
            if (kk) kk.textContent = k(m);
          });
        });
      });
    });
  }

  window.PV.renderVideos = function () { renderQuality(); renderDiversity(); };
})();
