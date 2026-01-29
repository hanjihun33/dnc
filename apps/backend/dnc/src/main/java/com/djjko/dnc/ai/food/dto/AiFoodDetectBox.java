package com.djjko.dnc.ai.food.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiFoodDetectBox(
    @JsonProperty("x_min") Double xMin,
    @JsonProperty("y_min") Double yMin,
    @JsonProperty("x_max") Double xMax,
    @JsonProperty("y_max") Double yMax
) {
}
