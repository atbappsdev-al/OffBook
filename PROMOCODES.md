# Promo codes — publishing guide

`k9x2mq.json` in this repo is the **live list of promo codes** — printed flyers,
email, partners, cast and crew, wherever you hand a code out. Editing it changes
which code words work in the Android app. **No app update or store release is
needed.**

Served from GitHub Pages at:

```
https://atbappsdev-al.github.io/OffBook/k9x2mq.json
```

> **This repo is public.** The filename is deliberately not descriptive, which
> keeps it out of a casual guess at the site's URLs — but it is **not a secret**.
> Anyone who lists this repo can see it, and the file itself is plain readable
> JSON. That is fine: codes are handed out to strangers by design, and every one
> of them still has to survive Play's own check against a live offer. Don't put
> anything in here you wouldn't publish.

Android only. iOS uses the App Store's own offer-code redemption sheet, which is
configured in App Store Connect and does not read this file.

---

## How it fits together

Every code buys the **same product** — `offbook_pro`, the ordinary Pro unlock.
What a code changes is the price, by selecting one of the **Discount Offers**
attached to that product's Buy purchase option in Play Console. Each offer has a
tag; the code names the tag.

Several offers can be live at once, one per running campaign. The app asks Play
for all of them and picks the one whose tag matches. It never falls back to
another offer or to the base price — a code that named something Play didn't
return is reported as expired, not quietly charged at a different rate.

## How to run a campaign

1. **In Play Console**, add a Discount Offer to `offbook_pro`'s Buy purchase
   option with a unique offer tag, and activate it. Note the tag exactly.
2. Add an entry to the `codes` array in `k9x2mq.json` naming that tag.
3. Commit. GitHub Pages redeploys in a minute or two.

`k9x2mq.example.json` shows all four shapes an entry can take. No app reads it.

```json
{
  "schema_version": 1,
  "product_id": "offbook_pro",
  "codes": [
    { "word": "CARDIFFDRAMA", "offer_tag": "cardiffdrama",
      "expires": "2026-12-30T23:59:59Z", "active": true }
  ]
}
```

## How long until a code works

Apps refresh this file passively every six hours, the same cadence as
`announcements.json`. **But you don't have to wait for that**: when someone
submits a code the app doesn't recognise, it forces one immediate fetch that
ignores the six-hour window and checks again. A code published five minutes ago
works five minutes ago.

## Field reference

| Field | Required | Notes |
|---|---|---|
| `product_id` | yes, top level | Must be `offbook_pro`. It sits once at the top of the document, not on each code. Anything else and the app discards the whole file. |
| `word` | yes | The code as published. Case and internal spaces don't matter — the app trims, uppercases and strips spaces on both sides of the comparison, so `cardiff drama` matches `CARDIFFDRAMA`. |
| `offer_tag` | yes | The tag of a live Discount Offer on `offbook_pro`. Matched **exactly, including case** — Play tags are case-sensitive, so unlike `word` this is only trimmed, never uppercased. |
| `label` | no | Badge text on the paywall while the code is applied, e.g. `20% off` or `Cast & crew`. Keep it under about 20 characters. Omit it and the app says "Offer applied". |
| `expires` | no | ISO 8601 UTC instant, e.g. `2026-12-30T23:59:59Z`. Omit for a code with no end date. |
| `active` | no | Defaults to `true`. Set `false` to switch a code off without deleting it. |

## The badge

While a code is applied, the paywall replaces its usual price block with the
offer's price and a small badge. `label` is what that badge says.

Write it to match what the user was told. If the flyer says 20% off, say
`20% off`. If it's a thank-you for the cast, say `Cast & crew`. Omit `label` and
it reads "Offer applied", which is true but says nothing.

The app deliberately does **not** work the percentage out from the two prices.
Store prices are rounded per storefront, so the same discount lands on 20% in one
currency and 21% in another — the app would contradict your printed material in
some countries only, and you'd never catch it in testing.

Whatever the badge says, the amount beside it is always Play's own price for the
offer.

## Give each campaign its own tag

`offer_tag` is what identifies a campaign, and it's what gets reported to
analytics when someone starts a redemption (`promo_code_redeem_started`). Two
campaigns sharing a tag are one number for ever.

Several codes *can* point at one tag when you genuinely mean one campaign — a
reprint with a different word, say. Just know you're choosing to merge them.

Don't reuse a `word` either: `CARDIFFDRAMA` next year should be
`CARDIFFDRAMA27`, pointing at that year's own offer.

Nothing the user types is ever reported. A mistyped code reports that it failed
and nothing else.

## Ending a campaign

Set `"active": false`, or let `expires` pass. Prefer leaving the entry in place
over deleting it — it's the record of what went out, and a dead entry costs
nothing.

Ending or deactivating the offer in Play Console works too and needs no edit
here: the app asks Play for the offer before it will confirm anything, so a code
whose offer is gone reports "expired or not available in your region" and stops.

## Traps worth remembering

- **The price never comes from this file, and there is no field for it.** The
  amount the user sees is Play's own price for the matched offer in their
  storefront.
- **`offer_tag` is case-sensitive.** `CardiffDrama` and `cardiffdrama` are
  different tags. Copy it from Console rather than retyping it.
- **A broken entry is dropped silently.** An unparseable `expires`, a missing
  `word`, a missing `offer_tag` — that entry vanishes and the rest of the file
  still works. Nothing tells you; check your change on a device.
- **A broken *file* disables every code.** Malformed JSON, a `schema_version`
  that isn't `1`, or a `product_id` that isn't `offbook_pro`, all resolve to an
  empty list. Every code then reads as "we don't recognise that code". Validate
  before you commit: `python3 -m json.tool k9x2mq.json > /dev/null`
- **A wrong `expires` runs long, not short.** It's a UTC instant, so
  `2026-12-30T23:59:59Z` is late morning on the 31st in New Zealand.
- **Users who already have Pro never see the code field at all**, so a code can't
  be used to "upgrade" an existing purchase.

## Pre-publish checklist

- [ ] The Discount Offer exists on `offbook_pro`, is **active**, and is available
      in the countries the campaign is running in
- [ ] `offer_tag` matches the Console tag exactly, including case
- [ ] `offer_tag` hasn't been used by a previous campaign
- [ ] `word` matches what you published exactly (spelling, not case)
- [ ] `word` hasn't been used by a previous campaign
- [ ] `label` says what the user should see on the paywall badge
- [ ] `expires` is after the last day of the run
- [ ] The file is valid JSON
- [ ] Tested on a device: type the code, confirm the discounted price appears
