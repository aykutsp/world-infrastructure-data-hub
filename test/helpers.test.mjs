import { describe, it, expect } from 'vitest';
import {
  round,
  parseCsv,
  parseCsvLine,
  xmlEscape,
  haversineKm,
  pointInRing,
} from '../scripts/lib/helpers.mjs';

describe('round', () => {
  it('returns null for non-finite values', () => {
    expect(round(null)).toBe(null);
    expect(round(undefined)).toBe(null);
    expect(round(NaN)).toBe(null);
    expect(round(Infinity)).toBe(null);
  });

  it('rounds to the requested precision', () => {
    expect(round(1.23456, 2)).toBe(1.23);
    expect(round(1.235, 2)).toBe(1.24); // banker's rounding aside, toFixed semantics
    expect(round(0, 3)).toBe(0);
    expect(round(-2.1234, 3)).toBe(-2.123);
  });

  it('defaults to 3 decimals', () => {
    expect(round(1.23456789)).toBe(1.235);
  });
});

describe('parseCsvLine', () => {
  it('splits a plain line on commas', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('preserves commas inside quoted fields', () => {
    expect(parseCsvLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
  });

  it('handles escaped quotes', () => {
    expect(parseCsvLine('a,"he said ""hi""",b')).toEqual([
      'a',
      'he said "hi"',
      'b',
    ]);
  });

  it('keeps empty trailing fields', () => {
    expect(parseCsvLine('a,b,')).toEqual(['a', 'b', '']);
  });
});

describe('parseCsv', () => {
  it('builds rows keyed by the header', () => {
    const csv = 'year,gdp\n2023,54290\n2024,55100';
    const { header, rows } = parseCsv(csv);
    expect(header).toEqual(['year', 'gdp']);
    expect(rows).toEqual([
      { year: '2023', gdp: '54290' },
      { year: '2024', gdp: '55100' },
    ]);
  });

  it('handles empty input', () => {
    expect(parseCsv('')).toEqual({ header: [], rows: [] });
  });
});

describe('xmlEscape', () => {
  it('escapes the classic five XML entities', () => {
    expect(xmlEscape('gasoline & diesel')).toBe('gasoline &amp; diesel');
    expect(xmlEscape('<foo>')).toBe('&lt;foo&gt;');
    expect(xmlEscape('"quoted"')).toBe('&quot;quoted&quot;');
    expect(xmlEscape("it's")).toBe('it&apos;s');
  });

  it('returns empty string for null/undefined', () => {
    expect(xmlEscape(null)).toBe('');
    expect(xmlEscape(undefined)).toBe('');
  });

  it('regression: the exact line that broke prices.xml before this helper existed', () => {
    const input = 'United States: EIA weekly retail gasoline & diesel — U.S. public domain';
    const out = xmlEscape(input);
    // Must not contain an unescaped & followed by whitespace (the error the
    // XML parser originally complained about on line 10 column 56).
    expect(out).not.toMatch(/&[^a]/);
    expect(out).toContain('&amp;');
  });
});

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(52, 13, 52, 13)).toBe(0);
  });

  it('matches known distances within 1 %', () => {
    // Paris ↔ Berlin ≈ 878 km (great-circle)
    const d = haversineKm(48.8566, 2.3522, 52.52, 13.405);
    expect(d).toBeGreaterThan(870);
    expect(d).toBeLessThan(886);
  });

  it('is symmetric', () => {
    const a = haversineKm(10, 20, 30, 40);
    const b = haversineKm(30, 40, 10, 20);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('pointInRing', () => {
  // Simple square from (0,0) to (10,10)
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];

  it('detects interior points', () => {
    expect(pointInRing(5, 5, square)).toBe(true);
    expect(pointInRing(0.1, 0.1, square)).toBe(true);
  });

  it('rejects exterior points', () => {
    expect(pointInRing(-1, 5, square)).toBe(false);
    expect(pointInRing(11, 5, square)).toBe(false);
    expect(pointInRing(5, 100, square)).toBe(false);
  });

  it('handles non-convex shapes', () => {
    // L-shape
    const l = [
      [0, 0],
      [4, 0],
      [4, 2],
      [2, 2],
      [2, 4],
      [0, 4],
      [0, 0],
    ];
    expect(pointInRing(1, 1, l)).toBe(true);  // inside the vertical part
    expect(pointInRing(3, 1, l)).toBe(true);  // inside the horizontal part
    expect(pointInRing(3, 3, l)).toBe(false); // in the L's cut-out
  });
});
