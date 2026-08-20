import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { usePoll } from "@/src/hooks";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { STATUS_META, fmtMoney, statusLabel } from "@/src/types";
import { Badge, Empty } from "@/src/components/ui";

const TABS = [
  { id: "new", en: "New", hi: "नए" },
  { id: "active", en: "Active", hi: "सक्रिय" },
  { id: "completed", en: "Completed", hi: "पूर्ण" },
  { id: "cancelled", en: "Cancelled", hi: "रद्द" },
];

export default function WorkerJobs() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<any>({ new: [], active: [], completed: [], cancelled: [] });
  const [tab, setTab] = useState("new");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => setJobs(await api<any>("/worker/jobs"));
  usePoll(load, 5000);

  const list = jobs[tab] || [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Text style={st.title}>{t("jobs")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 56 }} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
          {TABS.map((tb) => (
            <Pressable key={tb.id} testID={`jobs-tab-${tb.id}`} onPress={() => setTab(tb.id)} style={[st.tab, tab === tb.id && st.tabActive]}>
              <Text style={[st.tabText, tab === tb.id && { color: "#fff" }]}>
                {lang === "hi" ? tb.hi : tb.en} ({(jobs[tb.id] || []).length})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={list}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: SP.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load().catch(() => {}); setRefreshing(false); }} tintColor={C.primary} />}
        ListEmptyComponent={<Empty icon="briefcase-outline" text={t("noRequests")} testID="jobs-empty" />}
        renderItem={({ item: j }) => (
          <Pressable testID={`job-card-${j.id}`} onPress={() => router.push(`/worker/job/${j.id}` as any)} style={st.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={st.service}>{j.service_name}</Text>
                <Text style={st.meta}>{j.booking_number} • {j.customer_name}</Text>
              </View>
              <Badge text={statusLabel(j.status, lang)} color={STATUS_META[j.status]?.color || C.text} bg={STATUS_META[j.status]?.bg || C.bg3} />
            </View>
            <View style={st.footer}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="location-outline" size={13} color={C.text3} />
                <Text style={st.metaSmall} numberOfLines={1}>{j.address_line} • {j.distance_km} km</Text>
              </View>
              {j.total_amount > 0 && <Text style={st.amount}>{fmtMoney(j.total_amount)}</Text>}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: "#fff", paddingHorizontal: SP.lg, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 20, fontWeight: "900", color: C.text, marginBottom: 4 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: R.pill, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { fontSize: 12.5, fontWeight: "700", color: C.text2 },
  card: { backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, marginBottom: SP.md, borderWidth: 1, borderColor: C.border },
  service: { fontSize: 15, fontWeight: "800", color: C.text },
  meta: { fontSize: 11.5, color: C.text3, marginTop: 2 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.bg3 },
  metaSmall: { fontSize: 11.5, color: C.text3, maxWidth: 220 },
  amount: { fontSize: 14, fontWeight: "800", color: C.success },
});
