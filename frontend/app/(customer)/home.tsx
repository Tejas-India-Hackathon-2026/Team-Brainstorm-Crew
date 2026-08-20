import React, { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { usePoll } from "@/src/hooks";
import { useI18n } from "@/src/i18n";
import { C, R, SP, shadow } from "@/src/theme";
import { ACTIVE_STATUSES, STATUS_META, statusLabel } from "@/src/types";
import { AnimatedCard, Avatar, Badge, SectionTitle } from "@/src/components/ui";

export default function CustomerHome() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [svc, bks, notif] = await Promise.all([
      services.length ? Promise.resolve(services) : api<any[]>("/services"),
      api<any[]>("/bookings"),
      api<{ unread_count: number }>("/notifications"),
    ]);
    setServices(svc);
    setBookings(bks);
    setUnread(notif.unread_count);
    if (!workers.length) {
      api<any[]>("/workers/match?category=plumbing").then(setWorkers).catch(() => {});
    }
  };
  usePoll(load, 8000);

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  const active = bookings.find((b) => ACTIVE_STATUSES.includes(b.status));
  const recent = bookings.slice(0, 3);
  const filtered = search
    ? services.filter((s) => (s.name + s.name_hi).toLowerCase().includes(search.toLowerCase()))
    : services;

  const goCategory = (cat: string) => router.push({ pathname: "/(customer)/report", params: { category: cat } } as any);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      {/* Sticky header */}
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar uri={user?.picture} size={40} name={user?.name} />
            <View>
              <Text style={st.greet}>{t("greeting")}, {user?.name?.split(" ")[0]} 👋</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Ionicons name="location" size={12} color={C.primary} />
                <Text style={st.loc}>Indira Nagar, Lucknow</Text>
              </View>
            </View>
          </View>
          <Pressable testID="home-notifications-btn" onPress={() => router.push("/(customer)/alerts" as any)} style={st.bell}>
            <Ionicons name="notifications-outline" size={22} color={C.text} />
            {unread > 0 && (
              <View style={st.bellBadge}>
                <Text style={st.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <View style={st.searchWrap}>
          <Ionicons name="search" size={18} color={C.text3} />
          <TextInput
            testID="home-search-input"
            value={search}
            onChangeText={setSearch}
            placeholder={t("searchPlaceholder")}
            placeholderTextColor={C.text3}
            style={st.searchInput}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <AnimatedCard style={{ paddingHorizontal: SP.lg, paddingTop: SP.lg }}>
          <Pressable testID="hero-report-btn" onPress={() => router.push("/(customer)/report" as any)}>
            <LinearGradient colors={["#1E40AF", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
              <View style={{ flex: 1 }}>
                <Text style={st.heroTitle}>{t("heroTitle")}</Text>
                <Text style={st.heroSub}>{t("heroSub")}</Text>
                <View style={st.heroBtn}>
                  <Ionicons name="sparkles" size={15} color={C.primary} />
                  <Text style={st.heroBtnText}>{t("reportProblem")}</Text>
                </View>
              </View>
              <View style={st.heroIcon}>
                <Ionicons name="build" size={44} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </Pressable>
        </AnimatedCard>

        {/* Quick actions */}
        <View style={st.quickRow}>
          {[
            { icon: "add-circle", label: t("reportProblem"), color: C.primary, testID: "quick-report", onPress: () => router.push("/(customer)/report" as any) },
            { icon: "flash", label: t("instantSupport"), color: "#F59E0B", testID: "quick-instant", onPress: () => router.push({ pathname: "/(customer)/report", params: { priority: "1" } } as any) },
            { icon: "calendar", label: t("myBookings"), color: "#10B981", testID: "quick-bookings", onPress: () => router.push("/(customer)/bookings" as any) },
            { icon: "shield", label: t("sosSafety"), color: "#EF4444", testID: "quick-sos", onPress: () => active ? router.push(`/customer/booking/${active.id}` as any) : router.push("/support" as any) },
          ].map((q, i) => (
            <Pressable key={q.testID} testID={q.testID} onPress={q.onPress} style={st.quickItem}>
              <View style={[st.quickIcon, { backgroundColor: q.color + "15" }]}>
                <Ionicons name={q.icon as any} size={22} color={q.color} />
              </View>
              <Text style={st.quickLabel} numberOfLines={2}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Active booking */}
        {active && (
          <View style={{ paddingHorizontal: SP.lg, marginBottom: SP.sm }}>
            <SectionTitle title={t("activeBooking")} />
            <Pressable testID="active-booking-card" onPress={() => router.push(`/customer/booking/${active.id}` as any)} style={st.activeCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.activeService}>{active.service_name}</Text>
                  <Text style={st.activeWorker}>{active.worker_name} • {active.booking_number}</Text>
                </View>
                <Badge
                  text={statusLabel(active.status, lang)}
                  color={STATUS_META[active.status]?.color || C.text}
                  bg={STATUS_META[active.status]?.bg || C.bg3}
                />
              </View>
              <View style={st.activeFooter}>
                <Ionicons name="chevron-forward-circle" size={18} color={C.primary} />
                <Text style={st.activeLink}>{t("viewDetails")}</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Categories */}
        <View style={{ paddingHorizontal: SP.lg, marginTop: SP.sm }}>
          <SectionTitle title={t("allCategories")} />
          <View style={st.grid}>
            {filtered.map((s, i) => (
              <Pressable key={s.id} testID={`category-${s.id}`} onPress={() => goCategory(s.id)} style={st.gridItem}>
                <View style={[st.gridIcon, { backgroundColor: s.color + "14" }]}>
                  <Ionicons name={s.icon as any} size={24} color={s.color} />
                </View>
                <Text style={st.gridLabel} numberOfLines={2}>{lang === "hi" ? s.name_hi : s.name}</Text>
                <Text style={st.gridCount}>{s.count}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Top workers */}
        {workers.length > 0 && (
          <View style={{ marginTop: SP.lg }}>
            <View style={{ paddingHorizontal: SP.lg }}>
              <SectionTitle title={t("topWorkers")} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SP.lg, gap: SP.md }}>
              {workers.slice(0, 5).map((w) => (
                <View key={w.worker_id} style={st.workerCard} testID={`top-worker-${w.worker_id}`}>
                  <Avatar uri={w.picture} size={48} name={w.name} />
                  <Text style={st.workerName} numberOfLines={1}>{w.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={st.workerMeta}>{w.rating} • {w.experience_years} {t("yrs")}</Text>
                  </View>
                  <Text style={st.workerMeta}>{w.distance_km} km {t("away")}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent bookings */}
        {recent.length > 0 && (
          <View style={{ paddingHorizontal: SP.lg, marginTop: SP.xl }}>
            <SectionTitle title={t("bookings")} />
            {recent.map((b) => (
              <Pressable key={b.id} testID={`recent-booking-${b.id}`} onPress={() => router.push(`/customer/booking/${b.id}` as any)} style={st.recentRow}>
                <View style={[st.recentIcon, { backgroundColor: (STATUS_META[b.status]?.bg || C.bg3) }]}>
                  <Ionicons name="construct-outline" size={18} color={STATUS_META[b.status]?.color || C.text3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.recentTitle}>{b.service_name}</Text>
                  <Text style={st.recentSub}>{b.scheduled_date} • {b.worker_name}</Text>
                </View>
                <Badge text={statusLabel(b.status, lang)} color={STATUS_META[b.status]?.color || C.text} bg={STATUS_META[b.status]?.bg || C.bg3} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: SP.lg,
    paddingBottom: SP.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  greet: { fontSize: 15.5, fontWeight: "800", color: C.text },
  loc: { fontSize: 11.5, color: C.text3 },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  bellBadge: { position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.error, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.bg2,
    borderRadius: R.md,
    paddingHorizontal: SP.md,
    height: 44,
    marginTop: SP.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  hero: { borderRadius: R.lg, padding: SP.lg, flexDirection: "row", alignItems: "center", ...shadow },
  heroTitle: { color: "#fff", fontSize: 17, fontWeight: "800", lineHeight: 23 },
  heroSub: { color: "#BFDBFE", fontSize: 12, marginTop: 4 },
  heroBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, marginTop: 12 },
  heroBtnText: { color: C.primary, fontWeight: "800", fontSize: 12.5 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginLeft: SP.sm },
  quickRow: { flexDirection: "row", paddingHorizontal: SP.lg, marginVertical: SP.lg, gap: SP.sm },
  quickItem: { flex: 1, backgroundColor: "#fff", borderRadius: R.md, alignItems: "center", paddingVertical: SP.md, gap: 6, borderWidth: 1, borderColor: C.border },
  quickIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 10, fontWeight: "600", color: C.text2, textAlign: "center", paddingHorizontal: 2 },
  activeCard: { backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, borderWidth: 1.5, borderColor: "#BFDBFE", ...shadow },
  activeService: { fontSize: 15, fontWeight: "800", color: C.text },
  activeWorker: { fontSize: 12, color: C.text3, marginTop: 2 },
  activeFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: SP.md, borderTopWidth: 1, borderTopColor: C.divider ?? C.border, paddingTop: SP.sm },
  activeLink: { color: C.primary, fontWeight: "700", fontSize: 12.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SP.sm },
  gridItem: { width: "23%", flexGrow: 1, backgroundColor: "#fff", borderRadius: R.md, alignItems: "center", paddingVertical: SP.md, borderWidth: 1, borderColor: C.border },
  gridIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  gridLabel: { fontSize: 10.5, fontWeight: "600", color: C.text2, textAlign: "center", paddingHorizontal: 2, minHeight: 26 },
  gridCount: { fontSize: 9.5, color: C.text3 },
  workerCard: { width: 132, backgroundColor: "#fff", borderRadius: R.md, alignItems: "center", padding: SP.md, gap: 4, borderWidth: 1, borderColor: C.border },
  workerName: { fontSize: 12.5, fontWeight: "700", color: C.text },
  workerMeta: { fontSize: 10.5, color: C.text3 },
  recentRow: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: "#fff", borderRadius: R.md, padding: SP.md, marginBottom: SP.sm, borderWidth: 1, borderColor: C.border },
  recentIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  recentTitle: { fontSize: 13.5, fontWeight: "700", color: C.text },
  recentSub: { fontSize: 11.5, color: C.text3, marginTop: 1 },
});
