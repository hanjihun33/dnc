package com.djjko.dnc.report.service;

import com.djjko.dnc.report.dto.GlucoseReportDto;
import com.djjko.dnc.report.dto.MonthlyWeeklyGlucoseReportDto;
import com.djjko.dnc.glucose.entity.GlucoseData;
import com.djjko.dnc.user.model.DiabetesType;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.report.entity.MonthlyReport;
import com.djjko.dnc.report.entity.WeeklyReport;
import com.djjko.dnc.report.repository.GlucoseDataRepository;
import com.djjko.dnc.report.repository.MonthlyReportRepository;
import com.djjko.dnc.report.repository.WeeklyReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j; // Added import
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.IntSummaryStatistics;
import java.util.ArrayList;

@Slf4j // Added annotation
@Service
@RequiredArgsConstructor
public class ReportService {

    private final GlucoseDataRepository glucoseDataRepository;
    private final MonthlyReportRepository monthlyReportRepository;
    private final WeeklyReportRepository weeklyReportRepository;
    private final UserRepository userRepository;
    private final com.djjko.dnc.glucose.repository.SensorRepository sensorRepository;

    private static final TirThresholds DEFAULT_TIR = new TirThresholds(54, 69, 180, 250);
    // 임의 값: 프로젝트 요구에 맞게 이 숫자만 수정해서 기준치를 조정하세요.
    private static final TirThresholds DIABETES_TIR = new TirThresholds(54, 69, 180, 250);
    private static final TirThresholds NON_DIABETES_TIR = new TirThresholds(60, 99, 160, 220);

    public GlucoseReportDto generateGlucoseReport(Long userId, String period) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start;

        if ("weekly".equalsIgnoreCase(period)) {
            start = end.minusDays(7);
        } else if ("monthly".equalsIgnoreCase(period)) {
            start = end.minusDays(30);
        } else if ("daily".equalsIgnoreCase(period)) {
            start = end.minusDays(1); // 24시간
        } else {
            throw new IllegalArgumentException("지원되지 않는 기간입니다: " + period);
        }

        List<GlucoseData> data = glucoseDataRepository.findAllByUser_UserIdAndMeasuredAtBetween(userId, start, end);
        return buildGlucoseReport(userId, data, start, end, period);
    }

    private double calculatePercent(long part, long total) {
        if (total == 0)
            return 0.0;
        return (double) part / total * 100.0;
    }

    public MonthlyWeeklyGlucoseReportDto generateMonthlyWeeklyReport(Long userId, int year, int month) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("month must be between 1 and 12");
        }

        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());

        LocalDate firstWeekStart = monthStart;
        while (firstWeekStart.getDayOfWeek() != DayOfWeek.SUNDAY) {
            firstWeekStart = firstWeekStart.minusDays(1);
        }

        LocalDate lastWeekEnd = monthEnd;
        while (lastWeekEnd.getDayOfWeek() != DayOfWeek.SATURDAY) {
            lastWeekEnd = lastWeekEnd.plusDays(1);
        }

        List<MonthlyWeeklyGlucoseReportDto.WeeklyGlucoseReportDto> weeks = new ArrayList<>();
        LocalDate cursor = firstWeekStart;
        int weekIndex = 1;

        while (!cursor.isAfter(lastWeekEnd)) {
            LocalDate weekStart = cursor;
            LocalDate weekEnd = cursor.plusDays(6);

            LocalDateTime rangeStart = weekStart.atStartOfDay();
            LocalDateTime rangeEnd = weekEnd.plusDays(1).atStartOfDay();

            GlucoseReportDto report = generateGlucoseReport(userId, rangeStart, rangeEnd, "weekly");
            saveWeeklyReport(userId, weekStart, report);

            weeks.add(MonthlyWeeklyGlucoseReportDto.WeeklyGlucoseReportDto.builder()
                    .weekIndex(weekIndex)
                    .weekStartDate(weekStart)
                    .weekEndDate(weekEnd)
                    .rangeStart(rangeStart)
                    .rangeEnd(rangeEnd)
                    .report(report)
                    .build());

            cursor = cursor.plusWeeks(1);
            weekIndex++;
        }

        return MonthlyWeeklyGlucoseReportDto.builder()
                .year(year)
                .month(month)
                .weeks(weeks)
                .build();
    }

    public GlucoseReportDto generateMonthlyReportAndSave(Long userId, int year, int month) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("month must be between 1 and 12");
        }

        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
        LocalDateTime rangeStart = monthStart.atStartOfDay();
        LocalDateTime rangeEnd = monthEnd.plusDays(1).atStartOfDay();

        GlucoseReportDto report = generateGlucoseReport(userId, rangeStart, rangeEnd, "monthly");
        saveMonthlyReport(userId, year, month, report);

        return report;
    }

    public GlucoseReportDto generateGlucoseReport(Long userId, LocalDateTime start, LocalDateTime end, String period) {
        return generateGlucoseReport(userId, start, end, period, null);
    }

    public GlucoseReportDto generateGlucoseReport(Long userId, LocalDateTime start, LocalDateTime end, String period,
            Long sensorId) {
        List<GlucoseData> data;
        if (sensorId != null) {
            log.info("Fetching data by SensorID: {}, UserID: {}", sensorId, userId);
            data = glucoseDataRepository.findAllByUser_UserIdAndSensor_SensorId(userId, sensorId);
        } else {
            log.info("Fetching data by DateRange: {} ~ {}, UserID: {}", start, end, userId);
            data = glucoseDataRepository.findAllByUser_UserIdAndMeasuredAtBetween(userId, start, end);
        }
        log.info("Fetched {} glucose records", data.size());
        return buildGlucoseReport(userId, data, start, end, period);
    }

    private GlucoseReportDto buildGlucoseReport(
            Long userId,
            List<GlucoseData> data,
            LocalDateTime start,
            LocalDateTime end,
            String period) {

        log.info("Building Glucose Report for user: {}, count: {}", userId, data.size());

        if (data.isEmpty()) {
            return GlucoseReportDto.builder()
                    .userId(userId)
                    .period(period)
                    .startDate(start)
                    .endDate(end)
                    .recordCount(0)
                    .build();
        }

        IntSummaryStatistics stats = data.stream()
                .mapToInt(GlucoseData::getValue)
                .summaryStatistics();

        double average = stats.getAverage();
        long count = stats.getCount();

        double standardDeviation = Math.sqrt(data.stream()
                .mapToDouble(d -> Math.pow(d.getValue() - average, 2))
                .sum() / count);

        TirThresholds thresholds = resolveTirThresholds(userId);
        long veryLowCount = data.stream().filter(d -> d.getValue() < thresholds.veryLowUpperExclusive).count();
        long lowCount = data.stream().filter(d -> d.getValue() >= thresholds.veryLowUpperExclusive
                && d.getValue() <= thresholds.lowUpperInclusive).count();
        long inRangeCount = data.stream().filter(d -> d.getValue() > thresholds.lowUpperInclusive
                && d.getValue() <= thresholds.inRangeUpperInclusive).count();
        long highCount = data.stream().filter(d -> d.getValue() > thresholds.inRangeUpperInclusive
                && d.getValue() <= thresholds.highUpperInclusive).count();
        long veryHighCount = data.stream().filter(d -> d.getValue() > thresholds.highUpperInclusive).count();

        GlucoseData maxData = data.stream()
                .max((d1, d2) -> Integer.compare(d1.getValue(), d2.getValue()))
                .orElse(null);

        GlucoseReportDto.TimeInRangeDto tirDto = GlucoseReportDto.TimeInRangeDto.builder()
                .veryLowPercent(calculatePercent(veryLowCount, count))
                .lowPercent(calculatePercent(lowCount, count))
                .inRangePercent(calculatePercent(inRangeCount, count))
                .highPercent(calculatePercent(highCount, count))
                .veryHighPercent(calculatePercent(veryHighCount, count))
                .build();

        log.info("TIR Calculation Results: VeryLow={}, Low={}, InRange={}, High={}, VeryHigh={}",
                tirDto.getVeryLowPercent(), tirDto.getLowPercent(), tirDto.getInRangePercent(),
                tirDto.getHighPercent(), tirDto.getVeryHighPercent());

        return GlucoseReportDto.builder()
                .userId(userId)
                .period(period)
                .startDate(start)
                .endDate(end)
                .recordCount((int) count)
                .averageGlucose((int) average)
                .maxGlucose(stats.getMax())
                .maxGlucoseDateTime(maxData != null ? maxData.getMeasuredAt() : null)
                .minGlucose(stats.getMin())
                .standardDeviation(standardDeviation)
                .timeInRange(tirDto)
                .sensorUsagePercent(calculateSensorUsagePercent(userId, start, end, count))
                .build();
    }

    private void saveMonthlyReport(Long userId, int year, int month, GlucoseReportDto report) {
        MonthlyReport entity = monthlyReportRepository
                .findByUserIdAndYearAndMonth(userId, year, month)
                .orElseGet(MonthlyReport::new);

        entity.setUserId(userId);
        entity.setYear(year);
        entity.setMonth(month);
        entity.setRecordCount(report.getRecordCount());
        entity.setAverageGlucose(report.getAverageGlucose());
        entity.setMaxGlucose(report.getMaxGlucose());
        entity.setMinGlucose(report.getMinGlucose());
        entity.setStandardDeviation(report.getStandardDeviation());

        applyTimeInRange(entity, report);

        monthlyReportRepository.save(entity);
    }

    private void saveWeeklyReport(Long userId, LocalDate weekStartDate, GlucoseReportDto report) {
        WeeklyReport entity = weeklyReportRepository
                .findByUserIdAndWeekStartDate(userId, weekStartDate)
                .orElseGet(WeeklyReport::new);

        entity.setUserId(userId);
        entity.setWeekStartDate(weekStartDate);
        entity.setRecordCount(report.getRecordCount());
        entity.setAverageGlucose(report.getAverageGlucose());
        entity.setMaxGlucose(report.getMaxGlucose());
        entity.setMinGlucose(report.getMinGlucose());
        entity.setStandardDeviation(report.getStandardDeviation());

        applyTimeInRange(entity, report);

        weeklyReportRepository.save(entity);
    }

    private TirThresholds resolveTirThresholds(Long userId) {
        DiabetesType diabetesType = userRepository.findById(userId)
                .map(user -> user.getDiabetesType())
                .orElse(null);

        if (diabetesType == null) {
            return DEFAULT_TIR;
        }

        return switch (diabetesType) {
            case TYPE1, TYPE2 -> DIABETES_TIR;
            case PREDIABETES, OTHER -> NON_DIABETES_TIR;
        };
    }

    private void applyTimeInRange(Object entity, GlucoseReportDto report) {
        GlucoseReportDto.TimeInRangeDto timeInRange = report.getTimeInRange();

        if (entity instanceof MonthlyReport monthlyReport) {
            applyTimeInRange(monthlyReport, timeInRange);
        } else if (entity instanceof WeeklyReport weeklyReport) {
            applyTimeInRange(weeklyReport, timeInRange);
        }
    }

    private void applyTimeInRange(MonthlyReport entity, GlucoseReportDto.TimeInRangeDto timeInRange) {
        if (timeInRange != null) {
            entity.setVeryLowPercent(timeInRange.getVeryLowPercent());
            entity.setLowPercent(timeInRange.getLowPercent());
            entity.setInRangePercent(timeInRange.getInRangePercent());
            entity.setHighPercent(timeInRange.getHighPercent());
            entity.setVeryHighPercent(timeInRange.getVeryHighPercent());
        } else {
            entity.setVeryLowPercent(null);
            entity.setLowPercent(null);
            entity.setInRangePercent(null);
            entity.setHighPercent(null);
            entity.setVeryHighPercent(null);
        }
    }

    private void applyTimeInRange(WeeklyReport entity, GlucoseReportDto.TimeInRangeDto timeInRange) {
        if (timeInRange != null) {
            entity.setVeryLowPercent(timeInRange.getVeryLowPercent());
            entity.setLowPercent(timeInRange.getLowPercent());
            entity.setInRangePercent(timeInRange.getInRangePercent());
            entity.setHighPercent(timeInRange.getHighPercent());
            entity.setVeryHighPercent(timeInRange.getVeryHighPercent());
        } else {
            entity.setVeryLowPercent(null);
            entity.setLowPercent(null);
            entity.setInRangePercent(null);
            entity.setHighPercent(null);
            entity.setVeryHighPercent(null);
        }
    }

    private static final class TirThresholds {
        private final int veryLowUpperExclusive;
        private final int lowUpperInclusive;
        private final int inRangeUpperInclusive;
        private final int highUpperInclusive;

        private TirThresholds(int veryLowUpperExclusive, int lowUpperInclusive, int inRangeUpperInclusive,
                int highUpperInclusive) {
            this.veryLowUpperExclusive = veryLowUpperExclusive;
            this.lowUpperInclusive = lowUpperInclusive;
            this.inRangeUpperInclusive = inRangeUpperInclusive;
            this.highUpperInclusive = highUpperInclusive;
        }
    }

    private double calculateSensorUsagePercent(Long userId, java.time.LocalDateTime start, java.time.LocalDateTime end,
            long recordCount) {
        List<com.djjko.dnc.glucose.entity.Sensor> sensors = sensorRepository
                .findAllByUser(userRepository.getReferenceById(userId));

        long totalActiveMinutes = 0;

        for (com.djjko.dnc.glucose.entity.Sensor sensor : sensors) {
            java.time.LocalDateTime sensorStart = sensor.getStartedAt();
            java.time.LocalDateTime sensorEnd = sensor.getEndedAt();

            if (sensorStart == null)
                continue;

            if (sensor.getStatus() == com.djjko.dnc.glucose.entity.Sensor.SensorStatus.ACTIVE && sensorEnd == null) {
                sensorEnd = java.time.LocalDateTime.now();
            }
            if (sensorEnd == null)
                continue;

            // Calculate overlap with report period
            java.time.LocalDateTime overlapStart = sensorStart.isAfter(start) ? sensorStart : start;
            java.time.LocalDateTime overlapEnd = sensorEnd.isBefore(end) ? sensorEnd : end;

            if (overlapStart.isBefore(overlapEnd)) {
                totalActiveMinutes += java.time.temporal.ChronoUnit.MINUTES.between(overlapStart, overlapEnd);
            }
        }

        if (totalActiveMinutes == 0)
            return 0.0;

        // Assuming 5 minutes interval (Dexcom/CareSens standard)
        long expectedRecords = totalActiveMinutes / 5;

        if (expectedRecords == 0)
            return 0.0;

        double usage = (double) recordCount / expectedRecords * 100.0;
        return Math.min(usage, 100.0); // Cap at 100%
    }
}
