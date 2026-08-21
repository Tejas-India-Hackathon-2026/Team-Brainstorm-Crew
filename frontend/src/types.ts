// Shared constants for both experiences — mirrors backend state machine
export const CATEGORY_ICONS: Record<string, string> = {
  plumbing: "water",
  electrical: "flash",
  ac_repair: "snow",
  refrigerator: "cube",
  washing_machine: "sync",
  tv_repair: "tv",
  ro_repair: "water-outline",
  carpenter: "hammer",
  painter: "color-palette",
  mason: "construct",
  computer: "laptop",
  other: "apps",
};

export interface StatusMeta {
  en: string;
  hi: string;
  color: string;
  bg: string;
  step: number; // index in customer pipeline
}

export const STATUS_META: Record<string, StatusMeta> = {
  REQUEST_SENT: { en: "Request Sent", hi: "अनुरोध भेजा गया", color: "#B45309", bg: "#FFFBEB", step: 0 },
  WORKER_REJECTED: { en: "Finding Worker", hi: "वर्कर खोज रहे हैं", color: "#B45309", bg: "#FFFBEB", step: 0 },
  WORKER_ACCEPTED: { en: "Worker Accepted", hi: "वर्कर ने स्वीकारा", color: "#1D4ED8", bg: "#EFF6FF", step: 1 },
  WORKER_ON_WAY: { en: "Worker On The Way", hi: "वर्कर रास्ते में", color: "#1D4ED8", bg: "#EFF6FF", step: 2 },
  WORKER_ARRIVED: { en: "Worker Arrived — OTP", hi: "वर्कर पहुंचे — OTP", color: "#7C3AED", bg: "#F5F3FF", step: 3 },
  OTP_VERIFIED: { en: "Service Started", hi: "सेवा शुरू", color: "#047857", bg: "#ECFDF5", step: 4 },
  INSPECTION: { en: "Inspection", hi: "निरीक्षण", color: "#047857", bg: "#ECFDF5", step: 4 },
  QUOTE_PENDING: { en: "Quote — Your Approval", hi: "कोटेशन — आपकी मंज़ूरी", color: "#B45309", bg: "#FFFBEB", step: 5 },
  QUOTE_ACCEPTED: { en: "Quote Accepted", hi: "कोटेशन स्वीकृत", color: "#047857", bg: "#ECFDF5", step: 5 },
  QUOTE_REJECTED: { en: "Quote Rejected", hi: "कोटेशन अस्वीकृत", color: "#B91C1C", bg: "#FEF2F2", step: 5 },
  WORK_STARTED: { en: "Work In Progress", hi: "कार्य प्रगति पर", color: "#1D4ED8", bg: "#EFF6FF", step: 6 },
  ADDITIONAL_CHARGE_PENDING: { en: "Charge Approval Needed", hi: "शुल्क मंज़ूरी चाहिए", color: "#B45309", bg: "#FFFBEB", step: 6 },
  READY_FOR_COMPLETION: { en: "Confirm Completion", hi: "पूर्णता की पुष्टि करें", color: "#7C3AED", bg: "#F5F3FF", step: 7 },
  PAYMENT_PENDING: { en: "Payment Pending", hi: "भुगतान बाकी", color: "#B45309", bg: "#FFFBEB", step: 8 },
  PAYMENT_SUCCESS: { en: "Payment Done", hi: "भुगतान पूर्ण", color: "#047857", bg: "#ECFDF5", step: 8 },
  COMPLETED: { en: "Completed", hi: "पूर्ण", color: "#047857", bg: "#ECFDF5", step: 9 },
  CANCELLED: { en: "Cancelled", hi: "रद्द", color: "#B91C1C", bg: "#FEF2F2", step: -1 },
};

export const PIPELINE_STEPS = [
  { key: "REQUEST_SENT", en: "Request Sent", hi: "अनुरोध भेजा" },
  { key: "WORKER_ACCEPTED", en: "Worker Accepted", hi: "वर्कर ने स्वीकारा" },
  { key: "WORKER_ON_WAY", en: "On The Way", hi: "रास्ते में" },
  { key: "WORKER_ARRIVED", en: "Arrived + OTP", hi: "पहुंचे + OTP" },
  { key: "INSPECTION", en: "Inspection", hi: "निरीक्षण" },
  { key: "QUOTE_PENDING", en: "Price Confirmation", hi: "कीमत पुष्टि" },
  { key: "WORK_STARTED", en: "Work Started", hi: "कार्य शुरू" },
  { key: "READY_FOR_COMPLETION", en: "Work Completed", hi: "कार्य पूर्ण" },
  { key: "PAYMENT_PENDING", en: "Payment", hi: "भुगतान" },
  { key: "COMPLETED", en: "Review", hi: "समीक्षा" },
];

export const ACTIVE_STATUSES = [
  "REQUEST_SENT", "WORKER_ACCEPTED", "WORKER_ON_WAY", "WORKER_ARRIVED", "OTP_VERIFIED",
  "INSPECTION", "QUOTE_PENDING", "QUOTE_ACCEPTED", "WORK_STARTED",
  "ADDITIONAL_CHARGE_PENDING", "READY_FOR_COMPLETION", "PAYMENT_PENDING", "PAYMENT_SUCCESS",
];

export const SOS_CATEGORIES = [
  { id: "misbehaviour", en: "Worker misbehaviour", hi: "वर्कर का दुर्व्यवहार" },
  { id: "threat", en: "Threat / safety concern", hi: "धमकी / सुरक्षा चिंता" },
  { id: "unauthorized_demand", en: "Unauthorized demand", hi: "अनधिकृत मांग" },
  { id: "harassment", en: "Harassment", hi: "उत्पीड़न" },
  { id: "emergency", en: "Emergency", hi: "आपातकाल" },
  { id: "other", en: "Other", hi: "अन्य" },
];

export const TIME_SLOTS = ["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM", "07:00 PM"];

export const PROGRESS_STAGES = [
  { id: "REPAIRING", en: "Problem Being Repaired", hi: "मरम्मत जारी" },
  { id: "PARTS_REQUIRED", en: "Parts Required", hi: "पार्ट्स चाहिए" },
  { id: "TESTING", en: "Testing", hi: "परीक्षण" },
  { id: "FINAL_CHECK", en: "Final Check", hi: "अंतिम जांच" },
];

export function statusLabel(status: string, lang: "en" | "hi") {
  return STATUS_META[status]?.[lang] || status;
}

export function fmtMoney(n?: number | null) {
  if (n === null || n === undefined) return "₹0";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function fmtTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ", " + fmtTime(iso);
  } catch {
    return "";
  }
}
