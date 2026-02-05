package com.djjko.dnc.report.service;

import com.djjko.dnc.glucose.entity.GlucoseData;
import com.djjko.dnc.glucose.entity.Sensor;
import com.djjko.dnc.report.repository.GlucoseDataRepository; // Changed back
import com.djjko.dnc.meal.dto.MealResponse;
import com.djjko.dnc.meal.service.MealService;
import com.djjko.dnc.report.domain.DailyReport;
import com.djjko.dnc.report.repository.DailyReportRepository;
import com.djjko.dnc.report.service.ReportGeminiService;
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.glucose.repository.SensorRepository; // Added import
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DailyReportService {

    private final DailyReportRepository dailyReportRepository;
    private final GlucoseDataRepository glucoseDataRepository; // Changed back
    private final MealService mealService;
    private final ReportGeminiService reportGeminiService;
    private final SensorRepository sensorRepository; // Added dependency // Changed service

    /**
     * 일일 리포트 생성 및 저장
     * 
     * @param user       대상 사용자
     * @param sensor     대상 센서
     * @param targetDate 분석 대상 날짜 (보통 어제)
     */
    @Transactional
    public void generateDailyReport(User user, Sensor sensor, LocalDate targetDate) {
        // 0. 중복 생성 방지 (단, 0점인 '데이터 부족' 리포트는 덮어쓰기 허용)
        DailyReport existingReport = dailyReportRepository
                .findByUserAndTargetDateAndReportType(user, targetDate, DailyReport.ReportType.DAILY)
                .orElse(null);

        if (existingReport != null && existingReport.getHealthScore() > 0) {
            log.info("Active report already exists for user: {}, date: {}", user.getUserId(), targetDate);
            return;
        }

        LocalDateTime startDateTime = targetDate.atStartOfDay();
        LocalDateTime endDateTime = targetDate.atTime(23, 59, 59);

        // 1. 데이터 수집 (센서 ID 대신 유저 ID 기준 조회로 변경하여 데이터 누락 방지)
        List<GlucoseData> glucoseList = glucoseDataRepository.findAllByUser_UserIdAndMeasuredAtBetween(
                user.getUserId(), startDateTime, endDateTime);

        log.info("Report Data Collection - User: {}, Date: {}, Glucose Count: {}",
                user.getUserId(), targetDate, glucoseList.size());

        List<MealResponse> mealList = mealService.getMealsByRange(
                user.getUserId(), startDateTime, endDateTime);

        // 2. 데이터 유효성 검사 (데이터 부족 시 스킵)
        if (glucoseList.size() < 10) { // 최소 50분 이상의 데이터 필요
            log.warn("Insufficient data for report (count: {}). User: {}, Date: {}",
                    glucoseList.size(), user.getUserId(), targetDate);
            saveEmptyReport(user, sensor, targetDate);
            return;
        }

        // 3. 통계 계산 (1차 가공)
        double avgGlucose = glucoseList.stream().mapToInt(GlucoseData::getValue).average().orElse(0);
        int maxGlucose = glucoseList.stream().mapToInt(GlucoseData::getValue).max().orElse(0);
        int minGlucose = glucoseList.stream().mapToInt(GlucoseData::getValue).min().orElse(0);

        // TIR 계산 (70~180)
        long inRangeCount = glucoseList.stream().filter(g -> g.getValue() >= 70 && g.getValue() <= 180).count();
        int tirPercent = (int) ((inRangeCount * 100) / glucoseList.size());

        // 건강 점수 계산 (단순 로직: TIR 비중 80% + 변동성 등)
        int healthScore = calculateHealthScore(tirPercent, avgGlucose);

        // 4. 프롬프트 데이터 구성
        StringBuilder context = new StringBuilder();
        context.append(String.format("날짜: %s\n", targetDate));
        context.append(String.format("평균혈당: %.0f, 최고: %d, 최저: %d\n", avgGlucose, maxGlucose, minGlucose));
        context.append(String.format("목표범위비율(TIR): %d%%\n", tirPercent));
        context.append("식사기록:\n");
        if (mealList.isEmpty()) {
            context.append("없음");
        } else {
            for (MealResponse m : mealList) {
                // Using records from MealService
                context.append(String.format("- %s (%s, %skcal)\n",
                        (m.foodName() != null && !m.foodName().isBlank()) ? m.foodName()
                                : (m.memo() != null ? m.memo() : "식사"),
                        m.eatenAt() != null ? LocalDateTime.parse(m.eatenAt()).toLocalTime() : "",
                        m.calories() != null ? m.calories() : 0));
            }
        }

        // 5. LLM 호출 (Using new localized service)
        String aiSummary = reportGeminiService.generateHealthSummary(context.toString(), "DAILY");

        // 6. DB 저장 (기존 리포트가 있으면 업데이트, 없으면 신규 저장)
        DailyReport report;
        if (existingReport != null) {
            // Re-use existing ID for update
            report = DailyReport.builder()
                    .id(existingReport.getId())
                    .user(user)
                    .sensorId(sensor.getSensorId())
                    .targetDate(targetDate)
                    .healthScore(healthScore)
                    .summaryText(aiSummary)
                    .reportType(DailyReport.ReportType.DAILY)
                    .build();
        } else {
            report = DailyReport.builder()
                    .user(user)
                    .sensorId(sensor.getSensorId())
                    .targetDate(targetDate)
                    .healthScore(healthScore)
                    .summaryText(aiSummary)
                    .reportType(DailyReport.ReportType.DAILY)
                    .build();
        }

        dailyReportRepository.save(report);
        log.info("Daily Report Generated/Updated for User: {}", user.getUserId());
    }

    private void saveEmptyReport(User user, Sensor sensor, LocalDate targetDate) {
        DailyReport report = DailyReport.builder()
                .user(user)
                .sensorId(sensor.getSensorId())
                .targetDate(targetDate)
                .healthScore(0)
                .summaryText("어제는 기록된 데이터가 부족하여 분석할 수 없습니다. 오늘부터 꾸준히 기록해볼까요? 💪")
                .reportType(DailyReport.ReportType.DAILY)
                .build();
        dailyReportRepository.save(report);
    }

    private int calculateHealthScore(int tir, double avg) {
        int score = tir;
        if (avg > 180)
            score -= 10;
        return Math.max(0, Math.min(100, score));
    }

    /**
     * 수동 리포트 생성 (테스트용)
     * 해당 날짜에 유효한 센서를 찾아서 리포트 생성
     */
    @Transactional
    public void generateManualReport(User user, LocalDate targetDate) {
        // 날짜 범위에 맞는 센서 찾기
        List<Sensor> sensors = sensorRepository.findAllByUser(user);
        Sensor targetSensor = sensors.stream()
                .filter(s -> {
                    // 날짜 교차 검증 (Overlap Check)
                    // 센서 시작 <= 타겟 날짜 종료 && (센서 종료 == null || 센서 종료 >= 타겟 날짜 시작)
                    boolean startsBeforeEnd = s.getStartedAt().isBefore(targetDate.atTime(23, 59, 59));
                    boolean endsAfterStart = (s.getEndedAt() == null)
                            || s.getEndedAt().isAfter(targetDate.atStartOfDay());

                    return startsBeforeEnd && endsAfterStart;
                })
                .findFirst()
                .orElse(null);

        if (targetSensor == null) {
            log.warn("No active sensor found for user {} on date {}", user.getUserId(), targetDate);
            return; // 센서 없으면 생성 불가
        }

        generateDailyReport(user, targetSensor, targetDate);
    }
}
