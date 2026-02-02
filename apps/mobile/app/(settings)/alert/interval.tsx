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

const palette = {
  background: "#F8FAFC",
  text: "#0F172A",
  textMuted: "#64748B",
  accent: "#FACC15",
  accentInk: "#111827",
  border: "#E2E8F0",
};

const options = [5, 10, 15, 20, 30, 60];

const formatInterval = (minutes: number) =>
  minutes === 60 ? "1시간" : `${minutes}분`;

export default function AlertIntervalScreen() {
  const router = useRouter();
  const { type, interval } = useLocalSearchParams<{
    type?: string;
    interval?: string;
  }>();
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
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>상태 지속 시 알림 간격</Text>

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
  container: { padding: 20, paddingBottom: 40 },

  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  backIcon: { fontSize: 20, color: palette.text },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
    marginBottom: 20,
  },

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
