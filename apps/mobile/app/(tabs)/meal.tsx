import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LineChart } from "react-native-chart-kit";

const mealTypes = ["아침", "점심", "저녁", "간식"];
const chartWidth = Dimensions.get("window").width - 48;
const timePeriods = ["오전", "오후"];
const timeHours = Array.from({ length: 12 }, (_, index) => index + 1);
const timeMinutes = Array.from({ length: 60 }, (_, index) => index);
const timeItemHeight = 44;
const timePickerHeight = timeItemHeight * 5;
const timePickerPadding = (timePickerHeight - timeItemHeight) / 2;
const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const mealTypeMap: Record<string, string> = {
  아침: "BREAKFAST",
  점심: "LUNCH",
  저녁: "DINNER",
  간식: "SNACK",
};

const palette = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  accent: "#FACC15",
  accentDark: "#F59E0B",
  ink: "#111827",
};

interface NutritionData {
  calories: number;
  servingSize: string;
  carbs: number;
  protein: number;
  fat: number;
  sugar: number;
  sodium: number;
}

interface PredictionData {
  graphData: {
    labels: string[];
    datasets: { data: number[] }[];
  };
  guide: string;
  foodName: string;
  nutrition: NutritionData;
}

const fallbackNutrition: NutritionData = {
  calories: 460,
  servingSize: "1인분 (230g)",
  carbs: 52,
  protein: 28,
  fat: 18,
  sugar: 8,
  sodium: 840,
};

const buildFallbackPrediction = (): PredictionData => ({
  graphData: {
    labels: ["0분", "30분", "60분", "90분", "120분"],
    datasets: [
      {
        data: [108, 126, 142, 131, 118],
      },
    ],
  },
  guide:
    "사진 기준으로 혈당 상승 폭이 크지 않은 편이에요. 단백질과 채소를 함께 섭취하고, 식사 후 20분 정도 가볍게 움직이면 더 안정적이에요.",
  foodName: "닭갈비",
  nutrition: fallbackNutrition,
});

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}.${month}.${day}`;
};

const formatTime = (date: Date) => {
  const hours = date.getHours();
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${displayHour}:${minutes}`;
};

const getTimeParts = (date: Date) => {
  const hours = date.getHours();
  const period = hours < 12 ? "오전" : "오후";
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  const minute = date.getMinutes();
  return { period, hour, minute };
};

const buildTimeDate = (
  baseDate: Date,
  period: string,
  hour: number,
  minute: number
) => {
  const result = new Date(baseDate);
  const hour24 =
    period === "오전"
      ? hour === 12
        ? 0
        : hour
      : hour === 12
        ? 12
        : hour + 12;
  result.setHours(hour24, minute, 0, 0);
  return result;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getMonthMatrix = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length < 42) {
    cells.push(null);
  }
  return cells;
};

const shiftMonth = (date: Date, diff: number) =>
  new Date(date.getFullYear(), date.getMonth() + diff, 1);

const parseExifDate = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const match = value.match(
    /(\d{4}):(\d{2}):(\d{2})\s(\d{2}):(\d{2}):(\d{2})/
  );
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
};

const getExifDate = (exif?: Record<string, unknown>) => {
  if (!exif) {
    return null;
  }
  const candidates = ["DateTimeOriginal", "DateTimeDigitized", "DateTime"];
  for (const key of candidates) {
    const parsed = parseExifDate(exif[key]);
    if (parsed) {
      return parsed;
    }
  }
  return null;
};

export default function MealScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [predictionData, setPredictionData] = useState<PredictionData | null>(
    null
  );
  const [mealType, setMealType] = useState(mealTypes[0]);
  const [mealDate, setMealDate] = useState(new Date());
  const [mealTime, setMealTime] = useState(new Date());
  const [memo, setMemo] = useState("");
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [autoAdvanceTime, setAutoAdvanceTime] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialTimeParts = getTimeParts(mealTime);
  const [tempDate, setTempDate] = useState(mealDate);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(mealDate.getFullYear(), mealDate.getMonth(), 1)
  );
  const [timePeriod, setTimePeriod] = useState(initialTimeParts.period);
  const [timeHour, setTimeHour] = useState(initialTimeParts.hour);
  const [timeMinute, setTimeMinute] = useState(initialTimeParts.minute);
  const periodScrollRef = useRef<ScrollView | null>(null);
  const hourScrollRef = useRef<ScrollView | null>(null);
  const minuteScrollRef = useRef<ScrollView | null>(null);

  const scrollToIndex = (ref: React.RefObject<ScrollView>, index: number) => {
    if (!ref.current) {
      return;
    }
    ref.current.scrollTo({ y: index * timeItemHeight, animated: false });
  };

  const openPicker = (mode: "date" | "time") => {
    let parts: ReturnType<typeof getTimeParts> | null = null;
    if (mode === "date") {
      setTempDate(mealDate);
      setCalendarMonth(
        new Date(mealDate.getFullYear(), mealDate.getMonth(), 1)
      );
    } else {
      parts = getTimeParts(mealTime);
      setTimePeriod(parts.period);
      setTimeHour(parts.hour);
      setTimeMinute(parts.minute);
    }
    setPickerMode(mode);
    if (mode === "time" && parts) {
      setTimeout(() => {
        scrollToIndex(periodScrollRef, timePeriods.indexOf(parts.period));
        scrollToIndex(hourScrollRef, timeHours.indexOf(parts.hour));
        scrollToIndex(minuteScrollRef, timeMinutes.indexOf(parts.minute));
      }, 0);
    }
  };

  const closePicker = () => {
    setPickerMode(null);
    setAutoAdvanceTime(false);
  };

  const confirmPicker = () => {
    if (pickerMode === "date") {
      const parts = getTimeParts(mealTime);
      const nextDate = tempDate;
      setMealDate(nextDate);
      setMealTime(
        buildTimeDate(nextDate, parts.period, parts.hour, parts.minute)
      );
      if (autoAdvanceTime) {
        setAutoAdvanceTime(false);
        setTimePeriod(parts.period);
        setTimeHour(parts.hour);
        setTimeMinute(parts.minute);
        setPickerMode("time");
        setTimeout(() => {
          scrollToIndex(periodScrollRef, timePeriods.indexOf(parts.period));
          scrollToIndex(hourScrollRef, timeHours.indexOf(parts.hour));
          scrollToIndex(minuteScrollRef, timeMinutes.indexOf(parts.minute));
        }, 0);
        return;
      }
    } else if (pickerMode === "time") {
      setMealTime(buildTimeDate(mealDate, timePeriod, timeHour, timeMinute));
    }
    setPickerMode(null);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setSelectedAsset(null);
    setPredictionData(null);
    setNoticeMessage(null);
  };

  const handleSubmit = async () => {
    if (!selectedAsset || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const parts = getTimeParts(mealTime);
      const eatenAt = buildTimeDate(
        mealDate,
        parts.period,
        parts.hour,
        parts.minute
      );
      const formData = new FormData();
      formData.append("image", {
        uri: selectedAsset.uri,
        name:
          selectedAsset.fileName ??
          `meal-${Date.now()}.${selectedAsset.uri.split(".").pop() ?? "jpg"}`,
        type: selectedAsset.mimeType ?? "image/jpeg",
      } as unknown as Blob);
      formData.append("mealType", mealTypeMap[mealType] ?? "SNACK");
      formData.append("eatenAt", eatenAt.toISOString());
      if (memo.trim()) {
        formData.append("memo", memo.trim());
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/meals`, {
        method: "POST",
        headers: {
          "X-User-Id": "1",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("식사 기록 저장에 실패했어요.");
      }

      router.replace("/(tabs)/index");
    } catch (error) {
      console.warn(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectEdit = () => {
    setAutoAdvanceTime(true);
    openPicker("date");
  };

  const analyzeImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: asset.uri,
        name:
          asset.fileName ??
          `analyze-${Date.now()}.${asset.uri.split(".").pop() ?? "jpg"}`,
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob);

      const response = await fetch(`${API_BASE_URL}/api/v1/ai/food/analyze`, {
        method: "POST",
        headers: {
          "X-User-Id": "1",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("AI 분석 요청에 실패했어요.");
      }

      const data = (await response.json()) as {
        labels?: string[];
        values?: number[];
        guide?: string;
        foodName?: string;
        nutrition?: NutritionData;
      };
      const labels =
        data.labels?.map((label) =>
          label.endsWith("분") ? label : `${label}분`
        ) ?? [];

      setPredictionData({
        graphData: {
          labels: labels.length > 0 ? labels : ["0분", "30분", "60분", "90분", "120분"],
          datasets: [
            {
              data: data.values?.length ? data.values : [108, 126, 142, 131, 118],
            },
          ],
        },
        guide: data.guide ?? buildFallbackPrediction().guide,
        foodName: data.foodName ?? buildFallbackPrediction().foodName,
        nutrition: data.nutrition ?? fallbackNutrition,
      });
    } catch (error) {
      console.warn(error);
      setPredictionData(buildFallbackPrediction());
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      exif: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const exifDate = getExifDate(
        asset.exif as Record<string, unknown> | undefined
      );
      const appliedDate = exifDate ?? new Date();
      setMealDate(appliedDate);
      setMealTime(appliedDate);
      setNoticeMessage(
        exifDate
          ? "사진이 촬영된 시간으로 변경되었어요!"
          : "메타데이터가 없을 때 현재 시간으로 입력되었어요."
      );
      setSelectedAsset(asset);
      setSelectedImage(asset.uri);
      setPredictionData(null);
      analyzeImage(asset);
    }
  };

  const calendarCells = getMonthMatrix(calendarMonth);
  const isTimePicker = pickerMode === "time";
  const isSubmitDisabled = !selectedAsset || isSubmitting;
  const footerButtonLabel = isSubmitting ? "저장 중..." : "기록 완료";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.page}
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>식사기록</Text>
          <View style={styles.tipBadge}>
            <Text style={styles.tipText}>음식을 추가해보세요!</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>식사 유형</Text>
        <View style={styles.mealTypeRow}>
          {mealTypes.map((type) => {
            const isActive = mealType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealTypeChip,
                  isActive && styles.mealTypeChipActive,
                ]}
                onPress={() => setMealType(type)}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    isActive && styles.mealTypeTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedImage && (
          <View style={styles.infoRow}>
            <TouchableOpacity
              style={styles.infoCard}
              onPress={() => openPicker("date")}
            >
              <Text style={styles.infoLabel}>식사 날짜</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{formatDate(mealDate)}</Text>
                <Text style={styles.infoChevron}>v</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.infoCard}
              onPress={() => openPicker("time")}
            >
              <Text style={styles.infoLabel}>식사 시간</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{formatTime(mealTime)}</Text>
                <Text style={styles.infoChevron}>v</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {selectedImage && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>
              {noticeMessage ?? "사진이 촬영된 시간으로 변경되었어요!"}
            </Text>
            <TouchableOpacity onPress={handleDirectEdit}>
              <Text style={styles.noticeAction}>직접 수정하기</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>사진</Text>
        {!selectedImage ? (
          <TouchableOpacity style={styles.imagePickerCard} onPress={pickImage}>
            <Text style={styles.imagePickerTitle}>음식 사진을 추가해보세요</Text>
            <Text style={styles.imagePickerSubtitle}>
              앨범에서 선택하거나 바로 촬영할 수 있어요.
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.imageCard}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.imageRemoveButton}
              onPress={clearImage}
            >
              <Text style={styles.imageRemoveText}>X</Text>
            </TouchableOpacity>
            {predictionData?.foodName ? (
              <View style={styles.imageTag}>
                <Text style={styles.imageTagText}>
                  {predictionData.foodName}
                </Text>
              </View>
            ) : null}
          </View>
        )}
        {selectedImage && isAnalyzing && (
          <Text style={styles.analyzingText}>AI 분석 중...</Text>
        )}

        {selectedImage && predictionData && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>혈당 변화</Text>
            <View style={styles.chartCard}>
              <LineChart
                data={predictionData.graphData}
                width={chartWidth}
                height={220}
                yAxisSuffix="mg/dL"
                yAxisInterval={1}
                chartConfig={chartConfig}
                bezier
                style={styles.graphStyle}
              />
            </View>

            <Text style={styles.sectionTitle}>섭취 가이드</Text>
            <View style={styles.guideCard}>
              <Text style={styles.guideText}>{predictionData.guide}</Text>
            </View>

            <Text style={styles.sectionTitle}>영양 성분</Text>
            <View style={styles.nutritionCard}>
              <View style={styles.caloriesRow}>
                <Text style={styles.caloriesValue}>
                  {predictionData.nutrition.calories}
                </Text>
                <Text style={styles.caloriesUnit}>kcal</Text>
              </View>
              <Text style={styles.nutritionServing}>
                {predictionData.nutrition.servingSize}
              </Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>탄수화물</Text>
                  <Text style={styles.nutritionValue}>
                    {predictionData.nutrition.carbs}g
                  </Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>단백질</Text>
                  <Text style={styles.nutritionValue}>
                    {predictionData.nutrition.protein}g
                  </Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>지방</Text>
                  <Text style={styles.nutritionValue}>
                    {predictionData.nutrition.fat}g
                  </Text>
                </View>
              </View>
              <View style={styles.nutritionDivider} />
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>당류</Text>
                <Text style={styles.nutritionValue}>
                  {predictionData.nutrition.sugar}g
                </Text>
              </View>
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionLabel}>나트륨</Text>
                <Text style={styles.nutritionValue}>
                  {predictionData.nutrition.sodium}mg
                </Text>
              </View>
            </View>
          </View>
        )}

        {selectedImage && (
          <>
            <Text style={styles.sectionTitle}>메모</Text>
            <View style={styles.memoCard}>
              <TextInput
                value={memo}
                onChangeText={setMemo}
                placeholder="자유로운 메모를 남겨보세요."
                placeholderTextColor={palette.textMuted}
                multiline
                maxLength={1000}
                style={styles.memoInput}
              />
              <Text style={styles.memoCount}>{`${memo.length}/1000`}</Text>
            </View>
          </>
        )}
      </ScrollView>
      <View style={styles.footerBar}>
        <TouchableOpacity
          style={[
            styles.footerButton,
            isSubmitDisabled && styles.footerButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
        >
          <Text
            style={[
              styles.footerButtonText,
              isSubmitDisabled && styles.footerButtonTextDisabled,
            ]}
          >
            {footerButtonLabel}
          </Text>
        </TouchableOpacity>
      </View>
      {pickerMode && (
        <Modal transparent animationType="fade" onRequestClose={closePicker}>
          <View style={styles.modalBackdrop}>
            <View
              style={[styles.modalCard, isTimePicker && styles.modalCardDark]}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalHeaderAction}
                  onPress={closePicker}
                >
                  <Text
                    style={[
                      styles.modalCancel,
                      isTimePicker && styles.modalCancelLight,
                    ]}
                  >
                    취소
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.modalTitle,
                    styles.modalTitleCentered,
                    isTimePicker && styles.modalTitleLight,
                  ]}
                >
                  {pickerMode === "date" ? "식사 날짜 선택" : "식사 시간 선택"}
                </Text>
                <TouchableOpacity
                  style={styles.modalHeaderAction}
                  onPress={confirmPicker}
                >
                  <Text
                    style={[
                      styles.modalAction,
                      isTimePicker && styles.modalActionAccent,
                    ]}
                  >
                    완료
                  </Text>
                </TouchableOpacity>
              </View>

              {pickerMode === "date" ? (
                <View>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity
                      style={styles.calendarNavButton}
                      onPress={() =>
                        setCalendarMonth(shiftMonth(calendarMonth, -1))
                      }
                    >
                      <Text style={styles.calendarNavText}>{"<"}</Text>
                    </TouchableOpacity>
                    <Text style={styles.calendarTitle}>
                      {`${calendarMonth.getFullYear()}년 ${
                        calendarMonth.getMonth() + 1
                      }월`}
                    </Text>
                    <TouchableOpacity
                      style={styles.calendarNavButton}
                      onPress={() =>
                        setCalendarMonth(shiftMonth(calendarMonth, 1))
                      }
                    >
                      <Text style={styles.calendarNavText}>{">"}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.calendarWeekRow}>
                    {weekLabels.map((label, index) => (
                      <Text
                        key={`${label}-${index}`}
                        style={[
                          styles.calendarWeekday,
                          index === 0 && styles.calendarWeekdaySunday,
                          index === 6 && styles.calendarWeekdaySaturday,
                        ]}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {calendarCells.map((day, index) => {
                      if (!day) {
                        return (
                          <View
                            key={`empty-${index}`}
                            style={styles.calendarCell}
                          />
                        );
                      }
                      const cellDate = new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth(),
                        day
                      );
                      const isSelected = isSameDay(cellDate, tempDate);
                      return (
                        <TouchableOpacity
                          key={`day-${day}-${index}`}
                          style={[
                            styles.calendarCell,
                            isSelected && styles.calendarCellSelected,
                          ]}
                          onPress={() => setTempDate(cellDate)}
                        >
                          <Text
                            style={[
                              styles.calendarCellText,
                              isSelected && styles.calendarCellTextSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.timePickerContainer}>
                  <View style={styles.timeHighlight} />
                  <View style={styles.timeColumns}>
                    <ScrollView
                      ref={periodScrollRef}
                      style={styles.timeColumn}
                      contentContainerStyle={styles.timeColumnContent}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={timeItemHeight}
                      decelerationRate="fast"
                      onMomentumScrollEnd={(event) => {
                        const index = Math.round(
                          event.nativeEvent.contentOffset.y / timeItemHeight
                        );
                        const safeIndex = Math.min(
                          Math.max(index, 0),
                          timePeriods.length - 1
                        );
                        setTimePeriod(timePeriods[safeIndex]);
                      }}
                    >
                      {timePeriods.map((period, index) => (
                        <TouchableOpacity
                          key={period}
                          style={styles.timeItem}
                          onPress={() => {
                            setTimePeriod(period);
                            scrollToIndex(periodScrollRef, index);
                          }}
                        >
                          <Text
                            style={[
                              styles.timeItemText,
                              timePeriod === period && styles.timeItemTextActive,
                            ]}
                          >
                            {period}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <ScrollView
                      ref={hourScrollRef}
                      style={styles.timeColumn}
                      contentContainerStyle={styles.timeColumnContent}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={timeItemHeight}
                      decelerationRate="fast"
                      onMomentumScrollEnd={(event) => {
                        const index = Math.round(
                          event.nativeEvent.contentOffset.y / timeItemHeight
                        );
                        const safeIndex = Math.min(
                          Math.max(index, 0),
                          timeHours.length - 1
                        );
                        setTimeHour(timeHours[safeIndex]);
                      }}
                    >
                      {timeHours.map((hour, index) => (
                        <TouchableOpacity
                          key={`${hour}`}
                          style={styles.timeItem}
                          onPress={() => {
                            setTimeHour(hour);
                            scrollToIndex(hourScrollRef, index);
                          }}
                        >
                          <Text
                            style={[
                              styles.timeItemText,
                              timeHour === hour && styles.timeItemTextActive,
                            ]}
                          >
                            {hour}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <ScrollView
                      ref={minuteScrollRef}
                      style={styles.timeColumn}
                      contentContainerStyle={styles.timeColumnContent}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={timeItemHeight}
                      decelerationRate="fast"
                      onMomentumScrollEnd={(event) => {
                        const index = Math.round(
                          event.nativeEvent.contentOffset.y / timeItemHeight
                        );
                        const safeIndex = Math.min(
                          Math.max(index, 0),
                          timeMinutes.length - 1
                        );
                        setTimeMinute(timeMinutes[safeIndex]);
                      }}
                    >
                      {timeMinutes.map((minute, index) => (
                        <TouchableOpacity
                          key={`${minute}`}
                          style={styles.timeItem}
                          onPress={() => {
                            setTimeMinute(minute);
                            scrollToIndex(minuteScrollRef, index);
                          }}
                        >
                          <Text
                            style={[
                              styles.timeItemText,
                              timeMinute === minute &&
                                styles.timeItemTextActive,
                            ]}
                          >
                            {`${minute}`.padStart(2, "0")}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const chartConfig = {
  backgroundColor: palette.ink,
  backgroundGradientFrom: palette.ink,
  backgroundGradientTo: "#1F2937",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  style: {
    borderRadius: 18,
  },
  propsForDots: {
    r: "5",
    strokeWidth: "2",
    stroke: palette.accent,
  },
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  container: { flex: 1 },
  page: {
    padding: 20,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    paddingBottom: 140,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pageTitle: { fontSize: 26, fontWeight: "700", color: palette.text },
  tipBadge: {
    backgroundColor: palette.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tipText: { color: palette.ink, fontWeight: "700", fontSize: 13 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    marginTop: 18,
    marginBottom: 12,
  },
  mealTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  mealTypeChip: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  mealTypeChipActive: {
    backgroundColor: palette.ink,
  },
  mealTypeText: {
    color: palette.text,
    fontWeight: "600",
  },
  mealTypeTextActive: {
    color: palette.background,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  infoCard: {
    width: "48%",
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  infoLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "600",
  },
  infoValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
  },
  infoChevron: {
    fontSize: 14,
    color: palette.textMuted,
  },
  noticeCard: {
    backgroundColor: palette.ink,
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  noticeTitle: {
    color: "#E2E8F0",
    fontWeight: "600",
    marginBottom: 6,
  },
  noticeAction: {
    color: palette.accent,
    fontWeight: "700",
  },
  imagePickerCard: {
    backgroundColor: palette.card,
    borderRadius: 22,
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "#FDE68A",
    borderStyle: "dashed",
    alignItems: "center",
  },
  imagePickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 6,
  },
  imagePickerSubtitle: {
    fontSize: 13,
    color: palette.textMuted,
  },
  imageCard: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.border,
  },
  imagePreview: {
    width: "100%",
    height: 280,
    resizeMode: "cover",
  },
  imageRemoveButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageRemoveText: { color: "#FFFFFF", fontWeight: "700" },
  imageTag: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  imageTagText: { color: "#FFFFFF", fontWeight: "600", fontSize: 12 },
  analyzingText: {
    marginTop: 10,
    color: palette.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  resultsContainer: {
    marginTop: 14,
  },
  chartCard: {
    backgroundColor: palette.ink,
    borderRadius: 18,
    padding: 8,
  },
  graphStyle: {
    borderRadius: 18,
  },
  guideCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  guideText: {
    fontSize: 14,
    color: palette.text,
    lineHeight: 22,
  },
  nutritionCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  caloriesRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  caloriesValue: {
    fontSize: 32,
    fontWeight: "800",
    color: palette.text,
    marginRight: 6,
  },
  caloriesUnit: {
    fontSize: 16,
    color: palette.textMuted,
    marginBottom: 4,
  },
  nutritionServing: {
    color: palette.textMuted,
    marginBottom: 14,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  nutritionItem: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  nutritionLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  nutritionValue: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 14,
  },
  nutritionDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 14,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  memoCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 140,
  },
  memoInput: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 90,
    textAlignVertical: "top",
  },
  memoCount: {
    marginTop: 10,
    textAlign: "right",
    color: palette.textMuted,
    fontSize: 12,
  },
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    backgroundColor: "rgba(248, 250, 252, 0.98)",
    borderTopWidth: 1,
    borderTopColor: palette.border,
    zIndex: 10,
  },
  footerButton: {
    backgroundColor: palette.accent,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  footerButtonDisabled: {
    backgroundColor: "#E2E8F0",
    shadowOpacity: 0,
    elevation: 0,
  },
  footerButtonText: {
    color: palette.ink,
    fontWeight: "800",
    fontSize: 16,
  },
  footerButtonTextDisabled: {
    color: "#94A3B8",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 18,
  },
  modalCardDark: {
    backgroundColor: "#0F172A",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalHeaderAction: {
    width: 56,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
  },
  modalTitleCentered: {
    flex: 1,
    textAlign: "center",
  },
  modalTitleLight: {
    color: "#E2E8F0",
  },
  modalAction: {
    fontWeight: "700",
    color: palette.accentDark,
  },
  modalActionAccent: {
    color: palette.accent,
  },
  modalCancel: {
    fontWeight: "600",
    color: palette.textMuted,
  },
  modalCancelLight: {
    color: "#94A3B8",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarNavText: {
    fontSize: 18,
    color: palette.text,
    fontWeight: "700",
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
  },
  calendarWeekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  calendarWeekday: {
    width: "14.2857%",
    textAlign: "center",
    color: palette.textMuted,
    fontWeight: "600",
  },
  calendarWeekdaySunday: {
    color: "#DC2626",
  },
  calendarWeekdaySaturday: {
    color: "#2563EB",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: "14.2857%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  calendarCellSelected: {
    backgroundColor: palette.accent,
    borderRadius: 12,
  },
  calendarCellText: {
    color: palette.text,
    fontWeight: "600",
  },
  calendarCellTextSelected: {
    color: palette.ink,
  },
  timePickerContainer: {
    height: timePickerHeight,
    justifyContent: "center",
  },
  timeHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: timePickerPadding,
    height: timeItemHeight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.35)",
    backgroundColor: "rgba(250, 204, 21, 0.12)",
  },
  timeColumns: {
    flexDirection: "row",
    height: timePickerHeight,
  },
  timeColumn: {
    flex: 1,
  },
  timeColumnContent: {
    paddingVertical: timePickerPadding,
    alignItems: "center",
  },
  timeItem: {
    height: timeItemHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  timeItemText: {
    fontSize: 18,
    color: "rgba(226, 232, 240, 0.45)",
    fontWeight: "600",
  },
  timeItemTextActive: {
    fontSize: 20,
    color: palette.accent,
    fontWeight: "700",
  },
});
