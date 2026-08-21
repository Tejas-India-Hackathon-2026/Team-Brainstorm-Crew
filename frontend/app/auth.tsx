import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { C, R, SP, shadow } from "@/src/theme";
import { Btn, toast } from "@/src/components/ui";

export default function AuthScreen() {
  const { user, loginWithGoogle, demoLogin, loading } = useAuth();
  const [role, setRole] = useState<"customer" | "worker">("customer");
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  const google = async () => {
    setBusy("google");
    try {
      await loginWithGoogle(role);
    } catch {
      toast("Google login failed. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  const demo = async () => {
    setBusy("demo");
    try {
      await demoLogin(role);
      router.replace("/");
    } catch (e: any) {
      toast(e?.message || "Demo login failed", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={st.container}>
      <LinearGradient colors={["#1E3A8A", "#2563EB", "#3B82F6"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + SP.lg, paddingBottom: insets.bottom + SP.xl }}>
        <View style={{ alignItems: "flex-end", paddingHorizontal: SP.lg }}>
          <Pressable
            testID="language-toggle"
            onPress={() => setLang(lang === "en" ? "hi" : "en")}
            style={st.langBtn}
          >
            <Ionicons name="language" size={15} color="#fff" />
            <Text style={st.langText}>{lang === "en" ? "हिंदी" : "English"}</Text>
          </Pressable>
        </View>

        <Animated.View entering={FadeInDown.duration(500)} style={st.hero}>
          <View style={st.logoWrap}>
            <Ionicons name="construct" size={44} color={C.primary} />
          </View>
          <Text style={st.appName}>{t("appName")}</Text>
          <Text style={st.tagline}>{t("tagline")}</Text>
          <View style={st.trustRow}>
            {[
              { icon: "shield-checkmark", label: lang === "en" ? "Verified Pros" : "वेरिफाइड प्रो" },
              { icon: "sparkles", label: lang === "en" ? "AI Diagnosis" : "AI डायग्नोसिस" },
              { icon: "cash", label: lang === "en" ? "Fair Pricing" : "उचित कीमत" },
            ].map((it) => (
              <View key={it.icon} style={st.trustChip}>
                <Ionicons name={it.icon as any} size={13} color="#BFDBFE" />
                <Text style={st.trustText}>{it.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(150)} style={st.panel}>
          <Text style={st.panelTitle}>{lang === "en" ? "How will you use SkillSync?" : "आप SkillSync कैसे इस्तेमाल करेंगे?"}</Text>
          <View style={{ flexDirection: "row", gap: SP.md, marginBottom: SP.xl }}>
            <Pressable
              testID="role-customer-btn"
              onPress={() => setRole("customer")}
              style={[st.roleCard, role === "customer" && st.roleActive]}
            >
              <Ionicons name="home" size={26} color={role === "customer" ? C.primary : C.text3} />
              <Text style={[st.roleText, role === "customer" && { color: C.primary }]}>{t("imCustomer")}</Text>
            </Pressable>
            <Pressable
              testID="role-worker-btn"
              onPress={() => setRole("worker")}
              style={[st.roleCard, role === "worker" && st.roleActive]}
            >
              <Ionicons name="briefcase" size={26} color={role === "worker" ? C.primary : C.text3} />
              <Text style={[st.roleText, role === "worker" && { color: C.primary }]}>{t("imWorker")}</Text>
            </Pressable>
          </View>

          <Btn
            testID="google-login-btn"
            title={t("continueGoogle")}
            icon="logo-google"
            onPress={google}
            loading={busy === "google"}
          />
          <View style={{ height: SP.md }} />
          <Btn
            testID="demo-login-btn"
            title={t("tryDemo")}
            variant="ghost"
            icon="flask-outline"
            onPress={demo}
            loading={busy === "demo"}
          />
          <Text style={st.demoHint}>
            {role === "customer" ? "customer@test.com" : "worker@test.com (Rohit Verma)"}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: R.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  langText: { color: "#fff", fontSize: 12.5, fontWeight: "700" },
  hero: { alignItems: "center", paddingTop: SP.xl, paddingBottom: SP.xxl },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SP.lg,
    ...shadow,
  },
  appName: { fontSize: 34, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  tagline: { fontSize: 13.5, color: "#BFDBFE", marginTop: 6, textAlign: "center", paddingHorizontal: SP.xl },
  trustRow: { flexDirection: "row", gap: 8, marginTop: SP.lg },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.pill,
  },
  trustText: { color: "#DBEAFE", fontSize: 11.5, fontWeight: "600" },
  panel: {
    backgroundColor: "#fff",
    marginHorizontal: SP.lg,
    borderRadius: R.lg,
    padding: SP.xl,
    ...shadow,
  },
  panelTitle: { fontSize: 16, fontWeight: "800", color: C.text, marginBottom: SP.lg, textAlign: "center" },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    alignItems: "center",
    paddingVertical: SP.lg,
    gap: 8,
    backgroundColor: C.bg2,
  },
  roleActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  roleText: { fontSize: 13, fontWeight: "700", color: C.text2, textAlign: "center", paddingHorizontal: 4 },
  demoHint: { textAlign: "center", color: C.text3, fontSize: 11.5, marginTop: 8 },
});
