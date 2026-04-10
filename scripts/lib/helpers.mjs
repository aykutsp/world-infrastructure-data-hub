// Pure helpers extracted from scripts/generateData.js so they can be unit
// tested in isolation. Nothing in here talks to the network or to disk.
//
// If you add a helper here, add a test in test/helpers.test.mjs.

/**
 * Round a number to `d` decimal places, preserving null / undefined / NaN
 * as null. Used by every loader to normalise numeric precision before the
 * dataset is validated against the JSON schema.
 */
export function round(n, d = 3) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Number(Number(n).toFixed(d));
}

/**
 * Tiny CSV parser that handles quoted fields with commas and escaped
 * quotes. Not a full RFC-4180 implementation — good enough for the OWID
 * datasets we consume. Everything else should use a real parser.
 */
export function parseCsvLine(line) {
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

export function parseCsv(text) {
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

/**
 * Escape a string for safe inclusion inside an XML text node or attribute.
 * The canonical bug that motivated this helper: the source list contained
 * "EIA weekly retail gasoline & diesel" and the raw `&` broke every XML
 * parser at line 10 column 56.
 */
export function xmlEscape(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Great-circle distance between two points, km. Used by the trip calculator
 * both at build time (pre-computed trip endpoints) and at run time (in the
 * browser). Mean Earth radius = 6371 km.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Ray-casting point-in-polygon test for a single ring. `polygon` is an
 * array of [lng, lat] pairs. Handles collinear edges safely by biasing
 * the denominator.
 */
export function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
