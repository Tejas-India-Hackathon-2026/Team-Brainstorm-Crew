import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api, fileUrl } from "@/src/api";
import { usePoll } from "@/src/hooks";
import { useI18n } from "@/src/i18n";
import { C, R, SP, shadow } from "@/src/theme";
import { ACTIVE_STATUSES, PIPELINE_STEPS, SOS_CATEGORIES, STATUS_META, fmtDateTime, fmtMoney, statusLabel } from "@/src/types";
import { Avatar, Badge, Btn, Card, Field, Row, Sheet, Stars, toast } from "@/src/components/ui";

export default function CustomerBookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [b, setB] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showSos, setShowSos] = useState(false);
  const [sosCategory, setSosCategory] = useState("");
  const [sosDesc, setSosDesc] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showRejectQuote, setShowRejectQuote] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [rating, setRating] = useState(5);
  const [behaviour, setBehaviour] = useState(5);
  const [quality, setQuality] = useState(5);
  const [price, setPrice] = useState(5);
  const [comment, setComment] = useState("");

  usePoll(async () => setB(await api<any>(`/bookings/${id}`)), 3500, [id]);

  const act = async (key: string, fn: () => Promise<any>, successMsg?: string) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res?.id) setB(res);
      if (successMsg) toast(successMsg, "success");
    } catch (e: any) {
      toast(e?.message || "Action failed", "error");
    } finally {
      setBusy(null);
    }
  };

  if (!b) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const meta = STATUS_META[b.status] || STATUS_META.REQUEST_SENT;
  const isActive = ACTIVE_STATUSES.includes(b.status);
  const stepIdx = meta.step;
  const pendingCharge = (b.additional_charges || []).find((c: any) => c.status === "PENDING");
  const approvedCharges = (b.additional_charges || []).filter((c: any) => c.status === "APPROVED");
  const canCancel = ["REQUEST_SENT", "WORKER_ACCEPTED", "WORKER_ON_WAY", "WORKER_ARRIVED", "WORKER_REJECTED"].includes(b.status);
  const total = b.total_amount || b.quote?.total || 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="booking-back-btn" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(customer)/bookings" as any))} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={st.headerTitle}>{b.service_name}</Text>
          <Text style={st.headerSub}>{b.booking_number}</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 150 }}>
        {/* Status */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md }}>
          <Badge testID="booking-status-badge" text={statusLabel(b.status, lang)} color={meta.color} bg={meta.bg} />
          <Text style={st.timeText}>{fmtDateTime(b.updated_at)}</Text>
        </View>

        {/* Worker card */}
        {b.worker && (
          <Card testID="booking-worker-card" style={{ marginBottom: SP.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: SP.md }}>
              <Avatar uri={b.worker.picture} size={48} name={b.worker.name} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={st.workerName}>{b.worker.name}</Text>
                  {b.worker.verification === "VERIFIED" && <Ionicons name="shield-checkmark" size={14} color={C.success} />}
                </View>
                <Text style={st.workerMeta}>★ {b.worker.rating} • {b.worker.completed_jobs} jobs • {b.worker.phone_masked}</Text>
              </View>
              <Pressable
                testID="call-worker-btn"
                onPress={() => toast(lang === "en" ? "Connecting via masked SkillSync line (demo)..." : "मास्क्ड SkillSync लाइन से जोड़ रहे हैं (डेमो)...", "info")}
                style={st.callBtn}
              >
                <Ionicons name="call" size={18} color="#fff" />
              </Pressable>
            </View>
          </Card>
        )}

        {/* ------- Status-specific panels ------- */}
        {b.status === "REQUEST_SENT" && (
          <Card testID="waiting-panel" style={{ alignItems: "center", paddingVertical: SP.xl }}>
            <ActivityIndicator color={C.primary} />
            <Text style={st.waitText}>{t("waitingWorker")}</Text>
          </Card>
        )}

        {b.status === "WORKER_ACCEPTED" && (
          <Card testID="accepted-panel" style={{ backgroundColor: C.successLight, borderColor: "#A7F3D0" }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Ionicons name="checkmark-circle" size={26} color={C.success} />
              <View style={{ flex: 1 }}>
                <Text style={st.panelTitle}>{t("workerAccepted")} ✅</Text>
                <Text style={st.panelSub}>{lang === "en" ? `${b.worker?.name} will start soon for your location.` : `${b.worker?.name} जल्द ही आपके पते के लिए निकलेंगे।`}</Text>
              </View>
            </View>
          </Card>
        )}

        {b.status === "WORKER_ON_WAY" && (
          <Card testID="tracking-panel">
            <Text style={st.panelTitle}>{t("onTheWay")} 🛵</Text>
            <View style={st.trackWrap}>
              <View style={st.trackLine}>
                <View style={[st.trackFill, { width: `${Math.round((b.worker_location?.progress || 0) * 100)}%` }]} />
                <View style={[st.trackDot, { left: `${Math.min(94, Math.round((b.worker_location?.progress || 0) * 100))}%` }]}>
                  <Ionicons name="bicycle" size={14} color="#fff" />
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={st.trackValue}>{b.worker_location?.distance_km ?? "--"} km</Text>
                  <Text style={st.trackLabel}>{t("distance")}</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={st.trackValue}>{b.worker_location?.eta_min ?? "--"} min</Text>
                  <Text style={st.trackLabel}>{t("eta")}</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={st.trackValue}>{Math.round((b.worker_location?.progress || 0) * 100)}%</Text>
                  <Text style={st.trackLabel}>{lang === "en" ? "Progress" : "प्रगति"}</Text>
                </View>
              </View>
            </View>
            <Text style={st.liveNote}>
              <Ionicons name="radio-button-on" size={10} color={C.success} /> {lang === "en" ? "Live location updating..." : "लाइव लोकेशन अपडेट हो रही है..."}
            </Text>
          </Card>
        )}

        {b.status === "WORKER_ARRIVED" && b.otp && (
          <Card testID="otp-panel" style={{ backgroundColor: "#F5F3FF", borderColor: "#DDD6FE", alignItems: "center" }}>
            <Text style={st.panelTitle}>{t("workerArrivedTitle")} 📍</Text>
            <Text style={[st.panelSub, { textAlign: "center", marginTop: 4 }]}>{t("shareOtp")}</Text>
            <View style={st.otpRow}>
              {b.otp.split("").map((d: string, i: number) => (
                <View key={i} style={st.otpBox}>
                  <Text style={st.otpDigit}>{d}</Text>
                </View>
              ))}
            </View>
            <Text style={st.safetyTip}>
              🛡️ {lang === "en" ? "Only share this OTP in person with the professional at your door." : "यह OTP केवल दरवाज़े पर मौजूद प्रोफेशनल को ही बताएं।"}
            </Text>
          </Card>
        )}

        {(b.status === "OTP_VERIFIED" || b.status === "INSPECTION") && (
          <Card testID="inspection-panel" style={{ alignItems: "center", paddingVertical: SP.xl }}>
            <View style={st.pulseIcon}>
              <Ionicons name="search" size={26} color={C.primary} />
            </View>
            <Text style={[st.panelTitle, { marginTop: SP.md }]}>{t("inspection")}</Text>
            <Text style={[st.panelSub, { textAlign: "center" }]}>{t("inspectionInProgress")}</Text>
          </Card>
        )}

        {b.status === "QUOTE_PENDING" && b.quote && (
          <Card testID="quote-panel" style={{ borderColor: "#FDE68A", borderWidth: 1.5 }}>
            <Text style={st.panelTitle}>{t("finalQuote")} 📋</Text>
            <View style={st.quoteCompare}>
              <View style={st.quoteCol}>
                <Text style={st.quoteColLabel}>{t("aiEstimate")}</Text>
                <Text style={st.quoteColValue}>{b.ai_estimate ? `${fmtMoney(b.ai_estimate.min)}–${fmtMoney(b.ai_estimate.max)}` : "--"}</Text>
              </View>
              <Text style={st.vs}>VS</Text>
              <View style={[st.quoteCol, { backgroundColor: C.primaryLight }]}>
                <Text style={[st.quoteColLabel, { color: C.primaryDark }]}>{t("workerQuote")}</Text>
                <Text style={[st.quoteColValue, { color: C.primaryDark, fontSize: 20 }]}>{fmtMoney(b.quote.total)}</Text>
              </View>
            </View>
            <View style={{ marginTop: SP.md }}>
              <Row label={lang === "en" ? "Problem found" : "समस्या"} value={b.quote.problem} />
              <Row label={lang === "en" ? "Repair" : "मरम्मत"} value={b.quote.repair} />
              {b.quote.parts?.map((p: any, i: number) => (
                <Row key={i} label={`${t("parts")}: ${p.name}`} value={fmtMoney(p.price)} />
              ))}
              <Row label={t("labour")} value={fmtMoney(b.quote.labour)} />
              <View style={st.divider} />
              <Row label={t("total")} value={fmtMoney(b.quote.total)} bold />
            </View>
            {b.quote.notes ? <Text style={st.quoteNotes}>💬 {b.quote.notes}</Text> : null}
            <View style={{ height: SP.md }} />
            <Btn testID="accept-quote-btn" title={t("acceptQuote")} variant="success" icon="checkmark-circle" loading={busy === "accept"} onPress={() => act("accept", () => api(`/bookings/${id}/quote/accept`, { method: "POST" }), lang === "en" ? "Quote accepted — repair starting!" : "कोटेशन स्वीकृत — मरम्मत शुरू!")} />
            <View style={{ height: SP.sm }} />
            <Btn testID="reject-quote-btn" title={t("rejectQuote")} variant="ghost" onPress={() => setShowRejectQuote(true)} />
          </Card>
        )}

        {pendingCharge && (
          <Card testID="charge-panel" style={{ borderColor: "#FDE68A", borderWidth: 1.5, marginTop: SP.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Ionicons name="alert-circle" size={18} color={C.warning} />
              <Text style={st.panelTitle}>{t("additionalCharge")}</Text>
            </View>
            <Row label={pendingCharge.item} value={fmtMoney(pendingCharge.amount)} bold />
            <Text style={st.panelSub}>{pendingCharge.reason}{pendingCharge.note ? ` — ${pendingCharge.note}` : ""}</Text>
            {pendingCharge.image_path && <Image source={{ uri: fileUrl(pendingCharge.image_path) }} style={st.chargeImg} contentFit="cover" />}
            <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.md }}>
              <View style={{ flex: 1 }}>
                <Btn testID="approve-charge-btn" title={t("approve")} variant="success" small loading={busy === "approveCharge"} onPress={() => act("approveCharge", () => api(`/bookings/${id}/additional-charge/${pendingCharge.id}/approve`, { method: "POST" }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Btn testID="decline-charge-btn" title={t("decline")} variant="ghost" small loading={busy === "declineCharge"} onPress={() => act("declineCharge", () => api(`/bookings/${id}/additional-charge/${pendingCharge.id}/reject`, { method: "POST" }))} />
              </View>
            </View>
          </Card>
        )}

        {(b.status === "WORK_STARTED" || b.status === "ADDITIONAL_CHARGE_PENDING") && (
          <Card testID="progress-panel" style={{ marginTop: pendingCharge ? SP.md : 0 }}>
            <Text style={st.panelTitle}>{t("workProgress")} 🔧</Text>
            {(b.progress || []).length === 0 ? (
              <Text style={st.panelSub}>{lang === "en" ? "Repair has started. Updates will appear here." : "मरम्मत शुरू हो गई है। अपडेट यहां दिखेंगे।"}</Text>
            ) : (
              (b.progress || []).slice().reverse().map((p: any) => (
                <View key={p.id} style={st.progressRow}>
                  <View style={st.progressDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.progressStage}>{p.stage.replace(/_/g, " ")}</Text>
                    {p.note ? <Text style={st.progressNote}>{p.note}</Text> : null}
                    {p.image_path && <Image source={{ uri: fileUrl(p.image_path) }} style={st.progressImg} contentFit="cover" />}
                    <Text style={st.progressTime}>{fmtDateTime(p.at)}</Text>
                  </View>
                </View>
              ))
            )}
          </Card>
        )}

        {b.status === "READY_FOR_COMPLETION" && (
          <Card testID="completion-panel" style={{ borderColor: "#DDD6FE", borderWidth: 1.5 }}>
            <Text style={st.panelTitle}>{lang === "en" ? "Review Work Proof" : "कार्य प्रमाण देखें"} ✅</Text>
            <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={st.baLabel}>{t("beforePhotos")}</Text>
                {(b.before_images || []).length ? (
                  <Image source={{ uri: fileUrl(b.before_images[0]) }} style={st.baImg} contentFit="cover" />
                ) : (
                  <View style={[st.baImg, st.baEmpty]}><Ionicons name="image-outline" size={22} color={C.text3} /></View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.baLabel}>{t("afterPhotos")}</Text>
                {(b.after_images || []).length ? (
                  <Image source={{ uri: fileUrl(b.after_images[0]) }} style={st.baImg} contentFit="cover" />
                ) : (
                  <View style={[st.baImg, st.baEmpty]}><Ionicons name="image-outline" size={22} color={C.text3} /></View>
                )}
              </View>
            </View>
            <View style={{ marginTop: SP.md }}>
              {b.quote?.parts?.map((p: any, i: number) => <Row key={i} label={p.name} value={fmtMoney(p.price)} />)}
              {b.quote && <Row label={t("labour")} value={fmtMoney(b.quote.labour)} />}
              {approvedCharges.map((c: any) => <Row key={c.id} label={`+ ${c.item}`} value={fmtMoney(c.amount)} />)}
              <View style={st.divider} />
              <Row label={t("finalBill")} value={fmtMoney(total)} bold />
            </View>
            <View style={{ height: SP.md }} />
            <Btn testID="confirm-completion-btn" title={t("confirmCompletion")} variant="success" icon="checkmark-done" loading={busy === "confirm"} onPress={() => act("confirm", () => api(`/bookings/${id}/confirm-completion`, { method: "POST" }))} />
          </Card>
        )}

        {b.status === "PAYMENT_PENDING" && (
          <Card testID="payment-panel" style={{ borderColor: "#FDE68A", borderWidth: 1.5 }}>
            <Text style={st.panelTitle}>{t("finalBill")} 💳</Text>
            {b.quote?.parts?.map((p: any, i: number) => <Row key={i} label={p.name} value={fmtMoney(p.price)} />)}
            {b.quote && <Row label={t("labour")} value={fmtMoney(b.quote.labour)} />}
            {approvedCharges.map((c: any) => <Row key={c.id} label={`+ ${c.item}`} value={fmtMoney(c.amount)} />)}
            <View style={st.divider} />
            <Row label={t("total")} value={fmtMoney(total)} bold />
            <View style={{ height: SP.md }} />
            <Btn testID="pay-now-btn" title={`${t("payNow")} • ${fmtMoney(total)}`} icon="card" onPress={() => setShowPay(true)} />
          </Card>
        )}

        {b.status === "COMPLETED" && (
          <>
            <Card testID="invoice-panel" style={{ backgroundColor: C.successLight, borderColor: "#A7F3D0" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="checkmark-done-circle" size={24} color={C.success} />
                <Text style={st.panelTitle}>{t("paymentSuccess")} 🎉</Text>
              </View>
              {b.invoice && (
                <View style={{ marginTop: SP.sm }}>
                  <Row label={t("invoice")} value={b.invoice.invoice_number} />
                  <Row label="Transaction" value={b.invoice.transaction_id} />
                  <Row label={lang === "en" ? "Method" : "विधि"} value={(b.payment?.method || "").toUpperCase()} />
                  <View style={st.divider} />
                  <Row label={lang === "en" ? "Amount Paid" : "भुगतान राशि"} value={fmtMoney(b.invoice.total)} bold />
                </View>
              )}
            </Card>
            {!b.review ? (
              <Card testID="rating-panel" style={{ marginTop: SP.md }}>
                <Text style={st.panelTitle}>{t("rateWorker")} ⭐</Text>
                <View style={{ alignItems: "center", marginVertical: SP.md }}>
                  <Stars value={rating} onChange={setRating} size={34} testID="rating-overall" />
                </View>
                {[
                  { label: t("behaviour"), value: behaviour, set: setBehaviour, tid: "rating-behaviour" },
                  { label: t("quality"), value: quality, set: setQuality, tid: "rating-quality" },
                  { label: t("priceSat"), value: price, set: setPrice, tid: "rating-price" },
                ].map((r) => (
                  <View key={r.tid} style={st.subRating}>
                    <Text style={st.subRatingLabel}>{r.label}</Text>
                    <Stars value={r.value} onChange={r.set} size={20} testID={r.tid} />
                  </View>
                ))}
                <Field value={comment} onChangeText={setComment} placeholder={t("writeReview")} multiline testID="review-comment-input" />
                <Btn testID="submit-review-btn" title={t("submitReview")} loading={busy === "review"} onPress={() => act("review", () => api(`/bookings/${id}/review`, { method: "POST", body: { rating, behaviour, quality, price, comment } }), lang === "en" ? "Thanks for your review!" : "आपकी समीक्षा के लिए धन्यवाद!")} />
              </Card>
            ) : (
              <Card testID="review-done-panel" style={{ marginTop: SP.md }}>
                <Text style={st.panelTitle}>{lang === "en" ? "Your Review" : "आपकी समीक्षा"}</Text>
                <Stars value={b.review.rating} size={20} />
                {b.review.comment ? <Text style={[st.panelSub, { marginTop: 6 }]}>{b.review.comment}</Text> : null}
              </Card>
            )}
          </>
        )}

        {b.status === "CANCELLED" && (
          <Card testID="cancelled-panel" style={{ backgroundColor: C.errorLight, borderColor: "#FECACA" }}>
            <Text style={[st.panelTitle, { color: C.error }]}>{t("cancelled")}</Text>
            <Text style={st.panelSub}>{b.cancel_reason || ""}</Text>
            {b.total_amount > 0 && <Row label={lang === "en" ? "Visit charge" : "विज़िट शुल्क"} value={fmtMoney(b.total_amount)} />}
          </Card>
        )}

        {/* Timeline */}
        {stepIdx >= 0 && (
          <Card style={{ marginTop: SP.md }} testID="timeline-panel">
            <Text style={st.panelTitle}>{t("timeline")}</Text>
            {PIPELINE_STEPS.map((s, i) => {
              const done = i < stepIdx || b.status === "COMPLETED";
              const current = i === stepIdx && b.status !== "COMPLETED";
              return (
                <View key={s.key} style={{ flexDirection: "row", gap: SP.md }}>
                  <View style={{ alignItems: "center" }}>
                    <View style={[st.stepDot, done && { backgroundColor: C.success }, current && { backgroundColor: C.primary }]}>
                      {done ? <Ionicons name="checkmark" size={11} color="#fff" /> : current ? <View style={st.stepInner} /> : null}
                    </View>
                    {i < PIPELINE_STEPS.length - 1 && <View style={[st.stepLine, done && { backgroundColor: C.success }]} />}
                  </View>
                  <Text style={[st.stepText, (done || current) && { color: C.text, fontWeight: "600" }]}>
                    {lang === "hi" ? s.hi : s.en}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        {/* Details + audit */}
        <Card style={{ marginTop: SP.md }}>
          <Text style={st.panelTitle}>{lang === "en" ? "Details" : "विवरण"}</Text>
          <Row label={lang === "en" ? "Schedule" : "समय"} value={`${b.scheduled_date} • ${b.scheduled_time}`} />
          <Row label={t("address")} value={b.address?.line || ""} />
          {b.description ? <Text style={[st.panelSub, { marginTop: 6 }]}>“{b.description}”</Text> : null}
        </Card>

        {canCancel && (
          <View style={{ marginTop: SP.lg }}>
            <Btn testID="cancel-booking-btn" title={t("cancelBooking")} variant="ghost" onPress={() => setShowCancel(true)} />
          </View>
        )}
      </ScrollView>

      {/* SOS floating button */}
      {isActive && (
        <Pressable
          testID="sos-button"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
            setShowSos(true);
          }}
          style={[st.sosFab, { bottom: insets.bottom + 20 }]}
        >
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={st.sosText}>{t("sos")}</Text>
        </Pressable>
      )}

      {/* SOS sheet */}
      <Sheet visible={showSos} onClose={() => setShowSos(false)} title={t("sosTitle")}>
        <Text style={st.sosNote}>{t("sosNote")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: SP.md }}>
          {SOS_CATEGORIES.map((s) => (
            <Pressable key={s.id} testID={`sos-cat-${s.id}`} onPress={() => setSosCategory(s.id)} style={[st.sosChip, sosCategory === s.id && st.sosChipActive]}>
              <Text style={[st.sosChipText, sosCategory === s.id && { color: "#fff" }]}>{lang === "hi" ? s.hi : s.en}</Text>
            </Pressable>
          ))}
        </View>
        <Field value={sosDesc} onChangeText={setSosDesc} placeholder={lang === "en" ? "Describe what happened..." : "क्या हुआ बताएं..."} multiline testID="sos-desc-input" />
        <Btn
          testID="sos-submit-btn"
          title={lang === "en" ? "Send SOS Report" : "SOS रिपोर्ट भेजें"}
          variant="danger"
          icon="warning"
          loading={busy === "sos"}
          onPress={async () => {
            if (!sosCategory) {
              toast(lang === "en" ? "Select a category" : "श्रेणी चुनें", "error");
              return;
            }
            await act("sos", () => api(`/bookings/${id}/sos`, { method: "POST", body: { category: sosCategory, description: sosDesc } }), lang === "en" ? "SOS sent — our safety team is alerted" : "SOS भेजा गया — सुरक्षा टीम सतर्क");
            setShowSos(false);
            setSosCategory("");
            setSosDesc("");
          }}
        />
      </Sheet>

      {/* Cancel sheet */}
      <Sheet visible={showCancel} onClose={() => setShowCancel(false)} title={t("cancelBooking")}>
        <Text style={st.panelSub}>{lang === "en" ? "Are you sure you want to cancel this booking?" : "क्या आप वाकई यह बुकिंग रद्द करना चाहते हैं?"}</Text>
        <View style={{ height: SP.lg }} />
        <Btn
          testID="confirm-cancel-btn"
          title={lang === "en" ? "Yes, Cancel Booking" : "हाँ, बुकिंग रद्द करें"}
          variant="danger"
          loading={busy === "cancel"}
          onPress={async () => {
            await act("cancel", () => api(`/bookings/${id}/cancel`, { method: "POST", body: { reason: "Customer cancelled" } }));
            setShowCancel(false);
          }}
        />
      </Sheet>

      {/* Reject quote sheet */}
      <Sheet visible={showRejectQuote} onClose={() => setShowRejectQuote(false)} title={t("rejectQuote")}>
        <View style={st.visitWarn}>
          <Ionicons name="information-circle" size={18} color={C.warning} />
          <Text style={[st.panelSub, { flex: 1 }]}>{t("rejectNote")}</Text>
        </View>
        <View style={{ height: SP.lg }} />
        <Btn
          testID="confirm-reject-quote-btn"
          title={lang === "en" ? "Confirm — Reject & Pay ₹149 Visit Charge" : "पुष्टि करें — अस्वीकारें, ₹149 विज़िट शुल्क"}
          variant="danger"
          loading={busy === "rejectQuote"}
          onPress={async () => {
            await act("rejectQuote", () => api(`/bookings/${id}/quote/reject`, { method: "POST", body: { confirm_visit_charge: true } }));
            setShowRejectQuote(false);
          }}
        />
      </Sheet>

      {/* Payment sheet */}
      <Sheet visible={showPay} onClose={() => setShowPay(false)} title={t("choosePayment")}>
        <Row label={t("total")} value={fmtMoney(total)} bold />
        <View style={{ height: SP.md }} />
        {[
          { m: "upi", icon: "phone-portrait", label: t("upi") },
          { m: "card", icon: "card", label: t("card") },
          { m: "cash", icon: "cash", label: t("cash") },
        ].map((p) => (
          <Pressable
            key={p.m}
            testID={`pay-method-${p.m}`}
            onPress={async () => {
              setShowPay(false);
              await act("pay", () => api(`/bookings/${id}/payment`, { method: "POST", body: { method: p.m } }), t("paymentSuccess"));
            }}
            style={st.payRow}
          >
            <Ionicons name={p.icon as any} size={20} color={C.primary} />
            <Text style={st.payLabel}>{p.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.text3} />
          </Pressable>
        ))}
        <Text style={[st.panelSub, { textAlign: "center", marginTop: 4 }]}>{lang === "en" ? "Demo mode — no real money is charged." : "डेमो मोड — कोई वास्तविक भुगतान नहीं।"}</Text>
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  headerSub: { fontSize: 11, color: C.text3 },
  timeText: { fontSize: 11, color: C.text3 },
  workerName: { fontSize: 14.5, fontWeight: "800", color: C.text },
  workerMeta: { fontSize: 11.5, color: C.text3, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.success, alignItems: "center", justifyContent: "center" },
  waitText: { fontSize: 13.5, color: C.text2, fontWeight: "600", marginTop: SP.md, textAlign: "center" },
  panelTitle: { fontSize: 15.5, fontWeight: "800", color: C.text },
  panelSub: { fontSize: 12.5, color: C.text3, marginTop: 2, lineHeight: 18 },
  trackWrap: { marginTop: SP.lg },
  trackLine: { height: 6, backgroundColor: C.bg3, borderRadius: 3 },
  trackFill: { height: 6, backgroundColor: C.primary, borderRadius: 3 },
  trackDot: { position: "absolute", top: -11, width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", ...shadow },
  trackValue: { fontSize: 16, fontWeight: "900", color: C.text },
  trackLabel: { fontSize: 10.5, color: C.text3, marginTop: 2 },
  liveNote: { fontSize: 11, color: C.text3, marginTop: SP.md },
  otpRow: { flexDirection: "row", gap: 8, marginVertical: SP.lg },
  otpBox: { width: 42, height: 52, borderRadius: R.sm + 2, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#C4B5FD", alignItems: "center", justifyContent: "center" },
  otpDigit: { fontSize: 24, fontWeight: "900", color: "#6D28D9" },
  safetyTip: { fontSize: 11.5, color: "#6D28D9", textAlign: "center", paddingHorizontal: SP.md },
  pulseIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  quoteCompare: { flexDirection: "row", alignItems: "center", gap: SP.sm, marginTop: SP.md },
  quoteCol: { flex: 1, backgroundColor: C.bg2, borderRadius: R.md, padding: SP.md, alignItems: "center" },
  quoteColLabel: { fontSize: 10.5, color: C.text3, fontWeight: "700", textTransform: "uppercase" },
  quoteColValue: { fontSize: 15, fontWeight: "900", color: C.text, marginTop: 4 },
  vs: { fontSize: 11, fontWeight: "900", color: C.text3 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 6 },
  quoteNotes: { fontSize: 12, color: C.text2, marginTop: 8, fontStyle: "italic" },
  chargeImg: { width: "100%", height: 120, borderRadius: R.sm, marginTop: SP.sm },
  progressRow: { flexDirection: "row", gap: SP.md, marginTop: SP.md },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginTop: 5 },
  progressStage: { fontSize: 13, fontWeight: "700", color: C.text },
  progressNote: { fontSize: 12, color: C.text3, marginTop: 1 },
  progressImg: { width: 130, height: 90, borderRadius: R.sm, marginTop: 6 },
  progressTime: { fontSize: 10.5, color: C.text3, marginTop: 3 },
  baLabel: { fontSize: 11.5, fontWeight: "700", color: C.text3, marginBottom: 4 },
  baImg: { width: "100%", height: 110, borderRadius: R.sm },
  baEmpty: { backgroundColor: C.bg3, alignItems: "center", justifyContent: "center" },
  subRating: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.sm },
  subRatingLabel: { fontSize: 13, color: C.text2, fontWeight: "600" },
  stepDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.bg3, alignItems: "center", justifyContent: "center" },
  stepInner: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#fff" },
  stepLine: { width: 2, height: 16, backgroundColor: C.bg3 },
  stepText: { fontSize: 12.5, color: C.text3, paddingBottom: 12 },
  sosFab: { position: "absolute", right: SP.lg, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.error, paddingHorizontal: 18, height: 48, borderRadius: R.pill, shadowColor: C.error, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  sosText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  sosNote: { fontSize: 12, color: C.error, backgroundColor: C.errorLight, padding: SP.md, borderRadius: R.sm, lineHeight: 17 },
  sosChip: { paddingHorizontal: 12, height: 36, borderRadius: R.pill, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  sosChipActive: { backgroundColor: C.error, borderColor: C.error },
  sosChipText: { fontSize: 12, fontWeight: "600", color: C.text2 },
  visitWarn: { flexDirection: "row", gap: 8, backgroundColor: C.warningLight, padding: SP.md, borderRadius: R.sm, alignItems: "flex-start" },
  payRow: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: C.bg2, borderRadius: R.md, padding: SP.lg, marginBottom: SP.sm, borderWidth: 1, borderColor: C.border },
  payLabel: { flex: 1, fontSize: 14.5, fontWeight: "700", color: C.text },
});
