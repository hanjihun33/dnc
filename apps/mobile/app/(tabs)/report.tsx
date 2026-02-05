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
import { getAuthHeaders, loadAuthSession } from "../../session";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { DailySummaryCard } from "../../components/DailySummaryCard";
import { TimelineHistoryModal } from "../../components/TimelineHistoryModal";

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
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
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


  // Sensor State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sensors, setSensors] = useState<SensorResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Data State
  const [report, setReport] = useState<GlucoseReportDto | null>(null);
  const [meals, setMeals] = useState<MealResponse[]>([]);

  // Modal State for Analysis (Tab 2 interaction)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMeal, setModalMeal] = useState<MealResponse | null>(null);

  // Daily Report & History State
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const fetchSensorHistory = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/v1/sensors/history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSensors(data);
      }
    } catch (e) {
      console.error("Failed to fetch sensors", e);
    }
  };

  const fetchReportData = useCallback(async () => {
    if (sensors.length === 0) return;
    try {
      setLoading(true);
      await loadAuthSession();
      const headers = getAuthHeaders();

      const targetSensor = sensors[currentIndex];
      const startDate = targetSensor.startedAt;

      let endDateIso = "";
      if (targetSensor.endedAt) {
        endDateIso = targetSensor.endedAt;
      } else {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        endDateIso = new Date(now.getTime() - offset).toISOString().slice(0, -1);
      }

      // 2. Fetch Report
      const reportRes = await fetch(
        `${API_BASE_URL}/api/v1/reports/glucose?startDate=${startDate}&endDate=${endDateIso}&sensorId=${targetSensor.sensorId}`,
        { headers }
      );
      if (reportRes.ok) setReport(await reportRes.json());
      else setReport(null);

      // 3. Fetch Meals
      const mealsRes = await fetch(
        `${API_BASE_URL}/api/v1/meals/search?startDate=${startDate}&endDate=${endDateIso}`,
        { headers }
      );
      if (mealsRes.ok) setMeals(await mealsRes.json());
      else setMeals([]);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sensors, currentIndex]);

  const fetchDailyReport = async () => {
    try {
      const headers = getAuthHeaders();
      // 1. 최신 리포트 조회
      const res = await fetch(`${API_BASE_URL}/api/v1/reports/daily/latest`, { headers });
      if (res.ok && res.status !== 204) {
        setDailyReport(await res.json());
      } else {
        setDailyReport(null);
      }
    } catch (e) {
      console.log('Failed to fetch daily report');
    }
  };

  const fetchHistory = async () => {
    if (sensors.length === 0) return;
    try {
      const headers = getAuthHeaders();
      const sensorId = sensors[currentIndex].sensorId;
      const res = await fetch(`${API_BASE_URL}/api/v1/reports/history/${sensorId}`, { headers });
      if (res.ok) {
        setHistory(await res.json());
        setHistoryModalVisible(true);
      }
    } catch (e) {
      console.log('Failed to fetch history');
    }
  };

  // Initial load
  useFocusEffect(useCallback(() => {
    loadAuthSession().then(() => {
      fetchSensorHistory();
      fetchDailyReport();
    });
  }, []));

  // Reload data when sensor selection changes or on refresh
  React.useEffect(() => {
    if (sensors.length > 0) {
      fetchReportData();
    }
  }, [sensors, currentIndex, fetchReportData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSensorHistory();
    await fetchDailyReport();
    // fetchReportData will trigger via effect if sensors update
  }, []);

  const shiftSensor = (direction: number) => {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < sensors.length) {
      setCurrentIndex(newIndex);
    }
  };

  // Header Info
  const headerInfo = useMemo(() => {
    if (sensors.length === 0) return { title: "센서 준비 필요", subtitle: "활성 센서가 없습니다." };
    const current = sensors[currentIndex];

    const start = new Date(current.startedAt);
    const startStr = `${start.getMonth() + 1}.${start.getDate()}`;

    let endStr = "현재";
    if (current.endedAt) {
      const end = new Date(current.endedAt);
      endStr = `${end.getMonth() + 1}.${end.getDate()}`;
    }

    const isCurrent = currentIndex === 0 && current.status === 'ACTIVE';
    const isPending = currentIndex === 0 && current.status === 'PENDING';

    let mainTitle = "이전 센서 리포트";
    if (isCurrent) mainTitle = "현재 센서";
    else if (isPending) mainTitle = "센서 예열 중";

    const subTitle = isPending ? "혈당 데이터 수집 대기 중..." : `${startStr} ~ ${endStr}`;

    return { title: mainTitle, subtitle: subTitle, isPending };
  }, [sensors, currentIndex]);

  if (sensors.length === 0 && !loading) {
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

  // Check if current sensor is pending warm-up
  if (headerInfo.isPending && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
        <View style={styles.header}>
          <View style={{ alignItems: 'center', width: '100%' }}>
            <Text style={styles.headerTitle}>{headerInfo.title}</Text>
            <Text style={styles.headerSubtitle}>{headerInfo.subtitle}</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={palette.accent} style={{ marginBottom: 20 }} />
          <Text style={styles.emptyTitle}>센서가 연결되었습니다!</Text>
          <Text style={[styles.emptySubtitle, { maxWidth: '80%' }]}>
            혈당 데이터를 수집하기 위해 대기 중입니다.{"\n"}
            (최대 30분 ~ 2시간 소요)
          </Text>
          <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border }]} onPress={onRefresh}>
            <Text style={[styles.emptyBtnText, { color: palette.text }]}>새로고침</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      {/* Header Section (Navigation Style) */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {/* Prev Button (Older) -> Index increases */}
          <TouchableOpacity
            onPress={() => shiftSensor(1)}
            disabled={currentIndex >= sensors.length - 1}
            style={[styles.headerNavButton, currentIndex >= sensors.length - 1 && styles.headerNavButtonDisabled]}
          >
            <Text style={[styles.headerNavText, currentIndex >= sensors.length - 1 && styles.headerNavTextDisabled]}>{"<"}</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{headerInfo.title}</Text>
            <Text style={styles.headerSubtitle}>{headerInfo.subtitle}</Text>
          </View>

          {/* Next Button (Newer) -> Index decreases */}
          <TouchableOpacity
            onPress={() => shiftSensor(-1)}
            disabled={currentIndex <= 0}
            style={[styles.headerNavButton, currentIndex <= 0 && styles.headerNavButtonDisabled]}
          >
            <Text style={[styles.headerNavText, currentIndex <= 0 && styles.headerNavTextDisabled]}>{">"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area */}
      <ScrollView contentContainerStyle={styles.contentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          <ActivityIndicator size="large" color={palette.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
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

            {/* AI Daily Summary Section */}
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>AI 브리핑</Text>
              {dailyReport ? (
                <DailySummaryCard
                  report={dailyReport}
                  onPressHistory={fetchHistory}
                />
              ) : (
                <View style={styles.card}>
                  <Text style={{ textAlign: 'center', color: palette.textMuted, padding: 20 }}>
                    아직 생성된 리포트가 없습니다.{'\n'}내일 아침을 기대해주세요! 🌙
                  </Text>
                </View>
              )}
            </View>
          </>
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
                  <Image source={{ uri: getImageUrl(modalMeal.imageUrl) }} style={styles.modalMealImage} />
                ) : (
                  <View style={[styles.modalMealImage, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="fast-food-outline" size={32} color={palette.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {/* 이름 및 시간 */}
                  <Text style={styles.mealName}>{modalMeal.foodName || "음식명"}</Text>
                  <Text style={styles.mealTime}>{new Date(modalMeal.eatenAt).toLocaleString()}</Text>

                  {/* 중량 및 등급 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ backgroundColor: getGlucoseStatus(modalMeal.peakGlucose).bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 11, color: getGlucoseStatus(modalMeal.peakGlucose).color, fontWeight: '700' }}>{getGlucoseStatus(modalMeal.peakGlucose).label}</Text>
                    </View>
                    {/* 영양 정보 */}
                    <View style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: palette.text }}>
                        {modalMeal.calories ? `${modalMeal.calories} kcal` : "- kcal"}
                      </Text>
                      <MacroBar c={modalMeal.carbs} p={modalMeal.protein} f={modalMeal.fat} />
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

      {/* History Modal */}
      <TimelineHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        history={history}
      />

    </SafeAreaView>
  );
}

const calcMacroPercents = (
  carbs?: number | null,
  protein?: number | null,
  fat?: number | null
) => {
  if (carbs == null || protein == null || fat == null) {
    return null;
  }
  const safeCarbs = Math.max(0, carbs);
  const safeProtein = Math.max(0, protein);
  const safeFat = Math.max(0, fat);
  const totalCalories = safeCarbs * 4 + safeProtein * 4 + safeFat * 9;
  if (totalCalories <= 0) {
    return null;
  }
  const carbPercent = Math.round((safeCarbs * 4 * 100) / totalCalories);
  const proteinPercent = Math.round((safeProtein * 4 * 100) / totalCalories);
  const fatPercent = Math.max(0, 100 - carbPercent - proteinPercent);
  return { carbPercent, proteinPercent, fatPercent };
};

const MacroBar = ({ c = 0, p = 0, f = 0 }: { c?: number, p?: number, f?: number }) => {
  const macros = calcMacroPercents(c, p, f);
  // Default to 1:1:1 if null (placeholder)
  const { carbPercent, proteinPercent, fatPercent } = macros || { carbPercent: 0, proteinPercent: 0, fatPercent: 0 };

  const hasData = !!macros;
  // If no data, render 1:1:1 segments in coloring (or gray?) - Index.tsx uses colors even for placeholder
  const flexValues = hasData ? [carbPercent, proteinPercent, fatPercent] : [1, 1, 1];

  const color = { c: '#86EFAC', p: '#FDE68A', f: '#93C5FD' };

  return (
    <View style={{ marginTop: 4, width: '100%' }}>
      {/* Bar */}
      <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: '#F1F5F9', marginBottom: 4 }}>
        <View style={{ flex: flexValues[0], backgroundColor: color.c }} />
        <View style={{ flex: flexValues[1], backgroundColor: color.p }} />
        <View style={{ flex: flexValues[2], backgroundColor: color.f }} />
      </View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.c, marginRight: 4 }} />
          <Text style={{ fontSize: 11, color: palette.textMuted }}>탄 {hasData ? `${carbPercent}%` : '--%'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.p, marginRight: 4 }} />
          <Text style={{ fontSize: 11, color: palette.textMuted }}>단 {hasData ? `${proteinPercent}%` : '--%'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.f, marginRight: 4 }} />
          <Text style={{ fontSize: 11, color: palette.textMuted }}>지 {hasData ? `${fatPercent}%` : '--%'}</Text>
        </View>
      </View>
    </View>
  );
};

// --- Tab Components ---

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

  // Header Navigation Styles
  headerNavButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerNavButtonDisabled: {
    opacity: 0.3,
  },
  headerNavText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  headerNavTextDisabled: { color: "rgba(148, 163, 184, 0.4)" },

  sensorIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },



  contentContainer: { padding: 20 },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: palette.text, marginTop: 20, marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: palette.textMuted, textAlign: 'center', marginBottom: 30 },
  emptyBtn: { backgroundColor: palette.navy, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: palette.textMuted, marginTop: 40 },



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
  modalMealImage: { width: 60, height: 60, borderRadius: 12, marginRight: 16 },
  mealName: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 4 },
  mealTime: { fontSize: 13, color: palette.textMuted },
});
