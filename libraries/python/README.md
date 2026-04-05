# world-infra-data (Python)

Stdlib-only Python client for the [World Infrastructure Data Hub](https://github.com/aykutsp/world-infrastructure-data-hub).

## Install

```bash
pip install world-infra-data
```

## Usage

```python
from world_infra_data import WorldInfraDataClient

client = WorldInfraDataClient()

de = client.get_country("DE")
print(de["name"], "gasoline:", de["fuel"]["gasoline"], "USD/L")

# Top 10 countries by renewable electricity share
for c in client.rank("wb.renewables", direction="desc", limit=10):
    v = c["worldBank"]["renewable_electricity_pct"]["value"]
    print(f'{c["id"]}\t{v:5.1f} %\t{c["name"]}')

# Global average life expectancy
print(f'World life expectancy: {client.global_average("wb.life"):.1f} years')
```

## License

MIT.
