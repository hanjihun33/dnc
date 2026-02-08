import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadAuthSession, subscribeAuthSession, getAuthSession } from '@/session';
import { registerPushTokenWithServer } from '@/push';
import { SplashScreen } from '@/components/splash-screen';
import {
  getSocialLoginPending,
  getSocialLoginProcessing,
  loadSocialLoginPending,
  subscribeSocialLoginPending,
  subscribeSocialLoginProcessing,
} from '@/lib/social-login';

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const [isBootstrapped, setIsBootstrapped] = React.useState(false);
  const [showSplash, setShowSplash] = React.useState(true);
  const [showAuthOverlay, setShowAuthOverlay] = React.useState(false);
  const [showProcessingOverlay, setShowProcessingOverlay] = React.useState(
    getSocialLoginProcessing()
  );
  const pendingRef = React.useRef(getSocialLoginPending());
  const backgroundRef = React.useRef(false);

  const router = useRouter();
  const segments = useSegments();

  React.useEffect(() => {
    let isMounted = true;
    const init = async () => {
      await loadAuthSession();
      const value = await loadSocialLoginPending();
      if (!isMounted) {
        return;
      }
      pendingRef.current = value;
      if (value) {
        setShowAuthOverlay(true);
      }
      setIsBootstrapped(true);
      void registerPushTokenWithServer();
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, []);

  // [Auth Guard] Auth Session Reactive Redirect
  React.useEffect(() => {
    if (!isBootstrapped) return;

    // Subscribe to auth state changes
    const unsubscribe = subscribeAuthSession((session) => {
      const inAuthGroup = segments[0] === '(auth)';
      const isSignedIn = !!session.accessToken;

      if (isSignedIn && inAuthGroup) {
        // Logged in, redirect to main tabs
        router.replace('/(tabs)');
      } else if (!isSignedIn && !inAuthGroup) {
        // Logged out, redirect to login
        router.replace('/(auth)/login');
      }
    });

    // Validating initial state as well
    const session = getAuthSession();
    const inAuthGroup = segments[0] === '(auth)';
    const isSignedIn = !!session.accessToken;

    // Only redirect if needed to avoid loops or unnecessary updates
    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!isSignedIn && !inAuthGroup) {
      // router.replace('/(auth)/login'); 
      // Note: We might want to allow some public screens, but typically
      // if not signed in, go to login. For now, let's keep it simple.
    }

    return () => {
      unsubscribe();
    };
  }, [isBootstrapped, segments]);

  React.useEffect(() => {
    return subscribeSocialLoginPending((value) => {
      pendingRef.current = value;
      setShowAuthOverlay(value);
    });
  }, []);

  React.useEffect(() => {
    return subscribeSocialLoginProcessing((value) => {
      setShowProcessingOverlay(value);
    });
  }, []);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        if (pendingRef.current) {
          backgroundRef.current = true;
        }
        return;
      }
      if (state === 'active') {
        if (backgroundRef.current && pendingRef.current) {
          setShowAuthOverlay(true);
        }
        backgroundRef.current = false;
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        {showSplash ? (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        ) : isBootstrapped ? (
          <>
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(settings)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
          </>
        ) : (
          <View style={styles.bootSplash} />
        )}
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  bootSplash: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  authOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  authOverlayText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
