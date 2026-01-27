import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

const genders = ["남성", "여성", "기타"];

export default function BodyInfoScreen() {
  const router = useRouter();
  const [birthDate, setBirthDate] = React.useState("");
  const [gender, setGender] = React.useState("남성");
  const [height, setHeight] = React.useState("");
  const [weight, setWeight] = React.useState("");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>신체 정보 설정</Text>
        <Text style={styles.subtitle}>
          생년월일, 성별, 키, 체중을 다시 입력하세요.
        </Text>

        <View style={styles.section}>
          <View style={styles.field}>
            <Text style={styles.label}>생년월일</Text>
            <TextInput
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>성별</Text>
            <View style={styles.segment}>
              {genders.map((option) => {
                const isActive = gender === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.segmentItem, isActive && styles.segmentItemActive]}
                    onPress={() => setGender(option)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        isActive && styles.segmentTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>키 (cm)</Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="예: 170"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>체중 (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="예: 65"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                keyboardType="numeric"
              />
            </View>
          </View>
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
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: palette.text,
    backgroundColor: "#FFFFFF",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentItemActive: {
    backgroundColor: palette.accent,
  },
  segmentText: {
    color: palette.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  segmentTextActive: {
    color: palette.accentInk,
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
