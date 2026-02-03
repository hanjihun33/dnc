package com.djjko.dnc.report.controller;

import com.djjko.dnc.auth.service.CurrentUserService;
import com.djjko.dnc.report.dto.GlucoseReportDto;
import com.djjko.dnc.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final CurrentUserService currentUserService;

    @GetMapping("/glucose")
    @Operation(summary = "Get glucose report (Weekly/Monthly or Custom Range)", description = "Fetch aggregated glucose data. If startDate/endDate provided, uses that range. Otherwise uses period.")
    public GlucoseReportDto getGlucoseReport(
            @RequestParam(value = "period", defaultValue = "weekly") String period,
            @RequestParam(value = "startDate", required = false) String startDate,
            @RequestParam(value = "endDate", required = false) String endDate) {

        Long userId = currentUserService.getRequiredUserId();

        if (startDate != null && endDate != null) {
            return reportService.generateGlucoseReport(
                    userId,
                    parseDateTime(startDate),
                    parseDateTime(endDate),
                    "CUSTOM");
        }

        GlucoseReportDto report = reportService.generateGlucoseReport(userId, period);

        return report;
    }

    private java.time.LocalDateTime parseDateTime(String dateTimeStr) {
        try {
            // 1. 공백을 T로 치환
            String normalized = dateTimeStr.replace(" ", "T");
            // 2. Z가 있다면 제거 (단순 로컬 시간으로 취급)
            if (normalized.endsWith("Z")) {
                normalized = normalized.substring(0, normalized.length() - 1);
            }
            return java.time.LocalDateTime.parse(normalized);
        } catch (Exception e) {
            log.error("Date parsing failed: {}", dateTimeStr, e);
            throw new IllegalArgumentException("Invalid date format: " + dateTimeStr);
        }
    }

    @GetMapping("/glucose/monthly-weeks")
    @Operation(summary = "월간 주차별 혈당 리포트 조회 (일요일~토요일 기준)")
    public com.djjko.dnc.report.dto.MonthlyWeeklyGlucoseReportDto getMonthlyWeeklyReport(
            @RequestParam int year,
            @RequestParam int month) {
        Long userId = currentUserService.getRequiredUserId();
        return reportService.generateMonthlyWeeklyReport(userId, year, month);
    }

    @GetMapping("/glucose/monthly/save")
    @Operation(summary = "월간 혈당 리포트 조회 및 저장")
    public GlucoseReportDto getMonthlyReportAndSave(
            @RequestParam int year,
            @RequestParam int month) {
        Long userId = currentUserService.getRequiredUserId();
        return reportService.generateMonthlyReportAndSave(userId, year, month);
    }
}
