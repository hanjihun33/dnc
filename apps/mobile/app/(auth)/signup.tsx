import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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

import { useSignupDraft } from "@/components/signup-context";

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

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function SignupScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useSignupDraft();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmMatch, setConfirmMatch] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);

  const checkEmailAvailability = async (email: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/check-email?email=${encodeURIComponent(
          email
        )}`
      );
      if (response.status === 409) {
        setEmailError("이미 사용 중인 이메일입니다.");
        setEmailAvailable(false);
        return false;
      }
      if (!response.ok) {
        setErrorMessage("이메일 확인에 실패했습니다.");
        setEmailAvailable(null);
        return false;
      }
      return true;
    } catch {
      setErrorMessage("이메일 확인에 실패했습니다.");
      setEmailAvailable(null);
      return false;
    }
  };

  const checkNicknameAvailability = async (nickname: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/check-nickname?nickname=${encodeURIComponent(
          nickname
        )}`
      );
      if (response.status === 409) {
        setNicknameError("이미 사용 중인 닉네임입니다.");
        setNicknameAvailable(false);
        return false;
      }
      if (!response.ok) {
        setErrorMessage("닉네임 확인에 실패했습니다.");
        setNicknameAvailable(null);
        return false;
      }
      return true;
    } catch {
      setErrorMessage("닉네임 확인에 실패했습니다.");
      setNicknameAvailable(null);
      return false;
    }
  };

  const handleCheckEmail = async () => {
    const trimmedEmail = draft.email.trim();
    setErrorMessage(null);
    setEmailError(null);
    setEmailAvailable(null);
    if (!trimmedEmail) {
      setEmailError("이메일(아이디)를 입력해 주세요.");
      return;
    }
    setIsCheckingEmail(true);
    const ok = await checkEmailAvailability(trimmedEmail);
    setIsCheckingEmail(false);
    if (ok) {
      setEmailError(null);
      setEmailAvailable(true);
    }
  };

  const handleCheckNickname = async () => {
    const trimmedNickname = draft.nickname.trim();
    setErrorMessage(null);
    setNicknameError(null);
    setNicknameAvailable(null);
    if (!trimmedNickname) {
      setNicknameError("닉네임을 입력해 주세요.");
      return;
    }
    setIsCheckingNickname(true);
    const ok = await checkNicknameAvailability(trimmedNickname);
    setIsCheckingNickname(false);
    if (ok) {
      setNicknameError(null);
      setNicknameAvailable(true);
    }
  };

  const ensurePasswordLength = () => {
    if (draft.password.length < 8) {
      setErrorMessage("비밀번호는 8자 이상이어야 합니다.");
      return false;
    }
    return true;
  };

  React.useEffect(() => {
    if (!draft.password || !confirmPassword) {
      setConfirmMatch(null);
      return;
    }
    if (confirmPassword.length < draft.password.length) {
      setConfirmMatch(null);
      return;
    }
    setConfirmMatch(confirmPassword === draft.password);
  }, [confirmPassword, draft.password]);

  const handleNext = async () => {
    const trimmedEmail = draft.email.trim();
    const trimmedNickname = draft.nickname.trim();
    setErrorMessage(null);
    setEmailError(null);
    setNicknameError(null);
    setEmailAvailable(null);
    setNicknameAvailable(null);

    if (!trimmedEmail) {
      setEmailError("이메일(아이디)를 입력해 주세요.");
      return;
    }
    if (!trimmedNickname) {
      setNicknameError("닉네임을 입력해 주세요.");
      return;
    }
    if (!ensurePasswordLength()) {
      return;
    }
    if (draft.password !== confirmPassword) {
      setErrorMessage(null);
      setConfirmMatch(false);
      return;
    }

    setIsCheckingEmail(true);
    const emailOk = await checkEmailAvailability(trimmedEmail);
    setIsCheckingEmail(false);
    if (!emailOk) {
      return;
    }

    setIsCheckingNickname(true);
    const nicknameOk = await checkNicknameAvailability(trimmedNickname);
    setIsCheckingNickname(false);
    if (!nicknameOk) {
      return;
    }

    router.push("/signup-diabetes");
  };

  const isChecking = isCheckingEmail || isCheckingNickname;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
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
            <Text style={styles.pageTitle}>회원가입</Text>
            <View style={styles.backSpacer} />
          </View>
          <Text style={styles.subtitle}>기본 정보를 입력해주세요.</Text>

        <View style={styles.formArea}>
          <View style={styles.inputPill}>
            <View style={styles.inputIcon}>
              <Ionicons name="person-outline" size={18} color={palette.textMuted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="이름"
              placeholderTextColor={palette.textMuted}
              value={draft.name}
              onChangeText={(value) => updateDraft({ name: value })}
            />
          </View>

          <View style={styles.inputPill}>
            <View style={styles.inputIcon}>
              <Ionicons name="happy-outline" size={18} color={palette.textMuted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="닉네임"
              placeholderTextColor={palette.textMuted}
              value={draft.nickname}
              onChangeText={(value) => {
                updateDraft({ nickname: value });
                setNicknameAvailable(null);
                setNicknameError(null);
              }}
            />
            <TouchableOpacity
              style={[
                styles.checkButton,
                isCheckingNickname && styles.checkButtonDisabled,
              ]}
              onPress={handleCheckNickname}
              disabled={isCheckingNickname}
            >
              <Text
                style={[
                  styles.checkButtonText,
                  isCheckingNickname && styles.checkButtonTextDisabled,
                ]}
              >
                {isCheckingNickname ? "확인 중..." : "중복확인"}
              </Text>
            </TouchableOpacity>
          </View>
          {nicknameError && <Text style={styles.errorText}>{nicknameError}</Text>}
          {nicknameAvailable && !nicknameError && (
            <Text style={styles.successText}>사용 가능한 닉네임입니다.</Text>
          )}

          <View style={styles.inputPill}>
            <View style={styles.inputIcon}>
              <Ionicons name="mail-outline" size={18} color={palette.textMuted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="이메일(아이디)"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={draft.email}
              onChangeText={(value) => {
                updateDraft({ email: value });
                setEmailAvailable(null);
                setEmailError(null);
              }}
            />
            <TouchableOpacity
              style={[
                styles.checkButton,
                isCheckingEmail && styles.checkButtonDisabled,
              ]}
              onPress={handleCheckEmail}
              disabled={isCheckingEmail}
            >
              <Text
                style={[
                  styles.checkButtonText,
                  isCheckingEmail && styles.checkButtonTextDisabled,
                ]}
              >
                {isCheckingEmail ? "확인 중..." : "중복확인"}
              </Text>
            </TouchableOpacity>
          </View>
          {emailError && <Text style={styles.errorText}>{emailError}</Text>}
          {emailAvailable && !emailError && (
            <Text style={styles.successText}>사용 가능한 이메일입니다.</Text>
          )}

          <View style={styles.inputPill}>
            <View style={styles.inputIcon}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={palette.textMuted}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="비밀번호 (8자 이상)"
              placeholderTextColor={palette.textMuted}
              secureTextEntry={!showPassword}
              value={draft.password}
              onChangeText={(value) => {
                updateDraft({ password: value });
                setErrorMessage(null);
                setConfirmMatch(null);
              }}
              onSubmitEditing={ensurePasswordLength}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityLabel={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={palette.textMuted}
              />
            </TouchableOpacity>
          </View>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <View style={styles.inputPill}>
            <View style={styles.inputIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={palette.textMuted}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="비밀번호 확인"
              placeholderTextColor={palette.textMuted}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
              }}
              onFocus={ensurePasswordLength}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              accessibilityLabel={
                showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 보기"
              }
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={palette.textMuted}
              />
            </TouchableOpacity>
          </View>

          {confirmMatch === false && (
            <Text style={styles.errorText}>비밀번호가 일치하지 않습니다.</Text>
          )}
          {confirmMatch === true && (
            <Text style={styles.successText}>비밀번호가 일치합니다.</Text>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              isChecking && styles.primaryButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={isChecking}
          >
            <Text
              style={[
                styles.primaryButtonText,
                isChecking && styles.primaryButtonTextDisabled,
              ]}
            >
              {isChecking ? "확인 중..." : "다음"}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  container: { flex: 1 },
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
  subtitle: { color: palette.textMuted, marginBottom: 18 },
  formArea: {
    marginTop: 4,
  },
  inputPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1E7D6",
    borderRadius: 26,
    padding: 6,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 12,
  },
  inputIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E6DCC6",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: palette.text,
    fontSize: 15,
  },
  eyeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  checkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#E6DCC6",
    borderWidth: 1,
    borderColor: palette.border,
    marginLeft: 8,
  },
  checkButtonDisabled: {
    backgroundColor: "#EFE9D9",
  },
  checkButtonText: {
    color: palette.accentDark,
    fontSize: 12,
    fontWeight: "700",
  },
  checkButtonTextDisabled: {
    color: "#A5AE9C",
  },
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: "#EFE9D9",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: { color: palette.ink, fontWeight: "800", fontSize: 16 },
  primaryButtonTextDisabled: { color: "#A5AE9C" },
  helperRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  helperText: { color: palette.textMuted, fontSize: 12, marginRight: 6 },
  helperTextAccent: { color: palette.accentDark, fontSize: 12, fontWeight: "700" },
  errorText: { color: "#C24A4A", fontSize: 12, marginTop: -4, marginBottom: 10 },
  successText: {
    color: palette.accentDark,
    fontSize: 12,
    marginTop: -4,
    marginBottom: 10,
  },
});
