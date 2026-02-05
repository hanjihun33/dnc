import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const palette = {
  background: "#FAF8F0",
  card: "#F6F1E3",
  text: "#1F241F",
  textMuted: "#6B7466",
  border: "#E7E0CC",
  accent: "#7FAF7B",
  accentDark: "#4E7C5B",
  ink: "#1F2A1F",
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={18} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>비밀번호 찾기</Text>
          <View style={styles.backSpacer} />
        </View>
        <Text style={styles.subtitle}>
          가입한 이메일(아이디)로 비밀번호 재설정 링크를 보내드립니다.
        </Text>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>이메일(아이디)</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>링크 보내기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helperRow}>
          <Text style={styles.helperText}>로그인 화면으로 돌아가기</Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.helperTextAccent}>로그인</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  page: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFE9D9",
    alignItems: "center",
    justifyContent: "center",
  },
  backSpacer: { width: 36 },
  pageTitle: { fontSize: 22, fontWeight: "800", color: palette.text },
  subtitle: { color: palette.textMuted, marginBottom: 18, lineHeight: 20 },
  formCard: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    backgroundColor: "#F9F5E9",
  },
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonText: { color: palette.ink, fontWeight: "800", fontSize: 16 },
  helperRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  helperText: { color: palette.textMuted, fontSize: 12, marginRight: 6 },
  helperTextAccent: { color: palette.accentDark, fontSize: 12, fontWeight: "700" },
});
