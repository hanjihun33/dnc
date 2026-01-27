package com.djjko.dnc.report.service;

import com.djjko.dnc.report.dto.GlucoseReportDto;
import com.djjko.dnc.glucose.entity.GlucoseData;
import com.djjko.dnc.report.repository.GlucoseDataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.IntSummaryStatistics;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final GlucoseDataRepository glucoseDataRepository;

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

        if (data.isEmpty()) {
            return GlucoseReportDto.builder()
                    .userId(userId)
                    .period(period)
                    .startDate(start)
                    .endDate(end)
                    .recordCount(0)
                    .build(); // 데이터가 없으면 기본 DTO 반환
        }

        IntSummaryStatistics stats = data.stream()
                .mapToInt(GlucoseData::getValue)
                .summaryStatistics();

        double average = stats.getAverage();
        long count = stats.getCount();

        // 표준 편차 계산
        double standardDeviation = Math.sqrt(data.stream()
                .mapToDouble(d -> Math.pow(d.getValue() - average, 2))
                .sum() / count);

        // 목표 범위 내 시간(TIR) 카운트
        long veryLowCount = data.stream().filter(d -> d.getValue() < 54).count();
        long lowCount = data.stream().filter(d -> d.getValue() >= 54 && d.getValue() <= 69).count();
        long inRangeCount = data.stream().filter(d -> d.getValue() >= 70 && d.getValue() <= 180).count();
        long highCount = data.stream().filter(d -> d.getValue() > 180 && d.getValue() <= 250).count();
        long veryHighCount = data.stream().filter(d -> d.getValue() > 250).count();

        // 목표 범위 내 시간(TIR) DTO 빌드
        GlucoseReportDto.TimeInRangeDto tirDto = GlucoseReportDto.TimeInRangeDto.builder()
                .veryLowPercent(calculatePercent(veryLowCount, count))
                .lowPercent(calculatePercent(lowCount, count))
                .inRangePercent(calculatePercent(inRangeCount, count))
                .highPercent(calculatePercent(highCount, count))
                .veryHighPercent(calculatePercent(veryHighCount, count))
                .build();

        // 최종 리포트 DTO 빌드
        return GlucoseReportDto.builder()
                .userId(userId)
                .period(period)
                .startDate(start)
                .endDate(end)
                .recordCount((int) count)
                .averageGlucose((int) average)
                .maxGlucose(stats.getMax())
                .minGlucose(stats.getMin())
                .standardDeviation(standardDeviation)
                .timeInRange(tirDto)
                .build();
    }

    private double calculatePercent(long part, long total) {
        if (total == 0) return 0.0;
        return (double) part / total * 100.0;
    }
}
