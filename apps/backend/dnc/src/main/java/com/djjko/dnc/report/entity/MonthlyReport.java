package com.djjko.dnc.report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "monthly_reports", uniqueConstraints = @UniqueConstraint(name = "uk_monthly_reports_user_month", columnNames = {
        "user_id", "year", "month" }))
public class MonthlyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long reportId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private Integer month;

    @Column(name = "record_count")
    private Integer recordCount;

    @Column(name = "average_glucose")
    private Integer averageGlucose;

    @Column(name = "max_glucose")
    private Integer maxGlucose;

    @Column(name = "min_glucose")
    private Integer minGlucose;

    @Column(name = "standard_deviation")
    private Double standardDeviation;

    @Column(name = "very_low_percent")
    private Double veryLowPercent;

    @Column(name = "low_percent")
    private Double lowPercent;

    @Column(name = "in_range_percent")
    private Double inRangePercent;

    @Column(name = "high_percent")
    private Double highPercent;

    @Column(name = "very_high_percent")
    private Double veryHighPercent;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
