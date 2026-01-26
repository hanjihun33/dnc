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
import { useRouter } from "expo-router";

import { useSignupDraft } from "./signup-context";

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  accent: "#FACC15",
  accentDark: "#F59E0B",
  ink: "#111827",
};

export default function SignupScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useSignupDraft();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNext = () => {
    const trimmedEmail = draft.email.trim();
    setErrorMessage(null);

    if (!trimmedEmail) {
      setErrorMessage("이메일을 입력해주세요.");
      return;
    }
    if (draft.password.length < 8) {
      setErrorMessage("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (draft.password !== confirmPassword) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
      return;
    }
    router.push("/signup-diabetes");
  };

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
            <Text style={styles.backText}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>회원가입</Text>
          <View style={styles.backSpacer} />
        </View>
        <Text style={styles.subtitle}>기본 정보를 입력해주세요.</Text>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>이름</Text>
            <TextInput
              style={styles.input}
              placeholder="홍길동"
              placeholderTextColor={palette.textMuted}
              value={draft.name}
              onChangeText={(value) => updateDraft({ name: value })}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={draft.email}
              onChangeText={(value) => updateDraft({ email: value })}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="8자 이상 입력하세요"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
              value={draft.password}
              onChangeText={(value) => updateDraft({ password: value })}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>비밀번호 확인</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 다시 입력하세요"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>다음</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helperRow}>
          <Text style={styles.helperText}>이미 계정이 있나요?</Text>
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
    marginBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 16, color: palette.text },
  backSpacer: { width: 36 },
  pageTitle: { fontSize: 22, fontWeight: "800", color: palette.text },
  subtitle: { color: palette.textMuted, marginBottom: 18 },
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
    backgroundColor: "#F8FAFC",
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
  errorText: { color: "#DC2626", fontSize: 12, marginBottom: 8 },
});
