# Data flow — how one number ends up on the map

Worked example: the gasoline price for **Germany (DE)** in the production dataset. Follow this through end to end and you'll have a mental model for every other metric.

## 1. Upstream

The European Commission publishes the *Weekly Oil Bulletin* as an XLSX file behind a stable CloudFront-fronted URL. The file is licensed under Commission Decision 2011/833/EU (CC BY 4.0), can be redistributed, and is updated every Monday.

```
GET https://energy.ec.europa.eu/document/download/264c2d0f-...

↳ Weekly Oil Bulletin Weekly prices with Taxes - YYYY-MM-DD.xlsx  (~14 KB)
```

## 2. Fetch

At 06:25 UTC, `scripts/generateData.js` runs inside a GitHub Actions job. The `loadFuel()` function fetches the XLSX as a byte buffer, feeds it to SheetJS (`xlsx`), and materialises the first sheet as a row array.

The raw buffer is **kept in memory** inside the runner but never persisted — because the EU publishes a stable URL, replaying the same upstream snapshot means downloading it again. (Paid sources with unstable URLs get their raw responses archived; see ADR-0004 and `docs/paid-upgrades.md`.)

## 3. Parse

Germany sits in the EU27 table. The row looks like:

```
["Germany", 2134, 2286, 1236.3, null, null, 1038.6]
             ^^^^  ^^^^                       ^^^^
          gasoline diesel                      LPG
      (EUR per 1000 L)
```

The normalizer divides the first three numeric columns by 1000 to get EUR/L, then converts to USD with a live rate pulled from `open.er-api.com` (fallback: `1 EUR = 1.08 USD`). Germany becomes:

```js
{
  iso2: 'DE',
  gasoline: 2.46,   // 2134/1000 × 1.1527
  diesel: 2.635,
  lpg: 1.197,
  source: 'EU Weekly Oil Bulletin',
}
```

## 4. Merge

`main()` inside `generateData.js` is a fan-out + reduce:

1. It runs every `loadXxx()` function in parallel (one per upstream source).
2. Each one returns an ISO2-keyed record.
3. `main()` walks the union of all ISO2 keys and stitches a single `Country` object per code:

```js
{
  id: 'DE',
  iso3: 'DEU',
  name: 'Germany',
  lat: 51.17,
  lng: 10.45,
  fuel:        { gasoline: 2.46, diesel: 2.64, lpg: 1.20, source: '…' },
  electricity: { household_usd_per_kwh: 0.403, year: 2025, period: '2025-S1', source: 'Eurostat …' },
  ev:          { home_usd_per_100km: 7.25, public_fast_usd_per_100km: 11.60, assumptions: {…} },
  co2:         { year: 2023, tonnes_per_capita: 8.09, history: [...], source: '…' },
  gridCO2:     { gco2_per_kwh: 383, year: 2023, source: '…' },
  worldBank:   { gdp_per_capita_usd: {…}, life_expectancy_years: {…}, … },
}
```

If a source is missing for a country the field is `null`, never a fake default. The UI renders `—` for missing values.

## 5. Validate

Before any file is written, the merged array is validated against `schemas/countries.schema.json` using AJV. If a field is the wrong type (e.g. a source returns a string where we expect a number), the build fails:

```
✗ schema validation failed:
  /countries/42/worldBank/gdp_per_capita_usd/value should be number, got "N/A"
```

The last-known-good dataset stays on GitHub Pages; the deploy does **not** ship broken data. (ADR-0007.)

## 6. Write

The validator passes. `main()` writes four files to `public/api/v1/`:

| File | What it is |
|---|---|
| `countries.json` | The full dataset, one record per country |
| `countries.geojson` | Natural Earth borders, passed through unchanged |
| `health.json` | Freshness + row counts per source (for status dashboards) |
| `trips/*.json` + `trips/index.json` | Pre-computed routes for the 3 built-in presets |

## 7. Deploy

Vite builds the SPA into `dist/` and copies `public/api/v1/` into `dist/api/v1/`. The `actions/deploy-pages` step uploads `dist/` as a Pages artifact and atomically swaps it into the live site.

```
GitHub Pages URL:
https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/countries.json
```

## 8. Consume

From here there are three consumers, all of which talk to the same endpoint:

1. **The SPA** fetches `countries.json` once on page load and holds it in React state. Every view (Explore, Compare, Trip) is a different projection of that same object.
2. **The client libraries** (`libraries/typescript`, `libraries/python`, `libraries/go`, `libraries/flutter`, `libraries/csharp`) each expose `getCountry('DE')` as a one-line call that wraps the same HTTP GET.
3. **Raw API users** (curl, jq, notebooks, other sites) hit the JSON directly. No auth, no rate limit, no cookies.

---

**Key invariant**: steps 1 → 6 are a pure function of "the set of upstream URLs at timestamp T". Given the same inputs, the output is identical. That's what makes the pipeline easy to test, easy to replay, and easy to move off GitHub Actions onto a proper workflow engine when the load demands it.
