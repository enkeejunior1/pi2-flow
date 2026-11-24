/* π²-Flow page: nav scroll-spy and the init that wires every component. Runs last. */
(function () {
  'use strict';

  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  function spy() {
    var y = window.scrollY + window.innerHeight * 0.3, cur = 0;
    secs.forEach(function (s, i) { if (s.offsetTop <= y) cur = i; });
    links.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  window.addEventListener('scroll', spy, { passive: true });
  spy();

  window.PV.renderVideos();
  // The drawn figures typeset their labels with MathJax, so they are built once it has started.
  var mj = window.MathJax && window.MathJax.startup && window.MathJax.startup.promise;
  (mj || Promise.resolve()).then(function () {
    window.PV.initPrinciple();
    window.PV.initMethod();
    window.PV.initCharts();
  });
})();
