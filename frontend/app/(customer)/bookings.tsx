import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { usePoll } from "@/src/hooks";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { ACTIVE_STATUSES, STATUS_META, fmtMoney, statusLabel } from "@/src/types";
import { Badge, Empty } from "@/src/components/ui";

const TABS = ["active", "upcoming", "completed", "cancelled"] as const;

export default function MyBookings() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<any[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("active");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => setBookings(await api<any[]>("/bookings"));
  usePoll(load, 7000);

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  const filtered = bookings.filter((b) => {
    if (tab === "active") return ACTIVE_STATUSES.includes(b.status) && b.status !== "REQUEST_SENT";
    if (tab === "upcoming") return b.status === "REQUEST_SENT" || b.status === "WORKER_REJECTED";
    if (tab === "completed") return b.status === "COMPLETED";
    return b.status === "CANCELLED";
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Text style={st.headerTitle}>{t("myBookings")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 56 }} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
          {TABS.map((tb) => (
            <Pressable key={tb} testID={`bookings-tab-${tb}`} onPress={() => setTab(tb)} style={[st.tab, tab === tb && st.tabActive]}>
              <Text style={[st.tabText, tab === tb && { color: "#fff" }]}>{t(tb)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: SP.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        ListEmptyComponent={<Empty icon="calendar-outline" text={t("noBookings")} testID="bookings-empty" />}
        renderItem={({ item: b }) => (
          <Pressable testID={`booking-card-${b.id}`} onPress={() => router.push(`/customer/booking/${b.id}` as any)} style={st.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={st.service}>{b.service_name}</Text>
                <Text style={st.meta}>{b.booking_number} • {b.worker_name}</Text>
              </View>
              <Badge text={statusLabel(b.status, lang)} color={STATUS_META[b.status]?.color || C.text} bg={STATUS_META[b.status]?.bg || C.bg3} />
            </View>
            <Text style={st.desc} numberOfLines={1}>{b.description || b.address_line}</Text>
            <View style={st.footer}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="calendar-outline" size={13} color={C.text3} />
                <Text style={st.metaSmall}>{b.scheduled_date} • {b.scheduled_time}</Text>
              </View>
              {b.total_amount > 0 ? <Text style={st.amount}>{fmtMoney(b.total_amount)}</Text> :
                b.ai_estimate ? <Text style={st.estimate}>{fmtMoney(b.ai_estimate.min)}–{fmtMoney(b.ai_estimate.max)}</Text> : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: "#fff", paddingHorizontal: SP.lg, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 20, fontWeight: "900", color: C.text, marginBottom: 4 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: R.pill, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { fontSize: 12.5, fontWeight: "700", color: C.text2 },
  card: { backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, marginBottom: SP.md, borderWidth: 1, borderColor: C.border },
  service: { fontSize: 15, fontWeight: "800", color: C.text },
  meta: { fontSize: 11.5, color: C.text3, marginTop: 2 },
  desc: { fontSize: 12.5, color: C.text2, marginTop: 8 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.bg3 },
  metaSmall: { fontSize: 11.5, color: C.text3 },
  amount: { fontSize: 14, fontWeight: "800", color: C.text },
  estimate: { fontSize: 12, fontWeight: "700", color: C.primary },
});
