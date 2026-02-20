import pandas as pd
from pathlib import Path

def main():
    root = Path(__file__).resolve().parent.parent
    data_dir = root / "data"

    gdp_path = data_dir / "gdp-per-capita-worldbank.csv"
    gini_path = data_dir / "economic-inequality-gini-index.csv"
    homicide_path = data_dir / "homicide-rate-unodc.csv"
    out_path = data_dir / "data.csv"

    gdp = pd.read_csv(gdp_path)
    gini = pd.read_csv(gini_path)
    homicide = pd.read_csv(homicide_path)

    gdp = gdp.rename(
        columns={
            "Entity": "country",
            "Code": "iso3",
            "Year": "year",
            "GDP per capita": "gdp_pc",
            "World region according to OWID": "region",
        }
    )
    gini = gini.rename(
        columns={
            "Entity": "country_gini",
            "Code": "iso3",
            "Year": "year",
            "Gini coefficient": "gini",
            "World region according to OWID": "region_gini",
        }
    )
    homicide = homicide.rename(
        columns={
            "Entity": "country_homicide",
            "Code": "iso3",
            "Year": "year",
            "Homicide rate per 100,000 population": "homicide_rate",
            "World region according to OWID": "region_homicide",
        }
    )

    gdp = gdp[["country", "iso3", "year", "region", "gdp_pc"]]
    gini = gini[["country_gini", "iso3", "year", "region_gini", "gini"]]
    homicide = homicide[
        ["country_homicide", "iso3", "year", "region_homicide", "homicide_rate"]
    ]

    min_year = max(gdp["year"].min(), gini["year"].min(), homicide["year"].min())
    max_year = min(gdp["year"].max(), gini["year"].max(), homicide["year"].max())

    gdp = gdp[(gdp["year"] >= min_year) & (gdp["year"] <= max_year)]
    gini = gini[(gini["year"] >= min_year) & (gini["year"] <= max_year)]
    homicide = homicide[(homicide["year"] >= min_year) & (homicide["year"] <= max_year)]

    merged = pd.merge(
        gdp,
        gini,
        on=["iso3", "year"],
        how="inner",
    )
    merged = pd.merge(
        merged,
        homicide,
        on=["iso3", "year"],
        how="inner",
    )

    merged["country"] = (
        merged["country"]
        .combine_first(merged["country_gini"])
        .combine_first(merged["country_homicide"])
    )
    merged["region"] = (
        merged["region"]
        .combine_first(merged["region_gini"])
        .combine_first(merged["region_homicide"])
    )

    merged = merged[
        [
            "country",
            "iso3",
            "year",
            "region",
            "gdp_pc",
            "gini",
            "homicide_rate",
        ]
    ].dropna(subset=["gdp_pc", "gini", "homicide_rate", "iso3", "year"])

    merged = merged.sort_values(["iso3", "year"]).reset_index(drop=True)

    merged.to_csv(out_path, index=False)

if __name__ == "__main__":
    main()
