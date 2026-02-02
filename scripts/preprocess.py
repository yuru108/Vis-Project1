import pandas as pd
from pathlib import Path

def main():
    root = Path(__file__).resolve().parent.parent
    data_dir = root / "data"

    gdp_path = data_dir / "gdp-per-capita-worldbank.csv"
    homicide_path = data_dir / "homicide-rate-unodc.csv"
    out_path = data_dir / "data.csv"

    gdp = pd.read_csv(gdp_path)
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
    homicide = homicide.rename(
        columns={
            "Entity": "country",
            "Code": "iso3",
            "Year": "year",
            "Homicide rate per 100,000 population": "homicide_rate",
            "World region according to OWID": "region",
        }
    )

    gdp = gdp[["country", "iso3", "year", "region", "gdp_pc"]]
    homicide = homicide[["country", "iso3", "year", "region", "homicide_rate"]]

    min_year = max(gdp["year"].min(), homicide["year"].min())
    max_year = min(gdp["year"].max(), homicide["year"].max())

    gdp = gdp[(gdp["year"] >= min_year) & (gdp["year"] <= max_year)]
    homicide = homicide[(homicide["year"] >= min_year) & (homicide["year"] <= max_year)]

    merged = pd.merge(
        gdp,
        homicide,
        on=["iso3", "year"],
        how="inner",
        suffixes=("_gdp", "_homicide"),
    )

    merged["country"] = merged["country_gdp"].combine_first(merged["country_homicide"])
    merged["region"] = merged["region_gdp"].combine_first(merged["region_homicide"])

    merged = merged[
        [
            "country",
            "iso3",
            "year",
            "region",
            "gdp_pc",
            "homicide_rate",
        ]
    ].dropna(subset=["gdp_pc", "homicide_rate", "iso3", "year"])

    merged = merged.sort_values(["iso3", "year"]).reset_index(drop=True)

    merged.to_csv(out_path, index=False)

if __name__ == "__main__":
    main()