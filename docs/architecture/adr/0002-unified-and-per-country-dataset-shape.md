# ADR-0002 — Unified and per-country dataset shape

- **Status**: accepted
- **Date**: 2026-04-05

## Context

Two valid API shapes compete for this dataset:

1. **One fat file** — `countries.json` with every country and every metric. Great for the choropleth (the UI needs all of them at once to colour the map).
2. **One tiny file per country** — `countries/DE.json`. Great for library consumers who only care about Germany.

A third option — a hybrid of both — looks like obvious bloat until you realise that GitHub Pages (and any CDN in front of it) caches both shapes for free.

## Decision

Publish **both** shapes. `countries.json` is the canonical fat file — it's what the choropleth loads, what the tests validate, and what the JSON Schema describes. In the next release the pipeline will also emit `countries/{ISO2}.json` as a convenience for library users who need one country per request.

The two shapes are generated from the same in-memory array, which means they cannot drift.

## Consequences

### Positive
- The map UI stays fast (one fetch, one cache key, one parse).
- Library users don't have to pull 470 KB to look up a single number.
- Both shapes are edge-cacheable with aggressive TTLs.
- Schema validation runs once on the canonical shape and automatically covers both.

### Negative
- Roughly 340 KB of extra artifacts per build (170 small files ≈ 2 KB each).
- Two shapes to document in the API reference.

### Neutral
- The canonical shape is `countries.json`; per-country files are a derived view and will always match. We don't promise anything about per-country files that isn't true of the canonical file.

## Alternatives considered

1. **Fat file only.** Rejected: hostile to library users and notebook experiments.
2. **Per-country files only.** Rejected: hostile to the choropleth, which would need 170 HTTP requests and would hit any per-domain connection pool limit well before finishing.
3. **Server-side query API** (`GET /api/v1/countries?iso=DE`). Rejected: breaks ADR-0001 (static-first). If we ever want this it becomes a Cloudflare Worker layer on top of the same R2 files.

## References

- ADR-0001 — Static-first architecture
- ADR-0007 — API versioning and stability pledge
