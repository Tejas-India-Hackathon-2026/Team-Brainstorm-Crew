import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";

import { api, fileUrl, uploadImage } from "@/src/api";
import { usePoll } from "@/src/hooks";
import { useI18n } from "@/src/i18n";
import { C, R, SP, shadow } from "@/src/theme";
import { PROGRESS_STAGES, STATUS_META, fmtDateTime, fmtMoney, statusLabel } from "@/src/types";
import { Avatar, Badge, Btn, Card, Field, Row, Sheet, toast } from "@/src/components/ui";

export default function WorkerJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [b, setB] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  // inspection form
  const [problem, setProblem] = useState("");
  const [repair, setRepair] = useState("");
  const [labour, setLabour] = useState("");
  const [parts, setParts] = useState<{ name: string; price: string }[]>([]);
  const [notes, setNotes] = useState("");
  // progress
  const [progressNote, setProgressNote] = useState("");
  const [selectedStage, setSelectedStage] = useState("REPAIRING");
  // additional charge
  const [showCharge, setShowCharge] = useState(false);
  const [chargeItem, setChargeItem] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeReason, setChargeReason] = useState("");

  usePoll(async () => setB(await api<any>(`/bookings/${id}`)), 3500, [id]);

  const act = async (key: string, fn: () => Promise<any>, msg?: string) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res?.id) setB(res);
      if (msg) toast(msg, "success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      toast(e?.message || "Action failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const post = (path: string, body?: any) => api(`/worker/jobs/${id}${path}`, { method: "POST", body });

  const uploadProgressImage = async (kind: "before" | "after") => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5 });
      if (result.canceled) return;
      setBusy("upload" + kind);
      const asset = result.assets[0];
      const path = await uploadImage(asset.uri, asset.fileName || `${kind}.jpg`, asset.mimeType || "image/jpeg");
      await act(kind, () => post("/progress", { stage: kind === "before" ? "WORK_STARTED" : "FINAL_CHECK", note: kind === "before" ? "Before photo" : "After photo", image_path: path, kind }), lang === "en" ? `${kind === "before" ? "Before" : "After"} photo uploaded` : "फ़ोटो अपलोड हुई");
    } catch (e: any) {
      toast(e?.message || "Upload failed", "error");
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
  const partsTotal = parts.reduce((s, p) => s + (parseFloat(p.price) || 0), 0);
  const quoteTotal = partsTotal + (parseFloat(labour) || 0);
  const pendingCharge = (b.additional_charges || []).find((c: any) => c.status === "PENDING");

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="job-back-btn" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(worker)/dashboard" as any))} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={st.headerTitle}>{b.service_name}</Text>
          <Text style={st.headerSub}>{b.booking_number}</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 140 }} bottomOffset={90}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md }}>
          <Badge testID="job-status-badge" text={statusLabel(b.status, lang)} color={meta.color} bg={meta.bg} />
          {b.priority && <Badge text="PRIORITY ⚡" color="#B45309" bg="#FFFBEB" />}
        </View>

        {/* Customer + job info */}
        <Card testID="job-customer-card" style={{ marginBottom: SP.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SP.md }}>
            <Avatar uri={b.customer?.picture} size={44} name={b.customer?.name} />
            <View style={{ flex: 1 }}>
              <Text style={st.custName}>{b.customer?.name}</Text>
              <Text style={st.custMeta}>{b.customer?.phone_masked}</Text>
            </View>
            <Pressable
              testID="call-customer-btn"
              onPress={() => toast(lang === "en" ? "Connecting via masked SkillSync line (demo)..." : "मास्क्ड लाइन से जोड़ रहे हैं (डेमो)...", "info")}
              style={st.callBtn}
            >
              <Ionicons name="call" size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={st.infoDivider} />
          <Row label={t("address")} value={b.address?.line || ""} />
          <Row label={lang === "en" ? "Schedule" : "समय"} value={`${b.scheduled_date} • ${b.scheduled_time}`} />
          {b.description ? <Text style={st.desc}>“{b.description}”</Text> : null}
          {b.ai_estimate && (
            <View style={st.aiBox}>
              <Ionicons name="sparkles" size={13} color={C.primaryDark} />
              <Text style={st.aiText}>
                AI: {b.ai_estimate.detected_problem} • {b.ai_estimate.severity} • {fmtMoney(b.ai_estimate.min)}–{fmtMoney(b.ai_estimate.max)}
              </Text>
            </View>
          )}
        </Card>

        {/* -------- Status actions -------- */}
        {b.status === "REQUEST_SENT" && (
          <Card testID="job-accept-panel">
            <Text style={st.panelTitle}>{lang === "en" ? "New Job Request" : "नया काम"}</Text>
            <View style={{ height: SP.md }} />
            <Btn testID="job-accept-btn" title={t("accept")} variant="success" icon="checkmark-circle" loading={busy === "accept"} onPress={() => act("accept", () => post("/accept"), lang === "en" ? "Accepted! Customer notified." : "स्वीकृत! ग्राहक को सूचित किया।")} />
            <View style={{ height: SP.sm }} />
            <Btn testID="job-reject-btn" title={t("reject")} variant="ghost" loading={busy === "reject"} onPress={() => act("reject", () => post("/reject", { reason: "Not available" }))} />
          </Card>
        )}

        {b.status === "WORKER_ACCEPTED" && (
          <Card testID="job-navigate-panel">
            <Text style={st.panelTitle}>{lang === "en" ? "Ready to go?" : "जाने के लिए तैयार?"}</Text>
            <Text style={st.panelSub}>{lang === "en" ? "Customer will see your live location once you start." : "शुरू करते ही ग्राहक आपकी लाइव लोकेशन देखेंगे।"}</Text>
            <View style={{ height: SP.md }} />
            <Btn testID="start-navigation-btn" title={t("startNavigation")} icon="navigate" loading={busy === "onway"} onPress={() => act("onway", () => post("/on-way"), lang === "en" ? "On the way — customer can track you live" : "रास्ते में — ग्राहक ट्रैक कर सकते हैं")} />
          </Card>
        )}

        {b.status === "WORKER_ON_WAY" && (
          <Card testID="job-arrived-panel">
            <Text style={st.panelTitle}>{t("onTheWay")} 🛵</Text>
            <Text style={st.panelSub}>{lang === "en" ? `${b.address?.line} — tap when you reach.` : `${b.address?.line} — पहुंचने पर टैप करें।`}</Text>
            <View style={{ height: SP.md }} />
            <Btn testID="mark-arrived-btn" title={t("markArrived")} variant="success" icon="location" loading={busy === "arrived"} onPress={() => act("arrived", () => post("/arrived"), lang === "en" ? "Arrival marked — OTP sent to customer" : "आगमन दर्ज — ग्राहक को OTP भेजा गया")} />
          </Card>
        )}

        {b.status === "WORKER_ARRIVED" && (
          <Card testID="job-otp-panel" style={{ borderColor: "#DDD6FE", borderWidth: 1.5 }}>
            <Text style={st.panelTitle}>{t("enterOtp")} 🔐</Text>
            <Text style={st.panelSub}>{t("otpHint")}</Text>
            <TextInput
              testID="otp-input"
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="••••••"
              placeholderTextColor={C.text3}
              keyboardType="number-pad"
              maxLength={6}
              style={st.otpInput}
            />
            <Btn testID="verify-otp-btn" title={t("verifyStart")} disabled={otp.length !== 6} loading={busy === "otp"} onPress={() => act("otp", () => post("/verify-otp", { otp }), lang === "en" ? "OTP verified — service started!" : "OTP सत्यापित — सेवा शुरू!")} />
          </Card>
        )}

        {(b.status === "OTP_VERIFIED" || b.status === "INSPECTION") && (
          <Card testID="inspection-form-panel">
            <Text style={st.panelTitle}>{t("inspection")} 🔍</Text>
            <Text style={st.panelSub}>{lang === "en" ? "Inspect and submit the final quote. Customer must approve before repair." : "जांच करें और अंतिम कोटेशन भेजें। मरम्मत से पहले ग्राहक की मंज़ूरी ज़रूरी है।"}</Text>
            <View style={{ height: SP.md }} />
            <Field label={t("actualProblem")} value={problem} onChangeText={setProblem} placeholder={lang === "en" ? "e.g. Loose pipe joint" : "जैसे: ढीला पाइप जॉइंट"} testID="inspection-problem-input" />
            <Field label={t("requiredRepair")} value={repair} onChangeText={setRepair} placeholder={lang === "en" ? "e.g. Replace seal and tighten joint" : "जैसे: सील बदलें"} testID="inspection-repair-input" />

            <Text style={st.fieldLabel}>{t("parts")}</Text>
            {parts.map((p, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <TextInput value={p.name} onChangeText={(v) => setParts(parts.map((x, j) => (j === i ? { ...x, name: v } : x)))} placeholder={lang === "en" ? "Part name" : "पार्ट नाम"} placeholderTextColor={C.text3} style={[st.partInput, { flex: 2 }]} testID={`part-name-${i}`} />
                <TextInput value={p.price} onChangeText={(v) => setParts(parts.map((x, j) => (j === i ? { ...x, price: v.replace(/[^0-9.]/g, "") } : x)))} placeholder="₹" placeholderTextColor={C.text3} keyboardType="numeric" style={[st.partInput, { flex: 1 }]} testID={`part-price-${i}`} />
                <Pressable testID={`part-remove-${i}`} onPress={() => setParts(parts.filter((_, j) => j !== i))} style={st.partRemove}>
                  <Ionicons name="close" size={16} color={C.error} />
                </Pressable>
              </View>
            ))}
            <Pressable testID="add-part-btn" onPress={() => setParts([...parts, { name: "", price: "" }])} style={st.addPartBtn}>
              <Ionicons name="add" size={16} color={C.primary} />
              <Text style={st.addPartText}>{t("addPart")}</Text>
            </Pressable>

            <Field label={t("labourCharge")} value={labour} onChangeText={(v) => setLabour(v.replace(/[^0-9.]/g, ""))} placeholder="600" keyboardType="numeric" testID="inspection-labour-input" />
            <Field label={lang === "en" ? "Notes (optional)" : "नोट्स (वैकल्पिक)"} value={notes} onChangeText={setNotes} multiline testID="inspection-notes-input" />

            <View style={st.totalBox}>
              <Row label={t("parts")} value={fmtMoney(partsTotal)} />
              <Row label={t("labour")} value={fmtMoney(parseFloat(labour) || 0)} />
              <View style={st.infoDivider} />
              <Row label={t("total")} value={fmtMoney(quoteTotal)} bold />
            </View>
            <View style={{ height: SP.md }} />
            <Btn
              testID="submit-inspection-btn"
              title={t("submitInspection")}
              icon="document-text"
              loading={busy === "inspection"}
              onPress={() => {
                if (!problem.trim() || !repair.trim() || !labour) {
                  toast(lang === "en" ? "Fill problem, repair and labour charge" : "समस्या, मरम्मत और मज़दूरी भरें", "error");
                  return;
                }
                act("inspection", () => post("/inspection", {
                  problem: problem.trim(), repair: repair.trim(),
                  parts: parts.filter((p) => p.name && p.price).map((p) => ({ name: p.name, price: parseFloat(p.price) })),
                  labour: parseFloat(labour), notes, eta_minutes: 60, image_paths: [],
                }), lang === "en" ? "Quote sent — waiting for customer approval" : "कोटेशन भेजा — ग्राहक की मंज़ूरी का इंतज़ार");
              }}
            />
          </Card>
        )}

        {b.status === "QUOTE_PENDING" && (
          <Card testID="quote-waiting-panel" style={{ alignItems: "center", paddingVertical: SP.xl }}>
            <ActivityIndicator color={C.warning} />
            <Text style={st.waitText}>{lang === "en" ? "Waiting for customer to approve your quote..." : "ग्राहक की कोटेशन मंज़ूरी का इंतज़ार..."}</Text>
            <Text style={[st.panelSub, { textAlign: "center" }]}>{fmtMoney(b.quote?.total || 0)}</Text>
          </Card>
        )}

        {(b.status === "WORK_STARTED" || b.status === "ADDITIONAL_CHARGE_PENDING") && (
          <>
            {pendingCharge && (
              <Card testID="charge-waiting-panel" style={{ borderColor: "#FDE68A", borderWidth: 1.5, marginBottom: SP.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color={C.warning} size="small" />
                  <Text style={st.panelTitle}>{lang === "en" ? "Charge approval pending" : "शुल्क मंज़ूरी बाकी"}</Text>
                </View>
                <Text style={st.panelSub}>{pendingCharge.item} — {fmtMoney(pendingCharge.amount)}</Text>
              </Card>
            )}

            <Card testID="work-panel">
              <Text style={st.panelTitle}>{t("workProgress")} 🔧</Text>

              {/* before / after quick uploads */}
              <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.md }}>
                <Pressable testID="upload-before-btn" onPress={() => uploadProgressImage("before")} style={st.baUpload}>
                  {b.before_images?.length ? (
                    <Image source={{ uri: fileUrl(b.before_images[0]) }} style={st.baImg} contentFit="cover" />
                  ) : busy === "uploadbefore" ? <ActivityIndicator color={C.primary} /> : (
                    <>
                      <Ionicons name="camera" size={20} color={C.primary} />
                      <Text style={st.baText}>{t("beforePhotos")}</Text>
                    </>
                  )}
                </Pressable>
                <Pressable testID="upload-after-btn" onPress={() => uploadProgressImage("after")} style={st.baUpload}>
                  {b.after_images?.length ? (
                    <Image source={{ uri: fileUrl(b.after_images[0]) }} style={st.baImg} contentFit="cover" />
                  ) : busy === "uploadafter" ? <ActivityIndicator color={C.primary} /> : (
                    <>
                      <Ionicons name="camera" size={20} color={C.success} />
                      <Text style={[st.baText, { color: C.success }]}>{t("afterPhotos")}</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* stage chips */}
              <Text style={[st.fieldLabel, { marginTop: SP.md }]}>{lang === "en" ? "Update status" : "स्थिति अपडेट करें"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 48 }} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
                {PROGRESS_STAGES.map((s) => (
                  <Pressable key={s.id} testID={`stage-${s.id}`} onPress={() => setSelectedStage(s.id)} style={[st.stageChip, selectedStage === s.id && st.stageActive]}>
                    <Text style={[st.stageText, selectedStage === s.id && { color: "#fff" }]}>{lang === "hi" ? s.hi : s.en}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TextInput value={progressNote} onChangeText={setProgressNote} placeholder={lang === "en" ? "Add a note..." : "नोट जोड़ें..."} placeholderTextColor={C.text3} style={[st.partInput, { flex: 1 }]} testID="progress-note-input" />
                <Btn testID="send-progress-btn" title={lang === "en" ? "Send" : "भेजें"} small loading={busy === "progress"} onPress={() => {
                  act("progress", () => post("/progress", { stage: selectedStage, note: progressNote, kind: "progress" }), lang === "en" ? "Progress sent to customer" : "प्रगति ग्राहक को भेजी");
                  setProgressNote("");
                }} />
              </View>

              <View style={{ height: SP.lg }} />
              <Btn testID="request-charge-btn" title={t("requestCharge")} variant="ghost" icon="cash-outline" onPress={() => setShowCharge(true)} disabled={!!pendingCharge} />
              <View style={{ height: SP.sm }} />
              <Btn testID="mark-ready-btn" title={t("markReady")} variant="success" icon="checkmark-done" loading={busy === "ready"} onPress={() => act("ready", () => post("/ready"), lang === "en" ? "Marked complete — waiting for customer confirmation" : "पूर्ण चिह्नित — ग्राहक पुष्टि का इंतज़ार")} />
            </Card>
          </>
        )}

        {b.status === "READY_FOR_COMPLETION" && (
          <Card testID="waiting-confirm-panel" style={{ alignItems: "center", paddingVertical: SP.xl }}>
            <ActivityIndicator color={C.primary} />
            <Text style={st.waitText}>{lang === "en" ? "Waiting for customer to review proof & confirm completion..." : "ग्राहक की पुष्टि का इंतज़ार..."}</Text>
          </Card>
        )}

        {(b.status === "PAYMENT_PENDING" || b.status === "PAYMENT_SUCCESS") && (
          <Card testID="awaiting-payment-panel" style={{ alignItems: "center", paddingVertical: SP.xl }}>
            <Ionicons name="card-outline" size={28} color={C.warning} />
            <Text style={st.waitText}>{lang === "en" ? `Awaiting payment of ${fmtMoney(b.total_amount)}...` : `${fmtMoney(b.total_amount)} भुगतान का इंतज़ार...`}</Text>
          </Card>
        )}

        {b.status === "COMPLETED" && (
          <Card testID="job-completed-panel" style={{ backgroundColor: C.successLight, borderColor: "#A7F3D0" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="checkmark-done-circle" size={26} color={C.success} />
              <Text style={st.panelTitle}>{lang === "en" ? "Job Completed 🎉" : "काम पूर्ण 🎉"}</Text>
            </View>
            <Row label={lang === "en" ? "Amount collected" : "एकत्रित राशि"} value={fmtMoney(b.payment?.amount || b.total_amount)} />
            <Row label={lang === "en" ? "Your net earning (after 10% fee)" : "आपकी शुद्ध कमाई (10% फीस के बाद)"} value={fmtMoney((b.payment?.amount || b.total_amount) * 0.9)} bold />
            {b.review && (
              <View style={{ marginTop: SP.sm }}>
                <Text style={st.panelSub}>{lang === "en" ? "Customer rating" : "ग्राहक रेटिंग"}: {"★".repeat(b.review.rating)} {b.review.comment ? `— “${b.review.comment}”` : ""}</Text>
              </View>
            )}
          </Card>
        )}

        {b.status === "CANCELLED" && (
          <Card testID="job-cancelled-panel" style={{ backgroundColor: C.errorLight, borderColor: "#FECACA" }}>
            <Text style={[st.panelTitle, { color: C.error }]}>{t("cancelled")}</Text>
            <Text style={st.panelSub}>{b.cancel_reason || ""}</Text>
          </Card>
        )}

        {/* Audit trail */}
        <Card style={{ marginTop: SP.md }} testID="job-events-panel">
          <Text style={st.panelTitle}>{t("timeline")}</Text>
          {(b.events || []).slice().reverse().slice(0, 12).map((e: any) => (
            <View key={e.id} style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <View style={st.eventDot} />
              <View style={{ flex: 1 }}>
                <Text style={st.eventType}>{e.event_type.replace(/_/g, " ")}</Text>
                <Text style={st.eventTime}>{fmtDateTime(e.timestamp)} • {e.actor_role}</Text>
              </View>
            </View>
          ))}
        </Card>
      </KeyboardAwareScrollView>

      {/* Additional charge sheet */}
      <Sheet visible={showCharge} onClose={() => setShowCharge(false)} title={t("additionalCharge")}>
        <Field label={lang === "en" ? "Part / Service" : "पार्ट / सेवा"} value={chargeItem} onChangeText={setChargeItem} placeholder={lang === "en" ? "e.g. New valve" : "जैसे: नया वाल्व"} testID="charge-item-input" />
        <Field label={lang === "en" ? "Amount (₹)" : "राशि (₹)"} value={chargeAmount} onChangeText={(v) => setChargeAmount(v.replace(/[^0-9.]/g, ""))} keyboardType="numeric" placeholder="250" testID="charge-amount-input" />
        <Field label={lang === "en" ? "Reason" : "कारण"} value={chargeReason} onChangeText={setChargeReason} placeholder={lang === "en" ? "Why is this needed?" : "यह क्यों ज़रूरी है?"} multiline testID="charge-reason-input" />
        <Btn
          testID="submit-charge-btn"
          title={lang === "en" ? "Send for Customer Approval" : "ग्राहक मंज़ूरी के लिए भेजें"}
          loading={busy === "charge"}
          onPress={async () => {
            if (!chargeItem.trim() || !chargeAmount || !chargeReason.trim()) {
              toast(lang === "en" ? "Fill all charge details" : "सभी विवरण भरें", "error");
              return;
            }
            await act("charge", () => post("/additional-charge", { item: chargeItem.trim(), amount: parseFloat(chargeAmount), reason: chargeReason.trim() }), lang === "en" ? "Sent — customer must approve" : "भेजा — ग्राहक मंज़ूरी देंगे");
            setShowCharge(false);
            setChargeItem("");
            setChargeAmount("");
            setChargeReason("");
          }}
        />
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  headerSub: { fontSize: 11, color: C.text3 },
  custName: { fontSize: 14.5, fontWeight: "800", color: C.text },
  custMeta: { fontSize: 11.5, color: C.text3, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.success, alignItems: "center", justifyContent: "center" },
  infoDivider: { height: 1, backgroundColor: C.border, marginVertical: SP.sm },
  desc: { fontSize: 12.5, color: C.text2, marginTop: 6, fontStyle: "italic" },
  aiBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.primaryLight, borderRadius: R.sm, padding: SP.sm, marginTop: SP.sm },
  aiText: { fontSize: 11.5, color: C.primaryDark, fontWeight: "600", flex: 1 },
  panelTitle: { fontSize: 15.5, fontWeight: "800", color: C.text },
  panelSub: { fontSize: 12.5, color: C.text3, marginTop: 3, lineHeight: 18 },
  waitText: { fontSize: 13.5, color: C.text2, fontWeight: "600", marginTop: SP.md, textAlign: "center", paddingHorizontal: SP.md },
  otpInput: { borderWidth: 1.5, borderColor: "#C4B5FD", borderRadius: R.md, height: 60, fontSize: 26, fontWeight: "900", color: "#6D28D9", textAlign: "center", letterSpacing: 12, marginVertical: SP.md, backgroundColor: "#fff" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: C.text2, marginBottom: 6 },
  partInput: { borderWidth: 1, borderColor: C.border, borderRadius: R.sm + 2, paddingHorizontal: SP.md, height: 44, fontSize: 14, color: C.text, backgroundColor: "#fff" },
  partRemove: { width: 44, height: 44, borderRadius: R.sm + 2, backgroundColor: C.errorLight, alignItems: "center", justifyContent: "center" },
  addPartBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginBottom: SP.md, paddingVertical: 6 },
  addPartText: { color: C.primary, fontWeight: "700", fontSize: 13 },
  totalBox: { backgroundColor: C.bg2, borderRadius: R.md, padding: SP.md },
  baUpload: { flex: 1, height: 92, borderRadius: R.sm + 2, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#BFDBFE", backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center", gap: 4, overflow: "hidden" },
  baImg: { width: "100%", height: "100%" },
  baText: { fontSize: 11, fontWeight: "700", color: C.primary },
  stageChip: { paddingHorizontal: 14, height: 36, borderRadius: R.pill, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stageActive: { backgroundColor: C.primary, borderColor: C.primary },
  stageText: { fontSize: 12, fontWeight: "700", color: C.text2 },
  eventDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.primary, marginTop: 5 },
  eventType: { fontSize: 12.5, fontWeight: "700", color: C.text, textTransform: "capitalize" },
  eventTime: { fontSize: 10.5, color: C.text3, marginTop: 1 },
});
