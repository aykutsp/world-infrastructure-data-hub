# Paid upgrade paths

The shipped pipeline uses **only free, open-licensed sources**. A team that wants to take this project further can swap individual feeds for commercial alternatives without touching the UI. This document is the reference for those swaps: per metric, what we use today, what the paid alternative is, what it costs, what breaks, and which loader file you would edit.

The motivation and policy sit in [ADR-0005 — Free-data-first, with documented paid upgrade paths](./architecture/adr/0005-free-data-first-with-paid-upgrade-paths.md).

---

## How this doc is organised

For each data family the format is:

- **Current free source** — what we ship.
- **Paid upgrade** — the realistic commercial alternative.
- **What you get** — freshness, granularity, coverage, licence.
- **Cost** — rough, as of early 2026. Always check with the vendor.
- **Effort** — engineer-days to integrate.
- **Where to plug it in** — exact function or file.

---

## 1. Fuel prices (gasoline, diesel, LPG)

**Current free source**
- **EU Weekly Oil Bulletin** (CC BY 4.0, weekly, EU27 only, 3 fuels).
- **World Bank Global Fuel Prices Database** (ODbL, monthly, ~140 countries, last update April 2025 — starts going stale).
- **National government feeds** for FR, IT, ES, UK, US (daily, station-level or national average, each with its own licence).
- Loader: `scripts/generateData.js` → `loadFuel()`.

**Paid upgrade — GlobalPetrolPrices.com API**
- **What you get**: weekly national averages for ~170 countries, gasoline + diesel + LPG. Real-time once a week. Licence allows redistribution *only to licensed clients of yours*, not to the public — so if you publish the data to a public endpoint you need a "re-distribution" tier, not the standard data licence.
- **Cost**: ~ €600-1200 / year for the standard licence, ~ €3000+ for a redistribution licence. Quote-based.
- **Effort**: ~1 day. Replace the `loadFuel()` body with a single HTTPS fetch against their API, map ISO codes, done.
- **Where to plug it in**: `scripts/generateData.js` → replace `loadFuel()`. Keep the EU Bulletin as a secondary source for divergence checks.

**Paid upgrade — S&P Global Platts**
- **What you get**: intraday benchmark prices plus per-country retail. The industry gold standard.
- **Cost**: enterprise, starts in the low five figures per year.
- **Effort**: ~3 days + legal review.
- **When it's worth it**: if you have commercial customers who need freshness below a week.

---

## 2. Electricity prices (household)

**Current free source**
- **Eurostat `nrg_pc_204`** (CC BY 4.0, semi-annual, 39 EU/EEA/candidate countries) — live pull.
- **Static fallback table** for ~50 non-EU countries seeded from publicly-cited IEA / WB / GlobalPetrolPrices figures. Clearly marked in the `source` field.
- Loader: `scripts/generateData.js` → `loadElectricity()`.

**Paid upgrade — IEA Energy Prices data product**
- **What you get**: quarterly household + industrial prices for ~40 OECD countries, long historical series back to 1978, native `.csv` / `.xlsx` exports.
- **Cost**: €1500-3000 / year depending on redistribution rights.
- **Effort**: ~0.5 days. The schema is close to what we already parse for Eurostat.
- **Where to plug it in**: `scripts/generateData.js` → extend `loadElectricity()` with an `IEA_API_KEY` branch. Keep the Eurostat path as the EU primary, IEA as the global primary.

**Paid upgrade — GlobalPetrolPrices.com electricity prices**
- **What you get**: residential and commercial prices for ~150 countries, weekly. Same licensing situation as the fuel product.
- **Cost**: similar to the fuel product above.
- **Effort**: ~0.5 days, identical loader pattern.
- **When it's worth it**: when you need the static fallback table gone. This replaces it in one call.

**Paid upgrade — Ember Climate licensed data**
- **What you get**: Ember's raw hourly wholesale-price dataset is open, but their *retail* product is behind a commercial agreement for non-academic use.
- **Cost**: negotiated, academic pricing usually free.
- **Effort**: 1-2 days.

---

## 3. EV charging cost

**Current source**
- **Derived**, not fetched. `ev.home_usd_per_100km = electricity × 18 kWh/100 km`; public fast charge = home × 1.6 markup.
- Loader: `scripts/generateData.js` → `deriveEvCharging()`.

**Paid upgrade — real fast-charging tariff feeds**
- **Chargemap Pass API** (EU focus): ~ €300-600 / year, per-network tariffs including roaming surcharges.
- **Ionity / Fastned direct APIs** (via commercial agreement): typically free for B2B partnerships, closed for public mirroring.
- **PlugShare commercial data licence**: US-focused, negotiated.

**What you get**: real DC fast-charge prices by network, updated as the operators change them. Replaces the 1.6× heuristic with actual numbers.

**Effort**: ~2-3 days for a single provider; more if you want to merge multiple tariff feeds into a single "typical fast charge" number. The model in `src/components/Trip/TripCalculator.tsx` (`FAST_CHARGER_MARKUP`) becomes a per-country override.

**Where to plug it in**: new loader `loadEvTariffs()` alongside `deriveEvCharging()`. If the new loader has a value, use it; otherwise fall back to the derived one.

---

## 4. Routing (OSRM)

**Current free source**
- **OSRM public demo server** (`router.project-osrm.org`). Community-run, best-effort, explicit fair-use disclaimer. Fine at tens of concurrent users.

**Paid upgrade — self-hosted OSRM**
- **What you get**: your own servers, your own SLA, no third-party rate limit.
- **Cost**: 3 × `c7g.xlarge` EC2 ≈ $330 / month (see scaling section in root README).
- **Effort**: ~2 days to get a stable deploy; data pre-processing for a full-planet OSM graph takes several hours.
- **Where to plug it in**: `src/components/Trip/TripCalculator.tsx` → replace the hardcoded OSRM base URL with `import.meta.env.VITE_ROUTING_BASE_URL`.

**Paid upgrade — Mapbox Directions API**
- **Cost**: $0.50 per 1000 requests above the free tier (100k/month).
- **Effort**: ~0.5 days. The Mapbox Directions response shape is close to OSRM but not identical — we'd adapt the `route.geometry.coordinates` parser.
- **When it's worth it**: faster worldwide coverage than the public OSRM demo, no self-hosted servers, per-use pricing.

**Paid upgrade — HERE Routing**
- **Cost**: similar to Mapbox, quote-based for enterprise.
- **Effort**: ~1 day (different response shape).

**Paid upgrade — TomTom Routing**
- **Cost**: free tier up to 2500 req/day, then ~$0.50 / 1000.
- **Effort**: ~1 day.

---

## 5. Geocoding (Nominatim)

**Current free source**
- **Nominatim public instance**, OpenStreetMap Foundation. Explicit fair-use limit of 1 request per second.

**Paid upgrade — self-hosted Nominatim**
- **Cost**: 1 × `r6g.2xlarge` + 1 TB EBS ≈ $340 / month. One-time ~2h to load the planet.
- **Effort**: ~1 day including data load.

**Paid upgrade — Mapbox Geocoding API**
- **Cost**: $0.75 per 1000 requests above the free tier.
- **Effort**: ~2 hours. Response shape is similar, we only use `display_name` and `{lat,lon}`.

**Paid upgrade — Google Geocoding API**
- **Cost**: $5 per 1000 requests, no free tier for commercial use.
- **Effort**: ~2 hours.
- **When it's worth it**: if address-level accuracy matters (Google is noticeably better than Nominatim for fuzzy street addresses).

**Paid upgrade — Pelias (OpenAddresses + OpenStreetMap, self-hosted)**
- **Cost**: infrastructure only.
- **Effort**: ~2-3 days.
- **When it's worth it**: if you need high volume and already run Elasticsearch.

---

## 6. CO₂ per capita

**Current free source**
- **Our World in Data — owid-co2-data.csv** (CC BY 4.0, yearly, ~180 countries, backed by the Global Carbon Budget).
- Loader: `scripts/generateData.js` → `loadCO2()`.

**Paid upgrade**
- There isn't really a meaningful paid upgrade here. The Global Carbon Budget is the canonical source and it's already open. Commercial products repackage it.
- If you want *hourly* emissions intensity specifically, see the next section.

---

## 7. Grid CO₂ intensity

**Current free source**
- **Our World in Data — owid-energy-data.csv** (`carbon_intensity_elec` column, yearly, CC BY 4.0). Covers ~170 countries.
- Loader: `scripts/generateData.js` → `loadGridCO2Intensity()`.

**Paid upgrade — Electricity Maps API (formerly electricityMap)**
- **What you get**: real-time hourly grid carbon intensity for 70+ countries and sub-national regions (bidding zones). Includes forecasts.
- **Cost**: free tier for non-commercial + low-volume, $495/month for the Commercial tier, enterprise above that.
- **Effort**: ~1 day for the basic "latest per zone" pull; ~2-3 days if you want the hourly history.
- **Where to plug it in**: extend `loadGridCO2Intensity()` with an `ELECTRICITY_MAPS_KEY` branch. Schema fits naturally alongside the existing yearly value.

**Paid upgrade — Ember live data**
- Free CSV for historical; commercial licence for live feeds and bulk access.
- Cost: negotiated, usually €2k+ / year.

---

## 8. World Bank indicators (GDP / life / internet / …)

**Current free source**
- **World Bank Open Data Indicators API** (CC BY 4.0, free, ~167 countries per indicator, annual).
- Loader: `scripts/generateData.js` → `loadWorldBankIndicators()`.

**Paid upgrade — IMF, OECD, UN specialised datasets**
- For most of these indicators there is no commercial upgrade that justifies the cost. The World Bank is already the aggregator other products quote.
- Exception: **Oxford Economics**, **Moody's Analytics**, **Bloomberg** — high-frequency GDP nowcasts and proprietary inflation indices. Cost: low five figures / year minimum. Effort: ~1 week including licence review.
- Most upgrades here are overkill unless you are specifically building a financial product.

---

## 9. Country borders (GeoJSON)

**Current free source**
- **Natural Earth 110m admin_0 countries**, public domain (CC0).

**Paid upgrade**
- You almost never need to upgrade this. If you do, the practical options are:
  - **Natural Earth 50m / 10m** — still CC0, just higher resolution. No cost, larger file size.
  - **Mapbox Boundaries** — licensed, quote-based. Only worth it if you need daily updates or disputed-territory nuance.
  - **HERE / TomTom administrative layers** — same.

---

## 10. Charging station POIs

**Current free source**
- **OpenChargeMap** free tier (requires a free API key). Optional in the pipeline — skips silently if `OPENCHARGEMAP_KEY` isn't set.
- Loader: `scripts/generateData.js` → `loadChargingStationCounts()`.

**Paid upgrade — EV Connect / Chargemap Pass / Recargo Plugshare Commercial**
- **What you get**: real-time station status, pricing, reservations.
- **Cost**: $200-2000+ / month depending on volume and country mix.
- **Effort**: ~2-3 days per provider; more if you want to merge multiple.

---

## Configuring the pipeline for a paid deployment

Every paid integration follows the same pattern:

1. Put the API key into GitHub Secrets (`Settings → Secrets → Actions`), never into the source tree.
2. Expose it to the build by adding an `env:` block to the `Generate dataset` step in `.github/workflows/deploy.yml`:

   ```yaml
   - name: Generate dataset
     env:
       OPENCHARGEMAP_KEY: ${{ secrets.OPENCHARGEMAP_KEY }}
       ELECTRICITY_MAPS_KEY: ${{ secrets.ELECTRICITY_MAPS_KEY }}
       IEA_API_KEY: ${{ secrets.IEA_API_KEY }}
     run: npm run generate-data
   ```

3. Make the corresponding loader in `scripts/generateData.js` check for the variable and skip gracefully if it isn't set. Every paid loader must fall through to the free default — this is non-negotiable so that forks still build.

4. Update `docs/paid-upgrades.md` (this file) with a one-line note about the newly integrated provider.

5. If the paid feed has a redistribution licence that forbids public mirroring, add a comment in the output JSON's `source` field saying so, and **disable the public cache** for the affected endpoint.

---

## What counts as "free" vs "paid" in this project

For the purpose of this doc:

- **Free** means: anyone can `curl` it without registration, or with at most a free-of-charge API key that anyone can self-serve. CC BY, ODbL, CC0, Etalab OL, Open Government Licence, public domain.
- **Paid** means: money changes hands, or the licence requires a signed contract, or redistribution is prohibited.

If a source is "free with registration" we default to using it *optionally* (like OpenChargeMap), so that the core build has no barrier at all.
