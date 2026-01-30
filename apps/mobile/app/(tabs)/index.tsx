import React from "react";
import {
  Dimensions,
  Platform,
  Pressable,
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
import Svg, { Circle, Line, Path } from "react-native-svg";
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
  aiGuide?: string | null;
  calories?: number | null;
  carbs?: number | null;
  protein?: number | null;
  fat?: number | null;
  foodName?: string | null;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatMonthLabel = (date: Date) =>
  `${date.getFullYear()}.${pad2(date.getMonth() + 1)}`;

const getMonthMatrix = (year: number, month: number, startOnSunday = true) => {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startOffset = startOnSunday ? first.getDay() : (first.getDay() + 6) % 7;

  const cells: Array<number | null> = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
};

const formatDateLabel = (date: Date) =>
  `${date.getMonth() + 1}월 ${date.getDate()}일(${weekdays[date.getDay()]})`;

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

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

const formatMealTime = (date: Date) => {
  const hour = date.getHours();
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${displayHour}:${pad2(date.getMinutes())}`;
};

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

const roundToFiveMinutes = (date: Date) => {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const floored = Math.floor(minutes / 5) * 5;
  rounded.setMinutes(floored, 0, 0);
  return rounded;
};

const formatKoreanTime = (date: Date) => {
  const hour = date.getHours();
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${displayHour}시`;
};

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

const softenColor = (color: string, alpha = 0.35) => {
  const match = color.match(
    /rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)/
  );
  if (!match) return color;
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
};

export default function HomeScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [tempDate, setTempDate] = React.useState(new Date());
  const [calendarMonth, setCalendarMonth] = React.useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const dateLabel = formatDateLabel(selectedDate);
  const scrollRef = React.useRef<ScrollView | null>(null);
  const scrollXRef = React.useRef(0);
  const [points, setPoints] = React.useState<GlucosePoint[]>([]);
  const [rangeStart, setRangeStart] = React.useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = React.useState<Date | null>(null);
  const [latestPoint, setLatestPoint] = React.useState<GlucosePoint | null>(null);
  const [targetRange, setTargetRange] = React.useState({ min: 70, max: 140 });
  const [diabetesType, setDiabetesType] = React.useState<string | null>(null);
  const [sensorConnected, setSensorConnected] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
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

  const openDatePicker = () => {
    setTempDate(selectedDate);
    setCalendarMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    );
    setShowDatePicker(true);
  };

  const moveCalendarMonth = (direction: "prev" | "next") => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === "prev" ? -1 : 1));
      return next;
    });
  };

  const selectCalendarDay = (day: number) => {
    const next = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day
    );
    const today = startOfDay(new Date());
    if (next > today) return;
    setTempDate(next);
  };

  const confirmDate = () => {
    setSelectedDate(tempDate);
    setShowDatePicker(false);
  };

  const cancelDate = () => {
    setShowDatePicker(false);
  };

  const calendarCells = React.useMemo(
    () =>
      getMonthMatrix(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        true
      ),
    [calendarMonth]
  );

  const shiftDate = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + delta);
    const today = startOfDay(new Date());
    if (next > today) return;
    setSelectedDate(next);
  };

  const openAllMeals = () => {
    router.push("/(tabs)/meal");
  };

  const openMealDetail = (mealId?: number) => {
    router.push("/(tabs)/meal");
  };

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
    const profile = (await response.json()) as {
      diabetesType?: string | null;
      sensorConnected?: boolean | null;
    };
    const type = profile.diabetesType;
    setDiabetesType(type ?? null);
    setSensorConnected(Boolean(profile.sensorConnected));
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
    const dateKey = formatDateKey(selectedDate);
    const filtered = meals.filter((meal) => meal.eatenAt?.slice(0, 10) === dateKey);
    setTodayMeals(filtered);
  }, [selectedDate]);

  const loadInitial = React.useCallback(async () => {
    setIsLoading(true);
    setDidInitialScroll(false);
    try {
      const now = new Date();
      const end = isSameDay(selectedDate, now) ? now : endOfDay(selectedDate);
      const start = startOfDay(selectedDate);
      await fetchRealtime(start, end, "replace");
    } catch {
      // Ignore errors for now.
    } finally {
      setIsLoading(false);
    }
  }, [fetchRealtime, selectedDate]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const now = new Date();
      const end = isSameDay(selectedDate, now) ? now : endOfDay(selectedDate);
      const start = startOfDay(selectedDate);
      await fetchRealtime(start, end, "replace");
      await fetchMeals();
    } catch {
      // Ignore refresh errors.
    } finally {
      setIsRefreshing(false);
    }
  };

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
    }, [fetchMeals, fetchProfile])
  );

  React.useEffect(() => {
    void fetchMeals();
    void loadInitial();
  }, [fetchMeals, loadInitial]);

  const glucoseValues = React.useMemo(() => {
    if (!rangeStart || !rangeEnd) {
      const values = points
        .map((point) => {
          const numeric =
            typeof point.value === "number"
              ? point.value
              : point.value == null
                ? null
                : Number(point.value);
          return Number.isFinite(numeric) ? numeric : null;
        })
        .filter((value): value is number => typeof value === "number");
      return values.length > 0 ? values : [0];
    }

    const start = roundToFiveMinutes(rangeStart);
    const end = roundToFiveMinutes(rangeEnd);
    const stepMs = 5 * 60 * 1000;
    const bins: Date[] = [];
    for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
      bins.push(new Date(t));
    }

    const valueMap = new Map<number, number>();
    points.forEach((point) => {
      const when = parseLocalDateTime(point.measuredAt);
      if (!when) return;
      const rounded = roundToFiveMinutes(when).getTime();
      const numeric =
        typeof point.value === "number"
          ? point.value
          : point.value == null
            ? null
            : Number(point.value);
      if (!Number.isFinite(numeric)) return;
      valueMap.set(rounded, numeric);
    });

    return bins.map((bin) => valueMap.get(bin.getTime()) ?? null);
  }, [points, rangeEnd, rangeStart]);

  const xAxisMarks = React.useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const totalMs = rangeEnd.getTime() - rangeStart.getTime();
    if (totalMs <= 0) return [];
    const intervalMs = 2 * 60 * 60 * 1000;
    const firstMark = new Date(rangeStart.getTime());
    firstMark.setMinutes(0, 0, 0);
    if (firstMark < rangeStart) {
      firstMark.setHours(firstMark.getHours() + 1);
      firstMark.setMinutes(0, 0, 0);
    }
    const marks: Array<{ ratio: number; label: string }> = [];
    for (let t = firstMark.getTime(); t <= rangeEnd.getTime(); t += intervalMs) {
      const ratio = (t - rangeStart.getTime()) / totalMs;
      marks.push({ ratio, label: formatKoreanTime(new Date(t)) });
    }
    return marks;
  }, [rangeEnd, rangeStart]);

  const chartMin = 50;
  const chartStep = 50;
  const maxGlucoseValue = React.useMemo(() => {
    const values = glucoseValues.filter(
      (value): value is number => typeof value === "number"
    );
    return values.length > 0 ? Math.max(...values) : 200;
  }, [glucoseValues]);
  const chartMax = React.useMemo(() => {
    const rounded = Math.ceil(maxGlucoseValue / chartStep) * chartStep;
    return Math.max(200, rounded);
  }, [maxGlucoseValue]);
  const yAxisLabels = React.useMemo(() => {
    const labels: number[] = [];
    for (let value = chartMax; value >= chartMin; value -= chartStep) {
      labels.push(value);
    }
    return labels;
  }, [chartMax]);
  const plotHeight = 120;

  const hoursLoaded = React.useMemo(() => {
    if (!rangeStart || !rangeEnd) return hoursPerView;
    const diff = (rangeEnd.getTime() - rangeStart.getTime()) / 3600000;
    return Math.max(diff, hoursPerView);
  }, [rangeEnd, rangeStart]);

  const chartWidth = Math.max(hoursLoaded * pixelsPerHour, chartViewportWidth);

  const rangeBuckets = React.useMemo(() => {
    const isDiabetes = diabetesType === "TYPE1" || diabetesType === "TYPE2";
    if (isDiabetes) {
      return [
        { key: "veryHigh", min: 251, max: Infinity, color: "rgba(255, 92, 0, 0.95)" },
        { key: "high", min: 181, max: 250, color: "rgba(255, 156, 0, 0.95)" },
        { key: "normal", min: 70, max: 180, color: "rgba(170, 210, 255, 0.95)" },
        { key: "low", min: 54, max: 69, color: "rgba(255, 64, 129, 0.95)" },
        { key: "veryLow", min: -Infinity, max: 53, color: "rgba(255, 102, 178, 0.95)" },
      ];
    }
    return [
      { key: "veryHigh", min: 200, max: Infinity, color: "rgba(255, 92, 0, 0.95)" },
      { key: "high", min: 141, max: 199, color: "rgba(255, 156, 0, 0.95)" },
      { key: "normal", min: 70, max: 140, color: "rgba(170, 210, 255, 0.95)" },
      { key: "low", min: 55, max: 69, color: "rgba(255, 64, 129, 0.95)" },
      { key: "veryLow", min: -Infinity, max: 54, color: "rgba(255, 102, 178, 0.95)" },
    ];
  }, [diabetesType]);

  const toX = React.useCallback(
    (index: number, total: number) => {
      if (total <= 1) return 0;
      return (index / (total - 1)) * chartWidth;
    },
    [chartWidth]
  );

  const toY = React.useCallback(
    (value: number) => {
      const clamped = Math.min(chartMax, Math.max(chartMin, value));
      const ratio = (chartMax - clamped) / (chartMax - chartMin);
      return ratio * plotHeight;
    },
    [chartMax, chartMin, plotHeight]
  );

  const buildSmoothPath = React.useCallback((points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` Q ${cx} ${p0.y} ${p1.x} ${p1.y}`;
    }
    return d;
  }, []);

  const chartSegments = React.useMemo(() => {
    const length = glucoseValues.length;
    if (length === 0) return [];
    const getBucket = (value: number) =>
      rangeBuckets.find((bucket) => value >= bucket.min && value <= bucket.max) ?? null;
    const bucketMap = new Map(rangeBuckets.map((bucket) => [bucket.key, bucket]));

    const bucketKeys = glucoseValues.map((value) => {
      if (value == null) return null;
      const bucket = getBucket(value);
      return bucket ? bucket.key : null;
    });

    const runs: Array<{ key: string | null; start: number; end: number; length: number }> = [];
    let runStart = 0;
    while (runStart < length) {
      const key = bucketKeys[runStart];
      let runEnd = runStart;
      while (runEnd + 1 < length && bucketKeys[runEnd + 1] === key) {
        runEnd += 1;
      }
      runs.push({ key, start: runStart, end: runEnd, length: runEnd - runStart + 1 });
      runStart = runEnd + 1;
    }

    const minRunLength = 2;
    runs.forEach((run, index) => {
      if (run.key == null || run.length >= minRunLength) return;
      const prev = runs[index - 1];
      const next = runs[index + 1];
      const prevKey = prev && prev.key ? prev.key : null;
      const nextKey = next && next.key ? next.key : null;
      let replaceKey = prevKey;
      if (prevKey && nextKey) {
        replaceKey = prev.length >= next.length ? prevKey : nextKey;
      } else if (!prevKey) {
        replaceKey = nextKey;
      }
      if (!replaceKey) return;
      for (let i = run.start; i <= run.end; i += 1) {
        bucketKeys[i] = replaceKey;
      }
    });

    const segments: Array<{ color: string; path?: string; point?: { x: number; y: number } }> =
      [];
    let currentKey: string | null = null;
    let currentPoints: Array<{ x: number; y: number }> = [];
    let lastPoint: { x: number; y: number } | null = null;

    const flush = () => {
      if (!currentKey || currentPoints.length === 0) {
        currentKey = null;
        currentPoints = [];
        return;
      }
      const bucket = bucketMap.get(currentKey);
      if (!bucket) {
        currentKey = null;
        currentPoints = [];
        return;
      }
      if (currentPoints.length === 1) {
        segments.push({ color: bucket.color, point: currentPoints[0] });
      } else {
        const path = buildSmoothPath(currentPoints);
        if (path) {
          segments.push({ color: bucket.color, path });
        }
      }
      currentKey = null;
      currentPoints = [];
    };

    bucketKeys.forEach((key, index) => {
      const value = glucoseValues[index];
      if (value == null || !key) {
        flush();
        lastPoint = null;
        return;
      }
      const point = { x: toX(index, length), y: toY(value) };
      if (currentKey && key !== currentKey) {
        flush();
        currentKey = key;
        currentPoints = [];
        if (lastPoint) {
          currentPoints.push(lastPoint);
        }
      } else if (!currentKey) {
        currentKey = key;
      }
      currentPoints.push(point);
      lastPoint = point;
    });
    flush();

    return segments;
  }, [buildSmoothPath, glucoseValues, rangeBuckets, toX, toY]);

  const ghostSegments = React.useMemo(() => {
    const length = glucoseValues.length;
    if (length < 2) return [];
    const maxGapSteps = 6; // 30 minutes / 5-minute bins
    const getBucket = (value: number) =>
      rangeBuckets.find((bucket) => value >= bucket.min && value <= bucket.max) ?? null;
    const segments: Array<{ path: string; color: string }> = [];
    let lastIndex: number | null = null;
    let lastValue: number | null = null;

    for (let i = 0; i < length; i += 1) {
      const value = glucoseValues[i];
      if (value == null) continue;
      if (lastIndex != null && lastValue != null) {
        const diff = i - lastIndex;
        if (diff > 1 && diff <= maxGapSteps) {
          const points: Array<{ x: number; y: number }> = [];
          for (let step = 0; step <= diff; step += 1) {
            const t = step / diff;
            const interpolated = lastValue + (value - lastValue) * t;
            points.push({ x: toX(lastIndex + step, length), y: toY(interpolated) });
          }
          const path = buildSmoothPath(points);
          if (path) {
            const bucket = getBucket(lastValue);
            const color = bucket
              ? softenColor(bucket.color, 0.35)
              : "rgba(148, 163, 184, 0.45)";
            segments.push({ path, color });
          }
        }
      }
      lastIndex = i;
      lastValue = value;
    }
    return segments;
  }, [buildSmoothPath, glucoseValues, rangeBuckets, toX, toY]);

  const validPointCount = React.useMemo(
    () => glucoseValues.filter((value) => value != null).length,
    [glucoseValues]
  );

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

  const heroTitle = "현재 혈당";
  const heroValue = latestValue == null ? "--" : `${latestValue}`;
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
            <View style={styles.headerDateRow}>
              <Pressable style={styles.headerNavButton} onPress={() => shiftDate(-1)}>
                <Text style={styles.headerNavText}>{"<"}</Text>
              </Pressable>
              <TouchableOpacity onPress={openDatePicker} activeOpacity={0.8}>
                <Text style={styles.headerTitle}>{dateLabel}</Text>
              </TouchableOpacity>
              <Pressable
                style={styles.headerNavButton}
                onPress={() => shiftDate(1)}
                disabled={isSameDay(selectedDate, new Date())}
              >
                <Text
                  style={[
                    styles.headerNavText,
                    isSameDay(selectedDate, new Date()) && styles.headerNavTextDisabled,
                  ]}
                >
                  {">"}
                </Text>
              </Pressable>
            </View>
            <View style={styles.headerActions}>
              {sensorConnected ? (
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>실시간 측정 중</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.statusBadgeInactive]}>
                  <View style={[styles.statusDot, styles.statusDotInactive]} />
                  <Text style={styles.statusText}>센서 미연결</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroLabel}>{heroTitle}</Text>
              <TouchableOpacity
                style={[styles.heroPill, isRefreshing && styles.refreshButtonDisabled]}
                onPress={handleRefresh}
                disabled={isRefreshing}
              >
                <Text style={styles.heroPillText}>
                  {isRefreshing ? "새로고침..." : "새로고침"}
                </Text>
              </TouchableOpacity>
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
                <View style={[styles.chartScrollFrame, { width: chartWidth }]}>
                  <Svg width={chartWidth} height={plotHeight} style={styles.heroChartCanvas}>
                    {yAxisLabels.map((label) => (
                      <Line
                        key={`grid-${label}`}
                        x1={0}
                        x2={chartWidth}
                        y1={toY(label)}
                        y2={toY(label)}
                        stroke="rgba(148, 163, 184, 0.2)"
                        strokeWidth={1}
                      />
                    ))}
                    {ghostSegments.map((segment, index) => (
                      <Path
                        key={`ghost-${index}`}
                        d={segment.path}
                        stroke={segment.color}
                        strokeWidth={3}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                    {chartSegments.map((segment, index) =>
                      segment.path ? (
                        <Path
                          key={`path-${index}`}
                          d={segment.path}
                          stroke={segment.color}
                          strokeWidth={3}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : (
                        <Circle
                          key={`dot-${index}`}
                          cx={segment.point?.x ?? 0}
                          cy={segment.point?.y ?? 0}
                          r={3}
                          fill={segment.color}
                        />
                      )
                    )}
                  </Svg>
                  <View pointerEvents="none" style={styles.chartXAxisRow}>
                    {xAxisMarks.map((mark) => (
                      <Text
                        key={`${mark.label}-${mark.ratio}`}
                        style={[
                          styles.chartXAxisText,
                          { left: Math.max(0, Math.min(chartWidth - 40, chartWidth * mark.ratio - 18)) },
                        ]}
                      >
                        {mark.label}
                      </Text>
                    ))}
                  </View>
                </View>
              </ScrollView>
              <View pointerEvents="none" style={styles.chartYAxis}>
                {yAxisLabels.map((label) => (
                  <Text key={label} style={styles.chartYAxisText}>
                    {label}
                  </Text>
                ))}
              </View>
              {validPointCount <= 2 && (
                <Text style={styles.chartHint}>
                  데이터가 더 쌓이면 추세선이 표시돼요.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>적정 혈당 유지율</Text>
              <Text style={styles.statValue}>
                {stats.tir == null ? "--" : `${stats.tir}%`}
              </Text>
              <Text style={styles.statHint}>
                {targetRange.min}-{targetRange.max} mg/dL
              </Text>
            </View>
            <View style={[styles.statCard, styles.statCardSpacing]}>
              <Text style={styles.statLabel}>일일 피크</Text>
              <Text style={styles.statValue}>
                {stats.max == null ? "--" : stats.max}
              </Text>
              <Text
                style={styles.statHint}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                최근 24시간 최고치
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>평균 혈당</Text>
              <Text style={styles.statValue}>
                {stats.average == null ? "--" : stats.average}
              </Text>
              <Text style={styles.statHint}>최근 24시간 평균</Text>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>기록</Text>
            <Pressable style={styles.sectionLink} onPress={openAllMeals}>
              <Text style={styles.sectionLinkText}>더보기</Text>
              <Text style={styles.sectionLinkChevron}>›</Text>
            </Pressable>
          </View>

          {todayMeals.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>등록된 식단이 없어요</Text>
              <Text style={styles.cardDesc}>
                식단 탭에서 사진을 추가하고 혈당 변화를 확인해보세요.
              </Text>
              <TouchableOpacity style={styles.callout} onPress={openAllMeals}>
                <Text style={styles.calloutText}>식단 기록하러 가기 →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mealCardList}>
              {todayMeals.slice(0, 2).map((meal) => {
                const eaten = parseLocalDateTime(meal.eatenAt ?? null);
                const timeLabel = eaten ? formatMealTime(eaten) : "--:--";
                const title = meal.memo || meal.foodName || "기록 완료";
                const caloriesText =
                  meal.calories != null ? `${meal.calories}kcal` : "--kcal";
                const macroPercents = calcMacroPercents(
                  meal.carbs,
                  meal.protein,
                  meal.fat
                );
                const macroText = macroPercents
                  ? `탄 ${macroPercents.carbPercent}% · 단 ${macroPercents.proteinPercent}% · 지 ${macroPercents.fatPercent}%`
                  : "탄 --% · 단 --% · 지 --%";
                return (
                  <Pressable
                    key={meal.mealId ?? `${meal.eatenAt}-${meal.mealType}`}
                    style={styles.mealCard}
                    onPress={() => openMealDetail(meal.mealId)}
                  >
                    <View style={styles.mealCardHeader}>
                      <Text style={styles.mealTitle} numberOfLines={1}>
                        {title}
                      </Text>
                      <Text style={styles.mealCalories}>{caloriesText}</Text>
                    </View>
                    <Text style={styles.mealTimeLabel}>{timeLabel}</Text>
                    <Text style={styles.mealMacroText}>{macroText}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {isLoading && (
            <Text style={styles.loadingText}>혈당 데이터를 불러오는 중...</Text>
          )}
          {isLoadingMore && (
            <Text style={styles.loadingText}>과거 데이터를 추가로 불러오는 중...</Text>
          )}
        </View>
      </ScrollView>
      {showDatePicker && (
        <View style={styles.datePickerOverlay}>
          <Pressable style={styles.datePickerBackdrop} onPress={cancelDate} />
          <View style={styles.datePickerSheet}>
            <Text style={styles.datePickerTitle}>날짜 선택</Text>
            <View style={styles.datePickerWeekdays}>
              {weekdays.map((day, index) => (
                <Text
                  key={day}
                  style={[
                    styles.datePickerWeekday,
                    index === 0 && styles.datePickerSundayText,
                  ]}
                >
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.datePickerMonthRow}>
              <Pressable
                style={styles.datePickerMonthArrow}
                onPress={() => moveCalendarMonth("prev")}
              >
                <Text style={styles.datePickerMonthArrowText}>{"<"}</Text>
              </Pressable>
              <Text style={styles.datePickerMonthText}>
                {formatMonthLabel(calendarMonth)}
              </Text>
              <Pressable
                style={styles.datePickerMonthArrow}
                onPress={() => moveCalendarMonth("next")}
              >
                <Text style={styles.datePickerMonthArrowText}>{">"}</Text>
              </Pressable>
            </View>
            <View style={styles.datePickerCalendar}>
              {calendarCells.map((week, weekIndex) => (
                <View key={`calendar-week-${weekIndex}`} style={styles.datePickerWeekRow}>
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return (
                        <View
                          key={`calendar-empty-${dayIndex}`}
                          style={styles.datePickerDayCell}
                        />
                      );
                    }
                    const cellDate = new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth(),
                      day
                    );
                    const isSelected = isSameDay(cellDate, tempDate);
                    const isFuture = cellDate > startOfDay(new Date());
                    return (
                      <Pressable
                        key={`calendar-day-${dayIndex}`}
                        style={[
                          styles.datePickerDayCell,
                          isSelected && styles.datePickerDaySelected,
                          isFuture && styles.datePickerDayDisabled,
                        ]}
                        onPress={() => selectCalendarDay(day)}
                        disabled={isFuture}
                      >
                        <Text
                          style={[
                            styles.datePickerDayText,
                            dayIndex === 0 && styles.datePickerSundayText,
                            isSelected && styles.datePickerDayTextSelected,
                            isFuture && styles.datePickerDayTextDisabled,
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            <View style={styles.datePickerActions}>
              <Pressable style={styles.datePickerCancel} onPress={cancelDate}>
                <Text style={styles.datePickerCancelText}>취소</Text>
              </Pressable>
              <Pressable style={styles.datePickerApply} onPress={confirmDate}>
                <Text style={styles.datePickerApplyText}>적용</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
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
  headerDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerNavButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerNavText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  headerNavTextDisabled: { color: "rgba(148, 163, 184, 0.4)" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: palette.text },
  headerSubtitle: { color: palette.textMuted, marginTop: 4 },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  refreshButton: {
    backgroundColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshText: { color: palette.ink, fontSize: 12, fontWeight: "700" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeInactive: {
    backgroundColor: "#E5E7EB",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  statusDotInactive: {
    backgroundColor: "#94A3B8",
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
    height: 170,
    marginTop: 16,
    backgroundColor: palette.navySoft,
    borderRadius: 16,
    justifyContent: "center",
    paddingVertical: 8,
    position: "relative",
  },
  chartScrollFrame: {
    height: 170,
    justifyContent: "flex-start",
    position: "relative",
  },
  heroChartCanvas: {
    borderRadius: 16,
  },
  chartYAxis: {
    position: "absolute",
    right: 10,
    top: 10,
    bottom: 28,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  chartYAxisText: {
    color: "rgba(226, 232, 240, 0.65)",
    fontSize: 11,
  },
  chartXAxisRow: {
    position: "relative",
    height: 18,
    marginTop: 6,
  },
  chartXAxisText: {
    position: "absolute",
    color: "rgba(248, 250, 252, 0.8)",
    fontSize: 10,
  },
  chartHint: {
    color: "rgba(226, 232, 240, 0.7)",
    fontSize: 11,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  datePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 7, 18, 0.72)",
    justifyContent: "flex-end",
  },
  datePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  datePickerSheet: {
    margin: 16,
    borderRadius: 28,
    padding: 18,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  datePickerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#E2E8F0",
    marginBottom: 16,
  },
  datePickerWeekdays: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  datePickerWeekday: {
    width: 36,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
  },
  datePickerSundayText: {
    color: "#F87171",
  },
  datePickerMonthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  datePickerMonthText: { fontSize: 18, fontWeight: "700", color: "#E2E8F0" },
  datePickerMonthArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerMonthArrowText: { color: "#E2E8F0", fontSize: 12 },
  datePickerCalendar: {
    marginBottom: 18,
  },
  datePickerWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  datePickerDayCell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerDaySelected: {
    backgroundColor: "#FACC15",
  },
  datePickerDayDisabled: {
    opacity: 0.35,
  },
  datePickerDayText: { color: "#E2E8F0", fontSize: 15 },
  datePickerDayTextSelected: { color: "#111827", fontWeight: "800" },
  datePickerDayTextDisabled: { color: "#94A3B8" },
  datePickerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  datePickerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    marginRight: 10,
  },
  datePickerCancelText: { color: "#CBD5F5", fontSize: 16, fontWeight: "700" },
  datePickerApply: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#FACC15",
  },
  datePickerApplyText: { color: "#111827", fontSize: 16, fontWeight: "800" },
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
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    marginTop: 18,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 12,
  },
  sectionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionLinkText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  sectionLinkChevron: {
    color: palette.textMuted,
    fontSize: 16,
    marginTop: -1,
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
  mealCardList: {
    gap: 14,
    marginBottom: 12,
  },
  mealCard: {
    backgroundColor: "#0F172A",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  mealCardHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  mealCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginRight: 14,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
  },
  mealImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
  },
  mealImagePlaceholderText: { fontSize: 22 },
  mealInfo: {
    flex: 1,
  },
  mealTypeBadge: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "700",
  },
  mealTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  mealCalories: {
    color: "#FACC15",
    fontSize: 15,
    fontWeight: "700",
  },
  mealTimeLabel: {
    color: "rgba(226, 232, 240, 0.7)",
    fontSize: 12,
    marginTop: 6,
  },
  mealMacroText: {
    color: "rgba(226, 232, 240, 0.6)",
    fontSize: 12,
    marginTop: 8,
  },
  mealDetailLink: {
    color: "rgba(226, 232, 240, 0.8)",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  mealGuide: {
    color: "rgba(226, 232, 240, 0.6)",
    fontSize: 12,
    marginTop: 12,
    lineHeight: 16,
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
