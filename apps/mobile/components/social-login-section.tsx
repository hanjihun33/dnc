import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { registerPushTokenWithServer } from "@/push";
import { setAuthSession } from "@/session";
import { SocialProvider, startSocialLogin } from "@/lib/social-login";

const palette = {
  border: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  googleBorder: "#E5E7EB",
  kakao: "#FEE500",
  naver: "#03C75A",
  error: "#DC2626",
};

const providerLabels: Record<SocialProvider, string> = {
  google: "Google로 로그인",
  kakao: "카카오로 로그인",
  naver: "네이버로 로그인",
};

export default function SocialLoginSection() {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (loadingProvider) {
      return;
    }
    setErrorMessage(null);
    setLoadingProvider(provider);
    try {
      const data = await startSocialLogin(provider);
      const tokenType = data.tokenType ?? "Bearer";
      await setAuthSession({
        accessToken: data.accessToken ?? null,
        tokenType,
        userId: data.userId ?? null,
      });
      await registerPushTokenWithServer();
      router.replace("/(tabs)");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "소셜 로그인에 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>소셜 로그인</Text>
      <View style={styles.buttonStack}>
        {(["kakao", "google", "naver"] as SocialProvider[]).map((provider) => (
          <TouchableOpacity
            key={provider}
            style={[
              styles.socialButton,
              provider === "kakao" && styles.kakaoButton,
              provider === "google" && styles.googleButton,
              provider === "naver" && styles.naverButton,
              loadingProvider && styles.disabledButton,
            ]}
            onPress={() => handleSocialLogin(provider)}
            disabled={Boolean(loadingProvider)}
          >
            <Text
              style={[
                styles.socialText,
                provider === "naver" ? styles.socialTextLight : styles.socialTextDark,
                loadingProvider === provider && styles.loadingText,
              ]}
            >
              {loadingProvider === provider
                ? "로그인 중..."
                : providerLabels[provider]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: "100%", marginTop: 24 },
  sectionTitle: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  buttonStack: { gap: 10 },
  socialButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  kakaoButton: {
    backgroundColor: palette.kakao,
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: palette.googleBorder,
  },
  naverButton: {
    backgroundColor: palette.naver,
  },
  socialText: { fontSize: 15, fontWeight: "700" },
  socialTextDark: { color: palette.text },
  socialTextLight: { color: "#FFFFFF" },
  loadingText: { opacity: 0.7 },
  disabledButton: { opacity: 0.7 },
  errorText: {
    marginTop: 10,
    color: palette.error,
    fontSize: 12,
  },
});
