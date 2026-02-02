import React from "react";
import {
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getAuthHeaders, loadAuthSession } from "@/session";

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

const mealTypeLabels: Record<string, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACK: "간식",
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

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
  const [meals, setMeals] = React.useState<MealSummary[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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

  useFocusEffect(
    React.useCallback(() => {
      void fetchMeals();
    }, [fetchMeals])
  );

  const groupedMeals = React.useMemo(() => {
    const sorted = [...meals].sort((a, b) => {
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
  }, [meals]);

  const openMealRecord = () => {
    router.push("/(tabs)/meal");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSide} onPress={router.back}>
          <Text style={styles.headerBack}>&lt;</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>기록</Text>
        <TouchableOpacity style={styles.headerSide} onPress={openMealRecord}>
          <Text style={styles.headerAction}>기록하기</Text>
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
                    <View
                      key={meal.mealId ?? `${meal.eatenAt}-${meal.mealType}`}
                      style={styles.mealCard}
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
                            { flex: macroFlex[0], backgroundColor: "#86EFAC" },
                          ]}
                        />
                        <View
                          style={[
                            styles.mealMacroSegment,
                            { flex: macroFlex[1], backgroundColor: "#FDE68A" },
                          ]}
                        />
                        <View
                          style={[
                            styles.mealMacroSegment,
                            { flex: macroFlex[2], backgroundColor: "#93C5FD" },
                          ]}
                        />
                      </View>
                      <View style={styles.mealMacroLegend}>
                        <View style={styles.mealMacroItem}>
                          <View
                            style={[
                              styles.mealMacroDot,
                              { backgroundColor: "#86EFAC" },
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
                              { backgroundColor: "#FDE68A" },
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
                              { backgroundColor: "#93C5FD" },
                            ]}
                          />
                          <Text style={styles.mealMacroLabel}>
                            지 {macroLabels.fat}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    paddingVertical: 12,
  },
  headerSide: {
    minWidth: 72,
  },
  headerBack: {
    fontSize: 20,
    color: palette.text,
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  },
  mealCard: {
    backgroundColor: "#0F172A",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
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
  mealImagePlaceholderText: { fontSize: 22, color: "#E2E8F0" },
  mealInfo: {
    flex: 1,
  },
  mealTypeBadge: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "700",
  },
  mealCaloriesLarge: {
    color: "#FACC15",
    fontSize: 18,
    fontWeight: "800",
  },
  mealFoodName: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  mealNameDivider: {
    color: "rgba(226, 232, 240, 0.5)",
    fontSize: 14,
  },
  mealTimeLabel: {
    color: "rgba(226, 232, 240, 0.7)",
    fontSize: 12,
    marginTop: 6,
  },
  mealMacroBar: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(148, 163, 184, 0.25)",
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
    color: "rgba(226, 232, 240, 0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
});
