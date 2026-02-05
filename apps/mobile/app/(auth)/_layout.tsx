import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

import { SignupDraftProvider } from "@/components/signup-context";

export default function AuthLayout() {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem("onboarding_completed");
      const storedVersion = await AsyncStorage.getItem("onboarding_version");
      const currentVersion = Constants.expoConfig?.version ?? "1.0.0";
      const isUpToDate =
        completed === "true" && storedVersion === currentVersion;

      if (isUpToDate && segments[1] === "onboarding") {
        router.replace("/(auth)");
      } else if (!isUpToDate && segments[1] !== "onboarding") {
        router.replace("/onboarding");
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return null; // 또는 로딩 스피너
  }

  return (
    <SignupDraftProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="index" />
      </Stack>
    </SignupDraftProvider>
  );
}
