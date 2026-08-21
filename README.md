# SkillSync — On-Demand Skilled Home Services Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React Native](https://img.shields.io/badge/React_Native-0.81+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020.svg?style=flat&logo=expo&logoColor=white)](https://expo.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Motor_Async-47A248.svg?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A full-stack, hyperlocal marketplace engineered to solve trust, pricing ambiguity, and dispatch chaos in on-demand home repairs.

---

## 📌 Why SkillSync? (The Problem Space)

Hiring a plumber, electrician, or appliance technician traditionally involves high friction:
- **Blind Dispatches:** Technicians arrive without knowing the actual issue, missing required spare parts or tools.
- **Pricing Ambiguity:** Lack of itemized quotes leads to contentious on-site negotiations.
- **Security & Verification Gaps:** Homeowners lack reliable ways to verify worker arrival before letting them inside.
- **Rogue "Hidden Charges":** Mid-repair price hikes happen verbally with zero customer recourse.

**SkillSync** addresses these bottlenecks with an engineering-first approach: AI-assisted pre-dispatch diagnostics, deterministic state-driven job lifecycles, zero-trust doorstep OTP verification, itemized quote approvals, and digital change orders.

---

## ⚡ Engineering & Architecture Highlights

### 1. Deterministic 16-State Finite State Machine (FSM)
To prevent race conditions, out-of-order execution, and inconsistent booking data across customer and worker clients, the backend enforces a strict 16-state automaton:
- Every state transition is validated against an allowed adjacency list.
- Illegal transitions immediately yield `HTTP 409 Conflict`.
- Every transition automatically appends an immutable event log entry to `booking_events` for complete auditability.

```
REQUEST_SENT ──► WORKER_ACCEPTED ──► WORKER_ON_WAY ──► WORKER_ARRIVED
     │                                                     │
     ▼ (Auto-Rematch / Cancel)                             ▼ (6-Digit In-App OTP)
 CANCELLED                                             OTP_VERIFIED
                                                           │
                                                           ▼
                                                       INSPECTION
                                                           │
                                                           ▼
                                                     QUOTE_PENDING
                                                     ├──► QUOTE_ACCEPTED ──► WORK_STARTED
                                                     └──► QUOTE_REJECTED     (± Change Orders)
                                                               │                   │
                                                               ▼                   ▼
                                                           CANCELLED       READY_FOR_COMPLETION
                                                                                   │
                                                                                   ▼
                                                                           PAYMENT_PENDING
                                                                                   │
                                                                                   ▼
                                                                           PAYMENT_SUCCESS
                                                                                   │
                                                                                   ▼
                                                                               COMPLETED
```

### 2. Zero-Trust Doorstep OTP Verification
- Upon worker arrival (`WORKER_ARRIVED`), the backend generates a secure 6-digit OTP.
- **Strict Payload Isolation:** The OTP is stored server-side and exposed *only* to the customer's authenticated session. Worker responses never contain this token.
- Work cannot commence until the customer physically shares the OTP and the worker validates it via the API (`OTP_VERIFIED`).

### 3. Resilient AI Issue Diagnostics (Multimodal + Heuristic Fallback)
- Homeowners can submit text descriptions alongside photos or audio recordings of breakdowns.
- The pipeline leverages multimodal LLM vision to extract problem classifications, estimated repair price brackets (INR), severity levels, and safety precautions.
- **Graceful Degradation:** If OpenAI API keys are unconfigured, rate-limited, or offline, the engine falls back to a deterministic local rule-based heuristic parser without breaking the booking flow.

### 4. Hyperlocal Spatial Matching
- Geospatial filtering uses the Haversine formula to compute geodesic distances between customers and active, online technicians.
- Technicians are ranked dynamically based on proximity radius, verified trade category, and customer rating history.

### 5. Mid-Repair Change Orders
- If unseen repairs or replacement parts are discovered during disassembly, technicians submit an itemized *Additional Charge Request*.
- The booking shifts into `ADDITIONAL_CHARGE_PENDING`, requiring explicit customer approval on their device before billing updates apply.

---

## 🏛️ System Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │     React Native Mobile App     │  │    Standalone Web Client    │  │
│  │   (Expo Router / TypeScript)    │  │   (Vanilla JS / CSS Tokens) │  │
│  └────────────────┬────────────────┘  └──────────────┬──────────────┘  │
└───────────────────┼──────────────────────────────────┼─────────────────┘
                    │ REST API (JSON / Multipart Media)│
                    ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI CORE SERVICE                         │
│                                                                        │
│  [ Auth & RBAC ]         [ Booking FSM Engine ]   [ Spatial Dispatch ] │
│  - Customer & Worker     - 16 Strict States       - Haversine Filter   │
│  - Session Token Store   - Audit Event Logger     - Trade/Rating Rank  │
│                                                                        │
│  [ Media Pipeline ]      [ AI Diagnostics ]       [ Safety & SOS ]     │
│  - Safe MIME Validator   - Vision LLM Engine      - Panic Dispatch     │
│  - Local / S3 Storage    - Local Fallback Parser  - Number Masking     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE LAYER                            │
│                       (MongoDB via Async Motor)                        │
│                                                                        │
│  • users              • bookings            • booking_events           │
│  • user_sessions      • problem_reports     • ai_analyses              │
│  • addresses          • notifications       • support_cases            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Repository Layout

```text
SkillSync/
├── backend/                  # Python FastAPI microservice
│   ├── tests/                # Automated E2E & unit test suite
│   ├── uploads/              # Local media storage directory
│   ├── pytest.ini            # Pytest test discovery configuration
│   ├── requirements.txt      # Production & test dependencies
│   ├── server.py             # Single-service API router & business logic
│   └── .env.example          # Backend configuration template
├── docs/                     # Architectural documentation
│   ├── PRD.md                # Product Requirements Document
│   └── ARCHITECTURE.md       # Technical specs & schema dictionary
├── frontend/                 # Cross-platform Mobile App (React Native)
│   ├── app/                  # Expo Router file-based screens
│   │   ├── (customer)/       # Customer dashboard & tab navigation
│   │   ├── (worker)/         # Technician dashboard & job feed
│   │   ├── customer/         # Booking flows, AI triage & live dispatch
│   │   └── worker/           # Active job lifecycle & quote builder
│   ├── constants/            # Test IDs & layout tokens
│   ├── src/                  # API client, Auth state, Theme & i18n
│   ├── package.json          # Node dependencies & scripts
│   └── .env.example          # Frontend configuration template
├── skillsync-web/            # Zero-dependency Vanilla JS web application
│   ├── css/                  # Responsive design system & glassmorphism
│   ├── js/                   # Modular ES6 controllers & API glue
│   └── index.html            # Web entry point
├── .gitignore                # Git exclusions
├── .env.example              # Monorepo root environment template
└── README.md                 # Project documentation
```

---

## 🛠️ Local Development & Quickstart

### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** 18.x or 20.x with `npm`
- **MongoDB:** Local instance (`mongodb://localhost:27017`) or MongoDB Atlas URI
- **OpenAI API Key** *(Optional)*: Required only for live vision analysis; heuristics handle unauthenticated local mode.

---

### Step 1: Backend Setup

```bash
# 1. Enter backend directory
cd backend

# 2. Setup virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env

# 5. Start API server with live reload
uvicorn server:app --reload --port 8000
```

Interactive API documentation will be available at:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Step 2: Mobile App Setup (Expo / React Native)

```bash
# 1. Enter frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Start Expo development server
npm start
```

Inside the Expo CLI:
- Press `w` to run in browser.
- Press `a` for Android Emulator.
- Scan the QR code using the **Expo Go** mobile app on physical iOS or Android devices.

---

### Step 3: Standalone Web App Setup

The `skillsync-web/` application has zero build dependencies and can be served directly:

```bash
cd skillsync-web
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing

The backend includes a comprehensive `pytest` test suite covering end-to-end booking state transitions, security boundary checks, and calculation edge cases.

```bash
cd backend
pytest -v
```

### Key Test Coverage:
- **Authentication & RBAC:** Role isolation between customer and technician endpoints.
- **FSM Transitions:** Valid lifecycle execution (`REQUEST_SENT` through `COMPLETED`).
- **Negative FSM Tests:** Ensuring invalid state transitions return `409 Conflict`.
- **Zero-Trust OTP:** Verifying customer OTP is never leaked to worker payloads and fails gracefully on bad attempts (`400 Bad Request`).
- **Quote & Change Order Math:** Verifying spare parts, labour taxes, and mid-repair price updates.
- **Rating Aggregation:** Calculating running averages and review counts post-completion.

---

## 🔑 Pre-Seeded Test Credentials

For quick local evaluation without signing up new users manually:

| Role | Email | Password | Pre-configured Profile |
|---|---|---|---|
| **Customer** | `customer@test.com` | *Any / Demo* | Pre-loaded with address in Lucknow |
| **Technician (Worker)** | `worker@test.com` | *Any / Demo* | Master Plumber & Electrician (8 yrs exp, 4.8★) |
| **Technician (Worker)** | `amit.demo@skillsync.in` | *Any / Demo* | AC Specialist & Electrician |
| **Technician (Worker)** | `sanjay.demo@skillsync.in` | *Any / Demo* | Carpenter & Plumber |

---

## 🛡️ Security & Privacy Principles

1. **Phone Number Masking:** Direct mobile numbers are never exposed in plaintext over UI responses (`+91 98XXX XX10`).
2. **Strict RBAC:** API decorators enforce role verification on every incoming request token.
3. **Immutable Audit Logs:** Every state change, quote modification, and OTP attempt creates a timestamped record in `booking_events`.
4. **Emergency Escalation (SOS):** High-priority endpoint immediately registers GPS coordinates and alerts central support.

---

## ⚖️ Architectural Decisions & Trade-Offs

- **Why FastAPI + Motor (Async)?** High-concurrency I/O operations for location tracking, live status polling, and async media uploads without blocking worker threads.
- **Why a deterministic FSM over loose status flags?** Real-world home services involve multiple stakeholders (customer, technician, support). A strict state machine prevents illegal operations (e.g. paying before inspection or starting work before OTP verification).
- **Why Heuristic Fallbacks for AI?** Real-world field apps cannot fail when third-party LLM APIs experience latency or outages. Graceful degradation ensures technicians and customers can still complete service requests.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
