# SkillSync — Product Requirements Document

## Original Problem Statement
Build a complete two-sided mobile service marketplace (SkillSync): Customer app + Worker app connected through ONE shared backend, database and real-time booking system. Full booking lifecycle (AI problem reporting → worker discovery → booking → live tracking → OTP-gated service start → inspection & quote approval → work progress with before/after proof → additional charge approval → completion confirmation → payment & invoice → rating), notifications, SOS safety system, support/disputes, worker KYC & earnings, audit trail, demo mode, EN+HI languages. (Full 51-phase PRD provided by user.)

## User Choices
- ONE Expo app with role-based entry (Customer / Worker)
- Real AI analysis via Emergent LLM key (gpt-5.4-mini, text + photos)
- Emergent-managed Google Auth + demo-login for testing
- Demo-mode payments (mock UPI/card/cash) + simulated worker live location
- English + Hindi toggle from day one

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB (uuid ids, `_id` excluded everywhere)
  - Emergent Google Auth (`POST /api/auth/session`) + `POST /api/auth/demo-login`
  - Centralized booking **state machine** (TRANSITIONS dict, 409 on invalid transitions)
  - Audit trail: `booking_events` (timestamp, actor, role, type, metadata)
  - Notifications collection routed to both parties on every state change
  - AI: emergentintegrations LlmChat gpt-5.4-mini, structured JSON, graceful fallback if AI unavailable
  - Emergent Object Storage for all media (problem/before/after/charge photos) via `/api/upload` + `/api/files/{path}`
  - Worker matching: verified + online + category, haversine distance + rating + experience scoring; auto-rematch on reject
  - OTP: generated at ARRIVED, visible ONLY to customer; wrong OTP rejected + audited
  - Payments (demo): UPI/card/cash → transaction id → invoice → earnings record (10% platform fee)
  - Masked phone numbers both directions; SOS reports; support cases; worker KYC (demo auto-verify)
  - Seed: 12 categories, Priya Sharma (customer@test.com), Rohit Verma (worker@test.com) + 5 NPC workers, rating baselines
- **Frontend**: Expo Router, one app, two experiences
  - Customer tabs: Home / Bookings / Report (center FAB) / Alerts / Profile
  - Worker tabs: Dashboard / Jobs / Earnings / Alerts / Profile (+ KYC gate)
  - Big screens: `app/customer/booking/[id].tsx` (status-driven panels, timeline, quote comparison, OTP display, payment sheet, rating, SOS FAB) and `app/worker/job/[id].tsx` (accept→navigate→arrive→OTP entry→inspection form→progress→charges→complete)
  - Real-time sync: polling (3.5–8s) via `usePoll` hook
  - i18n: `src/i18n.tsx` EN/HI dictionaries, persisted
  - Design: blue-first (#2563EB), per `/app/design_guidelines.json`
  - Keyboard: react-native-keyboard-controller (KeyboardProvider + KeyboardAwareScrollView)

## What's Implemented (2026-06)
- ✅ Full booking lifecycle E2E (backend 27/27 pytest + frontend UI verified by testing agent)
- ✅ Real AI diagnosis with severity/confidence/estimate/safety warnings + fallback
- ✅ Role-based auth (Google + demo), RBAC on every endpoint
- ✅ Live tracking (simulated), OTP gating, quote approval, additional charges, before/after proof
- ✅ Payment (demo) → invoice → worker earnings → rating updates worker average
- ✅ Notifications (in-app, polled), SOS, support cases, audit log, EN/HI toggle
- ✅ Worker KYC onboarding (demo auto-verify), availability toggle, earnings dashboard

## Backlog / Remaining
- P1: Voice problem reporting (record + Whisper transcription via Emergent key)
- P1: Push notifications (Emergent-managed; needs deployment + native build)
- P1: Real map view (react-native-maps on device) behind existing location abstraction
- P2: Real payment gateway (Stripe/Razorpay) behind payment abstraction
- P2: Chat/messages between customer & worker (masked)
- P2: Admin/support panel for SOS + case management
- P2: WebSocket real-time (replace polling), worker payout requests
- P3: Modularize server.py, service detail sub-pages, promotions/coupons

## Test Accounts
See `/app/memory/test_credentials.md` (demo-login endpoint, no passwords).
