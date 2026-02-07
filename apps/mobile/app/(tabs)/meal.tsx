import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  LayoutChangeEvent,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LineChart } from "react-native-chart-kit";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuthHeaders, loadAuthSession } from "@/session";
import AiGuideText from "@/components/ai-guide-text";

const mealTypes = ["아침", "점심", "저녁", "간식"];
const chartWidth = Dimensions.get("window").width - 32;
const timePeriods = ["오전", "오후"];
const timeHours = Array.from({ length: 12 }, (_, index) => index + 1);
const timeMinutes = Array.from({ length: 60 }, (_, index) => index);
const timeItemHeight = 44;
const timePickerHeight = timeItemHeight * 5;
const timePickerPadding = (timePickerHeight - timeItemHeight) / 2;
const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const GUIDE_PENDING_TEXT = "AI 코칭 생성 중...";
const mealTypeMap: Record<string, string> = {
  아침: "BREAKFAST",
  점심: "LUNCH",
  저녁: "DINNER",
  간식: "SNACK",
};

const mealTypeLabelMap: Record<string, string> = {
  BREAKFAST: mealTypes[0],
  LUNCH: mealTypes[1],
  DINNER: mealTypes[2],
  SNACK: mealTypes[3],
};

const getMealTypeByTime = (date: Date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return mealTypes[0];
  if (hour >= 11 && hour < 16) return mealTypes[1];
  if (hour >= 16 && hour < 21) return mealTypes[2];
  return mealTypes[3];
};

const palette = {
  background: "#F6E9D3",
  card: "#F8F0E1",
  text: "#1F241F",
  textMuted: "#6B7466",
  border: "#E5D9C4",
  accent: "#7FAF7B",
  accentDark: "#4E7C5B",
  ink: "#1F2A1F",
  panel: "#E7C17A",
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
    datasets: {
      data: number[];
      color?: (opacity: number) => string;
      strokeWidth?: number;
    }[];
  };
  guide: string;
  foodName: string;
  foodNameFailed?: boolean;
  foodBox?: {
    x_min?: number;
    y_min?: number;
    x_max?: number;
    y_max?: number;
  };
  nutrition: NutritionData;
}

type MealResponse = {
  mealId?: number;
  mealType?: string | null;
  eatenAt?: string | null;
  recordedAt?: string | null;
  imageUrl?: string | null;
  memo?: string | null;
  aiGuide?: string | null;
  foodName?: string | null;
  carbsGrams?: number | null;
  weightGrams?: number | null;
  servingCount?: number | null;
  calories?: number | null;
  carbs?: number | null;
  protein?: number | null;
  fat?: number | null;
};

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
        color: (opacity = 1) => `rgba(127, 175, 123, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  },
  guide:
    "사진 분석이 어려워 기본 가이드를 보여드려요. 채소와 단백질을 먼저 섭취하고, 식후 20분 정도 가볍게 움직여주세요.",
  foodName: "분석 실패",
  foodNameFailed: true,
  nutrition: fallbackNutrition,
});

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}.${month}.${day}`;
};

const formatApiDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseApiDateTime = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

const getPredictionSummary = (type: string | null, values: number[]) => {
  if (!values || values.length === 0) {
    return "예상 혈당 반응을 계산 중이에요.";
  }
  const pre = values[0] ?? 0;
  const peak = Math.max(...values);
  const twoHour = values[values.length - 1] ?? 0;
  const isPrediabetes = type === "PREDIABETES";
  const targetMax = isPrediabetes ? 140 : 180;
  const delta = peak - pre;

  if (peak <= targetMax && twoHour <= targetMax) {
    return "안정적인 혈당 반응이 예상돼요.";
  }
  if (peak <= targetMax + 30 && twoHour <= targetMax) {
    return "일시적인 상승이 예상돼요.";
  }
  if (delta >= 60 || twoHour > targetMax) {
    return "급격한 상승이 예상돼요. 섭취 후 관리에 주의해요.";
  }
  return "혈당 반응이 다소 변동될 수 있어요.";
};

const normalizeFoodName = (value?: string | null) => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return { label: "분석 실패", failed: true };
  }
  if (/unknown/i.test(trimmed)) {
    return { label: "분석 실패", failed: true };
  }
  return { label: trimmed, failed: false };
};

export default function MealScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { mealId: mealIdParam, photoUri, capturedAt } =
    useLocalSearchParams<{ mealId?: string | string[]; photoUri?: string | string[]; capturedAt?: string | string[] }>();
  const resolvedPhotoUri =
    typeof photoUri === "string"
      ? photoUri
      : Array.isArray(photoUri)
        ? photoUri[0]
        : undefined;
  const resolvedCapturedAt =
    typeof capturedAt === "string"
      ? capturedAt
      : Array.isArray(capturedAt)
        ? capturedAt[0]
        : undefined;

  console.log("MEAL PARAMS", {
    photoUri,
    capturedAt,
    resolvedPhotoUri,
    resolvedCapturedAt,
  });
  const editMealId =
    typeof mealIdParam === "string" && mealIdParam.length > 0
      ? Number(mealIdParam)
      : NaN;
  const isEditMode = Number.isFinite(editMealId);
  const headerPaddingTop = Math.max(12, insets.top + 8);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [predictionData, setPredictionData] = useState<PredictionData | null>(
    null
  );
  const [aiGuideRequestId, setAiGuideRequestId] = useState<string | null>(null);
  const [isAiGuidePending, setIsAiGuidePending] = useState(false);
  const [analysisSnapshot, setAnalysisSnapshot] = useState<{
    foodName?: string;
    nutrition?: NutritionData;
  } | null>(null);
  const [editCarbsGrams, setEditCarbsGrams] = useState<number | null>(null);
  const [editAiGuide, setEditAiGuide] = useState<string | null>(null);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });
  const [foodTagSize, setFoodTagSize] = useState({ width: 0, height: 0 });
  const [mealType, setMealType] = useState(() => getMealTypeByTime(new Date()));
  const [isMealTypeAuto, setIsMealTypeAuto] = useState(true);
  const [mealDate, setMealDate] = useState(new Date());
  const [mealTime, setMealTime] = useState(new Date());
  const [memo, setMemo] = useState("");
  const [weightGramsInput, setWeightGramsInput] = useState("");
  const [servingCountInput, setServingCountInput] = useState("");
  const [portionInputMode, setPortionInputMode] = useState<"serving" | "grams">(
    "serving"
  );
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [autoAdvanceTime, setAutoAdvanceTime] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [replacePrompt, setReplacePrompt] = useState({
    visible: false,
    message: "",
  });
  const replaceResolverRef = useRef<((value: boolean) => void) | null>(null);
  const [diabetesType, setDiabetesType] = useState<string | null>(null);
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
  const scrollRef = useRef<ScrollView | null>(null);
  const wasEditModeRef = useRef(false);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    let isActive = true;
    const loadMealForEdit = async () => {
      setIsEditLoading(true);
      try {
        await loadAuthSession();
        const response = await fetch(`${API_BASE_URL}/api/v1/meals/${editMealId}`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("\uae30\ub85d \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694.");
        }
        const data = (await response.json()) as MealResponse;
        if (!isActive) {
          return;
        }
        const parsed =
          parseApiDateTime(data.eatenAt) ??
          parseApiDateTime(data.recordedAt) ??
          new Date();
        const resolvedType =
          data.mealType != null ? mealTypeLabelMap[data.mealType] : undefined;
        const nextMealType = resolvedType ?? mealTypes[0];
        setMealType(nextMealType);
        setIsMealTypeAuto(false);
        setMealDate(parsed);
        setMealTime(parsed);
        setTempDate(parsed);
        setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
        const parts = getTimeParts(parsed);
        setTimePeriod(parts.period);
        setTimeHour(parts.hour);
        setTimeMinute(parts.minute);
        setMemo(data.memo ?? "");
        setWeightGramsInput(
          data.weightGrams != null ? String(data.weightGrams) : ""
        );
        setServingCountInput(
          data.servingCount != null ? String(data.servingCount) : ""
        );
        if (data.servingCount != null) {
          setPortionInputMode("serving");
        } else if (data.weightGrams != null) {
          setPortionInputMode("grams");
        }
        setSelectedImage(data.imageUrl ?? null);
        setSelectedAsset(null);
        setPredictionData(null);
        setAiGuideRequestId(null);
        setIsAiGuidePending(false);
        setAnalysisSnapshot(
          data.foodName ? { foodName: data.foodName } : null
        );
        setEditCarbsGrams(
          data.carbsGrams != null ? data.carbsGrams : null
        );
        setEditAiGuide(data.aiGuide ?? null);
        setNoticeMessage(null);
      } catch (error) {
        console.warn(error);
        if (isActive) {
          Alert.alert(
            "\ubd88\ub7ec\uc624\uae30 \uc2e4\ud328",
            "\uae30\ub85d \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694."
          );
        }
      } finally {
        if (isActive) {
          setIsEditLoading(false);
        }
      }
    };
    void loadMealForEdit();
    return () => {
      isActive = false;
    };
  }, [isEditMode, editMealId]);

  useEffect(() => {
    if (!resolvedPhotoUri) {
      return;
    }
    const appliedDate = resolvedCapturedAt ? new Date(resolvedCapturedAt) : new Date();
    setMealDate(appliedDate);
    setMealTime(appliedDate);
    setMealType(getMealTypeByTime(appliedDate));
    setIsMealTypeAuto(true);
    setNoticeMessage("메타데이터가 없어 현재 시간으로 입력했어요.");

    const asset = {
      uri: resolvedPhotoUri,
      fileName: `camera-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
    } as ImagePicker.ImagePickerAsset;
    setSelectedAsset(asset);
    setSelectedImage(resolvedPhotoUri);
    setPredictionData(null);
    setAiGuideRequestId(null);
    setIsAiGuidePending(false);
    setAnalysisSnapshot(null);
    analyzeImage(asset);

    (navigation as { setParams?: (params: Record<string, unknown>) => void })
      ?.setParams?.({ photoUri: undefined, capturedAt: undefined });
  }, [resolvedPhotoUri, resolvedCapturedAt, navigation]);

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
      const nextTime = buildTimeDate(mealDate, timePeriod, timeHour, timeMinute);
      setMealTime(nextTime);
      applyMealTypeByTime(nextTime);
    }
    setPickerMode(null);
  };

  const clearImage = React.useCallback(() => {
    if (isEditMode) {
      return;
    }
    setSelectedImage(null);
    setSelectedAsset(null);
    setPredictionData(null);
    setAiGuideRequestId(null);
    setIsAiGuidePending(false);
    setAnalysisSnapshot(null);
    setNoticeMessage(null);
  }, [isEditMode]);

  const resetForm = React.useCallback(() => {
    const now = new Date();
    clearImage();
    setMealType(getMealTypeByTime(now));
    setIsMealTypeAuto(true);
    setMealDate(now);
    setMealTime(now);
    setMemo("");
    setWeightGramsInput("");
    setServingCountInput("");
    setEditCarbsGrams(null);
    setEditAiGuide(null);
    setAutoAdvanceTime(false);
    setPickerMode(null);
    setIsAnalyzing(false);
    setTempDate(now);
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    const parts = getTimeParts(now);
    setTimePeriod(parts.period);
    setTimeHour(parts.hour);
    setTimeMinute(parts.minute);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [clearImage]);

  const applyMealTypeByTime = React.useCallback(
    (date: Date) => {
      if (isEditMode || !isMealTypeAuto) {
        return;
      }
      setMealType(getMealTypeByTime(date));
    },
    [isEditMode, isMealTypeAuto]
  );

  const parseOptionalNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const normalized = trimmed.replace(/,/g, "");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  };

  useEffect(() => {
    if (isEditMode) {
      wasEditModeRef.current = true;
      return;
    }
    if (wasEditModeRef.current) {
      wasEditModeRef.current = false;
      resetForm();
    }
  }, [isEditMode, resetForm]);

  const confirmReplaceMeal = React.useCallback(
    (targetDate: Date, targetMealLabel: string) =>
      new Promise<boolean>((resolve) => {
        replaceResolverRef.current = resolve;
        setReplacePrompt({
          visible: true,
          message: `${formatDate(targetDate)} ${targetMealLabel} 기록이 있어요. 덮어쓸까요?`,
        });
      }),
    []
  );

  const closeReplacePrompt = React.useCallback((choice: boolean) => {
    setReplacePrompt((prev) => ({ ...prev, visible: false }));
    const resolver = replaceResolverRef.current;
    replaceResolverRef.current = null;
    if (resolver) {
      resolver(choice);
    }
  }, []);

  const findConflictingMealIds = React.useCallback(
    (meals: Array<{ mealId?: number; mealType?: string; eatenAt?: string }>) => {
      const targetMealType = mealTypeMap[mealType] ?? "SNACK";
      const targetDateKey = formatApiDate(mealDate);
      return meals
        .filter((meal) => {
          if (!meal.mealId || !meal.mealType || !meal.eatenAt) {
            return false;
          }
          const parsed = parseApiDateTime(meal.eatenAt);
          if (!parsed) return false;
          const dateKey = formatApiDate(parsed);
          return meal.mealType === targetMealType && dateKey === targetDateKey;
        })
        .map((meal) => meal.mealId as number);
    },
    [mealDate, mealType]
  );

  /* Add this ref near other refs */
  const shouldResetOnFocusRef = useRef(false);

  /* ... existing code ... */

  useFocusEffect(
    React.useCallback(() => {
      if (shouldResetOnFocusRef.current) {
        shouldResetOnFocusRef.current = false;
        resetForm();
        return;
      }

      if (isEditMode) {
        return;
      }
      if (resolvedPhotoUri) {
        return;
      }
      if (selectedAsset || selectedImage) {
        return;
      }
      resetForm();
    }, [isEditMode, resetForm, selectedAsset, selectedImage, resolvedPhotoUri])
  );

  useFocusEffect(
    React.useCallback(() => {
      void loadDiabetesType();
    }, [loadDiabetesType])
  );

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (isEditMode) {
          (navigation as { setParams?: (params: Record<string, unknown>) => void })
            .setParams?.({ mealId: undefined });
        }
      };
    }, [isEditMode, navigation])
  );

  useEffect(() => {
    if (!aiGuideRequestId || !isAiGuidePending) {
      return;
    }

    let isActive = true;
    let inFlight = false;
    let attempts = 0;
    const maxAttempts = 20;

    const stopPolling = () => {
      setIsAiGuidePending(false);
      setAiGuideRequestId(null);
    };

    const applyFallbackGuide = () => {
      setPredictionData((prev) => {
        if (!prev) return prev;
        if (prev.guide !== GUIDE_PENDING_TEXT) return prev;
        return { ...prev, guide: buildFallbackPrediction().guide };
      });
    };

    const pollGuide = async () => {
      if (!isActive || inFlight) {
        return;
      }
      inFlight = true;
      try {
        await loadAuthSession();
        const response = await fetch(
          `${API_BASE_URL}/api/v1/ai/food/guides/${aiGuideRequestId}`,
          { headers: getAuthHeaders() }
        );
        attempts += 1;
        if (!response.ok) {
          if (attempts >= maxAttempts) {
            applyFallbackGuide();
            stopPolling();
          }
          return;
        }

        const payload = (await response.json()) as {
          status?: string;
          aiGuide?: string | null;
          message?: string | null;
        };
        const status = payload.status?.toUpperCase();

        if (status === "COMPLETED") {
          const guide = payload.aiGuide?.trim();
          if (guide) {
            setPredictionData((prev) =>
              prev
                ? {
                  ...prev,
                  guide,
                }
                : prev
            );
          } else {
            applyFallbackGuide();
          }
          stopPolling();
          return;
        }

        if (status === "FAILED") {
          applyFallbackGuide();
          stopPolling();
          return;
        }

        if (attempts >= maxAttempts) {
          applyFallbackGuide();
          stopPolling();
        }
      } catch (error) {
        attempts += 1;
        if (attempts >= maxAttempts) {
          applyFallbackGuide();
          stopPolling();
        }
      } finally {
        inFlight = false;
      }
    };

    void pollGuide();
    const interval = setInterval(() => {
      void pollGuide();
    }, 1500);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [aiGuideRequestId, isAiGuidePending]);

  const handleSubmit = async () => {
    if (!selectedAsset || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const headers = getAuthHeaders();
      let existingMealIds: number[] = [];
      try {
        const listResponse = await fetch(`${API_BASE_URL}/api/v1/meals`, {
          headers,
        });
        if (listResponse.ok) {
          const meals = (await listResponse.json()) as Array<{
            mealId?: number;
            mealType?: string;
            eatenAt?: string;
          }>;
          existingMealIds = findConflictingMealIds(meals);
        }
      } catch {
        // Ignore lookup errors and proceed without replacement prompt.
      }

      if (existingMealIds.length > 0) {
        const shouldReplace = await confirmReplaceMeal(mealDate, mealType);
        if (!shouldReplace) {
          return;
        }
        const deleteResults = await Promise.all(
          existingMealIds.map((mealId) =>
            fetch(`${API_BASE_URL}/api/v1/meals/${mealId}`, {
              method: "DELETE",
              headers,
            })
          )
        );
        const failedDelete = deleteResults.find((result) => !result.ok);
        if (failedDelete) {
          throw new Error("기존 기록을 삭제하지 못했어요.");
        }
      }

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
      if (analysisSnapshot?.foodName && analysisSnapshot.foodName.trim()) {
        formData.append("foodName", analysisSnapshot.foodName.trim());
      }
      if (analysisSnapshot?.nutrition?.carbs != null) {
        formData.append("carbsGrams", String(analysisSnapshot.nutrition.carbs));
      }
      const weightGrams = parseOptionalNumber(weightGramsInput);
      if (weightGrams != null) {
        formData.append("weightGrams", String(weightGrams));
      }
      const servingCount = parseOptionalNumber(servingCountInput);
      if (servingCount != null) {
        formData.append("servingCount", String(servingCount));
      }
      const resolvedGuide = (predictionData?.guide ?? editAiGuide ?? "").trim();
      if (
        !isAiGuidePending &&
        resolvedGuide.length > 0 &&
        resolvedGuide !== GUIDE_PENDING_TEXT
      ) {
        formData.append("aiGuide", resolvedGuide);
      }
      formData.append("mealType", mealTypeMap[mealType] ?? "SNACK");
      formData.append("eatenAt", eatenAt.toISOString());
      if (memo.trim()) {
        formData.append("memo", memo.trim());
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/meals`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error("식사 기록 저장에 실패했어요.");
      }

      resetForm();
      shouldResetOnFocusRef.current = true;
      router.replace("/(tabs)");
    } catch (error) {
      console.warn(error);
      if (error instanceof Error) {
        Alert.alert("저장 실패", error.message);
      } else {
        Alert.alert("저장 실패", "식단 기록 저장에 실패했어요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!isEditMode || !Number.isFinite(editMealId) || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await loadAuthSession();
      const parts = getTimeParts(mealTime);
      const eatenAt = buildTimeDate(
        mealDate,
        parts.period,
        parts.hour,
        parts.minute
      );

      if (selectedAsset) {
        const formData = new FormData();
        formData.append("image", {
          uri: selectedAsset.uri,
          name:
            selectedAsset.fileName ??
            `meal-${Date.now()}.${selectedAsset.uri.split(".").pop() ?? "jpg"}`,
          type: selectedAsset.mimeType ?? "image/jpeg",
        } as unknown as Blob);
        const imageResponse = await fetch(
          `${API_BASE_URL}/api/v1/meals/${editMealId}/image`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: formData,
          }
        );

        if (!imageResponse.ok) {
          throw new Error("\uae30\ub85d \uc218\uc815\uc5d0 \uc2e4\ud328\ud588\uc5b4\uc694.");
        }
      }

      const payload: Record<string, unknown> = {
        mealType: mealTypeMap[mealType] ?? "SNACK",
        eatenAt: eatenAt.toISOString(),
        memo: memo.trim(),
      };
      if (analysisSnapshot?.foodName && analysisSnapshot.foodName.trim()) {
        payload.foodName = analysisSnapshot.foodName.trim();
      }
      const resolvedCarbs =
        analysisSnapshot?.nutrition?.carbs ?? editCarbsGrams;
      if (resolvedCarbs != null) {
        payload.carbsGrams = resolvedCarbs;
      }
      const resolvedWeight = parseOptionalNumber(weightGramsInput);
      if (resolvedWeight != null) {
        payload.weightGrams = resolvedWeight;
      }
      const resolvedServing = parseOptionalNumber(servingCountInput);
      if (resolvedServing != null) {
        payload.servingCount = resolvedServing;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/meals/${editMealId}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("\uae30\ub85d \uc218\uc815\uc5d0 \uc2e4\ud328\ud588\uc5b4\uc694.");
      }

      router.replace({
        pathname: "/(tabs)/meal-detail",
        params: { mealId: String(editMealId) },
      });
    } catch (error) {
      console.warn(error);
      const message =
        error instanceof Error
          ? error.message
          : "\uae30\ub85d \uc218\uc815\uc5d0 \uc2e4\ud328\ud588\uc5b4\uc694.";
      Alert.alert("\uc218\uc815 \uc2e4\ud328", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setImageLayout({ width, height });
    }
  };

  const loadDiabetesType = React.useCallback(async () => {
    try {
      await loadAuthSession();
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        return;
      }
      const profile = (await response.json()) as { diabetesType?: string | null };
      setDiabetesType(profile.diabetesType ?? null);
    } catch {
      // Ignore profile load errors.
    }
  }, []);

  const handleDirectEdit = () => {
    setAutoAdvanceTime(true);
    openPicker("date");
  };

  const parseServingBaseGrams = (servingSize?: string) => {
    if (!servingSize) return null;
    const match = servingSize.match(/(\d+(?:\.\d+)?)\s*g/i);
    if (!match) return null;
    const grams = Number(match[1]);
    return Number.isFinite(grams) ? grams : null;
  };

  const servingBaseGrams = parseServingBaseGrams(
    predictionData?.nutrition?.servingSize
  );
  const servingCountValue = Number(servingCountInput);
  const servingApproxGrams =
    servingBaseGrams != null && Number.isFinite(servingCountValue) && servingCountValue > 0
      ? Math.round(servingBaseGrams * servingCountValue)
      : null;

  const analyzeImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsAnalyzing(true);
    setAiGuideRequestId(null);
    setIsAiGuidePending(false);
    try {
      await loadAuthSession();
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
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        throw new Error("AI 분석 요청에 실패했어요.");
      }

      const data = (await response.json()) as {
        labels?: string[];
        values?: number[];
        guide?: string;
        aiGuide?: string;
        aiGuideStatus?: string;
        aiGuideRequestId?: string | null;
        foodName?: string;
        foodBox?: {
          x_min?: number;
          y_min?: number;
          x_max?: number;
          y_max?: number;
        };
        nutrition?: NutritionData;
      };
      const normalizedName = normalizeFoodName(data.foodName);
      setAnalysisSnapshot(
        normalizedName.failed
          ? { nutrition: data.nutrition }
          : { foodName: normalizedName.label, nutrition: data.nutrition }
      );
      const labels =
        data.labels?.map((label) =>
          label.endsWith("분") ? label : `${label}분`
        ) ?? [];

      const status = data.aiGuideStatus?.toUpperCase();
      const hasAiGuide = !!(data.aiGuide && data.aiGuide.trim().length > 0);
      const shouldPollGuide = status === "PENDING" && !!data.aiGuideRequestId;
      setAiGuideRequestId(shouldPollGuide ? data.aiGuideRequestId ?? null : null);
      setIsAiGuidePending(shouldPollGuide);

      const resolvedGuide =
        hasAiGuide
          ? data.aiGuide
          : shouldPollGuide
            ? GUIDE_PENDING_TEXT
            : data.guide ?? buildFallbackPrediction().guide;

      setPredictionData({
        graphData: {
          labels: labels.length > 0 ? labels : ["0분", "30분", "60분", "90분", "120분"],
          datasets: [
            {
              data: data.values?.length ? data.values : [108, 126, 142, 131, 118],
              color: (opacity = 1) => `rgba(127, 175, 123, ${opacity})`,
              strokeWidth: 3,
            },
          ],
        },
        guide: resolvedGuide,
        foodName: normalizedName.label,
        foodNameFailed: normalizedName.failed,
        foodBox: data.foodBox,
        nutrition: data.nutrition ?? fallbackNutrition,
      });
    } catch (error) {
      console.warn(error);
      setAiGuideRequestId(null);
      setIsAiGuidePending(false);
      const fallback = buildFallbackPrediction();
      setPredictionData({ ...fallback, foodName: "분석 실패", foodNameFailed: true });
      setAnalysisSnapshot(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("\uad8c\ud55c \ud544\uc694", "\uac24\ub7ec\ub9ac \uc811\uadfc \uad8c\ud55c\uc744 \ud5c8\uc6a9\ud574\uc8fc\uc138\uc694.");
      return;
    }
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
      setMealType(getMealTypeByTime(appliedDate));
      setIsMealTypeAuto(true);
      setNoticeMessage(
        exifDate
          ? "\uc0ac\uc9c4\uc758 \ucd2c\uc601 \uc2dc\uac04\uc73c\ub85c \uc790\ub3d9 \uc785\ub825\ud588\uc5b4\uc694."
          : "\uba54\ud0c0\ub370\uc774\ud130\uac00 \uc5c6\uc5b4 \ud604\uc7ac \uc2dc\uac04\uc73c\ub85c \uc785\ub825\ud588\uc5b4\uc694."
      );
      setSelectedAsset(asset);
      setSelectedImage(asset.uri);
      setPredictionData(null);
      setAnalysisSnapshot(null);
      analyzeImage(asset);
    }
  };



  const pickImageFromCamera = () => {
    router.push("/(tabs)/meal-camera");
  };



  const calendarCells = getMonthMatrix(calendarMonth);
  const isTimePicker = pickerMode === "time";
  const isSubmitDisabled =
    isSubmitting || isEditLoading || (!isEditMode && !selectedAsset);
  const showFooter = isEditMode || !!selectedImage;
  const showPostAnalysisFields = isEditMode
    ? !isAnalyzing
    : !!selectedImage && !isAnalyzing && !!predictionData;
  const footerButtonLabel = isSubmitting
    ? isEditMode
      ? "\uc218\uc815 \uc911..."
      : "\uc800\uc7a5 \uc911..."
    : isEditMode
      ? "\uc218\uc815 \uc644\ub8cc"
      : "\uae30\ub85d \uc644\ub8cc";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={styles.backgroundPanel} />
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[
          styles.page,
          isEditMode && styles.pageEdit,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View
          style={[
            styles.headerRow,
            { paddingTop: headerPaddingTop },
            isEditMode && styles.headerRowEdit,
          ]}
        >
          <View style={styles.headerSide}>
            {isEditMode ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="chevron-back" size={20} color={palette.text} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.pageTitle}>
            {isEditMode ? "\uae30\ub85d \uc218\uc815" : "\uc2dd\ub2e8 \uae30\ub85d"}
          </Text>
          <View style={styles.headerSide} />
        </View>

        <Text
          style={[
            styles.sectionTitle,
            isEditMode && styles.sectionTitleEdit,
            isEditMode && styles.sectionTitleFirstEdit,
          ]}
        >
          식사 유형
        </Text>
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
                onPress={() => {
                  setMealType(type);
                  setIsMealTypeAuto(false);
                }}
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

        {(selectedImage || isEditMode) && (
          <View style={styles.infoRow}>
            <TouchableOpacity
              style={styles.infoCard}
              onPress={() => openPicker("date")}
            >
              <Text style={styles.infoLabel}>식사 날짜</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{formatDate(mealDate)}</Text>
                <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.infoCard}
              onPress={() => openPicker("time")}
            >
              <Text style={styles.infoLabel}>식사 시간</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{formatTime(mealTime)}</Text>
                <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {(selectedImage || isEditMode) && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>
              {noticeMessage ?? "\uc0ac\uc9c4\uc758 \ucd2c\uc601 \uc2dc\uac04\uc73c\ub85c \uc790\ub3d9 \uc785\ub825\ud588\uc5b4\uc694."}
            </Text>
            <TouchableOpacity onPress={handleDirectEdit}>
              <Text style={styles.noticeAction}>{"\uc9c1\uc811 \uc218\uc815\ud558\uae30"}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text
          style={[styles.sectionTitle, isEditMode && styles.sectionTitleEdit]}
        >
          {"\uc0ac\uc9c4"}
        </Text>
        {!selectedImage ? (
          <View style={styles.imagePickerCard}>
            <Text style={styles.imagePickerTitle}>{"\uc74c\uc2dd \uc0ac\uc9c4\uc744 \ucd94\uac00\ud574\ubcf4\uc138\uc694"}</Text>
            <Text style={styles.imagePickerSubtitle}>
              {isEditMode
                ? "\uac24\ub7ec\ub9ac\uc5d0\uc11c \uc0ac\uc9c4\uc744 \uc120\ud0dd\ud560 \uc218 \uc788\uc5b4\uc694."
                : "\uac24\ub7ec\ub9ac\uc5d0\uc11c \uc120\ud0dd\ud558\uac70\ub098 \uc9c0\uae08 \ucd2c\uc601\ud560 \uc218 \uc788\uc5b4\uc694."}
            </Text>
            <View style={styles.imagePickerActions}>
              {!isEditMode && (
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickImageFromCamera}
                >
                  <Text style={styles.imagePickerButtonText}>{"\ucd2c\uc601\ud558\uae30"}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.imagePickerButton,
                  !isEditMode && styles.imagePickerButtonSecondary,
                ]}
                onPress={pickImage}
              >
                <Text
                  style={[
                    styles.imagePickerButtonText,
                    !isEditMode && styles.imagePickerButtonTextSecondary,
                  ]}
                >
                  {isEditMode ? "\uc0ac\uc9c4 \ubcc0\uacbd" : "\uc0ac\uc9c4"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.imageCard} onLayout={handleImageLayout}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            {isAnalyzing && (
              <View style={styles.imageAnalyzingOverlay}>
                <View style={styles.imageAnalyzingPill}>
                  <ActivityIndicator size="small" color="#FAF8F0" />
                  <Text style={styles.imageAnalyzingPillText}>AI 분석 중...</Text>
                </View>
              </View>
            )}
            {!isEditMode && (
              <TouchableOpacity
                style={styles.imageRemoveButton}
                onPress={clearImage}
              >
                <Ionicons name="close" size={16} color="#FAF8F0" />
              </TouchableOpacity>
            )}
            {predictionData?.foodName ? (
              <View
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  if (width && height) {
                    setFoodTagSize({ width, height });
                  }
                }}
                style={[
                  styles.imageTag,
                  predictionData.foodBox &&
                    imageLayout.width > 0 &&
                    imageLayout.height > 0 &&
                    predictionData.foodBox.x_min != null &&
                    predictionData.foodBox.y_min != null &&
                    predictionData.foodBox.x_max != null &&
                    predictionData.foodBox.y_max != null
                    ? {
                      left: Math.min(
                        Math.max(
                          8,
                          ((predictionData.foodBox.x_min +
                            predictionData.foodBox.x_max) /
                            2) *
                          imageLayout.width
                        ),
                        imageLayout.width - 8
                      ),
                      top: Math.min(
                        Math.max(
                          8,
                          ((predictionData.foodBox.y_min +
                            predictionData.foodBox.y_max) /
                            2) *
                          imageLayout.height
                        ),
                        imageLayout.height - 8
                      ),
                      bottom: "auto",
                      transform: [
                        {
                          translateX: foodTagSize.width
                            ? -foodTagSize.width / 2
                            : 0,
                        },
                        {
                          translateY: foodTagSize.height
                            ? -foodTagSize.height / 2
                            : 0,
                        },
                      ],
                    }
                    : null,
                ]}
              >
                <Text style={styles.imageTagText}>
                  {predictionData.foodName}
                </Text>
              </View>
            ) : null}
          </View>
        )}
        {selectedAsset &&
          predictionData?.foodNameFailed &&
          !isAnalyzing && (
            <View style={styles.imageRetryRow}>
              <TouchableOpacity
                style={styles.imageRetryButton}
                onPress={() => analyzeImage(selectedAsset)}
              >
                <Ionicons name="refresh" size={16} color={palette.accentDark} />
                <Text style={styles.imageRetryText}>재분석</Text>
              </TouchableOpacity>
            </View>
          )}
        {isEditMode && (
          <View style={styles.imagePickerActions}>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={pickImage}
            >
              <Text style={styles.imagePickerButtonText}>{"\uc0ac\uc9c4 \ubcc0\uacbd"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedImage && predictionData && (
          <View style={styles.resultsContainer}>
            <Text
              style={[styles.sectionTitle, isEditMode && styles.sectionTitleEdit]}
            >
              예상 혈당 변화
            </Text>
            <View style={styles.predictionBlock}>
              <Text style={styles.predictionTitle}>예상 혈당 반응</Text>
              <Text style={styles.predictionSubtitle}>
                {getPredictionSummary(
                  diabetesType,
                  predictionData.graphData.datasets[0].data
                )}
              </Text>
              <View style={styles.predictionStats}>
                <View style={styles.predictionStat}>
                  <Text style={styles.predictionLabel}>식전</Text>
                  <View style={styles.predictionValueRow}>
                    <Text style={styles.predictionValue}>
                      {Math.round(
                        predictionData.graphData.datasets[0]?.data?.[0] ?? 0
                      )}
                    </Text>
                    <Text style={styles.predictionUnit}>mg/dL</Text>
                  </View>
                </View>
                <View style={styles.predictionDivider} />
                <View style={styles.predictionStat}>
                  <Text style={styles.predictionLabel}>예상 최고점</Text>
                  <View style={styles.predictionValueRow}>
                    <Text style={styles.predictionValue}>
                      {Math.round(
                        Math.max(...predictionData.graphData.datasets[0].data)
                      )}
                    </Text>
                    <Text style={styles.predictionUnit}>mg/dL</Text>
                  </View>
                </View>
                <View style={styles.predictionDivider} />
                <View style={styles.predictionStat}>
                  <Text style={styles.predictionLabel}>2시간 예상</Text>
                  <View style={styles.predictionValueRow}>
                    <Text style={styles.predictionValue}>
                      {Math.round(
                        predictionData.graphData.datasets[0].data[
                        predictionData.graphData.datasets[0].data.length - 1
                        ]
                      )}
                    </Text>
                    <Text style={styles.predictionUnit}>mg/dL</Text>
                  </View>
                </View>
              </View>
              <View style={styles.predictionChart}>
                <LineChart
                  data={predictionData.graphData}
                  width={chartWidth - 20}
                  height={220}
                  yAxisSuffix="mg/dL"
                  yAxisInterval={1}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.graphStyle}
                />
              </View>
            </View>

            <Text
              style={[styles.sectionTitle, isEditMode && styles.sectionTitleEdit]}
            >
              AI 섭취 가이드
            </Text>
            <View
              style={[
                styles.aiGuideCard,
                isEditMode && styles.editSectionCardSpacing,
              ]}
            >
              <View style={styles.aiGuideHeader}>
                <View style={styles.aiChip}>
                  <View style={styles.aiChipDot} />
                  <Text style={styles.aiChipText}>AI INSIGHT</Text>
                </View>
                <Text style={styles.aiMetaText}>이미지·영양·혈당 패턴 기반</Text>
              </View>
              {isAiGuidePending ? (
                <View style={styles.aiGuideLoadingRow}>
                  <ActivityIndicator size="small" color={palette.accentDark} />
                  <Text style={styles.aiGuideLoadingText}>{GUIDE_PENDING_TEXT}</Text>
                </View>
              ) : (
                <AiGuideText text={predictionData.guide} textStyle={styles.aiGuideText} />
              )}
              <View style={styles.aiGuideFooter}>
                <View style={styles.aiPulse} />
                <Text style={styles.aiFooterText}>
                  {isAiGuidePending
                    ? "맞춤 코칭 생성 중..."
                    : "AI가 생성한 맞춤 코칭을 참고하세요."}
                </Text>
              </View>
            </View>

            <Text
              style={[styles.sectionTitle, isEditMode && styles.sectionTitleEdit]}
            >
              영양 성분
            </Text>
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

        {isEditMode && editAiGuide && !selectedAsset ? (
          <>
            <Text
              style={[styles.sectionTitle, isEditMode && styles.sectionTitleEdit]}
            >
              AI 섭취 가이드
            </Text>
            <View
              style={[
                styles.aiGuideCard,
                isEditMode && styles.editSectionCardSpacing,
              ]}
            >
              <View style={styles.aiGuideHeader}>
                <View style={styles.aiChip}>
                  <View style={styles.aiChipDot} />
                  <Text style={styles.aiChipText}>AI INSIGHT</Text>
                </View>
                <Text style={styles.aiMetaText}>이미지·영양·혈당 패턴 기반</Text>
              </View>
              <Text style={styles.aiGuideTitle}>AI가 가이드를 제공해요</Text>
              <AiGuideText text={editAiGuide} textStyle={styles.aiGuideText} />
              <View style={styles.aiGuideFooter}>
                <View style={styles.aiPulse} />
                <Text style={styles.aiFooterText}>
                  AI가 생성한 맞춤 코칭을 참고하세요.
                </Text>
              </View>
            </View>
          </>
        ) : null}


        {showPostAnalysisFields && (
          <>
            <Text
              style={[styles.sectionTitle, isEditMode && styles.sectionTitleEdit]}
            >
              중량/인분
            </Text>
            <Text style={styles.portionHint}>
              인분 또는 중량 중 하나만 입력하세요.
            </Text>
            <View style={styles.portionSegmented}>
              <TouchableOpacity
                style={[
                  styles.portionSegmentButton,
                  portionInputMode === "serving" && styles.portionSegmentButtonActive,
                ]}
                onPress={() => {
                  setPortionInputMode("serving");
                  setWeightGramsInput("");
                }}
              >
                <Text
                  style={[
                    styles.portionSegmentText,
                    portionInputMode === "serving" && styles.portionSegmentTextActive,
                  ]}
                >
                  인분
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.portionSegmentButton,
                  portionInputMode === "grams" && styles.portionSegmentButtonActive,
                ]}
                onPress={() => {
                  setPortionInputMode("grams");
                  setServingCountInput("");
                }}
              >
                <Text
                  style={[
                    styles.portionSegmentText,
                    portionInputMode === "grams" && styles.portionSegmentTextActive,
                  ]}
                >
                  중량(g)
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.portionCard,
                isEditMode && styles.editSectionCardSpacing,
              ]}
            >
              {portionInputMode === "serving" ? (
                <>
                  <Text style={styles.portionFieldLabel}>섭취 인분</Text>
                  <View style={styles.portionInputContainer}>
                    <TextInput
                      value={servingCountInput}
                      onChangeText={setServingCountInput}
                      placeholder="예) 1.0"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="decimal-pad"
                      style={styles.portionInput}
                    />
                    <Text style={styles.portionUnit}>인분</Text>
                  </View>
                  {servingApproxGrams != null && (
                    <Text style={styles.portionApprox}>약 {servingApproxGrams}g</Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.portionFieldLabel}>섭취 중량</Text>
                  <View style={styles.portionInputContainer}>
                    <TextInput
                      value={weightGramsInput}
                      onChangeText={setWeightGramsInput}
                      placeholder="예) 200"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="decimal-pad"
                      style={styles.portionInput}
                    />
                    <Text style={styles.portionUnit}>g</Text>
                  </View>
                </>
              )}
            </View>
          </>
        )}

        {showPostAnalysisFields && (
          <>
            <Text
              style={[styles.sectionTitle, isEditMode && styles.sectionTitleEdit]}
            >
              메모
            </Text>
            <View
              style={[
                styles.memoCard,
                isEditMode && styles.editSectionCardSpacing,
              ]}
            >
              <TextInput
                value={memo}
                onChangeText={setMemo}
                placeholder="자유롭게 메모를 남겨보세요."
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
      {showFooter && (
        <View style={styles.footerBar}>
          <View pointerEvents="none" style={styles.footerFade} />
          <TouchableOpacity
            style={[
              styles.footerButton,
              isSubmitDisabled && styles.footerButtonDisabled,
            ]}
            onPress={isEditMode ? handleUpdate : handleSubmit}
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
      )}
      {replacePrompt.visible && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => closeReplacePrompt(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>기록 덮어쓰기</Text>
              <Text style={styles.confirmMessage}>{replacePrompt.message}</Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.confirmButtonCancel]}
                  onPress={() => closeReplacePrompt(false)}
                >
                  <Text style={styles.confirmButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.confirmButtonPrimary]}
                  onPress={() => closeReplacePrompt(true)}
                >
                  <Text
                    style={[
                      styles.confirmButtonText,
                      styles.confirmButtonTextPrimary,
                    ]}
                  >
                    덮어쓰기
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
                    확인
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
                      <Ionicons name="chevron-back" size={16} color={palette.textMuted} />
                    </TouchableOpacity>
                    <Text style={styles.calendarTitle}>
                      {`${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`}
                    </Text>
                    <TouchableOpacity
                      style={styles.calendarNavButton}
                      onPress={() =>
                        setCalendarMonth(shiftMonth(calendarMonth, 1))
                      }
                    >
                      <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
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
  backgroundColor: palette.card,
  backgroundGradientFrom: palette.card,
  backgroundGradientTo: palette.card,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(127, 175, 123, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 116, 102, ${opacity})`,
  fillShadowGradient: "rgba(127, 175, 123, 0.25)",
  fillShadowGradientOpacity: 0.45,
  style: {
    borderRadius: 18,
  },
  propsForBackgroundLines: {
    stroke: "rgba(107, 116, 102, 0.2)",
    strokeDasharray: "4 6",
  },
  propsForLabels: {
    fontSize: 11,
    fontWeight: "600",
  },
  propsForDots: {
    r: "4.5",
    strokeWidth: "2.5",
    stroke: palette.card,
  },
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backgroundPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%",
    backgroundColor: palette.panel,
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
  },
  container: { flex: 1, zIndex: 1 },
  page: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 140,
  },
  pageEdit: {
    paddingTop: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerRowEdit: {
    marginBottom: 0,
  },
  headerSide: {
    minWidth: 72,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  backButtonText: {
    fontSize: 20,
    color: palette.text,
  },
  pageTitle: { fontSize: 18, fontWeight: "700", color: palette.text },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    marginTop: 12,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionTitleEdit: {
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitleFirstEdit: {
    marginTop: 8,
  },
  editSectionCardSpacing: {
    marginBottom: 6,
  },
  mealTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  mealTypeChip: {
    backgroundColor: "#F0EBDD",
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
  portionHint: {
    marginTop: 2,
    marginBottom: 10,
    color: palette.textMuted,
    fontSize: 12,
    paddingLeft: 4,
  },
  portionSegmented: {
    flexDirection: "row",
    backgroundColor: "#EFE4D1",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
  },
  portionSegmentButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  portionSegmentButtonActive: {
    backgroundColor: palette.card,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  portionSegmentText: {
    color: palette.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
  portionSegmentTextActive: {
    color: palette.text,
    fontWeight: "800",
  },
  portionCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
  },
  portionFieldLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "600",
  },
  portionInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4E8D6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  portionInput: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 0,
  },
  portionUnit: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  portionApprox: {
    marginTop: 8,
    color: palette.accentDark,
    fontSize: 12,
    fontWeight: "600",
  },
  noticeCard: {
    backgroundColor: "#E6EDD8",
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  noticeTitle: {
    color: palette.text,
    fontWeight: "600",
    marginBottom: 6,
  },
  noticeAction: {
    color: palette.accentDark,
    fontWeight: "700",
  },
  imagePickerCard: {
    backgroundColor: palette.card,
    borderRadius: 22,
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: palette.accent,
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
  imagePickerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    alignSelf: "stretch",
  },
  imagePickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: palette.accent,
  },
  imagePickerButtonSecondary: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  imagePickerButtonText: {
    color: palette.ink,
    fontWeight: "700",
  },
  imagePickerButtonTextSecondary: {
    color: palette.text,
  },
  imageCard: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.border,
    position: "relative",
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
    backgroundColor: "rgba(31, 36, 31, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageRemoveText: { color: "#FAF8F0", fontWeight: "700" },
  imageTag: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "rgba(31, 36, 31, 0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  imageTagText: { color: "#FAF8F0", fontWeight: "600", fontSize: 12 },
  imageRetryRow: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  imageRetryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(127, 175, 123, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(127, 175, 123, 0.35)",
  },
  imageRetryText: {
    color: palette.accentDark,
    fontSize: 13,
    fontWeight: "700",
  },
  imageAnalyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 22, 17, 0.28)",
  },
  imageAnalyzingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(31, 36, 31, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(250, 248, 240, 0.25)",
  },
  imageAnalyzingPillText: {
    color: "#FAF8F0",
    fontSize: 15,
    fontWeight: "700",
  },
  resultsContainer: {
    marginTop: 0,
  },
  predictionBlock: {
    backgroundColor: palette.card,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(107, 116, 102, 0.2)",
    marginBottom: 0,
  },
  predictionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  predictionSubtitle: {
    color: palette.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  predictionStats: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  predictionStat: {
    flex: 1,
  },
  predictionLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  predictionValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  predictionValue: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.accentDark,
    marginRight: 6,
  },
  predictionUnit: {
    fontSize: 12,
    color: palette.textMuted,
    marginBottom: 2,
  },
  predictionDivider: {
    width: 1,
    backgroundColor: "rgba(107, 116, 102, 0.2)",
    marginHorizontal: 12,
  },
  predictionChart: {
    marginTop: 16,
    paddingVertical: 6,
  },
  chartCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(107, 116, 102, 0.2)",
    shadowColor: "#0B1220",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  graphStyle: {
    borderRadius: 18,
  },
  aiGuideCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(107, 116, 102, 0.2)",
    overflow: "hidden",
    shadowColor: "#0B1220",
    shadowOpacity: 0.25,
    shadowRadius: 16,
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
    fontSize: 16,
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
    fontSize: 14,
    lineHeight: 22,
  },
  aiGuideLoadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiGuideLoadingText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  aiGuideFooter: {
    marginTop: 14,
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
    backgroundColor: "#F9F5E9",
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
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    backgroundColor: palette.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(107, 116, 102, 0.18)",
    zIndex: 10,
  },
  footerFade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -10,
    height: 10,
    backgroundColor: "transparent",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#E7C17A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  footerButton: {
    backgroundColor: palette.accent,
    borderRadius: 20,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(31, 42, 31, 0.08)",
    shadowColor: palette.ink,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  footerButtonDisabled: {
    backgroundColor: "#EFE9D9",
    shadowOpacity: 0,
    elevation: 0,
  },
  footerButtonText: {
    color: palette.ink,
    fontWeight: "800",
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  footerButtonTextDisabled: {
    color: "#A5AE9C",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(31, 36, 31, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  confirmCard: {
    width: "100%",
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.ink,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.text,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 20,
    marginBottom: 18,
  },
  confirmActions: {
    flexDirection: "row",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmButtonCancel: {
    backgroundColor: "#F0EBDD",
    marginRight: 12,
  },
  confirmButtonPrimary: {
    backgroundColor: palette.ink,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
  },
  confirmButtonTextPrimary: {
    color: "#FAF8F0",
  },
  modalCard: {
    width: "100%",
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 18,
  },
  modalCardDark: {
    backgroundColor: "#E6EDD8",
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
    color: palette.text,
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
    color: palette.textMuted,
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
    backgroundColor: "#F9F5E9",
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
    borderColor: "rgba(127, 175, 123, 0.35)",
    backgroundColor: "rgba(127, 175, 123, 0.16)",
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
    color: "rgba(107, 116, 102, 0.65)",
    fontWeight: "600",
  },
  timeItemTextActive: {
    fontSize: 20,
    color: palette.accent,
    fontWeight: "700",
  },
});
