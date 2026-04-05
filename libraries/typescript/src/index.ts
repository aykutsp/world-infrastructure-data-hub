/**
 * world-infra-data — TypeScript / JavaScript client for the
 * World Infrastructure Data Hub open data API.
 *
 * Base: https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/
 */

export interface FuelBlock {
  gasoline: number | null;
  diesel: number | null;
  lpg: number | null;
  source?: string;
}

export interface ElectricityBlock {
  household_usd_per_kwh: number;
  year: number;
  period?: string;
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
  id: string;
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
}

export interface Dataset {
  lastUpdated: string;
  sources: string[];
  coverage: Record<string, number>;
  countries: Country[];
}

export type FuelType = 'gasoline' | 'diesel' | 'lpg';
export type MetricKey =
  | 'fuel.gasoline'
  | 'fuel.diesel'
  | 'fuel.lpg'
  | 'electricity'
  | 'ev.home'
  | 'ev.fast'
  | 'co2'
  | 'gridCO2'
  | 'wb.gdp'
  | 'wb.life'
  | 'wb.internet'
  | 'wb.renewables'
  | 'wb.gini'
  | 'wb.unemployment'
  | 'wb.inflation';

const DEFAULT_BASE = 'https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/';

export interface ClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export class WorldInfraDataClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private cached: Dataset | null = null;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '') + '/';
    this.fetcher = options.fetch ?? fetch;
  }

  async getDataset(force = false): Promise<Dataset> {
    if (!force && this.cached) return this.cached;
    const res = await this.fetcher(`${this.baseUrl}countries.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching countries.json`);
    this.cached = (await res.json()) as Dataset;
    return this.cached;
  }

  async getCountries(): Promise<Country[]> {
    return (await this.getDataset()).countries;
  }

  async getCountry(iso2: string): Promise<Country | null> {
    const d = await this.getDataset();
    return d.countries.find((c) => c.id.toUpperCase() === iso2.toUpperCase()) ?? null;
  }

  async metric(key: MetricKey, iso2: string): Promise<number | null> {
    const country = await this.getCountry(iso2);
    if (!country) return null;
    return extractMetric(country, key);
  }

  async rank(key: MetricKey, direction: 'asc' | 'desc' = 'asc', limit = 10): Promise<Country[]> {
    const d = await this.getDataset();
    const entries = d.countries
      .map((c) => ({ c, v: extractMetric(c, key) }))
      .filter((x): x is { c: Country; v: number } => x.v != null && isFinite(x.v) && x.v > 0);
    entries.sort((a, b) => (direction === 'asc' ? a.v - b.v : b.v - a.v));
    return entries.slice(0, limit).map((x) => x.c);
  }

  async globalAverage(key: MetricKey): Promise<number> {
    const d = await this.getDataset();
    const vals = d.countries.map((c) => extractMetric(c, key)).filter((v): v is number => v != null && v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
}

export function extractMetric(c: Country, key: MetricKey): number | null {
  switch (key) {
    case 'fuel.gasoline': return c.fuel?.gasoline ?? null;
    case 'fuel.diesel':   return c.fuel?.diesel ?? null;
    case 'fuel.lpg':      return c.fuel?.lpg ?? null;
    case 'electricity':   return c.electricity?.household_usd_per_kwh ?? null;
    case 'ev.home':       return c.ev?.home_usd_per_100km ?? null;
    case 'ev.fast':       return c.ev?.public_fast_usd_per_100km ?? null;
    case 'co2':           return c.co2?.tonnes_per_capita ?? null;
    case 'gridCO2':       return c.gridCO2?.gco2_per_kwh ?? null;
    case 'wb.gdp':        return c.worldBank?.gdp_per_capita_usd?.value ?? null;
    case 'wb.life':       return c.worldBank?.life_expectancy_years?.value ?? null;
    case 'wb.internet':   return c.worldBank?.internet_users_pct?.value ?? null;
    case 'wb.renewables': return c.worldBank?.renewable_electricity_pct?.value ?? null;
    case 'wb.gini':       return c.worldBank?.gini_index?.value ?? null;
    case 'wb.unemployment': return c.worldBank?.unemployment_pct?.value ?? null;
    case 'wb.inflation':  return c.worldBank?.inflation_pct?.value ?? null;
    default: return null;
  }
}

export const worldInfraData = new WorldInfraDataClient();
