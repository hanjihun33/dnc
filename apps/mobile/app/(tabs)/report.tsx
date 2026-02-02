import React, { useMemo, useState, useCallback } from "react";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Image,
  Modal,
  Alert
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getAuthHeaders, loadAuthSession } from "../session";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const { width } = Dimensions.get("window");

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  navy: "#0F172A",
  accent: "#FACC15",
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#22C55E",
  border: "#E2E8F0",
  chartLow: "#EF4444",
  chartNormal: "#22C55E",
  chartHigh: "#F59E0B",
  primaryBtn: "#0F172A",
  successBg: "#DCFCE7",
  accentDark: "#B45309"
};

interface SensorResponse {
  sensorId: number;
  status: string;
  startedAt: string;
  endedAt?: string;
}

interface GlucoseReportDto {
  userId: number;
  period: string;
  averageGlucose: number;
  maxGlucose: number;
  maxGlucoseDateTime?: string;
  minGlucose: number;
  standardDeviation: number;
  timeInRange?: {
    veryLowPercent: number;
    lowPercent: number;
    inRangePercent: number;
    highPercent: number;
    veryHighPercent: number;
  };
}

interface MealResponse {
  mealId: number;
  mealType: string;
  eatenAt: string;
  imageUrl?: string;
  foodName?: string;
  memo?: string;
  peakGlucose?: number;
}

const getGlucoseStatus = (glucose?: number) => {
  if (glucose === undefined || glucose === null) return { label: '분석중', color: palette.textMuted, bg: '#f1f5f9' };
  if (glucose < 140) return { label: '좋음', color: '#166534', bg: '#DCFCE7' };
  if (glucose < 180) return { label: '보통', color: '#854D0E', bg: '#FEF9C3' };
  return { label: '나쁨', color: '#991B1B', bg: '#FEE2E2' };
};

const getImageUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
};

export default function ReportScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'MEALS' | 'REPORT'>('MEALS');

  // Sensor State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSensor, setActiveSensor] = useState<SensorResponse | null>(null);

  // Data State
  const [report, setReport] = useState<GlucoseReportDto | null>(null);
  const [meals, setMeals] = useState<MealResponse[]>([]);

  // Modal State for Analysis (Tab 2 interaction)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMeal, setModalMeal] = useState<MealResponse | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      await loadAuthSession();
      const headers = getAuthHeaders();

      // 1. Get Active Sensor
      const sensorRes = await fetch(`${API_BASE_URL}/api/v1/sensors/active`, { headers });
      if (sensorRes.status === 204) {
        setActiveSensor(null);
        setLoading(false);
        return;
      }
      const sensorData = await sensorRes.json() as SensorResponse;
      setActiveSensor(sensorData);

      // Determine Date Range
      const startDate = sensorData.startedAt;
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const endDate = new Date(now.getTime() - offset).toISOString().slice(0, -1); // Local ISO String

      // 2. Fetch Report (Custom Range)
      const reportRes = await fetch(
        `${API_BASE_URL}/api/v1/reports/glucose?startDate=${startDate}&endDate=${endDate}`,
        { headers }
      );
      if (reportRes.ok) setReport(await reportRes.json());

      // 3. Fetch Meals (Custom Range)
      const mealsRes = await fetch(
        `${API_BASE_URL}/api/v1/meals/search?startDate=${startDate}&endDate=${endDate}`,
        { headers }
      );
      if (mealsRes.ok) setMeals(await mealsRes.json());

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAllData(); }, [fetchAllData]));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchAllData(); }, [fetchAllData]);

  // Header Info
  const headerInfo = useMemo(() => {
    if (!activeSensor) return { title: "센서 준비 필요", subtitle: "활성 센서가 없습니다." };

    const start = new Date(activeSensor.startedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { title: `현재 센서 사용 중`, subtitle: `${diffDays}일차 (${start.getMonth() + 1}.${start.getDate()} ~)` };
  }, [activeSensor]);

  if (!activeSensor && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="sensors-off" size={64} color={palette.textMuted} />
          <Text style={styles.emptyTitle}>연동된 센서가 없습니다</Text>
          <Text style={styles.emptySubtitle}>새로운 센서를 연동하여 관리를 시작해보세요.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => Alert.alert("준비 중", "센서 연동 화면으로 이동")}>
            <Text style={styles.emptyBtnText}>센서 연동하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>{headerInfo.subtitle}</Text>
          <Text style={styles.headerTitle}>{headerInfo.title}</Text>
        </View>
        <View style={styles.sensorIcon}>
          <MaterialIcons name="sensors" size={24} color={palette.accentDark} />
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'MEALS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('MEALS')}
        >
          <Text style={[styles.tabText, activeTab === 'MEALS' && styles.tabTextActive]}>식사 기록</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'REPORT' && styles.tabBtnActive]}
          onPress={() => setActiveTab('REPORT')}
        >
          <Text style={[styles.tabText, activeTab === 'REPORT' && styles.tabTextActive]}>건강 리포트</Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView contentContainerStyle={styles.contentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          <ActivityIndicator size="large" color={palette.accent} style={{ marginTop: 40 }} />
        ) : activeTab === 'MEALS' ? (
          <MealLogTab meals={meals} />
        ) : (
          <ReportTab report={report} onMaxGlucosePress={() => {
            // Find meal before max glucose
            if (!report?.maxGlucoseDateTime) return;
            const maxTime = new Date(report.maxGlucoseDateTime);
            // Find closest meal before maxTime within 2 hours
            const targetMeal = meals.find(m => {
              const mealTime = new Date(m.eatenAt);
              const diff = maxTime.getTime() - mealTime.getTime();
              return diff > 0 && diff <= 2 * 60 * 60 * 1000;
            });

            if (targetMeal) {
              setModalMeal(targetMeal);
              setModalVisible(true);
            } else {
              Alert.alert("알림", "해당 시간 2시간 전의 식사 기록을 찾을 수 없습니다.");
            }
          }} />
        )}
      </ScrollView>

      {/* Interaction Modal (Reused) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>혈당 스파이크 원인</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={palette.textMuted} />
              </TouchableOpacity>
            </View>

            {modalMeal && (
              <View style={styles.mealPrevCard}>
                {modalMeal.imageUrl ? (
                  <Image source={{ uri: getImageUrl(modalMeal.imageUrl) }} style={styles.mealImage} />
                ) : (
                  <View style={[styles.mealImage, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="fast-food-outline" size={32} color={palette.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {/* 이름 및 시간 */}
                  <Text style={styles.mealName}>[임시] {modalMeal.foodName || "음식명"}</Text>
                  <Text style={styles.mealTime}>{new Date(modalMeal.eatenAt).toLocaleString()}</Text>

                  {/* 중량 및 등급 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ backgroundColor: getGlucoseStatus(modalMeal.peakGlucose).bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 11, color: getGlucoseStatus(modalMeal.peakGlucose).color, fontWeight: '700' }}>{getGlucoseStatus(modalMeal.peakGlucose).label}</Text>
                    </View>
                    {/* 영양 정보 */}
                    <View style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: palette.text }}>[임시] 300 kcal</Text>
                      <MacroBar />
                    </View>
                  </View>
                  <Text style={styles.modalDesc}>
                    최고 혈당 발생 약 2시간 전에 섭취한 음식입니다.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const MacroBar = () => {
  // Mock Data: 5:3:2 Ratio
  const ratio = { c: 5, p: 3, f: 2 };
  const color = { c: '#3B82F6', p: '#10B981', f: '#F59E0B' }; // Blue, Green, Amber

  return (
    <View style={{ marginTop: 4, width: '100%' }}>
      {/* Bar */}
      <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: '#F1F5F9', marginBottom: 4 }}>
        <View style={{ flex: ratio.c, backgroundColor: color.c }} />
        <View style={{ flex: ratio.p, backgroundColor: color.p }} />
        <View style={{ flex: ratio.f, backgroundColor: color.f }} />
      </View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.c, marginRight: 4 }} />
          <Text style={{ fontSize: 11, color: palette.textMuted }}>탄수 [임시]%</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.p, marginRight: 4 }} />
          <Text style={{ fontSize: 11, color: palette.textMuted }}>단백 [임시]%</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.f, marginRight: 4 }} />
          <Text style={{ fontSize: 11, color: palette.textMuted }}>지방 [임시]%</Text>
        </View>
      </View>
    </View>
  );
};

// --- Tab Components ---

const MealLogTab = ({ meals }: { meals: MealResponse[] }) => {
  if (meals.length === 0) return <Text style={styles.emptyText}>기록된 식사가 없습니다.</Text>;

  return (
    <View>
      {meals.map((meal) => (
        <View key={meal.mealId} style={styles.mealCard}>
          {meal.imageUrl ? (
            <Image source={{ uri: getImageUrl(meal.imageUrl) }} style={styles.mealCardImage} />
          ) : (
            <View style={[styles.mealCardImage, { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="restaurant" size={24} color={palette.textMuted} />
            </View>
          )}
          <View style={styles.mealCardContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              {/* Left Column: Title */}
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.mealCardTitle}>[임시] {meal.foodName || "음식명"}</Text>
              </View>

              {/* Right Column: Time & Grade */}
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.mealCardTime}>
                  {new Date(meal.eatenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View style={{ marginTop: 4, backgroundColor: getGlucoseStatus(meal.peakGlucose).bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 11, color: getGlucoseStatus(meal.peakGlucose).color, fontWeight: '700' }}>{getGlucoseStatus(meal.peakGlucose).label}</Text>
                </View>
              </View>
            </View>

            {/* 영양 정보 (신규 컬럼 예정) */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: palette.text }}>[임시] 300 kcal</Text>
              <MacroBar />
            </View>

            {/* 식사 타입 배지 */}
            <Text style={[styles.mealCardType, { marginTop: 6 }]}>{getMealTypeText(meal.mealType)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const ReportTab = ({ report, onMaxGlucosePress }: { report: GlucoseReportDto | null, onMaxGlucosePress: () => void }) => {
  if (!report) return <Text style={styles.emptyText}>리포트 데이터가 없습니다.</Text>;

  // TIR Logic
  const tir = report.timeInRange;
  const tirData = tir ? {
    low: tir.veryLowPercent + tir.lowPercent,
    normal: tir.inRangePercent,
    high: tir.highPercent + tir.veryHighPercent
  } : { low: 0, normal: 0, high: 0 };

  return (
    <View>
      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>핵심 수치</Text>
      <View style={styles.gridContainer}>
        <StatBox label="평균 혈당" value={report.averageGlucose} unit="mg/dL" />
        <StatBox label="변동성" value={report.standardDeviation?.toFixed(1)} unit="SD" />

        <TouchableOpacity
          style={[styles.statCard, { borderColor: palette.warning, borderWidth: 1 }]}
          onPress={onMaxGlucosePress}
          activeOpacity={0.7}
        >
          <Text style={[styles.statLabel, { color: palette.warning }]}>최고 혈당</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.statValue, { color: palette.warning }]}>{report.maxGlucose}</Text>
            <Text style={styles.statUnit}>mg/dL</Text>
          </View>
          <View style={{ position: 'absolute', right: 10, top: 10 }}>
            <MaterialIcons name="touch-app" size={16} color={palette.warning} />
          </View>
        </TouchableOpacity>

        <StatBox label="최저 혈당" value={report.minGlucose} unit="mg/dL" highlight={report.minGlucose < 70} tone="danger" />
      </View>

      {/* TIR Bar */}
      <Text style={styles.sectionTitle}>범위 내 비율 (TIR)</Text>
      <View style={styles.card}>
        <View style={styles.tirBarContainer}>
          {tirData.low > 0 && <View style={[styles.tirSegment, { flex: tirData.low, backgroundColor: palette.chartLow, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }]} />}
          {tirData.normal > 0 && <View style={[styles.tirSegment, { flex: tirData.normal, backgroundColor: palette.chartNormal }]} />}
          {tirData.high > 0 && <View style={[styles.tirSegment, { flex: tirData.high, backgroundColor: palette.chartHigh, borderTopRightRadius: 8, borderBottomRightRadius: 8 }]} />}
        </View>
        <View style={styles.tirLegendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: palette.chartLow }]} />
            <Text style={styles.legendText}>저혈당 {tirData.low.toFixed(0)}%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: palette.chartNormal }]} />
            <Text style={styles.legendText}>정상 {tirData.normal.toFixed(0)}%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: palette.chartHigh }]} />
            <Text style={styles.legendText}>고혈당 {tirData.high.toFixed(0)}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const StatBox = ({ label, value, unit, highlight, tone }: any) => (
  <View style={[styles.statCard, highlight && { borderColor: tone === 'danger' ? palette.danger : palette.warning, borderWidth: 1 }]}>
    <Text style={[styles.statLabel, highlight && { color: tone === 'danger' ? palette.danger : palette.warning }]}>{label}</Text>
    <View style={styles.valueRow}>
      <Text style={[styles.statValue, highlight && { color: tone === 'danger' ? palette.danger : palette.warning }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  </View>
);

const getMealTypeText = (type: string) => {
  switch (type) {
    case 'BREAKFAST': return '아침';
    case 'LUNCH': return '점심';
    case 'DINNER': return '저녁';
    case 'SNACK': return '간식';
    default: return type;
  }
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  header: { padding: 20, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: palette.text },
  headerSubtitle: { fontSize: 14, color: palette.textMuted, marginBottom: 4 },
  sensorIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },

  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: palette.border },
  tabBtnActive: { borderBottomColor: palette.navy },
  tabText: { fontSize: 16, color: palette.textMuted, fontWeight: '600' },
  tabTextActive: { color: palette.navy, fontWeight: '700' },

  contentContainer: { padding: 20 },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: palette.text, marginTop: 20, marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: palette.textMuted, textAlign: 'center', marginBottom: 30 },
  emptyBtn: { backgroundColor: palette.navy, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },

  // Meal Card
  mealCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  mealCardImage: { width: 48, height: 48, borderRadius: 10, marginRight: 12 },
  mealCardContent: { flex: 1, justifyContent: 'center' },
  mealCardTitle: { fontSize: 16, fontWeight: '600', color: palette.text },
  mealCardTime: { fontSize: 12, color: palette.textMuted },
  mealCardType: { fontSize: 12, color: palette.accentDark, marginTop: 2, fontWeight: '500' },

  // Stats
  sectionTitle: { fontSize: 18, fontWeight: "700", color: palette.text, marginBottom: 12, marginTop: 8 },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 },
  statCard: { width: "48%", backgroundColor: palette.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: palette.border },
  statLabel: { fontSize: 12, color: palette.textMuted, marginBottom: 8, fontWeight: "600" },
  valueRow: { flexDirection: "row", alignItems: "baseline" },
  statValue: { fontSize: 24, fontWeight: "800", color: palette.text, marginRight: 4 },
  statUnit: { fontSize: 12, color: palette.textMuted },

  // TIR
  card: { backgroundColor: palette.card, borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: palette.border },
  tirBarContainer: { flexDirection: 'row', height: 24, width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  tirSegment: { height: '100%' },
  tirLegendContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: palette.textMuted, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: palette.text },
  modalDesc: { fontSize: 14, color: palette.textMuted, textAlign: 'center', marginTop: 20 },
  mealPrevCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, width: '100%' },
  mealImage: { width: 60, height: 60, borderRadius: 12, marginRight: 16 },
  mealName: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 4 },
  mealTime: { fontSize: 13, color: palette.textMuted },
});
