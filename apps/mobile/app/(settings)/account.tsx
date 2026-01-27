import React from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  accentDark: "#F59E0B",
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function AccountScreen() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, { method: "POST" });
    } catch {
      // Ignore logout errors and proceed with local sign-out.
    } finally {
      setIsLoggingOut(false);
      router.replace("/login");
    }
  };

  const confirmLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: handleLogout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>계정 정보</Text>

        <Pressable
          style={styles.profileRow}
          onPress={() => router.push("/(settings)/profile-edit")}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>CJ</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>차지훈</Text>
            <Text style={styles.profileEmail}>konichan7@kakao.com</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.section}>
          <Pressable
            style={styles.listItem}
            onPress={() => router.push("/(settings)/diagnosis")}
          >
            <Text style={styles.itemTitle}>진단 유형 설정</Text>
            <Text style={styles.itemMeta}>해당 없음</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.listItem}
            onPress={() => router.push("/(settings)/body-info")}
          >
            <Text style={styles.itemTitle}>신체 정보 설정</Text>
            <Text style={styles.itemMeta}>등록됨</Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.textButton} onPress={confirmLogout}>
            <Text style={styles.textButtonLabel}>
              {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
            </Text>
          </Pressable>
          <Pressable style={styles.textButton}>
            <Text style={[styles.textButtonLabel, styles.textButtonDanger]}>
              탈퇴하기
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  container: { padding: 20, paddingBottom: 40 },

  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  backIcon: { fontSize: 20, color: palette.text },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
    marginBottom: 20,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#475569",
    fontSize: 20,
    fontWeight: "700",
  },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { color: palette.text, fontSize: 18, fontWeight: "700" },
  profileEmail: { color: palette.textMuted, marginTop: 4 },
  chevron: { color: palette.textMuted, fontSize: 22 },

  section: {
    backgroundColor: palette.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: { color: palette.text, fontSize: 16, fontWeight: "600" },
  itemMeta: { color: palette.textMuted, fontSize: 13 },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 14,
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    marginTop: 26,
  },
  textButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textButtonLabel: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  textButtonDanger: {
    color: palette.accentDark,
  },
});
