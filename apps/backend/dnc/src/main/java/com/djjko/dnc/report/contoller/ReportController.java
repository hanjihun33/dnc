package com.djjko.dnc.report.contoller;

import com.djjko.dnc.report.dto.GlucoseReportDto;
import com.djjko.dnc.report.dto.MonthlyWeeklyGlucoseReportDto;
import com.djjko.dnc.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/glucose/{userId}")
    @Operation(summary = "혈당 리포트 조회")
    public ResponseEntity<GlucoseReportDto> getGlucoseReport(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "weekly") String period) {

        GlucoseReportDto report = reportService.generateGlucoseReport(userId, period);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/glucose/{userId}/monthly-weeks")
    @Operation(summary = "월간 주차별 혈당 리포트 조회 (일요일~토요일 기준)")
    public ResponseEntity<MonthlyWeeklyGlucoseReportDto> getMonthlyWeeklyReport(
        @PathVariable Long userId,
        @RequestParam int year,
        @RequestParam int month
    ) {
        MonthlyWeeklyGlucoseReportDto report = reportService.generateMonthlyWeeklyReport(userId, year, month);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/glucose/{userId}/monthly")
    @Operation(summary = "월간 혈당 리포트 조회 및 저장")
    public ResponseEntity<GlucoseReportDto> getMonthlyReport(
        @PathVariable Long userId,
        @RequestParam int year,
        @RequestParam int month
    ) {
        GlucoseReportDto report = reportService.generateMonthlyReportAndSave(userId, year, month);
        return ResponseEntity.ok(report);
    }
}
