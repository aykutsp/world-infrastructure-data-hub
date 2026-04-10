# ADR-0003 — Trip calculator runs entirely client-side

- **Status**: accepted
- **Date**: 2026-04-05

## Context

The trip calculator does three dynamic things the static dataset cannot:

1. **Geocodes** the user's "From" / "To" text into coordinates.
2. **Routes** between the coordinates and returns a driving polyline.
3. **Assigns** each kilometre of the polyline to a country so we can price it.

Each of (1) and (2) needs to hit a third-party service (Nominatim + OSRM). The question is whether the build pipeline should do it, or the browser should.

If the pipeline does it, we need to know the user's waypoints at build time — impossible for user-typed routes. We would have to pre-compute every possible pair of cities, which is obviously absurd.

## Decision

The browser does all three steps. The static build provides only the country dataset (`countries.json`) and the country borders (`countries.geojson`). Every trip calculation is a pure client-side call chain:

```
browser → Nominatim (2 calls) → OSRM (1 call)
        → (local) point-in-polygon against countries.geojson
        → (local) refuel simulation against fuel prices
        → render
```

## Consequences

### Positive
- The static-first architecture (ADR-0001) stays intact. The build process never depends on a user input.
- The feature has zero marginal cost to the project — every Nominatim / OSRM request is billed to the user's browser, not to our infra.
- Trip logic can evolve without a site rebuild. Pricing model changes ship as a JS bundle update, not a data regeneration.
- Browser-only means we can run the calculator fully offline if the user has already loaded the dataset (minus the upstream geocoding/routing calls).

### Negative
- We depend on public Nominatim and OSRM demo servers, both of which are explicitly fair-use-only. At ~1k MAU this is fine; at 1M MAU we self-host both (see scaling section in the root README and `docs/paid-upgrades.md`).
- A rate-limited user gets an error instead of a result. Mitigated in v1.2 by showing clear error messages and not retrying automatically.
- Point-in-polygon against 170 Natural Earth polygons runs on the main thread. On a mid-range phone it's ~20 ms per route, which is fine. If we ever ship a higher-resolution GeoJSON we'll move this into a Web Worker.

### Neutral
- The cost model for EV modes is a different shape from fuel modes (linear per-km vs. discrete refuels). Both live in `TripCalculator.tsx`, same routing pipeline.

## Alternatives considered

1. **Server-side trip API (`POST /api/v1/trips`).** Rejected: it drags the whole static-first architecture down. The moment there is one dynamic endpoint, everything else inherits the operational surface of a real server.
2. **Ship Leaflet Routing Machine + a local graph.** Rejected: the continent-scale OSM graph is hundreds of megabytes. Not a browser payload.
3. **Use a commercial routing API (Mapbox / HERE / TomTom).** Rejected by default because of ADR-0005 (free-first). Documented in `docs/paid-upgrades.md` as an opt-in path once the consuming app has a budget.

## References

- ADR-0001 — Static-first architecture
- ADR-0005 — Free-data-first sourcing with documented paid upgrade paths
- `docs/paid-upgrades.md` → Routing / Geocoding section
