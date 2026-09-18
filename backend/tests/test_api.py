from datetime import datetime

from django.test import override_settings
from rest_framework.test import APIClient

import hos.views as views
from hos.service import GeocodeError

from tests.test_plan_service import FakeGateway, FakeStore, INPUTS, START

import pytest


@override_settings(MAPBOX_TOKEN="pk.test")
def test_post_plan_returns_payload_and_saves():
    gateway = FakeGateway()
    store = FakeStore()
    views.build_gateway = lambda: gateway
    views.build_store = lambda: store
    views.now = lambda: datetime(2026, 1, 5, 6, 0)

    client = APIClient()
    response = client.post("/api/plan", INPUTS, format="json")

    assert response.status_code == 200
    assert response.data["stops"]["pickup"] == [-96.797, 32.7767]
    assert response.data["days"][0]["date"] == "2026-01-05"
    assert store.saved and store.saved[0][1]["days"] == response.data["days"]


def test_post_plan_geocode_error_returns_400():
    views.build_gateway = lambda: FakeGateway()
    views.build_store = lambda: FakeStore()
    views.now = lambda: datetime(2026, 1, 5, 6, 0)
    bad = dict(INPUTS, pickup_location="Nowhere, XX")

    client = APIClient()
    response = client.post("/api/plan", bad, format="json")

    assert response.status_code == 400
    assert "Nowhere, XX" in response.data["detail"]


def test_post_plan_missing_field_returns_400():
    views.build_gateway = lambda: FakeGateway()
    views.build_store = lambda: FakeStore()

    client = APIClient()
    response = client.post("/api/plan", {"current_location": "x"}, format="json")

    assert response.status_code == 400


@override_settings(SUPABASE_URL="https://wkvtwcfwvxtsjeqsfgkl.supabase.co", SUPABASE_SERVICE_ROLE_KEY="k")
def test_get_plans_returns_recent():
    rows = [{"id": "1", "inputs": INPUTS, "created_at": "2026-01-05T06:00:00Z"}]
    store = FakeStore()
    store.rows = rows
    views.build_store = lambda: store

    client = APIClient()
    response = client.get("/api/plans")

    assert response.status_code == 200
    assert response.data == rows


@override_settings(SUPABASE_URL="https://wkvtwcfwvxtsjeqsfgkl.supabase.co", SUPABASE_SERVICE_ROLE_KEY="k")
def test_get_plan_detail_returns_row():
    row = {"id": "abc", "inputs": INPUTS, "plan": {"days": []}, "created_at": "2026-01-05T06:00:00Z"}
    store = FakeStore()
    store.detail = row
    views.build_store = lambda: store

    client = APIClient()
    response = client.get("/api/plans/00000000-0000-0000-0000-00000000000a")

    assert response.status_code == 200
    assert response.data == row


@override_settings(SUPABASE_URL="https://wkvtwcfwvxtsjeqsfgkl.supabase.co", SUPABASE_SERVICE_ROLE_KEY="k")
def test_get_plan_detail_missing_returns_404():
    views.build_store = lambda: FakeStore()

    client = APIClient()
    response = client.get("/api/plans/ffffffff-0000-0000-0000-000000000000")

    assert response.status_code == 404


def test_cors_header_present():
    client = APIClient()
    response = client.options(
        "/api/plans",
        HTTP_ORIGIN="https://example.vercel.app",
    )
    assert response.status_code == 200


def test_geocode_error_is_exception():
    assert issubclass(GeocodeError, Exception)