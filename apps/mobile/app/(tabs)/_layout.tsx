import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
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
          title: "식단",
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
        name="meal-edit"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
