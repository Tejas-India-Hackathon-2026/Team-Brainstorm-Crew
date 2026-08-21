import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/auth";
import { C } from "@/src/theme";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth");
    } else if (user.role === "worker") {
      if (user.worker_profile?.verification !== "VERIFIED") {
        router.replace("/worker/kyc");
      } else {
        router.replace("/(worker)/dashboard");
      }
    } else {
      router.replace("/(customer)/home");
    }
  }, [user, loading, router]);

  return (
    <View style={st.container} testID="splash-screen">
      <View style={st.logoWrap}>
        <Ionicons name="construct" size={40} color="#fff" />
      </View>
      <Text style={st.title}>SkillSync</Text>
      <Text style={st.sub}>AI-Powered Home Repair & Maintenance</Text>
      <ActivityIndicator color={C.primary} style={{ marginTop: 28 }} />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 30, fontWeight: "900", color: C.text },
  sub: { fontSize: 13, color: C.text3, marginTop: 6 },
});
