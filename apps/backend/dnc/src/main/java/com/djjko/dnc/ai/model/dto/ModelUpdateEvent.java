package com.djjko.dnc.ai.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ModelUpdateEvent(
    @JsonProperty("feed_value") Double feedValue,
    @JsonProperty("feed_measured_at") String feedMeasuredAt
) {
}
