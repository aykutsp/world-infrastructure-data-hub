export interface FuelBlock {
  gasoline: number | null;
  diesel: number | null;
  lpg: number | null;
  source?: string;
}

export interface ElectricityBlock {
  household_usd_per_kwh: number;
  year: number;
  source?: string;
}

export interface EvBlock {
  home_usd_per_100km: number;
  public_fast_usd_per_100km: number;
  assumptions: {
    consumption_kwh_per_100km: number;
    fast_charger_markup: number;
  };
}

export interface CO2Block {
  year: number;
  tonnes_per_capita: number;
  total_million_tonnes: number | null;
  history?: Array<[number, number]>;
  source?: string;
}

export interface GridCO2Block {
  gco2_per_kwh: number;
  year: number;
  source?: string;
}

export interface ChargingStationsBlock {
  operational_stations: number;
  source?: string;
}

export interface WBIndicator {
  value: number;
  year: number;
  source?: string;
  history?: Array<[number, number]>;
}

export interface WorldBankBlock {
  gdp_per_capita_usd?: WBIndicator;
  population?: WBIndicator;
  life_expectancy_years?: WBIndicator;
  internet_users_pct?: WBIndicator;
  renewable_electricity_pct?: WBIndicator;
  gini_index?: WBIndicator;
  unemployment_pct?: WBIndicator;
  inflation_pct?: WBIndicator;
}

export interface Country {
  id: string;           // ISO 3166-1 alpha-2
  iso3?: string;
  name: string;
  lat: number;
  lng: number;
  fuel: FuelBlock | null;
  electricity: ElectricityBlock | null;
  ev: EvBlock | null;
  co2: CO2Block | null;
  gridCO2: GridCO2Block | null;
  worldBank: WorldBankBlock | null;
  chargingStations?: ChargingStationsBlock | null;
}

export interface Dataset {
  lastUpdated: string;
  sources: string[];
  coverage: {
    fuel: number;
    electricity: number;
    ev: number;
    co2: number;
    worldBank?: number;
    happiness?: number;
  };
  countries: Country[];
}

/**
 * Which dataset the user is currently looking at. Determines the choropleth
 * colour ramp and what the sidebar list prints next to each country.
 */
export type DatasetKey =
  | 'fuel.gasoline'
  | 'fuel.diesel'
  | 'fuel.lpg'
  | 'electricity'
  | 'ev.home'
  | 'ev.public'
  | 'co2'
  | 'grid.co2'
  | 'wb.gdp'
  | 'wb.life'
  | 'wb.internet'
  | 'wb.renewables'
  | 'wb.gini'
  | 'wb.unemployment'
  | 'wb.inflation';

export interface DatasetSpec {
  key: DatasetKey;
  /** Top-level section in the sidebar toggle ("Cost", "Energy", "Society"). */
  group: 'cost' | 'energy' | 'society';
  label: string;
  shortLabel: string;
  unit: string;
  /**
   * If `true`, higher values get the "red" end of the palette (e.g. prices,
   * unemployment). If `false`, higher values are good (e.g. life expectancy,
   * internet penetration, renewables share) and get the green end.
   */
  higherIsWorse: boolean;
  /** Extract the numeric value from a country record (null if missing). */
  extract: (c: Country) => number | null;
}

export const DATASETS: DatasetSpec[] = [
  // Cost of living / travel
  { key: 'fuel.gasoline', group: 'cost', label: 'Gasoline',               shortLabel: 'Gas',         unit: 'USD / L',         higherIsWorse: true,  extract: (c) => c.fuel?.gasoline ?? null },
  { key: 'fuel.diesel',   group: 'cost', label: 'Diesel',                 shortLabel: 'Diesel',      unit: 'USD / L',         higherIsWorse: true,  extract: (c) => c.fuel?.diesel ?? null },
  { key: 'fuel.lpg',      group: 'cost', label: 'LPG',                    shortLabel: 'LPG',         unit: 'USD / L',         higherIsWorse: true,  extract: (c) => c.fuel?.lpg ?? null },
  { key: 'electricity',   group: 'cost', label: 'Electricity (household)', shortLabel: 'Electric',   unit: 'USD / kWh',       higherIsWorse: true,  extract: (c) => c.electricity?.household_usd_per_kwh ?? null },
  { key: 'ev.home',       group: 'cost', label: 'EV charging (home)',     shortLabel: 'EV home',     unit: 'USD / 100 km',    higherIsWorse: true,  extract: (c) => c.ev?.home_usd_per_100km ?? null },
  { key: 'ev.public',     group: 'cost', label: 'EV charging (fast)',     shortLabel: 'EV fast',     unit: 'USD / 100 km',    higherIsWorse: true,  extract: (c) => c.ev?.public_fast_usd_per_100km ?? null },

  // Energy & environment
  { key: 'co2',            group: 'energy', label: 'CO₂ per capita',       shortLabel: 'CO₂',         unit: 't / person / yr', higherIsWorse: true,  extract: (c) => c.co2?.tonnes_per_capita ?? null },
  { key: 'grid.co2',       group: 'energy', label: 'Grid CO₂ intensity',  shortLabel: 'Grid CO₂',   unit: 'gCO₂ / kWh',       higherIsWorse: true,  extract: (c) => c.gridCO2?.gco2_per_kwh ?? null },
  { key: 'wb.renewables',  group: 'energy', label: 'Renewable electricity share', shortLabel: 'Renewables', unit: '% of total',    higherIsWorse: false, extract: (c) => c.worldBank?.renewable_electricity_pct?.value ?? null },

  // Society & economy
  { key: 'wb.gdp',         group: 'society', label: 'GDP per capita',      shortLabel: 'GDP/cap',     unit: 'USD',             higherIsWorse: false, extract: (c) => c.worldBank?.gdp_per_capita_usd?.value ?? null },
  { key: 'wb.life',        group: 'society', label: 'Life expectancy',     shortLabel: 'Life',        unit: 'years',           higherIsWorse: false, extract: (c) => c.worldBank?.life_expectancy_years?.value ?? null },
  { key: 'wb.internet',    group: 'society', label: 'Internet users',      shortLabel: 'Internet',    unit: '% of population', higherIsWorse: false, extract: (c) => c.worldBank?.internet_users_pct?.value ?? null },
  { key: 'wb.gini',        group: 'society', label: 'Gini index',          shortLabel: 'Gini',        unit: '0–100',           higherIsWorse: true,  extract: (c) => c.worldBank?.gini_index?.value ?? null },
  { key: 'wb.unemployment',group: 'society', label: 'Unemployment',        shortLabel: 'Unempl.',     unit: '%',               higherIsWorse: true,  extract: (c) => c.worldBank?.unemployment_pct?.value ?? null },
  { key: 'wb.inflation',   group: 'society', label: 'Inflation (CPI)',     shortLabel: 'Inflation',   unit: '% yoy',           higherIsWorse: true,  extract: (c) => c.worldBank?.inflation_pct?.value ?? null },
];

export type ThemeType = 'dark' | 'light' | 'system';

export type ViewMode = 'explore' | 'compare' | 'trip';

// ---- Trip calculator types ------------------------------------------------

export interface GeoPoint {
  label: string;
  lat: number;
  lng: number;
}

export type TripCostMode = 'gasoline' | 'diesel' | 'lpg' | 'ev.home' | 'ev.fast';

export interface TripRefuel {
  countryId: string;
  countryName: string;
  atKm: number;
  /** For fuel modes this is litres; for EV modes this is kWh. */
  units: number;
  unitName: 'L' | 'kWh';
  pricePerUnitUSD: number;
  costUSD: number;
  isInitial: boolean;
  source?: string;
}

export interface TripResult {
  from: GeoPoint;
  to: GeoPoint;
  mode: TripCostMode;
  totalKm: number;
  durationMinutes: number;
  polyline: Array<[number, number]>;
  totalUnits: number;
  unitName: 'L' | 'kWh';
  totalCostUSD: number;
  refuels: TripRefuel[];
}
