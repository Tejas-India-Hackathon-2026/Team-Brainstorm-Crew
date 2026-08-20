import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { Avatar, Btn, Empty } from "@/src/components/ui";

export default function WorkerDiscovery() {
  const { category, reportId } = useLocalSearchParams<{ category: string; reportId?: string }>();
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [workers, setWorkers] = useState<any[] | null>(null);

  useEffect(() => {
    api<any[]>(`/workers/match?category=${category}`)
      .then(setWorkers)
      .catch(() => setWorkers([]));
  }, [category]);

  const book = (w: any) =>
    router.push({ pathname: "/customer/book", params: { workerId: w.worker_id, category, reportId: reportId || "" } } as any);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="workers-back-btn" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={st.headerTitle}>{t("availablePros")}</Text>
        <View style={{ width: 22 }} />
      </View>

      {workers === null ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(w) => w.worker_id}
          contentContainerStyle={{ padding: SP.lg, paddingBottom: 60 }}
          ListEmptyComponent={
            <Empty
              icon="people-outline"
              testID="no-workers-empty"
              text={lang === "en" ? "No professionals available nearby right now. Please try again shortly." : "अभी आस-पास कोई प्रोफेशनल उपलब्ध नहीं है। कृपया थोड़ी देर बाद प्रयास करें।"}
            />
          }
          renderItem={({ item: w }) => (
            <View style={st.card} testID={`worker-card-${w.worker_id}`}>
              <View style={{ flexDirection: "row", gap: SP.md }}>
                <Avatar uri={w.picture} size={56} name={w.name} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={st.name}>{w.name}</Text>
                    {w.verification === "VERIFIED" && (
                      <View style={st.verifiedChip}>
                        <Ionicons name="shield-checkmark" size={10} color="#fff" />
                        <Text style={st.verifiedText}>{t("verified")}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={st.skills} numberOfLines={1}>{w.skills?.join(" • ")}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <View style={st.metaChip}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={st.metaText}>{w.rating} ({w.total_reviews})</Text>
                    </View>
                    <Text style={st.metaText}>{w.experience_years} {t("yrs")}</Text>
                    <Text style={st.metaText}>{w.completed_jobs} jobs</Text>
                  </View>
                </View>
              </View>
              <View style={st.footer}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="location-outline" size={14} color={C.text3} />
                    <Text style={st.metaText}>{w.distance_km} km</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="time-outline" size={14} color={C.text3} />
                    <Text style={st.metaText}>{t("eta")} {w.eta_min} min</Text>
                  </View>
                </View>
                <Btn testID={`book-worker-${w.worker_id}`} title={t("book")} small onPress={() => book(w)} />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  card: { backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, marginBottom: SP.md, borderWidth: 1, borderColor: C.border },
  name: { fontSize: 15.5, fontWeight: "800", color: C.text },
  verifiedChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.success, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: R.pill },
  verifiedText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  skills: { fontSize: 11.5, color: C.text3, marginTop: 2 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 12, color: C.text2, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SP.md, paddingTop: SP.md, borderTopWidth: 1, borderTopColor: C.bg3 },
});
