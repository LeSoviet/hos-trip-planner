from dataclasses import dataclass, field
from datetime import datetime, timedelta

DRIVE_CAP_MIN = 11 * 60
WINDOW_MIN = 14 * 60
BREAK_TRIGGER_MIN = 8 * 60
BREAK_MIN = 30
RESET_MIN = 10 * 60
RESTART_MIN = 34 * 60
STOP_MIN = 60
FUEL_MIN = 15
FUEL_INTERVAL_MILES = 1000.0
CYCLE_CAP_MIN = 70 * 60


@dataclass(frozen=True)
class Event:
    type: str
    start: datetime
    end: datetime
    label: str = ""


@dataclass
class Day:
    date: datetime
    events: list = field(default_factory=list)


@dataclass
class Plan:
    days: list = field(default_factory=list)
    cycle_used_after_hours: float = 0.0


def _midnight(ts: datetime) -> datetime:
    return ts.replace(hour=0, minute=0, second=0, microsecond=0)


def _split_by_midnight(events):
    days = []
    for ev in events:
        cur = ev.start
        while cur < ev.end:
            end = min(ev.end, _midnight(cur) + timedelta(days=1))
            if not days or days[-1].date != _midnight(cur):
                days.append(Day(date=_midnight(cur)))
            days[-1].events.append(Event(ev.type, cur, end, ev.label))
            cur = end
    return days


def _rest_event(kind, clock):
    minutes = RESTART_MIN if kind == "restart" else RESET_MIN if kind == "reset" else BREAK_MIN
    return Event("sleeper" if kind == "reset" else "off_duty", clock, clock + timedelta(minutes=minutes))


def plan(legs, current_cycle_used_hours, start, leg_labels=None, stop_labels=None):
    queue = [
        [int(round(leg["hours"] * 60)), float(leg["miles"]) / leg["hours"], i]
        for i, leg in enumerate(legs)
        if leg["hours"] > 0
    ]
    n = len(queue)
    if leg_labels is None:
        leg_labels = ["current -> pickup", "pickup -> dropoff"] if n == 2 else [""] * n
    if stop_labels is None:
        stop_labels = ["pickup", "dropoff"] if n == 2 else [""] * n

    clock = start
    window_start = start
    drive_since_reset = 0
    drive_since_break = 0
    cycle_min = int(current_cycle_used_hours * 60)
    miles_since_fuel = 0.0
    events = []

    while queue:
        leg_min, mph, leg_idx = queue[0]
        window_elapsed = (clock - window_start) // timedelta(minutes=1)
        allowed = min(
            leg_min,
            DRIVE_CAP_MIN - drive_since_reset,
            WINDOW_MIN - window_elapsed,
            BREAK_TRIGGER_MIN - drive_since_break,
            CYCLE_CAP_MIN - cycle_min,
        )
        if allowed <= 0:
            if CYCLE_CAP_MIN - cycle_min <= 0:
                kind = "restart"
                cycle_min = 0
            elif DRIVE_CAP_MIN - drive_since_reset <= 0 or WINDOW_MIN - window_elapsed <= 0:
                kind = "reset"
            else:
                kind = "break"
            rest = _rest_event(kind, clock)
            events.append(rest)
            clock = rest.end
            if kind in ("reset", "restart"):
                window_start = clock
                drive_since_reset = 0
            drive_since_break = 0
            continue

        chunk = float(allowed)
        fuel_at = None
        chunk_miles = chunk / 60.0 * mph
        if miles_since_fuel + chunk_miles > FUEL_INTERVAL_MILES:
            fuel_at = (FUEL_INTERVAL_MILES - miles_since_fuel) / mph * 60.0
            chunk = min(chunk, fuel_at)

        events.append(Event("driving", clock, clock + timedelta(minutes=chunk), leg_labels[leg_idx]))
        clock += timedelta(minutes=chunk)
        drive_since_reset += chunk
        drive_since_break += chunk
        cycle_min += chunk
        miles_since_fuel += chunk / 60.0 * mph
        queue[0][0] -= chunk

        if fuel_at is not None and chunk >= fuel_at - 1e-9:
            events.append(Event("fuel", clock, clock + timedelta(minutes=FUEL_MIN)))
            clock += timedelta(minutes=FUEL_MIN)
            cycle_min += FUEL_MIN
            miles_since_fuel = 0.0

        if queue[0][0] <= 1e-9:
            finished = queue.pop(0)
            events.append(Event("on_duty", clock, clock + timedelta(minutes=STOP_MIN), stop_labels[finished[2]]))
            clock += timedelta(minutes=STOP_MIN)
            cycle_min += STOP_MIN

    return Plan(days=_split_by_midnight(events), cycle_used_after_hours=cycle_min / 60.0)