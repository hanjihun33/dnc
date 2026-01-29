package com.djjko.dnc.ai.food.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiFoodDetectResult(
    @JsonProperty("food_name") String foodName,
    Double confidence,
    String quantity,
    AiFoodDetectBox box
) {
}
