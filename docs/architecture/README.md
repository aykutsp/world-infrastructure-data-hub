# Architecture

This directory is the engineering reference for the project. If you are trying to understand *why* the code looks the way it does — rather than *what* it does — start here.

## Contents

| Document | What you'll find |
|---|---|
| [`overview.md`](./overview.md) | System context and container diagrams (C4 model, levels 1 & 2) |
| [`data-flow.md`](./data-flow.md) | How a single upstream data point becomes a number on the map |
| [`adr/`](./adr/) | Architecture Decision Records — every significant decision with its context and consequences |
| [`../paid-upgrades.md`](../paid-upgrades.md) | How to swap each free data source for a paid equivalent (cost, effort, trade-offs) |
| [`../runbooks/`](../runbooks/) | Step-by-step operational procedures for the on-call engineer |
| [`../benchmarks.md`](../benchmarks.md) | Measured numbers: dataset size, generation time, Lighthouse scores |

## Principles

A handful of principles guide every architectural decision. They are spelled out here so that future contributors (including future-me) can argue about them *explicitly* instead of accidentally violating them.

1. **Static-first.** Anything that can be a static file should be a static file. Dynamic services are a last resort.
2. **Open-data-only in the default build.** The shipped pipeline never depends on a credential. Paid upgrades exist and are documented, but they are opt-in.
3. **The dataset is the product.** The UI is one view of many. Client libraries, the JSON API and the UI all consume the same canonical `countries.json`.
4. **Idempotent + replayable.** The pipeline can re-run against the same upstream snapshots and produce the same output. Raw responses are preserved.
5. **Deliberately boring.** No Kubernetes, no service mesh, no multi-cloud. The simplest architecture that satisfies the SLO wins.
6. **No silent data drift.** Every metric carries a `year` / `period` / `source`. The UI shows it; the JSON Schema enforces it; the pipeline validates it.
7. **Contributors should be productive in 5 minutes.** `git clone`, `npm install`, `npm run generate-data`, `npm run dev`. No hidden steps.

When in doubt, re-read these. If a pull request violates one of them, the ADR must explain why.
