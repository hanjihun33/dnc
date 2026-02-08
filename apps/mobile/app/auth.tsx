import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { registerPushTokenWithServer } from "@/push";
import { setAuthSession } from "@/session";
import {
  getSocialLoginPending,
  setSocialLoginPending,
  setSocialLoginProcessing,
  SocialProvider,
} from "@/lib/social-login";

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  error: "#DC2626",
};

const getParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    const clearSocialState = () => {
      setSocialLoginPending(false);
      setSocialLoginProcessing(false);
    };
    const navigateAndClear = (target: Parameters<typeof router.replace>[0]) => {
      router.replace(target);
      setTimeout(() => {
        clearSocialState();
      }, 0);
    };

    const accessToken = getParam(params.accessToken);
    const code = getParam(params.code);

    if (!accessToken && !code) {
      if (getSocialLoginPending()) {
        return;
      }
      handledRef.current = true;
      setErrorMessage("로그인 정보를 받지 못했습니다.");
      clearSocialState();
      return;
    }

    setSocialLoginPending(true);
    setSocialLoginProcessing(true);

    const resolveProvider = (value: string | string[] | undefined) => {
      const provider = getParam(value);
      if (provider === "google" || provider === "kakao" || provider === "naver") {
        return provider as SocialProvider;
      }
      return null;
    };

    const fetchProfile = async (tokenType: string, accessTokenValue: string) => {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: { Authorization: `${tokenType} ${accessTokenValue}` },
      });
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as {
        diabetesType?: string | null;
        diagnosisYear?: number | null;
        diagnosisMonth?: number | null;
        birthDate?: string | null;
        gender?: string | null;
        heightCm?: number | null;
        weightKg?: number | null;
      };
    };

    const resolveOnboardingTarget = (
      profile: Awaited<ReturnType<typeof fetchProfile>>
    ) => {
      if (!profile) return null;
      const diabetesType = profile.diabetesType ?? null;
      const needsDiagnosisPeriod =
        diabetesType === "TYPE1" || diabetesType === "TYPE2";
      const hasDiagnosisPeriod =
        profile.diagnosisYear != null && profile.diagnosisMonth != null;
      const diabetesMissing =
        diabetesType == null || (needsDiagnosisPeriod && !hasDiagnosisPeriod);

      const bodyMissing =
        !profile.birthDate ||
        !profile.gender ||
        profile.heightCm == null ||
        profile.weightKg == null;

      if (diabetesMissing) return "diagnosis";
      if (bodyMissing) return "body-info";
      return null;
    };

    const finalizeLogin = async (payload: {
      accessToken?: string | null;
      tokenType?: string | null;
      refreshToken?: string | null;
      userId?: number | null;
    }) => {
      const accessTokenValue = payload.accessToken;
      if (!accessTokenValue) {
        setErrorMessage("로그인 정보를 받지 못했습니다.");
        clearSocialState();
        return;
      }
      const tokenType = payload.tokenType ?? "Bearer";
      const userId = payload.userId ?? null;

      // 1. 프로필 정보 먼저 확인 (온보딩 필요 여부 결정)
      const profile = await fetchProfile(tokenType, accessTokenValue);
      const target = resolveOnboardingTarget(profile);

      // 2. 세션 업데이트 (이 순간 _layout.tsx가 감지하고 리다이렉트 시도)
      // * 온보딩이 필요한 경우 아직 메인으로 가면 안 되므로, 예외 처리 필요할 수 있음
      // * 하지만 현재 구조상 Tabs로 먼저 가고 그 안에서 온보딩을 띄우거나,
      // * _layout.tsx의 리다이렉트 조건을 정교하게 다듬어야 함.
      // * 일단 "로그인 성공 = Tabs"가 기본 원칙.

      // 만약 온보딩이 필요하다면 세션을 저장하기 전에 온보딩 페이지로 보내야 할까?
      // 아니면 세션은 저장하되, _layout.tsx가 온보딩 여부도 체크해야 할까?
      // -> 가장 깔끔한 건 "로그인됨" 상태지만 "온보딩 미완료" 상태를 구별하는 것.

      // 여기서는 일단 세션 저장을 수행합니다. _layout.tsx가 (tabs)로 보낼 것입니다.
      // 온보딩이 필요한 경우, (tabs) 내부 혹은 _layout.tsx에서 추가적인 가드가 필요할 수 있습니다.
      // (사용자 요청은 "로그인 성공 시 메인으로 가는 것"에 집중되어 있으므로 일단 진행)

      await setAuthSession({
        accessToken: accessTokenValue,
        tokenType,
        userId: Number.isFinite(userId) ? userId : null,
      });

      void registerPushTokenWithServer();

      // Note: _layout.tsx will handle the redirect to /(tabs)
      // If we need to go to onboarding, we might need a separate "onboarding_required" state
      // or check profile in _layout.tsx.
      // For now, assuming standard login flow.

      clearSocialState();
    };

    const completeLogin = async () => {
      const tokenType = getParam(params.tokenType);
      const refreshToken = getParam(params.refreshToken);
      const userIdRaw = getParam(params.userId);
      const userId = userIdRaw ? Number(userIdRaw) : null;

      if (accessToken) {
        handledRef.current = true;
        await finalizeLogin({
          accessToken,
          tokenType,
          refreshToken,
          userId: Number.isFinite(userId) ? userId : null,
        });
        return;
      }

      if (code) {
        handledRef.current = true;
        const provider = resolveProvider(params.provider);
        if (!provider) {
          setErrorMessage("로그인 정보를 받지 못했습니다.");
          clearSocialState();
          return;
        }
        const callbackUrl = `${API_BASE_URL}/api/v1/login/${provider}/callback`;
        const callback = new URL(callbackUrl);
        callback.searchParams.set("code", code);
        if (params.state) {
          callback.searchParams.set("state", String(params.state));
        }
        callback.searchParams.set("format", "json");
        const response = await fetch(callback.toString(), {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          setErrorMessage("소셜 로그인에 실패했습니다.");
          clearSocialState();
          return;
        }
        const data = (await response.json()) as {
          accessToken?: string;
          refreshToken?: string;
          tokenType?: string;
          userId?: number;
        };
        await finalizeLogin({
          accessToken: data.accessToken ?? null,
          refreshToken: data.refreshToken ?? null,
          tokenType: data.tokenType ?? null,
          userId: data.userId ?? null,
        });
        return;
      }

      handledRef.current = true;
      setErrorMessage("로그인 정보를 받지 못했습니다.");
      clearSocialState();
    };

    void completeLogin();
  }, [params, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {errorMessage && (
          <View style={styles.card}>
            <Text style={styles.errorText}>{errorMessage}</Text>

            {/* [DEBUG] 디버깅용 정보 표시 */}
            <View style={{ marginBottom: 16, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8, width: '100%' }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>[DEBUG INFO]</Text>
              <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>
                API_URL: {API_BASE_URL}
              </Text>
              <Text style={{ fontSize: 10, fontFamily: 'monospace', marginTop: 4 }}>
                PARAMS: {JSON.stringify(params, null, 2)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.backButtonText}>로그인 화면으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: palette.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 26,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  errorText: {
    color: palette.error,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 14,
  },
  backButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  backButtonText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "600",
  },
});
