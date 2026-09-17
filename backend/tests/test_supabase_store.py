import requests_mock

from hos.adapters.supabase_store import SupabaseStore


URL = "https://wkvtwcfwvxtsjeqsfgkl.supabase.co"
KEY = "service-role-key"


def test_save_posts_row_and_returns_id():
    with requests_mock.Mocker() as m:
        m.post(
            f"{URL}/rest/v1/plans",
            json=[{"id": "00000000-0000-0000-0000-000000000001"}],
            status_code=201,
        )
        store = SupabaseStore(URL, KEY)
        plan_id = store.save({"current_cycle_used_hours": 10.0}, {"days": []})
        assert plan_id == "00000000-0000-0000-0000-000000000001"
        request = m.request_history[0]
        assert request.headers["apikey"] == KEY
        assert request.headers["Authorization"] == f"Bearer {KEY}"
        assert request.headers["Prefer"] == "return=representation"
        assert request.json() == {
            "inputs": {"current_cycle_used_hours": 10.0},
            "plan": {"days": []},
        }


def test_recent_gets_rows_descending():
    rows = [
        {"id": "00000000-0000-0000-0000-000000000002", "inputs": {}, "plan": {}, "created_at": "2026-01-05T06:00:00Z"},
    ]
    with requests_mock.Mocker() as m:
        m.get(
            f"{URL}/rest/v1/plans",
            json=rows,
        )
        store = SupabaseStore(URL, KEY)
        assert store.recent(limit=5) == rows
        request = m.request_history[0]
        assert request.qs["select"] == ["id,inputs,plan,created_at"]
        assert request.qs["order"] == ["created_at.desc"]
        assert request.qs["limit"] == ["5"]