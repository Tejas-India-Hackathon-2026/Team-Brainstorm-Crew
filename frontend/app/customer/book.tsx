import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { api } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { TIME_SLOTS } from "@/src/types";
import { Avatar, Btn, Field, toast } from "@/src/components/ui";

function dateOption(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export default function BookService() {
  const { workerId, category, reportId } = useLocalSearchParams<{ workerId: string; category: string; reportId?: string }>();
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [worker, setWorker] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressId, setAddressId] = useState<string>("");
  const [newLine, setNewLine] = useState("");
  const [date, setDate] = useState(dateOption(0));
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<any>(`/workers/${workerId}`).then(setWorker).catch(() => {});
    api<any[]>("/addresses").then((a) => {
      setAddresses(a);
      if (a.length) setAddressId(a[0].id);
    }).catch(() => {});
  }, [workerId]);

  const confirm = async () => {
    if (!addressId && !newLine.trim()) {
      toast(lang === "en" ? "Select or add a service address" : "सेवा का पता चुनें या जोड़ें", "error");
      return;
    }
    setBusy(true);
    try {
      const body: any = {
        worker_id: workerId,
        category,
        problem_report_id: reportId || null,
        scheduled_date: date,
        scheduled_time: time,
        instructions,
      };
      if (addressId) body.address_id = addressId;
      else body.address = { label: "Home", line: newLine.trim(), city: "Lucknow", state: "Uttar Pradesh", pincode: "", lat: 26.8467, lng: 80.9462 };
      const booking = await api<any>("/bookings", { method: "POST", body });
      toast(lang === "en" ? "Booking created! Request sent to worker." : "बुकिंग बन गई! अनुरोध वर्कर को भेजा गया।", "success");
      router.replace(`/customer/booking/${booking.id}` as any);
    } catch (e: any) {
      toast(e?.message || "Booking failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const dates = [
    { v: dateOption(0), label: t("today") },
    { v: dateOption(1), label: t("tomorrow") },
    { v: dateOption(2), label: dateOption(2).slice(5) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="book-back-btn" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={st.headerTitle}>{t("bookService")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 140 }} bottomOffset={80}>
        {worker && (
          <View style={st.workerRow} testID="book-worker-summary">
            <Avatar uri={worker.picture} size={46} name={worker.name} />
            <View style={{ flex: 1 }}>
              <Text style={st.workerName}>{worker.name}</Text>
              <Text style={st.workerMeta}>★ {worker.rating} • {worker.experience_years} {t("yrs")} • {t("verified")}</Text>
            </View>
          </View>
        )}

        <Text style={st.section}>{t("selectAddress")}</Text>
        {addresses.map((a) => (
          <Pressable key={a.id} testID={`book-address-${a.id}`} onPress={() => setAddressId(a.id)} style={[st.addrRow, addressId === a.id && st.addrActive]}>
            <Ionicons name={addressId === a.id ? "radio-button-on" : "radio-button-off"} size={18} color={addressId === a.id ? C.primary : C.text3} />
            <View style={{ flex: 1 }}>
              <Text style={st.addrLabel}>{a.label}</Text>
              <Text style={st.addrLine}>{a.line}, {a.city}</Text>
            </View>
          </Pressable>
        ))}
        <Pressable testID="book-new-address" onPress={() => setAddressId("")} style={[st.addrRow, !addressId && st.addrActive]}>
          <Ionicons name={!addressId ? "radio-button-on" : "radio-button-off"} size={18} color={!addressId ? C.primary : C.text3} />
          <Text style={st.addrLabel}>{t("addAddress")}</Text>
        </Pressable>
        {!addressId && (
          <Field value={newLine} onChangeText={setNewLine} placeholder="B-42, Indira Nagar, Lucknow" testID="book-address-input" />
        )}

        <Text style={st.section}>{t("selectDate")}</Text>
        <View style={{ flexDirection: "row", gap: SP.sm }}>
          {dates.map((d) => (
            <Pressable key={d.v} testID={`book-date-${d.v}`} onPress={() => setDate(d.v)} style={[st.slot, date === d.v && st.slotActive]}>
              <Text style={[st.slotText, date === d.v && { color: "#fff" }]}>{d.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={st.section}>{t("selectTime")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SP.sm }}>
          {TIME_SLOTS.map((ts) => (
            <Pressable key={ts} testID={`book-time-${ts.replace(/[: ]/g, "")}`} onPress={() => setTime(ts)} style={[st.slot, time === ts && st.slotActive]}>
              <Text style={[st.slotText, time === ts && { color: "#fff" }]}>{ts}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: SP.lg }} />
        <Field label={t("instructions")} value={instructions} onChangeText={setInstructions} placeholder={lang === "en" ? "Gate code, parking, pets..." : "गेट कोड, पार्किंग..."} multiline testID="book-instructions-input" />

        <Btn testID="confirm-booking-btn" title={t("confirmBooking")} icon="checkmark-circle" onPress={confirm} loading={busy} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  workerRow: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: "#fff", borderRadius: R.md, padding: SP.md, borderWidth: 1, borderColor: C.border },
  workerName: { fontSize: 14.5, fontWeight: "800", color: C.text },
  workerMeta: { fontSize: 11.5, color: C.text3, marginTop: 2 },
  section: { fontSize: 14, fontWeight: "800", color: C.text, marginTop: SP.xl, marginBottom: SP.sm },
  addrRow: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: "#fff", borderRadius: R.md, padding: SP.md, marginBottom: SP.sm, borderWidth: 1, borderColor: C.border },
  addrActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  addrLabel: { fontSize: 13.5, fontWeight: "700", color: C.text },
  addrLine: { fontSize: 12, color: C.text3, marginTop: 1 },
  slot: { paddingHorizontal: 16, height: 40, borderRadius: R.pill, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  slotActive: { backgroundColor: C.primary, borderColor: C.primary },
  slotText: { fontSize: 12.5, fontWeight: "700", color: C.text2 },
});
