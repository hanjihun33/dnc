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
import { alertConfig, AlertType } from "./alert/config";
import { getAlertValues } from "./alert/store";

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
  interval: string;
}> = [
  { key: "high", title: "높음", interval: "15분마다" },
  { key: "low", title: "낮음", interval: "15분마다" },
  { key: "very-low", title: "매우 낮음", interval: "15분마다" },
  { key: "urgent-low", title: "곧 저혈당", interval: "15분마다" },
];

export default function AlertSettingsScreen() {
  const router = useRouter();
  const [riseEnabled, setRiseEnabled] = React.useState(true);
  const [alertValues, setAlertValues] = React.useState(() => getAlertValues());

  useFocusEffect(
    React.useCallback(() => {
      setAlertValues(getAlertValues());
    }, [])
  );

  const alertRows = alertRowMeta.map((row) => ({
    key: row.key,
    title: row.title,
    desc: alertConfig[row.key].display(alertValues[row.key]),
    value: row.interval,
  }));

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
              value={riseEnabled}
              onValueChange={setRiseEnabled}
              trackColor={{ false: "#E2E8F0", true: palette.accent }}
              thumbColor={riseEnabled ? palette.accentInk : "#FFFFFF"}
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
