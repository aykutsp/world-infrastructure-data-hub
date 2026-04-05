using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace WorldInfraData;

/// <summary>
/// Tiny .NET client for the World Infrastructure Data Hub open data API.
/// </summary>
public sealed class WorldInfraDataClient : IDisposable
{
    public const string DefaultBaseUrl = "https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/";

    private readonly HttpClient _http;
    private readonly bool _ownsHttp;
    private Dataset? _cached;

    public WorldInfraDataClient(string? baseUrl = null, HttpClient? httpClient = null)
    {
        _http = httpClient ?? new HttpClient();
        _ownsHttp = httpClient is null;
        var url = baseUrl ?? DefaultBaseUrl;
        _http.BaseAddress = new Uri(url.EndsWith("/") ? url : url + "/");
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("world-infra-data-csharp/1.0");
    }

    public async Task<Dataset> GetDatasetAsync(bool force = false, CancellationToken ct = default)
    {
        if (!force && _cached is not null) return _cached;
        var d = await _http.GetFromJsonAsync<Dataset>("countries.json", ct)
                ?? throw new InvalidOperationException("Empty countries.json response");
        _cached = d;
        return d;
    }

    public async Task<Country?> GetCountryAsync(string iso2, CancellationToken ct = default)
    {
        var d = await GetDatasetAsync(ct: ct);
        return d.Countries.FirstOrDefault(c => c.Id.Equals(iso2, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<double?> GetMetricAsync(Metric metric, string iso2, CancellationToken ct = default)
    {
        var c = await GetCountryAsync(iso2, ct);
        return c is null ? null : ExtractMetric(c, metric);
    }

    public async Task<IReadOnlyList<Country>> RankAsync(Metric metric, string direction = "asc", int limit = 10, CancellationToken ct = default)
    {
        var d = await GetDatasetAsync(ct: ct);
        var rows = d.Countries
            .Select(c => (c, v: ExtractMetric(c, metric)))
            .Where(t => t.v is > 0)
            .Select(t => (t.c, v: t.v!.Value));
        rows = direction == "desc" ? rows.OrderByDescending(r => r.v) : rows.OrderBy(r => r.v);
        return rows.Take(limit).Select(t => t.c).ToList();
    }

    public async Task<double> GlobalAverageAsync(Metric metric, CancellationToken ct = default)
    {
        var d = await GetDatasetAsync(ct: ct);
        var vals = d.Countries
            .Select(c => ExtractMetric(c, metric))
            .Where(v => v is > 0)
            .Select(v => v!.Value)
            .ToList();
        return vals.Count == 0 ? 0 : vals.Average();
    }

    public static double? ExtractMetric(Country c, Metric m) => m switch
    {
        Metric.FuelGasoline   => c.Fuel?.Gasoline,
        Metric.FuelDiesel     => c.Fuel?.Diesel,
        Metric.FuelLpg        => c.Fuel?.Lpg,
        Metric.Electricity    => c.Electricity?.HouseholdUsdPerKwh,
        Metric.EvHome         => c.Ev?.HomeUsdPer100Km,
        Metric.EvFast         => c.Ev?.PublicFastUsdPer100Km,
        Metric.Co2            => c.Co2?.TonnesPerCapita,
        Metric.GridCo2        => c.GridCo2?.Gco2PerKwh,
        Metric.WbGdp          => c.WorldBank?.GdpPerCapitaUsd?.Value,
        Metric.WbLife         => c.WorldBank?.LifeExpectancyYears?.Value,
        Metric.WbInternet     => c.WorldBank?.InternetUsersPct?.Value,
        Metric.WbRenewables   => c.WorldBank?.RenewableElectricityPct?.Value,
        Metric.WbGini         => c.WorldBank?.GiniIndex?.Value,
        Metric.WbUnemployment => c.WorldBank?.UnemploymentPct?.Value,
        Metric.WbInflation    => c.WorldBank?.InflationPct?.Value,
        _ => null,
    };

    public void Dispose()
    {
        if (_ownsHttp) _http.Dispose();
    }
}

public enum Metric
{
    FuelGasoline, FuelDiesel, FuelLpg,
    Electricity, EvHome, EvFast,
    Co2, GridCo2,
    WbGdp, WbLife, WbInternet, WbRenewables,
    WbGini, WbUnemployment, WbInflation,
}

public sealed record FuelBlock(
    [property: JsonPropertyName("gasoline")] double? Gasoline,
    [property: JsonPropertyName("diesel")] double? Diesel,
    [property: JsonPropertyName("lpg")] double? Lpg,
    [property: JsonPropertyName("source")] string? Source);

public sealed record ElectricityBlock(
    [property: JsonPropertyName("household_usd_per_kwh")] double HouseholdUsdPerKwh,
    [property: JsonPropertyName("year")] int Year,
    [property: JsonPropertyName("period")] string? Period,
    [property: JsonPropertyName("source")] string? Source);

public sealed record EvBlock(
    [property: JsonPropertyName("home_usd_per_100km")] double HomeUsdPer100Km,
    [property: JsonPropertyName("public_fast_usd_per_100km")] double PublicFastUsdPer100Km);

public sealed record Co2Block(
    [property: JsonPropertyName("year")] int Year,
    [property: JsonPropertyName("tonnes_per_capita")] double TonnesPerCapita,
    [property: JsonPropertyName("total_million_tonnes")] double? TotalMillionTonnes,
    [property: JsonPropertyName("history")] double[][]? History,
    [property: JsonPropertyName("source")] string? Source);

public sealed record GridCo2Block(
    [property: JsonPropertyName("gco2_per_kwh")] double Gco2PerKwh,
    [property: JsonPropertyName("year")] int Year,
    [property: JsonPropertyName("source")] string? Source);

public sealed record WbIndicator(
    [property: JsonPropertyName("value")] double Value,
    [property: JsonPropertyName("year")] int Year,
    [property: JsonPropertyName("source")] string? Source,
    [property: JsonPropertyName("history")] double[][]? History);

public sealed record WorldBankBlock(
    [property: JsonPropertyName("gdp_per_capita_usd")] WbIndicator? GdpPerCapitaUsd,
    [property: JsonPropertyName("population")] WbIndicator? Population,
    [property: JsonPropertyName("life_expectancy_years")] WbIndicator? LifeExpectancyYears,
    [property: JsonPropertyName("internet_users_pct")] WbIndicator? InternetUsersPct,
    [property: JsonPropertyName("renewable_electricity_pct")] WbIndicator? RenewableElectricityPct,
    [property: JsonPropertyName("gini_index")] WbIndicator? GiniIndex,
    [property: JsonPropertyName("unemployment_pct")] WbIndicator? UnemploymentPct,
    [property: JsonPropertyName("inflation_pct")] WbIndicator? InflationPct);

public sealed record Country(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("iso3")] string? Iso3,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("lat")] double Lat,
    [property: JsonPropertyName("lng")] double Lng,
    [property: JsonPropertyName("fuel")] FuelBlock? Fuel,
    [property: JsonPropertyName("electricity")] ElectricityBlock? Electricity,
    [property: JsonPropertyName("ev")] EvBlock? Ev,
    [property: JsonPropertyName("co2")] Co2Block? Co2,
    [property: JsonPropertyName("gridCO2")] GridCo2Block? GridCo2,
    [property: JsonPropertyName("worldBank")] WorldBankBlock? WorldBank);

public sealed record Dataset(
    [property: JsonPropertyName("lastUpdated")] string LastUpdated,
    [property: JsonPropertyName("sources")] string[] Sources,
    [property: JsonPropertyName("coverage")] Dictionary<string, int> Coverage,
    [property: JsonPropertyName("countries")] Country[] Countries);
