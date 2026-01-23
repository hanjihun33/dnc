package com.djjko.dnc.entity;

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

    private LocalDateTime startedAt;

    public enum SensorStatus {
        ACTIVE, INACTIVE, EXPIRED
    }

    public void changeStatus(SensorStatus newStatus) {
        this.status = newStatus;
    }
}