#!/usr/bin/env python3

import json
import sys
from pathlib import Path


REQUIRED_FIELDS = {
    "id",
    "slug",
    "city",
    "country",
    "region",
    "lat",
    "lng",
    "costs",
    "profile_adjustments",
    "internet_mbps",
    "healthcare_score",
    "top_visa",
    "vibe",
    "last_updated",
}


def main() -> int:
    data_path = Path(__file__).with_name("data.json")
    payload = json.loads(data_path.read_text())

    if not isinstance(payload, dict):
        raise ValueError("data.json must contain an object payload")
    for key in ("version", "currency", "methodology", "cities"):
        if key not in payload:
            raise ValueError(f"data.json missing top-level key: {key}")

    data = payload["cities"]
    if not isinstance(data, list) or not data:
        raise ValueError("data.json cities must contain a non-empty array")

    seen_ids = set()
    for index, city in enumerate(data, start=1):
        if not isinstance(city, dict):
            raise ValueError(f"Entry {index} is not an object")

        missing = REQUIRED_FIELDS - city.keys()
        if missing:
            raise ValueError(f"Entry {index} is missing fields: {', '.join(sorted(missing))}")

        for key in ("cost_basis_usd", "solo_monthly_usd", "assumptions", "confidence"):
            if key not in city:
                raise ValueError(f"Entry {index} is missing new-format field: {key}")

        if city["id"] in seen_ids:
            raise ValueError(f"Duplicate id found: {city['id']}")
        seen_ids.add(city["id"])

        if not (-90 <= city["lat"] <= 90):
            raise ValueError(f"{city['id']} has invalid lat: {city['lat']}")
        if not (-180 <= city["lng"] <= 180):
            raise ValueError(f"{city['id']} has invalid lng: {city['lng']}")
        if city["internet_mbps"] <= 0:
            raise ValueError(f"{city['id']} has invalid internet_mbps: {city['internet_mbps']}")
        if city["healthcare_score"] not in (1, 2, 3, 4, 5):
            raise ValueError(f"{city['id']} has invalid healthcare_score: {city['healthcare_score']}")

        for household in ("solo", "couple", "family"):
            if household not in city["costs"]:
                raise ValueError(f"{city['id']} missing costs for {household}")
            for lifestyle in ("lean", "moderate", "luxury"):
                value = city["costs"][household].get(lifestyle)
                if not isinstance(value, (int, float)) or value <= 0:
                    raise ValueError(f"{city['id']} has invalid cost for {household}/{lifestyle}: {value}")

        for profile in ("remote_worker", "retiree"):
            value = city["profile_adjustments"].get(profile)
            if not isinstance(value, (int, float)):
                raise ValueError(f"{city['id']} has invalid profile adjustment for {profile}: {value}")

    print(f"Validated {len(data)} cities in {data_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
