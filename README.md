# SkillSync

> **AI-powered home-repair discovery and service platform — built for hackathons**

SkillSync connects customers with verified local service workers for home-repair and maintenance jobs. Customers can describe a problem or upload photos, get an AI-assisted diagnosis and price estimate, find suitable workers, book a visit, and track the complete service lifecycle. Workers get a dedicated workflow for accepting jobs, inspection, quotations, progress updates, additional charges, and completion.

## ✨ Highlights

- 🤖 **AI Problem Analysis** — analyzes a customer's description and optional photos to identify the likely problem, category, severity, safety warnings, recommended actions, and an estimated INR price range.
- 🧑‍🔧 **Worker Matching** — matches customers with workers based on service category, availability, profile information, and approximate distance/ETA.
- 📅 **Service Booking** — schedule a worker for a selected date and time.
- 🔐 **Role-based Authentication** — separate customer and worker experiences with session-based authentication and Google authentication flow.
- 🔢 **OTP-Gated Service Start** — worker arrival is followed by OTP verification before the service begins.
- 💰 **Quote & Payment Flow** — inspection → quote → customer approval → work → completion → payment.
- 🧾 **Additional Charge Approval** — workers can request extra charges with supporting information; customers approve or reject them.
- 📸 **Photo Uploads** — upload problem, inspection, before/after, and progress images.
- 📍 **Distance & ETA** — calculates approximate worker distance and ETA using geographic coordinates.
- 🔔 **Notifications** — booking and service events generate user notifications.
- 🚨 **SOS & Support** — customers can raise safety/SOS requests and support cases.
- ⭐ **Reviews & Ratings** — customers can rate worker behaviour, quality, price, and overall service.
- 📊 **Worker Dashboard** — jobs, earnings, availability, KYC/profile, and service statistics.
- 🌐 **Bilingual UI** — English/Hindi labels are built into the application workflow.
- 🧪 **Backend Tests** — end-to-end tests are included under `backend/tests/`.

## 🏗️ Architecture

```text
┌───────────────────────────────┐
│       React Native / Expo     │
│        Customer + Worker      │
│                               │
│  Expo Router • TypeScript     │
└───────────────┬───────────────┘
                │ REST / JSON
                ▼
┌───────────────────────────────┐
│          FastAPI API          │
│                               │
│ Auth • AI Analysis • Matching │
│ Bookings • Quotes • Payments  │
│ Notifications • Support • SOS │
└───────┬───────────┬───────────┘
        │           │
        ▼           ▼
   ┌─────────┐   ┌────────────────┐
   │ MongoDB │   │ AI / Object    │
   │         │   │ Storage        │
   └─────────┘   └────────────────┘
```

## 📁 Project Structure

```text
SkillSync-Version1/
├── backend/
│   ├── server.py                 # FastAPI backend and API routes
│   ├── requirements.txt           # Python dependencies
│   ├── pytest.ini
│   └── tests/
│       ├── conftest.py
│       └── test_skillsync_e2e.py
│
├── frontend/
│   ├── app/                       # Expo Router screens
│   │   ├── (customer)/            # Customer tab experience
│   │   ├── (worker)/              # Worker tab experience
│   │   ├── customer/              # Customer workflows
│   │   ├── worker/                # Worker workflows
│   │   ├── auth.tsx
│   │   └── support.tsx
│   ├── src/
│   │   ├── api.ts                 # API client
│   │   ├── auth.tsx               # Authentication state
│   │   ├── types.ts               # Shared status/category types
│   │   └── components/
│   ├── assets/
│   ├── package.json
│   └── app.json
│
├── design_guidelines.json
├── .gitignore
└── README.md
```

## 🔄 Core Service Flow

```text
Customer
   │
   ├── Describe problem / upload photos
   │
   ▼
AI Diagnosis
   │
   ├── Problem category
   ├── Possible causes
   ├── Severity
   ├── Safety warnings
   └── Estimated price range
   │
   ▼
Find Worker
   │
   ▼
Book Service
   │
   ▼
Worker Accepts
   │
   ▼
Worker On The Way
   │
   ▼
Worker Arrives + OTP
   │
   ▼
Inspection
   │
   ▼
Quote ──────────► Customer Approval
   │
   ▼
Work Started
   │
   ├── Additional charge? ──► Customer Approval
   │
   ▼
Completion
   │
   ▼
Payment
   │
   ▼
Review
```

## 🧠 AI Diagnosis

The backend uses an LLM-based analysis pipeline for home-repair diagnosis.

The model receives:
- Customer-selected service category
- Written problem description
- Up to three uploaded images

The analysis returns structured information such as:

```json
{
  "detected_problem": "Leaking Pipe",
  "category": "plumbing",
  "description": "Likely pipe or joint leakage...",
  "possible_causes": [
    "Worn pipe joint",
    "Loose connection",
    "Damaged seal"
  ],
  "severity": "Medium",
  "confidence": 86,
  "safety_warnings": [],
  "recommended_actions": [
    "Turn off the water supply",
    "Book a professional inspection"
  ],
  "estimated_min": 450,
  "estimated_max": 900
}
```

If the AI service is unavailable, the backend falls back to category-based estimates so the booking workflow can still continue.

## 🛠️ Tech Stack

### Frontend

- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- React 19
- Async Storage
- Expo Secure Store
- Expo Image Picker
- React Native Web

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- Motor / MongoDB
- JWT/session-based authentication utilities
- Pytest
- Emergent LLM integration

### Data & Services

- MongoDB for application data
- Object storage for uploaded media
- LLM-powered diagnosis
- Google authentication flow
- REST API between frontend and backend

## 🚀 Getting Started

### Prerequisites

Install:

- Node.js
- npm or Yarn
- Python 3.10+
- MongoDB
- Expo CLI / Expo-compatible development environment

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd SkillSync-Version1
```

### 2. Configure the backend

Create:

```text
backend/.env
```

Add the required environment variables:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=skillsync
EMERGENT_LLM_KEY=your_llm_key
```

If your deployment uses a custom integration/object-storage proxy, you can also configure:

```env
INTEGRATION_PROXY_URL=your_integration_proxy_url
```

> **Never commit `.env` files, API keys, database credentials, or other secrets to Git.**

### 3. Install backend dependencies

```bash
cd backend
python -m venv .venv
```

Activate the environment:

**Windows**

```bash
.venv\Scripts\activate
```

**Linux/macOS**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 4. Start the backend

From the `backend` directory:

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

```text
http://localhost:8000
```

FastAPI's interactive documentation:

```text
http://localhost:8000/docs
```

### 5. Configure the frontend

From the `frontend` directory, set the backend URL for your environment.

For local development, for example:

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

For a physical mobile device, replace `localhost` with the IP address of the computer running the backend.

### 6. Install frontend dependencies

```bash
cd frontend
npm install
```

### 7. Start Expo

```bash
npm start
```

Useful commands:

```bash
npm run android
npm run ios
npm run web
```

## 🧪 Running Tests

Backend tests:

```bash
cd backend
pytest
```

For more detailed output:

```bash
pytest -v
```

Frontend linting:

```bash
cd frontend
npm run lint
```

## 🔌 API Overview

The backend exposes REST endpoints under `/api`.

### Authentication

```text
POST /api/auth/session
POST /api/auth/demo-login
GET  /api/auth/me
POST /api/auth/logout
```

### Customer

```text
GET    /api/services
GET    /api/addresses
POST   /api/addresses
DELETE /api/addresses/{address_id}

POST /api/problem-reports
POST /api/problem-reports/{report_id}/analyze
GET  /api/problem-reports/{report_id}

GET  /api/workers/match
GET  /api/workers/{worker_id}

POST /api/bookings
GET  /api/bookings
GET  /api/bookings/{booking_id}
POST /api/bookings/{booking_id}/cancel

POST /api/bookings/{booking_id}/quote/accept
POST /api/bookings/{booking_id}/quote/reject
POST /api/bookings/{booking_id}/additional-charge/{charge_id}/approve
POST /api/bookings/{booking_id}/additional-charge/{charge_id}/reject
POST /api/bookings/{booking_id}/confirm-completion
POST /api/bookings/{booking_id}/payment
POST /api/bookings/{booking_id}/review
POST /api/bookings/{booking_id}/sos
```

### Worker

```text
GET  /api/worker/jobs
POST /api/worker/jobs/{booking_id}/accept
POST /api/worker/jobs/{booking_id}/reject
POST /api/worker/jobs/{booking_id}/on-way
POST /api/worker/jobs/{booking_id}/arrived
POST /api/worker/jobs/{booking_id}/verify-otp
POST /api/worker/jobs/{booking_id}/inspection
POST /api/worker/jobs/{booking_id}/progress
POST /api/worker/jobs/{booking_id}/additional-charge
POST /api/worker/jobs/{booking_id}/ready

POST /api/worker/availability
POST /api/worker/kyc
PUT  /api/worker/profile
GET  /api/worker/stats
```

### Notifications & Support

```text
GET  /api/notifications
POST /api/notifications/mark-read

POST /api/support/cases
GET  /api/support/cases
```

## 🔐 Security Notes

- Authentication uses bearer session tokens.
- Session tokens are stored securely on the frontend.
- Worker/customer access is role-restricted.
- Booking transitions are validated by a backend state machine.
- Phone numbers shown in worker cards are masked.
- Do not commit secrets or production credentials.
- Demo authentication/payment flows should not be treated as production-grade implementations without additional security and payment-provider integration.

## 📋 Booking State Machine

SkillSync enforces valid service transitions on the backend:

```text
REQUEST_SENT
      ↓
WORKER_ACCEPTED
      ↓
WORKER_ON_WAY
      ↓
WORKER_ARRIVED
      ↓
OTP_VERIFIED
      ↓
INSPECTION
      ↓
QUOTE_PENDING
      ├── QUOTE_REJECTED → CANCELLED
      └── QUOTE_ACCEPTED
              ↓
         WORK_STARTED
              ↓
      READY_FOR_COMPLETION
              ↓
        PAYMENT_PENDING
              ↓
        PAYMENT_SUCCESS
              ↓
          COMPLETED
```

Additional charges temporarily branch from the work-in-progress state and require customer approval.

## 🎯 Hackathon Focus

SkillSync is designed around a simple problem:

> **Finding a trustworthy repair professional should be as easy as describing the problem.**

The project combines AI diagnosis, local worker discovery, transparent quotations, service tracking, safety features, and a structured customer/worker workflow into one platform.

### Why it matters

Traditional local repair discovery can involve:
- Unclear pricing
- Difficulty finding reliable workers
- Poor visibility into worker arrival and service status
- Unclear additional charges
- Limited accountability after the job

SkillSync addresses these issues with a digital workflow that keeps both sides informed throughout the service.

## 🔮 Future Improvements

- Real production payment gateway integration
- Real-time maps and live worker tracking
- Push notifications
- Stronger worker verification/KYC
- Automated worker ranking and recommendation
- Dynamic pricing based on demand and location
- Multilingual AI interaction
- In-app chat and calling
- Production-grade observability and analytics
- Admin dashboard
- Cloud deployment with CI/CD
- Automated fraud and abuse detection

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Run tests and linting.
5. Commit your changes:

```bash
git commit -m "feat: add your feature"
```

6. Push the branch:

```bash
git push origin feature/your-feature
```

7. Open a Pull Request.

## 📄 License

Add the project's intended license here before publishing the repository publicly.

---

**SkillSync — Diagnose. Match. Book. Repair.**
