"""world-infra-data — Python client for the World Infrastructure Data Hub.

Stdlib only; works on Python 3.9+.
"""

from __future__ import annotations

import json
import urllib.request
from typing import List, Literal, Optional

__version__ = "1.0.0"
__all__ = ["WorldInfraDataClient", "MetricKey", "extract_metric"]

DEFAULT_BASE = "https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/"

MetricKey = Literal[
    "fuel.gasoline", "fuel.diesel", "fuel.lpg",
    "electricity", "ev.home", "ev.fast",
    "co2", "gridCO2",
    "wb.gdp", "wb.life", "wb.internet", "wb.renewables",
    "wb.gini", "wb.unemployment", "wb.inflation",
]


def extract_metric(country: dict, key: MetricKey) -> Optional[float]:
    """Pull a single metric out of a country record. Returns None when missing."""
    f = country.get("fuel") or {}
    e = country.get("electricity") or {}
    ev = country.get("ev") or {}
    c = country.get("co2") or {}
    g = country.get("gridCO2") or {}
    wb = country.get("worldBank") or {}
    wb_val = lambda name: (wb.get(name) or {}).get("value")  # noqa: E731

    return {
        "fuel.gasoline":     f.get("gasoline"),
        "fuel.diesel":       f.get("diesel"),
        "fuel.lpg":          f.get("lpg"),
        "electricity":       e.get("household_usd_per_kwh"),
        "ev.home":           ev.get("home_usd_per_100km"),
        "ev.fast":           ev.get("public_fast_usd_per_100km"),
        "co2":               c.get("tonnes_per_capita"),
        "gridCO2":           g.get("gco2_per_kwh"),
        "wb.gdp":            wb_val("gdp_per_capita_usd"),
        "wb.life":           wb_val("life_expectancy_years"),
        "wb.internet":       wb_val("internet_users_pct"),
        "wb.renewables":     wb_val("renewable_electricity_pct"),
        "wb.gini":           wb_val("gini_index"),
        "wb.unemployment":   wb_val("unemployment_pct"),
        "wb.inflation":      wb_val("inflation_pct"),
    }.get(key)


class WorldInfraDataClient:
    """Small HTTP client backed by the stdlib. No third-party deps."""

    def __init__(self, base_url: str = DEFAULT_BASE, timeout: float = 30.0):
        if not base_url.endswith("/"):
            base_url += "/"
        self.base_url = base_url
        self.timeout = timeout
        self._dataset: Optional[dict] = None

    def _get_json(self, path: str) -> dict:
        req = urllib.request.Request(
            self.base_url + path.lstrip("/"),
            headers={"User-Agent": "world-infra-data-py/1.0"},
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            return json.load(r)

    def get_dataset(self, force: bool = False) -> dict:
        if force or self._dataset is None:
            self._dataset = self._get_json("countries.json")
        return self._dataset

    def get_countries(self) -> List[dict]:
        return self.get_dataset()["countries"]

    def get_country(self, iso2: str) -> Optional[dict]:
        iso2 = iso2.upper()
        for c in self.get_countries():
            if c["id"].upper() == iso2:
                return c
        return None

    def metric(self, key: MetricKey, iso2: str) -> Optional[float]:
        c = self.get_country(iso2)
        return extract_metric(c, key) if c else None

    def rank(self, key: MetricKey, direction: str = "asc", limit: int = 10) -> List[dict]:
        rows = []
        for c in self.get_countries():
            v = extract_metric(c, key)
            if v is not None and v > 0:
                rows.append((v, c))
        rows.sort(key=lambda x: x[0], reverse=(direction == "desc"))
        return [c for _, c in rows[:limit]]

    def global_average(self, key: MetricKey) -> float:
        vals = [
            v for v in (extract_metric(c, key) for c in self.get_countries())
            if v is not None and v > 0
        ]
        return sum(vals) / len(vals) if vals else 0.0
