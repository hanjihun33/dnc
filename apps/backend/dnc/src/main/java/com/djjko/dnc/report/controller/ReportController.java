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
    @Operation(summary = "Get glucose report (Weekly/Monthly)", description = "Fetch aggregated glucose data including TIR and statistics.")
    public GlucoseReportDto getGlucoseReport(
            @RequestParam(value = "period", defaultValue = "weekly") String period) {
        Long userId = currentUserService.getRequiredUserId();
        GlucoseReportDto report = reportService.generateGlucoseReport(userId, period);

        // Client-side rule-based analysis is now used.
        // AI Analysis removed for optimization.
        report.setAiAnalysis(null);

        return report;
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
