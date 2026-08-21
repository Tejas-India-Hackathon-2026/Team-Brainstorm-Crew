import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { Avatar, Badge, Btn, toast } from "@/src/components/ui";

export default function WorkerProfile() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const wp = user?.worker_profile;

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
        <View style={st.userCard} testID="worker-profile-card">
          <Avatar uri={user?.picture} size={64} name={user?.name} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={st.userName}>{user?.name}</Text>
              {wp?.verification === "VERIFIED" && (
                <Badge text={t("verified")} color="#047857" bg={C.successLight} testID="verification-badge" />
              )}
            </View>
            <Text style={st.userEmail}>{user?.email}</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
              <Text style={st.stat}>★ {wp?.rating || 0}</Text>
              <Text style={st.stat}>{wp?.completed_jobs || 0} jobs</Text>
              <Text style={st.stat}>{wp?.experience_years || 0} {t("yrs")}</Text>
            </View>
          </View>
        </View>

        {/* Skills */}
        <Text style={st.section}>{t("serviceCategories")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(wp?.categories || []).map((c) => (
            <View key={c} style={st.skillChip}>
              <Text style={st.skillText}>{c.replace(/_/g, " ")}</Text>
            </View>
          ))}
        </View>
        <Text style={st.section}>{lang === "en" ? "Skills" : "कौशल"}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(wp?.skills || []).map((s) => (
            <View key={s} style={[st.skillChip, { backgroundColor: C.primaryLight, borderColor: "#BFDBFE" }]}>
              <Text style={[st.skillText, { color: C.primaryDark }]}>{s}</Text>
            </View>
          ))}
        </View>

        {/* Service area */}
        <Text style={st.section}>{lang === "en" ? "Service Area" : "सेवा क्षेत्र"}</Text>
        <View style={st.infoRow}>
          <Ionicons name="location" size={18} color={C.primary} />
          <Text style={st.infoText}>{wp?.city || "Lucknow"} • {wp?.service_radius_km || 15} km {lang === "en" ? "radius" : "दायरा"}</Text>
        </View>

        {/* Language */}
        <Text style={st.section}>{t("language")}</Text>
        <View style={{ flexDirection: "row", gap: SP.sm }}>
          {(["en", "hi"] as const).map((l) => (
            <Pressable key={l} testID={`worker-lang-${l}`} onPress={() => setLang(l)} style={[st.langChip, lang === l && st.langActive]}>
              <Text style={[st.langText, lang === l && { color: "#fff" }]}>{l === "en" ? "English" : "हिंदी"}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={st.section}>{lang === "en" ? "More" : "अन्य"}</Text>
        {[
          { icon: "help-buoy-outline", label: t("help"), testID: "worker-menu-support", onPress: () => router.push("/support" as any) },
          { icon: "document-text-outline", label: lang === "en" ? "KYC Documents" : "KYC दस्तावेज़", testID: "worker-menu-kyc", onPress: () => toast(lang === "en" ? "KYC verified ✓ (documents are private, never shown publicly)" : "KYC सत्यापित ✓ (दस्तावेज़ निजी हैं)", "success") },
        ].map((m) => (
          <Pressable key={m.testID} testID={m.testID} onPress={m.onPress} style={st.menuRow}>
            <Ionicons name={m.icon as any} size={20} color={C.text2} />
            <Text style={st.menuLabel}>{m.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.text3} />
          </Pressable>
        ))}

        <View style={{ height: SP.xl }} />
        <Btn testID="worker-logout-btn" title={t("logout")} variant="ghost" icon="log-out-outline" onPress={doLogout} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 20, fontWeight: "900", color: C.text },
  userCard: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, borderWidth: 1, borderColor: C.border },
  userName: { fontSize: 16, fontWeight: "800", color: C.text },
  userEmail: { fontSize: 12, color: C.text3, marginTop: 2 },
  stat: { fontSize: 12, fontWeight: "700", color: C.text2 },
  section: { fontSize: 14, fontWeight: "800", color: C.text, marginTop: SP.xl, marginBottom: SP.sm },
  skillChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border },
  skillText: { fontSize: 12, fontWeight: "600", color: C.text2, textTransform: "capitalize" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: R.md, padding: SP.md, borderWidth: 1, borderColor: C.border },
  infoText: { fontSize: 13, color: C.text2, fontWeight: "600" },
  langChip: { paddingHorizontal: 18, height: 38, borderRadius: R.pill, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  langActive: { backgroundColor: C.primary, borderColor: C.primary },
  langText: { fontSize: 13, fontWeight: "700", color: C.text2 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, marginBottom: SP.sm, borderWidth: 1, borderColor: C.border },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: C.text },
});
