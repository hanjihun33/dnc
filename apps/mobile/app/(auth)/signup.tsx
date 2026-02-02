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

import { useSignupDraft } from "@/components/signup-context";

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

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function SignupScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useSignupDraft();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);

  const handleNext = async () => {
    const trimmedEmail = draft.email.trim();
    const trimmedNickname = draft.nickname.trim();
    setErrorMessage(null);
    setEmailError(null);
    setNicknameError(null);

    if (!trimmedEmail) {
      setEmailError("이메일(아이디)을 입력해주세요.");
      return;
    }
    if (!trimmedNickname) {
      setNicknameError("닉네임을 입력해주세요.");
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

    setIsCheckingEmail(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/check-email?email=${encodeURIComponent(
          trimmedEmail
        )}`
      );
      if (response.status === 409) {
        setEmailError("이미 사용 중인 이메일입니다.");
        return;
      }
      if (!response.ok) {
        setErrorMessage("이메일 확인에 실패했습니다.");
        return;
      }
    } catch {
      setErrorMessage("이메일 확인에 실패했습니다.");
      return;
    } finally {
      setIsCheckingEmail(false);
    }

    setIsCheckingNickname(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/check-nickname?nickname=${encodeURIComponent(
          trimmedNickname
        )}`
      );
      if (response.status === 409) {
        setNicknameError("이미 사용 중인 닉네임입니다.");
        return;
      }
      if (!response.ok) {
        setErrorMessage("닉네임 확인에 실패했습니다.");
        return;
      }
    } catch {
      setErrorMessage("닉네임 확인에 실패했습니다.");
      return;
    } finally {
      setIsCheckingNickname(false);
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
            <Text style={styles.inputLabel}>닉네임</Text>
            <TextInput
              style={styles.input}
              placeholder="닉네임 입력"
              placeholderTextColor={palette.textMuted}
              value={draft.nickname}
              onChangeText={(value) => updateDraft({ nickname: value })}
            />
            {nicknameError && <Text style={styles.errorText}>{nicknameError}</Text>}
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>이메일(아이디)</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={draft.email}
              onChangeText={(value) => updateDraft({ email: value })}
            />
            {emailError && <Text style={styles.errorText}>{emailError}</Text>}
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

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isCheckingEmail || isCheckingNickname) &&
                styles.primaryButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={isCheckingEmail || isCheckingNickname}
          >
            <Text
              style={[
                styles.primaryButtonText,
                (isCheckingEmail || isCheckingNickname) &&
                  styles.primaryButtonTextDisabled,
              ]}
            >
              {isCheckingEmail || isCheckingNickname ? "확인 중..." : "다음"}
            </Text>
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
  primaryButtonDisabled: {
    backgroundColor: "#E2E8F0",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: { color: palette.ink, fontWeight: "800", fontSize: 16 },
  primaryButtonTextDisabled: { color: "#94A3B8" },
  helperRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  helperText: { color: palette.textMuted, fontSize: 12, marginRight: 6 },
  helperTextAccent: { color: palette.accentDark, fontSize: 12, fontWeight: "700" },
  errorText: { color: "#DC2626", fontSize: 12, marginBottom: 8 },
});
