import React from "react";
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuthHeaders, loadAuthSession } from "@/session";
import AiGuideText from "@/components/ai-guide-text";

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
  weightGrams?: number | null;
  servingCount?: number | null;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const parseLocalDateTime = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatMealTime = (date: Date) => {
  const hour = date.getHours();
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${displayHour}:${pad2(date.getMinutes())}`;
};

const formatDateLabel = (date: Date) =>
  `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;

const formatOptionalNumber = (value?: number | null) => {
  if (value == null) return null;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
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

export default function MealDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mealId, from } = useLocalSearchParams<{
    mealId?: string;
    from?: string;
  }>();
  const [meal, setMeal] = React.useState<MealSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const resolvedId =
    typeof mealId === "string" && mealId.length > 0 ? Number(mealId) : NaN;

  const fetchMeal = React.useCallback(async () => {
    if (!Number.isFinite(resolvedId)) {
      setErrorMessage("식단 정보를 찾을 수 없어요.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loadAuthSession();
      const response = await fetch(`${API_BASE_URL}/api/v1/meals/${resolvedId}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("식단 정보를 불러오지 못했어요.");
      }
      const data = (await response.json()) as MealSummary;
      setMeal(data ?? null);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("식단 정보를 불러오지 못했어요.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [resolvedId]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchMeal();
    }, [fetchMeal])
  );

  const handleEdit = React.useCallback(() => {
    if (!Number.isFinite(resolvedId)) {
      return;
    }
    router.push({
      pathname: "/(tabs)/meal-edit",
      params: { mealId: String(resolvedId) },
    });
  }, [resolvedId, router]);

  const deleteMeal = React.useCallback(async () => {
    if (!Number.isFinite(resolvedId)) {
      return;
    }
    setIsDeleting(true);
    try {
      await loadAuthSession();
      const response = await fetch(`${API_BASE_URL}/api/v1/meals/${resolvedId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("\uae30\ub85d \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc5b4\uc694.");
      }
      router.replace("/(tabs)");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "\uae30\ub85d \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc5b4\uc694.";
      Alert.alert("\uc0ad\uc81c \uc2e4\ud328", message);
    } finally {
      setIsDeleting(false);
    }
  }, [resolvedId, router]);

  const handleDelete = React.useCallback(() => {
    if (!Number.isFinite(resolvedId) || isDeleting) {
      return;
    }
    Alert.alert(
      "\uc0ad\uc81c\ud560\uae4c\uc694?",
      "\uc774 \uae30\ub85d\uc744 \uc0ad\uc81c\ud558\uba74 \ubcf5\uad6c\ud560 \uc218 \uc5c6\uc5b4\uc694.",
      [
        { text: "\ucde8\uc18c", style: "cancel" },
        { text: "\uc0ad\uc81c", style: "destructive", onPress: () => void deleteMeal() },
      ]
    );
  }, [resolvedId, isDeleting, deleteMeal]);

  const eaten =
    parseLocalDateTime(meal?.eatenAt) ?? parseLocalDateTime(meal?.recordedAt);
  const dateLabel = eaten ? formatDateLabel(eaten) : "";
  const timeLabel = eaten ? formatMealTime(eaten) : "--:--";
  const mealTypeLabel = getMealTypeLabel(meal?.mealType);
  const title = meal?.foodName || meal?.memo || "음식 이름 없음";
  const caloriesValue = meal?.calories != null ? `${meal.calories}` : "--";
  const macroPercents = calcMacroPercents(
    meal?.carbs,
    meal?.protein,
    meal?.fat
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
  const macroItems = [
    {
      key: "carbs",
      label: "탄수화물",
      percent: macroSum > 0 ? macroValues.carbPercent : null,
      color: "#8FBA8A",
    },
    {
      key: "protein",
      label: "단백질",
      percent: macroSum > 0 ? macroValues.proteinPercent : null,
      color: "#E7D7A9",
    },
    {
      key: "fat",
      label: "지방",
      percent: macroSum > 0 ? macroValues.fatPercent : null,
      color: "#A8C4E3",
    },
  ];
  const weightLabel =
    meal?.weightGrams != null
      ? `${formatOptionalNumber(meal.weightGrams)} g`
      : null;
  const servingLabel =
    meal?.servingCount != null
      ? `${formatOptionalNumber(meal.servingCount)} 인분`
      : null;
  const portionLabel = [weightLabel, servingLabel]
    .filter((value) => value && value.length > 0)
    .join(" · ");

  const handleBack = React.useCallback(() => {
    if (from === "meal-list") {
      router.replace("/(tabs)/meal-list");
      return;
    }
    router.back();
  }, [from, router]);

  const headerPaddingTop = Math.max(12, insets.top + 8);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <Pressable style={styles.headerSide} onPress={handleBack}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Pressable>
        <Text style={styles.headerTitle}>기록 상세</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>불러오기에 실패했어요</Text>
            <Text style={styles.cardDesc}>{errorMessage}</Text>
            <Pressable style={styles.callout} onPress={fetchMeal}>
              <Text style={styles.calloutText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : isLoading || !meal ? (
          <Text style={styles.loadingText}>식단 정보를 불러오는 중..</Text>
        ) : (
          <>
            <View style={styles.summarySection}>
              {!!mealTypeLabel && (
                <Text style={styles.summaryMealType}>{mealTypeLabel}</Text>
              )}
              <View style={styles.summaryCaloriesRow}>
                <Text style={styles.summaryCalories}>{caloriesValue}</Text>
                <Text style={styles.summaryCaloriesUnit}>kcal</Text>
              </View>
              <Text style={styles.summaryFoodName} numberOfLines={1}>
                {title}
              </Text>
            </View>

            <View style={styles.timeCard}>
              <Text style={styles.timeLabel}>식사 시간</Text>
              <Text style={styles.timeValue}>
                {dateLabel} {timeLabel}
              </Text>
            </View>
            {portionLabel ? (
              <View style={styles.portionCard}>
                <Text style={styles.portionLabel}>중량/인분</Text>
                <Text style={styles.portionValue}>{portionLabel}</Text>
              </View>
            ) : null}

            <View style={styles.photoCard}>
              {meal.imageUrl ? (
                <Image
                  source={{ uri: meal.imageUrl }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>IMG</Text>
                </View>
              )}
            </View>

            <View style={[styles.section, styles.macroSection]}>
              <Text style={styles.sectionTitle}>탄단지 비율</Text>
              <View style={styles.macroCard}>
                {macroItems.map((item) => {
                  const value =
                    item.percent == null ? null : Math.round(item.percent);
                  const fillPercent = value == null ? 0 : value;
                  const clamped = Math.min(100, Math.max(0, fillPercent));
                  return (
                    <View key={item.key} style={styles.macroRow}>
                      <View style={styles.macroRowHeader}>
                        <Text style={styles.macroRowLabel}>{item.label}</Text>
                        <Text style={styles.macroRowValue}>
                          {value == null ? "--" : `${value}%`}
                        </Text>
                      </View>
                      <View style={styles.macroRowTrack}>
                        <View
                          style={[
                            styles.macroRowFill,
                            { width: `${clamped}%`, backgroundColor: item.color },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {meal.aiGuide ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>AI 섭취 가이드</Text>
                <View style={styles.aiGuideCard}>
                  <View style={styles.aiGuideHeader}>
                    <View style={styles.aiChip}>
                      <View style={styles.aiChipDot} />
                      <Text style={styles.aiChipText}>AI INSIGHT</Text>
                    </View>
                    <Text style={styles.aiMetaText}>모델 기반 맞춤 추천</Text>
                  </View>
                  <Text style={styles.aiGuideTitle}>AI가 가이드를 제공해요</Text>
                  <AiGuideText text={meal.aiGuide} textStyle={styles.aiGuideText} />
                  <View style={styles.aiGuideFooter}>
                    <View style={styles.aiPulse} />
                    <Text style={styles.aiFooterText}>
                      AI가 생성한 개인 맞춤 가이드입니다.
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {meal.memo ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{"\uba54\ubaa8"}</Text>
                <View style={styles.card}>
                  <Text style={styles.cardDesc}>{meal.memo}</Text>
                </View>
              </View>
            ) : null}

            {/*
            {meal.memo ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>메모</Text>
                <View style={styles.card}>
                  <Text style={styles.cardDesc}>{meal.memo}</Text>
                </View>
              </View>
            ) : null}

            {meal.aiGuide ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>AI 가이드</Text>
                <View style={styles.card}>
                  <Text style={styles.cardDesc}>{meal.aiGuide}</Text>
                </View>
              </View>
            ) : null}
            */}
          </>
        )}
      </ScrollView>
      <View style={styles.actionBar}>
        <Pressable
          style={[
            styles.actionButton,
            styles.actionButtonGhost,
            isDeleting && styles.actionButtonDisabled,
          ]}
          onPress={handleDelete}
          disabled={isDeleting || !Number.isFinite(resolvedId)}
        >
          <Text style={[styles.actionButtonText, styles.actionButtonTextGhost]}>
            {"\uc0ad\uc81c"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={handleEdit}
          disabled={!Number.isFinite(resolvedId)}
        >
          <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
            {"\uc218\uc815"}
          </Text>
        </Pressable>
      </View>
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  actionBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(107, 116, 102, 0.2)",
    backgroundColor: palette.background,
  },
  actionButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPrimary: {
    backgroundColor: palette.accent,
  },
  actionButtonGhost: {
    backgroundColor: "#E6EDD8",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionButtonTextPrimary: {
    color: palette.ink,
  },
  actionButtonTextGhost: {
    color: palette.text,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  summarySection: {
    marginBottom: 18,
  },
  summaryMealType: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "700",
  },
  summaryCaloriesRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 10,
  },
  summaryCalories: {
    color: palette.text,
    fontSize: 44,
    fontWeight: "800",
  },
  summaryCaloriesUnit: {
    color: palette.textMuted,
    fontSize: 18,
    marginLeft: 6,
    fontWeight: "600",
  },
  summaryFoodName: {
    marginTop: 6,
    color: palette.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
  timeCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 16,
  },
  portionCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 16,
  },
  portionLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  portionValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  timeLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  timeValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  photoCard: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 10,
  },
  photoImage: {
    width: "100%",
    height: 260,
    backgroundColor: "rgba(31, 36, 31, 0.08)",
  },
  photoPlaceholder: {
    width: "100%",
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(107, 116, 102, 0.12)",
  },
  photoPlaceholderText: { fontSize: 28, color: palette.textMuted },
  section: {
    marginTop: 18,
  },
  macroSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 8,
    paddingLeft: 4,
  },
  macroCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  macroRow: {
    marginBottom: 14,
  },
  macroRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  macroRowLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  macroRowValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  macroRowTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E7E0CC",
    overflow: "hidden",
  },
  macroRowFill: {
    height: "100%",
    borderRadius: 999,
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
  aiGuideCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(107, 116, 102, 0.2)",
    overflow: "hidden",
    shadowColor: "#0B1220",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  aiGuideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiGuideTitle: {
    marginTop: 12,
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
  },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(127, 175, 123, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(127, 175, 123, 0.4)",
  },
  aiChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.accentDark,
  },
  aiChipText: {
    color: palette.accentDark,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  aiMetaText: {
    color: "rgba(107, 116, 102, 0.8)",
    fontSize: 11,
    fontWeight: "600",
  },
  aiGuideText: {
    marginTop: 10,
    color: palette.text,
    fontSize: 13,
    lineHeight: 20,
  },
  aiGuideFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.accentDark,
    shadowColor: palette.accentDark,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  aiFooterText: {
    color: "rgba(107, 116, 102, 0.9)",
    fontSize: 12,
    fontWeight: "600",
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
  loadingText: {
    textAlign: "center",
    color: palette.textMuted,
    marginTop: 8,
    fontSize: 12,
  },
});
