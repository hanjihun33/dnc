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
  accentInk: "#111827",
};

const options = ["해당 없음", "1형 당뇨", "2형 당뇨", "임신성 당뇨", "당뇨 전단계"];

export default function DiagnosisScreen() {
  const router = useRouter();
  const [selected, setSelected] = React.useState("해당 없음");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>진단 유형 설정</Text>
        <Text style={styles.subtitle}>본인의 진단 유형을 선택하세요.</Text>

        <View style={styles.section}>
          {options.map((label) => {
            const isActive = selected === label;
            return (
              <Pressable
                key={label}
                style={[styles.optionRow, isActive && styles.optionRowActive]}
                onPress={() => setSelected(label)}
              >
                <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                  {label}
                </Text>
                <View style={[styles.radio, isActive && styles.radioActive]}>
                  {isActive && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.saveButton} onPress={() => router.back()}>
          <Text style={styles.saveButtonText}>저장하기</Text>
        </Pressable>
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
    marginBottom: 6,
  },
  subtitle: {
    color: palette.textMuted,
    marginBottom: 18,
  },

  section: {
    backgroundColor: palette.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  optionRowActive: {
    backgroundColor: "rgba(250, 204, 21, 0.2)",
  },
  optionText: { color: palette.text, fontSize: 16, fontWeight: "600" },
  optionTextActive: { color: palette.accentInk },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: palette.accent,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.accentInk,
  },

  saveButton: {
    marginTop: 20,
    backgroundColor: palette.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: palette.accentInk,
    fontSize: 16,
    fontWeight: "700",
  },
});
