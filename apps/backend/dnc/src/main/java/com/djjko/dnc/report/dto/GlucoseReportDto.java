package com.djjko.dnc.report.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class GlucoseReportDto {
    private Long userId;
    private double sensorUsagePercent;
    private String period;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private int recordCount;
    private int averageGlucose;
    private int maxGlucose;
    private int minGlucose;
    private double standardDeviation;
    private TimeInRangeDto timeInRange;

    private LocalDateTime maxGlucoseDateTime;

    @Getter
    @Builder
    public static class TimeInRangeDto {
        private double veryLowPercent; // 54 미만
        private double lowPercent; // 54-69
        private double inRangePercent; // 70-180
        private double highPercent; // 181-250
        private double veryHighPercent; // 250 초과
    }
}
