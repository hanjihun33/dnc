package com.djjko.dnc.glucose.entity;

import com.djjko.dnc.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "glucose_data", indexes = {
        @Index(name = "idx_glucose_user_time", columnList = "user_id, measured_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class GlucoseData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long glucoseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sensor_id")
    private Sensor sensor;

    private Integer value;

    // 알림 및 중복 방지용 필드
    private String trend;
    private Double trendRate;

    @Column(unique = true)
    private String dexcomRecordId; // 중복 방지 키

    @Enumerated(EnumType.STRING)
    private Source source;

    private LocalDateTime measuredAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum Source {
        AUTO, MANUAL
    }
}