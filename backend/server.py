"""SkillSync — shared backend for Customer & Worker apps.

One platform, two experiences: role-based auth, booking state machine,
AI problem analysis, worker matching, OTP-gated service start, quotes,
additional charges, payments (demo), reviews, notifications, SOS,
support cases and a full audit trail.
"""
import asyncio
import json
import logging
import math
import os
import random
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, List, Optional

import httpx
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import HTTPException
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("skillsync")

app = FastAPI(title="SkillSync API")
api = APIRouter(prefix="/api")

APP_NAME = "skillsync"
NO_ID = {"_id": 0}


# ---------------------------------------------------------------- utilities
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def new_id() -> str:
    return uuid.uuid4().hex


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------- object storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
_storage_key: Optional[str] = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    global _storage_key
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------- constants
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

# Booking state machine — single source of truth
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
ACTIVE_STATUSES = ["REQUEST_SENT", "WORKER_ACCEPTED", "WORKER_ON_WAY", "WORKER_ARRIVED", "OTP_VERIFIED",
                   "INSPECTION", "QUOTE_PENDING", "QUOTE_ACCEPTED", "WORK_STARTED",
                   "ADDITIONAL_CHARGE_PENDING", "READY_FOR_COMPLETION", "PAYMENT_PENDING", "PAYMENT_SUCCESS"]
VISIT_CHARGE = 149
PLATFORM_FEE_PCT = 0.10
TRAVEL_SECONDS = 90  # simulated travel time (demo mode)


# ---------------------------------------------------------------- auth helpers
async def get_user_from_token(token: str):
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


async def require_user(request: Request, role: Optional[str] = None):
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.query_params.get("token", "")
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if role and user.get("role") != role:
        raise HTTPException(status_code=403, detail="Forbidden for this role")
    return user


async def create_session(user_id: str) -> str:
    token = uuid.uuid4().hex + uuid.uuid4().hex
    await db.user_sessions.insert_one({
        "session_token": token, "user_id": user_id,
        "created_at": now_iso(), "expires_at": (now_utc() + timedelta(days=7)).isoformat(),
    })
    return token


def public_user(user: dict) -> dict:
    u = {k: v for k, v in user.items() if k not in ("_id",)}
    return u


def masked_phone(phone: Optional[str]) -> str:
    if not phone or len(phone) < 6:
        return "+91 9XXXX XXX00"
    return phone[:3] + " " + phone[3:5] + "XXX XX" + phone[-2:]


def worker_card(w: dict, lat: Optional[float] = None, lng: Optional[float] = None) -> dict:
    wp = w.get("worker_profile", {})
    dist = None
    eta = None
    if lat is not None and lng is not None and wp.get("base_lat") is not None:
        dist = round(haversine_km(lat, lng, wp["base_lat"], wp["base_lng"]), 1)
        eta = max(5, int(dist / 25 * 60) + 8)
    return {
        "worker_id": w["user_id"], "name": w["name"], "picture": w.get("picture"),
        "phone_masked": masked_phone(w.get("phone")),
        "skills": wp.get("skills", []), "categories": wp.get("categories", []),
        "experience_years": wp.get("experience_years", 0), "rating": wp.get("rating", 0),
        "total_reviews": wp.get("total_reviews", 0), "completed_jobs": wp.get("completed_jobs", 0),
        "verification": wp.get("verification", "PENDING"), "online": wp.get("online", False),
        "city": wp.get("city"), "bio": wp.get("bio"), "distance_km": dist, "eta_min": eta,
    }


# ---------------------------------------------------------------- events & notifications
async def record_event(booking_id: str, event_type: str, actor_id: str, actor_role: str, metadata: Optional[dict] = None):
    await db.booking_events.insert_one({
        "id": new_id(), "booking_id": booking_id, "event_type": event_type,
        "actor_id": actor_id, "actor_role": actor_role,
        "metadata": metadata or {}, "timestamp": now_iso(),
    })


async def notify(user_id: str, title: str, body: str, ntype: str, booking_id: Optional[str] = None):
    await db.notifications.insert_one({
        "id": new_id(), "user_id": user_id, "title": title, "body": body,
        "type": ntype, "booking_id": booking_id, "read": False, "created_at": now_iso(),
    })


async def set_status(booking: dict, new_status: str, actor: dict, event_type: str,
                     metadata: Optional[dict] = None, extra: Optional[dict] = None):
    """Validated state transition + audit event."""
    current = booking["status"]
    if new_status not in TRANSITIONS.get(current, []):
        raise HTTPException(status_code=409, detail=f"Invalid transition {current} -> {new_status}")
    update = {"status": new_status, "updated_at": now_iso()}
    if extra:
        update.update(extra)
    await db.bookings.update_one({"id": booking["id"]}, {"$set": update})
    booking.update(update)
    await record_event(booking["id"], event_type, actor.get("user_id", "system"), actor.get("role", "system"),
                       {**(metadata or {}), "from": current, "to": new_status})
    return booking


# ---------------------------------------------------------------- AI analysis
AI_SYSTEM = """You are SkillSync's home-repair diagnosis AI for the Indian market.
Analyze the customer's problem (text and/or photos) and respond with ONLY a JSON object (no markdown fences) with keys:
detected_problem (short title, e.g. "Leaking Pipe"), category (one of: plumbing, electrical, ac_repair, refrigerator, washing_machine, tv_repair, ro_repair, carpenter, painter, mason, computer, other),
description (2-3 sentence explanation), possible_causes (array of 3-5 short strings), severity (Low|Medium|High),
confidence (integer 50-98), safety_warnings (array of 0-4 short strings), recommended_actions (array of 2-4 short strings),
estimated_min (integer, INR), estimated_max (integer, INR).
Estimates should reflect realistic Indian local-service market rates. Be conservative and honest."""

FALLBACK_ESTIMATES = {
    "plumbing": (450, 900), "electrical": (300, 800), "ac_repair": (500, 1500),
    "refrigerator": (400, 1200), "washing_machine": (400, 1100), "tv_repair": (350, 1000),
    "ro_repair": (300, 900), "carpenter": (400, 1200), "painter": (800, 2500),
    "mason": (600, 2000), "computer": (300, 1000), "other": (300, 900),
}


def fallback_analysis(category: str, text: str) -> dict:
    lo, hi = FALLBACK_ESTIMATES.get(category, (300, 900))
    return {
        "detected_problem": f"{CATEGORY_NAMES.get(category, 'General')} issue",
        "category": category or "other",
        "description": "Our AI service is temporarily unavailable, so this is a standard estimate for your category. A verified professional will inspect and confirm the exact problem and price on site.",
        "possible_causes": ["Wear and tear", "Component fault", "Installation issue"],
        "severity": "Medium", "confidence": 60,
        "safety_warnings": [], "recommended_actions": ["Book a professional inspection"],
        "estimated_min": lo, "estimated_max": hi, "ai_available": False,
    }


async def run_ai_analysis(report: dict) -> dict:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    images_b64 = []
    for path in report.get("media_paths", [])[:3]:
        try:
            content, _ct = await run_in_threadpool(get_object, path)
            import base64
            images_b64.append(base64.b64encode(content).decode())
        except Exception as e:
            logger.warning(f"media fetch failed for AI: {e}")
    prompt = (
        f"Category selected by customer: {CATEGORY_NAMES.get(report.get('category'), 'Unknown')}\n"
        f"Problem description: {report.get('text') or '(none — rely on photos)'}\n"
        f"Photos attached: {len(images_b64)}"
    )
    chat = LlmChat(api_key=EMERGENT_KEY, session_id=f"analysis-{report['id']}",
                   system_message=AI_SYSTEM).with_model("openai", "gpt-5.4-mini")
    msg = UserMessage(text=prompt, file_contents=[ImageContent(image_base64=b) for b in images_b64] or None)
    resp = await chat.send_message(msg)
    raw = str(resp).strip()
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    data = json.loads(m.group(0) if m else raw)
    data["confidence"] = int(data.get("confidence", 70))
    data["estimated_min"] = int(data.get("estimated_min", 300))
    data["estimated_max"] = int(data.get("estimated_max", 900))
    if data.get("category") not in CATEGORY_IDS:
        data["category"] = report.get("category") or "other"
    data["ai_available"] = True
    return data


# ---------------------------------------------------------------- request models
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


# ================================================================ AUTH
@api.post("/auth/session")
async def auth_session(body: SessionBody):
    async with httpx.AsyncClient() as hc:
        resp = await hc.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                            headers={"X-Session-ID": body.session_id}, timeout=20)
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()
    email = data.get("email")
    existing = await db.users.find_one({"email": email}, NO_ID)
    if existing:
        user = existing
        await db.users.update_one({"user_id": user["user_id"]},
                                  {"$set": {"picture": data.get("picture") or user.get("picture")}})
    else:
        role = body.role if body.role in ("customer", "worker") else "customer"
        user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email,
            "name": data.get("name") or email.split("@")[0], "picture": data.get("picture"),
            "role": role, "phone": None, "language": "en", "created_at": now_iso(),
        }
        if role == "worker":
            user["worker_profile"] = {
                "skills": [], "categories": [], "experience_years": 0, "rating": 0,
                "total_reviews": 0, "completed_jobs": 0, "verification": "PENDING",
                "online": False, "base_lat": 26.8467, "base_lng": 80.9462,
                "service_radius_km": 15, "city": "Lucknow", "bio": "",
            }
        await db.users.insert_one({**user})
    session_token = data.get("session_token") or ""
    if session_token:
        await db.user_sessions.insert_one({
            "session_token": session_token, "user_id": user["user_id"],
            "created_at": now_iso(), "expires_at": (now_utc() + timedelta(days=7)).isoformat(),
        })
    else:
        session_token = await create_session(user["user_id"])
    fresh = await db.users.find_one({"user_id": user["user_id"]}, NO_ID)
    return {"session_token": session_token, "user": public_user(fresh)}


@api.post("/auth/demo-login")
async def demo_login(body: DemoLoginBody):
    email = "customer@test.com" if body.role == "customer" else "worker@test.com"
    user = await db.users.find_one({"email": email}, NO_ID)
    if not user:
        raise HTTPException(status_code=404, detail="Demo account not seeded")
    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api.get("/auth/me")
async def auth_me(request: Request):
    user = await require_user(request)
    return public_user(user)


@api.post("/auth/logout")
async def auth_logout(request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


@api.put("/profile")
async def update_profile(request: Request, body: ProfileBody):
    user = await require_user(request)
    update = {k: v for k, v in body.dict().items() if v is not None}
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    return public_user(await db.users.find_one({"user_id": user["user_id"]}, NO_ID))


# ================================================================ SERVICES / ADDRESSES
@api.get("/services")
async def get_services():
    return CATEGORIES


@api.get("/addresses")
async def list_addresses(request: Request):
    user = await require_user(request)
    return await db.addresses.find({"user_id": user["user_id"]}, NO_ID).to_list(50)


@api.post("/addresses")
async def add_address(request: Request, body: AddressBody):
    user = await require_user(request)
    doc = {"id": new_id(), "user_id": user["user_id"], **body.dict(), "created_at": now_iso()}
    await db.addresses.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api.delete("/addresses/{address_id}")
async def delete_address(request: Request, address_id: str):
    user = await require_user(request)
    await db.addresses.delete_one({"id": address_id, "user_id": user["user_id"]})
    return {"ok": True}


# ================================================================ MEDIA
@api.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    user = await require_user(request)
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 8MB)")
    ext = (file.filename or "img.jpg").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "m4a", "mp3", "mp4"):
        ext = "jpg"
    path = f"{APP_NAME}/uploads/{user['user_id']}/{new_id()}.{ext}"
    try:
        result = await run_in_threadpool(put_object, path, data, file.content_type or "image/jpeg")
    except Exception as e:
        logger.error(f"upload failed: {e}")
        raise HTTPException(status_code=502, detail="Storage upload failed")
    await db.media.insert_one({"id": new_id(), "owner_id": user["user_id"], "storage_path": result["path"],
                               "filename": file.filename, "content_type": file.content_type,
                               "size": len(data), "created_at": now_iso()})
    return {"path": result["path"]}


@api.get("/files/{path:path}")
async def get_file(request: Request, path: str):
    await require_user(request)
    media = await db.media.find_one({"storage_path": path}, NO_ID)
    if not media:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        content, ctype = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File unavailable")
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "private, max-age=86400"})


# ================================================================ PROBLEM REPORTS + AI
@api.post("/problem-reports")
async def create_report(request: Request, body: ReportBody):
    user = await require_user(request, role="customer")
    if body.category not in CATEGORY_IDS:
        raise HTTPException(status_code=400, detail="Invalid category")
    doc = {
        "id": new_id(), "customer_id": user["user_id"], "category": body.category,
        "text": body.text, "media_paths": body.media_paths, "priority": body.priority,
        "status": "ANALYZING", "analysis": None, "created_at": now_iso(),
    }
    await db.problem_reports.insert_one({**doc})
    doc.pop("_id", None)
    return doc


@api.post("/problem-reports/{report_id}/analyze")
async def analyze_report(request: Request, report_id: str):
    user = await require_user(request, role="customer")
    report = await db.problem_reports.find_one({"id": report_id, "customer_id": user["user_id"]}, NO_ID)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.get("analysis"):
        return report
    try:
        analysis = await asyncio.wait_for(run_ai_analysis(report), timeout=45)
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        analysis = fallback_analysis(report.get("category"), report.get("text", ""))
    analysis["id"] = new_id()
    analysis["analyzed_at"] = now_iso()
    await db.ai_analyses.insert_one({**analysis, "report_id": report_id, "customer_id": user["user_id"]})
    await db.problem_reports.update_one({"id": report_id}, {"$set": {"analysis": analysis, "status": "ANALYZED"}})
    report["analysis"] = analysis
    report["status"] = "ANALYZED"
    return report


@api.get("/problem-reports/{report_id}")
async def get_report(request: Request, report_id: str):
    user = await require_user(request, role="customer")
    report = await db.problem_reports.find_one({"id": report_id, "customer_id": user["user_id"]}, NO_ID)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


# ================================================================ WORKER DISCOVERY
async def find_workers(category: str, lat: float, lng: float, exclude: Optional[List[str]] = None):
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
    cards = [c for c in cards if c["distance_km"] is None or c["distance_km"] <= 30]
    cards.sort(key=lambda c: ((c["distance_km"] or 99) * 0.4 - c["rating"] * 2 - c["experience_years"] * 0.2))
    return cards


@api.get("/workers/match")
async def match_workers(request: Request, category: str, lat: float = 26.8467, lng: float = 80.9462):
    await require_user(request, role="customer")
    return await find_workers(category, lat, lng)


@api.get("/workers/{worker_id}")
async def get_worker(request: Request, worker_id: str):
    await require_user(request)
    w = await db.users.find_one({"user_id": worker_id, "role": "worker"}, NO_ID)
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")
    card = worker_card(w)
    reviews = await db.reviews.find({"worker_id": worker_id}, NO_ID).sort("created_at", -1).to_list(10)
    return {**card, "reviews": reviews}


# ================================================================ BOOKINGS — shared serialization
async def booking_payload(booking: dict, viewer: dict) -> dict:
    b = {k: v for k, v in booking.items() if k != "_id"}
    is_customer = viewer["role"] == "customer"
    if not is_customer:
        b.pop("otp", None)  # worker never receives the OTP
    customer = await db.users.find_one({"user_id": b["customer_id"]}, NO_ID)
    worker = await db.users.find_one({"user_id": b["worker_id"]}, NO_ID) if b.get("worker_id") else None
    b["customer"] = {"name": customer["name"], "picture": customer.get("picture"),
                     "phone_masked": masked_phone(customer.get("phone"))} if customer else None
    b["worker"] = worker_card(worker) if worker else None
    b["events"] = await db.booking_events.find({"booking_id": b["id"]}, NO_ID).sort("timestamp", 1).to_list(200)
    # simulated live location while on the way
    if b["status"] == "WORKER_ON_WAY" and b.get("on_way_at") and worker:
        wp = worker.get("worker_profile", {})
        addr = b.get("address", {})
        started = datetime.fromisoformat(b["on_way_at"])
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        prog = min(1.0, (now_utc() - started).total_seconds() / TRAVEL_SECONDS)
        wlat = wp.get("base_lat", 26.85) + (addr.get("lat", 26.8467) - wp.get("base_lat", 26.85)) * prog
        wlng = wp.get("base_lng", 80.95) + (addr.get("lng", 80.9462) - wp.get("base_lng", 80.95)) * prog
        total_km = haversine_km(wp.get("base_lat", 26.85), wp.get("base_lng", 80.95),
                                addr.get("lat", 26.8467), addr.get("lng", 80.9462)) or 0.5
        remaining = max(0.0, total_km * (1 - prog))
        b["worker_location"] = {"lat": wlat, "lng": wlng, "progress": round(prog, 2),
                                "distance_km": round(remaining, 2),
                                "eta_min": max(0, int((1 - prog) * TRAVEL_SECONDS / 60 * 3) + (1 if prog < 1 else 0))}
    return b


def compute_total(b: dict) -> float:
    total = (b.get("quote") or {}).get("total", 0) or 0
    for c in b.get("additional_charges", []):
        if c.get("status") == "APPROVED":
            total += c["amount"]
    return round(total, 2)


# ================================================================ BOOKINGS — customer
@api.post("/bookings")
async def create_booking(request: Request, body: BookingBody):
    user = await require_user(request, role="customer")
    if body.category not in CATEGORY_IDS:
        raise HTTPException(status_code=400, detail="Invalid category")
    worker = await db.users.find_one({"user_id": body.worker_id, "role": "worker"}, NO_ID)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    if worker.get("worker_profile", {}).get("verification") != "VERIFIED":
        raise HTTPException(status_code=400, detail="Worker is not verified")
    address = None
    if body.address_id:
        address = await db.addresses.find_one({"id": body.address_id, "user_id": user["user_id"]}, NO_ID)
    if not address and body.address:
        address = {"id": new_id(), "user_id": user["user_id"], **body.address.dict(), "created_at": now_iso()}
        await db.addresses.insert_one({**address})
        address.pop("_id", None)
    if not address:
        raise HTTPException(status_code=400, detail="Address required")
    report = None
    if body.problem_report_id:
        report = await db.problem_reports.find_one({"id": body.problem_report_id, "customer_id": user["user_id"]}, NO_ID)
    analysis = (report or {}).get("analysis")
    booking = {
        "id": new_id(),
        "booking_number": "SS-" + uuid.uuid4().hex[:6].upper(),
        "customer_id": user["user_id"], "worker_id": body.worker_id,
        "category": body.category, "service_name": CATEGORY_NAMES[body.category],
        "problem_report_id": body.problem_report_id,
        "ai_estimate": ({"min": analysis["estimated_min"], "max": analysis["estimated_max"],
                         "detected_problem": analysis["detected_problem"], "severity": analysis["severity"],
                         "confidence": analysis["confidence"]} if analysis else None),
        "media_paths": (report or {}).get("media_paths", []),
        "address": {k: address[k] for k in ("id", "label", "line", "city", "state", "pincode", "lat", "lng")},
        "scheduled_date": body.scheduled_date, "scheduled_time": body.scheduled_time,
        "description": body.description or (report or {}).get("text", ""),
        "instructions": body.instructions, "priority": body.priority or (report or {}).get("priority", False),
        "status": "REQUEST_SENT", "rejected_worker_ids": [],
        "otp": None, "otp_verified_at": None, "on_way_at": None, "arrived_at": None,
        "service_started_at": None, "completed_at": None,
        "quote": None, "additional_charges": [], "progress": [],
        "before_images": [], "after_images": [], "inspection": None,
        "visit_charge": VISIT_CHARGE, "total_amount": 0,
        "payment": None, "invoice": None, "review": None, "cancel_reason": None,
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.bookings.insert_one({**booking})
    await record_event(booking["id"], "BOOKING_CREATED", user["user_id"], "customer",
                       {"category": body.category, "worker_id": body.worker_id})
    await notify(body.worker_id, "New Job Request",
                 f"{CATEGORY_NAMES[body.category]} — {booking['description'][:60] or 'New service request'}",
                 "NEW_JOB", booking["id"])
    await notify(user["user_id"], "Booking Created",
                 f"Request {booking['booking_number']} sent to {worker['name']}. Waiting for acceptance.",
                 "BOOKING_CREATED", booking["id"])
    return await booking_payload(booking, user)


@api.get("/bookings")
async def list_bookings(request: Request):
    user = await require_user(request)
    query = {"customer_id": user["user_id"]} if user["role"] == "customer" else {"worker_id": user["user_id"]}
    items = await db.bookings.find(query, NO_ID).sort("created_at", -1).to_list(200)
    out = []
    for b in items:
        worker = await db.users.find_one({"user_id": b["worker_id"]}, NO_ID) if b.get("worker_id") else None
        customer = await db.users.find_one({"user_id": b["customer_id"]}, NO_ID)
        out.append({
            "id": b["id"], "booking_number": b["booking_number"], "category": b["category"],
            "service_name": b["service_name"], "status": b["status"],
            "scheduled_date": b["scheduled_date"], "scheduled_time": b["scheduled_time"],
            "description": b.get("description", ""), "priority": b.get("priority", False),
            "total_amount": b.get("total_amount", 0), "ai_estimate": b.get("ai_estimate"),
            "worker_name": worker["name"] if worker else None,
            "customer_name": customer["name"] if customer else None,
            "address_line": b.get("address", {}).get("line", ""),
            "created_at": b["created_at"], "updated_at": b["updated_at"],
            "review": b.get("review"),
        })
    return out


@api.get("/bookings/{booking_id}")
async def get_booking(request: Request, booking_id: str):
    user = await require_user(request)
    booking = await db.bookings.find_one({"id": booking_id}, NO_ID)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user["user_id"] not in (booking["customer_id"], booking.get("worker_id")):
        raise HTTPException(status_code=403, detail="Not your booking")
    return await booking_payload(booking, user)


async def load_booking_for(user: dict, booking_id: str, as_role: str) -> dict:
    booking = await db.bookings.find_one({"id": booking_id}, NO_ID)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    owner = booking["customer_id"] if as_role == "customer" else booking.get("worker_id")
    if user["user_id"] != owner:
        raise HTTPException(status_code=403, detail="Not your booking")
    return booking


@api.post("/bookings/{booking_id}/cancel")
async def cancel_booking(request: Request, booking_id: str, body: CancelBody):
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    if booking["status"] not in ("REQUEST_SENT", "WORKER_ACCEPTED", "WORKER_ON_WAY", "WORKER_ARRIVED", "WORKER_REJECTED"):
        raise HTTPException(status_code=409, detail="Cannot cancel at this stage")
    await set_status(booking, "CANCELLED", user, "BOOKING_CANCELLED",
                     {"reason": body.reason}, {"cancel_reason": body.reason})
    if booking.get("worker_id"):
        await notify(booking["worker_id"], "Job Cancelled",
                     f"Booking {booking['booking_number']} was cancelled by the customer.", "JOB_CANCELLED", booking_id)
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/quote/accept")
async def accept_quote(request: Request, booking_id: str):
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    await set_status(booking, "QUOTE_ACCEPTED", user, "QUOTE_ACCEPTED", {"total": (booking.get("quote") or {}).get("total")})
    await set_status(booking, "WORK_STARTED", user, "WORK_STARTED",
                     extra={"total_amount": compute_total(booking)})
    await notify(booking["worker_id"], "Quote Approved ✅",
                 f"Customer accepted your quote of ₹{(booking.get('quote') or {}).get('total', 0):.0f}. You can start the repair.",
                 "QUOTE_ACCEPTED", booking_id)
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/quote/reject")
async def reject_quote(request: Request, booking_id: str, body: RejectQuoteBody):
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    if not body.confirm_visit_charge:
        raise HTTPException(status_code=400, detail=f"Confirm the ₹{VISIT_CHARGE} inspection/visit charge to reject the quote")
    await set_status(booking, "QUOTE_REJECTED", user, "QUOTE_REJECTED", {"visit_charge": VISIT_CHARGE})
    await set_status(booking, "CANCELLED", user, "BOOKING_CANCELLED",
                     {"reason": "Quote rejected"}, {"cancel_reason": "Quote rejected", "total_amount": VISIT_CHARGE})
    await notify(booking["worker_id"], "Quote Rejected",
                 f"Customer declined the quote for {booking['booking_number']}. Visit charge ₹{VISIT_CHARGE} applies.",
                 "QUOTE_REJECTED", booking_id)
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/additional-charge/{charge_id}/approve")
async def approve_charge(request: Request, booking_id: str, charge_id: str):
    return await _resolve_charge(request, booking_id, charge_id, True)


@api.post("/bookings/{booking_id}/additional-charge/{charge_id}/reject")
async def reject_charge(request: Request, booking_id: str, charge_id: str):
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
    await set_status(booking, "WORK_STARTED", user,
                     "ADDITIONAL_CHARGE_APPROVED" if approve else "ADDITIONAL_CHARGE_REJECTED",
                     {"charge_id": charge_id, "amount": charge["amount"]},
                     {"total_amount": compute_total(booking)})
    await notify(booking["worker_id"],
                 "Additional Charge " + ("Approved ✅" if approve else "Declined"),
                 f"₹{charge['amount']:.0f} for {charge['item']} was {'approved' if approve else 'declined'} by the customer.",
                 "ADDITIONAL_CHARGE", booking_id)
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/confirm-completion")
async def confirm_completion(request: Request, booking_id: str):
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    await set_status(booking, "PAYMENT_PENDING", user, "CUSTOMER_COMPLETED",
                     extra={"completed_at": now_iso(), "total_amount": compute_total(booking)})
    await notify(booking["worker_id"], "Service Confirmed 🎉",
                 f"Customer confirmed completion of {booking['booking_number']}. Awaiting payment.",
                 "CUSTOMER_COMPLETED", booking_id)
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/payment")
async def make_payment(request: Request, booking_id: str, body: PaymentBody):
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    if body.method not in ("upi", "card", "cash"):
        raise HTTPException(status_code=400, detail="Invalid payment method")
    amount = compute_total(booking)
    payment = {
        "id": new_id(), "transaction_id": "TXN" + uuid.uuid4().hex[:10].upper(),
        "method": body.method, "amount": amount, "status": "SUCCESS", "paid_at": now_iso(),
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
        "items": items, "total": amount, "payment_method": body.method,
        "transaction_id": payment["transaction_id"], "generated_at": now_iso(),
    }
    await set_status(booking, "PAYMENT_SUCCESS", user, "PAYMENT_SUCCESS",
                     {"amount": amount, "method": body.method},
                     {"payment": payment, "invoice": invoice, "total_amount": amount})
    await set_status(booking, "COMPLETED", user, "BOOKING_COMPLETED")
    net = round(amount * (1 - PLATFORM_FEE_PCT), 2)
    await db.earnings.insert_one({
        "id": new_id(), "worker_id": booking["worker_id"], "booking_id": booking_id,
        "amount": amount, "platform_fee": round(amount * PLATFORM_FEE_PCT, 2),
        "net": net, "payout_status": "PENDING", "created_at": now_iso(),
    })
    await db.users.update_one({"user_id": booking["worker_id"]}, {"$inc": {"worker_profile.completed_jobs": 1}})
    await notify(booking["worker_id"], "Payment Received 💰",
                 f"₹{amount:.0f} paid via {body.method.upper()} for {booking['booking_number']}. Net earning ₹{net:.0f}.",
                 "PAYMENT", booking_id)
    await notify(user["user_id"], "Payment Successful",
                 f"₹{amount:.0f} paid. Invoice {invoice['invoice_number']} generated.", "PAYMENT", booking_id)
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/review")
async def submit_review(request: Request, booking_id: str, body: ReviewBody):
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    if booking["status"] != "COMPLETED":
        raise HTTPException(status_code=409, detail="Booking not completed yet")
    if booking.get("review"):
        raise HTTPException(status_code=409, detail="Already reviewed")
    review = {
        "id": new_id(), "booking_id": booking_id, "customer_id": user["user_id"],
        "customer_name": user["name"], "worker_id": booking["worker_id"],
        "rating": max(1, min(5, body.rating)), "behaviour": body.behaviour,
        "quality": body.quality, "price": body.price, "comment": body.comment,
        "service_name": booking["service_name"], "created_at": now_iso(),
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
    await db.users.update_one({"user_id": booking["worker_id"]},
                              {"$set": {"worker_profile.rating": avg, "worker_profile.total_reviews": total_n}})
    await record_event(booking_id, "REVIEW_SUBMITTED", user["user_id"], "customer", {"rating": review["rating"]})
    await notify(booking["worker_id"], f"New {review['rating']}★ Review",
                 f"{user['name']} rated your service. Your average is now {avg}★.", "REVIEW", booking_id)
    return await booking_payload(booking, user)


@api.post("/bookings/{booking_id}/sos")
async def submit_sos(request: Request, booking_id: str, body: SosBody):
    user = await require_user(request, role="customer")
    booking = await load_booking_for(user, booking_id, "customer")
    sos = {
        "id": new_id(), "case_number": "SOS-" + uuid.uuid4().hex[:6].upper(),
        "booking_id": booking_id, "customer_id": user["user_id"], "worker_id": booking.get("worker_id"),
        "category": body.category, "description": body.description,
        "location": booking.get("address"), "status": "OPEN", "created_at": now_iso(),
    }
    await db.sos_reports.insert_one({**sos})
    sos.pop("_id", None)
    await record_event(booking_id, "SOS_CREATED", user["user_id"], "customer", {"category": body.category})
    await notify(user["user_id"], "SOS Received — Help is on the way",
                 f"Case {sos['case_number']} created. Our safety team has been alerted and will contact you immediately. "
                 "For physical emergencies call 112 (Police) or 108 (Ambulance).", "SOS", booking_id)
    return sos


# ================================================================ WORKER — jobs
@api.get("/worker/jobs")
async def worker_jobs(request: Request):
    user = await require_user(request, role="worker")
    items = await db.bookings.find({"worker_id": user["user_id"]}, NO_ID).sort("created_at", -1).to_list(200)
    groups = {"new": [], "active": [], "completed": [], "cancelled": []}
    for b in items:
        customer = await db.users.find_one({"user_id": b["customer_id"]}, NO_ID)
        wp = user.get("worker_profile", {})
        addr = b.get("address", {})
        dist = round(haversine_km(wp.get("base_lat", 26.85), wp.get("base_lng", 80.95),
                                  addr.get("lat", 26.8467), addr.get("lng", 80.9462)), 1)
        card = {
            "id": b["id"], "booking_number": b["booking_number"], "category": b["category"],
            "service_name": b["service_name"], "status": b["status"],
            "scheduled_date": b["scheduled_date"], "scheduled_time": b["scheduled_time"],
            "description": b.get("description", ""), "priority": b.get("priority", False),
            "customer_name": customer["name"] if customer else "Customer",
            "address_line": addr.get("line", ""), "distance_km": dist,
            "eta_min": max(5, int(dist / 25 * 60) + 8),
            "ai_estimate": b.get("ai_estimate"), "total_amount": b.get("total_amount", 0),
            "created_at": b["created_at"], "updated_at": b["updated_at"],
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
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    await set_status(booking, "WORKER_ACCEPTED", user, "WORKER_ACCEPTED")
    await notify(booking["customer_id"], "Worker Accepted ✅",
                 f"{user['name']} accepted your request and will arrive as scheduled.", "WORKER_ACCEPTED", booking_id)
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/reject")
async def reject_job(request: Request, booking_id: str, body: CancelBody):
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    rejected = booking.get("rejected_worker_ids", []) + [user["user_id"]]
    await set_status(booking, "WORKER_REJECTED", user, "WORKER_REJECTED",
                     {"reason": body.reason}, {"rejected_worker_ids": rejected})
    # matching engine: find the next best worker
    addr = booking.get("address", {})
    candidates = await find_workers(booking["category"], addr.get("lat", 26.8467), addr.get("lng", 80.9462),
                                    exclude=rejected)
    if candidates:
        next_worker = candidates[0]
        await set_status(booking, "REQUEST_SENT", {"user_id": "system", "role": "system"}, "WORKER_MATCHED",
                         {"worker_id": next_worker["worker_id"]}, {"worker_id": next_worker["worker_id"]})
        await notify(next_worker["worker_id"], "New Job Request",
                     f"{booking['service_name']} — {booking.get('description', '')[:60]}", "NEW_JOB", booking_id)
        await notify(booking["customer_id"], "Finding You Another Professional",
                     f"We've sent your request to {next_worker['name']}.", "WORKER_REJECTED", booking_id)
    else:
        await notify(booking["customer_id"], "Worker Unavailable",
                     "The professional couldn't take your job and no one else is nearby right now. Please try again or pick another worker.",
                     "WORKER_REJECTED", booking_id)
    return {"ok": True}


@api.post("/worker/jobs/{booking_id}/on-way")
async def on_way(request: Request, booking_id: str):
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    await set_status(booking, "WORKER_ON_WAY", user, "WORKER_ON_WAY", extra={"on_way_at": now_iso()})
    await notify(booking["customer_id"], "Worker On The Way 🛵",
                 f"{user['name']} has started for your location. Track them live in the app.", "WORKER_ON_WAY", booking_id)
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/arrived")
async def arrived(request: Request, booking_id: str):
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    otp = f"{random.randint(0, 999999):06d}"
    await set_status(booking, "WORKER_ARRIVED", user, "WORKER_ARRIVED",
                     extra={"arrived_at": now_iso(), "otp": otp})
    await record_event(booking_id, "OTP_GENERATED", "system", "system")
    await notify(booking["customer_id"], "Worker Has Arrived 📍",
                 f"{user['name']} is at your location. Share the OTP shown in your app to start the service.",
                 "WORKER_ARRIVED", booking_id)
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/verify-otp")
async def verify_otp(request: Request, booking_id: str, body: OtpBody):
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    if booking["status"] != "WORKER_ARRIVED":
        raise HTTPException(status_code=409, detail="OTP verification not available at this stage")
    if body.otp.strip() != booking.get("otp"):
        await record_event(booking_id, "OTP_FAILED", user["user_id"], "worker")
        raise HTTPException(status_code=400, detail="Incorrect OTP. Ask the customer for the code shown in their app.")
    ts = now_iso()
    await set_status(booking, "OTP_VERIFIED", user, "OTP_VERIFIED",
                     extra={"otp_verified_at": ts, "service_started_at": ts})
    await set_status(booking, "INSPECTION", user, "INSPECTION_STARTED")
    await notify(booking["customer_id"], "Service Started 🔧",
                 f"OTP verified. {user['name']} is inspecting the problem now.", "OTP_VERIFIED", booking_id)
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/inspection")
async def submit_inspection(request: Request, booking_id: str, body: InspectionBody):
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    parts_total = sum(p.price for p in body.parts)
    total = round(parts_total + body.labour, 2)
    quote = {
        "problem": body.problem, "repair": body.repair,
        "parts": [p.dict() for p in body.parts], "parts_total": parts_total,
        "labour": body.labour, "total": total, "eta_minutes": body.eta_minutes,
        "notes": body.notes, "image_paths": body.image_paths, "submitted_at": now_iso(),
    }
    await db.bookings.update_one({"id": booking_id}, {"$set": {"quote": quote, "inspection": quote}})
    booking["quote"] = quote
    await record_event(booking_id, "INSPECTION_SUBMITTED", user["user_id"], "worker", {"total": total})
    await set_status(booking, "QUOTE_PENDING", user, "QUOTE_SUBMITTED", {"total": total})
    await notify(booking["customer_id"], "Final Quote Ready 📋",
                 f"{user['name']} submitted a quote of ₹{total:.0f}. Review and approve to start the repair.",
                 "QUOTE_SUBMITTED", booking_id)
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/progress")
async def update_progress(request: Request, booking_id: str, body: ProgressBody):
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    if booking["status"] not in ("WORK_STARTED", "ADDITIONAL_CHARGE_PENDING"):
        raise HTTPException(status_code=409, detail="Work is not in progress")
    entry = {"id": new_id(), "stage": body.stage, "note": body.note,
             "image_path": body.image_path, "kind": body.kind, "at": now_iso()}
    update: dict = {"$push": {"progress": entry}, "$set": {"updated_at": now_iso()}}
    if body.image_path and body.kind == "before":
        update["$push"]["before_images"] = body.image_path
    elif body.image_path and body.kind == "after":
        update["$push"]["after_images"] = body.image_path
    await db.bookings.update_one({"id": booking_id}, update)
    await record_event(booking_id, "WORK_PROGRESS_UPDATED", user["user_id"], "worker",
                       {"stage": body.stage, "kind": body.kind})
    await notify(booking["customer_id"], "Work Update",
                 f"{user['name']}: {body.stage.replace('_', ' ').title()}" + (f" — {body.note}" if body.note else ""),
                 "WORK_PROGRESS", booking_id)
    fresh = await db.bookings.find_one({"id": booking_id}, NO_ID)
    return await booking_payload(fresh, user)


@api.post("/worker/jobs/{booking_id}/additional-charge")
async def request_charge(request: Request, booking_id: str, body: ChargeBody):
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    charge = {"id": new_id(), "reason": body.reason, "item": body.item, "amount": body.amount,
              "note": body.note, "image_path": body.image_path, "status": "PENDING",
              "created_at": now_iso(), "resolved_at": None}
    charges = booking.get("additional_charges", []) + [charge]
    await db.bookings.update_one({"id": booking_id}, {"$set": {"additional_charges": charges}})
    booking["additional_charges"] = charges
    await set_status(booking, "ADDITIONAL_CHARGE_PENDING", user, "ADDITIONAL_CHARGE_REQUESTED",
                     {"amount": body.amount, "item": body.item})
    await notify(booking["customer_id"], "Additional Charge Requested ⚠️",
                 f"₹{body.amount:.0f} for {body.item} — {body.reason}. Approve or decline in the app.",
                 "ADDITIONAL_CHARGE", booking_id)
    return await booking_payload(booking, user)


@api.post("/worker/jobs/{booking_id}/ready")
async def ready_for_completion(request: Request, booking_id: str):
    user = await require_user(request, role="worker")
    booking = await load_booking_for(user, booking_id, "worker")
    await set_status(booking, "READY_FOR_COMPLETION", user, "WORK_COMPLETED",
                     extra={"total_amount": compute_total(booking)})
    await notify(booking["customer_id"], "Work Completed — Please Review ✅",
                 f"{user['name']} marked the work complete. Review the before/after proof and confirm.",
                 "WORK_COMPLETED", booking_id)
    return await booking_payload(booking, user)


# ================================================================ WORKER — profile / stats
@api.post("/worker/availability")
async def set_availability(request: Request, body: AvailabilityBody):
    user = await require_user(request, role="worker")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"worker_profile.online": body.online}})
    return {"online": body.online}


@api.post("/worker/kyc")
async def submit_kyc(request: Request, body: KycBody):
    user = await require_user(request, role="worker")
    wp = user.get("worker_profile", {})
    wp.update({
        "skills": body.skills, "categories": [c for c in body.categories if c in CATEGORY_IDS],
        "experience_years": body.experience_years, "city": body.city,
        "service_radius_km": body.service_radius_km,
        "verification": "VERIFIED",  # demo mode: auto-verified instantly
        "online": True,
        "base_lat": wp.get("base_lat", 26.8467), "base_lng": wp.get("base_lng", 80.9462),
        "rating": wp.get("rating", 0), "total_reviews": wp.get("total_reviews", 0),
        "completed_jobs": wp.get("completed_jobs", 0), "bio": wp.get("bio", ""),
    })
    await db.users.update_one({"user_id": user["user_id"]},
                              {"$set": {"worker_profile": wp, "phone": body.phone}})
    await notify(user["user_id"], "KYC Verified ✅",
                 "Your documents were verified (demo mode). You're now eligible to receive jobs. Go online to start!",
                 "KYC", None)
    return public_user(await db.users.find_one({"user_id": user["user_id"]}, NO_ID))


@api.put("/worker/profile")
async def update_worker_profile(request: Request, body: WorkerProfileBody):
    user = await require_user(request, role="worker")
    updates = {}
    for k, v in body.dict().items():
        if v is not None:
            updates[f"worker_profile.{k}"] = v
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    return public_user(await db.users.find_one({"user_id": user["user_id"]}, NO_ID))


@api.get("/worker/stats")
async def worker_stats(request: Request):
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
        "worker_id": user["user_id"], "scheduled_date": today,
        "status": {"$nin": ["CANCELLED", "WORKER_REJECTED"]},
    })
    reviews = await db.reviews.find({"worker_id": user["user_id"]}, NO_ID).sort("created_at", -1).to_list(20)
    wp = user.get("worker_profile", {})
    return {
        "today": total(today_e), "week": total(week_e), "month": total(month_e),
        "total_earned": total(earnings), "pending_payout": total(pending), "paid": total(paid),
        "completed_jobs": wp.get("completed_jobs", 0), "rating": wp.get("rating", 0),
        "total_reviews": wp.get("total_reviews", 0), "today_jobs": bookings_today,
        "recent_earnings": sorted(earnings, key=lambda e: e["created_at"], reverse=True)[:15],
        "recent_reviews": reviews,
    }


# ================================================================ NOTIFICATIONS / SUPPORT
@api.get("/notifications")
async def list_notifications(request: Request):
    user = await require_user(request)
    items = await db.notifications.find({"user_id": user["user_id"]}, NO_ID).sort("created_at", -1).to_list(100)
    unread = sum(1 for n in items if not n.get("read"))
    return {"items": items, "unread_count": unread}


@api.post("/notifications/mark-read")
async def mark_read(request: Request):
    user = await require_user(request)
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/support/cases")
async def create_case(request: Request, body: SupportBody):
    user = await require_user(request)
    case = {
        "id": new_id(), "case_number": "CASE-" + uuid.uuid4().hex[:6].upper(),
        "user_id": user["user_id"], "role": user["role"], "category": body.category,
        "subject": body.subject, "description": body.description, "booking_id": body.booking_id,
        "status": "OPEN", "updates": [{"by": "system", "text": "Case received. Our support team will respond within 2 hours.", "at": now_iso()}],
        "created_at": now_iso(),
    }
    await db.support_cases.insert_one({**case})
    case.pop("_id", None)
    await notify(user["user_id"], "Support Case Created",
                 f"Case {case['case_number']} — we'll get back to you shortly.", "SUPPORT", body.booking_id)
    return case


@api.get("/support/cases")
async def list_cases(request: Request):
    user = await require_user(request)
    return await db.support_cases.find({"user_id": user["user_id"]}, NO_ID).sort("created_at", -1).to_list(50)


@api.get("/")
async def root():
    return {"service": "SkillSync API", "status": "ok"}


# ================================================================ SEED
DEMO_WORKERS = [
    {"email": "worker@test.com", "name": "Rohit Verma", "phone": "+919876543210",
     "skills": ["Pipe fitting", "Leak repair", "Wiring", "AC servicing"],
     "categories": ["plumbing", "electrical", "ac_repair", "refrigerator", "washing_machine"],
     "experience_years": 8, "rating": 4.8, "total_reviews": 128, "completed_jobs": 312,
     "base_lat": 26.8560, "base_lng": 80.9520, "bio": "Certified plumber & electrician. 8+ years serving Lucknow homes."},
    {"email": "amit.demo@skillsync.in", "name": "Amit Kumar", "phone": "+919812345670",
     "skills": ["Switchboard repair", "AC installation"],
     "categories": ["electrical", "ac_repair"],
     "experience_years": 6, "rating": 4.6, "total_reviews": 96, "completed_jobs": 214,
     "base_lat": 26.8400, "base_lng": 80.9300, "bio": "Electrical specialist. Fast, clean and reliable service."},
    {"email": "sanjay.demo@skillsync.in", "name": "Sanjay Singh", "phone": "+919845612378",
     "skills": ["Bathroom plumbing", "Furniture repair"],
     "categories": ["plumbing", "carpenter"],
     "experience_years": 10, "rating": 4.7, "total_reviews": 152, "completed_jobs": 389,
     "base_lat": 26.8650, "base_lng": 80.9600, "bio": "Master plumber & carpenter with a decade of experience."},
    {"email": "imran.demo@skillsync.in", "name": "Imran Khan", "phone": "+919856781234",
     "skills": ["AC gas refill", "Fridge repair", "Washing machine service"],
     "categories": ["ac_repair", "refrigerator", "washing_machine"],
     "experience_years": 10, "rating": 4.7, "total_reviews": 88, "completed_jobs": 245,
     "base_lat": 26.8300, "base_lng": 80.9400, "bio": "Appliance repair expert — AC, fridge, washing machine."},
    {"email": "suresh.demo@skillsync.in", "name": "Suresh Yadav", "phone": "+919867812345",
     "skills": ["TV repair", "Laptop repair", "RO service"],
     "categories": ["tv_repair", "computer", "ro_repair", "other"],
     "experience_years": 7, "rating": 4.6, "total_reviews": 74, "completed_jobs": 198,
     "base_lat": 26.8700, "base_lng": 80.9350, "bio": "Electronics technician — TVs, computers and RO systems."},
    {"email": "manoj.demo@skillsync.in", "name": "Manoj Gupta", "phone": "+919878123456",
     "skills": ["Wall painting", "Tiling", "Woodwork"],
     "categories": ["painter", "mason", "carpenter"],
     "experience_years": 12, "rating": 4.5, "total_reviews": 110, "completed_jobs": 276,
     "base_lat": 26.8250, "base_lng": 80.9550, "bio": "Painting & masonry contractor for homes and offices."},
]


async def seed():
    if await db.users.find_one({"email": "customer@test.com"}):
        return
    logger.info("Seeding demo data...")
    customer = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}", "email": "customer@test.com",
        "name": "Priya Sharma", "picture": "https://ui-avatars.com/api/?name=Priya+Sharma&background=2563EB&color=fff&size=128",
        "role": "customer", "phone": "+919912345678", "language": "en", "created_at": now_iso(),
    }
    await db.users.insert_one({**customer})
    await db.addresses.insert_one({
        "id": new_id(), "user_id": customer["user_id"], "label": "Home",
        "line": "B-42, Indira Nagar", "city": "Lucknow", "state": "Uttar Pradesh",
        "pincode": "226016", "lat": 26.8720, "lng": 80.9910, "created_at": now_iso(),
    })
    for w in DEMO_WORKERS:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}", "email": w["email"], "name": w["name"],
            "picture": f"https://ui-avatars.com/api/?name={w['name'].replace(' ', '+')}&background=1D4ED8&color=fff&size=128",
            "role": "worker", "phone": w["phone"], "language": "en", "created_at": now_iso(),
            "worker_profile": {
                "skills": w["skills"], "categories": w["categories"],
                "experience_years": w["experience_years"], "rating": w["rating"],
                "rating_base": w["rating"], "reviews_base": w["total_reviews"],
                "total_reviews": w["total_reviews"], "completed_jobs": w["completed_jobs"],
                "verification": "VERIFIED", "online": True,
                "base_lat": w["base_lat"], "base_lng": w["base_lng"],
                "service_radius_km": 20, "city": "Lucknow", "bio": w["bio"],
            },
        })
    await notify(customer["user_id"], "Welcome to SkillSync! 👋",
                 "Report any home problem and our AI will diagnose it instantly.", "SYSTEM", None)
    logger.info("Seed complete.")


@app.on_event("startup")
async def startup():
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.bookings.create_index("customer_id")
    await db.bookings.create_index("worker_id")
    await db.booking_events.create_index("booking_id")
    await db.notifications.create_index("user_id")
    await seed()
    try:
        await run_in_threadpool(init_storage)
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Object storage init failed (will retry lazily): {e}")


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
