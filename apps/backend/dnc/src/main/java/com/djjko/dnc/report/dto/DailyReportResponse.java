package com.djjko.dnc.report.dto;

import com.djjko.dnc.report.domain.DailyReport;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class DailyReportResponse {
    private Long id;
    private LocalDate targetDate;
    private String summaryText;
    private Integer healthScore;
    private String reportType; // DAILY or SENSOR_FINAL
    private Integer dayCount; // Added field for day sequence (e.g. 1일차)

    public static DailyReportResponse from(DailyReport report) {
        return DailyReportResponse.builder()
                .id(report.getId())
                .targetDate(report.getTargetDate())
                .summaryText(report.getSummaryText())
                .healthScore(report.getHealthScore())
                .reportType(report.getReportType().name())
                .build();
    }
}
