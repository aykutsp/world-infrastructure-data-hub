# Contributing

Thanks for wanting to help! A few notes to make the process smooth for both of us.

## Before you start

- **Open an issue first** for anything non-trivial (new data source, UI overhaul, new library). That way we can agree on scope before you invest time.
- **Keep PRs focused.** One logical change per PR. If you find yourself touching the dataset pipeline *and* the UI *and* a library, split them.
- **Match the existing style.** No linters enforce it hard, but the code leans toward small, self-contained functions with comments explaining *why* (not *what*).

## Setting up

```bash
git clone https://github.com/aykutsp/world-fuel-prices.git
cd world-fuel-prices
npm install
npm run generate-data   # hits live upstream feeds; takes ~10 s
npm run dev
```

Open the dev server URL printed by Vite (`http://localhost:5173/` by default).

## Where to look

| Task | File |
|---|---|
| Add a new country feed | `scripts/generateData.js` — add a `loadXX()` function, register it in `loadAllStationLevel()`, document the license |
| Tweak the map / choropleth | `src/components/Map/FuelMap.tsx` |
| Trip calculator | `src/components/Trip/TripCalculator.tsx` |
| Sidebar layout | `src/components/Dashboard/Sidebar.tsx` |
| A client library | `libraries/<language>/` |
| CI / deploy workflow | `.github/workflows/deploy.yml` |

## Adding a new country data feed

Good contributions look like:

1. A self-contained `loadXX()` async function returning `{ iso2, currency, prices: { gasoline, diesel, lpg }, stationCount, source }`.
2. Registered in the `loadAllStationLevel()` loaders array.
3. License and access details documented in the file's top comment block and in the README's data sources table.
4. A note in the commit message about how often the upstream refreshes and whether it requires auth.

Feeds that require credentials can still be merged, but must fail gracefully with a log line (not crash the build) when the credentials aren't present.

## Code style

- **TypeScript** throughout the app.
- Prefer plain functions over classes unless there's state to manage.
- Keep component files under ~400 lines; split a helper out if it gets bigger.
- Don't add dependencies lightly — three similar lines of code beat a premature abstraction.

## Before submitting

```bash
npm run lint
npm run build   # regenerates data + typechecks + bundles
```

Both need to pass cleanly. The GitHub Actions workflow runs the same checks on every push.

## Licensing

All code contributions are accepted under the project's MIT licence. Upstream datasets keep their original licences; if you wire in a new source, make sure its terms allow redistribution.
