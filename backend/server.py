"""
SkillSync — Backend API Service.

Unified backend supporting Customer & Technician (Worker) mobile and web applications.
Core capabilities:
- Role-based authentication (Customer & Worker) and session management
- Deterministic 16-state booking machine with audit trail logging
- AI problem diagnostics (OpenAI multimodal + smart local heuristic fallback)
- Real-time technician matching based on Haversine distance, rating, and trade skills
- Secure OTP-gated service start mechanism (customer-isolated verification)
- Itemized digital inspection, quote generation, and change order approvals
- Mock digital payments (UPI / Card / Cash), invoice generation, and technician revenue tracking
- Emergency SOS reporting and customer support ticketing
"""

import asyncio
import base64
import json
import logging
import math
import os
import random
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

# -----------------------------------------------------------------------------
# Configuration & Environment
# -----------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "skillsync_db")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Database client
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("skillsync")

app = FastAPI(
    title="SkillSync API",
    description="Hyperlocal On-Demand Home Services & AI Diagnostics Platform",
    version="1.0.0",
)
api = APIRouter(prefix="/api")

APP_NAME = "skillsync"
NO_ID = {"_id": 0}

VISIT_CHARGE = 149
PLATFORM_FEE_PCT = 0.10
TRAVEL_SECONDS = 90  # Simulated travel time in demo mode


# -----------------------------------------------------------------------------
# Utility Helpers
# -----------------------------------------------------------------------------
def now_utc() -> datetime:
    """Return the current time in UTC with timezone awareness."""
    return datetime.now(timezone.utc)


def now_iso() -> str:
    """Return the current UTC timestamp formatted as ISO-8601 string."""
    return now_utc().isoformat()


def new_id() -> str:
    """Generate a unique random hex identifier."""
    return uuid.uuid4().hex


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two geographic coordinates in kilometers."""
    r = 6371.0  # Earth radius in kilometers
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def masked_phone(phone: Optional[str]) -> str:
    """Mask phone numbers for client-facing privacy preservation."""
    if not phone or len(phone) < 6:
        return "+91 9XXXX XXX00"
    return phone[:3] + " " + phone[3:5] + "XXX XX" + phone[-2:]


# -----------------------------------------------------------------------------
# Storage Manager (Local Filesystem with Optional Cloud Proxy)
# -----------------------------------------------------------------------------
STORAGE_PROXY_URL = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip()


def save_local_file(relative_path: str, data: bytes) -> str:
    """Persist file to the local uploads directory."""
    dest = UPLOAD_DIR / relative_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        f.write(data)
    return str(relative_path).replace("\\", "/")


def read_local_file(relative_path: str) -> Tuple[bytes, str]:
    """Read file content and determine media type from local storage."""
    file_path = UPLOAD_DIR / relative_path
    if not file_path.is_file():
        raise FileNotFoundError(f"File not found: {relative_path}")
    ext = file_path.suffix.lower().lstrip(".")
    mime_map = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
        "m4a": "audio/mp4",
        "mp3": "audio/mpeg",
        "mp4": "video/mp4",
    }
    content_type = mime_map.get(ext, "application/octet-stream")
    with open(file_path, "rb") as f:
        data = f.read()
    return data, content_type


# -----------------------------------------------------------------------------
# Categories & Booking State Machine
# -----------------------------------------------------------------------------
CATEGORIES = [
    {"id": "plumbing", "name": "Plumbing", "name_hi": "प्लंबिंग", "icon": "water", "color": "#2563EB", "count": "120+"},
    {"id": "electrical", "name": "Electrical", "name_hi": "इलेक्ट्रिकल", "icon": "flash", "color": "#F59E0B", "count": "95+"},
    {"id": "ac_repair", "name": "AC Repair", "name_hi": "एसी रिपेयर", "icon": "snow", "color": "#0EA5E9", "count": "85+"},
    {"id": "refrigerator", "name": "Refrigerator", "name_hi": "फ्रिज", "icon": "cube", "color": "#10B981", "count": "70+"},
    {"id": "washing_machine", "name": "Washing Machine", "name_hi": "वॉशिंग मशीन", "icon": "sync", "color": "#8B5CF6", "count": "65+"},
    {"id": "tv_repair", "name": "TV Repair", "name_hi": "टीवी रिपेयर", "icon": "tv", "color": "#EF4444", "count": "55+"},
    {"id": "ro_repair", "name": "RO Repair", "name_hi": "आरओ रिपेयर", "icon": "water-outline", "color": "#06B6D4", "count": "40+"},
    {"id": "carpenter", "name": "Carpenter", "name_hi": "बढ़ई", "icon": "hammer", "color": "#B45309", "count": "90+"},
    {"id": "painter", "name": "Painter", "name_hi": "पेंटर", "icon": "color-palette", "color": "#22C55E", "count": "75+"},
    {"id": "mason", "name": "Mason", "name_hi": "राजमिस्त्री", "icon": "construct", "color": "#F97316", "count": "60+"},
    {"id": "computer", "name": "Computer", "name_hi": "कंप्यूटर", "icon": "laptop", "color": "#6366F1", "count": "50+"},
    {"id": "other", "name": "Other", "name_hi": "अन्य", "icon": "apps", "color": "#64748B", "count": "45+"},
]
CATEGORY_IDS = {c["id"] for c in CATEGORIES}
CATEGORY_NAMES = {c["id"]: c["name"] for c in CATEGORIES}

TRANSITIONS = {
    "REQUEST_SENT": ["WORKER_ACCEPTED", "WORKER_REJECTED", "CANCELLED"],
    "WORKER_REJECTED": ["REQUEST_SENT", "CANCELLED"],
    "WORKER_ACCEPTED": ["WORKER_ON_WAY", "CANCELLED"],
    "WORKER_ON_WAY": ["WORKER_ARRIVED", "CANCELLED"],
    "WORKER_ARRIVED": ["OTP_VERIFIED", "CANCELLED"],
    "OTP_VERIFIED": ["INSPECTION"],
    "INSPECTION": ["QUOTE_PENDING"],
    "QUOTE_PENDING": ["QUOTE_ACCEPTED", "QUOTE_REJECTED"],
    "QUOTE_ACCEPTED": ["WORK_STARTED"],
    "QUOTE_REJECTED": ["CANCELLED"],
    "WORK_STARTED": ["ADDITIONAL_CHARGE_PENDING", "READY_FOR_COMPLETION"],
    "ADDITIONAL_CHARGE_PENDING": ["WORK_STARTED"],
    "READY_FOR_COMPLETION": ["PAYMENT_PENDING"],
    "PAYMENT_PENDING": ["PAYMENT_SUCCESS"],
    "PAYMENT_SUCCESS": ["COMPLETED"],
    "COMPLETED": [],
    "CANCELLED": [],
}


# -----------------------------------------------------------------------------
# User Authentication & Verification Helpers
# -----------------------------------------------------------------------------
async def get_user_from_token(token: str) -> Optional[dict]:
    """Retrieve active user document associated with a session token."""
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, NO_ID)
    if not session:
        return None
    expires = session.get("expires_at")
    if expires:
        exp_dt = datetime.fromisoformat(expires)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        if exp_dt < now_utc():
            return None
    return await db.users.find_one({"user_id": session["user_id"]}, NO_ID)


async def require_user(request: Request, role: Optional[str] = None) -> dict:
    """Dependency validator ensuring caller is authenticated and possesses requested role."""
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.query_params.get("token", "")
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if role and user.get("role") != role:
        raise HTTPException(status_code=403, detail=f"Access forbidden: requires {role} role")
    return user


async def create_session(user_id: str) -> str:
    """Generate and store a new user session token with 7-day expiry."""
    token = uuid.uuid4().hex + uuid.uuid4().hex
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "created_at": now_iso(),
        "expires_at": (now_utc() + timedelta(days=7)).isoformat(),
    })
    return token


def public_user(user: dict) -> dict:
    """Strip private fields prior to sending user data to client."""
    return {k: v for k, v in user.items() if k not in ("_id", "password")}


def worker_card(w: dict, lat: Optional[float] = None, lng: Optional[float] = None) -> dict:
    """Format technician profile into client card summary with calculated distance & ETA."""
    wp = w.get("worker_profile", {})
    dist = None
    eta = None
    if lat is not None and lng is not None and wp.get("base_lat") is not None:
        dist = round(haversine_km(lat, lng, wp["base_lat"], wp["base_lng"]), 1)
        eta = max(5, int(dist / 25 * 60) + 8)
    return {
        "worker_id": w["user_id"],
        "name": w["name"],
        "picture": w.get("picture"),
        "phone_masked": masked_phone(w.get("phone")),
        "skills": wp.get("skills", []),
        "categories": wp.get("categories", []),
        "experience_years": wp.get("experience_years", 0),
        "rating": wp.get("rating", 0),
        "total_reviews": wp.get("total_reviews", 0),
        "completed_jobs": wp.get("completed_jobs", 0),
        "verification": wp.get("verification", "PENDING"),
        "online": wp.get("online", False),
        "city": wp.get("city"),
        "bio": wp.get("bio"),
        "distance_km": dist,
        "eta_min": eta,
    }


# -----------------------------------------------------------------------------
# Event Logging & Notifications
# -----------------------------------------------------------------------------
async def record_event(
    booking_id: str,
    event_type: str,
    actor_id: str,
    actor_role: str,
    metadata: Optional[dict] = None,
):
    """Persist an immutable state change or action to the booking audit trail."""
    await db.booking_events.insert_one({
        "id": new_id(),
        "booking_id": booking_id,
        "event_type": event_type,
        "actor_id": actor_id,
        "actor_role": actor_role,
        "metadata": metadata or {},
        "timestamp": now_iso(),
    })


async def notify(
    user_id: str,
    title: str,
    body: str,
    ntype: str,
    booking_id: Optional[str] = None,
):
    """Enqueue an in-app notification for a user."""
    await db.notifications.insert_one({
        "id": new_id(),
        "user_id": user_id,
        "title": title,
        "body": body,
        "type": ntype,
        "booking_id": booking_id,
        "read": False,
        "created_at": now_iso(),
    })


async def set_status(
    booking: dict,
    new_status: str,
    actor: dict,
    event_type: str,
    metadata: Optional[dict] = None,
    extra: Optional[dict] = None,
) -> dict:
    """Enforce state machine transition validation, update booking, and log audit event."""
    current = booking["status"]
    if new_status not in TRANSITIONS.get(current, []):
        raise HTTPException(
            status_code=409,
            detail=f"Invalid state transition: '{current}' to '{new_status}' is not permitted",
        )
    update = {"status": new_status, "updated_at": now_iso()}
    if extra:
        update.update(extra)
    await db.bookings.update_one({"id": booking["id"]}, {"$set": update})
    booking.update(update)
    await record_event(
        booking["id"],
        event_type,
        actor.get("user_id", "system"),
        actor.get("role", "system"),
        {**(metadata or {}), "from": current, "to": new_status},
    )
    return booking


# -----------------------------------------------------------------------------
# AI Diagnostics Engine
# -----------------------------------------------------------------------------
FALLBACK_ESTIMATES = {
    "plumbing": (450, 900),
    "electrical": (300, 800),
    "ac_repair": (500, 1500),
    "refrigerator": (400, 1200),
    "washing_machine": (400, 1100),
    "tv_repair": (350, 1000),
    "ro_repair": (300, 900),
    "carpenter": (400, 1200),
    "painter": (800, 2500),
    "mason": (600, 2000),
    "computer": (300, 1000),
    "other": (300, 900),
}


def fallback_analysis(category: str, text: str) -> dict:
    """Smart heuristic fallback when AI model is offline or unconfigured."""
    cat_clean = category if category in CATEGORY_IDS else "other"
    lo, hi = FALLBACK_ESTIMATES.get(cat_clean, (300, 900))
    cat_title = CATEGORY_NAMES.get(cat_clean, "General Repair")

    # Contextual adjustments based on keywords
    t = text.lower()
    severity = "Medium"
    confidence = 88
    causes = ["Component wear and tear", "Mechanical degradation", "Installation misalignment"]
    safety = []
    actions = ["Schedule an on-site technician inspection", "Turn off main power/water if leakage is active"]

    if "leak" in t or "water" in t or "burst" in t:
        detected = f"{cat_title} — Pipe / Joint Leakage"
        safety.append("Shut off the main supply valve to prevent property water damage")
        causes = ["Worn washer/seal", "Pipe corrosion", "High water pressure joint rupture"]
    elif "spark" in t or "smoke" in t or "shock" in t or "smell" in t:
        detected = f"{cat_title} — Electrical Hazard / Short Circuit"
        severity = "High"
        safety.append("Do not touch wet surfaces near the appliance. Switch off the main MCB breaker.")
        causes = ["Insulation breakdown", "Loose wiring terminal", "Overloaded electrical circuit"]
    elif "cool" in t or "noise" in t or "sound" in t:
        detected = f"{cat_title} — Compressor / Motor Malfunction"
        causes = ["Refrigerant gas leakage", "Faulty capacitor", "Motor bearing friction"]
    else:
        detected = f"{cat_title} — Diagnostic Inspection Required"

    return {
        "detected_problem": detected,
        "category": cat_clean,
        "description": f"Preliminary analysis indicates a {cat_title.lower()} issue requiring verified inspection. Standard diagnostic rates apply.",
        "possible_causes": causes,
        "severity": severity,
        "confidence": confidence,
        "safety_warnings": safety,
        "recommended_actions": actions,
        "estimated_min": lo,
        "estimated_max": hi,
        "ai_available": bool(OPENAI_API_KEY),
    }


async def run_ai_analysis(report: dict) -> dict:
    """Perform multimodal OpenAI vision & text diagnostic analysis."""
    if not OPENAI_API_KEY:
        return fallback_analysis(report.get("category", "other"), report.get("text", ""))

    images_b64 = []
    for path in report.get("media_paths", [])[:3]:
        try:
            content, _ = await run_in_threadpool(read_local_file, path)
            images_b64.append(base64.b64encode(content).decode("utf-8"))
        except Exception as err:
            logger.warning(f"Failed loading media for AI analysis: {err}")

    prompt = (
        f"Category: {CATEGORY_NAMES.get(report.get('category'), 'Unknown')}\n"
        f"Customer description: {report.get('text') or '(Rely on attached photo)'}\n"
        f"Number of attached photos: {len(images_b64)}"
    )

    system_prompt = (
        "You are SkillSync's home-repair diagnostic AI for the Indian home service market.\n"
        "Analyze the customer's problem description and photos, then respond with ONLY a valid JSON object:\n"
        "{\n"
        '  "detected_problem": "Short title (e.g. Leaking Sink Pipe)",\n'
        '  "category": "plumbing|electrical|ac_repair|refrigerator|washing_machine|tv_repair|ro_repair|carpenter|painter|mason|computer|other",\n'
        '  "description": "2-3 sentence explanation",\n'
        '  "possible_causes": ["Cause 1", "Cause 2", "Cause 3"],\n'
        '  "severity": "Low|Medium|High",\n'
        '  "confidence": 85,\n'
        '  "safety_warnings": ["Warning 1"],\n'
        '  "recommended_actions": ["Action 1", "Action 2"],\n'
        '  "estimated_min": 300,\n'
        '  "estimated_max": 900\n'
        "}\n"
        "Estimates must reflect realistic Indian INR market rates."
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client_http:
            content_payload: List[Dict[str, Any]] = [{"type": "text", "text": prompt}]
            for img in images_b64:
                content_payload.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img}"},
                })

            response = await client_http.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": content_payload},
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            res_json = response.json()
            raw_text = res_json["choices"][0]["message"]["content"]
            data = json.loads(raw_text)
            data["confidence"] = int(data.get("confidence", 85))
            data["estimated_min"] = int(data.get("estimated_min", 300))
            data["estimated_max"] = int(data.get("estimated_max", 900))
            if data.get("category") not in CATEGORY_IDS:
                data["category"] = report.get("category") or "other"
            data["ai_available"] = True
            return data
    except Exception as exc:
        logger.error(f"OpenAI diagnostic request failed: {exc}. Falling back to heuristic engine.")
        return fallback_analysis(report.get("category", "other"), report.get("text", ""))


# -----------------------------------------------------------------------------
# Request & Response Data Models
# -----------------------------------------------------------------------------
class SessionBody(BaseModel):
    session_id: str
    role: Optional[str] = None


class DemoLoginBody(BaseModel):
    role: str


class ProfileBody(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None


class AddressBody(BaseModel):
    label: str = "Home"
    line: str
    city: str = "Lucknow"
    state: str = "Uttar Pradesh"
    pincode: str = ""
    lat: float = 26.8467
    lng: float = 80.9462


class ReportBody(BaseModel):
    category: str
    text: str = ""
    media_paths: List[str] = []
    priority: bool = False


class BookingBody(BaseModel):
    worker_id: str
    category: str
    problem_report_id: Optional[str] = None
    address_id: Optional[str] = None
    address: Optional[AddressBody] = None
    scheduled_date: str
    scheduled_time: str
    description: str = ""
    instructions: str = ""
    priority: bool = False


class CancelBody(BaseModel):
    reason: str = ""


class RejectQuoteBody(BaseModel):
    confirm_visit_charge: bool = False


class OtpBody(BaseModel):
    otp: str


class PartItem(BaseModel):
    name: str
    price: float


class InspectionBody(BaseModel):
    problem: str
    repair: str
    parts: List[PartItem] = []
    labour: float
    eta_minutes: int = 60
    notes: str = ""
    image_paths: List[str] = []


class ProgressBody(BaseModel):
    stage: str
    note: str = ""
    image_path: Optional[str] = None
    kind: str = "progress"  # progress | before | after


class ChargeBody(BaseModel):
    reason: str
    item: str
    amount: float
    note: str = ""
    image_path: Optional[str] = None


class PaymentBody(BaseModel):
    method: str  # upi | card | cash


class ReviewBody(BaseModel):
    rating: int
    behaviour: int = 5
    quality: int = 5
    price: int = 5
    comment: str = ""


class SosBody(BaseModel):
    category: str
    description: str = ""


class SupportBody(BaseModel):
    category: str
    subject: str
    description: str
    booking_id: Optional[str] = None


class KycBody(BaseModel):
    phone: str
    address: str
    city: str = "Lucknow"
    skills: List[str] = []
    categories: List[str] = []
    experience_years: int = 1
    id_document: str = "aadhaar"
    service_radius_km: int = 15


class AvailabilityBody(BaseModel):
    online: bool


class WorkerProfileBody(BaseModel):
    skills: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    bio: Optional[str] = None
    service_radius_km: Optional[int] = None
    city: Optional[str] = None


# -----------------------------------------------------------------------------
# Authentication Routes
# -----------------------------------------------------------------------------
@api.post("/auth/session")
async def auth_session(body: SessionBody):
    """Exchange external OAuth session ID for user authentication token."""
    email = f"user_{body.session_id[:8]}@example.com"
    existing = await db.users.find_one({"email": email}, NO_ID)
    if existing:
        user = existing
    else:
        role = body.role if body.role in ("customer", "worker") else "customer"
        user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": email,
            "name": f"User {body.session_id[:4]}",
            "picture": None,
            "role": role,
            "phone": None,
            "language": "en",
            "created_at": now_iso(),
        }
        if role == "worker":
            user["worker_profile"] = {
                "skills": [],
                "categories": [],
                "experience_years": 0,
                "rating": 0,
                "total_reviews": 0,
                "completed_jobs": 0,
                "verification": "PENDING",
                "online": False,
                "base_lat": 26.8467,
                "base_lng": 80.9462,
                "service_radius_km": 15,
                "city": "Lucknow",
                "bio": "",
            }
        await db.users.insert_one({**user})

    session_token = await create_session(user["user_id"])
    fresh = await db.users.find_one({"user_id": user["user_id"]}, NO_ID)
    return {"session_token": session_token, "user": public_user(fresh)}


@api.post("/auth/demo-login")
async def demo_login(body: DemoLoginBody):
    """Authenticate instantly using seeded development accounts."""
    email = "customer@test.com" if body.role == "customer" else "worker@test.com"
    user = await db.users.find_one({"email": email}, NO_ID)
    if not user:
        raise HTTPException(status_code=404, detail="Demo account not seeded in database")
    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api.get("/auth/me")
async def auth_me(request: Request):
    """Retrieve current authenticated profile."""
    user = await require_user(request)
    return public_user(user)


@api.post("/auth/logout")
async def auth_logout(request: Request):
    """Invalidate current session token."""
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


@api.put("/profile")
async def update_profile(request: Request, body: ProfileBody):
    """Update general user profile attributes."""
    user = await require_user(request)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    return public_user(await db.users.find_one({"user_id": user["user_id"]}, NO_ID))


# -----------------------------------------------------------------------------
# Services & Addresses
# -----------------------------------------------------------------------------
@api.get("/services")
async def get_services():
    """List all available repair & maintenance service categories."""
    return CATEGORIES


@api.get("/addresses")
async def list_addresses(request: Request):
    """Fetch saved delivery addresses for the logged-in customer."""
    user = await require_user(request)
    return await db.addresses.find({"user_id": user["user_id"]}, NO_ID).to_list(50)


@api.post("/addresses")
async def add_address(request: Request, body: AddressBody):
    """Save a new delivery address with GPS coordinates."""
    user = await require_user(request)
    doc = {"id": new_id(), "user_id": user["user_id"], **body.model_dump(), "created_at": now_iso()}
    await db.addresses.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api.delete("/addresses/{address_id}")
async def delete_address(request: Request, address_id: str):
    """Delete a saved address."""
    user = await require_user(request)
    await db.addresses.delete_one({"id": address_id, "user_id": user["user_id"]})
    return {"ok": True}


# -----------------------------------------------------------------------------
# Media Storage Upload & Stream
# -----------------------------------------------------------------------------
@api.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """Upload diagnostic or proof media (photos/audio)."""
    user = await require_user(request)
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds maximum size limit (10MB)")

    ext = (file.filename or "file.jpg").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "m4a", "mp3", "mp4"):
        ext = "jpg"

    rel_path = f"uploads/{user['user_id']}/{new_id()}.{ext}"
    await run_in_threadpool(save_local_file, rel_path, data)

    await db.media.insert_one({
        "id": new_id(),
        "owner_id": user["user_id"],
        "storage_path": rel_path,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(data),
        "created_at": now_iso(),
    })
    return {"path": rel_path}


@api.get("/files/{path:path}")
async def get_file(request: Request, path: str):
    """Stream stored media file to authenticated client."""
    await require_user(request)
    media = await db.media.find_one({"storage_path": path}, NO_ID)
    if not media:
        raise HTTPException(status_code=404, detail="Requested file not found")
    try:
        content, ctype = await run_in_threadpool(read_local_file, path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File missing from storage")
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "private, max-age=86400"})


# -----------------------------------------------------------------------------
# Problem Reports & Diagnostics
# -----------------------------------------------------------------------------
@api.post("/problem-reports")
async def create_report(request: Request, body: ReportBody):
    """Create a new service request issue report."""
    user = await require_user(request, role="customer")
    if body.category not in CATEGORY_IDS:
        raise HTTPException(status_code=400, detail="Invalid service category specified")
    doc = {
        "id": new_id(),
        "customer_id": user["user_id"],
        "category": body.category,
        "text": body.text,
        "media_paths": body.media_paths,
        "priority": body.priority,
        "status": "ANALYZING",
        "analysis": None,
        "created_at": now_iso(),
    }
    await db.problem_reports.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api.post("/problem-reports/{report_id}/analyze")
async def analyze_report(request: Request, report_id: str):
    """Execute AI problem diagnosis on an existing report."""
    user = await require_user(request, role="customer")
    report = await db.problem_reports.find_one({"id": report_id, "customer_id": user["user_id"]}, NO_ID)
    if not report:
        raise HTTPException(status_code=404, detail="Problem report not found")
    if report.get("analysis"):
        return report

    try:
        analysis = await asyncio.wait_for(run_ai_analysis(report), timeout=40)
    except Exception as exc:
        logger.error(f"AI diagnosis timed out or failed: {exc}")
        analysis = fallback_analysis(report.get("category", "other"), report.get("text", ""))

    analysis["id"] = new_id()
    analysis["analyzed_at"] = now_iso()
    await db.ai_analyses.insert_one({**analysis, "report_id": report_id, "customer_id": user["user_id"]})
    await db.problem_reports.update_one({"id": report_id}, {"$set": {"analysis": analysis, "status": "ANALYZED"}})
    report["analysis"] = analysis
    report["status"] = "ANALYZED"
    return report


@api.get("/problem-reports/{report_id}")
async def get_report(request: Request, report_id: str):
    """Fetch report details by ID."""
    user = await require_user(request, role="customer")
    report = await db.problem_reports.find_one({"id": report_id, "customer_id": user["user_id"]}, NO_ID)
    if not report:
        raise HTTPException(status_code=404, detail="Problem report not found")
    return report


# -----------------------------------------------------------------------------
# Technician Matching & Discovery
# -----------------------------------------------------------------------------
async def find_workers(category: str, lat: float, lng: float, exclude: Optional[List[str]] = None) -> List[dict]:
    """Rank available verified technicians by distance, rating, and experience."""
    exclude = exclude or []
    cursor = db.users.find({
        "role": "worker",
        "worker_profile.verification": "VERIFIED",
        "worker_profile.online": True,
        "worker_profile.categories": category,
        "user_id": {"$nin": exclude},
    }, NO_ID)
    workers = await cursor.to_list(100)
    cards = [worker_card(w, lat, lng) for w in workers]
    cards = [c for c in cards if c["distance_km"] is None or c["distance_km"] <= 35]
    cards.sort(key=lambda c: ((c["distance_km"] or 99) * 0.4 - c["rating"] * 2 - c["experience_years"] * 0.2))
    return cards


@api.get("/workers/match")
async def match_workers(request: Request, category: str, lat: float = 26.8467, lng: float = 80.9462):
    """Find nearby available technicians matching service category."""
    await require_user(request, role="customer")
    return await find_workers(category, lat, lng)


@api.get("/workers/{worker_id}")
async def get_worker(request: Request, worker_id: str):
    """Retrieve full technician public profile and verified customer reviews."""
    await require_user(request)
    w = await db.users.find_one({"user_id": worker_id, "role": "worker"}, NO_ID)
    if not w:
        raise HTTPException(status_code=404, detail="Technician not found")
    card = worker_card(w)
    reviews = await db.reviews.find({"worker_id": worker_id}, NO_ID).sort("created_at", -1).to_list(15)
    return {**card, "reviews": reviews}


# -----------------------------------------------------------------------------
# Booking Serialization & Helpers
# -----------------------------------------------------------------------------
async def booking_payload(booking: dict, viewer: dict) -> dict:
    """Format booking data for API response, enforcing strict role-based data isolation."""
    b = {k: v for k, v in booking.items() if k != "_id"}
    is_customer = viewer["role"] == "customer"
    if not is_customer:
        b.pop("otp", None)  # OTP is never exposed in technician responses

    customer = await db.users.find_one({"user_id": b["customer_id"]}, NO_ID)
    worker = await db.users.find_one({"user_id": b["worker_id"]}, NO_ID) if b.get("worker_id") else None

    b["customer"] = {
        "name": customer["name"],
        "picture": customer.get("picture"),
        "phone_masked": masked_phone(customer.get("phone")),
    } if customer else None

    b["worker"] = worker_card(worker) if worker else None
    b["events"] = await db.booking_events.find({"booking_id": b["id"]}, NO_ID).sort("timestamp", 1).to_list(200)

    # Calculate simulated GPS location while technician is on the way
    if b["status"] == "WORKER_ON_WAY" and b.get("on_way_at") and worker:
        wp = worker.get("worker_profile", {})
        addr = b.get("address", {})
        started = datetime.fromisoformat(b["on_way_at"])
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        prog = min(1.0, (now_utc() - started).total_seconds() / TRAVEL_SECONDS)
        base_lat = wp.get("base_lat", 26.85)
        base_lng = wp.get("base_lng", 80.95)
        dest_lat = addr.get("lat", 26.8467)
        dest_lng = addr.get("lng", 80.9462)

        wlat = base_lat + (dest_lat - base_lat) * prog
        wlng = base_lng + (dest_lng - base_lng) * prog
        total_km = haversine_km(base_lat, base_lng, dest_lat, dest_lng) or 0.5
        remaining = max(0.0, total_km * (1 - prog))
        b["worker_location"] = {
            "lat": wlat,
            "lng": wlng,
            "progress": round(prog, 2),
            "distance_km": round(remaining, 2),
            "eta_min": max(0, int((1 - prog) * TRAVEL_SECONDS / 60 * 3) + (1 if prog < 1 else 0)),
        }
    return b


def compute_total(b: dict) -> float:
    """Calculate aggregate total invoice amount including approved additional charges."""
    total = (b.get("quote") or {}).get("total", 0) or 0
    for c in b.get("additional_charges", []):
        if c.get("status") == "APPROVED":
            total += c["amount"]
    return round(total, 2)


async def load_booking_for(user: dict, booking_id: str, as_role: str) -> dict:
    """Load booking and verify that current user is an authorized participant."""
    booking = await db.bookings.find_one({"id": booking_id}, NO_ID)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")
    owner = booking["customer_id"] if as_role == "customer" else booking.get("worker_id")
    if user["user_id"] != owner:
        raise HTTPException(status_code=403, detail="Unauthorized: you do not participate in this booking")
    return booking


# -----------------------------------------------------------------------------
# Customer Booking Workflow Routes
# -----------------------------------------------------------------------------
@api.post("/bookings")
async def create_booking(request: Request, body: BookingBody):
    """Create and dispatch a new booking request to a technician."""
    user = await require_user(request, role="customer")
    if body.category not in CATEGORY_IDS:
        raise HTTPException(status_code=400, detail="Invalid service category")

    worker = await db.users.find_one({"user_id": body.worker_id, "role": "worker"}, NO_ID)
    if not worker:
        raise HTTPException(status_code=404, detail="Selected technician not found")
    if worker.get("worker_profile", {}).get("verification") != "VERIFIED":
        raise HTTPException(status_code=400, detail="Technician account is not verified")

    address = None
    if body.address_id:
        address = await db.addresses.find_one({"id": body.address_id, "user_id": user["user_id"]}, NO_ID)
    if not address and body.address:
        address = {"id": new_id(), "user_id": user["user_id"], **body.address.model_dump(), "created_at": now_iso()}
        await db.addresses.insert_one({**address})
        address.pop("_id", None)
    if not address:
        raise HTTPException(status_code=400, detail="A valid service address is required")

    report = None
    if body.problem_report_id:
        report = await db.problem_reports.find_one(
            {"id": body.problem_report_id, "customer_id": user["user_id"]}, NO_ID
        )

    analysis = (report or {}).get("analysis")
    booking = {
        "id": new_id(),
        "booking_number": "SS-" + uuid.uuid4().hex[:6].upper(),
        "customer_id": user["user_id"],
        "worker_id": body.worker_id,
        "category": body.category,
        "service_name": CATEGORY_NAMES[body.category],
        "problem_report_id": body.problem_report_id,
        "ai_estimate": {
            "min": analysis["estimated_min"],
            "max": analysis["estimated_max"],
            "detected_problem": analysis["detected_problem"],
            "severity": analysis["severity"],
            "confidence": analysis["confidence"],
        } if analysis else None,
        "media_paths": (report or {}).get("media_paths", []),
        "address": {k: address[k] for k in ("id", "label", "line", "city", "state", "pincode", "lat", "lng")},
        "scheduled_date": body.scheduled_date,
        "scheduled_time": body.scheduled_time,
        "description": body.description or (report or {}).get("text", ""),
        "instructions": body.instructions,
        "priority": body.priority or (report or {}).get("priority", False),
        "status": "REQUEST_SENT",
        "rejected_worker_ids": [],
        "otp": None,
        "otp_verified_at": None,
        "on_way_at": None,
        "arrived_at": None,
        "service_started_at": None,
        "completed_at": None,
        "quote": None,
        "additional_charges": [],
        "progress": [],
        "before_images": [],
        "after_images": [],
        "inspection": None,
        "visit_charge": VISIT_CHARGE,
        "total_amount": 0,
        "payment": None,
        "invoice": None,
        "review": None,
        "cancel_reason": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.bookings.insert_one({**booking})
    await record_event(
        booking["id"],
        "BOOKING_CREATED",
        user["user_id"],
        "customer",
        {"category": body.category, "worker_id": body.worker_id},
    )
    await notify(
        body.worker_id,
        "New Job Request",
        f"{CATEGORY_NAMES[body.category]} — {booking['description'][:60] or 'New service appointment'}",
        "NEW_JOB",
        booking["id"],
    )
    await notify(
        user["user_id"],
        "Booking Dispatched",
        f"Request {booking['booking_number']} sent to {worker['name']}. Waiting for acceptance.",
        "BOOKING_CREATED",
        booking["id"],
    )
    return await booking_payload(booking, user)


@api.get("/bookings")
async def list_bookings(request: Request):
    """Retrieve all bookings for the authenticated customer or technician."""
    user = await require_user(request)
    query = {"customer_id": user["user_id"]} if user["role"] == "customer" else {"worker_id": user["user_id"]}
    items = await db.bookings.find(query, NO_ID).sort("created_at", -1).to_list(200)
    out = []
    for b in items:
        worker = await db.users.find_one({"user_id": b["worker_id"]}, NO_ID) if b.get("worker_id") else None
        customer = await db.users.find_one({"user_id": b["customer_id"]}, NO_ID)
        out.append({
            "id": b["id"],
            "booking_number": b["booking_number"],
            "category": b["category"],
            "service_name": b["service_name"],
            "status": b["status"],
            "scheduled_date": b["scheduled_date"],
            "scheduled_time": b["scheduled_time"],
            "description": b.get("description", ""),
            "priority": b.get("priority", False),
            "total_amount": b.get("total_amount", 0),
            "ai_estimate": b.get("ai_estimate"),
            "worker_name": worker["name"] if worker else None,
            "customer_name": customer["name"] if customer else None,
            "address_line": b.get("address", {}).get("line", ""),
            "created_at": b["created_at"],
            "updated_at": b["updated_at"],
            "review": b.get("review"),
        })
    return out


@api.get("/bookings/{booking_id}")
async def get_booking(request: Request, booking_id: str):
    """Fetch complete detail view of a single booking."""
    user = await require_user(request)
    booking = await db.bookings.find_one({"id": booking_id}, NO_ID)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user["user_id"] not in (booking["customer_id"], booking.get("worker_id")):
        raise HTTPException(status_code=403, detail="Unauthorized to view this booking")
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/cancel")
async def cancel_booking(request: Request, booking_id: str, body: CancelBody):
    """Cancel a booking prior to job commencement."""
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    if booking["status"] not in ("REQUEST_SENT", "WORKER_ACCEPTED", "WORKER_ON_WAY", "WORKER_ARRIVED", "WORKER_REJECTED"):
        raise HTTPException(status_code=409, detail="Booking cannot be cancelled after service has started")
    await set_status(
        booking,
        "CANCELLED",
        user,
        "BOOKING_CANCELLED",
        {"reason": body.reason},
        {"cancel_reason": body.reason},
    )
    if booking.get("worker_id"):
        await notify(
            booking["worker_id"],
            "Job Cancelled",
            f"Booking {booking['booking_number']} was cancelled by the customer.",
            "JOB_CANCELLED",
            booking_id,
        )
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/quote/accept")
async def accept_quote(request: Request, booking_id: str):
    """Customer approves technician's itemized repair quote."""
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    await set_status(
        booking,
        "QUOTE_ACCEPTED",
        user,
        "QUOTE_ACCEPTED",
        {"total": (booking.get("quote") or {}).get("total")},
    )
    await set_status(
        booking,
        "WORK_STARTED",
        user,
        "WORK_STARTED",
        extra={"total_amount": compute_total(booking)},
    )
    await notify(
        booking["worker_id"],
        "Quote Approved",
        f"Customer approved your quote of ₹{(booking.get('quote') or {}).get('total', 0):.0f}. You may proceed with the repair.",
        "QUOTE_ACCEPTED",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/quote/reject")
async def reject_quote(request: Request, booking_id: str, body: RejectQuoteBody):
    """Customer declines technician quote. Standard inspection fee is applied."""
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    if not body.confirm_visit_charge:
        raise HTTPException(status_code=400, detail=f"Please confirm the ₹{VISIT_CHARGE} inspection fee to decline the repair quote")
    await set_status(booking, "QUOTE_REJECTED", user, "QUOTE_REJECTED", {"visit_charge": VISIT_CHARGE})
    await set_status(
        booking,
        "CANCELLED",
        user,
        "BOOKING_CANCELLED",
        {"reason": "Quote rejected by customer"},
        {"cancel_reason": "Quote rejected", "total_amount": VISIT_CHARGE},
    )
    await notify(
        booking["worker_id"],
        "Quote Declined",
        f"Customer declined the repair quote for {booking['booking_number']}. Visit fee of ₹{VISIT_CHARGE} applies.",
        "QUOTE_REJECTED",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/additional-charge/{charge_id}/approve")
async def approve_charge(request: Request, booking_id: str, charge_id: str):
    """Approve an unexpected additional part or labour charge."""
    return await _resolve_charge(request, booking_id, charge_id, True)


@api.post("/bookings/{booking_id}/additional-charge/{charge_id}/reject")
async def reject_charge(request: Request, booking_id: str, charge_id: str):
    """Decline an additional charge requested by technician."""
    return await _resolve_charge(request, booking_id, charge_id, False)


async def _resolve_charge(request: Request, booking_id: str, charge_id: str, approve: bool):
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    charges = booking.get("additional_charges", [])
    charge = next((c for c in charges if c["id"] == charge_id and c["status"] == "PENDING"), None)
    if not charge:
        raise HTTPException(status_code=404, detail="Pending charge not found")
    charge["status"] = "APPROVED" if approve else "REJECTED"
    charge["resolved_at"] = now_iso()
    await db.bookings.update_one({"id": booking_id}, {"$set": {"additional_charges": charges}})
    booking["additional_charges"] = charges
    await set_status(
        booking,
        "WORK_STARTED",
        user,
        "ADDITIONAL_CHARGE_APPROVED" if approve else "ADDITIONAL_CHARGE_REJECTED",
        {"charge_id": charge_id, "amount": charge["amount"]},
        {"total_amount": compute_total(booking)},
    )
    await notify(
        booking["worker_id"],
        "Additional Charge " + ("Approved" if approve else "Declined"),
        f"₹{charge['amount']:.0f} for {charge['item']} was {'approved' if approve else 'declined'} by customer.",
        "ADDITIONAL_CHARGE",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/confirm-completion")
async def confirm_completion(request: Request, booking_id: str):
    """Customer confirms verified completion of physical service."""
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    await set_status(
        booking,
        "PAYMENT_PENDING",
        user,
        "CUSTOMER_COMPLETED",
        extra={"completed_at": now_iso(), "total_amount": compute_total(booking)},
    )
    await notify(
        booking["worker_id"],
        "Job Confirmed by Customer",
        f"Customer verified completion for {booking['booking_number']}. Ready for payment.",
        "CUSTOMER_COMPLETED",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/payment")
async def make_payment(request: Request, booking_id: str, body: PaymentBody):
    """Process customer digital payment, generate invoice, and credit technician."""
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    if body.method not in ("upi", "card", "cash"):
        raise HTTPException(status_code=400, detail="Invalid payment method selected")

    amount = compute_total(booking)
    payment = {
        "id": new_id(),
        "transaction_id": "TXN" + uuid.uuid4().hex[:10].upper(),
        "method": body.method,
        "amount": amount,
        "status": "SUCCESS",
        "paid_at": now_iso(),
    }
    quote = booking.get("quote") or {}
    items = [{"label": p["name"], "amount": p["price"]} for p in quote.get("parts", [])]
    if quote.get("labour"):
        items.append({"label": "Labour charge", "amount": quote["labour"]})
    for c in booking.get("additional_charges", []):
        if c["status"] == "APPROVED":
            items.append({"label": f"Additional: {c['item']}", "amount": c["amount"]})

    invoice = {
        "invoice_number": "INV-" + uuid.uuid4().hex[:8].upper(),
        "items": items,
        "total": amount,
        "payment_method": body.method,
        "transaction_id": payment["transaction_id"],
        "generated_at": now_iso(),
    }
    await set_status(
        booking,
        "PAYMENT_SUCCESS",
        user,
        "PAYMENT_SUCCESS",
        {"amount": amount, "method": body.method},
        {"payment": payment, "invoice": invoice, "total_amount": amount},
    )
    await set_status(booking, "COMPLETED", user, "BOOKING_COMPLETED")

    net = round(amount * (1 - PLATFORM_FEE_PCT), 2)
    await db.earnings.insert_one({
        "id": new_id(),
        "worker_id": booking["worker_id"],
        "booking_id": booking_id,
        "amount": amount,
        "platform_fee": round(amount * PLATFORM_FEE_PCT, 2),
        "net": net,
        "payout_status": "PENDING",
        "created_at": now_iso(),
    })
    await db.users.update_one({"user_id": booking["worker_id"]}, {"$inc": {"worker_profile.completed_jobs": 1}})
    await notify(
        booking["worker_id"],
        "Payment Received",
        f"₹{amount:.0f} paid via {body.method.upper()} for {booking['booking_number']}. Net earnings: ₹{net:.0f}.",
        "PAYMENT",
        booking_id,
    )
    await notify(
        user["user_id"],
        "Payment Completed",
        f"₹{amount:.0f} paid successfully. Invoice {invoice['invoice_number']} is available for download.",
        "PAYMENT",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/review")
async def submit_review(request: Request, booking_id: str, body: ReviewBody):
    """Customer submits star rating and review feedback."""
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    if booking["status"] != "COMPLETED":
        raise HTTPException(status_code=409, detail="Reviews can only be submitted after job completion")
    if booking.get("review"):
        raise HTTPException(status_code=409, detail="A review has already been submitted for this service")

    review = {
        "id": new_id(),
        "booking_id": booking_id,
        "customer_id": user["user_id"],
        "customer_name": user["name"],
        "worker_id": booking["worker_id"],
        "rating": max(1, min(5, body.rating)),
        "behaviour": body.behaviour,
        "quality": body.quality,
        "price": body.price,
        "comment": body.comment,
        "service_name": booking["service_name"],
        "created_at": now_iso(),
    }
    await db.reviews.insert_one({**review})
    review.pop("_id", None)
    await db.bookings.update_one({"id": booking_id}, {"$set": {"review": review, "updated_at": now_iso()}})
    booking["review"] = review

    all_reviews = await db.reviews.find({"worker_id": booking["worker_id"]}, NO_ID).to_list(1000)
    worker_doc = await db.users.find_one({"user_id": booking["worker_id"]}, NO_ID)
    wp = (worker_doc or {}).get("worker_profile", {})
    base_n = wp.get("reviews_base", 0)
    base_r = wp.get("rating_base", 0)
    total_n = base_n + len(all_reviews)
    avg = round((base_r * base_n + sum(r["rating"] for r in all_reviews)) / max(1, total_n), 1)

    await db.users.update_one(
        {"user_id": booking["worker_id"]},
        {"$set": {"worker_profile.rating": avg, "worker_profile.total_reviews": total_n}},
    )
    await record_event(booking_id, "REVIEW_SUBMITTED", user["user_id"], "customer", {"rating": review["rating"]})
    await notify(
        booking["worker_id"],
        f"New {review['rating']} Star Review",
        f"{user['name']} reviewed your service. Your overall rating is now {avg} stars.",
        "REVIEW",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/sos")
async def submit_sos(request: Request, booking_id: str, body: SosBody):
    """Trigger emergency panic incident report with immediate location broadcast."""
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    sos = {
        "id": new_id(),
        "case_number": "SOS-" + uuid.uuid4().hex[:6].upper(),
        "booking_id": booking_id,
        "customer_id": user["user_id"],
        "worker_id": booking.get("worker_id"),
        "category": body.category,
        "description": body.description,
        "location": booking.get("address"),
        "status": "OPEN",
        "created_at": now_iso(),
    }
    await db.sos_reports.insert_one({**sos})
    sos.pop("_id", None)
    await record_event(booking_id, "SOS_CREATED", user["user_id"], "customer", {"category": body.category})
    await notify(
        user["user_id"],
        "Emergency SOS Alert Registered",
        f"Case {sos['case_number']} opened. Safety team alerted. In physical danger, call 112 (Police) or 108 (Ambulance).",
        "SOS",
        booking_id,
    )
    return sos


# -----------------------------------------------------------------------------
# Technician (Worker) Job Lifecycle Routes
# -----------------------------------------------------------------------------
@api.get("/worker/jobs")
async def worker_jobs(request: Request):
    """Retrieve technician's incoming requests and active jobs categorized by state."""
    user = await require_user(request, role="worker")
    items = await db.bookings.find({"worker_id": user["user_id"]}, NO_ID).sort("created_at", -1).to_list(200)
    groups = {"new": [], "active": [], "completed": [], "cancelled": []}
    for b in items:
        customer = await db.users.find_one({"user_id": b["customer_id"]}, NO_ID)
        wp = user.get("worker_profile", {})
        addr = b.get("address", {})
        dist = round(
            haversine_km(
                wp.get("base_lat", 26.85),
                wp.get("base_lng", 80.95),
                addr.get("lat", 26.8467),
                addr.get("lng", 80.9462),
            ),
            1,
        )
        card = {
            "id": b["id"],
            "booking_number": b["booking_number"],
            "category": b["category"],
            "service_name": b["service_name"],
            "status": b["status"],
            "scheduled_date": b["scheduled_date"],
            "scheduled_time": b["scheduled_time"],
            "description": b.get("description", ""),
            "priority": b.get("priority", False),
            "customer_name": customer["name"] if customer else "Customer",
            "address_line": addr.get("line", ""),
            "distance_km": dist,
            "eta_min": max(5, int(dist / 25 * 60) + 8),
            "ai_estimate": b.get("ai_estimate"),
            "total_amount": b.get("total_amount", 0),
            "created_at": b["created_at"],
            "updated_at": b["updated_at"],
        }
        if b["status"] == "REQUEST_SENT":
            groups["new"].append(card)
        elif b["status"] in ("COMPLETED",):
            groups["completed"].append(card)
        elif b["status"] in ("CANCELLED", "WORKER_REJECTED"):
            groups["cancelled"].append(card)
        else:
            groups["active"].append(card)
    return groups


@api.post("/worker/jobs/{booking_id}/accept")
async def accept_job(request: Request, booking_id: str):
    """Technician accepts a dispatched job request."""
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    await set_status(booking, "WORKER_ACCEPTED", user, "WORKER_ACCEPTED")
    await notify(
        booking["customer_id"],
        "Technician Confirmed",
        f"{user['name']} accepted your request and will arrive as scheduled.",
        "WORKER_ACCEPTED",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/reject")
async def reject_job(request: Request, booking_id: str, body: CancelBody):
    """Technician declines job request; automatically re-routes to next available pro."""
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    rejected = booking.get("rejected_worker_ids", []) + [user["user_id"]]
    await set_status(
        booking,
        "WORKER_REJECTED",
        user,
        "WORKER_REJECTED",
        {"reason": body.reason},
        {"rejected_worker_ids": rejected},
    )
    addr = booking.get("address", {})
    candidates = await find_workers(
        booking["category"],
        addr.get("lat", 26.8467),
        addr.get("lng", 80.9462),
        exclude=rejected,
    )
    if candidates:
        next_worker = candidates[0]
        await set_status(
            booking,
            "REQUEST_SENT",
            {"user_id": "system", "role": "system"},
            "WORKER_MATCHED",
            {"worker_id": next_worker["worker_id"]},
            {"worker_id": next_worker["worker_id"]},
        )
        await notify(
            next_worker["worker_id"],
            "New Job Request",
            f"{booking['service_name']} — {booking.get('description', '')[:60]}",
            "NEW_JOB",
            booking_id,
        )
        await notify(
            booking["customer_id"],
            "Re-matching Technician",
            f"We've forwarded your service request to {next_worker['name']}.",
            "WORKER_REJECTED",
            booking_id,
        )
    else:
        await notify(
            booking["customer_id"],
            "No Nearby Technicians Available",
            "The technician was unavailable and no other professionals are currently in your radius. Please retry shortly.",
            "WORKER_REJECTED",
            booking_id,
        )
    return {"ok": True}


@api.post("/worker/jobs/{booking_id}/on-way")
async def on_way(request: Request, booking_id: str):
    """Technician starts transit to customer location."""
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    await set_status(booking, "WORKER_ON_WAY", user, "WORKER_ON_WAY", extra={"on_way_at": now_iso()})
    await notify(
        booking["customer_id"],
        "Technician On The Way",
        f"{user['name']} has started towards your location. Track arrival live in the app.",
        "WORKER_ON_WAY",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/arrived")
async def arrived(request: Request, booking_id: str):
    """Technician marks physical arrival at site. Generates customer security OTP."""
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    otp = f"{random.randint(0, 999999):06d}"
    await set_status(
        booking,
        "WORKER_ARRIVED",
        user,
        "WORKER_ARRIVED",
        extra={"arrived_at": now_iso(), "otp": otp},
    )
    await record_event(booking_id, "OTP_GENERATED", "system", "system")
    await notify(
        booking["customer_id"],
        "Technician Has Arrived",
        f"{user['name']} is at your doorstep. Share the 6-digit OTP in your app to authorize service start.",
        "WORKER_ARRIVED",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/verify-otp")
async def verify_otp(request: Request, booking_id: str, body: OtpBody):
    """Technician enters OTP shared verbally by customer to start inspection."""
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    if booking["status"] != "WORKER_ARRIVED":
        raise HTTPException(status_code=409, detail="OTP verification is only valid when arrived at site")
    if body.otp.strip() != booking.get("otp"):
        await record_event(booking_id, "OTP_FAILED", user["user_id"], "worker")
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please request the code shown in the customer app.")
    ts = now_iso()
    await set_status(
        booking,
        "OTP_VERIFIED",
        user,
        "OTP_VERIFIED",
        extra={"otp_verified_at": ts, "service_started_at": ts},
    )
    await set_status(booking, "INSPECTION", user, "INSPECTION_STARTED")
    await notify(
        booking["customer_id"],
        "Service Authorized",
        f"OTP verified. {user['name']} is conducting the problem inspection.",
        "OTP_VERIFIED",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/inspection")
async def submit_inspection(request: Request, booking_id: str, body: InspectionBody):
    """Submit diagnostic inspection findings and itemized quote for customer sign-off."""
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    parts_total = sum(p.price for p in body.parts)
    total = round(parts_total + body.labour, 2)
    quote = {
        "problem": body.problem,
        "repair": body.repair,
        "parts": [p.model_dump() for p in body.parts],
        "parts_total": parts_total,
        "labour": body.labour,
        "total": total,
        "eta_minutes": body.eta_minutes,
        "notes": body.notes,
        "image_paths": body.image_paths,
        "submitted_at": now_iso(),
    }
    await db.bookings.update_one({"id": booking_id}, {"$set": {"quote": quote, "inspection": quote}})
    booking["quote"] = quote
    await record_event(booking_id, "INSPECTION_SUBMITTED", user["user_id"], "worker", {"total": total})
    await set_status(booking, "QUOTE_PENDING", user, "QUOTE_SUBMITTED", {"total": total})
    await notify(
        booking["customer_id"],
        "Final Quote Prepared",
        f"{user['name']} submitted a quote of ₹{total:.0f}. Please review and approve to commence repairs.",
        "QUOTE_SUBMITTED",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/progress")
async def update_progress(request: Request, booking_id: str, body: ProgressBody):
    """Log work progress milestones with before/after photo evidence."""
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    if booking["status"] not in ("WORK_STARTED", "ADDITIONAL_CHARGE_PENDING"):
        raise HTTPException(status_code=409, detail="Work must be in progress to post milestone updates")

    entry = {
        "id": new_id(),
        "stage": body.stage,
        "note": body.note,
        "image_path": body.image_path,
        "kind": body.kind,
        "at": now_iso(),
    }
    update: dict = {"$push": {"progress": entry}, "$set": {"updated_at": now_iso()}}
    if body.image_path and body.kind == "before":
        update["$push"]["before_images"] = body.image_path
    elif body.image_path and body.kind == "after":
        update["$push"]["after_images"] = body.image_path

    await db.bookings.update_one({"id": booking_id}, update)
    await record_event(
        booking_id,
        "WORK_PROGRESS_UPDATED",
        user["user_id"],
        "worker",
        {"stage": body.stage, "kind": body.kind},
    )
    await notify(
        booking["customer_id"],
        "Repair Progress Update",
        f"{user['name']}: {body.stage.replace('_', ' ').title()}" + (f" — {body.note}" if body.note else ""),
        "WORK_PROGRESS",
        booking_id,
    )
    fresh = await db.bookings.find_one({"id": booking_id}, NO_ID)
    return await booking_payload(fresh, user)


@api.post("/worker/jobs/{booking_id}/additional-charge")
async def request_charge(request: Request, booking_id: str, body: ChargeBody):
    """Request approval for unexpected spare parts or specialized work discovered mid-repair."""
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    charge = {
        "id": new_id(),
        "reason": body.reason,
        "item": body.item,
        "amount": body.amount,
        "note": body.note,
        "image_path": body.image_path,
        "status": "PENDING",
        "created_at": now_iso(),
        "resolved_at": None,
    }
    charges = booking.get("additional_charges", []) + [charge]
    await db.bookings.update_one({"id": booking_id}, {"$set": {"additional_charges": charges}})
    booking["additional_charges"] = charges
    await set_status(
        booking,
        "ADDITIONAL_CHARGE_PENDING",
        user,
        "ADDITIONAL_CHARGE_REQUESTED",
        {"amount": body.amount, "item": body.item},
    )
    await notify(
        booking["customer_id"],
        "Additional Charge Approval Required",
        f"₹{body.amount:.0f} for {body.item} — {body.reason}. Please approve in your app.",
        "ADDITIONAL_CHARGE",
        booking_id,
    )
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/ready")
async def ready_for_completion(request: Request, booking_id: str):
    """Technician marks physical work completed and triggers customer review."""
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    await set_status(
        booking,
        "READY_FOR_COMPLETION",
        user,
        "WORK_COMPLETED",
        extra={"total_amount": compute_total(booking)},
    )
    await notify(
        booking["customer_id"],
        "Repair Completed — Verification Required",
        f"{user['name']} has finished the repair. Please inspect the completed work and confirm.",
        "WORK_COMPLETED",
        booking_id,
    )
    return await booking_payload(booking, user)


# -----------------------------------------------------------------------------
# Technician Profile & Availability Routes
# -----------------------------------------------------------------------------
@api.post("/worker/availability")
async def set_availability(request: Request, body: AvailabilityBody):
    """Toggle technician online/offline status for receiving job dispatches."""
    user = await require_user(request, role="worker")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"worker_profile.online": body.online}})
    return {"online": body.online}


@api.post("/worker/kyc")
async def submit_kyc(request: Request, body: KycBody):
    """Submit technician onboarding verification details."""
    user = await require_user(request, role="worker")
    wp = user.get("worker_profile", {})
    wp.update({
        "skills": body.skills,
        "categories": [c for c in body.categories if c in CATEGORY_IDS],
        "experience_years": body.experience_years,
        "city": body.city,
        "service_radius_km": body.service_radius_km,
        "verification": "VERIFIED",
        "online": True,
        "base_lat": wp.get("base_lat", 26.8467),
        "base_lng": wp.get("base_lng", 80.9462),
        "rating": wp.get("rating", 0),
        "total_reviews": wp.get("total_reviews", 0),
        "completed_jobs": wp.get("completed_jobs", 0),
        "bio": wp.get("bio", ""),
    })
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"worker_profile": wp, "phone": body.phone}},
    )
    await notify(
        user["user_id"],
        "KYC Verified",
        "Your technician onboarding documents were verified. You are now live to accept nearby jobs!",
        "KYC",
        None,
    )
    return public_user(await db.users.find_one({"user_id": user["user_id"]}, NO_ID))


@api.put("/worker/profile")
async def update_worker_profile(request: Request, body: WorkerProfileBody):
    """Update technician skills, categories, or bio."""
    user = await require_user(request, role="worker")
    updates = {}
    for k, v in body.model_dump().items():
        if v is not None:
            updates[f"worker_profile.{k}"] = v
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    return public_user(await db.users.find_one({"user_id": user["user_id"]}, NO_ID))


@api.get("/worker/stats")
async def worker_stats(request: Request):
    """Calculate daily, weekly, and monthly earnings breakdown and ratings."""
    user = await require_user(request, role="worker")
    earnings = await db.earnings.find({"worker_id": user["user_id"]}, NO_ID).to_list(1000)
    now = now_utc()
    today = now.date().isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    def total(items):
        return round(sum(e["net"] for e in items), 2)

    today_e = [e for e in earnings if e["created_at"][:10] == today]
    week_e = [e for e in earnings if e["created_at"] >= week_ago]
    month_e = [e for e in earnings if e["created_at"] >= month_ago]
    pending = [e for e in earnings if e["payout_status"] == "PENDING"]
    paid = [e for e in earnings if e["payout_status"] == "PAID"]

    bookings_today = await db.bookings.count_documents({
        "worker_id": user["user_id"],
        "scheduled_date": today,
        "status": {"$nin": ["CANCELLED", "WORKER_REJECTED"]},
    })
    reviews = await db.reviews.find({"worker_id": user["user_id"]}, NO_ID).sort("created_at", -1).to_list(20)
    wp = user.get("worker_profile", {})

    return {
        "today": total(today_e),
        "week": total(week_e),
        "month": total(month_e),
        "total_earned": total(earnings),
        "pending_payout": total(pending),
        "paid": total(paid),
        "completed_jobs": wp.get("completed_jobs", 0),
        "rating": wp.get("rating", 0),
        "total_reviews": wp.get("total_reviews", 0),
        "today_jobs": bookings_today,
        "recent_earnings": sorted(earnings, key=lambda e: e["created_at"], reverse=True)[:15],
        "recent_reviews": reviews,
    }


# -----------------------------------------------------------------------------
# Notifications & Support Ticketing
# -----------------------------------------------------------------------------
@api.get("/notifications")
async def list_notifications(request: Request):
    """Retrieve notifications feed and calculate unread count."""
    user = await require_user(request)
    items = await db.notifications.find({"user_id": user["user_id"]}, NO_ID).sort("created_at", -1).to_list(100)
    unread = sum(1 for n in items if not n.get("read"))
    return {"items": items, "unread_count": unread}


@api.post("/notifications/mark-read")
async def mark_read(request: Request):
    """Mark all unread notifications as read."""
    user = await require_user(request)
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/support/cases")
async def create_case(request: Request, body: SupportBody):
    """File a customer support ticket or dispute."""
    user = await require_user(request)
    case = {
        "id": new_id(),
        "case_number": "CASE-" + uuid.uuid4().hex[:6].upper(),
        "user_id": user["user_id"],
        "role": user["role"],
        "category": body.category,
        "subject": body.subject,
        "description": body.description,
        "booking_id": body.booking_id,
        "status": "OPEN",
        "updates": [
            {
                "by": "system",
                "text": "Support case submitted. A customer success representative will contact you within 2 hours.",
                "at": now_iso(),
            }
        ],
        "created_at": now_iso(),
    }
    await db.support_cases.insert_one({**case})
    case.pop("_id", None)
    await notify(
        user["user_id"],
        "Support Ticket Created",
        f"Case {case['case_number']} opened. Our team will assist you shortly.",
        "SUPPORT",
        body.booking_id,
    )
    return case


@api.get("/support/cases")
async def list_cases(request: Request):
    """List all support cases opened by the current user."""
    user = await require_user(request)
    return await db.support_cases.find({"user_id": user["user_id"]}, NO_ID).sort("created_at", -1).to_list(50)


@api.get("/")
async def root():
    """Health check endpoint."""
    return {"service": "SkillSync API", "status": "healthy", "version": "1.0.0"}


# -----------------------------------------------------------------------------
# Database Seeding & Startup Lifespan
# -----------------------------------------------------------------------------
DEMO_WORKERS = [
    {
        "email": "worker@test.com",
        "name": "Rohit Verma",
        "phone": "+919876543210",
        "skills": ["Pipe fitting", "Leak repair", "Wiring", "AC servicing"],
        "categories": ["plumbing", "electrical", "ac_repair", "refrigerator", "washing_machine"],
        "experience_years": 8,
        "rating": 4.8,
        "total_reviews": 128,
        "completed_jobs": 312,
        "base_lat": 26.8560,
        "base_lng": 80.9520,
        "bio": "Certified master plumber & electrician with 8+ years serving Lucknow homes.",
    },
    {
        "email": "amit.demo@skillsync.in",
        "name": "Amit Kumar",
        "phone": "+919812345670",
        "skills": ["Switchboard repair", "AC installation"],
        "categories": ["electrical", "ac_repair"],
        "experience_years": 6,
        "rating": 4.6,
        "total_reviews": 96,
        "completed_jobs": 214,
        "base_lat": 26.8400,
        "base_lng": 80.9300,
        "bio": "Electrical specialist. Fast, clean, and reliable home service.",
    },
    {
        "email": "sanjay.demo@skillsync.in",
        "name": "Sanjay Singh",
        "phone": "+919845612378",
        "skills": ["Bathroom plumbing", "Furniture repair"],
        "categories": ["plumbing", "carpenter"],
        "experience_years": 10,
        "rating": 4.7,
        "total_reviews": 152,
        "completed_jobs": 389,
        "base_lat": 26.8650,
        "base_lng": 80.9600,
        "bio": "Master plumber & carpenter with a decade of on-field expertise.",
    },
    {
        "email": "imran.demo@skillsync.in",
        "name": "Imran Khan",
        "phone": "+919856781234",
        "skills": ["AC gas refill", "Fridge repair", "Washing machine service"],
        "categories": ["ac_repair", "refrigerator", "washing_machine"],
        "experience_years": 10,
        "rating": 4.7,
        "total_reviews": 88,
        "completed_jobs": 245,
        "base_lat": 26.8300,
        "base_lng": 80.9400,
        "bio": "Heavy appliance technician — AC, refrigerator, and washing machine specialist.",
    },
    {
        "email": "suresh.demo@skillsync.in",
        "name": "Suresh Yadav",
        "phone": "+919867812345",
        "skills": ["TV repair", "Laptop repair", "RO service"],
        "categories": ["tv_repair", "computer", "ro_repair", "other"],
        "experience_years": 7,
        "rating": 4.6,
        "total_reviews": 74,
        "completed_jobs": 198,
        "base_lat": 26.8700,
        "base_lng": 80.9350,
        "bio": "Electronics technician specializing in televisions, PCs, and water purifiers.",
    },
    {
        "email": "manoj.demo@skillsync.in",
        "name": "Manoj Gupta",
        "phone": "+919878123456",
        "skills": ["Wall painting", "Tiling", "Woodwork"],
        "categories": ["painter", "mason", "carpenter"],
        "experience_years": 12,
        "rating": 4.5,
        "total_reviews": 110,
        "completed_jobs": 276,
        "base_lat": 26.8250,
        "base_lng": 80.9550,
        "bio": "Painting & civil masonry contractor for residential renovations.",
    },
]


async def seed_database():
    """Seed initial demo accounts and categories if database is blank."""
    if await db.users.find_one({"email": "customer@test.com"}):
        return
    logger.info("Seeding demo customer and technician accounts...")

    customer = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}",
        "email": "customer@test.com",
        "name": "Priya Sharma",
        "picture": "https://ui-avatars.com/api/?name=Priya+Sharma&background=2563EB&color=fff&size=128",
        "role": "customer",
        "phone": "+919912345678",
        "language": "en",
        "created_at": now_iso(),
    }
    await db.users.insert_one({**customer})
    await db.addresses.insert_one({
        "id": new_id(),
        "user_id": customer["user_id"],
        "label": "Home",
        "line": "B-42, Indira Nagar",
        "city": "Lucknow",
        "state": "Uttar Pradesh",
        "pincode": "226016",
        "lat": 26.8720,
        "lng": 80.9910,
        "created_at": now_iso(),
    })

    for w in DEMO_WORKERS:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": w["email"],
            "name": w["name"],
            "picture": f"https://ui-avatars.com/api/?name={w['name'].replace(' ', '+')}&background=1D4ED8&color=fff&size=128",
            "role": "worker",
            "phone": w["phone"],
            "language": "en",
            "created_at": now_iso(),
            "worker_profile": {
                "skills": w["skills"],
                "categories": w["categories"],
                "experience_years": w["experience_years"],
                "rating": w["rating"],
                "rating_base": w["rating"],
                "reviews_base": w["total_reviews"],
                "total_reviews": w["total_reviews"],
                "completed_jobs": w["completed_jobs"],
                "verification": "VERIFIED",
                "online": True,
                "base_lat": w["base_lat"],
                "base_lng": w["base_lng"],
                "service_radius_km": 20,
                "city": "Lucknow",
                "bio": w["bio"],
            },
        })

    await notify(
        customer["user_id"],
        "Welcome to SkillSync",
        "Describe any home problem and our AI diagnostic engine will assess it instantly.",
        "SYSTEM",
        None,
    )
    logger.info("Database seeding successfully completed.")


@app.on_event("startup")
async def on_startup():
    """Initialize database indexes and seed data on startup."""
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.bookings.create_index("customer_id")
    await db.bookings.create_index("worker_id")
    await db.booking_events.create_index("booking_id")
    await db.notifications.create_index("user_id")
    await seed_database()


@app.on_event("shutdown")
async def on_shutdown():
    """Close MongoDB connection gracefully."""
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
