import React from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuthHeaders, loadAuthSession } from "@/session";

const palette = {
  background: "#FAF8F0",
  card: "#F6F1E3",
  text: "#1F241F",
  textMuted: "#6B7466",
  border: "#E7E0CC",
  accent: "#7FAF7B",
  accentDark: "#4E7C5B",
  ink: "#1F2A1F",
  navy: "#1F2A1F",
  navySoft: "#2F3B30",
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const mealTypeLabels: Record<string, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACK: "간식",
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const rangeOptions = [7, 14, 30, 60, 90] as const;

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

const parseLocalDateTime = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatSectionLabel = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${year}년 ${month}월 ${day}일(${weekday})`;
};

const formatMealTime = (date: Date) => {
  const hour = date.getHours();
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${displayHour}:${pad2(date.getMinutes())}`;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const addDays = (date: Date, diff: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + diff);
  return next;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getMonthMatrix = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startOffset = first.getDay();

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
  return cells;
};

const formatMonthLabel = (date: Date) =>
  `${date.getFullYear()}.${pad2(date.getMonth() + 1)}`;

const getMealTypeLabel = (value?: string | null) => {
  if (!value) return "";
  const key = value.toUpperCase();
  return mealTypeLabels[key] ?? value;
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

export default function MealListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [meals, setMeals] = React.useState<MealSummary[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [rangeDays, setRangeDays] = React.useState(30);
  const [endDate, setEndDate] = React.useState(() => startOfDay(new Date()));
  const [isRangePickerOpen, setIsRangePickerOpen] = React.useState(false);
  const [tempRangeDays, setTempRangeDays] = React.useState(rangeDays);
  const [tempEndDate, setTempEndDate] = React.useState(endDate);
  const [calendarMonth, setCalendarMonth] = React.useState(
    new Date(endDate.getFullYear(), endDate.getMonth(), 1)
  );

  const fetchMeals = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loadAuthSession();
      const response = await fetch(`${API_BASE_URL}/api/v1/meals`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("기록을 불러오지 못했어요.");
      }
      const data = (await response.json()) as MealSummary[];
      setMeals(data ?? []);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("기록을 불러오지 못했어요.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await fetchMeals();
    setIsRefreshing(false);
  };

  const openRangePicker = () => {
    setTempRangeDays(rangeDays);
    setTempEndDate(endDate);
    setCalendarMonth(new Date(endDate.getFullYear(), endDate.getMonth(), 1));
    setIsRangePickerOpen(true);
  };

  const closeRangePicker = () => {
    setIsRangePickerOpen(false);
  };

  const applyRangePicker = () => {
    setRangeDays(tempRangeDays);
    setEndDate(tempEndDate);
    setIsRangePickerOpen(false);
  };

  const moveCalendarMonth = (direction: "prev" | "next") => {
    setCalendarMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth(), 1);
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
    setTempEndDate(next);
  };

  const calendarCells = React.useMemo(
    () => getMonthMatrix(calendarMonth.getFullYear(), calendarMonth.getMonth()),
    [calendarMonth]
  );

  useFocusEffect(
    React.useCallback(() => {
      void fetchMeals();
    }, [fetchMeals])
  );

  const rangeLabel = React.useMemo(() => `최근 ${rangeDays}일`, [rangeDays]);

  const rangeStart = React.useMemo(
    () => startOfDay(addDays(endDate, -(rangeDays - 1))),
    [endDate, rangeDays]
  );

  const rangeEnd = React.useMemo(() => endOfDay(endDate), [endDate]);

  const filteredMeals = React.useMemo(
    () =>
      meals.filter((meal) => {
        const date =
          parseLocalDateTime(meal.eatenAt) ??
          parseLocalDateTime(meal.recordedAt);
        if (!date) return false;
        return date >= rangeStart && date <= rangeEnd;
      }),
    [meals, rangeEnd, rangeStart]
  );

  const groupedMeals = React.useMemo(() => {
    const sorted = [...filteredMeals].sort((a, b) => {
      const timeA =
        parseLocalDateTime(a.eatenAt) ??
        parseLocalDateTime(a.recordedAt) ??
        null;
      const timeB =
        parseLocalDateTime(b.eatenAt) ??
        parseLocalDateTime(b.recordedAt) ??
        null;
      const valueA = timeA ? timeA.getTime() : 0;
      const valueB = timeB ? timeB.getTime() : 0;
      return valueB - valueA;
    });

    const map = new Map<
      string,
      { key: string; label: string; items: MealSummary[] }
    >();

    sorted.forEach((meal) => {
      const date =
        parseLocalDateTime(meal.eatenAt) ??
        parseLocalDateTime(meal.recordedAt) ??
        null;
      const key = date ? formatDateKey(date) : "unknown";
      const label = date ? formatSectionLabel(date) : "날짜 미상";
      if (!map.has(key)) {
        map.set(key, { key, label, items: [] });
      }
      map.get(key)?.items.push(meal);
    });

    return Array.from(map.values());
  }, [filteredMeals]);

  const openMealRecord = () => {
    router.push("/(tabs)/meal");
  };

  const openMealDetail = (mealId?: number) => {
    if (!mealId) {
      return;
    }
    router.push({
      pathname: "/(tabs)/meal-detail",
      params: { mealId: String(mealId), from: "meal-list" },
    });
  };

  const headerPaddingTop = Math.max(12, insets.top + 8);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity style={styles.headerSide} onPress={router.back}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모든 기록</Text>
        <TouchableOpacity style={styles.headerSide} onPress={openMealRecord}>
          <Text style={styles.headerAction}>기록하기</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.rangeRow}>
        <TouchableOpacity style={styles.rangeButton} onPress={openRangePicker}>
          <Text style={styles.rangeText}>{rangeLabel}</Text>
          <Ionicons name="chevron-down" size={18} color={palette.accentDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={palette.textMuted}
          />
        }
      >
        {errorMessage ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>불러오기에 실패했어요</Text>
            <Text style={styles.cardDesc}>{errorMessage}</Text>
            <TouchableOpacity style={styles.callout} onPress={handleRefresh}>
              <Text style={styles.calloutText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : groupedMeals.length === 0 && !isLoading ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>기록된 식단이 없어요</Text>
            <Text style={styles.cardDesc}>
              식단 기록을 추가하면
              혈당 변화와 함께 확인할 수 있어요.
            </Text>
            <TouchableOpacity style={styles.callout} onPress={openMealRecord}>
              <Text style={styles.calloutText}>식단 기록하러 가기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groupedMeals.map((group) => (
            <View key={group.key} style={styles.section}>
              <Text style={styles.sectionTitle}>{group.label}</Text>
              <View style={styles.mealCardList}>
                {group.items.map((meal) => {
                  const eaten =
                    parseLocalDateTime(meal.eatenAt) ??
                    parseLocalDateTime(meal.recordedAt);
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
                            source={{ uri: meal.imageUrl }}
                            style={styles.mealImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.mealImagePlaceholder}>
                            <Text style={styles.mealImagePlaceholderText}>
                              IMG
                            </Text>
                          </View>
                        )}
                      <View style={styles.mealInfo}>
                        {!!mealTypeLabel && (
                          <Text style={styles.mealTypeBadge}>
                            {mealTypeLabel}
                          </Text>
                        )}
                          <View style={styles.mealNameRow}>
                            <Text style={styles.mealCaloriesLarge}>
                              {caloriesText}
                            </Text>
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
                            style={[
                              styles.mealMacroDot,
                              { backgroundColor: "#8FBA8A" },
                            ]}
                          />
                          <Text style={styles.mealMacroLabel}>
                            탄 {macroLabels.carbs}
                          </Text>
                        </View>
                        <View style={styles.mealMacroItem}>
                          <View
                            style={[
                              styles.mealMacroDot,
                              { backgroundColor: "#E7D7A9" },
                            ]}
                          />
                          <Text style={styles.mealMacroLabel}>
                            단 {macroLabels.protein}
                          </Text>
                        </View>
                        <View style={styles.mealMacroItem}>
                          <View
                            style={[
                              styles.mealMacroDot,
                              { backgroundColor: "#A8C4E3" },
                            ]}
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
            </View>
          ))
        )}
      </ScrollView>

      {isRangePickerOpen && (
        <Modal transparent animationType="slide" onRequestClose={closeRangePicker}>
          <View style={styles.modalContainer}>
            <Pressable style={styles.modalBackdrop} onPress={closeRangePicker} />
            <View style={styles.rangeSheet}>
            <View style={styles.rangeOptionRow}>
              {rangeOptions.map((days) => {
                const isSelected = tempRangeDays === days;
                return (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.rangeOption,
                      isSelected && styles.rangeOptionActive,
                    ]}
                    onPress={() => setTempRangeDays(days)}
                  >
                    <Text
                      style={[
                        styles.rangeOptionText,
                        isSelected && styles.rangeOptionTextActive,
                      ]}
                    >
                      {days}일
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => moveCalendarMonth("prev")}
              >
                <Ionicons name="chevron-back" size={16} color={palette.text} />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>{formatMonthLabel(calendarMonth)}</Text>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => moveCalendarMonth("next")}
              >
                <Ionicons name="chevron-forward" size={16} color={palette.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarWeekRow}>
              {weekdays.map((day, index) => (
                <Text
                  key={day}
                  style={[
                    styles.calendarWeekday,
                    index === 0 && styles.calendarWeekdaySunday,
                    index === 6 && styles.calendarWeekdaySaturday,
                  ]}
                >
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarCells.map((day, index) => {
                if (!day) {
                  return <View key={`empty-${index}`} style={styles.calendarCell} />;
                }
                const cellDate = new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                  day
                );
                const today = startOfDay(new Date());
                const rangeStartDate = startOfDay(
                  addDays(tempEndDate, -(tempRangeDays - 1))
                );
                const rangeEndDate = startOfDay(tempEndDate);
                const isFuture = cellDate > today;
                const inRange = cellDate >= rangeStartDate && cellDate <= rangeEndDate;
                const isStart = isSameDay(cellDate, rangeStartDate);
                const isEnd = isSameDay(cellDate, rangeEndDate);

                return (
                  <Pressable
                    key={`day-${index}`}
                    style={[
                      styles.calendarCell,
                      inRange && styles.calendarCellInRange,
                      (isStart || isEnd) && styles.calendarCellSelected,
                      isFuture && styles.calendarCellDisabled,
                    ]}
                    onPress={() => selectCalendarDay(day)}
                    disabled={isFuture}
                  >
                    <Text
                      style={[
                        styles.calendarCellText,
                        inRange && styles.calendarCellTextInRange,
                        (isStart || isEnd) && styles.calendarCellTextSelected,
                        isFuture && styles.calendarCellTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

              <View style={styles.rangeActions}>
                <TouchableOpacity style={styles.rangeCancel} onPress={closeRangePicker}>
                  <Text style={styles.rangeCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rangeApply} onPress={applyRangePicker}>
                  <Text style={styles.rangeApplyText}>적용</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerSide: {
    minWidth: 72,
    minHeight: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.text,
  },
  headerAction: {
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: palette.accentDark,
  },
  rangeRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  rangeButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F9F5E9",
    borderWidth: 1,
    borderColor: palette.border,
  },
  rangeText: {
    color: palette.accentDark,
    fontSize: 14,
    fontWeight: "600",
  },
  rangeChevron: {
    color: palette.accentDark,
    fontSize: 12,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(31, 36, 31, 0.35)",
  },
  rangeSheet: {
    backgroundColor: palette.card,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  rangeOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  rangeOption: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(107, 116, 102, 0.35)",
    alignItems: "center",
  },
  rangeOptionActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accentDark,
  },
  rangeOptionText: {
    color: palette.textMuted,
    fontWeight: "700",
    fontSize: 14,
  },
  rangeOptionTextActive: {
    color: palette.ink,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calendarNavButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(127, 175, 123, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarNavText: {
    color: palette.text,
    fontWeight: "700",
  },
  calendarTitle: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 16,
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarWeekday: {
    width: "14.2857%",
    textAlign: "center",
    color: palette.textMuted,
    fontSize: 12,
  },
  calendarWeekdaySunday: {
    color: "#C36B66",
  },
  calendarWeekdaySaturday: {
    color: "#6A8BB0",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: "14.2857%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderRadius: 8,
  },
  calendarCellInRange: {
    backgroundColor: "rgba(127, 175, 123, 0.2)",
  },
  calendarCellSelected: {
    backgroundColor: palette.accentDark,
  },
  calendarCellDisabled: {
    opacity: 0.3,
  },
  calendarCellText: {
    color: palette.text,
    fontSize: 14,
  },
  calendarCellTextInRange: {
    color: palette.text,
    fontWeight: "600",
  },
  calendarCellTextSelected: {
    color: palette.background,
    fontWeight: "800",
  },
  calendarCellTextDisabled: {
    color: "#A5AE9C",
  },
  rangeActions: {
    flexDirection: "row",
    marginTop: 16,
  },
  rangeCancel: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(107, 116, 102, 0.5)",
    alignItems: "center",
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: "#F9F5E9",
  },
  rangeCancelText: {
    color: palette.text,
    fontWeight: "700",
  },
  rangeApply: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: palette.accent,
    alignItems: "center",
    paddingVertical: 12,
  },
  rangeApplyText: {
    color: palette.ink,
    fontWeight: "800",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.textMuted,
    marginBottom: 10,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
  cardDesc: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  callout: {
    marginTop: 12,
    backgroundColor: "#F0F3E1",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  calloutText: {
    color: "#4E7C5B",
    fontWeight: "700",
    fontSize: 13,
  },
  mealCardList: {
    gap: 14,
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
  mealNameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 4,
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
});
