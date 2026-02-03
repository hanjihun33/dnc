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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getAuthHeaders, loadAuthSession } from "@/session";
import AiGuideText from "@/components/ai-guide-text";

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

const formatMealTime = (date: Date) => {
  const hour = date.getHours();
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${displayHour}:${pad2(date.getMinutes())}`;
};

const formatDateLabel = (date: Date) =>
  `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;

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
  const { mealId } = useLocalSearchParams<{ mealId?: string }>();
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
  const caloriesText =
    meal?.calories != null ? `${meal.calories}kcal` : "--kcal";
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.headerSide} onPress={() => router.back()}>
          <Text style={styles.headerBack}>&lt;</Text>
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
            <View style={styles.heroCard}>
              {meal.imageUrl ? (
                <Image
                  source={{ uri: meal.imageUrl }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.heroPlaceholder}>
                  <Text style={styles.heroPlaceholderText}>IMG</Text>
                </View>
              )}
              <View style={styles.heroInfo}>
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
                <Text style={styles.mealTimeLabel}>
                  {dateLabel} {timeLabel}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>탄단지 비율</Text>
              <View style={styles.macroCard}>
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
    paddingTop: 32,
    paddingBottom: 12,
  },
  headerSide: {
    minWidth: 72,
    minHeight: 40,
    justifyContent: "center",
  },
  headerBack: {
    fontSize: 20,
    color: palette.text,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.text,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  actionBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
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
    backgroundColor: palette.navy,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionButtonTextPrimary: {
    color: palette.ink,
  },
  actionButtonTextGhost: {
    color: "#F8FAFC",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  heroImage: {
    width: 84,
    height: 84,
    borderRadius: 18,
    marginRight: 14,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
  },
  heroPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 18,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
  },
  heroPlaceholderText: { fontSize: 22, color: "#E2E8F0" },
  heroInfo: {
    flex: 1,
  },
  mealTypeBadge: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "700",
  },
  mealNameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 4,
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
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 8,
  },
  macroCard: {
    backgroundColor: "#0F172A",
    borderRadius: 18,
    padding: 14,
  },
  mealMacroBar: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(148, 163, 184, 0.25)",
    flexDirection: "row",
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
    backgroundColor: "#0B1220",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
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
    color: "#F8FAFC",
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
    backgroundColor: "rgba(250, 204, 21, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.4)",
  },
  aiChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.accentDark,
  },
  aiChipText: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  aiMetaText: {
    color: "rgba(148, 163, 184, 0.8)",
    fontSize: 11,
    fontWeight: "600",
  },
  aiGuideText: {
    marginTop: 10,
    color: "rgba(226, 232, 240, 0.92)",
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
    backgroundColor: "#38BDF8",
    shadowColor: "#38BDF8",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  aiFooterText: {
    color: "rgba(148, 163, 184, 0.9)",
    fontSize: 12,
    fontWeight: "600",
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
  loadingText: {
    textAlign: "center",
    color: palette.textMuted,
    marginTop: 8,
    fontSize: 12,
  },
});
