# hos-trip-planner

Full Stack Developer Assessment — Trip planner with FMCSA Hours of Service (HOS) compliance and ELD daily log sheets.

## Problem

A property-carrying driver needs a trip plan before departing. Given current location, pickup location, dropoff location, and hours already used in the current 70hr/8day cycle, the app must produce:

1. A map showing the route with all stops (pickup, dropoff, fuel, rest breaks, overnight rests).
2. Daily log sheets (ELD grid) covering every 24h day of the trip, with Off duty / Sleeper / Driving / On duty blocks drawn at exact times.

## Solution

- **Frontend** (React + Vite + Mapbox GL): form for the 4 inputs, interactive map with route + stop markers, tabbed daily log sheets drawn on the FMCSA 24h grid, "Recent plans" list.
- **Backend** (Django + DRF, serverless on Vercel): one stateless endpoint `POST /api/plan` that geocodes (Mapbox), fetches route (Mapbox Directions, miles + duration), runs the HOS engine, persists the plan, and returns the timeline + log sheets.
- **Database** (Supabase Postgres): plan history via Django ORM.
- **HOS engine** (pure Python, no framework): simulator loop distributing the trip across days under FMCSA property-carrying rules.

## Domain rules (assumptions per assessment)

- Property-carrying driver, **70hrs/8days** cycle, no adverse conditions.
- Limits: **11h driving** per day, **14h on-duty window**, **30min break after 8h cumulative driving**, **10h off-duty** to reset, fuel at least every **1,000 miles**.
- **1h on-duty** (not driving) for pickup, 1h for dropoff.
- "Current Cycle Used" input subtracts from the 70h cycle budget; if the cycle is exhausted, the driver gets a 34h restart (documented behavior, tested).
- Fuel stop: 15min on-duty (not driving), inserted so that driving legs never exceed 1,000 miles.
- Day boundary at midnight: log sheet splits at 00:00; activities crossing midnight appear on the next day's sheet.

## User stories

1. As a dispatcher, I enter the 4 inputs and see the full route on a map with every required stop marked and labeled.
2. As a driver, I see one log sheet per day, with the 4 status rows drawn to scale, so I know exactly what to record on my ELD.
3. As a tester, I can enter a cycle-used value close to 70h and see the app plan a mandatory 34h restart before the trip starts.
4. As a dispatcher, I see my recent calculated plans and can reopen one, so repeated demos don't require re-entering data.

## Implementation decisions

- **Monorepo**: `frontend/` + `backend/` in one public repo. Two Vercel projects (root dir per project) deployed from the same repo.
- **Supabase Postgres** for plan history. Single table `plans` (id, inputs jsonb, plan jsonb, created_at) written by the backend after each successful calculation; `GET /api/plans` returns recent plans for the frontend "Recent plans" list. This is the only persistence; no auth in demo (RLS deny-all by default, backend uses service role via env var, never exposed).
- **Mapbox public token** in frontend `.env` (`VITE_MAPBOX_TOKEN`, never committed) for map tiles, geocoding, and directions. One key covers all three; free tier (50k geocodes / 100k directions) is far above demo needs.
- **Backend proxies geocoding/directions** (Mapbox secret-free: the backend also uses the public token — it is designed for this) so the HOS engine receives normalized data (waypoints, miles, drive minutes) regardless of frontend.
- **HOS engine output shape**: ordered list of events `{type: driving|off_duty|sleeper|on_duty|fuel|pickup|dropoff, start, end, location}` grouped by calendar day; frontend renders both map markers and log grids from the same payload (single source of truth).
- **CORS**: restricted to the Vercel frontend origin.

## Testing decisions

- Tests live at the **engine seam**: `plan(trip_input) -> timeline` pure function. All FMCSA rules are verified there with pytest — known-good literal scenarios (distances/durations hand-computed), no recomputation of expected values.
- Golden cases: single-day short trip; 3-day cross-country trip; break at exactly 8h; cycle exhaustion forcing 34h restart; midnight split; fuel stop at 1,000mi boundary.
- Frontend: rendering of log grid from a fixed payload (component test), no network mocking gymnastics.

## Tickets (tracer bullets, each demoable)

| # | Ticket | Blocking |
|---|--------|----------|
| 1 | HOS engine + pytest, CLI runnable (`python -m hos` prints timeline) | — |
| 2 | Django endpoint `/api/plan` wrapping engine + Mapbox route fetch + Supabase persistence + CORS | 1 |
| 3 | Frontend form + map with route and stop markers (real API call) | 2 |
| 4 | Daily log sheets renderer (grid, 4 rows, multi-day tabs) | 3 |
| 5 | Deploy both projects to Vercel, live URL | 2,3,4 |
| 6 | Loom video (3-5 min) + README polish | 5 |

## Out of scope

- User accounts, auth flows, multi-tenant anything.
- Adverse driving conditions, Canada/Mexico rules, passenger-carrying rules, 34h restart edge debates beyond the basic behavior.
- Short-haul exceptions, adverse-condition exemptions.
- Mobile/responsive beyond "usable in a laptop browser".

## Additional notes

- All distances in **miles**, times in local US timezone of the route start (log sheets are day-based; keep a single fixed timezone per plan to avoid DST puzzles — documented simplification).
- Demo scenarios use US addresses (e.g., pickup Houston TX → dropoff Atlanta GA).
- Repo public; assessment deliverables: live Vercel URL, GitHub link, Loom.