# SkillSync — Product Requirements Document (PRD)

## 1. Executive Summary
SkillSync is an on-demand hyperlocal home services marketplace connecting customers with verified skilled technicians (plumbers, electricians, appliance specialists, carpenters, etc.). The platform features multimodal AI-assisted problem diagnosis, real-time technician matching & dispatch, secure OTP-gated service start, transparent upfront quotes with itemized parts & labour breakdown, digital escrow payment workflow, and comprehensive safety (SOS) mechanisms.

---

## 2. Core Personas & User Journeys

### A. Customer
1. **Report a Problem**: Select service category, describe symptoms (text/audio), and upload photos/media of the issue.
2. **AI Diagnosis & Cost Estimation**: Receive an instant preliminary diagnosis, estimated price range (INR), severity assessment, and safety precautions.
3. **Technician Matching & Booking**: Browse verified nearby technicians ranked by distance, rating, and expertise. Schedule appointment with saved address.
4. **Live Tracking & Arrival**: Track technician dispatch in real-time. Share one-time security OTP upon physical arrival to authorize job start.
5. **Inspection & Quote Approval**: Review detailed inspection notes, itemized parts, and labour charges before approving work.
6. **Progress Tracking & Additional Charges**: Receive photo proof of work (before/after) and review any unexpected additional charge requests.
7. **Completion & Payment**: Confirm service completion, pay via UPI/Card/Cash, download tax invoice, and rate technician performance.

### B. Service Technician (Worker)
1. **Onboarding & KYC**: Complete profile verification (skills, categories, experience, Aadhaar/ID document, service radius).
2. **Availability Toggle**: Go online/offline to receive jobs matching registered skillsets and service radius.
3. **Job Management**: Accept or decline incoming job requests with automated re-dispatch to next available pro if rejected.
4. **Navigation & Arrival**: Update status from "On The Way" to "Arrived" to generate customer OTP.
5. **OTP Verification**: Enter customer OTP to unlock job inspection and quote creation.
6. **Digital Inspection & Quote**: Submit diagnostic findings, required replacement parts, and labour fee for customer approval.
7. **Work Progress & Proof**: Upload stage updates and before/after photos. Submit additional charge requests if unforeseen repairs are required.
8. **Earnings & Payouts**: Real-time earnings dashboard tracking daily/weekly revenue, completed jobs, rating average, and pending payouts.

---

## 3. Supported Service Categories
- **Plumbing**: Leak repairs, pipe fittings, bathroom fixtures, drainage solutions.
- **Electrical**: Wiring, switchboards, MCB repair, lighting installations.
- **AC Repair & Service**: Gas charging, coil cleaning, compressor diagnostics, installation.
- **Refrigerator**: Cooling issues, thermostat replacement, gas leakage, compressor repair.
- **Washing Machine**: Motor issues, drum replacement, PCB repair, water drainage.
- **TV Repair**: Display panel issues, motherboard repair, sound issues.
- **RO Water Purifier**: Filter replacement, membrane change, pump repair, routine servicing.
- **Carpenter**: Furniture repair, locks, doors, custom woodwork.
- **Painter**: Interior/exterior painting, waterproofing, touchups.
- **Mason / Construction**: Tiling, brickwork, plastering, structural fixes.
- **Computer & IT**: Laptop/desktop repair, OS installation, hardware upgrades.
- **Other**: General handyman and utility repairs.

---

## 4. Key Functional Requirements

### 4.1. Multimodal AI Diagnostics
- Analyzes natural language descriptions and uploaded images/audio.
- Generates structured output: detected problem title, severity level (Low/Medium/High), confidence score (0–100%), estimated cost range (min–max INR), safety warnings, and recommended immediate actions.
- Graceful heuristic fallback if external AI provider is unreachable or unconfigured.

### 4.2. Booking State Machine
Rigidly enforced transition rules:
- `REQUEST_SENT` → `WORKER_ACCEPTED` | `WORKER_REJECTED` | `CANCELLED`
- `WORKER_ACCEPTED` → `WORKER_ON_WAY` | `CANCELLED`
- `WORKER_ON_WAY` → `WORKER_ARRIVED` | `CANCELLED`
- `WORKER_ARRIVED` → `OTP_VERIFIED` | `CANCELLED`
- `OTP_VERIFIED` → `INSPECTION`
- `INSPECTION` → `QUOTE_PENDING`
- `QUOTE_PENDING` → `QUOTE_ACCEPTED` | `QUOTE_REJECTED`
- `QUOTE_ACCEPTED` → `WORK_STARTED`
- `WORK_STARTED` → `ADDITIONAL_CHARGE_PENDING` | `READY_FOR_COMPLETION`
- `ADDITIONAL_CHARGE_PENDING` → `WORK_STARTED`
- `READY_FOR_COMPLETION` → `PAYMENT_PENDING`
- `PAYMENT_PENDING` → `PAYMENT_SUCCESS`
- `PAYMENT_SUCCESS` → `COMPLETED`

### 4.3. Safety & Audit Trail
- **Strict OTP Isolation**: 6-digit OTP generated upon technician arrival is strictly visible to the customer and hidden from worker payloads.
- **Masked Phone Numbers**: Direct phone numbers are masked in UI to protect user privacy.
- **SOS Panic System**: Instant emergency case generation with pre-populated location coordinates and local helpline guidance (112 / 108).
- **Full Event Audit Log**: Every state transition, quote change, charge approval, and OTP attempt is immutably logged in `booking_events`.
