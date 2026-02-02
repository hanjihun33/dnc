package com.djjko.dnc.alert.entity;

import com.djjko.dnc.alert.model.AlertType;
import com.djjko.dnc.auth.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "user_alert_settings",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_alert_type", columnNames = {"user_id", "alert_type"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserAlertSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alert_setting_id")
    private Long alertSettingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false, length = 20)
    private AlertType alertType;

    @Column(name = "threshold_value")
    private Integer thresholdValue;

    @Column(name = "rate_threshold")
    private Double rateThreshold;

    @Column(name = "interval_minutes", nullable = false)
    private Integer intervalMinutes;

    @Column(nullable = false)
    private Boolean enabled;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void applyUpdate(Integer thresholdValue, Integer intervalMinutes, Boolean enabled) {
        if (thresholdValue != null) {
            this.thresholdValue = thresholdValue;
        }
        if (intervalMinutes != null) {
            this.intervalMinutes = intervalMinutes;
        }
        if (enabled != null) {
            this.enabled = enabled;
        }
    }
}
