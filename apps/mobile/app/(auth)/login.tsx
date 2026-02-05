import React, { useEffect, useState } from "react";
import {
  BackHandler,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { loadAuthSession, setAuthSession } from "@/session";
import { registerPushTokenWithServer } from "@/push";

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

const parseErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    return data.message ?? data.error ?? null;
  } catch {
    return null;
  }
};

const mapLoginError = (message: string | null, status?: number) => {
  if (status === 401 || status === 403) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (!message) {
    return null;
  }
  const lower = message.toLowerCase();
  if (lower.includes("invalid credentials") || lower.includes("bad credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  return message;
};

export default function LoginScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isLogoutFlow = from === "logout";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLogoutFlow) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true
    );
    return () => subscription.remove();
  }, [isLogoutFlow]);

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response);
        const mapped = mapLoginError(message, response.status);
        throw new Error(mapped ?? "로그인에 실패했습니다.");
      }

      const loginData = (await response.json()) as {
        accessToken?: string;
        tokenType?: string;
      };
      const accessToken = loginData.accessToken;
      if (!accessToken) {
        throw new Error("로그인 토큰을 받지 못했습니다.");
      }
      const tokenType = loginData.tokenType ?? "Bearer";
      await setAuthSession({ accessToken, tokenType });
      await registerPushTokenWithServer();

      try {
        await loadAuthSession();
        const profileResponse = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          headers: { Authorization: `${tokenType} ${accessToken}` },
        });
        if (profileResponse.ok) {
          const profile = (await profileResponse.json()) as { userId?: number };
          if (profile.userId) {
            await setAuthSession({ userId: profile.userId });
          }
        }
      } catch {
        // Ignore profile fetch errors for now.
      }

      router.replace("/(tabs)");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "로그인에 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = !email.trim() || !password || isSubmitting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          {isLogoutFlow ? (
            <View style={styles.backSpacer} />
          ) : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={18} color={palette.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.pageTitle}>일반 로그인</Text>
          <View style={styles.backSpacer} />
        </View>
        <Text style={styles.subtitle}>
          등록한 이메일(아이디)과 비밀번호로 로그인하세요.
        </Text>

        <View style={styles.formArea}>
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
              value={email}
              onChangeText={setEmail}
            />
          </View>
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
              placeholder="비밀번호"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              isSubmitDisabled && styles.primaryButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isSubmitDisabled}
          >
            <Text
              style={[
                styles.primaryButtonText,
                isSubmitDisabled && styles.primaryButtonTextDisabled,
              ]}
            >
              로그인
            </Text>
          </TouchableOpacity>

          <View style={styles.helperRow}>
            <TouchableOpacity onPress={() => router.push("/forgot-password")}>
              <Text style={styles.helperText}>비밀번호 찾기</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/signup")}>
              <Text style={styles.helperTextAccent}>회원가입</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 14,
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
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
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
    justifyContent: "space-between",
    marginTop: 14,
  },
  helperText: { color: palette.textMuted, fontSize: 12, fontWeight: "600" },
  helperTextAccent: {
    color: palette.accentDark,
    fontSize: 12,
    fontWeight: "700",
  },
  errorText: { color: "#C24A4A", fontSize: 12, marginBottom: 8 },
});
