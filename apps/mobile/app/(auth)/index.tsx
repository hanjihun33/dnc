import React from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import SocialLoginSection from "@/components/social-login-section";

const palette = {
  background: "#FFFFFF",
  text: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  email: "#F3F6F7",
  ink: "#111827",
};

const logoImage = require("@/assets/images/icon.png");

export default function AuthEntryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image
            source={logoImage}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>당낭콩</Text>
          <Text style={styles.tagline}>나만을 위한 식사 분석 혈당 코치</Text>
        </View>

        <View style={styles.buttonStack}>
          <TouchableOpacity
            style={[styles.actionButton, styles.emailButton]}
            onPress={() => router.push("/signup")}
          >
            <View style={[styles.iconDot, styles.emailDot]} />
            <Text style={styles.emailText}>이메일(아이디)로 가입하기</Text>
          </TouchableOpacity>
        </View>

        <SocialLoginSection />

        <View style={styles.loginRow}>
          <Text style={styles.loginHint}>이미 계정이 있으신가요?</Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.loginLink}>로그인</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  page: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
    alignItems: "center",
  },
  hero: { alignItems: "center", marginBottom: 48 },
  logoImage: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: "transparent",
    marginBottom: 18,
  },
  appName: { fontSize: 28, fontWeight: "800", color: palette.text },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    color: palette.textMuted,
  },
  buttonStack: { width: "100%", gap: 12 },
  actionButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  iconDot: {
    position: "absolute",
    left: 18,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  emailButton: {
    backgroundColor: palette.email,
    borderColor: "#EDF2F4",
  },
  emailDot: { backgroundColor: "#D1D5DB" },
  emailText: { color: palette.textMuted, fontWeight: "700", fontSize: 16 },
  loginRow: {
    flexDirection: "row",
    marginTop: 26,
    alignItems: "center",
  },
  loginHint: { color: palette.textMuted, fontSize: 13, marginRight: 6 },
  loginLink: { color: "#4F46E5", fontSize: 13, fontWeight: "700" },
});
