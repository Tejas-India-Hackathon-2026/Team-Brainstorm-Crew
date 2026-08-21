import os
import pytest
import requests

BASE_URL = os.environ.get("BACKEND_URL", "http://localhost:8000").rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def _demo_login(api_session, host_url, role):
    res = api_session.post(f"{host_url}/api/auth/demo-login", json={"role": role}, timeout=20)
    assert res.status_code == 200, f"Demo login for {role} failed: {res.status_code} {res.text}"
    data = res.json()
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
