/// Dart / Flutter client for the World Infrastructure Data Hub open data API.
library world_infra_data;

import 'dart:convert';
import 'package:http/http.dart' as http;

const String defaultBaseUrl =
    'https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/';

enum Metric {
  fuelGasoline,
  fuelDiesel,
  fuelLpg,
  electricity,
  evHome,
  evFast,
  co2,
  gridCo2,
  wbGdp,
  wbLife,
  wbInternet,
  wbRenewables,
  wbGini,
  wbUnemployment,
  wbInflation,
}

/// Value extractor for a given metric on a [Country]. Returns null when the
/// country doesn't publish that column.
double? extractMetric(Country c, Metric m) {
  switch (m) {
    case Metric.fuelGasoline:
      return c.fuel?.gasoline;
    case Metric.fuelDiesel:
      return c.fuel?.diesel;
    case Metric.fuelLpg:
      return c.fuel?.lpg;
    case Metric.electricity:
      return c.electricity?.householdUsdPerKwh;
    case Metric.evHome:
      return c.ev?.homeUsdPer100Km;
    case Metric.evFast:
      return c.ev?.publicFastUsdPer100Km;
    case Metric.co2:
      return c.co2?.tonnesPerCapita;
    case Metric.gridCo2:
      return c.gridCo2?.gco2PerKwh;
    case Metric.wbGdp:
      return c.worldBank?.gdpPerCapitaUsd?.value;
    case Metric.wbLife:
      return c.worldBank?.lifeExpectancyYears?.value;
    case Metric.wbInternet:
      return c.worldBank?.internetUsersPct?.value;
    case Metric.wbRenewables:
      return c.worldBank?.renewableElectricityPct?.value;
    case Metric.wbGini:
      return c.worldBank?.giniIndex?.value;
    case Metric.wbUnemployment:
      return c.worldBank?.unemploymentPct?.value;
    case Metric.wbInflation:
      return c.worldBank?.inflationPct?.value;
  }
}

// ---- Model classes --------------------------------------------------------

double? _d(dynamic v) => v is num ? v.toDouble() : null;

class FuelBlock {
  final double? gasoline;
  final double? diesel;
  final double? lpg;
  final String? source;
  const FuelBlock({this.gasoline, this.diesel, this.lpg, this.source});
  factory FuelBlock.fromJson(Map<String, dynamic> j) => FuelBlock(
        gasoline: _d(j['gasoline']),
        diesel: _d(j['diesel']),
        lpg: _d(j['lpg']),
        source: j['source'] as String?,
      );
}

class ElectricityBlock {
  final double householdUsdPerKwh;
  final int year;
  final String? period;
  final String? source;
  const ElectricityBlock({
    required this.householdUsdPerKwh,
    required this.year,
    this.period,
    this.source,
  });
  factory ElectricityBlock.fromJson(Map<String, dynamic> j) => ElectricityBlock(
        householdUsdPerKwh: _d(j['household_usd_per_kwh']) ?? 0,
        year: (j['year'] as num?)?.toInt() ?? 0,
        period: j['period'] as String?,
        source: j['source'] as String?,
      );
}

class EvBlock {
  final double homeUsdPer100Km;
  final double publicFastUsdPer100Km;
  const EvBlock({required this.homeUsdPer100Km, required this.publicFastUsdPer100Km});
  factory EvBlock.fromJson(Map<String, dynamic> j) => EvBlock(
        homeUsdPer100Km: _d(j['home_usd_per_100km']) ?? 0,
        publicFastUsdPer100Km: _d(j['public_fast_usd_per_100km']) ?? 0,
      );
}

class Co2Block {
  final int year;
  final double tonnesPerCapita;
  final double? totalMillionTonnes;
  final List<List<double>>? history;
  final String? source;
  const Co2Block({
    required this.year,
    required this.tonnesPerCapita,
    this.totalMillionTonnes,
    this.history,
    this.source,
  });
  factory Co2Block.fromJson(Map<String, dynamic> j) => Co2Block(
        year: (j['year'] as num?)?.toInt() ?? 0,
        tonnesPerCapita: _d(j['tonnes_per_capita']) ?? 0,
        totalMillionTonnes: _d(j['total_million_tonnes']),
        history: (j['history'] as List?)
            ?.map<List<double>>(
                (e) => (e as List).map<double>((x) => (x as num).toDouble()).toList())
            .toList(),
        source: j['source'] as String?,
      );
}

class GridCo2Block {
  final double gco2PerKwh;
  final int year;
  final String? source;
  const GridCo2Block({required this.gco2PerKwh, required this.year, this.source});
  factory GridCo2Block.fromJson(Map<String, dynamic> j) => GridCo2Block(
        gco2PerKwh: _d(j['gco2_per_kwh']) ?? 0,
        year: (j['year'] as num?)?.toInt() ?? 0,
        source: j['source'] as String?,
      );
}

class WbIndicator {
  final double value;
  final int year;
  final String? source;
  final List<List<double>>? history;
  const WbIndicator({required this.value, required this.year, this.source, this.history});
  factory WbIndicator.fromJson(Map<String, dynamic> j) => WbIndicator(
        value: _d(j['value']) ?? 0,
        year: (j['year'] as num?)?.toInt() ?? 0,
        source: j['source'] as String?,
        history: (j['history'] as List?)
            ?.map<List<double>>(
                (e) => (e as List).map<double>((x) => (x as num).toDouble()).toList())
            .toList(),
      );
}

class WorldBankBlock {
  final WbIndicator? gdpPerCapitaUsd;
  final WbIndicator? population;
  final WbIndicator? lifeExpectancyYears;
  final WbIndicator? internetUsersPct;
  final WbIndicator? renewableElectricityPct;
  final WbIndicator? giniIndex;
  final WbIndicator? unemploymentPct;
  final WbIndicator? inflationPct;
  const WorldBankBlock({
    this.gdpPerCapitaUsd,
    this.population,
    this.lifeExpectancyYears,
    this.internetUsersPct,
    this.renewableElectricityPct,
    this.giniIndex,
    this.unemploymentPct,
    this.inflationPct,
  });
  factory WorldBankBlock.fromJson(Map<String, dynamic> j) {
    WbIndicator? p(String k) {
      final v = j[k];
      return v == null ? null : WbIndicator.fromJson(v as Map<String, dynamic>);
    }
    return WorldBankBlock(
      gdpPerCapitaUsd: p('gdp_per_capita_usd'),
      population: p('population'),
      lifeExpectancyYears: p('life_expectancy_years'),
      internetUsersPct: p('internet_users_pct'),
      renewableElectricityPct: p('renewable_electricity_pct'),
      giniIndex: p('gini_index'),
      unemploymentPct: p('unemployment_pct'),
      inflationPct: p('inflation_pct'),
    );
  }
}

class Country {
  final String id;
  final String? iso3;
  final String name;
  final double lat;
  final double lng;
  final FuelBlock? fuel;
  final ElectricityBlock? electricity;
  final EvBlock? ev;
  final Co2Block? co2;
  final GridCo2Block? gridCo2;
  final WorldBankBlock? worldBank;
  const Country({
    required this.id,
    required this.name,
    required this.lat,
    required this.lng,
    this.iso3,
    this.fuel,
    this.electricity,
    this.ev,
    this.co2,
    this.gridCo2,
    this.worldBank,
  });
  factory Country.fromJson(Map<String, dynamic> j) {
    dynamic raw;
    return Country(
      id: j['id'] as String,
      iso3: j['iso3'] as String?,
      name: j['name'] as String,
      lat: _d(j['lat']) ?? 0,
      lng: _d(j['lng']) ?? 0,
      fuel: (raw = j['fuel']) == null ? null : FuelBlock.fromJson(raw as Map<String, dynamic>),
      electricity: (raw = j['electricity']) == null
          ? null
          : ElectricityBlock.fromJson(raw as Map<String, dynamic>),
      ev: (raw = j['ev']) == null ? null : EvBlock.fromJson(raw as Map<String, dynamic>),
      co2: (raw = j['co2']) == null ? null : Co2Block.fromJson(raw as Map<String, dynamic>),
      gridCo2: (raw = j['gridCO2']) == null
          ? null
          : GridCo2Block.fromJson(raw as Map<String, dynamic>),
      worldBank: (raw = j['worldBank']) == null
          ? null
          : WorldBankBlock.fromJson(raw as Map<String, dynamic>),
    );
  }
}

class Dataset {
  final String lastUpdated;
  final List<String> sources;
  final Map<String, int> coverage;
  final List<Country> countries;
  const Dataset({
    required this.lastUpdated,
    required this.sources,
    required this.coverage,
    required this.countries,
  });
  factory Dataset.fromJson(Map<String, dynamic> j) => Dataset(
        lastUpdated: j['lastUpdated'] as String,
        sources: ((j['sources'] as List?) ?? const []).map((e) => e.toString()).toList(),
        coverage: ((j['coverage'] as Map?) ?? const {})
            .map((k, v) => MapEntry(k.toString(), (v as num).toInt())),
        countries: (j['countries'] as List)
            .map((e) => Country.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

// ---- Client ---------------------------------------------------------------

class WorldInfraDataClient {
  final String baseUrl;
  final http.Client _http;
  Dataset? _cached;

  WorldInfraDataClient({String? baseUrl, http.Client? httpClient})
      : baseUrl = (baseUrl ?? defaultBaseUrl).endsWith('/')
            ? (baseUrl ?? defaultBaseUrl)
            : '${baseUrl ?? defaultBaseUrl}/',
        _http = httpClient ?? http.Client();

  Future<Dataset> getDataset({bool force = false}) async {
    if (!force && _cached != null) return _cached!;
    final res = await _http.get(
      Uri.parse('${baseUrl}countries.json'),
      headers: const {'User-Agent': 'world-infra-data-dart/1.0'},
    );
    if (res.statusCode >= 400) {
      throw Exception('HTTP ${res.statusCode} from ${baseUrl}countries.json');
    }
    _cached = Dataset.fromJson(json.decode(res.body) as Map<String, dynamic>);
    return _cached!;
  }

  Future<Country?> getCountry(String iso2) async {
    final d = await getDataset();
    final up = iso2.toUpperCase();
    for (final c in d.countries) {
      if (c.id.toUpperCase() == up) return c;
    }
    return null;
  }

  Future<List<Country>> rank(Metric metric, {String direction = 'asc', int limit = 10}) async {
    final d = await getDataset();
    final rows = <MapEntry<double, Country>>[];
    for (final c in d.countries) {
      final v = extractMetric(c, metric);
      if (v != null && v > 0) rows.add(MapEntry(v, c));
    }
    rows.sort((a, b) => direction == 'desc' ? b.key.compareTo(a.key) : a.key.compareTo(b.key));
    return rows.take(limit).map((e) => e.value).toList();
  }

  Future<double> globalAverage(Metric metric) async {
    final d = await getDataset();
    final values = d.countries
        .map((c) => extractMetric(c, metric))
        .where((v) => v != null && v > 0)
        .cast<double>()
        .toList();
    if (values.isEmpty) return 0;
    return values.reduce((a, b) => a + b) / values.length;
  }

  void close() => _http.close();
}
