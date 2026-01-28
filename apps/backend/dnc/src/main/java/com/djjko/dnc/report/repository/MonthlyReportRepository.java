package com.djjko.dnc.report.repository;

import com.djjko.dnc.report.entity.MonthlyReport;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MonthlyReportRepository extends JpaRepository<MonthlyReport, Long> {
    Optional<MonthlyReport> findByUserIdAndYearAndMonth(Long userId, Integer year, Integer month);
}
