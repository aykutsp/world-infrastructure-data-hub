import { Sun, Moon, Monitor, Database, Search, ChevronLeft } from 'lucide-react';
import type { Country, Dataset, DatasetKey, ThemeType } from '../../types';
import { DATASETS } from '../../types';

interface Props {
  data: Dataset | null;
  activeDataset: DatasetKey;
  setActiveDataset: (k: DatasetKey) => void;
  selected: Country | null;
  onSelect: (c: Country | null) => void;
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
}

export default function Sidebar({
  data,
  activeDataset,
  setActiveDataset,
  selected,
  onSelect,
  theme,
  setTheme,
}: Props) {
  if (!data) return null;
  const spec = DATASETS.find((d) => d.key === activeDataset) ?? DATASETS[0];

  const rankedCountries = [...data.countries]
    .map((c) => ({ c, v: spec.extract(c) }))
    .filter((x) => x.v != null && (x.v as number) > 0)
    .sort((a, b) => (a.v as number) - (b.v as number));

  return (
    <div className="sidebar glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="header-section">
          <h1>World Infra Data</h1>
          <p>Fuel · Electricity · EV · CO₂</p>
        </div>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8, gap: 4 }}>
          <button onClick={() => setTheme('light')} title="Light" style={themeBtn(theme === 'light')}><Sun size={14} /></button>
          <button onClick={() => setTheme('dark')}  title="Dark"  style={themeBtn(theme === 'dark')}><Moon size={14} /></button>
          <button onClick={() => setTheme('system')} title="System" style={themeBtn(theme === 'system')}><Monitor size={14} /></button>
        </div>
      </div>

      <div className="view-toggle" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8, marginBottom: 12 }}>
        {DATASETS.map(({ key, shortLabel }) => (
          <button
            key={key}
            onClick={() => setActiveDataset(key)}
            style={{
              flex: '1 1 auto',
              padding: '7px 8px',
              background: activeDataset === key ? 'var(--accent-base)' : 'transparent',
              color: activeDataset === key ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {shortLabel}
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-title">Metric</span>
          <span className="stat-value text-gradient">{spec.label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{spec.unit}</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Countries</span>
          <span className="stat-value text-gradient">{rankedCountries.length}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>with data</span>
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

        {!selected ? (
          rankedCountries.map(({ c, v }) => (
            <div key={c.id} className="list-item" onClick={() => onSelect(c)}>
              <div className="list-item-left">
                <span className="item-name">{c.name}</span>
                <span className="item-region">{c.id}</span>
              </div>
              <div className="item-price">
                {spec.key === 'co2' ? `${(v as number).toFixed(2)} t` : `$${(v as number).toFixed(2)}`}
              </div>
            </div>
          ))
        ) : (
          <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.name}</div>
            {selected.fuel && (
              <Row label="⛽ Gasoline / Diesel / LPG" value={`$${selected.fuel.gasoline ?? '—'} / $${selected.fuel.diesel ?? '—'} / $${selected.fuel.lpg ?? '—'} per L`} />
            )}
            {selected.electricity && (
              <Row label={`⚡ Electricity (${selected.electricity.year})`} value={`$${selected.electricity.household_usd_per_kwh} / kWh`} />
            )}
            {selected.ev && (
              <Row label="🔌 EV home / fast" value={`$${selected.ev.home_usd_per_100km} / $${selected.ev.public_fast_usd_per_100km} per 100 km`} />
            )}
            {selected.co2 && (
              <Row label={`🌱 CO₂ (${selected.co2.year})`} value={`${selected.co2.tonnes_per_capita} t / person`} />
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, fontStyle: 'italic' }}>
          <strong>Data:</strong> EU Weekly Oil Bulletin · World Bank · OWID/IEA electricity · Global Carbon Budget · Natural Earth borders.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`${import.meta.env.BASE_URL}api/v1/countries.json`} target="_blank" className="api-badge" style={{ flex: 1 }}>
            <Database size={14} /> countries.json
          </a>
          <a href={`${import.meta.env.BASE_URL}api/v1/countries.geojson`} target="_blank" className="api-badge" style={{ flex: 1 }}>
            <Database size={14} /> borders
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
    </div>
  );
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
