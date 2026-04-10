# Architecture Decision Records

Every significant engineering decision on this project is recorded as an ADR — an [Architecture Decision Record](https://adr.github.io/). The goal is that future contributors (including future-me) can see not just *what* the code does but *why* it looks the way it does, *what* we considered instead, and *under what conditions* the decision should be reopened.

Format: a trimmed MADR / Nygard hybrid — status, context, decision, consequences, alternatives, references.

| # | Title | Status |
|---|---|---|
| [0001](./0001-static-first-architecture.md) | Static-first architecture on GitHub Pages | ✅ accepted |
| [0002](./0002-unified-and-per-country-dataset-shape.md) | Unified and per-country dataset shape | ✅ accepted |
| [0003](./0003-trip-calculator-runs-client-side.md) | Trip calculator runs entirely client-side | ✅ accepted |
| [0004](./0004-raw-response-archival-and-replay.md) | Raw upstream responses are archivable for replay | 🟡 accepted (partial) |
| [0005](./0005-free-data-first-with-paid-upgrade-paths.md) | Free-data-first, with documented paid upgrade paths | ✅ accepted |
| [0006](./0006-client-library-strategy.md) | Client libraries are thin wrappers, not an SDK | ✅ accepted |
| [0007](./0007-api-versioning-and-stability-pledge.md) | API versioning and stability pledge | ✅ accepted |

New ADRs should copy [`0000-template.md`](./0000-template.md) and get the next number in sequence. Once merged, an ADR is immutable; revisions happen by creating a superseding ADR that links back.
