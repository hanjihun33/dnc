import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadAuthSession } from '@/session';
import { registerPushTokenWithServer } from '@/push';
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
  const [showAuthOverlay, setShowAuthOverlay] = React.useState(false);
  const [showProcessingOverlay, setShowProcessingOverlay] = React.useState(
    getSocialLoginProcessing()
  );
  const pendingRef = React.useRef(getSocialLoginPending());
  const backgroundRef = React.useRef(false);

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

  React.useEffect(() => {
    return subscribeSocialLoginPending((value) => {
      pendingRef.current = value;
      if (!value) {
        setShowAuthOverlay(false);
      }
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
        {isBootstrapped ? (
          <>
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(settings)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>

            {/* {(showAuthOverlay || showProcessingOverlay) && (
              <View style={styles.authOverlay} pointerEvents="auto">
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={styles.authOverlayText}>로그인 처리 중입니다</Text>
              </View>
            )} */}
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
