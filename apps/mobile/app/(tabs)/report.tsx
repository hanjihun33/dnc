import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

type ReportMode = "daily" | "weekly";

const { width } = Dimensions.get("window");
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDayLabel(date: Date) {
  return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} | ${
    dayNames[date.getDay()]
  }`;
}

function formatMonthNumeric(date: Date) {
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}`;
}

function getWeekOfMonth(date: Date, startOnSunday = true) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = startOnSunday ? firstDay.getDay() : (firstDay.getDay() + 6) % 7;
  return Math.ceil((date.getDate() + offset) / 7);
}

function formatWeek(date: Date) {
  const week = getWeekOfMonth(date, true);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${week}주차`;
}

function getMonthMatrix(year: number, month: number, startOnSunday = true) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startOffset = startOnSunday ? first.getDay() : (first.getDay() + 6) % 7;

  const cells: Array<number | null> = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function getWeekIndexForDate(
  year: number,
  month: number,
  day: number,
  startOnSunday = true
) {
  const matrix = getMonthMatrix(year, month, startOnSunday);
  return matrix.findIndex((week) => week.includes(day));
}

export default function ReportScreen() {
  const [mode, setMode] = useState<ReportMode>("daily");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<ReportMode>("daily");
  const [draftDate, setDraftDate] = useState(() => new Date());
  const [draftMonth, setDraftMonth] = useState(() => new Date());

  const periodLabel = useMemo(() => {
    return mode === "daily" ? formatDayLabel(selectedDate) : formatWeek(selectedDate);
  }, [mode, selectedDate]);

  const openPicker = () => {
    setDraftMode(mode);
    setDraftDate(new Date(selectedDate));
    setDraftMonth(new Date(viewMonth));
    setIsPickerOpen(true);
  };

  const closePicker = () => {
    setIsPickerOpen(false);
  };

  const applyPicker = () => {
    setMode(draftMode);
    setSelectedDate(new Date(draftDate));
    setViewMonth(new Date(draftMonth));
    setIsPickerOpen(false);
  };

  const moveDate = (direction: "prev" | "next") => {
    const delta = mode === "daily" ? 1 : 7;
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + (direction === "prev" ? -delta : delta));
    setSelectedDate(next);
    setViewMonth(new Date(next));
  };

  const moveDraftMonth = (direction: "prev" | "next") => {
    const next = new Date(draftMonth);
    next.setMonth(draftMonth.getMonth() + (direction === "prev" ? -1 : 1));
    setDraftMonth(next);
  };

  const changeDraftMode = (nextMode: ReportMode) => {
    setDraftMode(nextMode);
  };

  const selectDraftDay = (day: number) => {
    const next = new Date(draftMonth.getFullYear(), draftMonth.getMonth(), day);
    setDraftDate(next);
  };

  const selectDraftWeek = (week: Array<number | null>) => {
    const firstDay = week.find((day) => day !== null);
    if (!firstDay) {
      return;
    }
    const next = new Date(draftMonth.getFullYear(), draftMonth.getMonth(), firstDay);
    setDraftDate(next);
  };

  const chartData = useMemo(() => {
    const glucose = [92, 114, 126, 118, 134, 122, 128];
    return {
      labels: ["", "", "", "", "", "", ""],
      datasets: [
        {
          data: glucose,
        },
      ],
    };
  }, []);

  const statPrimary = { title: "혈당 변동성(GV)", value: "46%", delta: "23.1%", scale: "안정 - 위험" };

  const statSecondary = { title: "평균 혈당", value: "104", unit: "mg/dL", trend: "권장", hint: "주의" };

  const chartWidth = Math.max(width - 72, 240);

  const pickerMonthMatrix = useMemo(
    () => getMonthMatrix(draftMonth.getFullYear(), draftMonth.getMonth(), true),
    [draftMonth]
  );
  const isDraftInMonth =
    draftDate.getFullYear() === draftMonth.getFullYear() &&
    draftDate.getMonth() === draftMonth.getMonth();
  const selectedWeekIndex = isDraftInMonth
    ? getWeekIndexForDate(
        draftMonth.getFullYear(),
        draftMonth.getMonth(),
        draftDate.getDate(),
        true
      )
    : -1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.modeButton} onPress={openPicker}>
            <Text style={styles.modeButtonText}>
              {mode === "daily" ? "일간 리포트" : "주간 리포트"}
            </Text>
            <Text style={styles.modeChevron}>v</Text>
          </Pressable>

          <View style={styles.dateRow}>
            <Text style={styles.dateIcon}>📅</Text>
            <Text style={styles.dateText}>{periodLabel}</Text>
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.navButton} onPress={() => moveDate("prev")}>
              <Text style={styles.navText}>{"<"}</Text>
            </Pressable>
            <Pressable style={styles.navButton} onPress={() => moveDate("next")}>
              <Text style={styles.navText}>{">"}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>혈당 트렌드</Text>
            <View style={styles.chartBadge}>
              <Text style={styles.chartBadgeText}>안정</Text>
            </View>
          </View>

          <LineChart
            data={chartData}
            width={chartWidth}
            height={200}
            withDots
            withInnerLines={false}
            withOuterLines={false}
            withHorizontalLabels={false}
            withVerticalLabels={false}
            chartConfig={{
              backgroundGradientFrom: "#0B1220",
              backgroundGradientTo: "#111827",
              decimalPlaces: 0,
              color: () => "#F472B6",
              labelColor: () => "#94A3B8",
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#E2E8F0",
              },
            }}
            bezier
            style={styles.chart}
          />

          <View style={styles.statStack}>
            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <Text style={styles.statTitle}>{statPrimary.title}</Text>
              </View>
              <View style={styles.statMainRow}>
                <Text style={styles.statValue}>{statPrimary.value}</Text>
                <Text style={styles.statDelta}>{statPrimary.delta}</Text>
              </View>
              <View style={styles.statScale}>
                <View style={styles.statTrack} />
                <View style={styles.statIndicator} />
                <Text style={styles.statScaleText}>{statPrimary.scale}</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardSecondary]}>
              <Text style={styles.statTitle}>{statSecondary.title}</Text>
              <View style={styles.statMainRow}>
                <Text style={styles.statValue}>{statSecondary.value}</Text>
                <Text style={styles.statUnit}>{statSecondary.unit}</Text>
              </View>
              <View style={styles.statScale}>
                <View style={[styles.statTrack, styles.statTrackSoft]} />
                <View style={[styles.statIndicator, styles.statIndicatorSoft]} />
                <View style={styles.statScaleRow}>
                  <Text style={styles.statScaleHint}>{statSecondary.trend}</Text>
                  <Text style={styles.statScaleHint}>{statSecondary.hint}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>건강 리포트를 관리해보세요</Text>
          <Text style={styles.ctaDesc}>식사와 운동 패턴을 분석하면 혈당 변화에 미리 대비할 수 있어요.</Text>
          <Pressable style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>리포트 구매하기</Text>
          </Pressable>
        </View>
      </ScrollView>

      {isPickerOpen && (
        <View style={styles.pickerOverlay}>
          <Pressable style={styles.pickerBackdrop} onPress={closePicker} />
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>
              {draftMode === "daily" ? "일간 리포트" : "주간 리포트"}
            </Text>

            <View style={styles.pickerToggle}>
              <Pressable
                style={[
                  styles.pickerToggleButton,
                  draftMode === "daily" && styles.pickerToggleActive,
                ]}
                onPress={() => changeDraftMode("daily")}
              >
                <Text
                  style={[
                    styles.pickerToggleText,
                    draftMode === "daily" && styles.pickerToggleTextActive,
                  ]}
                >
                  일간
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pickerToggleButton,
                  draftMode === "weekly" && styles.pickerToggleActive,
                ]}
                onPress={() => changeDraftMode("weekly")}
              >
                <Text
                  style={[
                    styles.pickerToggleText,
                    draftMode === "weekly" && styles.pickerToggleTextActive,
                  ]}
                >
                  주간
                </Text>
              </Pressable>
            </View>

            <View style={styles.pickerWeekdays}>
              {weekdays.map((day, index) => (
                <Text
                  key={day}
                  style={[
                    styles.pickerWeekday,
                    index === 0 && styles.pickerSundayText,
                  ]}
                >
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.pickerMonthRow}>
              <Pressable
                style={styles.pickerMonthArrow}
                onPress={() => moveDraftMonth("prev")}
              >
                <Text style={styles.pickerMonthArrowText}>{"<"}</Text>
              </Pressable>
              <Text style={styles.pickerMonthText}>{formatMonthNumeric(draftMonth)}</Text>
              <Pressable
                style={styles.pickerMonthArrow}
                onPress={() => moveDraftMonth("next")}
              >
                <Text style={styles.pickerMonthArrowText}>{">"}</Text>
              </Pressable>
            </View>

            <View style={styles.pickerCalendar}>
              {pickerMonthMatrix.map((week, weekIndex) => {
                const isWeekSelected =
                  draftMode === "weekly" && weekIndex === selectedWeekIndex;
                return (
                  <View key={`picker-week-${weekIndex}`} style={styles.pickerWeekRow}>
                    {week.map((day, dayIndex) => {
                      if (!day) {
                        return (
                          <View
                            key={`picker-empty-${dayIndex}`}
                            style={styles.pickerDayCell}
                          />
                        );
                      }
                      const isSelected =
                        draftMode === "daily" &&
                        isDraftInMonth &&
                        day === draftDate.getDate();
                      const isSunday = dayIndex === 0;
                      return (
                        <Pressable
                          key={`picker-day-${dayIndex}`}
                          style={[
                            styles.pickerDayCell,
                            isSelected && styles.pickerDaySelected,
                            isWeekSelected && styles.pickerWeekSelected,
                          ]}
                          onPress={() =>
                            draftMode === "daily"
                              ? selectDraftDay(day)
                              : selectDraftWeek(week)
                          }
                        >
                          <Text
                            style={[
                              styles.pickerDayText,
                              isSunday && styles.pickerSundayText,
                              isSelected && styles.pickerDayTextSelected,
                              isWeekSelected && styles.pickerWeekTextSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            <View style={styles.pickerActions}>
              <Pressable style={styles.pickerCancel} onPress={closePicker}>
                <Text style={styles.pickerCancelText}>취소</Text>
              </Pressable>
              <Pressable style={styles.pickerApply} onPress={applyPicker}>
                <Text style={styles.pickerApplyText}>적용</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },

  header: {
    marginBottom: 18,
  },
  modeButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
  },
  modeButtonText: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  modeChevron: { fontSize: 16, marginLeft: 6, color: "#64748B" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  dateIcon: { fontSize: 16, marginRight: 6 },
  dateText: { fontSize: 14, color: "#64748B" },
  navRow: {
    position: "absolute",
    right: 0,
    top: 6,
    flexDirection: "row",
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  navText: { fontSize: 14, color: "#1E293B" },

  chartCard: {
    borderRadius: 26,
    padding: 18,
    backgroundColor: "#0B1220",
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chartTitle: { color: "#E2E8F0", fontSize: 16, fontWeight: "700" },
  chartBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  chartBadgeText: { color: "#CBD5F5", fontSize: 11, fontWeight: "600" },
  chart: {
    borderRadius: 16,
  },

  statStack: {
    marginTop: -16,
  },
  statCard: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    marginBottom: 10,
  },
  statCardSecondary: {
    backgroundColor: "rgba(15, 23, 42, 0.78)",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statTitle: { color: "#CBD5F5", fontSize: 12, marginBottom: 6 },
  statMainRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  statValue: { color: "#F8FAFC", fontSize: 28, fontWeight: "800" },
  statDelta: { color: "#F472B6", fontSize: 12, marginLeft: 8 },
  statUnit: { color: "#CBD5F5", fontSize: 12, marginLeft: 6 },
  statScale: { marginTop: 10 },
  statTrack: {
    height: 4,
    backgroundColor: "rgba(244, 114, 182, 0.3)",
    borderRadius: 999,
  },
  statTrackSoft: {
    backgroundColor: "rgba(96, 165, 250, 0.3)",
  },
  statIndicator: {
    position: "absolute",
    left: "45%",
    top: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F472B6",
  },
  statIndicatorSoft: {
    backgroundColor: "#60A5FA",
  },
  statScaleText: { color: "#94A3B8", fontSize: 11, marginTop: 6 },
  statScaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  statScaleHint: { color: "#94A3B8", fontSize: 11 },

  ctaCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ctaTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  ctaDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 14,
    lineHeight: 18,
  },
  ctaButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
  },
  ctaButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 7, 18, 0.72)",
    justifyContent: "flex-end",
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  pickerSheet: {
    margin: 16,
    borderRadius: 28,
    padding: 18,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  pickerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#E2E8F0",
    marginBottom: 14,
  },
  pickerToggle: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  pickerToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  pickerToggleActive: {
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    backgroundColor: "rgba(30, 41, 59, 0.9)",
  },
  pickerToggleText: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },
  pickerToggleTextActive: { color: "#E2E8F0" },
  pickerWeekdays: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pickerWeekday: {
    width: 36,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
  },
  pickerSundayText: {
    color: "#F87171",
  },
  pickerMonthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  pickerMonthText: { fontSize: 18, fontWeight: "700", color: "#E2E8F0" },
  pickerMonthArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerMonthArrowText: { color: "#E2E8F0", fontSize: 12 },
  pickerCalendar: {
    marginBottom: 18,
  },
  pickerWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  pickerDayCell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerDaySelected: {
    backgroundColor: "#FACC15",
  },
  pickerWeekSelected: {
    backgroundColor: "rgba(250, 204, 21, 0.12)",
  },
  pickerDayText: { color: "#E2E8F0", fontSize: 15 },
  pickerDayTextSelected: { color: "#111827", fontWeight: "800" },
  pickerWeekTextSelected: { color: "#FDE68A" },
  pickerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    marginRight: 10,
  },
  pickerCancelText: { color: "#CBD5F5", fontSize: 16, fontWeight: "700" },
  pickerApply: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#FACC15",
  },
  pickerApplyText: { color: "#111827", fontSize: 16, fontWeight: "800" },
});















