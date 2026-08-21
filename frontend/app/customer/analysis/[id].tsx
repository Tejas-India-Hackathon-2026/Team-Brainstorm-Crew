import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, fileUrl } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { C, R, SP } from "@/src/theme";
import { fmtMoney } from "@/src/types";
import { AnimatedCard, Btn, Card } from "@/src/components/ui";

const SEVERITY_COLOR: Record<string, string> = { Low: "#10B981", Medium: "#F59E0B", High: "#EF4444" };

export default function AnalysisResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    api<any>(`/problem-reports/${id}`).then(setReport).catch(() => {});
  }, [id]);

  const a = report?.analysis;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="analysis-back-btn" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={st.headerTitle}>{t("aiResult")}</Text>
        <View style={{ width: 22 }} />
      </View>

      {!a ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 140 }}>
          <AnimatedCard>
            <View style={st.doneBanner} testID="analysis-complete-banner">
              <Ionicons name="checkmark-circle" size={18} color={C.success} />
              <Text style={st.doneText}>{lang === "en" ? "Analysis Complete" : "विश्लेषण पूर्ण"}</Text>
            </View>
          </AnimatedCard>

          {report.media_paths?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SP.sm, marginBottom: SP.md }}>
              {report.media_paths.map((p: string) => (
                <Image key={p} source={{ uri: fileUrl(p) }} style={st.mediaImg} contentFit="cover" />
              ))}
            </ScrollView>
          )}

          <AnimatedCard delay={80}>
            <Card testID="detected-problem-card">
              <Text style={st.label}>{t("detectedProblem")}</Text>
              <Text style={st.problem}>{a.detected_problem}</Text>
              <Text style={st.desc}>{a.description}</Text>
              <View style={st.metricsRow}>
                <View style={st.metric}>
                  <Text style={st.metricLabel}>{t("confidence")}</Text>
                  <Text style={[st.metricValue, { color: C.primary }]}>{a.confidence}%</Text>
                </View>
                <View style={st.metricDivider} />
                <View style={st.metric}>
                  <Text style={st.metricLabel}>{t("severity")}</Text>
                  <Text style={[st.metricValue, { color: SEVERITY_COLOR[a.severity] || C.text }]}>{a.severity}</Text>
                </View>
              </View>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={140} style={{ marginTop: SP.md }}>
            <Card testID="estimate-card" style={{ backgroundColor: C.primaryLight, borderColor: "#BFDBFE" }}>
              <Text style={st.label}>{t("estimatedCost")}</Text>
              <Text style={st.estimate}>
                {fmtMoney(a.estimated_min)} – {fmtMoney(a.estimated_max)}
              </Text>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start", marginTop: 6 }}>
                <Ionicons name="information-circle" size={14} color={C.primaryDark} style={{ marginTop: 1 }} />
                <Text style={st.estimateNote}>{t("estimateNote")}</Text>
              </View>
            </Card>
          </AnimatedCard>

          {a.safety_warnings?.length > 0 && (
            <AnimatedCard delay={200} style={{ marginTop: SP.md }}>
              <Card testID="safety-warning-card" style={{ backgroundColor: C.errorLight, borderColor: "#FECACA" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ionicons name="warning" size={16} color={C.error} />
                  <Text style={[st.label, { color: C.error, marginBottom: 0 }]}>{t("safetyWarnings")}</Text>
                </View>
                {a.safety_warnings.map((w: string, i: number) => (
                  <Text key={i} style={st.bullet}>• {w}</Text>
                ))}
              </Card>
            </AnimatedCard>
          )}

          <AnimatedCard delay={260} style={{ marginTop: SP.md }}>
            <Card>
              <Text style={st.label}>{t("possibleCauses")}</Text>
              {a.possible_causes?.map((cse: string, i: number) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 5 }}>
                  <View style={st.dot} />
                  <Text style={[st.bullet, { flex: 1 }]}>{cse}</Text>
                </View>
              ))}
              {a.recommended_actions?.length > 0 && (
                <>
                  <Text style={[st.label, { marginTop: SP.md }]}>{t("recommendedActions")}</Text>
                  {a.recommended_actions.map((r: string, i: number) => (
                    <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 5 }}>
                      <Ionicons name="checkmark" size={14} color={C.success} style={{ marginTop: 2 }} />
                      <Text style={[st.bullet, { flex: 1 }]}>{r}</Text>
                    </View>
                  ))}
                </>
              )}
            </Card>
          </AnimatedCard>

          <View style={{ height: SP.xl }} />
          <Btn
            testID="find-pros-btn"
            title={t("findPros")}
            icon="people"
            onPress={() =>
              router.push({ pathname: "/customer/workers", params: { category: a.category, reportId: id } } as any)
            }
          />
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  doneBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.successLight, borderRadius: R.md, padding: SP.md, marginBottom: SP.md, borderWidth: 1, borderColor: "#A7F3D0" },
  doneText: { color: "#047857", fontWeight: "700", fontSize: 13 },
  mediaImg: { width: 110, height: 110, borderRadius: R.md },
  label: { fontSize: 12, fontWeight: "700", color: C.text3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  problem: { fontSize: 20, fontWeight: "900", color: C.text },
  desc: { fontSize: 13, color: C.text2, marginTop: 6, lineHeight: 19 },
  metricsRow: { flexDirection: "row", marginTop: SP.lg, backgroundColor: C.bg2, borderRadius: R.md, padding: SP.md },
  metric: { flex: 1, alignItems: "center" },
  metricDivider: { width: 1, backgroundColor: C.border },
  metricLabel: { fontSize: 11, color: C.text3 },
  metricValue: { fontSize: 18, fontWeight: "900", marginTop: 2 },
  estimate: { fontSize: 26, fontWeight: "900", color: C.primaryDark },
  estimateNote: { fontSize: 11.5, color: C.primaryDark, flex: 1, lineHeight: 16 },
  bullet: { fontSize: 13, color: C.text2, lineHeight: 19 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 6 },
});
