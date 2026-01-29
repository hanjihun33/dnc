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
    private final com.djjko.dnc.ai.gemini.service.AiReportService aiReportService;
    private final com.djjko.dnc.auth.repository.UserRepository userRepository;
    private final CurrentUserService currentUserService;

    @GetMapping("/glucose")
    @Operation(summary = "Get glucose report (Weekly/Monthly)", description = "Fetch aggregated glucose data including TIR and statistics.")
    public GlucoseReportDto getGlucoseReport(
            @RequestParam(value = "period", defaultValue = "weekly") String period) {
        Long userId = currentUserService.getRequiredUserId();
        GlucoseReportDto report = reportService.generateGlucoseReport(userId, period);

        // AI Analysis
        try {
            userRepository.findById(userId).ifPresent(user -> {
                String analysis = aiReportService.generateAnalysis(user, report);
                report.setAiAnalysis(analysis);
            });
        } catch (Exception e) {
            log.error("Failed to generate AI report analysis", e);
            report.setAiAnalysis("AI 분석을 생성하는 중 오류가 발생했습니다.");
        }

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
