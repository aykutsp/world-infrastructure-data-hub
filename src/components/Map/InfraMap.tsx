import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Country, Dataset, DatasetKey, ThemeType, TripResult, ViewMode } from '../../types';
import { DATASETS } from '../../types';

interface Props {
  data: Dataset | null;
  borders: FeatureCollection | null;
  activeDataset: DatasetKey;
  selected: Country | null;
  onSelect: (c: Country | null) => void;
  theme: ThemeType;
  view: ViewMode;
  compareIds: string[];
  trip: TripResult | null;
}

// Reuse the same 7-bin sequential ramp as the predecessor project, only keyed
// to the dataset's global P10 / P90 range rather than to the world mean, so
// small-range metrics (CO2 per capita) and wide-range metrics (EV public
// charging) both spread across the whole palette.
function invert(t: number | null): number | null {
  return t == null ? null : 1 - t;
}

// Per-metric formatter for the in-map label chip. Prices get a $ prefix,
// percentages get a % suffix, and physical metrics get their units.
function formatLabelValue(key: string, v: number): string {
  switch (key) {
    case 'wb.gdp':
      return v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`;
    case 'wb.life':
      return `${v.toFixed(0)} yrs`;
    case 'wb.internet':
    case 'wb.renewables':
    case 'wb.unemployment':
    case 'wb.inflation':
      return `${v.toFixed(0)}%`;
    case 'wb.gini':
      return v.toFixed(1);
    case 'co2':
      return `${v.toFixed(1)}t`;
    case 'grid.co2':
      return `${Math.round(v)}g`;
    case 'electricity':
      return `$${v.toFixed(2)}`;
    case 'ev.home':
    case 'ev.public':
      return `$${v.toFixed(1)}`;
    default:
      return `$${v.toFixed(2)}`;
  }
}

function bucketColor(t: number | null): string {
  if (t == null || !isFinite(t)) return '#2b2f36';
  if (t < 0.15) return '#006837';
  if (t < 0.3)  return '#31a354';
  if (t < 0.45) return '#78c679';
  if (t < 0.6)  return '#ffffbf';
  if (t < 0.75) return '#fdae61';
  if (t < 0.9)  return '#f46d43';
  return '#a50026';
}

const MapFlyTo = ({
  selected, trip,
}: {
  selected: Country | null;
  trip: TripResult | null;
}) => {
  const map = useMap();
  useEffect(() => {
    if (trip && trip.polyline.length > 1) {
      const bounds = L.latLngBounds(trip.polyline.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 1.2 });
      return;
    }
    if (selected) {
      map.setView([selected.lat, selected.lng], 5, { animate: true, duration: 1.2 });
    } else {
      map.setView([25, 0], 2, { animate: true, duration: 1.2 });
    }
  }, [selected, map, trip]);
  return null;
};

const ZoomTracker = ({ onZoom }: { onZoom: (z: number) => void }) => {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoom(map.getZoom());
    handler();
    map.on('zoomend', handler);
    return () => {
      map.off('zoomend', handler);
    };
  }, [map, onZoom]);
  return null;
};

function buildLabelIcon(name: string, value: string, showName: boolean): L.DivIcon {
  const safeName = name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const nameHtml = showName ? `<div class="price-label-name">${safeName}</div>` : '';
  const html = `<div class="price-label price-label-mid">${nameHtml}<div class="price-label-value">${value}</div></div>`;
  return L.divIcon({
    className: 'price-label-wrap',
    html,
    iconSize: showName ? [110, 36] : [68, 22],
    iconAnchor: showName ? [55, 18] : [34, 11],
  });
}

export default function InfraMap({
  data, borders, activeDataset, selected, onSelect, theme, view, compareIds, trip,
}: Props) {
  const [zoom] = useState(2);
  const [currentZoom, setCurrentZoom] = useState(2);
  void view;

  const spec = useMemo(
    () => DATASETS.find((d) => d.key === activeDataset) ?? DATASETS[0],
    [activeDataset]
  );

  const countryById = useMemo(() => {
    const m = new Map<string, Country>();
    if (!data) return m;
    for (const c of data.countries) m.set(c.id.toUpperCase(), c);
    return m;
  }, [data]);

  // Compute a robust normalisation range using the 10th and 90th percentiles
  // of non-null values, so a few extreme outliers don't wash out the palette.
  const { lo, hi } = useMemo(() => {
    if (!data) return { lo: 0, hi: 1 };
    const values = data.countries
      .map((c) => spec.extract(c))
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b);
    if (values.length === 0) return { lo: 0, hi: 1 };
    const p10 = values[Math.floor(values.length * 0.1)];
    const p90 = values[Math.floor(values.length * 0.9)];
    return { lo: p10, hi: Math.max(p90, p10 + 1e-9) };
  }, [data, spec]);

  const normalise = (v: number | null): number | null => {
    if (v == null || !isFinite(v)) return null;
    return Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  };

  if (!data) return <div className="map-container">Loading dataset…</div>;

  const featureIso2 = (feature: Feature<Geometry, any>): string => {
    const p = feature.properties || {};
    return String(p.ISO_A2_EH || p.ISO_A2 || p.iso_a2 || '').toUpperCase();
  };

  const compareSet = new Set(compareIds.map((x) => x.toUpperCase()));

  const styleFor = (feature?: Feature<Geometry, any>) => {
    if (!feature) {
      return { weight: 0.5, color: '#444', fillColor: '#2b2f36', fillOpacity: 0.1 };
    }
    const iso2 = featureIso2(feature);
    const country = countryById.get(iso2);
    const raw = country ? spec.extract(country) : null;
    const t = spec.higherIsWorse ? normalise(raw) : invert(normalise(raw));
    const isSelected = selected && selected.id === iso2;
    const inCompare = compareSet.has(iso2);
    return {
      weight: isSelected || inCompare ? 2.2 : 0.6,
      color: inCompare ? '#fde68a' : isSelected ? '#fff' : '#0006',
      fillColor: bucketColor(t),
      fillOpacity: country && raw != null ? 0.7 : 0.08,
    };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: L.Layer) => {
    const iso2 = featureIso2(feature);
    const country = countryById.get(iso2);
    const name = feature.properties?.NAME || iso2;
    if (country) {
      const v = spec.extract(country);
      const html = `
        <div class="popup-content">
          <div class="popup-title">${country.name}</div>
          <div class="popup-price" style="font-size:16px;margin-bottom:6px;">
            ${spec.label}:
            <strong style="color: var(--accent-base)">${v != null ? v.toFixed(3) : '—'}</strong>
            <span style="color:var(--text-muted);font-size:11px">${spec.unit}</span>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:6px;font-size:12px;line-height:1.5;">
            ${country.fuel ? `⛽ Gasoline: <strong>${country.fuel.gasoline ?? '—'}</strong> · Diesel: <strong>${country.fuel.diesel ?? '—'}</strong> · LPG: <strong>${country.fuel.lpg ?? '—'}</strong> USD/L<br>` : ''}
            ${country.electricity ? `⚡ Electricity: <strong>${country.electricity.household_usd_per_kwh}</strong> USD/kWh (${country.electricity.year})<br>` : ''}
            ${country.ev ? `🔌 EV fast-charge: <strong>$${country.ev.public_fast_usd_per_100km}</strong> / 100 km<br>` : ''}
            ${country.co2 ? `🌱 CO₂: <strong>${country.co2.tonnes_per_capita}</strong> t/person (${country.co2.year})` : ''}
          </div>
        </div>`;
      layer.bindPopup(html);
    } else {
      layer.bindPopup(`<div class="popup-content"><div class="popup-title">${name}</div><div style="font-size:12px;color:var(--text-muted)">No data</div></div>`);
    }
    layer.on({
      click: () => {
        if (country) onSelect(country);
      },
    });
  };

  const tileUrl = (() => {
    let effective = theme;
    if (theme === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return effective === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  })();

  const layerKey = `${activeDataset}-${selected?.id ?? 'all'}-${lo}-${hi}`;

  return (
    <div className="map-container">
      <MapContainer
        center={[25, 0]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        worldCopyJump
      >
        <MapFlyTo selected={selected} trip={trip} />
        <ZoomTracker onZoom={setCurrentZoom} />
        <TileLayer
          key={theme}
          url={tileUrl}
          attribution="&copy; OpenStreetMap contributors &copy; CARTO · Data: EC, World Bank, OWID/IEA, Global Carbon Budget"
        />
        {borders && (
          <GeoJSON key={layerKey} data={borders} style={styleFor as any} onEachFeature={onEachFeature} />
        )}
        {trip && trip.polyline.length > 1 && (
          <>
            <Polyline positions={trip.polyline} pathOptions={{ color: '#ffffff', weight: 6, opacity: 0.35 }} />
            <Polyline positions={trip.polyline} pathOptions={{ color: '#3b82f6', weight: 3.5, opacity: 0.95 }} />
            <Marker
              position={trip.polyline[0]}
              icon={L.divIcon({ className: 'trip-endpoint-pin', html: '<div class="trip-pin trip-pin-from">A</div>', iconSize: [22, 22], iconAnchor: [11, 11] })}
            />
            <Marker
              position={trip.polyline[trip.polyline.length - 1]}
              icon={L.divIcon({ className: 'trip-endpoint-pin', html: '<div class="trip-pin trip-pin-to">B</div>', iconSize: [22, 22], iconAnchor: [11, 11] })}
            />
          </>
        )}
        {data.countries.map((c) => {
          const v = spec.extract(c);
          if (v == null || v <= 0) return null;
          const showName = currentZoom >= 4;
          const formatted = formatLabelValue(spec.key, v);
          return (
            <Marker
              key={`label-${c.id}`}
              position={[c.lat, c.lng]}
              icon={buildLabelIcon(c.name, formatted, showName)}
              interactive={false}
              keyboard={false}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
