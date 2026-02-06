package com.djjko.dnc.report.repository;

import com.djjko.dnc.report.domain.DailyReport;
import com.djjko.dnc.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyReportRepository extends JpaRepository<DailyReport, Long> {

        // 특정 날짜의 리포트 조회 (중복 생성 방지용)
        Optional<DailyReport> findByUserAndTargetDateAndReportType(User user, LocalDate targetDate,
                        DailyReport.ReportType reportType);

        // 사용자의 가장 최신 리포트 조회
        @Query("SELECT r FROM DailyReport r WHERE r.user = :user AND r.reportType = :type ORDER BY r.targetDate DESC")
        List<DailyReport> findLatestReportByUser(@Param("user") User user, @Param("type") DailyReport.ReportType type,
                        org.springframework.data.domain.Pageable pageable);

        // 특정 센서의 가장 최신 리포트 1건 조회
        Optional<DailyReport> findFirstBySensorIdAndReportTypeOrderByTargetDateDesc(Long sensorId,
                        DailyReport.ReportType reportType);

        // 특정 센서 기간 동안의 리포트 목록 조회 (히스토리용)
        List<DailyReport> findBySensorIdOrderByTargetDateDesc(Long sensorId);
}
