import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { bumpProfileRevision } from "@/session";

const palette = {
  background: "#F8FAFC",
  text: "#0F172A",
  textMuted: "#64748B",
};

const getParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const safeDecode = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    const status = getParam(params.status);
    const error = safeDecode(getParam(params.error));

    if (!status) {
      return;
    }
    if (handledRef.current) return;
    handledRef.current = true;

    if (status === "success") {
      bumpProfileRevision();
      router.replace("/(tabs)");
      return;
    }

    const message =
      status === "cancel"
        ? "연동이 취소되었습니다."
        : error ?? "센서 연동에 실패했습니다.";
    Alert.alert("연동 실패", message, [
      {
        text: "확인",
        onPress: () => router.replace("/(settings)/sensor-connect"),
      },
    ]);
  }, [params, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={palette.textMuted} />
        <Text style={styles.message}>연동 처리 중입니다...</Text>
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
});
