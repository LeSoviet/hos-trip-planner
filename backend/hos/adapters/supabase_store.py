import requests


class SupabaseStore:
    def __init__(self, url, service_role_key):
        self.url = url.rstrip("/")
        self.headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

    def save(self, inputs, plan):
        response = requests.post(
            f"{self.url}/rest/v1/plans",
            headers={**self.headers, "Prefer": "return=representation"},
            json={"inputs": inputs, "plan": plan},
            timeout=10,
        )
        return response.json()[0]["id"]

    def recent(self, limit=20):
        response = requests.get(
            f"{self.url}/rest/v1/plans",
            headers=self.headers,
            params={
                "select": "id,inputs,plan,created_at",
                "order": "created_at.desc",
                "limit": limit,
            },
            timeout=10,
        )
        return response.json()