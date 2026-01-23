package com.djjko.dnc.controller;

import com.djjko.dnc.dto.report.GlucoseReportDto;
import com.djjko.dnc.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/glucose/{userId}")
    public ResponseEntity<GlucoseReportDto> getGlucoseReport(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "weekly") String period) {

        GlucoseReportDto report = reportService.generateGlucoseReport(userId, period);
        return ResponseEntity.ok(report);
    }
}
