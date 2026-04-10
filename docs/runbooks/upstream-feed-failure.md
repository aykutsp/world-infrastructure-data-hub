# Upstream feed failure

## Symptom

One of these things happens:

- The daily deploy workflow on GitHub Actions is red.
- The build succeeds but the `coverage` field in `countries.json` drops by ≥ 10 % for one source.
- A PR reviewer notices an assertion failure in `scripts/validateDataset.mjs`.
- An issue comes in saying "Germany's electricity price looks wrong".

## Diagnosis

1. Open the last failed run in GitHub Actions.
2. Find the log line for the affected loader (they're prefixed — `[Fuel]`, `[Electricity]`, `[CO2]`, etc.).
3. Look for one of three failure modes:

   **Hard 4xx / 5xx from upstream**
   ```
   ✗ Eurostat failed: HTTP 503 — falling through to static table
   ```
   The loader already fell back gracefully. No fix needed unless the outage persists for more than 48 hours.

   **Schema drift (JSON Schema validator complaining)**
   ```
   ❌ countries.json does not match schemas/countries.schema.json
     /countries/42/electricity/household_usd_per_kwh  must be number
   ```
   Upstream changed the shape of the data. The normalizer needs updating.

   **Silent value drift (no errors, but numbers look wrong)**
   Harder. Usually only caught by humans reading the map. Pull yesterday's `countries.json` from the git history (it's checked in for exactly this reason) and `diff` the offending country's block against today's.

## Fix

### For a hard 4xx/5xx:
- Wait one day. 90 % of the time this clears on its own — it's usually an upstream maintenance window.
- If it doesn't clear, open the vendor's status page. Many of our sources (EU Commission, Eurostat, World Bank) publish maintenance schedules.
- If the URL moved permanently, update the constant at the top of `scripts/generateData.js` and document the change in the commit message. Double-check the archived URL via the Wayback Machine.

### For schema drift:
1. Download the new upstream response manually:
   ```bash
   curl -L "<upstream-url>" -o /tmp/new.xlsx
   ```
2. Inspect it locally. For XLSX files:
   ```bash
   node -e "const x=require('xlsx');const w=x.readFile('/tmp/new.xlsx');console.log(w.SheetNames);console.log(x.utils.sheet_to_json(w.Sheets[w.SheetNames[0]]).slice(0,3));"
   ```
3. Diff against what the loader expects. Update the parser. Re-run `npm run generate-data` locally.
4. `npm run validate` should pass. If the new upstream legitimately adds a field, update `schemas/countries.schema.json` **and** add an ADR documenting the change (see `docs/architecture/adr/`).
5. Open a PR. Include before/after diff for a few known countries in the PR description.

### For silent value drift:
1. Pull the raw response from the archive (once ADR-0004 Phase 2 is live). Today: look at the git diff between the `countries.json` from two consecutive builds.
2. If the upstream just updated its numbers (e.g. World Bank published 2025 figures) — ship it, add a note to the release.
3. If the numbers look wildly wrong (e.g. Norway's gasoline price dropped 80 %), assume upstream broke and check their release notes. Pin to the last known good pipeline commit while you investigate:
   ```bash
   git revert HEAD
   git push origin main
   ```

## Prevent recurrence

- If the same feed breaks twice in a quarter, file a task to add a **contract test** for it. A contract test lives in `test/contracts/` and asserts the bare-minimum shape we depend on, running weekly in CI.
- If the outage was silent, the gap is the monitoring. Add a `coverage` threshold check — see `scripts/validateDataset.mjs` for the template.
