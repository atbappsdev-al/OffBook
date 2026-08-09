/* ==========================================================================
   OffBook — site behaviour
   Everything here is progressive enhancement: with JS off the pages still
   render fully, they just sit still.
   ========================================================================== */

(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- nav -- */

  function initNav() {
    var nav = document.querySelector('.nav');
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');

    if (nav) {
      var onScroll = function () {
        nav.classList.toggle('scrolled', window.scrollY > 8);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (!toggle || !links) return;

    var close = function () {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    document.addEventListener('click', function (e) {
      if (!links.contains(e.target) && !toggle.contains(e.target)) close();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 780) close();
    });
  }

  /* ------------------------------------------------------------ reveals -- */

  function initReveals() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------- once-in-view hook -- */

  /* Runs `fn` the first time `el` scrolls into view (or immediately if the
     browser can't observe). Used by the chart, bars and counters. */
  function whenVisible(el, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          fn();
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });

    io.observe(el);
  }

  /* ------------------------------------------------------- card pointer -- */

  function initCardSheen() {
    if (reduced || window.matchMedia('(hover: none)').matches) return;

    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------------------------------------------------- hero spotlight -- */

  function initSpotlight() {
    var hero = document.querySelector('.hero');
    var spot = document.querySelector('.hero-spot');
    if (!hero || !spot || reduced || window.matchMedia('(hover: none)').matches) return;

    var raf = null;
    var x = 0;
    var y = 0;

    var paint = function () {
      raf = null;
      spot.style.transform = 'translate3d(' + (x - 230) + 'px,' + (y - 230) + 'px, 0)';
    };

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      spot.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(paint);
    });

    hero.addEventListener('pointerleave', function () {
      spot.style.opacity = '0';
    });
  }

  /* ------------------------------------------------- in-app script demo -- */

  /* Walks the mock script in the phone: highlights each line in turn, blanks
     the actor's own lines, then "recognises" them and fills the meter. */
  function initScriptDemo() {
    var demo = document.querySelector('[data-script-demo]');
    if (!demo) return;

    var lines = Array.prototype.slice.call(demo.querySelectorAll('.line'));
    var fill = demo.querySelector('.meter i');
    var label = demo.querySelector('.meter-label');
    if (!lines.length) return;

    if (reduced) {
      lines.forEach(function (l) {
        l.classList.add('on');
        if (l.classList.contains('mine')) l.classList.add('revealed');
      });
      if (fill) fill.style.width = '92%';
      if (label) label.textContent = '92%';
      return;
    }

    var i = 0;
    var score = 0;
    var timer = null;

    var reset = function () {
      lines.forEach(function (l) { l.classList.remove('on', 'revealed'); });
      score = 0;
      if (fill) fill.style.width = '0%';
      if (label) label.textContent = '0%';
    };

    var step = function () {
      if (i >= lines.length) {
        timer = setTimeout(function () { reset(); i = 0; step(); }, 2600);
        return;
      }

      var line = lines[i];
      line.classList.add('on');

      if (line.classList.contains('mine')) {
        // Pause on the hidden line — this is the moment you'd be recalling it.
        timer = setTimeout(function () {
          line.classList.add('revealed');
          score = Math.min(96, score + 24 + Math.round(Math.random() * 6));
          if (fill) fill.style.width = score + '%';
          if (label) label.textContent = score + '%';
          i++;
          timer = setTimeout(step, 1100);
        }, 1500);
      } else {
        i++;
        timer = setTimeout(step, 1250);
      }
    };

    // Only animate while the demo is actually on screen.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!timer) step();
          } else {
            clearTimeout(timer);
            timer = null;
          }
        });
      }, { threshold: 0.2 });
      io.observe(demo);
    } else {
      step();
    }
  }

  /* --------------------------------------------------------- bars/chart -- */

  function initBars() {
    document.querySelectorAll('.bars').forEach(function (group) {
      whenVisible(group, function () {
        group.querySelectorAll('.bar-fill').forEach(function (bar, idx) {
          var pct = bar.getAttribute('data-value') || '0';
          setTimeout(function () { bar.style.width = pct + '%'; }, reduced ? 0 : idx * 140);
        });
      });
    });
  }

  function initCharts() {
    document.querySelectorAll('.chart').forEach(function (chart) {
      whenVisible(chart, function () { chart.classList.add('in'); });
    });
  }

  function initCounters() {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      if (isNaN(target)) return;

      whenVisible(el, function () {
        if (reduced) { el.textContent = target + suffix; return; }

        var start = null;
        var dur = 1300;

        var tick = function (ts) {
          if (start === null) start = ts;
          var p = Math.min(1, (ts - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      });
    });
  }

  /* ------------------------------------------------------------ pricing -- */

  /* Reads the same pricing.json the apps read, so the site's sale badge and
     the in-app paywall badge can never disagree. Purely decorative: if the
     fetch fails, the page just shows no banner. */
  function initPricing() {
    var banner = document.querySelector('[data-sale-banner]');
    if (!banner) return;

    var url = banner.getAttribute('data-sale-banner') || 'pricing.json';

    fetch(url, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        if (!data) return;

        // Keep the quoted full price in step with the file the apps read.
        var priceEl = document.querySelector('[data-baseline-price]');
        if (priceEl && data.baseline_prices) {
          var cur = priceEl.getAttribute('data-baseline-price') || 'GBP';
          var symbols = { GBP: '£', USD: '$', CAD: 'CA$', EUR: '€' };
          var value = data.baseline_prices[cur];
          if (value) priceEl.textContent = (symbols[cur] || '') + value;
        }

        if (data.sale_active !== true) return;

        var ends = data.sale_ends_at ? new Date(data.sale_ends_at) : null;
        if (ends && !isNaN(ends) && ends.getTime() <= Date.now()) return;

        banner.classList.add('show');

        var out = banner.querySelector('.countdown');
        if (!out || !ends || isNaN(ends)) return;

        var render = function () {
          var diff = ends.getTime() - Date.now();
          if (diff <= 0) { banner.classList.remove('show'); return; }

          var d = Math.floor(diff / 86400000);
          var h = Math.floor(diff / 3600000) % 24;
          var m = Math.floor(diff / 60000) % 60;
          var s = Math.floor(diff / 1000) % 60;

          out.textContent = d > 0
            ? d + 'd ' + h + 'h ' + m + 'm left'
            : h + 'h ' + m + 'm ' + s + 's left';

          setTimeout(render, d > 0 ? 60000 : 1000);
        };

        render();
      })
      .catch(function () { /* no banner — the store price is the truth anyway */ });
  }

  /* --------------------------------------------------------------- misc -- */

  function initYear() {
    var y = new Date().getFullYear();
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = y;
    });
  }

  /* Marks the nav link matching the current page. Saves hand-editing the
     `active` class into every page. */
  function initActiveLink() {
    var file = window.location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.nav-links a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^https?:/.test(href)) return;
      var target = href.split('#')[0].split('/').pop() || 'index.html';
      if (target === file) a.classList.add('active');
    });
  }

  function init() {
    initNav();
    initActiveLink();
    initReveals();
    initCardSheen();
    initSpotlight();
    initScriptDemo();
    initBars();
    initCharts();
    initCounters();
    initPricing();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
