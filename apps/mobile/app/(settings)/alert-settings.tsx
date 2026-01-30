import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { alertConfig, AlertType } from "./alert/_config";
import { fetchAlertSettings, updateAlertSetting } from "./alert/_api";
import {
  AlertKey,
  AlertSetting,
  getAlertSettings,
  setAlertSetting,
  setAlertSettings,
} from "./alert/_store";

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  accent: "#FACC15",
  accentInk: "#111827",
};

const alertRowMeta: Array<{
  key: AlertType;
  title: string;
}> = [
  { key: "high", title: "높음" },
  { key: "low", title: "낮음" },
  { key: "very-low", title: "매우 낮음" },
  { key: "urgent-low", title: "곧 저혈당" },
];

const formatInterval = (minutes: number) =>
  minutes === 60 ? "1시간" : `${minutes}분`;

export default function AlertSettingsScreen() {
  const router = useRouter();
  const [settingsSnapshot, setSettingsSnapshot] = React.useState(() =>
    getAlertSettings()
  );

  const syncFromStore = React.useCallback(() => {
    setSettingsSnapshot(getAlertSettings());
  }, []);

  const loadSettings = React.useCallback(async () => {
    try {
      const response = await fetchAlertSettings();
      const next: Partial<Record<AlertKey, AlertSetting>> = {};
      response.forEach((item) => {
        next[item.type] = {
          enabled: item.enabled,
          thresholdValue: item.thresholdValue ?? null,
          intervalMinutes: item.intervalMinutes,
        };
      });
      setAlertSettings(next);
      syncFromStore();
    } catch {
      syncFromStore();
    }
  }, [syncFromStore]);

  useFocusEffect(
    React.useCallback(() => {
      void loadSettings();
    }, [loadSettings])
  );

  const alertRows = alertRowMeta.map((row) => {
    const setting = settingsSnapshot[row.key];
    const value =
      setting?.thresholdValue ?? alertConfig[row.key].defaultValue;
    const interval = setting?.intervalMinutes ?? 15;
    return {
      key: row.key,
      title: row.title,
      desc: alertConfig[row.key].display(value),
      value: `${formatInterval(interval)}마다`,
    };
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>알림 설정</Text>

        <Text style={styles.sectionTitle}>혈당 알림</Text>
        <View style={styles.listCard}>
          {alertRows.map((row, index) => (
            <View key={row.key}>
              <Pressable
                style={styles.listRow}
                onPress={() => router.push(`/(settings)/alert/${row.key}`)}
              >
                <View style={styles.listInfo}>
                  <Text style={styles.rowTitle}>{row.title}</Text>
                  <Text style={styles.rowDesc}>{row.desc}</Text>
                </View>
                <View style={styles.rowValue}>
                  <Text style={styles.rowValueText}>{row.value}</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </Pressable>
              {index < alertRows.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={styles.listCard}>
          <View style={styles.switchRow}>
            <View style={styles.listInfo}>
              <Text style={styles.rowTitle}>혈당 상승</Text>
              <Text style={styles.rowDesc}>혈당 급상승 할 때 변동 안내</Text>
            </View>
            <Switch
              value={settingsSnapshot["rapid-rise"].enabled}
              onValueChange={(next) => {
                setSettingsSnapshot((prev) => ({
                  ...prev,
                  "rapid-rise": { ...prev["rapid-rise"], enabled: next },
                }));
                setAlertSetting("rapid-rise", { enabled: next });
                void updateAlertSetting("rapid-rise", { enabled: next });
              }}
              trackColor={{ false: "#E2E8F0", true: palette.accent }}
              thumbColor={
                settingsSnapshot["rapid-rise"].enabled
                  ? palette.accentInk
                  : "#FFFFFF"
              }
            />
          </View>
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

  sectionTitle: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  listCard: {
    backgroundColor: palette.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 6,
    marginBottom: 16,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  listInfo: {
    flex: 1,
    paddingRight: 10,
  },
  rowTitle: { color: palette.text, fontSize: 16, fontWeight: "600" },
  rowDesc: { color: palette.textMuted, marginTop: 4, fontSize: 12 },
  rowValue: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowValueText: {
    color: palette.textMuted,
    fontSize: 13,
    marginRight: 6,
  },
  chevron: { color: palette.textMuted, fontSize: 18 },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginHorizontal: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
});
