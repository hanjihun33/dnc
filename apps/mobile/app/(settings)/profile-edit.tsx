import React from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import {
  bumpProfileRevision,
  getAuthHeaders,
  loadAuthSession,
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

export default function ProfileEditScreen() {
  const router = useRouter();
  const [nickname, setNickname] = React.useState("차지훈");
  const [initialNickname, setInitialNickname] = React.useState("차지훈");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordConfirm, setPasswordConfirm] = React.useState("");
  const [avatarUri, setAvatarUri] = React.useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = React.useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [avatarIndex, setAvatarIndex] = React.useState(0);
  const avatarColors = ["#E2E8F0", "#FDE68A", "#FECACA", "#BFDBFE"];
  const initials = nickname.trim().length > 0 ? nickname.trim()[0] : "U";
  const passwordsMatch =
    password.length === 0 || (password.length > 0 && password === passwordConfirm);
  const passwordReady =
    password.length === 0 ||
    (password.length >= 8 &&
      currentPassword.length > 0 &&
      passwordConfirm.length > 0 &&
      passwordsMatch);
  const canSave =
    nickname.trim().length > 0 &&
    passwordReady &&
    !isSaving;

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
        email?: string;
        profileImageUrl?: string | null;
      };
      const nextNickname = profile.nickname || profile.email || "";
      setNickname(nextNickname);
      setInitialNickname(nextNickname);
      setProfileImageUrl(profile.profileImageUrl ?? null);
      setAvatarUri(profile.profileImageUrl ?? null);
    } catch {
      // Ignore profile load errors.
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "갤러리 접근 권한을 허용해주세요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "카메라 접근 권한을 허용해주세요.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const openAvatarOptions = () => {
    Alert.alert("프로필 이미지 변경", "방법을 선택하세요.", [
      { text: "갤러리", onPress: pickFromLibrary },
      { text: "카메라", onPress: takePhoto },
      { text: "취소", style: "cancel" },
    ]);
  };

  const getImageMeta = (uri: string) => {
    const lower = uri.toLowerCase();
    const isPng = lower.endsWith(".png");
    const isJpg = lower.endsWith(".jpg") || lower.endsWith(".jpeg");
    const type = isPng ? "image/png" : "image/jpeg";
    const extension = isPng ? "png" : "jpg";
    const name = `profile.${extension}`;
    return { type, name };
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    if (password.length > 0 && currentPassword === password) {
      Alert.alert("비밀번호 변경", "현재 비밀번호와 새 비밀번호가 같습니다.");
      return;
    }
    setIsSaving(true);
    try {
      await loadAuthSession();
      const headers = getAuthHeaders();

      const trimmedNickname = nickname.trim();
      if (trimmedNickname && trimmedNickname !== initialNickname) {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me/profile`, {
          method: "PATCH",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ nickname: trimmedNickname }),
        });
        if (!response.ok) {
          throw new Error("닉네임 저장에 실패했습니다.");
        }
      }

      if (password.length > 0) {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me/password`, {
          method: "PATCH",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword: password,
          }),
        });
        if (!response.ok) {
          let message = "비밀번호 변경에 실패했습니다.";
          if (response.status === 400) {
            message = "새 비밀번호는 기존과 달라야 합니다.";
          }
          if (response.status === 401) {
            message = "현재 비밀번호가 올바르지 않습니다.";
          }
          throw new Error(message);
        }
        setCurrentPassword("");
        setPassword("");
        setPasswordConfirm("");
      }

      const isLocalImage =
        avatarUri != null &&
        !avatarUri.startsWith("http://") &&
        !avatarUri.startsWith("https://");
      if (isLocalImage && avatarUri) {
        const formData = new FormData();
        const meta = getImageMeta(avatarUri);
        formData.append("image", {
          uri: avatarUri,
          name: meta.name,
          type: meta.type,
        } as unknown as Blob);

        const response = await fetch(
          `${API_BASE_URL}/api/v1/users/me/profile-image`,
          {
            method: "PATCH",
            headers,
            body: formData,
          }
        );
        if (!response.ok) {
          throw new Error("프로필 이미지 저장에 실패했습니다.");
        }
        const updated = (await response.json()) as {
          profileImageUrl?: string | null;
        };
        setProfileImageUrl(updated.profileImageUrl ?? null);
      }

      bumpProfileRevision();
      Alert.alert("저장 완료", "프로필이 업데이트되었습니다.");
      router.back();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "저장에 실패했습니다.";
      Alert.alert("저장 실패", message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>프로필 수정</Text>
        <Text style={styles.subtitle}>닉네임, 비밀번호, 프로필 이미지를 수정하세요.</Text>

        <View style={styles.section}>
          <Pressable style={styles.avatarRow} onPress={openAvatarOptions}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: avatarColors[avatarIndex] },
              ]}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.avatarTitle}>프로필 이미지</Text>
              <Text style={styles.avatarHint}>사진을 눌러 변경</Text>
            </View>
          </Pressable>

          <View style={styles.field}>
            <Text style={styles.label}>닉네임</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임 입력"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>현재 비밀번호</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="현재 비밀번호 입력"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>새 비밀번호</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="8자 이상 입력"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호 다시 입력"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />
            {password.length > 0 && passwordConfirm.length > 0 && !passwordsMatch && (
              <Text style={styles.helperTextError}>비밀번호가 일치하지 않습니다.</Text>
            )}
            {password.length > 0 && passwordConfirm.length > 0 && passwordsMatch && (
              <Text style={styles.helperTextSuccess}>비밀번호가 일치합니다.</Text>
            )}
            {password.length > 0 && password.length < 8 && (
              <Text style={styles.helperTextError}>비밀번호는 8자 이상이어야 합니다.</Text>
            )}
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
            {isSaving ? "저장 중..." : "저장하기"}
          </Text>
        </Pressable>
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
    marginBottom: 6,
  },
  subtitle: {
    color: palette.textMuted,
    marginBottom: 18,
  },

  section: {
    backgroundColor: palette.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  avatarInfo: { marginLeft: 16 },
  avatarTitle: { color: palette.text, fontSize: 16, fontWeight: "700" },
  avatarHint: { color: palette.textMuted, marginTop: 4, fontSize: 12 },
  field: {
    marginBottom: 16,
  },
  label: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: palette.text,
    backgroundColor: "#FFFFFF",
  },
  helperTextError: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 8,
  },
  helperTextSuccess: {
    color: "#16A34A",
    fontSize: 12,
    marginTop: 8,
  },

  saveButton: {
    marginTop: 20,
    backgroundColor: palette.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },
  saveButtonText: {
    color: palette.accentInk,
    fontSize: 16,
    fontWeight: "700",
  },
  saveButtonTextDisabled: {
    color: "#94A3B8",
  },
});
