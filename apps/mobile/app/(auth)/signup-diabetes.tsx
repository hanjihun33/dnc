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
import { useRouter } from "expo-router";

import { useSignupDraft } from "@/components/signup-context";

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

  const scrollToIndex = (
    ref: React.RefObject<ScrollView>,
    index: number
  ) => {
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
            <Text style={styles.backText}>{"<"}</Text>
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
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 16, color: palette.text },
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
  card: {
    marginTop: 18,
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
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputButtonText: { color: palette.text, fontWeight: "600" },
  inputButtonChevron: { color: palette.textMuted, fontSize: 12 },
  targetCard: {
    marginTop: 14,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 14,
  },
  targetLabel: {
    color: "rgba(226, 232, 240, 0.7)",
    fontSize: 12,
    fontWeight: "600",
  },
  targetValue: {
    marginTop: 6,
    color: "#F8FAFC",
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
  primaryButtonText: { color: palette.ink, fontWeight: "800", fontSize: 16 },
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
