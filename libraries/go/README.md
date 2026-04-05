# world-infra-data (Go)

Standard-library-only Go client for the [World Infrastructure Data Hub](https://github.com/aykutsp/world-infrastructure-data-hub).

## Install

```bash
go get github.com/aykutsp/world-infrastructure-data-hub/libraries/go@latest
```

## Usage

```go
package main

import (
    "fmt"
    "log"

    infradata "github.com/aykutsp/world-infrastructure-data-hub/libraries/go"
)

func main() {
    client := infradata.New()

    de, err := client.GetCountry("DE")
    if err != nil || de == nil {
        log.Fatal("no data")
    }
    fmt.Printf("%s: gas $%.2f/L, GDP $%.0f\n",
        de.Name, *de.Fuel.Gasoline, de.WorldBank.GDPPerCapita.Value)

    top, _ := client.Rank(infradata.MetricGridCO2, "asc", 10)
    for _, c := range top {
        fmt.Printf("%s  %-30s %.0f g/kWh\n", c.ID, c.Name, c.GridCO2.GCO2PerKWH)
    }

    avg, _ := client.GlobalAverage(infradata.MetricLifeExp)
    fmt.Printf("world life expectancy: %.1f yrs\n", avg)
}
```

## License

MIT.
