import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import { useFocusEffect } from "expo-router";
import { getAuthHeaders, loadAuthSession } from "../session";

const { width } = Dimensions.get("window");

type ReportMode = "daily" | "weekly" | "monthly";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

interface TimeInRangeDto {
  veryLowPercent: number;
  lowPercent: number;
  inRangePercent: number;
  highPercent: number;
  veryHighPercent: number;
}

interface GlucoseReportDto {
  userId: number;
  period: string;
  startDate: string;
  endDate: string;
  recordCount: number;
  averageGlucose: number;
  maxGlucose: number;
  minGlucose: number;
  standardDeviation: number;
  timeInRange?: TimeInRangeDto;
  aiAnalysis?: string;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

export default function ReportScreen() {
  const [mode, setMode] = useState<ReportMode>("weekly");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<GlucoseReportDto | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      await loadAuthSession();
      const headers = getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/reports/glucose?period=${mode.toUpperCase()}`,
        {
          headers,
        }
      );

      if (response.ok) {
        const data = (await response.json()) as GlucoseReportDto;
        setReport(data);
      } else {
        console.warn("Failed to fetch report:", response.status);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      fetchReport();
    }, [fetchReport])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReport();
  }, [fetchReport]);

  const tirData = useMemo(() => {
    if (!report?.timeInRange) return [];

    // PieChart format
    return [
      {
        name: "저혈당",
        population: report.timeInRange.veryLowPercent + report.timeInRange.lowPercent,
        color: "#F87171",
        legendFontColor: "#CBD5F5",
        legendFontSize: 12,
      },
      {
        name: "정상",
        population: report.timeInRange.inRangePercent,
        color: "#34D399",
        legendFontColor: "#CBD5F5",
        legendFontSize: 12,
      },
      {
        name: "고혈당",
        population: report.timeInRange.highPercent + report.timeInRange.veryHighPercent,
        color: "#FBBF24",
        legendFontColor: "#CBD5F5",
        legendFontSize: 12,
      }
    ];
  }, [report]);

  // Dummy Chart Data for Trend (Since DTO only gives aggregates currently)
  // To implement trend line, we would need 'history' list in DTO.
  // For now, we show a constant line or just the aggregate stats.
  // Using a placeholder graphic if no historical data series provided.
  const chartData = {
    labels: ["Start", "End"],
    datasets: [
      {
        data: [
          report?.minGlucose ?? 90,
          report?.averageGlucose ?? 100,
          report?.maxGlucose ?? 110
        ],
        color: (opacity = 1) => `rgba(244, 114, 182, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#CBD5F5" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.pageTitle}>건강 리포트</Text>
          <View style={styles.modeToggle}>
            {/* Simple Toggle for Demo */}
            {(["weekly", "monthly"] as ReportMode[]).map((m) => (
              <Pressable
                key={m}
                style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                  {m === "weekly" ? "주간" : "월간"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#F472B6" style={{ marginTop: 20 }} />
        ) : report ? (
          <>
            {/* Stats Grid */}
            <View style={styles.statGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>평균 혈당</Text>
                <Text style={styles.statValue}>{report.averageGlucose}</Text>
                <Text style={styles.statUnit}>mg/dL</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>혈당 변동성</Text>
                <Text style={styles.statValue}>{report.standardDeviation.toFixed(1)}</Text>
                <Text style={styles.statUnit}>SD</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>최고 혈당</Text>
                <Text style={styles.statValue}>{report.maxGlucose}</Text>
                <Text style={styles.statUnit}>mg/dL</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>최저 혈당</Text>
                <Text style={styles.statValue}>{report.minGlucose}</Text>
                <Text style={styles.statUnit}>mg/dL</Text>
              </View>
            </View>

            {/* TIR Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>목표 범위 비율 (TIR)</Text>
              <PieChart
                data={tirData}
                width={width - 80}
                height={200}
                chartConfig={{
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute
              />
            </View>

            {/* AI Analysis */}
            <View style={styles.aiCard}>
              <Text style={styles.aiTitle}>🤖 AI 닥터의 분석</Text>
              <Text style={styles.aiText}>
                {report.aiAnalysis ? report.aiAnalysis : "분석 데이터가 충분하지 않습니다."}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>데이터를 불러올 수 없습니다.</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B1220" },
  container: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: "800", color: "#E2E8F0", marginBottom: 20 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modeToggle: { flexDirection: "row", backgroundColor: "rgba(148, 163, 184, 0.2)", borderRadius: 12, padding: 4 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: "#F472B6" },
  toggleText: { color: "#94A3B8", fontWeight: "600", fontSize: 14 },
  toggleTextActive: { color: "#FFFFFF" },

  statGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center"
  },
  statLabel: { color: "#94A3B8", fontSize: 12, marginBottom: 4 },
  statValue: { color: "#F8FAFC", fontSize: 24, fontWeight: "800" },
  statUnit: { color: "#64748B", fontSize: 12 },

  chartCard: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: "center"
  },
  chartTitle: { color: "#E2E8F0", fontSize: 16, fontWeight: "700", marginBottom: 10, alignSelf: "flex-start" },

  aiCard: {
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)"
  },
  aiTitle: { color: "#818CF8", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  aiText: { color: "#E2E8F0", fontSize: 14, lineHeight: 22 },

  emptyText: { color: "#64748B", textAlign: "center", marginTop: 40 },
});















