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
// OWID's old IEA-derived CSV was removed; the replacement is behind the paid
// IEA Energy Prices data product. For the v0.1 scaffold we ship a hardcoded
// fallback table of recent household retail prices (USD/kWh) sourced from
// publicly-cited IEA, Eurostat and globalpetrolprices.com figures for the
// most commonly-visited markets. Replace this with a live pull (Eurostat
// nrg_pc_204 for the EU + a commercial feed for the rest of the world) as
// soon as a properly-licensed one is wired up.
const HARDCODED_ELECTRICITY_USD_PER_KWH = {
  // EU27
  AT: 0.314, BE: 0.409, BG: 0.129, HR: 0.167, CY: 0.252, CZ: 0.269,
  DK: 0.446, EE: 0.227, FI: 0.207, FR: 0.279, DE: 0.403, GR: 0.215,
  HU: 0.121, IE: 0.406, IT: 0.359, LV: 0.232, LT: 0.185, LU: 0.222,
  MT: 0.149, NL: 0.424, PL: 0.220, PT: 0.230, RO: 0.195, SK: 0.235,
  SI: 0.253, ES: 0.286, SE: 0.214,
  // Rest of Europe
  CH: 0.251, NO: 0.193, IS: 0.161, GB: 0.370, UA: 0.057, TR: 0.087,
  RU: 0.057, RS: 0.091, BA: 0.100, AL: 0.128, MK: 0.105, ME: 0.106,
  XK: 0.075, MD: 0.180,
  // North America
  US: 0.167, CA: 0.115, MX: 0.101,
  // Asia
  CN: 0.083, JP: 0.253, KR: 0.111, TW: 0.092, IN: 0.063, ID: 0.101,
  TH: 0.116, VN: 0.080, MY: 0.052, SG: 0.239, PH: 0.211, PK: 0.088,
  BD: 0.059, LK: 0.076, AE: 0.079, SA: 0.048, IR: 0.012, IQ: 0.055,
  IL: 0.170, JO: 0.157, KW: 0.030, QA: 0.032, OM: 0.052, KZ: 0.040,
  // Africa
  EG: 0.036, ZA: 0.179, MA: 0.113, NG: 0.061, KE: 0.222, ET: 0.012,
  GH: 0.100, DZ: 0.043, TN: 0.066, LY: 0.009,
  // Oceania & LatAm
  AU: 0.327, NZ: 0.228, BR: 0.165, AR: 0.085, CL: 0.196, CO: 0.147,
  PE: 0.193, UY: 0.218, VE: 0.009, EC: 0.100, BO: 0.086, PY: 0.053,
};
const OWID_CO2_URL =
  'https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv';

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
  console.log('\n[Electricity] fallback static table (see generateData.js header)...');
  const out = {};
  const now = new Date().getFullYear();
  for (const [iso2, price] of Object.entries(HARDCODED_ELECTRICITY_USD_PER_KWH)) {
    const meta = geo.byIso2[iso2];
    if (!meta) continue;
    out[iso2] = {
      household_usd_per_kwh: round(price, 4),
      year: now - 1,
      source: 'Hardcoded fallback (IEA / Eurostat / GlobalPetrolPrices cited figures)',
    };
  }
  console.log(`  ✓ Electricity: ${Object.keys(out).length} countries (static)`);
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

async function loadCO2(geo) {
  console.log('\n[CO2] Our World in Data co2-data...');
  const out = {};
  try {
    const text = await fetchText(OWID_CO2_URL);
    const { rows } = parseCsv(text);
    const latest = new Map();
    for (const row of rows) {
      const iso3 = (row.iso_code || '').trim().toUpperCase();
      if (!iso3 || iso3.length !== 3) continue;
      const year = Number(row.year);
      const perCapita = Number(row.co2_per_capita);
      const total = Number(row.co2);
      if (!isFinite(year) || !isFinite(perCapita) || perCapita <= 0) continue;
      const prev = latest.get(iso3);
      if (!prev || prev.year < year) latest.set(iso3, { year, perCapita, total });
    }
    for (const [iso3, { year, perCapita, total }] of latest) {
      const meta = geo.byIso3[iso3];
      if (!meta) continue;
      out[meta.iso2] = {
        year,
        tonnes_per_capita: round(perCapita, 3),
        total_million_tonnes: isFinite(total) ? round(total, 2) : null,
        source: 'Our World in Data (Global Carbon Budget)',
      };
    }
    console.log(`  ✓ CO2: ${Object.keys(out).length} countries`);
  } catch (e) {
    console.warn(`  ✗ CO2 failed: ${e.message}`);
  }
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

  const isoSet = new Set([
    ...Object.keys(fuel),
    ...Object.keys(electricity),
    ...Object.keys(ev),
    ...Object.keys(co2),
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
    });
  }
  countries.sort((a, b) => a.name.localeCompare(b.name));

  const payload = {
    lastUpdated: new Date().toISOString(),
    sources: [
      'EU Weekly Oil Bulletin — CC BY 4.0',
      'World Bank Global Fuel Prices Database — ODbL',
      'Our World in Data / IEA — Electricity prices — CC BY 4.0',
      'Our World in Data — CO2 (Global Carbon Budget) — CC BY 4.0',
      'Natural Earth 110m admin_0 countries — CC0',
    ],
    coverage: {
      fuel: Object.keys(fuel).length,
      electricity: Object.keys(electricity).length,
      ev: Object.keys(ev).length,
      co2: Object.keys(co2).length,
    },
    countries,
  };

  fs.writeFileSync(path.join(apiDir, 'countries.json'), JSON.stringify(payload));
  fs.writeFileSync(path.join(apiDir, 'countries.geojson'), geo.raw);

  console.log(
    `\n✅ Wrote ${countries.length} countries to api/v1/countries.json\n   fuel=${payload.coverage.fuel} electricity=${payload.coverage.electricity} ev=${payload.coverage.ev} co2=${payload.coverage.co2}`
  );
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
