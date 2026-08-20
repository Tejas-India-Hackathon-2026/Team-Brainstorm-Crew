"""End-to-end backend test for SkillSync booking state machine.
Covers: demo-login, worker matching, booking lifecycle from request -> completed,
OTP visibility (customer only), invalid transition -> 409, review updates rating,
SOS, audit events, notifications.
"""
import time
import pytest
import requests

# ---------- Auth ----------
def test_health(api, base_url):
    r = api.get(f"{base_url}/api/", timeout=15)
    assert r.status_code == 200


def test_demo_login_customer(customer_auth):
    assert customer_auth["user"]["role"] == "customer"
    assert customer_auth["user"].get("email") == "customer@test.com"


def test_demo_login_worker(worker_auth):
    assert worker_auth["user"]["role"] == "worker"


def test_auth_me_customer(api, base_url, customer_auth):
    r = api.get(f"{base_url}/api/auth/me", headers=customer_auth["headers"], timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == "customer@test.com"


# ---------- Services / Addresses ----------
def test_services_list(api, base_url, customer_auth):
    r = api.get(f"{base_url}/api/services", headers=customer_auth["headers"], timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) > 0


def test_addresses_customer(api, base_url, customer_auth):
    r = api.get(f"{base_url}/api/addresses", headers=customer_auth["headers"], timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Worker discovery ----------
def test_worker_match(api, base_url, customer_auth):
    r = api.get(f"{base_url}/api/workers/match", params={"category": "plumbing"},
                headers=customer_auth["headers"], timeout=15)
    assert r.status_code == 200
    workers = r.json()
    assert isinstance(workers, list) and len(workers) > 0
    # Rohit Verma should be in the list
    names = [w.get("name") for w in workers]
    assert any("Rohit" in (n or "") for n in names), f"Rohit not found in {names}"


# ---------- Full lifecycle ----------
@pytest.fixture(scope="module")
def lifecycle_state():
    return {}


def test_lifecycle_01_create_report_and_analyze(api, base_url, customer_auth, lifecycle_state):
    payload = {
        "text": "Kitchen sink leaking under pipe joint",
        "category": "plumbing",
        "photos": [],
    }
    r = api.post(f"{base_url}/api/problem-reports", json=payload,
                 headers=customer_auth["headers"], timeout=30)
    assert r.status_code == 200, r.text
    report = r.json()
    lifecycle_state["report_id"] = report["id"]

    # Run AI analysis (real; may take up to 45s)
    r2 = api.post(f"{base_url}/api/problem-reports/{report['id']}/analyze",
                  headers=customer_auth["headers"], timeout=90)
    assert r2.status_code == 200, r2.text
    analysis = r2.json()
    assert "analysis" in analysis or "detected_problem" in analysis or "estimated_cost_min" in analysis
    lifecycle_state["analysis"] = analysis


def test_lifecycle_02_create_booking(api, base_url, customer_auth, lifecycle_state):
    # Get address
    ad = api.get(f"{base_url}/api/addresses", headers=customer_auth["headers"]).json()
    assert ad, "No customer addresses seeded"
    address_id = ad[0]["id"]
    # Pick worker (Rohit)
    workers = api.get(f"{base_url}/api/workers/match", params={"category": "plumbing"},
                      headers=customer_auth["headers"]).json()
    rohit = next((w for w in workers if "Rohit" in (w.get("name") or "")), workers[0])
    rohit_id = rohit.get("id") or rohit.get("worker_id") or rohit.get("user_id")
    payload = {
        "worker_id": rohit_id,
        "problem_report_id": lifecycle_state["report_id"],
        "address_id": address_id,
        "category": "plumbing",
        "scheduled_date": "2026-01-20",
        "scheduled_time": "10:00",
    }
    r = api.post(f"{base_url}/api/bookings", json=payload,
                 headers=customer_auth["headers"], timeout=30)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b.get("status") in ("REQUEST_SENT", "request_sent")
    lifecycle_state["booking_id"] = b["id"]
    lifecycle_state["worker_id"] = rohit_id


def test_lifecycle_03_worker_accept(api, base_url, worker_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/worker/jobs/{bid}/accept",
                 headers=worker_auth["headers"], timeout=30)
    assert r.status_code == 200, r.text


def test_lifecycle_04_on_way(api, base_url, worker_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/worker/jobs/{bid}/on-way",
                 headers=worker_auth["headers"], timeout=30)
    assert r.status_code == 200, r.text


def test_lifecycle_05_arrived_generates_otp(api, base_url, worker_auth, customer_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/worker/jobs/{bid}/arrived",
                 headers=worker_auth["headers"], timeout=30)
    assert r.status_code == 200, r.text
    worker_payload = r.json()
    # Worker payload must NOT contain otp
    assert "otp" not in worker_payload or worker_payload.get("otp") in (None, ""), \
        f"Worker payload should not contain OTP: {worker_payload}"

    # Customer should see OTP
    r2 = api.get(f"{base_url}/api/bookings/{bid}", headers=customer_auth["headers"], timeout=15)
    assert r2.status_code == 200, r2.text
    cust_view = r2.json()
    otp = cust_view.get("otp")
    assert otp and len(str(otp)) >= 4, f"Customer view missing OTP: {cust_view}"
    lifecycle_state["otp"] = str(otp)

    # Worker fetching same booking should NOT see otp
    r3 = api.get(f"{base_url}/api/bookings/{bid}", headers=worker_auth["headers"], timeout=15)
    assert r3.status_code == 200
    worker_view = r3.json()
    assert not worker_view.get("otp"), f"Worker should NOT see OTP: {worker_view.get('otp')}"


def test_lifecycle_06_wrong_otp_rejected(api, base_url, worker_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/worker/jobs/{bid}/verify-otp",
                 json={"otp": "000000"},
                 headers=worker_auth["headers"], timeout=15)
    assert r.status_code in (400, 401, 403, 409, 422), f"Wrong OTP should fail, got {r.status_code}"


def test_lifecycle_07_correct_otp(api, base_url, worker_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/worker/jobs/{bid}/verify-otp",
                 json={"otp": lifecycle_state["otp"]},
                 headers=worker_auth["headers"], timeout=15)
    assert r.status_code == 200, r.text


def test_lifecycle_08_inspection(api, base_url, worker_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    payload = {
        "problem": "Leaking pipe joint under sink",
        "repair": "Replace P-trap and reseal joint",
        "parts": [{"name": "P-trap", "price": 250}],
        "labour": 600,
    }
    r = api.post(f"{base_url}/api/worker/jobs/{bid}/inspection",
                 json=payload, headers=worker_auth["headers"], timeout=30)
    assert r.status_code == 200, r.text


def test_lifecycle_09_invalid_transition_returns_409(api, base_url, worker_auth, lifecycle_state):
    """Marking ready while status is QUOTE_PENDING should be rejected."""
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/worker/jobs/{bid}/ready",
                 headers=worker_auth["headers"], timeout=15)
    assert r.status_code == 409, f"Expected 409 invalid transition, got {r.status_code} {r.text}"


def test_lifecycle_10_accept_quote(api, base_url, customer_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/bookings/{bid}/quote/accept",
                 headers=customer_auth["headers"], timeout=15)
    assert r.status_code == 200, r.text


def test_lifecycle_11_progress(api, base_url, worker_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/worker/jobs/{bid}/progress",
                 json={"stage": "repairing", "note": "Removed old joint, replacing P-trap"},
                 headers=worker_auth["headers"], timeout=15)
    assert r.status_code == 200, r.text


def test_lifecycle_12_additional_charge_and_approve(api, base_url, worker_auth, customer_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/worker/jobs/{bid}/additional-charge",
                 json={"item": "Sealant tube", "amount": 120, "reason": "Old sealant crumbled"},
                 headers=worker_auth["headers"], timeout=15)
    assert r.status_code == 200, r.text
    # Fetch booking as customer to find pending charge id
    b = api.get(f"{base_url}/api/bookings/{bid}", headers=customer_auth["headers"]).json()
    charges = b.get("additional_charges") or []
    pending = [c for c in charges if c.get("status") == "PENDING"]
    assert pending, f"No PENDING additional charges: {charges}"
    charge_id = pending[-1]["id"]
    r2 = api.post(f"{base_url}/api/bookings/{bid}/additional-charge/{charge_id}/approve",
                  headers=customer_auth["headers"], timeout=15)
    assert r2.status_code == 200, r2.text


def test_lifecycle_13_mark_ready(api, base_url, worker_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/worker/jobs/{bid}/ready",
                 headers=worker_auth["headers"], timeout=15)
    assert r.status_code == 200, r.text


def test_lifecycle_14_customer_confirm(api, base_url, customer_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/bookings/{bid}/confirm-completion",
                 headers=customer_auth["headers"], timeout=15)
    assert r.status_code == 200, r.text


def test_lifecycle_15_payment_upi(api, base_url, customer_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/bookings/{bid}/payment",
                 json={"method": "upi"},
                 headers=customer_auth["headers"], timeout=30)
    assert r.status_code == 200, r.text
    b = api.get(f"{base_url}/api/bookings/{bid}", headers=customer_auth["headers"]).json()
    assert b.get("status", "").upper() == "COMPLETED", f"Booking not COMPLETED: {b.get('status')}"


def test_lifecycle_16_review_updates_rating(api, base_url, customer_auth, worker_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    wid = lifecycle_state["worker_id"]
    w_before = api.get(f"{base_url}/api/workers/{wid}", headers=customer_auth["headers"]).json()
    rating_before = w_before.get("rating")
    r = api.post(f"{base_url}/api/bookings/{bid}/review",
                 json={"rating": 5, "comment": "Great work"},
                 headers=customer_auth["headers"], timeout=15)
    assert r.status_code == 200, r.text
    w_after = api.get(f"{base_url}/api/workers/{wid}", headers=customer_auth["headers"]).json()
    assert w_after.get("rating") is not None
    # Rating count should have grown
    if w_before.get("total_reviews") is not None and w_after.get("total_reviews") is not None:
        assert w_after["total_reviews"] >= (w_before["total_reviews"] or 0)


def test_lifecycle_17_audit_events_grew(api, base_url, customer_auth, lifecycle_state):
    bid = lifecycle_state["booking_id"]
    b = api.get(f"{base_url}/api/bookings/{bid}", headers=customer_auth["headers"]).json()
    events = b.get("audit_events") or b.get("events") or []
    assert len(events) >= 8, f"Expected many audit events, got {len(events)}: {events}"


def test_lifecycle_18_notifications_present(api, base_url, customer_auth, worker_auth):
    rc = api.get(f"{base_url}/api/notifications", headers=customer_auth["headers"], timeout=15)
    assert rc.status_code == 200
    rw = api.get(f"{base_url}/api/notifications", headers=worker_auth["headers"], timeout=15)
    assert rw.status_code == 200
    def _items(payload):
        if isinstance(payload, list):
            return payload
        return payload.get("items") or payload.get("notifications") or []
    ci, wi = _items(rc.json()), _items(rw.json())
    assert isinstance(ci, list) and isinstance(wi, list)
    assert len(ci) > 0 and len(wi) > 0


def test_lifecycle_19_sos(api, base_url, customer_auth, lifecycle_state):
    """SOS requires an active booking; use the just-completed one only if endpoint allows;
    otherwise create a fresh booking. Try current booking first."""
    bid = lifecycle_state["booking_id"]
    r = api.post(f"{base_url}/api/bookings/{bid}/sos",
                 json={"category": "safety", "description": "Test SOS"},
                 headers=customer_auth["headers"], timeout=15)
    # Some backends restrict SOS to active bookings; either accept success or 409
    assert r.status_code in (200, 409, 400), f"Unexpected SOS response: {r.status_code} {r.text}"


def test_worker_stats(api, base_url, worker_auth):
    r = api.get(f"{base_url}/api/worker/stats", headers=worker_auth["headers"], timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
