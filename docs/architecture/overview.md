# System overview

C4-model diagrams for the World Infrastructure Data Hub. Two levels of zoom — system context and containers. Component-level internals live in the source code itself and in the relevant ADRs.

## Level 1 — system context

Who uses the system, and what does it touch?

```mermaid
flowchart LR
    User["👩‍💻 End user<br/>(browser)"]
    Dev["👨‍💻 Developer<br/>(CLI / notebook / app)"]
    Bot["🤖 Dependabot / GitHub Actions"]

    System["<b>World Infrastructure Data Hub</b><br/>Static site + open JSON API"]

    EC["EU Commission<br/>Weekly Oil Bulletin"]
    ES["Eurostat<br/>nrg_pc_204"]
    WB["World Bank<br/>8 indicators"]
    OWID["Our World in Data<br/>CO₂ + energy"]
    EIA["US EIA<br/>weekly retail"]
    Govs["Nat. gov portals<br/>(FR / IT / ES / UK)"]
    OCM["OpenChargeMap<br/>(optional, keyed)"]
    NE["Natural Earth<br/>country borders"]

    OSRM["OSRM public demo<br/>(routing)"]
    Nom["Nominatim<br/>(geocoding)"]

    User -->|HTTP| System
    Dev -->|HTTP / client libs| System
    Bot -->|PR / cron| System

    System -->|daily fetch| EC
    System -->|daily fetch| ES
    System -->|daily fetch| WB
    System -->|daily fetch| OWID
    System -->|daily fetch| EIA
    System -->|daily fetch| Govs
    System -->|daily fetch| OCM
    System -->|weekly refresh| NE

    User -.->|trip calc only| OSRM
    User -.->|trip calc only| Nom
```

## Level 2 — containers

What moving parts make up "The System"?

```mermaid
flowchart TB
    subgraph Build["Build-time (GitHub Actions, 06:25 UTC)"]
        Fetch["<b>Fetchers</b><br/>Node.js + fetch<br/>one per source"]
        Normalize["<b>Normalizer</b><br/>merges ISO2-keyed records<br/>round + clamp"]
        Validate["<b>Schema validator</b><br/>countries.schema.json<br/>AJV (fails the build on drift)"]
        Write["<b>Writer</b><br/>countries.json<br/>countries.geojson<br/>health.json"]
    end

    subgraph Deploy["Deploy-time (GitHub Pages)"]
        Pages["<b>Static bundle</b><br/>Vite output<br/>api/v1/*.json<br/>cached at edge"]
    end

    subgraph Client["Run-time (browser)"]
        React["<b>React SPA</b><br/>Leaflet choropleth<br/>Trip calculator<br/>Compare view"]
        Libs["<b>Client libraries</b><br/>npm · PyPI · Go<br/>Flutter · NuGet"]
    end

    subgraph Dynamic["External (trip-calc only)"]
        NomExt["Nominatim<br/>(OpenStreetMap)"]
        OSRMExt["OSRM demo"]
    end

    Upstream["Upstream APIs<br/>(9 open data sources)"] -->|HTTPS| Fetch
    Fetch --> Normalize
    Normalize --> Validate
    Validate -->|pass| Write
    Validate -->|fail| Fail["❌ build fails"]
    Write --> Pages

    Pages -->|HTTP| React
    Pages -->|HTTP| Libs
    React -.->|address lookup| NomExt
    React -.->|driving route| OSRMExt
```

## Notable things the diagrams hint at but don't spell out

- **Raw responses are archived** before normalization, so a bug in the normalizer can be fixed and replayed against yesterday's upstream snapshot without re-hitting the APIs. (ADR-0004.)
- **The schema validator is a gate, not a suggestion.** If `countries.json` ever drifts from `schemas/countries.schema.json`, the build fails and the live site stays on the last known good dataset. (ADR-0007.)
- **Nominatim and OSRM are only called from the browser.** The build never geocodes anything server-side, which is why the static site is truly static and why every library consumer can reuse exactly the same endpoints without any dynamic dependency. (ADR-0003.)
- **Paid upgrade paths exist** for every external dependency. They're documented in [`docs/paid-upgrades.md`](../paid-upgrades.md) so that a team with a budget knows exactly which knob to turn to move from "open data, daily" to "licensed feed, minute-level".
