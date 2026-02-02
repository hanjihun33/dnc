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
import { loadAuthSession, setAuthSession } from "@/session";
import { registerPushTokenWithServer } from "@/push";

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

const parseErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    return data.message ?? data.error ?? null;
  } catch {
    return null;
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        throw new Error(message ?? "로그인에 실패했습니다.");
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>일반 로그인</Text>
          <View style={styles.backSpacer} />
        </View>
        <Text style={styles.subtitle}>
          등록한 이메일(아이디)과 비밀번호로 로그인하세요.
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
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 입력하세요"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

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

        <SocialLoginSection />
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
    justifyContent: "space-between",
    marginTop: 14,
  },
  helperText: { color: palette.textMuted, fontSize: 12, fontWeight: "600" },
  helperTextAccent: { color: palette.accentDark, fontSize: 12, fontWeight: "700" },
  errorText: { color: "#DC2626", fontSize: 12, marginBottom: 8 },
});
