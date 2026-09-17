from datetime import datetime

import pytest

from hos.service import plan_trip, GeocodeError


class FakeGateway:
    def __init__(self):
        self.places = {
            "Houston, TX": (-95.3698, 29.7604),
            "Dallas, TX": (-96.7970, 32.7767),
            "Atlanta, GA": (-84.3880, 33.7490),
        }
        self.mph = 55.0

    def geocode(self, address):
        return self.places.get(address)

    def directions(self, waypoints):
        (lon0, lat0), (lon1, lat1) = waypoints
        miles = abs(lon1 - lon0) * 100.0 + abs(lat1 - lat0) * 10.0
        hours = miles / self.mph
        coords = [[lon0, lat0], [lon1, lat1]]
        return {"miles": miles, "drive_hours": hours, "coordinates": coords}


class FakeStore:
    def __init__(self):
        self.saved = []
        self.rows = []

    def save(self, inputs, plan):
        self.saved.append((inputs, plan))
        return "00000000-0000-0000-0000-000000000001"

    def recent(self, limit=20):
        if self.rows:
            return self.rows
        return [{"id": "00000000-0000-0000-0000-000000000001", "inputs": self.saved[0][0], "plan": self.saved[0][1], "created_at": "2026-01-05T06:00:00Z"}]


START = datetime(2026, 1, 5, 6, 0)
INPUTS = {
    "current_location": "Houston, TX",
    "pickup_location": "Dallas, TX",
    "dropoff_location": "Atlanta, GA",
    "current_cycle_used_hours": 10.0,
}


def make_service(store=None):
    gateway = FakeGateway()
    store = store or FakeStore()
    return gateway, store


# leg0 Houston->Dallas: |dLon|=1.4272*100=142.72, |dLat|=3.0163*10=30.163 => 172.883 mi, 3.143h
# leg1 Dallas->Atlanta: |dLon|=12.409*100=1240.9, |dLat|=0.9723*10=9.723 => 1250.623 mi, 22.74h
# total 1423.506 mi, 25.883h


def test_plan_trip_returns_route_days_and_saves():
    gateway, store = make_service()
    out = plan_trip(INPUTS, gateway, store, clock=lambda: START)

    assert out["inputs"] == INPUTS
    assert out["stops"] == {
        "current": [-95.3698, 29.7604],
        "pickup": [-96.7970, 32.7767],
        "dropoff": [-84.3880, 33.7490],
    }
    assert out["route"]["miles"] == pytest.approx(1423.506, abs=0.01)
    assert out["route"]["drive_hours"] == pytest.approx(25.882, abs=0.01)
    assert out["route"]["coordinates"] == [
        [-95.3698, 29.7604],
        [-96.7970, 32.7767],
        [-84.3880, 33.7490],
    ]
    assert out["legs"] == [
        {"label": "current -> pickup", "miles": pytest.approx(172.883, abs=0.01), "hours": pytest.approx(3.143, abs=0.01)},
        {"label": "pickup -> dropoff", "miles": pytest.approx(1250.623, abs=0.01), "hours": pytest.approx(22.74, abs=0.01)},
    ]
    assert len(out["days"]) == 3
    assert out["days"][0]["date"] == "2026-01-05"
    assert out["days"][0]["events"][0]["type"] == "driving"
    assert out["days"][0]["events"][0]["start"] == "2026-01-05T06:00:00"
    assert out["cycle_used_after_hours"] == pytest.approx(38.133, abs=0.01)
    assert store.saved and store.saved[0][0] == INPUTS


def test_plan_trip_raises_on_unknown_address():
    gateway, store = make_service()
    bad = dict(INPUTS, pickup_location="Nowhere, XX")
    with pytest.raises(GeocodeError):
        plan_trip(bad, gateway, store, clock=lambda: START)