# Flyer promo codes — publishing guide

`k9x2mq.json` in this repo is the **live list of flyer promo codes**. Editing it
changes which code words work in the Android app. **No app update or store release
is needed.**

Served from GitHub Pages at:

```
https://atbappsdev-al.github.io/OffBook/k9x2mq.json
```

> **This repo is public.** The filename is deliberately not descriptive, which
> keeps it out of a casual guess at the site's URLs — but it is **not a secret**.
> Anyone who lists this repo can see it, and the file itself is plain readable
> JSON. That is fine: the codes are printed on flyers handed to strangers, and
> every one of them still has to survive Play's own check against a live product.
> Don't put anything in here you wouldn't publish.

Android only. iOS uses the App Store's own offer-code redemption sheet, which is
configured in App Store Connect and does not read this file.

---

## How to run a campaign

1. **Create the Play product first**, if the discount level you want doesn't exist
   yet. Campaign products are `offbook_pro_20`, `offbook_pro_30`, and so on — one
   per discount level, reused by every campaign at that level.
2. Add an entry to the `codes` array in `k9x2mq.json`.
3. Commit. GitHub Pages redeploys in a minute or two.

`k9x2mq.example.json` shows all four shapes an entry can take. No app reads it.

```json
{
  "schema_version": 1,
  "codes": [
    { "word": "CARDIFFDRAMA", "product_id": "offbook_pro_20",
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
| `word` | yes | The code as printed. Case and internal spaces don't matter — the app trims, uppercases and strips spaces on both sides of the comparison, so `cardiff drama` matches `CARDIFFDRAMA`. Also the campaign's name in analytics — see below. |
| `product_id` | yes | The Play product this code buys. Must be `offbook_pro` or start with `offbook_pro_`; anything else is refused by the app. May be hoisted to the top level as a default for entries that omit it. |
| `expires` | no | ISO 8601 UTC instant, e.g. `2026-12-30T23:59:59Z`. Omit for a code with no end date. |
| `active` | no | Defaults to `true`. Set `false` to switch a code off without deleting it. |

## Give each flyer run its own word

Several campaigns share one `product_id` — `offbook_pro_20` is every 20%-off run
there has ever been — so the product can't tell one flyer from another. The
**word** is what identifies the campaign, and it's what gets reported to analytics
when someone starts a redemption (`promo_code_redeem_started`).

So don't reprint `CARDIFFDRAMA` for next year's festival: use `CARDIFFDRAMA27`.
Reusing a word merges the two runs into one number and you'll never be able to
separate them again.

Nothing the user types is ever reported — only the word as published here, and
only once it has matched. A mistyped code reports that it failed and nothing else.

## Ending a campaign

Set `"active": false`, or let `expires` pass. Prefer leaving the entry in place
over deleting it — it's the record of what was printed, and a dead entry costs
nothing.

Ending the campaign in Play Console works too, and needs no edit here: the app
asks Play for the product's price before it will confirm anything, so a code
pointing at a product Play won't sell reports "expired or not available in your
region" and stops.

## Traps worth remembering

- **The price never comes from this file, and there is no field for it.** The
  amount the user sees is Play's own price for `product_id` in their storefront.
  That's the whole reason a wrong `product_id` is refused rather than tried.
- **A broken entry is dropped silently.** An unparseable `expires`, a missing
  `word`, an unrecognised `product_id` — that entry vanishes and the rest of the
  file still works. Nothing tells you; check your change on a device.
- **A broken *file* disables every code.** Malformed JSON, or a `schema_version`
  that isn't `1`, resolves to an empty list. Every code then reads as "we don't
  recognise that code". Validate before you commit:
  `python3 -m json.tool k9x2mq.json > /dev/null`
- **A wrong `expires` runs long, not short.** It's a UTC instant, so
  `2026-12-30T23:59:59Z` is late morning on the 31st in New Zealand.
- **Users who already have Pro never see the code field at all**, so a code can't
  be used to "upgrade" an existing purchase.

## Pre-publish checklist

- [ ] The `product_id` exists in Play Console, is **active**, and is available in
      the countries the flyers are going to
- [ ] `word` matches the printed flyer exactly (spelling, not case)
- [ ] `word` hasn't been used by a previous campaign
- [ ] `expires` is after the last day of the run
- [ ] The file is valid JSON
- [ ] Tested on a device: type the code, confirm the discounted price appears
