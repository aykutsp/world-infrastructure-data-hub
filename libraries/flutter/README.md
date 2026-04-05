# world_infra_data (Dart / Flutter)

Dart client for the [World Infrastructure Data Hub](https://github.com/aykutsp/world-infrastructure-data-hub).

## Install

```yaml
dependencies:
  world_infra_data: ^1.0.0
```

## Usage

```dart
import 'package:world_infra_data/world_infra_data.dart';

void main() async {
  final client = WorldInfraDataClient();

  final de = await client.getCountry('DE');
  print('${de?.name}: gas \$${de?.fuel?.gasoline}/L, '
        'GDP \$${de?.worldBank?.gdpPerCapitaUsd?.value}');

  final top = await client.rank(Metric.gridCo2, limit: 10);
  for (final c in top) {
    print('${c.id}  ${c.name}  ${c.gridCo2?.gco2PerKwh} g/kWh');
  }

  client.close();
}
```

## License

MIT.
