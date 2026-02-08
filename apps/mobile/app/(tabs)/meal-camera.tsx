import React from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuthHeaders, loadAuthSession } from "@/session";

const palette = {
  background: "#FAF8F0",
  text: "#1F241F",
  textMuted: "#6B7466",
  accent: "#7FAF7B",
  accentDark: "#4E7C5B",
  overlay: "rgba(31, 36, 31, 0.55)",
  warning: "#E7C17A",
  danger: "#D96D5B",
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type RiskLevel = "good" | "warn" | "danger" | null;
type QuickResult = {
  id: string;
  foodName: string;
  risk: RiskLevel;
  isFailed: boolean;
  photoUri: string;
  capturedAt: string;
};

const resolveRiskLabel = (risk: RiskLevel) => {
  switch (risk) {
    case "danger":
      return "위험";
    case "warn":
      return "주의";
    case "good":
      return "양호";
    default:
      return null;
  }
};

const resolveRiskColor = (risk: RiskLevel) => {
  switch (risk) {
    case "danger":
      return palette.danger;
    case "warn":
      return palette.warning;
    case "good":
      return palette.accent;
    default:
      return "transparent";
  }
};

const computeRiskLevel = (data: {
  values?: number[];
  nutrition?: { carbs?: number | null } | null;
}): RiskLevel => {
  if (data.values && data.values.length > 0) {
    const peak = Math.max(...data.values);
    if (peak >= 200) return "danger";
    if (peak >= 160) return "warn";
    return "good";
  }
  const carbs = data.nutrition?.carbs;
  if (carbs != null) {
    if (carbs >= 60) return "danger";
    if (carbs >= 30) return "warn";
    return "good";
  }
  return null;
};

export default function MealCameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = React.useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = React.useState<"back" | "front">("back");
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [isLiveAnalyzing, setIsLiveAnalyzing] = React.useState(false);
  const [sessionReady, setSessionReady] = React.useState(false);
  const [quickResults, setQuickResults] = React.useState<QuickResult[]>([]);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);

  const headerPaddingTop = Math.max(12, insets.top + 8);

  React.useEffect(() => {
    if (permission?.granted) {
      void (async () => {
        await loadAuthSession();
        setSessionReady(true);
      })();
    }
  }, [permission?.granted]);

  const normalizeFoodName = (name?: string | null) => {
    const trimmed = (name ?? "").trim();
    if (!trimmed) return { label: "분석 실패", failed: true };
    if (/unknown/i.test(trimmed)) return { label: "분석 실패", failed: true };
    return { label: trimmed, failed: false };
  };

  const runQuickAnalyze = async (
    photoUri: string,
    capturedAt: string,
    replaceId?: string
  ) => {
    if (!sessionReady) return;
    setIsLiveAnalyzing(true);
    if (replaceId) {
      setRetryingId(replaceId);
    }
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: photoUri,
        name: `quick-${Date.now()}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/ai/food/analyze?aiGuide=false`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      if (!response.ok) {
        const fallback = { label: "분석 실패", failed: true };
        setQuickResults((prev) => {
          const nextItem: QuickResult = {
            id: replaceId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            foodName: fallback.label,
            risk: null,
            isFailed: true,
            photoUri,
            capturedAt,
          };
          if (replaceId) {
            return prev.map((item) => (item.id === replaceId ? nextItem : item));
          }
          return [nextItem, ...prev];
        });
        return;
      }

      const data = (await response.json()) as {
        values?: number[];
        nutrition?: { carbs?: number | null } | null;
        foodName?: string | null;
        result?: Array<{ food_name?: string | null }> | null;
      };

      const detectedName =
        data.foodName ?? data.result?.[0]?.food_name ?? "Unknown food";
      const normalized = normalizeFoodName(detectedName);
      const risk = normalized.failed
        ? null
        : computeRiskLevel({ values: data.values, nutrition: data.nutrition });

      setQuickResults((prev) => {
        const nextItem: QuickResult = {
          id: replaceId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          foodName: normalized.label,
          risk,
          isFailed: normalized.failed,
          photoUri,
          capturedAt,
        };
        if (replaceId) {
          return prev.map((item) => (item.id === replaceId ? nextItem : item));
        }
        return [nextItem, ...prev];
      });
    } finally {
      setIsLiveAnalyzing(false);
      setRetryingId(null);
    }
  };

  const handleQuickAnalyze = async () => {
    if (!permission?.granted) return;
    if (!sessionReady) return;
    if (isCapturing) return;
    const camera = cameraRef.current as unknown as {
      takePictureAsync?: (options?: Record<string, unknown>) => Promise<{ uri: string }>;
    } | null;
    if (!camera?.takePictureAsync) return;

    setIsCapturing(true);
    try {
      const photo = await camera.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
        exif: false,
      });
      if (!photo?.uri) {
        return;
      }
      await runQuickAnalyze(photo.uri, new Date().toISOString());
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetryAnalyze = (item: QuickResult) => {
    if (retryingId || isCapturing) return;
    void runQuickAnalyze(item.photoUri, item.capturedAt, item.id);
  };

  const handleDetailAnalyze = (item: QuickResult) => {
    router.push({
      pathname: "/(tabs)/meal",
      params: {
        photoUri: item.photoUri,
        capturedAt: item.capturedAt,
      },
    });
  };

  const handleDelete = (id: string) => {
    setQuickResults((prev) => prev.filter((item) => item.id !== id));
  };

  const renderRightActions = (id: string) => {
    return (
      <Pressable style={styles.deleteAction} onPress={() => handleDelete(id)}>
        <Ionicons name="trash-outline" size={24} color="#FAF8F0" />
      </Pressable>
    );
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator color={palette.accentDark} />
          <Text style={styles.permissionText}>카메라 권한 확인 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={32} color={palette.accentDark} />
          <Text style={styles.permissionTitle}>카메라 권한이 필요해요</Text>
          <Text style={styles.permissionText}>
            음식 사진 촬영을 위해 카메라 접근을 허용해주세요.
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>권한 허용하기</Text>
          </Pressable>
          <Pressable style={styles.permissionGhost} onPress={() => router.back()}>
            <Text style={styles.permissionGhostText}>뒤로가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          <Pressable style={styles.headerSide} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FAF8F0" />
          </Pressable>
          <Text style={styles.headerTitle}>카메라</Text>
          <Pressable
            style={styles.headerSide}
            onPress={() =>
              setFacing((current) => (current === "back" ? "front" : "back"))
            }
          >
            <Ionicons name="camera-reverse" size={22} color="#FAF8F0" />
          </Pressable>
        </View>

        <View style={styles.guideContainer}>
          <View style={styles.guidePill}>
            <Ionicons name="sparkles" size={14} color="#FAF8F0" />
            <Text style={styles.guideText}>촬영 후 AI 분석이 시작돼요</Text>
          </View>
          {isLiveAnalyzing && (
            <View style={styles.liveRow}>
              <View style={styles.livePill}>
                <ActivityIndicator size="small" color="#FAF8F0" />
                <Text style={styles.liveText}>실시간 분석 중</Text>
              </View>
            </View>
          )}
        </View>

        {quickResults.length > 0 && (
          <ScrollView
            style={styles.quickList}
            contentContainerStyle={styles.quickListContent}
            showsVerticalScrollIndicator={false}
          >
            {quickResults.map((item) => (
              <Swipeable
                key={item.id}
                renderRightActions={() => renderRightActions(item.id)}
                containerStyle={styles.swipeableContainer}
              >
                <View style={styles.quickCard}>
                  {item.isFailed ? (
                    <View style={styles.quickFailedRow}>
                      <Text style={styles.quickTitle}>{item.foodName}</Text>
                      <Pressable
                        style={styles.retryButton}
                        onPress={() => handleRetryAnalyze(item)}
                        disabled={retryingId === item.id}
                      >
                        {retryingId === item.id ? (
                          <ActivityIndicator size="small" color={palette.danger} />
                        ) : (
                          <Text style={styles.retryButtonText}>재시도</Text>
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <View style={styles.quickTitleRow}>
                        <Text style={styles.quickTitle}>{item.foodName}</Text>
                      </View>
                      <View style={styles.quickBottomRow}>
                        {item.risk && (
                          <View
                            style={[
                              styles.quickRiskBadge,
                              { backgroundColor: resolveRiskColor(item.risk) },
                            ]}
                          >
                            <Text style={styles.quickRiskText}>
                              {resolveRiskLabel(item.risk)}
                            </Text>
                          </View>
                        )}
                        <Pressable
                          style={styles.detailButton}
                          onPress={() => handleDetailAnalyze(item)}
                        >
                          <Text style={styles.detailButtonText}>자세히 분석</Text>
                          <Ionicons name="chevron-forward" size={16} color={palette.text} />
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              </Swipeable>
            ))}
          </ScrollView>
        )}

        <View style={styles.footer}>
          <Pressable
            style={[styles.analyzeButton, isCapturing && styles.analyzeButtonDisabled]}
            onPress={handleQuickAnalyze}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color={palette.accentDark} />
            ) : (
              <>
                <Ionicons name="analytics" size={18} color={palette.text} />
                <Text style={styles.analyzeButtonText}>분석하기</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerSide: {
    minWidth: 72,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FAF8F0",
    fontSize: 18,
    fontWeight: "700",
  },
  guideContainer: {
    alignItems: "center",
    marginTop: 12,
  },
  guidePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.overlay,
  },
  guideText: {
    color: "#FAF8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  liveRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: palette.overlay,
    maxWidth: 260,
    flexShrink: 1,
  },
  liveText: {
    color: "#FAF8F0",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  riskPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  riskText: {
    color: "#1F241F",
    fontSize: 12,
    fontWeight: "700",
  },
  quickList: {
    marginTop: 16,
    marginHorizontal: 20,
    maxHeight: 220,
  },
  quickListContent: {
    gap: 10,
    paddingBottom: 4,
  },
  quickCard: {
    backgroundColor: "rgba(250, 248, 240, 0.92)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(127, 175, 123, 0.2)",
  },
  quickTitleRow: {
    marginBottom: 10,
  },
  quickFailedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  quickTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  quickBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  quickRiskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  quickRiskText: {
    color: "#1F241F",
    fontSize: 12,
    fontWeight: "700",
  },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(127, 175, 123, 0.18)",
  },
  detailButtonText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "600",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(217, 109, 91, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(217, 109, 91, 0.35)",
  },
  retryButtonRight: {
    marginLeft: "auto",
  },
  retryButtonText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 32,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(250, 248, 240, 0.95)",
    borderWidth: 2,
    borderColor: "rgba(127, 175, 123, 0.6)",
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  permissionTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
    color: palette.text,
  },
  permissionText: {
    marginTop: 8,
    color: palette.textMuted,
    textAlign: "center",
  },
  permissionButton: {
    marginTop: 16,
    backgroundColor: palette.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  permissionButtonText: {
    color: palette.text,
    fontWeight: "700",
  },
  permissionGhost: {
    marginTop: 10,
  },
  permissionGhostText: {
    color: palette.textMuted,
  },
  swipeableContainer: {},
  deleteAction: {
    backgroundColor: palette.danger,
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    borderRadius: 16,
    marginLeft: 8,
  },
});
