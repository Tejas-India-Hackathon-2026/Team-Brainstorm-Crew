# SkillSync Mobile Application

Cross-platform mobile application for the SkillSync on-demand skilled services marketplace, built with **React Native**, **Expo Router**, and **TypeScript**.

Supports two distinct user experiences in a single codebase:
- **Customer Portal**: Issue reporting with AI problem analysis, technician discovery & booking, live GPS dispatch tracking, OTP-gated service start, quote approval, payment & invoicing, SOS safety panic button, and multilingual (English & Hindi) support.
- **Technician (Worker) Portal**: KYC onboarding, online/offline availability toggle, incoming job dispatch alerts, turn-by-turn navigation state, OTP verification panel, itemized inspection & quotation builder, milestone progress logging with before/after photos, additional charge requests, and earnings dashboard.

---

## Tech Stack

- **Framework**: React Native 0.81+ with Expo SDK 54 & Expo Router 6
- **Language**: TypeScript 5.9+
- **Navigation**: File-based Expo Router (`app/` directory with `(customer)` and `(worker)` route groups)
- **State & Storage**: React Context + `@react-native-async-storage/async-storage` & `expo-secure-store`
- **UI Components**: Custom design system tokens (`src/theme.ts`), Lucide & Expo Vector Icons, Haptics
- **Keyboard Handling**: `react-native-keyboard-controller`
- **Animations**: `react-native-reanimated`

---

## Directory Structure

```
frontend/
├── app/                      # Expo Router screen hierarchy
│   ├── (customer)/           # Customer tab navigation (Home, Bookings, Report, Alerts, Profile)
│   ├── (worker)/             # Technician tab navigation (Dashboard, Jobs, Earnings, Alerts, Profile)
│   ├── customer/             # Deep customer flows (Analysis, Booking Detail, Worker Match)
│   ├── worker/               # Deep technician flows (Job Action Screen, KYC Onboarding)
│   ├── auth.tsx              # Role selection & login screen
│   └── support.tsx           # Customer support ticket filing
├── assets/                   # App icons, splash screens, and fonts
├── constants/                # UI test IDs and application constants
├── src/                      # Core business logic & reusable components
│   ├── components/           # UI widgets & notification feed components
│   ├── utils/                # Storage adapters & formatting helpers
│   ├── api.ts                # Typed HTTP API client & media uploader
│   ├── auth.tsx              # Authentication Context Provider & session store
│   ├── i18n.tsx              # English / Hindi localization dictionaries
│   └── theme.ts              # Design tokens, color palettes, and typography
├── app.json                  # Expo application configuration
└── package.json              # Dependencies and run scripts
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ and Yarn / npm
- Expo Go app on your physical device (iOS / Android) or simulator

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Update `EXPO_PUBLIC_BACKEND_URL` to point to your running FastAPI backend (e.g. `http://localhost:8000` or your LAN IP `http://192.168.1.X:8000`).

### 4. Start Development Server
```bash
# Start Expo development server
npm start

# Run directly on web browser
npm run web

# Run on connected Android device/emulator
npm run android

# Run on iOS simulator (macOS required)
npm run ios
```

---

## Testing & Demo Mode

SkillSync includes built-in demo accounts so you can test both user roles immediately without setting up external OAuth:
- **Customer Demo Account**: `customer@test.com` (Pre-seeded with Lucknow address)
- **Technician Demo Account**: `worker@test.com` (Rohit Verma — Master Plumber & Electrician)
