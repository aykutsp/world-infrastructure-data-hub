<div align="center">

# 🌍 World Infrastructure Data Hub

### One map, 15 metrics, 170 countries. Fuel, electricity, EV charging, CO₂ and 8 World Bank indicators — refreshed daily from open government data.

**[🌐 Live Demo](https://aykutsp.github.io/world-infrastructure-data-hub/)** · **[📖 API Reference](#-open-data-api)** · **[📦 Client Libraries](#-client-libraries)** · **[🐛 Report Bug](https://github.com/aykutsp/world-infrastructure-data-hub/issues/new?template=bug_report.yml)** · **[💡 Request Feature](https://github.com/aykutsp/world-infrastructure-data-hub/issues/new?template=feature_request.yml)**

<br />

[![Deploy status](https://img.shields.io/github/actions/workflow/status/aykutsp/world-infrastructure-data-hub/deploy.yml?branch=main&style=flat-square&label=deploy&logo=githubactions&logoColor=white)](https://github.com/aykutsp/world-infrastructure-data-hub/actions/workflows/deploy.yml)
[![Latest release](https://img.shields.io/github/v/release/aykutsp/world-infrastructure-data-hub?style=flat-square&label=release&color=blue)](https://github.com/aykutsp/world-infrastructure-data-hub/releases/latest)
[![License: MIT](https://img.shields.io/github/license/aykutsp/world-infrastructure-data-hub?style=flat-square&color=green)](./LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/aykutsp/world-infrastructure-data-hub?style=flat-square&color=informational)](https://github.com/aykutsp/world-infrastructure-data-hub/commits/main)
[![Open issues](https://img.shields.io/github/issues/aykutsp/world-infrastructure-data-hub?style=flat-square)](https://github.com/aykutsp/world-infrastructure-data-hub/issues)
[![Repo stars](https://img.shields.io/github/stars/aykutsp/world-infrastructure-data-hub?style=flat-square&logo=github)](https://github.com/aykutsp/world-infrastructure-data-hub/stargazers)

[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=flat-square&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?style=flat-square&logo=python&logoColor=white)](./libraries/python)
[![Go](https://img.shields.io/badge/Go-1.21-00ADD8?style=flat-square&logo=go&logoColor=white)](./libraries/go)
[![Dart](https://img.shields.io/badge/Dart-3-0175C2?style=flat-square&logo=dart&logoColor=white)](./libraries/flutter)
[![.NET](https://img.shields.io/badge/.NET-8-512BD4?style=flat-square&logo=dotnet&logoColor=white)](./libraries/csharp)

[![Metrics](https://img.shields.io/badge/metrics-15-blueviolet?style=flat-square)](#-metrics--sources)
[![Countries](https://img.shields.io/badge/countries-170-orange?style=flat-square)](#-metrics--sources)
[![Data sources](https://img.shields.io/badge/data-9%20open%20sources-yellow?style=flat-square)](#-metrics--sources)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](./CONTRIBUTING.md)

</div>

---

An interactive world map for the real cost of *living* and *moving*: **retail fuel prices, household electricity prices, EV charging costs, CO₂ emissions and eight World Bank indicators** — all in one place, all from open government / inter-governmental sources, all refreshed on a daily cron.

## 📸 Screenshots

**Explore view — 15 metrics grouped into Cost / Energy / Society**

![Explore — gasoline prices worldwide](docs/screenshots/explore-gasoline.png)

**Grid CO₂ intensity** — new in v1.1, the carbon intensity of each country's electricity mix in gCO₂ per kWh:

![Explore — grid carbon intensity](docs/screenshots/explore-grid-co2.png)

**Compare view** — pick up to 5 countries and stack every metric side-by-side, with the best cell per row highlighted:

![Compare view](docs/screenshots/compare.png)

**Trip calculator** — routing via OSRM, five vehicle/fuel modes, up to 8 waypoints, per-refuel receipt:

![Trip calculator — Istanbul → Berlin](docs/screenshots/trip-istanbul-berlin.png)

**API Library** — click the button at the bottom of the sidebar for the full endpoint reference and copy-paste snippets in curl, JavaScript, Python, Go and PHP:

![API library modal](docs/screenshots/api-library.png)

## ✨ Features

- 🗺 **Unified choropleth world map** with 14 metrics grouped into **Cost**, **Energy** and **Society** tabs
- 🏷 **In-map country labels** with the selected metric shown per country, scaled to zoom
- 🆚 **Country Compare** — pick up to 5 countries and stack every metric side-by-side in a colour-coded table with "best" cells highlighted
- 🧭 **Trip calculator** — enter From / To (and up to 8 intermediate stops, or "current location"), pick your vehicle (**Gasoline, Diesel, LPG, EV home, EV fast**), hit Calculate. For fuel vehicles you get a real per-refuel receipt (tank topped up at 2 % reserve in whichever country you're in); for EVs you get a per-country electricity-cost breakdown with optional fast-charger markup.
- 🔌 **API Library modal** — one click away from copy-paste usage snippets in curl, JavaScript, Python, Go and PHP, plus a field reference for every key in the dataset.
- 📦 **Static open data endpoints** — `countries.json` (unified payload), `countries.geojson` (Natural Earth borders). Auth-free, rate-limit-free, refreshed daily.
- 🌓 Light / dark / system theme with matching CARTO tiles
- 🤖 **Self-updating** — a GitHub Actions cron job rebuilds and redeploys the site every morning

## 📊 Metrics & sources

| # | Metric | Group | Source | License |
|---|---|---|---|---|
| 1 | Gasoline (USD/L) | Cost | EU Weekly Oil Bulletin / World Bank Global Fuel Prices DB | CC BY 4.0 / ODbL |
| 2 | Diesel (USD/L) | Cost | same | same |
| 3 | LPG (USD/L) | Cost | same | same |
| 4 | Household electricity (USD/kWh) | Cost | **Eurostat nrg_pc_204 (live)** for EU/EEA, static fallback for rest | CC BY 4.0 |
| 5 | EV home charge (USD/100 km) | Cost | derived: electricity × 18 kWh/100 km | — |
| 6 | EV fast charge (USD/100 km) | Cost | derived: home × 1.6 fast-charger markup | — |
| 7 | CO₂ per capita (t/yr) | Energy | Our World in Data (Global Carbon Budget mirror) | CC BY 4.0 |
| 8 | Renewable electricity share (%) | Energy | World Bank EG.ELC.RNEW.ZS | CC BY 4.0 |
| 9 | GDP per capita (USD) | Society | World Bank NY.GDP.PCAP.CD | CC BY 4.0 |
| 10 | Life expectancy (years) | Society | World Bank SP.DYN.LE00.IN | CC BY 4.0 |
| 11 | Internet users (%) | Society | World Bank IT.NET.USER.ZS | CC BY 4.0 |
| 12 | Gini index | Society | World Bank SI.POV.GINI | CC BY 4.0 |
| 13 | Unemployment (%) | Society | World Bank SL.UEM.TOTL.ZS | CC BY 4.0 |
| 14 | Inflation (CPI, % yoy) | Society | World Bank FP.CPI.TOTL.ZG | CC BY 4.0 |
| — | Country borders | — | Natural Earth 110m admin_0 | CC0 |

All upstreams are fetched at build time by `scripts/generateData.js` and baked into `public/api/v1/countries.json`. The GitHub Actions workflow runs this daily, so the live site always reflects the most recent upstream numbers.

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 8 |
| Language | TypeScript 5 |
| Mapping | Leaflet + react-leaflet (GeoJSON choropleth + Polyline routes) |
| Routing | OSRM public demo server |
| Geocoding | Nominatim (OpenStreetMap) |
| Data pipeline | Node.js + SheetJS (`xlsx`) |
| Hosting | GitHub Pages (via GitHub Actions) |

## ⚙️ Installation

```bash
git clone https://github.com/aykutsp/world-infrastructure-data-hub.git
cd world-infrastructure-data-hub
npm install
```

## 🚀 Usage

```bash
npm run generate-data   # pull every upstream feed once (~30 s)
npm run dev             # local dev server
npm run build           # prod: regenerate data + typecheck + bundle
npm run preview         # smoke-test the built output
```

## 🔌 Open Data API

Base URL: `https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/`

| Endpoint | Description |
|---|---|
| [`countries.json`](https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/countries.json) | Unified dataset — 14 metrics per country |
| [`countries.geojson`](https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/countries.geojson) | Natural Earth borders (CC0) |

### Simplified JSON schema

```jsonc
{
  "lastUpdated": "2026-04-05T15:00:00.000Z",
  "sources": [ "EU Weekly Oil Bulletin — CC BY 4.0", "…" ],
  "coverage": { "fuel": 130, "electricity": 89, "ev": 89, "co2": 167, "worldBank": 167 },
  "countries": [
    {
      "id": "DE", "iso3": "DEU", "name": "Germany", "lat": 51.17, "lng": 10.45,
      "fuel":        { "gasoline": 2.46, "diesel": 2.64, "lpg": 1.20, "source": "EU Weekly Oil Bulletin" },
      "electricity": { "household_usd_per_kwh": 0.403, "year": 2025, "period": "2025-S1", "source": "Eurostat nrg_pc_204 …" },
      "ev":          { "home_usd_per_100km": 7.25, "public_fast_usd_per_100km": 11.60, "assumptions": {...} },
      "co2":         { "year": 2023, "tonnes_per_capita": 8.09, "total_million_tonnes": 673.22, "source": "OWID/GCB" },
      "worldBank": {
        "gdp_per_capita_usd":        { "value": 54290, "year": 2023, "source": "World Bank" },
        "life_expectancy_years":     { "value": 80.7,  "year": 2022, "source": "World Bank" },
        "internet_users_pct":        { "value": 91.8,  "year": 2023, "source": "World Bank" },
        "renewable_electricity_pct": { "value": 51.2,  "year": 2022, "source": "World Bank" },
        "gini_index":                { "value": 31.9,  "year": 2020, "source": "World Bank" },
        "unemployment_pct":          { "value": 3.1,   "year": 2024, "source": "World Bank" },
        "inflation_pct":             { "value": 5.9,   "year": 2023, "source": "World Bank" },
        "population":                { "value": 83300000, "year": 2023, "source": "World Bank" }
      }
    }
  ]
}
```

### Usage examples

**curl + jq** — top 10 cheapest gasoline markets:

```bash
curl -s https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/countries.json \
  | jq -r '.countries
      | map(select(.fuel and .fuel.gasoline != null))
      | sort_by(.fuel.gasoline)
      | .[:10]
      | .[] | "\(.id)\t\(.fuel.gasoline)\t\(.name)"'
```

**JavaScript / TypeScript**:

```ts
const { countries } = await fetch(
  'https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/countries.json'
).then((r) => r.json());

const de = countries.find((c: any) => c.id === 'DE');
console.log(`${de.name}: fuel $${de.fuel?.gasoline}/L, electricity $${de.electricity?.household_usd_per_kwh}/kWh, CO₂ ${de.co2?.tonnes_per_capita} t/cap`);
```

**Python**:

```python
import urllib.request, json

with urllib.request.urlopen("https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/countries.json") as r:
    data = json.load(r)

# Top 10 countries by life expectancy
by_life = sorted(
    (c for c in data["countries"]
     if c["worldBank"] and c["worldBank"].get("life_expectancy_years")),
    key=lambda c: c["worldBank"]["life_expectancy_years"]["value"],
    reverse=True,
)
for c in by_life[:10]:
    v = c["worldBank"]["life_expectancy_years"]
    print(f"{c['id']}\t{v['value']:.1f} yrs ({v['year']})\t{c['name']}")
```

**Go, PHP, Rust, C#** — all work exactly the same way. Click the **API Library** button at the bottom of the live sidebar for ready-to-copy snippets.

## 📁 Project Structure

```
.
├── .github/workflows/deploy.yml     # Daily data refresh + GitHub Pages deploy
├── public/api/v1/                   # Generated dataset (built in CI)
├── scripts/generateData.js          # Unified pipeline (fuel + electricity + EV + CO2 + WB)
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── Sidebar.tsx          # Explore / Compare / Trip views + API Library button
│   │   │   └── ApiLibraryModal.tsx  # Modal with API reference + snippets
│   │   ├── Map/InfraMap.tsx         # Choropleth + labels + route polyline
│   │   └── Trip/TripCalculator.tsx  # Multi-fuel + EV cost model
│   ├── types.ts                     # Country / Dataset / DatasetSpec / Trip types
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.ts
```

## 🏗 System design: scaling to 1M+ users

The live site currently runs as a static bundle on GitHub Pages with a daily-refreshed dataset — a setup that comfortably handles a few tens of thousands of monthly visitors. This section walks through what the architecture looks like today, where the bottlenecks are, and the concrete plan for taking the same experience to **1 million monthly active users and beyond**.

### Today's architecture

```
                            ┌────────────────────────────┐
                            │  9 upstream open-data APIs │
                            │  (EC, Eurostat, WB, OWID,  │
                            │   OCM, Natural Earth …)    │
                            └──────────────┬─────────────┘
                                           │  daily (06:25 UTC)
                                           ▼
                            ┌────────────────────────────┐
                            │  GitHub Actions cron       │
                            │  scripts/generateData.js   │
                            │  → countries.json          │
                            │  → trips/*.json            │
                            └──────────────┬─────────────┘
                                           │
                                           ▼
                            ┌────────────────────────────┐
                            │  GitHub Pages (CDN fronted)│
                            │  /api/v1/*  +  built site  │
                            └──────────────┬─────────────┘
                                           │
                     ┌─────────────────────┼──────────────────────┐
                     ▼                     ▼                      ▼
            ┌────────────────┐   ┌────────────────┐    ┌────────────────┐
            │ Browser SPA    │   │ Client library │    │ Raw API user   │
            │ (React+Leaflet)│   │ (npm/PyPI/Go…) │    │ (curl, jq, BI) │
            └────────────────┘   └────────────────┘    └────────────────┘
                     │
                     ├── Nominatim (public, 1 req/s)   ◀── geocoding
                     └── OSRM public demo             ◀── routing
```

A single request chain for the trip calculator looks like: **browser → Nominatim (2×) → OSRM → countries.json → client-side point-in-polygon → render**. Everything except the last two steps depends on third-party public services with strict rate limits.

### Bottlenecks at scale

| # | Layer | Soft ceiling | Fails at |
|---|---|---|---|
| 1 | **GitHub Pages bandwidth** | ~100 GB / month | ~200k daily page loads |
| 2 | **Nominatim public instance** | 1 req/s per IP, fair-use only | First trip calculator spike |
| 3 | **OSRM demo server** (`router.project-osrm.org`) | Community-run, best-effort only | Regular production use |
| 4 | **Dataset freshness** | Once per day | Use cases needing hourly updates |
| 5 | **Single CDN region** | GitHub Pages edges work but you can't purge/warm | Latency spikes outside US/EU |
| 6 | **Cold country boundary resolution** | Point-in-polygon runs in the browser against a 250 KB GeoJSON | CPU hit on low-end mobile |

### Target architecture for 1M+ MAU

```mermaid
flowchart TB
    subgraph Edge["Edge (global CDN)"]
        CDN["Cloudflare / Fastly<br/>15 min TTL · br + gzip"]
        WAF["WAF + rate limiter<br/>1000 req/min per IP"]
    end

    subgraph Static["Static dataset layer"]
        R2["Object storage (R2 / S3)<br/>countries.json<br/>countries/{ISO}.json<br/>trips/{slug}.json<br/>countries.geojson"]
        Versioned["Versioned keys<br/>v{timestamp}.json<br/>latest → atomic alias"]
    end

    subgraph Pipeline["Data pipeline"]
        Scheduler["Workflow engine<br/>Temporal / EventBridge"]
        Fetchers["Per-source workers<br/>EC · Eurostat · WB · OWID · EIA · OCM"]
        Normalizer["Normalize + merge<br/>schema validation · delta diff"]
        RawArchive["Raw response archive<br/>(immutable)"]
    end

    subgraph Dynamic["Dynamic services"]
        Geo["Geo-DNS router"]
        OSRMEU["Self-hosted OSRM<br/>EU-Central"]
        OSRMUS["Self-hosted OSRM<br/>US-East"]
        OSRMSEA["Self-hosted OSRM<br/>Asia-SEA"]
        Nom["Self-hosted Nominatim<br/>planet.osm.pbf"]
    end

    subgraph Cache["Cache"]
        Redis["Redis cluster<br/>trip result cache<br/>key = hash(from, to, stops, mode)<br/>TTL = 1h"]
    end

    subgraph Observe["Observability"]
        OTEL["OpenTelemetry traces"]
        Prom["Prometheus + Grafana"]
        Sentry["Sentry (frontend)"]
        SLO["SLO alerting<br/>feed health · cache hit · p99"]
    end

    Users["1M+ MAU browsers"] --> CDN
    Libs["Client libraries"] --> CDN
    CDN --> WAF
    WAF --> R2
    WAF --> Redis
    Redis -->|miss| Geo
    Geo --> OSRMEU
    Geo --> OSRMUS
    Geo --> OSRMSEA
    Geo --> Nom

    Scheduler --> Fetchers
    Fetchers --> RawArchive
    Fetchers --> Normalizer
    Normalizer --> Versioned
    Versioned --> R2

    Fetchers --> OTEL
    Normalizer --> OTEL
    OSRMEU --> OTEL
    OTEL --> Prom
    Prom --> SLO
```

### Layer-by-layer scaling strategy

**1. Edge & CDN.** Front the public endpoints with Cloudflare (or Fastly / CloudFront). Pull from an object store (R2 / S3) rather than a git branch so cache purges become a 1-second control-plane call. Brotli + gzip encoding shaves the 470 KB dataset to ~110 KB. Edge TTL of 15 minutes matches realistic upstream refresh cadence without hammering origin.

**2. Split the dataset.** A single `countries.json` is fine for the choropleth but wasteful for a library user who only needs Germany. Publish one fat file **and** 170 tiny per-country files (`countries/{ISO}.json`). Clients pick the shape that fits their query pattern. Per-country files average ~2 KB, compress to ~800 B each.

**3. Dedicated data pipeline.** Replace the GitHub Actions cron with a proper workflow engine (Temporal, EventBridge + Lambda, or Cloudflare Cron Workers). Every upstream source runs as its own job with idempotent retries and a dead-letter queue. Raw responses land in immutable object storage — normalization becomes replayable after a bug fix without re-hitting upstream APIs. Versioned output keys (`v{timestamp}.json`) with an atomic `latest` alias give blue/green publishing and instant rollback.

**4. Self-hosted routing stack.** The trip calculator is the biggest risk. Public Nominatim and OSRM will not cooperate at 1M MAU; host both yourself:
- **OSRM** in three regions (EU-Central, US-East, Asia-SEA) on `c7g.xlarge` instances. Pre-process a Europe extract on the small nodes, full planet on the larger one.
- **Nominatim** once, on a node with 1 TB SSD and 64 GB RAM.
- Route clients to the nearest region via geo-DNS.

**5. Redis cache in front of routing.** Trip calculations are deterministic — same waypoints + same mode + same daily dataset = same answer. Key cache entries on `SHA256(waypoints | mode | dataset_version)` with a 1-hour TTL. Popular presets ("Istanbul → Berlin", "Paris → Munich") will hit 95 %+ cache rate, meaning the self-hosted OSRM cluster only serves a handful of unique requests per minute even at peak.

**6. Observability.** OpenTelemetry spans threaded through the pipeline and API, metrics into Prometheus, traces into Grafana Tempo, frontend errors into Sentry. SLO alerts on: cache hit ratio < 90 %, upstream feed > 6 h stale, dataset generation p99 > 15 min, routing p99 > 800 ms.

**7. Security & abuse control.** Cloudflare WAF with per-IP rate limit of 1000 req/min, 100 req/min for the routing path. Bot-fight mode on, GeoJSON and prices files marked `Cache-Control: public, max-age=900, stale-while-revalidate=3600`. No cookies, no user accounts, no PII — the GDPR footprint is trivially empty.

### Capacity model

Assumes 1 M monthly actives, 10 % DAU, peak factor 3× over the daily average, 4 hot requests per session (map load + one trip calculation).

| Dimension | Daily | Peak hour | Peak second |
|---|---:|---:|---:|
| Sessions | 100 000 | 12 500 | 3.5 |
| Static GETs (dataset + tiles) | 400 000 | 50 000 | ~14 |
| Edge bandwidth out | ~44 GB | ~5.5 GB | — |
| Trip-calc requests (geocode + route) | 30 000 | 3 750 | ~1.1 |
| OSRM requests (after 95 % cache hit) | 1 500 | 188 | ~0.05 |

The numbers fit a single small OSRM per region and one Nominatim. Redis can be a $25/month single-node `cache.t4g.small`.

### Cost estimate at 1 M MAU

| Component | Monthly |
|---|---:|
| Cloudflare Pro + Workers | $25 |
| R2 / S3 storage + egress | $30 |
| OSRM × 3 regions (`c7g.xlarge`) | $330 |
| Nominatim (`r6g.2xlarge` + 1 TB EBS) | $340 |
| Redis cache | $30 |
| Workflow engine (Temporal Cloud free tier or EventBridge + Lambda) | $25 |
| Monitoring (Grafana Cloud free + Sentry Team) | $50 |
| **Total** | **~$830 / mo** |

At 1 M MAU that works out to **$0.00083 per user per month** — well inside "buy the oncall engineer a pizza" territory, with plenty of headroom for the next order of magnitude.

### Migration path

**Phase 1 — CDN in front of GitHub Pages** (`~$25/mo`, ≈ 1 day of work)
Point Cloudflare at the existing Pages origin, add WAF rate limiting, move DNS. Zero code changes. Immediately solves the bandwidth ceiling and cache-purge control.

**Phase 2 — Dataset split + Redis-cached trips** (`~$80/mo`, ≈ 1 week)
Generate per-country files in the existing pipeline. Deploy a small routing proxy with Redis in front that still fronts public Nominatim/OSRM, but cached. This buys another order of magnitude while keeping the bill small.

**Phase 3 — Self-hosted routing stack + workflow engine** (`~$830/mo`, ≈ 2–3 weeks)
Stand up OSRM and Nominatim in the regions that show real traffic. Move the pipeline to Temporal / EventBridge. Add observability. Fully production-grade at 1 M+ MAU.

### Testing the plan

- **Load tests** with [k6](https://k6.io/) replaying a realistic traffic mix (70 % map loads, 25 % trip calculations, 5 % API scraping) against a staging deploy.
- **Chaos runs**: kill an upstream feed and verify the pipeline fails gracefully with the last-known-good dataset still published; kill one OSRM region and verify geo-DNS fails over; fill Redis to eviction threshold and verify cache hit ratio degrades smoothly rather than collapsing.
- **Budget alarms** on AWS / Cloudflare at 50 %, 75 % and 90 % of expected monthly spend — a runaway bill is the most likely real incident at this scale, not downtime.

### Non-goals

This design is deliberately boring. No Kubernetes, no service mesh, no multi-cloud. The data is public, the service is idempotent, and the load is CDN-cacheable — the right answer is a CDN plus three VMs plus a Redis plus a cron, not a thirty-pod cluster. If the traffic pattern ever demands something more exotic (real-time pricing, per-user personalization, writes), the pipeline and dataset layers above are designed to survive a rewrite of only the dynamic services.

## 📌 Roadmap

- [ ] Live global electricity feed (replace static fallback for non-EU)
- [ ] CO₂ intensity of the local grid — so EV cost **and** EV CO₂ match the local mix
- [ ] Pre-computed trip API endpoints under `/api/v1/trips/*.json`
- [ ] Historical time-series per metric with sparklines
- [ ] Cost-parity view: at what electricity price does an EV break even vs gasoline in each country?
- [ ] Client libraries under `libraries/` (npm, PyPI, Go, Flutter, NuGet)
- [ ] Charging-station point-of-interest layer (OpenChargeMap)
- [ ] Water prices, air quality, mobile & broadband costs as future metrics

## 📦 Client Libraries

Language-specific wrappers live under [`libraries/`](./libraries/). All five expose the same surface (`getDataset`, `getCountry`, `rank`, `globalAverage`) and are ready to publish to their respective registries.

| Language | Package | Install | Source |
|---|---|---|---|
| JavaScript / TypeScript | `world-infra-data` (npm) | `npm install world-infra-data` | [`libraries/typescript`](./libraries/typescript) |
| Python 3.9+ | `world-infra-data` (PyPI) | `pip install world-infra-data` | [`libraries/python`](./libraries/python) |
| Go 1.21+ | `github.com/aykutsp/world-infrastructure-data-hub/libraries/go` | `go get github.com/aykutsp/world-infrastructure-data-hub/libraries/go@latest` | [`libraries/go`](./libraries/go) |
| Dart / Flutter | `world_infra_data` (pub.dev) | `dart pub add world_infra_data` | [`libraries/flutter`](./libraries/flutter) |
| .NET 8+ | `WorldInfraData` (NuGet) | `dotnet add package WorldInfraData` | [`libraries/csharp`](./libraries/csharp) |

## 🏛 Architecture & engineering practices

This project is built to be understood, not just to run. The engineering reference lives under [`docs/architecture/`](./docs/architecture/) and is structured the same way any serious production service is:

| Document | What's in it |
|---|---|
| [`docs/architecture/overview.md`](./docs/architecture/overview.md) | C4-model system context + container diagrams (Mermaid) |
| [`docs/architecture/data-flow.md`](./docs/architecture/data-flow.md) | End-to-end walkthrough of one number travelling from upstream to map |
| [`docs/architecture/adr/`](./docs/architecture/adr/) | **7 Architecture Decision Records** covering the load-bearing decisions |
| [`docs/paid-upgrades.md`](./docs/paid-upgrades.md) | Per-source paid alternatives with cost + effort estimates |
| [`docs/runbooks/`](./docs/runbooks/) | Step-by-step operational procedures (new country, new metric, upstream failure, release, rollback) |

### The ADRs at a glance

1. **[Static-first architecture](./docs/architecture/adr/0001-static-first-architecture.md)** — why GitHub Pages + cron and not a backend
2. **[Unified and per-country dataset shape](./docs/architecture/adr/0002-unified-and-per-country-dataset-shape.md)** — fat file and thin files, not either/or
3. **[Trip calculator runs client-side](./docs/architecture/adr/0003-trip-calculator-runs-client-side.md)** — why the browser owns routing and geocoding
4. **[Raw response archival + replay](./docs/architecture/adr/0004-raw-response-archival-and-replay.md)** — bug fixes without re-hitting upstream APIs
5. **[Free-data-first, with paid upgrade paths](./docs/architecture/adr/0005-free-data-first-with-paid-upgrade-paths.md)** — policy + on-ramp for teams with a budget
6. **[Client libraries are thin wrappers](./docs/architecture/adr/0006-client-library-strategy.md)** — not an SDK, on purpose
7. **[API versioning and stability pledge](./docs/architecture/adr/0007-api-versioning-and-stability-pledge.md)** — what `v1` actually promises

### Quality gates

Everything you'd expect from a serious codebase, enforced in CI on every pull request:

| Gate | Tool | Where |
|---|---|---|
| Unit tests | Vitest | [`test/helpers.test.mjs`](./test/helpers.test.mjs) — 18 tests covering CSV parsing, XML escaping, Haversine, point-in-polygon, `round()` |
| Type-check | `tsc -b --force` | All TS strict, zero errors |
| Lint | ESLint + typescript-eslint | `npm run lint` |
| **Schema validation** | [AJV](https://ajv.js.org/) against [`schemas/countries.schema.json`](./schemas/countries.schema.json) | Runs as the final step of `generate-data`. **A schema mismatch fails the build**, which means the live site stays on the last known good dataset |
| Security scan | [CodeQL](./.github/workflows/codeql.yml) with `security-extended` queries | Every PR + weekly |
| Dependency updates | Dependabot | Weekly, major bumps for TS/ESLint held back until manually reviewed |
| Release notes | [Release Drafter](./.github/release-drafter.yml) | Auto-drafted from PR labels on every merge to main |

### One-command quality check

```bash
make release-check
# runs: test → typecheck → lint → validate → build
```

If that's green locally, the CI build will be green too.

### Observability you get for free

- `GET /api/v1/countries.json` — the canonical dataset with `lastUpdated` and `coverage` blocks
- `GET /api/v1/health.json` — per-source freshness + row counts, suitable for an uptime dashboard
- Every deploy is tagged; every tag is a reproducible build from a specific `main` SHA
- Every upstream source is listed in `countries.json`'s `sources` field so attribution is machine-readable

## 📜 Changelog

**v1.1.0** — Grid CO₂ intensity (gCO₂/kWh) from OWID/Ember energy data as a 15th metric, 15-year historical time-series for CO₂ and the eight World Bank indicators, inline SVG sparklines next to every historical metric in the country detail panel, five official client libraries under `libraries/` (npm, PyPI, Go modules, Flutter, NuGet), optional OpenChargeMap charging-station count loader (activates automatically when `OPENCHARGEMAP_KEY` is set in the CI environment).

**v1.0.0** — Live Eurostat electricity pull, Country Compare view (up to 5 countries side-by-side), ported Trip Calculator with 5 cost modes (gasoline / diesel / LPG / EV home / EV fast) and up to 8 waypoints, API Library modal with copy-paste snippets, 8 new World Bank indicators (GDP per capita, population, life expectancy, internet users, renewable share, Gini, unemployment, inflation).

**v0.1.0** — Initial scaffold with fuel + electricity (static) + EV (derived) + CO₂.

## 🤝 Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Community health docs: [`SECURITY.md`](./SECURITY.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## 📄 License

MIT. See [`LICENSE`](./LICENSE).

Feel free to use this project however you like — fork it, ship it, tear it apart, build something bigger on top of it. If you end up using it in something public, a small credit or a link back would make my day, but it's not a requirement. Thanks for taking a look.

Upstream datasets keep their original licences — see the data sources table above.
