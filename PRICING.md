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
- [Scheduling the window](#scheduling-the-window)
- [Timezones, and why the two windows can disagree](#timezones-and-why-the-two-windows-can-disagree)
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
4. Optionally set `"sale_starts_at"` and `"sale_ends_at"` so the badge switches itself
   on and off on schedule — see [Scheduling the window](#scheduling-the-window).
5. Commit and push. GitHub Pages redeploys in a minute or two.
6. Verify the live file loads and every rule on this page still holds:
   ```
   node tools/check-pricing.mjs --live
   ```

### Copy-paste template

```json
{
  "schema_version": 1,
  "sale_active": true,
  "sale_starts_at": "2026-08-07T00:00:00Z",
  "sale_ends_at": "2026-08-14T23:59:59Z",
  "baseline_prices": {
    "GBP": "4.99",
    "USD": "6.99",
    "CAD": "6.99",
    "AUD": "9.99",
    "EUR": "5.99",
    "NZD": "11.99",
    "ZAR": "110.00"
  }
}
```

A user sees the badge only when **all** of these are true:

- `sale_active` is `true`, **and**
- `sale_starts_at` is absent or already past, **and**
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

**And the stores change prices without asking you.** Apple generates the other
storefronts' prices from your base country, then
[periodically re-adjusts them](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/set-a-price-for-an-in-app-purchase/)
as exchange rates and local taxes move; Google Play does much the same for
auto-converted prices. So a baseline that was right the day you wrote it can drift out
of date with nobody touching either the app or this file — and if the store price moves
*down* while the baseline stays put, that market starts badging full price as a
discount on its own. Re-read the real figures off both consoles when you run a sale,
rather than trusting what is written here.

---

## Adding a new market

Releasing in a country you haven't sold in before needs one line here, and it is easy
to forget because **nothing breaks without it**. The apps fail closed per currency: a
storefront whose currency has no `baseline_prices` entry simply never badges, silently,
for as long as it's missing. A sale you switch on globally would run everywhere you've
listed and quietly skip everywhere you haven't.

What to do, per market:

1. **Find the regular price your store actually charges there.** Both consoles generate
   local prices from your base country, and the result rarely converts to a round
   number — the euro price of a £4.99 product is whatever the console says it is, not
   £4.99 at today's exchange rate. Read it off the console; don't calculate it, and
   don't work backwards from this file.

   - **App Store Connect** → your app → **In-App Purchases** → **OffBook Pro** →
     **Price Schedule**, which lists the generated price for all 175 storefronts.
   - **Play Console** → **Monetise** → **Products** → **In-app products** → the
     product → **Manage prices**, which lists the price per country.

   The stores are the source of truth and this file follows them — never the other way
   round. Changing a store price to match something written here is backwards.
2. **Check both stores agree.** iOS and Android share this one document, so a currency
   whose App Store and Play prices differ needs the *higher* of the two as the baseline,
   or the cheaper platform will badge at full price. Better still, set the same price on
   both.
3. **Add the currency, not the country.** The key is the ISO 4217 code the store reports
   for that storefront, and one entry covers every country using it.
4. **Check the document before you push it**, naming every storefront you now sell in:

   ```
   node tools/check-pricing.mjs --expect GBP,USD,CAD,AUD,EUR,NZD,ZAR
   ```

   A currency in `--expect` with no usable baseline fails the check. That is the
   whole point: the apps treat a missing currency and a currency you never meant to
   list identically, so this list is the only place the intended set is written down.
5. **Verify on a device in that storefront** — the debug log names the gate that closed
   (`adb logcat -s BillingManager`, or the Xcode console).

**Currencies are shared; countries are not.** Ireland and Malta are both euro, so one
`"EUR"` entry serves both — and also serves every other euro storefront you sell in,
whether or not you were thinking about them when you wrote it. Set it to the euro price
you actually charge.

The currently published set, which is what the live document holds:

| Market | Currency | Regular price |
|---|---|---|
| United Kingdom | `GBP` | 4.99 |
| United States | `USD` | 6.99 |
| Canada | `CAD` | 6.99 |
| Australia | `AUD` | 9.99 |
| Ireland | `EUR` | 5.99 — shares the entry with Malta and the rest of the eurozone |
| Malta | `EUR` | Same entry as Ireland |
| New Zealand | `NZD` | 11.99 |
| South Africa | `ZAR` | 110.00 |

Anywhere not in that list sells at whatever the store charges and simply never badges.

> **Getting a baseline wrong is worse than leaving it out.** A missing entry means no
> badge — invisible, but honest. A baseline set *above* what the store really charges
> badges **full price as a discount** in that market, every day, until someone notices.
> That is a price claim you can't substantiate, so if you aren't certain of the number,
> publish nothing for that currency until you are.

The marketing site reads the same list: `pro.html` quotes a visitor the baseline for
their own currency when one is published, and falls back to sterling when it isn't. So
adding a market here also stops that page quoting Australians a pound price.

---

## Scheduling the window

`sale_starts_at` and `sale_ends_at` are optional instants that open and close the
badge on their own, whether or not anyone is at a keyboard:

```json
"sale_active": true,
"sale_starts_at": "2026-08-07T00:00:00Z",
"sale_ends_at": "2026-08-14T23:59:59Z"
```

That is the whole point of them: you can publish a promotion in advance, to line up
with a price change you have already scheduled in App Store Connect / Play Console,
and then leave it alone. **Start is inclusive, end is exclusive**, so back-to-back
windows can't both badge for a tick.

`sale_active` stays what it always was — the master switch, and your kill switch.
Dates cannot override it: `false` means no badge anywhere, whatever window you have
published. Leave it `true` and let the dates do the work if you prefer, but keep it,
because ending a sale early by flipping one boolean beats editing timestamps under
pressure.

Only `sale_ends_at` is ever displayed. A badge that isn't up yet has nothing to
caption, and "Offer starts Friday" on a paywall is an advert for not buying today.

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

**Absent, `null`, or `""` means unbounded on that side** — no start means the sale has
already begun, no end means it runs until you flip the switch, exactly as it did before
these fields existed. That is the ordinary way to clear either.

**Anything else that isn't a usable instant means no badge at all.** These are the two
fields where a mistake closes the badge rather than being ignored: everywhere else in
this document an unreadable value reads as absent, but here "absent" means *unbounded*,
so a typo would otherwise be the one publisher error that opens a badge — early, in the
case of a start date, for a discount the store hasn't begun giving. `"14/08/2026"`,
`"next friday"`, an epoch number, or a `true` all suppress the badge.

**A start at or after the end is rejected outright.** It is always a mistake — a typo'd
year, or the two values swapped — and a window nothing can fall inside would otherwise
just silently never badge, which is the hardest failure here to spot. `check-pricing.mjs`
names it.

The comparison uses the **device's own clock** at the moment a price is displayed. A
user who winds their clock can hold a badge open a little longer, or open it a little
early; that is acceptable, because the price gate still applies — they cannot conjure a
discount the store isn't giving, only a stale label on a real one.

---

## Timezones, and why the two windows can disagree

There are two windows in play and they are not the same object:

- **The store's discount**, scheduled in App Store Connect / Play Console. Depending on
  how you schedule it, this can take effect per territory rather than at one instant.
- **This document's window**, which is a single instant worldwide on each side.

They will not line up exactly. Offsets run from UTC−12 to UTC+14, so a window written
in UTC can be up to fourteen hours early in Kiritimati and twelve hours late in Baker
Island relative to a local-midnight rollout.

**That is safe, and deliberately so, because the badge has a third gate: the price.**
`isOnSale` requires the store's own price for that storefront to be *strictly below*
the published baseline. Which means every way the two windows can disagree fails in the
harmless direction:

| Situation | What the user sees | Harm |
|---|---|---|
| Our window opens before the store drops the price | No badge — the price gate is still closed | None |
| Store drops the price before our window opens | No badge until the window opens | Badge is late |
| Store restores the price before our window closes | No badge — the price gate closes again | None |
| Our window closes before the store restores the price | Badge stops, discount continues quietly | Badge is early |

So the badge can never claim a discount the store isn't giving. The worst case is a
badge that is late or short — a missed marketing beat, not a false price claim. This is
also why an older build that has never heard of `sale_starts_at` is fine: it runs on the
switch and the price gate alone, so it starts badging the moment the store price
actually drops.

**If you want the badge to track the discount tightly**, inset the window rather than
matching the store's nominal dates: start it after the discount is live in your
last territory, end it before it lapses in your first. The price gate covers you either
way — insetting just means the badge is up for all of the window rather than most of it.

**Both fields are instants, not dates.** `2026-08-14T23:59:59Z` and
`2026-08-15T00:59:59+01:00` are the same moment and both fine. A bare `2026-08-14` is
rejected precisely because it is a different instant in Auckland than in Los Angeles.
The end date is then formatted back into each user's own local date for display, so
everyone reads a correct date for where they are — an Australian may correctly see
"Offer ends 15 August" for a window that closes on the 14th in UTC.

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

> **Which builds honour which field.** `sale_ends_at` shipped in Android 1.11.0 (31)
> and iOS 1.3.0 (9), so a scheduled end works on both stores today.
> **`sale_starts_at` has not shipped yet** — it is newer than both, and until a release
> carries it, every install ignores it.
>
> That is not a reason to leave it out of a document you publish now. An install that
> ignores the start date runs the sale on the switch and the price gate alone, so it
> starts badging the moment the store actually drops the price — which is the behaviour
> the start date is approximating anyway. See
> [Timezones](#timezones-and-why-the-two-windows-can-disagree).
>
> The same holds for users who simply haven't updated. `sale_active` is the one control
> every install honours, so flipping it `false` remains the way to stop a sale
> everywhere at once. Treat the dates as the belt and the switch as the braces.

---

## Field reference

| Field | Required | Notes |
|---|---|---|
| `schema_version` | **Yes** | Must be exactly `1`. Any other value → the whole document is discarded and no badge shows |
| `sale_active` | No | `true` to allow the badge, `false` (or omitted) to suppress it everywhere |
| `sale_starts_at` | No | RFC 3339 instant with an explicit offset. Absent/`null`/`""` → already started. Unreadable → **no badge**. Never displayed. See [Scheduling the window](#scheduling-the-window) |
| `sale_ends_at` | No | RFC 3339 instant with an explicit offset. Absent/`null`/`""` → no end date. Unreadable → **no badge**. Must be after `sale_starts_at`. See [Scheduling the window](#scheduling-the-window) |
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
- **A start date is the one date that can go wrong early.** An unreadable
  `sale_ends_at` costs you a badge; an unreadable `sale_starts_at` would, if it read as
  absent, put one up before the sale. Both suppress instead — but that is why neither
  is forgiving.
- **A malformed `sale_ends_at` or `sale_starts_at` kills the badge outright** — it does not fall back to
  "no end date". This is deliberate, and the opposite of how every other field
  behaves. If a sale silently fails to appear, check this field first.
- **Both dates need a timezone.** `"2026-08-14"` is rejected, not assumed to mean
  midnight anywhere.
- **The store's window and this one need not match.** They can't, across 26 hours of
  offsets — and they don't have to, because the price gate decides. See
  [Timezones](#timezones-and-why-the-two-windows-can-disagree).
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
  "no sale", with no error surface anywhere. Always run `tools/check-pricing.mjs`;
  `jq .` only proves the JSON parses, which is the one kind of mistake the apps
  already tolerate.
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
- [ ] If `sale_starts_at` is set: same format, and it is **before** the end. Remember no
      shipped build honours it yet — those installs badge as soon as the store price
      drops.
- [ ] Every price is a **quoted string**, and is the **regular** price.
- [ ] Every currency code is three letters and matches the storefronts you care about.
- [ ] `node tools/check-pricing.mjs` passes — it applies every rule on this page,
      including the ones `jq` cannot see (an unquoted price, a four-letter code, a
      zone-less date). Add `--expect GBP,USD,CAD,…` to also require a baseline for
      each storefront you sell in.
- [ ] After Pages redeploys, the same check against the live document:
      `node tools/check-pricing.mjs --live`.
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
already-shipped build discard the document, so prefer adding fields. `sale_starts_at`
and `sale_ends_at`
was added exactly that way, without a bump.

The same fail-closed, cache-first pattern powers `announcements.json` (see
[ANNOUNCEMENTS.md](ANNOUNCEMENTS.md)) and `endpoints.json` — but on a 6-hour cadence.
This document alone refreshes per price display, deliberately: see
[How long until users see it](#how-long-until-users-see-it).
