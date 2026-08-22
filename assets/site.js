/* ==========================================================================
   OffBook — site behaviour
   Everything here is progressive enhancement: with JS off the pages still
   render fully, they just sit still.
   ========================================================================== */

(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Apple Services provider token, used by the campaign tagging below. It comes
     from App Store Connect > Analytics > campaign link generator, and is the same
     token that appears in every campaign link Apple generates for this account —
     public by design, not a credential. */
  var APPLE_PT_TOKEN = '129146736';

  /* What a campaign value is allowed to be: letters, digits, hyphen and
     underscore, 40 characters at most. Anything else is rejected outright — the
     values land in a URL we hand to a store, so nothing else has any business
     in them. */
  var CAMPAIGN_TOKEN = /^[A-Za-z0-9_-]{1,40}$/;

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

  /* Reads pricing.json — the same file the in-app paywall reads — for two
     things: the quoted regular price, and whether an offer is on.

     The gate below deliberately mirrors PRICING.md, minus the one rule a web
     page cannot apply: the app also requires the visitor's own storefront price
     to be strictly below their currency's baseline. We know neither here, which
     is why the banner says "on offer" and sends people to their store rather
     than naming a discount they might not be getting. */
  function initPricing() {
    var priceEls = document.querySelectorAll('[data-baseline-price]');
    var banner = document.querySelector('[data-sale-banner]');
    if (!priceEls.length && !banner) return;

    var url = (banner && banner.getAttribute('data-sale-banner')) ||
              (priceEls[0] && priceEls[0].getAttribute('data-pricing-src')) ||
              'pricing.json';

    var symbols = {
      GBP: '£', USD: '$', CAD: 'CA$', EUR: '€',
      AUD: 'A$', NZD: 'NZ$', ZAR: 'R'
    };

    /* Which currency to quote a visitor, by the region in their browser locale.
       Ireland and Malta are both euro, which is why the value repeats rather
       than the key being a currency.

       This only chooses between figures already published in pricing.json — it
       cannot invent one — and an unmapped region, an unpublished currency, or a
       browser that reports no region at all all fall back to the currency named
       in the markup. So the worst case is the sterling figure the page quoted
       before this existed, never a made-up price. */
    var regionCurrency = {
      GB: 'GBP', US: 'USD', CA: 'CAD',
      AU: 'AUD', NZ: 'NZD', ZA: 'ZAR', IE: 'EUR', MT: 'EUR'
    };

    /* The region is a hint about where someone is, not a statement about which
       storefront will charge them — an en-US browser in Sydney is ordinary. The
       copy beside every figure says the store decides the real price, which is
       what keeps a wrong guess honest rather than misleading. */
    function visitorCurrency() {
      var tags = (navigator.languages && navigator.languages.length)
        ? navigator.languages
        : [navigator.language || ''];
      for (var i = 0; i < tags.length; i++) {
        var match = /[-_]([A-Za-z]{2})(?:[-_]|$)/.exec(tags[i] || '');
        var currency = match && regionCurrency[match[1].toUpperCase()];
        if (currency) return currency;
      }
      return null;
    }

    fetch(url, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        if (!data) return;

        if (data.baseline_prices) {
          var local = visitorCurrency();
          priceEls.forEach(function (el) {
            var cur = el.getAttribute('data-baseline-price') || 'GBP';
            /* Prefer the visitor's own currency, but only when it is actually
               published — an unlisted market keeps the declared fallback. */
            if (local && data.baseline_prices[local]) cur = local;
            var value = data.baseline_prices[cur];
            if (value) el.textContent = (symbols[cur] || '') + value;
          });
        }

        if (!banner || data.sale_active !== true) return;

        var starts = parseSaleInstant(data.sale_starts_at);
        var ends = parseSaleInstant(data.sale_ends_at);
        if (starts === false || ends === false) return;   // unusable — show nothing

        var now = Date.now();
        /* The start bound matters more here than in the apps. They also require
           the visitor's own store price to be below baseline, so a window that
           opens early still shows no badge — the price gate catches it. This page
           knows neither price nor storefront, so `sale_starts_at` is the only
           thing standing between a config published in advance and a banner
           announcing an offer that hasn't begun. */
        if (starts && starts.getTime() > now) return;
        if (ends && ends.getTime() <= now) return;
        if (starts && ends && starts.getTime() >= ends.getTime()) return;

        banner.classList.add('show');
        startCountdown(banner, ends);
      })
      .catch(function () { /* no banner; the figure in the markup stands */ });
  }

  /* PRICING.md's rules for sale_starts_at / sale_ends_at, kept deliberately
     faithful:
       absent / null / ""      -> null  (unbounded on that side)
       a valid instant WITH an explicit UTC offset -> Date
       anything else           -> false (suppresses the banner entirely)
     That last case is the important one: "absent" already means "unbounded", so
     treating a typo as absent would leave a bad banner up indefinitely — or, for
     a start date, put one up early. */
  function parseSaleInstant(raw) {
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw !== 'string') return false;
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)) return false;   // zone-less is rejected
    var d = new Date(raw);
    return isNaN(d.getTime()) ? false : d;
  }

  /* Prints the end date the way the paywall does ("Offer ends 14 August 2026",
     in the reader's own locale), tightening to a live countdown in the last
     48 hours and pulling the banner once the moment passes. */
  function startCountdown(banner, ends) {
    var out = banner.querySelector('.countdown');
    if (!out) return;

    if (!ends) { out.textContent = ''; return; }

    var dateText;
    try {
      dateText = 'Offer ends ' + ends.toLocaleDateString(undefined, {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch (e) {
      dateText = 'Offer ends ' + ends.toDateString();
    }

    var render = function () {
      var diff = ends.getTime() - Date.now();

      if (diff <= 0) { banner.classList.remove('show'); return; }

      if (diff > 172800000) {                       // more than 48h out
        out.textContent = dateText;
        setTimeout(render, 60000);
        return;
      }

      var h = Math.floor(diff / 3600000);
      var m = Math.floor(diff / 60000) % 60;
      var s = Math.floor(diff / 1000) % 60;
      out.textContent = 'Ends in ' + h + 'h ' + m + 'm ' + s + 's';
      setTimeout(render, 1000);
    };

    render();
  }

  /* ------------------------------------------------------ campaign tags -- */

  /* Carries an ad click's own tagging through to the stores, so an install can
     be attributed to the campaign that sent the visitor here.

     Reads `src` (and optionally `cmp`) off the page URL — download.html?src=fb&cmp=fb_ad_1
     — and rewrites the store links in place. With no `src`, which is every
     organic visitor, nothing is touched at all: the links stay exactly as the
     markup has them. */
  function initCampaignTags() {
    if (!('URLSearchParams' in window)) return;

    var params = new URLSearchParams(window.location.search);
    var src = campaignToken(params.get('src'));
    if (!src) return;                    // organic visit, or an unusable source

    /* An unusable `cmp` is treated the same as an absent one — fall back to the
       source rather than dropping the tagging altogether. */
    var cmp = campaignToken(params.get('cmp')) || src;

    /* Play wants one pre-encoded `referrer` value; the tokens above are already
       URL-safe, so the only encoding needed is of the separators inside it. */
    var play = 'referrer=utm_source%3D' + src + '%26utm_medium%3Dcpc%26utm_campaign%3D' + cmp;
    var apple = 'pt=' + APPLE_PT_TOKEN + '&ct=' + cmp + '&mt=8';

    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';

      if (href.indexOf('play.google.com') !== -1) {
        if (href.indexOf('referrer=') === -1) a.setAttribute('href', addQuery(href, play));
      } else if (href.indexOf('apps.apple.com') !== -1) {
        if (href.indexOf('ct=') === -1) a.setAttribute('href', addQuery(href, apple));
      }
    });
  }

  function campaignToken(raw) {
    return (raw && CAMPAIGN_TOKEN.test(raw)) ? raw : null;
  }

  function addQuery(href, extra) {
    return href + (href.indexOf('?') === -1 ? '?' : '&') + extra;
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
    initCampaignTags();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
