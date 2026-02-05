import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

import { HapticTab } from "@/components/haptic-tab";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tabBarTheme =
    colorScheme === "dark"
      ? {
          background: "#151718",
          border: "rgba(255,255,255,0.08)",
          active: "#FFFFFF",
          inactive: "#9BA1A6",
        }
      : {
          background: "#F9F5E9",
          border: "#E9E2D0",
          active: "#4E7C5B",
          inactive: "#9BA28F",
        };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabBarTheme.active,
        tabBarInactiveTintColor: tabBarTheme.inactive,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: tabBarTheme.background,
          borderTopColor: tabBarTheme.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meal"
        options={{
          title: "AI식단분석",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "리포트",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meal-list"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="meal-detail"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="meal-camera"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="meal-edit"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
