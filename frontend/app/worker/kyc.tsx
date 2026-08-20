import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { CATEGORY_ICONS } from "@/src/types";
import { Btn, Field, toast } from "@/src/components/ui";

const ALL_CATEGORIES = Object.keys(CATEGORY_ICONS);

export default function WorkerKyc() {
  const { user, setUser, logout } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("2");
  const [categories, setCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggleCat = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const submit = async () => {
    if (!phone.trim() || !address.trim() || categories.length === 0) {
      toast(lang === "en" ? "Fill phone, address and pick at least one category" : "फ़ोन, पता भरें और कम से कम एक श्रेणी चुनें", "error");
      return;
    }
    setBusy(true);
    try {
      const updated = await api<any>("/worker/kyc", {
        method: "POST",
        body: {
          phone: phone.trim(),
          address: address.trim(),
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          categories,
          experience_years: parseInt(experience) || 1,
        },
      });
      setUser(updated);
      toast(lang === "en" ? "KYC Verified ✅ You can now receive jobs!" : "KYC सत्यापित ✅ अब आप काम पा सकते हैं!", "success");
      router.replace("/(worker)/dashboard" as any);
    } catch (e: any) {
      toast(e?.message || "KYC failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Text style={st.title}>{t("kycTitle")}</Text>
        <Text style={st.sub}>{t("kycNote")}</Text>
      </View>
      <KeyboardAwareScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 140 }} bottomOffset={80}>
        <View style={st.stepBanner} testID="kyc-status-banner">
          <Ionicons name="shield-half" size={18} color={C.warning} />
          <Text style={st.stepText}>{lang === "en" ? "Verification status: PENDING" : "सत्यापन स्थिति: लंबित"}</Text>
        </View>

        <Field label={t("phone")} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" testID="kyc-phone-input" />
        <Field label={t("address")} value={address} onChangeText={setAddress} placeholder={lang === "en" ? "Your base location / shop address" : "आपका पता"} testID="kyc-address-input" />
        <Field label={t("experience")} value={experience} onChangeText={(v) => setExperience(v.replace(/[^0-9]/g, ""))} keyboardType="numeric" testID="kyc-experience-input" />
        <Field label={t("skills")} value={skills} onChangeText={setSkills} placeholder={lang === "en" ? "Pipe fitting, Wiring, AC service" : "पाइप फिटिंग, वायरिंग"} testID="kyc-skills-input" />

        <Text style={st.label}>{t("serviceCategories")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: SP.lg }}>
          {ALL_CATEGORIES.map((c) => (
            <Pressable key={c} testID={`kyc-cat-${c}`} onPress={() => toggleCat(c)} style={[st.catChip, categories.includes(c) && st.catActive]}>
              <Ionicons name={CATEGORY_ICONS[c] as any} size={14} color={categories.includes(c) ? "#fff" : C.text2} />
              <Text style={[st.catText, categories.includes(c) && { color: "#fff" }]}>{c.replace(/_/g, " ")}</Text>
            </Pressable>
          ))}
        </View>

        <View style={st.docBox} testID="kyc-doc-box">
          <Ionicons name="document-attach-outline" size={20} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={st.docTitle}>{lang === "en" ? "Identity & address proof" : "पहचान और पता प्रमाण"}</Text>
            <Text style={st.docSub}>{lang === "en" ? "Demo mode: documents auto-verified instantly" : "डेमो मोड: दस्तावेज़ तुरंत सत्यापित"}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={C.success} />
        </View>

        <View style={{ height: SP.lg }} />
        <Btn testID="kyc-submit-btn" title={t("submitKyc")} icon="shield-checkmark" onPress={submit} loading={busy} />
        <View style={{ height: SP.sm }} />
        <Btn testID="kyc-logout-btn" title={t("logout")} variant="ghost" onPress={async () => { await logout(); router.replace("/auth"); }} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 19, fontWeight: "900", color: C.text },
  sub: { fontSize: 12, color: C.text3, marginTop: 2 },
  stepBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.warningLight, borderRadius: R.md, padding: SP.md, marginBottom: SP.lg, borderWidth: 1, borderColor: "#FDE68A" },
  stepText: { fontSize: 12.5, fontWeight: "700", color: "#B45309" },
  label: { fontSize: 13, fontWeight: "600", color: C.text2, marginBottom: 8 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 36, borderRadius: R.pill, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border },
  catActive: { backgroundColor: C.primary, borderColor: C.primary },
  catText: { fontSize: 12, fontWeight: "600", color: C.text2, textTransform: "capitalize" },
  docBox: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: "#fff", borderRadius: R.md, padding: SP.md, borderWidth: 1, borderColor: C.border },
  docTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  docSub: { fontSize: 11, color: C.text3, marginTop: 1 },
});
