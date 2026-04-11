// Regression test for the linear-time base-URL normalizer used inside the
// TypeScript client library. Replaces the earlier `.replace(/\/+$/, '')`
// call that CodeQL's js/polynomial-redos query flagged in security scan.
//
// The test imports a local copy of the normalizer to keep this file free of
// the library's full TypeScript toolchain. If the library implementation
// ever changes shape, mirror the change here.

import { describe, it, expect } from 'vitest';

function normalizeBaseUrl(raw) {
  let end = raw.length;
  while (end > 0 && raw.charCodeAt(end - 1) === 47) end--;
  return raw.slice(0, end) + '/';
}

describe('normalizeBaseUrl', () => {
  it('adds a trailing slash when missing', () => {
    expect(normalizeBaseUrl('https://x.example')).toBe('https://x.example/');
  });

  it('keeps a single trailing slash', () => {
    expect(normalizeBaseUrl('https://x.example/api/v1/')).toBe('https://x.example/api/v1/');
  });

  it('collapses any number of trailing slashes to exactly one', () => {
    expect(normalizeBaseUrl('https://x.example/api/v1/////')).toBe('https://x.example/api/v1/');
    expect(normalizeBaseUrl('///')).toBe('/');
  });

  it('handles the empty string', () => {
    expect(normalizeBaseUrl('')).toBe('/');
  });

  it('is linear-time on pathological input (10k trailing slashes)', () => {
    const nasty = 'https://x.example/api' + '/'.repeat(10_000);
    const t0 = Date.now();
    const out = normalizeBaseUrl(nasty);
    const ms = Date.now() - t0;
    expect(out).toBe('https://x.example/api/');
    // Anything above a few tens of milliseconds would suggest quadratic
    // behaviour has crept back in. Generous bound to avoid flaky CI.
    expect(ms).toBeLessThan(200);
  });
});
