import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";

import {
  SocialProvider,
  setSocialLoginPending,
  setSocialLoginProcessing,
  startSocialLogin,
} from "@/lib/social-login";

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

const iconBoxSize = 24;
const iconSizes: Record<SocialProvider, number> = {
  kakao: 20,
  google: 18,
  naver: 18,
};

const renderSocialIcon = (provider: SocialProvider, size: number) => {
  if (provider === "kakao") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 3C5.373 3 0 6.608 0 11.059C0 13.88 1.813 16.386 4.568 17.824C4.339 18.666 3.52 20.676 3.42 20.959C3.32 21.242 3.655 21.364 3.868 21.222C4.08 21.081 7.42 18.799 8.019 18.36C9.284 18.683 10.615 18.853 12 18.853C18.627 18.853 24 15.245 24 10.794C24 6.343 18.627 3 12 3Z"
          fill={palette.text}
        />
      </Svg>
    );
  }

  if (provider === "naver") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"
          fill="#FFFFFF"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
};

type SocialLoginSectionProps = {
  showTitle?: boolean;
  compact?: boolean;
};

export default function SocialLoginSection({
  showTitle = true,
  compact = false,
}: SocialLoginSectionProps) {
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
      setSocialLoginPending(true);
      const data = await startSocialLogin(provider);
      setSocialLoginProcessing(true);

      const params: Record<string, string> = {};
      if (data.accessToken) params.accessToken = data.accessToken;
      if (data.refreshToken) params.refreshToken = data.refreshToken;
      if (data.tokenType) params.tokenType = data.tokenType;
      if (typeof data.userId === "number") params.userId = String(data.userId);

      router.replace({
        pathname: "/auth",
        params,
      });
    } catch (error) {
      const message =
        "소셜 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";
      setErrorMessage(message);
      setSocialLoginPending(false);
      setSocialLoginProcessing(false);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      {showTitle && <Text style={styles.sectionTitle}>소셜 로그인</Text>}
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
            <View style={styles.socialIcon}>
              {renderSocialIcon(provider, iconSizes[provider])}
            </View>
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
  sectionCompact: { marginTop: 12 },
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
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  socialIcon: {
    width: iconBoxSize,
    height: iconBoxSize,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
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
