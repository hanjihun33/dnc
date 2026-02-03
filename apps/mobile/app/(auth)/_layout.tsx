import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const completed = await AsyncStorage.getItem('onboarding_completed');
      
      // 온보딩 완료했고, 현재 onboarding 페이지면 로그인으로 이동
      if (completed === 'true' && segments[1] === 'onboarding') {
        router.replace('/login');
      }
      // 온보딩 안했고, onboarding 페이지 아니면 온보딩으로 이동
      else if (completed !== 'true' && segments[1] !== 'onboarding') {
        router.replace('/onboarding');
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
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
