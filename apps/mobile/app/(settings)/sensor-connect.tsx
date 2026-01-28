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
import { useRouter } from "expo-router";

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  accent: "#FACC15",
};

export default function SensorConnectScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.title}>사용하실 센서 선택</Text>
        <Text style={styles.subtitle}>
          센서란 실시간으로 혈당을 모니터링할 수 있는{"\n"}
          연속혈당측정기(CGM)를 의미합니다.
        </Text>

        <View style={styles.sensorCard}>
          <View style={styles.deviceShell}>
            <View style={styles.deviceTop} />
            <View style={styles.deviceBody}>
              <View style={styles.deviceButton} />
            </View>
            <View style={styles.deviceBase} />
          </View>
          <Text style={styles.sensorName}>Dexcom G7</Text>
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
    marginBottom: 12,
  },
  backIcon: { fontSize: 20, color: palette.text },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
    marginBottom: 8,
  },
  subtitle: {
    color: palette.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },

  sensorCard: {
    width: 220,
    borderRadius: 24,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  deviceShell: {
    alignSelf: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  deviceTop: {
    width: 70,
    height: 52,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#E2E8F0",
  },
  deviceBody: {
    width: 86,
    height: 76,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
  },
  deviceButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#CBD5E1",
  },
  deviceBase: {
    width: 90,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E2E8F0",
    marginTop: -6,
  },
  sensorName: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
  },
});
