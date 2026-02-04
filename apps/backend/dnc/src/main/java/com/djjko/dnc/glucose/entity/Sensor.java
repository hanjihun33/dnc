package com.djjko.dnc.glucose.entity;

import com.djjko.dnc.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensors")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Sensor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sensorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String deviceId; // 트랜스미터 시리얼 번호
    private String provider; // 제조사 (Dexcom 등)

    @Enumerated(EnumType.STRING)
    private SensorStatus status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;
    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    public enum SensorStatus {
        ACTIVE, INACTIVE, EXPIRED, PENDING
    }

    public void changeStatus(SensorStatus newStatus) {
        this.status = newStatus;
    }

    public void updatePeriod(LocalDateTime startedAt, LocalDateTime endedAt) {
        this.startedAt = startedAt;
        this.endedAt = endedAt;
    }

    public void updateEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }

    public void activate(String deviceId) {
        this.deviceId = deviceId;
        this.status = SensorStatus.ACTIVE;
    }
}
