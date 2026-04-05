import { useState } from 'react';
import {
  ArrowRight, LocateFixed, Loader2, MapPin, Play, Plus, RotateCcw, X,
} from 'lucide-react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type {
  Dataset, GeoPoint, TripCostMode, TripRefuel, TripResult,
} from '../../types';

// -- Cost modes --------------------------------------------------------------
//
// Five ways to "pay" for kilometres. Fuel modes use a tank-based refuel model
// (full tank at origin, top up to full whenever the tank reaches 2 % reserve,
// each fill priced at the country you happen to be in). EV modes use a
// linear per-km cost model (you charge continuously; there's no "tank
// boundary" worth simulating at country-atlas resolution).

interface FuelCostModel {
  kind: 'fuel';
  label: string;
  tankL: number;
  rangeKm: number;
  reserveFraction: number;
  fuelKey: 'gasoline' | 'diesel' | 'lpg';
}

interface EvCostModel {
  kind: 'ev';
  label: string;
  consumptionKwhPer100Km: number;
  public: boolean; // true = fast-charge markup applied
}

type CostModel = FuelCostModel | EvCostModel;

const COST_MODELS: Record<TripCostMode, CostModel> = {
  gasoline: {
    kind: 'fuel', label: 'Gasoline', fuelKey: 'gasoline',
    tankL: 50, rangeKm: 900, reserveFraction: 0.02,
  },
  diesel: {
    kind: 'fuel', label: 'Diesel', fuelKey: 'diesel',
    tankL: 55, rangeKm: 1100, reserveFraction: 0.02,
  },
  lpg: {
    kind: 'fuel', label: 'LPG', fuelKey: 'lpg',
    tankL: 70, rangeKm: 700, reserveFraction: 0.02,
  },
  'ev.home': {
    kind: 'ev', label: 'EV (home charge)',
    consumptionKwhPer100Km: 18, public: false,
  },
  'ev.fast': {
    kind: 'ev', label: 'EV (fast charge)',
    consumptionKwhPer100Km: 18, public: true,
  },
};

const FAST_CHARGER_MARKUP = 1.6;

const MAX_STOPS = 8;

const PRESET_ROUTES: Array<{ label: string; from: GeoPoint; to: GeoPoint }> = [
  { label: 'Paris → Munich',    from: { label: 'Paris, France',    lat: 48.8566, lng: 2.3522 },  to: { label: 'Munich, Germany', lat: 48.1374, lng: 11.5755 } },
  { label: 'Madrid → Warsaw',   from: { label: 'Madrid, Spain',    lat: 40.4168, lng: -3.7038 }, to: { label: 'Warsaw, Poland',  lat: 52.2297, lng: 21.0122 } },
  { label: 'Istanbul → Berlin', from: { label: 'Istanbul, Türkiye', lat: 41.0082, lng: 28.9784 }, to: { label: 'Berlin, Germany', lat: 52.52,   lng: 13.405  } },
];

type WaypointKind = 'from' | 'stop' | 'to';
interface Waypoint {
  id: string;
  kind: WaypointKind;
  text: string;
  point: GeoPoint | null;
}
let wpCounter = 0;
const makeWp = (kind: WaypointKind, text = '', point: GeoPoint | null = null): Waypoint => ({
  id: `wp-${++wpCounter}`,
  kind,
  text,
  point,
});

interface Props {
  data: Dataset | null;
  borders: FeatureCollection | null;
  trip: TripResult | null;
  setTrip: (t: TripResult | null) => void;
}

export default function TripCalculator({ data, borders, trip, setTrip }: Props) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => [makeWp('from'), makeWp('to')]);
  const [mode, setMode] = useState<TripCostMode>('gasoline');
  const [loading, setLoading] = useState<'idle' | 'geocoding' | 'routing' | 'locating'>('idle');
  const [error, setError] = useState<string | null>(null);

  const stopCount = waypoints.filter((w) => w.kind === 'stop').length;
  const from = waypoints[0];
  const to = waypoints[waypoints.length - 1];
  const stops = waypoints.slice(1, -1);

  const updateWp = (id: string, patch: Partial<Waypoint>) => {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };
  const addStop = () => {
    if (stopCount >= MAX_STOPS) return;
    setWaypoints((prev) => {
      const out = [...prev];
      out.splice(out.length - 1, 0, makeWp('stop'));
      return out;
    });
  };
  const removeStop = (id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  };
  const applyPreset = (p: (typeof PRESET_ROUTES)[number]) => {
    setWaypoints([makeWp('from', p.from.label, p.from), makeWp('to', p.to.label, p.to)]);
    setError(null);
  };
  const resetAll = () => {
    setWaypoints([makeWp('from'), makeWp('to')]);
    setTrip(null);
    setError(null);
  };

  const geocode = async (query: string): Promise<GeoPoint> => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) throw new Error(`Could not find "${query}"`);
    const r = arr[0];
    return {
      label: r.display_name?.split(',').slice(0, 2).join(',').trim() || query,
      lat: Number(r.lat),
      lng: Number(r.lon),
    };
  };

  const useCurrent = async (id: string) => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not available in this browser.');
      return;
    }
    setError(null);
    setLoading('locating');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000,
        });
      });
      const { latitude, longitude } = pos.coords;
      let label = `Current location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;
      try {
        const rev = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (rev.ok) {
          const j = await rev.json();
          if (j?.display_name) label = j.display_name.split(',').slice(0, 2).join(',').trim();
        }
      } catch { /* ignore */ }
      updateWp(id, { text: label, point: { label, lat: latitude, lng: longitude } });
    } catch (e: any) {
      setError(e?.message || 'Failed to get current location.');
    } finally {
      setLoading('idle');
    }
  };

  const calculate = async () => {
    setError(null);
    if (waypoints.some((w) => !w.text.trim())) {
      setError('Please fill in every From / Stop / To field.');
      return;
    }
    try {
      setLoading('geocoding');
      const resolved: GeoPoint[] = [];
      for (const w of waypoints) {
        if (w.point && w.point.label === w.text) resolved.push(w.point);
        else resolved.push(await geocode(w.text));
      }
      setWaypoints((prev) => prev.map((w, i) => ({ ...w, point: resolved[i] })));
      setLoading('routing');
      const result = await routeAndPrice(resolved, mode, data, borders);
      setTrip(result);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
      setTrip(null);
    } finally {
      setLoading('idle');
    }
  };

  return (
    <div className="trip-panel">
      <div className="trip-form">
        <WpRow wp={from} label="From" loading={loading !== 'idle'}
          onText={(t) => updateWp(from.id, { text: t })}
          onLocate={() => useCurrent(from.id)} />

        {stops.map((s, i) => (
          <WpRow key={s.id} wp={s} label={`Stop ${i + 1}`} loading={loading !== 'idle'}
            onText={(t) => updateWp(s.id, { text: t })}
            onLocate={() => useCurrent(s.id)}
            onRemove={() => removeStop(s.id)} />
        ))}

        <WpRow wp={to} label="To" loading={loading !== 'idle'}
          onText={(t) => updateWp(to.id, { text: t })}
          onLocate={() => useCurrent(to.id)} />

        <button type="button" className="trip-add-stop" onClick={addStop}
          disabled={loading !== 'idle' || stopCount >= MAX_STOPS}>
          <Plus size={12} /> Add stop{stopCount >= MAX_STOPS ? ` (max ${MAX_STOPS})` : ''}
        </button>

        <div className="trip-try-label">Vehicle / fuel</div>
        <div className="trip-mode-grid">
          {(Object.keys(COST_MODELS) as TripCostMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`trip-mode-btn ${mode === m ? 'active' : ''}`}
              onClick={() => setMode(m)}
            >
              {COST_MODELS[m].label}
            </button>
          ))}
        </div>

        <div className="trip-try-label">Try one of these routes</div>
        <div className="trip-presets">
          {PRESET_ROUTES.map((p) => (
            <button key={p.label} type="button" className="trip-preset"
              onClick={() => applyPreset(p)} disabled={loading !== 'idle'}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="trip-actions">
          <button type="button" className="trip-calc-btn" onClick={calculate}
            disabled={loading !== 'idle' || waypoints.some((w) => !w.text.trim())}>
            {loading === 'idle' ? <Play size={14} /> : <Loader2 size={14} className="spin" />}
            <span>
              {loading === 'geocoding' ? 'Looking up places…'
                : loading === 'routing' ? 'Computing route…'
                : loading === 'locating' ? 'Getting location…'
                : 'Calculate'}
            </span>
          </button>
          <button type="button" className="trip-reset-btn" onClick={resetAll} disabled={loading !== 'idle'}>
            <RotateCcw size={14} />
          </button>
        </div>

        {error && <div className="trip-error">{error}</div>}
      </div>

      {trip && <TripReceipt trip={trip} />}

      <div className="trip-footnote">
        Fuel modes use a full tank at the origin and refuel at 2 % reserve. EV modes assume 18 kWh / 100 km
        and a 1.6× markup for public fast charging. Routing via OSRM, geocoding via Nominatim (OpenStreetMap).
      </div>
    </div>
  );
}

function WpRow({
  wp, label, loading, onText, onLocate, onRemove,
}: {
  wp: Waypoint;
  label: string;
  loading: boolean;
  onText: (t: string) => void;
  onLocate: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="trip-wp">
      <label className="trip-label">{label}</label>
      <div className="trip-input-row">
        <input
          className="trip-input"
          placeholder="City, address, landmark…"
          value={wp.text}
          onChange={(e) => onText(e.target.value)}
        />
        <button type="button" className="trip-loc-btn" title="Use current location"
          onClick={onLocate} disabled={loading}>
          <LocateFixed size={14} />
        </button>
        {onRemove && (
          <button type="button" className="trip-loc-btn trip-remove-btn" title="Remove stop"
            onClick={onRemove} disabled={loading}>
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function TripReceipt({ trip }: { trip: TripResult }) {
  const hours = Math.floor(trip.durationMinutes / 60);
  const mins = Math.round(trip.durationMinutes - hours * 60);
  return (
    <div className="trip-receipt">
      <div className="trip-receipt-header">
        <div className="trip-endpoint"><MapPin size={12} /><span>{trip.from.label}</span></div>
        <ArrowRight size={14} />
        <div className="trip-endpoint"><MapPin size={12} /><span>{trip.to.label}</span></div>
      </div>
      <div className="trip-metrics">
        <div><span className="trip-metric-label">Distance</span><span className="trip-metric-value">{trip.totalKm.toFixed(0)} km</span></div>
        <div><span className="trip-metric-label">Drive time</span><span className="trip-metric-value">{hours}h {mins}m</span></div>
        <div>
          <span className="trip-metric-label">Energy</span>
          <span className="trip-metric-value">{trip.totalUnits.toFixed(1)} {trip.unitName}</span>
        </div>
        <div>
          <span className="trip-metric-label">Cost (USD)</span>
          <span className="trip-metric-value trip-metric-cost">${trip.totalCostUSD.toFixed(2)}</span>
        </div>
      </div>

      <div className="trip-legs">
        {trip.refuels.map((r, i) => (
          <div key={i} className="trip-leg">
            <div className="trip-leg-left">
              <span className="trip-leg-country">
                {r.isInitial ? 'Start · ' : `@ ${r.atKm.toFixed(0)} km · `}{r.countryName}
              </span>
              <span className="trip-leg-sub">
                {r.units.toFixed(1)} {r.unitName} ·{' '}
                {r.pricePerUnitUSD > 0
                  ? `$${r.pricePerUnitUSD.toFixed(3)}/${r.unitName}`
                  : 'no price data'}
              </span>
            </div>
            <div className="trip-leg-cost">
              {r.pricePerUnitUSD > 0 ? `$${r.costUSD.toFixed(2)}` : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Routing + cost model --------------------------------------------------

async function routeAndPrice(
  waypoints: GeoPoint[],
  mode: TripCostMode,
  data: Dataset | null,
  borders: FeatureCollection | null,
): Promise<TripResult> {
  const coordsStr = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error('No route found for these waypoints.');
  const route = json.routes[0];
  const totalKm = route.distance / 1000;
  const durationMinutes = route.duration / 60;
  const polyline: Array<[number, number]> = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );

  const model = COST_MODELS[mode];
  const refuels: TripRefuel[] =
    model.kind === 'fuel'
      ? simulateFuelRefuels(polyline, totalKm, model, data, borders, waypoints[0])
      : simulateEvRefuels(polyline, totalKm, model, data, borders, waypoints[0]);

  const totalUnits = refuels.reduce((a, r) => a + r.units, 0);
  const totalCostUSD = refuels.reduce((a, r) => a + r.costUSD, 0);
  const unitName = model.kind === 'fuel' ? 'L' : 'kWh';

  return {
    from: waypoints[0],
    to: waypoints[waypoints.length - 1],
    mode,
    totalKm,
    durationMinutes,
    polyline,
    totalUnits,
    unitName,
    totalCostUSD,
    refuels,
  };
}

function simulateFuelRefuels(
  polyline: Array<[number, number]>,
  totalKm: number,
  model: FuelCostModel,
  data: Dataset | null,
  borders: FeatureCollection | null,
  origin: GeoPoint,
): TripRefuel[] {
  const usableKmPerTank = model.rangeKm * (1 - model.reserveFraction);
  const refillLitres = model.tankL * (1 - model.reserveFraction);

  const resolve = (lng: number, lat: number) => {
    const hit = findCountry(lng, lat, borders);
    const country = hit ? data?.countries.find((c) => c.id === hit.id) : null;
    const price = country?.fuel?.[model.fuelKey] ?? 0;
    return {
      id: hit?.id ?? 'unknown',
      name: country?.name ?? hit?.name ?? 'Unknown',
      price,
      source: country?.fuel?.source,
    };
  };

  const refuels: TripRefuel[] = [];
  const origHit = resolve(origin.lng, origin.lat);
  refuels.push({
    countryId: origHit.id,
    countryName: origHit.name,
    atKm: 0,
    units: model.tankL,
    unitName: 'L',
    pricePerUnitUSD: origHit.price,
    costUSD: model.tankL * origHit.price,
    source: origHit.source,
    isInitial: true,
  });

  let covered = Math.min(usableKmPerTank, totalKm);
  while (covered < totalKm) {
    const [lat, lng] = pointOnPolyline(polyline, covered);
    const hit = resolve(lng, lat);
    refuels.push({
      countryId: hit.id,
      countryName: hit.name,
      atKm: covered,
      units: refillLitres,
      unitName: 'L',
      pricePerUnitUSD: hit.price,
      costUSD: refillLitres * hit.price,
      source: hit.source,
      isInitial: false,
    });
    covered += usableKmPerTank;
  }
  return refuels;
}

function simulateEvRefuels(
  polyline: Array<[number, number]>,
  _totalKm: number,
  model: EvCostModel,
  data: Dataset | null,
  borders: FeatureCollection | null,
  origin: GeoPoint,
): TripRefuel[] {
  // Walk the polyline and accumulate kWh per country. One leg per country
  // entered along the way.
  void origin;
  const perCountry = new Map<string, { km: number; name: string; price: number; source?: string }>();
  let prevLat = polyline[0][0], prevLng = polyline[0][1];

  const markup = model.public ? FAST_CHARGER_MARKUP : 1;
  const resolve = (lng: number, lat: number) => {
    const hit = findCountry(lng, lat, borders);
    const country = hit ? data?.countries.find((c) => c.id === hit.id) : null;
    const base = country?.electricity?.household_usd_per_kwh ?? 0;
    return {
      id: hit?.id ?? 'unknown',
      name: country?.name ?? hit?.name ?? 'Unknown',
      price: base * markup,
      source: country?.electricity?.source,
    };
  };

  const order: string[] = [];
  let lastKey: string | null = null;

  for (let i = 1; i < polyline.length; i++) {
    const [lat, lng] = polyline[i];
    const seg = haversineKm(prevLat, prevLng, lat, lng);
    const midLat = (prevLat + lat) / 2;
    const midLng = (prevLng + lng) / 2;
    const hit = resolve(midLng, midLat);
    const prev = perCountry.get(hit.id);
    perCountry.set(hit.id, {
      km: (prev?.km ?? 0) + seg,
      name: hit.name,
      price: hit.price,
      source: hit.source,
    });
    if (hit.id !== lastKey) {
      order.push(hit.id);
      lastKey = hit.id;
    }
    prevLat = lat;
    prevLng = lng;
  }

  const kwhPerKm = model.consumptionKwhPer100Km / 100;
  const refuels: TripRefuel[] = [];
  let cumKm = 0;
  for (const key of order) {
    const seg = perCountry.get(key)!;
    const kwh = seg.km * kwhPerKm;
    refuels.push({
      countryId: key,
      countryName: seg.name,
      atKm: cumKm,
      units: kwh,
      unitName: 'kWh',
      pricePerUnitUSD: seg.price,
      costUSD: kwh * seg.price,
      source: seg.source,
      isInitial: cumKm === 0,
    });
    cumKm += seg.km;
  }
  return refuels;
}

// ---- Geometry / point-in-country helpers ----------------------------------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function pointOnPolyline(polyline: Array<[number, number]>, targetKm: number): [number, number] {
  let acc = 0;
  for (let i = 1; i < polyline.length; i++) {
    const [aLat, aLng] = polyline[i - 1];
    const [bLat, bLng] = polyline[i];
    const d = haversineKm(aLat, aLng, bLat, bLng);
    if (acc + d >= targetKm) {
      const t = d === 0 ? 0 : (targetKm - acc) / d;
      return [aLat + (bLat - aLat) * t, aLng + (bLng - aLng) * t];
    }
    acc += d;
  }
  return polyline[polyline.length - 1];
}

const bboxCache = new WeakMap<Feature, [number, number, number, number] | null>();
function featureBBox(feature: Feature): [number, number, number, number] | null {
  const cached = bboxCache.get(feature);
  if (cached !== undefined) return cached;
  const g = feature.geometry as Geometry | null;
  if (!g) {
    bboxCache.set(feature, null);
    return null;
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (coords: any) => {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      return;
    }
    for (const c of coords) walk(c);
  };
  if ('coordinates' in g && g.coordinates) walk(g.coordinates);
  const bbox: [number, number, number, number] | null = isFinite(minX) ? [minX, minY, maxX, maxY] : null;
  bboxCache.set(feature, bbox);
  return bbox;
}

function findCountry(lng: number, lat: number, borders: FeatureCollection | null): { id: string; name: string } | null {
  if (!borders) return null;
  for (const feature of borders.features) {
    const bbox = featureBBox(feature);
    if (!bbox) continue;
    if (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;
    if (pointInFeature(lng, lat, feature)) {
      const p: any = feature.properties || {};
      const iso2 = (p.ISO_A2_EH || p.ISO_A2 || '').toUpperCase();
      const name = p.NAME || p.ADMIN || iso2 || 'Unknown';
      return { id: iso2 || name, name };
    }
  }
  return null;
}

function pointInFeature(lng: number, lat: number, feature: Feature): boolean {
  const g = feature.geometry;
  if (!g) return false;
  if (g.type === 'Polygon') return pointInPolygon(lng, lat, g.coordinates as number[][][]);
  if (g.type === 'MultiPolygon') {
    for (const poly of g.coordinates as number[][][][]) {
      if (pointInPolygon(lng, lat, poly)) return true;
    }
  }
  return false;
}

function pointInPolygon(lng: number, lat: number, polygon: number[][][]): boolean {
  if (!pointInRing(lng, lat, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(lng, lat, polygon[i])) return false;
  }
  return true;
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
