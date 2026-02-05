import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import {
  bumpProfileRevision,
  getAuthSession,
  getAuthHeaders,
  loadAuthSession,
  subscribeProfileRevision,
} from "@/session";

const palette = {
  background: "#F4E8D6",
  card: "#F8F0E1",
  border: "#E6DCC6",
  text: "#2F3B30",
  textMuted: "#6F7A6A",
  accent: "#2F6B4F",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
  overlayBackdrop: "rgba(31, 36, 31, 0.25)",
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function SensorConnectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [sensorConnected, setSensorConnected] = React.useState(false);
  const isOverlayVisible = isDisconnecting;
  const headerPaddingTop = Math.max(12, insets.top + 8);
  const overlayTitle = "연동 해제 중";

  const loadProfile = React.useCallback(async () => {
    try {
      await loadAuthSession();
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        return;
      }
      const profile = (await response.json()) as {
        sensorConnected?: boolean | null;
      };
      setSensorConnected(Boolean(profile.sensorConnected));
    } catch {
      // Ignore profile load errors.
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  React.useEffect(() => {
    const unsubscribe = subscribeProfileRevision(() => {
      void loadProfile();
    });
    return unsubscribe;
  }, [loadProfile]);

  const handleDexcomConnect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      await loadAuthSession();
      const session = getAuthSession();
      if (!session.accessToken) {
        Alert.alert("로그인 필요", "로그인 후 다시 시도해주세요.");
        return;
      }
      router.push({ pathname: "/oauth", params: { pending: "1", provider: "dexcom" } });
      const response = await fetch(
        `${API_BASE_URL}/api/v1/oauth/dexcom/authorize-url`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) {
        let detail = "";
        try {
          detail = await response.text();
        } catch {
          detail = "";
        }
        const suffix = detail ? ` (${response.status})` : ` (${response.status})`;
        throw new Error(`Dexcom 연동 URL을 가져오지 못했습니다.${suffix}`);
      }
      const payload = (await response.json()) as { authorizeUrl?: string };
      if (!payload.authorizeUrl) {
        throw new Error("Dexcom 연동 URL이 비어있습니다.");
      }
      await WebBrowser.openBrowserAsync(payload.authorizeUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Dexcom 연동에 실패했습니다.";
      console.warn("Dexcom connect failed:", error);
      Alert.alert("연동 실패", message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDexcomDisconnect = async () => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    try {
      await loadAuthSession();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/oauth/dexcom/disconnect`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error("Dexcom 연동 해제에 실패했습니다.");
      }
      setSensorConnected(false);
      bumpProfileRevision();
    } catch {
      Alert.alert("연동 해제 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const confirmDisconnect = () => {
    Alert.alert(
      "Dexcom 연동 해제",
      "Dexcom 연동을 해제할까요?",
      [
        { text: "취소", style: "cancel" },
        { text: "연동 해제", style: "destructive", onPress: handleDexcomDisconnect },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          <Pressable style={styles.headerSide} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={palette.text} />
          </Pressable>
          <Text style={styles.headerTitle}>센서 연결 정보</Text>
          <View style={styles.headerSide} />
        </View>
        <Text style={styles.subtitle}>
          센서는 실시간으로 혈당을 모니터링하는{"\n"}
          연속혈당측정기(CGM)를 의미합니다.
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.sensorCard, isConnecting && styles.sensorCardDisabled]}
          onPress={handleDexcomConnect}
          disabled={isConnecting}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.deviceShell}>
            <View style={styles.deviceTop} />
            <View style={styles.deviceBody}>
              <View style={styles.deviceButton} />
            </View>
            <View style={styles.deviceBase} />
          </View>
          <Text style={styles.sensorName}>Dexcom G7</Text>
          {isConnecting ? (
            <Text style={styles.sensorHint}>연동 중..</Text>
          ) : sensorConnected ? (
            <View style={styles.sensorHintRow}>
              <Text style={styles.sensorHint}>연동됨</Text>
              <Pressable
                style={[
                  styles.disconnectInlineButton,
                  isDisconnecting && styles.disconnectInlineButtonDisabled,
                ]}
                onPress={confirmDisconnect}
                disabled={isDisconnecting}
              >
                <Text style={styles.disconnectInlineText}>
                  {isDisconnecting ? "해제 중.." : "연동 해제"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.sensorHint}>연동하기</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <Modal
        transparent
        animationType="fade"
        visible={isOverlayVisible}
        onRequestClose={() => {}}
        presentationStyle="overFullScreen"
        statusBarTranslucent
      >
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={palette.textMuted} />
            <Text style={styles.overlayTitle}>{overlayTitle}</Text>
            <Text style={styles.overlayText}>잠시만 기다려 주세요.</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  container: { paddingHorizontal: 16, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerSide: {
    minWidth: 72,
    minHeight: 40,
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: palette.text },
  subtitle: {
    color: palette.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },

  sensorCard: {
    width: 220,
    borderRadius: 24,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: "#2F3B30",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  sensorCardDisabled: {
    opacity: 0.7,
  },
  deviceShell: {
    alignSelf: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  deviceTop: {
    width: 70,
    height: 52,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#E6DCC6",
  },
  deviceBody: {
    width: 86,
    height: 76,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
  },
  deviceButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#CBD5E1",
  },
  deviceBase: {
    width: 90,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E6DCC6",
    marginTop: -6,
  },
  sensorName: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sensorHint: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  sensorHintRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  disconnectInlineButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.danger,
    backgroundColor: palette.dangerSoft,
  },
  disconnectInlineButtonDisabled: {
    opacity: 0.6,
  },
  disconnectInlineText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: palette.overlayBackdrop,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  overlayCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 280,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: "#2F3B30",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  overlayTitle: {
    marginTop: 14,
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  overlayText: {
    marginTop: 6,
    color: palette.textMuted,
    fontSize: 13,
  },
});
