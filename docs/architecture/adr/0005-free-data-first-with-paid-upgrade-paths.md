# ADR-0005 — Free-data-first, with documented paid upgrade paths

- **Status**: accepted
- **Date**: 2026-04-05

## Context

There are three classes of data sources for every metric we ship:

1. **Free + open-licensed** (CC BY, ODbL, public domain) — no barriers, modest coverage, modest freshness.
2. **Free with registration** (OpenChargeMap, EPDK, Tankerkönig) — one-time key, better coverage, sometimes better freshness, rate-limited.
3. **Commercial** (GlobalPetrolPrices, IEA Energy Prices, Mapbox / HERE / TomTom, S&P Platts) — the best freshness and coverage, explicit licence, often $$$.

Every commit to this project has to pick one source per metric. If the default build required a credential or a paid contract, three things would break:

- Forks can't run it — the repo becomes ornamental.
- Reviewers can't reproduce a PR locally without getting our keys.
- The GitHub Actions cron can't run in an untrusted environment.

On the other hand, refusing to document paid sources at all leaves teams who *do* have a budget with nothing to work from. They'll walk away and build their own thing.

## Decision

The shipped pipeline is built entirely on **free + open-licensed** sources. Any component that needs a credential is **optional**: the loader checks for its env var and skips itself silently when the var isn't set.

Separately, every metric is documented with its paid-upgrade path in [`docs/paid-upgrades.md`](../../paid-upgrades.md). That doc is treated as production documentation, not marketing copy:

- Exact vendor and product name.
- Licence terms (redistribution allowed or not, attribution clause, delay windows).
- Rough monthly cost at our scale (tied to the capacity model in the root README).
- Pointer to the loader file + the function that would need to change.
- Estimated integration effort in engineer-days.

## Consequences

### Positive
- **Anyone can fork + run.** `git clone && npm install && npm run generate-data` works out of the box. No tokens, no email verification, no credit card.
- **Clear on-ramp for paid users.** A team with budget walks away with a concrete plan, not a sales call.
- **Separation of concerns.** Free vs paid is a configuration decision at deploy time, not an architectural fork of the codebase.
- **Opt-in keys don't leak.** Loaders check `process.env.XYZ_KEY`; the variable lives in GitHub Secrets, never in source. Example: `OPENCHARGEMAP_KEY`.

### Negative
- **Some metrics are coarser than they could be.** Household electricity outside the EU comes from a maintained static table because the OWID/IEA mirror moved. A paid IEA Energy Prices subscription would replace it with a live feed.
- **We have to maintain the paid-upgrade doc as a living document.** Stale vendor links are worse than no links.

### Neutral
- The choice of "free-first" is about policy, not capability. Nothing in the code prevents a fork from wiring in a commercial feed for every metric.

## Alternatives considered

1. **Use free sources, don't document paid options.** Rejected: hostile to teams who want to take the project further.
2. **Use paid sources, document the free fallbacks.** Rejected: forks can't run the build, and the upstream bill becomes our problem.
3. **Maintain two branches — `free` and `premium`.** Rejected: the divergence cost is huge, and almost every code path is identical. Config switch is cheaper.

## References

- [`docs/paid-upgrades.md`](../../paid-upgrades.md)
- ADR-0004 — Raw response archival
- Capacity / cost tables in the root README
