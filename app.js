/* app.js — nav state, reveals, inertial scroll, parallax, scroll-spy, theme toggle */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav = document.getElementById('nav');
  var bar = document.getElementById('scroll-bar');

  /* ---------- nav background + scroll progress (per-frame) ---------- */
  function update(scroll) {
    if (typeof scroll !== 'number') scroll = window.scrollY || window.pageYOffset || 0;

    if (scroll > 24) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');

    if (bar) {
      var max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
      var p = Math.min(1, Math.max(0, scroll / max));
      bar.style.transform = 'scaleX(' + p + ')';
    }
  }

  /* ---------- inertial (momentum) scrolling via Lenis ---------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 0.8,
      easing: function (t) { return 1 - Math.pow(1 - t, 3); }, // easeOutCubic
      smoothWheel: true,
      wheelMultiplier: 1.25,
      touchMultiplier: 1.6
    });
    lenis.on('scroll', function (e) { update(e.scroll); });
    window.__lenis = lenis;
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  } else {
    window.addEventListener('scroll', function () { update(); }, { passive: true });
  }
  update();

  /* ---------- smooth anchor links (route through Lenis when present) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -80, duration: 0.9 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      // move keyboard focus to the target when it can hold it (e.g. the skip link → <main>),
      // so tabbing continues from there instead of restarting at the nav
      if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
    });
  });

  /* ---------- scroll reveal ---------- */
  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- scroll-spy: highlight nav link for the section in view ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = '#' + en.target.id;
        links.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { sio.observe(s); });
  }

  /* ---------- dark-mode toggle (initial theme set by inline head script) ---------- */
  var tg = document.getElementById('theme-toggle');
  function syncPressed() { if (tg) tg.setAttribute('aria-pressed', String(root.getAttribute('data-theme') === 'dark')); }
  syncPressed();
  if (tg) {
    tg.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') === 'dark';
      if (dark) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('theme', dark ? 'light' : 'dark'); } catch (e) {}
      syncPressed();
    });
  }
})();
