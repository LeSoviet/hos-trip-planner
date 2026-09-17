# HOS Trip Planner

Trip planner with FMCSA Hours of Service (HOS) compliance and ELD daily log sheets. Enter current location, pickup, dropoff, and hours already used in the 70h/8day cycle — the app geocodes the addresses, fetches the driving route, applies property-carrying HOS rules, and draws the route on a map plus daily Driver's Daily Log (RODS) sheets.

## Live

- **App (frontend + map + log sheets)**: https://hos-trip-planner-delta.vercel.app
- **API (Django + DRF)**: https://hos-trip-planner-api.vercel.app
  - `POST /api/plan` — plan a trip
  - `GET /api/plans` — recent plans

Example:

```bash
curl -X POST https://hos-trip-planner-api.vercel.app/api/plan \
  -H "Content-Type: application/json" \
  -d '{
    "current_location": "Houston, TX",
    "pickup_location": "Dallas, TX",
    "dropoff_location": "Atlanta, GA",
    "current_cycle_used_hours": 10
  }'
```

## Stack

- **Backend**: Django 6 + Django REST Framework (Python 3.13), serverless on Vercel.
- **HOS engine**: pure Python, zero framework/HTTP dependencies — a simulator loop distributing the trip across days under FMCSA property-carrying rules. Tested in isolation with pytest.
- **Frontend**: React 19 + Vite + Mapbox GL JS, clean architecture (`domain/`, `application/`, `infrastructure/`, `ui/`).
- **Database**: Supabase Postgres — plan history (`plans` table, RLS deny-all, backend writes with service role key).
- **Maps**: Mapbox Geocoding + Directions (miles, drive time, full geometry).

## Tools

| Tool | Role |
|------|------|
| **Mapbox API** | Geocoding, Directions (route geometry, miles, drive time) and GL JS map tiles |
| **Supabase** | Postgres for plan history (RLS deny-all, service-role writes) |
| **Vercel** | Hosting for both projects (frontend + serverless Django API), deploys from `main` |
| **GLM 5.3 Flash with OpenCode harness** | AI pair-programmer: engine TDD, adapters, UI, deploy automation |
| **Supabase MCP** | Project inspection and docs during development |
| **Vercel CLI** | Project provisioning, env vars, deployment verification |
| **Context7 MCP** | Up-to-date library docs (Mapbox GL JS, Vercel, pytest) fetched during coding |

## HOS rules implemented

Property-carrying driver, 70hrs/8days, no adverse driving conditions:

- **11h driving** cap per 14h window
- **14h driving window** from first on-duty
- **30min break** after 8h cumulative driving
- **10h off-duty** reset (11h/14h clocks restart)
- **34h restart** when the 70h cycle is exhausted before the trip
- **Fuel stop**: 15min on-duty, inserted so driving segments never exceed 1,000 miles
- **1h on-duty** for pickup, 1h for dropoff
- Day boundary at midnight: activities crossing midnight are split across daily log sheets (miles prorated per day)

## Log sheets (RODS)

The daily log grid follows the FMCSA Driver's Daily Log format: 4 status rows (Off Duty / Sleeper Berth / Driving / On Duty Not Driving), 24-hour grid with 15-minute ticks, vertical connectors at duty-status changes, **Total Hours per row (must equal 24)**, **Total miles driving today**, and **Remarks** with city + state at each duty status change.

## Architecture

```
backend/
  hos/
    engine.py          # HOS simulator: plan(legs, cycle_used, start) -> Plan (pure, no I/O)
    service.py         # orchestration: geocode -> directions -> engine -> persist
    adapters/          # HTTP seams: MapboxGateway, SupabaseStore
    views.py           # DRF endpoints, adapters injected (testable without HTTP)
  api/                 # Django project + Vercel ASGI wrapper
  tests/               # 26 pytest green — engine rules, service, adapters, API seam
frontend/
  src/
    domain/            # payload helpers: colors, marker logic, route interpolation
    application/       # plan service (use cases)
    infrastructure/    # API client
    ui/                # React components: TripForm, MapView, LogSheetTabs (SVG grid)
```

Design principle: the engine seam is a pure function `plan(legs, current_cycle_used_hours, start) -> Plan`. Everything framework-specific (Django, Mapbox, Supabase) lives behind adapters that get injected, so all HOS logic is verified with fast deterministic tests using hand-computed literals.

## Run locally

Backend (Python 3.13, venv at repo root):

```bash
python -m venv .venv
.venv\Scripts\pip install -r backend\requirements.txt

# from repo root, with env vars set (see .env.example keys)
.venv\Scripts\python.exe backend\manage.py runserver 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Environment variables (never committed):

- `backend/.env` or shell: `MAPBOX_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGIN`
- `frontend/.env`: `VITE_MAPBOX_TOKEN`, `VITE_API_BASE_URL`

## Tests

```bash
python -m pytest backend/tests -q   # 26 passed
```

Golden cases covered at the engine seam: single-day trip, 11h cap splitting the day with break + reset, 14h window exhaustion, cycle exhaustion forcing 34h restart, fuel stop at the 1,000-mile boundary, midnight splits with mile proration, pickup/dropoff labels, cumulative mile positions.

## Extras beyond the core requirement

- Plan history persistence (Supabase) with a "Recent plans" list — reopen any past plan.
- Interpolated map markers: fuel/rest stops are positioned along the route geometry by cumulative miles (`mile_at`), not just at endpoints.
- RODS fidelity: per-row totals, remarks with locations, day mile totals.
- Full API + adapter test coverage in addition to the engine tests.