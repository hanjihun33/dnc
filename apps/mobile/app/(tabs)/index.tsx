import React from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  accent: "#FACC15",
  accentDark: "#F59E0B",
  ink: "#111827",
  navy: "#0F172A",
  navySoft: "#1E293B",
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

const formatToday = () => {
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${weekdays[now.getDay()]})`;
};

export default function HomeScreen() {
  const router = useRouter();
  const todayLabel = formatToday();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>오늘의 리포트</Text>
              <Text style={styles.headerSubtitle}>{todayLabel}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>센서 학습 중</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroLabel}>오늘 평균 혈당</Text>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>목표 범위</Text>
              </View>
            </View>
            <View style={styles.heroValueRow}>
              <Text style={styles.heroValue}>112</Text>
              <Text style={styles.heroUnit}>mg/dL</Text>
            </View>
            <Text style={styles.heroHint}>
              마지막 측정 5분 전 · 안정적인 흐름
            </Text>
            <View style={styles.heroChart}>
              <View style={styles.heroChartLine} />
              <View style={styles.heroChartDot} />
              <View style={styles.heroChartDotSmall} />
              <View style={styles.heroChartDotSmallAlt} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>목표 범위</Text>
              <Text style={styles.statValue}>78%</Text>
              <Text style={styles.statHint}>70-140 mg/dL</Text>
            </View>
            <View style={[styles.statCard, styles.statCardSpacing]}>
              <Text style={styles.statLabel}>식후 피크</Text>
              <Text style={styles.statValue}>152</Text>
              <Text style={styles.statHint}>오늘 최고치</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>스트릭</Text>
              <Text style={styles.statValue}>5일</Text>
              <Text style={styles.statHint}>연속 기록</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>AI 코칭</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>오늘은 안정적인 흐름이에요</Text>
            <Text style={styles.cardDesc}>
              점심 후 20분 산책을 하면 피크를 더 낮출 수 있어요. 물 섭취를
              조금만 늘려도 좋아요.
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>산책 20분</Text>
              <Text style={styles.badge}>수분 보충</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>오늘의 식단</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>등록된 식단이 없어요</Text>
            <Text style={styles.cardDesc}>
              식단 탭에서 사진을 추가하고 혈당 변화를 확인해보세요.
            </Text>
            <TouchableOpacity
              style={styles.callout}
              onPress={() => router.push("/(tabs)/meal")}
            >
              <Text style={styles.calloutText}>식단 기록하러 가기 →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  container: { flex: 1 },
  page: { padding: 20, paddingTop: Platform.OS === "android" ? 40 : 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: palette.text },
  headerSubtitle: { color: palette.textMuted, marginTop: 4 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  statusText: { color: palette.text, fontSize: 12, fontWeight: "600" },
  heroCard: {
    backgroundColor: palette.navy,
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    color: "rgba(248, 250, 252, 0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  heroPill: {
    backgroundColor: palette.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroPillText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  heroValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 12,
  },
  heroValue: {
    color: "#F8FAFC",
    fontSize: 44,
    fontWeight: "800",
    marginRight: 6,
  },
  heroUnit: { color: "#E2E8F0", fontSize: 16 },
  heroHint: {
    color: "rgba(226, 232, 240, 0.7)",
    marginTop: 6,
    fontSize: 12,
  },
  heroChart: {
    height: 60,
    marginTop: 16,
    backgroundColor: palette.navySoft,
    borderRadius: 16,
    justifyContent: "center",
  },
  heroChartLine: {
    height: 2,
    backgroundColor: "rgba(250, 204, 21, 0.6)",
    marginHorizontal: 16,
  },
  heroChartDot: {
    position: "absolute",
    left: 40,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.accent,
  },
  heroChartDotSmall: {
    position: "absolute",
    left: 140,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(248, 250, 252, 0.7)",
  },
  heroChartDotSmallAlt: {
    position: "absolute",
    right: 30,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(248, 250, 252, 0.5)",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statCardSpacing: {
    marginHorizontal: 10,
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  statValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6,
  },
  statHint: {
    color: palette.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    marginTop: 18,
    marginBottom: 12,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: palette.text },
  cardDesc: {
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 22,
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  badge: {
    backgroundColor: "#EEF2FF",
    color: "#4338CA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 8,
  },
  callout: {
    marginTop: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  calloutText: {
    color: "#92400E",
    fontWeight: "700",
    fontSize: 13,
  },
});
