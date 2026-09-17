from datetime import datetime

from hos.engine import plan as engine_plan


class GeocodeError(Exception):
    pass


class RoutingError(Exception):
    pass


LEG_LABELS = ["current -> pickup", "pickup -> dropoff"]


def _serialize_plan(plan, stop_locations):
    days = []
    for day in plan.days:
        events = [
            {
                "type": e.type,
                "start": e.start.isoformat(),
                "end": e.end.isoformat(),
                "label": e.label,
                "mile_at": e.mile_at,
                "miles": round(e.miles, 1),
                "location": stop_locations.get(e.label, ""),
            }
            for e in day.events
        ]
        days.append(
            {
                "date": day.date.date().isoformat(),
                "events": events,
                "total_miles": round(sum(e["miles"] for e in events), 1),
            }
        )
    return days


def plan_trip(inputs, gateway, store, clock=datetime.now):
    addresses = [
        inputs["current_location"],
        inputs["pickup_location"],
        inputs["dropoff_location"],
    ]
    points = []
    for address in addresses:
        point = gateway.geocode(address)
        if point is None:
            raise GeocodeError(f"address not found: {address}")
        points.append([float(point[0]), float(point[1])])

    leg_points = [(points[0], points[1]), (points[1], points[2])]
    routes = [gateway.directions([p0, p1]) for p0, p1 in leg_points]
    legs = [
        {"label": label, "miles": route["miles"], "hours": route["drive_hours"]}
        for label, route in zip(LEG_LABELS, routes)
    ]

    plan = engine_plan(legs, float(inputs["current_cycle_used_hours"]), clock())
    stop_locations = {
        "pickup": inputs["pickup_location"],
        "dropoff": inputs["dropoff_location"],
    }
    payload = {
        "inputs": inputs,
        "stops": {"current": points[0], "pickup": points[1], "dropoff": points[2]},
        "route": {
            "miles": sum(r["miles"] for r in routes),
            "drive_hours": sum(r["drive_hours"] for r in routes),
            "coordinates": routes[0]["coordinates"] + routes[1]["coordinates"][1:],
        },
        "legs": legs,
        "days": _serialize_plan(plan, stop_locations),
        "cycle_used_after_hours": plan.cycle_used_after_hours,
    }
    store.save(inputs, payload)
    return payload