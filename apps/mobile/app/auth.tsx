import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { registerPushTokenWithServer } from "@/push";
import { setAuthSession } from "@/session";

const palette = {
  background: "#F8FAFC",
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

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const completeLogin = async () => {
      const accessToken = getParam(params.accessToken);
      if (!accessToken) {
        setErrorMessage("로그인 정보를 받지 못했습니다.");
        return;
      }
      const tokenType = getParam(params.tokenType) ?? "Bearer";
      const refreshToken = getParam(params.refreshToken);
      const userIdRaw = getParam(params.userId);
      const userId = userIdRaw ? Number(userIdRaw) : null;

      await setAuthSession({
        accessToken,
        tokenType,
        userId: Number.isFinite(userId) ? userId : null,
      });
      await registerPushTokenWithServer();
      router.replace("/(tabs)");
    };

    void completeLogin();
  }, [params, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : (
          <>
            <ActivityIndicator size="large" color={palette.textMuted} />
            <Text style={styles.message}>로그인 처리 중입니다...</Text>
          </>
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
  message: {
    marginTop: 16,
    color: palette.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: palette.error,
    fontSize: 14,
    textAlign: "center",
  },
});
