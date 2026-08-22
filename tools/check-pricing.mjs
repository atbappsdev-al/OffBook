#!/usr/bin/env node
//
// Validates pricing.json the way the two apps actually read it, and says which
// storefronts would badge. Run it before you push — see PRICING.md.
//
//   node tools/check-pricing.mjs                      # the local file
//   node tools/check-pricing.mjs --live               # the published document
//   node tools/check-pricing.mjs --expect AUD,EUR,GBP # ...and require these
//
// Why this exists: every mistake in this document fails CLOSED, so a broken
// file and a quiet week look identical — no badge, no error, nothing to read.
// `jq .` proves the JSON parses, which is the one class of error the apps are
// already tolerant of. It cannot tell you that `"GBP": 4.99` was dropped for
// being unquoted, or that a currency you now sell in was never listed.
//
// The rules below are ported from ProPricingParser.swift / ProPricingParser.kt.
// If you change the schema, change this too.

const LIVE_URL = 'https://atbappsdev-al.github.io/OffBook/pricing.json';
const SUPPORTED_SCHEMA_VERSION = 1;

const args = process.argv.slice(2);
const useLive = args.includes('--live');
// For the "sale_active stays true, the dates run each sale" way of working: in
// that model an unbounded window is not a running sale, it is a permanent one.
const requireEnd = args.includes('--require-end');
const expectFlag = args.indexOf('--expect');
const expected = expectFlag === -1
  ? []
  : (args[expectFlag + 1] ?? '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

const problems = [];
const warnings = [];
const notes = [];

/** Exactly three ASCII letters, as both parsers require. */
function currencyCode(raw) {
  const trimmed = String(raw).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : null;
}

/** The exact-decimal rule: digits, at most one '.', up to six decimal places. */
function exactDecimal(raw) {
  const text = String(raw).trim();
  if (!text) return null;
  const parts = text.split('.');
  if (parts.length > 2) return null;
  const [whole, fraction = ''] = parts;
  if (!whole || (parts.length === 2 && !fraction)) return null;
  if (fraction.length > 6) return null;
  const digits = whole + fraction;
  if (digits.length > 18 || !/^[0-9]+$/.test(digits)) return null;
  const value = Number(text);
  return value > 0 ? value : null;
}

function main(raw, origin) {
  console.log(`Reading ${origin}\n`);

  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (error) {
    fail(`not valid JSON — every app discards it and no badge shows anywhere.\n  ${error.message}`);
    return;
  }

  if (doc.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    problems.push(
      `schema_version is ${JSON.stringify(doc.schema_version)}, must be ${SUPPORTED_SCHEMA_VERSION}. ` +
      `The whole document is discarded, so nothing below matters.`
    );
  }

  // sale_active
  if ('sale_active' in doc && typeof doc.sale_active !== 'boolean') {
    problems.push(`sale_active is ${JSON.stringify(doc.sale_active)}; a non-boolean reads as false (no badge anywhere).`);
  }
  const saleActive = doc.sale_active === true;

  // sale_starts_at / sale_ends_at — the two fields where an unreadable value
  // CLOSES the badge rather than reading as absent.
  let windowOpen = true;

  /** null = absent (unbounded), Date = usable, false = published but unusable. */
  const bound = (field) => {
    if (!(field in doc) || doc[field] === null || doc[field] === '') return null;
    const raw = doc[field];
    if (typeof raw !== 'string') {
      problems.push(`${field} is ${JSON.stringify(raw)} (not a string) — this suppresses the badge entirely.`);
      return false;
    }
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(raw.trim()) || Number.isNaN(Date.parse(raw.trim()))) {
      problems.push(
        `${field} "${raw}" is not an RFC 3339 instant with an explicit offset ` +
        `(e.g. 2026-08-14T23:59:59Z) — this suppresses the badge entirely.`
      );
      return false;
    }
    return new Date(raw.trim());
  };

  const starts = bound('sale_starts_at');
  const ends = bound('sale_ends_at');
  if (starts === false || ends === false) windowOpen = false;

  const now = Date.now();
  if (starts instanceof Date && ends instanceof Date && starts.getTime() >= ends.getTime()) {
    problems.push(
      `sale_starts_at (${starts.toISOString()}) is not before sale_ends_at ` +
      `(${ends.toISOString()}) — nothing can fall inside that window, so the badge never shows.`
    );
    windowOpen = false;
  }
  if (starts instanceof Date) {
    if (starts.getTime() > now) {
      notes.push(`sale_starts_at (${starts.toISOString()}) is in the future — no badge until then.`);
      windowOpen = false;
    } else {
      notes.push(`Sale window opened ${starts.toISOString()}.`);
    }
  }
  if (ends instanceof Date) {
    if (ends.getTime() <= now) {
      notes.push(`sale_ends_at (${ends.toISOString()}) has already passed — no badge, whatever sale_active says.`);
      windowOpen = false;
    } else {
      notes.push(`Sale window ends ${ends.toISOString()}.`);
    }
  }

  // An open-ended live sale is the one shape that is fine in the apps and wrong
  // on the website. The apps also require the store price to be below baseline,
  // so their badge stops when the discount does. pro.html cannot check a price,
  // so its banner just stays up — and if a storefront's price later drifts below
  // baseline on its own (Apple re-adjusts for FX and tax), the apps start badging
  // a sale nobody ran.
  if (saleActive && !(ends instanceof Date)) {
    const message =
      'sale_active is true with no usable sale_ends_at. The website banner will run ' +
      'indefinitely, and any later price drift below baseline will badge as a sale. ' +
      'Set an end date, or set sale_active to false between sales.';
    if (requireEnd) problems.push(message);
    else warnings.push(message);
  }

  // baseline_prices
  const baselines = {};
  const rawBaselines = doc.baseline_prices;
  if (rawBaselines === undefined) {
    problems.push('baseline_prices is missing — no currency can ever badge.');
  } else if (rawBaselines === null || typeof rawBaselines !== 'object' || Array.isArray(rawBaselines)) {
    problems.push(`baseline_prices is ${JSON.stringify(rawBaselines)}, must be an object of currency code to price.`);
  } else {
    for (const [key, value] of Object.entries(rawBaselines)) {
      const code = currencyCode(key);
      if (!code) {
        problems.push(`baseline_prices key "${key}" is not a three-letter ISO 4217 code — silently dropped.`);
        continue;
      }
      if (typeof value === 'number') {
        // Whole numbers are exact in JSON; fractional ones can only arrive via a
        // float, which is the imprecision this document exists to avoid.
        if (!Number.isInteger(value) || value <= 0) {
          problems.push(
            `${code} is the unquoted number ${value} — silently dropped. ` +
            `Write it as a string: "${code}": "${value}".`
          );
          continue;
        }
        baselines[code] = value;
        continue;
      }
      if (typeof value !== 'string') {
        problems.push(`${code} is ${JSON.stringify(value)} — silently dropped. Write the price as a string.`);
        continue;
      }
      const parsed = exactDecimal(value);
      if (parsed === null) {
        problems.push(
          `${code} is "${value}", which is not a plain price — silently dropped. ` +
          `Digits and at most one "." (no currency symbol, comma, exponent or sign).`
        );
        continue;
      }
      baselines[code] = parsed;
    }
  }

  const published = Object.keys(baselines).sort();
  console.log(`sale_active:  ${saleActive}`);
  console.log(`baselines:    ${published.length ? published.map(c => `${c} ${baselines[c]}`).join(', ') : 'none'}`);
  for (const note of notes) console.log(`note:         ${note}`);
  for (const warning of warnings) console.log(`WARNING:      ${warning}`);

  for (const code of expected) {
    if (!currencyCode(code)) {
      problems.push(`--expect lists "${code}", which is not a three-letter currency code.`);
    } else if (!published.includes(code)) {
      problems.push(
        `${code} has no usable baseline, so that storefront can never show the badge — ` +
        `silently, for as long as it is missing.`
      );
    }
  }

  console.log('');
  if (problems.length) {
    console.log(`${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
    for (const problem of problems) console.log(`  ✗ ${problem}`);
    console.log('');
    process.exitCode = 1;
    return;
  }

  const badging = saleActive && windowOpen;
  console.log('✓ Document is valid.');
  if (badging) {
    console.log(
      `  A sale is live: any of ${published.join(', ')} whose store price is strictly ` +
      `below the figure above will badge.`
    );
  } else if (!saleActive) {
    console.log('  No badge anywhere: sale_active is false.');
  } else if (starts instanceof Date && starts.getTime() > now) {
    // Worth naming, because it is the one not-badging state that is a success.
    console.log(
      `  No badge yet: this is a scheduled sale waiting to start at ${starts.toISOString()}. ` +
      `Nothing to fix.`
    );
  } else {
    console.log('  No badge anywhere: the sale window is not open.');
  }
}

function fail(message) {
  console.log(`  ✗ ${message}`);
  process.exitCode = 1;
}

if (useLive) {
  const response = await fetch(`${LIVE_URL}?t=${Math.floor(Date.now() / 1000)}`, { cache: 'no-store' });
  if (!response.ok) {
    console.error(`Could not fetch ${LIVE_URL} — HTTP ${response.status}`);
    process.exit(1);
  }
  main(await response.text(), LIVE_URL);
} else {
  const { readFileSync } = await import('node:fs');
  const path = new URL('../pricing.json', import.meta.url);
  main(readFileSync(path, 'utf8'), 'pricing.json');
}
