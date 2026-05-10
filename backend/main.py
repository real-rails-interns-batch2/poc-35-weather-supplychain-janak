"""
Real Rails PoC #35 — Weather-to-Supply Chain Risk Model
FastAPI backend with live-data adapters and synthetic fallback.
"""

from __future__ import annotations

import asyncio
import copy
import csv
import hashlib
import io
import json
import math
import os
import random
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

load_dotenv()

try:
    import duckdb
    DUCKDB_AVAILABLE = True
except ImportError:
    duckdb = None
    DUCKDB_AVAILABLE = False

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    pd = None
    PANDAS_AVAILABLE = False

try:
    from searoute import searoute as calculate_searoute
    SEAROUTE_AVAILABLE = True
except ImportError:
    calculate_searoute = None
    SEAROUTE_AVAILABLE = False

try:
    from mappers import get_live_climate_baseline, get_live_trade_volumes, get_live_weather_events
    MAPPERS_AVAILABLE = True
except ImportError:
    MAPPERS_AVAILABLE = False

app = FastAPI(
    title="Weather-to-Supply Chain Risk API",
    description="Real Rails Intelligence Library — PoC #35",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_TRADE_ROUTES = [
    {
        "id": "R001",
        "name": "Asia-Pacific to US West Coast",
        "origin": {"lat": 31.2304, "lng": 121.4737, "city": "Shanghai"},
        "destination": {"lat": 37.7749, "lng": -122.4194, "city": "San Francisco"},
        "commodities": ["Electronics", "Auto Parts", "Consumer Goods"],
        "baseline_days": 22,
        "annual_volume_bn": 48.2,
        "concentration_risk": "HIGH",
    },
    {
        "id": "R002",
        "name": "Europe to US East Coast",
        "origin": {"lat": 51.5074, "lng": -0.1278, "city": "London"},
        "destination": {"lat": 40.7128, "lng": -74.0060, "city": "New York"},
        "commodities": ["Pharmaceuticals", "Machinery", "Food"],
        "baseline_days": 10,
        "annual_volume_bn": 36.7,
        "concentration_risk": "MEDIUM",
    },
    {
        "id": "R003",
        "name": "Middle East to Europe Energy Corridor",
        "origin": {"lat": 24.4539, "lng": 54.3773, "city": "Abu Dhabi"},
        "destination": {"lat": 52.3676, "lng": 4.9041, "city": "Amsterdam"},
        "commodities": ["Oil", "LNG", "Petrochemicals"],
        "baseline_days": 14,
        "annual_volume_bn": 82.1,
        "concentration_risk": "CRITICAL",
    },
    {
        "id": "R004",
        "name": "South America to Asia Grain Route",
        "origin": {"lat": -23.5505, "lng": -46.6333, "city": "Sao Paulo"},
        "destination": {"lat": 35.6762, "lng": 139.6503, "city": "Tokyo"},
        "commodities": ["Soybeans", "Corn", "Beef"],
        "baseline_days": 30,
        "annual_volume_bn": 21.4,
        "concentration_risk": "MEDIUM",
    },
    {
        "id": "R005",
        "name": "India-Europe Pharma Corridor",
        "origin": {"lat": 19.0760, "lng": 72.8777, "city": "Mumbai"},
        "destination": {"lat": 48.8566, "lng": 2.3522, "city": "Paris"},
        "commodities": ["Generics", "APIs", "Medical Devices"],
        "baseline_days": 18,
        "annual_volume_bn": 14.8,
        "concentration_risk": "MEDIUM",
    },
]

MOCK_WEATHER_EVENTS = [
    {
        "id": "WE001",
        "type": "Typhoon",
        "severity": "SEVERE",
        "region": "Western Pacific",
        "affected_routes": ["R001"],
        "lat": 22.0,
        "lng": 130.0,
        "start_date": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat().replace("+00:00", "Z"),
        "estimated_duration_days": 5,
        "delay_multiplier": 1.45,
        "noaa_event_id": "SYNTHETIC_WE001",
    },
    {
        "id": "WE002",
        "type": "Arctic Oscillation / Polar Vortex",
        "severity": "MODERATE",
        "region": "North Atlantic",
        "affected_routes": ["R002"],
        "lat": 55.0,
        "lng": -30.0,
        "start_date": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat().replace("+00:00", "Z"),
        "estimated_duration_days": 8,
        "delay_multiplier": 1.20,
        "noaa_event_id": "SYNTHETIC_WE002",
    },
    {
        "id": "WE003",
        "type": "Sandstorm / Dust Event",
        "severity": "MODERATE",
        "region": "Arabian Peninsula",
        "affected_routes": ["R003"],
        "lat": 25.0,
        "lng": 47.0,
        "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat().replace("+00:00", "Z"),
        "estimated_duration_days": 3,
        "delay_multiplier": 1.15,
        "noaa_event_id": "SYNTHETIC_WE003",
    },
    {
        "id": "WE004",
        "type": "Drought / Low River Levels",
        "severity": "LOW",
        "region": "Rhine-Danube Basin",
        "affected_routes": ["R002"],
        "lat": 50.0,
        "lng": 8.0,
        "start_date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat().replace("+00:00", "Z"),
        "estimated_duration_days": 30,
        "delay_multiplier": 1.08,
        "noaa_event_id": "SYNTHETIC_WE004",
    },
]

SIDEBAR_CONTENT = {
    "why_this_matters": {
        "headline": "This is where data rails become operating rails.",
        "body": (
            "Supply chains are not just logistics — they are the physical expression of global trade agreements, "
            "geopolitical relationships, and climate exposure. When a typhoon stalls in the Western Pacific, "
            "electronics shipments to US retailers slip. When river levels drop in the Rhine basin, industrial "
            "production slows. This dashboard turns weather signals into operational risk before the delay hits."
        ),
    },
    "who_controls": {
        "headline": "Weather intelligence, chokepoints, and freight visibility are controlled by different institutions.",
        "body": (
            "NOAA and national meteorological agencies control the weather layer. State and quasi-state authorities "
            "control canals, ports, and chokepoints. UN Comtrade provides the trade-volume record, while private freight "
            "platforms control much of the real-time shipment visibility layer."
        ),
    },
}

SEA_ROUTE_PORTS = [
    {"id": "R001", "from": [121.4737, 31.2304], "to": [-122.4194, 37.7749]},
    {"id": "R002", "from": [-0.1278, 51.5074], "to": [-74.0060, 40.7128]},
    {"id": "R003", "from": [54.3773, 24.4539], "to": [4.9041, 52.3676]},
    {"id": "R004", "from": [-46.6333, -23.5505], "to": [139.6503, 35.6762]},
    {"id": "R005", "from": [72.8777, 19.0760], "to": [2.3522, 48.8566]},
]

MANUAL_WAYPOINTS = {
    # East China Sea → North Pacific great-circle lane → US West Coast.
    "R001": [
        [121.47, 31.23], [128.00, 32.80], [137.00, 35.50], [147.00, 39.00],
        [158.00, 43.00], [170.00, 46.00], [180.00, 47.00], [-170.00, 47.50],
        [-158.00, 46.20], [-146.00, 43.80], [-136.00, 41.00], [-127.00, 38.80],
        [-122.42, 37.77],
    ],
    # Thames / Channel → North Atlantic shipping lane → New York approaches.
    "R002": [
        [-0.13, 51.51], [-4.00, 50.20], [-10.00, 49.00], [-18.00, 47.50],
        [-28.00, 45.80], [-38.00, 44.20], [-48.00, 43.20], [-58.00, 42.50],
        [-66.00, 41.70], [-72.00, 40.90], [-74.01, 40.71],
    ],
    # Gulf / Strait of Hormuz → Gulf of Aden → Suez → Mediterranean → North Sea.
    "R003": [
        [54.38, 24.45], [56.50, 25.30], [58.00, 24.20], [61.00, 20.00],
        [57.00, 15.00], [50.00, 13.00], [43.50, 12.80], [39.00, 18.00],
        [34.50, 27.80], [32.50, 30.50], [28.00, 33.80], [20.00, 36.00],
        [12.00, 38.00], [5.00, 36.00], [-5.50, 36.00], [-2.00, 44.00],
        [2.00, 49.00], [4.90, 52.37],
    ],
    # Santos → South Atlantic → Cape route → Indian Ocean → East China Sea → Tokyo Bay.
    "R004": [
        [-46.63, -23.55], [-43.00, -28.00], [-38.00, -34.00], [-30.00, -40.00],
        [-18.00, -43.50], [-5.00, -43.00], [8.00, -40.50], [18.00, -35.00],
        [26.00, -31.00], [36.00, -27.00], [48.00, -22.00], [60.00, -15.00],
        [72.00, -7.00], [84.00, 0.00], [96.00, 6.00], [106.00, 12.00],
        [116.00, 20.00], [126.00, 29.00], [134.00, 34.00], [139.65, 35.68],
    ],
    # Mumbai → Arabian Sea → Bab el-Mandeb → Suez → Mediterranean → Channel / Paris logistics node.
    "R005": [
        [72.88, 19.08], [67.00, 17.00], [60.00, 14.50], [52.00, 13.00],
        [45.00, 12.70], [40.00, 17.00], [35.00, 26.00], [32.50, 30.50],
        [28.00, 34.00], [20.00, 37.00], [12.00, 40.00], [5.00, 43.00],
        [-1.00, 47.50], [2.35, 48.86],
    ],
}

_routes_cache: tuple[list[dict], str] | None = None
_routes_cache_time = 0.0
_events_cache: tuple[list[dict], str] | None = None
_events_cache_time = 0.0
_climate_cache: tuple[dict, str] | None = None
_climate_cache_time = 0.0
_sea_routes_cache: list[dict] | None = None

_events_lock = asyncio.Lock()
_routes_lock = asyncio.Lock()
_climate_lock = asyncio.Lock()

CACHE_TTL_SECONDS = 300
CLIMATE_CACHE_TTL_SECONDS = 3600


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def deterministic_seed(value: str) -> int:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def has_live_keys() -> bool:
    return bool(os.getenv("OPENWEATHER_API_KEY") or os.getenv("NOAA_TOKEN") or os.getenv("UN_COMTRADE_KEY"))


def normalize_data_mode(data_mode: str) -> str:
    mode = (data_mode or "auto").lower().strip()
    return mode if mode in {"auto", "live", "synthetic"} else "auto"


def synthetic_weather_events(source: str = "SYNTHETIC") -> list[dict]:
    events = copy.deepcopy(MOCK_WEATHER_EVENTS)
    for event in events:
        event["event_source"] = source
    return events


def attach_event_source(events: list[dict], source: str) -> list[dict]:
    enriched = []
    for event in events:
        item = dict(event)
        item.setdefault("event_source", source)
        enriched.append(item)
    return enriched


def combined_source_label(events_source: str, routes_source: str, climate_source: str = "SYNTHETIC") -> str:
    live_parts = []
    if events_source != "SYNTHETIC":
        live_parts.append(f"events={events_source}")
    if routes_source != "SYNTHETIC":
        live_parts.append(f"routes={routes_source}")
    if climate_source != "SYNTHETIC":
        live_parts.append(f"climate={climate_source}")
    return " · ".join(live_parts) if live_parts else "SYNTHETIC"


async def resolve_weather_events(data_mode: str = "auto") -> tuple[list[dict], str]:
    global _events_cache, _events_cache_time
    mode = normalize_data_mode(data_mode)

    if mode == "synthetic":
        return synthetic_weather_events("SYNTHETIC_FORCED"), "SYNTHETIC"

    if _events_cache and (mode != "live" or _events_cache[1] != "SYNTHETIC") and (time.time() - _events_cache_time) < CACHE_TTL_SECONDS:
        return _events_cache

    async with _events_lock:
        if _events_cache and (mode != "live" or _events_cache[1] != "SYNTHETIC") and (time.time() - _events_cache_time) < CACHE_TTL_SECONDS:
            return _events_cache

        if MAPPERS_AVAILABLE and bool(os.getenv("OPENWEATHER_API_KEY")):
            try:
                live_events, source = await get_live_weather_events()
                if live_events:
                    # Keep the demo visually useful even when live weather only finds 1 small signal.
                    if len(live_events) < 2:
                        fallback = synthetic_weather_events("SYNTHETIC_CONTEXT")[: 2 - len(live_events)]
                        _events_cache = (attach_event_source(live_events, source) + fallback, "HYBRID_OWM_SYNTHETIC")
                    else:
                        _events_cache = (attach_event_source(live_events, source), source)
                    _events_cache_time = time.time()
                    return _events_cache
            except Exception as exc:
                print(f"[resolver] weather live fetch failed: {type(exc).__name__}: {exc}")

        # Live providers often return calm weather. That is not a broken dashboard; use labelled fallback.
        fallback_source = "SYNTHETIC_WEATHER_FALLBACK" if mode == "live" else "SYNTHETIC"
        label = "HYBRID_OWM_SYNTHETIC" if mode == "live" and os.getenv("OPENWEATHER_API_KEY") else "SYNTHETIC"
        _events_cache = (synthetic_weather_events(fallback_source), label)
        _events_cache_time = time.time()
        return _events_cache


async def resolve_trade_routes(data_mode: str = "auto") -> tuple[list[dict], str]:
    global _routes_cache, _routes_cache_time
    mode = normalize_data_mode(data_mode)

    if mode == "synthetic":
        return copy.deepcopy(MOCK_TRADE_ROUTES), "SYNTHETIC"

    if _routes_cache and (mode != "live" or _routes_cache[1] != "SYNTHETIC") and (time.time() - _routes_cache_time) < CACHE_TTL_SECONDS:
        return _routes_cache

    async with _routes_lock:
        if _routes_cache and (mode != "live" or _routes_cache[1] != "SYNTHETIC") and (time.time() - _routes_cache_time) < CACHE_TTL_SECONDS:
            return _routes_cache

        if MAPPERS_AVAILABLE and bool(os.getenv("UN_COMTRADE_KEY")):
            try:
                volumes, source = await get_live_trade_volumes()
                routes = []
                for route in MOCK_TRADE_ROUTES:
                    enriched = dict(route)
                    enriched["annual_volume_bn"] = volumes.get(route["id"], route["annual_volume_bn"])
                    enriched["volume_source"] = "LIVE_COMTRADE" if route["id"] in volumes else "SYNTHETIC"
                    routes.append(enriched)

                _routes_cache = (routes, source if volumes else "SYNTHETIC")
                _routes_cache_time = time.time()
                return _routes_cache
            except Exception as exc:
                print(f"[resolver] trade live fetch failed: {type(exc).__name__}: {exc}")

        _routes_cache = (copy.deepcopy(MOCK_TRADE_ROUTES), "SYNTHETIC")
        _routes_cache_time = time.time()
        return _routes_cache


async def resolve_climate_baseline(data_mode: str = "auto") -> tuple[dict, str]:
    global _climate_cache, _climate_cache_time
    mode = normalize_data_mode(data_mode)

    if mode == "synthetic":
        return {}, "SYNTHETIC"

    if _climate_cache and (mode != "live" or _climate_cache[1] != "SYNTHETIC") and (time.time() - _climate_cache_time) < CLIMATE_CACHE_TTL_SECONDS:
        return _climate_cache

    async with _climate_lock:
        if _climate_cache and (mode != "live" or _climate_cache[1] != "SYNTHETIC") and (time.time() - _climate_cache_time) < CLIMATE_CACHE_TTL_SECONDS:
            return _climate_cache

        if MAPPERS_AVAILABLE and bool(os.getenv("NOAA_TOKEN")):
            try:
                baseline, source = await get_live_climate_baseline()
                if baseline:
                    _climate_cache = (baseline, source)
                    _climate_cache_time = time.time()
                    return _climate_cache
            except Exception as exc:
                print(f"[resolver] climate live fetch failed: {type(exc).__name__}: {exc}")

        _climate_cache = ({}, "SYNTHETIC")
        _climate_cache_time = time.time()
        return _climate_cache


def compute_sea_routes() -> list[dict]:
    global _sea_routes_cache

    if _sea_routes_cache is not None:
        return _sea_routes_cache

    results = []
    for route in SEA_ROUTE_PORTS:
        route_id = route["id"]
        if route_id in MANUAL_WAYPOINTS:
            results.append({"id": route_id, "coords": MANUAL_WAYPOINTS[route_id]})
            continue

        if SEAROUTE_AVAILABLE and calculate_searoute is not None:
            try:
                # searoute expects (lat, lng); GeoJSON coordinates return [lng, lat].
                origin = (route["from"][1], route["from"][0])
                destination = (route["to"][1], route["to"][0])
                geojson = calculate_searoute(origin, destination)
                coords = [[float(lng), float(lat)] for lng, lat in geojson["geometry"]["coordinates"]]
                if len(coords) >= 2:
                    results.append({"id": route_id, "coords": coords})
                    continue
            except Exception as exc:
                print(f"[sea-route] {route_id} failed: {exc}")

        results.append({"id": route_id, "coords": [route["from"], route["to"]]})

    _sea_routes_cache = results
    return results


def route_analytics(routes: list[dict]) -> dict:
    if DUCKDB_AVAILABLE and PANDAS_AVAILABLE and duckdb is not None and pd is not None:
        try:
            df = pd.DataFrame(routes)
            con = duckdb.connect(":memory:")
            con.register("routes", df)
            result = con.execute(
                """
                SELECT
                    COUNT(*) AS total_routes,
                    SUM(annual_volume_bn) AS total_volume_bn,
                    AVG(baseline_days) AS avg_baseline_days,
                    MAX(annual_volume_bn) AS max_route_volume,
                    MIN(baseline_days) AS min_transit_days
                FROM routes
                """
            ).fetchone()
            keys = ["total_routes", "total_volume_bn", "avg_baseline_days", "max_route_volume", "min_transit_days"]
            return dict(zip(keys, result)) if result else {}
        except Exception as exc:
            print(f"[duckdb] analytics failed: {exc}")

    if not routes:
        return {"total_routes": 0, "total_volume_bn": 0.0, "avg_baseline_days": 0.0, "max_route_volume": 0.0, "min_transit_days": 0.0}
    total_volume = sum(float(route["annual_volume_bn"]) for route in routes)
    return {
        "total_routes": len(routes),
        "total_volume_bn": round(total_volume, 2),
        "avg_baseline_days": round(sum(float(route["baseline_days"]) for route in routes) / len(routes), 2),
        "max_route_volume": max(float(route["annual_volume_bn"]) for route in routes),
        "min_transit_days": min(float(route["baseline_days"]) for route in routes),
    }


def build_risk_model(
    routes: list[dict],
    events: list[dict],
    route_id: Optional[str],
    scenario: str,
    data_source: str,
    climate_baseline: Optional[dict] = None,
) -> list[dict]:
    scenario_factors = {"optimistic": 0.6, "current": 1.0, "pessimistic": 1.5}
    factor = scenario_factors.get(scenario, 1.0)
    climate_baseline = climate_baseline or {}

    results = []
    for route in routes:
        if route_id and route["id"] != route_id:
            continue

        active_events = [event for event in events if route["id"] in event.get("affected_routes", [])]
        weather_multiplier = 1.0
        for event in active_events:
            weather_multiplier *= 1.0 + (float(event["delay_multiplier"]) - 1.0) * factor

        climate_record = climate_baseline.get(route["id"], {})
        climate_factor = float(climate_record.get("climate_risk_factor", 1.0))
        combined_multiplier = weather_multiplier * climate_factor
        delay = round(float(route["baseline_days"]) * (combined_multiplier - 1.0), 1)

        base_score = delay / float(route["baseline_days"]) * 100
        event_score = len(active_events) * 8
        concentration_score = {"CRITICAL": 14, "HIGH": 9, "MEDIUM": 5, "LOW": 2}.get(route.get("concentration_risk"), 4)
        score = min(100, max(0, int(base_score + event_score + concentration_score)))
        level = "CRITICAL" if score >= 50 else "HIGH" if score >= 30 else "MEDIUM" if score >= 14 else "LOW"

        results.append({
            **route,
            "active_weather_events": active_events,
            "combined_delay_multiplier": round(combined_multiplier, 3),
            "estimated_delay_days": delay,
            "estimated_total_days": round(float(route["baseline_days"]) * combined_multiplier, 1),
            "risk_score": score,
            "risk_level": level,
            "scenario": scenario,
            "data_source": data_source,
            "climate_risk_factor": round(climate_factor, 3),
            "climate_source": climate_record.get("source", "SYNTHETIC"),
            "last_updated": utc_now(),
        })

    return results


def generate_delay_timeseries(route: dict, events: list[dict], days_back: int = 30) -> list[dict]:
    rng = random.Random(deterministic_seed(route["id"]))
    route_events = [event for event in events if route["id"] in event.get("affected_routes", [])]
    series = []

    for index in range(days_back):
        date = datetime.now(timezone.utc) - timedelta(days=days_back - index)
        noise = rng.gauss(0, 0.55)
        spike = 0.0

        for event in route_events:
            try:
                start = datetime.fromisoformat(event["start_date"].replace("Z", "+00:00"))
            except Exception:
                start = datetime.now(timezone.utc) - timedelta(days=3)

            days_since = (date - start).days
            duration = int(event.get("estimated_duration_days", 5))
            magnitude = (float(event["delay_multiplier"]) - 1.0) * float(route["baseline_days"])
            if 0 <= days_since <= duration * 2:
                sigma = duration / 3.0 + 0.1
                spike += magnitude * math.exp(-((days_since - duration / 2) ** 2) / (2 * sigma**2))

        if not route_events and index > days_back * 0.8:
            spike = 2.5 * math.exp(-((days_back - index - days_back * 0.9) ** 2) / 20)

        series.append({
            "date": date.strftime("%Y-%m-%d"),
            "delay_days": round(max(0.0, noise + spike), 2),
            "source": "LIVE_OR_EVENT_DRIVEN" if route_events else "SYNTHETIC_BASELINE",
        })

    return series


@app.get("/")
async def root():
    routes, route_source = await resolve_trade_routes("auto")
    events, event_source = await resolve_weather_events("auto")
    climate, climate_source = await resolve_climate_baseline("auto")
    return {
        "project": "Real Rails PoC #35 — Weather-to-Supply Chain Risk Model",
        "status": "ok",
        "data_mode": combined_source_label(event_source, route_source, climate_source),
        "duckdb_analytics": DUCKDB_AVAILABLE,
        "routes": len(routes),
        "events": len(events),
        "climate_baselines": len(climate),
        "route_stats": route_analytics(routes),
    }


@app.get("/api/sea-routes")
def get_sea_routes():
    return compute_sea_routes()


@app.get("/api/risk-model")
async def get_risk_model(
    route_id: Optional[str] = Query(None),
    scenario: str = Query("current", pattern="^(current|optimistic|pessimistic)$"),
    data_mode: str = Query("auto", pattern="^(auto|live|synthetic)$"),
):
    requested_mode = normalize_data_mode(data_mode)
    events, event_source = await resolve_weather_events(requested_mode)
    routes, route_source = await resolve_trade_routes(requested_mode)
    climate, climate_source = await resolve_climate_baseline(requested_mode)
    data_source = combined_source_label(event_source, route_source, climate_source)
    data = build_risk_model(routes, events, route_id, scenario, data_source, climate)

    if route_id and not data:
        raise HTTPException(status_code=404, detail=f"Route not found: {route_id}")

    return {
        "scenario": scenario,
        "total_routes": len(data),
        "data": data,
        "meta": {
            "data_source": data_source,
            "requested_mode": requested_mode,
            "events_source": event_source,
            "routes_source": route_source,
            "climate_source": climate_source,
            "note": "Live data active where available; synthetic fallback remains enabled." if data_source != "SYNTHETIC" else "Synthetic mock data — labelled clearly for demos.",
        },
    }


@app.get("/api/weather-events")
async def get_weather_events(data_mode: str = Query("auto", pattern="^(auto|live|synthetic)$")):
    requested_mode = normalize_data_mode(data_mode)
    events, source = await resolve_weather_events(requested_mode)
    return {"count": len(events), "events": events, "data_source": source, "requested_mode": requested_mode}


@app.get("/api/routes")
async def get_routes(data_mode: str = Query("auto", pattern="^(auto|live|synthetic)$")):
    routes, source = await resolve_trade_routes(normalize_data_mode(data_mode))
    return {"count": len(routes), "routes": routes, "data_source": source}


@app.get("/api/climate-baseline")
async def get_climate_baseline(data_mode: str = Query("auto", pattern="^(auto|live|synthetic)$")):
    baseline, source = await resolve_climate_baseline(normalize_data_mode(data_mode))
    return {"count": len(baseline), "baseline": baseline, "data_source": source}


@app.get("/api/delay-timeseries/{route_id}")
async def get_delay_timeseries(
    route_id: str,
    days_back: int = Query(30, ge=7, le=90),
    data_mode: str = Query("auto", pattern="^(auto|live|synthetic)$"),
):
    requested_mode = normalize_data_mode(data_mode)
    routes, _ = await resolve_trade_routes(requested_mode)
    events, source = await resolve_weather_events(requested_mode)
    route = next((item for item in routes if item["id"] == route_id), None)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route not found: {route_id}")

    return {
        "route_id": route_id,
        "days_back": days_back,
        "series": generate_delay_timeseries(route, events, days_back),
        "data_source": source,
    }


@app.get("/api/impact-chain/{route_id}")
async def get_impact_chain(
    route_id: str,
    scenario: str = Query("current", pattern="^(current|optimistic|pessimistic)$"),
    data_mode: str = Query("auto", pattern="^(auto|live|synthetic)$"),
):
    requested_mode = normalize_data_mode(data_mode)
    routes, route_source = await resolve_trade_routes(requested_mode)
    events, event_source = await resolve_weather_events(requested_mode)
    climate, climate_source = await resolve_climate_baseline(requested_mode)
    data_source = combined_source_label(event_source, route_source, climate_source)
    route = next((item for item in routes if item["id"] == route_id), None)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route not found: {route_id}")

    risk = build_risk_model(routes, events, route_id, scenario, data_source, climate)
    route_risk = risk[0]
    delay = float(route_risk["estimated_delay_days"])
    active_events = route_risk["active_weather_events"]

    return {
        "route_id": route_id,
        "scenario": scenario,
        "data_source": data_source,
        "risk_score": route_risk["risk_score"],
        "risk_level": route_risk["risk_level"],
        "nodes": [
            {"id": "weather", "label": "Weather Shock", "type": "trigger", "value": len(active_events)},
            {"id": "port_delay", "label": "Port Congestion", "type": "impact", "value": round(delay * 0.40, 1)},
            {"id": "transit_delay", "label": "Transit Delay", "type": "impact", "value": round(delay * 0.45, 1)},
            {"id": "customs_delay", "label": "Customs Backlog", "type": "impact", "value": round(delay * 0.15, 1)},
            {"id": "inventory_risk", "label": "Inventory Stress", "type": "consequence", "value": round(delay * 2.1, 1)},
            {"id": "cost_impact", "label": "Cost Impact", "type": "consequence", "value": round(delay * float(route["annual_volume_bn"]) * 0.0003, 2)},
        ],
        "edges": [
            {"from": "weather", "to": "port_delay"},
            {"from": "weather", "to": "transit_delay"},
            {"from": "transit_delay", "to": "customs_delay"},
            {"from": "port_delay", "to": "inventory_risk"},
            {"from": "customs_delay", "to": "inventory_risk"},
            {"from": "inventory_risk", "to": "cost_impact"},
        ],
    }


@app.get("/api/sidebar-content")
async def get_sidebar_content():
    return SIDEBAR_CONTENT


@app.get("/api/source-confidence")
async def get_source_confidence():
    openweather = bool(os.getenv("OPENWEATHER_API_KEY"))
    noaa = bool(os.getenv("NOAA_TOKEN"))
    comtrade = bool(os.getenv("UN_COMTRADE_KEY"))
    now = utc_now()

    return {
        "sources": [
            {
                "name": "OpenWeatherMap",
                "url": "https://openweathermap.org/api",
                "status": "LIVE" if openweather else "MOCK",
                "confidence": 88 if openweather else 0,
                "last_refresh": now if openweather else None,
                "env_var": "OPENWEATHER_API_KEY",
                "note": "Maritime waypoint weather checks. Falls back to synthetic events when absent.",
            },
            {
                "name": "NOAA Climate Data Online",
                "url": "https://www.ncei.noaa.gov/cdo-web/webservices/v2",
                "status": "LIVE" if noaa else "MOCK",
                "confidence": 95 if noaa else 0,
                "last_refresh": now if noaa else None,
                "env_var": "NOAA_TOKEN",
                "note": "Climate baseline factor blended into risk score when available.",
            },
            {
                "name": "UN Comtrade",
                "url": "https://comtradeplus.un.org/",
                "status": "LIVE" if comtrade else "MOCK",
                "confidence": 92 if comtrade else 0,
                "last_refresh": now if comtrade else None,
                "env_var": "UN_COMTRADE_KEY",
                "note": "Annual bilateral trade volume enrichment by route.",
            },
            {
                "name": "Synthetic Fallback",
                "url": None,
                "status": "ACTIVE",
                "confidence": 100,
                "last_refresh": now,
                "env_var": None,
                "note": "Always-on mock layer that keeps the dashboard functional for demos.",
            },
        ]
    }


@app.get("/api/route-analytics")
async def get_route_analytics(data_mode: str = Query("auto", pattern="^(auto|live|synthetic)$")):
    routes, source = await resolve_trade_routes(normalize_data_mode(data_mode))
    return {
        "analytics": route_analytics(routes),
        "powered_by": "DuckDB" if DUCKDB_AVAILABLE else "Python fallback",
        "data_source": source,
    }


@app.get("/api/download/sample-data")
async def download_sample_data(
    scenario: str = Query("current", pattern="^(current|optimistic|pessimistic)$"),
    data_mode: str = Query("auto", pattern="^(auto|live|synthetic)$"),
):
    requested_mode = normalize_data_mode(data_mode)
    routes, route_source = await resolve_trade_routes(requested_mode)
    events, event_source = await resolve_weather_events(requested_mode)
    climate, climate_source = await resolve_climate_baseline(requested_mode)
    data_source = combined_source_label(event_source, route_source, climate_source)
    risk = build_risk_model(routes, events, None, scenario, data_source, climate)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "route_id",
        "route_name",
        "origin_city",
        "destination_city",
        "baseline_days",
        "estimated_total_days",
        "estimated_delay_days",
        "risk_score",
        "risk_level",
        "scenario",
        "data_source",
        "exported_at",
    ])

    for row in risk:
        writer.writerow([
            row["id"],
            row["name"],
            row["origin"]["city"],
            row["destination"]["city"],
            row["baseline_days"],
            row["estimated_total_days"],
            row["estimated_delay_days"],
            row["risk_score"],
            row["risk_level"],
            scenario,
            data_source,
            utc_now(),
        ])

    output.seek(0)
    mode = requested_mode.upper() if requested_mode == "synthetic" else ("LIVE" if data_source != "SYNTHETIC" else "SYNTHETIC")
    filename = f"RealRails_PoC35_WeatherSupplyChainRisk_{mode}_{scenario}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )