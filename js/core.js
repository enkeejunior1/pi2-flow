/* PixVid demo page: shared helpers. Loaded first; every other script reads them from window.PV.
 * Vanilla JS, no libraries, no network. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function h(tag, props) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'class') node.className = props[k];
      else if (k === 'style') node.setAttribute('style', props[k]);
      else node.setAttribute(k, props[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid == null) continue;
      node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return node;
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function se(tag, attrs, parent) {
    var node = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  // Typesets \( \) math inside el once MathJax has started (for text inserted after the first pass).
  function typeset(el) {
    var mj = window.MathJax, ready = mj && mj.startup && mj.startup.promise;
    if (ready) ready.then(function () { return mj.typesetPromise([el]); });
  }

  window.PV = { h: h, se: se, reduce: reduce, typeset: typeset };
})();
