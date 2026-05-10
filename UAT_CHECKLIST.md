# Functional UAT Checklist
## PoC #35 — Weather-to-Supply Chain Risk Model
**Tester:** Janak Gopalakrishnan
**Date:** 2026-05-10
**Build:** PoC #35 · FastAPI backend + Next.js frontend
**Test Mode:** SYNTHETIC

---

## Pre-Test Setup

- [x] Backend running on `http://localhost:8000`
- [x] Frontend running on `http://localhost:3000`
- [x] Dashboard loads without console errors
- [x] Data mode set to **SYNTHETIC** for baseline tests

---

## Module 1 — The Handshake (70% → 30% Data Flow)

| # | Test Case | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| 1.1 | Route card click populates map | Click any route card in sidebar | Map zooms into that route's corridor, route line brightens, unrelated routes dim | ✅ Pass |
| 1.2 | Map line click populates sidebar | Click a route polyline on the map | Sidebar highlights the matching RouteCard, bottom panel opens with delay chart and impact chain | ✅ Pass |
| 1.3 | Bottom panel appears on selection | Select any route | Bottom panel slides in showing DelayChart (left) and ImpactChain (right) | ✅ Pass |
| 1.4 | Bottom panel clears on reset | Click map Reset button | Bottom panel disappears, map returns to world view, no route highlighted | ✅ Pass |
| 1.5 | Delay chart shows correct route | Select R003 | Chart header shows R003 data, 30 data points visible | ✅ Pass |
| 1.6 | Impact chain shows correct route | Select R001 | Impact chain shows R001 scenario, risk score matches RouteCard | ✅ Pass |
| 1.7 | Port popup shows correct city | Click an origin marker on map | Popup shows correct city name and route name | ✅ Pass |
| 1.8 | Weather popup shows event details | Click a weather marker on map | Popup shows event type, severity, region, affected routes | ✅ Pass |

**Module 1 Result: 8/8 Pass ✅**

---

## Module 2 — Filter Logic

| # | Test Case | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| 2.1 | Scenario: Optimistic reduces delay | Switch ScenarioBar to Optimistic | All route estimated_delay_days decrease, risk scores drop | ✅ Pass |
| 2.2 | Scenario: Pessimistic increases delay | Switch ScenarioBar to Pessimistic | All route estimated_delay_days increase, risk scores rise | ✅ Pass |
| 2.3 | Scenario: Current is baseline | Switch ScenarioBar to Current | Delay values match 1.0× multiplier baseline | ✅ Pass |
| 2.4 | Scenario change updates ImpactChain | Select a route, change scenario | ImpactChain values update without page reload | ✅ Pass |
| 2.5 | Data mode SYNTHETIC forces mock data | Set mode to SYNTHETIC | Source panel shows all sources as MOCK | ✅ Pass |
| 2.6 | Data mode AUTO uses fallback | Set mode to AUTO (no API keys) | Dashboard still populated with synthetic data | ✅ Pass |
| 2.7 | Data mode LIVE attempts APIs | Set mode to LIVE (no API keys) | Backend attempts live fetch, falls back gracefully, still shows data | ✅ Pass |
| 2.8 | Weather tab filters by selected route | Select R002, open Weather tab | Only weather events affecting R002 are shown | ✅ Pass |
| 2.9 | Weather tab shows all without selection | No route selected, open Weather tab | All weather events shown | ✅ Pass |
| 2.10 | Map focus toggle dims routes | Select a route, click Focus button | Unrelated route lines dim to low opacity | ✅ Pass |
| 2.11 | Map focus toggle shows all | Click Focus button again | All routes return to normal opacity | ✅ Pass |

**Module 2 Result: 11/11 Pass ✅**

---

## Module 3 — Intelligence Value

| # | Test Case | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| 3.1 | Risk score is derived, not raw | Inspect any RouteCard | Risk score (0–100) reflects derived intelligence | ✅ Pass |
| 3.2 | Delay days are computed | Check estimated_delay_days | Value is calculated, not hardcoded | ✅ Pass |
| 3.3 | "Why This Matters" panel populates | Open Intel tab | Headline and body text shown correctly | ✅ Pass |
| 3.4 | "Who Controls" panel populates | Open Intel tab | Second insight panel shows governance context | ✅ Pass |
| 3.5 | Source confidence panel is accurate | Open Sources tab | Each source shows correct LIVE/MOCK status | ✅ Pass |
| 3.6 | Cost impact is route-specific | Select R003 vs R005 | R003 cost impact higher than R005 | ✅ Pass |
| 3.7 | Concentration risk reflected in score | Compare R003 vs R002 | R003 has higher risk score | ✅ Pass |
| 3.8 | Delay timeseries has spike near events | Select route with active weather | Chart shows visible spike aligned with event | ✅ Pass |
| 3.9 | ImpactChain node math is consistent | Check delay node values | Values approximately sum to total delay days | ✅ Pass |
| 3.10 | Metric cards update on data load | Observe top-right metric cards | Events count, sea paths, mode label all correct | ✅ Pass |

**Module 3 Result: 10/10 Pass ✅**

---

## Module 4 — Data Integrity

| # | Test Case | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| 4.1 | All 5 routes load | Open dashboard | Sidebar shows 5 route cards (R001–R005) | ✅ Pass |
| 4.2 | Sea route coordinates correct | Check map | R001 shows Pacific arc, R003 shows Suez path | ✅ Pass |
| 4.3 | Antimeridian handled | Zoom into R001 Pacific route | No straight line drawn across full map | ✅ Pass |
| 4.4 | CSV download works | Click Download Sample Data | .csv file downloads correctly | ✅ Pass |
| 4.5 | CSV reflects current scenario | Set Pessimistic, download CSV | CSV delay values match Pessimistic scenario | ✅ Pass |
| 4.6 | Last updated timestamp | Click Refresh button | Timestamp in header updates to current time | ✅ Pass |
| 4.7 | Error state shows on backend down | Stop backend, refresh page | Error state appears, no silent crash | ✅ Pass |
| 4.8 | Background color correct | Check DevTools body background | Exact hex #030712 confirmed | ✅ Pass |
| 4.9 | Sidebar is 30% width | Resize browser to 1440px | Sidebar occupies exactly 30% | ✅ Pass |
| 4.10 | Active route has cyan glow | Select any route | RouteCard shows cyan border glow | ✅ Pass |

**Module 4 Result: 10/10 Pass ✅**

---

## Module 5 — UI & DNA Compliance

| # | Test Case | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| 5.1 | No console errors on load | Open browser DevTools | Zero red errors in console on clean SYNTHETIC load | ✅ Pass |
| 5.2 | Risk colors correct | Check all risk levels | CRITICAL=#f87171, HIGH=#fb923c, MEDIUM=#fbbf24, LOW=#34d399 | ✅ Pass |
| 5.3 | Loading state shows pulse | Kill backend, reload | Loading text pulses while waiting | ✅ Pass |
| 5.4 | No console.log in production | Scan codebase | Only intentional error handlers remain | ✅ Pass |
| 5.5 | Map tooltip styled correctly | Hover over a route line | Dark tooltip with correct Real Rails colors | ✅ Pass |
| 5.6 | Scrollbar styled correctly | Scroll route list | Thin dark scrollbar matches theme | ✅ Pass |

**Module 5 Result: 6/6 Pass ✅**

---

## Final Score

| Module | Tests | Passed | Result |
|---|---|---|---|
| 1 — Handshake | 8 | 8 | ✅ Pass |
| 2 — Filter Logic | 11 | 11 | ✅ Pass |
| 3 — Intelligence Value | 10 | 10 | ✅ Pass |
| 4 — Data Integrity | 10 | 10 | ✅ Pass |
| 5 — DNA Compliance | 6 | 6 | ✅ Pass |
| **Total** | **45** | **45** | **✅ FULL PASS** |

---

## Sign-Off

| Gate | Requirement | Status |
|---|---|---|
| VAR | Conditional PASS — sidebar width fix applied | ✅ Confirmed |
| UAT Module 1 | All handshake tests pass | ✅ Confirmed |
| UAT Module 2 | All filter tests pass | ✅ Confirmed |
| UAT Module 3 | All intelligence tests pass | ✅ Confirmed |
| UAT Module 4 | All data integrity tests pass | ✅ Confirmed |
| UAT Module 5 | All DNA compliance tests pass | ✅ Confirmed |
| Code clean | No console.log in production build | ✅ Confirmed |
| Screenshot | Final dashboard screenshot attached | ☐ Pending |

**Tester:** Janak Gopalakrishnan
**Date completed:** 2026-05-10
**Submitted to Intelligence Library:** ☐ Pending
