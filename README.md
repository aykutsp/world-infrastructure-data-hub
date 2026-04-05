# World Infrastructure Data Hub

An interactive world map for the real cost of keeping things running: **retail fuel prices, household electricity prices, EV charging costs and CO2 emissions**, all in one place and all from open government / inter-governmental sources.

Built on top of the same static-site + daily-refresh pipeline as its predecessor [world-fuel-prices](https://github.com/aykutsp/world-fuel-prices), but scoped much wider.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)
![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)

## ✨ Features

- 🗺 **Unified choropleth world map** with a single dataset-switcher: **Fuel · Electricity · EV charging · CO2**
- ⛽ **Fuel cost comparison** — side-by-side view of gasoline vs diesel vs LPG per country, sourced from the EU Weekly Oil Bulletin and the World Bank Global Fuel Prices Database
- ⚡ **Electricity prices** — household USD/kWh from Our World in Data / IEA
- 🔌 **EV charging cost** — derived per-100 km cost for both home and public fast-charging, using a typical 18 kWh / 100 km consumption and a 1.6× fast-charger markup on top of local electricity prices
- 🌱 **CO2 emissions** — tonnes per capita from Our World in Data's Global Carbon Budget mirror
- 📦 **Static open data endpoints** — one `countries.json` holds all four datasets per country, plus Natural Earth borders as `countries.geojson`
- 🤖 **Daily refresh** via GitHub Actions — the live site always reflects the latest upstream numbers

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 8 |
| Language | TypeScript 5 |
| Mapping | Leaflet + react-leaflet |
| Styling | Plain CSS with CSS variables |
| Data pipeline | Node.js + SheetJS (`xlsx`) |
| Hosting | GitHub Pages (via GitHub Actions) |

## ⚙️ Installation

Prerequisites: **Node.js 20 LTS or newer** and **npm**.

```bash
git clone https://github.com/<your-user>/world-infrastructure-data-hub.git
cd world-infrastructure-data-hub
npm install
```

## 🚀 Usage

Regenerate all datasets from upstream (one network fetch per source):

```bash
npm run generate-data
```

Dev server:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
.
├── .github/workflows/deploy.yml     # Daily data refresh + GitHub Pages deploy
├── public/api/v1/                   # Generated dataset (ignored by git, built in CI)
├── scripts/generateData.js          # Unified pipeline: fuel + electricity + EV + CO2
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Dashboard/Sidebar.tsx
│   │   └── Map/InfraMap.tsx
│   ├── types.ts
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.ts
```

## 🔌 Data sources

| Dataset | Source | License |
|---|---|---|
| Fuel (EU27) | European Commission Weekly Oil Bulletin | CC BY 4.0 |
| Fuel (rest of world) | World Bank Global Fuel Prices Database | ODbL |
| Electricity (household) | Our World in Data / IEA | CC BY 4.0 |
| CO2 emissions | Our World in Data (Global Carbon Budget) | CC BY 4.0 |
| Country borders | Natural Earth 110m admin_0 | CC0 |
| EV charging cost | **Derived** — electricity × 18 kWh/100 km × 1.6 | — |

### JSON schema

`public/api/v1/countries.json` (generated):

```jsonc
{
  "lastUpdated": "2026-04-05T14:00:00.000Z",
  "sources": [ "EU Weekly Oil Bulletin …", "…" ],
  "coverage": { "fuel": 160, "electricity": 80, "ev": 80, "co2": 190 },
  "countries": [
    {
      "id": "DE",
      "iso3": "DEU",
      "name": "Germany",
      "lat": 51.17,
      "lng": 10.45,
      "fuel":        { "gasoline": 2.46, "diesel": 2.64, "lpg": 1.20, "source": "EU Weekly Oil Bulletin" },
      "electricity": { "household_usd_per_kwh": 0.38, "year": 2023, "source": "OWID/IEA" },
      "ev":          { "home_usd_per_100km": 6.84, "public_fast_usd_per_100km": 10.94, "assumptions": {...} },
      "co2":         { "year": 2023, "tonnes_per_capita": 8.09, "total_million_tonnes": 673.22, "source": "OWID/GCB" }
    }
  ]
}
```

## 📌 Roadmap

- [ ] Real fast-charger price feeds where they exist (UK gov, NL laadpaal.com, FR data.gouv.fr)
- [ ] Historical time-series per dataset with sparklines
- [ ] Cost-parity view: "at what electricity price does an EV break even vs gasoline in this country?"
- [ ] CO2 intensity of the local electricity grid (so EV cost & CO2 actually line up with the local mix)
- [ ] Emissions per trip in the route planner (once ported over from world-fuel-prices)
- [ ] Comparison view: pick N countries and stack all four metrics side-by-side

## 📜 Changelog

**v0.1.0** — Scaffold. Unified `countries.json` with fuel / electricity / EV charging / CO2 derived from public sources. UI still in progress.

## 📄 License

MIT. Upstream data keeps its original licences — see the data sources table.
