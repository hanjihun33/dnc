import React, { useRef, useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useSignupDraft } from "@/components/signup-context";

const palette = {
  background: "#FAF8F0",
  card: "#F6F1E3",
  text: "#1F241F",
  textMuted: "#6B7466",
  border: "#E7E0CC",
  accent: "#7FAF7B",
  accentDark: "#4E7C5B",
  ink: "#1F2A1F",
};

type DiabetesStatus = "none" | "prediabetes" | "type1" | "type2";

const diabetesOptions: Array<{ value: DiabetesStatus; label: string }> = [
  { value: "none", label: "해당 없음" },
  { value: "prediabetes", label: "당뇨 전 단계" },
  { value: "type1", label: "1형 당뇨병" },
  { value: "type2", label: "2형 당뇨병" },
];

const pickerItemHeight = 44;
const pickerHeight = pickerItemHeight * 5;
const pickerPadding = (pickerHeight - pickerItemHeight) / 2;

export default function SignupDiabetesScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useSignupDraft();
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearOptions = Array.from(
    { length: 80 },
    (_, index) => currentYear - index
  );
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

  const [diabetesStatus, setDiabetesStatus] = useState<DiabetesStatus>(
    draft.diabetesStatus
  );
  const [diagnosisYear, setDiagnosisYear] = useState(
    draft.diagnosisYear || currentYear
  );
  const [diagnosisMonth, setDiagnosisMonth] = useState(
    draft.diagnosisMonth || now.getMonth() + 1
  );
  const [diagnosisPickerOpen, setDiagnosisPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [tempYear, setTempYear] = useState(diagnosisYear);
  const [tempMonth, setTempMonth] = useState(diagnosisMonth);
  const [tempStatus, setTempStatus] = useState<DiabetesStatus>(diabetesStatus);
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

  const scrollToIndex = (ref: React.RefObject<ScrollView>, index: number) => {
    if (!ref.current) {
      return;
    }
    ref.current.scrollTo({ y: index * pickerItemHeight, animated: false });
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

  const closeDiagnosisPicker = () => {
    setDiagnosisPickerOpen(false);
  };

  const closeStatusPicker = () => {
    setStatusPickerOpen(false);
  };

  const confirmDiagnosisPicker = () => {
    setDiagnosisYear(tempYear);
    setDiagnosisMonth(tempMonth);
    updateDraft({ diagnosisYear: tempYear, diagnosisMonth: tempMonth });
    setDiagnosisPickerOpen(false);
  };

  const confirmStatusPicker = () => {
    setDiabetesStatus(tempStatus);
    updateDraft({ diabetesStatus: tempStatus });
    setStatusPickerOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={18} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>당뇨 확인</Text>
          <View style={styles.backSpacer} />
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View style={[styles.progressBar, styles.progressBarLast]} />
        </View>
        <Text style={styles.progressLabel}>가입 2/3</Text>

        <View style={styles.formArea}>
          <Text style={styles.sectionTitle}>당뇨 상태를 선택해주세요</Text>
          <Text style={styles.sectionDesc}>
            입력한 정보에 맞춘 식단과 혈당 코칭 추천만 사용됩니다.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>당뇨 상태</Text>
            <TouchableOpacity style={styles.inputPill} onPress={openStatusPicker}>
              <View style={styles.inputIcon}>
                <Ionicons name="pulse-outline" size={18} color={palette.textMuted} />
              </View>
              <Text style={styles.pillValue}>{statusLabel}</Text>
              <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoPill}>
            <View style={styles.inputIcon}>
              <Ionicons
                name="speedometer-outline"
                size={18}
                color={palette.textMuted}
              />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>정상 혈당 목표</Text>
              <Text style={styles.infoValue}>{targetRange}</Text>
            </View>
          </View>

          {showDiagnosisPeriod && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>최초 진단 시기</Text>
              <TouchableOpacity
                style={styles.inputPill}
                onPress={openDiagnosisPicker}
              >
                <View style={styles.inputIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={palette.textMuted}
                  />
                </View>
                <Text style={styles.pillValue}>{diagnosisLabel}</Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={palette.textMuted}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            updateDraft({
              diabetesStatus,
              diagnosisYear,
              diagnosisMonth,
            });
            router.push("/signup-profile");
          }}
        >
          <Text style={styles.primaryButtonText}>다음</Text>
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
  page: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFE9D9",
    alignItems: "center",
    justifyContent: "center",
  },
  backSpacer: { width: 36 },
  pageTitle: { fontSize: 22, fontWeight: "800", color: palette.text },
  progressRow: { flexDirection: "row" },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: palette.border,
    marginRight: 6,
  },
  progressBarActive: { backgroundColor: palette.accent },
  progressBarLast: { marginRight: 0 },
  progressLabel: { marginTop: 8, color: palette.textMuted, fontSize: 12 },
  formArea: {
    marginTop: 18,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: palette.text },
  sectionDesc: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 6,
  },
  fieldGroup: { marginTop: 16 },
  fieldLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1E7D6",
    borderRadius: 26,
    padding: 6,
    borderWidth: 1,
    borderColor: palette.border,
  },
  inputIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E6DCC6",
    alignItems: "center",
    justifyContent: "center",
  },
  pillValue: {
    flex: 1,
    paddingHorizontal: 14,
    color: palette.text,
    fontSize: 15,
    fontWeight: "600",
  },
  infoPill: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6EDD8",
    borderRadius: 26,
    padding: 6,
  },
  infoTextGroup: {
    flex: 1,
    paddingHorizontal: 14,
  },
  infoLabel: {
    color: palette.accentDark,
    fontSize: 12,
    fontWeight: "600",
  },
  infoValue: {
    marginTop: 4,
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 22,
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonText: { color: palette.ink, fontWeight: "800", fontSize: 16 },
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
    borderColor: "rgba(127, 175, 123, 0.35)",
    backgroundColor: "rgba(127, 175, 123, 0.16)",
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
    color: "rgba(107, 116, 102, 0.7)",
    fontWeight: "600",
  },
  pickerItemTextActive: {
    fontSize: 20,
    color: palette.accentDark,
    fontWeight: "700",
  },
});
