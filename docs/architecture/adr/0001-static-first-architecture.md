# ADR-0001 — Static-first architecture on GitHub Pages

- **Status**: accepted
- **Date**: 2026-04-05

## Context

The product is "a world map of infrastructure prices, refreshed daily". For that sentence to be true we need:

- A map UI rendered in a browser.
- A country-keyed dataset the map can colour itself with.
- Some way to refresh that dataset at least once a day.

The obvious default in 2026 is "a Next.js app with an API route that proxies upstream feeds". That default is wrong here. The dataset changes at most once a day, every consumer wants the same bytes, and there is zero per-user state. Running any server at all is pure cost.

## Decision

Ship the entire application as a **static site** on GitHub Pages. A single GitHub Actions cron regenerates the JSON payload at 06:25 UTC and atomically swaps it into the live site via `actions/deploy-pages`. No backend, no database, no per-request compute.

## Consequences

### Positive
- **Zero marginal cost per user.** GitHub Pages is free up to 100 GB egress / month. The edge cache absorbs the vast majority of traffic.
- **Trivially scalable front door.** The same URL sits behind any CDN we want to front-end on top (Cloudflare, Fastly, CloudFront) with a DNS change.
- **No secrets in the hot path.** The browser never sees an API key; the build sometimes does (optional ones — ADR-0005). The public API has nothing worth stealing.
- **Replayable deployments.** Every build is deterministic given an upstream snapshot. Rollbacks are `git revert + push`.
- **Contributors are productive in 5 minutes.** `git clone && npm install && npm run dev`.

### Negative
- **Intra-day updates need a rebuild.** At 1M+ MAU with minute-level freshness requirements we would need to move the pipeline off GitHub Actions — see the system design section in the root README for the migration path.
- **Write operations are impossible.** No user comments, favourites, or saved trips without adding a backend. Explicit non-goal today.
- **Feed latency caps the whole system.** If Eurostat is slow, we're slow. See ADR-0004 for the replay story.

### Neutral
- **Dataset size becomes a UX concern.** 470 KB per page load is acceptable; 5 MB would not be. The schema is split into a hot path (`countries.json`) and cold artifacts (`countries.geojson`, `trips/`) to keep the hot path small.

## Alternatives considered

1. **Next.js + serverless API routes (Vercel/Netlify).** Rejected: it adds an always-on cold-start tail latency for zero benefit. The data doesn't change at request time.
2. **Cloudflare Workers + R2.** Rejected *for now* — it is the target of Phase 1 of the 1M-user migration path, but until we outgrow GitHub Pages there's no reason to take on the operational surface.
3. **Full Express.js + Postgres.** Rejected: it replaces a cron job and a bucket with a server, a database, and a replication strategy. We would be paying for five nines of availability on data that changes once a day.

## References

- Root README → "System design: scaling to 1M+ users"
- [GitHub Pages usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#usage-limits)
