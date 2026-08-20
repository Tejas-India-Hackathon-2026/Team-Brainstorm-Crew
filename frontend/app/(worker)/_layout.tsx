import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

import { useI18n } from "@/src/i18n";
import { C } from "@/src/theme";

export default function WorkerTabs() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: C.border,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("dashboard"),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: t("jobs"),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t("earnings"),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="walerts"
        options={{
          title: t("alerts"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wprofile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
