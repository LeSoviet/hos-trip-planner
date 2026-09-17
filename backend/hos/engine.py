from dataclasses import dataclass, field
from datetime import datetime, timedelta

DRIVE_CAP_MIN = 11 * 60
WINDOW_MIN = 14 * 60
BREAK_TRIGGER_MIN = 8 * 60
BREAK_MIN = 30
RESET_MIN = 10 * 60
RESTART_MIN = 34 * 60
STOP_MIN = 60
CYCLE_CAP_MIN = 70 * 60


@dataclass(frozen=True)
class Event:
    type: str
    start: datetime
    end: datetime


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
            days[-1].events.append(Event(ev.type, cur, end))
            cur = end
    return days


def _rest_event(kind, clock):
    minutes = RESTART_MIN if kind == "restart" else RESET_MIN if kind == "reset" else BREAK_MIN
    return Event("sleeper" if kind == "reset" else "off_duty", clock, clock + timedelta(minutes=minutes))


def plan(legs, current_cycle_used_hours, start):
    clock = start
    window_start = start
    drive_since_reset = 0
    drive_since_break = 0
    cycle_min = int(current_cycle_used_hours * 60)
    events = []
    remaining = [int(round(leg["hours"] * 60)) for leg in legs if leg["hours"] > 0]

    while remaining:
        window_elapsed = (clock - window_start) // timedelta(minutes=1)
        allowed = min(
            remaining[0],
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
            if kind in ("break", "reset", "restart"):
                drive_since_break = 0
            continue
        events.append(Event("driving", clock, clock + timedelta(minutes=allowed)))
        clock += timedelta(minutes=allowed)
        drive_since_reset += allowed
        drive_since_break += allowed
        cycle_min += allowed
        remaining[0] -= allowed
        if remaining[0] == 0:
            remaining.pop(0)
            events.append(Event("on_duty", clock, clock + timedelta(minutes=STOP_MIN)))
            clock += timedelta(minutes=STOP_MIN)
            cycle_min += STOP_MIN
    return Plan(days=_split_by_midnight(events), cycle_used_after_hours=cycle_min / 60.0)