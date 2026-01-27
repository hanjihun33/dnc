package com.djjko.dnc.model.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlucoseData {

    private Long glucoseId;
    private Long userId;
    private Long sensorId;
    private Integer value;
    private String trend;
    private Float trendRate;
    private String dexcomRecordId;
    private String source;
    private LocalDateTime measuredAt;
    private LocalDateTime createdAt;
}
