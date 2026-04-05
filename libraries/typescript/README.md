# world-infra-data (TypeScript / JavaScript)

Tiny, zero-dependency client for the [World Infrastructure Data Hub](https://github.com/aykutsp/world-infrastructure-data-hub) open data API. Works in Node 18+, Deno, Bun and modern browsers.

## Install

```bash
npm install world-infra-data
```

## Usage

```ts
import { worldInfraData, WorldInfraDataClient } from 'world-infra-data';

const de = await worldInfraData.getCountry('DE');
console.log(`${de?.name}: gas $${de?.fuel?.gasoline}/L, GDP $${de?.worldBank?.gdp_per_capita_usd?.value}`);

const top10GreenestGrid = await worldInfraData.rank('gridCO2', 'asc', 10);
for (const c of top10GreenestGrid) {
  console.log(c.id, c.name, c.gridCO2?.gco2_per_kwh, 'g/kWh');
}

const avg = await worldInfraData.globalAverage('wb.life');
console.log(`World life expectancy avg: ${avg.toFixed(1)} yrs`);
```

## License

MIT.
