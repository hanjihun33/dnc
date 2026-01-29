import React from "react";
import {
  Dimensions,
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
import { useFocusEffect } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";
import { getAuthHeaders, loadAuthSession } from "../session";

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

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const { width: screenWidth } = Dimensions.get("window");
const chartViewportWidth = Math.max(screenWidth - 40, 260);
const hoursPerView = 3;
const pixelsPerHour = chartViewportWidth / hoursPerView;
const initialHours = 24;
const loadMoreHours = 12;
const maxPastDays = 7;

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

type GlucosePoint = {
  measuredAt: string | null;
  value: number | null;
  trend: string | null;
  trendRate: number | null;
};

type RealtimeResponse = {
  rangeStart: string;
  rangeEnd: string;
  targetMin: number;
  targetMax: number;
  latestMeasuredAt: string | null;
  latestValue: number | null;
  hasMore: boolean;
  points: GlucosePoint[];
};

type MealSummary = {
  mealId?: number;
  mealType?: string | null;
  eatenAt?: string | null;
  imageUrl?: string | null;
  memo?: string | null;
};

const mealTypeLabel: Record<string, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACK: "간식",
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatToday = () => {
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일 (${weekdays[now.getDay()]})`;
};

const formatLocalDateTime = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;

const parseLocalDateTime = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatClock = (date: Date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const formatMinutesAgo = (date: Date | null) => {
  if (!date) return "-";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return "방금 전";
  return `${minutes}분 전`;
};

const getTrendLabel = (trendRate?: number | null) => {
  if (trendRate == null) return "안정적인 흐름";
  if (trendRate >= 1.0) return "상승 중";
  if (trendRate <= -1.0) return "하강 중";
  return "안정적인 흐름";
};

const getTrendArrow = (trendRate?: number | null) => {
  if (trendRate == null) return "→";
  if (trendRate >= 1.0) return "↗";
  if (trendRate <= -1.0) return "↘";
  return "→";
};

const isWithinRange = (value: number, min: number, max: number) =>
  value >= min && value <= max;

export default function HomeScreen() {
  const router = useRouter();
  const todayLabel = formatToday();
  const scrollRef = React.useRef<ScrollView | null>(null);
  const scrollXRef = React.useRef(0);
  const [points, setPoints] = React.useState<GlucosePoint[]>([]);
  const [rangeStart, setRangeStart] = React.useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = React.useState<Date | null>(null);
  const [latestPoint, setLatestPoint] = React.useState<GlucosePoint | null>(null);
  const [targetRange, setTargetRange] = React.useState({ min: 70, max: 140 });
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [didInitialScroll, setDidInitialScroll] = React.useState(false);
  const [todayMeals, setTodayMeals] = React.useState<MealSummary[]>([]);

  const mergePoints = React.useCallback(
    (incoming: GlucosePoint[], mode: "replace" | "prepend") => {
      setPoints((prev) => {
        const combined = mode === "replace" ? incoming : [...incoming, ...prev];
        const map = new Map<string, GlucosePoint>();
        combined.forEach((point) => {
          if (!point.measuredAt) return;
          map.set(point.measuredAt, point);
        });
        const sorted = Array.from(map.values()).sort((a, b) => {
          const timeA = parseLocalDateTime(a.measuredAt)?.getTime() ?? 0;
          const timeB = parseLocalDateTime(b.measuredAt)?.getTime() ?? 0;
          return timeA - timeB;
        });
        const latest = sorted[sorted.length - 1];
        setLatestPoint(latest ?? null);
        return sorted;
      });
    },
    []
  );

  const fetchRealtime = React.useCallback(
    async (start: Date, end: Date, mode: "replace" | "prepend") => {
      await loadAuthSession();
      const startParam = formatLocalDateTime(start);
      const endParam = formatLocalDateTime(end);
      const response = await fetch(
        `${API_BASE_URL}/api/v1/glucose/realtime?start=${encodeURIComponent(
          startParam
        )}&end=${encodeURIComponent(endParam)}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) {
        throw new Error("혈당 데이터를 불러오지 못했습니다.");
      }
      const payload = (await response.json()) as RealtimeResponse;
      mergePoints(payload.points ?? [], mode);
      setHasMore(payload.hasMore);
      setTargetRange({ min: payload.targetMin ?? 70, max: payload.targetMax ?? 140 });
      if ((!payload.points || payload.points.length === 0) && (payload.latestMeasuredAt || payload.latestValue != null)) {
        setLatestPoint({
          measuredAt: payload.latestMeasuredAt,
          value: payload.latestValue ?? null,
          trend: null,
          trendRate: null,
        });
      }
      const parsedStart = parseLocalDateTime(payload.rangeStart);
      const parsedEnd = parseLocalDateTime(payload.rangeEnd);
      if (mode === "replace") {
        setRangeStart(parsedStart);
        setRangeEnd(parsedEnd);
      } else if (parsedStart) {
        setRangeStart(parsedStart);
      }
    },
    [mergePoints]
  );

  const fetchProfile = React.useCallback(async () => {
    await loadAuthSession();
    const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) return;
    const profile = (await response.json()) as { diabetesType?: string | null };
    const type = profile.diabetesType;
    const max = type === "TYPE1" || type === "TYPE2" ? 180 : 140;
    setTargetRange({ min: 70, max });
  }, []);

  const fetchMeals = React.useCallback(async () => {
    await loadAuthSession();
    const response = await fetch(`${API_BASE_URL}/api/v1/meals`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) return;
    const meals = (await response.json()) as MealSummary[];
    const todayKey = formatLocalDateTime(new Date()).slice(0, 10);
    const filtered = meals.filter((meal) => meal.eatenAt?.slice(0, 10) === todayKey);
    setTodayMeals(filtered);
  }, []);

  const loadInitial = React.useCallback(async () => {
    setIsLoading(true);
    setDidInitialScroll(false);
    try {
      const end = new Date();
      const start = new Date(end.getTime() - initialHours * 60 * 60 * 1000);
      await fetchRealtime(start, end, "replace");
    } catch {
      // Ignore errors for now.
    } finally {
      setIsLoading(false);
    }
  }, [fetchRealtime]);

  const loadMore = React.useCallback(async () => {
    if (!rangeStart || !rangeEnd || isLoadingMore) return;
    const now = new Date();
    const earliestAllowed = new Date(
      now.getTime() - maxPastDays * 24 * 60 * 60 * 1000
    );
    let nextStart = new Date(rangeStart.getTime() - loadMoreHours * 60 * 60 * 1000);
    if (nextStart < earliestAllowed) {
      nextStart = earliestAllowed;
    }
    if (nextStart >= rangeStart) {
      setHasMore(false);
      return;
    }
    setIsLoadingMore(true);
    const addedHours = (rangeStart.getTime() - nextStart.getTime()) / 3600000;
    const addedWidth = addedHours * pixelsPerHour;
    try {
      await fetchRealtime(nextStart, rangeStart, "prepend");
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          x: scrollXRef.current + addedWidth,
          animated: false,
        });
      });
    } catch {
      // Ignore load-more errors.
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchRealtime, isLoadingMore, rangeEnd, rangeStart]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchProfile();
      void fetchMeals();
      void loadInitial();
    }, [fetchMeals, fetchProfile, loadInitial])
  );

  const glucoseValues = React.useMemo(() => {
    const values = points
      .map((point) => point.value)
      .filter((value): value is number => typeof value === "number");
    return values.length > 0 ? values : [0];
  }, [points]);

  const chartData = React.useMemo(
    () => ({
      labels: new Array(glucoseValues.length).fill(""),
      datasets: [{ data: glucoseValues }],
    }),
    [glucoseValues]
  );

  const hoursLoaded = React.useMemo(() => {
    if (!rangeStart || !rangeEnd) return hoursPerView;
    const diff = (rangeEnd.getTime() - rangeStart.getTime()) / 3600000;
    return Math.max(diff, hoursPerView);
  }, [rangeEnd, rangeStart]);

  const chartWidth = Math.max(hoursLoaded * pixelsPerHour, chartViewportWidth);

  const stats = React.useMemo(() => {
    if (points.length === 0) {
      return {
        average: null,
        max: null,
        min: null,
        tir: null,
      };
    }
    const now = new Date();
    const recentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentValues = points
      .map((point) => {
        const when = parseLocalDateTime(point.measuredAt);
        if (!when || when < recentStart) return null;
        return point.value;
      })
      .filter((value): value is number => typeof value === "number");

    if (recentValues.length === 0) {
      return { average: null, max: null, min: null, tir: null };
    }
    const sum = recentValues.reduce((acc, value) => acc + value, 0);
    const average = Math.round(sum / recentValues.length);
    const max = Math.max(...recentValues);
    const min = Math.min(...recentValues);
    const inRangeCount = recentValues.filter((value) =>
      isWithinRange(value, targetRange.min, targetRange.max)
    ).length;
    const tir = Math.round((inRangeCount / recentValues.length) * 100);
    return { average, max, min, tir };
  }, [points, targetRange.max, targetRange.min]);

  const latestMeasuredAt = parseLocalDateTime(latestPoint?.measuredAt ?? null);
  const latestValue = latestPoint?.value ?? null;
  const trendRate = latestPoint?.trendRate ?? null;

  const heroTitle = stats.average == null ? "최근 24시간 평균 혈당" : "최근 24시간 평균 혈당";
  const heroValue = stats.average == null ? "--" : `${stats.average}`;
  const heroHint = `${formatMinutesAgo(latestMeasuredAt)} · ${getTrendLabel(trendRate)}`;

  const onChartScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    scrollXRef.current = x;
    if (x < 40 && hasMore && !isLoadingMore) {
      void loadMore();
    }
  };

  React.useEffect(() => {
    if (!didInitialScroll && chartWidth > chartViewportWidth && points.length > 1) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          x: chartWidth - chartViewportWidth,
          animated: false,
        });
        setDidInitialScroll(true);
      });
    }
  }, [chartWidth, didInitialScroll, points.length]);

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
              <Text style={styles.headerTitle}>홈</Text>
              <Text style={styles.headerSubtitle}>{todayLabel}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>실시간 측정 중</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroLabel}>{heroTitle}</Text>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>
                  목표 {targetRange.min}-{targetRange.max}
                </Text>
              </View>
            </View>
            <View style={styles.heroValueRow}>
              <Text style={styles.heroValue}>{heroValue}</Text>
              <Text style={styles.heroUnit}>mg/dL</Text>
            </View>
            <Text style={styles.heroHint}>
              {latestMeasuredAt ? `마지막 측정 ${heroHint}` : "측정 데이터를 불러오는 중"}
            </Text>

            <View style={styles.heroChart}>
              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={onChartScroll}
                scrollEventThrottle={16}
              >
                <LineChart
                  data={chartData}
                  width={chartWidth}
                  height={120}
                  withDots={false}
                  withInnerLines={false}
                  withOuterLines={false}
                  withHorizontalLabels={false}
                  withVerticalLabels={false}
                  chartConfig={{
                    backgroundGradientFrom: palette.navySoft,
                    backgroundGradientTo: palette.navySoft,
                    decimalPlaces: 0,
                    color: () => "rgba(250, 204, 21, 0.9)",
                    strokeWidth: 2,
                  }}
                  bezier
                  style={styles.heroChartCanvas}
                />
              </ScrollView>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>목표 범위</Text>
              <Text style={styles.statValue}>
                {stats.tir == null ? "--" : `${stats.tir}%`}
              </Text>
              <Text style={styles.statHint}>
                {targetRange.min}-{targetRange.max} mg/dL
              </Text>
            </View>
            <View style={[styles.statCard, styles.statCardSpacing]}>
              <Text style={styles.statLabel}>식후 피크</Text>
              <Text style={styles.statValue}>
                {stats.max == null ? "--" : stats.max}
              </Text>
              <Text style={styles.statHint}>최근 24시간 최고치</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>현재 혈당</Text>
              <Text style={styles.statValue}>
                {latestValue == null ? "--" : latestValue}
              </Text>
              <Text style={styles.statHint}>{getTrendArrow(trendRate)}</Text>
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
            {todayMeals.length === 0 ? (
              <>
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
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>오늘 기록한 식단</Text>
                <View style={styles.mealList}>
                  {todayMeals.slice(0, 3).map((meal) => {
                    const eaten = parseLocalDateTime(meal.eatenAt ?? null);
                    const timeLabel = eaten ? formatClock(eaten) : "--:--";
                    const typeLabel = meal.mealType
                      ? mealTypeLabel[meal.mealType] ?? meal.mealType
                      : "식사";
                    return (
                      <View key={meal.mealId ?? `${meal.eatenAt}-${meal.mealType}`}>
                        <View style={styles.mealRow}>
                          <Text style={styles.mealTime}>{timeLabel}</Text>
                          <Text style={styles.mealType}>{typeLabel}</Text>
                          <Text style={styles.mealNote}>
                            {meal.memo ? meal.memo : "기록 완료"}
                          </Text>
                        </View>
                        <View style={styles.mealDivider} />
                      </View>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={styles.callout}
                  onPress={() => router.push("/(tabs)/meal")}
                >
                  <Text style={styles.calloutText}>전체 식단 보기 →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {isLoading && (
            <Text style={styles.loadingText}>혈당 데이터를 불러오는 중...</Text>
          )}
          {isLoadingMore && (
            <Text style={styles.loadingText}>과거 데이터를 추가로 불러오는 중...</Text>
          )}
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
    height: 140,
    marginTop: 16,
    backgroundColor: palette.navySoft,
    borderRadius: 16,
    justifyContent: "center",
    paddingVertical: 8,
  },
  heroChartCanvas: {
    borderRadius: 16,
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
  mealList: { marginTop: 12 },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealTime: { width: 64, color: palette.text, fontWeight: "700" },
  mealType: { width: 56, color: palette.textMuted },
  mealNote: { flex: 1, color: palette.textMuted },
  mealDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 8,
  },
  loadingText: {
    textAlign: "center",
    color: palette.textMuted,
    marginTop: 8,
    fontSize: 12,
  },
});
