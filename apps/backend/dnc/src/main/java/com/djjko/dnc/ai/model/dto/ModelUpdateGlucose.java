package com.djjko.dnc.ai.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ModelUpdateGlucose(
    @JsonProperty("glucose_id") Long glucoseId,
    @JsonProperty("user_id") Long userId,
    @JsonProperty("sensor_id") Long sensorId,
    Integer value,
    String trend,
    @JsonProperty("trend_rate") Double trendRate,
    @JsonProperty("dexcom_record_id") String dexcomRecordId,
    String source,
    @JsonProperty("measured_at") String measuredAt,
    @JsonProperty("created_at") String createdAt
) {
}
