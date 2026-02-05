import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const palette = {
  background: "#F4E8D6",
  text: "#2F3B30",
  textMuted: "#6F7A6A",
  accent: "#2F6B4F",
  accentInk: "#233327",
  border: "#E6DCC6",
};

const options = [5, 10, 15, 20, 30, 60];

const formatInterval = (minutes: number) =>
  minutes === 60 ? "1시간" : `${minutes}분`;

export default function AlertIntervalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type, interval } = useLocalSearchParams<{
    type?: string;
    interval?: string;
  }>();
  const headerPaddingTop = Math.max(12, insets.top + 8);
  const initial =
    typeof interval === "string" && interval.length > 0
      ? Number(interval)
      : 15;
  const [selected, setSelected] = React.useState(initial);

  const goBackWith = (value: number) => {
    const routeType = typeof type === "string" ? type : "high";
    router.replace({
      pathname: `/(settings)/alert/${routeType}`,
      params: { interval: String(value) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          <Pressable style={styles.headerSide} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={palette.text} />
          </Pressable>
          <Text style={styles.headerTitle}>상태 지속 시 알림 간격</Text>
          <View style={styles.headerSide} />
        </View>

        <View style={styles.list}>
          {options.map((option) => {
            const isActive = option === selected;
            return (
              <Pressable
                key={option}
                style={styles.optionRow}
                onPress={() => {
                  setSelected(option);
                  goBackWith(option);
                }}
              >
                <View style={styles.radio}>
                  {isActive ? (
                    <View style={styles.radioActive}>
                      <Text style={styles.radioCheck}>✓</Text>
                    </View>
                  ) : (
                    <View style={styles.radioInactive} />
                  )}
                </View>
                <Text style={styles.optionText}>
                  {formatInterval(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  container: { paddingHorizontal: 16, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerSide: {
    minWidth: 72,
    minHeight: 40,
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: palette.text },

  list: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
  },
  radio: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioInactive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
  },
  radioActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCheck: {
    color: palette.accentInk,
    fontWeight: "800",
  },
  optionText: {
    fontSize: 18,
    color: palette.text,
    fontWeight: "600",
  },
});
