import React, { useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

export default function BodyInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const isOnboarding = params.onboarding === "1";
  const now = new Date();
  const currentYear = now.getFullYear();
  const defaultYear = currentYear - 30;
  const yearOptions = Array.from(
    { length: currentYear - 1900 + 1 },
    (_, index) => currentYear - index
  );
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [gender, setGender] = useState<"남성" | "여성">("남성");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tempYear, setTempYear] = useState(defaultYear);
  const [tempMonth, setTempMonth] = useState(1);
  const [tempDay, setTempDay] = useState(1);
  const headerPaddingTop = Math.max(12, insets.top + 8);
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
    const baseDate = birthDate ?? new Date(defaultYear, 0, 1);
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
    setBirthDate(new Date(tempYear, tempMonth - 1, tempDay));
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

  const birthDateLabel = birthDate ? formatDate(birthDate) : "YYYY-MM-DD";

  const mapGenderToRequest = (value: "남성" | "여성") =>
    value === "남성" ? "MALE" : "FEMALE";
  const mapGenderFromResponse = (value?: string | null) =>
    value === "FEMALE" ? "여성" : "남성";

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
        birthDate?: string | null;
        gender?: string | null;
        heightCm?: number | null;
        weightKg?: number | null;
      };
      if (profile.birthDate) {
        setBirthDate(new Date(profile.birthDate));
      }
      if (profile.gender) {
        setGender(mapGenderFromResponse(profile.gender));
      }
      if (typeof profile.heightCm === "number") {
        setHeight(String(profile.heightCm));
      }
      if (typeof profile.weightKg === "number") {
        setWeight(String(profile.weightKg));
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
    const heightValue = Number.parseFloat(height);
    const weightValue = Number.parseFloat(weight);
    const heightCm = Number.isFinite(heightValue) ? heightValue : undefined;
    const weightKg = Number.isFinite(weightValue) ? weightValue : undefined;

    setIsSaving(true);
    try {
      await loadAuthSession();
      const healthPayload: Record<string, unknown> = {
        gender: mapGenderToRequest(gender),
        heightCm,
        weightKg,
      };
      const healthUrl = `${API_BASE_URL}/api/v1/users/me/health`;
      console.log("PATCH", healthUrl, healthPayload);
      const response = await fetch(healthUrl, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(healthPayload),
      });
      console.log("PATCH /users/me/health status:", response.status);
      if (!response.ok) {
        try {
          const errorText = await response.text();
          console.log("PATCH /users/me/health error:", errorText);
        } catch {
          console.log("PATCH /users/me/health error: <no body>");
        }
        throw new Error("신체 정보 저장에 실패했습니다.");
      }
      if (birthDate) {
        const profilePayload = { birthDate: formatDate(birthDate) };
        const profileUrl = `${API_BASE_URL}/api/v1/users/me/profile`;
        console.log("PATCH", profileUrl, profilePayload);
        const profileResponse = await fetch(profileUrl, {
          method: "PATCH",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profilePayload),
        });
        console.log("PATCH /users/me/profile status:", profileResponse.status);
        if (!profileResponse.ok) {
          try {
            const errorText = await profileResponse.text();
            console.log("PATCH /users/me/profile error:", errorText);
          } catch {
            console.log("PATCH /users/me/profile error: <no body>");
          }
          throw new Error("생년월일 저장에 실패했습니다.");
        }
      }
      bumpProfileRevision();
      if (isOnboarding) {
        Alert.alert("저장 완료", "신체 정보가 저장되었습니다.", [
          {
            text: "완료",
            onPress: () => router.replace("/(tabs)"),
          },
        ]);
      } else {
        Alert.alert("저장 완료", "신체 정보가 저장되었습니다.");
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
          <Pressable style={styles.headerSide} onPress={handleBack}>
            <Ionicons name="chevron-back" size={20} color={palette.text} />
          </Pressable>
          <Text style={styles.headerTitle}>신체 정보 설정</Text>
          <View style={styles.headerSide} />
        </View>
        <Text style={styles.subtitle}>
          생년월일, 성별, 키, 체중을 다시 입력하세요.
        </Text>

        <View style={styles.card}>
          <View style={styles.fieldBlock}>
            <Text style={styles.inputLabel}>키(cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="170"
              placeholderTextColor={palette.textMuted}
              keyboardType="number-pad"
              value={height}
              onChangeText={setHeight}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.inputLabel}>몸무게(kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="65"
              placeholderTextColor={palette.textMuted}
              keyboardType="number-pad"
              value={weight}
              onChangeText={setWeight}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.inputLabel}>성별</Text>
            <View style={styles.choiceRow}>
              {["남성", "여성"].map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.choiceButton,
                    gender === option && styles.choiceButtonActive,
                  ]}
                  onPress={() => setGender(option as typeof gender)}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      gender === option && styles.choiceTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.inputLabel}>생년월일</Text>
            <Pressable style={styles.inputButton} onPress={openPicker}>
              <Text
                style={[
                  styles.inputButtonText,
                  !birthDate && styles.inputPlaceholder,
                ]}
              >
                {birthDateLabel}
              </Text>
              <Text style={styles.inputButtonChevron}>v</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
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
        </Pressable>
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
                <Pressable style={styles.modalHeaderAction} onPress={closePicker}>
                  <Text style={styles.modalHeaderCancel}>취소</Text>
                </Pressable>
                <Text style={styles.modalTitle}>생년월일 선택</Text>
                <Pressable style={styles.modalHeaderAction} onPress={confirmPicker}>
                  <Text style={styles.modalHeaderConfirm}>확인</Text>
                </Pressable>
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
                      <Pressable
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
                      </Pressable>
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
                      <Pressable
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
                      </Pressable>
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
                      <Pressable
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
                      </Pressable>
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
  subtitle: { color: palette.textMuted, marginBottom: 18 },
  card: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  fieldBlock: { marginTop: 16 },
  inputLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    backgroundColor: "#F4E8D6",
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
  inputPlaceholder: { color: palette.textMuted },
  inputButtonChevron: { color: palette.textMuted, fontSize: 12 },
  choiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F4E8D6",
  },
  choiceButtonActive: {
    backgroundColor: palette.accent,
    borderColor: "#E7D7A9",
  },
  choiceText: { color: palette.textMuted, fontWeight: "700" },
  choiceTextActive: { color: palette.ink },
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
