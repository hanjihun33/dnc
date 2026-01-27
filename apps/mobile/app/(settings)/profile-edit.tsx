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

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  accent: "#FACC15",
  accentInk: "#111827",
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const [nickname, setNickname] = React.useState("차지훈");
  const [password, setPassword] = React.useState("");
  const [passwordConfirm, setPasswordConfirm] = React.useState("");
  const [avatarUri, setAvatarUri] = React.useState<string | null>(null);
  const [avatarIndex, setAvatarIndex] = React.useState(0);
  const avatarColors = ["#E2E8F0", "#FDE68A", "#FECACA", "#BFDBFE"];
  const initials = nickname.trim().length > 0 ? nickname.trim()[0] : "U";

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
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="새 비밀번호 입력"
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
          </View>
        </View>

        <Pressable style={styles.saveButton} onPress={() => router.back()}>
          <Text style={styles.saveButtonText}>저장하기</Text>
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

  saveButton: {
    marginTop: 20,
    backgroundColor: palette.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: palette.accentInk,
    fontSize: 16,
    fontWeight: "700",
  },
});
