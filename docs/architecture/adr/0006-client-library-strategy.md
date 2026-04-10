# ADR-0006 — Client libraries are thin wrappers, not an SDK

- **Status**: accepted
- **Date**: 2026-04-05

## Context

We ship official client libraries for five languages (TypeScript, Python, Go, Dart/Flutter, .NET / C#). Each language's users expect an idiomatic package on their registry (npm, PyPI, Go modules, pub.dev, NuGet).

There's a real temptation to make those libraries *smart*: offline caching, synthetic metrics, local filtering, typed query builders, observability hooks. Every one of those features makes the library more valuable to its users and makes every future change harder.

## Decision

Each client library is a **thin wrapper** around the public JSON endpoints. The entire non-trivial surface per language is:

- `getDataset()` — one HTTP GET, cached per-instance.
- `getCountry(iso2)` — in-memory find.
- `metric(key, iso2)` / `extract(country, key)` — one switch statement mapping metric keys to fields.
- `rank(key, direction, n)` / `globalAverage(key)` — simple array operations.

No offline mode. No incremental fetches. No filtering DSL. No retry/backoff library dependencies. The library does exactly what `fetch` + `JSON.parse` would do, with types on top.

## Consequences

### Positive
- **One change set, five packages.** Adding a metric means editing the schema, editing the extractor switch in each language's single source file, publishing. There is no architectural change.
- **Language-idiomatic on purpose.** Each library follows the host language's conventions (async/await in TS, `dataclasses` in Python, channels wouldn't help here, etc.). No shared abstraction to hold us back.
- **Cheap to audit.** Each library is < 400 lines of code including models. A reviewer can read one in ten minutes.
- **Zero third-party deps** for Python and Go, minimal for the rest. The whole install graph is tiny.
- **The JSON is the contract.** If a consumer wants a feature the library doesn't expose, they can always drop down to raw `fetch`. That's not a failure mode; it's an intentional escape hatch.

### Negative
- **Every change has to be made five times.** Mitigated by the small surface. In practice a metric addition is a 5-line diff per language.
- **No fancy library-level features.** Users who want caching strategies or retries have to bring their own library. Acceptable: those features are highly opinionated and don't belong here.

### Neutral
- Library versions are independent (semver per package) but every release is cut from the same project tag (see ADR-0007). In practice they move together.

## Alternatives considered

1. **One "smart" TypeScript SDK with feature parity and everything else as bindings.** Rejected: forces Python users to think about Node idioms, and the cross-language types always end up being the least-common-denominator.
2. **Protobuf / gRPC schema + generated clients.** Rejected: massive toolchain for a dataset that changes once a day and fits in 470 KB of JSON.
3. **OpenAPI spec + Swagger Codegen.** Rejected for the same reason — generated code for a single GET endpoint is more ceremony than code.

## References

- ADR-0002 — Dataset shape
- ADR-0007 — Versioning and stability pledge
- [`../../libraries/`](../../../libraries/)
