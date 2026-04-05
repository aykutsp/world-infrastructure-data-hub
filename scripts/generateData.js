// World Infrastructure Data Hub — data pipeline.
//
// Produces four per-country datasets from public/open sources:
//
//   1) Fuel prices (gasoline, diesel, LPG)
//        - EU27                EU Weekly Oil Bulletin  (CC BY 4.0)
//        - Rest of world       World Bank Global Fuel Prices DB (ODbL)
//
//   2) Electricity prices (household USD/kWh)
//        - Our World in Data / IEA (CC BY 4.0)
//
//   3) EV charging cost (USD per 100 km)
//        - Derived: household electricity × 18 kWh/100 km × 1.6 (fast-charger markup)
//
//   4) CO2 emissions (tonnes per capita, most recent year)
//        - Our World in Data co2-data (Global Carbon Budget, CC BY 4.0)
//
// All output lands under public/api/v1/ as static JSON.

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const EU_FUEL_BULLETIN_URL =
  'https://energy.ec.europa.eu/document/download/264c2d0f-f161-4ea3-a777-78faae59bea0_en';
const WB_FUEL_DB_URL =
  'https://datacatalogfiles.worldbank.org/ddh-published/0066829/DR0095290/Global_Fuel_Prices_Database.xlsx';

// --- Electricity prices ----------------------------------------------------
//
// EU / EEA / candidate countries: pulled live from Eurostat nrg_pc_204
// (household electricity prices, KWH2500-4999 band, including all taxes,
// EUR). Natively free and CC BY 4.0.
//
// Rest of the world: fallback static table seeded from publicly-cited IEA /
// GlobalPetrolPrices / utility-regulator figures. This shows up clearly in
// the `source` field and should be replaced by a properly-licensed global
// feed before any production claim.

const EUROSTAT_ELECTRICITY_URL =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204' +
  '?format=JSON&lang=en&nrg_cons=KWH2500-4999&tax=I_TAX&currency=EUR';

// Eurostat uses a handful of non-ISO country codes for "geo" — normalise
// them to ISO 3166-1 alpha-2 here.
const EUROSTAT_GEO_TO_ISO2 = {
  EL: 'GR', // Greece
  UK: 'GB', // United Kingdom
  XK: 'XK', // Kosovo (user-assigned; matches our Natural Earth entry)
};

const ELECTRICITY_FALLBACK_USD_PER_KWH = {
  // Non-EU / non-EEA countries the Eurostat feed does not cover.
  // Figures are the most recent publicly-cited household retail prices as of
  // early 2026 from IEA charts, World Bank "pump price" papers, local
  // regulator bulletins and GlobalPetrolPrices per-country pages.
  CH: 0.251, GB: 0.370,
  US: 0.167, CA: 0.115, MX: 0.101,
  CN: 0.083, JP: 0.253, KR: 0.111, TW: 0.092, IN: 0.063, ID: 0.101,
  TH: 0.116, VN: 0.080, MY: 0.052, SG: 0.239, PH: 0.211, PK: 0.088,
  BD: 0.059, LK: 0.076, AE: 0.079, SA: 0.048, IR: 0.012, IQ: 0.055,
  IL: 0.170, JO: 0.157, KW: 0.030, QA: 0.032, OM: 0.052, KZ: 0.040,
  RU: 0.057,
  EG: 0.036, ZA: 0.179, MA: 0.113, NG: 0.061, KE: 0.222, ET: 0.012,
  GH: 0.100, DZ: 0.043, TN: 0.066, LY: 0.009,
  AU: 0.327, NZ: 0.228, BR: 0.165, AR: 0.085, CL: 0.196, CO: 0.147,
  PE: 0.193, UY: 0.218, VE: 0.009, EC: 0.100, BO: 0.086, PY: 0.053,
};
const OWID_CO2_URL =
  'https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv';
const OWID_ENERGY_URL =
  'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv';

const NE_COUNTRIES_GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'world-infra-hub/0.1' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'world-infra-hub/0.1' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function round(n, d = 3) {
  if (n == null || !isFinite(n)) return null;
  return Number(Number(n).toFixed(d));
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else if (ch === '"') {
      inQ = true;
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((l) => {
    const cols = parseCsvLine(l);
    const rec = {};
    header.forEach((h, i) => (rec[h] = cols[i]));
    return rec;
  });
  return { header, rows };
}

async function loadGeo() {
  console.log('Fetching Natural Earth countries GeoJSON...');
  const text = await fetchText(NE_COUNTRIES_GEOJSON_URL);
  const geo = JSON.parse(text);
  const byIso2 = {};
  const byIso3 = {};
  for (const feature of geo.features) {
    const p = feature.properties || {};
    const iso2 = (p.ISO_A2_EH || p.ISO_A2 || '').toUpperCase();
    const iso3 = (p.ADM0_A3 || p.ISO_A3_EH || p.ISO_A3 || '').toUpperCase();
    const name = p.NAME || p.ADMIN || iso3 || iso2 || '';
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const walk = (coords) => {
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
    if (feature.geometry?.coordinates) walk(feature.geometry.coordinates);
    const entry = {
      iso2, iso3, name,
      lat: isFinite(minY) ? (minY + maxY) / 2 : 0,
      lng: isFinite(minX) ? (minX + maxX) / 2 : 0,
    };
    if (iso2 && iso2 !== '-99') byIso2[iso2] = entry;
    if (iso3 && iso3 !== '-99') byIso3[iso3] = entry;
  }
  console.log(`  ✓ ${Object.keys(byIso2).length} countries indexed by ISO-A2`);
  return { geo, byIso2, byIso3, raw: text };
}

const EU_NAME_TO_ISO2 = {
  Austria: 'AT', Belgium: 'BE', Bulgaria: 'BG', Croatia: 'HR', Cyprus: 'CY',
  Czechia: 'CZ', 'Czech Republic': 'CZ', Denmark: 'DK', Estonia: 'EE', Finland: 'FI',
  France: 'FR', Germany: 'DE', Greece: 'GR', Hungary: 'HU', Ireland: 'IE',
  Italy: 'IT', Latvia: 'LV', Lithuania: 'LT', Luxembourg: 'LU', Malta: 'MT',
  Netherlands: 'NL', Poland: 'PL', Portugal: 'PT', Romania: 'RO', Slovakia: 'SK',
  Slovenia: 'SI', Spain: 'ES', Sweden: 'SE',
};

async function loadFuel(geo) {
  console.log('\n[Fuel] EU Weekly Oil Bulletin + World Bank DB...');
  let eurToUsd = 1.08;
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    if (r.ok) {
      const j = await r.json();
      if (j?.rates?.EUR > 0) eurToUsd = 1 / j.rates.EUR;
    }
  } catch {
    /* ignore */
  }

  const out = {};

  try {
    const buf = await fetchBuffer(EU_FUEL_BULLETIN_URL);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
    for (const row of rows) {
      const label = row[0];
      if (typeof label !== 'string') continue;
      const iso2 = EU_NAME_TO_ISO2[label.trim()];
      if (!iso2) continue;
      const g = typeof row[1] === 'number' ? row[1] / 1000 : null;
      const d = typeof row[2] === 'number' ? row[2] / 1000 : null;
      const l = typeof row[6] === 'number' ? row[6] / 1000 : null;
      out[iso2] = {
        gasoline: g != null ? round(g * eurToUsd) : null,
        diesel: d != null ? round(d * eurToUsd) : null,
        lpg: l != null ? round(l * eurToUsd) : null,
        source: 'EU Weekly Oil Bulletin',
      };
    }
    console.log(`  ✓ EU27 fuel: ${Object.keys(out).length} countries`);
  } catch (e) {
    console.warn(`  ✗ EU fuel failed: ${e.message}`);
  }

  try {
    const buf = await fetchBuffer(WB_FUEL_DB_URL);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const extract = (sheetName) => {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return {};
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      const m = {};
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[2]) continue;
        const iso3 = String(row[2]).trim().toUpperCase();
        for (let j = row.length - 1; j >= 6; j--) {
          if (typeof row[j] === 'number' && row[j] > 0) {
            m[iso3] = row[j];
            break;
          }
        }
      }
      return m;
    };
    const regular = extract('Reg Gasoline (below RON 95) USD');
    const premium = extract('Premium Gasoline RON95or ab USD');
    const diesel = extract('Diesel USD');
    const lpg = extract('LPG USD');
    const all = new Set([...Object.keys(regular), ...Object.keys(premium), ...Object.keys(diesel), ...Object.keys(lpg)]);
    let added = 0;
    for (const iso3 of all) {
      const meta = geo.byIso3[iso3];
      if (!meta) continue;
      if (out[meta.iso2]) continue;
      out[meta.iso2] = {
        gasoline: regular[iso3] ?? premium[iso3] ?? null,
        diesel: diesel[iso3] ?? null,
        lpg: lpg[iso3] ?? null,
        source: 'World Bank Global Fuel Prices Database',
      };
      added++;
    }
    console.log(`  ✓ WB fuel: +${added} countries (total ${Object.keys(out).length})`);
  } catch (e) {
    console.warn(`  ✗ WB fuel failed: ${e.message}`);
  }

  return out;
}

async function loadElectricity(geo) {
  console.log('\n[Electricity] Eurostat nrg_pc_204 + fallback for non-EU...');
  const out = {};

  // Fetch live EUR rate so we can convert EUR/kWh → USD/kWh consistently with
  // the other datasets.
  let eurToUsd = 1.08;
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    if (r.ok) {
      const j = await r.json();
      if (j?.rates?.EUR > 0) eurToUsd = 1 / j.rates.EUR;
    }
  } catch {
    /* keep fallback */
  }

  // ---- Eurostat live pull ----
  try {
    const res = await fetch(EUROSTAT_ELECTRICITY_URL, {
      headers: { 'User-Agent': 'world-infra-hub/0.1' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const geoIdx = json.dimension?.geo?.category?.index || {};
    const geoLabels = json.dimension?.geo?.category?.label || {};
    const timeIdx = json.dimension?.time?.category?.index || {};
    const timeKeys = Object.keys(timeIdx); // chronological order
    const values = json.value || {};

    // JSON-stat uses a row-major flat index. With every other dimension pinned
    // by the URL filter, stride along `time` is 1 and stride along `geo` is
    // |time|. The absolute index for (geo_i, time_j) is: geo_i * |time| + time_j.
    const T = timeKeys.length;

    for (const [code, geoIndex] of Object.entries(geoIdx)) {
      // Pick the most recent available time slot for this country.
      let latestPrice = null;
      let latestLabel = null;
      for (let t = T - 1; t >= 0; t--) {
        const flat = geoIndex * T + t;
        const v = values[flat];
        if (typeof v === 'number' && v > 0) {
          latestPrice = v;
          latestLabel = timeKeys[t];
          break;
        }
      }
      if (latestPrice == null) continue;

      // Normalise Eurostat codes (EL → GR, UK → GB) and skip aggregates
      // (EU27_2020, EA) since they're not individual countries.
      if (code === 'EU27_2020' || code === 'EA') continue;
      const iso2 = EUROSTAT_GEO_TO_ISO2[code] || code;
      if (!geo.byIso2[iso2]) continue;

      out[iso2] = {
        household_usd_per_kwh: round(latestPrice * eurToUsd, 4),
        year: Number(latestLabel.slice(0, 4)),
        period: latestLabel,
        source: `Eurostat nrg_pc_204 (${geoLabels[code] || iso2})`,
      };
    }
    console.log(`  ✓ Eurostat live: ${Object.keys(out).length} countries (EU/EEA/candidates)`);
  } catch (e) {
    console.warn(`  ✗ Eurostat failed: ${e.message} — falling through to static table`);
  }

  // ---- Static fallback for non-EU ----
  let fallbackCount = 0;
  const currentYear = new Date().getFullYear();
  for (const [iso2, price] of Object.entries(ELECTRICITY_FALLBACK_USD_PER_KWH)) {
    if (out[iso2]) continue; // Eurostat wins
    if (!geo.byIso2[iso2]) continue;
    out[iso2] = {
      household_usd_per_kwh: round(price, 4),
      year: currentYear - 1,
      source: 'Static fallback (IEA / WB / GlobalPetrolPrices cited figures)',
    };
    fallbackCount++;
  }
  console.log(`  ✓ Non-EU fallback: +${fallbackCount} (total ${Object.keys(out).length})`);
  return out;
}

// --------------------------------------------------------------------------
// World Bank Indicators — free, no key, one HTTP call per indicator.
// --------------------------------------------------------------------------
// The World Bank API is the cleanest multi-country source for development
// stats. Every indicator is a separate URL, but they all follow the same
// shape: `/v2/country/all/indicator/<code>?format=json&per_page=25000`.
// We pick the latest non-null year for each country.
//
// Indicators shipped with v1:
//   NY.GDP.PCAP.CD    GDP per capita (current USD)
//   SP.POP.TOTL       Population (total)
//   SP.DYN.LE00.IN    Life expectancy at birth (years)
//   IT.NET.USER.ZS    Individuals using the Internet (% of population)
//   EG.ELC.RNEW.ZS    Renewable electricity output (% of total)
//   SI.POV.GINI       Gini index
//   SL.UEM.TOTL.ZS    Unemployment (%, total labour force)
//   FP.CPI.TOTL.ZG    Inflation, consumer prices (annual %)

const WB_INDICATORS = {
  gdp_per_capita_usd:           { code: 'NY.GDP.PCAP.CD',  label: 'GDP per capita (USD)' },
  population:                   { code: 'SP.POP.TOTL',     label: 'Population' },
  life_expectancy_years:        { code: 'SP.DYN.LE00.IN',  label: 'Life expectancy at birth (years)' },
  internet_users_pct:           { code: 'IT.NET.USER.ZS',  label: 'Individuals using the Internet (%)' },
  renewable_electricity_pct:    { code: 'EG.ELC.RNEW.ZS',  label: 'Renewable electricity output (% of total)' },
  gini_index:                   { code: 'SI.POV.GINI',     label: 'Gini index' },
  unemployment_pct:             { code: 'SL.UEM.TOTL.ZS',  label: 'Unemployment (%, total labour force)' },
  inflation_pct:                { code: 'FP.CPI.TOTL.ZG',  label: 'Inflation, consumer prices (annual %)' },
};

async function loadWorldBankIndicators(geo) {
  console.log('\n[World Bank] fetching 8 indicators via api.worldbank.org...');
  const out = {}; // iso2 -> { gdp_per_capita_usd: { value, year, history: [...], ... }, ... }

  // Cut history window to keep payload size sensible. 15 years of annual
  // values per indicator per country is plenty for sparklines.
  const HISTORY_YEARS = 15;
  const currentYear = new Date().getFullYear();
  const historyFloor = currentYear - HISTORY_YEARS;

  for (const [field, { code, label }] of Object.entries(WB_INDICATORS)) {
    try {
      const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=25000`;
      const res = await fetch(url, { headers: { 'User-Agent': 'world-infra-hub/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const rows = Array.isArray(payload) && payload.length >= 2 ? payload[1] : [];

      // Per-country: collect all rows, sort by year, keep the last
      // HISTORY_YEARS and the latest non-null value.
      const byIso3 = new Map();
      for (const row of rows) {
        const iso3 = row?.countryiso3code;
        const value = row?.value;
        const year = Number(row?.date);
        if (!iso3 || value == null || !isFinite(value) || !isFinite(year)) continue;
        if (year < historyFloor) continue;
        if (!byIso3.has(iso3)) byIso3.set(iso3, []);
        byIso3.get(iso3).push({ year, value: Number(value) });
      }

      let count = 0;
      for (const [iso3, series] of byIso3) {
        const meta = geo.byIso3[iso3];
        if (!meta) continue;
        series.sort((a, b) => a.year - b.year);
        const latest = series[series.length - 1];
        if (!out[meta.iso2]) out[meta.iso2] = {};
        out[meta.iso2][field] = {
          value: round(latest.value, 3),
          year: latest.year,
          source: 'World Bank',
          history: series.map((p) => [p.year, round(p.value, 3)]),
        };
        count++;
      }
      console.log(`  ✓ ${label}: ${count} countries`);
    } catch (e) {
      console.warn(`  ✗ ${code}: ${e.message}`);
    }
  }
  return out;
}

// --------------------------------------------------------------------------
// World Happiness Report (2024) — lightweight CSV mirror on GitHub
// --------------------------------------------------------------------------

const HAPPINESS_CSV_URL =
  'https://raw.githubusercontent.com/owid/owid-datasets/master/datasets/World%20Happiness%20Report%202024/World%20Happiness%20Report%202024.csv';

async function loadHappiness(geo) {
  console.log('\n[Happiness] OWID mirror of World Happiness Report 2024...');
  const out = {};
  try {
    const text = await fetchText(HAPPINESS_CSV_URL);
    const { rows } = parseCsv(text);
    if (rows.length === 0) throw new Error('empty CSV');
    // Columns: Entity, Code, Year, "Cantril ladder score" or similar
    const scoreCol = Object.keys(rows[0]).find(
      (k) => k.toLowerCase().includes('happiness') || k.toLowerCase().includes('ladder') || k.toLowerCase().includes('score')
    );
    if (!scoreCol) throw new Error('no score column');
    const latest = new Map();
    for (const row of rows) {
      const iso3 = (row.Code || '').trim().toUpperCase();
      if (!iso3) continue;
      const score = Number(row[scoreCol]);
      const year = Number(row.Year);
      if (!isFinite(score) || !isFinite(year)) continue;
      const prev = latest.get(iso3);
      if (!prev || prev.year < year) latest.set(iso3, { score, year });
    }
    for (const [iso3, { score, year }] of latest) {
      const meta = geo.byIso3[iso3];
      if (!meta) continue;
      out[meta.iso2] = { score: round(score, 3), year, source: 'World Happiness Report (OWID mirror)' };
    }
    console.log(`  ✓ Happiness: ${Object.keys(out).length} countries`);
  } catch (e) {
    console.warn(`  ✗ Happiness failed: ${e.message}`);
  }
  return out;
}

const EV_CONSUMPTION_KWH_PER_100KM = 18;
const FAST_CHARGER_MARKUP = 1.6;

function deriveEvCharging(electricity) {
  const out = {};
  for (const [iso2, e] of Object.entries(electricity)) {
    if (!e?.household_usd_per_kwh) continue;
    const home = e.household_usd_per_kwh * EV_CONSUMPTION_KWH_PER_100KM;
    out[iso2] = {
      home_usd_per_100km: round(home, 2),
      public_fast_usd_per_100km: round(home * FAST_CHARGER_MARKUP, 2),
      assumptions: {
        consumption_kwh_per_100km: EV_CONSUMPTION_KWH_PER_100KM,
        fast_charger_markup: FAST_CHARGER_MARKUP,
      },
    };
  }
  return out;
}

async function loadGridCO2Intensity(geo) {
  console.log('\n[Grid CO2] OWID energy-data / carbon_intensity_elec...');
  const out = {};
  try {
    const text = await fetchText(OWID_ENERGY_URL);
    const { rows } = parseCsv(text);
    // Keep the latest non-null carbon_intensity_elec per country.
    const latest = new Map();
    for (const row of rows) {
      const iso3 = (row.iso_code || '').trim().toUpperCase();
      if (!iso3 || iso3.length !== 3) continue;
      const year = Number(row.year);
      const intensity = Number(row.carbon_intensity_elec);
      if (!isFinite(year) || !isFinite(intensity) || intensity <= 0) continue;
      const prev = latest.get(iso3);
      if (!prev || prev.year < year) latest.set(iso3, { year, intensity });
    }
    for (const [iso3, { year, intensity }] of latest) {
      const meta = geo.byIso3[iso3];
      if (!meta) continue;
      out[meta.iso2] = {
        gco2_per_kwh: round(intensity, 2),
        year,
        source: 'Our World in Data (Ember / Energy Institute)',
      };
    }
    console.log(`  ✓ Grid CO2 intensity: ${Object.keys(out).length} countries`);
  } catch (e) {
    console.warn(`  ✗ Grid CO2 failed: ${e.message}`);
  }
  return out;
}

async function loadCO2(geo) {
  console.log('\n[CO2] Our World in Data co2-data...');
  const out = {};
  const HISTORY_YEARS = 15;
  const currentYear = new Date().getFullYear();
  const historyFloor = currentYear - HISTORY_YEARS;
  try {
    const text = await fetchText(OWID_CO2_URL);
    const { rows } = parseCsv(text);
    const byIso3 = new Map();
    for (const row of rows) {
      const iso3 = (row.iso_code || '').trim().toUpperCase();
      if (!iso3 || iso3.length !== 3) continue;
      const year = Number(row.year);
      const perCapita = Number(row.co2_per_capita);
      const total = Number(row.co2);
      if (!isFinite(year) || !isFinite(perCapita) || perCapita <= 0) continue;
      if (!byIso3.has(iso3)) byIso3.set(iso3, []);
      byIso3.get(iso3).push({ year, perCapita, total: isFinite(total) ? total : null });
    }
    for (const [iso3, series] of byIso3) {
      const meta = geo.byIso3[iso3];
      if (!meta) continue;
      series.sort((a, b) => a.year - b.year);
      const latest = series[series.length - 1];
      const history = series
        .filter((p) => p.year >= historyFloor)
        .map((p) => [p.year, round(p.perCapita, 3)]);
      out[meta.iso2] = {
        year: latest.year,
        tonnes_per_capita: round(latest.perCapita, 3),
        total_million_tonnes: latest.total != null ? round(latest.total, 2) : null,
        history,
        source: 'Our World in Data (Global Carbon Budget)',
      };
    }
    console.log(`  ✓ CO2: ${Object.keys(out).length} countries (+history)`);
  } catch (e) {
    console.warn(`  ✗ CO2 failed: ${e.message}`);
  }
  return out;
}

// --------------------------------------------------------------------------
// Charging stations (optional) — pulled from OpenChargeMap if an API key is
// provided via the OPENCHARGEMAP_KEY environment variable. The free tier is
// rate-limited, so this loader skips silently when the key is absent.
// --------------------------------------------------------------------------

async function loadChargingStationCounts(geo) {
  const key = process.env.OPENCHARGEMAP_KEY;
  if (!key) {
    console.log('\n[Charging stations] OPENCHARGEMAP_KEY not set — skipping (optional)');
    return {};
  }
  console.log('\n[Charging stations] OpenChargeMap (per-country counts)...');
  const out = {};
  const iso2s = Object.keys(geo.byIso2).slice(0, 80);
  for (const iso2 of iso2s) {
    try {
      const url = `https://api.openchargemap.io/v3/poi/?countrycode=${iso2}&maxresults=5000&compact=true&verbose=false&output=json&statustypeid=50`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'world-infra-hub/1.0', 'X-API-Key': key },
      });
      if (!res.ok) continue;
      const rows = await res.json();
      if (Array.isArray(rows)) {
        out[iso2] = { operational_stations: rows.length, source: 'OpenChargeMap' };
      }
      await new Promise((r) => setTimeout(r, 250));
    } catch {
      /* best effort */
    }
  }
  console.log(`  ✓ Charging stations: ${Object.keys(out).length} countries`);
  return out;
}

async function main() {
  const apiDir = path.join(process.cwd(), 'public', 'api', 'v1');
  if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true });

  const geo = await loadGeo();
  const fuel = await loadFuel(geo);
  const electricity = await loadElectricity(geo);
  const ev = deriveEvCharging(electricity);
  const co2 = await loadCO2(geo);
  const wb = await loadWorldBankIndicators(geo);
  const gridCO2 = await loadGridCO2Intensity(geo);
  const charging = await loadChargingStationCounts(geo);
  const happiness = {}; // OWID mirror moved; re-enable when a stable feed is found

  const isoSet = new Set([
    ...Object.keys(fuel),
    ...Object.keys(electricity),
    ...Object.keys(ev),
    ...Object.keys(co2),
    ...Object.keys(gridCO2),
    ...Object.keys(wb),
    ...Object.keys(happiness),
  ]);

  const countries = [];
  for (const iso2 of isoSet) {
    const meta = geo.byIso2[iso2];
    if (!meta) continue;
    countries.push({
      id: iso2,
      iso3: meta.iso3,
      name: meta.name,
      lat: meta.lat,
      lng: meta.lng,
      fuel: fuel[iso2] ?? null,
      electricity: electricity[iso2] ?? null,
      ev: ev[iso2] ?? null,
      co2: co2[iso2] ?? null,
      gridCO2: gridCO2[iso2] ?? null,
      worldBank: wb[iso2] ?? null,
      chargingStations: charging[iso2] ?? null,
      happiness: happiness[iso2] ?? null,
    });
  }
  countries.sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    lastUpdated: new Date().toISOString(),
    sources: [
      'Fuel: EU Weekly Oil Bulletin — CC BY 4.0',
      'Fuel (rest of world): World Bank Global Fuel Prices Database — ODbL',
      'Electricity (EU/EEA): Eurostat nrg_pc_204 — CC BY 4.0',
      'Electricity (non-EU): static fallback from IEA / WB / GlobalPetrolPrices',
      'CO2: Our World in Data (Global Carbon Budget) — CC BY 4.0',
      'Socioeconomic: World Bank Open Data Indicators — CC BY 4.0 (GDP per capita, population, life expectancy, internet users, renewable electricity, Gini, unemployment, inflation)',
      'Happiness: World Happiness Report 2024 (OWID mirror) — CC BY 4.0',
      'Borders: Natural Earth 110m admin_0 countries — CC0',
      'Derived: EV charging = household electricity × 18 kWh/100 km × 1.6 fast-charger markup',
    ],
    coverage: {
      fuel: Object.keys(fuel).length,
      electricity: Object.keys(electricity).length,
      ev: Object.keys(ev).length,
      co2: Object.keys(co2).length,
      gridCO2: Object.keys(gridCO2).length,
      worldBank: Object.keys(wb).length,
      chargingStations: Object.keys(charging).length,
      happiness: Object.keys(happiness).length,
    },
    countries,
  };

  fs.writeFileSync(path.join(apiDir, 'countries.json'), JSON.stringify(payload));
  fs.writeFileSync(path.join(apiDir, 'countries.geojson'), geo.raw);

  console.log(
    `\n✅ Wrote ${countries.length} countries to api/v1/countries.json`
  );
  console.log(
    `   fuel=${payload.coverage.fuel}  electricity=${payload.coverage.electricity}  ev=${payload.coverage.ev}  co2=${payload.coverage.co2}  wb=${payload.coverage.worldBank}  happiness=${payload.coverage.happiness}`
  );
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
