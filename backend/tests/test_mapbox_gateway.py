import pytest
import requests_mock

from hos.adapters.mapbox_gateway import MapboxGateway
from hos.service import GeocodeError, RoutingError


TOKEN = "pk.test-token"


def geocode_body():
    return {
        "type": "FeatureCollection",
        "features": [
            {"geometry": {"coordinates": [-95.3698, 29.7604]}}
        ],
    }


def directions_body():
    return {
        "routes": [
            {
                "distance": 172883.0,
                "duration": 11314.0,
                "geometry": {"coordinates": [[-95.3698, 29.7604], [-96.797, 32.7767]]},
            }
        ]
    }


def test_geocode_returns_lon_lat():
    with requests_mock.Mocker() as m:
        m.get("https://api.mapbox.com/geocoding/v5/mapbox.places/Houston%2C%20TX.json", json=geocode_body())
        gateway = MapboxGateway(TOKEN)
        assert gateway.geocode("Houston, TX") == [-95.3698, 29.7604]


def test_geocode_raises_on_no_features():
    with requests_mock.Mocker() as m:
        m.get(
            "https://api.mapbox.com/geocoding/v5/mapbox.places/Nowhere%2C%20XX.json",
            json={"type": "FeatureCollection", "features": []},
        )
        gateway = MapboxGateway(TOKEN)
        with pytest.raises(GeocodeError):
            gateway.geocode("Nowhere, XX")


def test_directions_raises_on_empty_routes():
    with requests_mock.Mocker() as m:
        m.get(
            "https://api.mapbox.com/directions/v5/mapbox/driving/-95.369800%2C29.760400%3B-96.797000%2C32.776700",
            json={"code": "NoRoute", "routes": [], "waypoints": []},
        )
        gateway = MapboxGateway(TOKEN)
        with pytest.raises(RoutingError):
            gateway.directions([[-95.3698, 29.7604], [-96.797, 32.7767]])


def test_directions_raises_on_http_error():
    with requests_mock.Mocker() as m:
        m.get(
            "https://api.mapbox.com/directions/v5/mapbox/driving/-95.369800%2C29.760400%3B-96.797000%2C32.776700",
            status_code=429,
            json={"message": "Too Many Requests"},
        )
        gateway = MapboxGateway(TOKEN)
        with pytest.raises(RoutingError):
            gateway.directions([[-95.3698, 29.7604], [-96.797, 32.7767]])


def test_directions_converts_meters_to_miles_and_seconds_to_hours():
    with requests_mock.Mocker() as m:
        m.get(
            "https://api.mapbox.com/directions/v5/mapbox/driving/-95.369800%2C29.760400%3B-96.797000%2C32.776700",
            json=directions_body(),
        )
        gateway = MapboxGateway(TOKEN)
        result = gateway.directions([[-95.3698, 29.7604], [-96.797, 32.7767]])
        assert result["miles"] == pytest.approx(107.4284, abs=0.01)
        assert result["drive_hours"] == pytest.approx(3.1428, abs=0.01)
        assert result["coordinates"] == [[-95.3698, 29.7604], [-96.797, 32.7767]]