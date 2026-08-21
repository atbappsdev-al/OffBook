# Pro pricing / sale badge — publishing guide

`pricing.json` in this repo controls the **LIMITED-TIME OFFER badge** on the in-app
Pro paywall in both OffBook apps. Editing it turns the badge on or off, and can
schedule it to switch itself off. **No app update or store release is needed.**

Served from GitHub Pages at:

```
https://atbappsdev-al.github.io/OffBook/pricing.json
```

> **This repo is public.** Anything written here is world-readable. That is fine for
> prices — they're on the store listing anyway — but don't add notes about unreleased
> plans or promotions you haven't announced.

**It does not set the price.** The price on the paywall always comes from the App
Store / Google Play, whatever you have configured there. This document only tells the
apps what **full price** is, so they can tell whether today's price is a discount.

---

## Contents

- [Why this file exists](#why-this-file-exists)
- [How to run a sale](#how-to-run-a-sale)
- [How to end a sale](#how-to-end-a-sale)
- [Adding a new market](#adding-a-new-market)
- [Scheduling the end](#scheduling-the-end)
- [How long until users see it](#how-long-until-users-see-it)
- [Field reference](#field-reference)
- [Traps worth remembering](#traps-worth-remembering)
- [Pre-publish checklist](#pre-publish-checklist)
- [Where the code lives](#where-the-code-lives)

---

## Why this file exists

OffBook Pro is a **single non-consumable** purchase. Neither StoreKit nor Play
Billing has any notion of "regular price vs current price" for one — they report what
the product costs *today* and nothing else. So the only way an app can know a price is
**reduced** is if we publish what full price is.

Before this file, both apps compared the live price against `4.99` baked into the
binary. That was wrong twice over:

- **In the UK it badged full price as a sale.** On iOS the baseline was written as a
  `Decimal` float literal, which is really 4.990000000000001024 — fractionally above
  the store's exact £4.99 — so "is the price below the baseline?" was true at full
  price.
- **Everywhere else it compared against the wrong currency.** A bare `4.99` measured
  against €4.49 or CA$6.99 says nothing at all; €4.49 is an ordinary full-price tier,
  and it would have worn a sale badge permanently.

Hence: full price per currency, published here, with a master switch.

---

## How to run a sale

1. **Change the price on the stores first** (App Store Connect / Play Console) and let
   it go live. This file describes reality; it doesn't create it.
2. Make sure `baseline_prices` lists the **regular** price for every currency you care
   about — the price you're discounting *from*, not the sale price. Leave those values
   alone during the sale.
3. Set `"sale_active": true`.
4. Optionally set `"sale_ends_at"` so the badge switches itself off on schedule — see
   [Scheduling the end](#scheduling-the-end).
5. Commit and push. GitHub Pages redeploys in a minute or two.
6. Verify the live file loads and is valid JSON:
   ```
   curl -s https://atbappsdev-al.github.io/OffBook/pricing.json | jq .
   ```

### Copy-paste template

```json
{
  "schema_version": 1,
  "sale_active": true,
  "sale_ends_at": "2026-08-14T23:59:59Z",
  "baseline_prices": {
    "GBP": "4.99",
    "USD": "6.99",
    "CAD": "6.99"
  }
}
```

A user sees the badge only when **all** of these are true:

- `sale_active` is `true`, **and**
- `sale_ends_at` is absent or still in the future, **and**
- the store's price for **their** storefront is **strictly below** the
  `baseline_prices` entry for **their** currency.

So a storefront where you didn't actually drop the price shows no badge, even with the
switch on — which is the point. A currency with no entry never shows the badge.

---

## How to end a sale

Set `"sale_active": false` and push. Leave `baseline_prices` as it is — those are
your regular prices, ready for next time.

Do this **at the same time as** (or before) restoring the price on the stores. If the
price goes back up while the switch is still on, nothing lies to the user — the badge
disappears on its own because the price is no longer below the baseline — but flip it
back anyway so the document reflects reality.

**If you permanently change a regular price**, update that currency's entry here to
match. A stale baseline that's *above* the new regular price would badge full price as
a discount for as long as it's wrong.

---

## Adding a new market

Releasing in a country you haven't sold in before needs one line here, and it is easy
to forget because **nothing breaks without it**. The apps fail closed per currency: a
storefront whose currency has no `baseline_prices` entry simply never badges, silently,
for as long as it's missing. A sale you switch on globally would run everywhere you've
listed and quietly skip everywhere you haven't.

What to do, per market:

1. **Find the regular price your store actually charges there.** App Store Connect and
   Play Console both set local prices from a tier, and the tier rarely converts to a
   round number — the euro price of a £4.99 product is whatever the console says it is,
   not £4.99 at today's exchange rate. Read it off the console; don't calculate it.
2. **Check both stores agree.** iOS and Android share this one document, so a currency
   whose App Store and Play prices differ needs the *higher* of the two as the baseline,
   or the cheaper platform will badge at full price. Better still, set the same price on
   both.
3. **Add the currency, not the country.** The key is the ISO 4217 code the store reports
   for that storefront, and one entry covers every country using it.
4. **Verify on a device in that storefront** — the debug log names the gate that closed
   (`adb logcat -s BillingManager`, or the Xcode console).

**Currencies are shared; countries are not.** Ireland and Malta are both euro, so one
`"EUR"` entry serves both — and also serves every other euro storefront you sell in,
whether or not you were thinking about them when you wrote it. Set it to the euro price
you actually charge.

A worked set, with the codes for the storefronts this document is most often extended
to. **The amounts below are placeholders** — replace each with the real console figure
before publishing:

```json
"baseline_prices": {
  "GBP": "4.99",
  "USD": "6.99",
  "CAD": "6.99",
  "AUD": "0.00",
  "EUR": "0.00",
  "NZD": "0.00",
  "ZAR": "0.00"
}
```

| Market | Currency | Notes |
|---|---|---|
| Australia | `AUD` | |
| Ireland | `EUR` | Shares the entry with Malta and the rest of the eurozone |
| Malta | `EUR` | Same entry as Ireland |
| New Zealand | `NZD` | |
| South Africa | `ZAR` | |

> **Getting a baseline wrong is worse than leaving it out.** A missing entry means no
> badge — invisible, but honest. A baseline set *above* what the store really charges
> badges **full price as a discount** in that market, every day, until someone notices.
> That is a price claim you can't substantiate, so if you aren't certain of the number,
> publish nothing for that currency until you are.

The marketing site reads the same list: `pro.html` quotes a visitor the baseline for
their own currency when one is published, and falls back to sterling when it isn't. So
adding a market here also stops that page quoting Australians a pound price.

---

## Scheduling the end

`sale_ends_at` is an optional instant after which the badge stops appearing, whether
or not anyone is at a keyboard:

```json
"sale_ends_at": "2026-08-14T23:59:59Z"
```

The paywall prints it under the badge as **"Offer ends 14 August 2026"**, formatted in
each user's own locale and timezone — so a sale that ends at one instant worldwide
still reads as the correct local date wherever they are.

Because the date is *shown*, it is also *enforced*: a banner reading "Offer ends 14
August" that is still up on the 15th would be a worse price claim than no date at all.
At the instant named, the badge and the line both disappear.

> **The end date does not restore the store price.** It only stops the badge. You
> still have to put the price back in App Store Connect / Play Console yourself, and
> you should still set `sale_active` back to `false` afterwards so the document
> reflects reality.

**Format: RFC 3339 with an explicit UTC offset.** `2026-08-14T23:59:59Z` or
`2026-08-15T00:59:59+01:00` — both name the same instant, and both are fine.
Fractional seconds are accepted. A bare `2026-08-14` or a zone-less
`2026-08-14T23:59:59` is **rejected**, because a date with no zone is a different
instant in Auckland than in Los Angeles and there is no safe way to guess which you
meant.

**Absent, `null`, or `""` means no end date** — the sale runs until you flip the
switch, exactly as it did before this field existed. That is the ordinary way to clear
it.

**Anything else that isn't a usable instant means no badge at all.** This is the one
field where a mistake closes the badge rather than being ignored: everywhere else in
this document an unreadable value reads as absent, but here "absent" means *runs
forever*, so a typo would otherwise be the single publisher error that keeps a badge
up. `"14/08/2026"`, `"next friday"`, an epoch number, or a `true` all suppress it.

The comparison uses the **device's own clock** at the moment a price is displayed. A
user who winds their clock back can hold a badge open a little longer; that is
acceptable, because the price gate still applies — they cannot conjure a discount the
store isn't giving, only a stale label on a real one.

---

## How long until users see it

**The next time anyone opens a screen that shows the price.** Unlike
`announcements.json` and `endpoints.json`, which each app fetches at most once every
6 hours on a cold start, this document is re-fetched **every time a price is about to
be displayed** — the paywall, and the locked Statistics / confidence cards. A stale
model order is invisible; a stale sale badge is a price claim, so it isn't allowed to
lag.

- Both apps bypass their own HTTP cache **and** the GitHub Pages CDN (via a
  per-second query value), so the change reaches devices as soon as Pages has
  redeployed — not up to ten minutes later, which is what the Pages
  `Cache-Control: max-age=600` would otherwise impose.
- The fetch is capped at **2.5 seconds** so it can never hold up a paywall. If it
  times out or fails, the **last-known-good cached copy** decides (installed at app
  launch), and ultimately "no sale".
- Several price surfaces opening at once share a single request.
- **Expiry needs no network at all.** `sale_ends_at` is checked against the device
  clock when the price is displayed, so a sale stops badging on time even on a device
  that hasn't reached the internet since before it ended.

Practical upshot: push the change, wait for Pages to redeploy (a minute or two), then
reopen the paywall — you should see the badge appear or disappear immediately. There
is no cache window to wait out.

> **`sale_ends_at` only works in builds that know about it.** It was added after the
> apps that are live today, and older builds ignore unknown fields by design — they
> will keep badging past the end date until `sale_active` goes `false`. Until the
> builds carrying it have shipped on both stores, treat the field as documentation of
> intent and still end sales by hand.

---

## Field reference

| Field | Required | Notes |
|---|---|---|
| `schema_version` | **Yes** | Must be exactly `1`. Any other value → the whole document is discarded and no badge shows |
| `sale_active` | No | `true` to allow the badge, `false` (or omitted) to suppress it everywhere |
| `sale_ends_at` | No | RFC 3339 instant with an explicit offset. Absent/`null`/`""` → no end date. Unreadable → **no badge**. See [Scheduling the end](#scheduling-the-end) |
| `baseline_prices` | No | Object of **ISO 4217 currency code → regular price**. Codes are case-insensitive; three letters only. Omitted or empty → no badge anywhere |

Prices must be written as **strings** (`"4.99"`), digits and at most one `.` with up to
six decimal places. Whole numbers may be unquoted (`800`). Anything else — `4,99`,
`"$6.99"`, `"1e3"`, a negative, or a fractional **unquoted** number like `4.99` — is
dropped, and that currency simply never badges.

> Why strings? An unquoted `4.99` can only reach the apps through a binary floating
> point value, whose nearest value to 4.99 is *above* 4.99. That is the exact
> imprecision that badged full price as a sale in the first place, so the parsers
> refuse to read fractional numbers.

Unknown fields are ignored by both apps, which is why `_readme` in the live file is
harmless.

---

## Traps worth remembering

- **`baseline_prices` is the full price, not the sale price.** Putting the discounted
  price in makes the badge vanish (nothing is below it).
- **Numbers must be quoted.** `"GBP": 4.99` is silently dropped; `"GBP": "4.99"` is
  correct. Run the checklist below.
- **A currency you don't list never badges.** Add every storefront you want the badge
  in — the apps deliberately don't guess from other currencies.
- **Equal isn't below.** A price *equal* to the baseline is full price by definition.
  The same goes for time: at the exact instant of `sale_ends_at`, the sale is over.
- **A malformed `sale_ends_at` kills the badge outright** — it does not fall back to
  "no end date". This is deliberate, and the opposite of how every other field
  behaves. If a sale silently fails to appear, check this field first.
- **`sale_ends_at` needs a timezone.** `"2026-08-14"` is rejected, not assumed to mean
  midnight anywhere.
- **An end date doesn't put the price back.** It stops the badge only; the store price
  is still yours to restore.
- **Nothing here is user-visible copy.** The badge wording lives in the apps; this
  document can't change it. The end-date line reads "Offer ends <date>" and is
  formatted per user.
- **Pages redeploy is the only wait.** The apps don't cache-lag this document, but
  GitHub still needs a minute or two to publish your commit. If `curl` shows the old
  content, the app will too.
- **Everything fails closed.** A malformed document, a wrong `schema_version`, a
  missing file, or no network on a fresh install all mean "no badge" — never a badge
  claiming a discount that isn't real. A broken document therefore looks exactly like
  "no sale", with no error surface anywhere. Always run the `jq` check.
- **Debug builds say why.** Both apps log the reason a badge was suppressed —
  `adb logcat -s BillingManager` on Android, the Xcode console on iOS. That names
  which gate closed instead of leaving you to guess.

---

## Pre-publish checklist

- [ ] The store price has actually changed (or is about to), in the storefronts you're
      badging.
- [ ] `schema_version` is `1`.
- [ ] `sale_active` is the value you intend.
- [ ] If `sale_ends_at` is set: it is RFC 3339 **with an offset**, and it is in the
      future. If it isn't set, you have a plan for ending the sale by hand.
- [ ] Every price is a **quoted string**, and is the **regular** price.
- [ ] Every currency code is three letters and matches the storefronts you care about.
- [ ] `curl -s https://atbappsdev-al.github.io/OffBook/pricing.json | jq .` returns the
      document (after Pages redeploys).
- [ ] Sanity-check on a device: the paywall shows your storefront's real price, the
      badge is present/absent as intended, and the "Offer ends …" line reads the date
      you expect in your own timezone.

---

## Where the code lives

| Platform | Files |
|---|---|
| iOS | `OffBookKit/Sources/OffBookKit/Pricing/ProPricingConfig.swift` (model + `SaleWindow` + parser), `OffBook/Services/ProPricingService.swift` (fetch/cache), `OffBook/Services/StoreManager.swift` (`remotePricing`, `priceInfo()`), `OffBook/Features/Paywall/PaywallSheet.swift` (the badge and the end-date line) |
| Android | `app/src/main/java/com/abdev/offbook/pricing/` (`ProPricingConfig`, `SaleWindow`, `ProPricingParser`, `ProPricingFetcher`, `ProPricingManager`), `BillingManager.getProPriceInfo` (the sale decision), `ui/paywall/PaywallBottomSheet.kt` (the badge and the end-date line) |

Both platforms share this document byte-for-byte and have parser tests pinned to the
shape above (`ProPricingParserTests` / `ProPricingParserTest`). If you change the
schema, change both apps and bump `schema_version` — but note that a bump makes every
already-shipped build discard the document, so prefer adding fields. `sale_ends_at`
was added exactly that way, without a bump.

The same fail-closed, cache-first pattern powers `announcements.json` (see
[ANNOUNCEMENTS.md](ANNOUNCEMENTS.md)) and `endpoints.json` — but on a 6-hour cadence.
This document alone refreshes per price display, deliberately: see
[How long until users see it](#how-long-until-users-see-it).
