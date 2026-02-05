import React, { useRef, useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { setAuthSession } from "@/session";

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

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const pickerItemHeight = 44;
const pickerHeight = pickerItemHeight * 5;
const pickerPadding = (pickerHeight - pickerItemHeight) / 2;

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

const parseErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    return data.message ?? data.error ?? null;
  } catch {
    return null;
  }
};

const mapSignupError = (message: string | null) => {
  if (!message) {
    return null;
  }
  if (message.toLowerCase().includes("email already in use")) {
    return "이미 사용 중인 이메일입니다.";
  }
  return message;
};

export default function SignupProfileScreen() {
  const router = useRouter();
  const { draft, updateDraft, resetDraft } = useSignupDraft();
  const now = new Date();
  const currentYear = now.getFullYear();
  const defaultYear = currentYear - 30;
  const yearOptions = Array.from(
    { length: currentYear - 1900 + 1 },
    (_, index) => currentYear - index
  );
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [tempYear, setTempYear] = useState(defaultYear);
  const [tempMonth, setTempMonth] = useState(1);
  const [tempDay, setTempDay] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const yearScrollRef = useRef<ScrollView | null>(null);
  const monthScrollRef = useRef<ScrollView | null>(null);
  const dayScrollRef = useRef<ScrollView | null>(null);

  const dayOptions = Array.from(
    { length: getDaysInMonth(tempYear, tempMonth) },
    (_, index) => index + 1
  );

  const scrollToIndex = (ref: React.RefObject<ScrollView>, index: number) => {
    if (!ref.current) {
      return;
    }
    ref.current.scrollTo({ y: index * pickerItemHeight, animated: false });
  };

  const openPicker = () => {
    const baseDate = draft.birthDate ?? new Date(defaultYear, 0, 1);
    setTempYear(baseDate.getFullYear());
    setTempMonth(baseDate.getMonth() + 1);
    setTempDay(baseDate.getDate());
    setPickerOpen(true);
    setTimeout(() => {
      scrollToIndex(yearScrollRef, yearOptions.indexOf(baseDate.getFullYear()));
      scrollToIndex(monthScrollRef, monthOptions.indexOf(baseDate.getMonth() + 1));
      scrollToIndex(dayScrollRef, baseDate.getDate() - 1);
    }, 0);
  };

  const closePicker = () => {
    setPickerOpen(false);
  };

  const confirmPicker = () => {
    updateDraft({ birthDate: new Date(tempYear, tempMonth - 1, tempDay) });
    setPickerOpen(false);
  };

  const handleYearChange = (year: number) => {
    const maxDay = getDaysInMonth(year, tempMonth);
    const nextDay = Math.min(tempDay, maxDay);
    setTempYear(year);
    setTempDay(nextDay);
    setTimeout(() => {
      scrollToIndex(dayScrollRef, nextDay - 1);
    }, 0);
  };

  const handleMonthChange = (month: number) => {
    const maxDay = getDaysInMonth(tempYear, month);
    const nextDay = Math.min(tempDay, maxDay);
    setTempMonth(month);
    setTempDay(nextDay);
    setTimeout(() => {
      scrollToIndex(dayScrollRef, nextDay - 1);
    }, 0);
  };

  const handleSignup = async () => {
    if (isSubmitting) {
      return;
    }
    setErrorMessage(null);

    const trimmedEmail = draft.email.trim();
    const trimmedName = draft.name.trim();
    const trimmedNickname = draft.nickname.trim();
    const birthDate = draft.birthDate;

    if (
      !trimmedEmail ||
      !draft.password ||
      !trimmedName ||
      !trimmedNickname ||
      !birthDate
    ) {
      setErrorMessage("회원가입 정보를 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: draft.password,
          nickname: trimmedNickname,
          name: trimmedName,
          birthDate: formatDate(birthDate),
        }),
      });

      if (!response.ok) {
        const message = mapSignupError(await parseErrorMessage(response));
        throw new Error(message ?? "회원가입에 실패했습니다.");
      }

      const signupData = (await response.json()) as { userId?: number };

      const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: draft.password,
        }),
      });

      if (!loginResponse.ok) {
        const message = await parseErrorMessage(loginResponse);
        throw new Error(message ?? "로그인에 실패했습니다.");
      }

      const loginData = (await loginResponse.json()) as {
        accessToken?: string;
        tokenType?: string;
      };
      const accessToken = loginData.accessToken;
      if (!accessToken) {
        throw new Error("로그인 토큰을 받지 못했습니다.");
      }
      const tokenType = loginData.tokenType ?? "Bearer";
      const authorization = `${tokenType} ${accessToken}`;
      await setAuthSession({
        accessToken,
        tokenType,
        userId: signupData.userId ?? null,
      });

      const diabetesType =
        draft.diabetesStatus === "type1"
          ? "TYPE1"
          : draft.diabetesStatus === "type2"
            ? "TYPE2"
            : draft.diabetesStatus === "prediabetes"
              ? "OTHER"
              : undefined;
      const hasDiagnosis =
        draft.diabetesStatus === "type1" || draft.diabetesStatus === "type2";
      const diagnosisYear = hasDiagnosis ? draft.diagnosisYear : undefined;
      const diagnosisMonth = hasDiagnosis ? draft.diagnosisMonth : undefined;
      const gender =
        draft.gender === "male"
          ? "MALE"
          : draft.gender === "female"
            ? "FEMALE"
            : undefined;
      const heightValue = Number.parseFloat(draft.height);
      const weightValue = Number.parseFloat(draft.weight);
      const heightCm = Number.isFinite(heightValue) ? heightValue : undefined;
      const weightKg = Number.isFinite(weightValue) ? weightValue : undefined;

      const healthPayload = {
        diabetesType,
        diagnosisYear,
        diagnosisMonth,
        gender,
        heightCm,
        weightKg,
      };
      const shouldUpdateHealth = Object.values(healthPayload).some(
        (value) => value !== undefined
      );

      if (shouldUpdateHealth && signupData.userId) {
        const healthResponse = await fetch(`${API_BASE_URL}/api/v1/users/me/health`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: authorization,
            "X-User-Id": String(signupData.userId),
          },
          body: JSON.stringify(healthPayload),
        });

        if (!healthResponse.ok) {
          const message = await parseErrorMessage(healthResponse);
          throw new Error(message ?? "건강 정보 저장에 실패했습니다.");
        }
      }

      resetDraft();
      router.replace("/(tabs)");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "회원가입에 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const birthDateLabel = draft.birthDate ? formatDate(draft.birthDate) : "YYYY-MM-DD";

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
          <Text style={styles.pageTitle}>신체 정보</Text>
          <View style={styles.backSpacer} />
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View
            style={[
              styles.progressBar,
              styles.progressBarActive,
              styles.progressBarLast,
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>단계 3/3</Text>

        <View style={styles.formArea}>
          <Text style={styles.sectionTitle}>신체 정보를 입력해 주세요</Text>
          <Text style={styles.sectionDesc}>
            개인별 맞춤 혈당 분석 및 예측을 위해 사용됩니다.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>키(cm)</Text>
            <View style={styles.inputPill}>
              <View style={styles.inputIcon}>
                <Ionicons name="resize-outline" size={18} color={palette.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="170"
                placeholderTextColor={palette.textMuted}
                keyboardType="number-pad"
                value={draft.height}
                onChangeText={(value) => updateDraft({ height: value })}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>몸무게(kg)</Text>
            <View style={styles.inputPill}>
              <View style={styles.inputIcon}>
                <Ionicons name="barbell-outline" size={18} color={palette.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="65"
                placeholderTextColor={palette.textMuted}
                keyboardType="number-pad"
                value={draft.weight}
                onChangeText={(value) => updateDraft({ weight: value })}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>성별</Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[
                  styles.choiceButton,
                  draft.gender === "male" && styles.choiceButtonActive,
                ]}
                onPress={() => updateDraft({ gender: "male" })}
              >
                <Text
                  style={[
                    styles.choiceText,
                    draft.gender === "male" && styles.choiceTextActive,
                  ]}
                >
                  남성
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.choiceButton,
                  draft.gender === "female" && styles.choiceButtonActive,
                  styles.choiceButtonLast,
                ]}
                onPress={() => updateDraft({ gender: "female" })}
              >
                <Text
                  style={[
                    styles.choiceText,
                    draft.gender === "female" && styles.choiceTextActive,
                  ]}
                >
                  여성
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>생년월일</Text>
            <TouchableOpacity style={styles.inputPill} onPress={openPicker}>
              <View style={styles.inputIcon}>
                <Ionicons name="calendar-outline" size={18} color={palette.textMuted} />
              </View>
              <Text
                style={[
                  styles.pillValue,
                  !draft.birthDate && styles.inputPlaceholder,
                ]}
              >
                {birthDateLabel}
              </Text>
              <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isSubmitting && styles.primaryButtonDisabled,
          ]}
          onPress={handleSignup}
          disabled={isSubmitting}
        >
          <Text
            style={[
              styles.primaryButtonText,
              isSubmitting && styles.primaryButtonTextDisabled,
            ]}
          >
            가입 완료
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {pickerOpen && (
        <Modal
          transparent
          animationType="fade"
          visible={pickerOpen}
          onRequestClose={closePicker}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalHeaderAction}
                  onPress={closePicker}
                >
                  <Text style={styles.modalHeaderCancel}>취소</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>생년월일 선택</Text>
                <TouchableOpacity
                  style={styles.modalHeaderAction}
                  onPress={confirmPicker}
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
                      handleYearChange(yearOptions[safeIndex]);
                    }}
                  >
                    {yearOptions.map((year, index) => (
                      <TouchableOpacity
                        key={year}
                        style={styles.pickerItem}
                        onPress={() => {
                          handleYearChange(year);
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
                      handleMonthChange(monthOptions[safeIndex]);
                    }}
                  >
                    {monthOptions.map((month, index) => (
                      <TouchableOpacity
                        key={month}
                        style={styles.pickerItem}
                        onPress={() => {
                          handleMonthChange(month);
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

                  <ScrollView
                    ref={dayScrollRef}
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
                        dayOptions.length - 1
                      );
                      setTempDay(dayOptions[safeIndex]);
                    }}
                  >
                    {dayOptions.map((day, index) => (
                      <TouchableOpacity
                        key={day}
                        style={styles.pickerItem}
                        onPress={() => {
                          setTempDay(day);
                          scrollToIndex(dayScrollRef, index);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            tempDay === day && styles.pickerItemTextActive,
                          ]}
                        >
                          {day}일
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
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: palette.text,
    fontSize: 15,
  },
  pillValue: {
    flex: 1,
    paddingHorizontal: 14,
    color: palette.text,
    fontSize: 15,
    fontWeight: "600",
  },
  inputPlaceholder: { color: palette.textMuted },
  choiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#F1E7D6",
  },
  choiceButtonLast: { marginRight: 0 },
  choiceButtonActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accentDark,
  },
  choiceText: { color: palette.textMuted, fontWeight: "700" },
  choiceTextActive: { color: palette.ink },
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
  primaryButtonDisabled: {
    backgroundColor: "#EFE9D9",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: { color: palette.ink, fontWeight: "800", fontSize: 16 },
  primaryButtonTextDisabled: { color: "#A5AE9C" },
  errorText: { color: "#C24A4A", fontSize: 12, marginTop: 12 },
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
