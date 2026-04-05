// Package infradata is a stdlib-only Go client for the World Infrastructure
// Data Hub open data API (https://aykutsp.github.io/world-infrastructure-data-hub/).
package infradata

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

const DefaultBaseURL = "https://aykutsp.github.io/world-infrastructure-data-hub/api/v1/"

type MetricKey string

const (
	MetricGasoline    MetricKey = "fuel.gasoline"
	MetricDiesel      MetricKey = "fuel.diesel"
	MetricLPG         MetricKey = "fuel.lpg"
	MetricElectricity MetricKey = "electricity"
	MetricEVHome      MetricKey = "ev.home"
	MetricEVFast      MetricKey = "ev.fast"
	MetricCO2         MetricKey = "co2"
	MetricGridCO2     MetricKey = "gridCO2"
	MetricGDP         MetricKey = "wb.gdp"
	MetricLifeExp     MetricKey = "wb.life"
	MetricInternet    MetricKey = "wb.internet"
	MetricRenewables  MetricKey = "wb.renewables"
	MetricGini        MetricKey = "wb.gini"
	MetricUnemp       MetricKey = "wb.unemployment"
	MetricInflation   MetricKey = "wb.inflation"
)

type FuelBlock struct {
	Gasoline *float64 `json:"gasoline"`
	Diesel   *float64 `json:"diesel"`
	LPG      *float64 `json:"lpg"`
	Source   string   `json:"source,omitempty"`
}

type ElectricityBlock struct {
	HouseholdUSDPerKWH float64 `json:"household_usd_per_kwh"`
	Year               int     `json:"year"`
	Period             string  `json:"period,omitempty"`
	Source             string  `json:"source,omitempty"`
}

type EVBlock struct {
	HomeUSDPer100Km       float64 `json:"home_usd_per_100km"`
	PublicFastUSDPer100Km float64 `json:"public_fast_usd_per_100km"`
}

type CO2Block struct {
	Year               int          `json:"year"`
	TonnesPerCapita    float64      `json:"tonnes_per_capita"`
	TotalMillionTonnes *float64     `json:"total_million_tonnes"`
	History            [][2]float64 `json:"history,omitempty"`
	Source             string       `json:"source,omitempty"`
}

type GridCO2Block struct {
	GCO2PerKWH float64 `json:"gco2_per_kwh"`
	Year       int     `json:"year"`
	Source     string  `json:"source,omitempty"`
}

type WBIndicator struct {
	Value   float64      `json:"value"`
	Year    int          `json:"year"`
	Source  string       `json:"source,omitempty"`
	History [][2]float64 `json:"history,omitempty"`
}

type WorldBankBlock struct {
	GDPPerCapita          *WBIndicator `json:"gdp_per_capita_usd,omitempty"`
	Population            *WBIndicator `json:"population,omitempty"`
	LifeExpectancy        *WBIndicator `json:"life_expectancy_years,omitempty"`
	InternetUsersPct      *WBIndicator `json:"internet_users_pct,omitempty"`
	RenewableElectricPct  *WBIndicator `json:"renewable_electricity_pct,omitempty"`
	GiniIndex             *WBIndicator `json:"gini_index,omitempty"`
	UnemploymentPct       *WBIndicator `json:"unemployment_pct,omitempty"`
	InflationPct          *WBIndicator `json:"inflation_pct,omitempty"`
}

type Country struct {
	ID          string            `json:"id"`
	ISO3        string            `json:"iso3,omitempty"`
	Name        string            `json:"name"`
	Lat         float64           `json:"lat"`
	Lng         float64           `json:"lng"`
	Fuel        *FuelBlock        `json:"fuel"`
	Electricity *ElectricityBlock `json:"electricity"`
	EV          *EVBlock          `json:"ev"`
	CO2         *CO2Block         `json:"co2"`
	GridCO2     *GridCO2Block     `json:"gridCO2"`
	WorldBank   *WorldBankBlock   `json:"worldBank"`
}

type Dataset struct {
	LastUpdated string         `json:"lastUpdated"`
	Sources     []string       `json:"sources"`
	Coverage    map[string]int `json:"coverage"`
	Countries   []Country      `json:"countries"`
}

type Client struct {
	BaseURL string
	HTTP    *http.Client

	mu      sync.Mutex
	dataset *Dataset
}

func New() *Client {
	return &Client{
		BaseURL: DefaultBaseURL,
		HTTP:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) GetDataset(force bool) (*Dataset, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !force && c.dataset != nil {
		return c.dataset, nil
	}
	url := strings.TrimRight(c.BaseURL, "/") + "/countries.json"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "world-infra-data-go/1.0")
	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d from %s", res.StatusCode, url)
	}
	var d Dataset
	if err := json.NewDecoder(res.Body).Decode(&d); err != nil {
		return nil, err
	}
	c.dataset = &d
	return &d, nil
}

func (c *Client) GetCountry(iso2 string) (*Country, error) {
	d, err := c.GetDataset(false)
	if err != nil {
		return nil, err
	}
	iso2 = strings.ToUpper(iso2)
	for i := range d.Countries {
		if strings.ToUpper(d.Countries[i].ID) == iso2 {
			return &d.Countries[i], nil
		}
	}
	return nil, nil
}

// Metric returns the numeric value for the given metric key, or (0, false)
// when it isn't available.
func (c *Client) Metric(key MetricKey, iso2string string) (float64, bool, error) {
	country, err := c.GetCountry(iso2string)
	if err != nil || country == nil {
		return 0, false, err
	}
	return extractMetric(*country, key), hasMetric(*country, key), nil
}

func (c *Client) Rank(key MetricKey, direction string, limit int) ([]Country, error) {
	d, err := c.GetDataset(false)
	if err != nil {
		return nil, err
	}
	type row struct {
		c Country
		v float64
	}
	rows := make([]row, 0, len(d.Countries))
	for _, country := range d.Countries {
		if hasMetric(country, key) {
			v := extractMetric(country, key)
			if v > 0 {
				rows = append(rows, row{country, v})
			}
		}
	}
	sort.SliceStable(rows, func(i, j int) bool {
		if direction == "desc" {
			return rows[i].v > rows[j].v
		}
		return rows[i].v < rows[j].v
	})
	if limit > len(rows) {
		limit = len(rows)
	}
	out := make([]Country, limit)
	for i := 0; i < limit; i++ {
		out[i] = rows[i].c
	}
	return out, nil
}

func (c *Client) GlobalAverage(key MetricKey) (float64, error) {
	d, err := c.GetDataset(false)
	if err != nil {
		return 0, err
	}
	var sum float64
	var count int
	for _, country := range d.Countries {
		if !hasMetric(country, key) {
			continue
		}
		v := extractMetric(country, key)
		if v > 0 {
			sum += v
			count++
		}
	}
	if count == 0 {
		return 0, nil
	}
	return sum / float64(count), nil
}

func hasMetric(c Country, key MetricKey) bool {
	return !isZero(extractMetric(c, key))
}

func isZero(v float64) bool { return v == 0 }

func extractMetric(c Country, key MetricKey) float64 {
	switch key {
	case MetricGasoline:
		if c.Fuel != nil && c.Fuel.Gasoline != nil {
			return *c.Fuel.Gasoline
		}
	case MetricDiesel:
		if c.Fuel != nil && c.Fuel.Diesel != nil {
			return *c.Fuel.Diesel
		}
	case MetricLPG:
		if c.Fuel != nil && c.Fuel.LPG != nil {
			return *c.Fuel.LPG
		}
	case MetricElectricity:
		if c.Electricity != nil {
			return c.Electricity.HouseholdUSDPerKWH
		}
	case MetricEVHome:
		if c.EV != nil {
			return c.EV.HomeUSDPer100Km
		}
	case MetricEVFast:
		if c.EV != nil {
			return c.EV.PublicFastUSDPer100Km
		}
	case MetricCO2:
		if c.CO2 != nil {
			return c.CO2.TonnesPerCapita
		}
	case MetricGridCO2:
		if c.GridCO2 != nil {
			return c.GridCO2.GCO2PerKWH
		}
	case MetricGDP:
		if c.WorldBank != nil && c.WorldBank.GDPPerCapita != nil {
			return c.WorldBank.GDPPerCapita.Value
		}
	case MetricLifeExp:
		if c.WorldBank != nil && c.WorldBank.LifeExpectancy != nil {
			return c.WorldBank.LifeExpectancy.Value
		}
	case MetricInternet:
		if c.WorldBank != nil && c.WorldBank.InternetUsersPct != nil {
			return c.WorldBank.InternetUsersPct.Value
		}
	case MetricRenewables:
		if c.WorldBank != nil && c.WorldBank.RenewableElectricPct != nil {
			return c.WorldBank.RenewableElectricPct.Value
		}
	case MetricGini:
		if c.WorldBank != nil && c.WorldBank.GiniIndex != nil {
			return c.WorldBank.GiniIndex.Value
		}
	case MetricUnemp:
		if c.WorldBank != nil && c.WorldBank.UnemploymentPct != nil {
			return c.WorldBank.UnemploymentPct.Value
		}
	case MetricInflation:
		if c.WorldBank != nil && c.WorldBank.InflationPct != nil {
			return c.WorldBank.InflationPct.Value
		}
	}
	return 0
}
