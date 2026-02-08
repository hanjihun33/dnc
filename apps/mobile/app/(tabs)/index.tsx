import React from "react";

import {

  Dimensions,

  Image,

  Platform,

  Pressable,

  SafeAreaView,

  ScrollView,

  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  BackHandler,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { useFocusEffect } from "@react-navigation/native";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Svg, { Circle, Line, Path } from "react-native-svg";

import { getAuthHeaders, loadAuthSession } from "@/session";



const palette = {

  background: "#F4E8D6",

  card: "#F8F0E1",

  text: "#2F3B30",

  textMuted: "#6F7A6A",

  border: "#E6DCC6",

  accent: "#2F6B4F",

  accentDark: "#24573F",

  ink: "#233327",

  navy: "#233327",

  navySoft: "#2D3A30",

  mint: "#CFE6D4",

};



const API_BASE_URL =

  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";



const { width: screenWidth } = Dimensions.get("window");

const chartViewportWidth = Math.max(screenWidth - 32, 260);

const hoursPerView = 3;

const pixelsPerHour = chartViewportWidth / hoursPerView;

const loadMoreHours = 12;

const maxPastDays = 7;

const autoRefreshIntervalMs = 60_000;



const mealTypeLabels: Record<string, string> = {

  BREAKFAST: "아침",

  LUNCH: "점심",

  DINNER: "저녁",

  SNACK: "간식",

};



const weekdays = [

  "일",

  "월",

  "화",

  "수",

  "목",

  "금",

  "토",

];



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

  recordedAt?: string | null;

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



const getWeekStart = (date: Date, startOnSunday = true) => {

  const day = date.getDay();

  const offset = startOnSunday ? -day : (1 - day + 7) % 7;

  const start = new Date(date);

  start.setDate(date.getDate() + offset);

  return startOfDay(start);

};



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



const getMealTypeLabel = (value?: string | null) => {

  if (!value) return "";

  const key = value.toUpperCase();

  return mealTypeLabels[key] ?? value;

};



const getTrendLabel = (trendRate?: number | null) => {

  if (trendRate == null) return "안정적인 추세";

  if (trendRate >= 1.0) return "상승 중";

  if (trendRate <= -1.0) return "하락 중";

  return "안정적인 추세";

};



const getTrendArrow = (trendRate?: number | null) => {

  if (trendRate == null) return "-";

  if (trendRate >= 1.0) return "↑";

  if (trendRate <= -1.0) return "↓";

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



const getImageUrl = (url?: string | null) => {

  if (!url) return undefined;

  if (url.startsWith('/')) {

    return `${API_BASE_URL}${url}`;

  }

  return url;

};



export default function HomeScreen() {

  const router = useRouter();
  const insets = useSafeAreaInsets();

  // [Android] Double Back Press to Exit
  const [exitApp, setExitApp] = React.useState(false);
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (Platform.OS !== 'android') return false;

        if (exitApp) {
          return false; // let default behavior (exit) happen
        }

        setExitApp(true);
        ToastAndroid.show("'뒤로' 버튼을 한 번 더 누르면 종료됩니다.", ToastAndroid.SHORT);

        setTimeout(() => {
          setExitApp(false);
        }, 2000); // 2 seconds timeout

        return true; // prevent default behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [exitApp])
  );

  const [selectedDate, setSelectedDate] = React.useState(() =>

    startOfDay(new Date())

  );

  const [tempDate, setTempDate] = React.useState(() => startOfDay(new Date()));

  const [calendarMonth, setCalendarMonth] = React.useState(() => new Date());

  const [showDatePicker, setShowDatePicker] = React.useState(false);

  const dateLabel = formatDateLabel(selectedDate);
  const headerPaddingTop = Math.max(12, insets.top + 8);

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

  const [lastRefreshAt, setLastRefreshAt] = React.useState<Date | null>(null);

  const [hasMore, setHasMore] = React.useState(true);

  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);

  const [didInitialScroll, setDidInitialScroll] = React.useState(false);

  const [allMeals, setAllMeals] = React.useState<MealSummary[]>([]);

  const [todayMeals, setTodayMeals] = React.useState<MealSummary[]>([]);

  const orderedMeals = React.useMemo(() => {

    const orderMap: Record<string, number> = {

      BREAKFAST: 0,

      LUNCH: 1,

      DINNER: 2,

      SNACK: 3,

    };

    return [...todayMeals].sort((a, b) => {

      const orderA = orderMap[(a.mealType ?? "").toUpperCase()] ?? 99;

      const orderB = orderMap[(b.mealType ?? "").toUpperCase()] ?? 99;

      if (orderA !== orderB) return orderA - orderB;

      const timeA = parseLocalDateTime(a.eatenAt ?? null)?.getTime() ?? 0;

      const timeB = parseLocalDateTime(b.eatenAt ?? null)?.getTime() ?? 0;

      return timeA - timeB;

    });

  }, [todayMeals]);

  const mealCountsByDate = React.useMemo(() => {

    const counts: Record<string, number> = {};

    allMeals.forEach((meal) => {

      const parsed =

        parseLocalDateTime(meal.eatenAt ?? null) ??

        parseLocalDateTime(meal.recordedAt ?? null);

      if (!parsed) return;

      const key = formatDateKey(parsed);

      counts[key] = (counts[key] ?? 0) + 1;

    });

    return counts;

  }, [allMeals]);



  const weekDates = React.useMemo(() => {

    const start = getWeekStart(selectedDate, true);

    return Array.from({ length: 7 }).map((_, index) => {

      const next = new Date(start);

      next.setDate(start.getDate() + index);

      return next;

    });

  }, [selectedDate]);



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

        return sorted;
      });
    },
    []
  );

  React.useEffect(() => {
    if (points.length > 0) {
      const last = points[points.length - 1];
      setLatestPoint(last);
    }
  }, [points]);



  const openDatePicker = () => {

    setTempDate(startOfDay(selectedDate));

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

    const nextDay = startOfDay(next);

    const today = startOfDay(new Date());

    if (nextDay > today) return;

    setTempDate(nextDay);

  };



  const confirmDate = () => {

    setSelectedDate(startOfDay(tempDate));

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

    const nextDay = startOfDay(next);

    const today = startOfDay(new Date());

    if (nextDay > today) return;

    setSelectedDate(nextDay);

  };



  const openMealList = React.useCallback(() => {

    router.push("/(tabs)/meal-list");

  }, [router]);



  const openNotifications = React.useCallback(() => {

    router.push("/(tabs)/notifications");

  }, [router]);



  const fetchUnreadNotifications = React.useCallback(async () => {

    try {

      await loadAuthSession();

      const response = await fetch(

        `${API_BASE_URL}/api/v1/users/me/notifications?unreadOnly=true`,

        { headers: getAuthHeaders() }

      );

      if (!response.ok) {

        return;

      }

      const data = (await response.json()) as Array<{ readAt?: string | null }>;

      const unread = data.filter((item) => !item.readAt).length;

      setUnreadNotificationCount(unread);

    } catch {

      // Ignore badge errors.

    }

  }, []);



  const openMealRecord = () => {

    router.push("/(tabs)/meal");

  };



  const openMealDetail = (mealId?: number) => {

    if (!mealId) {

      router.push("/(tabs)/meal");

      return;

    }

    router.push({

      pathname: "/(tabs)/meal-detail",

      params: { mealId: String(mealId) },

    });

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

        throw new Error("혈당 데이터를 불러오지 못했어요.");

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
    const headers = getAuthHeaders();
    const dateKey = formatDateKey(selectedDate);

    const response = await fetch(`${API_BASE_URL}/api/v1/meals`, { headers });
    if (!response.ok) return;

    const meals = (await response.json()) as MealSummary[];
    setAllMeals(meals ?? []);

    const filtered = meals.filter((meal) => {
      const parsed = parseLocalDateTime(meal.eatenAt ?? null);
      return parsed ? formatDateKey(parsed) === dateKey : false;
    });
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
      await fetchMeals();

      setLastRefreshAt(new Date());

    } catch {

      // Ignore errors for now.

    } finally {

      setIsLoading(false);

    }

  }, [fetchRealtime, selectedDate]);

  /* Scroll to end when refreshed to avoid blank screen */
  React.useEffect(() => {
    if (lastRefreshAt) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [lastRefreshAt]);



  const handleRefresh = React.useCallback(async () => {

    if (isRefreshing) return;

    setIsRefreshing(true);

    try {

      const now = new Date();

      const end = isSameDay(selectedDate, now) ? now : endOfDay(selectedDate);

      const start = startOfDay(selectedDate);

      await fetchRealtime(start, end, "replace");

      await fetchMeals();

      setLastRefreshAt(new Date());

    } catch {

      // Ignore refresh errors.

    } finally {

      setIsRefreshing(false);

    }

  }, [fetchMeals, fetchRealtime, isRefreshing, selectedDate]);



  /* Add ref for synchronous locking */
  const isLoadingMoreRef = React.useRef(false);
  const isPrependingRef = React.useRef(false);
  const prependWidthRef = React.useRef(0);

  const loadMore = React.useCallback(async () => {
    if (!rangeStart || !rangeEnd || isLoadingMoreRef.current) return;

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

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const addedHours = (rangeStart.getTime() - nextStart.getTime()) / 3600000;
    const addedWidth = addedHours * pixelsPerHour;

    isPrependingRef.current = true;
    prependWidthRef.current = addedWidth;

    try {
      await fetchRealtime(nextStart, rangeStart, "prepend");
      // Scroll adjustment is now handled in onContentSizeChange
    } catch {
      isPrependingRef.current = false;
      // Ignore load-more errors.
    } finally {
      setIsLoadingMore(false);
      // Slight delay to prevent immediate re-trigger
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 500);
    }
  }, [fetchRealtime, rangeEnd, rangeStart]);



  useFocusEffect(

    React.useCallback(() => {
      // focus 시에는 프로필/알림만 가볍게 체크 (식사는 useEffect에서 담당)
      void fetchProfile();
      void fetchUnreadNotifications();
      void fetchMeals();
    }, [fetchProfile, fetchUnreadNotifications, fetchMeals])

  );



  useFocusEffect(

    React.useCallback(() => {

      if (!sensorConnected) {

        return undefined;

      }



      const intervalId = setInterval(() => {

        void handleRefresh();

      }, autoRefreshIntervalMs);



      return () => {

        clearInterval(intervalId);

      };

    }, [handleRefresh, sensorConnected])

  );



  useFocusEffect(

    React.useCallback(() => {

      const intervalId = setInterval(() => {

        setLastRefreshAt((prev) => (prev ? new Date(prev) : prev));

      }, 60_000);

      return () => {

        clearInterval(intervalId);

      };

    }, [])

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

      const point = { x: toX(index, length), y: toY(value as number) };

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

              : "rgba(107, 116, 102, 0.45)";

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

      <View pointerEvents="none" style={styles.backgroundLayer}>

        <View style={styles.backgroundTop} />

        <View style={styles.backgroundBottom} />

      </View>

      <StatusBar barStyle="dark-content" />

      <ScrollView

        style={styles.container}

        contentContainerStyle={{ paddingBottom: 24 }}

      >

        <View style={styles.page}>

          <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
            <View style={styles.headerSide} />
            <View style={styles.headerCenter}>
              <View style={styles.headerDateRow}>
                <Pressable
                  style={styles.headerNavButton}
                  onPress={() => shiftDate(-1)}
                >
                  <Ionicons name="chevron-back" size={16} color={palette.textMuted} />
                </Pressable>
                <TouchableOpacity onPress={openDatePicker} activeOpacity={0.8}>
                  <Text style={styles.headerTitle}>{dateLabel}</Text>
                </TouchableOpacity>
                <Pressable
                  style={styles.headerNavButton}
                  onPress={() => shiftDate(1)}
                  disabled={isSameDay(selectedDate, new Date())}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={
                      isSameDay(selectedDate, new Date())
                        ? "rgba(107, 116, 102, 0.45)"
                        : palette.textMuted
                    }
                  />
                </Pressable>
              </View>
            </View>
            <View style={[styles.headerSide, styles.headerSideRight]}>
              <TouchableOpacity
                style={styles.headerBell}
                onPress={openNotifications}
                accessibilityLabel="알림 센터"
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={palette.text}
                />
                {unreadNotificationCount > 0 && (
                  <View style={styles.headerBellBadge} />
                )}
              </TouchableOpacity>
            </View>
          </View>



          <View style={styles.weekStrip}>

            <ScrollView

              horizontal

              showsHorizontalScrollIndicator={false}

              contentContainerStyle={styles.weekStripContent}

            >

              {weekDates.map((date) => {

                const dayKey = formatDateKey(date);

                const isSelected = isSameDay(date, selectedDate);

                const isFuture = date > startOfDay(new Date());

                const mealCount = mealCountsByDate[dayKey] ?? 0;

                const dotCount = Math.min(mealCount, 4);

                return (

                  <Pressable

                    key={dayKey}

                    style={[

                      styles.weekDayCell,

                      isSelected && styles.weekDayCellSelected,

                      isFuture && styles.weekDayCellDisabled,

                    ]}

                    onPress={() => setSelectedDate(startOfDay(date))}

                    disabled={isFuture}

                  >

                    <Text

                      style={[

                        styles.weekDayNumber,

                        isSelected && styles.weekDayNumberSelected,

                        isFuture && styles.weekDayNumberDisabled,

                      ]}

                    >

                      {date.getDate()}

                    </Text>

                    <View

                      style={[

                        styles.weekDayDots,

                        isSelected && styles.weekDayDotsSelected,

                      ]}

                    >

                      {Array.from({ length: dotCount }).map((_, index) => (

                        <View

                          key={`${dayKey}-dot-${index}`}

                          style={[

                            styles.weekDayDot,

                            isSelected && styles.weekDayDotSelected,

                          ]}

                        />

                      ))}

                    </View>

                  </Pressable>

                );

              })}

            </ScrollView>

          </View>



          <View style={styles.heroCard}>

            <View style={styles.heroHeader}>

              <View style={styles.heroHeaderLeft}>

                <Text style={styles.heroLabel}>{heroTitle}</Text>

                <View style={styles.heroValueRow}>

                  <Text style={styles.heroValue}>{heroValue}</Text>

                  <Text style={styles.heroUnit}>mg/dL</Text>

                </View>

              </View>

              <View style={styles.heroHeaderRight}>

                <View

                  style={[

                    styles.statusInline,

                    !sensorConnected && styles.statusInlineInactive,

                  ]}

                >

                  <View

                    style={[

                      styles.statusInlineDot,

                      !sensorConnected && styles.statusInlineDotInactive,

                    ]}

                  />

                  <Text

                    style={[

                      styles.statusInlineText,

                      !sensorConnected && styles.statusInlineTextInactive,

                    ]}

                  >

                    {sensorConnected ? "측정 중" : "센서 미연결"}

                  </Text>

                </View>

                {sensorConnected && (

                  <TouchableOpacity

                    style={[

                      styles.refreshInline,

                      isRefreshing && styles.refreshInlineDisabled,

                    ]}

                    onPress={handleRefresh}

                    disabled={isRefreshing}

                  >

                    <Text

                      style={[

                        styles.refreshInlineText,

                        isRefreshing && styles.refreshInlineTextDisabled,

                      ]}

                    >

                      {lastRefreshAt

                        ? `${formatMinutesAgo(lastRefreshAt)} 업데이트`

                        : "업데이트"}

                    </Text>

                    <Text

                      style={[

                        styles.refreshInlineIcon,

                        isRefreshing && styles.refreshInlineTextDisabled,

                      ]}

                    >

                      ↺

                    </Text>

                  </TouchableOpacity>

                )}

              </View>

            </View>

            <Text style={styles.heroHint}>

              {!sensorConnected

                ? "센서가 연결되지 않았어요. 연결하면 실시간 혈당 그래프가 표시됩니다."

                : latestMeasuredAt

                  ? `마지막 측정 ${heroHint}`

                  : "측정 데이터를 불러오는 중"}

            </Text>



            <View style={styles.heroChart}>

              <ScrollView

                ref={scrollRef}

                horizontal

                showsHorizontalScrollIndicator={false}

                onScroll={onChartScroll}
                scrollEventThrottle={16}
                onContentSizeChange={(w, h) => {
                  if (isPrependingRef.current) {
                    isPrependingRef.current = false;
                    scrollRef.current?.scrollTo({
                      x: scrollXRef.current + prependWidthRef.current,
                      animated: false,
                    });
                  }
                }}
              >

                <View style={[styles.chartScrollFrame, { width: chartWidth }]}>

                  <Svg key={rangeEnd?.toString()} width={chartWidth} height={plotHeight} style={styles.heroChartCanvas}>

                    {yAxisLabels.map((label) => (

                      <Line

                        key={`grid-${label}`}

                        x1={0}

                        x2={chartWidth}

                        y1={toY(label)}

                        y2={toY(label)}

                        stroke="rgba(107, 116, 102, 0.25)"

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

                  {sensorConnected

                    ? "데이터가 부족하면 추세가 표시됩니다."

                    : "센서를 연결하면 실시간 추세가 표시됩니다."}

                </Text>

              )}

            </View>

          </View>



          <View style={styles.statsRow}>

            <View style={styles.statCard}>

              <Text style={styles.statLabel}>

                적정 혈당 비율

              </Text>

              <Text style={styles.statValue}>

                {stats.tir == null ? "--" : `${stats.tir}%`}

              </Text>

              <Text
                style={[styles.statHint, styles.statHintSingle]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                {targetRange.min}-{targetRange.max} mg/dL
              </Text>

            </View>

            <View style={[styles.statCard, styles.statCardSpacing]}>

              <Text style={styles.statLabel}>

                최고 혈당

              </Text>

              <Text style={styles.statValue}>

                {stats.max == null ? "--" : stats.max}

              </Text>

              <Text
                style={[styles.statHint, styles.statHintSingle]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                최근 24시간 최고치
              </Text>

            </View>

            <View style={styles.statCard}>

              <Text style={styles.statLabel}>

                평균 혈당

              </Text>

              <Text style={styles.statValue}>

                {stats.average == null ? "--" : stats.average}

              </Text>

              <Text
                style={[styles.statHint, styles.statHintSingle]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                최근 24시간 평균치
              </Text>

            </View>

          </View>



          <View style={styles.sectionHeaderRow}>

            <Text style={styles.sectionTitle}>기록</Text>

            <TouchableOpacity style={styles.sectionLink} onPress={openMealList}>

              <Text style={styles.sectionLinkText}>더보기</Text>

              <Ionicons name="chevron-forward" size={16} color={palette.accentDark} />

            </TouchableOpacity>

          </View>



          {orderedMeals.length === 0 ? (

            <View style={styles.card}>

              <Text style={styles.cardTitle}>

                기록된 식단이 없어요

              </Text>

              <Text style={styles.cardDesc}>

                식단 기록을 추가하면

                혈당 변화와 함께 확인할

                수 있어요.

              </Text>

              <TouchableOpacity style={styles.callout} onPress={openMealRecord}>

                <Text style={styles.calloutText}>

                  식단 기록하러 가기

                </Text>

              </TouchableOpacity>

            </View>

          ) : (

            <View style={styles.mealCardList}>

              {orderedMeals.slice(0, 4).map((meal) => {

                const eaten = parseLocalDateTime(meal.eatenAt ?? null);

                const timeLabel = eaten ? formatMealTime(eaten) : "--:--";

                const title = meal.foodName || meal.memo || "음식 이름 없음";

                const caloriesText =

                  meal.calories != null ? `${meal.calories}kcal` : "--kcal";

                const mealTypeLabel = getMealTypeLabel(meal.mealType);

                const macroPercents = calcMacroPercents(

                  meal.carbs,

                  meal.protein,

                  meal.fat

                );

                const macroValues = macroPercents ?? {

                  carbPercent: 0,

                  proteinPercent: 0,

                  fatPercent: 0,

                };

                const macroSum =

                  macroValues.carbPercent +

                  macroValues.proteinPercent +

                  macroValues.fatPercent;

                const macroFlex =

                  macroSum > 0

                    ? [

                      macroValues.carbPercent,

                      macroValues.proteinPercent,

                      macroValues.fatPercent,

                    ]

                    : [1, 1, 1];

                const macroLabels =

                  macroSum > 0

                    ? {

                      carbs: `${macroValues.carbPercent}%`,

                      protein: `${macroValues.proteinPercent}%`,

                      fat: `${macroValues.fatPercent}%`,

                    }

                    : { carbs: "--%", protein: "--%", fat: "--%" };



                return (

                  <Pressable

                    key={meal.mealId ?? `${meal.eatenAt}-${meal.mealType}`}

                    style={({ pressed }) => [

                      styles.mealCard,

                      pressed && styles.mealCardPressed,

                    ]}

                    onPress={() => openMealDetail(meal.mealId)}

                  >

                    <View style={styles.mealCardTopRow}>

                      {meal.imageUrl ? (

                        <Image

                          source={{ uri: getImageUrl(meal.imageUrl) }}

                          style={styles.mealImage}

                          resizeMode="cover"

                        />

                      ) : (

                        <View style={styles.mealImagePlaceholder}>

                          <Text style={styles.mealImagePlaceholderText}>IMG</Text>

                        </View>

                      )}

                      <View style={styles.mealInfo}>

                        {!!mealTypeLabel && (

                          <Text style={styles.mealTypeBadge}>{mealTypeLabel}</Text>

                        )}

                        <View style={styles.mealNameRow}>

                          <Text style={styles.mealCaloriesLarge}>{caloriesText}</Text>

                          <Text style={styles.mealNameDivider}>|</Text>

                          <Text style={styles.mealFoodName} numberOfLines={1}>

                            {title}

                          </Text>

                        </View>

                        <Text style={styles.mealTimeLabel}>{timeLabel}</Text>

                      </View>

                    </View>

                    <View style={styles.mealMacroBar}>

                      <View

                        style={[

                          styles.mealMacroSegment,

                          { flex: macroFlex[0], backgroundColor: "#8FBA8A" },

                        ]}

                      />

                      <View

                        style={[

                          styles.mealMacroSegment,

                          { flex: macroFlex[1], backgroundColor: "#E7D7A9" },

                        ]}

                      />

                      <View

                        style={[

                          styles.mealMacroSegment,

                          { flex: macroFlex[2], backgroundColor: "#A8C4E3" },

                        ]}

                      />

                    </View>

                    <View style={styles.mealMacroLegend}>

                      <View style={styles.mealMacroItem}>

                        <View

                          style={[styles.mealMacroDot, { backgroundColor: "#8FBA8A" }]}

                        />

                        <Text style={styles.mealMacroLabel}>

                          탄 {macroLabels.carbs}

                        </Text>

                      </View>

                      <View style={styles.mealMacroItem}>

                        <View

                          style={[styles.mealMacroDot, { backgroundColor: "#E7D7A9" }]}

                        />

                        <Text style={styles.mealMacroLabel}>

                          단 {macroLabels.protein}

                        </Text>

                      </View>

                      <View style={styles.mealMacroItem}>

                        <View

                          style={[styles.mealMacroDot, { backgroundColor: "#A8C4E3" }]}

                        />

                        <Text style={styles.mealMacroLabel}>

                          지 {macroLabels.fat}

                        </Text>

                      </View>

                    </View>

                  </Pressable>

                );

              })}

            </View>

          )}



          {isLoading && (

            <Text style={styles.loadingText}>

              혈당 데이터를 불러오는 중..

            </Text>

          )}

          {isLoadingMore && (

            <Text style={styles.loadingText}>

              과거 데이터를 추가로 불러오는 중..

            </Text>

          )}

        </View>

      </ScrollView>

      {showDatePicker && (

        <View style={styles.datePickerOverlay}>

          <Pressable style={styles.datePickerBackdrop} onPress={cancelDate} />

          <View style={styles.datePickerSheet}>

            <Text style={styles.datePickerTitle}>

              날짜 선택

            </Text>

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

                    const dayKey = formatDateKey(cellDate);

                    const mealCount = mealCountsByDate[dayKey] ?? 0;

                    const dotCount = Math.min(mealCount, 4);

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

                        {dotCount > 0 && (

                          <View style={styles.datePickerDotRow}>

                            {Array.from({ length: dotCount }).map((_, index) => (

                              <View

                                key={`calendar-dot-${dayKey}-${index}`}

                                style={[

                                  styles.datePickerDot,

                                  isSelected && styles.datePickerDotSelected,

                                ]}

                              />

                            ))}

                          </View>

                        )}

                      </Pressable>

                    );

                  })}

                </View>

              ))}

            </View>

            <View style={styles.datePickerActions}>

              <Pressable style={styles.datePickerCancel} onPress={cancelDate}>

                <Text style={styles.datePickerCancelText}>

                  취소

                </Text>

              </Pressable>

              <Pressable style={styles.datePickerApply} onPress={confirmDate}>

                <Text style={styles.datePickerApplyText}>

                  적용

                </Text>

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

  backgroundLayer: {

    ...StyleSheet.absoluteFillObject,

    zIndex: 0,

  },

  backgroundTop: {

    height: "44%",

    backgroundColor: palette.background,

  },

  backgroundBottom: {

    flex: 1,

    backgroundColor: palette.mint,

  },

  container: { flex: 1 },

  page: { paddingHorizontal: 16, paddingBottom: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerSide: {
    minWidth: 72,
    minHeight: 40,
    justifyContent: "center",
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },

  headerNavButton: {

    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor: "rgba(127, 175, 123, 0.22)",

    alignItems: "center",

    justifyContent: "center",

  },

  headerNavText: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },

  headerNavTextDisabled: { color: "rgba(107, 116, 102, 0.45)" },

  headerTitle: { fontSize: 18, fontWeight: "700", color: palette.text },

  headerSubtitle: { color: palette.textMuted, marginTop: 4 },

  headerBell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(127, 175, 123, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerBellBadge: {

    position: "absolute",

    top: 6,

    right: 6,

    width: 8,

    height: 8,

    borderRadius: 4,

    backgroundColor: "#D96D5B",

    borderWidth: 1,

    borderColor: palette.background,

  },

  weekStrip: {

    marginBottom: 16,

  },

  weekStripContent: {

    gap: 10,

    paddingVertical: 4,

    paddingHorizontal: 2,

  },

  weekDayCell: {

    width: 46,

    height: 66,

    borderRadius: 18,

    backgroundColor: palette.card,

    borderWidth: 1,

    borderColor: palette.border,

    alignItems: "center",

    justifyContent: "space-between",

    paddingVertical: 8,

  },

  weekDayCellSelected: {

    backgroundColor: palette.ink,

    borderColor: palette.ink,

    shadowColor: "#0B1220",

    shadowOpacity: 0.14,

    shadowRadius: 10,

    shadowOffset: { width: 0, height: 6 },

    elevation: 5,

  },

  weekDayCellDisabled: {

    opacity: 0.45,

  },

  weekDayNumber: {

    color: palette.text,

    fontSize: 16,

    fontWeight: "700",

  },

  weekDayNumberSelected: {

    color: palette.background,

  },

  weekDayNumberDisabled: {

    color: palette.textMuted,

  },

  weekDayDots: {

    flexDirection: "row",

    gap: 4,

    minHeight: 6,

  },

  weekDayDotsSelected: {},

  weekDayDot: {

    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: palette.accent,

  },

  weekDayDotSelected: {

    backgroundColor: palette.background,

  },

  refreshButton: {

    backgroundColor: palette.accent,

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

    backgroundColor: "#EFE9D9",

    paddingHorizontal: 12,

    paddingVertical: 6,

    borderRadius: 999,

  },

  statusBadgeInactive: {

    backgroundColor: "#F4EFE1",

  },

  statusDot: {

    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: palette.accent,

    marginRight: 6,

  },

  statusDotInactive: {

    backgroundColor: "#9BA28F",

  },

  statusText: { color: palette.text, fontSize: 12, fontWeight: "600" },

  heroCard: {

    backgroundColor: palette.card,

    borderRadius: 28,

    paddingHorizontal: 22,

    paddingTop: 18,

    paddingBottom: 22,

    marginBottom: 16,

    borderWidth: 1,

    borderColor: palette.border,

    shadowColor: "#0B1220",

    shadowOffset: { width: 0, height: 10 },

    shadowOpacity: 0.12,

    shadowRadius: 16,

    elevation: 6,

  },

  heroHeader: {

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "flex-start",

  },

  heroHeaderLeft: {

    gap: 6,

  },

  heroHeaderRight: {

    alignItems: "flex-end",

    gap: 6,

  },

  statusInline: {

    flexDirection: "row",

    alignItems: "center",

    gap: 6,

  },

  statusInlineInactive: {

    opacity: 0.7,

  },

  statusInlineDot: {

    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: palette.accent,

  },

  statusInlineDotInactive: {

    backgroundColor: "#9BA28F",

  },

  statusInlineText: {

    color: palette.text,

    fontSize: 11,

    fontWeight: "700",

  },

  statusInlineTextInactive: {

    color: palette.textMuted,

  },

  refreshInline: {

    flexDirection: "row",

    alignItems: "center",

    gap: 6,

  },

  refreshInlineDisabled: {

    opacity: 0.6,

  },

  refreshInlineText: {

    color: palette.textMuted,

    fontSize: 12,

    fontWeight: "600",

  },

  refreshInlineTextDisabled: {

    color: "#A5AE9C",

  },

  refreshInlineIcon: {

    color: palette.textMuted,

    fontSize: 12,

    fontWeight: "700",

  },

  heroLabel: {

    color: palette.textMuted,

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

  },

  heroValue: {

    color: palette.text,

    fontSize: 44,

    fontWeight: "800",

    marginRight: 6,

  },

  heroUnit: { color: palette.textMuted, fontSize: 16 },

  heroHint: {

    color: palette.textMuted,

    marginTop: 6,

    fontSize: 12,

  },

  heroChart: {

    height: 170,

    marginTop: 16,

    backgroundColor: palette.card,

    borderRadius: 16,

    borderWidth: 1,

    borderColor: palette.border,

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

    color: "rgba(31, 36, 31, 0.55)",

    fontSize: 11,

  },

  chartXAxisRow: {

    position: "relative",

    height: 18,

    marginTop: 6,

  },

  chartXAxisText: {

    position: "absolute",

    color: "rgba(31, 36, 31, 0.6)",

    fontSize: 10,

  },

  chartHint: {

    color: "rgba(31, 36, 31, 0.6)",

    fontSize: 11,

    marginTop: 8,

    paddingHorizontal: 8,

  },

  datePickerOverlay: {

    ...StyleSheet.absoluteFillObject,

    backgroundColor: "rgba(31, 36, 31, 0.35)",

    justifyContent: "flex-end",

  },

  datePickerBackdrop: {

    ...StyleSheet.absoluteFillObject,

  },

  datePickerSheet: {

    margin: 16,

    borderRadius: 28,

    padding: 18,

    backgroundColor: palette.card,

    borderWidth: 1,

    borderColor: "rgba(107, 116, 102, 0.2)",

  },

  datePickerTitle: {

    fontSize: 22,

    fontWeight: "800",

    color: palette.text,

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

    color: palette.textMuted,

    fontSize: 12,

  },

  datePickerSundayText: {

    color: "#C36B66",

  },

  datePickerMonthRow: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 10,

  },

  datePickerMonthText: { fontSize: 18, fontWeight: "700", color: palette.text },

  datePickerMonthArrow: {

    width: 34,

    height: 34,

    borderRadius: 17,

    backgroundColor: "rgba(127, 175, 123, 0.2)",

    alignItems: "center",

    justifyContent: "center",

  },

  datePickerMonthArrowText: { color: palette.text, fontSize: 12 },

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

    backgroundColor: palette.ink,

  },

  datePickerDayDisabled: {

    opacity: 0.35,

  },

  datePickerDayText: { color: palette.text, fontSize: 15 },

  datePickerDayTextSelected: { color: palette.background, fontWeight: "800" },

  datePickerDayTextDisabled: { color: "#A5AE9C" },

  datePickerDotRow: {

    position: "absolute",

    bottom: 4,

    flexDirection: "row",

    gap: 3,

  },

  datePickerDot: {

    width: 4,

    height: 4,

    borderRadius: 2,

    backgroundColor: palette.accent,

  },

  datePickerDotSelected: {

    backgroundColor: palette.background,

  },

  datePickerActions: {

    flexDirection: "row",

    alignItems: "center",

  },

  datePickerCancel: {

    flex: 1,

    paddingVertical: 12,

    borderRadius: 16,

    borderWidth: 1,

    borderColor: "rgba(107, 116, 102, 0.4)",

    alignItems: "center",

    backgroundColor: "#F9F5E9",

    marginRight: 10,

  },

  datePickerCancelText: { color: palette.text, fontSize: 16, fontWeight: "700" },

  datePickerApply: {

    flex: 1,

    paddingVertical: 12,

    borderRadius: 16,

    alignItems: "center",

    backgroundColor: palette.accent,

  },

  datePickerApplyText: { color: palette.ink, fontSize: 16, fontWeight: "800" },

  statsRow: {

    flexDirection: "row",

    justifyContent: "space-between",

    marginBottom: 8,

  },

  statCard: {

    flex: 1,

    backgroundColor: palette.card,

    borderRadius: 18,

    padding: Platform.OS === "android" ? 12 : 14,

    borderWidth: 1,

    borderColor: palette.border,

    minHeight: Platform.OS === "android" ? 126 : undefined,

    justifyContent: "space-between",

  },

  statCardSpacing: {

    marginHorizontal: Platform.OS === "android" ? 6 : 10,

  },

  statLabel: {

    color: palette.textMuted,

    fontSize: 12,

    fontWeight: "600",

    includeFontPadding: false,

    lineHeight: 17,

  },

  statValue: {

    color: palette.text,

    fontSize: 18,

    fontWeight: "700",

    marginTop: 6,

    includeFontPadding: false,

    lineHeight: 24,

  },

  statHint: {

    color: palette.textMuted,

    fontSize: Platform.OS === "android" ? 10 : 11,

    marginTop: 4,

    flexShrink: 1,

    includeFontPadding: false,

    lineHeight: Platform.OS === "android" ? 14 : 15,

  },
  statHintSingle: {
    letterSpacing: Platform.OS === "android" ? -0.2 : 0,
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

    marginTop: 0,

    marginBottom: 12,

  },

  sectionLink: {

    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    paddingHorizontal: 10,

    paddingVertical: 6,

    borderRadius: 999,

    backgroundColor: "#F9F5E9",

    borderWidth: 1,

    borderColor: "#E7E0CC",

  },

  sectionLinkText: {

    color: palette.accentDark,

    fontSize: 13,

    fontWeight: "600",

  },

  sectionLinkChevron: {

    color: palette.accentDark,

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

    backgroundColor: "#E6EDD8",

    color: "#F7F2E7",

    paddingHorizontal: 10,

    paddingVertical: 4,

    borderRadius: 999,

    fontSize: 12,

    fontWeight: "700",

    marginRight: 8,

  },

  callout: {

    marginTop: 12,

    backgroundColor: "#2F6B4F",

    borderRadius: 14,

    paddingVertical: 10,

    paddingHorizontal: 12,

  },

  calloutText: {

    color: "#F7F2E7",

    fontWeight: "700",

    fontSize: 13,

  },

  mealCardList: {

    gap: 14,

    marginBottom: 12,

  },

  mealCard: {

    backgroundColor: palette.card,

    borderRadius: 22,

    padding: 16,

    borderWidth: 1,

    borderColor: palette.border,

    shadowColor: "#0B1220",

    shadowOpacity: 0.18,

    shadowRadius: 14,

    shadowOffset: { width: 0, height: 8 },

    elevation: 6,

  },

  mealCardPressed: {

    opacity: 0.92,

    transform: [{ scale: 0.98 }],

    shadowOpacity: 0.08,

    shadowRadius: 6,

    elevation: 2,

  },

  mealCardTopRow: {

    flexDirection: "row",

    alignItems: "center",

    gap: 12,

  },

  mealCardHeader: {

    flexDirection: "row",

    alignItems: "baseline",

    justifyContent: "space-between",

    gap: 8,

  },

  mealNameRow: {

    flexDirection: "row",

    alignItems: "baseline",

    gap: 6,

    marginTop: 4,

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

    backgroundColor: "#EFE8D7",

  },

  mealImagePlaceholder: {

    width: 72,

    height: 72,

    borderRadius: 16,

    marginRight: 14,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#EFE8D7",

  },

  mealImagePlaceholderText: { fontSize: 22, color: palette.textMuted },

  mealInfo: {

    flex: 1,

  },

  mealTypeBadge: {

    color: palette.text,

    fontSize: 16,

    fontWeight: "700",

  },

  mealTitle: {

    color: palette.text,

    fontSize: 18,

    fontWeight: "700",

    flex: 1,

    marginRight: 8,

  },

  mealCalories: {

    color: palette.accentDark,

    fontSize: 15,

    fontWeight: "700",

  },

  mealCaloriesLarge: {

    color: palette.accentDark,

    fontSize: 18,

    fontWeight: "800",

  },

  mealFoodName: {

    color: palette.text,

    fontSize: 16,

    fontWeight: "600",

    flex: 1,

  },

  mealNameDivider: {

    color: palette.textMuted,

    fontSize: 14,

  },

  mealTimeLabel: {

    color: palette.textMuted,

    fontSize: 12,

    marginTop: 6,

  },

  mealMacroBar: {

    height: 8,

    borderRadius: 999,

    overflow: "hidden",

    backgroundColor: palette.border,

    flexDirection: "row",

    marginTop: 14,

  },

  mealMacroSegment: {

    height: "100%",

  },

  mealMacroLegend: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginTop: 10,

  },

  mealMacroItem: {

    flexDirection: "row",

    alignItems: "center",

    gap: 6,

  },

  mealMacroDot: {

    width: 8,

    height: 8,

    borderRadius: 4,

  },

  mealMacroLabel: {

    color: palette.textMuted,

    fontSize: 12,

    fontWeight: "600",

  },

  mealGuide: {

    color: palette.textMuted,

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



















