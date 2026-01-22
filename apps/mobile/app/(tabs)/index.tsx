import React from "react";
import {
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
// 차트 라이브러리는 설치 전이라면 에러가 날 수 있으니 일단 View로 대체하거나 설치후 사용하세요.
// npx expo install react-native-svg react-native-chart-kit

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>당낭콩+</Text>
            <Text style={styles.statusBadge}>● 센서 학습 중</Text>
          </View>

          {/* 메인 혈당 카드 */}
          <View style={styles.aiMainCard}>
            <Text style={styles.cardLabel}>현재 혈당</Text>
            <View style={styles.sugarRow}>
              <Text style={styles.bloodSugarText}>112</Text>
              <Text style={styles.unitText}> mg/dL</Text>
            </View>
            {/* 차트 영역 플레이스홀더 */}
            <View style={styles.chartPlaceholder}>
              <Text style={{ color: "white", opacity: 0.5 }}>
                차트 데이터 로딩 중...
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={{ fontSize: 20 }}>💡</Text>
              <Text style={styles.cardTitle}> AI 맞춤 코칭</Text>
            </View>
            <Text style={styles.cardDesc}>
              어제보다 혈당 상승폭이 완만합니다. 지금 10분만 걸으면 피크 없이
              안정됩니다!
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={{ fontSize: 20 }}>🍽️</Text>
              <Text style={styles.cardTitle}> 오늘의 식단</Text>
            </View>
            <Text style={styles.cardDesc}>
              아직 등록된 식단이 없어요. 식단 탭에서 음식 등록을 해보세요!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },
  page: { padding: 20, paddingTop: Platform.OS === "android" ? 40 : 20 },
  pageTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#4F46E5" },
  statusBadge: { fontSize: 12, color: "#10B981", fontWeight: "bold" },

  aiMainCard: {
    backgroundColor: "#4F46E5",
    borderRadius: 30,
    padding: 25,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  cardLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  sugarRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: 10,
  },
  bloodSugarText: { color: "white", fontSize: 48, fontWeight: "bold" },
  unitText: { color: "white", fontSize: 18, opacity: 0.8 },
  chartPlaceholder: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  cardDesc: { fontSize: 14, color: "#64748B", lineHeight: 22 },

  simButton: {
    backgroundColor: "#EEF2FF",
    borderWidth: 2,
    borderColor: "#C7D2FE",
    borderStyle: "dashed",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
  },
  simButtonText: { color: "#4F46E5", fontWeight: "bold", fontSize: 16 },
});
