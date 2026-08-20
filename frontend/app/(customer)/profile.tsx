import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { Avatar, Btn, Field, Sheet, toast } from "@/src/components/ui";

export default function CustomerProfile() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [line, setLine] = useState("");
  const [label, setLabel] = useState("Home");
  const [pincode, setPincode] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAddr = () => api<any[]>("/addresses").then(setAddresses).catch(() => {});
  useEffect(() => {
    loadAddr();
  }, []);

  const addAddress = async () => {
    if (!line.trim()) {
      toast(lang === "en" ? "Enter the address" : "पता दर्ज करें", "error");
      return;
    }
    setSaving(true);
    try {
      await api("/addresses", { method: "POST", body: { label, line: line.trim(), pincode, city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467 + Math.random() * 0.05, lng: 80.9462 + Math.random() * 0.05 } });
      setShowAdd(false);
      setLine("");
      setPincode("");
      loadAddr();
      toast(lang === "en" ? "Address saved" : "पता सेव हुआ", "success");
    } catch (e: any) {
      toast(e?.message || "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeAddr = async (id: string) => {
    await api(`/addresses/${id}`, { method: "DELETE" }).catch(() => {});
    loadAddr();
  };

  const doLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Text style={st.title}>{t("profile")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 120 }}>
        <View style={st.userCard} testID="profile-user-card">
          <Avatar uri={user?.picture} size={56} name={user?.name} />
          <View style={{ flex: 1 }}>
            <Text style={st.userName}>{user?.name}</Text>
            <Text style={st.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Language */}
        <Text style={st.section}>{t("language")}</Text>
        <View style={{ flexDirection: "row", gap: SP.sm, marginBottom: SP.lg }}>
          {(["en", "hi"] as const).map((l) => (
            <Pressable key={l} testID={`lang-${l}`} onPress={() => setLang(l)} style={[st.langChip, lang === l && st.langActive]}>
              <Text style={[st.langText, lang === l && { color: "#fff" }]}>{l === "en" ? "English" : "हिंदी"}</Text>
            </Pressable>
          ))}
        </View>

        {/* Addresses */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={st.section}>{t("selectAddress")}</Text>
          <Pressable testID="add-address-btn" onPress={() => setShowAdd(true)}>
            <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>+ {t("addAddress")}</Text>
          </Pressable>
        </View>
        {addresses.map((a) => (
          <View key={a.id} style={st.addrRow} testID={`address-${a.id}`}>
            <Ionicons name="location" size={18} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={st.addrLabel}>{a.label}</Text>
              <Text style={st.addrLine}>{a.line}, {a.city} {a.pincode}</Text>
            </View>
            <Pressable testID={`delete-address-${a.id}`} onPress={() => removeAddr(a.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={C.error} />
            </Pressable>
          </View>
        ))}

        {/* Menu */}
        <Text style={st.section}>{lang === "en" ? "More" : "अन्य"}</Text>
        {[
          { icon: "help-buoy-outline", label: t("help"), testID: "menu-support", onPress: () => router.push("/support" as any) },
          { icon: "shield-checkmark-outline", label: lang === "en" ? "Privacy & Safety" : "गोपनीयता और सुरक्षा", testID: "menu-privacy", onPress: () => toast(lang === "en" ? "Your data is encrypted. Phone numbers are always masked." : "आपका डेटा एन्क्रिप्टेड है। फ़ोन नंबर हमेशा छिपाए जाते हैं।", "info") },
        ].map((m) => (
          <Pressable key={m.testID} testID={m.testID} onPress={m.onPress} style={st.menuRow}>
            <Ionicons name={m.icon as any} size={20} color={C.text2} />
            <Text style={st.menuLabel}>{m.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.text3} />
          </Pressable>
        ))}

        <View style={{ height: SP.xl }} />
        <Btn testID="logout-btn" title={t("logout")} variant="ghost" icon="log-out-outline" onPress={doLogout} />
      </ScrollView>

      <Sheet visible={showAdd} onClose={() => setShowAdd(false)} title={t("addAddress")}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: SP.md }}>
          {["Home", "Office", "Other"].map((lb) => (
            <Pressable key={lb} testID={`addr-label-${lb}`} onPress={() => setLabel(lb)} style={[st.langChip, label === lb && st.langActive]}>
              <Text style={[st.langText, label === lb && { color: "#fff" }]}>{lb}</Text>
            </Pressable>
          ))}
        </View>
        <Field label={t("address")} value={line} onChangeText={setLine} placeholder="B-42, Indira Nagar" testID="addr-line-input" />
        <Field label="Pincode" value={pincode} onChangeText={setPincode} placeholder="226016" keyboardType="numeric" testID="addr-pincode-input" />
        <Btn testID="save-address-btn" title={t("save")} onPress={addAddress} loading={saving} />
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 20, fontWeight: "900", color: C.text },
  userCard: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, borderWidth: 1, borderColor: C.border },
  userName: { fontSize: 16, fontWeight: "800", color: C.text },
  userEmail: { fontSize: 12, color: C.text3, marginTop: 2 },
  section: { fontSize: 14, fontWeight: "800", color: C.text, marginTop: SP.xl, marginBottom: SP.sm },
  langChip: { paddingHorizontal: 18, height: 38, borderRadius: R.pill, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  langActive: { backgroundColor: C.primary, borderColor: C.primary },
  langText: { fontSize: 13, fontWeight: "700", color: C.text2 },
  addrRow: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: "#fff", borderRadius: R.md, padding: SP.md, marginBottom: SP.sm, borderWidth: 1, borderColor: C.border },
  addrLabel: { fontSize: 13, fontWeight: "700", color: C.text },
  addrLine: { fontSize: 12, color: C.text3, marginTop: 1 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, marginBottom: SP.sm, borderWidth: 1, borderColor: C.border },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: C.text },
});
