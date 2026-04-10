# Add a new metric

## When

- You want to ship a 16th (or 17th, 18th…) metric.
- You want to split an existing metric (e.g. electricity household vs. industrial).
- You're replacing a stale upstream with a better one.

## Before you start

Check the policy bits first:

- The new source must satisfy **ADR-0005** (free-data-first). If it's a paid source, ship it as an *optional* loader behind an env var.
- The new source must redistribute under a licence compatible with ours (MIT code + attributed data). Check the licence and record it in `docs/paid-upgrades.md`.
- If it needs a credential, add it to `.github/workflows/deploy.yml` as a secret reference, never as source.

## Steps

1. **Write the loader.** In `scripts/generateData.js`, add a `loadNewMetric(geo)` async function that returns an ISO2-keyed object. Follow the pattern in the existing loaders:
   ```js
   async function loadNewMetric(geo) {
     console.log('\n[NewMetric] fetching...');
     const out = {};
     try {
       // fetch, parse, populate out[iso2] = { ... }
     } catch (e) {
       console.warn(`  ✗ NewMetric failed: ${e.message}`);
     }
     return out;
   }
   ```
   Never throw. Always fall through gracefully so the rest of the pipeline keeps running.

2. **Wire it into `main()`.** Two lines:
   ```js
   const newMetric = await loadNewMetric(geo);
   // and inside the stitching loop:
   newMetric: newMetric[iso2] ?? null,
   ```

3. **Extend `countries.schema.json`.** Add the new field under `definitions.country.properties` and define its block in `definitions`. The validator will now enforce it.

4. **Extend `src/types.ts`**:
   - Add the interface for the new block.
   - Add an entry to `Country`.
   - Add a new `DatasetSpec` entry to `DATASETS` with its group (`cost` / `energy` / `society`), label, unit, and `higherIsWorse` flag. That single entry is all the UI needs — the sidebar picker, the map palette, and the Compare table all consume it automatically.

5. **Update the formatters** in `InfraMap.tsx` (`formatLabelValue`) and `Sidebar.tsx` (`formatValue`) so the value displays with the right unit.

6. **Update the client libraries.** Each `libraries/<lang>/` has a single file that hosts the extract switch. Add one case per library:
   - TypeScript: `extractMetric()` in `libraries/typescript/src/index.ts`
   - Python: `extract_metric()` in `libraries/python/world_infra_data/__init__.py`
   - Go: `extractMetric()` in `libraries/go/infradata.go`
   - Dart: `extractMetric()` in `libraries/flutter/lib/world_infra_data.dart`
   - C#: `ExtractMetric()` in `libraries/csharp/WorldInfraDataClient.cs`
   Each change is a one-line addition to the switch.

7. **Update `docs/paid-upgrades.md`** with the new source's free + paid alternatives.

8. **Add an ADR** if the decision is non-obvious (e.g. "we chose OWID over IEA because…"). ADRs are cheap; reopening a debate is expensive.

9. **Run the full check**:
   ```bash
   npm run generate-data     # fetch + normalise + validate
   npm run test              # unit tests still green
   npm run build             # full TypeScript + Vite
   ```

10. **Open a PR** tagged `metric:new`. The PR template will prompt you for screenshots of the new metric in Explore + Compare.

## After merge

- The next daily cron run picks it up automatically.
- Update the README's `Metrics & sources` table and bump the metric count in the header badges.
