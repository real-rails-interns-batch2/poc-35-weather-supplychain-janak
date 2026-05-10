# Visualization Audit Report (VAR)
## PoC #35 — Weather-to-Supply Chain Risk Model
**Auditor:** AI Senior UX Architect
**Tester:** Janak Gopalakrishnan
**Date:** 2026-05-10
**Rail Category:** Maritime / Logistics
**Data Sources:** OpenWeatherMap, NOAA CDO, UN Comtrade
**Status: ✅ FULL PASS**

---

## Section 1 — Requirement Match

| Check | Expected | Actual | Result |
|---|---|---|---|
| Visual archetype | Geo + Temporal (maritime routes on map, delay over time) | Leaflet flat map with polyline routes + ECharts 30-day delay timeseries | ✅ Pass |
| Relational layer | Weather event → route impact cascade | ImpactChain component shows trigger → impact → consequence nodes | ✅ Pass |
| Intelligence layer | Raw data transformed into insight | Risk score, delay multiplier, concentration risk, climate factor all derived | ✅ Pass |
| Scenario modelling | Optimistic / Current / Pessimistic shock factors | ScenarioBar applies 0.6×, 1.0×, 1.5× multipliers to all routes | ✅ Pass |
| Data mode control | AUTO / LIVE / SYNTHETIC switching | DataModeSwitch implemented, passed to all API calls and resolvers | ✅ Pass |
| Mock fallback | Synthetic data always available when APIs fail | `synthetic_weather_events()` and `MOCK_TRADE_ROUTES` always ready | ✅ Pass |

**Section 1 Verdict: ✅ PASS**

---

## Section 2 — DNA Check

| Check | Required | Actual | Result |
|---|---|---|---|
| Background color | `#030712` (Obsidian Black) mandatory | `bg-rr-base` = `#030712` applied to `<html>`, `<body>`, and main wrapper | ✅ Pass |
| Surface/card color | `#0B1117` | `bg-rr-surface` = `#0B1117` on all cards and sidebar | ✅ Pass |
| Accent primary | `#38BDF8` (Electric Cyan) | `rr-cyan` = `#38BDF8` used for active states, glows, borders | ✅ Pass |
| Accent secondary | `#818CF8` (Indigo) | `rr-indigo` = `#818CF8` defined and used in insight panel accents | ✅ Pass |
| Border color | `#1F2937` 1px | `border-rr-border` = `#1F2937` on all card and section borders | ✅ Pass |
| Typography | Inter or Geist Sans, tight spacing | Inter loaded via `<link>` preconnect in `layout.tsx` | ✅ Pass |
| Glassmorphism | Subtle on cards | `rr-glass` class: `backdrop-blur-xl`, translucent background | ✅ Pass |
| Cyan glow on active | 0.5px cyan glow on active elements | `rr-glow-sm`: `box-shadow: 0 0 0 0.5px rgba(56,189,248,0.65)` | ✅ Pass |
| 70/30 layout split | Main stage 70%, sidebar exactly 30% | `w-[30%]` sidebar with no min/max overrides, `flex-1` main stage | ✅ Pass |
| Sidebar Section A | High-level metrics | Metric cards showing event count, delay average, volume, sea paths | ✅ Pass |
| Sidebar Section B | Why This Matters | InsightPanels component populated from `/api/sidebar-content` | ✅ Pass |
| Sidebar Section C | Who Controls the Rail | Second insight panel with governance context | ✅ Pass |
| Sidebar Section D | Functional filters | ScenarioBar + DataModeSwitch + tab filters all functional | ✅ Pass |
| Sidebar Section E | Download Sample Data button | CSV download button in sidebar footer | ✅ Pass |

**Section 2 Verdict: ✅ PASS**

> Note: Sidebar previously had `min-w-[330px] max-w-[460px]` caps that violated the strict 30% requirement. These were removed during this review session. Fix confirmed applied.

---

## Section 3 — Data Mapping

| Data Source | Expected Representation | Actual | Result |
|---|---|---|---|
| OpenWeatherMap | Live weather events at maritime waypoints → severity, delay multiplier | `fetch_openweather_events()` queries 7 waypoints, maps weather ID + wind speed to SEVERE/MODERATE/LOW, feeds WeatherEventList and map markers | ✅ Pass |
| NOAA CDO | Climate baseline risk factor blended into route risk score | `fetch_noaa_climate_baseline()` pulls AWND + PRCP per route station, computes `climate_risk_factor`, blended in `build_risk_model()` | ✅ Pass |
| UN Comtrade | Annual trade volume (USD bn) per route | `fetch_comtrade_volumes()` enriches `annual_volume_bn` on each route, shown in RouteCard and used in cost impact calculation | ✅ Pass |
| Synthetic fallback | Clearly labelled, not presented as real | All synthetic data tagged with SYNTHETIC, HYBRID_OWM_SYNTHETIC etc. Source panel shows MOCK status with missing env var label | ✅ Pass |
| Sea routes | Real maritime paths, not straight lines | `/api/sea-routes` uses `searoute-py` with manual waypoint fallback; `splitAtDateLine()` handles Pacific antimeridian | ✅ Pass |
| Risk model output | Derived intelligence, not raw data | `build_risk_model()` computes `risk_score`, `risk_level`, `estimated_delay_days`, `combined_delay_multiplier`, `climate_risk_factor` | ✅ Pass |

**Section 3 Verdict: ✅ PASS**

---

## Bugs Fixed During This Audit Session

| # | Bug | File | Severity | Fix Applied |
|---|---|---|---|---|
| 1 | `get_live_climate_baseline` return type mismatch | `mappers.py` | 🔴 Runtime crash | Always return `tuple[dict, str]` |
| 2 | Offset-naive vs offset-aware datetime crash in delay timeseries | `main.py` | 🔴 500 error | `.replace("Z", "+00:00")` in `fromisoformat()` |
| 3 | R001 bounding box over-matching routes | `mappers.py` | 🟠 Logic error | Added explicit `antimeridian` flag |
| 4 | `resolve_climate_baseline` not unpacking tuple | `main.py` | 🔴 Runtime crash | Changed to `baseline, source = await ...` |
| 5 | `datetime.utcnow()` deprecated (Python 3.12+) | `main.py`, `mappers.py` | 🟡 Deprecation | Replaced with `datetime.now(timezone.utc)` |
| 6 | `route_analytics()` crashes on empty route list | `main.py` | 🟡 Edge case crash | Added early return guard |
| 7 | `selectedRoute` set to `""` instead of `null` on reset | `WorldMap.tsx`, `page.tsx` | 🟠 UI state bug | Changed to `null`, updated prop types |
| 8 | Leaflet CSS imported in SSR layout | `layout.tsx` | 🟡 SSR warning | Moved import to `WorldMap.tsx` |
| 9 | Google Fonts loaded via blocking `@import` | `globals.css` | 🟡 Performance | Replaced with `<link>` preconnect in `layout.tsx` |
| 10 | ECharts tooltip `params` typed incorrectly | `DelayChart.tsx` | 🟡 TypeScript error | Changed to `any[]` |
| 11 | Broken venv path on Windows | Environment | 🟠 Cannot install | Recreated venv inside project folder |

---

## Overall VAR Verdict

| Section | Result |
|---|---|
| 1 — Requirement Match | ✅ PASS |
| 2 — DNA Check | ✅ PASS |
| 3 — Data Mapping | ✅ PASS |
| Bugs Fixed | 11/11 ✅ |

**Final Status: ✅ FULL GREEN — Ready for Intelligence Library submission.**

**Auditor sign-off:** AI Senior UX Architect
**Date:** 2026-05-10
