from urllib.parse import quote

import requests

from hos.service import GeocodeError, RoutingError


GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"
DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/driving/{coordinates}"
METERS_PER_MILE = 1609.344


class MapboxGateway:
    def __init__(self, token):
        self.token = token

    def geocode(self, address):
        response = requests.get(
            GEOCODE_URL.format(query=quote(address)),
            params={"access_token": self.token, "limit": 1},
            timeout=10,
        )
        features = response.json().get("features", [])
        if not features:
            raise GeocodeError(f"address not found: {address}")
        return features[0]["geometry"]["coordinates"]

    def directions(self, waypoints):
        coords = ";".join(f"{lon:.6f},{lat:.6f}" for lon, lat in waypoints)
        response = requests.get(
            DIRECTIONS_URL.format(coordinates=quote(coords, safe="")),
            params={"access_token": self.token, "overview": "full", "geometries": "geojson"},
            timeout=10,
        )
        routes = response.json().get("routes", [])
        if response.status_code != 200 or not routes:
            raise RoutingError(f"no route found for waypoints: {waypoints} (status {response.status_code})")
        route = routes[0]
        return {
            "miles": route["distance"] / METERS_PER_MILE,
            "drive_hours": route["duration"] / 3600.0,
            "coordinates": route["geometry"]["coordinates"],
        }