package com.djjko.dnc.glucose.dto;

import com.djjko.dnc.glucose.entity.Sensor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SensorResponse {
    private Long sensorId;
    private String deviceId;
    private String provider;
    private String status;
    private String startedAt;
    private String endedAt;

    public static SensorResponse from(Sensor sensor) {
        return SensorResponse.builder()
                .sensorId(sensor.getSensorId())
                .deviceId(sensor.getDeviceId())
                .provider(sensor.getProvider())
                .status(sensor.getStatus().name())
                .startedAt(sensor.getStartedAt() != null ? sensor.getStartedAt().toString() : null)
                .endedAt(sensor.getEndedAt() != null ? sensor.getEndedAt().toString() : null)
                .build();
    }
}
