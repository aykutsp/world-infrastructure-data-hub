# Add a new country to the dataset

## When

- A new sovereign state is recognised (rare).
- Natural Earth updates its 110m admin_0 data and we get a country that wasn't there before (more common than you'd think — think Kosovo, South Sudan).
- You want to include a disputed territory that Natural Earth already knows about.

## Check first

- Open [`public/api/v1/countries.geojson`](../../public/api/v1/countries.geojson) and grep for the ISO-A2 / ISO-A3 code. If Natural Earth has it, the pipeline **already knows** about the country — you don't need to add it anywhere; you just need to give the upstream loaders something to find.
- If the country really doesn't exist in Natural Earth yet, the fix starts with upgrading the GeoJSON source (Natural Earth ship a new release every few months).

## Steps

1. **Verify the country code.** Open [`public/api/v1/countries.json`](../../public/api/v1/countries.json) and see whether the ISO-A2 appears in `countries[].id`. If yes, the problem is a missing *metric*, not a missing country — skip to `add-new-metric.md` (actually: extend the loader that should have included this country).

2. **Check each loader in turn.** For each of the 9 loaders in `scripts/generateData.js`:
   - Does the upstream source cover this country?
   - Does the upstream return a different code than ISO-A2? (Eurostat uses `EL` for Greece, `UK` for the UK — we normalise these in `EUROSTAT_GEO_TO_ISO2`.)
   - Is the country's ISO-A3 in `geo.byIso3`? If not, Natural Earth doesn't have it and you need a newer GeoJSON.

3. **Update the normalisation table** if the upstream uses a non-standard code. Example:
   ```js
   // scripts/generateData.js
   const EUROSTAT_GEO_TO_ISO2 = {
     EL: 'GR',
     UK: 'GB',
     XK: 'XK', // <-- add here
   };
   ```

4. **Regenerate the dataset locally**:
   ```bash
   npm run generate-data
   npm run validate
   ```

5. **Verify** the new country shows up:
   ```bash
   node -e "const d=require('./public/api/v1/countries.json');console.log(d.countries.find(c=>c.id==='XK'))"
   ```

6. **Open a PR** with:
   - The code change.
   - The updated `countries.json` in the diff (the dataset file *is* in git — see ADR-0007 for why).
   - A sentence in the description explaining *why* this country was missing before.

## Verify after deploy

Open the live site, switch to Explore view, type the country name into the search, confirm it appears in the list and is clickable on the map. Compare the numbers against the upstream sources if you can — it's your only sanity check against "we stitched the wrong ISO code".
