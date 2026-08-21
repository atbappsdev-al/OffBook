# OffBook — website &amp; app config

This repo is two things at once:

1. **The OffBook website**, served from GitHub Pages at
   `https://atbappsdev-al.github.io/OffBook/`.
2. **Live config the apps read at runtime** — `announcements.json`, `pricing.json`
   and `endpoints.json`, each documented in its own guide.

> **This repo is public.** Everything in it is world-readable.

---

## ⚠️ The privacy policy has moved

`index.html` used to *be* the privacy policy. It is now the site's home page, and the
policy lives at:

```
https://atbappsdev-al.github.io/OffBook/privacy.html
```

**The privacy policy URL on both store listings needs updating to that address**
(App Store Connect → App Privacy → Privacy Policy URL; Play Console → Store settings
→ Privacy policy). The bare `/OffBook/` URL now serves the home page, which is not a
privacy policy and will not satisfy either store's review.

---

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home — hero, feature overview, confidence pitch, download CTA |
| `features.html` | Every feature in detail: import, rehearse, track, organise |
| `pro.html` | What the one-off Pro unlock adds, plus buying FAQs |
| `download.html` | Store badges and what you get |
| `support.html` | Contact details and the FAQ |
| `privacy.html` | The privacy policy (text unchanged from the old `index.html`) |
| `404.html` | Styled not-found page, served by GitHub Pages for any missing path |

Shared across all of them:

| File | Purpose |
| --- | --- |
| `assets/site.css` | The whole design system — colours, layout, components, animation |
| `assets/site.js` | Nav, scroll reveals, the phone demo, chart/bar animation, price + offer banner |
| `assets/offbook-logo.png` | Official word-logo (dark-theme variant, from the app) |
| `assets/offbook-icon.png` | Official app icon, as shipped on the stores |
| `assets/favicon.png` | Favicon |

There is no build step. It's plain HTML, one stylesheet and one script — edit a file,
commit, and GitHub Pages publishes it.

---

## Editing the site

**Colour scheme.** Every colour comes from the custom properties at the top of
`assets/site.css` (`--bg`, `--surface`, `--purple`, and so on). They match the app.
Change them there and the whole site follows; don't hard-code hex values in a page.

**Navigation.** The nav and footer are copied into each page (no templating without a
build step). If you add a page, add it to the `.nav-links` list and the footer in every
file — and to `sitemap.xml`.

The active nav link is set at runtime by `site.js` from the current filename, so you
don't need to hand-edit an `active` class anywhere.

**Animation.** Anything with `class="reveal"` fades up when it scrolls into view; add
`d1`–`d4` to stagger it. Everything respects `prefers-reduced-motion`, and with JS
disabled the pages render fully and simply sit still.

**Store badges.** Both live in `download.html`. To mark a store as not-yet-available,
add `coming-soon` to that badge's `<a>` — it greys out and stops being clickable.

---

## What `pro.html` takes from `pricing.json`

The Pro page fetches `pricing.json` — the very same file the in-app paywall reads — so
the site and the app can't drift apart. Two things come from it:

- **The quoted regular price**, from `baseline_prices`. Any element with
  `data-baseline-price` gets filled in. The page prefers the visitor's **own**
  currency — chosen from the region in their browser locale, and used only when
  `baseline_prices` actually publishes that currency — so an Australian reader is
  quoted A$ rather than sterling. The code in the attribute is the fallback for
  everyone else: an unmapped region, a currency with no published baseline, or a
  browser that reports no region at all. Add a market to `baseline_prices` and this
  page starts quoting it; the mapping of region to currency lives in `initPricing`
  in `assets/site.js`.
- **The Limited-time offer banner**, shown only while `sale_active` is `true` and
  `sale_ends_at` hasn't passed. Over 48 hours out it prints "Offer ends 14 August 2026"
  in the reader's own locale; inside 48 hours it counts down live, and it removes itself
  the moment the deadline passes, with no reload.

`sale_ends_at` is handled exactly as PRICING.md specifies: absent, `null` or `""` means
no end date; a value without an explicit UTC offset, or one that isn't a usable instant,
suppresses the banner rather than being ignored. Same reasoning as the apps — "absent"
already means *runs forever*, so a typo must close the banner, not open it indefinitely.

**One rule the website can't apply.** The app also requires the user's own storefront
price to be strictly below their currency's baseline; a web page knows neither the
visitor's storefront nor their price. So the banner stops at "OffBook Pro is on offer —
normally £4.99. Your store shows today's price." Naming a discount here would promise one
to visitors whose storefront isn't giving it. Keep the wording at that altitude if you
edit it.

Whatever sits in `baseline_prices` is what this page tells the public your regular price
is, so it needs to be right for reasons beyond the badge — see [PRICING.md](PRICING.md).
`node tools/check-pricing.mjs` validates the document the way the apps read it, and
`--expect GBP,USD,AUD,…` additionally fails when a storefront you sell in has no
baseline — the omission that is otherwise invisible, because a missing currency just
never badges.

---

## App config files

Don't edit these casually — the apps read them live, with no release needed.

- `announcements.json` — the in-app announcement banner. Guide: [ANNOUNCEMENTS.md](ANNOUNCEMENTS.md)
- `pricing.json` — the limited-time-offer badge on the Pro paywall. Guide: [PRICING.md](PRICING.md)
- `endpoints.json` — Gemini model list used for script import
- `announcements.example.json` — reference sample, not served to anything

---

## Checking a change before you push

Serve the folder locally — opening the files directly with `file://` will block the
`pricing.json` fetch:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Worth a look each time: the mobile nav at a narrow width, the phone demo on the home
page cycling through its lines, and the pages with JS disabled.
