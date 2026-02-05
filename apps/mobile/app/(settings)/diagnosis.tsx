import React, { useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  bumpProfileRevision,
  getAuthHeaders,
  loadAuthSession,
} from "@/session";

const palette = {
  background: "#F4E8D6",
  card: "#F8F0E1",
  text: "#2F3B30",
  textMuted: "#6F7A6A",
  border: "#E6DCC6",
  accent: "#2F6B4F",
  accentDark: "#24573F",
  ink: "#233327",
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type DiabetesStatus = "none" | "prediabetes" | "type1" | "type2";

const diabetesOptions: Array<{ value: DiabetesStatus; label: string }> = [
  { value: "none", label: "해당 없음" },
  { value: "prediabetes", label: "당뇨병 전단계" },
  { value: "type1", label: "1형 당뇨병" },
  { value: "type2", label: "2형 당뇨병" },
];

const pickerItemHeight = 44;
const pickerHeight = pickerItemHeight * 5;
const pickerPadding = (pickerHeight - pickerItemHeight) / 2;

const mapBackendType = (value?: string | null): DiabetesStatus => {
  if (value === "TYPE1") return "type1";
  if (value === "TYPE2") return "type2";
  if (value === "PREDIABETES") return "prediabetes";
  if (value === "OTHER") return "none";
  return "none";
};

const mapRequestType = (value: DiabetesStatus) => {
  if (value === "type1") return "TYPE1";
  if (value === "type2") return "TYPE2";
  if (value === "prediabetes") return "PREDIABETES";
  return "OTHER";
};

export default function DiagnosisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const isOnboarding = params.onboarding === "1";
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearOptions = Array.from(
    { length: 80 },
    (_, index) => currentYear - index
  );
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

  const [diabetesStatus, setDiabetesStatus] = useState<DiabetesStatus>("none");
  const [diagnosisYear, setDiagnosisYear] = useState(currentYear);
  const [diagnosisMonth, setDiagnosisMonth] = useState(now.getMonth() + 1);
  const [isSaving, setIsSaving] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [diagnosisPickerOpen, setDiagnosisPickerOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState<DiabetesStatus>("none");
  const [tempYear, setTempYear] = useState(diagnosisYear);
  const [tempMonth, setTempMonth] = useState(diagnosisMonth);
  const headerPaddingTop = Math.max(12, insets.top + 8);
  const yearScrollRef = useRef<ScrollView | null>(null);
  const monthScrollRef = useRef<ScrollView | null>(null);
  const statusScrollRef = useRef<ScrollView | null>(null);

  const statusLabel =
    diabetesOptions.find((option) => option.value === diabetesStatus)?.label ??
    "선택";
  const diagnosisLabel = `${diagnosisYear}년 ${diagnosisMonth}월`;
  const showDiagnosisPeriod =
    diabetesStatus === "type1" || diabetesStatus === "type2";
  const targetRange =
    diabetesStatus === "type1" || diabetesStatus === "type2"
      ? "70~ 180 mg/dL"
      : "70~ 140 mg/dL";

  const scrollToIndex = (
    ref: React.RefObject<ScrollView>,
    index: number
  ) => {
    if (!ref.current) {
      return;
    }
    ref.current.scrollTo({ y: index * pickerItemHeight, animated: false });
  };

  const openStatusPicker = () => {
    setTempStatus(diabetesStatus);
    setStatusPickerOpen(true);
    setTimeout(() => {
      const index = Math.max(
        diabetesOptions.findIndex((option) => option.value === diabetesStatus),
        0
      );
      scrollToIndex(statusScrollRef, index);
    }, 0);
  };

  const openDiagnosisPicker = () => {
    setTempYear(diagnosisYear);
    setTempMonth(diagnosisMonth);
    setDiagnosisPickerOpen(true);
    setTimeout(() => {
      scrollToIndex(yearScrollRef, yearOptions.indexOf(diagnosisYear));
      scrollToIndex(monthScrollRef, monthOptions.indexOf(diagnosisMonth));
    }, 0);
  };

  const closeStatusPicker = () => {
    setStatusPickerOpen(false);
  };

  const closeDiagnosisPicker = () => {
    setDiagnosisPickerOpen(false);
  };

  const confirmStatusPicker = () => {
    setDiabetesStatus(tempStatus);
    setStatusPickerOpen(false);
  };

  const confirmDiagnosisPicker = () => {
    setDiagnosisYear(tempYear);
    setDiagnosisMonth(tempMonth);
    setDiagnosisPickerOpen(false);
  };

  const loadProfile = React.useCallback(async () => {
    try {
      await loadAuthSession();
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        return;
      }
      const profile = (await response.json()) as {
        diabetesType?: string | null;
        diagnosisYear?: number | null;
        diagnosisMonth?: number | null;
      };
      const mapped = mapBackendType(profile.diabetesType ?? null);
      setDiabetesStatus(mapped);
      if (profile.diagnosisYear) {
        setDiagnosisYear(profile.diagnosisYear);
      }
      if (profile.diagnosisMonth) {
        setDiagnosisMonth(profile.diagnosisMonth);
      }
    } catch {
      // Ignore load errors.
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const handleBack = React.useCallback(() => {
    if (!isOnboarding) {
      router.back();
      return;
    }
    Alert.alert(
      "건강 정보 입력",
      "아직 필수 정보가 완료되지 않았어요. 나중에 입력하시겠어요?",
      [
        { text: "계속 입력", style: "cancel" },
        { text: "나중에", onPress: () => router.replace("/(tabs)") },
      ]
    );
  }, [isOnboarding, router]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isOnboarding) {
        return () => {};
      }
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription.remove();
    }, [handleBack, isOnboarding])
  );

  const handleSave = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await loadAuthSession();
      const diabetesType = mapRequestType(diabetesStatus);
      const payload: Record<string, unknown> = {};
      if (diabetesType) {
        payload.diabetesType = diabetesType;
      }
      if (showDiagnosisPeriod) {
        payload.diagnosisYear = diagnosisYear;
        payload.diagnosisMonth = diagnosisMonth;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/users/me/health`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("진단 유형 저장에 실패했습니다.");
      }
      bumpProfileRevision();
      if (isOnboarding) {
        Alert.alert("저장 완료", "진단 유형이 저장되었습니다.", [
          {
            text: "다음",
            onPress: () =>
              router.replace({
                pathname: "/(settings)/body-info",
                params: { onboarding: "1" },
              }),
          },
        ]);
      } else {
        Alert.alert("저장 완료", "진단 유형이 저장되었습니다.");
        router.back();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "저장에 실패했습니다.";
      Alert.alert("저장 실패", message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          <TouchableOpacity style={styles.headerSide} onPress={handleBack}>
            <Ionicons name="chevron-back" size={20} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>진단 유형 설정</Text>
          <View style={styles.headerSide} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>당뇨 상태를 선택해주세요</Text>
          <Text style={styles.cardDesc}>
            입력한 정보는 맞춤 식단과 혈당 코칭 추천에만 사용됩니다.
          </Text>

          <View style={styles.detailBlock}>
            <Text style={styles.inputLabel}>당뇨 상태</Text>
            <TouchableOpacity style={styles.inputButton} onPress={openStatusPicker}>
              <Text style={styles.inputButtonText}>{statusLabel}</Text>
              <Text style={styles.inputButtonChevron}>v</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.targetCard}>
            <Text style={styles.targetLabel}>정상 혈당 목표</Text>
            <Text style={styles.targetValue}>{targetRange}</Text>
          </View>

          {showDiagnosisPeriod && (
            <View style={styles.detailBlock}>
              <Text style={styles.inputLabel}>최초 진단 시기</Text>
              <TouchableOpacity
                style={styles.inputButton}
                onPress={openDiagnosisPicker}
              >
                <Text style={styles.inputButtonText}>{diagnosisLabel}</Text>
                <Text style={styles.inputButtonChevron}>v</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text
            style={[
              styles.primaryButtonText,
              isSaving && styles.primaryButtonTextDisabled,
            ]}
          >
            {isSaving ? "저장 중..." : "저장하기"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {statusPickerOpen && (
        <Modal
          transparent
          animationType="fade"
          visible={statusPickerOpen}
          onRequestClose={closeStatusPicker}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalHeaderAction}
                  onPress={closeStatusPicker}
                >
                  <Text style={styles.modalHeaderCancel}>취소</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>당뇨 상태</Text>
                <TouchableOpacity
                  style={styles.modalHeaderAction}
                  onPress={confirmStatusPicker}
                >
                  <Text style={styles.modalHeaderConfirm}>확인</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pickerContainer}>
                <View style={styles.pickerHighlight} />
                <ScrollView
                  ref={statusScrollRef}
                  style={styles.pickerColumn}
                  contentContainerStyle={styles.pickerContent}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={pickerItemHeight}
                  decelerationRate="fast"
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(
                      event.nativeEvent.contentOffset.y / pickerItemHeight
                    );
                    const safeIndex = Math.min(
                      Math.max(index, 0),
                      diabetesOptions.length - 1
                    );
                    setTempStatus(diabetesOptions[safeIndex].value);
                  }}
                >
                  {diabetesOptions.map((option, index) => (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.pickerItem}
                      onPress={() => {
                        setTempStatus(option.value);
                        scrollToIndex(statusScrollRef, index);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          tempStatus === option.value &&
                            styles.pickerItemTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {diagnosisPickerOpen && (
        <Modal
          transparent
          animationType="fade"
          visible={diagnosisPickerOpen}
          onRequestClose={closeDiagnosisPicker}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalHeaderAction}
                  onPress={closeDiagnosisPicker}
                >
                  <Text style={styles.modalHeaderCancel}>취소</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>최초 진단 시기</Text>
                <TouchableOpacity
                  style={styles.modalHeaderAction}
                  onPress={confirmDiagnosisPicker}
                >
                  <Text style={styles.modalHeaderConfirm}>확인</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pickerContainer}>
                <View style={styles.pickerHighlight} />
                <View style={styles.pickerColumns}>
                  <ScrollView
                    ref={yearScrollRef}
                    style={styles.pickerColumn}
                    contentContainerStyle={styles.pickerContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={pickerItemHeight}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const index = Math.round(
                        event.nativeEvent.contentOffset.y / pickerItemHeight
                      );
                      const safeIndex = Math.min(
                        Math.max(index, 0),
                        yearOptions.length - 1
                      );
                      setTempYear(yearOptions[safeIndex]);
                    }}
                  >
                    {yearOptions.map((year, index) => (
                      <TouchableOpacity
                        key={year}
                        style={styles.pickerItem}
                        onPress={() => {
                          setTempYear(year);
                          scrollToIndex(yearScrollRef, index);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            tempYear === year && styles.pickerItemTextActive,
                          ]}
                        >
                          {year}년
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <ScrollView
                    ref={monthScrollRef}
                    style={styles.pickerColumn}
                    contentContainerStyle={styles.pickerContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={pickerItemHeight}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const index = Math.round(
                        event.nativeEvent.contentOffset.y / pickerItemHeight
                      );
                      const safeIndex = Math.min(
                        Math.max(index, 0),
                        monthOptions.length - 1
                      );
                      setTempMonth(monthOptions[safeIndex]);
                    }}
                  >
                    {monthOptions.map((month, index) => (
                      <TouchableOpacity
                        key={month}
                        style={styles.pickerItem}
                        onPress={() => {
                          setTempMonth(month);
                          scrollToIndex(monthScrollRef, index);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            tempMonth === month && styles.pickerItemTextActive,
                          ]}
                        >
                          {month}월
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  page: { paddingHorizontal: 16, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerSide: {
    minWidth: 72,
    minHeight: 40,
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: palette.text },
  card: {
    marginTop: 10,
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: palette.text },
  cardDesc: { fontSize: 12, color: palette.textMuted, marginTop: 6 },
  detailBlock: { marginTop: 16 },
  inputLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputButton: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F4E8D6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputButtonText: { color: palette.text, fontWeight: "600" },
  inputButtonChevron: { color: palette.textMuted, fontSize: 12 },
  targetCard: {
    marginTop: 14,
    backgroundColor: "#2F3B30",
    borderRadius: 16,
    padding: 14,
  },
  targetLabel: {
    color: "rgba(107, 116, 102, 0.75)",
    fontSize: 12,
    fontWeight: "600",
  },
  targetValue: {
    marginTop: 6,
    color: "#F4E8D6",
    fontSize: 18,
    fontWeight: "800",
  },
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: "#E6DCC6",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: { color: palette.ink, fontWeight: "800", fontSize: 16 },
  primaryButtonTextDisabled: { color: "#9BA28F" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(31, 36, 31, 0.35)",
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
  modalHeaderCancel: { color: palette.textMuted, fontWeight: "600" },
  modalHeaderConfirm: { color: palette.accentDark, fontWeight: "700" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: palette.text },
  pickerContainer: {
    height: pickerHeight,
    justifyContent: "center",
  },
  pickerHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: pickerPadding,
    height: pickerItemHeight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.35)",
    backgroundColor: "rgba(250, 204, 21, 0.12)",
  },
  pickerColumns: {
    flexDirection: "row",
    height: pickerHeight,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerContent: {
    paddingVertical: pickerPadding,
    alignItems: "center",
  },
  pickerItem: {
    height: pickerItemHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerItemText: {
    fontSize: 18,
    color: "rgba(100, 116, 139, 0.6)",
    fontWeight: "600",
  },
  pickerItemTextActive: {
    fontSize: 20,
    color: palette.accentDark,
    fontWeight: "700",
  },
});
