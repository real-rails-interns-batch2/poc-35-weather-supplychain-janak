# Real Rails PoC #35 — Weather-to-Supply Chain Risk Model

> **This is where data rails become operating rails.**

A professional Real Rails demo showing how weather events propagate into maritime route delays, inventory stress, and logistics cost impact.

This version uses a cleaner dashboard UI, a stable flat Leaflet map, manual data-mode control, route-click zoom, and safe synthetic fallback for demos.

---

## What changed in this version

- Replaced the buggy Deck.gl map with a simpler **flat Leaflet map**.
- Route click now zooms into the selected trade lane.
- Routes are less congested when zoomed out because unrelated lanes dim during focus mode.
- Added `AUTO / LIVE / SYNTHETIC` data mode switching.
- Improved empty-state detail panels so the dashboard does not look dead when no route is selected.
- Added cleaner map tooltips, popups, legend, focus toggle, and reset button.
- Moved Leaflet CSS import from `layout.tsx` into `WorldMap.tsx` (SSR-safe).
- Google Fonts now loads via `<link>` preconnect in `layout.tsx` instead of blocking `@import` in CSS.
- Kept backend data logic the same except for safer fallback behavior added in this review session.
- Added `CODE_WALKTHROUGH.md` for teaching/explanation instead of flooding source files with messy comments.

---
ID & Project Title:   PoC #35 — Weather-to-Supply Chain Risk Model
Rail Category:        Maritime / Logistics
Primary Data Sources: OpenWeatherMap, NOAA CDO, UN Comtrade
Required Libraries:   fastapi, httpx, pandas, duckdb, searoute-py, next, leaflet, echarts
Mock Data Required:   Yes — synthetic fallback always on

## Project structure

```
real-rails-poc35-goated/
├── backend/
│   ├── main.py              # FastAPI app, risk model, routes, fallback data
│   ├── mappers.py           # OpenWeather, NOAA, UN Comtrade adapters
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Safe API-key template only
│
├── frontend/
│   ├── src/app/page.tsx     # Main dashboard layout
│   ├── src/app/layout.tsx   # App metadata + global CSS imports
│   ├── src/app/globals.css  # Real Rails theme + Leaflet styling
│   ├── src/components/      # UI components
│   ├── src/lib/api.ts       # Frontend API client
│   ├── src/lib/utils.ts     # Colors and formatting helpers
│   └── src/types/index.ts   # TypeScript data contracts
│
├── CODE_WALKTHROUGH.md      # Teaching guide / code explanation
└── README.md                # This file
```

---

## Quick start

### 1. Run backend

> **Important:** Always create the venv inside the project folder. Do not reuse a venv from another project — Python paths will break.

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn main:app --reload --port 8000
```

For Mac/Linux:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn main:app --reload --port 8000
```

Backend opens at `http://localhost:8000`  
API docs at `http://localhost:8000/docs`

### 2. Run frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

For Mac/Linux:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend opens at `http://localhost:3000`

---

## Data mode switch

| Mode | Meaning | Best use |
|---|---|---|
| `AUTO` | Try live APIs, then fall back safely | Normal testing |
| `LIVE` | Try OpenWeather / NOAA / Comtrade first | API-key testing |
| `SYNTHETIC` | Force stable mock demo data | Presentations/classes |

Use **SYNTHETIC** for a clean demo. Live weather APIs often return calm weather at maritime waypoints, which can make the dashboard look empty even when the app is working correctly.

---

## Main endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/risk-model` | Returns route risk scores, delay estimates, and active weather events |
| `GET /api/weather-events` | Returns active or synthetic weather shocks |
| `GET /api/sea-routes` | Returns maritime route coordinates for the map |
| `GET /api/delay-timeseries/{route_id}` | Returns 30-day route delay history |
| `GET /api/impact-chain/{route_id}` | Returns weather → delay → inventory/cost cascade |
| `GET /api/sidebar-content` | Returns Real Rails insight copy |
| `GET /api/source-confidence` | Returns source status and confidence labels |
| `GET /api/download/sample-data` | Downloads demo CSV |

Most endpoints accept optional query params:

```
data_mode=auto | live | synthetic
scenario=current | optimistic | pessimistic
```

Example:

```
http://localhost:8000/api/risk-model?scenario=current&data_mode=synthetic
```

---

## API keys

All keys are optional. The app works fully without them using synthetic fallback.

Create `backend/.env` from `.env.example`:

```env
OPENWEATHER_API_KEY=
NOAA_TOKEN=
UN_COMTRADE_KEY=
```

Never upload your real `.env` file.

---

## UI behavior

- Click a route card or map route line to focus it.
- The map zooms into that corridor.
- Focus mode dims unrelated routes.
- Use the map **Reset** button to return to the full world view.
- The bottom panel shows delay history and impact cascade only after a route is selected.

---

## Bugs fixed in this session

This section documents every bug found and fixed during the code review session, including how each one manifested and what the fix was.

---

### Bug 1 — `get_live_climate_baseline` return type mismatch

**File:** `backend/mappers.py`  
**Severity:** 🔴 Runtime crash with live NOAA data

**What happened:**  
The function was typed to return either `tuple[dict, str]` (with live data) or a bare `{}` dict (without). The caller in `main.py` always unpacked it as a tuple with `baseline, source = ...`. When NOAA_TOKEN was set and data came back, Python tried to unpack a dict as a two-value tuple and crashed.

**Fix:**  
Changed `get_live_climate_baseline` to always return `tuple[dict, str]`, returning `({}, "SYNTHETIC")` when no token is set.

---

### Bug 2 — Offset-naive vs offset-aware datetime crash in delay timeseries

**File:** `backend/main.py`  
**Severity:** 🔴 500 error on every `/api/delay-timeseries/{route_id}` call

**What happened:**  
After fixing `datetime.utcnow()` to `datetime.now(timezone.utc)` (timezone-aware), the `generate_delay_timeseries` function still parsed `event["start_date"]` by stripping the `Z` suffix and calling `fromisoformat()`, producing a naive datetime. Subtracting an aware datetime from a naive one raises:

```
TypeError: can't subtract offset-naive and offset-aware datetimes
```

This was the root cause of the delay chart failing to load. In the browser it showed as a 500 error, with CORS errors appearing on subsequent routes because the server crashed before sending headers.

**Fix:**  
Changed `.replace("Z", "")` to `.replace("Z", "+00:00")` so `fromisoformat()` parses a timezone-aware datetime.

---

### Bug 3 — R001 bounding box over-matching routes

**File:** `backend/mappers.py`  
**Severity:** 🟠 Silent logic error — most weather events assigned to R001

**What happened:**  
The R001 corridor (`Asia-Pacific to US West Coast`) uses `lng_min: 100, lng_max: -110` to span the Pacific antimeridian. The `get_affected_routes` function inferred antimeridian crossing from `lng_min > lng_max`, then used `lng >= 100 OR lng <= -110` to match. This matched almost every longitude on earth (anything east of Japan or west of California), so nearly every weather event was incorrectly tagged to R001.

**Fix:**  
Added an explicit `"antimeridian": True` flag to R001 in `ROUTE_CORRIDORS` and updated `get_affected_routes` to read the flag directly instead of inferring it.

---

### Bug 4 — `resolve_climate_baseline` not unpacking tuple

**File:** `backend/main.py`  
**Severity:** 🔴 Runtime crash (paired with Bug 1)

**What happened:**  
After Bug 1 was fixed and `get_live_climate_baseline` correctly returned a tuple, `resolve_climate_baseline` still called it as `baseline = await get_live_climate_baseline()` and assigned the whole tuple to `baseline`. This tuple was then passed to `build_risk_model` which expected a dict, causing a key lookup failure.

**Fix:**  
Changed to `baseline, source = await get_live_climate_baseline()` to properly unpack both values.

---

### Bug 5 — `datetime.utcnow()` deprecated (Python 3.12+)

**Files:** `backend/main.py`, `backend/mappers.py`  
**Severity:** 🟡 Deprecation warning, future breakage

**What happened:**  
`datetime.utcnow()` returns a naive datetime and is deprecated in Python 3.12. The project uses Python 3.14 (visible in the traceback paths), so this would eventually raise a warning or error.

**Fix:**  
Replaced all `datetime.utcnow()` calls with `datetime.now(timezone.utc)` and updated ISO string formatting from `isoformat() + "Z"` to `isoformat().replace("+00:00", "Z")`. Added `timezone` to all `from datetime import ...` lines.

---

### Bug 6 — `route_analytics()` crashes on empty route list

**File:** `backend/main.py`  
**Severity:** 🟡 Crash on edge case

**What happened:**  
The Python fallback path in `route_analytics()` called `sum(...) / len(routes)`, `max(...)`, and `min(...)` directly on the routes list. If routes was ever empty (e.g. all live fetches failed), this would raise `ZeroDivisionError` and `ValueError`.

**Fix:**  
Added an early return guard: if `not routes`, return zeroed-out analytics immediately.

---

### Bug 7 — `selectedRoute` set to `""` instead of `null` on map reset

**File:** `frontend/src/components/WorldMap.tsx`  
**Severity:** 🟠 UI state inconsistency

**What happened:**  
The map Reset button called `onSelectRoute("")`. Since `selectedRoute` is typed as `string | null`, passing `""` meant comparisons like `selectedRoute === route.id` would never match null correctly, and `selected` in `page.tsx` would be `undefined` (not `null`) when no route was active — a subtle but real type mismatch.

**Fix:**  
Changed `onSelectRoute("")` to `onSelectRoute(null)` and updated the `onSelectRoute` prop type in both `WorldMap.tsx` and `page.tsx` to `(id: string | null) => void`.

---

### Bug 8 — Leaflet CSS imported in SSR layout

**File:** `frontend/src/app/layout.tsx`  
**Severity:** 🟡 SSR warning, potential hydration issues

**What happened:**  
`layout.tsx` imported `leaflet/dist/leaflet.css` at the root level. Since `layout.tsx` runs server-side, Next.js tried to process Leaflet's CSS (which includes `url()` references to marker images) during SSR, producing warnings. `WorldMap` is already loaded with `dynamic(..., { ssr: false })` so the CSS only needs to exist client-side.

**Fix:**  
Removed the import from `layout.tsx` and added it at the top of `WorldMap.tsx` instead, where it only ever runs in the browser.

---

### Bug 9 — Google Fonts loaded via blocking `@import`

**File:** `frontend/src/app/globals.css`  
**Severity:** 🟡 Performance — blocks first paint

**What happened:**  
`globals.css` used `@import url("https://fonts.googleapis.com/...")` which is a render-blocking network request. The browser must finish this before it can parse the rest of the CSS.

**Fix:**  
Removed the `@import` and added `<link rel="preconnect">` and `<link rel="stylesheet">` tags inside `<head>` in `layout.tsx`. This allows the font to load in parallel with page rendering.

---

### Bug 10 — ECharts tooltip `params` typed incorrectly

**File:** `frontend/src/components/DelayChart.tsx`  
**Severity:** 🟡 TypeScript error

**What happened:**  
The tooltip `formatter` function typed `params` as `{ axisValue: string; value: number }[]`. ECharts passes a richer object at runtime so this type was wrong, causing TypeScript to complain.

**Fix:**  
Changed the type to `any[]` which matches ECharts' actual runtime shape without requiring the full ECharts type package.

---

### Bug 11 — Broken venv path on Windows

**Environment:** Windows PowerShell  
**Severity:** 🟠 Cannot install dependencies

**What happened:**  
Running `pip install -r requirements.txt` inside the activated venv threw:

```
Fatal error in launcher: Unable to create process using '"...\real-rails-poc35-goated 3\venv\Scripts\python.exe"
"...\SUPPLY CHAIN\venv\Scripts\pip.exe"': The system cannot find the file specified.
```

The venv had been created in a different folder (`real-rails-poc35-goated 3\`) but the terminal was working inside `SUPPLY CHAIN\`. Windows venvs embed their creation path in the launcher, so moving or renaming the parent folder breaks them permanently.

**Fix:**  
Deactivate the broken venv, delete it, and create a fresh one inside the current project folder:

```powershell
deactivate
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

---

## Troubleshooting

### Backend runs but frontend shows no data

Check `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Restart the frontend after changing it.

### Delay chart shows "Failed to load"

Make sure you are running the fixed `main.py` (Bug 2 above). Restart uvicorn after replacing the file:

```bash
python -m uvicorn main:app --reload --port 8000
```

### Comtrade says rate limited

Normal on free/API-limited access. Use `SYNTHETIC` mode for demos.

### Weather looks empty in live mode

Live weather may be calm at the sampled maritime waypoints. Use `AUTO` or `SYNTHETIC` mode.

### Map looks broken

Delete the Next.js build cache and restart:

```powershell
rmdir /s /q .next
npm run dev
```

### Venv throws "cannot find file" on Windows

See Bug 11 above. Always create the venv inside the project folder. Never move or rename the parent folder after creating a venv.

---

## Final demo checklist

- [x] Backend starts on port `8000`
- [x] Frontend starts on port `3000`
- [x] `SYNTHETIC` mode gives stable weather events
- [x] Route click zooms into the route
- [x] Delay chart loads without 500 error
- [x] Map uses flat Leaflet view
- [x] CSV download works
- [x] Real Rails colors are preserved
- [x] No real API keys included
- [x] No `.pyc`, `.next`, or build artifacts included
