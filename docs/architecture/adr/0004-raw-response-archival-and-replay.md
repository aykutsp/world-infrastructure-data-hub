# ADR-0004 — Raw upstream responses are archivable for replay

- **Status**: accepted (partially implemented)
- **Date**: 2026-04-05

## Context

Every upstream we depend on is outside our control. Over the lifetime of this project we've already hit:

- A CSV dataset on Our World in Data's GitHub mirror being moved to a different URL mid-release (the "happiness report" feed, now disabled).
- Eurostat adding a new dimension to `nrg_pc_204` that required parser updates.
- The EU Weekly Oil Bulletin XLSX silently changing column order between quarterly releases.

In every case we had to *reproduce the old response locally* to fix the normalizer. The only reason we could was that we happened to have a stale copy in someone's browser cache. That is not a sustainable engineering practice.

Meanwhile, the normalization step itself is pure and deterministic. Given the same raw bytes it produces exactly the same `countries.json`. Which means if we archive the raw bytes, we can fix bugs retroactively without hitting the live upstream a second time.

## Decision

Treat raw upstream responses as **first-class artifacts**. The pipeline logic is split into two stages:

1. **Fetch** — download the upstream bytes to a content-addressed key. Immutable, append-only.
2. **Normalize** — read from the archive, produce `countries.json`.

Today the archive is in-memory only (the GitHub Actions runner's filesystem for one build). The next release moves it to an object storage bucket (R2 / S3) with a lifecycle policy that keeps the last 90 days and aggregates everything older into a monthly tarball.

The normalizer accepts an optional `--replay <timestamp>` flag that swaps "fetch" for "load from archive". A bug fix becomes:

```
# reproduce yesterday's output exactly
node scripts/generateData.js --replay 2026-04-04T06:25:00Z
# make your normalizer fix
# re-run, diff the output, validate
```

## Consequences

### Positive
- **Bug fixes are testable offline.** You don't need the live upstream to fix a parser regression.
- **Post-mortems become cheap.** "Why did Germany's electricity price change by 3 % on 2026-03-15?" becomes a git-log question against the archive, not a phone call to Eurostat.
- **Paid upgrades are safe.** When we switch to a commercial feed (see `docs/paid-upgrades.md`), we archive its bytes too. If the vendor changes their schema silently, we already have a baseline to compare against.
- **Replay enables contract testing.** A weekly CI job can replay the last 14 days and verify the normalizer still produces identical output. Drift alarms then catch *our* regressions, not the upstream's.

### Negative
- **Storage cost.** 14 days × 9 sources × ~5 MB each ≈ 600 MB. Pennies on R2/S3.
- **Legal care.** Some upstream terms allow redistribution ("CC BY 4.0") and some don't. The archive is **private** — never served publicly. `docs/paid-upgrades.md` documents per-source terms.

### Neutral
- Current implementation is in-memory only; the archive bucket is a Phase-1 item on the scaling roadmap. The two-stage structure already exists in code, which is what matters for this ADR.

## Alternatives considered

1. **Re-hit the upstream every time a bug is found.** Rejected: race condition with ongoing upstream changes. You cannot fix yesterday's bug against today's data.
2. **Commit raw responses to git.** Rejected: repo bloat, and some feeds explicitly forbid redistribution. Object storage with access control is the right primitive.
3. **Cache in the browser / CDN only.** Rejected: these caches are LRU, not append-only. Useless for replay.

## References

- ADR-0001 — Static-first architecture
- ADR-0005 — Free-data-first sourcing
- `docs/paid-upgrades.md` — licence-by-source table
- `docs/runbooks/upstream-feed-failure.md`
