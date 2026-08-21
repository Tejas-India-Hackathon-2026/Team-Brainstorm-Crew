import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { api } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { fmtDateTime } from "@/src/types";
import { Badge, Btn, Field, toast } from "@/src/components/ui";

const CATEGORIES = [
  { id: "booking_issue", en: "Booking issue", hi: "बुकिंग समस्या" },
  { id: "payment_issue", en: "Payment issue", hi: "भुगतान समस्या" },
  { id: "worker_issue", en: "Worker issue", hi: "वर्कर समस्या" },
  { id: "refund", en: "Refund / cancellation", hi: "रिफंड / रद्दीकरण" },
  { id: "quality", en: "Poor quality / dispute", hi: "खराब गुणवत्ता / विवाद" },
  { id: "other", en: "Other", hi: "अन्य" },
];

export default function Support() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cases, setCases] = useState<any[]>([]);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api<any[]>("/support/cases").then(setCases).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!category || !subject.trim() || !description.trim()) {
      toast(lang === "en" ? "Fill all fields" : "सभी फ़ील्ड भरें", "error");
      return;
    }
    setBusy(true);
    try {
      const c = await api<any>("/support/cases", { method: "POST", body: { category, subject: subject.trim(), description: description.trim() } });
      toast(`${lang === "en" ? "Case created" : "केस बनाया गया"}: ${c.case_number}`, "success");
      setCategory("");
      setSubject("");
      setDescription("");
      load();
    } catch (e: any) {
      toast(e?.message || "Failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="support-back-btn" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={st.title}>{t("help")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 120 }} bottomOffset={80}>
        <Text style={st.section}>{lang === "en" ? "Raise a Complaint / Dispute" : "शिकायत / विवाद दर्ज करें"}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: SP.md }}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.id} testID={`support-cat-${c.id}`} onPress={() => setCategory(c.id)} style={[st.chip, category === c.id && st.chipActive]}>
              <Text style={[st.chipText, category === c.id && { color: "#fff" }]}>{lang === "hi" ? c.hi : c.en}</Text>
            </Pressable>
          ))}
        </View>
        <Field label={lang === "en" ? "Subject" : "विषय"} value={subject} onChangeText={setSubject} placeholder={lang === "en" ? "Brief summary" : "संक्षिप्त सारांश"} testID="support-subject-input" />
        <Field label={lang === "en" ? "Description" : "विवरण"} value={description} onChangeText={setDescription} multiline placeholder={lang === "en" ? "Tell us what happened..." : "क्या हुआ बताएं..."} testID="support-desc-input" />
        <Btn testID="support-submit-btn" title={lang === "en" ? "Submit Case" : "केस भेजें"} icon="send" onPress={submit} loading={busy} />

        <Text style={st.section}>{lang === "en" ? "Your Cases" : "आपके केस"}</Text>
        {cases.length === 0 ? (
          <Text style={st.emptyText}>{lang === "en" ? "No support cases yet" : "अभी कोई केस नहीं"}</Text>
        ) : (
          cases.map((c) => (
            <View key={c.id} style={st.caseCard} testID={`case-${c.case_number}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={st.caseNumber}>{c.case_number}</Text>
                <Badge text={c.status} color={c.status === "OPEN" ? "#B45309" : "#047857"} bg={c.status === "OPEN" ? "#FFFBEB" : "#ECFDF5"} />
              </View>
              <Text style={st.caseSubject}>{c.subject}</Text>
              <Text style={st.caseMeta}>{fmtDateTime(c.created_at)}</Text>
              {(c.updates || []).map((u: any, i: number) => (
                <Text key={i} style={st.caseUpdate}>↪ {u.text}</Text>
              ))}
            </View>
          ))
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 17, fontWeight: "800", color: C.text },
  section: { fontSize: 15, fontWeight: "800", color: C.text, marginTop: SP.lg, marginBottom: SP.sm },
  chip: { paddingHorizontal: 12, height: 36, borderRadius: R.pill, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: C.text2 },
  emptyText: { fontSize: 12.5, color: C.text3, textAlign: "center", paddingVertical: SP.lg },
  caseCard: { backgroundColor: "#fff", borderRadius: R.md, padding: SP.md, marginBottom: SP.sm, borderWidth: 1, borderColor: C.border },
  caseNumber: { fontSize: 13, fontWeight: "800", color: C.primary },
  caseSubject: { fontSize: 13.5, fontWeight: "700", color: C.text, marginTop: 4 },
  caseMeta: { fontSize: 11, color: C.text3, marginTop: 2 },
  caseUpdate: { fontSize: 12, color: C.text2, marginTop: 6, backgroundColor: C.bg2, padding: 8, borderRadius: R.sm },
});
