from datetime import datetime, timedelta

from hos.engine import plan

START = datetime(2026, 1, 5, 6, 0)


def as_tuples(out, day=0):
    return [(e.type, e.start, e.end) for e in out.days[day].events]


def test_short_single_day_trip():
    out = plan(
        legs=[
            {"hours": 1.0, "miles": 50.0},
            {"hours": 5.0, "miles": 275.0},
        ],
        current_cycle_used_hours=10.0,
        start=START,
    )
    assert as_tuples(out) == [
        ("driving", START, START + timedelta(hours=1)),
        ("on_duty", START + timedelta(hours=1), START + timedelta(hours=2)),
        ("driving", START + timedelta(hours=2), START + timedelta(hours=7)),
        ("on_duty", START + timedelta(hours=7), START + timedelta(hours=8)),
    ]
    assert len(out.days) == 1
    assert out.cycle_used_after_hours == 18.0
def test_eleven_hour_cap_splits_day_with_break_and_reset():
    out = plan(
        legs=[{"hours": 12.0, "miles": 660.0}],
        current_cycle_used_hours=10.0,
        start=START,
    )
    assert as_tuples(out, day=0) == [
        ("driving", datetime(2026, 1, 5, 6, 0), datetime(2026, 1, 5, 14, 0)),
        ("off_duty", datetime(2026, 1, 5, 14, 0), datetime(2026, 1, 5, 14, 30)),
        ("driving", datetime(2026, 1, 5, 14, 30), datetime(2026, 1, 5, 17, 30)),
        ("sleeper", datetime(2026, 1, 5, 17, 30), datetime(2026, 1, 6, 0, 0)),
    ]
    assert as_tuples(out, day=1) == [
        ("sleeper", datetime(2026, 1, 6, 0, 0), datetime(2026, 1, 6, 3, 30)),
        ("driving", datetime(2026, 1, 6, 3, 30), datetime(2026, 1, 6, 4, 30)),
        ("on_duty", datetime(2026, 1, 6, 4, 30), datetime(2026, 1, 6, 5, 30)),
    ]
    assert out.cycle_used_after_hours == 23.0



def test_cycle_exhaustion_forces_34h_restart_before_driving():
    out = plan(
        legs=[{"hours": 2.0, "miles": 110.0}],
        current_cycle_used_hours=70.0,
        start=START,
    )
    assert as_tuples(out, day=0) == [
        ("off_duty", datetime(2026, 1, 5, 6, 0), datetime(2026, 1, 6, 0, 0)),
    ]
    assert as_tuples(out, day=1) == [
        ("off_duty", datetime(2026, 1, 6, 0, 0), datetime(2026, 1, 6, 16, 0)),
        ("driving", datetime(2026, 1, 6, 16, 0), datetime(2026, 1, 6, 18, 0)),
        ("on_duty", datetime(2026, 1, 6, 18, 0), datetime(2026, 1, 6, 19, 0)),
    ]
    assert out.cycle_used_after_hours == 3.0


def test_fourteen_hour_window_cap_triggers_reset():
    out = plan(
        legs=[
            {"hours": 6.0, "miles": 330.0},
            {"hours": 6.5, "miles": 358.0},
        ],
        current_cycle_used_hours=0.0,
        start=START,
    )
    assert as_tuples(out, day=0) == [
        ("driving", datetime(2026, 1, 5, 6, 0), datetime(2026, 1, 5, 12, 0)),
        ("on_duty", datetime(2026, 1, 5, 12, 0), datetime(2026, 1, 5, 13, 0)),
        ("driving", datetime(2026, 1, 5, 13, 0), datetime(2026, 1, 5, 15, 0)),
        ("off_duty", datetime(2026, 1, 5, 15, 0), datetime(2026, 1, 5, 15, 30)),
        ("driving", datetime(2026, 1, 5, 15, 30), datetime(2026, 1, 5, 18, 30)),
        ("sleeper", datetime(2026, 1, 5, 18, 30), datetime(2026, 1, 6, 0, 0)),
    ]
    assert as_tuples(out, day=1) == [
        ("sleeper", datetime(2026, 1, 6, 0, 0), datetime(2026, 1, 6, 4, 30)),
        ("driving", datetime(2026, 1, 6, 4, 30), datetime(2026, 1, 6, 6, 0)),
        ("on_duty", datetime(2026, 1, 6, 6, 0), datetime(2026, 1, 6, 7, 0)),
    ]
    assert out.cycle_used_after_hours == 14.5
