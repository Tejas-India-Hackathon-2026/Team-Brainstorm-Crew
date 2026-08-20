import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import NotificationsList from "@/src/components/NotificationsList";
import { useI18n } from "@/src/i18n";
import { C, SP } from "@/src/theme";

export default function CustomerAlerts() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Text style={st.title}>{t("alerts")}</Text>
      </View>
      <NotificationsList role="customer" />
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: "#fff", paddingHorizontal: SP.lg, paddingBottom: SP.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 20, fontWeight: "900", color: C.text },
});
