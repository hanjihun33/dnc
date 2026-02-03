package com.djjko.dnc.ai.food.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record AiGlucosePredictionResponse(
        @JsonProperty("result") List<Double> forecast) {
}
