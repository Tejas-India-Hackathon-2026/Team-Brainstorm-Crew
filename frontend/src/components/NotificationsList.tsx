import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { api } from "@/src/api";
import { usePoll } from "@/src/hooks";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { fmtDateTime } from "@/src/types";
import { Empty } from "@/src/components/ui";

const ICONS: Record<string, { icon: string; color: string }> = {
  NEW_JOB: { icon: "briefcase", color: C.primary },
  WORKER_ACCEPTED: { icon: "checkmark-circle", color: C.success },
  WORKER_ON_WAY: { icon: "navigate", color: C.primary },
  WORKER_ARRIVED: { icon: "location", color: "#7C3AED" },
  OTP_VERIFIED: { icon: "shield-checkmark", color: C.success },
  QUOTE_SUBMITTED: { icon: "document-text", color: C.warning },
  QUOTE_ACCEPTED: { icon: "thumbs-up", color: C.success },
  QUOTE_REJECTED: { icon: "thumbs-down", color: C.error },
  ADDITIONAL_CHARGE: { icon: "cash", color: C.warning },
  WORK_PROGRESS: { icon: "construct", color: C.primary },
  WORK_COMPLETED: { icon: "checkmark-done-circle", color: C.success },
  CUSTOMER_COMPLETED: { icon: "checkmark-done-circle", color: C.success },
  PAYMENT: { icon: "card", color: C.success },
  REVIEW: { icon: "star", color: "#F59E0B" },
  SOS: { icon: "warning", color: C.error },
  SUPPORT: { icon: "help-buoy", color: C.primary },
  KYC: { icon: "shield-checkmark", color: C.success },
  BOOKING_CREATED: { icon: "calendar", color: C.primary },
  JOB_CANCELLED: { icon: "close-circle", color: C.error },
  WORKER_REJECTED: { icon: "refresh-circle", color: C.warning },
  SYSTEM: { icon: "notifications", color: C.primary },
};

export default function NotificationsList({ role }: { role: "customer" | "worker" }) {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const load = async () => {
    const res = await api<{ items: any[] }>("/notifications");
    setItems(res.items);
  };
  usePoll(load, 6000);

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  const open = async (n: any) => {
    await api("/notifications/mark-read", { method: "POST" }).catch(() => {});
    if (n.booking_id) {
      router.push(
        role === "customer" ? (`/customer/booking/${n.booking_id}` as any) : (`/worker/job/${n.booking_id}` as any),
      );
    } else {
      load();
    }
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={{ padding: SP.lg, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      ListEmptyComponent={<Empty icon="notifications-off-outline" text={t("noBookings")} testID="notifications-empty" />}
      renderItem={({ item: n }) => {
        const meta = ICONS[n.type] || ICONS.SYSTEM;
        return (
          <Pressable testID={`notification-item-${n.id}`} onPress={() => open(n)} style={[st.item, !n.read && st.unread]}>
            <View style={[st.iconWrap, { backgroundColor: meta.color + "18" }]}>
              <Ionicons name={meta.icon as any} size={20} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>{n.title}</Text>
              <Text style={st.body} numberOfLines={2}>{n.body}</Text>
              <Text style={st.time}>{fmtDateTime(n.created_at)}</Text>
            </View>
            {!n.read && <View style={st.dot} />}
          </Pressable>
        );
      }}
    />
  );
}

const st = StyleSheet.create({
  item: {
    flexDirection: "row",
    gap: SP.md,
    backgroundColor: C.bg,
    borderRadius: R.md,
    padding: SP.md,
    marginBottom: SP.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  unread: { backgroundColor: C.primaryLight, borderColor: "#BFDBFE" },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: C.text },
  body: { fontSize: 12.5, color: C.text3, marginTop: 2 },
  time: { fontSize: 11, color: C.text3, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginTop: 6 },
});
