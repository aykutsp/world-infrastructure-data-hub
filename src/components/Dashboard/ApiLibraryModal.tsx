import { X, ExternalLink } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const API_BASE = import.meta.env.BASE_URL + 'api/v1/';

const ENDPOINTS: Array<{ path: string; label: string; description: string }> = [
  {
    path: 'countries.json',
    label: 'countries.json',
    description:
      'Unified per-country dataset: fuel, electricity, EV charging (derived), CO₂, and 8 World Bank indicators.',
  },
  {
    path: 'countries.geojson',
    label: 'countries.geojson',
    description: 'Natural Earth 110m admin_0 country borders (CC0). Drop it straight into Leaflet, Mapbox or d3.',
  },
];

const EXAMPLES: Array<{ title: string; body: string }> = [
  {
    title: 'curl + jq — cheapest 5 countries for gasoline',
    body: `curl -s ${API_BASE}countries.json \\
  | jq -r '.countries
      | map(select(.fuel.gasoline != null))
      | sort_by(.fuel.gasoline)
      | .[:5]
      | .[] | "\\(.id)\\t\\(.fuel.gasoline)\\t\\(.name)"'`,
  },
  {
    title: 'JavaScript / TypeScript',
    body: `const res = await fetch('${API_BASE}countries.json');
const { countries } = await res.json();

const de = countries.find(c => c.id === 'DE');
console.log(de.name, 'gasoline:', de.fuel?.gasoline);
console.log(de.name, 'GDP/cap:', de.worldBank?.gdp_per_capita_usd?.value);`,
  },
  {
    title: 'Python (stdlib only)',
    body: `import urllib.request, json

with urllib.request.urlopen("${API_BASE}countries.json") as r:
    data = json.load(r)

by_life = sorted(
    (c for c in data["countries"]
     if c["worldBank"] and c["worldBank"].get("life_expectancy_years")),
    key=lambda c: c["worldBank"]["life_expectancy_years"]["value"],
    reverse=True,
)
for c in by_life[:10]:
    v = c["worldBank"]["life_expectancy_years"]
    print(f'{c["id"]}\\t{v["value"]:.1f} yrs ({v["year"]})\\t{c["name"]}')`,
  },
  {
    title: 'Go (stdlib)',
    body: `resp, _ := http.Get("${API_BASE}countries.json")
defer resp.Body.Close()
var payload struct {
    Countries []struct {
        ID   string \`json:"id"\`
        Name string \`json:"name"\`
        Fuel struct {
            Gasoline *float64 \`json:"gasoline"\`
        } \`json:"fuel"\`
    } \`json:"countries"\`
}
json.NewDecoder(resp.Body).Decode(&payload)`,
  },
  {
    title: 'PHP',
    body: `<?php
$data = json_decode(file_get_contents('${API_BASE}countries.json'), true);
foreach ($data['countries'] as $c) {
    if ($c['id'] === 'TR') {
        printf("%s — gasoline: \\$%.2f/L, electricity: \\$%.3f/kWh\\n",
            $c['name'], $c['fuel']['gasoline'], $c['electricity']['household_usd_per_kwh']);
        break;
    }
}`,
  },
];

export default function ApiLibraryModal({ onClose }: Props) {
  return (
    <div className="api-modal-overlay" onClick={onClose}>
      <div className="api-modal" onClick={(e) => e.stopPropagation()}>
        <div className="api-modal-header">
          <div>
            <h2>API Library</h2>
            <p>
              Static, auth-free open data endpoints. All JSON files are regenerated every day by a
              GitHub Actions cron — just GET them.
            </p>
          </div>
          <button type="button" className="api-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="api-modal-section">
          <h3>Endpoints</h3>
          <div className="api-endpoint-list">
            {ENDPOINTS.map((e) => (
              <a
                key={e.path}
                className="api-endpoint"
                href={API_BASE + e.path}
                target="_blank"
                rel="noreferrer"
              >
                <div>
                  <div className="api-endpoint-label">{e.label}</div>
                  <div className="api-endpoint-desc">{e.description}</div>
                </div>
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
        </div>

        <div className="api-modal-section">
          <h3>Dataset fields</h3>
          <ul className="api-field-list">
            <li><code>fuel.gasoline / diesel / lpg</code> — USD per litre</li>
            <li><code>electricity.household_usd_per_kwh</code> — USD per kWh (EU/EEA live via Eurostat)</li>
            <li><code>ev.home_usd_per_100km / public_fast_usd_per_100km</code> — derived USD per 100 km</li>
            <li><code>co2.tonnes_per_capita</code> — annual CO₂ emissions per person (most recent year)</li>
            <li><code>worldBank.gdp_per_capita_usd</code> — current USD (World Bank NY.GDP.PCAP.CD)</li>
            <li><code>worldBank.life_expectancy_years</code> — years at birth (SP.DYN.LE00.IN)</li>
            <li><code>worldBank.internet_users_pct</code> — % of population (IT.NET.USER.ZS)</li>
            <li><code>worldBank.renewable_electricity_pct</code> — % of total generation (EG.ELC.RNEW.ZS)</li>
            <li><code>worldBank.gini_index</code> — 0–100 inequality (SI.POV.GINI)</li>
            <li><code>worldBank.unemployment_pct</code> — % of labour force (SL.UEM.TOTL.ZS)</li>
            <li><code>worldBank.inflation_pct</code> — annual % (FP.CPI.TOTL.ZG)</li>
            <li><code>worldBank.population</code> — total (SP.POP.TOTL)</li>
          </ul>
        </div>

        <div className="api-modal-section">
          <h3>Usage examples</h3>
          {EXAMPLES.map((ex) => (
            <div key={ex.title} className="api-example">
              <div className="api-example-title">{ex.title}</div>
              <pre>{ex.body}</pre>
            </div>
          ))}
        </div>

        <div className="api-modal-footer">
          <p>
            Attribution: EU Commission, Eurostat, World Bank Open Data, Our World in Data / Global
            Carbon Budget, Natural Earth. Each upstream source keeps its own licence — see the
            repo's README for the full table.
          </p>
        </div>
      </div>
    </div>
  );
}
