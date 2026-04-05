# WorldInfraData (.NET / C#)

.NET 8+ client for the [World Infrastructure Data Hub](https://github.com/aykutsp/world-infrastructure-data-hub).

## Install

```bash
dotnet add package WorldInfraData
```

## Usage

```csharp
using WorldInfraData;

using var client = new WorldInfraDataClient();

var de = await client.GetCountryAsync("DE");
Console.WriteLine($"{de!.Name}: gas ${de.Fuel?.Gasoline:F2}/L, GDP ${de.WorldBank?.GdpPerCapitaUsd?.Value:F0}");

foreach (var c in await client.RankAsync(Metric.GridCo2, "asc", 10))
    Console.WriteLine($"{c.Id}  {c.GridCo2?.Gco2PerKwh,6:F0} g/kWh  {c.Name}");

var avg = await client.GlobalAverageAsync(Metric.WbLife);
Console.WriteLine($"world life expectancy: {avg:F1} yrs");
```

## License

MIT.
