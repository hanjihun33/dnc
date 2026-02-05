package com.djjko.dnc.report.scheduler;

import com.djjko.dnc.glucose.entity.Sensor;
import com.djjko.dnc.glucose.repository.SensorRepository;
import com.djjko.dnc.report.service.DailyReportService;
import com.djjko.dnc.auth.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DailyReportScheduler {

    private final DailyReportService dailyReportService;
    private final SensorRepository sensorRepository;

    /**
     * 매일 새벽 05:00에 실행
     * 활성화된 센서를 가진 모든 사용자에 대해 '어제' 날짜의 리포트를 생성
     */
    @Scheduled(cron = "0 0 5 * * *")
    public void scheduleDailyReportGeneration() {
        log.info("Starting Daily Report Generation Job...");

        // 1. 현재 활성화된(ACTIVE) 센서 목록 조회
        List<Sensor> activeSensors = sensorRepository.findAllByStatus(Sensor.SensorStatus.ACTIVE);

        LocalDate yesterday = LocalDate.now().minusDays(1);

        int successCount = 0;
        int failCount = 0;

        for (Sensor sensor : activeSensors) {
            User user = sensor.getUser();
            try {
                // 비동기 처리나 배치 처리(Spring Batch)로 고도화 가능
                dailyReportService.generateDailyReport(user, sensor, yesterday);
                successCount++;
            } catch (Exception e) {
                log.error("Failed to generate report for user: {}", user.getUserId(), e);
                failCount++;
            }
        }

        log.info("Daily Report Job Finished. Success: {}, Failed: {}", successCount, failCount);
    }
}
