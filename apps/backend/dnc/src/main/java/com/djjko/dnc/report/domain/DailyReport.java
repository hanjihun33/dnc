package com.djjko.dnc.report.domain;

import com.djjko.dnc.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_report", indexes = {
        @Index(name = "idx_report_user_date", columnList = "user_id, target_date")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DailyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "daily_report_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "sensor_id")
    private Long sensorId;

    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    @Lob
    @Column(name = "summary_text", columnDefinition = "TEXT")
    private String summaryText;

    @Column(name = "health_score")
    private Integer healthScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false)
    private ReportType reportType;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    public enum ReportType {
        DAILY,
        SENSOR_FINAL
    }
}
