import { useState } from 'react';
import {
  Sun, Moon, Monitor, Search, ChevronLeft,
  Globe, BarChart3, Route, BookOpen, Plus, X,
} from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import type {
  Country, Dataset, DatasetKey, DatasetSpec, ThemeType, ViewMode, TripResult,
} from '../../types';
import { DATASETS } from '../../types';
import ApiLibraryModal from './ApiLibraryModal';
import Sparkline from './Sparkline';
import TripCalculator from '../Trip/TripCalculator';

interface Props {
  data: Dataset | null;
  borders: FeatureCollection | null;
  activeDataset: DatasetKey;
  setActiveDataset: (k: DatasetKey) => void;
  selected: Country | null;
  onSelect: (c: Country | null) => void;
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  compareIds: string[];
  setCompareIds: (ids: string[]) => void;
  trip: TripResult | null;
  setTrip: (t: TripResult | null) => void;
}

const VIEW_BUTTONS: Array<{ key: ViewMode; label: string; Icon: typeof Globe }> = [
  { key: 'explore', label: 'Explore', Icon: Globe },
  { key: 'compare', label: 'Compare', Icon: BarChart3 },
  { key: 'trip',    label: 'Trip',    Icon: Route },
];

export default function Sidebar({
  data, borders, activeDataset, setActiveDataset, selected, onSelect,
  theme, setTheme, view, setView, compareIds, setCompareIds, trip, setTrip,
}: Props) {
  const [apiLibOpen, setApiLibOpen] = useState(false);
  if (!data) return null;

  const spec = DATASETS.find((d) => d.key === activeDataset) ?? DATASETS[0];
  const rankedCountries = rankCountries(data, spec);

  return (
    <div className="sidebar glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="header-section">
          <h1>World Infra Data</h1>
          <p>Fuel · Electricity · EV · CO₂ · Economy</p>
        </div>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8, gap: 4 }}>
          <button onClick={() => setTheme('light')}  title="Light"  style={themeBtn(theme === 'light')}><Sun size={14} /></button>
          <button onClick={() => setTheme('dark')}   title="Dark"   style={themeBtn(theme === 'dark')}><Moon size={14} /></button>
          <button onClick={() => setTheme('system')} title="System" style={themeBtn(theme === 'system')}><Monitor size={14} /></button>
        </div>
      </div>

      <div className="view-toggle" style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8, marginBottom: 10 }}>
        {VIEW_BUTTONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            style={{
              flex: 1, padding: '8px 4px',
              background: view === key ? 'var(--accent-base)' : 'transparent',
              color: view === key ? '#fff' : 'var(--text-secondary)',
              border: 'none', borderRadius: 6,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {view === 'explore' && (
        <>
          <MetricGroupPicker activeDataset={activeDataset} setActiveDataset={setActiveDataset} />

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-title">Metric</span>
              <span className="stat-value text-gradient">{spec.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{spec.unit}</span>
            </div>
            <div className="stat-card">
              <span className="stat-title">Coverage</span>
              <span className="stat-value text-gradient">{rankedCountries.length}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>countries</span>
            </div>
          </div>

          <div className="search-container">
            <Search className="search-icon" />
            <input type="text" className="search-input" placeholder="Search countries…" />
          </div>

          <div className="list-container">
            {selected && (
              <div
                className="list-item"
                style={{ padding: 12, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--border-focus)' }}
                onClick={() => onSelect(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 500 }}>
                  <ChevronLeft size={18} /> Back to global view
                </div>
              </div>
            )}
            {!selected
              ? rankedCountries.map(({ c, v }) => (
                  <div key={c.id} className="list-item" onClick={() => onSelect(c)}>
                    <div className="list-item-left">
                      <span className="item-name">{c.name}</span>
                      <span className="item-region">{c.id}</span>
                    </div>
                    <div className="item-price">{formatValue(spec, v as number)}</div>
                  </div>
                ))
              : <CountryDetail c={selected} />}
          </div>
        </>
      )}

      {view === 'compare' && (
        <CompareView
          data={data}
          compareIds={compareIds}
          setCompareIds={setCompareIds}
        />
      )}

      {view === 'trip' && (
        <TripCalculator data={data} borders={borders} trip={trip} setTrip={setTrip} />
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, fontStyle: 'italic' }}>
          <strong>Sources:</strong> EU Weekly Oil Bulletin · Eurostat · World Bank · OWID (GCB) · Natural Earth.
        </p>
        <button
          type="button"
          onClick={() => setApiLibOpen(true)}
          className="api-library-btn"
        >
          <BookOpen size={14} /> API Library
        </button>
      </div>

      {apiLibOpen && <ApiLibraryModal onClose={() => setApiLibOpen(false)} />}
    </div>
  );
}

// ---- Grouped metric picker -------------------------------------------------

function MetricGroupPicker({
  activeDataset,
  setActiveDataset,
}: {
  activeDataset: DatasetKey;
  setActiveDataset: (k: DatasetKey) => void;
}) {
  const groups: Array<{ key: 'cost' | 'energy' | 'society'; label: string }> = [
    { key: 'cost',    label: 'Cost'    },
    { key: 'energy',  label: 'Energy'  },
    { key: 'society', label: 'Society' },
  ];
  const byGroup: Record<string, DatasetSpec[]> = {};
  for (const d of DATASETS) (byGroup[d.group] ||= []).push(d);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      {groups.map(({ key, label }) => (
        <div key={key}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8 }}>
            {byGroup[key].map((d) => (
              <button
                key={d.key}
                onClick={() => setActiveDataset(d.key)}
                style={{
                  flex: '1 1 auto',
                  padding: '6px 8px',
                  background: activeDataset === d.key ? 'var(--accent-base)' : 'transparent',
                  color: activeDataset === d.key ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {d.shortLabel}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Country detail panel --------------------------------------------------

function CountryDetail({ c }: { c: Country }) {
  return (
    <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
      {c.fuel && (
        <Row label="⛽ Gasoline / Diesel / LPG" value={`$${c.fuel.gasoline ?? '—'} · $${c.fuel.diesel ?? '—'} · $${c.fuel.lpg ?? '—'} per L`} />
      )}
      {c.electricity && (
        <Row label={`⚡ Electricity (${c.electricity.year})`} value={`$${c.electricity.household_usd_per_kwh} / kWh`} />
      )}
      {c.ev && (
        <Row label="🔌 EV home / fast" value={`$${c.ev.home_usd_per_100km} · $${c.ev.public_fast_usd_per_100km} per 100 km`} />
      )}
      {c.gridCO2 && (
        <Row label={`⚡ Grid CO₂ (${c.gridCO2.year})`} value={`${c.gridCO2.gco2_per_kwh} g / kWh`} />
      )}
      {c.co2 && (
        <Row
          label={`🌱 CO₂ per capita (${c.co2.year})`}
          value={`${c.co2.tonnes_per_capita} t`}
          history={c.co2.history}
        />
      )}
      {c.worldBank?.gdp_per_capita_usd && (
        <Row
          label={`💰 GDP / capita (${c.worldBank.gdp_per_capita_usd.year})`}
          value={`$${Math.round(c.worldBank.gdp_per_capita_usd.value).toLocaleString()}`}
          history={c.worldBank.gdp_per_capita_usd.history}
        />
      )}
      {c.worldBank?.life_expectancy_years && (
        <Row
          label={`🫀 Life expectancy (${c.worldBank.life_expectancy_years.year})`}
          value={`${c.worldBank.life_expectancy_years.value.toFixed(1)} yrs`}
          history={c.worldBank.life_expectancy_years.history}
        />
      )}
      {c.worldBank?.internet_users_pct && (
        <Row
          label={`🌐 Internet users (${c.worldBank.internet_users_pct.year})`}
          value={`${c.worldBank.internet_users_pct.value.toFixed(1)} %`}
          history={c.worldBank.internet_users_pct.history}
        />
      )}
      {c.worldBank?.renewable_electricity_pct && (
        <Row
          label={`♻️ Renewables (${c.worldBank.renewable_electricity_pct.year})`}
          value={`${c.worldBank.renewable_electricity_pct.value.toFixed(1)} %`}
          history={c.worldBank.renewable_electricity_pct.history}
        />
      )}
      {c.worldBank?.gini_index && (
        <Row
          label={`⚖️ Gini (${c.worldBank.gini_index.year})`}
          value={c.worldBank.gini_index.value.toFixed(1)}
          history={c.worldBank.gini_index.history}
        />
      )}
      {c.worldBank?.unemployment_pct && (
        <Row
          label={`📉 Unemployment (${c.worldBank.unemployment_pct.year})`}
          value={`${c.worldBank.unemployment_pct.value.toFixed(1)} %`}
          history={c.worldBank.unemployment_pct.history}
        />
      )}
      {c.worldBank?.inflation_pct && (
        <Row
          label={`📈 Inflation (${c.worldBank.inflation_pct.year})`}
          value={`${c.worldBank.inflation_pct.value.toFixed(1)} %`}
          history={c.worldBank.inflation_pct.history}
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  history,
}: {
  label: string;
  value: string;
  history?: Array<[number, number]>;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {history && history.length >= 2 && <Sparkline data={history} />}
        <span style={{ color: 'var(--text-primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>{value}</span>
      </div>
    </div>
  );
}

// ---- Compare view ----------------------------------------------------------

function CompareView({
  data, compareIds, setCompareIds,
}: {
  data: Dataset;
  compareIds: string[];
  setCompareIds: (ids: string[]) => void;
}) {
  const MAX = 5;
  const [query, setQuery] = useState('');

  const selectedCountries: Country[] = compareIds
    .map((id) => data.countries.find((c) => c.id === id))
    .filter((c): c is Country => !!c);

  const searchResults = query.length < 2
    ? []
    : data.countries
        .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.id === query.toUpperCase())
        .filter((c) => !compareIds.includes(c.id))
        .slice(0, 6);

  const addCountry = (c: Country) => {
    if (compareIds.length >= MAX) return;
    setCompareIds([...compareIds, c.id]);
    setQuery('');
  };

  const removeCountry = (id: string) => {
    setCompareIds(compareIds.filter((x) => x !== id));
  };

  return (
    <div className="compare-panel">
      <div className="compare-search">
        <Search size={14} className="search-icon" />
        <input
          className="trip-input"
          placeholder={compareIds.length >= MAX ? `Max ${MAX} countries` : 'Add country…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={compareIds.length >= MAX}
        />
      </div>
      {searchResults.length > 0 && (
        <div className="compare-results">
          {searchResults.map((c) => (
            <button
              key={c.id}
              type="button"
              className="compare-result"
              onClick={() => addCountry(c)}
            >
              <Plus size={12} /> {c.name} <span className="compare-result-id">{c.id}</span>
            </button>
          ))}
        </div>
      )}

      <div className="compare-chips">
        {selectedCountries.length === 0 ? (
          <div className="compare-empty">
            Pick up to {MAX} countries to stack all metrics side-by-side.
          </div>
        ) : (
          selectedCountries.map((c) => (
            <span key={c.id} className="compare-chip">
              {c.name}
              <button type="button" onClick={() => removeCountry(c.id)} title="Remove">
                <X size={10} />
              </button>
            </span>
          ))
        )}
      </div>

      {selectedCountries.length > 0 && (
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Metric</th>
                {selectedCountries.map((c) => (
                  <th key={c.id}>{c.id}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DATASETS.map((spec) => {
                const values = selectedCountries.map((c) => spec.extract(c));
                const numeric = values.filter((v): v is number => v != null);
                const best = numeric.length
                  ? spec.higherIsWorse ? Math.min(...numeric) : Math.max(...numeric)
                  : null;
                return (
                  <tr key={spec.key}>
                    <td className="compare-metric">
                      {spec.label} <span className="compare-unit">{spec.unit}</span>
                    </td>
                    {values.map((v, i) => (
                      <td
                        key={i}
                        className={
                          'compare-cell' +
                          (v != null && best != null && v === best ? ' compare-cell-best' : '')
                        }
                      >
                        {v != null ? formatValue(spec, v) : '—'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Helpers ---------------------------------------------------------------

function rankCountries(data: Dataset, spec: DatasetSpec) {
  return data.countries
    .map((c) => ({ c, v: spec.extract(c) }))
    .filter((x) => x.v != null && (x.v as number) > 0)
    .sort((a, b) =>
      spec.higherIsWorse
        ? (a.v as number) - (b.v as number)
        : (b.v as number) - (a.v as number),
    );
}

function formatValue(spec: DatasetSpec, v: number): string {
  switch (spec.key) {
    case 'wb.gdp':
      return `$${Math.round(v).toLocaleString()}`;
    case 'wb.life':
      return `${v.toFixed(1)} yrs`;
    case 'wb.internet':
    case 'wb.renewables':
    case 'wb.unemployment':
    case 'wb.inflation':
      return `${v.toFixed(1)}%`;
    case 'wb.gini':
      return v.toFixed(1);
    case 'co2':
      return `${v.toFixed(2)} t`;
    case 'grid.co2':
      return `${Math.round(v)} g/kWh`;
    case 'electricity':
      return `$${v.toFixed(3)}/kWh`;
    case 'ev.home':
    case 'ev.public':
      return `$${v.toFixed(2)}/100km`;
    default:
      return `$${v.toFixed(2)}`;
  }
}

function themeBtn(active: boolean): React.CSSProperties {
  return {
    background: active ? 'var(--accent-base)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: 'none',
    padding: 6,
    borderRadius: 4,
    cursor: 'pointer',
  };
}
