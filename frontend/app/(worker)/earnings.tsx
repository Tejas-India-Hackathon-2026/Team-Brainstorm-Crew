import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { usePoll } from "@/src/hooks";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { fmtDateTime, fmtMoney } from "@/src/types";
import { Empty, Stars } from "@/src/components/ui";

export default function WorkerEarnings() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);

  usePoll(async () => setStats(await api<any>("/worker/stats")), 8000);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Text style={st.title}>{t("earnings")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 120 }}>
        {/* Hero */}
        <View style={st.hero} testID="earnings-hero">
          <Text style={st.heroLabel}>{t("todayEarnings")}</Text>
          <Text style={st.heroValue}>{fmtMoney(stats?.today || 0)}</Text>
          <View style={st.heroRow}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={st.heroSubValue}>{fmtMoney(stats?.week || 0)}</Text>
              <Text style={st.heroSubLabel}>{t("weekEarnings")}</Text>
            </View>
            <View style={st.heroDivider} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={st.heroSubValue}>{fmtMoney(stats?.month || 0)}</Text>
              <Text style={st.heroSubLabel}>{t("monthEarnings")}</Text>
            </View>
            <View style={st.heroDivider} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={st.heroSubValue}>{stats?.completed_jobs ?? 0}</Text>
              <Text style={st.heroSubLabel}>{t("completedJobs")}</Text>
            </View>
          </View>
        </View>

        {/* Payout */}
        <View style={st.payoutRow}>
          <View style={[st.payoutCard, { backgroundColor: C.warningLight, borderColor: "#FDE68A" }]} testID="pending-payout-card">
            <Ionicons name="hourglass-outline" size={18} color={C.warning} />
            <Text style={st.payoutValue}>{fmtMoney(stats?.pending_payout || 0)}</Text>
            <Text style={st.payoutLabel}>{t("pendingPayout")}</Text>
          </View>
          <View style={[st.payoutCard, { backgroundColor: C.successLight, borderColor: "#A7F3D0" }]} testID="paid-card">
            <Ionicons name="checkmark-circle-outline" size={18} color={C.success} />
            <Text style={st.payoutValue}>{fmtMoney(stats?.paid || 0)}</Text>
            <Text style={st.payoutLabel}>{lang === "en" ? "Paid Out" : "भुगतान हुआ"}</Text>
          </View>
        </View>

        {/* Recent earnings */}
        <Text style={st.section}>{lang === "en" ? "Job Earnings" : "काम की कमाई"}</Text>
        {(stats?.recent_earnings || []).length === 0 ? (
          <Empty icon="wallet-outline" text={lang === "en" ? "Complete jobs to start earning" : "कमाई शुरू करने के लिए काम पूरे करें"} testID="earnings-empty" />
        ) : (
          stats.recent_earnings.map((e: any) => (
            <View key={e.id} style={st.earnRow} testID={`earning-${e.id}`}>
              <View style={st.earnIcon}>
                <Ionicons name="cash-outline" size={18} color={C.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.earnTitle}>{fmtMoney(e.net)} <Text style={st.earnFee}>({lang === "en" ? "fee" : "फीस"} {fmtMoney(e.platform_fee)})</Text></Text>
                <Text style={st.earnTime}>{fmtDateTime(e.created_at)} • {e.payout_status}</Text>
              </View>
              <Text style={st.earnGross}>{fmtMoney(e.amount)}</Text>
            </View>
          ))
        )}

        {/* Reviews */}
        <Text style={st.section}>{lang === "en" ? "Recent Reviews" : "हाल की समीक्षाएं"} ({stats?.total_reviews ?? 0})</Text>
        {(stats?.recent_reviews || []).map((r: any) => (
          <View key={r.id} style={st.reviewRow} testID={`review-${r.id}`}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={st.reviewName}>{r.customer_name}</Text>
              <Stars value={r.rating} size={14} />
            </View>
            {r.comment ? <Text style={st.reviewComment}>“{r.comment}”</Text> : null}
            <Text style={st.reviewMeta}>{r.service_name} • {fmtDateTime(r.created_at)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 20, fontWeight: "900", color: C.text },
  hero: { backgroundColor: C.dark, borderRadius: R.lg, padding: SP.xl },
  heroLabel: { color: "#9CA3AF", fontSize: 12, fontWeight: "600" },
  heroValue: { color: "#fff", fontSize: 34, fontWeight: "900", marginTop: 4 },
  heroRow: { flexDirection: "row", marginTop: SP.lg, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: R.md, padding: SP.md },
  heroSubValue: { color: "#fff", fontSize: 14, fontWeight: "800" },
  heroSubLabel: { color: "#9CA3AF", fontSize: 9.5, marginTop: 2, textAlign: "center" },
  heroDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  payoutRow: { flexDirection: "row", gap: SP.sm, marginTop: SP.md },
  payoutCard: { flex: 1, borderRadius: R.md, padding: SP.md, alignItems: "center", gap: 3, borderWidth: 1 },
  payoutValue: { fontSize: 16, fontWeight: "900", color: C.text },
  payoutLabel: { fontSize: 10.5, color: C.text3 },
  section: { fontSize: 15, fontWeight: "800", color: C.text, marginTop: SP.xl, marginBottom: SP.sm },
  earnRow: { flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: "#fff", borderRadius: R.md, padding: SP.md, marginBottom: SP.sm, borderWidth: 1, borderColor: C.border },
  earnIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.successLight, alignItems: "center", justifyContent: "center" },
  earnTitle: { fontSize: 13.5, fontWeight: "800", color: C.text },
  earnFee: { fontSize: 11, color: C.text3, fontWeight: "400" },
  earnTime: { fontSize: 11, color: C.text3, marginTop: 1 },
  earnGross: { fontSize: 12.5, color: C.text3, fontWeight: "600" },
  reviewRow: { backgroundColor: "#fff", borderRadius: R.md, padding: SP.md, marginBottom: SP.sm, borderWidth: 1, borderColor: C.border },
  reviewName: { fontSize: 13, fontWeight: "700", color: C.text },
  reviewComment: { fontSize: 12.5, color: C.text2, marginTop: 4, fontStyle: "italic" },
  reviewMeta: { fontSize: 10.5, color: C.text3, marginTop: 4 },
});
