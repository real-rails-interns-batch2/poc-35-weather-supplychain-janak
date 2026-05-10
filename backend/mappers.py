"""
Live data adapters for Real Rails PoC #35.
All adapters fail soft; main.py decides whether to use live data or synthetic fallback.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone

import httpx

SEVERITY_MULTIPLIERS = {"SEVERE": 1.45, "MODERATE": 1.20, "LOW": 1.08}
SEVERITY_DURATION = {"SEVERE": 7, "MODERATE": 4, "LOW": 2}

ROUTE_CORRIDORS = {
    "R001": {"lat_min": 10, "lat_max": 50, "lng_min": 100, "lng_max": -110, "antimeridian": True},
    "R002": {"lat_min": 35, "lat_max": 65, "lng_min": -80, "lng_max": 20, "antimeridian": False},
    "R003": {"lat_min": 10, "lat_max": 40, "lng_min": 30, "lng_max": 60, "antimeridian": False},
    "R004": {"lat_min": -40, "lat_max": 40, "lng_min": -60, "lng_max": 140, "antimeridian": False},
    "R005": {"lat_min": 10, "lat_max": 50, "lng_min": 50, "lng_max": 80, "antimeridian": False},
}

OWM_WAYPOINTS = [
    {"name": "Western Pacific", "lat": 22.0, "lng": 130.0},
    {"name": "North Atlantic", "lat": 50.0, "lng": -30.0},
    {"name": "Arabian Sea", "lat": 15.0, "lng": 58.0},
    {"name": "South Atlantic", "lat": -15.0, "lng": -25.0},
    {"name": "Indian Ocean", "lat": 10.0, "lng": 70.0},
    {"name": "Strait of Malacca", "lat": 2.5, "lng": 101.0},
    {"name": "Gulf of Aden", "lat": 12.0, "lng": 45.0},
]

ROUTE_NOAA_STATIONS = {
    "R001": "GHCND:USW00094728",
    "R002": "GHCND:USW00014732",
    "R003": "GHCND:AE000041196",
    "R004": "GHCND:BRM00083743",
    "R005": "GHCND:IN022021900",
}



def describe_adapter_error(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        response = exc.response
        body = response.text.strip().replace("\n", " ")[:180]
        return f"HTTP {response.status_code} from {response.url}: {body or response.reason_phrase}"
    if isinstance(exc, httpx.TimeoutException):
        return "timeout while waiting for provider response"
    return f"{type(exc).__name__}: {exc}"


COMTRADE_ROUTE_MAP: dict[tuple[str, str], str] = {
    ("156", "840"): "R001",
    ("826", "840"): "R002",
    ("784", "528"): "R003",
    ("076", "392"): "R004",
    ("356", "250"): "R005",
}


def get_affected_routes(lat: float, lng: float) -> list[str]:
    affected: list[str] = []

    for route_id, box in ROUTE_CORRIDORS.items():
        crosses_antimeridian = box.get("antimeridian", box["lng_min"] > box["lng_max"])
        lng_hit = (lng >= box["lng_min"] or lng <= box["lng_max"]) if crosses_antimeridian else (box["lng_min"] <= lng <= box["lng_max"])
        lat_hit = box["lat_min"] <= lat <= box["lat_max"]

        if lat_hit and lng_hit:
            affected.append(route_id)

    return affected or ["R001"]


async def fetch_openweather_events() -> list[dict]:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise ValueError("OPENWEATHER_API_KEY is not set")

    events: list[dict] = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        for index, waypoint in enumerate(OWM_WAYPOINTS):
            try:
                response = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={
                        "lat": waypoint["lat"],
                        "lon": waypoint["lng"],
                        "appid": api_key,
                        "units": "metric",
                    },
                )
                response.raise_for_status()
                payload = response.json()
                weather = payload.get("weather", [{}])[0]
                wind_speed = float(payload.get("wind", {}).get("speed", 0))
                weather_id = int(weather.get("id", 800))

                severity = None
                if weather_id < 300 or weather_id >= 900 or wind_speed > 14:
                    severity = "SEVERE"
                elif 300 <= weather_id < 700 or wind_speed > 8:
                    severity = "MODERATE"
                elif weather_id != 800 or wind_speed > 5:
                    # Low-level watch keeps live weather visible without pretending it is severe.
                    severity = "LOW"

                if not severity:
                    continue

                event_type = weather.get("description") or weather.get("main", "Weather Event")
                events.append({
                    "id": f"OWM_{index:04d}",
                    "type": str(event_type).title(),
                    "severity": severity,
                    "region": waypoint["name"],
                    "affected_routes": get_affected_routes(waypoint["lat"], waypoint["lng"]),
                    "lat": waypoint["lat"],
                    "lng": waypoint["lng"],
                    "start_date": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "estimated_duration_days": SEVERITY_DURATION[severity],
                    "delay_multiplier": SEVERITY_MULTIPLIERS[severity],
                    "noaa_event_id": f"OWM_{waypoint['name'].replace(' ', '_')}",
                })
            except Exception as exc:
                print(f"[openweather] {waypoint['name']}: {describe_adapter_error(exc)}")

    return events


async def fetch_noaa_climate_baseline() -> dict:
    token = os.getenv("NOAA_TOKEN")
    if not token:
        raise ValueError("NOAA_TOKEN is not set")

    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    baselines: dict = {}

    async with httpx.AsyncClient(timeout=15.0) as client:
        for route_id, station in ROUTE_NOAA_STATIONS.items():
            try:
                response = await client.get(
                    "https://www.ncei.noaa.gov/cdo-web/api/v2/data",
                    headers={"token": token},
                    params={
                        "datasetid": "GHCND",
                        "datatypeid": "AWND,PRCP",
                        "stationid": station,
                        "startdate": week_ago,
                        "enddate": today,
                        "limit": 50,
                        "units": "metric",
                    },
                )
                response.raise_for_status()
                results = response.json().get("results", [])
                rainfall = [float(row["value"]) for row in results if row.get("datatype") == "PRCP"]
                wind = [float(row["value"]) for row in results if row.get("datatype") == "AWND"]
                avg_rainfall = round(sum(rainfall) / len(rainfall), 2) if rainfall else 0.0
                avg_wind = round(sum(wind) / len(wind), 2) if wind else 0.0

                baselines[route_id] = {
                    "avg_rainfall_mm": avg_rainfall,
                    "avg_wind_ms": avg_wind,
                    "climate_risk_factor": round(1.0 + min(avg_rainfall / 100, 0.15) + min(avg_wind / 80, 0.10), 3),
                    "station": station,
                    "source": "LIVE_NOAA",
                }
            except Exception as exc:
                print(f"[noaa] {route_id}: {describe_adapter_error(exc)}")

    return baselines


async def fetch_comtrade_volumes() -> dict[str, float]:
    api_key = os.getenv("UN_COMTRADE_KEY")
    if not api_key:
        raise ValueError("UN_COMTRADE_KEY is not set")

    volumes: dict[str, float] = {}
    async with httpx.AsyncClient(timeout=20.0) as client:
        for (reporter, partner), route_id in COMTRADE_ROUTE_MAP.items():
            try:
                await asyncio.sleep(1.25)
                response = await client.get(
                    "https://comtradeapi.un.org/public/v1/preview/C/A/HS",
                    headers={"Ocp-Apim-Subscription-Key": api_key},
                    params={
                        "reporterCode": reporter,
                        "partnerCode": partner,
                        "period": "2023",
                        "cmdCode": "TOTAL",
                        "flowCode": "X",
                        "maxRecords": 1,
                    },
                )

                if response.status_code == 429:
                    print("[comtrade] rate limited; using synthetic trade volumes for this run")
                    break

                response.raise_for_status()
                for item in response.json().get("data", []):
                    value = float(item.get("primaryValue", 0))
                    if value > 0:
                        volumes[route_id] = round(value / 1_000_000_000, 1)
            except Exception as exc:
                print(f"[comtrade] {reporter}->{partner}: {describe_adapter_error(exc)}")

    return volumes


async def get_live_weather_events() -> tuple[list[dict], str]:
    if os.getenv("OPENWEATHER_API_KEY"):
        events = await fetch_openweather_events()
        if events:
            return events, "LIVE_OWM"
    return [], "SYNTHETIC"


async def get_live_climate_baseline() -> tuple[dict, str]:
    if os.getenv("NOAA_TOKEN"):
        baseline = await fetch_noaa_climate_baseline()
        return baseline, "LIVE_NOAA"
    return {}, "SYNTHETIC"


async def get_live_trade_volumes() -> tuple[dict[str, float], str]:
    if os.getenv("UN_COMTRADE_KEY"):
        volumes = await fetch_comtrade_volumes()
        return volumes, "LIVE_COMTRADE" if volumes else "SYNTHETIC"
    return {}, "SYNTHETIC"
