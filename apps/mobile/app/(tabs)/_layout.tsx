import { Tabs } from "expo-router";
import React from "react";
import { Text } from "react-native";

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
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="meal"
        options={{
          title: "식단",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>🍽️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "리포트",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>📈</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}
