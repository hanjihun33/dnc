package com.djjko.dnc.report.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MonthlyWeeklyGlucoseReportDto {
    private int year;
    private int month;
    private List<WeeklyGlucoseReportDto> weeks;

    @Getter
    @Builder
    public static class WeeklyGlucoseReportDto {
        private int weekIndex;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private LocalDateTime rangeStart;
        private LocalDateTime rangeEnd;
        private GlucoseReportDto report;
    }
}
