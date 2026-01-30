import React, { useMemo, useState, useCallback, useRef } from "react";
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
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Image,
  Alert
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getAuthHeaders, loadAuthSession } from "../session";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";

// 안드로이드에서 LayoutAnimation 활성화
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  accent: "#FACC15",
  accentDark: "#F59E0B",
  navy: "#0F172A",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  successBg: "#DCFCE7",
  warningBg: "#FEF3C7",
  dangerBg: "#FEE2E2",
  chartLow: "#EF4444",     // 저혈당 (Red)
  chartNormal: "#22C55E",  // 정상 (Green)
  chartHigh: "#F59E0B",    // 고혈당 (Orange)
};

const { width } = Dimensions.get("window");
// 고정된 캘린더 높이 제거 (LayoutAnimation으로 처리)

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

interface GlucoseReportDto {
  userId: number;
  period: string;
  averageGlucose: number;
  maxGlucose: number;
  maxGlucoseDateTime?: string; // 백엔드에서 추가됨
  minGlucose: number;
  standardDeviation: number;
  timeInRange?: {
    veryLowPercent: number;
    lowPercent: number;
    inRangePercent: number;
    highPercent: number;
    veryHighPercent: number;
  };
  aiAnalysis?: string;
}

interface MealResponse {
  foodId: number;
  mealType: string;
  eatenAt: string; // ISO
  imageUrl?: string;
  foodName?: string; // aiGuide 또는 memo에 있을 수 있음
  memo?: string;
}

// --- 날짜 헬퍼 함수 ---
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // 일요일 시작
  return new Date(d.setDate(diff));
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const isFuture = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
};

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export default function ReportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<GlucoseReportDto | null>(null);

  // 캘린더 상태
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 인터랙션 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [mealRecord, setMealRecord] = useState<MealResponse | null>(null);
  const [mealLoading, setMealLoading] = useState(false);
  const [modalType, setModalType] = useState<'FOUND' | 'NOT_FOUND_ADDABLE' | 'NOT_FOUND_LOCKED'>('NOT_FOUND_LOCKED');

  const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek, i)), [startOfWeek]);

  // 범위 강조 로직
  const rangeInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = weekDays[6];

    // 이번 주가 오늘을 포함하거나 과거인지 확인
    const isCurrentWeek = (today >= startOfWeek && today <= end);
    const isFutureWeek = (startOfWeek > today);

    let endIndex = 6; // 기본값: 토요일 (전체 범위)
    if (isCurrentWeek) {
      endIndex = today.getDay(); // 0-6
    } else if (isFutureWeek) {
      endIndex = -1; // 강조 없음
    }

    return { isCurrentWeek, endIndex };
  }, [weekDays, startOfWeek]);

  // 캘린더 토글 애니메이션
  const toggleCalendar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCalendarOpen(!isCalendarOpen);
  };

  // 월간 날짜 생성 (Memoized)
  const monthDays = useMemo(() => {
    if (!isCalendarOpen) return []; // 최적화: 닫혀있으면 계산하지 않음
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    const startPadding = firstDay.getDay();
    for (let i = startPadding; i > 0; i--) {
      days.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    while (days.length % 7 !== 0) {
      days.push({ date: new Date(year, month + 1, days.length - (lastDay.getDate() + startPadding) + 1), isCurrentMonth: false });
    }
    return days;
  }, [currentDate, isCalendarOpen]);


  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      await loadAuthSession();
      const headers = getAuthHeaders();

      // 참고: 현재는 ReportController가 'period=WEEKLY'만 받고 날짜를 따로 받지 않아
      // 항상 '지난 7일' 또는 '이번 주' 등 정해진 기간을 반환할 수 있습니다.
      // 네비게이션(주간 이동)이 실제 데이터 변화로 이어지려면 백엔드 API가 날짜 파라미터를 받아야 합니다.
      // 현재 구현은 시각적 네비게이션과 기본 리포트 조회를 연동하는 구조입니다.

      const response = await fetch(
        `${API_BASE_URL}/api/v1/reports/glucose?period=WEEKLY`,
        { headers }
      );

      if (response.ok) {
        const data = (await response.json()) as GlucoseReportDto;
        setReport(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDate]);

  const handleMaxGlucosePress = async () => {
    if (!report?.maxGlucoseDateTime) {
      Alert.alert("알림", "최고 혈당 시간 정보가 없습니다.");
      return;
    }

    setModalVisible(true);
    setMealLoading(true);
    setMealRecord(null);

    const maxTime = new Date(report.maxGlucoseDateTime); // ISO 파싱
    const minTime = new Date(maxTime.getTime() - 2 * 60 * 60 * 1000); // 2시간 전

    // 3일 전인지 확인
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const isLocked = maxTime < threeDaysAgo;

    try {
      const headers = getAuthHeaders();
      const startIso = minTime.toISOString();
      const endIso = maxTime.toISOString();

      const response = await fetch(`${API_BASE_URL}/api/v1/meals/search?startDate=${startIso}&endDate=${endIso}`, { headers });
      if (response.ok) {
        const meals = (await response.json()) as MealResponse[];
        if (meals.length > 0) {
          setMealRecord(meals[0]); // 가장 최신/첫 번째 발견된 항목 선택
          setModalType('FOUND');
        } else {
          setModalType(isLocked ? 'NOT_FOUND_LOCKED' : 'NOT_FOUND_ADDABLE');
        }
      } else {
        setModalType(isLocked ? 'NOT_FOUND_LOCKED' : 'NOT_FOUND_ADDABLE');
      }
    } catch (e) {
      console.log(e);
      setModalType('NOT_FOUND_LOCKED'); // 기본 폴백
    } finally {
      setMealLoading(false);
    }
  };


  useFocusEffect(useCallback(() => { fetchReport(); }, [fetchReport]));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchReport(); }, [fetchReport]);

  const feedback = useMemo(() => {
    if (!report) return null;
    if (report.minGlucose > 0 && report.minGlucose < 70)
      return { type: "danger", title: "저혈당 주의", message: "이번 주 저혈당이 감지되었습니다.", icon: "warning" };
    if (report.maxGlucose > 200)
      return { type: "warning", title: "혈당 스파이크 주의", message: "고혈당 빈도가 높습니다.", icon: "trending-up" };
    if (report.timeInRange?.inRangePercent && report.timeInRange.inRangePercent >= 70)
      return { type: "success", title: "관리 상태 훌륭함", message: "아주 잘 관리하고 계세요!", icon: "check-circle" };
    return { type: "default", title: "꾸준한 기록이 중요해요", message: "데이터를 더 모아보세요.", icon: "info" };
  }, [report]);

  // 가로 막대용 TIR 데이터
  const tirData = useMemo(() => {
    if (!report?.timeInRange) return { low: 0, normal: 0, high: 0 };
    return {
      low: report.timeInRange.veryLowPercent + report.timeInRange.lowPercent,
      normal: report.timeInRange.inRangePercent,
      high: report.timeInRange.highPercent + report.timeInRange.veryHighPercent
    };
  }, [report]);

  // 헤더 텍스트
  const headerText = useMemo(() => {
    const end = weekDays[6];
    const today = new Date();
    const isCurrentWeek = isSameDay(end, getStartOfWeek(today)) || (end >= today && startOfWeek <= today);
    const displayEnd = (isCurrentWeek && end > today) ? today : end;
    const weekNum = Math.ceil((currentDate.getDate() + 6 - currentDate.getDay()) / 7);
    return `${currentDate.getMonth() + 1}월 ${weekNum}주차 (${startOfWeek.getMonth() + 1}.${startOfWeek.getDate()} ~ ${displayEnd.getMonth() + 1}.${displayEnd.getDate()}${isCurrentWeek ? ' 오늘' : ''})`;
  }, [weekDays, currentDate]);

  // 네비게이션 로직
  const moveWeek = (direction: -1 | 1) => {
    const newDate = addDays(currentDate, direction * 7);
    if (direction === 1 && isFuture(getStartOfWeek(newDate))) return;
    setCurrentDate(newDate);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      {/* --- 단순 헤더 --- */}
      <View style={styles.headerContainer}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => moveWeek(-1)} style={styles.navBtn}>
            <MaterialIcons name="chevron-left" size={28} color={palette.text} />
          </TouchableOpacity>

          <View style={styles.dateSelector}>
            <Text style={styles.headerTitle}>{headerText}</Text>
          </View>

          <TouchableOpacity onPress={toggleCalendar} style={styles.navBtn} activeOpacity={0.7}>
            <MaterialIcons name={isCalendarOpen ? "calendar-today" : "calendar-today"} size={24} color={isCalendarOpen ? palette.navy : palette.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => moveWeek(1)} style={[styles.navBtn, { position: 'absolute', right: 50 }]} disabled={isFuture(getStartOfWeek(addDays(currentDate, 7)))}>
            <MaterialIcons name="chevron-right" size={28} color={isFuture(getStartOfWeek(addDays(currentDate, 7))) ? "#E2E8F0" : palette.text} />
          </TouchableOpacity>
        </View>

        {/* --- 접이식 캘린더 영역 --- */}
        {isCalendarOpen && (
          <View style={styles.calendarContainer}>
            {/* 주간 행 */}
            <View style={styles.weekRow}>
              {weekDays.map((date, idx) => {
                const isFut = isFuture(date);
                const isActiveRange = idx <= rangeInfo.endIndex;
                const isRangeEnd = idx === rangeInfo.endIndex;
                const isStart = idx === 0;

                return (
                  <View key={idx} style={[
                    styles.dayItem,
                    isActiveRange && styles.dayItemRange,
                    isStart && styles.rangeStart,
                    isRangeEnd && styles.rangeEnd
                  ]}>
                    <Text style={[styles.dayText, isFut && styles.textDisabled, isRangeEnd && styles.textActiveStrong]}>
                      {["일", "월", "화", "수", "목", "금", "토"][idx]}
                    </Text>
                    <Text style={[styles.dateText, isFut && styles.textDisabled, isRangeEnd && styles.textActiveStrong]}>
                      {date.getDate()}
                    </Text>
                    {isRangeEnd && <View style={styles.todayDot} />}
                  </View>
                );
              })}
            </View>

            {/* 월간 그리드 */}
            <View style={styles.monthGrid}>
              {monthDays.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.monthDayCell,
                    isSameDay(d.date, currentDate) && styles.monthDaySelected
                  ]}
                  onPress={() => {
                    setCurrentDate(d.date);
                    // 선택 시 캘린더 닫기? (사용자가 탐색하고 싶을 수 있으므로 닫지 않음)
                  }}
                >
                  <Text style={[
                    styles.monthDayText,
                    !d.isCurrentMonth && styles.textDisabled,
                    isSameDay(d.date, currentDate) && styles.textWhite
                  ]}>
                    {d.date.getDate()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading && !report ? (
          <ActivityIndicator size="large" color={palette.accent} style={{ marginTop: 40 }} />
        ) : report ? (
          <>
            {/* 피드백 카드 */}
            {feedback && (
              <View style={[styles.card, styles.feedbackCard,
              feedback.type === 'danger' && { backgroundColor: palette.dangerBg, borderColor: palette.danger },
              feedback.type === 'warning' && { backgroundColor: palette.warningBg, borderColor: palette.warning },
              feedback.type === 'success' && { backgroundColor: palette.successBg, borderColor: palette.success },
              ]}>
                <View style={styles.feedbackHeader}>
                  <Ionicons name={feedback.icon as any} size={24} color={feedback.type === 'danger' ? palette.danger : feedback.type === 'warning' ? palette.accentDark : feedback.type === 'success' ? '#166534' : palette.textMuted} />
                  <Text style={[styles.feedbackTitle,
                  feedback.type === 'danger' && { color: palette.danger },
                  feedback.type === 'warning' && { color: palette.accentDark },
                  feedback.type === 'success' && { color: '#166534' },
                  ]}>{feedback.title}</Text>
                </View>
                <Text style={styles.feedbackMessage}>{feedback.message}</Text>
              </View>
            )}

            {/* 통계 그리드 */}
            <Text style={styles.sectionTitle}>핵심 수치</Text>
            <View style={styles.gridContainer}>
              <StatBox label="평균 혈당" value={report.averageGlucose} unit="mg/dL" />
              <StatBox label="변동성" value={report.standardDeviation?.toFixed(1)} unit="SD" />

              {/* 최고 혈당 인터랙션 트리거 */}
              <TouchableOpacity
                style={[styles.statCard, { borderColor: palette.warning, borderWidth: 1 }]}
                onPress={handleMaxGlucosePress}
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

            {/* 새로운 TIR 가로 막대 차트 */}
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

          </>
        ) : (
          <Text style={styles.emptyText}>데이터가 없습니다.</Text>
        )}
      </ScrollView>

      {/* 인터랙션 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {mealLoading ? (
              <ActivityIndicator size="large" color={palette.accent} />
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>최고 혈당 분석</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color={palette.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  {modalType === 'FOUND' && mealRecord ? (
                    <>
                      <Text style={styles.modalMessage}>이 시간에 드신 음식이 영향을 주었을 수 있어요.</Text>
                      <View style={styles.mealPrevCard}>
                        {mealRecord.imageUrl ? (
                          <Image source={{ uri: mealRecord.imageUrl }} style={styles.mealImage} />
                        ) : (
                          <View style={[styles.mealImage, { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="fast-food-outline" size={40} color={palette.textMuted} />
                          </View>
                        )}
                        <View style={styles.mealInfo}>
                          <Text style={styles.mealName}>{mealRecord.foodName || mealRecord.memo || "식사 기록"}</Text>
                          <Text style={styles.mealTime}>
                            {new Date(mealRecord.eatenAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 섭취
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : modalType === 'NOT_FOUND_ADDABLE' ? (
                    <>
                      <View style={styles.iconCircle}>
                        <Ionicons name="pencil" size={32} color={palette.accentDark} />
                      </View>
                      <Text style={styles.modalMessageStrong}>기록된 식사가 없어요</Text>
                      <Text style={styles.modalMessage}>혈당이 오르기 2시간 전(예상)에 무엇을 드셨나요? 지금 기록하면 AI가 분석해드릴게요.</Text>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => {
                          setModalVisible(false);
                          router.push("/(tabs)/meal");
                        }}
                      >
                        <Text style={styles.actionBtnText}>식사 입력하기</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={[styles.iconCircle, { backgroundColor: '#f1f5f9' }]}>
                        <Ionicons name="lock-closed" size={32} color={palette.textMuted} />
                      </View>
                      <Text style={styles.modalMessageStrong}>분석 불가</Text>
                      <Text style={styles.modalMessage}>오래된 데이터라 식사 기록을 찾거나 추가할 수 없습니다.</Text>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const StatBox = ({ label, value, unit, highlight, tone }: any) => (
  <View style={[styles.statCard, highlight && { borderColor: tone === 'danger' ? palette.danger : palette.warning, borderWidth: 1 }]}>
    <Text style={[styles.statLabel, highlight && { color: tone === 'danger' ? palette.danger : palette.warning }]}>{label}</Text>
    <View style={styles.valueRow}>
      <Text style={[styles.statValue, highlight && { color: tone === 'danger' ? palette.danger : palette.warning }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  container: { padding: 20, paddingBottom: 60 },

  // 헤더
  headerContainer: { backgroundColor: palette.card, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, zIndex: 10 },
  navRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, position: 'relative' },
  navBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: palette.text },
  dateSelector: { flexDirection: "row", alignItems: "center", padding: 8 }, // Centered

  // 접이식 캘린더
  calendarContainer: { paddingBottom: 16 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20 },
  dayItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 0 },
  dayItemRange: { backgroundColor: 'rgba(250, 204, 21, 0.2)' },
  rangeStart: { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  rangeEnd: { borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  dayText: { fontSize: 12, color: palette.textMuted, marginBottom: 4 },
  dateText: { fontSize: 16, fontWeight: "700", color: palette.text },
  textActiveStrong: { color: palette.navy },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: palette.navy, marginTop: 4 },
  textDisabled: { opacity: 0.3 },
  textWhite: { color: "#fff" },

  // 월간 그리드
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, marginTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  monthDayCell: { width: (width - 20) / 7, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  monthDaySelected: { backgroundColor: palette.navy },
  monthDayText: { fontSize: 14, fontWeight: '600', color: palette.text },

  // 카드
  card: { backgroundColor: palette.card, borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: palette.border },

  feedbackCard: { borderLeftWidth: 4, },
  feedbackHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  feedbackTitle: { fontSize: 16, fontWeight: "700", marginLeft: 8 },
  feedbackMessage: { color: "#334155", fontSize: 14, lineHeight: 20 },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: palette.text, marginBottom: 12 },

  gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 },
  statCard: {
    width: "48%",
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statLabel: { fontSize: 12, color: palette.textMuted, marginBottom: 8, fontWeight: "600" },
  valueRow: { flexDirection: "row", alignItems: "baseline" },
  statValue: { fontSize: 24, fontWeight: "800", color: palette.text, marginRight: 4 },
  statUnit: { fontSize: 12, color: palette.textMuted },
  emptyText: { textAlign: "center", marginTop: 40, color: palette.textMuted },

  // TIR 바
  tirBarContainer: { flexDirection: 'row', height: 24, width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  tirSegment: { height: '100%' },
  tirLegendContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: palette.textMuted, fontWeight: '600' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: palette.text },
  modalBody: { alignItems: 'center', paddingBottom: 20 },

  modalMessageStrong: { fontSize: 18, fontWeight: '700', color: palette.text, marginTop: 12, marginBottom: 8 },
  modalMessage: { fontSize: 15, color: palette.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },

  mealPrevCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, width: '100%' },
  mealImage: { width: 60, height: 60, borderRadius: 12, marginRight: 16 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 4 },
  mealTime: { fontSize: 13, color: palette.textMuted },

  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: palette.warningBg, justifyContent: 'center', alignItems: 'center', marginBottom: 0 },
  actionBtn: { backgroundColor: palette.navy, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

});
