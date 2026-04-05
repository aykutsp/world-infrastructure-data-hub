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
  source?: string;
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
}

export interface Dataset {
  lastUpdated: string;
  sources: string[];
  coverage: {
    fuel: number;
    electricity: number;
    ev: number;
    co2: number;
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
  | 'co2';

export interface DatasetSpec {
  key: DatasetKey;
  label: string;
  shortLabel: string;
  unit: string;
  /** Lower = greener (good). If `true`, higher is worse. */
  higherIsWorse: boolean;
  /** Extract the numeric value from a country record (null if missing). */
  extract: (c: Country) => number | null;
}

export const DATASETS: DatasetSpec[] = [
  {
    key: 'fuel.gasoline',
    label: 'Gasoline',
    shortLabel: 'Gas',
    unit: 'USD / L',
    higherIsWorse: true,
    extract: (c) => c.fuel?.gasoline ?? null,
  },
  {
    key: 'fuel.diesel',
    label: 'Diesel',
    shortLabel: 'Diesel',
    unit: 'USD / L',
    higherIsWorse: true,
    extract: (c) => c.fuel?.diesel ?? null,
  },
  {
    key: 'fuel.lpg',
    label: 'LPG',
    shortLabel: 'LPG',
    unit: 'USD / L',
    higherIsWorse: true,
    extract: (c) => c.fuel?.lpg ?? null,
  },
  {
    key: 'electricity',
    label: 'Electricity (household)',
    shortLabel: 'Electricity',
    unit: 'USD / kWh',
    higherIsWorse: true,
    extract: (c) => c.electricity?.household_usd_per_kwh ?? null,
  },
  {
    key: 'ev.home',
    label: 'EV charging (home)',
    shortLabel: 'EV home',
    unit: 'USD / 100 km',
    higherIsWorse: true,
    extract: (c) => c.ev?.home_usd_per_100km ?? null,
  },
  {
    key: 'ev.public',
    label: 'EV charging (fast public)',
    shortLabel: 'EV fast',
    unit: 'USD / 100 km',
    higherIsWorse: true,
    extract: (c) => c.ev?.public_fast_usd_per_100km ?? null,
  },
  {
    key: 'co2',
    label: 'CO₂ per capita',
    shortLabel: 'CO₂',
    unit: 't / person / yr',
    higherIsWorse: true,
    extract: (c) => c.co2?.tonnes_per_capita ?? null,
  },
];

export type ThemeType = 'dark' | 'light' | 'system';
