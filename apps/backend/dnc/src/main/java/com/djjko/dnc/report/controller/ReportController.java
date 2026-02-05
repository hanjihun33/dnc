package com.djjko.dnc.report.controller;

import com.djjko.dnc.report.dto.DailyReportResponse;
import com.djjko.dnc.report.repository.DailyReportRepository;
import com.djjko.dnc.report.dto.GlucoseReportDto; // Added
import com.djjko.dnc.report.service.ReportService; // Added
import com.djjko.dnc.report.domain.DailyReport;
import com.djjko.dnc.report.service.DailyReportService; // Added
import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate; // Added
import java.time.LocalDateTime; // Added
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final DailyReportRepository dailyReportRepository;
    private final UserService userService;
    private final DailyReportService dailyReportService;
    private final ReportService reportService; // Added

    /**
     * 가장 최신(어제) 리포트 1건 조회
     */
    @GetMapping("/daily/latest")
    public ResponseEntity<DailyReportResponse> getLatestReport(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            log.warn("Unauthorized access attempt to /daily/latest");
            return ResponseEntity.status(401).build();
        }
        User user = userService.getUserByEmail(userDetails.getUsername());

        // 1. 데일리/종합 구분 없이 최신순 1개 조회
        List<DailyReport> reports = dailyReportRepository.findLatestReportByUser(user, DailyReport.ReportType.DAILY,
                PageRequest.of(0, 1));

        if (reports.isEmpty()) {
            // 204 No Content 대신 200 OK + null 리턴하거나, 204 유지
            // 프론트 처리에 따라 다르지만 일단 204
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(DailyReportResponse.from(reports.get(0)));
    }

    /**
     * 특정 센서의 히스토리 조회
     */
    @GetMapping("/history/{sensorId}")
    public ResponseEntity<List<DailyReportResponse>> getReportHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long sensorId) {
        if (userDetails == null)
            return ResponseEntity.status(401).build();

        List<DailyReport> reports = dailyReportRepository.findBySensorIdOrderByTargetDateDesc(sensorId);
        List<DailyReportResponse> dtos = reports.stream()
                .map(DailyReportResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * [테스트용] 수동 리포트 생성 트리거
     * ex) POST /api/v1/reports/test/generate?date=2024-02-01
     */
    @PostMapping("/test/generate")
    public ResponseEntity<String> generateTestReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("date") String dateStr) {
        if (userDetails == null)
            return ResponseEntity.status(401).build();
        try {
            User user = userService.getUserByEmail(userDetails.getUsername());
            LocalDate date = LocalDate.parse(dateStr);

            log.info("Manual Report Generation Triggered for User: {}, Date: {}", user.getEmail(), date);
            dailyReportService.generateManualReport(user, date);

            return ResponseEntity.ok("Report generation triggered for " + date + ". Check logs for result.");
        } catch (Exception e) {
            log.error("Failed to generate manual report", e);
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    /**
     * 기간별 혈당 리포트 조회 (TIR 포함)
     * GET /api/v1/reports/glucose?startDate=...&endDate=...&sensorId=...
     */
    @GetMapping("/glucose")
    public ResponseEntity<GlucoseReportDto> getGlucoseReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("startDate") String startDateStr,
            @RequestParam("endDate") String endDateStr,
            @RequestParam(value = "sensorId", required = false) Long sensorId) {

        log.info("=== /glucose endpoint called ===");
        log.info("UserDetails: {}", userDetails);

        if (userDetails == null) {
            log.warn("Unauthorized access attempt to /glucose - userDetails is null");
            return ResponseEntity.status(401).build();
        }

        User user = userService.getUserByEmail(userDetails.getUsername());
        log.info("User authenticated: userId={}, email={}", user.getUserId(), user.getEmail());

        try {
            // ISO-8601 string parsing (e.g., "2024-02-04T10:00:00")
            // frontend sends ISO string, LocalDateTime.parse handles it if no 'Z' or with
            // offset handling if needed.
            // Assuming simplified ISO format or standard local time format.
            // Often "2024-02-04T10:00:00.000Z" needs ZonedDateTime or OffsetDateTime, but
            // let's try standard LocalDateTime parse first
            // or simply remove Z if present for simple parsing if backend uses local time
            // storage.
            // Robust parsing:
            LocalDateTime start = LocalDateTime.parse(startDateStr.replace("Z", ""));
            LocalDateTime end = LocalDateTime.parse(endDateStr.replace("Z", ""));

            log.info("Requesting Glucose Report: userId={}, sensorId={}, start={}, end={}",
                    user.getUserId(), sensorId, startDateStr, endDateStr);

            GlucoseReportDto report = reportService.generateGlucoseReport(user.getUserId(), start, end, "custom",
                    sensorId);

            if (report.getTimeInRange() != null) {
                log.info("Controller returning report with TIR: veryLow={}, low={}, inRange={}, high={}, veryHigh={}",
                        report.getTimeInRange().getVeryLowPercent(),
                        report.getTimeInRange().getLowPercent(),
                        report.getTimeInRange().getInRangePercent(),
                        report.getTimeInRange().getHighPercent(),
                        report.getTimeInRange().getVeryHighPercent());
            } else {
                log.warn("Controller returning report with NULL TIR");
            }

            return ResponseEntity.ok(report);
        } catch (Exception e) {
            log.error("Failed to generate glucose report", e);
            return ResponseEntity.badRequest().build();
        }
    }
}
