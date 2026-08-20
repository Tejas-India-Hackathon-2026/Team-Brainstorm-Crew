import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";

import { useI18n } from "@/src/i18n";
import { C } from "@/src/theme";

export default function CustomerTabs() {
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
        name="home"
        options={{
          title: t("home"),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t("bookings"),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t("report"),
          tabBarIcon: () => (
            <View style={st.fab}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t("alerts"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

const st = StyleSheet.create({
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
