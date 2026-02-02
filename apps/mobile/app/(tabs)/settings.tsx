import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import {
  getAuthHeaders,
  loadAuthSession,
  subscribeProfileRevision,
} from "@/session";

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  accent: "#FACC15",
  accentInk: "#111827",
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function SettingsScreen() {
  const router = useRouter();
  const [profileName, setProfileName] = React.useState("차지훈");
  const [profileEmail, setProfileEmail] = React.useState("konichan7@kakao.com");
  const [profileImageUrl, setProfileImageUrl] = React.useState<string | null>(
    null
  );

  const initials =
    profileName.trim().length > 0 ? profileName.trim()[0] : "U";

  const loadProfile = React.useCallback(async () => {
    try {
      await loadAuthSession();
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: getAuthHeaders(),
      });
      console.log("GET /api/v1/users/me status:", response.status);
      if (!response.ok) {
        try {
          const errorText = await response.text();
          console.log("GET /api/v1/users/me error:", errorText);
        } catch {
          console.log("GET /api/v1/users/me error: <no body>");
        }
        return;
      }
      const profile = (await response.json()) as {
        nickname?: string;
        name?: string;
        email?: string;
        profileImageUrl?: string | null;
      };
      const nextName = profile.nickname || profile.name || profile.email || "";
      setProfileName(nextName);
      setProfileEmail(profile.email ?? "");
      setProfileImageUrl(profile.profileImageUrl ?? null);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>더보기</Text>

        <View style={styles.card}>
          <Pressable
            style={styles.profileRow}
            onPress={() => router.push("/(settings)/account")}
          >
            <View style={styles.avatar}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profileName}</Text>
              <Text style={styles.profileEmail}>{profileEmail}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>연동</Text>
          <Pressable
            style={styles.listItem}
            onPress={() => router.push("/(settings)/sensor-connect")}
          >
            <View>
              <Text style={styles.itemTitle}>센서 연결 정보</Text>
              <Text style={styles.itemDesc}>현재 연결된 센서 없음</Text>
            </View>
            <View style={styles.actionPill}>
              <Text style={styles.actionPillText}>연결하기</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          <Pressable
            style={styles.listItem}
            onPress={() => router.push("/(settings)/alert-settings")}
          >
            <View>
              <Text style={styles.itemTitle}>알림 설정</Text>
              <Text style={styles.itemDesc}>혈당 기준과 주기 관리</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  container: { padding: 20, paddingBottom: 40 },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
    marginBottom: 18,
  },

  card: {
    backgroundColor: palette.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: "#475569",
    fontSize: 20,
    fontWeight: "700",
  },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { color: palette.text, fontSize: 18, fontWeight: "700" },
  profileEmail: { color: palette.textMuted, marginTop: 4 },
  chevron: { color: palette.textMuted, fontSize: 22, marginLeft: 8 },

  section: {
    backgroundColor: palette.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: { color: palette.text, fontSize: 16, fontWeight: "600" },
  itemDesc: { color: palette.textMuted, marginTop: 4, fontSize: 12 },
  actionPill: {
    backgroundColor: palette.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actionPillText: {
    color: palette.accentInk,
    fontWeight: "700",
    fontSize: 12,
  },
});
