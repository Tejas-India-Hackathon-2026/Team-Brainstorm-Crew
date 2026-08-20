import React, { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { usePoll } from "@/src/hooks";
import { useI18n } from "@/src/i18n";
import { C, R, SP, shadow } from "@/src/theme";
import { STATUS_META, fmtMoney, statusLabel } from "@/src/types";
import { Badge, Btn, toast } from "@/src/components/ui";

export default function WorkerDashboard() {
  const { user, refreshUser } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<any>({ new: [], active: [], completed: [], cancelled: [] });
  const [stats, setStats] = useState<any>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [j, s] = await Promise.all([api<any>("/worker/jobs"), api<any>("/worker/stats")]);
    setJobs(j);
    setStats(s);
  };
  usePoll(load, 4000);

  const isOnline = online !== null ? online : user?.worker_profile?.online ?? false;

  const toggleOnline = async (v: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setOnline(v);
    try {
      await api("/worker/availability", { method: "POST", body: { online: v } });
      refreshUser();
      toast(v ? (lang === "en" ? "You're ONLINE — new jobs will come to you" : "आप ऑनलाइन हैं — नए काम आएंगे") : (lang === "en" ? "You're OFFLINE" : "आप ऑफ़लाइन हैं"), v ? "success" : "info");
    } catch {
      setOnline(!v);
    }
  };

  const accept = async (jobId: string) => {
    setBusy(jobId);
    try {
      await api(`/worker/jobs/${jobId}/accept`, { method: "POST" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(lang === "en" ? "Job accepted! Customer notified." : "काम स्वीकृत! ग्राहक को सूचित किया गया।", "success");
      router.push(`/worker/job/${jobId}` as any);
      load();
    } catch (e: any) {
      toast(e?.message || "Failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const reject = async (jobId: string) => {
    setBusy(jobId + "r");
    try {
      await api(`/worker/jobs/${jobId}/reject`, { method: "POST", body: { reason: "Not available" } });
      toast(lang === "en" ? "Job rejected — reassigning to another worker" : "काम अस्वीकृत — दूसरे वर्कर को भेजा जा रहा है", "info");
      load();
    } catch (e: any) {
      toast(e?.message || "Failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const activeJob = jobs.active[0];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      {/* Header with availability toggle */}
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={st.headerName}>{user?.name}</Text>
          <Text style={st.headerRole}>{lang === "en" ? "SkillSync Professional" : "SkillSync प्रोफेशनल"}</Text>
        </View>
        <View style={[st.onlinePill, { backgroundColor: isOnline ? C.successLight : C.bg3 }]}>
          <View style={[st.onlineDot, { backgroundColor: isOnline ? C.success : C.text3 }]} />
          <Text style={[st.onlineText, { color: isOnline ? "#047857" : C.text3 }]}>{isOnline ? t("online") : t("offline")}</Text>
          <Switch testID="availability-toggle" value={isOnline} onValueChange={toggleOnline} trackColor={{ true: C.success }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SP.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load().catch(() => {}); setRefreshing(false); }} tintColor={C.primary} />}
      >
        {/* Stats row */}
        <View style={st.statsRow}>
          <View style={[st.statCard, { backgroundColor: C.dark }]} testID="stat-today-earnings">
            <Text style={st.statValueDark}>{fmtMoney(stats?.today || 0)}</Text>
            <Text style={st.statLabelDark}>{t("todayEarnings")}</Text>
          </View>
          <View style={st.statCard} testID="stat-today-jobs">
            <Text style={st.statValue}>{stats?.today_jobs ?? 0}</Text>
            <Text style={st.statLabel}>{t("todayJobs")}</Text>
          </View>
          <View style={st.statCard} testID="stat-rating">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="star" size={15} color="#F59E0B" />
              <Text style={st.statValue}>{stats?.rating || 0}</Text>
            </View>
            <Text style={st.statLabel}>{t("rating")}</Text>
          </View>
        </View>

        {/* Active job */}
        {activeJob && (
          <>
            <Text style={st.section}>{t("activeJobs")}</Text>
            <Pressable testID={`active-job-${activeJob.id}`} onPress={() => router.push(`/worker/job/${activeJob.id}` as any)} style={st.activeCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.activeService}>{activeJob.service_name}</Text>
                  <Text style={st.activeMeta}>{activeJob.customer_name} • {activeJob.address_line}</Text>
                </View>
                <Badge text={statusLabel(activeJob.status, lang)} color={STATUS_META[activeJob.status]?.color || C.text} bg={STATUS_META[activeJob.status]?.bg || C.bg3} />
              </View>
              <View style={st.activeGo}>
                <Text style={st.activeGoText}>{lang === "en" ? "CONTINUE JOB" : "काम जारी रखें"}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </Pressable>
          </>
        )}

        {/* New requests */}
        <Text style={st.section}>{t("newRequests")} {jobs.new.length > 0 && <Text style={{ color: C.error }}>({jobs.new.length})</Text>}</Text>
        {!isOnline && (
          <View style={st.offlineBanner} testID="offline-banner">
            <Ionicons name="moon" size={16} color={C.text3} />
            <Text style={st.offlineText}>{t("goOnlineHint")}</Text>
          </View>
        )}
        {jobs.new.length === 0 ? (
          <View style={st.emptyCard} testID="no-requests-empty">
            <Ionicons name="briefcase-outline" size={28} color={C.text3} />
            <Text style={st.emptyText}>{t("noRequests")}</Text>
          </View>
        ) : (
          jobs.new.map((j: any) => (
            <View key={j.id} style={st.requestCard} testID={`job-request-${j.id}`}>
              {j.priority && (
                <View style={st.priorityBadge}>
                  <Ionicons name="flash" size={11} color="#fff" />
                  <Text style={st.priorityText}>PRIORITY</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.reqService}>{j.service_name}</Text>
                  <Text style={st.reqNumber}>{j.booking_number} • {j.customer_name}</Text>
                </View>
                {j.ai_estimate && <Text style={st.reqEstimate}>{fmtMoney(j.ai_estimate.min)}–{fmtMoney(j.ai_estimate.max)}</Text>}
              </View>
              {j.description ? <Text style={st.reqDesc} numberOfLines={2}>“{j.description}”</Text> : null}
              {j.ai_estimate && (
                <View style={st.aiRow}>
                  <Ionicons name="sparkles" size={12} color={C.primary} />
                  <Text style={st.aiText}>AI: {j.ai_estimate.detected_problem} • {j.ai_estimate.severity}</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                <View style={st.metaItem}><Ionicons name="location-outline" size={13} color={C.text3} /><Text style={st.metaText}>{j.distance_km} km</Text></View>
                <View style={st.metaItem}><Ionicons name="time-outline" size={13} color={C.text3} /><Text style={st.metaText}>ETA {j.eta_min} min</Text></View>
                <View style={st.metaItem}><Ionicons name="calendar-outline" size={13} color={C.text3} /><Text style={st.metaText}>{j.scheduled_date} {j.scheduled_time}</Text></View>
              </View>
              <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.md }}>
                <View style={{ flex: 2 }}>
                  <Btn testID={`accept-job-${j.id}`} title={t("accept")} variant="success" loading={busy === j.id} onPress={() => accept(j.id)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Btn testID={`reject-job-${j.id}`} title={t("reject")} variant="ghost" loading={busy === j.id + "r"} onPress={() => reject(j.id)} />
                </View>
              </View>
            </View>
          ))
        )}

        {/* Earnings snapshot */}
        <Text style={st.section}>{t("earnings")}</Text>
        <View style={st.earningsCard} testID="earnings-snapshot">
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={st.earnValue}>{fmtMoney(stats?.week || 0)}</Text>
            <Text style={st.earnLabel}>{t("weekEarnings")}</Text>
          </View>
          <View style={st.earnDivider} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={st.earnValue}>{fmtMoney(stats?.pending_payout || 0)}</Text>
            <Text style={st.earnLabel}>{t("pendingPayout")}</Text>
          </View>
          <View style={st.earnDivider} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={st.earnValue}>{stats?.completed_jobs ?? 0}</Text>
            <Text style={st.earnLabel}>{t("completedJobs")}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerName: { fontSize: 17, fontWeight: "900", color: C.text },
  headerRole: { fontSize: 11, color: C.text3, marginTop: 1 },
  onlinePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 12, paddingRight: 4, paddingVertical: 3, borderRadius: R.pill },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 11.5, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: SP.sm },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: R.md, padding: SP.md, alignItems: "center", borderWidth: 1, borderColor: C.border, minHeight: 74, justifyContent: "center" },
  statValue: { fontSize: 18, fontWeight: "900", color: C.text },
  statLabel: { fontSize: 10, color: C.text3, marginTop: 3, textAlign: "center" },
  statValueDark: { fontSize: 18, fontWeight: "900", color: "#fff" },
  statLabelDark: { fontSize: 10, color: "#9CA3AF", marginTop: 3, textAlign: "center" },
  section: { fontSize: 15, fontWeight: "800", color: C.text, marginTop: SP.xl, marginBottom: SP.sm },
  activeCard: { backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, borderWidth: 1.5, borderColor: "#BFDBFE", ...shadow },
  activeService: { fontSize: 15, fontWeight: "800", color: C.text },
  activeMeta: { fontSize: 11.5, color: C.text3, marginTop: 2 },
  activeGo: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.primary, borderRadius: R.sm + 2, height: 44, marginTop: SP.md },
  activeGoText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  offlineBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.bg3, borderRadius: R.md, padding: SP.md, marginBottom: SP.sm },
  offlineText: { fontSize: 12, color: C.text3, flex: 1 },
  emptyCard: { backgroundColor: "#fff", borderRadius: R.md, alignItems: "center", paddingVertical: SP.xl, gap: 8, borderWidth: 1, borderColor: C.border },
  emptyText: { fontSize: 12.5, color: C.text3 },
  requestCard: { backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, marginBottom: SP.md, borderWidth: 1.5, borderColor: "#FDE68A", ...shadow },
  priorityBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.warning, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill, marginBottom: 6 },
  priorityText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  reqService: { fontSize: 15.5, fontWeight: "800", color: C.text },
  reqNumber: { fontSize: 11.5, color: C.text3, marginTop: 1 },
  reqEstimate: { fontSize: 13, fontWeight: "800", color: C.primary },
  reqDesc: { fontSize: 12.5, color: C.text2, marginTop: 6 },
  aiRow: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.primaryLight, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.pill, marginTop: 6 },
  aiText: { fontSize: 11, color: C.primaryDark, fontWeight: "600" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11.5, color: C.text3 },
  earningsCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: R.md, padding: SP.lg, borderWidth: 1, borderColor: C.border },
  earnValue: { fontSize: 15, fontWeight: "900", color: C.text },
  earnLabel: { fontSize: 10, color: C.text3, marginTop: 3, textAlign: "center" },
  earnDivider: { width: 1, backgroundColor: C.border },
});
