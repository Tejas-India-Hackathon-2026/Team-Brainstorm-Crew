import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") or "https://sync-customer-worker.preview.emergentagent.com"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _demo_login(api, base_url, role):
    r = api.post(f"{base_url}/api/auth/demo-login", json={"role": role}, timeout=30)
    assert r.status_code == 200, f"demo-login {role} failed: {r.status_code} {r.text}"
    data = r.json()
    assert "session_token" in data and "user" in data
    return data["session_token"], data["user"]


@pytest.fixture(scope="session")
def customer_auth(api, base_url):
    tok, user = _demo_login(api, base_url, "customer")
    return {"token": tok, "user": user, "headers": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="session")
def worker_auth(api, base_url):
    tok, user = _demo_login(api, base_url, "worker")
    return {"token": tok, "user": user, "headers": {"Authorization": f"Bearer {tok}"}}
