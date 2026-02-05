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
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  clearAuthSession,
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
  accentDark: "#24573F",
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [profileName, setProfileName] = React.useState("");
  const [profileEmail, setProfileEmail] = React.useState("");
  const [profileImageUrl, setProfileImageUrl] = React.useState<string | null>(
    null
  );
  const [isProfileLoading, setIsProfileLoading] = React.useState(true);
  const [diabetesType, setDiabetesType] = React.useState<string | null>(null);
  const [diagnosisYear, setDiagnosisYear] = React.useState<number | null>(null);
  const [diagnosisMonth, setDiagnosisMonth] = React.useState<number | null>(null);

  const initials =
    profileName.trim().length > 0 ? profileName.trim()[0] : "U";
  const headerPaddingTop = Math.max(12, insets.top + 8);

  const loadProfile = React.useCallback(async () => {
    setIsProfileLoading(true);
    setProfileName("");
    setProfileEmail("");
    setProfileImageUrl(null);
    setDiabetesType(null);
    setDiagnosisYear(null);
    setDiagnosisMonth(null);
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
        diabetesType?: string | null;
        diagnosisYear?: number | null;
        diagnosisMonth?: number | null;
      };
      const nextName = profile.nickname || profile.name || profile.email || "";
      setProfileName(nextName);
      setProfileEmail(profile.email ?? "");
      setProfileImageUrl(profile.profileImageUrl ?? null);
      setDiabetesType(profile.diabetesType ?? null);
      setDiagnosisYear(profile.diagnosisYear ?? null);
      setDiagnosisMonth(profile.diagnosisMonth ?? null);
    } catch {
      // Ignore profile load errors.
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  const diagnosisLabel = React.useMemo(() => {
    if (!diabetesType) {
      return "해당 없음";
    }
    if (diabetesType === "TYPE1") {
      return "1형 당뇨";
    }
    if (diabetesType === "TYPE2") {
      return "2형 당뇨";
    }
    if (diabetesType === "PREDIABETES") {
      return "당뇨 전단계";
    }
    if (diabetesType === "OTHER") {
      return "해당 없음";
    }
    if (diagnosisYear && diagnosisMonth) {
      return `${diagnosisYear}년 ${diagnosisMonth}월`;
    }
    return "해당 없음";
  }, [diabetesType, diagnosisMonth, diagnosisYear]);

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

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    try {
      await loadAuthSession();
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch {
      // Ignore logout errors and proceed with local sign-out.
    } finally {
      setIsLoggingOut(false);
      await clearAuthSession();
      router.replace("/(auth)");
    }
  };

  const confirmLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: handleLogout },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      await loadAuthSession();
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("탈퇴에 실패했습니다. 다시 시도해주세요.");
      }
    } catch {
      Alert.alert("탈퇴 실패", "인증 정보가 없어 탈퇴할 수 없습니다.");
      return;
    } finally {
      setIsDeleting(false);
    }
    await clearAuthSession();
    router.replace("/(auth)");
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "회원 탈퇴",
      "탈퇴하면 계정 정보가 삭제되고 복구할 수 없습니다. 진행할까요?",
      [
        { text: "취소", style: "cancel" },
        { text: "탈퇴하기", style: "destructive", onPress: handleDeleteAccount },
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
          <Text style={styles.headerTitle}>계정 정보</Text>
          <View style={styles.headerSide} />
        </View>

        <Pressable
          style={styles.profileRow}
          onPress={() => router.push("/(settings)/profile-edit")}
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
            <Text style={styles.profileName}>
              {isProfileLoading
                ? "계정 정보 불러오는 중"
                : profileName || "사용자"}
            </Text>
            <Text style={styles.profileEmail}>
              {isProfileLoading ? "" : profileEmail}
            </Text>
          </View>
          <Ionicons name="chevron-forward" style={styles.chevron} />
        </Pressable>

        <View style={styles.section}>
          <Pressable
            style={styles.listItem}
            onPress={() => router.push("/(settings)/diagnosis")}
          >
            <Text style={styles.itemTitle}>진단 유형 설정</Text>
            <Text style={styles.itemMeta}>{diagnosisLabel}</Text>
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
          <Pressable style={styles.textButton} onPress={confirmDeleteAccount}>
            <Text style={[styles.textButtonLabel, styles.textButtonDanger]}>
              {isDeleting ? "탈퇴 중..." : "탈퇴하기"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E6DCC6",
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
